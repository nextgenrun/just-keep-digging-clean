import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { DepthGateSystem } from "../systems/progression/DepthGateSystem.js";
import { SceneModeController } from "../systems/runtime/SceneModeController.js";
import { SCENE_BASE_PHASES } from "../values/sceneRuntime.js";
import { HardcoreModalOverlay } from "../ui/overlays/HardcoreModalOverlay.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

class TypedModalStub {
  constructor() {
    this.visible = false;
    this.options = null;
  }

  get isVisible() {
    return this.visible;
  }

  showConfirmation(options) {
    if (this.visible) return false;
    this.visible = true;
    this.options = options;
    return true;
  }

  close({ cancelled = false } = {}) {
    if (!this.visible) return false;
    const onCancel = this.options?.onCancel;
    this.visible = false;
    this.options = null;
    if (cancelled) onCancel?.();
    return true;
  }

  async confirm() {
    if (!this.visible) return false;
    const result = await this.options?.onConfirm?.();
    if (result !== false) {
      this.visible = false;
      this.options = null;
    }
    return result;
  }
}

function createFixture(depth = 100) {
  const calls = {
    controls: [],
    paused: [],
    cancelHazards: 0,
    resetSpawn: 0,
    saves: 0,
    keyboardResets: 0,
    flashes: [],
  };
  const modal = new TypedModalStub();
  const sceneModeController = new SceneModeController({ basePhase: SCENE_BASE_PHASES.ACTIVE });
  const scene = {
    config: { topAirRows: 65 },
    sceneModeController,
    acquireSceneSuspension: (kind, owner) => sceneModeController.acquire(kind, owner),
    playerController: {
      getPlayerTile: () => ({ ty: 65 + depth - 1 }),
      setControlsEnabled: enabled => calls.controls.push(enabled),
    },
    earthquakeSystem: {
      setPaused: paused => calls.paused.push(paused),
      cancelActiveHazards: () => { calls.cancelHazards += 1; },
    },
    queueDugTilesSave: () => { calls.saves += 1; },
    _resetPlayerToSpawn: () => { calls.resetSpawn += 1; },
    hudSystem: {
      flashStatus: (...args) => calls.flashes.push(args),
    },
    input: {
      keyboard: {
        resetKeys: () => { calls.keyboardResets += 1; },
      },
    },
  };
  Object.defineProperty(scene, "gameState", {
    enumerable: true,
    get: () => sceneModeController.legacyGameState,
  });
  return {
    calls,
    modal,
    scene,
    system: new DepthGateSystem(scene, modal),
  };
}

{
  const { calls, modal, scene, system } = createFixture(100);
  assert.equal(system.update(), true, "100m must open a blocking gate");
  assert.equal(system.isOpen(), true);
  assert.equal(scene.gameState, "depth-warning");
  assert.deepEqual(calls.controls, [false]);
  assert.deepEqual(calls.paused, [true]);
  assert.equal(modal.options?.title, "DEPTH WARNING: 100M");
  assert.equal(modal.options?.subtitle, "PROGRESSION CONFIRMATION");
  assert.equal(modal.options?.footer, "ESC  RETURN TO SPAWN");
  assert.equal(modal.options?.confirmationWord, "100M");
  assert.equal(modal.options?.typedInstruction, "TYPE  100M  THEN PRESS ENTER");
  assert.match(modal.options?.body || "", /first deep layer/i);

  assert.equal(await modal.confirm(), true);
  assert.equal(system.isOpen(), false);
  assert.deepEqual(system.getSaveData(), { acceptedThresholds: [100] });
  assert.equal(calls.saves, 1);
  assert.equal(scene.gameState, "playing");
  assert.deepEqual(calls.controls, [false, true]);
  assert.deepEqual(calls.paused, [true, false]);
  assert.equal(calls.keyboardResets, 1);
}

{
  const { calls, modal, scene, system } = createFixture(300);
  system.loadSaveData({ acceptedThresholds: [100] });
  assert.equal(system.update(), true, "300m must open after 100m was accepted");
  assert.equal(modal.options?.confirmationWord, "300M");
  assert.equal(modal.options?.typedInstruction, "TYPE  300M  THEN PRESS ENTER");
  assert.equal(modal.close({ cancelled: true }), true);
  assert.equal(system.isOpen(), false);
  assert.equal(calls.cancelHazards, 1);
  assert.equal(calls.resetSpawn, 1);
  assert.equal(calls.saves, 0);
  assert.deepEqual(system.getSaveData(), { acceptedThresholds: [100] });
  assert.equal(scene.gameState, "playing");
}

{
  const { modal, system } = createFixture(1000);
  system.loadSaveData({ acceptedThresholds: [100, 300] });
  assert.equal(system.update(), true, "1000m must open after earlier gates were accepted");
  assert.equal(modal.options?.confirmationWord, "RISK");
  assert.equal(modal.options?.typedInstruction, "TYPE  RISK  THEN PRESS ENTER");
}

{
  const { system } = createFixture(1000);
  system.loadSaveData({ acceptedThresholds: [300, 100, 999, 700] });
  assert.deepEqual(
    system.getSaveData(),
    { acceptedThresholds: [100, 300, 1000] },
    "legacy 999m saves must still migrate to the 1000m gate",
  );
  assert.equal(system.update(), false, "accepted gates must not reopen");
}

{
  const { scene } = createFixture(100);
  assert.throws(
    () => new DepthGateSystem(scene),
    /Typed Phaser confirmation modal is required/,
    "missing approved modal wiring must fail setup instead of bypassing a gate",
  );
}

{
  let commits = 0;
  const typed = {
    text: "",
    color: "",
    setText(value) {
      this.text = value;
      return this;
    },
    setColor(value) {
      this.color = value;
      return this;
    },
  };
  const overlay = Object.create(HardcoreModalOverlay.prototype);
  Object.assign(overlay, {
    root: { visible: true },
    mode: "confirmation",
    busy: false,
    buffer: "",
    confirmationWord: "300M",
    typed,
    scene: { soundSystem: { playUiSelect() {} } },
    _commitConfirmation: () => { commits += 1; },
  });
  const keyEvent = key => ({
    key,
    preventDefault() {},
    stopPropagation() {},
  });
  ["3", "0", "0", "m"].forEach(key => overlay._handleKey(keyEvent(key)));
  assert.equal(overlay.buffer, "300M", "the shared popup must accept digits and normalize letters");
  assert.equal(typed.text, "3 0 0 M");
  overlay._handleKey(keyEvent("Enter"));
  assert.equal(commits, 1, "the exact alphanumeric depth phrase must unlock confirmation");
}

const gateSource = fs.readFileSync(
  path.join(ROOT, "systems/progression/DepthGateSystem.js"),
  "utf8",
);
const modalSource = fs.readFileSync(
  path.join(ROOT, "ui/overlays/HardcoreModalOverlay.js"),
  "utf8",
);
const setupSource = fs.readFileSync(
  path.join(ROOT, "world/playScene/PlaySceneSetup.js"),
  "utf8",
);

assert.doesNotMatch(gateSource, /document\.(?:createElement|addEventListener)/);
assert.match(
  setupSource,
  /new DepthGateSystem\(this,\s*this\._hardcoreRuntime\?\.modal\)/,
  "DepthGateSystem must receive the exact Unstuck modal instance",
);
assert.match(modalSource, /this\.config\.copy\.typedInstruction/);
assert.match(modalSource, /this\.config\.unstuck\.confirmationWord/);
assert.ok(
  modalSource.includes("/^[a-z0-9]$/i.test(key)"),
  "the shared popup keyboard path must allow the numeric depth phrases",
);
assert.match(modalSource, /this\.buffer !== this\.confirmationWord/);
assert.match(modalSource, /footer = "ESC  CANCEL"/);

console.log("DEPTH_GATE_TYPED_MODAL_CONTRACT_OK");
