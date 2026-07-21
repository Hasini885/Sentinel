/**
 * Auth end-to-end, in a real browser against the Postgres-backed users table.
 *
 * Proves the reported hole is closed and the real flow works: empty/fake/wrong
 * credentials are rejected with no session, a real signup writes an account and
 * signs in, and — the point of moving to Postgres — that account survives a
 * backend restart.
 */
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const B = process.env.BASE_URL ?? "http://localhost:3000";
const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/usr/bin/google-chrome",
].filter(Boolean).find((p) => existsSync(p));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/** Each attempt runs in a fresh context, so no prior session leaks in. */
async function attempt({ email, password, path = "/login", name }) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(45000);
  await page.goto(B + path, { waitUntil: "domcontentloaded" });
  if (name !== undefined) await page.fill('input[name="name"]', name);
  if (email !== undefined) await page.fill('input[name="email"]', email);
  if (password !== undefined) await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4500);

  const landed = new URL(page.url()).pathname;
  const cookies = await ctx.cookies();
  const hasSession = cookies.some((c) => c.name.includes("session-token"));
  const probe = await page.goto(B + "/api/sentinel/api/summary", { waitUntil: "domcontentloaded" });
  const apiStatus = probe?.status();
  await ctx.close();
  return { landed, hasSession, apiStatus };
}

try {
  console.log("\nRejected credentials (must NOT create a session)");
  let r = await attempt({ email: "", password: "" });
  check("empty credentials rejected", r.landed === "/login" && !r.hasSession && r.apiStatus === 401,
    `landed ${r.landed}, session ${r.hasSession}, api ${r.apiStatus}`);

  r = await attempt({ email: "nobody@nowhere.test", password: "made-up-pw" });
  check("fake account rejected", r.landed === "/login" && !r.hasSession && r.apiStatus === 401,
    `landed ${r.landed}, session ${r.hasSession}, api ${r.apiStatus}`);

  r = await attempt({ email: "demo@sentinel.local", password: "wrong-password" });
  check("real email + wrong password rejected", r.landed === "/login" && !r.hasSession,
    `landed ${r.landed}, session ${r.hasSession}`);

  console.log("\nAccepted credentials (must create a session)");
  r = await attempt({ email: "demo@sentinel.local", password: "sentinel-demo" });
  check("seed demo login works", r.landed === "/dashboard" && r.hasSession && r.apiStatus === 200,
    `landed ${r.landed}, session ${r.hasSession}, api ${r.apiStatus}`);

  console.log("\nReal signup creates a persistent account");
  const persistentEmail = `persist-${Date.now()}@example.com`;
  const persistentPw = "persist-password-123";
  r = await attempt({ path: "/signup", name: "Persist Me", email: persistentEmail, password: persistentPw });
  check("signup creates account and signs in", r.landed === "/dashboard" && r.hasSession,
    `landed ${r.landed}, session ${r.hasSession}`);

  // Export the account for the restart-survival check in the shell script.
  console.log(`::persistent-account::${persistentEmail}::${persistentPw}`);
} finally {
  await browser.close();
}

const passed = results.filter(Boolean).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
