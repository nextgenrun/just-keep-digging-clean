import { INVENTORY_RESOURCE_GUIDE } from
  "../../values/inventoryResourceGuide.js";

const MOVE_CODES = Object.freeze({
  ArrowLeft: -1,
  KeyA: -1,
  ArrowRight: 1,
  KeyD: 1,
  ArrowUp: -2,
  KeyW: -2,
  ArrowDown: 2,
  KeyS: 2,
});

export function resolveResourceCodexMove(selectedKey, delta) {
  const keys = INVENTORY_RESOURCE_GUIDE.resourceKeys;
  const current = Math.max(0, keys.indexOf(selectedKey));
  const target = Math.max(0, Math.min(keys.length - 1, current + delta));
  return keys[target] || keys[0];
}

export class UIInventoryResourceKeyboard {
  constructor(scene, callbacks) {
    this.scene = scene;
    this.callbacks = callbacks;
    this.handleKeyDown = event => this._handleKeyDown(event);
    this.scene.input.keyboard.on("keydown", this.handleKeyDown);
  }

  _handleKeyDown(event) {
    const state = this.callbacks.getState();
    if (!(state.isOpen ?? state.open) || state.activeTab !== 1) return false;
    const delta = MOVE_CODES[event.code || event.key];
    if (!Number.isInteger(delta)) return false;
    event.preventDefault?.();
    event.stopPropagation?.();
    const resourceKey = resolveResourceCodexMove(
      state.selectedGuideResource,
      delta,
    );
    if (resourceKey !== state.selectedGuideResource) {
      this.callbacks.onSelect(resourceKey);
    }
    return true;
  }

  destroy() {
    this.scene?.input?.keyboard?.off("keydown", this.handleKeyDown);
    this.callbacks = null;
    this.scene = null;
  }
}
