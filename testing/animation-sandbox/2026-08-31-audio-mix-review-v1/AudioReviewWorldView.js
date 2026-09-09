export class AudioReviewWorldView {
  constructor(scene, { config, starAssetKey, levelUpPresentation }) {
    this.scene = scene;
    this.config = config;
    this.levelUpPresentation = levelUpPresentation;
    this._build(starAssetKey);
  }

  setScenario(scenario) {
    this.contextText.setText(
      `${scenario.label.toUpperCase()}  ·  STRESS ${scenario.stress}`
        + `  ·  MUSIC DUCK ${scenario.musicDuck.toFixed(2)}`,
    );
    const shadeByMode = {
      calm: 0.48,
      panic: 0.74,
      star: 0.62,
      deep: 0.78,
      dig: 0.64,
      rain: 0.54,
      levelUp: 0.52,
    };
    this.worldShade.setAlpha(shadeByMode[scenario.worldMode] ?? 0.58);
    this.rainLines.setVisible(scenario.worldMode === "rain");
    if (scenario.worldMode !== "levelUp") this.levelUpPresentation?.hide();
  }

  playScenario(id, delayMs = 0) {
    const revision = (this.visualRevision || 0) + 1;
    this.visualRevision = revision;
    this.visualTimer?.remove?.();
    const play = () => {
      if (this.visualRevision !== revision) return;
      if (id === "starDestruction") {
        this.starDestructionStartedAt = this.scene.time.now;
        this.starShockwave.setVisible(true).setAlpha(0.7).setScale(0.45);
      }
      const reward = this.config.scenarios[id]?.previewReward;
      if (reward) this.levelUpPresentation?.show(reward);
    };
    if (delayMs > 0) this.visualTimer = this.scene.time.delayedCall(delayMs, play);
    else play();
  }

  update(time, review, scenarioId) {
    const starActive = review.worldMode === "star";
    const destroying = scenarioId === "starDestruction"
      && Number.isFinite(this.starDestructionStartedAt);
    if (destroying) {
      const progress = Math.min(1, (time - this.starDestructionStartedAt) / 900);
      const coreScale = Math.max(0.1, 1 - progress * 0.9);
      this.starCore
        .setDisplaySize(92 * coreScale, 92 * coreScale)
        .setAlpha(Math.max(0.08, 1 - progress));
      this.starGlow.setAlpha(Math.max(0.02, 0.24 * (1 - progress)));
      this.starShockwave
        .setScale(0.45 + progress * 2.2)
        .setAlpha(Math.max(0, 0.7 * (1 - progress)));
      if (progress >= 1) this.starShockwave.setVisible(false);
      return;
    }

    this.starDestructionStartedAt = null;
    this.starShockwave.setVisible(false);
    const pulse = 1 + Math.sin(time / 230) * 0.055;
    this.starCore.setDisplaySize(
      92 * (starActive ? pulse : 0.72),
      92 * (starActive ? pulse : 0.72),
    );
    this.starCore.setAlpha(starActive ? 1 : 0.26);
    this.starGlow.setAlpha(starActive ? 0.15 + Math.sin(time / 300) * 0.04 : 0.035);
  }

  destroy() {
    this.visualTimer?.remove?.();
    this.visualTimer = null;
  }

  _build(starAssetKey) {
    const { height } = this.config.viewport;
    const { worldPaneWidth, floorY, floorTileSize, floorTileCount } =
      this.config.layout;
    this.worldShade = this.scene.add.rectangle(
      0, 0, worldPaneWidth, height, 0x06111a, 0.58,
    ).setOrigin(0, 0).setDepth(10);
    this.starGlow = this.scene.add.circle(520, 408, 105, 0x9d67ff, 0.04).setDepth(21);
    this.starShockwave = this.scene.add.circle(520, 408, 70, 0x000000, 0)
      .setStrokeStyle(5, 0xd9b7ff, 0.9).setDepth(22).setVisible(false);
    this.starCore = this.scene.add.image(520, 408, starAssetKey)
      .setDisplaySize(92, 92).setBlendMode(Phaser.BlendModes.ADD).setDepth(23);

    const floor = this.scene.add.graphics().setDepth(20);
    const gridWidth = floorTileSize * floorTileCount;
    const gridStartX = (worldPaneWidth - gridWidth) / 2;
    floor.fillStyle(0x10171d, 0.78).fillRect(0, floorY, worldPaneWidth, 134);
    floor.lineStyle(2, 0x34424c, 0.75)
      .lineBetween(gridStartX, floorY, gridStartX + gridWidth, floorY);
    for (let index = 0; index < floorTileCount; index += 1) {
      const x = gridStartX + index * floorTileSize;
      floor.lineStyle(1, 0x25323b, 0.5)
        .strokeRect(x, floorY, floorTileSize - 1, floorTileSize - 1);
    }

    this.rainLines = this.scene.add.graphics().setDepth(25).setVisible(false);
    this.rainLines.lineStyle(2, 0x82c7e8, 0.35);
    for (let x = 30; x < 900; x += 44) {
      this.rainLines.lineBetween(x, 90 + (x % 110), x - 18, 225 + (x % 110));
    }
    this.scene.add.text(22, 607, "824 M  ·  CRYSTAL VOID APPROACH", {
      fontFamily: "Arial, sans-serif", fontSize: "15px", fontStyle: "bold",
      color: "#a9cadc",
    }).setDepth(30);
    this.contextText = this.scene.add.text(22, 682, "", {
      fontFamily: "Arial, sans-serif", fontSize: "13px", fontStyle: "bold",
      color: "#f1d9ff",
    }).setDepth(30);
    this.scene.add.text(
      22,
      650,
      "Use the review panel: choose, listen, then decide. Nothing auto-wires.",
      { fontFamily: "Arial, sans-serif", fontSize: "12px", color: "#b8c6cf" },
    ).setDepth(30);
  }
}
