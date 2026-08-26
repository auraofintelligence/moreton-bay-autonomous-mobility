(function () {
  "use strict";

  var root = document.documentElement;
  root.classList.add("js");

  var header = document.querySelector("[data-site-header], .site-header");
  var menuButton = document.querySelector("[data-nav-toggle], [data-menu-button], .nav-toggle");
  var navigation = document.querySelector("[data-site-nav], .site-nav");
  var desktopQuery = window.matchMedia("(min-width: 48rem)");

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
})();
