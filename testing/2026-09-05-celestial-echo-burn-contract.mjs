import assert from "node:assert/strict";
import { sceneFixture, complete, enter } from "./2026-09-05-celestial-presentation-contract.mjs";
import { CelestialContactVfx, celestialTileContact } from "../systems/celestial/CelestialContactVfx.js";
import { CelestialStarVfx } from "../systems/celestial/CelestialStarVfx.js";
import { WaywardStarEngine } from "../systems/celestial/WaywardStarEngine.js";
import { StellarRageEngine } from "../systems/celestial/StellarRageEngine.js";
import { CelestialActivationBudget } from "../systems/celestial/CelestialActivationBudget.js";
import { CELESTIAL_PRESENTATION as P } from "../values/celestialPresentation.js";
import { CELESTIAL_ENGINE_CONFIG as ENGINES } from "../values/celestialEngines.js";
import { STELLAR_LANCE_PRESENTATION as C } from "../values/stellarLancePresentation.js";
import { resolveCelestialTalentEngineDefinition } from "../values/celestialTalentEffects.js";
import { CELESTIAL_TALENT_PROGRESSION_CONFIG as TALENTS } from "../values/celestialTalentProgression.js";

const scene = sceneFixture();
const definition = ENGINES.engines["wayward-star"];
const star = new WaywardStarEngine({ scene,
  budget: new CelestialActivationBudget("wayward-star", "speed-proof", 0, definition),
  definitionOverride: definition, direction: { x: 1, y: 0 }, startX: 1000, startY: 0,
  tileSize: 100, assetKey: "star", getAnchor: () => ({ x: 0, y: 0 }),
  toTile: (x, y) => ({ tx: Math.floor(x / 100), ty: Math.floor(y / 100) }),
  probeTile: () => ({ solid: false, diggable: false }),
});
for (let frame = 1; frame <= 20; frame += 1) star.update(frame * 50, 50);
assert.ok(Math.abs(star.x - 1000 - 8 * 100 * 0.4) < 1e-8,
  "one second of real engine movement is exactly 60% slower");
star.returning = true;
const returnStart = star.x;
for (let frame = 21; frame <= 40; frame += 1) star.update(frame * 50, 50);
assert.ok(Math.abs(returnStart - star.x - 12 * 100 * 0.4) < 1e-8,
  "return movement has the same 60% reduction");
star.destroy();

const branch = TALENTS.branches.find(branch => branch.id === "wayward-star");
const ranked = resolveCelestialTalentEngineDefinition("wayward-star",
  branch.nodes.map(node => node.effectId), Object.fromEntries(branch.nodes.map(node => [node.id, 3])));
assert.ok(Math.abs(ranked.companionSpeedTilesPerSecond - 4.3 * 0.4) < 1e-8);
assert.equal(ranked.companionReturnSpeedTilesPerSecond, 7.5 * 0.4);

const tile = { tx: 2, ty: 3 };
assert.deepEqual(celestialTileContact({ x: 150, y: 340 }, { x: 1, y: 0 }, tile, 100), { x: 200, y: 340 });
assert.deepEqual(celestialTileContact({ x: 350, y: 340 }, { x: -1, y: 0 }, tile, 100), { x: 300, y: 340 });
assert.deepEqual(celestialTileContact({ x: 225, y: 250 }, { x: 0, y: 1 }, tile, 100), { x: 225, y: 300 });
assert.deepEqual(celestialTileContact({ x: 225, y: 450 }, { x: 0, y: -1 }, tile, 100), { x: 225, y: 400 });
assert.deepEqual(celestialTileContact({ x: 150, y: 250 }, { x: 1, y: 1 }, tile, 100), { x: 200, y: 300 });

const colours = new Set();
const paletteScene = sceneFixture();
for (let index = 0; index < 3; index += 1) {
  const visual = new CelestialStarVfx({ scene: paletteScene, x: 0, y: 0,
    assetKey: "star", size: 78, tileSize: 100, kind: "wayward" });
  colours.add(visual.getSnapshot().palette);
  assert.equal(visual.sprite.celestialColourMatrix.hueDeg, visual.palette.hueDeg);
  enter(paletteScene, visual);
  const arrivalAlpha = visual.sprite.alpha;
  visual.update(2200, 16, 100, 0);
  assert.equal(arrivalAlpha, 1);
  assert.equal(visual.sprite.alpha, arrivalAlpha, "the core remains fully opaque during flight");
  assert.ok([...visual.trails].every(trail => trail.key === "star" && trail.x < visual.x),
    "only matching echoes remain behind the core");
  visual.destroy();
}
assert.deepEqual([...colours].sort(), ["azure", "ember", "violet"]);

const impactScene = sceneFixture();
const contacts = new CelestialContactVfx(impactScene, 100);
const contactColours = new Set();
for (let index = 0; index < 5; index += 1) {
  const point = { x: 200 + index, y: 340 };
  assert.equal(contacts.play(point, { x: 1, y: 0 }), true);
  const snapshot = contacts.getSnapshot();
  assert.equal(snapshot.lastContact.x, point.x);
  assert.equal(snapshot.lastContact.y, point.y);
  contactColours.add(snapshot.lastContact.colour);
}
assert.equal(contactColours.size, 5, "five distinct contact colours");
assert.ok(contacts.effects.size <= P.contact.maxLive);
assert.ok(impactScene.displays.every(display => display.key.startsWith("tile-destruction-")),
  "contacts reuse only the approved dig flash and fragment atlases");
assert.ok(impactScene.displays.every(display => display.frame !== "ember-p03"),
  "Celestial impacts do not create burning residue");
for (const flash of impactScene.displays.filter(display => display.frame === P.contact.flashFrame)) {
  const fade = [...impactScene.tweens.active].find(tween => tween.targets === flash);
  assert.equal(fade.duration, P.contact.flashFadeMs);
  assert.equal("scaleX" in fade, false, "the contact flash keeps a crisp fixed shape");
}
contacts.destroy();
assert.ok(impactScene.displays.every(display => display.destroyed));
assert.equal(impactScene.tweens.active.size, 0);

const lanceScene = sceneFixture();
const lanceDefinition = ENGINES.engines["comet-engine"];
const lance = new StellarRageEngine({ scene: lanceScene,
  budget: new CelestialActivationBudget("comet-engine", "echo-proof", 0, lanceDefinition),
  definitionOverride: lanceDefinition, tileSize: 100, random: () => 0.5,
  projectileAssetKeys: ["blue", "violet", "ember", "prismatic"], impactAssetKey: "impact",
  getAnchor: () => ({ x: 100, y: 200 }) });
lance.launchProjectile({ originWorld: { x: 100, y: 200 }, direction: { x: 1, y: 0 },
  targetTile: { tx: 2, ty: 2 }, visualPaths: [{ lane: 0, endTile: { tx: 6, ty: 2 } }], hits: [] });
const projectile = [...lance.projectiles][0];
const travel = [...lanceScene.tweens.active].find(tween => tween.targets === projectile);
assert.equal("alpha" in travel, false, "the core has no opacity tween");
assert.equal("scaleX" in travel, false);
assert.equal("scaleY" in travel, false);
for (let index = 0; index < 200; index += 1) {
  projectile.x += P.lance.trailSpacingPx;
  travel.onUpdate();
}
assert.equal(lance.vfx.trails.size, P.lance.trailMaxLive);
assert.equal(projectile.displayWidth, C.displayWidthPx);
assert.equal(projectile.displayHeight, C.displayHeightPx);
assert.equal(projectile.alpha, 1);
for (const echo of lance.vfx.trails) {
  assert.equal(echo.key, projectile.key, "echoes retain the shot's palette");
  assert.equal(echo.tints, undefined, "echoes do not cycle tint colours");
  const fade = [...lanceScene.tweens.active].find(tween => tween.targets === echo);
  assert.equal(fade.alpha, 0);
  assert.equal(fade.ease, "Linear");
  for (const key of ["scaleX", "scaleY", "angle"]) assert.equal(key in fade, false);
}
const count = lance.vfx.wakeCount;
travel.onUpdate();
assert.equal(lance.vfx.wakeCount, count, "stopped projectiles do not accumulate echoes");
lance.destroy();
assert.ok(lanceScene.displays.every(display => display.destroyed));
assert.equal(lanceScene.tweens.active.size, 0);
console.log("CELESTIAL_CRISP_ECHO_OK: preserved speed and palettes, opaque cores, stable matching echoes, no burn residue, tile-face contact, bounded effects, teardown");
