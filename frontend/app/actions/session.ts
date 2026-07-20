"use server";

import { signOut } from "@/auth";

/**
 * Clears the session cookie server-side and returns to the landing page.
 *
 * Sign-out has to be a server action because the session cookie is httpOnly —
 * client JavaScript cannot read or delete it, which is the point.
 */
export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
