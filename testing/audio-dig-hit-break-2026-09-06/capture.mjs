import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createFreesoundFixture } from "../audio-review-2026-09-03/freesound-fixture.mjs";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { FREESOUND_RUNTIME_ASSETS } from "../../values/freesoundAudio.js";
import { CORE_SFX_WINDOWS } from "../../values/coreSfxWindows.js";
import { DIG_AUDIO_REVIEW as C } from "../../values/audioDigHitBreakReview.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { setupGameplayMethods } from "../../world/playScene/PlaySceneGameplay.js";
import { dispatchCaveMineFeedback } from "../../world/playScene/caveMineFeedback.js";
const catalog = JSON.parse(readFileSync(new URL("../audio-runtime-reaudit-2026-09-04/catalog.json", import.meta.url)));
const assets = { ...REVIEWED_AUDIO_ASSETS, ...FREESOUND_RUNTIME_ASSETS };
const byKey = new Map(Object.values(assets).map(a => [a.key, a]));
for (const item of catalog.items) for (const route of item.routes) {
 if (route.key && !byKey.has(route.key)) byKey.set(route.key, { id: route.key, key: route.key, path: item.path,
  duration: item.metadata.duration, peak: item.metadata.peak || 1 });
}
const methods = {}; setupGameplayMethods(methods);
const cases = [{ id: "swing", label: "Dig swing", stage: "swing" }, { id: "blocked", label: "Blocked / unbreakable hit", stage: "blocked" },
 { id: "cooldown", label: "Input during cooldown", stage: "cooldown" }, { id: "no-target", label: "No target", stage: "no-target" }];
for (const [tileName, tileType] of Object.entries(TILE_TYPES)) {
 if (C.excludeSuccessful.includes(tileName)) continue;
 for (const stage of ["hit", "break"]) for (const mode of ["primary", "fallback"]) cases.push({
  id: `${tileName}-${stage}-${mode}`, label: `${tileName.replaceAll("_", " ")} ${stage}${mode === "fallback" ? " (disabled-bank fallback)" : ""}`,
  tileName, tileType, stage, mode, gated: C.gatedTiles.includes(tileName),
 });
}
for (const tileName of ["DIRT", "STONE", "COPPER", "GEODE_INTERIOR"]) for (const stage of ["hit", "break"]) cases.push({
 id: `cave-${tileName}-${stage}`, label: `Cave ${tileName} ${stage}`, tileName, tileType: TILE_TYPES[tileName], stage, mode: "cave",
});
const sources = new Map(), routes = [], rawLog = console.log, rawWarn = console.warn; console.log = () => {};
console.warn = (...args) => { if(args[0] !== "[SoundSystem] Audio context not available") rawWarn(...args); };
for (const c of cases) {
 const f = createFreesoundFixture(); f.system.freesoundAudio.enabled = c.mode !== "fallback";
 const star = byKey.get("dig-star-0");
 if (star) { f.keys.add(star.key); f.system.soundLibraryManager.libraries.starDig = [{ key: star.key, path: star.path }]; }
 const events = [], play = f.system.playSfx.bind(f.system);
 f.system.playSfx = (key, gain, options = {}) => {
  const sound = play(key, gain, options), asset = byKey.get(key);
  if (!sound) return null;
  if (!asset) throw new Error("Unmapped sound: " + key);
  const item = catalog.items.find(i => i.path === asset.path);
  if (!item) throw new Error("Missing current review identity: " + asset.path);
  const signature = JSON.stringify([key, gain, options]);
  if (!events.some(e => e.signature === signature)) events.push({ signature, sourceId: item.id, key, gain, options,
   outputGain: sound.config.volume * f.system.masterVolume, rate: options.rate || 1 });
  if (!sources.has(item.id)) sources.set(item.id, { ...item, assetId: asset.id, key, sourceDuration: asset.duration,
   sourcePeak: asset.peak, window: CORE_SFX_WINDOWS[asset.id] || null, auditRoutes: [], sha256: createHash("sha256").update(readFileSync(asset.path)).digest("hex") });
  if (!sources.get(item.id).auditRoutes.includes(c.id)) sources.get(item.id).auditRoutes.push(c.id);
  return sound;
 };
 for (let n = 0; n < C.cycles; n++) {
  f.system._suspendAudio(); f.tick(C.captureGapMs);
  if (c.stage === "swing") f.system.playDigSwing();
  else if (["blocked", "cooldown", "no-target"].includes(c.stage)) methods.playMineFeedbackAudio.call({soundSystem:f.system}, {reason:c.stage, success:false}, TILE_TYPES.BEDROCK);
  else {
   const result = { success: true, destroyed: c.stage === "break", typeBeforeDamage: c.tileType };
   if (c.mode === "cave") dispatchCaveMineFeedback({}, {soundSystem:f.system}, result, {contactFeedback:true});
   else methods.playMineFeedbackAudio.call({soundSystem:f.system}, result, c.tileType);
  }
 }
 routes.push({ ...c, events: events.map(({signature,...event}) => event), silent: !events.length }); f.system.destroy();
}
console.log = rawLog; console.warn = rawWarn;
const sourceRows = [...sources.values()].sort((a,b) => C.sourceOrder.indexOf(a.assetId) - C.sourceOrder.indexOf(b.assetId));
const report = { settings:C, date:C.date, reviewOnly:true, runtimeWired:false, sourceCatalogHash:catalog.catalogHash,
 scope:"All current player mining hits and breaks, blocked hits, disabled-bank fallbacks, cave dispatch, Star cues and separately labelled Level Two routes. Source sharing with non-mining events is documented separately.",
 sourceCount:sourceRows.length, routeCount:routes.length, sources:sourceRows, routes };
writeFileSync(new URL("catalog.json", import.meta.url), JSON.stringify(report,null,2));
console.log(JSON.stringify({sources:sourceRows.map(s=>({id:s.assetId,path:s.path,routes:s.auditRoutes.length})),routes:routes.length,
 unexpectedSilent:routes.filter(r=>r.silent && !["cooldown","no-target"].includes(r.stage)).map(r=>r.id)}));
