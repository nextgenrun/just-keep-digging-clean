import assert from "node:assert/strict";
import { CampfireEvolutionPresentation } from "../systems/visual/CampfireEvolutionPresentation.js";
import { EmberDiscoveryEvolutionView } from "../systems/visual/EmberDiscoveryEvolutionView.js";
import { EmberDiscoveryEventSystem } from "../systems/visual/EmberDiscoveryEventSystem.js";
import { CampfireSystem } from "../systems/environment/CampfireSystem.js";
import {
  CAMPFIRE_CONFIG,
  CAMPFIRE_TIERS,
  CAMPFIRE_CONSUMABLE_CONFIG,
} from "../values/campfireConfig.js";
import { CAMPFIRE_EVOLUTION } from "../values/campfireEvolution.js";
import { EMBER_DISCOVERY_EVENT_CONFIG } from "../values/emberDiscoveryEvent.js";
import { evolutionScene } from "./2026-09-03-evolution-fixtures.mjs";

const scene = evolutionScene();
const tierOneKey = CAMPFIRE_CONFIG.spriteKeys[0];
const tierTwoKey = CAMPFIRE_CONFIG.spriteKeys[1];
const tierFourKey = CAMPFIRE_CONFIG.spriteKeys[3];
assert.deepEqual(
  CAMPFIRE_TIERS.map(tier => tier.cost),
  [0, 250, 750, 2500, 8000, 25000, 75000, 200000, 500000, 1250000],
  "Campfire prices must follow the current early-to-late shop economy",
);
assert.equal(
  CAMPFIRE_CONFIG.spriteBasePath,
  "sprites/npc/campfire/worldroot-v2/runtime",
);
assert.ok(CAMPFIRE_CONFIG.spriteKeys.every(key => key.startsWith("campfire-worldroot-v2-tier-")));
const sprite = scene.add.image(2021, 6111, tierOneKey).setDisplaySize(72, 42).setOrigin(0.5, 1);
const view = new CampfireEvolutionPresentation(scene);
const before = view.prepare(sprite, 1);
assert.equal(scene.pins.size, 1, "old texture is pinned before a swap");
sprite.setTexture(tierTwoKey).setDisplaySize(86, 59);
assert.equal(view.play(before, sprite, CAMPFIRE_TIERS[1]), true);
assert.equal(view.phase, "gather");
assert.equal(view.before.texture.key, tierOneKey);
assert.equal(view.after.texture.key, tierTwoKey);
assert.equal(view.root.y, sprite.y);
assert.equal(view.before.originY, 1);
assert.equal(view.after.originY, 1);
assert.equal(sprite.alpha, 0);
assert.deepEqual(scene.locks, [], "Campfire evolution never acquires player input");
scene.advance(CAMPFIRE_EVOLUTION.timing.gatherMs);
assert.equal(view.phase, "ignite");
scene.advance(CAMPFIRE_EVOLUTION.timing.igniteMs + CAMPFIRE_EVOLUTION.timing.settleMs);
assert.equal(view.phase, "settled");
assert.equal(sprite.alpha, 1);
scene.advance(CAMPFIRE_EVOLUTION.timing.holdMs + CAMPFIRE_EVOLUTION.timing.exitMs);
assert.equal(view.phase, "idle");
assert.equal(view.objects.length, 0);
assert.equal(scene.pins.size, 0);
assert.deepEqual(scene.saves, [], "a visual beat cannot award or save progression");

const cancelled = view.prepare(sprite, 2);
view.cancel();
const replacement = view.prepare(sprite, 2);
assert.notEqual(cancelled.consumer, replacement.consumer);
await Promise.resolve();
assert.equal(scene.pins.size, 1, "late completion cannot release a newer beat's pin");
view.destroy();
await Promise.resolve();
assert.equal(scene.pins.size, 0);
assert.equal(sprite.alpha, 1);

// Transaction, duplicate-click, failure and reload integration use the real host.
const purchaseScene = evolutionScene();
let money = CAMPFIRE_TIERS[1].cost + 10, spends = 0, menuCloses = 0;
purchaseScene.upgradeSystem = { getMoney: () => money,
  spendMoney(amount) { spends++; money -= amount; return true; } };
const purchaseView = new CampfireEvolutionPresentation(purchaseScene);
const purchaseSprite = purchaseScene.add.image(2021, 6111, tierOneKey).setDisplaySize(72, 42);
const fire = new CampfireSystem(purchaseScene, { tileSize: 94 }, {}, {}, 1, null, purchaseView);
fire._campfireSprite = purchaseSprite;
fire._ensureCampfireTierTexture = async level => {
  purchaseSprite.setTexture(CAMPFIRE_CONFIG.spriteKeys[level - 1]).setDisplaySize(86, 59); return true;
};
fire._closeBuffSelection = () => { menuCloses++; };
const purchase = fire.upgradeCampfire();
assert.equal(fire.upgradeCampfire(), purchase);
assert.equal((await purchase).success, true);
assert.equal(spends, 1);
assert.equal(money, 10);
assert.equal(menuCloses, 1);
assert.equal(purchaseView.phase, "gather");
const saved = fire.getSaveData();
fire.loadSaveData(saved);
assert.equal(purchaseView.phase, "idle", "restore never replays an upgrade");
assert.deepEqual(fire.getSaveData(), saved);
assert.equal(purchaseSprite.alpha, 1);
money = 0;
assert.equal((await fire.upgradeCampfire()).success, false);
assert.equal(purchaseView.phase, "idle");
assert.equal(purchaseScene.pins.size, 0);
assert.equal(menuCloses, 1, "failed payment leaves the menu open");
assert.equal(spends, 1);

const emberScene = evolutionScene();
const emberView = new EmberDiscoveryEvolutionView(emberScene);
const ember = new EmberDiscoveryEventSystem(emberScene, EMBER_DISCOVERY_EVENT_CONFIG, emberView);
const chargedFire = new CampfireSystem(emberScene, { tileSize: 94 }, {}, {}, 1,
  { level: 4, charges: 0, refillCapacity: 1 });
chargedFire._campfireSprite = emberScene.add.image(2021, 6111, tierFourKey).setDisplaySize(98, 86);
emberScene.campfireSystem = chargedFire;
emberScene.emberDiscoveryEventSystem = ember;
const first = chargedFire.collectEmberCharge();
assert.equal(first.previousRefillCapacity, 1);
assert.equal(first.refillCapacity, 2);
assert.equal(first.gained, 1);
assert.equal(ember.active, true);
assert.match(ember.reward.text, /1 → 2/);
assert.equal(emberView.getSnapshot().hearthKey, tierFourKey);
emberScene.scale.width = 640;
emberScene.scale.height = 360;
emberScene.scale.emit("resize");
assert.equal(ember.root.scaleX, 0.5, "an active reveal fits the resized viewport");
assert.equal(ember._requestSkip(), false, "the tiny opening dwell is protected");
const ev = EMBER_DISCOVERY_EVENT_CONFIG.evolution;
emberScene.advance(ev.flightDelayMs + ev.flightMs);
assert.equal(emberView.phase, "settled");
assert.ok(emberView.slots.every(slot => slot.alpha === 1));
assert.equal(ember._requestSkip(), true);
ember._requestSkip();
emberScene.scale.emit("resize");
emberScene.advance(EMBER_DISCOVERY_EVENT_CONFIG.timing.exitMs);
assert.equal(ember.active, false);
assert.deepEqual(emberScene.locks, [true, false], "skip is idempotent and restores input");
assert.equal(emberScene.input.keyboard.listenerCount("keydown"), 0);
assert.equal(chargedFire.getEmberCharges(), 1, "presentation cannot double-grant a charge");
const repeat = chargedFire.collectEmberCharge();
assert.equal(repeat.refillUpgraded, false);
assert.equal(repeat.refillCapacity, 2);
assert.equal(repeat.gained, 1);
assert.equal(emberView.phase, "charging");
assert.match(ember.reward.text, /\+1 EMBER CHARGE/);
assert.doesNotMatch(ember.reward.text, /REFILL|→/);
ember.play(repeat);
assert.equal(ember.queue.length, 1);
ember.destroy();
emberScene.advance(10000);
assert.equal(emberScene.input.keyboard.listenerCount("keydown"), 0);
assert.equal(emberScene.scale.listenerCount("resize"), 0);
assert.equal(emberScene.locks.at(-1), false);
assert.equal(chargedFire.getEmberRefillCapacity(), CAMPFIRE_CONSUMABLE_CONFIG.refill.maximumCharges);
assert.equal(ember.play(repeat), false);

const media = globalThis.matchMedia;
try {
  globalThis.matchMedia = () => ({ matches: true });
  const reducedScene = evolutionScene();
  const reduced = new CampfireEvolutionPresentation(reducedScene);
  const source = reducedScene.add.image(2021, 6111, tierOneKey).setDisplaySize(72, 42);
  const record = reduced.prepare(source, 1);
  source.setTexture(tierTwoKey);
  reduced.play(record, source, CAMPFIRE_TIERS[1]);
  assert.equal(reduced.phase, "settled");
  assert.equal(reduced.after.scaleX, reduced.after.evolutionScaleX);
  assert.equal(reduced.after.visible, false);
  assert.equal(source.alpha, 1, "reduced motion keeps the real fire visible while its caption fades");
  reduced.destroy();
  assert.equal(reducedScene.pins.size, 0);
  assert.equal(source.alpha, 1);
  reducedScene.campfireSystem = { _campfireSprite: source };
  const reducedMini = new EmberDiscoveryEvolutionView(reducedScene);
  const reducedEmber = new EmberDiscoveryEventSystem(reducedScene, EMBER_DISCOVERY_EVENT_CONFIG, reducedMini);
  reducedEmber.play({ gained: 1, charges: 1, previousRefillCapacity: 1,
    refillCapacity: 2, refillUpgraded: true });
  assert.equal(reducedMini.phase, "settled");
  assert.equal(reducedMini.flight.visible, false);
  assert.equal(reducedEmber.root.scaleX, 1, "reduced-motion Ember never zooms");
  assert.deepEqual(reducedScene.shakes, []);
  reducedScene.advance(EMBER_DISCOVERY_EVENT_CONFIG.timing.holdMs + EMBER_DISCOVERY_EVENT_CONFIG.timing.exitMs);
  assert.equal(reducedEmber.active, false);
  assert.deepEqual(reducedScene.locks, [true, false]);
  reducedEmber.destroy();
} finally { globalThis.matchMedia = media; }
console.log("CAMPFIRE_EMBER_EVOLUTION_CONTRACT_OK");
