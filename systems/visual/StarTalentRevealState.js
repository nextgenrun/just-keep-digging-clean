import {
  STARLIGHT_TALENT_RESOURCE_ORDER,
  STARLIGHT_TALENT_TREE_CONFIG,
} from "../../values/starlightTalentTree.js";

const VALID_RESOURCES = new Set(STARLIGHT_TALENT_RESOURCE_ORDER);

function uniqueValid(values) {
  const source = Array.isArray(values) ? values : [];
  return STARLIGHT_TALENT_RESOURCE_ORDER.filter(resourceType => source.includes(resourceType));
}

export class StarTalentRevealState {
  constructor({ storage = globalThis.localStorage, saveSlot = 1 } = {}) {
    this.storage = storage || null;
    this.saveSlot = Number.isInteger(saveSlot) && saveSlot > 0 ? saveSlot : 1;
    this.storageKey = `${STARLIGHT_TALENT_TREE_CONFIG.reveal.storageKey}-slot-${this.saveSlot}`;
    this.state = this._read();
  }

  queueFirstStar(detail) {
    const resourceType = detail?.resourceType;
    const count = Math.max(0, Math.floor(Number(detail?.count) || 0));
    if (count !== 1 || !VALID_RESOURCES.has(resourceType)) return false;
    if (
      this.state.seen.includes(resourceType)
      || this.state.pending.includes(resourceType)
    ) {
      return false;
    }

    this.state.pending.push(resourceType);
    this.state.pending = this.state.pending.slice(
      0,
      STARLIGHT_TALENT_TREE_CONFIG.reveal.maxPending,
    );
    this._write();
    return true;
  }

  peekPending() {
    return this.state.pending[0] || null;
  }

  markShown(resourceType) {
    if (!VALID_RESOURCES.has(resourceType)) return false;
    this.state.pending = this.state.pending.filter(value => value !== resourceType);
    if (!this.state.seen.includes(resourceType)) {
      this.state.seen.push(resourceType);
      this.state.seen = uniqueValid(this.state.seen);
    }
    this._write();
    return true;
  }

  getSnapshot() {
    return {
      seen: [...this.state.seen],
      pending: [...this.state.pending],
    };
  }

  _read() {
    try {
      const parsed = JSON.parse(this.storage?.getItem?.(this.storageKey) || "{}");
      return {
        seen: uniqueValid(parsed.seen),
        pending: uniqueValid(parsed.pending).filter(
          resourceType => !uniqueValid(parsed.seen).includes(resourceType),
        ),
      };
    } catch {
      return { seen: [], pending: [] };
    }
  }

  _write() {
    try {
      this.storage?.setItem?.(this.storageKey, JSON.stringify(this.state));
    } catch {
      // Storage is optional; the in-memory once-per-section gate still applies.
    }
  }
}
