(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var header = document.querySelector("[data-site-header], .site-header");
  var menuButton = document.querySelector("[data-nav-toggle], [data-menu-button], .nav-toggle");
  var navigation = document.querySelector("[data-site-nav], .site-nav");
  var desktopQuery = window.matchMedia("(min-width: 62rem)");

  function setMenuState(isOpen, returnFocus) {
    if (!header || !menuButton || !navigation) {
      return;
    }

    header.classList.toggle("nav-open", isOpen);
    header.classList.toggle("is-nav-open", isOpen);
    document.body.classList.toggle("menu-open", isOpen && !desktopQuery.matches);
    menuButton.setAttribute("aria-expanded", String(isOpen));

    var openLabel = menuButton.getAttribute("data-label-open") || "Open menu";
    var closeLabel = menuButton.getAttribute("data-label-close") || "Close menu";
    menuButton.setAttribute("aria-label", isOpen ? closeLabel : openLabel);

    if (!isOpen && returnFocus) {
      menuButton.focus();
    }
  }

  if (header && menuButton && navigation) {
    if (!navigation.id) {
      navigation.id = "site-navigation";
    }

    menuButton.setAttribute("aria-controls", navigation.id);
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", menuButton.getAttribute("data-label-open") || "Open menu");

    menuButton.addEventListener("click", function () {
      setMenuState(menuButton.getAttribute("aria-expanded") !== "true", false);
    });

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a") && !desktopQuery.matches) {
        setMenuState(false, false);
      }
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setMenuState(false, true);
      }
    });

    document.addEventListener("click", function (event) {
      if (!desktopQuery.matches && menuButton.getAttribute("aria-expanded") === "true" && !header.contains(event.target)) {
        setMenuState(false, false);
      }
    });

    desktopQuery.addEventListener("change", function () {
      setMenuState(false, false);
    });
  }

  document.querySelectorAll("[data-current-year]").forEach(function (element) {
    element.textContent = String(new Date().getFullYear());
  });

  function openLinkedDetails() {
    if (!window.location.hash) {
      return;
    }

    var target = document.getElementById(window.location.hash.slice(1));
    if (!target) {
      return;
    }

    var details = target.closest("details");
    var sibling = target;
    while (!details && sibling) {
      sibling = sibling.nextElementSibling;
      if (sibling && sibling.tagName === "DETAILS") {
        details = sibling;
      }
    }

    if (details) {
      details.open = true;
      window.requestAnimationFrame(function () {
        target.scrollIntoView({ block: "start" });
        window.scrollBy(0, -((header && header.offsetHeight) || 0) - 16);
      });
    }
  }

  openLinkedDetails();
  window.addEventListener("hashchange", openLinkedDetails);

  var backToTop = document.querySelector("[data-back-to-top], .back-to-top");
  var scrollQueued = false;

  function updateBackToTop() {
    if (backToTop) {
      backToTop.classList.toggle("is-visible", window.scrollY > 560);
    }
    scrollQueued = false;
  }

  if (backToTop) {
    updateBackToTop();
    window.addEventListener("scroll", function () {
      if (!scrollQueued) {
        window.requestAnimationFrame(updateBackToTop);
        scrollQueued = true;
      }
    }, { passive: true });
    window.addEventListener("pageshow", updateBackToTop);
  }

  var inputForm = document.querySelector("[data-input-form]");
  if (inputForm) {
    var privateEmailButton = inputForm.querySelector("[data-private-email]");
    var publicIssueButton = inputForm.querySelector("[data-public-issue]");
    var copyDraftButton = inputForm.querySelector("[data-copy-draft]");
    var copyArea = inputForm.querySelector("[data-copy-area]");
    var copyOutput = inputForm.querySelector("[data-copy-output]");
    var formStatus = inputForm.querySelector("[data-form-status]");
    var privateEmail = "sbt4183@gmail.com";
    var newIssueUrl = "https://github.com/auraofintelligence/moreton-bay-autonomous-mobility/issues/new";

    function prepareInputDraft() {
      var data = new FormData(inputForm);
      var topic = String(data.get("topic") || "").trim();
      var message = String(data.get("message") || "").trim();
      var name = String(data.get("name") || "").trim();
      var replyEmail = String(data.get("reply_email") || "").trim();
      var selectedTopic = inputForm.querySelector("#topic option:checked");
      var topicLabel = selectedTopic ? selectedTopic.textContent.trim() : topic;
      var privateBody = [
        "Topic: " + topicLabel,
        "Name: " + (name || "Not supplied"),
        "Reply email: " + (replyEmail || "Not supplied"),
        "",
        message
      ].join("\n");
      var publicBody = [
        "Topic: " + topicLabel,
        "",
        message
      ].join("\n");

      return { topic: topic, privateBody: privateBody, publicBody: publicBody };
    }

    function setFormStatus(message) {
      if (formStatus) {
        formStatus.textContent = message;
      }
    }

    inputForm.addEventListener("submit", function (event) {
      event.preventDefault();
    });

    if (privateEmailButton) {
      privateEmailButton.addEventListener("click", function () {
        if (!inputForm.reportValidity()) {
          return;
        }

        var draft = prepareInputDraft();
        setFormStatus("Your device was asked to open its email app. If nothing happened, copy the draft or use the email address below.");
        window.location.href = "mailto:" + privateEmail
          + "?subject=" + encodeURIComponent(draft.topic)
          + "&body=" + encodeURIComponent(draft.privateBody);
      });
    }

    if (publicIssueButton) {
      publicIssueButton.addEventListener("click", function () {
        if (!inputForm.reportValidity()) {
          return;
        }

        var draft = prepareInputDraft();
        var issueBody = draft.publicBody
          + "\n\nPrepared through the Moreton Bay Autonomous Mobility input form.";
        var issueWindow = window.open(
          newIssueUrl
            + "?title=" + encodeURIComponent(draft.topic)
            + "&body=" + encodeURIComponent(issueBody),
          "_blank",
          "noopener,noreferrer"
        );
        setFormStatus(issueWindow
          ? "GitHub opened with an unpublished issue draft. Review it before posting."
          : "The GitHub window was blocked. Allow pop-ups or copy the draft instead.");
      });
    }

    if (copyDraftButton && copyArea && copyOutput) {
      copyDraftButton.addEventListener("click", function () {
        if (!inputForm.reportValidity()) {
          return;
        }

        var draft = prepareInputDraft();
        copyOutput.value = draft.privateBody;
        copyArea.hidden = false;
        copyOutput.focus();
        copyOutput.select();

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(draft.privateBody).then(function () {
            setFormStatus("The email draft was copied. It is also shown and selected below.");
          }).catch(function () {
            setFormStatus("The email draft is shown and selected below. Copy it from there.");
          });
        } else {
          setFormStatus("The email draft is shown and selected below. Copy it from there.");
        }
      });
    }
  }
})();
