import { SoundSystem } from "../../sound/SoundSystem.js";
import { USER_SETTINGS } from "../../systems/UserSettings.js";

const MENU_SCENE_KEYS = Object.freeze([
  "BootScene",
  "MainMenuScene",
  "StartMenuScene",
  "WorldLoadScene",
]);

export class MenuAudioScene extends Phaser.Scene {
  constructor() {
    super("MenuAudioScene");
    this.soundSystem = null;
    this._gestureHandler = null;
  }

  create() {
    this.soundSystem = new SoundSystem(this);
    this.soundSystem.init();
    USER_SETTINGS.applyAudioTo(this.soundSystem);
    this.soundSystem.loadSoundLibraries();
    this.soundSystem.loadVoiceLineLibraries();
    this._bindUserGesture();
    this.attachToMenuScenes();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this._removeUserGesture();
      this.soundSystem?.destroy();
      this.soundSystem = null;
    });
  }

  attachTo(scene) {
    if (scene && this.soundSystem) {
      scene.soundSystem = this.soundSystem;
    }
  }

  attachToMenuScenes() {
    MENU_SCENE_KEYS.forEach((key) => {
      const scene = this.scene.get(key);
      this.attachTo(scene);
    });
  }

  startMenuAudio() {
    this.soundSystem?.startAudioAfterUserGesture({ voiceLines: false });
    this._removeUserGesture();
  }

  stopForGameStart() {
    this.soundSystem?.stopBackgroundMusic();
    this.soundSystem?.stopVoiceLineTimer();
    this.scene.stop();
  }

  _bindUserGesture() {
    if (this._gestureHandler || !this.game?.canvas) return;
    this._gestureHandler = () => this.startMenuAudio();
    this.game.canvas.addEventListener("pointerdown", this._gestureHandler);
    this.game.canvas.addEventListener("mousedown", this._gestureHandler);
    this.game.canvas.addEventListener("click", this._gestureHandler);
    this.game.canvas.addEventListener("touchstart", this._gestureHandler);
    window.addEventListener("keydown", this._gestureHandler);
  }

  _removeUserGesture() {
    if (!this._gestureHandler || !this.game?.canvas) return;
    this.game.canvas.removeEventListener("pointerdown", this._gestureHandler);
    this.game.canvas.removeEventListener("mousedown", this._gestureHandler);
    this.game.canvas.removeEventListener("click", this._gestureHandler);
    this.game.canvas.removeEventListener("touchstart", this._gestureHandler);
    window.removeEventListener("keydown", this._gestureHandler);
    this._gestureHandler = null;
  }
}
