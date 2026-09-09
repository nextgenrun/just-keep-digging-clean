import assert from "node:assert/strict";
import { PLAYER_HINTS } from "../values/playerHints.js";
import { searchWiki, prepareSearchEntry } from "../game/undersstar-wiki/search.js";
import { getPlayerHintEntries, interpolateHintKeys } from "../systems/onboarding/playerHintContext.js";
import { ContextualMechanicTutorialSystem } from "../systems/onboarding/ContextualMechanicTutorialSystem.js";
import { TOWN_TUTORIAL_CHOICES, TOWN_TUTORIAL_STAGES } from "../values/retentionConfig.js";
const corpus = PLAYER_HINTS.map(prepareSearchEntry);
for (const [query, expected] of [
  ["how do I fly", "flight"], ["mana empty", "low-gp"], ["talnet points", "talents"],
  ["portla", "portals"], ["save backup", "save"], ["bag capacity", "sell"],
  ["worm", "wurm"], ["ember charges", "ember"],
]) assert.equal(searchWiki(corpus, query)[0]?.id, expected, query);
assert.equal(searchWiki(corpus, "zzzznoexist").length, 0);
assert.equal(searchWiki(corpus, "").length, 0);
assert.equal(searchWiki(corpus, '<script>alert("test")</script>').length, 0);
assert.equal(interpolateHintKeys("Hold {fly}, then {dig}", key => ({ fly: "ALT", dig: "G" })[key]), "Hold ALT, then G");
const scene = {
  config: { topAirRows: 64 },
  playerController: { getPlayerTile: () => ({ ty: 100 }), getGemPowerMax: () => 100, getGemPowerRaw: () => 10 },
  systemIntroductionSystem: { getProgressSnapshot: () => ({ flightReady: true }) },
  celestialTalentProgressionSystem: { getSnapshot: () => ({ accessUnlocked: true, talentPoints: 1 }) },
};
assert.equal(getPlayerHintEntries(scene)[0].id, "low-gp");
scene.earthquakeSystem = { getStatus: () => ({ state: "warning", playerAware: true }) };
assert.equal(getPlayerHintEntries(scene)[0].id, "earthquake");
scene.earthquakeSystem.getStatus = () => ({ state: "idle" });
scene.playerController.getGemPowerRaw = () => 100;
assert.equal(getPlayerHintEntries(scene)[0].id, "talents");
scene.playerController.getPlayerTile = () => ({ ty: 64 });
scene.celestialTalentProgressionSystem.getSnapshot = () => ({ accessUnlocked: false, talentPoints: 0 });
assert.equal(getPlayerHintEntries(scene)[0].id, "mining", "Do not tell a new player to sell an empty bag");
scene.digSystem = { getResourceTotals: () => ({ dirt: 3 }) };
assert.equal(getPlayerHintEntries(scene)[0].id, "sell");
scene.retentionProgressSystem = { getTutorialState: () => ({ stage: TOWN_TUTORIAL_STAGES.MOVE }) };
scene.townSquareTutorialSystem = { getNextPromiseOverride: () => ({ promise: "WALK RIGHT", detail: "Hold D" }) };
assert.equal(getPlayerHintEntries(scene)[0].id, "current-step");
const seen = [];
const retention = { getTutorialState: () => ({ choice: TOWN_TUTORIAL_CHOICES.LEGACY }),
  hasSeenMechanicTutorial: id => seen.includes(id), recordMechanicTutorialSeen: id => { seen.push(id); return true; } };
let warning = true;
const lessonScene = { earthquakeSystem: { getStatus: () => ({ state: warning ? "warning" : "idle" }) } };
const lessons = new ContextualMechanicTutorialSystem(lessonScene, retention);
lessons.update(); assert.equal(lessons.getHealthSnapshot().activeId, "earthquake");
warning = false;
assert.equal(lessons.getNextPromiseOverride(), null, "A passed hazard must stop giving stale advice immediately");
lessons.update(); assert.equal(lessons.getHealthSnapshot().activeId, null);
assert.equal(seen.length, 0, "Interrupted lessons are not acknowledged");
lessons.notifyEmberDiscovery(); lessons.update();
assert.equal(lessons.getHealthSnapshot().activeId, "ember-campfire");
warning = true; lessons.update();
assert.equal(lessons.getHealthSnapshot().activeId, "earthquake", "Hazards preempt lower-priority help");
lessons.destroy();
console.log("HINTS_SEARCH_OK: question, synonym, typo, empty, malicious query, remapped keys, live context, expiry and priority checks passed.");
