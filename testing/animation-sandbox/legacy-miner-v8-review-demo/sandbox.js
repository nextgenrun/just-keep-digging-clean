/* global Phaser, LEGACY_MINER_REVIEW */
const CONFIG = LEGACY_MINER_REVIEW;
const CANVAS = { width: 1180, height: 700 };
const CENTER = { x: 590, y: 494 };
const COMPARE = { currentX: 390, candidateX: 790, y: 494 };
const SCALE = CONFIG.displaySize / CONFIG.frame.frameWidth;

function sheetUrl(key) {
  const reviewPath = CONFIG.reviewSheets[key];
  const path = reviewPath ? `${CONFIG.reviewBase}/${reviewPath}` : `${CONFIG.runtimeBase}/${CONFIG.sheets[key]}`;
  return `${path}?v=${CONFIG.cache}`;
}

function animKey(spec, side) {
  return `${spec.id}-${side}`;
}

function currentFrameIndex(sprite) {
  const frame = sprite?.anims?.currentFrame;
  if (frame) return Math.max(0, frame.index - 1);
  const raw = Number(sprite?.frame?.name ?? 0);
  return Number.isFinite(raw) ? raw : 0;
}

class ReviewScene extends Phaser.Scene {
  constructor() {
    super("review");
    this.active = CONFIG.specs[0];
    this.showChecker = false;
    this.showGuide = true;
    this.showBoxes = true;
    this.paused = false;
  }

  preload() {
    const sheetKeys = new Set();
    CONFIG.specs.forEach((spec) => {
      sheetKeys.add(spec.currentSheet);
      if (spec.candidateSheet) sheetKeys.add(spec.candidateSheet);
    });
    sheetKeys.forEach((key) => this.load.spritesheet(key, sheetUrl(key), CONFIG.frame));
    this.load.json("motionProfile", `${CONFIG.reviewBase}/${CONFIG.motionProfile}?v=${CONFIG.cache}`);
  }

  create() {
    this.motionProfile = this.cache.json.get("motionProfile") || { animations: {} };
    this.cameras.main.setBackgroundColor("#161616");
    this.checker = this.add.graphics().setDepth(0);
    this.stage = this.add.graphics().setDepth(1);
    this.guide = this.add.graphics().setDepth(7);
    this.drawChecker();
    this.drawStage();
    this.createAnimations();
    this.createSprites();
    this.createOverlays();
    this.bindToolbar();
    this.bindControls();
    window.legacyMinerReviewDemo = { scene: this, play: (id) => this.playSpec(id) };
    this.playSpec(CONFIG.specs[0].id);
  }

  update() {
    this.drawGuide();
  }

  createAnimations() {
    CONFIG.specs.forEach((spec) => {
      this.anims.create({
        key: animKey(spec, "current"),
        frames: this.anims.generateFrameNumbers(spec.currentSheet, { start: 0, end: spec.frames - 1 }),
        frameRate: spec.fps,
        repeat: spec.repeat,
      });
      if (spec.candidateSheet) {
        this.anims.create({
          key: animKey(spec, "candidate"),
          frames: this.anims.generateFrameNumbers(spec.candidateSheet, { start: 0, end: spec.frames - 1 }),
          frameRate: spec.fps,
          repeat: spec.repeat,
        });
      }
    });
  }

  createSprites() {
    this.currentSprite = this.add.sprite(CENTER.x, CENTER.y, CONFIG.specs[0].currentSheet, 0);
    this.candidateSprite = this.add.sprite(CENTER.x, CENTER.y, CONFIG.specs[0].currentSheet, 0);
    [this.currentSprite, this.candidateSprite].forEach((sprite) => {
      sprite.setOrigin(0.5, 1);
      sprite.setDisplaySize(CONFIG.displaySize, CONFIG.displaySize);
      sprite.setDepth(5);
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.active.repeat === 0) sprite.anims.pause(sprite.anims.currentFrame);
      });
    });
    this.currentLabel = this.add.text(0, 0, "", this.labelStyle()).setOrigin(0.5).setDepth(8);
    this.candidateLabel = this.add.text(0, 0, "", this.labelStyle()).setOrigin(0.5).setDepth(8);
    this.status = this.add.text(16, 14, "", { fontFamily: "Consolas, monospace", fontSize: "15px", color: "#f0e8d8" }).setDepth(9);
  }

  createOverlays() {
    this.hitboxes = [
      this.add.rectangle(0, 0, 52, 104).setDepth(4),
      this.add.rectangle(0, 0, 52, 104).setDepth(4),
    ];
    this.targetTiles = [
      this.add.rectangle(0, 0, 96, 96).setDepth(2),
      this.add.rectangle(0, 0, 96, 96).setDepth(2),
    ];
    this.wallTiles = [
      this.add.rectangle(0, 0, 96, 192).setDepth(2),
      this.add.rectangle(0, 0, 96, 192).setDepth(2),
    ];
    this.hitboxes.forEach((box) => box.setStrokeStyle(2, 0x80d7ff, 0.9).setFillStyle(0x80d7ff, 0.08));
    this.targetTiles.forEach((tile) => tile.setStrokeStyle(3, 0xffc857, 0.85).setFillStyle(0xffc857, 0.06));
    this.wallTiles.forEach((tile) => tile.setStrokeStyle(3, 0xa98255, 0.9).setFillStyle(0x4e3624, 0.65));
  }

  labelStyle() {
    return { fontFamily: "Consolas, monospace", fontSize: "14px", color: "#f0e8d8", backgroundColor: "#1f1f1f", padding: { x: 8, y: 4 } };
  }

  drawChecker() {
    this.checker.clear();
    for (let y = 0; y < CANVAS.height; y += 24) {
      for (let x = 0; x < CANVAS.width; x += 24) {
        this.checker.fillStyle(((x / 24 + y / 24) % 2 === 0) ? 0x252525 : 0x3b3b3b, 1);
        this.checker.fillRect(x, y, 24, 24);
      }
    }
    this.checker.setVisible(this.showChecker);
  }

  drawStage() {
    this.stage.clear();
    this.stage.lineStyle(1, 0x303030, 1);
    for (let x = 40; x <= 1140; x += 96) this.stage.lineBetween(x, 92, x, 650);
    for (let y = 110; y <= 650; y += 96) this.stage.lineBetween(40, y, 1140, y);
    this.stage.fillStyle(0x28231d, 1);
    this.stage.fillRect(40, 494, 1100, 96);
    this.stage.lineStyle(3, 0x665038, 1);
    this.stage.strokeRect(40, 494, 1100, 96);
  }

  bindToolbar() {
    const toolbar = document.getElementById("toolbar");
    toolbar.innerHTML = "";
    CONFIG.specs.forEach((spec) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = spec.label;
      button.dataset.anim = spec.id;
      button.addEventListener("click", () => this.playSpec(spec.id));
      toolbar.appendChild(button);
    });
  }

  bindControls() {
    const controls = document.getElementById("controls");
    const addButton = (label, handler) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.addEventListener("click", handler);
      controls.appendChild(button);
    };
    addButton("Restart", () => this.playSpec(this.active.id));
    addButton("Pause", () => this.togglePause());
    addButton("Step -", () => this.stepFrame(-1));
    addButton("Step +", () => this.stepFrame(1));
    addButton("Black/Checker", () => {
      this.showChecker = !this.showChecker;
      this.checker.setVisible(this.showChecker);
    });
    addButton("Guide", () => {
      this.showGuide = !this.showGuide;
      this.drawGuide();
    });
    addButton("Boxes", () => {
      this.showBoxes = !this.showBoxes;
      this.updateOverlayVisibility();
    });
    const speed = document.createElement("input");
    speed.type = "range";
    speed.min = "0.25";
    speed.max = "1.75";
    speed.step = "0.25";
    speed.value = "1";
    speed.title = "Speed";
    speed.addEventListener("input", () => {
      this.currentSprite.anims.timeScale = Number(speed.value);
      this.candidateSprite.anims.timeScale = Number(speed.value);
    });
    controls.appendChild(speed);
  }

  playSpec(id) {
    const spec = CONFIG.specs.find((item) => item.id === id) || CONFIG.specs[0];
    const compare = Boolean(spec.candidateSheet);
    this.active = spec;
    this.paused = false;
    document.querySelectorAll("button[data-anim]").forEach((button) => {
      button.classList.toggle("active", button.dataset.anim === spec.id);
    });
    this.currentSprite.setVisible(true).setTexture(spec.currentSheet, 0);
    this.candidateSprite.setVisible(compare).setTexture(spec.candidateSheet || spec.currentSheet, 0);
    this.currentSprite.setFlipX(Boolean(spec.currentFlip));
    this.candidateSprite.setFlipX(Boolean(spec.candidateFlip));
    this.placeForMode(spec.mode, compare);
    this.currentSprite.play(animKey(spec, "current"), true);
    if (compare) this.candidateSprite.play(animKey(spec, "candidate"), true);
    this.status.setText(`${spec.label} | ${spec.frames} frames | ${spec.fps} fps | repeat ${spec.repeat}`);
  }

  placeForMode(mode, compare) {
    const currentX = compare ? COMPARE.currentX : CENTER.x;
    const candidateX = compare ? COMPARE.candidateX : CENTER.x;
    this.placeSprite(this.currentSprite, currentX, COMPARE.y, mode, this.active.currentLabel || "current");
    this.placeSprite(this.candidateSprite, candidateX, COMPARE.y, mode, this.active.candidateLabel || "candidate");
    this.candidateLabel.setVisible(compare);
    this.updateOverlayVisibility();
  }

  placeSprite(sprite, x, y, mode, label) {
    const wall = mode === "wall";
    const fall = mode === "fall";
    const sideLeft = mode === "side-left";
    const sideRight = mode === "side-right";
    sprite.setPosition(wall ? x + 28 : x, fall ? 392 : y);
    const labelObject = sprite === this.currentSprite ? this.currentLabel : this.candidateLabel;
    labelObject.setText(label).setPosition(sprite.x, 92);
    const index = sprite === this.currentSprite ? 0 : 1;
    this.hitboxes[index].setPosition(sprite.x, sprite.y - 52);
    this.targetTiles[index].setPosition(sideLeft ? sprite.x - 96 : sideRight ? sprite.x + 96 : sprite.x, mode === "dig-up" ? sprite.y - 144 : sprite.y + 48);
    this.wallTiles[index].setPosition(sprite.x + 96, sprite.y - 96);
  }

  updateOverlayVisibility() {
    const mode = this.active.mode;
    const compare = Boolean(this.active.candidateSheet);
    const targetVisible = this.showBoxes && ["dig-down", "dig-up", "side-left", "side-right"].includes(mode);
    const wallVisible = this.showBoxes && mode === "wall";
    this.hitboxes.forEach((box, index) => box.setVisible(this.showBoxes && (index === 0 || compare)));
    this.targetTiles.forEach((tile, index) => tile.setVisible(targetVisible && (index === 0 || compare)));
    this.wallTiles.forEach((tile, index) => tile.setVisible(wallVisible && (index === 0 || compare)));
  }

  togglePause() {
    this.paused = !this.paused;
    [this.currentSprite, this.candidateSprite].forEach((sprite) => {
      if (!sprite.visible) return;
      if (this.paused) sprite.anims.pause();
      else sprite.anims.resume();
    });
  }

  stepFrame(delta) {
    this.paused = true;
    [this.currentSprite, this.candidateSprite].forEach((sprite) => {
      if (!sprite.visible) return;
      const next = Phaser.Math.Wrap(currentFrameIndex(sprite) + delta, 0, this.active.frames);
      sprite.anims.pause();
      sprite.setFrame(next);
    });
    this.drawGuide();
  }

  drawGuide() {
    this.guide.clear();
    if (!this.showGuide || !this.active.guide) return;
    const profile = this.motionProfile.animations?.[this.active.guide];
    if (!profile?.frames?.length) return;
    this.drawGuideFor(this.currentSprite, profile);
    if (this.candidateSprite.visible) this.drawGuideFor(this.candidateSprite, profile);
  }

  drawGuideFor(sprite, profile) {
    const data = profile.frames[Math.min(currentFrameIndex(sprite), profile.frames.length - 1)];
    const flip = sprite.flipX ? -1 : 1;
    const gx = sprite.x + (data.cx - 170) * SCALE * flip;
    const gy = sprite.y + (data.cy - 339) * SCALE;
    this.guide.lineStyle(2, 0x6bdcff, 0.7);
    this.guide.strokeEllipse(gx, gy, data.w * SCALE, data.h * SCALE);
    this.guide.lineStyle(3, 0xffd166, 0.8);
    this.guide.lineBetween(gx, gy, gx + data.reachX * SCALE * flip, gy + data.reachY * SCALE);
    this.guide.lineStyle(1, 0xff6b6b, 0.9);
    this.guide.lineBetween(sprite.x - 78, sprite.y, sprite.x + 78, sprite.y);
  }
}

new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: CANVAS.width, height: CANVAS.height, pixelArt: false, backgroundColor: "#161616", scene: [ReviewScene] });
