import { createRuntime } from "./runtime-fixture.mjs";
import { FREESOUND_AUDIO_ASSETS } from "../../values/freesoundAudio.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export function createFreesoundFixture({ loaded = true } = {}) {
  const fixture = createRuntime();
  const { scene, system, keys, loads } = fixture;
  scene.sound.sounds = [];
  const add = scene.sound.add;
  scene.sound.add = (key, config) => {
    const sound = add(key, config);
    sound.pan = config.pan || 0;
    sound.setPan = pan => { sound.pan = pan; return sound; };
    scene.sound.sounds.push(sound);
    return sound;
  };
  if (loaded) for (const asset of Object.values(FREESOUND_AUDIO_ASSETS)) keys.add(asset.key);
  const cells = new Map([["8,8", TILE_TYPES.SKY_TILE], ["14,8", TILE_TYPES.SKY_TILE]]);
  const world = { tileSize: 94, inBounds: (x, y) => x >= 0 && y >= 0 && x < 50 && y < 50,
    getTileType: (x, y) => cells.get(`${x},${y}`) ?? TILE_TYPES.AIR,
    getSkyTileIdentity: (x, y) => x + y };
  const context = { scene: "play", biome: "amberDepths", depth: 520, earthquakeState: "idle",
    earthquakePlayerAware: false, hardcoreArmed: true, hardcoreStressBand: "calm", wurmActive: false };
  fixture.frame = { active: true, time: 0, delta: 100, position: { x: 6.5, y: 8.5 }, world,
    context, nearRefuge: false, speaking: false, flying: false, vx: 0, vy: 0 };
  return Object.assign(fixture, { cells, world, context,
    update(overrides = {}, milliseconds = 100) {
      fixture.tick(milliseconds);
      fixture.frame = { ...fixture.frame, ...overrides, time: scene.time.now, delta: milliseconds };
      system.freesoundAudio.update(fixture.frame);
      return system.freesoundAudio.snapshot();
    },
    finishLoads() {
      for (const [key, record] of loads) {
        if (record.cancelled) continue;
        keys.add(key);
        record.callbacks.onReady?.(record.asset);
      }
    },
  });
}
