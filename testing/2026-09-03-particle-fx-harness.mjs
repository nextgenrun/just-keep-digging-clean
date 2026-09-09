import { EventEmitter } from "node:events";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as PROFILE } from "../values/survivalUalPlayerAssetProfile.js";
import { TILE_DESTRUCTION_FX_CONFIG as ATLAS } from "../values/tileDestructionFx.js";
import { TILE_TYPES } from "../values/tileTypes.js";

/** Small Phaser-shaped harness with real frame dimensions and cancellable ownership. */
export function particleHarness({ search = "", reducedMotion = false, tileType = TILE_TYPES.DIRT } = {}) {
  globalThis.location = { search };
  globalThis.matchMedia = () => ({ matches: reducedMotion });
  globalThis.Phaser = { Animations: { Events: { ANIMATION_UPDATE: "animationupdate" } } };
  const images = [], tweens = [], timers = [], queries = [], events = new EventEmitter();
  const textures = new Map(Object.values(ATLAS.assets).map(asset => [asset.key, {
    frames: new Map(), has(name) { return this.frames.has(name); },
    add(name, _source, x, y, w, h) { this.frames.set(name, { x, y, w, h }); },
  }]));
  const body = { x: 154.5, y: 113, w: 31, h: 75, vx: 200, vy: 0 };
  let grounded = true;
  const player = Object.assign(new EventEmitter(), {
    x: 170, y: 188, scaleX: 101 / 256, scaleY: 101 / 256,
    originX: 0.5, originY: 0.890625, flipX: false, depth: 30,
    texture: { key: PROFILE.walkRunSheet }, frame: { realWidth: 256, realHeight: 256, name: 0 },
  });
  const controller = { physicsBody: body, isGrounded: () => grounded,
    getMotionState: () => body.vx < 0 ? "walk-left" : "walk-right", getEffectiveWalkSpeed: () => 200 };
  const world = { getTileType(tx, ty) { queries.push({ tx, ty }); return ty === 2 ? tileType : TILE_TYPES.AIR; },
    isSolid: (_tx, ty) => ty === 2 };
  const scene = { config: { tileSize: 94 }, events, player,
    textures: { exists: key => textures.has(key), get: key => textures.get(key) },
    add: { image(x, y, key, frame) {
      const stored = textures.get(key)?.frames.get(frame);
      const asset = key === ATLAS.assets.core.key ? ATLAS.assets.core : ATLAS.assets.shards;
      const width = stored?.w ?? asset.frameWidth, height = stored?.h ?? asset.frameHeight;
      const image = { x, y, key, frame, width, height, rotation: 0, active: true, scaleX: 1, scaleY: 1,
        setDisplaySize(w, h) { this.displayWidth = w; this.displayHeight = h; this.scaleX = w / width; this.scaleY = h / height; return this; },
        setOrigin(x, y = x) { this.origin = [x, y]; return this; },
        setDepth(value) { this.depth = value; return this; },
        setTint(value) { this.tint = value; return this; },
        setAlpha(value) { this.alpha = value; return this; },
        setFlipX(value) { this.flipX = value; return this; },
        setRotation(value) { this.rotation = value; return this; },
        setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; },
        setFrame(value) { this.frame = value; return this; }, destroy() { this.active = false; },
      }; images.push(image); return image;
    } },
    tweens: { add(config) { const tween = { config, active: true,
      stop() { this.active = false; }, remove() { this.active = false; } }; tweens.push(tween); return tween; },
      killTweensOf(target) { for (const tween of tweens) if (tween.config.targets === target) tween.stop(); } },
    time: { delayedCall(delay, callback) { const timer = { delay, callback, active: true,
      remove() { this.active = false; } }; timers.push(timer); return timer; } },
  };
  function finishTween(tween) {
    if (!tween.active) return;
    tween.active = false;
    for (const name of ["x", "y", "scaleX", "scaleY", "alpha", "rotation"]) {
      if (Number.isFinite(tween.config[name])) tween.config.targets[name] = tween.config[name];
    }
    tween.config.onComplete?.();
  }
  function fireTimers(until = Infinity) {
    for (const timer of [...timers].sort((a, b) => a.delay - b.delay)) {
      if (timer.active && timer.delay <= until) { timer.active = false; timer.callback(); }
    }
  }
  const emitFoot = (frame, animationKey = PROFILE.walkRunAnim) => player.emit("animationupdate",
    { key: animationKey }, { index: frame + 1, textureFrame: frame, textureKey: player.texture.key });
  return { scene, player, body, controller, world, images, tweens, timers, queries, events, textures,
    profile: PROFILE, emitFoot, fireTimers, finishTween, setGrounded: value => { grounded = value; } };
}
