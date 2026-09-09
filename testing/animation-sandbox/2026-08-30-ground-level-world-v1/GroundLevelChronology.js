import { TIME_CONFIG } from "../../../values/timeConfig.js";

function clampHour(hour) {
  return ((Number(hour) % 24) + 24) % 24;
}

export class GroundLevelChronology {
  constructor(scene, review, initial) {
    this.scene = scene;
    this.review = review;
    this.worldDay = Math.max(1, Number(initial.day) || review.chronology.defaultDay)
      + clampHour(initial.hour ?? review.chronology.defaultHour) / 24;
    this.weather = review.chronology.weatherKinds.includes(initial.weather)
      ? initial.weather : "clear";
    this.paused = false;
    this.overlay = scene.add.rectangle(
      review.viewport.width / 2,
      review.viewport.height / 2,
      review.viewport.width + 8,
      review.viewport.height + 8,
      0x07101d,
      0,
    ).setScrollFactor(0).setDepth(35).setBlendMode(Phaser.BlendModes.MULTIPLY);
  }

  setDay(day) {
    const fraction = this.worldDay - Math.floor(this.worldDay);
    this.worldDay = Math.max(1, Math.floor(Number(day) || 1)) + fraction;
  }

  setHour(hour) {
    this.worldDay = Math.floor(this.worldDay) + clampHour(hour) / 24;
  }

  setWeather(weather) {
    if (this.review.chronology.weatherKinds.includes(weather)) this.weather = weather;
  }

  update(deltaMs) {
    if (!this.paused) this.worldDay += deltaMs / TIME_CONFIG.dayDurationMs;
    const hour = this.hour;
    const nightDistance = Math.min(Math.abs(hour - 24), hour);
    const night = Phaser.Math.Clamp(1 - nightDistance / 7, 0, 1);
    const dusk = Phaser.Math.Clamp(1 - Math.abs(hour - 19.5) / 3, 0, 1);
    const weatherAlpha = this.weather === "storm" ? 0.09
      : ["rain", "snow"].includes(this.weather) ? 0.055
        : this.weather === "drizzle" ? 0.028 : 0;
    this.overlay.setFillStyle(
      dusk > night ? 0x311d32 : this.weather === "snow" ? 0x28384a : 0x07101d,
      Math.min(0.13, night * 0.045 + dusk * 0.025 + weatherAlpha),
    );
  }

  get day() {
    return Math.floor(this.worldDay);
  }

  get hour() {
    return (this.worldDay - Math.floor(this.worldDay)) * 24;
  }

  get lighting() {
    const hour = this.hour;
    const daylight = Phaser.Math.Clamp(1 - Math.abs(hour - 13) / 8.5, 0, 1);
    const storm = this.weather === "storm" ? 0.84 : 1;
    const channel = Math.round((190 + daylight * 65) * storm);
    const blue = Math.min(255, channel + 10);
    const tint = Phaser.Display.Color.GetColor(channel, channel, blue);
    return { terrainTint: tint, farTint: tint, wet: ["drizzle", "rain", "storm"].includes(this.weather) ? 0.55 : 0, lightning: 0 };
  }

  get snapshot() {
    const day = this.day;
    return {
      day,
      week: Math.floor((day - 1) / this.review.chronology.daysPerWeek) + 1,
      month: Math.floor((day - 1) / this.review.chronology.daysPerMonth) + 1,
      hour: Number(this.hour.toFixed(2)),
      weather: this.weather,
      productionDayDurationMs: TIME_CONFIG.dayDurationMs,
      paused: this.paused,
    };
  }
}
