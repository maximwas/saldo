/**
 * Motion tokens for motion/react. They mirror --duration-* and --ease-* in docs/design/theme.css (the source of truth:
 * Figma «Saldo» has no motion values), so CSS transitions and JS animations share one set of numbers.
 */
export const MOTION = {
  /** seconds, as motion/react expects; theme.css holds the same values in ms */
  duration: {
    fast: 0.15,
    base: 0.24,
    slow: 0.36,
  },
  ease: {
    /** state changes in place: colours, hover, focus */
    standard: [0.2, 0, 0, 1],
    /** things that move or arrive: the segmented pill, page content, sheets */
    emphasized: [0.2, 0.8, 0.2, 1],
  },
  /** page content rises by this many px as it fades in */
  pageOffsetY: 8,
} as const
