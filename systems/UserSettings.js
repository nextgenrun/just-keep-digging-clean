import { AUDIO_CONFIG } from "../values/audioConfig.js";
import { KEYBIND_ACTIONS, KEYBIND_ACTION_BY_ID, createDefaultKeybinds } from "../values/keybindActions.js";

const STORAGE_KEY = "jkd-settings-v2";

const DIGIT_KEY_NAMES = Object.freeze({
  "0": "ZERO",
  "1": "ONE",
  "2": "TWO",
  "3": "THREE",
  "4": "FOUR",
  "5": "FIVE",
  "6": "SIX",
  "7": "SEVEN",
  "8": "EIGHT",
  "9": "NINE",
});

const DISPLAY_NAMES = Object.freeze({
  SPACE: "Space",
  ESC: "Esc",
  ENTER: "Enter",
  SHIFT: "Shift",
  CTRL: "Ctrl",
  ALT: "Alt",
  TAB: "Tab",
  HOME: "Home",
  DELETE: "Del",
  BACKSPACE: "Backspace",
  LEFT: "Left",
  RIGHT: "Right",
  UP: "Up",
  DOWN: "Down",
  ZERO: "0",
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  SEVEN: "7",
  EIGHT: "8",
  NINE: "9",
});

const KEY_ALIASES = Object.freeze({
  " ": "SPACE",
  SPACEBAR: "SPACE",
  ESCAPE: "ESC",
  ARROWLEFT: "LEFT",
  ARROWRIGHT: "RIGHT",
  ARROWUP: "UP",
  ARROWDOWN: "DOWN",
  CONTROL: "CTRL",
  META: "CTRL",
});

const DEFAULT_SETTINGS = Object.freeze({
  version: 2,
  audio: {
    masterVolume: AUDIO_CONFIG.masterVolume,
    musicVolume: AUDIO_CONFIG.musicVolume,
    sfxVolume: AUDIO_CONFIG.sfxVolume,
    voiceVolume: AUDIO_CONFIG.voiceVolume,
    musicEnabled: true,
    sfxEnabled: true,
  },
  display: {
    showControlHints: true,
  },
  keybinds: createDefaultKeybinds(),
});

function clamp01(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(1, numeric));
}

function cloneDefaults() {
  return {
    version: DEFAULT_SETTINGS.version,
    audio: { ...DEFAULT_SETTINGS.audio },
    display: { ...DEFAULT_SETTINGS.display },
    keybinds: { ...DEFAULT_SETTINGS.keybinds },
  };
}

function readLocalStorage(key) {
  try {
    return window.localStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Storage can be unavailable in private or embedded contexts.
  }
}

export function normalizeKey(key) {
  if (key == null) return "";
  const raw = String(key).trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (DIGIT_KEY_NAMES[upper]) return DIGIT_KEY_NAMES[upper];
  return KEY_ALIASES[upper] || upper;
}

export function normalizeKeyboardEvent(event) {
  if (!event) return "";
  const code = String(event.code || "").toUpperCase();
  const key = String(event.key || "").toUpperCase();

  if (code === "SPACE") return "SPACE";
  if (code.startsWith("KEY") && code.length === 4) return code.slice(3);
  if (code.startsWith("DIGIT") && code.length === 6) return DIGIT_KEY_NAMES[code.slice(5)] || "";
  if (/^F\d{1,2}$/.test(code)) return code;
  if (code.startsWith("ARROW")) return normalizeKey(code);
  if (code === "SHIFTLEFT" || code === "SHIFTRIGHT") return "SHIFT";
  if (code === "CONTROLLEFT" || code === "CONTROLRIGHT") return "CTRL";
  if (code === "ALTLEFT" || code === "ALTRIGHT") return "ALT";

  return normalizeKey(key);
}

export function formatKey(key) {
  const normalized = normalizeKey(key);
  return DISPLAY_NAMES[normalized] || normalized;
}

export function keyToPhaserKey(key) {
  const normalized = normalizeKey(key);
  if (!normalized) return "";
  const keyCodes = globalThis.Phaser?.Input?.Keyboard?.KeyCodes;
  return keyCodes?.[normalized] ?? normalized;
}

function sanitizeSettings(input) {
  const defaults = cloneDefaults();
  const candidate = input && typeof input === "object" ? input : {};
  const audio = candidate.audio && typeof candidate.audio === "object" ? candidate.audio : {};
  const display = candidate.display && typeof candidate.display === "object" ? candidate.display : {};
  const keybinds = candidate.keybinds && typeof candidate.keybinds === "object" ? candidate.keybinds : {};

  const sanitized = {
    version: DEFAULT_SETTINGS.version,
    audio: {
      masterVolume: clamp01(audio.masterVolume, defaults.audio.masterVolume),
      musicVolume: clamp01(audio.musicVolume, defaults.audio.musicVolume),
      sfxVolume: clamp01(audio.sfxVolume, defaults.audio.sfxVolume),
      voiceVolume: clamp01(audio.voiceVolume, defaults.audio.voiceVolume),
      musicEnabled: audio.musicEnabled !== false,
      sfxEnabled: audio.sfxEnabled !== false,
    },
    display: {
      showControlHints: display.showControlHints !== false,
    },
    keybinds: { ...defaults.keybinds },
  };

  for (const action of KEYBIND_ACTIONS) {
    const next = normalizeKey(keybinds[action.id] || action.defaultKey);
    sanitized.keybinds[action.id] = next || action.defaultKey;
  }

  return sanitized;
}

class UserSettingsStore {
  constructor() {
    this._settings = null;
    this._listeners = new Set();
  }

  load() {
    if (this._settings) return this._settings;
    let parsed = null;
    const raw = readLocalStorage(STORAGE_KEY);
    if (raw) {
      try {
        parsed = JSON.parse(raw);
      } catch (_) {
        parsed = null;
      }
    }

    const settings = sanitizeSettings(parsed);
    const oldMusic = readLocalStorage("jkd-settings-music");
    const oldSfx = readLocalStorage("jkd-settings-sfx");
    if (!parsed) {
      if (oldMusic != null) settings.audio.musicEnabled = oldMusic !== "0";
      if (oldSfx != null) settings.audio.sfxEnabled = oldSfx !== "0";
    }

    this._settings = settings;
    this.save(false);
    return this._settings;
  }

  save(notify = true) {
    writeLocalStorage(STORAGE_KEY, JSON.stringify(this.load()));
    if (notify) this._emit();
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _emit() {
    const snapshot = this.load();
    this._listeners.forEach(listener => {
      try {
        listener(snapshot);
      } catch (_) {}
    });
  }

  getSettings() {
    return this.load();
  }

  getAudio() {
    return this.load().audio;
  }

  getDisplay() {
    return this.load().display;
  }

  getKeybinds() {
    return this.load().keybinds;
  }

  getKey(actionId) {
    const action = KEYBIND_ACTION_BY_ID[actionId];
    return this.getKeybinds()[actionId] || action?.defaultKey || "";
  }

  getKeyLabel(actionId) {
    return formatKey(this.getKey(actionId));
  }

  updateAudio(partial) {
    const audio = this.load().audio;
    if (Object.prototype.hasOwnProperty.call(partial, "masterVolume")) {
      audio.masterVolume = clamp01(partial.masterVolume, audio.masterVolume);
    }
    if (Object.prototype.hasOwnProperty.call(partial, "musicVolume")) {
      audio.musicVolume = clamp01(partial.musicVolume, audio.musicVolume);
    }
    if (Object.prototype.hasOwnProperty.call(partial, "sfxVolume")) {
      audio.sfxVolume = clamp01(partial.sfxVolume, audio.sfxVolume);
    }
    if (Object.prototype.hasOwnProperty.call(partial, "voiceVolume")) {
      audio.voiceVolume = clamp01(partial.voiceVolume, audio.voiceVolume);
    }
    if (Object.prototype.hasOwnProperty.call(partial, "musicEnabled")) {
      audio.musicEnabled = Boolean(partial.musicEnabled);
    }
    if (Object.prototype.hasOwnProperty.call(partial, "sfxEnabled")) {
      audio.sfxEnabled = Boolean(partial.sfxEnabled);
    }
    this.save();
  }

  updateDisplay(partial) {
    const display = this.load().display;
    if (Object.prototype.hasOwnProperty.call(partial, "showControlHints")) {
      display.showControlHints = Boolean(partial.showControlHints);
    }
    this.save();
  }

  setKeybind(actionId, key) {
    const action = KEYBIND_ACTION_BY_ID[actionId];
    if (!action) return { ok: false, error: "Unknown action." };
    const normalized = normalizeKey(key);
    if (!normalized) return { ok: false, error: "That key cannot be used." };

    const existing = Object.entries(this.getKeybinds())
      .find(([otherActionId, otherKey]) => otherActionId !== actionId && normalizeKey(otherKey) === normalized);
    if (existing) {
      const existingAction = KEYBIND_ACTION_BY_ID[existing[0]];
      return {
        ok: false,
        error: `${formatKey(normalized)} is already used by ${existingAction?.label || existing[0]}.`,
      };
    }

    this.load().keybinds[actionId] = normalized;
    this.save();
    return { ok: true };
  }

  resetKeybinds() {
    this.load().keybinds = createDefaultKeybinds();
    this.save();
  }

  resetAll() {
    this._settings = cloneDefaults();
    this.save();
  }

  applyAudioTo(soundSystem) {
    if (!soundSystem) return;
    soundSystem.applySettings?.(this.getAudio());
  }
}

export const USER_SETTINGS = new UserSettingsStore();
