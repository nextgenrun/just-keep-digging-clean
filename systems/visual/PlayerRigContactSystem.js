import { PLAYER_RIG_CONTACT_CONFIG } from "../../values/playerRigContact.js";
import {
  buildAttackContactBox,
  buildTargetFaceBands,
  projectRigMarkerToWorld,
  rectanglesIntersect,
  resolveTileFaceAlignmentOffset,
} from "./playerRigContactGeometry.js";

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function normalizeDirection(direction) {
  const x = Math.sign(Number.isFinite(direction?.x) ? direction.x : 0);
  const y = Math.sign(Number.isFinite(direction?.y) ? direction.y : 0);
  return x === 0 && y === 0 ? null : { x, y };
}

export class PlayerRigContactSystem {
  constructor(
    scene,
    player,
    controller,
    profile,
    manifest = null,
    config = PLAYER_RIG_CONTACT_CONFIG,
  ) {
    this.scene = scene;
    this.player = player;
    this.controller = controller;
    this.profile = profile;
    this.config = config;
    this.manifest = manifest;
    this.enabled = config.enabled === true && profile?.isUalNative === true;
    this.metadataReady = false;
    this._activeAction = null;
    this._releasing = false;
  }

  create() {
    if (!this.enabled) return false;
    this.manifest = this.manifest
      || this.scene?.cache?.json?.get?.(this.profile.rigManifestKey)
      || null;
    const schema = this.manifest?.rig_marker_schema;
    this.metadataReady = Boolean(
      this.manifest?.actions
      && schema?.version === this.config.manifest.schemaVersion
      && schema?.space === this.config.manifest.markerSpace,
    );
    return this.metadataReady;
  }

  beginAction({ animationKey, contactSpec, targetTile, direction } = {}) {
    this.endAction();
    const normalizedDirection = normalizeDirection(direction);
    if (!this.enabled || !animationKey || !contactSpec || !targetTile || !normalizedDirection) return false;
    this._releasing = false;
    this._activeAction = {
      animationKey,
      contactSpec,
      targetTile: { tx: targetTile.tx, ty: targetTile.ty },
      direction: normalizedDirection,
    };
    this.update(this.config.alignment.bootstrapDeltaMs);
    return Boolean(this._resolveDirectionalMarker(normalizedDirection));
  }

  update(deltaMs = 0) {
    if (!this.config.alignment.enabled) return false;
    if (!this._activeAction) return this._updateRelease(deltaMs);
    const selection = this._resolveDirectionalMarker(this._activeAction.direction);
    const tileSize = this.scene?.config?.tileSize;
    if (!selection || !(tileSize > 0)) return false;
    const currentOffset = this._readVisualOffset();
    const targetOffset = resolveTileFaceAlignmentOffset({
      markerWorld: selection.world,
      targetTile: this._activeAction.targetTile,
      direction: this._activeAction.direction,
      tileSize,
      currentOffset,
      config: this.config,
    });
    const dt = clamp(Number(deltaMs) || 0, 0, this.config.alignment.maxDeltaMs) / 1000;
    const blend = this._activeAction.contactSpec.visualAlignmentMode === "immediate"
      ? 1
      : 1 - Math.exp(-this.config.alignment.responsePerSecond * dt);
    this._setVisualOffset({
      x: currentOffset.x + (targetOffset.x - currentOffset.x) * blend,
      y: currentOffset.y + (targetOffset.y - currentOffset.y) * blend,
    });
    return true;
  }

  validateContact({ targetTile, direction } = {}) {
    if (!this.enabled || !this.metadataReady) {
      return { valid: this.config.manifest.failOpenWhenMetadataMissing, reason: "rig-metadata-unavailable" };
    }
    const active = this._activeAction;
    const normalizedDirection = normalizeDirection(direction || active?.direction);
    if (!active || !targetTile || !normalizedDirection) return { valid: false, reason: "no-active-contact" };
    if (active.targetTile.tx !== targetTile.tx || active.targetTile.ty !== targetTile.ty) {
      return { valid: false, reason: "target-changed" };
    }
    const selection = this._resolveDirectionalMarker(normalizedDirection);
    const tileSize = this.scene?.config?.tileSize;
    if (!selection || !(tileSize > 0)) {
      return { valid: this.config.manifest.failOpenWhenMetadataMissing, reason: "contact-marker-missing" };
    }
    const attackHitbox = buildAttackContactBox(selection.world, normalizedDirection, tileSize, this.config);
    const faceBands = buildTargetFaceBands(targetTile, normalizedDirection, tileSize, this.config);
    const intersections = faceBands.map((band) => rectanglesIntersect(attackHitbox, band));
    const diagonal = normalizedDirection.x !== 0 && normalizedDirection.y !== 0;
    const valid = diagonal && this.config.hitbox.diagonalRequiresBothFaces
      ? intersections.length === 2 && intersections.every(Boolean)
      : intersections.some(Boolean);
    return {
      valid,
      reason: valid ? "marker-hit" : "marker-missed-tile-face",
      markerName: selection.name,
      markerWorld: selection.world,
      attackHitbox,
      faceBands,
    };
  }

  endAction({ immediate = false } = {}) {
    const hadAction = this._activeAction !== null;
    this._activeAction = null;
    const offset = this._readVisualOffset();
    this._releasing = !immediate && (
      Math.abs(offset.x) > this.config.alignment.releaseEpsilonPx
      || Math.abs(offset.y) > this.config.alignment.releaseEpsilonPx
    );
    if (!this._releasing) this._setVisualOffset({ x: 0, y: 0 });
    return hadAction;
  }

  destroy() {
    this.endAction({ immediate: true });
    this.enabled = false;
    this.metadataReady = false;
    this.manifest = null;
    this.player = null;
    this.controller = null;
  }

  _updateRelease(deltaMs) {
    if (!this._releasing) return false;
    const currentOffset = this._readVisualOffset();
    const dt = clamp(Number(deltaMs) || 0, 0, this.config.alignment.maxDeltaMs) / 1000;
    const blend = 1 - Math.exp(-this.config.alignment.releaseResponsePerSecond * dt);
    const nextOffset = {
      x: currentOffset.x * (1 - blend),
      y: currentOffset.y * (1 - blend),
    };
    const epsilon = this.config.alignment.releaseEpsilonPx;
    if (Math.abs(nextOffset.x) <= epsilon && Math.abs(nextOffset.y) <= epsilon) {
      this._releasing = false;
      this._setVisualOffset({ x: 0, y: 0 });
      return true;
    }
    this._setVisualOffset(nextOffset);
    return true;
  }

  _frameMarkers() {
    const spec = this._activeAction?.contactSpec;
    return this.manifest?.actions?.[spec?.sourceAction]?.rig_markers?.frames?.[String(spec?.textureFrame)] || null;
  }

  _resolveDirectionalMarker(direction) {
    const markers = this._frameMarkers();
    if (!markers) return null;
    const groupName = this._activeAction.contactSpec.markerGroup
      || (direction.y > 0
        ? this.config.directionMarkerGroups.downward
        : this.config.directionMarkerGroups.default);
    const markerNames = this.config.markerGroups[groupName] || [];
    let best = null;
    for (const name of markerNames) {
      const world = this._projectMarker(markers[name]);
      if (!world) continue;
      const score = direction.x * world.x + direction.y * world.y;
      if (!best || score > best.score) best = { name, world, score };
    }
    if (best) return best;
    const contactWorld = this._projectMarker(markers.contact);
    return contactWorld ? { name: "contact", world: contactWorld, score: 0 } : null;
  }

  _projectMarker(marker) {
    const frameWidth = this.profile.frameWidth;
    const frameHeight = this.profile.frameHeight;
    const fallbackScaleX = (this.profile.displaySizePx || frameWidth) / frameWidth;
    const fallbackScaleY = (this.profile.displaySizePx || frameHeight) / frameHeight;
    return projectRigMarkerToWorld({
      marker,
      spriteX: this.player?.x,
      spriteY: this.player?.y,
      scaleX: Number.isFinite(this.player?.scaleX) ? Math.abs(this.player.scaleX) : fallbackScaleX,
      scaleY: Number.isFinite(this.player?.scaleY) ? Math.abs(this.player.scaleY) : fallbackScaleY,
      frameWidth,
      frameHeight,
      originX: this.player?.originX ?? this.profile.visualOriginX,
      originY: this.player?.originY ?? this.profile.visualOriginY,
      flipX: this.player?.flipX === true,
    });
  }

  _readVisualOffset() {
    const value = this.player?.getData?.(this.config.visualOffsetDataKey);
    return {
      x: Number.isFinite(value?.x) ? value.x : 0,
      y: Number.isFinite(value?.y) ? value.y : 0,
    };
  }

  _setVisualOffset(offset) {
    if (!this.player?.setData) return;
    const epsilon = this.config.alignment.releaseEpsilonPx;
    const value = Math.abs(offset.x) > epsilon || Math.abs(offset.y) > epsilon
      ? { x: offset.x, y: offset.y }
      : null;
    this.player.setData(this.config.visualOffsetDataKey, value);
    this.controller?._syncSpriteWithPhysics?.();
  }
}
