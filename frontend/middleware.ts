import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

/**
 * Route protection.
 *
 * Built from the edge-safe config only — the Credentials provider (and its
 * bcrypt dependency) cannot run on the Edge runtime. The actual rule lives in
 * `authConfig.callbacks.authorized`, so middleware and server-side `auth()`
 * calls can never disagree about what is protected.
 *
 * Running this as middleware is what prevents a flash of protected content: the
 * redirect happens before any page HTML is produced, so an unauthenticated
 * visitor never receives dashboard markup at all.
 */
export default NextAuth(authConfig).auth;

export const config = {
  // Everything except Next internals, the auth API itself, and static files.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\.\w+$).*)"],
};
