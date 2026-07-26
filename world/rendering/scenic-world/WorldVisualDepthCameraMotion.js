import { WORLD_VISUAL_DEPTH_CAMERA_MOTION } from
  "../../../values/worldVisualDepthCameraMotion.js";

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export class WorldVisualDepthCameraMotion {
  constructor(
    scene,
    config = WORLD_VISUAL_DEPTH_CAMERA_MOTION,
    enabled = true
  ) {
    this.scene = scene;
    this.config = config;
    this.enabled = enabled;
    this.lastScrollX = null;
    this.lastScrollY = null;
    this.lastTime = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.current = { x: 0, y: 0, mode: "anchored", regionId: null };
  }

  update(time, regions = []) {
    const camera = this.scene.cameras?.main;
    if (!camera) return this.current;

    const scrollX = Number(camera.scrollX) || 0;
    const scrollY = Number(camera.scrollY) || 0;
    const now = Number(time) || 0;
    const resolved = this._resolveProfile(camera, regions);
    if (!this.enabled || !resolved.profile) {
      return this._reset(scrollX, scrollY, now, resolved.regionId);
    }
    if (this.lastScrollX === null || this.lastScrollY === null || this.lastTime === null) {
      this.lastScrollX = scrollX;
      this.lastScrollY = scrollY;
      this.lastTime = now;
      return this._publish(resolved);
    }

    const deltaX = scrollX - this.lastScrollX;
    const deltaY = scrollY - this.lastScrollY;
    const snapDeltaPx = this.config.snapDeltaTiles * this.scene.config.tileSize;
    const frameDeltaMs = clamp(now - this.lastTime, 0, this.config.maxFrameDeltaMs);
    this.lastScrollX = scrollX;
    this.lastScrollY = scrollY;
    this.lastTime = now;

    if (Math.abs(deltaX) > snapDeltaPx || Math.abs(deltaY) > snapDeltaPx) {
      this.offsetX = 0;
      this.offsetY = 0;
      return this._publish(resolved);
    }

    const profile = resolved.profile;
    const settle = Math.exp(-profile.settlePerSecond * frameDeltaMs / 1000);
    this.offsetX = clamp(
      this.offsetX * settle + deltaX * profile.responseX,
      -profile.maxOffsetXPx,
      profile.maxOffsetXPx
    );
    this.offsetY = clamp(
      this.offsetY * settle + deltaY * profile.responseY,
      -profile.maxOffsetYPx,
      profile.maxOffsetYPx
    );
    return this._publish(resolved);
  }

  _resolveProfile(camera, regions) {
    const centerTileY = (
      (Number(camera.scrollY) || 0) + (Number(camera.height) || 0) * 0.5
    ) / this.scene.config.tileSize;
    const region = regions.find(entry => (
      centerTileY >= entry.topTile && centerTileY < entry.bottomTileExclusive
    )) || regions[0] || null;
    return {
      regionId: region?.id || null,
      profile: this.config.profiles[region?.id] || null,
    };
  }

  _reset(scrollX, scrollY, time, regionId = null) {
    this.lastScrollX = scrollX;
    this.lastScrollY = scrollY;
    this.lastTime = time;
    this.offsetX = 0;
    this.offsetY = 0;
    this.current = { x: 0, y: 0, mode: "anchored", regionId };
    return this.current;
  }

  _publish({ profile, regionId }) {
    this.current = {
      x: this.offsetX,
      y: this.offsetY,
      mode: profile?.mode || "anchored",
      regionId,
    };
    return this.current;
  }

  destroy() {
    this._reset(0, 0, 0);
  }
}
