import { INTERACTIVE_WORLD_STATES } from
  "../../values/interactiveWorldStates.js";

export class MemoryReliquaryDiscoverySystem {
  constructor(
    retentionProgressSystem,
    onChanged,
    config = INTERACTIVE_WORLD_STATES.memoryReliquaries,
  ) {
    this.retentionProgressSystem = retentionProgressSystem;
    this.onChanged = onChanged;
    this.config = config;
    this.discovered = new Set();
    this.refresh();
  }

  refresh() {
    const journal = this.retentionProgressSystem
      ?.getJournalSnapshot?.()
      ?.discoveries
      ?.journal;
    this.discovered = new Set(
      (Array.isArray(journal) ? journal : [])
        .filter(key => key.startsWith(this.config.journalKeyPrefix)),
    );
    return this.discovered.size;
  }

  isDiscovered(definitionOrKey) {
    const key = typeof definitionOrKey === "string"
      ? definitionOrKey
      : definitionOrKey?.journalKey;
    return Boolean(key && this.discovered.has(key));
  }

  open(definition) {
    if (!definition?.journalKey) {
      return { success: false, reason: "invalid-memory-reliquary" };
    }
    if (this.isDiscovered(definition)) {
      return {
        success: true,
        type: "memory-reliquary-read",
        definition,
        newlyDiscovered: false,
      };
    }

    const recorded = this.retentionProgressSystem?.discoverJournal?.(
      definition.journalKey,
      definition.title,
    ) === true;
    if (!recorded) {
      this.refresh();
      if (!this.isDiscovered(definition)) {
        return { success: false, reason: "memory-journal-unavailable" };
      }
    } else {
      this.discovered.add(definition.journalKey);
      this.onChanged?.();
    }
    return {
      success: true,
      type: "memory-reliquary",
      definition,
      newlyDiscovered: recorded,
    };
  }

  getSnapshot() {
    return {
      discovered: [...this.discovered],
      count: this.discovered.size,
    };
  }

  destroy() {
    this.discovered.clear();
    this.retentionProgressSystem = null;
    this.onChanged = null;
  }
}
