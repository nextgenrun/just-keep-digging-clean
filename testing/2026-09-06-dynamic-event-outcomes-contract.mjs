import assert from "node:assert/strict";
import { DynamicEventHealthSystem } from "../systems/health/DynamicEventHealthSystem.js";
import { GraveborerWurmSystem } from "../systems/environment/GraveborerWurmSystem.js";
import { handleGraveborerWurmEvents } from "../world/playScene/GraveborerWurmEventBridge.js";

const health = new DynamicEventHealthSystem();
const quake = (active, rocks, hits, phase = active ? "earthquake" : "idle") =>
  ({ active, phase, pulse: rocks + hits, source: { health: { rocks, hits } } });
health.observe("earthquake", quake(false, 20, 7), 0);
health.observe("earthquake", quake(true, 20, 7, "warning"), 100);
health.observe("earthquake", quake(true, 23, 9, "aftermath"), 200);
assert.equal(health.snapshot().events.earthquake.result, null, "settling rubble cannot produce an early result");
health.observe("earthquake", quake(false, 23, 9), 300);
assert.deepEqual(health.snapshot().events.earthquake.result.metrics, { rocks: 3, hits: 2 });
health.observe("earthquake", quake(true, 23, 9, "warning"), 400);
health.observe("earthquake", quake(false, 24, 9), 500);
assert.equal(health.snapshot().events.earthquake.result.detail, "1 rock fell · 0 hits", "second encounter excludes previous rocks/hits");
health.observe("earthquake", quake(true, 24, 9, "warning"), 600);
health.observe("earthquake", quake(false, 24, 9), 700);
assert.equal(health.snapshot().events.earthquake.result.detail, "No rocks fell nearby.", "empty terrain must not invent danger");

for (const blocks of [0, 1, 3]) {
  health.observe("shadow", { active: true, phase: "spawning", pulse: 1, source: { work: { blocksMined: 0 } } }, 1000);
  health.observe("shadow", { active: false, phase: "dormant", pulse: 2, source: { work: { blocksMined: blocks } } }, 2000);
  assert.equal(health.snapshot().events.shadow.result.metrics.blocksMined, blocks);
}
health.observe("shadow", { active: true, phase: "observing", pulse: 3 }, 3000);
const completedBeforeCancel = health.snapshot().events.shadow.completions;
health.markCancelled("shadow", 3100);
health.observe("shadow", { active: false, phase: "dormant", pulse: 4, source: { work: { blocksMined: 3 } } }, 3200);
assert.equal(health.snapshot().events.shadow.result, null);
assert.equal(health.snapshot().events.shadow.finishedAt, -Infinity);
assert.equal(health.snapshot().events.shadow.completions, completedBeforeCancel);

const system = new GraveborerWurmSystem();
const runtime = { system, lastGate: { productionActive: false }, encountersCompleted: 0, tilesCarved: 0 };
const scene = {};
const context = { active: true, playerTile: { tx: 60, ty: 1300 }, depth: 1300, worldWidthTiles: 150 };
let time = 4000;
for (const [difficulty, passes, brood] of [["broodmother", 4, 2], ["drifter", 2, 0]]) {
  system.forceEncounter(context.playerTile, { size: "large", difficulty });
  do {
    system.update(25, context); handleGraveborerWurmEvents(scene, runtime); time += 25;
    const source = system.getSnapshot();
    health.observe("wurm", { active: ["warning", "burrowing"].includes(source.phase),
      phase: source.phase, pulse: source.heartbeat, source, encounterResult: runtime.lastEncounterResult }, time);
    assert.ok(time < 120000, "Wurm sequence must complete");
  } while (system.phase !== "cooldown");
  assert.equal(system.passCount, 0, "controller reset must not erase the measured completion");
  const result = health.snapshot().events.wurm.result;
  assert.equal(result.metrics.completedPasses, passes);
  assert.equal(result.metrics.offspringCount, brood);
}
assert.equal(runtime.encountersCompleted, 2);
console.log("Encounter-scoped results passed: repeated quake deltas, empty/ordinary Shadowminer work, cancellation, real Wurm/brood completion after reset.");
