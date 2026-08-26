import {
  CINEMATIC_VIDEO_CONFIG,
  getTitanDiscoveryCinematic,
  resolveCinematicVideosEnabled,
} from "../../values/cinematicVideoConfig.js";
import { CinematicVideoPlayer } from "./CinematicVideoPlayer.js";

export class TitanDiscoveryCinematicController {
  constructor(scene, config = CINEMATIC_VIDEO_CONFIG) {
    this.scene = scene;
    this.config = config;
    this.player = null;
  }

  showForDiscoveries(titanIds = []) {
    if (this.player || !resolveCinematicVideosEnabled(this.config)) return false;
    const asset = titanIds
      .map(titanId => getTitanDiscoveryCinematic(titanId, this.config))
      .find(Boolean);
    if (!asset) return false;
    this.player = new CinematicVideoPlayer(this.scene, this.config);
    const started = this.player.play(asset, {
      autoStart: true,
      suspendGameplay: true,
      audioSystem: this.scene.soundSystem,
      onComplete: () => { this.player = null; },
    });
    if (!started) this.player = null;
    return started;
  }

  destroy() {
    this.player?.destroy?.();
    this.player = null;
  }
}
