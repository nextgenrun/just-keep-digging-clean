import { TUTORIAL_NARRATION_CONFIG } from "../../values/tutorialNarration.js";
import { TOWN_TUTORIAL_STAGES } from "../../values/retentionConfig.js";

export class TutorialNarrationController {
  constructor(scene, retention, config = TUTORIAL_NARRATION_CONFIG) {
    this.scene = scene;
    this.retention = retention;
    this.config = config;
    this.playedCueIds = new Set();
    this.currentCueId = null;
    this.portalNearby = false;
  }

  onStageEntered(stage) {
    this.portalNearby = false;
    return this.play(stage);
  }

  update() {
    const state = this.retention?.getTutorialState?.();
    if (state?.stage !== TOWN_TUTORIAL_STAGES.PORTAL) {
      this.portalNearby = false;
      return false;
    }
    const distance = this.scene?.firstSessionPortalSystem?.getDistance?.()
      ?? Number.POSITIVE_INFINITY;
    if (distance > this.config.portalNearRadiusTiles) return false;
    this.portalNearby = true;
    return this.play("portalNear");
  }

  getCaption(stage = this.retention?.getTutorialState?.()?.stage) {
    const cueId = stage === TOWN_TUTORIAL_STAGES.PORTAL && this.portalNearby
      ? "portalNear"
      : stage;
    return this.config.cues[cueId]?.caption || null;
  }

  play(cueId, { replay = false } = {}) {
    const cue = this.config.cues[cueId];
    if (!this.config.enabled || !cue) return false;
    if (!replay && this.playedCueIds.has(cue.id)) return false;
    this.playedCueIds.add(cue.id);
    this.currentCueId = cueId;
    if (!this.config.recordingsReady || !cue.path) return true;
    this.scene?.soundSystem?.voiceLineManager?.playExactVoiceLine?.({
      key: cue.assetKey,
      path: cue.path,
      file: cue.path.split("/").pop(),
    });
    return true;
  }

  replayCurrent() {
    const stage = this.retention?.getTutorialState?.()?.stage;
    const cueId = stage === TOWN_TUTORIAL_STAGES.PORTAL && this.portalNearby
      ? "portalNear"
      : stage;
    return this.play(cueId, { replay: true });
  }

  getHealthSnapshot() {
    const cues = Object.values(this.config.cues);
    const configuredRecordings = cues.filter(cue => Boolean(cue.path)).length;
    return {
      ready: true,
      captionsReady: cues.every(cue => cue.caption?.promise && cue.caption?.detail),
      recordingsReady: this.config.recordingsReady === true
        && configuredRecordings === cues.length,
      configuredRecordings,
      cueCount: cues.length,
      currentCueId: this.currentCueId,
      portalNearby: this.portalNearby,
    };
  }

  destroy() {
    this.playedCueIds.clear();
    this.scene = null;
    this.retention = null;
    this.config = null;
  }
}
