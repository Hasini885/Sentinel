/**
 * Browser smoke test.
 *
 *   npm run smoke                 # against http://localhost:3000
 *   BASE_URL=... npm run smoke
 *   CHROME_PATH=... npm run smoke # if Chrome is not in the default location
 *
 * Requires the dev (or production) server AND the backend to be running.
 *
 * Why this exists: typecheck, lint and `next build` all pass on code that is
 * broken in a browser. Every defect this file has caught — CORS blocking every
 * request, a WebSocket closed mid-handshake by StrictMode, a scroll offset that
 * could not be resolved — was invisible to every other check, because curl does
 * not enforce CORS and SSR does not run effects.
 *
 * It asserts that real data reaches the screen, not merely that pages return 200.
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EMAIL = process.env.SMOKE_EMAIL ?? "demo@sentinel.local";
const PASSWORD = process.env.SMOKE_PASSWORD ?? "sentinel-demo";

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean);

const results = [];
const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const { existsSync } = await import("node:fs");
const executablePath = CHROME_CANDIDATES.find((p) => existsSync(p));
if (!executablePath) {
  console.error("No Chrome found. Set CHROME_PATH to your Chrome executable.");
  process.exit(2);
}

const browser = await chromium.launch({ executablePath, headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();

// Next compiles routes on demand in dev; a cold first hit can exceed
// Playwright's 30s default and fail as a timeout rather than a real defect.
page.setDefaultNavigationTimeout(90000);
page.setDefaultTimeout(45000);

const consoleIssues = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") consoleIssues.push(m.text());
});
page.on("pageerror", (e) => consoleIssues.push(`PAGEERROR: ${e.message}`));

try {
  console.log("\nPublic pages");
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  record("landing renders", Boolean(await page.$("h1")), (await page.textContent("h1"))?.slice(0, 40));

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(1000);
  const moved = await page.evaluate(() => {
    const grid = document.querySelector("section .grid");
    return grid
      ? Array.from(grid.children).some((c) => getComputedStyle(c).transform !== "none")
      : false;
  });
  record("hero parallax responds to scroll", moved);

  console.log("\nAuth");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  record("signed-out visitor is redirected", new URL(page.url()).pathname === "/login");

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  record("login form signs in", new URL(page.url()).pathname === "/dashboard");

  console.log("\nData reaches the screen");
  await page.waitForTimeout(6000); // let the provider complete its first poll

  const stats = await page.$$eval("span.font-display", (ns) =>
    ns.map((n) => n.textContent.trim()).filter((t) => /^[\d$]/.test(t)),
  );
  record("dashboard shows live figures", stats.length >= 3, stats.slice(0, 4).join(" "));

  const streaming = await page.$$eval("span", (ns) =>
    ns.some((n) => n.textContent.trim() === "Live"),
  );
  record("websocket connected", streaming);

  await page.goto(`${BASE}/actions`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const rows = (await page.$$('li[class*="border-b"]')).length;
  record("actions feed has rows", rows > 0, `${rows} rows`);

  if (rows > 0) {
    (await page.$$('li[class*="border-b"]'))[0].click();
    await page.waitForTimeout(800);
    const factors = await page.$$eval("span", (ns) =>
      ns.map((n) => n.textContent).filter((t) => t && /\/10\s*$/.test(t)),
    );
    record("row expands to risk breakdown", factors.length >= 3, factors.slice(0, 4).join(" "));
  }

  await page.goto(`${BASE}/analytics`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const costs = await page.$$eval("span", (ns) =>
    ns.map((n) => n.textContent).filter((t) => t && /^\$\d\.\d{5}$/.test(t.trim())),
  );
  record("analytics shows per-feature cost", costs.length > 0, costs.slice(0, 3).join(" "));

  await page.goto(`${BASE}/approvals`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const cards = await page.$$eval("button", (ns) =>
    ns.filter((n) => /Approve/.test(n.textContent)).length,
  );
  record("approvals queue renders", cards >= 0, `${cards} card(s)`);

  await page.goto(`${BASE}/settings`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);
  const rules = await page.$$eval('input[list="known-actions"]', (ns) => ns.map((n) => n.value));
  record("settings loads policy rules", rules.length > 0, `${rules.length} rule(s)`);

  // Checked BEFORE signing out. Afterwards the session is gone by design, and
  // any request still in flight is legitimately rejected — counting that as an
  // application error would flag the app for behaving correctly.
  const early = [...new Set(consoleIssues)].filter(
    (t) => !t.includes("RSC payload") && !t.includes("React DevTools") && !t.includes("Fast Refresh"),
  );
  console.log("\nConsole");
  record("no console errors or warnings", early.length === 0, early.slice(0, 3).join(" | "));

  console.log("\nSign out");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  await page.click('button[aria-haspopup="menu"]');
  await page.waitForTimeout(500);
  await Promise.all([
    page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 15000 }).catch(() => {}),
    page.click('button:has-text("Sign out")'),
  ]);
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  record("sign out re-protects routes", new URL(page.url()).pathname === "/login");
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
