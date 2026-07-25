import { createInitialState } from "./labConfig.js";
import { loadProductionAssets } from "./labAssets.js";
import { LabPlayback } from "./labPlayback.js";
import { LabRenderer } from "./labRenderer.js";
import { LabTelemetry } from "./labTelemetry.js";
import { LabUi } from "./labUi.js";
import { LabDirectManipulation } from "./labDirectManipulation.js";
import { LabEditorModel } from "./labEditorModel.js";
import { buildSourceRigPoseRequests, serializeEditorPatch } from "./labEditorPatchIo.js";
import { LabEditorUi } from "./labEditorUi.js";
import { hasMarkerOverrides } from "./labEditorPatch.js";
import { UAL_ANIMATION_TUNING_LAB_CONFIG } from "../../../values/ualAnimationTuningLab.js";

const state = createInitialState();
const hook = {
  ready: false,
  error: null,
  getSnapshot: () => ({ ready: hook.ready, error: hook.error }),
};
window.__UAL_ANIMATION_TUNING_LAB_V2__ = hook;
window.__UAL_ANIMATION_TUNING_LAB_V3__ = hook;

function exportPayload(assets, playback, telemetry, editor) {
  const markerCoverage = Object.fromEntries(
    Object.entries(assets.manifest.actions).map(([id, action]) => {
      const frames = Object.keys(action.rig_markers?.frames || {}).length;
      return [id, {
        status: frames === action.frame_count ? "complete" : frames > 0 ? "partial" : "missing",
        frames,
        total: action.frame_count,
      }];
    }),
  );
  return {
    schema: "ual-animation-tuning-lab-v3-draft",
    generatedAt: new Date().toISOString(),
    productionChanged: false,
    productionRasterChanged: false,
    visualHandPixelsChanged: false,
    selectedWalkDraft: UAL_ANIMATION_TUNING_LAB_CONFIG.selectedWalkDraft,
    scenario: state.scenarioId,
    libraryAction: state.selectedActionId,
    aim: state.aim,
    locomotion: {
      speedPxPerSec: state.speedPxPerSec,
      strideTilesPerCycle: state.strideTilesPerCycle,
      cadenceMode: state.cadenceMode,
      minTimeScale: state.cadenceMin,
      maxTimeScale: state.cadenceMax,
      startTrimFrames: state.startTrimFrames,
      stopTrimFrames: state.stopTrimFrames,
      runEnterSpeedPxPerSec: state.runEnterSpeedPxPerSec,
      runExitSpeedPxPerSec: state.runExitSpeedPxPerSec,
      landingFrameCount: state.landingFrameCount,
      flightHoverSeconds: state.flightHoverSeconds,
      flightTravelSeconds: state.flightTravelSeconds,
      comboGapMs: state.comboGapMs,
    },
    collisionDraft: {
      ...state.editorDraft.body,
      contactFrameOffset: state.contactFrameOffset,
      contactScale: state.contactScale,
    },
    editorPatch: serializeEditorPatch(state.editorDraft),
    sourceRigPoseRequests: buildSourceRigPoseRequests(state.editorDraft, assets.manifest),
    editorEvidence: {
      ...editor.summary(),
      logicalMarkerEditsMoveRasterPixels: false,
      sourceRigRerenderRequired: hasMarkerOverrides(state.editorDraft),
      promotionTargets: {
        body: "values/ualNativePlayerAssetProfile.js + physics anchor hook",
        contacts: "values/playerRigContact.js or per-action contact config",
        markers: "UAL runtime manifest via Blender render/pack pipeline",
        posesAndHolds: "runtime animation sequence/timing configuration",
      },
    },
    inspection: {
      facing: state.facingLeft ? "left" : "right",
      zoom: state.zoom,
      guides: state.showGuides,
      collider: state.showCollider,
      rigMarkers: state.showRig,
      contactGeometry: state.showContact,
      onionFrames: state.showOnion,
    },
    productionTruth: {
      manifestVersion: assets.manifest.version,
      pipeline: assets.manifest.pipeline,
      actionCount: Object.keys(assets.manifest.actions).length,
      markerCoverage,
    },
    currentTimelineSeconds: playback.timeline.duration,
    evidence: telemetry.exportEvidence(),
  };
}

async function start() {
  const assets = await loadProductionAssets();
  const editor = new LabEditorModel(state);
  document.querySelector("#truth-tile").textContent = `${state.tileSize} px`;
  document.querySelector("#truth-scale").textContent = `${state.targetVisibleHeightTiles} tile`;
  document.querySelector("#truth-body").textContent = `${state.bodyWidthPx} × ${state.bodyHeightPx}`;
  const playback = new LabPlayback(state, assets);
  const renderer = new LabRenderer(document.querySelector("#stage"), assets);
  const telemetry = new LabTelemetry(
    document.querySelector("#telemetry"),
    document.querySelector("#event-track"),
  );
  let ui;
  let editorUi;
  editor.setOnChange((detail) => {
    if (detail.rebuild) playback.rebuild({ preserveProgress: true });
    editorUi?.markDirty();
  });
  const handlers = {
    rebuild: (preserve) => {
      playback.rebuild({ preserveProgress: preserve });
      telemetry.clear();
    },
    play: () => {
      state.playing = !state.playing;
      playback.lastTimestamp = performance.now();
    },
    restart: () => {
      playback.restart();
      telemetry.clear();
    },
    step: (direction) => playback.step(direction),
    seek: (seconds) => {
      state.playing = false;
      playback.seek(seconds);
    },
    clearEvents: () => telemetry.clear(),
    editorDirty: () => editorUi?.markDirty(),
    exportDraft: () => ui.showExport(JSON.stringify(exportPayload(assets, playback, telemetry, editor), null, 2)),
  };
  ui = new LabUi(state, assets, handlers);
  editorUi = new LabEditorUi(state, editor, assets.manifest, handlers);
  new LabDirectManipulation(document.querySelector("#stage"), state, editor, () => renderer.interaction);
  playback.rebuild({ preserveProgress: false });

  hook.ready = true;
  hook.getSnapshot = () => {
    const snapshot = playback.snapshot();
    return {
      ready: true,
      scenarioId: state.scenarioId,
      actionId: snapshot.segment.clip.actionId,
      phase: snapshot.segment.phase,
      frame: snapshot.sourceFrame,
      sequenceIndex: snapshot.sequenceIndex,
      timeScale: snapshot.segment.timeScale,
      totalSeconds: snapshot.totalSeconds,
      editor: {
        ...editor.summary(),
        tool: state.editorTool,
        scope: state.editorScope,
        selectedMarker: state.selectedMarker,
        effective: editor.resolved(),
        interaction: renderer.interaction && {
          bodyRect: renderer.interaction.bodyRect,
          contactRect: renderer.interaction.contactRect,
          markers: renderer.interaction.markers,
        },
      },
    };
  };

  function frame(timestamp) {
    const snapshot = playback.tick(timestamp);
    const renderMeta = renderer.render(snapshot, state);
    telemetry.update(snapshot, state, renderMeta);
    ui.update(snapshot, renderMeta);
    editorUi.update(snapshot, renderMeta);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

start().catch((error) => {
  hook.error = error.message;
  console.error(error);
  const status = document.querySelector("#load-status");
  status.textContent = `Tuning lab failed: ${error.message}`;
  status.classList.add("error");
});
