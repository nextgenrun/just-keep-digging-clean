import { GAME_CONFIG } from "./gameConfig.js";
import { isGameplayKeybindActionEnabled } from "./gameplayDevFlags.js";

export const KEYBIND_STORAGE_VERSION = 4;

const KEYBIND_ACTION_DEFINITIONS = Object.freeze([
  { id: "moveLeft", label: "Move / Aim Left", description: "Walk left and aim left.", defaultKey: "A", group: "Gameplay" },
  { id: "moveRight", label: "Move / Aim Right", description: "Walk right and aim right.", defaultKey: "D", group: "Gameplay" },
  { id: "aimUp", label: "Aim Up", description: "Aim mining and abilities upward.", defaultKey: "W", group: "Gameplay" },
  { id: "aimDown", label: "Aim Down", description: "Aim mining and abilities downward.", defaultKey: "S", group: "Gameplay" },
  { id: "fly", label: "Fly", description: "Hold to fly when you have Gem Power.", defaultKey: "SHIFT", group: "Gameplay" },
  { id: "dig", label: "Dig", description: "Mine the aimed tile.", defaultKey: "F", group: "Gameplay" },
  { id: "interact", label: "Interact", description: "Talk, use campfires, boards, pillars, and special tiles.", defaultKey: "E", group: "Gameplay" },
  { id: "arcCoreVehicle", label: "Board / Exit Arc Core", description: "Enter or leave the Arc Core vehicle.", defaultKey: "B", group: "Gameplay" },
  { id: "inventory", label: "Inventory", description: "Open and close the inventory.", defaultKey: "I", group: "Menus" },
  { id: "map", label: "World Map", description: "Open or close the world map.", defaultKey: "M", group: "Menus" },
  { id: "pause", label: "Pause / Resume", description: "Open or close the pause menu. ESC always remains a safety close key.", defaultKey: "ESC", group: "Menus" },
  { id: "muteMusic", label: "Music Toggle", description: "Toggle music on or off.", defaultKey: "U", group: "Audio" },
  { id: "muteSfx", label: "SFX Toggle", description: "Toggle effects and voices on or off.", defaultKey: "N", group: "Audio" },
  { id: "restart", label: "Restart Run", description: "Restart the current run in debug/death flows.", defaultKey: "R", group: "System" },
  { id: "mainMenu", label: "Main Menu", description: "Return to the main menu from pause.", defaultKey: "HOME", group: "System" },
  { id: "quickslash", label: "Quickslash", description: "Use quickslash when unlocked.", defaultKey: "Q", group: "Abilities" },
  { id: "thunderStrike", label: "Thunderstrike", description: "Use thunderstrike when unlocked.", defaultKey: "C", group: "Abilities" },
  { id: "torch", label: "Torch", description: "Toggle or use torch behavior.", defaultKey: "T", group: "Abilities" },
  { id: "fullscreen", label: "Fullscreen", description: "Dedicated browser fullscreen toggle.", defaultKey: "F10", group: "Display", rebindable: false },
  { id: "screenRecord", label: "Screen Recording", description: "Start or stop recording the game canvas.", defaultKey: "F9", group: "Display", devOnly: true },
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
