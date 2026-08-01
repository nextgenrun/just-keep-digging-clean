import assert from "node:assert/strict";

class FakeKey {
  constructor() {
    this.justDown = false;
  }

  press() {
    this.justDown = true;
  }

  on() {
    return this;
  }

  off() {
    return this;
  }
}

globalThis.Phaser = {
  Input: {
    Keyboard: {
      JustDown(key) {
        if (!key?.justDown) return false;
        key.justDown = false;
        return true;
      },
    },
  },
  Scenes: {
    Events: {
      SHUTDOWN: "shutdown",
    },
  },
};

const { GameInputHandler } = await import(
  "../world/playScene/GameInputHandler.js"
);

const muteMusic = new FakeKey();
const muteSfx = new FakeKey();
const keys = {
  hardEscape: new FakeKey(),
  shift: { isDown: false },
  muteMusic,
  muteSfx,
};
const synced = {
  music: [],
  sfx: [],
};
const soundSystem = {
  musicEnabled: true,
  sfxEnabled: true,
  applySettings(audio) {
    this.musicEnabled = audio.musicEnabled;
    this.sfxEnabled = audio.sfxEnabled;
  },
};
const scene = {
  events: {
    once() {},
    off() {},
  },
  soundSystem,
  uiMuteToggle: {
    syncMusicState(enabled) {
      synced.music.push(enabled);
    },
    syncSfxState(enabled) {
      synced.sfx.push(enabled);
    },
  },
};
const inputHandler = {
  getKeys: () => keys,
};
const handler = new GameInputHandler(scene, inputHandler, {});

muteMusic.press();
assert.doesNotThrow(
  () => handler.handleGlobalInput(),
  "music keybind must not call the removed UIMuteToggle.showToast API",
);
assert.equal(soundSystem.musicEnabled, false);
assert.deepEqual(synced.music, [false]);

muteSfx.press();
assert.doesNotThrow(
  () => handler.handleGlobalInput(),
  "SFX keybind must not call the removed UIMuteToggle.showToast API",
);
assert.equal(soundSystem.sfxEnabled, false);
assert.deepEqual(synced.sfx, [false]);

handler.destroy();

console.log("Game input audio toggle contract passed.");
