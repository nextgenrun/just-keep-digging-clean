import { PLAYER_RIG_CONTACT_CONFIG } from "../../../values/playerRigContact.js";
import { resolvePlayerDisplaySizePx } from "../../../values/playerAssetProfiles.js";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE as PROFILE } from "../../../values/ualNativePlayerAssetProfile.js";
import { resolveUalActionContact } from "../../../values/ualNativeActionTuning.js";
import {
  buildAttackContactBox,
  buildTargetFaceBands,
  rectanglesIntersect,
  resolveTileFaceAlignmentOffset,
} from "../../../systems/visual/playerRigContactGeometry.js";
import { LAB_VIEW } from "./labConfig.js";
import { POSE_DEFAULT, resolveContact, resolvePose } from "./labEditorPatch.js";
import { drawEditorOverlay } from "./labEditorOverlay.js";
import {
  bodyRect,
  createFrameGeometry,
  editableContactRect,
  flipForSnapshot,
  frameBounds,
  projectMarkers,
  resizeCanvas,
  targetGeometry,
} from "./labStageGeometry.js";

const COLORS = Object.freeze({
  grid: "rgba(125, 178, 182, .14)", ground: "#172127", body: "#ff786f",
  marker: "#80e4da", contact: "#f6b75a", face: "#9a8cff",
});

function drawRect(context, rect, color, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = `${color}22`;
  context.strokeStyle = color;
  context.lineWidth = 1.5;
  context.fillRect(rect.x, rect.y, rect.width, rect.height);
  context.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
  context.restore();
}

function poseChanged(pose) {
  return Object.keys(POSE_DEFAULT).some((field) => pose[field] !== POSE_DEFAULT[field] && field !== "hold");
}

function directionalMarker(markers, markerGroup, direction) {
  const names = PLAYER_RIG_CONTACT_CONFIG.markerGroups[markerGroup] || [];
  return names.reduce((best, name) => {
    const point = markers[name];
    if (!point) return best;
    const score = direction.x * point.x + direction.y * point.y;
    return !best || score > best.score ? { name, point, score } : best;
  }, null);
}

export class LabRenderer {
  constructor(canvas, assets) {
    this.canvas = canvas;
    this.assets = assets;
    this.images = new Map();
    this.pending = new Set();
    this.interaction = null;
  }

  _image(clip) {
    if (this.images.has(clip.actionId)) return this.images.get(clip.actionId);
    if (!this.pending.has(clip.actionId)) {
      this.pending.add(clip.actionId);
      this.assets.imageForClip(clip).then((image) => {
        this.images.set(clip.actionId, image);
        this.pending.delete(clip.actionId);
      }).catch(() => this.pending.delete(clip.actionId));
    }
    return null;
  }

  _drawWorld(context, width, height, groundY, snapshot, state) {
    const gradient = context.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "#12242d");
    gradient.addColorStop(0.72, "#0a151b");
    gradient.addColorStop(1, "#070d11");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    const tile = state.tileSize * state.zoom;
    const direction = flipForSnapshot(snapshot, state) ? 1 : -1;
    const offset = direction * snapshot.elapsedSeconds * snapshot.segment.speed * state.zoom % tile;
    if (state.showGuides) {
      context.strokeStyle = COLORS.grid;
      context.lineWidth = 1;
      for (let x = -tile + offset; x < width + tile; x += tile) {
        context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
      }
      for (let y = groundY; y > 0; y -= tile) {
        context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
      }
    }
    context.fillStyle = COLORS.ground;
    context.fillRect(0, groundY, width, height - groundY);
    context.strokeStyle = "rgba(246,183,90,.46)";
    context.lineWidth = 2;
    context.beginPath(); context.moveTo(0, groundY); context.lineTo(width, groundY); context.stroke();
  }

  _drawFrame(context, image, action, sourceFrame, geometry, alpha = 1) {
    const sourceX = sourceFrame % action.columns * action.frame_width;
    const sourceY = Math.floor(sourceFrame / action.columns) * action.frame_height;
    context.save();
    context.globalAlpha = alpha;
    context.translate(geometry.anchorX, geometry.anchorY);
    context.rotate(geometry.rotation);
    context.scale((geometry.flipX ? -1 : 1) * geometry.scaleX, geometry.scaleY);
    context.drawImage(
      image,
      sourceX, sourceY, action.frame_width, action.frame_height,
      -geometry.originX * geometry.displaySize,
      -geometry.originY * geometry.displaySize,
      geometry.displaySize, geometry.displaySize,
    );
    context.restore();
  }

  _drawMarkers(context, markers, selectedMarker) {
    Object.entries(markers).forEach(([name, point]) => {
      context.fillStyle = name === selectedMarker ? "#ffffff" : COLORS.marker;
      context.beginPath(); context.arc(point.x, point.y, name === selectedMarker ? 5 : 4, 0, Math.PI * 2); context.fill();
      context.fillStyle = "rgba(224,255,251,.88)";
      context.font = "10px ui-monospace, monospace";
      context.fillText(name, point.x + 7, point.y - 5);
    });
  }

  _contactGeometry(context, markers, snapshot, state, target, contact) {
    const clip = snapshot.segment.clip;
    if (clip.kind !== "action") return { status: "not applicable", reached: false, attack: null };
    const spec = resolveUalActionContact(PROFILE, clip.animationKey);
    const names = PLAYER_RIG_CONTACT_CONFIG.markerGroups[spec.markerGroup] || [];
    if (contact.markerName !== "auto" && !markers[contact.markerName]) {
      return { status: `selected marker ${contact.markerName} missing`, reached: false, attack: null, spec };
    }
    let selected = contact.markerName !== "auto" && markers[contact.markerName]
      ? { name: contact.markerName, point: markers[contact.markerName], score: Infinity }
      : null;
    names.forEach((name) => {
      const point = markers[name];
      if (!point || selected?.score === Infinity) return;
      const score = target.direction.x * point.x + target.direction.y * point.y;
      if (!selected || score > selected.score) selected = { name, point, score };
    });
    if (!selected) return { status: "missing contact marker", reached: false, attack: null, spec };
    const base = buildAttackContactBox(selected.point, target.direction, target.tile, PLAYER_RIG_CONTACT_CONFIG);
    const attack = editableContactRect(base, selected.point, contact, target.direction, state.zoom);
    const targetTile = { tx: target.rect.x / target.tile, ty: target.rect.y / target.tile };
    const bands = buildTargetFaceBands(targetTile, target.direction, target.tile, PLAYER_RIG_CONTACT_CONFIG);
    const valid = bands.length > 0 && bands.every((band) => rectanglesIntersect(attack, band));
    const contactSequenceIndex = Math.max(0, Math.min(clip.frames.length - 1,
      spec.sequenceIndex + Math.round(state.contactFrameOffset)));
    const reached = snapshot.sequenceIndex >= contactSequenceIndex;
    if (state.showContact) {
      bands.forEach((band) => drawRect(context, band, COLORS.face));
      drawRect(context, attack, COLORS.contact, reached ? 1 : 0.55);
      context.strokeStyle = COLORS.contact;
      context.beginPath(); context.moveTo(selected.point.x, selected.point.y);
      context.lineTo(target.rect.x + target.tile / 2, target.rect.y + target.tile / 2); context.stroke();
    }
    return {
      status: reached ? (valid ? "contact valid" : "contact missed") : "contact armed",
      reached, valid, markerName: selected.name, spec, sequenceIndex: contactSequenceIndex, attack, bands,
    };
  }

  render(snapshot, state) {
    const { context, width, height } = resizeCanvas(this.canvas);
    const groundY = Math.round(height * LAB_VIEW.groundYRatio + (state.zoom - 1) * 42);
    this._drawWorld(context, width, height, groundY, snapshot, state);
    const clip = snapshot.segment.clip;
    const action = this.assets.manifest.actions[clip.actionId];
    const image = this._image(clip);
    const patch = state.editorDraft;
    const actionContext = {
      actionId: clip.actionId, clipId: clip.id, animationKey: clip.animationKey,
      sequenceIndex: snapshot.sequenceIndex, sourceFrame: snapshot.sourceFrame,
    };
    const resolutionScope = state.editorTool !== "body" && state.editorScope === "action" ? "action" : "effective";
    const pose = resolvePose(patch, actionContext, 0, state.bypassEdits, resolutionScope);
    const flipX = flipForSnapshot(snapshot, state);
    const animationDisplaySize = resolvePlayerDisplaySizePx(
      PROFILE,
      state.displaySizePx,
      clip.animationKey,
    );
    const displaySize = animationDisplaySize
      * (state.displaySizePx / PROFILE.displaySizePx)
      * state.zoom;
    let geometry = createFrameGeometry({ centerX: width / 2, groundY, displaySize, profile: PROFILE, pose, flipX });
    const target = targetGeometry(width / 2, groundY, state);
    if (state.scenarioId === "mining" && clip.kind === "action" && PLAYER_RIG_CONTACT_CONFIG.alignment.enabled) {
      const alignmentFrames = action?.rig_markers?.frames || {};
      const alignmentSource = alignmentFrames[String(snapshot.sourceFrame)] || null;
      const alignmentMarkers = projectMarkers(
        alignmentSource, geometry, action, patch, actionContext, state.bypassEdits, resolutionScope,
      );
      const alignmentSpec = resolveUalActionContact(PROFILE, clip.animationKey);
      const alignmentMarker = directionalMarker(alignmentMarkers, alignmentSpec.markerGroup, target.direction);
      if (alignmentMarker) {
        const targetTile = { tx: target.rect.x / target.tile, ty: target.rect.y / target.tile };
        const targetOffset = resolveTileFaceAlignmentOffset({
          markerWorld: alignmentMarker.point,
          targetTile,
          direction: target.direction,
          tileSize: target.tile,
          currentOffset: { x: 0, y: 0 },
          config: PLAYER_RIG_CONTACT_CONFIG,
        });
        const elapsedSeconds = snapshot.localSeconds
          + PLAYER_RIG_CONTACT_CONFIG.alignment.bootstrapDeltaMs / 1000;
        const response = 1 - Math.exp(
          -PLAYER_RIG_CONTACT_CONFIG.alignment.responsePerSecond * elapsedSeconds,
        );
        geometry = {
          ...geometry,
          anchorX: geometry.anchorX + targetOffset.x * response,
          anchorY: geometry.anchorY + targetOffset.y * response,
        };
      }
    }
    if (state.scenarioId === "mining") drawRect(context, target.rect, "#c78652", 0.9);
    if (image && state.showProductionGhost && !state.bypassEdits && poseChanged(pose)) {
      const baseline = createFrameGeometry({ centerX: width / 2, groundY, displaySize, profile: PROFILE, pose: POSE_DEFAULT, flipX });
      this._drawFrame(context, image, action, snapshot.sourceFrame, baseline, 0.24);
    }
    if (image && state.showOnion) {
      const count = clip.frames.length;
      [(snapshot.sequenceIndex - 1 + count) % count, (snapshot.sequenceIndex + 1) % count].forEach((sequenceIndex) => {
        const sourceFrame = clip.frames[sequenceIndex];
        const adjacentContext = { ...actionContext, sequenceIndex, sourceFrame };
        const adjacentPose = resolvePose(patch, adjacentContext, 0, state.bypassEdits, resolutionScope);
        const adjacent = createFrameGeometry({ centerX: width / 2, groundY, displaySize, profile: PROFILE, pose: adjacentPose, flipX });
        this._drawFrame(context, image, action, sourceFrame, adjacent, LAB_VIEW.onionAlpha);
      });
    }
    if (image) this._drawFrame(context, image, action, snapshot.sourceFrame, geometry);
    const body = state.bypassEdits ? state.editorOriginalBody : patch.body;
    const collider = bodyRect(width / 2, groundY, body, state.zoom);
    if (state.showCollider) drawRect(context, collider, COLORS.body);
    const markerFrames = action?.rig_markers?.frames || {};
    const markerFrameCount = Object.keys(markerFrames).length;
    const markerExpectedFrames = action?.frame_count || 0;
    const markerCoverage = markerFrameCount === markerExpectedFrames && markerExpectedFrames > 0
      ? "complete" : markerFrameCount > 0 ? "partial" : "missing";
    const frameMarkers = markerFrames[String(snapshot.sourceFrame)] || null;
    const markers = projectMarkers(frameMarkers, geometry, action, patch, actionContext, state.bypassEdits, resolutionScope);
    const markerFrameAvailable = Object.keys(markers).length > 0;
    if (state.showRig) this._drawMarkers(context, markers, state.selectedMarker);
    const resolvedContact = resolveContact(patch, actionContext, 0, state.bypassEdits, resolutionScope);
    const contactDraft = {
      ...resolvedContact,
      widthScale: resolvedContact.widthScale * state.contactScale,
      heightScale: resolvedContact.heightScale * state.contactScale,
    };
    const contact = this._contactGeometry(context, markers, snapshot, state, target, contactDraft);
    this.interaction = {
      width, height, groundY, zoom: state.zoom, bodyRect: collider, contactRect: contact.attack,
      markers, geometry, spriteBounds: frameBounds(geometry), target, actionId: clip.actionId,
      sourceFrame: snapshot.sourceFrame, action, flipX, pose, contact: contactDraft,
      context: actionContext,
    };
    drawEditorOverlay(context, state, this.interaction);
    if (!markerFrameAvailable) {
      context.fillStyle = "rgba(255,120,111,.94)";
      context.font = "700 12px ui-monospace, monospace";
      const warning = markerCoverage === "partial"
        ? `RIG MARKERS MISSING FOR FRAME ${snapshot.sourceFrame} · ${markerFrameCount}/${markerExpectedFrames} COVERED`
        : "RIG MARKERS MISSING FOR THIS PRODUCTION ACTION";
      context.fillText(warning, 20, 28);
    }
    return {
      markerCoverage, markerCount: Object.keys(markers).length, markerFrameAvailable,
      markerFrameCount, markerExpectedFrames, contact,
      footstep: clip.footstepIndices.includes(snapshot.sequenceIndex + 1), flipX,
      imageReady: Boolean(image), interaction: this.interaction,
    };
  }
}
