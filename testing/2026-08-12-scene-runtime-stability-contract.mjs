import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FramePhaseScheduler } from "../systems/runtime/FramePhaseScheduler.js";
import { SceneLifecycleRegistry } from "../systems/runtime/SceneLifecycleRegistry.js";
import { SceneModeController } from "../systems/runtime/SceneModeController.js";
import {
  FRAME_CRITICALITIES,
  SCENE_BASE_PHASES,
  SCENE_SUSPENSION_KINDS,
} from "../values/sceneRuntime.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relativePath => readFileSync(path.join(ROOT, relativePath), "utf8");

function testNestedSceneModes() {
  const changes = [];
  const modes = new SceneModeController({ onChanged: snapshot => changes.push(snapshot.gameState) });
  assert.equal(modes.legacyGameState, "title");
  modes.setBasePhase(SCENE_BASE_PHASES.ACTIVE);
  assert.equal(modes.isGameplayActive, true);

  const shop = modes.acquire(SCENE_SUSPENSION_KINDS.SHOP, "shop");
  assert.equal(modes.legacyGameState, "playing", "shop keeps its legacy read contract");
  assert.equal(modes.isGameplayActive, false, "shop token blocks authority controls");
  const pause = modes.acquire(SCENE_SUSPENSION_KINDS.PAUSE, "pause-menu");
  assert.equal(modes.legacyGameState, "paused");
  assert.equal(pause.release(), true);
  assert.equal(pause.release(), false, "suspension release is idempotent");
  assert.equal(modes.legacyGameState, "playing");
  assert.equal(modes.isGameplayActive, false, "outer shop token remains held");
  shop.release();
  assert.equal(modes.isGameplayActive, true);

  modes.acquire(SCENE_SUSPENSION_KINDS.DIALOG, "dialog");
  modes.enterSafePause({ subsystem: "fault-injection" });
  assert.equal(modes.basePhase, SCENE_BASE_PHASES.SAFE_PAUSED);
  assert.equal(modes.snapshot().suspensions.length, 0);
  assert.ok(changes.includes("paused"));
}

function testReverseIdempotentLifecycle() {
  const order = [];
  const errors = [];
  const registry = new SceneLifecycleRegistry({ onDisposeError: finding => errors.push(finding.id) });
  registry.register(() => order.push("first"), { id: "first" });
  registry.register(() => { order.push("second"); throw new Error("expected teardown fault"); }, { id: "second" });
  registry.register({ destroy: () => order.push("third") }, { id: "third" });
  const findings = registry.dispose();
  assert.deepEqual(order, ["third", "second", "first"]);
  assert.deepEqual(errors, ["second"]);
  assert.equal(findings.length, 1);
  assert.deepEqual(registry.dispose(), [], "second teardown is a no-op");
}

function testFramePhasesAndFaultContainment() {
  const order = [];
  const presentations = [];
  const scheduler = new FramePhaseScheduler({
    onPresentationFailure: finding => presentations.push(finding.id),
  });
  scheduler.register({ id: "camera", phase: "camera", criticality: FRAME_CRITICALITIES.PRESENTATION, update: () => order.push("camera") });
  scheduler.register({ id: "world", phase: "world", criticality: FRAME_CRITICALITIES.SIMULATION, update: () => order.push("world") });
  scheduler.register({ id: "input", phase: "input", criticality: FRAME_CRITICALITIES.SIMULATION, update: () => order.push("input") });
  scheduler.register({ id: "simulation", phase: "simulation", criticality: FRAME_CRITICALITIES.PROGRESSION, update: () => order.push("simulation") });
  scheduler.register({ id: "broken-vfx", phase: "presentation", criticality: FRAME_CRITICALITIES.PRESENTATION, update: () => { throw new Error("injected vfx fault"); }, dispose: () => order.push("vfx-disposed") });
  scheduler.register({ id: "telemetry", phase: "telemetry", criticality: FRAME_CRITICALITIES.PRESENTATION, update: () => order.push("telemetry") });
  scheduler.runFrame(1, 16);
  assert.deepEqual(order, ["input", "simulation", "world", "vfx-disposed", "camera", "telemetry"]);
  assert.deepEqual(presentations, ["broken-vfx"]);
  order.length = 0;
  scheduler.runFrame(2, 16);
  assert.deepEqual(order, ["input", "simulation", "world", "camera", "telemetry"], "quarantined VFX stays disabled");

  let authorityFinding = null;
  const authority = new FramePhaseScheduler({ onAuthorityFailure: finding => { authorityFinding = finding; } });
  authority.register({ id: "bad-save", phase: "simulation", criticality: FRAME_CRITICALITIES.PERSISTENCE, update: () => { throw new Error("injected persistence fault"); } });
  authority.register({ id: "must-not-run", phase: "world", criticality: FRAME_CRITICALITIES.SIMULATION, update: () => order.push("unsafe") });
  const result = authority.runFrame(3, 16);
  assert.equal(result.blocked, true);
  assert.equal(authorityFinding.id, "bad-save");
  authority.runFrame(4, 16);
  assert.ok(!order.includes("unsafe"));
}

function testCompositionBoundary() {
  const main = source("main.js");
  const root = source("ui/scenes/PlayScene.js");
  const worldScene = source("world/PlayScene.js");
  const setup = source("world/playScene/PlaySceneSetup.js");
  const worldFiles = [
    setup,
    source("world/playScene/PlaySceneUI.js"),
    source("world/playScene/HardcoreModeBridge.js"),
    source("world/playScene/OverlayManager.js"),
    source("world/playScene/SleepingJackpotBridge.js"),
  ];
  assert.match(main, /from "\.\/ui\/scenes\/PlayScene\.js/);
  assert.match(root, /Object\.defineProperties\(this/);
  assert.match(root, /play-frame-presentation/);
  assert.match(root, /play-frame-lighting/);
  assert.match(setup, /installPlaySceneLifecycle\(this\)/);
  assert.match(setup, /uiPorts\.worldUiFactories/);
  assert.doesNotMatch(worldScene, /(?:\.\.\/)+ui\//);
  worldFiles.forEach(file => assert.doesNotMatch(file, /(?:\.\.\/)+ui\//));
  const activeRuntime = [root, setup, source("world/playScene/PlaySceneUI.js")].join("\n");
  assert.doesNotMatch(activeRuntime, /\.gameState\s*=(?!=)/);
}

testNestedSceneModes();
testReverseIdempotentLifecycle();
testFramePhasesAndFaultContainment();
testCompositionBoundary();
console.log("PASS: PlayScene runtime ownership, lifecycle, modes, and fault containment");
