// Orchestrates the production six-slot actionbar view and callbacks.
import {
  CELESTIAL_ACTION_BAR_CONFIG,
  sanitizeCelestialActionBarOrder,
} from "../../values/celestialActionBar.js";
import {
  CelestialActionBarFoundationView,
  resolveCelestialActionBarPlacement,
} from "./CelestialActionBarFoundationView.js";
import { CelestialActionBarMetricsView } from "./CelestialActionBarMetricsView.js";
import { CelestialActionBarSlotView } from "./CelestialActionBarSlotView.js";
import { CelestialActionBarTooltipView } from "./CelestialActionBarTooltipView.js";
import { inspectCelestialActionBarAssets } from "./celestialActionBarAssets.js";
import { buildCelestialActionBarHealth } from "./celestialActionBarHealth.js";

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error || "unknown error");
}

export class CelestialActionBarSystem {
  constructor(scene, options = {}) {
    this.scene = scene;
    this.config = CELESTIAL_ACTION_BAR_CONFIG;
    this.loadoutProvider = options.loadoutProvider || null;
    this.getAbilityState = options.getAbilityState || null;
    this.getMetrics = options.getMetrics || null;
    this.onActivate = options.onActivate || null;
    this.onBlockedActivate = options.onBlockedActivate || null;
    this.onLoadoutChange = options.onLoadoutChange || null;
    this.visible = options.visible !== false;
    this.destroyed = false;
    this.mounted = false;
    this.tooltipVisible = false;
    this.slotsById = new Map();
    this.lastStateError = "";
    this.lastPersistenceError = "";
    this.lastActivationError = "";
    this.order = sanitizeCelestialActionBarOrder(this._readLoadout());
    this.assetHealth = inspectCelestialActionBarAssets(scene, this.config.entries);
    this._resizeHandler = () => this.resize();
    this.scene.scale?.on?.("resize", this._resizeHandler);
    this.refreshAssets();
  }

  _readLoadout() {
    try {
      return this.loadoutProvider?.getLoadout?.() || null;
    } catch (error) {
      this.lastPersistenceError = errorMessage(error);
      return null;
    }
  }

  refreshAssets() {
    if (this.destroyed || this.mounted) return this.mounted;
    this.assetHealth = inspectCelestialActionBarAssets(
      this.scene,
      this.config.entries,
    );
    if (this.assetHealth.missingTextures.length > 0) return false;
    this._build();
    this.resize();
    this.sync();
    this.setVisible(this.visible);
    return true;
  }

  refreshEntryIcons() {
    if (this.destroyed || !this.mounted) return false;
    const assetHealth = inspectCelestialActionBarAssets(this.scene, this.config.entries);
    if (assetHealth.missingTextures.length > 0) return false;
    this.assetHealth = assetHealth;
    this.config.entries.forEach(entry => {
      this.slotsById.get(entry.id)?.setIcon?.(assetHealth.icons[entry.id]);
    });
    return true;
  }

  _build() {
    this.foundationView = new CelestialActionBarFoundationView(
      this.scene,
      this.assetHealth,
    );
    for (const entry of this.config.entries) {
      const slot = new CelestialActionBarSlotView(
        this.scene,
        entry,
        this.assetHealth,
        {
          onActivate: current => this._activateEntry(current, this.config.interaction.pointerActivationSource),
          onHover: current => this._showTooltip(current),
          onOut: () => this._hideTooltip(),
          onDragStart: () => this._hideTooltip(),
          onDragEnd: (current, pointer) => this._finishDrag(current, pointer),
        },
      );
      this.slotsById.set(entry.id, slot);
    }

    this.tooltip = new CelestialActionBarTooltipView(
      this.scene,
      this.assetHealth.chrome.tooltip,
    );
    this.metrics = new CelestialActionBarMetricsView(this.scene, this.getMetrics);
    this.mounted = true;
  }

  _resolveState(entry) {
    let source = null;
    try {
      source = this.getAbilityState?.(entry.id, entry) || null;
      this.lastStateError = "";
    } catch (error) {
      this.lastStateError = errorMessage(error);
    }
    const unlocked = source?.unlocked === true;
    return Object.freeze({
      unlocked,
      available: unlocked && source?.available !== false,
      active: source?.active === true,
      quantity: Number.isFinite(source?.quantity)
        ? Math.max(0, Math.floor(source.quantity))
        : null,
      description: source?.description || entry.description,
      unlockCondition: source?.unlockCondition || entry.unlockCondition,
      unavailableReason: source?.unavailableReason || this.config.copy.unavailable,
    });
  }

  sync(pulseEntryId = null) {
    if (!this.mounted && !this.refreshAssets()) return this.getHealthSnapshot();
    for (const entry of this.config.entries) {
      this.slotsById.get(entry.id)?.setState(this._resolveState(entry));
    }
    this.slotsById.get(pulseEntryId)?.pulse?.();
    this.metrics?.sync();
    if (this.tooltipVisible && this.hoveredSlot) this._showTooltip(this.hoveredSlot);
    return this.getHealthSnapshot();
  }

  _activateEntry(slot, source) {
    const state = this._resolveState(slot.entry);
    slot.setState(state);
    if (!state.unlocked || !state.available) {
      this._showTooltip(slot);
      this.onBlockedActivate?.(slot.entry.id, { source, state, slotNumber: slot.slotNumber });
      return { ok: false, reason: state.unlocked ? "unavailable" : "locked" };
    }
    if (typeof this.onActivate !== "function") {
      return { ok: false, reason: "missing-activation-handler" };
    }
    try {
      const result = this.onActivate(slot.entry.id, {
        source,
        state,
        slotNumber: slot.slotNumber,
      });
      this.lastActivationError = "";
      if (result !== false && result?.ok !== false) slot.pulse();
      return result ?? { ok: true };
    } catch (error) {
      this.lastActivationError = errorMessage(error);
      return { ok: false, reason: "activation-error" };
    }
  }

  activateSlot(slotNumber, source = this.config.interaction.keyboardActivationSource) {
    const entryId = this.order[slotNumber - 1];
    const slot = this.slotsById.get(entryId);
    if (!slot) return { ok: false, reason: "invalid-slot" };
    return this._activateEntry(slot, source);
  }

  _finishDrag(slot, pointer) {
    const sourceIndex = this.order.indexOf(slot.entry.id);
    const targetIndex = this.order.findIndex(entryId => (
      this.slotsById.get(entryId)?.containsScreenPoint(pointer?.x, pointer?.y)
    ));
    if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
      this._layoutSlots();
      return false;
    }
    const previousOrder = [...this.order];
    [this.order[sourceIndex], this.order[targetIndex]] = [
      this.order[targetIndex],
      this.order[sourceIndex],
    ];
    if (!this._persistOrder(previousOrder, sourceIndex, targetIndex)) {
      this.order = previousOrder;
    }
    this._layoutSlots();
    return true;
  }

  _persistOrder(previousOrder, sourceIndex, targetIndex) {
    const nextOrder = [...this.order];
    const metadata = Object.freeze({
      reason: this.config.interaction.dragSaveReason,
      sourceIndex,
      targetIndex,
      previousOrder: Object.freeze([...previousOrder]),
    });
    try {
      const providerResult = this.loadoutProvider?.setLoadout?.(nextOrder, metadata);
      const callbackResult = this.onLoadoutChange?.(nextOrder, metadata);
      if (providerResult === false || callbackResult === false) throw new Error(this.config.copy.persistenceError);
      this.lastPersistenceError = "";
      return true;
    } catch (error) {
      this.lastPersistenceError = errorMessage(error);
      return false;
    }
  }

  _showTooltip(slot) {
    if (!this.mounted || !slot) return;
    const state = slot.state || this._resolveState(slot.entry);
    const body = !state.unlocked
      ? `${this.config.copy.lockedPrefix}${state.unlockCondition}`
      : !state.available
        ? state.unavailableReason
        : `${state.description} ${this.config.copy.readyHint}`;
    this.hoveredSlot = slot;
    this.tooltipVisible = true;
    this.tooltip.show(slot, `${slot.slotNumber}  ${slot.entry.label}`, body);
    this.tooltip.setParentVisible(this.visible);
  }

  _hideTooltip() {
    this.hoveredSlot = null;
    this.tooltipVisible = false;
    this.tooltip?.hide();
  }

  resize() {
    if (!this.mounted) return false;
    const layout = this.config.layout;
    const width = this.scene.scale?.width || layout.referenceWidthPx;
    const height = this.scene.scale?.height || layout.referenceHeightPx;
    this.placement = resolveCelestialActionBarPlacement(width, height);
    this.uiScale = this.placement.scale;
    this.centerX = this.placement.centerX;
    this.centerY = this.placement.centerY;
    this.foundationView.resize(this.centerX, this.centerY, this.uiScale);
    this.metrics?.resize(this.centerX, this.centerY, this.uiScale);
    this._layoutSlots();
    this.tooltip?.resize(
      width, this.centerY, this.uiScale, this.placement.bounds.left,
    );
    return true;
  }

  _layoutSlots() {
    if (!this.mounted) return;
    this.order.forEach((entryId, index) => {
      const slot = this.slotsById.get(entryId);
      const position = this.foundationView.getSlotPosition(index);
      slot?.setSlotNumber(index + 1);
      slot?.setBasePosition(position.x, position.y, this.uiScale);
    });
  }

  setVisible(visible) {
    this.visible = visible === true;
    this.foundationView?.setVisible(this.visible);
    for (const slot of this.slotsById.values()) slot.setVisible(this.visible);
    this.metrics?.setVisible(this.visible);
    this.tooltip?.setParentVisible(this.visible);
  }

  getLoadout() {
    return [...this.order];
  }

  loadLoadout(order) {
    if (this.destroyed) return false;
    this.order = sanitizeCelestialActionBarOrder(order);
    this._layoutSlots();
    this.sync();
    return this.getLoadout();
  }

  getHealthSnapshot() {
    return buildCelestialActionBarHealth(this);
  }

  destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.scene.scale?.off?.("resize", this._resizeHandler);
    this._hideTooltip();
    for (const slot of this.slotsById.values()) slot.destroy();
    this.slotsById.clear();
    this.foundationView?.destroy();
    this.metrics?.destroy();
    this.tooltip?.destroy();
    this.mounted = false;
  }
}
