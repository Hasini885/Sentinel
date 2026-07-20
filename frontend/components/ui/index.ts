/**
 * Sentinel UI primitives.
 *
 * Import from "@/components/ui" rather than reaching into individual files, so
 * the surface of the design system stays visible in one place.
 */

export { AnimatedNumber, type AnimatedNumberProps } from "@/components/ui/AnimatedNumber";
export { MotionProvider, useMotionPreference } from "@/components/ui/MotionProvider";
export { Panel, type PanelProps } from "@/components/ui/Panel";
export {
  PagePlaceholder,
  type PagePlaceholderProps,
} from "@/components/ui/PagePlaceholder";
export { RiskBadge, StatusLabel, type RiskBadgeProps } from "@/components/ui/RiskBadge";
export { EmptyState, ErrorState } from "@/components/ui/States";
export { ToastProvider, useToast, type Toast, type ToastTone } from "@/components/ui/Toast";
export {
  Skeleton,
  SkeletonChart,
  SkeletonRows,
  SkeletonStat,
  type SkeletonProps,
} from "@/components/ui/Skeleton";
export {
  SectionTransition,
  type SectionTransitionProps,
} from "@/components/ui/SectionTransition";
export {
  duration,
  ease,
  fade,
  rise,
  sectionIn,
  spring,
  stagger,
  staggerTight,
} from "@/components/ui/motion";
