import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { RetentionProgressSystem } from "../systems/progression/RetentionProgressSystem.js";
import { sanitizeRetentionExpedition } from "../systems/progression/retentionProgressState.js";
import {
  RETURN_ROUTE_KINDS,
  RETURN_ROUTE_TELEMETRY_CONFIG,
} from "../values/returnRouteTelemetry.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = relative => readFile(path.join(root, relative), "utf8");

const retention = new RetentionProgressSystem();
retention.expedition.active = true;
retention.expedition.activeMs = 42000;

const ascent = retention.recordReturnRoute({
  kind: RETURN_ROUTE_KINDS.PORTAL_ASCENT,
  fromDepth: 640,
  toDepth: 0,
  cost: 125,
  distanceTiles: 640,
});
assert.deepEqual(ascent, {
  kind: "portal-ascent",
  fromDepth: 640,
  toDepth: 0,
  cost: 125,
  distanceTiles: 640,
  cargoLossUnits: 0,
  atActiveMs: 42000,
});
retention.recordExpeditionCost({ returnCost: ascent.cost });

retention.recordReturnRoute({
  kind: RETURN_ROUTE_KINDS.LOCAL_RECOVERY,
  fromDepth: 3,
  toDepth: 0,
  distanceTiles: 6,
});
retention.recordReturnRoute({
  kind: RETURN_ROUTE_KINDS.ABANDON,
  fromDepth: 350,
  cargoLossUnits: 14,
});
retention.recordExpeditionCost({ failureLoss: 700 });

for (let index = 0; index < RETURN_ROUTE_TELEMETRY_CONFIG.eventLimit + 6; index += 1) {
  retention.recordReturnRoute({
    kind: RETURN_ROUTE_KINDS.PORTAL_DESCENT,
    toDepth: index,
  });
}

const summary = sanitizeRetentionExpedition(retention.expedition);
assert.equal(summary.returnCost, 125);
assert.equal(summary.failureLoss, 700);
assert.equal(summary.failed, true);
assert.equal(summary.returnRouteCounts[RETURN_ROUTE_KINDS.PORTAL_ASCENT], 1);
assert.equal(summary.returnRouteCounts[RETURN_ROUTE_KINDS.LOCAL_RECOVERY], 1);
assert.equal(summary.returnRouteCounts[RETURN_ROUTE_KINDS.ABANDON], 1);
assert.equal(
  summary.returnRouteCounts[RETURN_ROUTE_KINDS.PORTAL_DESCENT],
  RETURN_ROUTE_TELEMETRY_CONFIG.eventLimit + 6,
);
assert.equal(summary.returnRouteEvents.length, RETURN_ROUTE_TELEMETRY_CONFIG.eventLimit);
assert.equal(retention.recordReturnRoute({ kind: "free-universal-teleport" }), null);

const [specialTiles, recovery, abandon] = await Promise.all([
  source("systems/mining/SpecialTileSystem.js"),
  source("systems/onboarding/LocalRecoverySystem.js"),
  source("world/playScene/HardcoreModeBridge.js"),
]);
for (const token of ["PORTAL_ASCENT", "PORTAL_DESCENT", "QUICK_RESUME", "GROUND_TO_SKY"]) {
  assert.match(specialTiles, new RegExp(`RETURN_ROUTE_KINDS\\.${token}`));
}
assert.match(specialTiles, /recordExpeditionCost/);
assert.match(recovery, /RETURN_ROUTE_KINDS\.LOCAL_RECOVERY/);
assert.match(abandon, /RETURN_ROUTE_KINDS\.ABANDON/);
assert.match(abandon, /getCargoSellValue\(lost\)/);

console.log("RETURN_ROUTE_TELEMETRY_CONTRACT_OK");
