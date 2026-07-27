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

const restored = new TitanClueSystem({ retention, wallet });
assert.deepEqual(restored.getPurchasedClueIds(), [eightTitan.id]);
assert.equal(restored.getActiveClueId(), eightTitan.id);

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
  titanClueSystem: {
    getActiveClueId: () => eightTitan.id,
  },
  uiNotifications: {
    info(message, options) {
      notifications.push({ message, options });
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
assert.equal(notifications.length, 1);

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

retention.discoverTitan(eightTitan.id);
assert.equal(clueSystem.getActiveClueId(), null);

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

assert.match(setupSource, /new TitanClueSystem/);
assert.match(setupSource, /onStateChanged: \(\) => this\.queueDugTilesSave/);
assert.match(uiSource, /clueSystem: this\.titanClueSystem/);
assert.match(uiSource, /getTitanClueDirectionProvider/);
assert.match(archiveSource, /TitanArchiveClueControl/);
assert.match(rendererSource, /getTitanClueDirectionProvider/);
assert.match(scenicSource, /getTitanClueDirectionProvider/);

guidance.destroy();
unguided.destroy();
clueSystem.destroy();
restored.destroy();
poorClues.destroy();

console.log(
  "titan clue catalog contract: balanced depth pricing, atomic wallet purchase, persistence, long-range directions, locked identity, rollback, and renderer parity passed"
);
