export const KEYBIND_STORAGE_VERSION = 1;

export const KEYBIND_ACTIONS = Object.freeze([
  { id: "moveLeft", label: "Move / Aim Left", description: "Walk left and aim left.", defaultKey: "A", group: "Gameplay" },
  { id: "moveRight", label: "Move / Aim Right", description: "Walk right and aim right.", defaultKey: "D", group: "Gameplay" },
  { id: "aimUp", label: "Aim Up", description: "Aim mining and abilities upward.", defaultKey: "W", group: "Gameplay" },
  { id: "aimDown", label: "Aim Down", description: "Aim mining and abilities downward.", defaultKey: "S", group: "Gameplay" },
  { id: "dig", label: "Dig", description: "Mine the aimed tile.", defaultKey: "F", group: "Gameplay" },
  { id: "interact", label: "Interact", description: "Talk, use campfires, boards, pillars, and special tiles.", defaultKey: "E", group: "Gameplay" },
  { id: "inventory", label: "Inventory", description: "Open and close the inventory.", defaultKey: "I", group: "Menus" },
  { id: "pause", label: "Pause / Resume", description: "Open or close the pause menu. ESC always remains a safety close key.", defaultKey: "ESC", group: "Menus" },
  { id: "muteMusic", label: "Music Toggle", description: "Toggle music on or off.", defaultKey: "M", group: "Audio" },
  { id: "muteSfx", label: "SFX Toggle", description: "Toggle effects and voices on or off.", defaultKey: "N", group: "Audio" },
  { id: "restart", label: "Restart Run", description: "Restart the current run in debug/death flows.", defaultKey: "R", group: "System" },
  { id: "mainMenu", label: "Main Menu", description: "Return to the main menu from pause.", defaultKey: "HOME", group: "System" },
  { id: "gemVision", label: "Gem Vision", description: "Use gem vision when unlocked.", defaultKey: "Z", group: "Abilities" },
  { id: "quickslash", label: "Quickslash", description: "Use quickslash when unlocked.", defaultKey: "Q", group: "Abilities" },
  { id: "thunderStrike", label: "Thunderstrike", description: "Use thunderstrike when unlocked.", defaultKey: "C", group: "Abilities" },
  { id: "torch", label: "Torch", description: "Toggle or use torch behavior.", defaultKey: "T", group: "Abilities" },
  { id: "fullscreen", label: "Fullscreen", description: "Toggle browser fullscreen.", defaultKey: "F11", group: "Display" },
]);

export const KEYBIND_ACTION_BY_ID = Object.freeze(
  KEYBIND_ACTIONS.reduce((map, action) => {
    map[action.id] = action;
    return map;
  }, {})
);

export function createDefaultKeybinds() {
  return KEYBIND_ACTIONS.reduce((map, action) => {
    map[action.id] = action.defaultKey;
    return map;
  }, {});
}
