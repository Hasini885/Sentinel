import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/components/marketing/AuthCard";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Log in"
      subtitle="Access your governance console."
      submitLabel="Log in"
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
