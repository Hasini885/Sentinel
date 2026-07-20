import "server-only";

import bcrypt from "bcryptjs";

/**
 * User store for the demo auth gate.
 *
 * WHAT THIS IS, PRECISELY — read before relying on it for anything:
 *
 *  - The seed account comes from DEMO_USER_EMAIL / DEMO_USER_PASSWORD_HASH in
 *    .env, server-side only. Nothing here is ever sent to the browser.
 *  - Accounts created through /signup live in a module-level Map, i.e. in the
 *    server process's memory. They survive until the process restarts and no
 *    longer. They are NOT shared between workers and NOT persisted anywhere.
 *
 * That is a deliberate consequence of the approved approach: the FastAPI
 * backend has no users table and this phase may not add one, so there is
 * nowhere durable to put an account. Signup is real enough to test the whole
 * flow end to end, and honest about being ephemeral — the UI says so.
 *
 * To make accounts durable, add a users table (backend change) or move to a
 * hosted user store. Do not "fix" this by writing to a JSON file: that turns a
 * clearly-labelled demo into something that looks like real account storage.
 */

export type StoredUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

export type PublicUser = { id: string; email: string; name: string };

/**
 * Module-level so it survives between requests within one server process.
 * Hung off globalThis because Next's dev server re-evaluates modules on hot
 * reload, which would otherwise silently empty the store mid-session.
 */
const globalStore = globalThis as unknown as {
  __sentinelUsers?: Map<string, StoredUser>;
};

function store(): Map<string, StoredUser> {
  if (!globalStore.__sentinelUsers) {
    globalStore.__sentinelUsers = new Map();
  }
  return globalStore.__sentinelUsers;
}

const key = (email: string) => email.trim().toLowerCase();

let warnedAboutHash = false;

/** The .env-configured account, if one is present and well-formed. */
function seedUser(): StoredUser | null {
  const email = process.env.DEMO_USER_EMAIL;
  const passwordHash = process.env.DEMO_USER_PASSWORD_HASH;
  if (!email || !passwordHash) return null;

  // Next expands $NAME inside .env files, so an unescaped bcrypt hash
  // ($2b$10$...) arrives with its first three segments eaten. The result still
  // looks like a plausible string, so the only symptom is that every password
  // is wrong. Catch it here and say exactly what to do, once.
  if (!passwordHash.startsWith("$2") && !warnedAboutHash) {
    warnedAboutHash = true;
    console.error(
      "[auth] DEMO_USER_PASSWORD_HASH does not look like a bcrypt hash — it " +
        "should start with '$2'. Next expands $ in .env files, so the hash must " +
        "have every $ escaped as \\$ (quotes do not help). Login will fail until " +
        "this is fixed. See frontend/.env.local.example.",
    );
  }

  return {
    id: "seed",
    email: key(email),
    name: process.env.DEMO_USER_NAME || "Demo user",
    passwordHash,
  };
}

export function findUser(email: string): StoredUser | null {
  const seed = seedUser();
  if (seed && seed.email === key(email)) return seed;
  return store().get(key(email)) ?? null;
}

export type CreateResult =
  | { ok: true; user: PublicUser }
  | { ok: false; error: string };

export async function createUser(
  name: string,
  email: string,
  password: string,
): Promise<CreateResult> {
  if (findUser(email)) {
    return { ok: false, error: "An account with that email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user: StoredUser = {
    id: `u_${Date.now().toString(36)}`,
    email: key(email),
    name: name.trim() || "there",
    passwordHash,
  };
  store().set(user.email, user);
  return { ok: true, user: { id: user.id, email: user.email, name: user.name } };
}

/**
 * Verifies a credential pair. Returns null for both "no such user" and "wrong
 * password" so the response cannot be used to enumerate which emails exist.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<PublicUser | null> {
  const user = findUser(email);
  if (!user) {
    // Hash anyway so a missing account and a wrong password take comparable
    // time — otherwise the timing difference leaks which emails are registered.
    await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvaliduO");
    return null;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/** True when no credentials are configured at all — surfaced in the UI. */
export function isAuthConfigured(): boolean {
  return seedUser() !== null || store().size > 0;
}
