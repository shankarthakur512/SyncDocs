/**
 * UI layout constants — z-index layering and sizing kept in one place so
 * stacking order is intentional and easy to reason about.
 *
 */
export const Z_INDEX = {
  appHeader: 20,
  /** Modal overlays (e.g. version preview) sit above everything. */
  overlay: 60,
} as const;

/** Shared sidebar width (Tailwind `w-72` = 18rem). */
export const SIDEBAR_WIDTH_CLASS = "lg:w-72";
