const activePriorityCounts = new WeakMap();

function isRegistryOwner(owner) {
  return Boolean(
    owner
    && (typeof owner === "object" || typeof owner === "function")
  );
}

export function acquireUiInputPriority(owner) {
  if (!isRegistryOwner(owner)) return () => {};

  activePriorityCounts.set(owner, (activePriorityCounts.get(owner) || 0) + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const remaining = Math.max(0, (activePriorityCounts.get(owner) || 0) - 1);
    if (remaining > 0) activePriorityCounts.set(owner, remaining);
    else activePriorityCounts.delete(owner);
  };
}

export function hasUiInputPriority(owner) {
  return isRegistryOwner(owner)
    && (activePriorityCounts.get(owner) || 0) > 0;
}
