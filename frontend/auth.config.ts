import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe half of the auth config.
 *
 * Middleware runs on the Edge runtime, which has no Node crypto — so bcrypt
 * (and therefore the Credentials provider) cannot be imported into it. This
 * file holds only what middleware needs: the custom pages and the route-
 * authorisation rule. The provider lives in auth.ts, which is Node-only.
 *
 * This split is the documented Auth.js v5 pattern, and it is not optional:
 * importing the full config into middleware fails at build time.
 */

/** Routes that require a session. Everything else is public. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/actions",
  "/analytics",
  "/approvals",
  "/settings",
  "/design",
];

/** Signed-in users have no reason to see these. */
const AUTH_PAGES = ["/login", "/signup"];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export const authConfig = {
  /**
   * Derive the callback origin from the request's Host header.
   *
   * Auth.js refuses to do this by default in production, because a proxy that
   * forwards an attacker-controlled Host could redirect callbacks off-site.
   * That is the right default for a public deployment; this app is run locally
   * against a known origin, where the alternative (pinning AUTH_URL) would
   * break the moment the port changes.
   *
   * If you deploy this behind a real domain, set AUTH_URL to that origin and
   * remove this line — pinning is strictly safer than trusting the header.
   */
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: { strategy: "jwt" },
  callbacks: {
    /**
     * The single place route protection is decided, for both middleware and
     * server-side `auth()` calls. Returning false redirects to `pages.signIn`.
     */
    authorized({ auth, request }) {
      const signedIn = Boolean(auth?.user);
      const { pathname, search } = request.nextUrl;

      if (isProtectedPath(pathname)) {
        if (signedIn) return true;
        // Preserve where they were heading so login can bounce them back.
        const target = `${pathname}${search}`;
        const url = new URL("/login", request.nextUrl.origin);
        if (target !== "/dashboard") url.searchParams.set("from", target);
        return Response.redirect(url);
      }

      if (signedIn && AUTH_PAGES.includes(pathname)) {
        return Response.redirect(new URL("/dashboard", request.nextUrl.origin));
      }

      return true;
    },

    /** Carry the user's id and name onto the token, then onto the session. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? "");
        session.user.name = token.name ?? null;
        session.user.email = token.email ?? "";
      }
      return session;
    },
  },
  providers: [], // filled in by auth.ts — must stay empty here for the Edge build
} satisfies NextAuthConfig;
