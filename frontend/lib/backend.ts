import "server-only";

/**
 * Direct server-to-server calls to the FastAPI backend for authentication.
 *
 * These are separate from the browser proxy in app/api/sentinel, and must be:
 * that proxy requires an existing session, but registering and authenticating
 * ARE how a session begins — there is nothing to check yet. So these run only
 * on the Node server (login / signup actions and the Credentials provider),
 * attach the shared secret directly, and never reach the browser.
 */

const BACKEND =
  process.env.SENTINEL_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

const API_KEY = process.env.SENTINEL_API_KEY ?? "";

export type BackendUser = { id: number; email: string; name: string };

type Ok<T> = { ok: true; data: T };
type Err = { ok: false; status: number; detail: string };
export type BackendResult<T> = Ok<T> | Err;

async function post<T>(path: string, body: unknown): Promise<BackendResult<T>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY) headers["X-Sentinel-Key"] = API_KEY;

  let response: Response;
  try {
    response = await fetch(new URL(path, BACKEND), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    // Backend unreachable — surface a clear message rather than a raw fetch throw.
    return {
      ok: false,
      status: 503,
      detail:
        error instanceof Error
          ? `Cannot reach the authentication service — ${error.message}`
          : "Cannot reach the authentication service.",
    };
  }

  if (response.ok) {
    return { ok: true, data: (await response.json()) as T };
  }

  // Pull FastAPI's human-readable `detail` out when there is one.
  let detail = `${response.status} ${response.statusText}`;
  try {
    const parsed = await response.json();
    if (typeof parsed?.detail === "string") detail = parsed.detail;
  } catch {
    /* non-JSON body — keep the status line */
  }
  return { ok: false, status: response.status, detail };
}

/** Verify a credential pair. Resolves to the user, or null when rejected. */
export async function authenticateUser(
  email: string,
  password: string,
): Promise<BackendUser | null> {
  const result = await post<BackendUser>("/api/auth/authenticate", { email, password });
  if (result.ok) return result.data;
  if (result.status === 401) return null; // wrong/unknown — not an error to surface
  // A 5xx or misconfiguration should not read as "wrong password"; make it loud.
  throw new Error(result.detail);
}

/** Create an account. Returns the user, or a message for a duplicate/invalid input. */
export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<{ ok: true; user: BackendUser } | { ok: false; error: string }> {
  const result = await post<BackendUser>("/api/auth/register", { name, email, password });
  if (result.ok) return { ok: true, user: result.data };
  if (result.status === 409) {
    return { ok: false, error: "An account with that email already exists." };
  }
  if (result.status === 422) {
    return { ok: false, error: "Those details aren't valid. Check the fields and try again." };
  }
  return { ok: false, error: result.detail };
}
