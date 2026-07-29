import assert from "node:assert/strict";

import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanEncounterMode,
  resolveTitanGuidanceEnabled,
} from "../values/titanDiscoveryExperience.js";
import {
  isTitanEncounterReady,
} from "../systems/visual/titanDiscoveryEncounter.js";
import {
  buildTitanCreatureCoverageCells,
} from "../systems/visual/titanCreatureFootprint.js";
import { TitanDiscoveryGuidance } from "../systems/visual/TitanDiscoveryGuidance.js";
import { buildTitanDiscoveryZones } from "../systems/visual/titanDiscoveryZones.js";
import { WorldModel } from "../world/model/WorldModel.js";

assert.equal(resolveTitanEncounterMode(undefined, ""), "creature");
assert.equal(
  resolveTitanEncounterMode(undefined, "?titanEncounter=legacy"),
  "legacy"
);
assert.equal(resolveTitanGuidanceEnabled(undefined, ""), true);
assert.equal(
  resolveTitanGuidanceEnabled(undefined, "?titanGuidance=0"),
  false
);

const world = new WorldModel(GAME_CONFIG);
const zones = buildTitanDiscoveryZones(world);
assert.equal(zones.length, 25);

const firstZone = zones[0];
const coverageCells = buildTitanCreatureCoverageCells(firstZone);
const requiredCoverage = Math.ceil(
  coverageCells.length
    * TITAN_DISCOVERY_EXPERIENCE.encounter.requiredClearRatio
);
assert.ok(
  coverageCells.length
    >= TITAN_DISCOVERY_EXPERIENCE.encounter.minimumCoverageTiles
);
assert.ok(coverageCells.length < firstZone.cells.length);
const entryView = {
  zone: firstZone,
  discovered: false,
  coverageTotal: coverageCells.length,
  coverageRemaining: coverageCells.length - requiredCoverage + 1,
  zoneRemaining: 1,
};
assert.equal(
  isTitanEncounterReady(
    entryView,
    {
      tx: firstZone.left,
      ty: firstZone.top,
    },
    "creature"
  ),
  false,
  "the Titan must remain sealed one tile below the 50% requirement",
);
entryView.coverageRemaining = coverageCells.length - requiredCoverage;
assert.equal(
  isTitanEncounterReady(
    entryView,
    {
      tx: firstZone.rightExclusive + 10,
      ty: firstZone.bottomExclusive + 10,
    },
    "creature"
  ),
  true,
  "clearing 50% of creature-cover tiles must authorize the unlock",
);
assert.equal(
  isTitanEncounterReady(
    entryView,
    {
      tx: firstZone.centerXTile,
      ty: firstZone.centerYTile,
    },
    "legacy"
  ),
  false,
  "legacy rollback must retain the former full-clear requirement",
);
entryView.zoneRemaining = 0;
assert.equal(
  isTitanEncounterReady(
    entryView,
    {
      tx: firstZone.centerXTile,
      ty: firstZone.centerYTile,
    },
    "legacy"
  ),
  true,
);

const notifications = [];
const discoveries = [];
const scene = {
  uiNotifications: {
    info(message, options) {
      notifications.push({ message, options });
      throw new Error("routine Titan guidance must not occupy the notification carousel");
    },
    success(message, options) {
      discoveries.push({ message, options });
    },
  },
};
const guidance = new TitanDiscoveryGuidance(scene);
const views = zones.map(zone => ({
  zone,
  definition: zone.definition,
  coverageRemaining: buildTitanCreatureCoverageCells(zone).length,
}));
let time = 0;
for (const zone of zones.slice(0, 7)) {
  time += TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1;
  const target = guidance.update(
    time,
    {
      tx: zone.left - 12,
      ty: Math.round(zone.centerYTile),
    },
    views,
    new Set()
  );
  assert.equal(
    target?.id,
    zone.definition.id,
    `${zone.definition.name} must produce guidance on a normal descent`,
  );
  assert.equal(guidance.getSnapshot().target, zone.definition.id);
  assert.equal(guidance.getSnapshot().indicator.visible, true);
  assert.match(
    guidance.getSnapshot().message,
    /ANCIENT RESONANCE|TITAN CHAMBER NEARBY/,
  );
  assert.equal(
    guidance.getSnapshot().message.includes(zone.definition.name.toUpperCase()),
    false,
    "resonance must not spoil a locked Titan's identity",
  );
}

const sevenHundredZone = zones[7];
time += TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1;
const nearbySevenHundredTarget = guidance.update(
  time,
  {
    tx: sevenHundredZone.left - 8,
    ty: Math.round(sevenHundredZone.centerYTile) - 6,
  },
  views,
  new Set()
);
assert.equal(nearbySevenHundredTarget?.id, sevenHundredZone.definition.id);
assert.match(guidance.getSnapshot().message, /EAST/);
assert.match(guidance.getSnapshot().message, /BELOW/);
assert.equal(
  notifications.length,
  0,
  "routine resonance must use the location pointer, not the center carousel",
);
assert.equal(guidance.getSnapshot().indicator.edgeClamped, true);

const distantPlayer = {
  tx: sevenHundredZone.rightExclusive
    + TITAN_DISCOVERY_EXPERIENCE.guidance.proximityRangeTiles
    + 1,
  ty: Math.round(sevenHundredZone.centerYTile),
};
const distantTarget = guidance.update(
  time + 1,
  distantPlayer,
  views,
  new Set()
);
assert.equal(
  distantTarget,
  null,
  "the free resonance arrow must stop immediately outside its radial range",
);
assert.equal(guidance.getSnapshot().indicator.visible, false);

time += TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1;
guidance.update(
  time,
  {
    tx: firstZone.centerXTile,
    ty: firstZone.centerYTile,
  },
  views,
  new Set()
);
assert.equal(
  guidance.getSnapshot().message,
  TITAN_DISCOVERY_EXPERIENCE.guidance.insideCopy,
);
assert.doesNotMatch(guidance.getSnapshot().message, /COVERING|CLEAR/i);
assert.equal(
  guidance.getSnapshot().indicator.visible,
  false,
  "inside the chamber, authored tile glow replaces instructional UI",
);

guidance.announceDiscovery(firstZone.definition);
assert.equal(
  discoveries.length,
  0,
  "Titan reveal, guidance, gallery, and Journey entry replace the redundant discovery popup",
);
assert.equal(guidance.getSnapshot().target, "");

guidance.destroy();
assert.equal(guidance.getSnapshot().target, "");
assert.equal(guidance.getSnapshot().message, "");
assert.equal(guidance.getSnapshot().source, "");
assert.equal(guidance.getSnapshot().indicator.visible, false);
assert.equal(guidance.getSnapshot().indicator.created, false);

console.log(
  "titan discovery experience contract: 50% creature-cover threshold, proximity-bounded arrow guidance, deep Titan coverage, rollback, and silent discovery cleanup passed"
);
