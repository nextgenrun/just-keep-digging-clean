import { installStartupImageVariants } from "../../systems/visual/StartupImageVariants.js";
import {
  CINEMATIC_VIDEO_CONFIG,
  resolveCinematicVideosEnabled,
  resolveOpeningCinematicAsset,
} from "../../values/cinematicVideoConfig.js";
import { CinematicVideoPlayer } from "../../systems/visual/CinematicVideoPlayer.js";

export class OpeningCinematicScene extends Phaser.Scene {
  constructor() {
    super(CINEMATIC_VIDEO_CONFIG.scenes.opening);
    this.cinematicVideoPlayer = null;
    this.menuSoundSystem = null;
  }

  preload() {
    if (!resolveCinematicVideosEnabled()) return;
    installStartupImageVariants(this);
    const opening = resolveOpeningCinematicAsset();
    const images = [{ key: opening.posterKey, path: opening.posterPath },
      ...Object.values(CINEMATIC_VIDEO_CONFIG.uiAssets)];
    for (const asset of images) {
      if (!this.textures.exists(asset.key)) this.load.image(asset.key, asset.path);
    }
    // The player streams the selected clip; later discovery videos do not block boot.
  }

  create() {
    if (!resolveCinematicVideosEnabled()) {
      this.scene.start(CINEMATIC_VIDEO_CONFIG.scenes.next);
      return;
    }
    this.cameras.main.setBackgroundColor(CINEMATIC_VIDEO_CONFIG.presentation.backgroundColor);
    const menuAudioScene = this.scene.get(CINEMATIC_VIDEO_CONFIG.scenes.menuAudio);
    this.menuSoundSystem = menuAudioScene?.soundSystem || null;
    this.menuSoundSystem?.stopBackgroundMusic?.();
    this.cinematicVideoPlayer = new CinematicVideoPlayer(this);
    const started = this.cinematicVideoPlayer.play(resolveOpeningCinematicAsset(), {
      autoStart: false,
      suspendGameplay: false,
      onComplete: () => this._continueToMenu(),
    });
    if (!started) this._continueToMenu();
  }

  _continueToMenu() {
    if (this.menuSoundSystem?.musicEnabled && this.menuSoundSystem.audioInitialized) {
      this.menuSoundSystem.startBackgroundMusic?.();
    }
    this.scene.start(CINEMATIC_VIDEO_CONFIG.scenes.next);
  }
}
