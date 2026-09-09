import { createHash } from "node:crypto";
import { readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  APPROVED_SFX_FAMILIES,
  AUDIO_CONFIG,
  AUDIO_RUNTIME_LOADING,
} from "../../values/audioConfig.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CORE_ACTION_AUDIO } from "../../values/coreActionAudio.js";
import { FREESOUND_RUNTIME_ASSETS as FREESOUND_AUDIO_ASSETS } from "../../values/freesoundAudio.js";
import { MUSIC_CONTEXT_IDS } from "../../values/musicDirector.js";
import {
  PLAYER_VOICE_CHARACTER,
  PLAYER_VOICE_CONFIG,
  PLAYER_VOICE_LIBRARY,
} from "../../values/playerVoiceCharacterLeoV1.generated.js";
import { REVIEWED_AUDIO_ASSETS } from "../../values/reviewedAudioAssets.js";
import { REVIEWED_AUDIO_MIX } from "../../values/reviewedAudioMix.js";
import { WEATHER_CONFIG } from "../../values/weatherConfig.js";
import { buildMusicTrackCatalog } from "../../sound/musicTrackCatalog.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../..");
const OUTPUT = resolve(HERE, "catalog.json");
const SFX_BUS = AUDIO_CONFIG.sfxVolume;
const VOICE_BUS = AUDIO_CONFIG.voiceVolume * REVIEWED_AUDIO_MIX.voiceHeadroom;

const VOLUME_POLICIES = Object.freeze({
  "approved-sfx-family:hardcoreNearDeath": [0.45, 0.36, "urgent warning; preserve clarity without dominating the mix"],
  "approved-sfx-family:levelUpReward": [0.58, 0.25, "reward accent; leave headroom for its layered playback"],
  "approved-sfx-family:seismicWarning": [0.50, 0.32, "repeating danger cue; reduce fatigue and overlap"],
  "approved-sfx-family:starDestruction": [0.80, 0.13, "large transient already reinforced by game effects"],
  "freesound-runtime:coinPickup": [0.78, 0.09, "frequent pickup; keep below mining transients"],
  "freesound-runtime:coinReward": [0.72, 0.13, "short shop receipt; one cue per transaction burst"],
  "freesound-runtime:crystalBreak": [0.68, 0.16, "bright break transient; tame repeated high-frequency energy"],
  "freesound-runtime:flightWhoosh": [0.74, 0.085, "movement layer; keep behind primary actions"],
  "freesound-runtime:footstepDirt": [0.78, 0.085, "frequent movement layer; reduce repetition fatigue"],
  "freesound-runtime:mineEarth": [0.68, 0.16, "high-frequency core action; leave room for break and reward layers"],
  "freesound-runtime:mineMetal": [0.78, 0.13, "bright mining contact; cap loud normalized outliers"],
  "freesound-runtime:mineStone": [0.72, 0.14, "core action; leave room for simultaneous material layers"],
  "freesound-runtime:panicFast": [0.72, 0.055, "fast looping stress layer; reduce cumulative loudness"],
  "freesound-runtime:panicPulse": [0.75, 0.045, "looping stress pulse; keep below warnings and voice"],
  "freesound-runtime:panicSlow": [0.80, 0.032, "slow looping stress bed; keep subliminal"],
  "freesound-runtime:quakeRumble": [0.70, 0.07, "stackable low-frequency bed; preserve mix headroom"],
  "freesound-runtime:starAccent": [0.75, 0.055, "stackable star detail; keep behind contact transients"],
  "freesound-runtime:starGrain": [0.80, 0.04, "continuous star texture; keep subtle"],
  "freesound-runtime:starHum": [0.70, 0.09, "continuous tonal bed; avoid masking voice and music"],
  "freesound-runtime:structuralCreak": [0.68, 0.075, "ambient detail; keep spatial rather than foreground"],
  "freesound-runtime:uiClick": [0.72, 0.07, "frequent interface feedback; reduce click fatigue"],
  "legacy-runtime:footsteps": [0.90, 1, "quiet ground contacts below the primary mining action"],
  "legacy-runtime:star-contact": [0.37, 0.28, "very loud star impact; retain weight with substantial headroom"],
  "legacy-runtime:tile-break": [0.38, 0.30, "very loud break transient; leave room for layered rewards"],
  "legacy-runtime:tile-hit": [0.33, 0.26, "very frequent hit transient; reduce repetition fatigue"],
  "merchant-voice:*": [0.84, 0.34, "foreground dialogue; intelligible but below player callouts"],
  "music-director:*": [0.75, 0.30, "gameplay score; create headroom for SFX and dialogue"],
  "player-event-voice:*": [0.73, 0.42, "foreground player callout; clear without overpowering gameplay"],
  "recorded-weather:rainOpen": [0.65, 0.14, "continuous weather bed; reduce cumulative loudness"],
  "recorded-weather:rainRoof": [0.68, 0.11, "continuous sheltered rain layer"],
  "recorded-weather:rainShelter": [0.68, 0.105, "continuous sheltered rain layer"],
  "recorded-weather:stormOpen": [0.67, 0.14, "continuous storm bed; preserve warning headroom"],
  "recorded-weather:windOpen": [0.72, 0.055, "continuous wind bed"],
  "recorded-weather:windStrong": [0.74, 0.05, "continuous wind bed; avoid low-frequency buildup"],
  "reviewed-runtime:ambience": [0.80, 0.12, "layered ambience; respect the runtime peak budget"],
  "reviewed-runtime:break": [0.65, 0.18, "break transient; leave room for simultaneous rewards"],
  "reviewed-runtime:contact": [0.63, 0.18, "frequent contact transient; reduce repetition fatigue"],
  "reviewed-runtime:danger": [0.70, 0.15, "danger layer; audible without masking dedicated warnings"],
  "reviewed-runtime:detail": [0.75, 0.10, "ambient detail; keep behind core actions"],
  "reviewed-runtime:landing": [0.72, 0.13, "movement transient; keep below mining impacts"],
  "reviewed-runtime:level": [0.58, 0.25, "reward accent; leave headroom for layered playback"],
  "reviewed-runtime:pickup": [0.80, 0.06, "frequent pickup detail"],
  "reviewed-runtime:reward": [0.72, 0.16, "reward cue; preserve headroom when stacked"],
  "reviewed-runtime:star": [0.80, 0.13, "large star transient already reinforced visually"],
  "reviewed-runtime:swing": [0.80, 0.065, "frequent tool movement layer"],
  "reviewed-runtime:tool": [0.72, 0.105, "core tool cue; leave room for contact and break"],
  "reviewed-runtime:torch": [0.78, 0.07, "continuous utility texture"],
  "reviewed-runtime:ui": [0.72, 0.12, "frequent interface feedback"],
});

function reviewedRuntimeGain(asset) {
  const scale = { libDirtSwingA: CORE_ACTION_AUDIO.swingGain,
    libDirtBreak: CORE_ACTION_AUDIO.breakGain, libStoneBreak: CORE_ACTION_AUDIO.breakGain,
    libLandingDebris: CORE_ACTION_AUDIO.hardLandingGain,
    libResourcePop: CORE_ACTION_AUDIO.pickups.resourceGain,
    libPurchaseCoin: CORE_ACTION_AUDIO.pickups.purchaseFallbackGain,
    libRewardCoins: CORE_ACTION_AUDIO.pickups.rewardFallbackGain,
    digOne: CORE_ACTION_AUDIO.fallbackContactGain, digTwo: CORE_ACTION_AUDIO.fallbackContactGain };
  return asset.gain * (scale[asset.id] ?? 1) * SFX_BUS;
}

const DEFAULT_VOLUME_POLICY = Object.freeze([0.75, 1, "conservative first-pass trim"]);

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function cleanPath(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\/+/, "");
}

function extractMethodBody(source, methodName) {
  const marker = `\n  ${methodName}(`;
  const methodAt = source.indexOf(marker);
  if (methodAt < 0) throw new Error(`BootScene.${methodName} was not found`);
  const signatureEnd = source.indexOf(") {", methodAt + marker.length);
  if (signatureEnd < 0) throw new Error(`BootScene.${methodName} has no method body`);
  const openAt = signatureEnd + 2;
  let depth = 1;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = openAt + 1; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") { blockComment = false; index += 1; }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") { lineComment = true; index += 1; continue; }
    if (character === "/" && next === "*") { blockComment = true; index += 1; continue; }
    if (["'", "\"", "`"].includes(character)) { quote = character; continue; }
    if (character === "{") depth += 1;
    if (character === "}") depth -= 1;
    if (depth === 0) return source.slice(openAt + 1, index);
  }
  throw new Error(`BootScene.${methodName} has no closing brace`);
}

function captureBootQueue(source, methodName, streaming = false) {
  const queued = [];
  const body = extractMethodBody(source, methodName);
  const run = new Function(
    "streaming",
    "AUDIO_RUNTIME_LOADING",
    "ASSET_KEYS",
    "APPROVED_SFX_FAMILIES",
    "REVIEWED_AUDIO_ASSETS",
    body,
  );
  run.call({
    queueAudio(key, path, options = {}) {
      queued.push({ key, path: cleanPath(path), preload: options.preload !== false });
    },
  }, streaming, AUDIO_RUNTIME_LOADING, {
    audio: {
      sfx: ASSET_KEYS.audio.sfx,
      weatherAmbience: ASSET_KEYS.audio.weatherAmbience,
      voiceLines: { playerRandomFiles: [] },
    },
  }, APPROVED_SFX_FAMILIES, REVIEWED_AUDIO_ASSETS);
  return queued;
}

function bootGain(key) {
  if (key.startsWith("dig-star-")) return AUDIO_CONFIG.starDigVolume * SFX_BUS;
  if (key.startsWith("dig-")) return AUDIO_CONFIG.digVolume * SFX_BUS;
  if (key.startsWith("footsteps-")) return (CORE_ACTION_AUDIO.hardFootsteps.find(asset => asset.key === key)?.gain || 0) * SFX_BUS;
  if (key.startsWith("tileBreak-")) return AUDIO_CONFIG.tileBreakVolume * SFX_BUS;
  if (key.startsWith("tileHit-")) return AUDIO_CONFIG.tileHitVolume * SFX_BUS;
  if (key === ASSET_KEYS.audio.sfx.uiSelect) return AUDIO_CONFIG.uiVolume * AUDIO_CONFIG.uiSelectVolumeMultiplier * SFX_BUS;
  if (key === ASSET_KEYS.audio.sfx.uiConfirm) return AUDIO_CONFIG.uiVolume * AUDIO_CONFIG.uiConfirmVolumeMultiplier * SFX_BUS;
  return 0.35 * SFX_BUS;
}

function bootFamily(key) {
  if (key.startsWith("dig-star-")) return "star-contact";
  if (key.startsWith("dig-")) return "mining-contact";
  if (key.startsWith("footsteps-")) return "footsteps";
  if (key.startsWith("tileBreak-")) return "tile-break";
  if (key.startsWith("tileHit-")) return "tile-hit";
  if (key.startsWith("sfx-ui-")) return "interface";
  return "runtime-sfx";
}

function approvedGain(family, asset) {
  const familyGain = {
    seismicWarning: AUDIO_CONFIG.seismicWarningVolume,
    hardcoreNearDeath: AUDIO_CONFIG.hardcoreNearDeathVolume,
    starDestruction: AUDIO_CONFIG.starDestructionVolume,
    levelUpReward: AUDIO_CONFIG.levelUpRewardVolume,
  }[family] ?? 1;
  return familyGain * (asset.volumeMultiplier ?? 1) * SFX_BUS;
}

function route(source, key, role, gain, details = null) {
  return { source, key: key || null, role: role || null, gain: Number(gain || 0), details };
}

function addItem(store, entry) {
  const path = cleanPath(entry.path);
  if (!path) return;
  const current = store.get(path) || {
    id: `active-${hash(path).slice(0, 16)}`,
    path,
    title: entry.title || path.split("/").at(-1),
    kind: entry.kind,
    families: [],
    routes: [],
    sourceUrls: [],
    licenses: [],
    metadata: {},
  };
  current.title = current.title || entry.title;
  current.kind = current.kind || entry.kind;
  current.families = [...new Set([...current.families, ...(entry.families || [])].filter(Boolean))];
  current.routes.push(...(entry.routes || []));
  current.sourceUrls = [...new Set([...current.sourceUrls, entry.sourceUrl].filter(Boolean))];
  current.licenses = [...new Set([...current.licenses, entry.license].filter(Boolean))];
  current.metadata = { ...current.metadata, ...(entry.metadata || {}) };
  store.set(path, current);
}

function kindForRole(role, group = "") {
  return /hum|grain|panic|ambience|detail|structural/i.test(`${role} ${group}`) ? "ambience" : "sfx";
}

function roundGain(value) {
  return Math.round(Math.max(0, Number(value) || 0) * 10000) / 10000;
}

function dbChange(current, suggested) {
  return current > 0 && suggested > 0
    ? Math.round(20 * Math.log10(suggested / current) * 10) / 10
    : 0;
}

function volumePolicy(routeEntry) {
  if (routeEntry.source === "legacy-runtime" && routeEntry.role === "interface") {
    if (routeEntry.key === ASSET_KEYS.audio.sfx.uiSelect) {
      return [0.55, 0.12, "frequent interface select; reduce click fatigue"];
    }
    if (routeEntry.key === ASSET_KEYS.audio.sfx.uiConfirm) {
      return [0.55, 0.16, "interface confirmation; distinct but below gameplay impacts"];
    }
  }
  return VOLUME_POLICIES[`${routeEntry.source}:${routeEntry.role}`]
    || VOLUME_POLICIES[`${routeEntry.source}:*`]
    || DEFAULT_VOLUME_POLICY;
}

function suggestRouteVolume(routeEntry) {
  const current = roundGain(routeEntry.gain);
  const [factor, cap, reason] = volumePolicy(routeEntry);
  const suggested = roundGain(Math.min(current, current * factor, cap));
  return {
    ...routeEntry,
    suggestedGain: suggested,
    suggestedDbChange: dbChange(current, suggested),
    suggestionReason: reason,
  };
}

async function attachFileState(items) {
  return Promise.all(items.map(async item => {
    try {
      const info = await stat(resolve(ROOT, item.path));
      return { ...item, exists: info.isFile(), byteSize: info.size };
    } catch (_) {
      return { ...item, exists: false, byteSize: 0 };
    }
  }));
}

export async function buildActiveGametimeAudioCatalog() {
  const store = new Map();
  const bootSource = await readFile(resolve(ROOT, "ui/scenes/BootScene.js"), "utf8");
  const bootSfx = captureBootQueue(bootSource, "loadSoundEffectLibraries");
  const bootVoices = captureBootQueue(bootSource, "loadVoiceLineLibraries", true)
    .filter(entry => !entry.key.startsWith("player-random-"));

  const controllerOwnedKeys = new Set([
    ...Object.values(APPROVED_SFX_FAMILIES).flat().map(asset => asset.key),
    ...Object.values(REVIEWED_AUDIO_ASSETS).map(asset => asset.key),
    ...Object.values(ASSET_KEYS.audio.weatherAmbience).map(asset => asset.key),
  ]);
  for (const entry of bootSfx.filter(asset => !controllerOwnedKeys.has(asset.key)
    && (!asset.key.startsWith("footsteps-") || CORE_ACTION_AUDIO.hardFootsteps.some(step => step.key === asset.key)))) addItem(store, {
    ...entry,
    kind: entry.key.startsWith("weather-") ? "ambience" : "sfx",
    families: [bootFamily(entry.key)],
    metadata: CORE_ACTION_AUDIO.hardFootsteps.find(asset => asset.key === entry.key),
    routes: [route("legacy-runtime", entry.key, bootFamily(entry.key), bootGain(entry.key))],
  });

  for (const [family, assets] of Object.entries(APPROVED_SFX_FAMILIES)) {
    for (const asset of assets) addItem(store, {
      ...asset,
      title: asset.file,
      kind: "sfx",
      families: [family],
      routes: [route("approved-sfx-family", asset.key, family, approvedGain(family, asset))],
      sourceUrl: asset.sourceUrl,
      license: asset.license,
    });
  }

  for (const asset of Object.values(REVIEWED_AUDIO_ASSETS)) addItem(store, {
    ...asset,
    title: asset.id,
    kind: kindForRole("", asset.group),
    families: [asset.group, ...(asset.approvedBy || [])],
    routes: [route("reviewed-runtime", asset.key, asset.group, reviewedRuntimeGain(asset),
      asset.mixOnly ? "composite-only stem" : "direct or layered runtime cue")],
    metadata: { duration: asset.duration, peak: asset.peak, mixOnly: asset.mixOnly },
  });

  for (const asset of Object.values(FREESOUND_AUDIO_ASSETS)) addItem(store, {
    ...asset,
    kind: kindForRole(asset.role, asset.group),
    families: [asset.family, asset.role, asset.group],
    routes: [route("freesound-runtime", asset.key, asset.role, asset.gain * SFX_BUS)],
    sourceUrl: asset.sourceUrl,
    license: asset.licenseDeclared,
    metadata: {
      creator: asset.creator,
      duration: asset.duration,
      peak: asset.peak,
      activeRmsDb: asset.activeRmsDb,
      loop: asset.loop,
    },
  });

  const weatherVolumes = WEATHER_CONFIG.audio.recorded.volumes;
  for (const [role, asset] of Object.entries(ASSET_KEYS.audio.weatherAmbience)) addItem(store, {
    ...asset,
    title: role,
    kind: "ambience",
    families: ["weather", role],
    routes: [route("recorded-weather", asset.key, role, (weatherVolumes[role] || 0) * SFX_BUS)],
  });

  for (const [family, clips] of Object.entries(PLAYER_VOICE_LIBRARY)) {
    for (const clip of clips) addItem(store, {
      ...clip,
      title: `${PLAYER_VOICE_CHARACTER.displayName} · ${family} · ${clip.variant}`,
      kind: "voice",
      families: ["player-voice", family],
      routes: [route("player-event-voice", clip.key, family, VOICE_BUS,
        PLAYER_VOICE_CONFIG.events[family]?.trigger || null)],
      metadata: { delivery: clip.delivery, tags: clip.tags },
    });
  }

  for (const entry of bootVoices) {
    const family = entry.key.replace(/^npc-/, "").replace(/-\d+$/, "");
    addItem(store, {
      ...entry,
      kind: "voice",
      families: ["npc-voice", family],
      routes: [route("merchant-voice", entry.key, family, VOICE_BUS * AUDIO_CONFIG.npcVoiceVolume)],
    });
  }

  const playlist = JSON.parse(await readFile(resolve(ROOT, "sound/playlists/playlist.json"), "utf8"));
  for (const track of buildMusicTrackCatalog(playlist)) {
    const gameplayContexts = track.contexts.filter(context => context !== MUSIC_CONTEXT_IDS.menu);
    if (!gameplayContexts.length && !track.cues.length) continue;
    addItem(store, {
      path: `sound/playlists/${track.file}`,
      title: track.file,
      kind: "music",
      families: [...gameplayContexts, ...track.cues],
      routes: [route("music-director", `music-track-${track.index + 1}`,
        [...gameplayContexts, ...track.cues].join(", "), AUDIO_CONFIG.musicVolume,
        `routes: ${track.routes.join(", ")}`)],
      metadata: { contexts: gameplayContexts, cues: track.cues, category: track.category },
    });
  }

  let items = [...store.values()].map(item => {
    const routes = [...new Map(item.routes.map(value => [JSON.stringify(value), value])).values()]
      .map(suggestRouteVolume);
    const runtimeGain = roundGain(Math.max(...routes.map(value => value.gain || 0), 0));
    const suggestedGain = roundGain(Math.max(...routes.map(value => value.suggestedGain || 0), 0));
    return {
      ...item,
      families: [...new Set(item.families)].sort(),
      routes,
      runtimeGain,
      suggestedGain,
      suggestedDbChange: dbChange(runtimeGain, suggestedGain),
      volumeReason: [...new Set(routes.map(value => value.suggestionReason).filter(Boolean))].join("; "),
    };
  });
  items = await attachFileState(items);
  items.sort((left, right) => `${left.kind}|${left.families[0]}|${left.title}`
    .localeCompare(`${right.kind}|${right.families[0]}|${right.title}`));

  const countsByKind = Object.fromEntries([...new Set(items.map(item => item.kind))].sort()
    .map(kind => [kind, items.filter(item => item.kind === kind).length]));
  const catalogHash = hash(JSON.stringify(items));
  return {
    schemaVersion: 2,
    reviewOnly: true,
    runtimeWired: false,
    generatedOn: "2026-09-04",
    scope: "Default active gameplay audio. Menu-only music, disabled legacy-random player lines, cinematics, archives, and review inboxes are excluded.",
    catalogHash,
    sourceHash: hash(bootSource + JSON.stringify(playlist)),
    counts: { total: items.length, missing: items.filter(item => !item.exists).length, byKind: countsByKind },
    items,
  };
}

export async function writeActiveGametimeAudioCatalog() {
  const catalog = await buildActiveGametimeAudioCatalog();
  await writeFile(OUTPUT, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return catalog;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalog = await writeActiveGametimeAudioCatalog();
  console.log(`ACTIVE_GAMETIME_AUDIO_CATALOG_OK ${catalog.counts.total} clips ${catalog.counts.missing} missing`);
}
