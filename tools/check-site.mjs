import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const publicBase = "https://auraofintelligence.github.io/moreton-bay-autonomous-mobility/";
const pages = readdirSync(root)
  .filter((name) => extname(name).toLowerCase() === ".html")
  .sort();
const expectedPages = [
  "everyday-journeys.html",
  "global-trajectory.html",
  "how-it-works.html",
  "index.html",
  "pilot-plan.html",
  "safety-and-trust.html",
  "site-map.html",
  "take-part.html",
  "why-moreton-bay.html",
];
const expectedHeroes = new Map([
  ["index.html", "assets/images/heroes/home.webp"],
  ["why-moreton-bay.html", "assets/images/heroes/why-moreton-bay.webp"],
  ["global-trajectory.html", "assets/images/heroes/global-trajectory.webp"],
  ["how-it-works.html", "assets/images/heroes/how-it-works.webp"],
  ["everyday-journeys.html", "assets/images/heroes/everyday-journeys.webp"],
  ["safety-and-trust.html", "assets/images/heroes/safety-and-trust.webp"],
  ["site-map.html", "assets/images/heroes/site-map.webp"],
  ["pilot-plan.html", "assets/images/heroes/pilot-plan.webp"],
  ["take-part.html", "assets/images/heroes/take-part.webp"],
]);
const expectedSourceLinks = new Map([
  ["index.html", "site-map.html#sources-home"],
  ["why-moreton-bay.html", "site-map.html#sources-why"],
  ["global-trajectory.html", "site-map.html#sources-global"],
  ["how-it-works.html", "site-map.html#sources-network"],
  ["everyday-journeys.html", "site-map.html#sources-journeys"],
  ["safety-and-trust.html", "site-map.html#sources-safety"],
  ["pilot-plan.html", "site-map.html#sources-action"],
  ["take-part.html", "site-map.html#sources-take-part"],
]);
const expectedPageNavigation = new Map([
  ["index.html", ["why-moreton-bay.html"]],
  ["why-moreton-bay.html", ["index.html", "global-trajectory.html"]],
  ["global-trajectory.html", ["why-moreton-bay.html", "how-it-works.html"]],
  ["how-it-works.html", ["global-trajectory.html", "everyday-journeys.html"]],
  ["everyday-journeys.html", ["how-it-works.html", "safety-and-trust.html"]],
  ["safety-and-trust.html", ["everyday-journeys.html", "pilot-plan.html"]],
  ["pilot-plan.html", ["safety-and-trust.html", "take-part.html"]],
  ["take-part.html", ["pilot-plan.html", "site-map.html"]],
  ["site-map.html", ["take-part.html", "index.html"]],
]);
const compactDisclaimer = "Independent public proposal.";
const issues = [];
const titles = new Map();
const descriptions = new Map();
const stylesheetVersions = new Set();
const mainWordCounts = new Map();

const requiredProjectFiles = [
  ".nojekyll",
  "LICENCE.md",
  "README.md",
  "robots.txt",
  "sitemap.xml",
];

function addIssue(page, message) {
  issues.push(`${page}: ${message}`);
}

function countMatches(text, expression) {
  return [...text.matchAll(expression)].length;
}

function getAttribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, "i"));
  return match?.[2] ?? null;
}

function hasLink(html, href) {
  return [...html.matchAll(/<a\b[^>]*>/gi)]
    .some((match) => getAttribute(match[0], "href") === href);
}

function visibleMainWordCount(html) {
  const main = html.match(/<main\b[^>]*>[\s\S]*?<\/main>/i)?.[0] ?? "";
  const visibleText = main
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<([a-z][\w:-]*)\b[^>]*class=["'][^"']*\bvisually-hidden\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]+);/gi, " ");
  return [...visibleText.matchAll(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)].length;
}

function humanFacingCopy(html) {
  const visibleText = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const readableAttributes = [...html.matchAll(/\b(?:alt|content|title|data-label-open|data-label-close)\s*=\s*(["'])(.*?)\1/gi)]
    .map((match) => match[2])
    .join(" ");
  return `${visibleText} ${readableAttributes}`
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\bOne Mile\b/gi, " ");
}

function localTarget(page, href) {
  const withoutFragment = href.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment) return null;
  return normalize(resolve(root, dirname(page), decodeURIComponent(withoutFragment)));
}

function fragmentTarget(page, href) {
  const hashAt = href.indexOf("#");
  if (hashAt < 0) return null;
  const fragment = decodeURIComponent(href.slice(hashAt + 1));
  if (!fragment) return null;
  const pagePart = href.slice(0, hashAt).split("?", 1)[0];
  const targetPage = pagePart
    ? normalize(relative(root, resolve(root, dirname(page), decodeURIComponent(pagePart))))
    : page;
  return { targetPage, fragment };
}

for (const expected of expectedPages) {
  if (!pages.includes(expected)) addIssue("site", `missing expected page ${expected}`);
}
for (const page of pages) {
  if (!expectedPages.includes(page)) addIssue("site", `unexpected HTML page ${page}`);
}
for (const requiredFile of requiredProjectFiles) {
  if (!existsSync(join(root, requiredFile))) addIssue("site", `missing required project file ${requiredFile}`);
}

const heroOwners = new Map();
for (const [page, hero] of expectedHeroes) {
  if (heroOwners.has(hero)) {
    addIssue("site", `${page} duplicates hero assignment from ${heroOwners.get(hero)}: ${hero}`);
  } else {
    heroOwners.set(hero, page);
  }
}

for (const page of pages) {
  const filePath = join(root, page);
  const html = readFileSync(filePath, "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1].trim()
    ?? html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)?.[1].trim();
  const expectedUrl = page === "index.html" ? publicBase : `${publicBase}${page}`;
  const canonicalTag = html.match(/<link\b[^>]*\brel=["']canonical["'][^>]*>/i)?.[0];
  const canonicalUrl = canonicalTag ? getAttribute(canonicalTag, "href") : null;
  const ogUrlTag = html.match(/<meta\b[^>]*\bproperty=["']og:url["'][^>]*>/i)?.[0];
  const ogUrl = ogUrlTag ? getAttribute(ogUrlTag, "content") : null;

  if (!/^<!doctype html>/i.test(html.trimStart())) addIssue(page, "missing HTML5 doctype");
  if (!/<html\b[^>]*\blang=["']en-AU["']/i.test(html)) addIssue(page, "html language must be en-AU");
  if (!/<meta\s+charset=["']?utf-8/i.test(html)) addIssue(page, "missing UTF-8 charset");
  if (!title) addIssue(page, "missing title");
  if (!description) addIssue(page, "missing meta description");
  if (canonicalUrl !== expectedUrl) addIssue(page, `canonical URL must be ${expectedUrl}`);
  if (ogUrl !== expectedUrl) addIssue(page, `Open Graph URL must be ${expectedUrl}`);
  if (title) {
    if (titles.has(title)) addIssue(page, `duplicates title from ${titles.get(title)}`);
    titles.set(title, page);
  }
  if (description) {
    if (descriptions.has(description)) addIssue(page, `duplicates description from ${descriptions.get(description)}`);
    descriptions.set(description, page);
  }
  if (countMatches(html, /<h1\b/gi) !== 1) addIssue(page, "must contain exactly one h1");
  if (!/<a\b[^>]*class=["'][^"']*skip-link/i.test(html)) addIssue(page, "missing skip link");
  if (!/<main\b[^>]*id=["']main-content["']/i.test(html)) addIssue(page, "main needs id=main-content");
  if (!html.includes("AI-generated concept image.")) {
    addIssue(page, "missing concept-image disclosure");
  }
  if (/[\u2010\u2011\u2012\u2013\u2014\u2015]/u.test(html)) {
    addIssue(page, "contains a Unicode dash; use an ASCII hyphen or normal punctuation");
  }
  const publicCopy = humanFacingCopy(html);
  if (/\b(?:miles?|mph|feet|foot|inches?|yards?|gallons?|ounces?|pounds?|fahrenheit|lbs?|oz|ft|kilometers?|meters?|liters?)\b/i.test(publicCopy)) {
    addIssue(page, "contains a non-Australian or non-metric unit");
  }
  if (/\b\d+(?:\.\d+)?\s*(?:m|bn|b|k)\+?\b/i.test(publicCopy)) {
    addIssue(page, "contains an ambiguous shortened number; write million, billion or thousand in full");
  }
  const dateCopy = publicCopy.replace(/\b24\/7\/365\b/g, " ");
  if (/\b(?:Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+\d{1,2},\s+\d{4}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/i.test(dateCopy)) {
    addIssue(page, "contains an ambiguous or American-style date");
  }
  if (/\b(?:color|colors|colored|center|centers|centered|behavior|behaviors|labor|neighbor|neighbors|neighborhood|neighborhoods|organize|organized|organizing|recognize|recognized|analyze|analyzed|authorize|authorized|authorization|program|programs|catalog|catalogs|maneuver|maneuvers|curb|curbs|tire|tires|defense|airplane|sidewalk|canceled|canceling|traveled|traveling|traveler|travelers|fulfill|fulfillment|gray)\b/i.test(publicCopy)) {
    addIssue(page, "contains American spelling in public copy or metadata");
  }
  if (/\bUS\b/.test(publicCopy)) {
    addIssue(page, "uses the abbreviation US; write United States in first-contact copy");
  }
  if (/\b(?:train|rail)\b/i.test(html)) {
    addIssue(page, "contains train or rail wording; the Bay Islands use ferry connections");
  }
  if (/status-strip/i.test(html)) addIssue(page, "contains forbidden status-strip markup");
  if (/hero__eyebrow/i.test(html)) addIssue(page, "contains forbidden hero__eyebrow markup");
  if (/<[^>]*\bclass=["'][^"']*\beyebrow\b[^"']*["'][^>]*>/i.test(html)) {
    addIssue(page, "contains forbidden eyebrow class markup");
  }
  if (page !== "site-map.html" && /\bsource-list\b/i.test(html)) {
    addIssue(page, "contains a source list outside the central site map source library");
  }

  const wordCount = visibleMainWordCount(html);
  mainWordCounts.set(page, wordCount);
  if (page !== "site-map.html" && wordCount > 1000) {
    addIssue(page, `main content is ${wordCount} words; TLDR content pages must stay at or below 1000`);
  }

  const expectedSourceLink = expectedSourceLinks.get(page);
  if (expectedSourceLink && !hasLink(html, expectedSourceLink)) {
    addIssue(page, `missing page-specific source link ${expectedSourceLink}`);
  }

  const pageNav = html.match(/<nav\b[^>]*\bclass=["'][^"']*\bpage-nav\b[^"']*["'][^>]*>[\s\S]*?<\/nav>/i)?.[0] ?? "";
  for (const expectedLink of expectedPageNavigation.get(page) ?? []) {
    if (!hasLink(pageNav, expectedLink)) {
      addIssue(page, `page navigation is missing ${expectedLink}`);
    }
  }

  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/i)?.[0] ?? "";
  if (!footer.includes(compactDisclaimer)) addIssue(page, "footer is missing the compact proposal disclaimer");
  if (!hasLink(footer, "site-map.html#sources")) addIssue(page, "footer must link to site-map.html#sources");
  if (!footer.includes("LICENCE.md")) addIssue(page, "footer must link to the licence");
  if (!footer.includes("github.com/auraofintelligence/moreton-bay-autonomous-mobility")) {
    addIssue(page, "footer must link to the public repository");
  }
  const expectedHero = expectedHeroes.get(page);
  if (expectedHero && !html.includes(expectedHero)) addIssue(page, `missing unique hero ${expectedHero}`);

  const ids = new Set();
  for (const idMatch of html.matchAll(/\bid=["']([^"']+)["']/gi)) {
    const id = idMatch[1];
    if (ids.has(id)) addIssue(page, `duplicate id ${id}`);
    ids.add(id);
  }
  if (page === "site-map.html" && !ids.has("sources")) {
    addIssue(page, "missing central source library id=sources");
  }

  for (const imageTag of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = imageTag[0];
    const src = getAttribute(tag, "src");
    if (getAttribute(tag, "alt") === null) addIssue(page, `image missing alt: ${src ?? "unknown source"}`);
    if (!getAttribute(tag, "width") || !getAttribute(tag, "height")) addIssue(page, `image missing width/height: ${src ?? "unknown source"}`);
    if (src && !/^(?:https?:|data:)/i.test(src)) {
      const target = localTarget(page, src);
      if (target && !existsSync(target)) addIssue(page, `missing image ${relative(root, target)}`);
    }
  }

  for (const anchorTag of html.matchAll(/<a\b[^>]*>/gi)) {
    const tag = anchorTag[0];
    const href = getAttribute(tag, "href");
    const className = getAttribute(tag, "class") ?? "";
    if (/\bbutton\b/i.test(className) && href?.startsWith("#")) {
      addIssue(page, `button must lead somewhere useful instead of scrolling within the page: ${href}`);
    }
    if (getAttribute(tag, "target") === "_blank") {
      const rel = getAttribute(tag, "rel") ?? "";
      if (!/\bnoopener\b/i.test(rel) || !/\bnoreferrer\b/i.test(rel)) {
        addIssue(page, `target=_blank link needs rel=noopener noreferrer: ${href ?? "unknown target"}`);
      }
    }
    if (!href || /^(?:https?:|mailto:|tel:)/i.test(href)) continue;
    const target = localTarget(page, href);
    if (target && !existsSync(target)) {
      addIssue(page, `broken local link ${href}`);
      continue;
    }
    const fragment = fragmentTarget(page, href);
    if (fragment) {
      const fragmentPath = join(root, fragment.targetPage);
      if (!existsSync(fragmentPath)) continue;
      const fragmentHtml = readFileSync(fragmentPath, "utf8");
      const escaped = fragment.fragment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (!new RegExp(`\\bid=["']${escaped}["']`, "i").test(fragmentHtml)) {
        addIssue(page, `broken fragment link ${href}`);
      }
    }
  }

  for (const assetTag of html.matchAll(/<(?:link|script)\b[^>]*>/gi)) {
    const path = getAttribute(assetTag[0], "href") ?? getAttribute(assetTag[0], "src");
    if (!path || /^(?:https?:|data:)/i.test(path)) continue;
    const target = localTarget(page, path);
    if (target && !existsSync(target)) addIssue(page, `missing asset ${path}`);
    if (/^assets\/css\/styles\.css\?v=/i.test(path)) stylesheetVersions.add(path);
  }

  if (/C:\\Users\\|file:\/\/|localhost|127\.0\.0\.1/i.test(html)) addIssue(page, "contains a local path or preview URL");
}

if (stylesheetVersions.size !== 1) {
  addIssue("site", `expected one shared stylesheet cache version, found ${stylesheetVersions.size}`);
}

const sitemapText = readFileSync(join(root, "sitemap.xml"), "utf8");
const sitemapUrls = new Set([...sitemapText.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim()));
const expectedUrls = new Set(expectedPages.map((page) => page === "index.html" ? publicBase : `${publicBase}${page}`));
for (const expectedUrl of expectedUrls) {
  if (!sitemapUrls.has(expectedUrl)) addIssue("sitemap.xml", `missing ${expectedUrl}`);
}
for (const sitemapUrl of sitemapUrls) {
  if (!expectedUrls.has(sitemapUrl)) addIssue("sitemap.xml", `unexpected URL ${sitemapUrl}`);
}

const robotsText = readFileSync(join(root, "robots.txt"), "utf8");
if (!robotsText.includes(`Sitemap: ${publicBase}sitemap.xml`)) {
  addIssue("robots.txt", "must point to the public XML sitemap");
}

console.log(`Main content word counts: ${[...mainWordCounts.entries()]
  .map(([page, count]) => `${page}=${count}`)
  .join(", ")}`);

if (issues.length) {
  console.error(`Site check failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Site check passed: ${pages.length} pages, ${titles.size} unique titles and ${expectedHeroes.size} unique hero assignments.`);
}
