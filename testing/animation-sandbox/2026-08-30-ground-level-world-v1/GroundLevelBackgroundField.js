import { resolveGroundBackgroundProfile } from "../../../values/worldVisualGroundBackgroundMotionReview.js";
import { GroundLevelAuthoredAtmosphereField } from "./GroundLevelAuthoredAtmosphereField.js";

export class GroundLevelBackgroundField {
  constructor(scene, review, backgroundReview) {
    this.scene = scene;
    this.review = review;
    this.backgroundReview = backgroundReview;
    this.elapsedSeconds = 0;
    this.effectiveStrength = 0;
    this.profile = null;
    const initialSource = backgroundReview.profiles[0].source;
    const display = backgroundReview.referenceDisplay;
    this.image = scene.add.image(display.x, display.y, initialSource.key)
      .setScrollFactor(0)
      .setDepth(display.depth)
      .setDisplaySize(display.width, display.height)
      .setVisible(false);
    this.atmosphere = new GroundLevelAuthoredAtmosphereField(scene, backgroundReview);
  }

  setChapter(chapterId) {
    const profile = resolveGroundBackgroundProfile(chapterId);
    if (!profile) throw new Error(`[GroundLevelBackgroundField] Missing profile: ${chapterId}`);
    this.profile = profile;
    const usesImage = Boolean(profile.source);
    this.image.setVisible(usesImage);
    if (usesImage) {
      const display = profile.renderMode === "segmented-runtime"
        ? this.backgroundReview.runtimeDisplay
        : this.backgroundReview.referenceDisplay;
      this.image.setTexture(profile.source.key)
        .setPosition(display.x, display.y)
        .setDepth(display.depth)
        .setDisplaySize(display.width, display.height);
    }
    this.atmosphere.setProfile(profile);
    return profile;
  }

  update(deltaMs, elapsedSeconds, effectiveStrength, weatherScalar, tint) {
    this.elapsedSeconds = elapsedSeconds;
    this.effectiveStrength = effectiveStrength * weatherScalar;
    if (this.profile?.renderMode === "segmented-runtime") this.image.setTint(tint);
    else this.image.clearTint();
    this.atmosphere.update(deltaMs, elapsedSeconds, effectiveStrength, weatherScalar);
  }

  get snapshot() {
    const profile = this.profile;
    return {
      chapterId: profile?.chapterId || null,
      renderMode: profile?.renderMode || null,
      segmentationStatus: profile?.segmentationStatus || null,
      sourceTexture: profile?.source?.path || "existing-town-video",
      sourcePixelsAnimated: false,
      staticTargets: profile?.immutable || [],
      activeMotionTargets: profile?.activeMotion || [],
      plannedMotionTargets: profile?.plannedMotion || [],
      genericFallback: false,
      repeatedBackdrop: false,
      placeholderActors: 0,
      motionSystems: profile?.activeMotion?.length || 0,
      systems: profile?.activeMotion || [],
      effectiveStrength: Number(this.effectiveStrength.toFixed(3)),
      maximumSourceDisplacementPx: 0,
      mountainDisplacementPx: 0,
      phaseSeconds: Number(this.elapsedSeconds.toFixed(2)),
      atmosphere: this.atmosphere.snapshot,
    };
  }
}
