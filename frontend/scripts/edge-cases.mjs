/**
 * Edge-case probe: reduced motion, accessibility, and error paths.
 *
 * Split from interactions.mjs because these need their own browser contexts
 * (an OS-level reduced-motion preference cannot be toggled mid-session) and
 * because they exercise failure paths rather than the working ones.
 *
 * The reduced-motion section is the reason this file exists: it caught a
 * hydration mismatch that only affected users with the OS preference set, and
 * which no other check could see — the default browser context never
 * reproduces it.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "demo@sentinel.local";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "sentinel-demo";

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find((p) => existsSync(p));

const found = [];
const note = (name, ok, detail) => {
  found.push({ name, ok });
  console.log(`  ${ok ? "ok  " : "BUG "} ${name}${detail ? ` — ${detail}` : ""}`);
};

/**
 * Next compiles routes on demand in dev; a cold first hit can exceed
 * Playwright's 30s default and fail as a timeout rather than a real defect.
 */
const relaxTimeouts = (page) => {
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(45000);
};

const signIn = async (page) => {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
};

const signOutIfNeeded = async (page) => {
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  if (new URL(page.url()).pathname !== "/dashboard") return;
  await page.waitForTimeout(1200);
  await page.click('button[aria-haspopup="menu"]');
  await page.waitForTimeout(500);
  await Promise.all([page.waitForTimeout(2500), page.click('button:has-text("Sign out")')]);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

try {
  // ---- reduced motion, as a real OS preference ----
  console.log("\nprefers-reduced-motion: reduce");
  const rmCtx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const rm = await rmCtx.newPage();
  relaxTimeouts(rm);
  const rmIssues = [];
  rm.on("pageerror", (e) => rmIssues.push(e.message));
  rm.on("console", (m) => {
    if (m.type() === "error") rmIssues.push(m.text());
  });

  await rm.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await rm.waitForTimeout(2500);

  const hydration = rmIssues.filter((t) => /hydrat|did not match|server-rendered/i.test(t));
  note("no hydration mismatch", hydration.length === 0, hydration[0]?.slice(0, 90));

  const visible = await rm.evaluate(() => {
    const h = document.querySelector("h1");
    return Boolean(h) && getComputedStyle(h).opacity !== "0";
  });
  note("landing content visible (not stuck at opacity 0)", visible);

  const sections = await rm.evaluate(
    () => [...document.querySelectorAll("section")].filter((s) => getComputedStyle(s).opacity !== "0").length,
  );
  note("all landing sections rendered", sections >= 4, `${sections} sections`);

  await signIn(rm);
  await rm.waitForTimeout(5000);
  note("data attribute reflects OS preference",
    (await rm.getAttribute("html", "data-reduced-motion")) === "true");
  const figure = await rm.evaluate(() => document.body.innerText.match(/\$\d\.\d{4}/)?.[0] ?? "");
  note("dashboard still shows data", Boolean(figure), figure);
  note("no console errors under reduced motion", rmIssues.length === 0,
    rmIssues.slice(0, 2).join(" | "));
  await rmCtx.close();

  // ---- accessibility basics ----
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  relaxTimeouts(page);
  console.log("\naccessibility");
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  note("keyboard focus reaches an element",
    await page.evaluate(() => document.activeElement !== document.body));

  await signIn(page);
  await page.waitForTimeout(4000);
  const unnamed = await page.evaluate(() =>
    [...document.querySelectorAll("button")]
      .filter((b) => !(b.innerText || "").trim() && !b.getAttribute("aria-label") && !b.getAttribute("title"))
      .map((b) => String(b.className).slice(0, 40)));
  note("every button has an accessible name", unnamed.length === 0, unnamed.slice(0, 3).join(" | "));
  note("no images missing alt",
    (await page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => !i.alt).length)) === 0);

  // ---- duplicate signup ----
  console.log("\nduplicate signup");
  const dup = `dupe${Date.now()}@test.local`;
  const doSignup = async () => {
    await page.goto(`${BASE}/signup`, { waitUntil: "domcontentloaded" });
    await page.fill('input[name="name"]', "Dupe");
    await page.fill('input[name="email"]', dup);
    await page.fill('input[name="password"]', "password-1234");
    await Promise.all([page.waitForTimeout(4000), page.click('button[type="submit"]')]);
  };

  await signOutIfNeeded(page);
  await doSignup();
  note("first signup succeeds", new URL(page.url()).pathname === "/dashboard",
    new URL(page.url()).pathname);

  await signOutIfNeeded(page);
  await doSignup();
  const dupMsg = await page.evaluate(
    () => document.body.innerText.match(/already exists[^\n]*/)?.[0] ?? "");
  note("duplicate email is rejected", Boolean(dupMsg), dupMsg || "no message shown");

  // ---- design gallery ----
  console.log("\ndesign gallery");
  await signIn(page);
  await page.goto(`${BASE}/design`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  // Match against the DOM's own text, not innerText: these headings are
  // uppercased by CSS, and innerText reflects text-transform, so a
  // case-sensitive check on "Palette" would never match the rendered "PALETTE".
  const gallery = await page.$$eval("h2", (ns) => {
    const headings = ns.map((n) => n.textContent.trim().toLowerCase());
    return ["palette", "motion tokens", "primitives"].every((h) => headings.includes(h));
  });
  note("design gallery renders", gallery);
} finally {
  await browser.close();
}

const bugs = found.filter((f) => !f.ok);
console.log(`\n${found.length - bugs.length}/${found.length} checks passed`);
if (bugs.length) {
  console.log("\nBUGS:");
  bugs.forEach((b) => console.log(`  - ${b.name}`));
}
process.exit(bugs.length === 0 ? 0 : 1);
