export function getTitanCoverageRequired(total, clearRatio) {
  if (!Number.isInteger(total) || total <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, Number(clearRatio) || 0));
  return Math.ceil(total * ratio);
}

export function isTitanCoverageReady(view, encounter) {
  const total = Number.isInteger(view?.coverageTotal)
    ? view.coverageTotal
    : 0;
  if (total < encounter.minimumCoverageTiles) return false;
  const cleared = Number.isInteger(view?.coverageCleared)
    ? view.coverageCleared
    : total - Math.max(0, Number(view?.coverageRemaining) || 0);
  const required = Number.isInteger(view?.coverageRequired)
    ? view.coverageRequired
    : getTitanCoverageRequired(total, encounter.requiredClearRatio);
  return cleared >= required;
}
