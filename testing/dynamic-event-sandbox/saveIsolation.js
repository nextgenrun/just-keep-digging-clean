// Install before any game module: this document cannot read or write real Web Storage.
(() => {
  const counts = { reads: 0, writes: 0, removals: 0 };
  function memoryStorage() {
    const entries = new Map();
    return {
      get length() { return entries.size; },
      key(index) { return [...entries.keys()][index] ?? null; },
      getItem(key) { counts.reads++; return entries.get(String(key)) ?? null; },
      setItem(key, value) { counts.writes++; entries.set(String(key), String(value)); },
      removeItem(key) { counts.removals++; entries.delete(String(key)); },
      clear() { counts.removals++; entries.clear(); },
    };
  }
  // Fail closed if the browser cannot install the document-local storage ports.
  for (const key of ["localStorage", "sessionStorage"]) {
    Object.defineProperty(window, key, { configurable: false, value: memoryStorage() });
  }
  Object.defineProperty(window, "eventLabStorage", { value: Object.freeze({
    isolated: true,
    snapshot: () => ({ ...counts, persistentReads: 0, persistentWrites: 0 }),
  }) });
})();
