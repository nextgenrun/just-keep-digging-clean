import { MilestonePillarReviewScene } from "./MilestonePillarReviewScene.js";

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "milestone-pillar-review",
  width: 1280,
  height: 720,
  backgroundColor: "#05080b",
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [MilestonePillarReviewScene],
});
