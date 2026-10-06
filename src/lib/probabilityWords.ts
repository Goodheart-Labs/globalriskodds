// Word ladder carried over from birdflurisk.com (big-risk-odds src/lib/probabilities.ts),
// plus a 1% rung: ICD 203 reserves "very unlikely" for 5-20%.
const NAMED_PROBABILITIES: Record<number, string> = {
  1: "Almost certainly not",
  3: "Very unlikely",
  8: "Little chance",
  20: "Unlikely",
  23: "Probably not",
  40: "Maybe",
  50: "About even",
  57: "Better than even",
  68: "Probably",
  74: "Likely",
  80: "Very good chance",
  90: "Highly likely",
  97: "Almost certain",
};

/** Nearest word on the ladder; `p` is 0–1. */
export function probabilityWord(p: number): string {
  const percent = p * 100;
  const closest = Object.keys(NAMED_PROBABILITIES)
    .map(Number)
    .reduce((prev, curr) => (Math.abs(curr - percent) < Math.abs(prev - percent) ? curr : prev));
  return NAMED_PROBABILITIES[closest];
}

/** CSS colour for the word; `p` is 0–1. Mixed toward the text colour so it reads on light and dark themes. */
export function probabilityColor(p: number): string {
  const tone = p <= 0.2 ? "success" : p <= 0.5 ? "warning" : "error";
  return `color-mix(in oklab, var(--color-${tone}) 70%, var(--color-base-content))`;
}

export function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
