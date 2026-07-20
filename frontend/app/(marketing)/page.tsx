import { CtaBand } from "@/components/marketing/CtaBand";
import { FeatureGrid } from "@/components/marketing/FeatureGrid";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { ProblemSolution } from "@/components/marketing/ProblemSolution";

/**
 * Landing page.
 *
 * A server component that composes client sections: each section opts into
 * interactivity for its own animation, but the page itself ships no client
 * bundle of its own and all the copy is server-rendered for crawlers.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProblemSolution />
      <FeatureGrid />
      <HowItWorks />
      <CtaBand />
    </>
  );
}
