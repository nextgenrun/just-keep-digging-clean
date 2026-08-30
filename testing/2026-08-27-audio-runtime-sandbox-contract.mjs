import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { AUDIO_SANDBOX_CONFIG as config } from "./audio-runtime-sandbox/audioSandboxConfig.mjs";

const rootUrl = new URL("../", import.meta.url);
const sandboxUrl = new URL("./audio-runtime-sandbox/", import.meta.url);
const files = ["index.html", "styles.css", "audioSandboxConfig.mjs", "audioSandboxEngine.js", "audioSandboxSimulation.js", "audioSandboxApp.js", "readme.md"];
const read = (url) => readFileSync(fileURLToPath(url), "utf8");
const hash = (url) => createHash("sha256").update(readFileSync(fileURLToPath(url))).digest("hex");

files.forEach((file) => assert.ok(existsSync(fileURLToPath(new URL(file, sandboxUrl))), `Missing sandbox file: ${file}`));
assert.equal(config.reviewOnly, true);
assert.equal(config.defaultLane, "candidate");
assert.equal(config.voiceLimit, 18);
assert.ok(Object.keys(config.sounds).length >= 35, "Expected current plus candidate coverage");
assert.deepEqual(Object.keys(config.buses), ["master", "movement", "mining", "ui", "hazard", "ambience"]);
assert.deepEqual(config.materialProfiles.gold, { label: "Gold", digRate: 1.08, breakRate: 1.16, breakVolume: 1.2 });

for (const [id, sound] of Object.entries(config.sounds)) {
  const assetUrl = new URL(sound.url, sandboxUrl);
  assert.ok(existsSync(fileURLToPath(assetUrl)), `Missing audio for ${id}: ${fileURLToPath(assetUrl)}`);
  assert.ok(config.buses[sound.bus], `Unknown bus for ${id}: ${sound.bus}`);
  assert.ok(["current", "candidate"].includes(sound.lane), `Unknown source lane for ${id}`);
}

const digHash = hash(new URL(config.sounds.liveDigA.url, sandboxUrl));
const blockedHash = hash(new URL(config.sounds.liveTileHit.url, sandboxUrl));
assert.notEqual(blockedHash, digHash, "The two live dig-1 paths are separate recordings, not byte duplicates");
assert.match(config.sounds.liveTileBreak.url, /Broken plate 7/);

const app = read(new URL("audioSandboxApp.js", sandboxUrl));
const engine = read(new URL("audioSandboxEngine.js", sandboxUrl));
const html = read(new URL("index.html", sandboxUrl));
const simulation = read(new URL("audioSandboxSimulation.js", sandboxUrl));
const sandboxConfigSource = read(new URL("audioSandboxConfig.mjs", sandboxUrl));
const boot = read(new URL("ui/scenes/BootScene.js", rootUrl));
const soundSystem = read(new URL("sound/SoundSystem.js", rootUrl));
const materialFeedback = read(new URL("values/materialFeedback.js", rootUrl));
const gameplay = read(new URL("world/playScene/PlaySceneGameplay.js", rootUrl));

assert.match(app, /window\.__audioSandbox/);
assert.match(html, /data-runtime-wiring="none"/);
assert.match(html, /Flight and landing: silent/);
assert.match(html, /runtime character is the Survivor; there is no robot sound route/);
assert.match(simulation, /survival-ual-player-v1-idle-sheet\.webp/);
assert.doesNotMatch(sandboxConfigSource, /robot-flight-movement/);
assert.doesNotMatch(engine, /createConvolver|\.detune\b/);
assert.match(engine, /source\.playbackRate\.value = rate/);
assert.match(app, /candidateGoldBreak[\s\S]*rate: 1/);
assert.match(boot, /queueAudio\('tileBreak-0',[\s\S]{0,160}Broken plate 7/);
assert.match(boot, /const tileHitBasePath = 'sound\/soundEffects\/costume-sounds\/hit-reource-tile\/'/);
assert.match(boot, /queueAudio\('tileHit-0', tileHitBasePath \+ 'dig-1\.ogg'\)/);
assert.match(soundSystem, /getRandomSound\('dig'\)/);
assert.match(gameplay, /playDig\(\{ rate: material\.digRate \}\)/);
assert.match(gameplay, /playTileBreak\(\{ rate: material\.breakRate, volume: material\.breakVolume \}\)/);
assert.match(materialFeedback, /digRate: 1\.08, breakRate: 1\.16, breakVolume: 1\.2/);

const currentCount = Object.values(config.sounds).filter((sound) => sound.lane === "current").length;
const candidateCount = Object.values(config.sounds).filter((sound) => sound.lane === "candidate").length;
console.log("AUDIO_RUNTIME_SANDBOX_CONTRACT_OK");
console.log(`CurrentAssets=${currentCount} CandidateAssets=${candidateCount} Buses=${Object.keys(config.buses).length}`);
console.log("BrokenPlateExposed=true BlockedUsesDigNamedAsset=true ByteDuplicate=false FlightCurrentSilent=true RuntimeWiring=0");
