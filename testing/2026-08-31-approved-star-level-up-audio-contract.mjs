import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { SoundSystem } from "../sound/SoundSystem.js";
import {
  APPROVED_SFX_FAMILIES,
  AUDIO_CONFIG,
} from "../values/audioConfig.js";
import { MAIN_MENU_COPY } from "../values/playerFacingCopy.js";

const rootUrl = new URL("../", import.meta.url);
const toPath = relativePath => fileURLToPath(new URL(relativePath, rootUrl));
const readSource = relativePath => readFileSync(toPath(relativePath), "utf8");
const sha256 = path => createHash("sha256")
  .update(readFileSync(path))
  .digest("hex")
  .toUpperCase();

const manifestPath = toPath(
  "sound/soundEffects/approved-sfx-findings-v1/"
    + "2026-08-31-freesound-approved-sfx-manifest.json",
);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const promotedAssets = [
  ...APPROVED_SFX_FAMILIES.starDestruction,
  ...APPROVED_SFX_FAMILIES.levelUpReward,
];

assert.equal(promotedAssets.length, 3);
assert.equal(APPROVED_SFX_FAMILIES.starDestruction.length, 1);
assert.equal(APPROVED_SFX_FAMILIES.levelUpReward.length, 2);
assert.equal(manifest.assets.length, promotedAssets.length);
for (const asset of promotedAssets) {
  const path = toPath(asset.path);
  const recorded = manifest.assets.find(entry => entry.file === asset.file);
  assert.ok(existsSync(path), `missing approved cue: ${asset.path}`);
  assert.ok(recorded, `missing manifest entry: ${asset.file}`);
  assert.equal(sha256(path), asset.sha256);
  assert.equal(sha256(path), recorded.sha256);
  assert.equal(readFileSync(path).byteLength, recorded.bytes);
}

assert.equal(APPROVED_SFX_FAMILIES.levelUpReward[0].license, "CC-BY-4.0");
assert.match(MAIN_MENU_COPY.audioCredits.join("\n"), /rhodesmas · CC BY 4\.0/);
assert.match(MAIN_MENU_COPY.audioCredits.join("\n"), /licenses\/by\/4\.0/);
assert.ok(AUDIO_CONFIG.starDestructionVolume <= 1);
assert.ok(AUDIO_CONFIG.levelUpRewardVolume <= 1);

const played = [];
const soundScene = {
  cache: {
    audio: {
      exists: key => promotedAssets.some(asset => asset.key === key),
    },
  },
  sound: {
    add(key, config) {
      return {
        key,
        config,
        get volume() { return this.config.volume; },
        set volume(value) { this.config.volume = value; },
        manager: {},
        pendingDestroy: false,
        stopped: false,
        once() { return this; },
        play() { played.push(this); },
        stop() { this.stopped = true; },
        destroy() {},
      };
    },
  },
};
const soundSystem = new SoundSystem(soundScene);
soundSystem.audioInitialized = true;
for (const familyName of ["starDestruction", "levelUpReward"]) {
  soundSystem.soundLibraryManager.libraries[familyName].push(
    ...APPROVED_SFX_FAMILIES[familyName],
  );
}

const starCue = soundSystem.playStarDestruction();
assert.equal(starCue.key, APPROVED_SFX_FAMILIES.starDestruction[0].key);
assert.equal(
  starCue.config.volume,
  AUDIO_CONFIG.sfxVolume
    * AUDIO_CONFIG.starDestructionVolume,
);
soundSystem.setMasterVolume(0.5);
assert.equal(soundScene.sound.volume, 0.5, "Phaser owns the single master stage");
assert.equal(starCue.volume, AUDIO_CONFIG.sfxVolume * AUDIO_CONFIG.starDestructionVolume);
const replacementStarCue = soundSystem.playStarDestruction();
assert.equal(starCue.stopped, true);
assert.equal(replacementStarCue.key, starCue.key);

const originalRandom = Math.random;
const randomValues = [0, 0, 0.99];
Math.random = () => randomValues.shift() ?? 0.99;
let levelCueA;
let levelCueB;
try {
  levelCueA = soundSystem.playLevelUpReward();
  levelCueB = soundSystem.playLevelUpReward();
} finally {
  Math.random = originalRandom;
}
assert.notEqual(levelCueA.key, levelCueB.key);
assert.equal(levelCueA.stopped, true);
assert.equal(played.length, 4, "each event must produce exactly one cue");

const bootSource = readSource("ui/scenes/BootScene.js");
const gameplaySource = readSource("world/playScene/PlaySceneGameplay.js");
const soundSource = readSource("sound/SoundSystem.js");
const audioConfigSource = readSource("values/audioConfig.js");
const creditsSource = readSource("ui/scenes/MainMenuScene.js");
assert.match(bootSource, /Object\.values\(APPROVED_SFX_FAMILIES\)[\s\S]{0,120}queueAudio/);
assert.match(
  gameplaySource,
  /SKY_TILE\) \{[\s\S]{0,120}result\.destroyed\) this\.soundSystem\.playStarDestruction\(\)[\s\S]{0,100}else this\.soundSystem\.playStarDig\(\)/,
);
assert.match(soundSource, /playLevelUpReward\(\)[\s\S]{0,180}"levelUpReward"/);
assert.doesNotMatch(soundSource, /levelUpSecondDelayMs|levelUpCueTimer/);
assert.doesNotMatch(
  audioConfigSource,
  /mining-on-mars|Evil-Spell-Ambience|electric-crackling|Rattling-Downer/,
);
assert.match(creditsSource, /MAIN_MENU_COPY\.audioCredits/);
assert.match(soundSource, /BigSoundBank\.com\.ogg/);
assert.doesNotMatch(soundSource, /BigSoundBank\.com\.wav/);

console.log("APPROVED_STAR_LEVEL_UP_AUDIO_CONTRACT_OK", {
  promotedFiles: promotedAssets.length,
  starEventCues: 1,
  levelEventCues: 1,
  creditedCcBy: true,
});
