// Resolves actionbar-owned eager aliases and approved shared engine textures.

import { BAKED_TALENT_NODES } from "../../values/bakedCelestialUi.js";
import { prepareArt } from "./bakedUiArt.js";
import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CAMPFIRE_CONFIG } from "../../values/campfireConfig.js";
import { CELESTIAL_ACTION_BAR_ASSET_KEYS } from "../../values/celestialActionBar.js";
import { CELESTIAL_TALENT_TREE_UI_CONFIG } from "../../values/celestialTalentTreeUi.js";

const chrome = Object.freeze({
  foundation: CELESTIAL_ACTION_BAR_ASSET_KEYS.foundation,
  detachedSlot: CELESTIAL_TALENT_TREE_UI_CONFIG.assets.nodeFrame.key,
  tooltip: CELESTIAL_TALENT_TREE_UI_CONFIG.assets.tooltip.key,
});

const iconCandidates = Object.freeze({
  quickslash: Object.freeze([
    Object.freeze({ key: CELESTIAL_ACTION_BAR_ASSET_KEYS.quickslash }),
    Object.freeze({ key: ASSET_KEYS.player.quickslashSheet, frame: 0 }),
  ]),
  thunderStrike: Object.freeze([
    Object.freeze({ key: CELESTIAL_ACTION_BAR_ASSET_KEYS.thunderStrike }),
    Object.freeze({ key: ASSET_KEYS.player.thunderStrikeStrikeSheet, frame: 0 }),
  ]),
  waywardStar: Object.freeze([
    Object.freeze({ key: CELESTIAL_ACTION_BAR_ASSET_KEYS.waywardStar }),
  ]),
  hollowSun: Object.freeze([
    Object.freeze({ key: CELESTIAL_ACTION_BAR_ASSET_KEYS.hollowSun }),
  ]),
  cometEngine: Object.freeze([
    Object.freeze({ key: CELESTIAL_ACTION_BAR_ASSET_KEYS.cometEngine }),
  ]),
});

function hasTexture(scene, key) {
  return Boolean(key && scene?.textures?.exists?.(key));
}

function resolveCampfireIcon(scene) {
  const currentIndex = Math.max(
    0,
    Math.min(
      CAMPFIRE_CONFIG.spriteKeys.length - 1,
      Math.floor(Number(scene?.campfireSystem?.getCampfireLevel?.()) || 1) - 1,
    ),
  );
  const currentKey = CAMPFIRE_CONFIG.spriteKeys[currentIndex];
  if (hasTexture(scene, currentKey)) {
    return Object.freeze({ key: currentKey, fallback: false });
  }
  const fallbackKey = CAMPFIRE_CONFIG.spriteKeys.find(key => hasTexture(scene, key));
  return fallbackKey ? Object.freeze({ key: fallbackKey, fallback: true }) : null;
}

export function getCelestialActionBarChrome() {
  return chrome;
}

export function resolveCelestialActionBarIcon(scene, assetRole) {
  if (assetRole === "campfire") return resolveCampfireIcon(scene);
  const roots = { waywardStar:"wayward-star-root", hollowSun:"hollow-sun-root", cometEngine:"comet-engine-root" };
  if (roots[assetRole]) {
    const art = prepareArt(scene, BAKED_TALENT_NODES[roots[assetRole]].face);
    return art ? Object.freeze({...art, bakedFace:true, fallback:false}) : null;
  }
  const candidates = iconCandidates[assetRole] || [];
  const candidateIndex = candidates.findIndex(candidate => hasTexture(scene, candidate.key));
  if (candidateIndex < 0) return null;
  return Object.freeze({
    ...candidates[candidateIndex],
    fallback: candidateIndex > 0,
  });
}

export function inspectCelestialActionBarAssets(scene, entries) {
  const missingTextures = [];
  const requiredChrome = [chrome.foundation, chrome.detachedSlot, chrome.tooltip];
  for (const key of new Set(requiredChrome)) {
    if (!hasTexture(scene, key)) missingTextures.push(key);
  }

  const icons = {};
  const fallbackEntryIds = [];
  for (const entry of entries) {
    const descriptor = resolveCelestialActionBarIcon(scene, entry.assetRole);
    icons[entry.id] = descriptor;
    if (!descriptor) missingTextures.push(`role:${entry.assetRole}`);
    if (descriptor?.fallback) fallbackEntryIds.push(entry.id);
  }

  return Object.freeze({
    chrome,
    icons: Object.freeze(icons),
    fallbackEntryIds: Object.freeze(fallbackEntryIds),
    missingTextures: Object.freeze([...new Set(missingTextures)]),
  });
}
