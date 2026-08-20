import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../values/survivalUalPlayerAssetProfile.js";
import { MIXAMO_ACCEPTED_PLAYER_ANIMATIONS as mixamo } from
  "../values/mixamoAcceptedPlayerAnimations.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const authorityRoot = "archive/2026-08-14-survival-quality-runtime-promotion-v1/rollback";
const rejectedRoot = "archive/2026-08-15-survival-animation-contract-repair-v2/rollback-quality-v1";
const contractFiles = Object.freeze([
  "sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-walk-sheet.png",
  "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-animation-polish-run-sheet.webp",
  "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-punch-jab-sheet.webp",
  "sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-dig-up-piskel-polished-sheet.png",
  "sprites/character/survival-ual-player-v1/runtime/survival-ual-player-v1-ground-strike-sheet.webp",
  "sprites/character/survival-character-blender-v2/runtime/survival-character-blender-v2-superman-flight-prone-v3-sheet.png",
  "sprites/character/survival-ual-player-v1/runtime/manifest.json",
  "sprites/character/survival-character-blender-v2/runtime/manifest.json",
]);
const rejectedHashes = Object.freeze({
  [contractFiles[0]]: "699e07f83bdd23efaf78b7ef43d22df9f85e425e2f9304b92195c8297853a5e1",
  [contractFiles[1]]: "880395e3621ea8dccb40cd809ffc887dd8944d440b9d664b99cf70a3c3f88292",
  [contractFiles[2]]: "bface75c40fa8d660a1603b899d44cf293055da498d28b35f671909ddc48aeab",
  [contractFiles[3]]: "f2b0120f38937cf06b26f713fcf178d27fe5b9afb4eaf13eac84181dad6bfafd",
  [contractFiles[4]]: "193f69e1a5e804962c9608ae82b6de0e80324685868fca59d250d73b45c4bfc6",
  [contractFiles[5]]: "e38e5ef3e30da5afd9f2a04612a192c74a4e271685943d73f11dd6918a6b6069",
  [contractFiles[6]]: "1d031370c911315e5b7a2df02f839afa1494fe6074067b7138981b39bba6454e",
  [contractFiles[7]]: "aa6c5d9745721f07874acc8e9c3083d2748e0deedcb521a00922c9b94bf934bf",
});

function digest(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

for (const relativePath of contractFiles) {
  const [active, authority, rejected] = await Promise.all([
    readFile(`${root}/${relativePath}`),
    readFile(`${root}/${authorityRoot}/${relativePath}`),
    readFile(`${root}/${rejectedRoot}/${relativePath}`),
  ]);
  assert.equal(
    digest(active),
    digest(authority),
    `${relativePath} must retain the last known-good frame/rig contract`,
  );
  assert.equal(digest(rejected), rejectedHashes[relativePath], `${relativePath} rollback is incomplete`);
}

assert.equal(profile.flySheet, mixamo.sheets.flight.key);
assert.deepEqual(profile.flyFrames, mixamo.sheets.flight.frames);
assert.equal(profile.playerBodyWidthPx, 31, "visual repair must not alter collision width");
assert.equal(profile.playerBodyHeightPx, 75, "visual repair must not alter collision height");
assert.equal(profile.displaySizePxByAnimation[profile.walkRunAnim], 122);
assert.equal(profile.displaySizePxByAnimation[profile.walkStartAnim], 101);
assert.equal(profile.displaySizePxByAnimation[profile.walkStopAnim], 101);
assert.equal(profile.strideTilesPerCycleByAnimation[profile.walkRunAnim], 1.12);
assert.match(profile.version, /mixamo-accepted-runtime-v1-20260819/);

console.log("survival animation contract repair v2: pass");
