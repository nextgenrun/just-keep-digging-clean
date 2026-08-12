import {
  MAX_RESOURCE_TOTAL,
  validateResourceTotals,
} from "../../values/resourceTypes.js";
import { reportProgressionInvariantFailure } from
  "../health/progressionInvariantReporter.js";

export function replaceResourceTotals(current, candidate) {
  if (!validateResourceTotals(candidate)) {
    reportProgressionInvariantFailure({
      authority: "resource-total",
      reason: "invalid-resource-snapshot",
      value: candidate,
    });
    return false;
  }
  return true;
}

export function grantResourceTotal(resources, resourceType, amount) {
  const current = resources?.[resourceType] ?? 0;
  const next = current + amount;
  if (
    !Number.isFinite(amount)
    || !Number.isInteger(amount)
    || amount < 0
    || !Number.isSafeInteger(next)
    || next > MAX_RESOURCE_TOTAL
  ) {
    reportProgressionInvariantFailure({
      authority: `resource-${resourceType}`,
      reason: "resource-grant-out-of-range",
      value: amount,
    });
    return 0;
  }
  resources[resourceType] = next;
  return amount;
}
