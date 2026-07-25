export const PLAYER_CHARACTER_IDS = Object.freeze({
  ualNative: "ualNative",
  survivalUal: "survivalUal",
  legacy: "legacy",
  robot: "robot",
  drillHead: "drillHead",
});

export const DEFAULT_PLAYER_CHARACTER_ID = PLAYER_CHARACTER_IDS.survivalUal;
export const PLAYER_CHARACTER_QUERY_PARAM = "character";

const SELECTABLE_PLAYER_CHARACTER_IDS = new Set([
  PLAYER_CHARACTER_IDS.ualNative,
  PLAYER_CHARACTER_IDS.survivalUal,
  PLAYER_CHARACTER_IDS.robot,
  PLAYER_CHARACTER_IDS.drillHead,
  PLAYER_CHARACTER_IDS.legacy,
]);

export function normalizePlayerCharacterId(value) {
  if (
    value === PLAYER_CHARACTER_IDS.robot
    || value === PLAYER_CHARACTER_IDS.drillHead
    || value === PLAYER_CHARACTER_IDS.survivalUal
  ) {
    return value;
  }
  if (value === PLAYER_CHARACTER_IDS.ualNative || value === PLAYER_CHARACTER_IDS.legacy) {
    return PLAYER_CHARACTER_IDS.ualNative;
  }
  return DEFAULT_PLAYER_CHARACTER_ID;
}

export function resolvePersistedPlayerCharacterId(value) {
  if (value === null || value === undefined) return null;
  if (value === PLAYER_CHARACTER_IDS.ualNative || value === PLAYER_CHARACTER_IDS.legacy) {
    return DEFAULT_PLAYER_CHARACTER_ID;
  }
  return normalizePlayerCharacterId(value);
}

export function resolvePlayerCharacterIdFromSearch(search = "") {
  try {
    const value = new URLSearchParams(search).get(PLAYER_CHARACTER_QUERY_PARAM);
    return SELECTABLE_PLAYER_CHARACTER_IDS.has(value)
      ? normalizePlayerCharacterId(value)
      : null;
  } catch {
    return null;
  }
}
