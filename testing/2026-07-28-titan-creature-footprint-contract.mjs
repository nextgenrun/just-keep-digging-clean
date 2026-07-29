import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  TITAN_CREATURE_FOOTPRINT_BUILD,
  TITAN_CREATURE_FOOTPRINT_ROWS,
} from "../values/titanCreatureFootprints.js";
import {
  TITAN_DEFINITIONS,
  TITAN_DISCOVERY_CONFIG,
} from "../values/titanDiscoveries.js";
import {
  TITAN_DISCOVERY_EXPERIENCE,
  resolveTitanEncounterMode,
} from "../values/titanDiscoveryExperience.js";
import {
  isTitanEncounterReady,
} from "../systems/visual/titanDiscoveryEncounter.js";
import {
  buildTitanCreatureCoverageCells,
} from "../systems/visual/titanCreatureFootprint.js";
assert.equal(resolveTitanEncounterMode(undefined, ""), "creature");
assert.equal(
  Object.keys(TITAN_CREATURE_FOOTPRINT_ROWS).length,
  TITAN_DEFINITIONS.length
);
const manifest = JSON.parse(readFileSync(
  new URL(
    "../sprites/backgrounds/titan-underground-v2/"
      + "2026-07-28-titan-underground-footprints-v2.json",
    import.meta.url,
  ),
  "utf8",
));
assert.equal(manifest.complete, true);
assert.equal(manifest.count, TITAN_DEFINITIONS.length);
assert.equal(manifest.version, TITAN_CREATURE_FOOTPRINT_BUILD.version);
assert.equal(
  manifest.fitFraction,
  TITAN_DISCOVERY_CONFIG.underground.titanFitFraction,
);
assert.equal(
  TITAN_CREATURE_FOOTPRINT_BUILD.sourceAuthority,
  "TITAN_DEFINITIONS.surfaceAsset",
);
const manifestById = new Map(manifest.titans.map(entry => [entry.id, entry]));

const counts = new Map();
for (const definition of TITAN_DEFINITIONS) {
  const storedRows = TITAN_CREATURE_FOOTPRINT_ROWS[definition.id];
  assert.equal(storedRows.length, definition.zoneHeightTiles);
  assert.ok(storedRows.every(mask => (
    Number.isInteger(mask)
    && mask >= 0
    && mask < 2 ** definition.zoneWidthTiles
  )));
  const manifestEntry = manifestById.get(definition.id);
  assert.ok(manifestEntry, `${definition.id} manifest entry`);
  assert.equal(manifestEntry.source, definition.surfaceAsset.path);
  assert.equal(
    createHash("sha256")
      .update(readFileSync(new URL(`../${manifestEntry.source}`, import.meta.url)))
      .digest("hex"),
    manifestEntry.sha256,
    `${definition.id} stance hash`,
  );
  assert.deepEqual(
    storedRows,
    manifestEntry.rows,
    `${definition.id} footprint must match its approved 768px stance`
  );

  const cells = [];
  for (let row = 0; row < definition.zoneHeightTiles; row += 1) {
    for (let column = 0; column < definition.zoneWidthTiles; column += 1) {
      cells.push(Object.freeze({ tx: 20 + column, ty: 80 + row }));
    }
  }
  const zone = {
    definition,
    left: 20,
    top: 80,
    rightExclusive: 20 + definition.zoneWidthTiles,
    bottomExclusive: 80 + definition.zoneHeightTiles,
    centerXTile: 20 + definition.zoneWidthTiles / 2,
    centerYTile: 80 + definition.zoneHeightTiles / 2,
    cells,
  };
  const coverage = buildTitanCreatureCoverageCells(zone);
  counts.set(definition.id, coverage.length);
  assert.ok(
    coverage.length
      >= TITAN_DISCOVERY_EXPERIENCE.encounter.minimumCoverageTiles
  );
  assert.ok(coverage.length < cells.length);
  assert.ok(coverage.every(cell => cells.includes(cell)));
}

assert.equal(counts.get("hammerhead-pilgrim"), 51);
assert.ok(Math.min(...counts.values()) >= 34);
assert.ok(Math.max(...counts.values()) <= 112);

const encounterView = {
  discovered: false,
  coverageTotal: counts.get("hammerhead-pilgrim"),
  coverageRemaining: 26,
  zoneRemaining: 1,
  zone: {
    centerXTile: 200,
    centerYTile: 800,
  },
};
assert.equal(
  isTitanEncounterReady(
    encounterView,
    { tx: 200, ty: 800 },
    TITAN_DISCOVERY_EXPERIENCE.encounter.creatureModeId
  ),
  false
);
encounterView.coverageRemaining = 25;
assert.equal(
  isTitanEncounterReady(
    encounterView,
    { tx: 0, ty: 0 },
    TITAN_DISCOVERY_EXPERIENCE.encounter.creatureModeId
  ),
  true,
  "the 26th of 51 covering tiles must authorize the 50% unlock"
);

const viewSource = readFileSync(
  new URL("../systems/visual/titanDiscoveryView.js", import.meta.url),
  "utf8"
);
const streamSource = readFileSync(
  new URL("../systems/visual/TitanChamberStream.js", import.meta.url),
  "utf8"
);
const guidanceSource = readFileSync(
  new URL("../systems/visual/TitanDiscoveryGuidance.js", import.meta.url),
  "utf8"
);
const glowSource = readFileSync(
  new URL("../systems/visual/TitanCoverageGlowSystem.js", import.meta.url),
  "utf8"
);
const unlockSource = readFileSync(
  new URL("../systems/visual/TitanUnlockController.js", import.meta.url),
  "utf8"
);
const healthSource = readFileSync(
  new URL("../systems/visual/titanDiscoveryHealth.js", import.meta.url),
  "utf8"
);
const experienceSource = readFileSync(
  new URL("../values/titanDiscoveryExperience.js", import.meta.url),
  "utf8"
);
const e2ePreviewSource = readFileSync(
  new URL("./JkdE2ETitanPreview.js", import.meta.url),
  "utf8"
);
const e2eHarnessSource = readFileSync(
  new URL("./JkdE2EHarness.js", import.meta.url),
  "utf8"
);

assert.match(viewSource, /buildTitanCreatureCoverageCells/);
assert.match(viewSource, /coverageCleared >= view\.coverageRequired/);
assert.match(viewSource, /coverageProgressAlpha/);
assert.match(viewSource, /definition\.surfaceAsset/);
assert.match(viewSource, /undergroundDais/);
assert.match(streamSource, /view\.chamberSprite = card/);
assert.doesNotMatch(streamSource, /compact\.sprite\.setVisible/);
assert.doesNotMatch(guidanceSource, /coverageRemaining|coverageCopy/);
assert.match(guidanceSource, /if \(inside\)/);
assert.match(glowSource, /coverResonance/);
assert.match(glowSource, /worldModel\.isSolid/);
assert.match(unlockSource, /clearRemainingTitanCoverage/);
assert.match(unlockSource, /applyTileUpdate/);
assert.match(healthSource, /coverageValid/);
assert.doesNotMatch(experienceSource, /minimumReveal|entryPadding/);
assert.match(e2ePreviewSource, /TITAN_PREVIEW_STAGES/);
assert.match(e2ePreviewSource, /applyDugTileKeys/);
assert.match(e2ePreviewSource, /expected covering tiles/);
assert.match(e2eHarnessSource, /Ctrl\+Alt\+Y/);

console.log(
  "titan creature footprint contract: 25 hash-pinned stance masks, 50% auto-clear unlock, sharp Titan layering, tile glow guidance, and health passed"
);
