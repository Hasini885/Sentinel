"use server";

import { isRedirectError } from "next/dist/client/components/redirect";
import { AuthError } from "next-auth";

import { signIn } from "@/auth";
import { createUser } from "@/lib/users";

/**
 * Server actions for the auth forms.
 *
 * Credentials never touch client JavaScript: the forms post directly to these
 * actions, the password is compared server-side, and the only thing that comes
 * back is a session cookie set by Auth.js.
 */

export type FormState = {
  error?: string;
  /** Field-level messages, keyed by input name. */
  fieldErrors?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function validate(
  fields: { name?: string; email: string; password: string },
  requireName: boolean,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (requireName && !fields.name?.trim()) {
    errors.name = "Tell us what to call you.";
  }
  if (!fields.email.trim()) {
    errors.email = "Email is required.";
  } else if (!EMAIL_RE.test(fields.email.trim())) {
    errors.email = "That doesn't look like an email address.";
  }
  if (!fields.password) {
    errors.password = "Password is required.";
  } else if (requireName && fields.password.length < MIN_PASSWORD) {
    // Only enforced on signup — an existing account may predate the rule.
    errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  }

  return errors;
}

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "") || "/dashboard";

  const fieldErrors = validate({ email, password }, false);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    // Only ever redirect to a path on this site — an attacker-supplied absolute
    // URL in `from` would otherwise turn login into an open redirect.
    const target = from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard";
    await signIn("credentials", { email, password, redirectTo: target });
    return {};
  } catch (error) {
    // signIn throws a redirect on success; that must propagate, not be caught.
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "That email and password don't match an account." };
    }
    throw error;
  }
}

export async function signupAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const name = String(formData.get("name") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const fieldErrors = validate({ name, email, password }, true);
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const created = await createUser(name, email, password);
  if (!created.ok) {
    return { fieldErrors: { email: created.error } };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Account created, but sign-in failed. Try logging in." };
    }
    throw error;
  }
}
