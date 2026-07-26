import assert from "node:assert/strict";

import { GAME_CONFIG } from "../values/gameConfig.js";
import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanEncounterMode,
  resolveTitanGuidanceEnabled,
} from "../values/titanDiscoveryExperience.js";
import {
  getRequiredTitanRevealTiles,
  isTitanEncounterReady,
} from "../systems/visual/titanDiscoveryEncounter.js";
import { TitanDiscoveryGuidance } from "../systems/visual/TitanDiscoveryGuidance.js";
import { buildTitanDiscoveryZones } from "../systems/visual/titanDiscoveryZones.js";
import { WorldModel } from "../world/model/WorldModel.js";

assert.equal(resolveTitanEncounterMode(undefined, ""), "entry");
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
const requiredReveal = getRequiredTitanRevealTiles(firstZone.cells.length);
assert.ok(requiredReveal < firstZone.cells.length);
const entryView = {
  zone: firstZone,
  discovered: false,
  revealed: requiredReveal,
  requiredReveal,
  remaining: firstZone.cells.length - requiredReveal,
};
assert.equal(
  isTitanEncounterReady(
    entryView,
    {
      tx: firstZone.left,
      ty: firstZone.top,
    },
    "entry"
  ),
  true,
  "a player who exposes and enters the chamber must meet the encounter",
);
assert.equal(
  isTitanEncounterReady(
    entryView,
    {
      tx: firstZone.rightExclusive + 10,
      ty: firstZone.bottomExclusive + 10,
    },
    "entry"
  ),
  false,
  "remote digging must not award a Titan",
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
entryView.remaining = 0;
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
}));
let time = 0;
for (const zone of zones.slice(0, 7)) {
  time += TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1;
  const target = guidance.update(
    time,
    {
      tx: 140,
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

time += TITAN_DISCOVERY_EXPERIENCE.guidance.refreshIntervalMs + 1;
const sevenHundredTarget = guidance.update(
  time,
  {
    tx: 140,
    ty: world.topAirRows + 700,
  },
  views,
  new Set()
);
assert.equal(sevenHundredTarget?.id, zones[7].definition.id);
assert.match(guidance.getSnapshot().message, /EAST/);
assert.match(guidance.getSnapshot().message, /BELOW/);
assert.ok(notifications.every(entry => (
  entry.options.key === TITAN_DISCOVERY_EXPERIENCE.guidance.notificationKey
)));

guidance.announceDiscovery(firstZone.definition);
assert.equal(discoveries.length, 1);
assert.match(discoveries[0].message, /TITAN DISCOVERED/);
assert.match(discoveries[0].message, /MOSSBACK WANDERER/);

guidance.destroy();
assert.deepEqual(guidance.getSnapshot(), {
  enabled: true,
  target: "",
  message: "",
});

console.log(
  "titan discovery experience contract: entry reveal, resonance guidance, 700m coverage, rollback, and discovery announcement passed"
);
