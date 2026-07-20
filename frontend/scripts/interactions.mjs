/**
 * Deep interaction probe — a bug-hunting harness, not a regression suite.
 *
 * The smoke test walks happy paths. This drives the interactions users
 * actually perform: signing up, clicking approve, saving a policy, toggling a
 * switch, filtering, drilling down, opening drawers, and using the site at
 * phone width. It reports rather than asserts, so a run surfaces everything at
 * once instead of stopping at the first failure.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
].filter(Boolean).find((p) => existsSync(p));

const found = [];
const note = (area, ok, detail) => {
  found.push({ area, ok, detail });
  console.log(`  ${ok ? "ok  " : "BUG "} ${area}${detail ? ` — ${detail}` : ""}`);
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on("console", (m) => {
  if (m.type() === "error" || m.type() === "warning") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

const login = async () => {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@sentinel.local");
  await page.fill('input[name="password"]', "sentinel-demo");
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(5000);
};

try {
  console.log("\n--- form validation ---");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "not-an-email");
  await page.fill('input[name="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  const vErr = await page.$$eval("p", (ns) =>
    ns.map((n) => n.textContent.trim()).filter((t) => /email address|required/i.test(t)));
  note("login shows validation errors", vErr.length > 0, vErr.join(" | ") || "none shown");

  await page.fill('input[name="email"]', "demo@sentinel.local");
  await page.fill('input[name="password"]', "wrong-password");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2500);
  const badCreds = await page.$$eval('[role="alert"]', (ns) => ns.map((n) => n.textContent.trim()));
  note("wrong password shows error", badCreds.length > 0, badCreds.join(" | ") || "none shown");

  console.log("\n--- signup (never tested before) ---");
  const email = `probe${Date.now()}@test.local`;
  await page.goto(`${BASE}/signup`, { waitUntil: "networkidle" });
  await page.fill('input[name="name"]', "Probe User");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "short");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  const pwErr = await page.$$eval("p", (ns) =>
    ns.map((n) => n.textContent.trim()).filter((t) => /8 characters/i.test(t)));
  note("signup enforces password length", pwErr.length > 0, pwErr.join("") || "not enforced");

  await page.fill('input[name="password"]', "probe-password-123");
  await Promise.all([
    page.waitForURL(/dashboard/, { timeout: 20000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  note("signup creates account and signs in", new URL(page.url()).pathname === "/dashboard",
    new URL(page.url()).pathname);
  await page.waitForTimeout(3000);

  const who = await page.textContent('button[aria-haspopup="menu"]').catch(() => "");
  note("user menu shows the new user", /Probe User/.test(who ?? ""), (who ?? "").trim());

  console.log("\n--- sidebar + shell controls ---");
  const wBefore = await page.$eval("nav", (n) => n.getBoundingClientRect().width);
  await page.click('button[aria-label*="ollapse"]').catch(() => {});
  await page.waitForTimeout(900);
  const wAfter = await page.$eval("nav", (n) => n.getBoundingClientRect().width);
  note("sidebar collapses", wAfter < wBefore, `${Math.round(wBefore)}px -> ${Math.round(wAfter)}px`);
  await page.click('button[aria-label*="xpand"]').catch(() => {});
  await page.waitForTimeout(700);

  const motionBtn = await page.$('button[aria-pressed]');
  if (motionBtn) {
    await motionBtn.click();
    await page.waitForTimeout(700);
    const attr = await page.getAttribute("html", "data-reduced-motion");
    note("motion toggle sets data-reduced-motion", attr === "true", `attr=${attr}`);
    await motionBtn.click();
    await page.waitForTimeout(500);
  } else note("motion toggle present", false, "button not found");

  console.log("\n--- actions: filters, expand, audit drawer ---");
  await page.goto(`${BASE}/actions`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const allRows = (await page.$$('li[class*="border-b"]')).length;
  const blockedBtn = await page.$('button:has-text("Blocked")');
  if (blockedBtn) {
    await blockedBtn.click();
    await page.waitForTimeout(1500);
    const filtered = (await page.$$('li[class*="border-b"]')).length;
    note("status filter changes the list", filtered !== allRows, `${allRows} -> ${filtered}`);
    await page.click('button:has-text("All")');
    await page.waitForTimeout(1200);
  } else note("status filter present", false, "Blocked chip not found");

  const rows = await page.$$('li[class*="border-b"]');
  if (rows.length) {
    await rows[0].click();
    await page.waitForTimeout(900);
    const auditBtn = await page.$('button:has-text("Full audit trail")');
    if (auditBtn) {
      await auditBtn.click();
      await page.waitForTimeout(2200);
      const drawer = await page.$$eval("p", (ns) =>
        ns.some((n) => /Audit trail/i.test(n.textContent ?? "")));
      note("audit drawer opens with data", drawer);
      await page.keyboard.press("Escape").catch(() => {});
      const closeBtn = await page.$('button:has-text("Close")');
      if (closeBtn) await closeBtn.click();
      await page.waitForTimeout(800);
    } else note("audit trail button in expanded row", false, "not found");
  }

  console.log("\n--- analytics drill-down ---");
  await page.goto(`${BASE}/analytics`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const featureBtn = await page.$("ul li button");
  if (featureBtn) {
    const tag = (await featureBtn.textContent())?.trim().split("\n")[0] ?? "";
    await featureBtn.click();
    await page.waitForTimeout(2500);
    const path = new URL(page.url()).pathname;
    const chip = await page.$$eval("button", (ns) =>
      ns.map((n) => n.textContent?.trim()).filter((t) => t && t.includes("×")));
    note("feature drill-down navigates to /actions", path === "/actions", `-> ${path}`);
    note("drill-down applies the feature filter", chip.length > 0, chip.join(" ") || "no filter chip");
  } else note("feature bars clickable", false, "no feature button");

  console.log("\n--- settings: policy save + auto-downgrade ---");
  await page.goto(`${BASE}/settings`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const saveBtn = await page.$('button:has-text("Save rules")');
  note("save disabled until edited", saveBtn ? await saveBtn.isDisabled() : false);

  const addBtn = await page.$('button:has-text("Add rule")');
  if (addBtn) {
    await addBtn.click();
    await page.waitForTimeout(700);
    const save2 = await page.$('button:has-text("Save rules")');
    note("save enables after an edit", save2 ? !(await save2.isDisabled()) : false);
    await save2?.click();
    await page.waitForTimeout(1800);
    const err = await page.$$eval('[role="alert"]', (ns) => ns.map((n) => n.textContent?.trim()));
    note("empty rule is rejected client-side", err.some((e) => /action type/i.test(e ?? "")),
      err.join(" | ") || "no validation error");
    const removeBtn = (await page.$$('button[aria-label^="Remove rule"]')).pop();
    await removeBtn?.click();
    await page.waitForTimeout(600);
  }

  const sw = await page.$('[role="switch"]');
  if (sw) {
    const before = await sw.getAttribute("aria-checked");
    await sw.click();
    await page.waitForTimeout(2500);
    const after = await sw.getAttribute("aria-checked");
    note("auto-downgrade switch toggles", before !== after, `${before} -> ${after}`);
    await sw.click();
    await page.waitForTimeout(1500);
  } else note("auto-downgrade switch present", false, "none found");

  console.log("\n--- approvals: real decision ---");
  await page.goto(`${BASE}/approvals`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  const cardsBefore = await page.$$eval("button", (ns) =>
    ns.filter((n) => /Approve/.test(n.textContent ?? "")).length);
  const approve = await page.$('button:has-text("Approve")');
  if (approve && cardsBefore > 0) {
    await approve.click();
    await page.waitForTimeout(4000);
    const cardsAfter = await page.$$eval("button", (ns) =>
      ns.filter((n) => /Approve/.test(n.textContent ?? "")).length);
    note("approve removes the card", cardsAfter < cardsBefore, `${cardsBefore} -> ${cardsAfter}`);
    const toast = await page.$$eval('[role="status"], [role="alert"]', (ns) =>
      ns.map((n) => n.textContent?.trim()));
    note("approve raises a toast", toast.some((t) => /approved/i.test(t ?? "")),
      toast.join(" | ") || "no toast");
  } else note("approvals queue had a card to decide", false, `${cardsBefore} cards`);

  console.log("\n--- demo mode ---");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const demo = await page.$('button:has-text("Demo mode")');
  if (demo) {
    await demo.click();
    await page.waitForTimeout(6000);
    const banner = await page.evaluate(() => document.body.innerText.includes("replaying"));
    note("demo banner appears", banner);

    // Must be a link click, not page.goto(). goto() is a full browser
    // navigation that remounts the React tree, which legitimately clears the
    // provider's in-memory state — demo mode is deliberately not persisted
    // (no localStorage, per project constraint). Clicking the sidebar link is
    // what a user does and is what should preserve it.
    await page.click('a[href="/actions"]');
    await page.waitForTimeout(3000);
    const stillOn = await page.evaluate(() => document.body.innerText.includes("replaying"));
    note("demo survives client-side navigation", stillOn);
    const exit = await page.$('button:has-text("Exit demo")');
    await exit?.click();
    await page.waitForTimeout(1500);
  } else note("demo mode button present", false, "not found");

  console.log("\n--- mobile (390x844) ---");
  const m = await ctx.newPage();
  await m.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await m.setViewportSize({ width: 390, height: 844 });
  await m.waitForTimeout(1500);
  const hOverflow = await m.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  note("landing has no horizontal overflow", !hOverflow,
    await m.evaluate(() => `${document.documentElement.scrollWidth}px wide`));
  await m.close();

  // Console is checked BEFORE the deliberate 404 below, otherwise this probe
  // flags its own missing-page request as an application error.
  console.log("\n--- console ---");
  const real = [...new Set(errors)].filter(
    (t) =>
      !t.includes("RSC payload") &&
      !t.includes("React DevTools") &&
      !t.includes("Download the React"),
  );
  note("no console errors", real.length === 0, real.slice(0, 4).join(" | "));

  console.log("\n--- 404 ---");
  const r = await page.goto(`${BASE}/does-not-exist`, { waitUntil: "networkidle" });
  note("unknown route 404s", r?.status() === 404, `status ${r?.status()}`);
} finally {
  await browser.close();
}

const bugs = found.filter((f) => !f.ok);
console.log(`\n${found.length - bugs.length}/${found.length} checks passed`);
if (bugs.length) {
  console.log("\nBUGS:");
  bugs.forEach((b) => console.log(`  - ${b.area}${b.detail ? `: ${b.detail}` : ""}`));
}
process.exit(0);
