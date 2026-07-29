import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  TITAN_CLUE_CATALOG_CONFIG,
  calculateTitanClueCost,
  getTitanClueJournalKey,
  resolveTitanCluesEnabled,
} from "../values/titanClueCatalog.js";
import { TITAN_DEFINITIONS } from "../values/titanDiscoveries.js";
import { TITAN_DISCOVERY_EXPERIENCE } from "../values/titanDiscoveryExperience.js";
import { getUpgradeCost } from "../values/upgradeFormulas.js";
import { TitanClueSystem } from "../systems/progression/TitanClueSystem.js";
import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { UpgradeSystem } from "../systems/progression/UpgradeSystem.js";
import { TitanDiscoveryGuidance } from "../systems/visual/TitanDiscoveryGuidance.js";

assert.equal(resolveTitanCluesEnabled(undefined, ""), true);
assert.equal(resolveTitanCluesEnabled(undefined, "?titanClues=0"), false);

const firstTitan = TITAN_DEFINITIONS[0];
const eightTitan = TITAN_DEFINITIONS[7];
const eighteenthTitan = TITAN_DEFINITIONS[17];
const finalTitan = TITAN_DEFINITIONS[24];

const firstCost = calculateTitanClueCost(firstTitan, 0);
const eightFirstCost = calculateTitanClueCost(eightTitan, 0);
const eightSequentialCost = calculateTitanClueCost(eightTitan, 7);
const eighteenthSequentialCost = calculateTitanClueCost(eighteenthTitan, 17);
const finalSequentialCost = calculateTitanClueCost(finalTitan, 24);

assert.equal(firstCost, 75);
assert.equal(eightFirstCost, 1400);
assert.equal(eightSequentialCost, 2200);
assert.equal(eighteenthSequentialCost, 27500);
assert.equal(finalSequentialCost, 173000);
assert.ok(firstCost > getUpgradeCost("bronzePickaxe", 0));
assert.ok(firstCost < getUpgradeCost("quickslashAbility", 0));
assert.ok(eightFirstCost > getUpgradeCost("steelPickaxe", 0));
assert.ok(eightSequentialCost < getUpgradeCost("mithrilPickaxe", 0));
assert.ok(
  eighteenthSequentialCost > getUpgradeCost("worldTwoTunnelAccess", 0)
);
assert.ok(finalSequentialCost > getUpgradeCost("runePickaxe", 0));
assert.ok(finalSequentialCost < getUpgradeCost("runePickaxe", 0) * 3);

const retention = new RetentionProgressSystem({ saveSlot: 1 });
const wallet = new UpgradeSystem();
wallet.setMoney(5000);
let saveRequests = 0;
const clueSystem = new TitanClueSystem({
  retention,
  wallet,
  onStateChanged: () => {
    saveRequests += 1;
  },
});

const purchase = clueSystem.purchaseClue(eightTitan.id);
assert.equal(purchase.success, true);
assert.equal(purchase.purchased, true);
assert.equal(purchase.cost, eightFirstCost);
assert.equal(wallet.getMoney(), 5000 - eightFirstCost);
assert.equal(saveRequests, 1);
assert.deepEqual(clueSystem.getPurchasedClueIds(), [eightTitan.id]);
assert.equal(clueSystem.getActiveClueId(), eightTitan.id);
assert.ok(
  retention
    .getJournalSnapshot()
    .discoveries
    .journal
    .includes(getTitanClueJournalKey(eightTitan))
);
assert.equal(
  getTitanClueJournalKey(eightTitan).includes(eightTitan.id),
  false,
  "persistence must not reveal a locked Titan name",
);

const moneyAfterPurchase = wallet.getMoney();
const repeated = clueSystem.purchaseClue(eightTitan.id);
assert.equal(repeated.success, true);
assert.equal(repeated.purchased, false);
assert.equal(wallet.getMoney(), moneyAfterPurchase);
assert.equal(saveRequests, 1);

assert.deepEqual(retention.getTitanClueTrackingState(), {
  configured: true,
  activeTitanId: eightTitan.id,
});
const disabled = clueSystem.toggleClueTracking(eightTitan.id);
assert.equal(disabled.success, true);
assert.equal(disabled.active, false);
assert.equal(disabled.reason, TITAN_CLUE_CATALOG_CONFIG.results.locatorDisabled);
assert.equal(clueSystem.getActiveClueId(), null);
assert.equal(saveRequests, 2);

const disabledRetention = new RetentionProgressSystem({ saveSlot: 1 });
disabledRetention.loadSaveData(retention.getSaveData());
const disabledRestored = new TitanClueSystem({
  retention: disabledRetention,
  wallet,
});
assert.deepEqual(disabledRestored.getPurchasedClueIds(), [eightTitan.id]);
assert.equal(disabledRestored.getActiveClueId(), null);

const enabled = clueSystem.toggleClueTracking(eightTitan.id);
assert.equal(enabled.success, true);
assert.equal(enabled.active, true);
assert.equal(enabled.reason, TITAN_CLUE_CATALOG_CONFIG.results.locatorEnabled);
assert.equal(saveRequests, 3);
const restoredRetention = new RetentionProgressSystem({ saveSlot: 1 });
restoredRetention.loadSaveData(retention.getSaveData());
const restored = new TitanClueSystem({ retention: restoredRetention, wallet });
assert.deepEqual(restored.getPurchasedClueIds(), [eightTitan.id]);
assert.equal(restored.getActiveClueId(), eightTitan.id);

const legacyRetention = new RetentionProgressSystem({ saveSlot: 1 });
legacyRetention.loadSaveData({
  discoveries: {
    journal: [getTitanClueJournalKey(eightTitan)],
  },
});
const legacyClues = new TitanClueSystem({ retention: legacyRetention, wallet });
assert.equal(
  legacyRetention.getTitanClueTrackingState().configured,
  false,
);
assert.equal(
  legacyClues.getActiveClueId(),
  eightTitan.id,
  "a purchased clue from a pre-toggle save must remain enabled",
);

const poorWallet = new UpgradeSystem();
poorWallet.setMoney(eightFirstCost - 1);
const poorRetention = new RetentionProgressSystem({ saveSlot: 2 });
const poorClues = new TitanClueSystem({
  retention: poorRetention,
  wallet: poorWallet,
});
const rejected = poorClues.purchaseClue(eightTitan.id);
assert.equal(rejected.success, false);
assert.equal(
  rejected.reason,
  TITAN_CLUE_CATALOG_CONFIG.results.notEnoughMoney
);
assert.equal(poorWallet.getMoney(), eightFirstCost - 1);
assert.deepEqual(poorClues.getPurchasedClueIds(), []);

const notifications = [];
const clueScene = {
  titanClueSystem: clueSystem,
  uiNotifications: {
    info(message, options) {
      notifications.push({ message, options });
      throw new Error("catalog clue guidance must use the location pointer");
    },
  },
};
const farZone = {
  definition: eightTitan,
  zone: {
    left: 240,
    rightExclusive: 257,
    top: 730,
    bottomExclusive: 739,
  },
};
const farPlayer = { tx: 140, ty: 65 };
const guidance = new TitanDiscoveryGuidance(clueScene);
const guidedTitan = guidance.update(
  TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1,
  farPlayer,
  [farZone],
  new Set()
);
assert.equal(guidedTitan.id, eightTitan.id);
assert.equal(
  guidance.getSnapshot().source,
  TITAN_DISCOVERY_EXPERIENCE.guidance.clueSourceId
);
assert.match(guidance.getSnapshot().message, /TITAN LOCATOR CLUE/);
assert.match(guidance.getSnapshot().message, /EAST/);
assert.match(guidance.getSnapshot().message, /BELOW/);
assert.equal(
  guidance.getSnapshot().message.includes(eightTitan.name.toUpperCase()),
  false
);
assert.equal(notifications.length, 0);
assert.equal(guidance.getSnapshot().indicator.visible, true);
assert.equal(guidance.getSnapshot().indicator.edgeClamped, true);
assert.equal("title" in guidance.getSnapshot().indicator, false);
assert.equal("direction" in guidance.getSnapshot().indicator, false);
assert.equal("status" in guidance.getSnapshot().indicator, false);

clueSystem.toggleClueTracking(eightTitan.id);
assert.equal(saveRequests, 4);
assert.equal(
  guidance.update(
    TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 2,
    farPlayer,
    [farZone],
    new Set()
  ),
  null,
  "disabling the purchased locator in ESC must hide its distant arrow immediately",
);
assert.equal(guidance.getSnapshot().indicator.visible, false);
clueSystem.toggleClueTracking(eightTitan.id);
assert.equal(saveRequests, 5);
assert.equal(
  guidance.update(
    TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 3,
    farPlayer,
    [farZone],
    new Set()
  )?.id,
  eightTitan.id,
);

const unguidedScene = {
  uiNotifications: {
    info() {
      throw new Error("a distant unpurchased Titan must remain silent");
    },
  },
};
const unguided = new TitanDiscoveryGuidance(unguidedScene);
assert.equal(
  unguided.update(
    TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1,
    farPlayer,
    [farZone],
    new Set()
  ),
  null
);
const nearbyPlayer = {
  tx: farZone.zone.left - 12,
  ty: Math.round(
    (farZone.zone.top + farZone.zone.bottomExclusive) / 2
  ),
};
assert.equal(
  unguided.update(
    TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 2,
    nearbyPlayer,
    [farZone],
    new Set()
  )?.id,
  eightTitan.id,
);
assert.equal(unguided.getSnapshot().indicator.visible, true);
assert.equal(
  unguided.update(
    TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 3,
    farPlayer,
    [farZone],
    new Set()
  ),
  null,
  "free resonance guidance must stop without waiting for the refresh interval",
);
assert.equal(unguided.getSnapshot().indicator.visible, false);

assert.equal(retention.discoverTitan(eightTitan.id), true);
assert.equal(clueSystem.completeClue(eightTitan.id), true);
assert.equal(clueSystem.getActiveClueId(), null);
assert.deepEqual(retention.getTitanClueTrackingState(), {
  configured: true,
  activeTitanId: null,
});
assert.equal(saveRequests, 6);

const setupSource = readFileSync(
  new URL("../world/playScene/PlaySceneSetup.js", import.meta.url),
  "utf8"
);
const uiSource = readFileSync(
  new URL("../world/playScene/PlaySceneUI.js", import.meta.url),
  "utf8"
);
const archiveSource = readFileSync(
  new URL("../ui/overlays/TitanArchiveView.js", import.meta.url),
  "utf8"
);
const rendererSource = readFileSync(
  new URL("../world/rendering/WorldRenderer.js", import.meta.url),
  "utf8"
);
const scenicSource = readFileSync(
  new URL(
    "../world/rendering/scenic-world/WorldVisualRuntime.js",
    import.meta.url
  ),
  "utf8"
);
const e2eHarnessSource = readFileSync(
  new URL("./JkdE2EHarness.js", import.meta.url),
  "utf8"
);

assert.match(setupSource, /new TitanClueSystem/);
assert.match(setupSource, /onStateChanged: \(\) => this\.queueDugTilesSave/);
assert.match(uiSource, /clueSystem: this\.titanClueSystem/);
assert.match(uiSource, /getTitanClueDirectionProvider/);
assert.match(
  uiSource,
  /openingFlightArtifactSystem\?\.view\?\.hideHud\?\.\(\)/,
  "fresh-run onboarding must not cover the catalog clue control",
);
assert.match(archiveSource, /TitanArchiveClueControl/);
const clueControlSource = readFileSync(
  new URL("../ui/overlays/TitanArchiveClueControl.js", import.meta.url),
  "utf8"
);
assert.match(
  clueControlSource,
  /hintColor:\s*UI_COLORS\.info/,
  "clue cost and direction hints must use an explicit readable color",
);
assert.match(clueControlSource, /toggleClueTracking/);
assert.match(clueControlSource, /copy\.disableButton/);
assert.match(clueControlSource, /copy\.enableButton/);
assert.match(rendererSource, /getTitanClueDirectionProvider/);
assert.match(scenicSource, /getTitanClueDirectionProvider/);
assert.match(e2eHarnessSource, /Ctrl\+Alt\+U funds and opens the Titan catalog/);

guidance.destroy();
unguided.destroy();
clueSystem.destroy();
restored.destroy();
disabledRestored.destroy();
legacyClues.destroy();
poorClues.destroy();

console.log(
  "titan clue catalog contract: balanced pricing, atomic purchase, saved ESC arrow toggle, legacy migration, permanent bought guidance, bounded free guidance, and locked identity passed"
);
