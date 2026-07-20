import type { Metadata } from "next";
import Link from "next/link";

import { loginAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/marketing/AuthCard";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { from?: string; signedout?: string };
}) {
  // Only honour a same-site path, so `?from=` can never bounce a user off-site.
  const raw = searchParams.from ?? "";
  const from = raw.startsWith("/") && !raw.startsWith("//") ? raw : undefined;

  return (
    <AuthCard
      title="Log in"
      subtitle="Access your governance console."
      submitLabel="Log in"
      pendingLabel="Signing in…"
      action={loginAction}
      from={from}
      notice={
        searchParams.signedout
          ? "You've been signed out. Log back in to continue."
          : from
            ? "Sign in to reach that page."
            : undefined
      }
      footer={
        <>
          No account yet?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Create one
          </Link>
          .
        </>
      }
    />
  );
}
