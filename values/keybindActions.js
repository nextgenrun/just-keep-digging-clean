import { GAME_CONFIG } from "./gameConfig.js";
import { isGameplayKeybindActionEnabled } from "./gameplayDevFlags.js";

export const KEYBIND_STORAGE_VERSION = 6;

export const GAMEPLAY_DEV_INPUT = Object.freeze({
  godModeKey: "V",
});

export const GAMEPLAY_INPUT_TIMING = Object.freeze({
  // Keeps a visible special-tile E tap alive across one severely delayed frame.
  specialTileInteractBufferMs: 1600,
});

const KEYBIND_ACTION_DEFINITIONS = Object.freeze([
  { id: "moveLeft", label: "Move / Aim Left", description: "Walk left and aim left.", defaultKey: "A", group: "Gameplay" },
  { id: "moveRight", label: "Move / Aim Right", description: "Walk right and aim right.", defaultKey: "D", group: "Gameplay" },
  { id: "aimUp", label: "Aim Up / Climb", description: "Aim upward, or climb while using Flight.", defaultKey: "W", group: "Gameplay" },
  { id: "aimDown", label: "Aim Down / Dive", description: "Aim downward, or dive while using Flight.", defaultKey: "S", group: "Gameplay" },
  { id: "jump", label: "Jump", description: "Jump over low ledges and hazards.", defaultKey: "SPACE", group: "Gameplay" },
  { id: "fly", label: "Flight", description: "Hold to use Flight. Steer with the movement keys while you have GP.", defaultKey: "SHIFT", group: "Gameplay" },
  { id: "run", label: "Run", description: "Hold while moving left or right to run at the cost of GP.", defaultKey: "CTRL", group: "Gameplay" },
  { id: "dig", label: "Dig", description: "Mine the aimed tile.", defaultKey: "F", group: "Gameplay" },
  { id: "interact", label: "Interact", description: "Talk, use campfires, boards, pillars, and special tiles.", defaultKey: "E", group: "Gameplay" },
  { id: "arcCoreVehicle", label: "Board / Exit Arc Core", description: "Enter or leave the Arc Core vehicle.", defaultKey: "B", group: "Gameplay" },
  { id: "inventory", label: "Inventory", description: "Open and close the inventory.", defaultKey: "I", group: "Menus" },
  { id: "map", label: "World Map", description: "Open or close the world map.", defaultKey: "M", group: "Menus" },
  { id: "pause", label: "Pause / Resume", description: "Open or close the pause menu. Esc also closes open menus.", defaultKey: "ESC", group: "Menus" },
  { id: "muteMusic", label: "Music On / Off", description: "Turn music on or off.", defaultKey: "U", group: "Audio" },
  { id: "muteSfx", label: "Sound On / Off", description: "Turn effects and voices on or off.", defaultKey: "N", group: "Audio" },
  { id: "restart", label: "Restart Run", description: "Restart after a run ends.", defaultKey: "R", group: "System" },
  { id: "mainMenu", label: "Main Menu", description: "Return to the main menu from pause.", defaultKey: "HOME", group: "System" },
  { id: "quickslash", label: "Quickslash", description: "Use Quickslash after you unlock it.", defaultKey: "Q", group: "Abilities" },
  { id: "thunderStrike", label: "Thunderstrike", description: "Use Thunderstrike after you unlock it.", defaultKey: "V", group: "Abilities" },
  { id: "torch", label: "Torch", description: "Turn your torch on or off.", defaultKey: "T", group: "Abilities" },
  { id: "fullscreen", label: "Fullscreen", description: "Enter or leave fullscreen.", defaultKey: "F10", group: "Display", rebindable: false },
  { id: "screenRecord", label: "Screen Recording", description: "Start or stop recording the game canvas.", defaultKey: "F9", group: "Display" },
]);

export const KEYBIND_ACTIONS = Object.freeze(
  KEYBIND_ACTION_DEFINITIONS.filter(action => (
    isGameplayKeybindActionEnabled(action.id)
    && (!action.devOnly || GAME_CONFIG.debugMode)
  ))
);

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
