import { FREIGHT_LIFT_PROTOTYPE as CONFIG } from
  "../../../values/freightLiftPrototype.js";
import { FreightLiftPrototypeScene } from "./FreightLiftPrototypeScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  width: CONFIG.viewport.widthPx,
  height: CONFIG.viewport.heightPx,
  backgroundColor: CONFIG.world.backgroundColor,
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: "high-performance",
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: FreightLiftPrototypeScene,
});
