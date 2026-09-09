import { EventEmitter } from "node:events";

export function evolutionScene() {
  const scene = { time: { now: 0 }, pending: [], images: [], releases: [], pins: new Set(),
    locks: [], saves: [], shakes: [], scale: Object.assign(new EventEmitter(), { width: 1280, height: 720 }),
    input: { keyboard: new EventEmitter() }, textures: { exists: () => true } };
  class ObjectView extends EventEmitter {
    constructor(x = 0, y = 0, key = "", frame = "__BASE") {
      super();
      Object.assign(this, { x, y, active: true, visible: true, alpha: 1, scaleX: 1,
        scaleY: 1, width: 256, height: 256, children: [] });
      this.setTexture(key, frame);
    }
    setTexture(key, name = "__BASE") { this.texture = { key }; this.frame = { name }; return this; }
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height;
      this.scaleX = width / this.width; this.scaleY = height / this.height; return this; }
    setOrigin(x, y = x) { this.originX = x; this.originY = y; return this; }
    setPosition(x, y) { this.x = x; this.y = y; return this; }
    setScale(x, y = x) { this.scaleX = x; this.scaleY = y; return this; }
    setAlpha(alpha) { this.alpha = alpha; return this; }
    setDepth(depth) { this.depth = depth; return this; }
    setVisible(visible) { this.visible = visible; return this; }
    setScrollFactor() { return this; }
    setTintFill() { return this; }
    setBlendMode() { return this; }
    setInteractive() { return this; }
    setText(text) { this.text = String(text); return this; }
    add(children) { this.children.push(...[children].flat()); return this; }
    destroy(recursive) { this.active = false; this.destroyed = true;
      if (recursive) this.children.forEach(child => child.destroy()); }
  }
  const add = (x, y, key, frame) => {
    const view = new ObjectView(x, y, key, frame); scene.images.push(view); return view;
  };
  scene.add = { image: add, container: add, text: (x, y, text) => add(x, y).setText(text),
    zone: (x, y, width, height) => Object.assign(add(x, y), { width, height }) };
  const schedule = (delay, callback, targets = []) => {
    const event = { at: scene.time.now + delay, callback, targets, removed: false,
      remove() { this.removed = true; } };
    scene.pending.push(event); return event;
  };
  scene.time.delayedCall = schedule;
  scene.tweens = {
    killTweensOf(targets) { for (const event of scene.pending)
      if (event.targets.some(target => [targets].flat().includes(target))) event.remove(); },
    add(config) {
      const targets = [config.targets].flat();
      const originals = targets.map(target => ({ alpha: target.alpha, scaleX: target.scaleX,
        scaleY: target.scaleY, x: target.x, y: target.y }));
      return schedule((config.delay || 0) + config.duration, () => {
        targets.forEach((target, index) => {
          for (const key of ["alpha", "scaleX", "scaleY", "x", "y"])
            if (typeof config[key] === "number") target[key] = config[key];
          if (config.yoyo) Object.assign(target, originals[index]);
        });
        config.onComplete?.();
      }, targets);
    },
  };
  scene.advance = milliseconds => {
    const end = scene.time.now + milliseconds;
    for (;;) {
      const next = scene.pending.filter(event => !event.removed && event.at <= end)
        .sort((a, b) => a.at - b.at)[0];
      if (!next) break;
      next.removed = true; scene.time.now = next.at; next.callback();
    }
    scene.time.now = end;
  };
  scene.runtimeFeatureAssetManager = { enabled: true,
    ensureGroup(group, { consumer }) { scene.pins.add(`${group}:${consumer}`); return Promise.resolve({ ready: true }); },
    releaseGroup(group, consumer) { scene.pins.delete(`${group}:${consumer}`); scene.releases.push({ group, consumer }); } };
  scene.setShopOpen = open => scene.locks.push(open);
  scene.uiNotifications = { setPaused() {} };
  scene.queueDugTilesSave = reason => scene.saves.push(reason);
  scene.shakeSystem = { shake: kind => scene.shakes.push(kind) };
  return scene;
}
