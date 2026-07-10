/* global Phaser, LEGACY_MINER_REVIEW */
const CONFIG = LEGACY_MINER_REVIEW;
const CANVAS = { width: 1180, height: 700 };
const CENTER = { x: 590, y: 494 };
const COMPARE = { currentX: 390, candidateX: 790, y: 494 };
const BASE_SCALE = CONFIG.displaySize / CONFIG.frame.frameWidth;
const SPRITE_BASE_SIZE = CONFIG.displaySize;
const AVAILABLE_PACKS = CONFIG.packs ?? {};
const DEFAULT_PACK_ID = CONFIG.defaultPack ?? Object.keys(AVAILABLE_PACKS)[0];
const URL_QUERY = new URLSearchParams(window.location.search);
const IS_SPLIT_HOST = window.__legacyMinerSplitHost === true || (URL_QUERY.get("compare") === "split" && URL_QUERY.get("splitFrame") !== "1");
const PACK_QUERY = URL_QUERY.get("pack");
const ACTIVE_PACK_ID = AVAILABLE_PACKS[PACK_QUERY] ? PACK_QUERY : DEFAULT_PACK_ID;
const ACTIVE_PACK = AVAILABLE_PACKS[ACTIVE_PACK_ID];
const VISUAL_QUERY = (URL_QUERY.get("visual") || "").toLowerCase().trim();
const MESHY_QUERY_OFF = URL_QUERY.get("meshy") === "off" || URL_QUERY.get("meshy") === "0";
const MESHY_QUERY_URL = (URL_QUERY.get("meshUrl") || "").trim();
const DEFAULT_VISUAL_MODES = Object.freeze({
  defaultMode: "off",
  off: Object.freeze({
    label: "off",
    spriteScale: 1,
    swapCurrentToCandidate: false,
    glowTint: 0xffffff,
    glowStrength: 0,
    trailLength: 0,
    outlineAlpha: 0,
    backgroundTop: 0x161616,
    backgroundBottom: 0x101014,
    vignetteStrength: 0,
    grainStrength: 0,
    fxPulseSpeed: 0,
    conceptBackdropEnabled: false,
    outlineTint: 0x8fc9ff,
    trailTint: 0x8fc9ff,
  }),
  swap: Object.freeze({
    label: "swap",
    spriteScale: 1,
    swapCurrentToCandidate: false,
    glowTint: 0x5ac8ff,
    glowStrength: 0,
    trailLength: 0,
    outlineAlpha: 0,
    backgroundTop: 0x161616,
    backgroundBottom: 0x101014,
    vignetteStrength: 0,
    grainStrength: 0,
    fxPulseSpeed: 0,
    conceptBackdropEnabled: false,
    outlineTint: 0x5ac8ff,
    trailTint: 0x5ac8ff,
  }),
  impact: Object.freeze({
    label: "impact",
    spriteScale: 1,
    swapCurrentToCandidate: true,
    glowTint: 0xff8f50,
    glowStrength: 0,
    trailLength: 0,
    outlineAlpha: 0,
    backgroundTop: 0x161616,
    backgroundBottom: 0x101014,
    vignetteStrength: 0,
    grainStrength: 0,
    fxPulseSpeed: 0,
    conceptBackdropEnabled: false,
    outlineTint: 0xff8f50,
    trailTint: 0xff8f50,
  }),
  meshyOrHiggs: Object.freeze({
    label: "meshyOrHiggs",
    spriteScale: 1,
    swapCurrentToCandidate: true,
    glowTint: 0xde8dff,
    glowStrength: 0,
    trailLength: 0,
    outlineAlpha: 0,
    backgroundTop: 0x161616,
    backgroundBottom: 0x101014,
    vignetteStrength: 0,
    grainStrength: 0,
    fxPulseSpeed: 0,
    conceptBackdropEnabled: true,
    outlineTint: 0xde8dff,
    trailTint: 0xde8dff,
    conceptFallback: "../../../sprites/character/character-v8/runtime/legacy-idle-clean-sheet.webp",
  }),
});
const VISUAL_MODES = CONFIG.visualModes ? Object.freeze({ ...DEFAULT_VISUAL_MODES, ...CONFIG.visualModes }) : DEFAULT_VISUAL_MODES;
const VISUAL_SEQUENCE = ["off", "swap", "impact", "meshyOrHiggs"];
const ACTIVE_VISUAL_MODE_ID = resolveVisualMode(VISUAL_QUERY);
const ACTIVE_VISUAL_MODE = getVisualModeConfig(ACTIVE_VISUAL_MODE_ID);

function resolveVisualMode(queryMode) {
  if (MESHY_QUERY_OFF) return "off";
  if (VISUAL_MODES[queryMode]) return queryMode;
  return VISUAL_MODES.defaultMode || "off";
}

function getVisualModeConfig(modeId) {
  return VISUAL_MODES[modeId] || VISUAL_MODES.off;
}

function packCache(pack = ACTIVE_PACK) {
  return pack?.cache || "legacy-miner-review-demo-cache";
}

function packMotionProfileUrl(pack = ACTIVE_PACK) {
  const base = pack?.motionProfileBase || pack?.reviewBase || CONFIG.packs?.candidate?.motionProfileBase;
  const path = pack?.motionProfile || CONFIG.motionProfile;
  return `${base}/${path}?v=${packCache(pack)}`;
}

function resolvePackSheet(pack = ACTIVE_PACK, key) {
  const reviewPath = pack?.reviewSheets?.[key];
  if (reviewPath) return `${pack.reviewBase}/${reviewPath}?v=${packCache(pack)}`;
  if (pack?.candidateFromRuntime && /Candidate$/.test(key)) {
    const runtimeLookup = CONFIG.sheets[key.replace(/Candidate$/, "")];
    if (runtimeLookup) return `${CONFIG.runtimeBase}/${runtimeLookup}?v=${packCache(pack)}`;
  }
  const currentOverride = pack?.currentSheets?.[key];
  if (currentOverride) return `${pack.reviewBase}/${currentOverride}?v=${packCache(pack)}`;
  if (CONFIG.sheets[key]) return `${CONFIG.runtimeBase}/${CONFIG.sheets[key]}?v=${packCache(pack)}`;
  return `${CONFIG.runtimeBase}/${Object.values(CONFIG.sheets)[0]}?v=${packCache(pack)}`;
}

function sheetUrl(key) {
  return resolvePackSheet(ACTIVE_PACK, key);
}

function cacheBust(url, pack = ACTIVE_PACK) {
  if (!url) return null;
  if (url.includes("?v=")) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${packCache(pack)}`;
}

function switchPack(packId) {
  const next = AVAILABLE_PACKS[packId] ? packId : ACTIVE_PACK_ID;
  const url = new URL(window.location.href);
  if (next === DEFAULT_PACK_ID) url.searchParams.delete("pack");
  else url.searchParams.set("pack", next);
  window.location.replace(url.toString());
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

function intToRgb(value) {
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function interpolateColor(a, b, t) {
  const u = {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
  return (u.r << 16) | (u.g << 8) | u.b;
}

function toHex(value) {
  const v = value & 0xFFFFFF;
  return `#${v.toString(16).padStart(6, "0")}`;
}

function wrapFrame(value, total) {
  if (!Number.isFinite(total) || total <= 0) return 0;
  const base = ((value % total) + total) % total;
  return base;
}

class ReviewScene extends Phaser.Scene {
  constructor() {
    super("review");
    this.active = CONFIG.specs[0];
    this.activePackId = ACTIVE_PACK_ID;
    this.activePack = ACTIVE_PACK;
    this.showChecker = false;
    this.showGuide = true;
    this.showBoxes = true;
    this.visualModeId = ACTIVE_VISUAL_MODE_ID;
    this.visualMode = ACTIVE_VISUAL_MODE;
    this.visualPulse = 0;
    this.paused = false;
    this.animTimeScale = 1;
    this.lastFrameIndex = { current: -1, candidate: -1 };
    this.ghosts = [];
    this.lastTrailSpawn = 0;
    this.meshyBackdropKey = null;
    this.maybeEnableTrail = false;
    this.grainTick = 0;
    this.vfxTick = 0;
  }

  preload() {
    const sheetKeys = new Set();
    CONFIG.specs.forEach((spec) => {
      sheetKeys.add(spec.currentSheet);
      if (spec.candidateSheet) sheetKeys.add(spec.candidateSheet);
    });
    sheetKeys.forEach((key) => this.load.spritesheet(key, sheetUrl(key), CONFIG.frame));

    const shouldLoadConcept = this.visualMode.conceptBackdropEnabled || MESHY_QUERY_URL;
    if (shouldLoadConcept) {
      if (MESHY_QUERY_URL) this.load.image("meshyConceptRemote", MESHY_QUERY_URL);
      const localConcept = VISUAL_MODES.meshyOrHiggs?.conceptFallback;
      if (localConcept) this.load.image("meshyConceptFallback", cacheBust(localConcept, this.activePack));
    }

    this.load.json("motionProfile", packMotionProfileUrl(this.activePack));
  }

  create() {
    this.motionProfile = this.cache.json.get("motionProfile") || { animations: {} };
    this.meshyBackdropKey = this.textures.exists("meshyConceptRemote")
      ? "meshyConceptRemote"
      : this.textures.exists("meshyConceptFallback")
        ? "meshyConceptFallback"
        : null;
    this.visualPulse = 0;

    this.cameras.main.setBackgroundColor(toHex(this.visualMode.backgroundBottom));
    this.backgroundGradient = this.add.graphics().setDepth(-6);
    this.checker = this.add.graphics().setDepth(0);
    this.stage = this.add.graphics().setDepth(1);
    this.createAtmosphere();

    this.drawChecker();
    this.drawStage();
    this.createAnimations();
    this.createSprites();
    this.createOverlays();
    this.bindToolbar();
    this.bindControls();
    this.applyVisualMode(this.visualModeId, false);

    window.legacyMinerReviewDemo = { scene: this, play: (id) => this.playSpec(id) };
    this.playSpec(CONFIG.specs[0].id);
  }

  update(time, delta) {
    this.drawGuide();
    this.updateLayerFrames();
    this.updateTrailFx(time, delta);
    this.updateSceneFx(time, delta);
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
    this.currentOutlineSprite = this.add.sprite(CENTER.x, CENTER.y, CONFIG.specs[0].currentSheet, 0);
    this.candidateOutlineSprite = this.add.sprite(CENTER.x, CENTER.y, CONFIG.specs[0].currentSheet, 0);
    this.currentGlowSprite = this.add.sprite(CENTER.x, CENTER.y, CONFIG.specs[0].currentSheet, 0);
    this.candidateGlowSprite = this.add.sprite(CENTER.x, CENTER.y, CONFIG.specs[0].currentSheet, 0);
    this.glowSprites = [this.currentGlowSprite, this.candidateGlowSprite];
    this.outlineSprites = [this.currentOutlineSprite, this.candidateOutlineSprite];

    [this.currentSprite, this.candidateSprite].forEach((sprite) => {
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(5);
      sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.active.repeat === 0) sprite.anims.pause(sprite.anims.currentFrame);
      });
    });

    this.glowSprites.forEach((sprite) => {
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(4);
      sprite.setBlendMode(Phaser.BlendModes.ADD);
      sprite.setVisible(false);
    });

    this.outlineSprites.forEach((sprite) => {
      sprite.setOrigin(0.5, 1);
      sprite.setDepth(3);
      sprite.setBlendMode(Phaser.BlendModes.SCREEN);
      sprite.setVisible(false);
    });

    this.currentLabel = this.add.text(0, 0, "", this.labelStyle()).setOrigin(0.5).setDepth(8);
    this.candidateLabel = this.add.text(0, 0, "", this.labelStyle()).setOrigin(0.5).setDepth(8);
    this.status = this.add
      .text(16, 14, "", { fontFamily: "Consolas, monospace", fontSize: "15px", color: "#f0e8d8" })
      .setDepth(9);
  }

  createAtmosphere() {
    this.vignette = this.add.graphics().setDepth(30).setVisible(false);
    this.grain = this.add.graphics().setDepth(29).setVisible(false);
    this.fog = this.add.graphics().setDepth(21).setVisible(false);
    this.conceptFx = this.add.graphics().setDepth(10).setVisible(false);
    this.conceptOverlay = this.add.graphics().setDepth(9).setVisible(false);
    this.guide = this.add.graphics().setDepth(7);
  }

  createOverlays() {
    if (this.meshyBackdropKey) {
      const backdrop = this.add.image(CANVAS.width / 2, CANVAS.height / 2, this.meshyBackdropKey).setOrigin(0.5).setDepth(-2);
      backdrop.setScale(CANVAS.width / backdrop.width, CANVAS.height / backdrop.height);
      backdrop.setBlendMode(Phaser.BlendModes.SCREEN);
      backdrop.setVisible(false);
      this.meshyBackdrop = backdrop;
    } else {
      this.meshyBackdrop = this.add.graphics().setDepth(-2).setVisible(false);
      this.meshyBackdrop.fillStyle(0x1d2735, 1);
      this.meshyBackdrop.fillRect(0, 0, CANVAS.width, CANVAS.height);
      this.meshyBackdrop.fillStyle(0x2f4358, 0.42);
      this.meshyBackdrop.fillRect(20, 20, CANVAS.width - 40, CANVAS.height - 40);
      this.meshyBackdrop.lineStyle(3, 0xa9bed2, 0.42);
      for (let x = 0; x <= CANVAS.width; x += 28) {
        this.meshyBackdrop.moveTo(x, 0);
        this.meshyBackdrop.lineTo(x, CANVAS.height);
      }
      for (let y = 0; y <= CANVAS.height; y += 28) {
        this.meshyBackdrop.moveTo(0, y);
        this.meshyBackdrop.lineTo(CANVAS.width, y);
      }
      this.meshyBackdrop.strokePath();
      this.meshyBackdrop.setVisible(false);
    }

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
    this.conceptRings = [
      this.add.graphics().setDepth(8),
      this.add.graphics().setDepth(8),
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

  drawBackgroundGradient(topColor = 0x161616, bottomColor = 0x0f1115) {
    const start = intToRgb(topColor);
    const end = intToRgb(bottomColor);
    const bands = 42;
    this.backgroundGradient.clear();
    for (let i = 0; i < bands; i += 1) {
      const t = i / bands;
      const color = interpolateColor(start, end, t);
      const y = Math.round(t * CANVAS.height);
      const h = Math.max(1, Math.round(CANVAS.height / bands));
      this.backgroundGradient.fillStyle(color, 1);
      this.backgroundGradient.fillRect(0, y, CANVAS.width, h);
    }
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
      controls.append(button);
      return button;
    };

    if (Object.keys(AVAILABLE_PACKS).length > 1) {
      const packWrap = document.createElement("span");
      const packLabel = document.createElement("span");
      packLabel.textContent = "Pack:";
      const packSelect = document.createElement("select");
      Object.entries(AVAILABLE_PACKS).forEach(([packId, pack]) => {
        const option = document.createElement("option");
        option.value = packId;
        option.textContent = pack.label || packId;
        option.selected = packId === this.activePackId;
        packSelect.append(option);
      });
      packSelect.addEventListener("change", (event) => switchPack(event.target.value));
      packWrap.style.display = "inline-flex";
      packWrap.style.alignItems = "center";
      packWrap.style.gap = "6px";
      packWrap.style.marginRight = "8px";
      packWrap.append(packLabel, packSelect);
      controls.append(packWrap);
    }

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

    const modeWrap = document.createElement("span");
    const modeLabel = document.createElement("span");
    modeLabel.textContent = "Visual:";
    const modeSelect = document.createElement("select");
    VISUAL_SEQUENCE.forEach((modeId) => {
      const option = document.createElement("option");
      option.value = modeId;
      option.textContent = VISUAL_MODES[modeId]?.label || modeId;
      option.selected = modeId === this.visualModeId;
      modeSelect.append(option);
    });
    modeSelect.addEventListener("change", (event) => this.setVisualMode(event.target.value, true));
    modeWrap.style.display = "inline-flex";
    modeWrap.style.alignItems = "center";
    modeWrap.style.gap = "6px";
    modeWrap.style.marginLeft = "8px";
    modeWrap.append(modeLabel, modeSelect);
    controls.append(modeWrap);
    this.visualModeSelect = modeSelect;

    const speed = document.createElement("input");
    speed.type = "range";
    speed.min = "0.25";
    speed.max = "1.75";
    speed.step = "0.25";
    speed.value = `${this.animTimeScale}`;
    speed.title = "Speed";
    speed.addEventListener("input", () => {
      this.animTimeScale = Number(speed.value);
      if (this.currentSprite?.anims) this.currentSprite.anims.timeScale = this.animTimeScale;
      if (this.candidateSprite?.anims) this.candidateSprite.anims.timeScale = this.animTimeScale;
    });
    controls.appendChild(speed);
  }

  getCurrentAnimationKey(spec, useCurrentSheet = true) {
    const canSwap = this.visualMode?.swapCurrentToCandidate && Boolean(spec.candidateSheet);
    const side = canSwap ? "candidate" : "current";
    return animKey(spec, side);
  }

  playSpec(id) {
    const spec = CONFIG.specs.find((item) => item.id === id) || CONFIG.specs[0];
    const compare = Boolean(spec.candidateSheet);
    this.active = spec;
    this.paused = false;
    this.lastFrameIndex.current = -1;
    this.lastFrameIndex.candidate = -1;

    document.querySelectorAll("button[data-anim]").forEach((button) => {
      button.classList.toggle("active", button.dataset.anim === spec.id);
    });

    const currentKey = this.getCurrentAnimationKey(spec);
    const candidateKey = compare ? animKey(spec, "candidate") : null;
    const currentFrame = currentFrameIndex(this.currentSprite);
    const candidateFrame = currentFrameIndex(this.candidateSprite);

    this.currentSprite.setTexture(spec.currentSheet, 0).setVisible(true).setFlipX(Boolean(spec.currentFlip));
    this.currentSprite.play(currentKey, true, wrapFrame(currentFrame, spec.frames));
    this.currentSprite.anims.timeScale = this.animTimeScale;
    if (this.visualModeId === "off") this.currentSprite.setTint(0xffffff);

    if (compare) {
      this.candidateSprite.setTexture(spec.candidateSheet, 0).setVisible(true).setFlipX(Boolean(spec.candidateFlip));
      this.candidateSprite.play(candidateKey, true, wrapFrame(candidateFrame, spec.frames));
      this.candidateSprite.anims.timeScale = this.animTimeScale;
    } else {
      this.candidateSprite.setVisible(false);
    }

    if (this.paused) {
      this.currentSprite.anims.pause();
      this.candidateSprite.anims.pause();
    }

    const packName = this.activePack?.label || this.activePackId || "default";
    this.status.setText(
      `${spec.label} | ${spec.frames} frames | ${spec.fps} fps | repeat ${spec.repeat} | pack ${packName} | visual ${this.visualMode.label}`,
    );
    this.placeForMode(spec.mode, compare);
    this.applyVisualMode(this.visualModeId, false);
    this.drawGuide();
    this.updateOverlayVisibility();
  }

  setVisualMode(modeId, updateUrl = true) {
    const nextId = resolveVisualMode(modeId);
    this.visualModeId = nextId;
    this.visualMode = getVisualModeConfig(nextId);

    if (updateUrl) {
      const url = new URL(window.location.href);
      if (this.visualModeId === VISUAL_MODES.defaultMode) url.searchParams.delete("visual");
      else url.searchParams.set("visual", this.visualModeId);
      window.history.replaceState({}, "", url.toString());
    }

    if (this.visualModeSelect) this.visualModeSelect.value = this.visualModeId;
    this.lastFrameIndex.current = -1;
    this.lastFrameIndex.candidate = -1;
    this.playSpec(this.active.id);
  }

  applyVisualMode(modeId, preserveQuery = false) {
    this.visualModeId = resolveVisualMode(modeId);
    this.visualMode = getVisualModeConfig(this.visualModeId);

    const cfg = this.visualMode;
    const isConcept = cfg.conceptBackdropEnabled;
    const isImpact = this.visualModeId === "impact" || this.visualModeId === "meshyOrHiggs";

    this.cameras.main.setBackgroundColor(toHex(cfg.backgroundBottom));
    this.drawBackgroundGradient(cfg.backgroundTop, cfg.backgroundBottom);

    this.currentSprite.setTint(0xffffff);
    this.candidateSprite.setTint(0xffffff);
    this.currentGlowSprite.setTint(cfg.glowTint);
    this.candidateGlowSprite.setTint(cfg.glowTint);
    this.currentOutlineSprite.setTint(cfg.outlineTint);
    this.candidateOutlineSprite.setTint(cfg.outlineTint);

    const scale = cfg.spriteScale;
    this.currentSprite.setDisplaySize(SPRITE_BASE_SIZE * scale, SPRITE_BASE_SIZE * scale);
    this.candidateSprite.setDisplaySize(SPRITE_BASE_SIZE * scale, SPRITE_BASE_SIZE * scale);
    this.currentGlowSprite.setDisplaySize(SPRITE_BASE_SIZE * (scale * 1.35), SPRITE_BASE_SIZE * (scale * 1.35));
    this.candidateGlowSprite.setDisplaySize(SPRITE_BASE_SIZE * (scale * 1.35), SPRITE_BASE_SIZE * (scale * 1.35));
    this.currentOutlineSprite.setDisplaySize(SPRITE_BASE_SIZE * (scale * 1.14), SPRITE_BASE_SIZE * (scale * 1.14));
    this.candidateOutlineSprite.setDisplaySize(SPRITE_BASE_SIZE * (scale * 1.14), SPRITE_BASE_SIZE * (scale * 1.14));

    const glowAlpha = cfg.glowStrength;
    this.currentGlowSprite.setAlpha(glowAlpha);
    this.candidateGlowSprite.setAlpha(glowAlpha);
    this.currentOutlineSprite.setAlpha(cfg.outlineAlpha);
    this.candidateOutlineSprite.setAlpha(cfg.outlineAlpha);

    this.meshyBackdrop.setVisible(isConcept);
    if (isConcept) this.meshyBackdrop.setAlpha(cfg.conceptBackdropEnabled ? 0.48 : 0);
    this.conceptOverlay.setVisible(isImpact);
    this.conceptFx.setVisible(isImpact);
    this.vignette.setVisible(cfg.vignetteStrength > 0);
    this.grain.setVisible(cfg.grainStrength > 0);
    this.fog.setVisible(cfg.vignetteStrength > 0 || cfg.grainStrength > 0);

    if (!isImpact) {
      this.conceptFx.clear();
      this.conceptOverlay.clear();
    }
    if (!preserveQuery) {
      this.visualPulse = 0;
    }

    const compare = Boolean(this.active?.candidateSheet);
    this.syncFrameLayers(this.currentSprite, this.currentGlowSprite, this.currentOutlineSprite, true);
    if (compare) this.syncFrameLayers(this.candidateSprite, this.candidateGlowSprite, this.candidateOutlineSprite, false);
    this.updateOverlayVisibility();
  }

  syncFrameLayers(mainSprite, glowSprite, outlineSprite, _isCurrent) {
    glowSprite
      .setTexture(mainSprite.texture.key, mainSprite.frame.name)
      .setPosition(mainSprite.x, mainSprite.y)
      .setFlipX(mainSprite.flipX)
      .setVisible(mainSprite.visible);
    outlineSprite
      .setTexture(mainSprite.texture.key, mainSprite.frame.name)
      .setPosition(mainSprite.x, mainSprite.y)
      .setFlipX(mainSprite.flipX)
      .setVisible(mainSprite.visible);
    if (mainSprite.visible) {
      this.drawConceptRing(mainSprite === this.currentSprite ? 0 : 1, mainSprite.x, mainSprite.y, true);
    }
  }

  updateLayerFrames() {
    if (this.currentSprite?.visible) this.syncFrameLayers(this.currentSprite, this.currentGlowSprite, this.currentOutlineSprite, true);
    if (this.candidateSprite?.visible) this.syncFrameLayers(this.candidateSprite, this.candidateGlowSprite, this.candidateOutlineSprite, false);
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
    const fly = mode === "fly";
    const sideLeft = mode === "side-left";
    const sideRight = mode === "side-right";
    const upSideRight = mode === "up-side-right";

    sprite.setPosition(wall ? x + 28 : x, fall || fly ? 392 : y);

    const labelObject = sprite === this.currentSprite ? this.currentLabel : this.candidateLabel;
    const index = sprite === this.currentSprite ? 0 : 1;
    if (labelObject) labelObject.setText(label).setPosition(sprite.x, 92);
    if (this.glowSprites[index]) this.glowSprites[index].setPosition(sprite.x, sprite.y);
    if (this.outlineSprites[index]) this.outlineSprites[index].setPosition(sprite.x, sprite.y);

    this.hitboxes[index].setPosition(sprite.x, sprite.y - 52);
    this.targetTiles[index].setPosition(
      sideLeft ? sprite.x - 96 : (sideRight || upSideRight) ? sprite.x + 96 : sprite.x,
      mode === "dig-up" ? sprite.y - 144 : upSideRight ? sprite.y - 48 : sprite.y + 48,
    );
    this.wallTiles[index].setPosition(sprite.x + 96, sprite.y - 96);

    this.drawConceptRing(index, sprite.x, sprite.y, sprite.visible);
  }

  drawConceptRing(index, x, y, visible = true) {
    if (!this.conceptRings?.[index]) return;
    const cfg = this.visualMode;
    const ring = this.conceptRings[index];
    ring.clear();
    if (this.visualModeId === "off" || !visible) {
      ring.setVisible(false);
      return;
    }
    ring.setVisible(true);
    ring.lineStyle(3, cfg.outlineTint, cfg.outlineAlpha);
    ring.strokeRoundedRect(x - 58, y - 108, 116, 108, 12);
    ring.lineStyle(2, cfg.outlineTint, Math.max(0.12, cfg.outlineAlpha * 0.6));
    ring.fillStyle(cfg.outlineTint, Math.max(0.03, cfg.outlineAlpha * 0.35));
    ring.fillRect(x - 54, y - 104, 108, 100);
  }

  updateOverlayVisibility() {
    const mode = this.active.mode;
    const compare = Boolean(this.active.candidateSheet);
    const targetVisible = this.showBoxes && ["dig-down", "dig-up", "side-left", "side-right", "up-side-right"].includes(mode);
    const wallVisible = this.showBoxes && mode === "wall";
    this.hitboxes.forEach((box, index) => box.setVisible(this.showBoxes && (index === 0 || compare)));
    this.targetTiles.forEach((tile, index) => tile.setVisible(targetVisible && (index === 0 || compare)));
    this.wallTiles.forEach((tile, index) => tile.setVisible(wallVisible && (index === 0 || compare)));
  }

  updateTrailFx(time, delta) {
    const cfg = this.visualMode;
    const maxTrail = Math.max(0, cfg.trailLength || 0);
    if (maxTrail <= 0) {
      this.clearTrails();
      return;
    }

    const active = this.active;
    const compare = Boolean(active.candidateSheet);
    const currentFrame = currentFrameIndex(this.currentSprite);
    const candidateFrame = currentFrameIndex(this.candidateSprite);

    if (this.currentSprite.visible && currentFrame !== this.lastFrameIndex.current) {
      this.spawnGhost(this.currentSprite, "current", time);
      if (cfg.motionStreak && currentFrame % 3 === 0) this.spawnGhost(this.currentSprite, "current", time, 1.2, 0.8);
      this.lastFrameIndex.current = currentFrame;
    }
    if (compare && this.candidateSprite.visible && candidateFrame !== this.lastFrameIndex.candidate) {
      this.spawnGhost(this.candidateSprite, "candidate", time);
      if (cfg.motionStreak && candidateFrame % 3 === 0) this.spawnGhost(this.candidateSprite, "candidate", time, 1.2, 0.8);
      this.lastFrameIndex.candidate = candidateFrame;
    }

    const keep = [];
    for (let i = this.ghosts.length - 1; i >= 0; i -= 1) {
      const ghost = this.ghosts[i];
      const age = time - ghost.spawnedAt;
      const progress = Math.min(1, age / ghost.life);
      if (progress >= 1) {
        ghost.sprite.destroy();
        continue;
      }
      const alpha = ghost.baseAlpha * (1 - progress);
      const scale = ghost.baseScale * (1 - progress * 0.45);
      ghost.sprite.setAlpha(alpha);
      ghost.sprite.setScale(scale);
      keep.push(ghost);
    }
    this.ghosts = keep;
    if (this.ghosts.length > maxTrail * 4) {
      const extra = this.ghosts.length - (maxTrail * 4);
      const removed = this.ghosts.splice(0, extra);
      removed.forEach((ghost) => ghost.sprite.destroy());
    }
  }

  clearTrails() {
    this.ghosts.forEach((ghost) => ghost.sprite.destroy());
    this.ghosts = [];
    if (this.conceptRings) this.conceptRings.forEach((ring) => ring.clear());
  }

  spawnGhost(sprite, side = "current", time = performance.now(), scaleBoost = 1, lifeScale = 1) {
    if (!sprite.visible) return;
    const cfg = this.visualMode;
    const wave = ((Math.sin((time / 130) + this.lastTrailSpawn) + 1) * 0.5);
    const life = 140 + cfg.trailLength * 24;
    const ghost = this.add
      .sprite(sprite.x, sprite.y, sprite.texture.key, sprite.frame.name)
      .setOrigin(0.5, 1)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(2)
      .setTint(cfg.trailTint || cfg.glowTint)
      .setAlpha((cfg.glowStrength * 0.8 + 0.1) * wave * lifeScale)
      .setScale(cfg.spriteScale * (1.05 + (cfg.trailLength * 0.005)) * scaleBoost, cfg.spriteScale * (1.05 + (cfg.trailLength * 0.005)) * scaleBoost)
      .setFlipX(sprite.flipX);

    this.ghosts.push({ sprite: ghost, spawnedAt: time, life, baseAlpha: ghost.alpha, baseScale: cfg.spriteScale * (1.05 + (cfg.trailLength * 0.006)) * scaleBoost });
    this.lastTrailSpawn = time;
  }

  updateSceneFx(time, delta) {
    const cfg = this.visualMode;
    this.drawVignette(cfg, time, delta);
    this.applyConceptPulse(cfg, time);
    this.drawGrain(cfg, time, delta);
  }

  drawVignette(cfg, time, delta = 16) {
    if (cfg.vignetteStrength <= 0 && this.visualModeId === "off") {
      this.vignette.clear();
      this.fog.clear();
      this.vignette.setVisible(false);
      this.fog.setVisible(false);
      return;
    }
    this.vignette.setVisible(true);
    this.fog.setVisible(true);
    const base = Math.min(0.55, cfg.vignetteStrength || 0);
    const wave = (Math.sin((this.visualPulse * Math.PI * 2) + (time / 1000) * (cfg.fxPulseSpeed || 0.08) + (delta / 16) * 0.1) + 1) * 0.5;
    this.vignette.clear();
    this.fog.clear();
    for (let i = 0; i < 16; i += 1) {
      const t = (i / 15) ** 1.7;
      const alpha = base * (0.08 + 0.18 * (1 - t) * (0.75 + 0.25 * wave));
      const inset = Math.round(i * 16);
      this.vignette.fillStyle(0x000000, alpha);
      this.vignette.fillRect(inset, inset, CANVAS.width - inset * 2, CANVAS.height - inset * 2);
    }
    this.fog.fillStyle(0xffffff, Math.min(0.09, base * 0.16));
    this.fog.fillRect(0, 272 + Math.sin(this.visualPulse * Math.PI * 2) * 20, CANVAS.width, 180);
  }

  drawGrain(cfg, time, delta = 16) {
    this.grainTick = (this.grainTick + delta) % 40;
    if (cfg.grainStrength <= 0 || this.grainTick < delta || this.visualModeId === "off") {
      this.grain.clear().setVisible(false);
      return;
    }
    this.grain.setVisible(true);
    this.grain.clear();
    this.grain.fillStyle(0xffffff, Math.min(0.1, (cfg.grainStrength || 0) * 0.14));
    const points = Math.max(20, Math.floor(cfg.grainStrength * 140));
    for (let i = 0; i < points; i += 1) {
      const x = Math.floor((Math.sin(time * 0.002 + i * 0.27) * 0.5 + 0.5) * CANVAS.width);
      const y = Math.floor((Math.cos(time * 0.0019 + i * 0.37) * 0.5 + 0.5) * CANVAS.height);
      const s = ((Math.sin(i * 3.1 + time * 0.003) + 1) * 0.5) * 2 + 1;
      this.grain.fillRect(x, y, s, s);
    }
  }

  applyConceptPulse(cfg, time = 0) {
    const hasConceptFx = this.visualModeId === "impact" || this.visualModeId === "meshyOrHiggs";
    if (!hasConceptFx || !cfg.fxPulseSpeed) {
      this.conceptFx.clear().setVisible(false);
      this.conceptOverlay.clear().setVisible(false);
      return;
    }
    const wave = (Math.sin(this.visualPulse + time * 0.001) + 1) * 0.5;
    this.visualPulse = (this.visualPulse + 0.016 * 60 * cfg.fxPulseSpeed) % 1;
    const pulse = 0.22 + wave * 0.14;
    this.conceptOverlay.setVisible(true).clear();
    this.conceptFx.setVisible(true).clear();
    this.conceptOverlay.fillStyle(0x0f1a35, 0.64 * pulse);
    this.conceptOverlay.fillRect(0, 0, CANVAS.width, CANVAS.height);
    this.conceptOverlay.lineStyle(1, 0x7de3ff, 0.2 + wave * 0.16);
    for (let y = 0; y <= CANVAS.height; y += 16) {
      this.conceptOverlay.moveTo(0, y);
      this.conceptOverlay.lineTo(CANVAS.width, y);
    }
    for (let x = 0; x <= CANVAS.width; x += 16) {
      this.conceptOverlay.moveTo(x, 0);
      this.conceptOverlay.lineTo(x, CANVAS.height);
    }
    this.conceptOverlay.strokePath();

    this.conceptFx.fillStyle(this.visualModeId === "meshyOrHiggs" ? 0x7346ff : 0xd77a3d, 0.16 * pulse);
    this.conceptFx.fillRect(40, 300, 1100, 240);
    this.conceptFx.lineStyle(2, 0xb6e5ff, 0.2 + wave * 0.15);
    for (let i = 0; i < 12; i += 1) {
      const y = 280 + i * 22 + Math.sin((this.visualPulse * 6.4) + i) * 5;
      this.conceptFx.lineBetween(10 + i * 12, y, CANVAS.width - 10 - i * 10, y + 18);
    }
    this.conceptFx.lineStyle(2, this.visualModeId === "meshyOrHiggs" ? 0x9be6ff : 0xf4bf7f, 0.5);
    this.conceptFx.beginPath();
    this.conceptFx.moveTo(40, 620);
    this.conceptFx.lineTo(1140, 620);
    this.conceptFx.strokePath();
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
      this.lastFrameIndex.current = -1;
      this.lastFrameIndex.candidate = -1;
    });
    this.drawGuide();
    this.updateLayerFrames();
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
    const gx = sprite.x + (data.cx - 170) * BASE_SCALE * flip;
    const gy = sprite.y + (data.cy - 339) * BASE_SCALE;
    this.guide.lineStyle(2, 0x6bdcff, 0.7);
    this.guide.strokeEllipse(gx, gy, data.w * BASE_SCALE, data.h * BASE_SCALE);
    this.guide.lineStyle(3, 0xffd166, 0.8);
    this.guide.lineBetween(gx, gy, gx + data.reachX * BASE_SCALE * flip, gy + data.reachY * BASE_SCALE);
    this.guide.lineStyle(1, 0xff6b6b, 0.9);
    this.guide.lineBetween(sprite.x - 78, sprite.y, sprite.x + 78, sprite.y);
  }
}

if (!IS_SPLIT_HOST) {
  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: CANVAS.width,
    height: CANVAS.height,
    pixelArt: false,
    backgroundColor: toHex(ACTIVE_VISUAL_MODE?.backgroundBottom || 0x161616),
    scene: [ReviewScene],
  });
}
