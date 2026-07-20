import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/marketing/AuthCard";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Create an account"
      subtitle="Start governing your agents in minutes."
      submitLabel="Create account"
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
