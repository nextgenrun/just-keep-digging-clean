import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  CINEMATIC_VIDEO_CONFIG,
  getCinematicImagePreloadAssets,
  getTitanDiscoveryCinematic,
  resolveCinematicVideosEnabled,
  resolveOpeningCinematicAsset,
} from "../values/cinematicVideoConfig.js";
import { TITAN_DEFINITIONS } from "../values/titanDiscoveries.js";
import { CinematicVideoPlayer } from "../systems/visual/CinematicVideoPlayer.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PACK = path.join(ROOT, "steam-marketing", "2026-08-26-cinematic-video-pack-v1");

async function text(relativePath) {
  return readFile(path.join(ROOT, relativePath), "utf8");
}

async function sha256(relativePath) {
  const bytes = await readFile(path.join(ROOT, relativePath));
  return createHash("sha256").update(bytes).digest("hex");
}

function srtSeconds(timestamp) {
  const [hours, minutes, remainder] = timestamp.split(":");
  const [seconds, milliseconds] = remainder.split(",");
  return Number(hours) * 3600
    + Number(minutes) * 60
    + Number(seconds)
    + Number(milliseconds) / 1000;
}

function assertNonOverlappingCaptions(caption, captionId) {
  const ranges = [...caption.matchAll(
    /(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/g,
  )].map(match => [srtSeconds(match[1]), srtSeconds(match[2])]);
  assert.ok(ranges.length > 0, `${captionId} contains timed mute-viewer captions`);
  for (let index = 1; index < ranges.length; index += 1) {
    assert.ok(
      ranges[index][0] >= ranges[index - 1][1],
      `${captionId} captions replace cleanly instead of stacking`,
    );
  }
}

assert.equal(resolveCinematicVideosEnabled(CINEMATIC_VIDEO_CONFIG, ""), true);
assert.equal(resolveCinematicVideosEnabled(CINEMATIC_VIDEO_CONFIG, "?cinematics=0"), false);
assert.equal(resolveCinematicVideosEnabled(CINEMATIC_VIDEO_CONFIG, "?cinematics=off"), false);
assert.equal(CINEMATIC_VIDEO_CONFIG.playback.skipHoldDurationMs, 2000);
assert.equal(CINEMATIC_VIDEO_CONFIG.playback.skipInputDelayMs, 0);
assert.match(CINEMATIC_VIDEO_CONFIG.copy.skip, /HOLD SPACE \/ ENTER \/ ESC/);
assert.deepEqual(
  getCinematicImagePreloadAssets().map(asset => asset.key),
  [
    CINEMATIC_VIDEO_CONFIG.assets.opening.posterKey,
    CINEMATIC_VIDEO_CONFIG.assets.mossbackDiscovery.posterKey,
    CINEMATIC_VIDEO_CONFIG.uiAssets.holdFrame.key,
  ],
  "opening preload includes both posters and the approved hold-progress frame",
);
assert.equal(
  resolveOpeningCinematicAsset(CINEMATIC_VIDEO_CONFIG, "?cinematic=mossback").id,
  CINEMATIC_VIDEO_CONFIG.assets.mossbackDiscovery.id,
  "development preview can deterministically show the Titan cinematic",
);

globalThis.__DIG_GAME_PRODUCTION__ = true;
assert.equal(
  resolveOpeningCinematicAsset(CINEMATIC_VIDEO_CONFIG, "?cinematic=mossback").id,
  CINEMATIC_VIDEO_CONFIG.assets.opening.id,
  "production ignores the local cinematic preview override",
);
delete globalThis.__DIG_GAME_PRODUCTION__;

assert.equal(TITAN_DEFINITIONS[0].id, CINEMATIC_VIDEO_CONFIG.discovery.firstTitanId);
assert.equal(TITAN_DEFINITIONS[0].name, "Mossback Wanderer");
assert.equal(
  getTitanDiscoveryCinematic(TITAN_DEFINITIONS[0].id)?.id,
  CINEMATIC_VIDEO_CONFIG.assets.mossbackDiscovery.id,
);
for (const titan of TITAN_DEFINITIONS.slice(1)) {
  assert.equal(
    getTitanDiscoveryCinematic(titan.id),
    null,
    `only the first Turtle Titan owns this discovery cinematic: ${titan.id}`,
  );
}

for (const asset of Object.values(CINEMATIC_VIDEO_CONFIG.assets)) {
  const video = await stat(path.join(ROOT, asset.path));
  const poster = await stat(path.join(ROOT, asset.posterPath));
  assert.ok(video.size > 1_000_000, `${asset.id} video is material runtime media`);
  assert.ok(poster.size > 100_000, `${asset.id} poster is material runtime art`);
}

function createHoldContractPlayer({ playRequested = true, playing = true } = {}) {
  let timer = null;
  let finishStatus = null;
  const snapshots = [];
  const scene = {
    time: {
      now: 1000,
      delayedCall(delay, callback) {
        timer = {
          delay,
          callback,
          removed: false,
          remove() { this.removed = true; },
        };
        return timer;
      },
    },
  };
  const player = new CinematicVideoPlayer(scene);
  player.asset = { id: "hold-contract" };
  player.options = {};
  player.playRequested = playRequested;
  player.playing = playing;
  player.startedAtMs = scene.time.now;
  player.view = {
    setSkipHoldProgress(progress, active) { snapshots.push({ progress, active }); },
  };
  player._finish = status => { finishStatus = status; return true; };
  return {
    player,
    scene,
    snapshots,
    timer: () => timer,
    finishStatus: () => finishStatus,
  };
}

const cancelledHold = createHoldContractPlayer();
cancelledHold.player._handleKeyDown({ code: "Space", preventDefault() {} });
assert.equal(cancelledHold.timer().delay, 2000);
cancelledHold.scene.time.now = 2000;
cancelledHold.player._updateSkipHold();
assert.equal(cancelledHold.snapshots.at(-1).progress, 0.5);
cancelledHold.player._handleKeyUp({ code: "Space", preventDefault() {} });
assert.equal(cancelledHold.timer().removed, true, "releasing the held key cancels its timer");
assert.deepEqual(cancelledHold.snapshots.at(-1), { progress: 0, active: false });
assert.equal(cancelledHold.finishStatus(), null, "a partial hold never skips");

const completedHold = createHoldContractPlayer();
completedHold.player._handleKeyDown({ code: "Enter", preventDefault() {} });
completedHold.timer().callback();
assert.equal(completedHold.finishStatus(), CINEMATIC_VIDEO_CONFIG.health.states.skipped);

const preStartHold = createHoldContractPlayer({ playRequested: false, playing: false });
preStartHold.player._handleKeyDown({ code: "Escape", preventDefault() {} });
assert.equal(preStartHold.timer().delay, 2000, "pre-start Escape uses the same hold contract");

const clickDoesNotSkip = createHoldContractPlayer();
clickDoesNotSkip.player._handlePointerDown();
assert.equal(clickDoesNotSkip.timer(), null, "click cannot bypass hold-to-skip");
assert.equal(clickDoesNotSkip.finishStatus(), null);

const verification = JSON.parse(await readFile(path.join(PACK, "media-verification.json"), "utf8"));
assert.equal(verification.outputs.length, 5);
const expected = new Map([
  ["sprites/cinematics/understar-cinematics-v1/understar-opening-v1.mp4", [1920, 1080, 25]],
  ["sprites/cinematics/understar-cinematics-v1/mossback-discovery-v1.mp4", [1920, 1080, 15]],
  ["steam-marketing/2026-08-26-cinematic-video-pack-v1/understar-cinematic-trailer-v1.mp4", [1920, 1080, 30]],
  ["steam-marketing/2026-08-26-cinematic-video-pack-v1/understar-short-01-mossback-v1.mp4", [1080, 1920, 15]],
  ["steam-marketing/2026-08-26-cinematic-video-pack-v1/understar-short-02-depth-v1.mp4", [1080, 1920, 15]],
]);
for (const output of verification.outputs) {
  const contract = expected.get(output.path);
  assert.ok(contract, `unexpected final output: ${output.path}`);
  assert.deepEqual([output.width, output.height, output.durationSeconds], contract);
  assert.equal(output.hasAudio, true, `${output.path} includes its final mix`);
  assert.equal(await sha256(output.path), output.sha256, `${output.path} matches verification hash`);
}

const manifest = JSON.parse(await readFile(path.join(PACK, "generation-manifest.json"), "utf8"));
assert.equal(manifest.results.length, 8);
assert.equal(manifest.voices.length, 5);
assert.equal(manifest.results.every(result => result.status === "completed"), true);
assert.equal(manifest.voices.every(result => result.status === "completed"), true);
assert.equal(manifest.apiKeyStored, false);
assert.ok(manifest.knownVideoCostUsd <= manifest.hardBudgetUsd);
assert.ok(manifest.hardBudgetUsd < 15, "the generator's hard ceiling stays below the supplied budget");

for (const captionId of ["opening", "mossback", "trailer", "short-mossback", "short-depth"]) {
  const caption = await readFile(path.join(PACK, "captions", `${captionId}.srt`), "utf8");
  if (captionId !== "mossback") assertNonOverlappingCaptions(caption, captionId);
}
assert.match(await readFile(path.join(PACK, "captions", "mossback.srt"), "utf8"), /THE ROOT-BEARER/);
assert.match(await readFile(path.join(PACK, "captions", "short-mossback.srt"), "utf8"), /WISHLIST UNDERSTAR ON STEAM/);
assert.match(await readFile(path.join(PACK, "captions", "short-depth.srt"), "utf8"), /WISHLIST (?:UNDERSTAR|NOW) ON STEAM/);

const [mainSource, bootSource, openingSource, titanSource, playerSource] = await Promise.all([
  text("main.js"),
  text("ui/scenes/BootScene.js"),
  text("ui/scenes/OpeningCinematicScene.js"),
  text("systems/visual/TitanDiscoverySystem.js"),
  text("systems/visual/CinematicVideoPlayer.js"),
]);
assert.match(mainSource, /BootScene, OpeningCinematicScene, MenuAudioScene/);
assert.match(bootSource, /CINEMATIC_VIDEO_CONFIG\.scenes\.opening/);
assert.match(openingSource, /resolveOpeningCinematicAsset/);
assert.match(openingSource, /onComplete: \(\) => this\._continueToMenu/);
assert.match(openingSource, /stopBackgroundMusic/);
assert.match(openingSource, /startBackgroundMusic/);
assert.match(openingSource, /this\.scene\.start\(CINEMATIC_VIDEO_CONFIG\.scenes\.next\)/);
assert.match(titanSource, /discoveredBeforeUnlock/);
assert.match(titanSource, /showForDiscoveries/);
assert.match(playerSource, /SCENE_SUSPENSION_KINDS\.DIALOG/);
assert.match(playerSource, /sceneModeController\?\.isGameplayActive/);
assert.match(playerSource, /"keyup"/);
assert.match(playerSource, /setSkipHoldProgress/);
assert.match(playerSource, /"complete"/);
assert.match(playerSource, /"error"/);
assert.doesNotMatch(playerSource, /discoverTitan|retentionProgressSystem|queueDugTilesSave/);

for (const relativePath of [
  "values/cinematicVideoConfig.js",
  "systems/visual/CinematicVideoView.js",
  "systems/visual/CinematicVideoPlayer.js",
  "systems/visual/TitanDiscoveryCinematicController.js",
  "ui/scenes/OpeningCinematicScene.js",
]) {
  const lines = (await text(relativePath)).split(/\r?\n/).length;
  assert.ok(lines <= 300, `${relativePath} remains within the module budget (${lines})`);
}

console.log("cinematic video pack contract: five mixes, two-second hold-to-skip, opening flow, and first-Mossback wiring passed");
