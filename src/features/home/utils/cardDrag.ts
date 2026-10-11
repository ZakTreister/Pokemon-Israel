// Three small settling positions keep the existing artwork within the hero.
export function settleCardOffset(offset: number): number {
  return Math.max(-1, Math.min(1, Math.round(offset / 80) || 0)) * 80;
}
