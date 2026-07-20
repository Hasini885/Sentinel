import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { authConfig } from "@/auth.config";
import { verifyCredentials } from "@/lib/users";

/**
 * Node-runtime auth. Adds the Credentials provider to the edge-safe base config.
 *
 * Session lives in a signed, httpOnly cookie that Auth.js manages — never in
 * localStorage, and never readable by client JavaScript. AUTH_SECRET signs it
 * and must be set; Auth.js refuses to start without one in production.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await verifyCredentials(email, password);
        if (!user) return null; // Auth.js turns this into CredentialsSignin

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
});
