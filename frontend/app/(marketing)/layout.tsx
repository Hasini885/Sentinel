import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

/**
 * Public shell: header, scrolling content, footer.
 *
 * Unlike the app layout this scrolls the document rather than trapping height,
 * because marketing pages are long-form and the app is a fixed-viewport console.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
