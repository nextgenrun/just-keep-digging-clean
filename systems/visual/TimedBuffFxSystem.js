import { QuickslashContactFx } from "./QuickslashContactFx.js";
import { SpeedBlockFxSystem } from "./SpeedBlockFxSystem.js";
import { SPEED_BLOCK_FX_CONFIG, SPECIAL_BLOCK_BUFF_FX } from "../../values/speedBlockFx.js";

/** Gives each live timed reward a distinct authored aura without changing the reward. */
export class TimedBuffFxSystem {
  constructor(scene, player, controller, effects) {
    this.quickslash = new QuickslashContactFx(scene, player, controller);
    this.channels = [new SpeedBlockFxSystem(scene, player, controller, effects)];
    for (const [id, presentation] of Object.entries(SPECIAL_BLOCK_BUFF_FX)) {
      const fx = new SpeedBlockFxSystem(scene, player, controller, effects, {
        config: { ...SPEED_BLOCK_FX_CONFIG, ...presentation,
          frames: [SPEED_BLOCK_FX_CONFIG.frames[0]] },
        activeProvider: () => id === "damage"
          ? effects?.getDamageMultiplier?.() > 1
          : effects?.getFreeAbilitySnapshot?.().active === true,
      });
      this.channels.push(fx);
    }
  }
  update(delta) { this.channels.forEach(fx => fx.update(delta)); }
  onMineImpact(tile, point) { this.channels.forEach(fx => fx.onMineImpact(tile, point)); this.quickslash.onMineImpact(tile, point); }
  getSnapshot() {
    const channels = this.channels.map(fx => fx.getSnapshot());
    return { ...channels[0], channels,
      liveParticles: channels.reduce((sum, fx) => sum + fx.liveParticles, 0),
      maxParticles: channels.reduce((sum, fx) => sum + fx.maxParticles, 0) };
  }
  destroy() { this.channels.forEach(fx => fx.destroy()); this.quickslash.destroy(); }
}
