import assert from "node:assert/strict";
import { forceGraveborerWurmEncounter, resolveGraveborerWurmActivation } from "../world/playScene/GraveborerWurmBridge.js";
import { GraveborerWurmSystem } from "../systems/environment/GraveborerWurmSystem.js";
import { WURM_SIZES, WURM_DIFFICULTIES } from "../values/graveborerWurmVariants.js";
import { GRAVEBORER_WURM_CONFIG } from "../values/graveborerWurm.js";

const context = { active: true, playerTile: { tx: 36, ty: 1500 },
  worldWidthTiles: 72, depth: 1400, playerBounds: { left: 35.8, right: 36.2, top: 1499.8, bottom: 1500.2 } };
const preview = new GraveborerWurmSystem();
const previewScene = { config: { topAirRows: 64 }, hardcoreModeData: { mode: "casual" },
  upgradeSystem: { isGemPowerUnlocked: () => false },
  playerController: { getPlayerTile: () => context.playerTile },
  dynamicEventRuntime: { devEnabled: true },
  graveborerWurmRuntime: { devToolsEnabled: false, system: preview } };
assert.equal(forceGraveborerWurmEncounter(previewScene, { size: "giant", difficulty: "broodmother" }), true,
  "the local event panel can summon in the bounded demo without enabling generic cheats");
const previewGate = resolveGraveborerWurmActivation(previewScene, context.playerTile, preview, true);
assert.equal(previewGate.active, true);
assert.equal(previewGate.productionActive, false);
preview.update(25, { ...context, active: previewGate.active });
assert.equal(preview.phase, "warning");
assert.equal(preview.variant.difficulty.id, "broodmother");
previewScene.dynamicEventRuntime.devEnabled = false;
assert.equal(forceGraveborerWurmEncounter(previewScene), false, "no developer trigger is exposed remotely");
const results = [];
for (const size of WURM_SIZES) for (const profile of WURM_DIFFICULTIES) {
  const system = new GraveborerWurmSystem();
  system.forceEncounter(context.playerTile, { size: size.id, difficulty: profile.id });
  let time = 0, starts = 0, completions = 0, offspringStarts = 0, childrenMax = 0, sampleCount = 0, hits = 0;
  const seenParts = new Set();
  while (time < 120000) {
    time += 25; system.update(25, context);
    const state = system.getSnapshot(), render = system.getRenderState(time);
    if (state.phase === "warning") assert.ok(state.difficulty.warningMs >= 1800, "every pass preserves a reaction window");
    childrenMax = Math.max(childrenMax, state.offspring.length);
    for (const event of system.drainEvents()) {
      if (event.type === "phase" && event.phase === "warning") starts++;
      if (event.type === "encounter-complete") completions++;
      if (event.type === "offspring-phase" && event.phase === "warning") offspringStarts++;
      if (event.type === "hit") hits++;
    }
    assert.ok(childrenMax <= 2, "brood remains bounded");
    const parts = [render.head, ...render.bodies, render.tail];
    parts.forEach((part, index) => { if (part.visible) seenParts.add(index); });
    for (let index = 2; index < parts.length - 1; index++) {
      const a = parts[index - 1], b = parts[index];
      if (!a.visible || !b.visible) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const visibleBodyWidth = GRAVEBORER_WURM_CONFIG.visuals.bodyWidthTiles * (344 / 384) * size.scale;
      assert.ok(distance < visibleBodyWidth * 0.8, "authored body alpha bounds overlap along the entire path");
      sampleCount++;
    }
    if (state.phase === "cooldown") break;
  }
  assert.ok(time < 120000, "hunt and offspring must finish");
  assert.equal(starts, profile.passes);
  assert.equal(completions, 1);
  assert.equal(childrenMax, profile.brood);
  assert.equal(offspringStarts, profile.brood * WURM_DIFFICULTIES[0].passes);
  assert.equal(seenParts.size, GRAVEBORER_WURM_CONFIG.path.segmentCount + 2);
  assert.ok(sampleCount > 50);
  const resumed = new GraveborerWurmSystem();
  resumed.loadSaveData(system.getSaveData());
  assert.equal(resumed.phase, "cooldown");
  results.push({ size: size.id, difficulty: profile.id, durationMs: time, offspring: childrenMax, hits });
}

// Reload an active brood through the production sanitizer and re-warning path.
const brood = new GraveborerWurmSystem();
brood.forceEncounter(context.playerTile, { size: "large", difficulty: "broodmother" });
for (let time = 0; time < 30000 && !brood.offspring.length; time += 25) {
  brood.update(25, context); brood.drainEvents();
}
assert.deepEqual(brood.selection, {}, "developer selection is consumed by this hunt only");
const saved = brood.getSaveData();
assert.equal(saved.offspring.length, 2);
const reloaded = new GraveborerWurmSystem();
reloaded.loadSaveData(saved);
assert.equal(reloaded.variant.difficulty.id, "broodmother");
assert.equal(reloaded.offspring.length, 2);
assert.deepEqual(reloaded.selection, {}, "loading a hunt does not pin future natural variants");
for (let time = 0; time < 120000 && reloaded.phase !== "cooldown"; time += 25) {
  reloaded.update(25, context); reloaded.drainEvents();
  assert.ok(reloaded.offspring.length <= 2, "reload must not duplicate the brood");
}
assert.equal(reloaded.phase, "cooldown");
console.log(JSON.stringify({ passed: "25 Wurm size/behaviour combinations, continuous body spacing, bounded offspring and reload", results }));