import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, extname, join, normalize, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
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
  ["pilot-plan.html", "assets/images/heroes/pilot-plan.webp"],
  ["take-part.html", "assets/images/heroes/take-part.webp"],
]);
const issues = [];
const titles = new Map();
const descriptions = new Map();

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
  const filePath = join(root, page);
  const html = readFileSync(filePath, "utf8");
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1].trim();
  const description = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)?.[1].trim()
    ?? html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i)?.[1].trim();

  if (!/^<!doctype html>/i.test(html.trimStart())) addIssue(page, "missing HTML5 doctype");
  if (!/<html\b[^>]*\blang=["']en-AU["']/i.test(html)) addIssue(page, "html language must be en-AU");
  if (!/<meta\s+charset=["']?utf-8/i.test(html)) addIssue(page, "missing UTF-8 charset");
  if (!title) addIssue(page, "missing title");
  if (!description) addIssue(page, "missing meta description");
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
  if (!html.includes("This is an independent public-interest proposal. It is not an operating service or an announced government program.")) {
    addIssue(page, "missing the exact proposal disclaimer");
  }
  if (!html.includes("AI-generated concept image. No local service or partnership is implied.")) {
    addIssue(page, "missing concept-image disclosure");
  }
  const expectedHero = expectedHeroes.get(page);
  if (expectedHero && !html.includes(expectedHero)) addIssue(page, `missing unique hero ${expectedHero}`);

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
    const href = getAttribute(anchorTag[0], "href");
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
  }

  if (/C:\\Users\\|file:\/\/|localhost|127\.0\.0\.1/i.test(html)) addIssue(page, "contains a local path or preview URL");
}

if (issues.length) {
  console.error(`Site check failed with ${issues.length} issue${issues.length === 1 ? "" : "s"}:`);
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Site check passed: ${pages.length} pages, ${titles.size} unique titles and ${expectedHeroes.size} unique hero assignments.`);
}
