import type { Metadata } from "next";
import Link from "next/link";

import { signupAction } from "@/app/actions/auth";
import { AuthCard } from "@/components/marketing/AuthCard";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      subtitle="Start governing your agents in minutes."
      submitLabel="Create account"
      pendingLabel="Creating…"
      action={signupAction}
      withName
      notice="Demo deployment — accounts are held in the server's memory and are cleared when it restarts."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Log in
          </Link>
          .
        </>
      }
    />
  );
}
