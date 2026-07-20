import { AppShell } from "@/components/shell/AppShell";

/**
 * Authenticated app shell: sidebar + top bar around a fixed-viewport console.
 *
 * NOTE ON PROTECTION — these routes are grouped so the auth gate is a single
 * addition later (middleware matching this group), but they are NOT gated yet.
 * M1 ships the structure and the auth pages as placeholders; gating them now
 * would make every route unreachable and there would be nothing to click
 * through. The gate lands with the auth phase.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
