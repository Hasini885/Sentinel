import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { ParticleField } from "@/components/ParticleField";

/**
 * Public shell: header, scrolling content, footer.
 *
 * Unlike the app layout this scrolls the document rather than trapping height,
 * because marketing pages are long-form and the app is a fixed-viewport console.
 *
 * The cursor-reactive particle field sits behind everything (fixed, -z-10), so
 * the fluid effect follows the mouse on the landing and auth pages the same way
 * it does behind the app. It carries no data here, so it runs on ambient drift
 * plus pointer reactivity only.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <ParticleField />
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
