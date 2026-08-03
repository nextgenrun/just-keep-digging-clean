import { HUDSystem } from "../systems/visual/HUDSystem.js";
import { APPROVED_HUD_SKIN } from "../values/approvedHudSkin.js";
import { ASSET_KEYS } from "../values/assetKeys.js";

class WeatherHudVisualHarnessScene extends Phaser.Scene {
  constructor() {
    super("WeatherHudVisualHarnessScene");
  }

  preload() {
    for (const [id, path] of Object.entries(APPROVED_HUD_SKIN.paths)) {
      this.load.image(ASSET_KEYS.ui.approvedHud[id], `../${path}`);
    }
  }

  create() {
    this.cameras.main.setBackgroundColor(0x05090d);
    this.dayNightCycle = {
      getCurrentPhaseLabel: () => "Night",
      getDay: () => 7,
      getSeason: () => "winter",
      getTimeString12: () => "11:42 PM",
      getCurrentTemperature: () => -6,
    };
    this.weatherSystem = {
      getSnapshot: () => ({
        kind: "storm",
        forecastKind: "clear",
        intensity: 0.72,
        isStorming: true,
      }),
    };
    this.upgradeSystem = { ownedPickaxe: null };

    this.hudSystem = new HUDSystem(this, 279);
    this.hudSystem.setSystemVisibility({
      clock: true,
      weather: true,
      torch: false,
      combo: false,
      buff: false,
    });
    this.hudSystem.updateClockWeather();

    globalThis.__WEATHER_HUD_HARNESS__ = Object.freeze({
      ready: true,
      approvedSkinActive: this.hudSystem.approvedSkin?.active === true,
      approvedWorldFrameVisible: this.hudSystem.approvedSkin?.worldFrame?.visible === true,
      legacyClockPanelVisible: this.hudSystem.clockPanel?.visible === true,
      legacyWeatherPanelVisible: this.hudSystem.weatherPanel?.visible === true,
      legacySeasonTextVisible: this.hudSystem.weatherSeasonText?.visible === true,
      clockTextVisible: this.hudSystem.clockTimeText?.visible === true,
      weatherTextVisible: this.hudSystem.weatherText?.visible === true,
      temperatureTextVisible: this.hudSystem.weatherTempText?.visible === true,
      weatherText: this.hudSystem.weatherText?.text || "",
      temperatureText: this.hudSystem.weatherTempText?.text || "",
    });
    document.body.dataset.weatherHudReady = "true";
  }
}

new Phaser.Game({
  type: Phaser.WEBGL,
  width: APPROVED_HUD_SKIN.referenceViewport.width,
  height: APPROVED_HUD_SKIN.referenceViewport.height,
  backgroundColor: 0x05090d,
  parent: document.body,
  render: {
    antialias: true,
    roundPixels: false,
  },
  scene: [WeatherHudVisualHarnessScene],
});
