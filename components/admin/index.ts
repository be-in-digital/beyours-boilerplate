/**
 * Admin components barrel export
 * Centralized exports for all admin UI components
 *
 * DELIBERATE DIVERGENCE from apps/reference — do not align.
 * StatusBadge, DateDisplay and ComingSoon exist only in this template, next to
 * the other template-only admin components (dashboard/, design/, games/,
 * orders/, payments/, products/, stores/, team/). The bench renders those
 * screens straight from @be-in-digital/admin instead.
 */

export { AdminAuthSync } from "./AdminAuthSync"
export { DeleteConfirmDialog } from "./DeleteConfirmDialog"
export { StatusBadge } from "./StatusBadge"
export { LoadingState } from "./LoadingState"
export { EmptyState } from "./EmptyState"
export { DateDisplay } from "./DateDisplay"
export { ComingSoon } from "./ComingSoon"
