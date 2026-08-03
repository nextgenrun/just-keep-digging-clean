// Resolves actionbar-owned eager aliases and approved shared engine textures.

import { ASSET_KEYS } from "../../values/assetKeys.js";
import { CELESTIAL_ACTION_BAR_ASSET_KEYS } from "../../values/celestialActionBar.js";

const chrome = Object.freeze({
  foundation: CELESTIAL_ACTION_BAR_ASSET_KEYS.foundation,
  tooltip: ASSET_KEYS.ui.approvedHud.notification,
  lock: CELESTIAL_ACTION_BAR_ASSET_KEYS.lock,
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
    Object.freeze({ key: ASSET_KEYS.celestialEngines.waywardStar }),
  ]),
  hollowSun: Object.freeze([
    Object.freeze({ key: ASSET_KEYS.celestialEngines.hollowSun }),
  ]),
  cometEngine: Object.freeze([
    Object.freeze({ key: ASSET_KEYS.celestialEngines.cometEngine }),
  ]),
});

function hasTexture(scene, key) {
  return Boolean(key && scene?.textures?.exists?.(key));
}

export function getCelestialActionBarChrome() {
  return chrome;
}

export function resolveCelestialActionBarIcon(scene, assetRole) {
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
  const requiredChrome = [chrome.foundation, chrome.tooltip, chrome.lock];
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
    lockAvailable: hasTexture(scene, chrome.lock),
    fallbackEntryIds: Object.freeze(fallbackEntryIds),
    missingTextures: Object.freeze([...new Set(missingTextures)]),
  });
}
