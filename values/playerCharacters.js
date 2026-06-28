export const PLAYER_CHARACTER_IDS = Object.freeze({
  legacy: "legacy",
  robot: "robot",
});

export const DEFAULT_PLAYER_CHARACTER_ID = PLAYER_CHARACTER_IDS.robot;

export const PLAYER_CHARACTER_OPTIONS = Object.freeze([
  {
    id: PLAYER_CHARACTER_IDS.legacy,
    label: "Legacy",
    title: "LEGACY MINER",
    description: "Original miner animation set.",
    accent: 0x6ecf87,
  },
  {
    id: PLAYER_CHARACTER_IDS.robot,
    label: "Robot",
    title: "BOX ROBOT",
    description: "Simple anchored robot animation set.",
    accent: 0xd8a7ff,
  },
]);

const PLAYER_CHARACTER_ID_SET = new Set(PLAYER_CHARACTER_OPTIONS.map(option => option.id));

export function normalizePlayerCharacterId(value) {
  return PLAYER_CHARACTER_ID_SET.has(value) ? value : DEFAULT_PLAYER_CHARACTER_ID;
}

export function getPlayerCharacterProfile(value) {
  const id = normalizePlayerCharacterId(value);
  return PLAYER_CHARACTER_OPTIONS.find(option => option.id === id) || PLAYER_CHARACTER_OPTIONS[0];
}
