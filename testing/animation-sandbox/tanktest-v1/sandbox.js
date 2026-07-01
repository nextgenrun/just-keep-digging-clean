/**
 * Tank Test V1
 * Standalone Phaser scene for validating one-tile tank movement and drill feel.
 */
/* global Phaser */

const TILE_SIZE = 94;
const VIEW_W = 1280;
const VIEW_H = 720;
const WORLD_COLS = 16;
const WORLD_ROWS = 9;

const ASSET_BASE = "../../../sprites/character/tank-v1/runtime";
const LIVING_DRILL_ASSET_BASE = "../../../sprites/character/living-drill-v1/runtime";
const PICKAXE_MINER_ASSET_BASE = "../../../sprites/character/pickaxe-miner-v1/runtime";

const BODY_SIZE = TILE_SIZE;
const MOVE_SPEED = 150;
const FLY_SPEED = 190;
const GRAVITY = 1450;
const MAX_FALL = 1000;

const DRILL_PIVOT = { x: 84, y: 43 };
const DRILL_REST = 18;
const DRILL_MAX = 54;
const DRILL_PENETRATION = 36;
const CENTER_BORE_X = BODY_SIZE * 0.5;
const CENTER_BORE_TOP_Y = 18;
const CENTER_BORE_BOTTOM_Y = 91;
const CENTER_BORE_EJECT_PROGRESS = 0.28;
const LIVING_DRILL_BITE_MAX = 34;
const LIVING_DRILL_COMMIT_DISTANCE = TILE_SIZE;
const LIVING_DRILL_VISUAL_SCALE = 1.88;
const DIG_DURATION = 0.9;
const BREAK_PROGRESS = 0.68;
const HIT_EPS = 0.001;

const TILE = Object.freeze({
  AIR: 0,
  DIRT: 1,
  STONE: 2,
  FLOOR: 3,
  BEDROCK: 4,
});

const DIG_DIRECTIONS = Object.freeze({
  right: Object.freeze({ x: 1, y: 0, name: "right" }),
  left: Object.freeze({ x: -1, y: 0, name: "left" }),
  up: Object.freeze({ x: 0, y: -1, name: "up" }),
  down: Object.freeze({ x: 0, y: 1, name: "down" }),
});

const CHARACTER_MODES = Object.freeze({
  tank: "tank",
  drillHead: "drillHead",
  pickaxeMiner: "pickaxeMiner",
  arcCore: "arcCore",
  wormholeMaw: "wormholeMaw",
});

const PHASES = [
  { id: "brace", max: 0.12 },
  { id: "open", max: 0.22 },
  { id: "contact", max: 0.34 },
  { id: "penetrate", max: 0.58 },
  { id: "fracture", max: 0.72 },
  { id: "break", max: 0.78 },
  { id: "recoil", max: 1.01 },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * clamp(t, 0, 1);
}

function easeOutCubic(t) {
  const p = 1 - clamp(t, 0, 1);
  return 1 - p * p * p;
}

function phaseFor(progress) {
  for (let index = 0; index < PHASES.length; index += 1) {
    if (progress < PHASES[index].max) return PHASES[index].id;
  }
  return "idle";
}

function directionCopy(direction) {
  return {
    x: direction.x,
    y: direction.y,
    name: direction.name || directionName(direction),
  };
}

function directionName(direction) {
  if (direction.y < 0) return "up";
  if (direction.y > 0) return "down";
  return direction.x < 0 ? "left" : "right";
}

function perpendicular(direction) {
  return { x: -direction.y, y: direction.x };
}

function dot(ax, ay, bx, by) {
  return ax * bx + ay * by;
}

function isVerticalDirection(direction) {
  return direction.y !== 0;
}

function isSideDirection(direction) {
  return direction.x !== 0;
}

function isEnergyConceptMode(mode) {
  return mode === CHARACTER_MODES.arcCore || mode === CHARACTER_MODES.wormholeMaw;
}

function tileName(type) {
  switch (type) {
    case TILE.AIR: return "air";
    case TILE.DIRT: return "dirt";
    case TILE.STONE: return "stone";
    case TILE.FLOOR: return "floor";
    case TILE.BEDROCK: return "bedrock";
    default: return "unknown";
  }
}

function makeWorld() {
  const grid = [];
  for (let row = 0; row < WORLD_ROWS; row += 1) {
    grid[row] = [];
    for (let col = 0; col < WORLD_COLS; col += 1) {
      if (row === WORLD_ROWS - 1) grid[row][col] = TILE.BEDROCK;
      else if (row === WORLD_ROWS - 2) grid[row][col] = TILE.FLOOR;
      else grid[row][col] = TILE.AIR;
    }
  }

  for (let col = 6; col <= 10; col += 1) {
    grid[6][col] = col % 2 === 0 ? TILE.DIRT : TILE.STONE;
  }
  grid[5][8] = TILE.DIRT;
  grid[5][9] = TILE.STONE;
  grid[5][5] = TILE.STONE;
  grid[4][12] = TILE.DIRT;
  grid[5][12] = TILE.DIRT;
  grid[6][12] = TILE.STONE;
  return grid;
}

class TankBody {
  constructor(tileX, tileY) {
    this.x = tileX * TILE_SIZE;
    this.y = tileY * TILE_SIZE;
    this.w = BODY_SIZE;
    this.h = BODY_SIZE;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }

  reset(tileX, tileY) {
    this.x = tileX * TILE_SIZE;
    this.y = tileY * TILE_SIZE;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }

  get tileX() {
    return Math.floor((this.x + this.w * 0.5) / TILE_SIZE);
  }

  get tileY() {
    return Math.floor((this.y + this.h * 0.5) / TILE_SIZE);
  }
}

const TankScene = new Phaser.Class({
  Extends: Phaser.Scene,

  initialize: function TankScene() {
    Phaser.Scene.call(this, { key: "TankScene" });
  },

  preload: function () {
    this.load.spritesheet("tank_idle", `${ASSET_BASE}/tank-idle-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("tank_drive", `${ASSET_BASE}/tank-drive-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("tank_fly", `${ASSET_BASE}/tank-fly-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("tank_dig", `${ASSET_BASE}/tank-dig-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("tank_drill", `${ASSET_BASE}/tank-drill-sheet.png`, {
      frameWidth: 96,
      frameHeight: 44,
    });
    this.load.spritesheet("living_drill_idle", `${LIVING_DRILL_ASSET_BASE}/living-drill-idle-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("living_drill_dig", `${LIVING_DRILL_ASSET_BASE}/living-drill-dig-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("living_drill_fly", `${LIVING_DRILL_ASSET_BASE}/living-drill-fly-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("pickaxe_miner_idle", `${PICKAXE_MINER_ASSET_BASE}/pickaxe-miner-idle-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("pickaxe_miner_walk", `${PICKAXE_MINER_ASSET_BASE}/pickaxe-miner-walk-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
    this.load.spritesheet("pickaxe_miner_dig", `${PICKAXE_MINER_ASSET_BASE}/pickaxe-miner-dig-sheet.png`, {
      frameWidth: 94,
      frameHeight: 94,
    });
  },

  create: function () {
    this.world = makeWorld();
    this.body = new TankBody(5, 6);
    this.characterMode = CHARACTER_MODES.tank;
    this.facing = 1;
    this.digAim = DIG_DIRECTIONS.right;
    this.flyMode = false;
    this.activeDig = null;
    this.recoilX = 0;
    this.recoilY = 0;
    this.livingDrillBiteVisual = 0;
    this.livingDrillCommitPending = null;
    this.drillSpinFrame = 0;
    this.particles = [];
    this.stepOnce = false;

    this.debug = {
      bodyBox: true,
      anchor: true,
      chassisBounds: false,
      drillPivot: true,
      drillTip: true,
      targetTile: true,
      occluder: false,
      slowMotion: false,
      paused: false,
    };

    this.worldGfx = this.add.graphics().setDepth(0);
    this.chassis = this.add.sprite(this.body.x, this.body.y, "tank_idle", 0);
    this.chassis.setOrigin(0, 0).setDepth(10);
    this.livingDrillSprite = this.add.sprite(this.body.x + BODY_SIZE * 0.5, this.body.y + BODY_SIZE * 0.5, "living_drill_idle", 0);
    this.livingDrillSprite.setOrigin(0.5, 0.5).setDepth(10).setVisible(false);
    this.pickaxeMinerSprite = this.add.sprite(this.body.x + BODY_SIZE * 0.5, this.body.y + BODY_SIZE * 0.5, "pickaxe_miner_idle", 0);
    this.pickaxeMinerSprite.setOrigin(0.5, 0.5).setDepth(10).setVisible(false);
    this.playerGfx = this.add.graphics().setDepth(10);
    this.drillGfx = this.add.graphics().setDepth(10.5);
    this.occluderGfx = this.add.graphics().setDepth(11);
    this.fxGfx = this.add.graphics().setDepth(12);
    this.debugGfx = this.add.graphics().setDepth(50);

    this.createAnimations();
    this.createInput();
    this.createPanel();
    this.drawAll();

    this.infoEl = document.getElementById("info-overlay");
    this.cameras.main.setBounds(0, 0, WORLD_COLS * TILE_SIZE, WORLD_ROWS * TILE_SIZE);
    this.cameras.main.setBackgroundColor("#13191d");
  },

  createAnimations: function () {
    const create = (key, sheet, frameCount, fps) => {
      if (this.anims.exists(key)) return;
      this.anims.create({
        key,
        frames: Array.from({ length: frameCount }, (_, frame) => ({ key: sheet, frame })),
        frameRate: fps,
        repeat: -1,
      });
    };

    create("tank-idle", "tank_idle", 6, 6);
    create("tank-drive", "tank_drive", 8, 12);
    create("tank-fly", "tank_fly", 6, 8);
    create("tank-dig", "tank_dig", 6, 10);
    create("living-drill-idle", "living_drill_idle", 8, 7);
    create("living-drill-dig", "living_drill_dig", 10, 14);
    create("living-drill-fly", "living_drill_fly", 8, 9);
    create("pickaxe-miner-idle", "pickaxe_miner_idle", 6, 6);
    create("pickaxe-miner-walk", "pickaxe_miner_walk", 8, 10);
    create("pickaxe-miner-dig", "pickaxe_miner_dig", 8, 12);
  },

  createInput: function () {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.keyPeriod = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.PERIOD);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
  },

  createPanel: function () {
    const panel = document.getElementById("control-panel");
    if (!panel) return;
    panel.innerHTML = "";

    const addButton = (label, handler, wide) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      if (wide) btn.classList.add("wide");
      btn.addEventListener("click", handler);
      panel.appendChild(btn);
      return btn;
    };

    addButton("Idle", () => this.chassis.play("tank-idle", true));
    addButton("Drive", () => this.chassis.play("tank-drive", true));
    addButton("Fly", () => this.chassis.play("tank-fly", true));
    addButton("Tank Rig", () => {
      this.characterMode = CHARACTER_MODES.tank;
      this.drawAll();
    });
    addButton("Drill Head", () => {
      this.characterMode = CHARACTER_MODES.drillHead;
      this.drawAll();
    });
    addButton("Pickaxe Miner", () => {
      this.characterMode = CHARACTER_MODES.pickaxeMiner;
      this.drawAll();
    });
    addButton("Arc Core", () => {
      this.characterMode = CHARACTER_MODES.arcCore;
      this.drawAll();
    });
    addButton("Wormhole", () => {
      this.characterMode = CHARACTER_MODES.wormholeMaw;
      this.drawAll();
    });
    addButton("Drill", () => this.startDig());
    addButton("Dig Up", () => this.startDig(DIG_DIRECTIONS.up));
    addButton("Dig Down", () => this.startDig(DIG_DIRECTIONS.down));
    addButton("Face Left", () => {
      this.facing = -1;
      this.digAim = DIG_DIRECTIONS.left;
    });
    addButton("Face Right", () => {
      this.facing = 1;
      this.digAim = DIG_DIRECTIONS.right;
    });
    addButton("Reset", () => this.resetWorld(), true);

    const toggle = (label, key) => {
      const btn = addButton(label, () => {
        this.debug[key] = !this.debug[key];
        btn.classList.toggle("active", this.debug[key]);
        this.drawAll();
      });
      btn.classList.toggle("active", this.debug[key]);
    };

    toggle("Body Box", "bodyBox");
    toggle("Anchor", "anchor");
    toggle("Bounds", "chassisBounds");
    toggle("Pivot", "drillPivot");
    toggle("Tip", "drillTip");
    toggle("Target", "targetTile");
    toggle("Occluder", "occluder");
    toggle("Slow Mo", "slowMotion");
    toggle("Pause", "paused");
    addButton("Step", () => { this.stepOnce = true; });
  },

  resetWorld: function () {
    this.world = makeWorld();
    this.body.reset(5, 6);
    this.characterMode = this.characterMode || CHARACTER_MODES.tank;
    this.facing = 1;
    this.digAim = DIG_DIRECTIONS.right;
    this.activeDig = null;
    this.recoilX = 0;
    this.recoilY = 0;
    this.livingDrillBiteVisual = 0;
    this.livingDrillCommitPending = null;
    this.particles = [];
    this.chassis.play("tank-idle", true);
    this.drawAll();
  },

  update: function (time, deltaMs) {
    let dt = Math.min(deltaMs / 1000, 0.05);
    if (Phaser.Input.Keyboard.JustDown(this.keySpace)) this.debug.paused = !this.debug.paused;
    if (Phaser.Input.Keyboard.JustDown(this.keyPeriod)) this.stepOnce = true;
    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.resetWorld();
    if (this.debug.paused) {
      if (!this.stepOnce) dt = 0;
      else dt = 1 / 30;
      this.stepOnce = false;
    }
    if (this.debug.slowMotion) dt *= 0.25;

    if (dt > 0) {
      this.handleMovement(dt);
      this.updateDig(dt);
      this.updateParticles(dt);
    }

    this.updateChassisAnimation();
    this.drawAll();
    this.updateInfo(dt);
  },

  handleMovement: function (dt) {
    const left = this.cursors.left.isDown || this.keyA.isDown;
    const right = this.cursors.right.isDown || this.keyD.isDown;
    const up = this.cursors.up.isDown || this.keyW.isDown;
    const down = this.cursors.down.isDown || this.keyS.isDown;

    this.flyMode = this.keyShift.isDown;

    if (!this.flyMode && !this.activeDig) {
      if (Phaser.Input.Keyboard.JustDown(this.keyW) || Phaser.Input.Keyboard.JustDown(this.cursors.up)) {
        this.digAim = DIG_DIRECTIONS.up;
      } else if (Phaser.Input.Keyboard.JustDown(this.keyS) || Phaser.Input.Keyboard.JustDown(this.cursors.down)) {
        this.digAim = DIG_DIRECTIONS.down;
      }
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.startDig();
    }

    this.body.vx = 0;
    if (!this.activeDig) {
      if (left) {
        this.body.vx = -MOVE_SPEED;
        this.facing = -1;
        this.digAim = DIG_DIRECTIONS.left;
      } else if (right) {
        this.body.vx = MOVE_SPEED;
        this.facing = 1;
        this.digAim = DIG_DIRECTIONS.right;
      }
    }

    if (this.activeDig) {
      this.body.vx = 0;
      this.body.vy = 0;
      return;
    }

    if (this.flyMode) {
      this.body.vy = 0;
      if (up) this.body.vy = -FLY_SPEED;
      else if (down) this.body.vy = FLY_SPEED;
    } else {
      this.body.vy = Math.min(MAX_FALL, this.body.vy + GRAVITY * dt);
    }

    this.moveAxis(this.body.vx * dt, 0);
    this.moveAxis(0, this.body.vy * dt);
    this.body.onGround = !this.canOccupy(this.body.x, this.body.y + 2);
  },

  moveAxis: function (dx, dy) {
    if (dx === 0 && dy === 0) return;
    const nextX = this.body.x + dx;
    const nextY = this.body.y + dy;
    if (this.canOccupy(nextX, nextY)) {
      this.body.x = nextX;
      this.body.y = nextY;
      return;
    }

    if (dx !== 0) {
      if (dx > 0) {
        const rightTile = Math.floor((nextX + BODY_SIZE - HIT_EPS) / TILE_SIZE);
        this.body.x = rightTile * TILE_SIZE - BODY_SIZE;
      } else {
        const leftTile = Math.floor((nextX + HIT_EPS) / TILE_SIZE);
        this.body.x = (leftTile + 1) * TILE_SIZE;
      }
      this.body.vx = 0;
    }
    if (dy !== 0) {
      if (dy > 0) {
        const bottomTile = Math.floor((nextY + BODY_SIZE - HIT_EPS) / TILE_SIZE);
        this.body.y = bottomTile * TILE_SIZE - BODY_SIZE;
      } else {
        const topTile = Math.floor((nextY + HIT_EPS) / TILE_SIZE);
        this.body.y = (topTile + 1) * TILE_SIZE;
      }
      this.body.vy = 0;
    }
  },

  canOccupy: function (x, y) {
    const left = Math.floor((x + HIT_EPS) / TILE_SIZE);
    const right = Math.floor((x + BODY_SIZE - HIT_EPS) / TILE_SIZE);
    const top = Math.floor((y + HIT_EPS) / TILE_SIZE);
    const bottom = Math.floor((y + BODY_SIZE - HIT_EPS) / TILE_SIZE);
    for (let row = top; row <= bottom; row += 1) {
      for (let col = left; col <= right; col += 1) {
        if (this.isSolid(col, row)) return false;
      }
    }
    return true;
  },

  isSolid: function (tx, ty) {
    if (tx < 0 || tx >= WORLD_COLS || ty < 0 || ty >= WORLD_ROWS) return true;
    return this.world[ty][tx] !== TILE.AIR;
  },

  getSideDirection: function () {
    return this.facing < 0 ? DIG_DIRECTIONS.left : DIG_DIRECTIONS.right;
  },

  getCurrentDigDirection: function () {
    if (this.activeDig) return this.activeDig.direction;
    return this.digAim || this.getSideDirection();
  },

  getFacingTarget: function () {
    return this.getTargetInDirection(this.getCurrentDigDirection());
  },

  getTargetInDirection: function (direction) {
    const tx = this.body.tileX + direction.x;
    const ty = this.body.tileY + direction.y;
    if (tx < 0 || tx >= WORLD_COLS || ty < 0 || ty >= WORLD_ROWS) return null;
    return { tx, ty, type: this.world[ty][tx] };
  },

  startDig: function (requestedDirection) {
    if (this.activeDig) return;
    const direction = directionCopy(requestedDirection || this.getCurrentDigDirection());
    this.digAim = DIG_DIRECTIONS[directionName(direction)] || this.digAim;
    if (direction.x < 0) this.facing = -1;
    else if (direction.x > 0) this.facing = 1;
    const target = this.getTargetInDirection(direction);
    if (!target || target.type === TILE.AIR || target.type === TILE.BEDROCK) {
      this.pulseAirHit(direction);
      return;
    }
    this.activeDig = {
      target,
      direction,
      elapsed: 0,
      broken: false,
      typeBeforeBreak: target.type,
      particleClock: 0,
      framePulse: 0,
    };
    this.chassis.play("tank-dig", true);
  },

  pulseAirHit: function (direction) {
    const dir = direction || this.getCurrentDigDirection();
    const pivot = this.getPivotWorld(dir);
    const perp = perpendicular(dir);
    for (let i = 0; i < 8; i += 1) {
      const spread = Phaser.Math.Between(-8, 8);
      this.spawnParticle({
        x: pivot.x + dir.x * (DRILL_REST + 4) + perp.x * spread,
        y: pivot.y + dir.y * (DRILL_REST + 4) + perp.y * spread,
        vx: dir.x * Phaser.Math.Between(35, 80) + perp.x * Phaser.Math.Between(-30, 30),
        vy: dir.y * Phaser.Math.Between(35, 80) + perp.y * Phaser.Math.Between(-30, 30),
        life: 0.22,
        size: Phaser.Math.Between(2, 4),
        color: 0x9aa1a5,
        gravity: 120,
      });
    }
  },

  updateDig: function (dt) {
    if (!this.activeDig) {
      this.recoilX = lerp(this.recoilX, 0, dt * 14);
      this.recoilY = lerp(this.recoilY, 0, dt * 14);
      this.livingDrillBiteVisual = lerp(this.livingDrillBiteVisual || 0, 0, dt * 9);
      this.livingDrillCommitPending = null;
      return;
    }

    const dig = this.activeDig;
    dig.elapsed += dt;
    dig.particleClock += dt;
    const progress = clamp(dig.elapsed / DIG_DURATION, 0, 1);
    const phase = phaseFor(progress);
    const direction = dig.direction;

    const brace = progress < 0.18 ? easeOutCubic(progress / 0.18) : 1;
    const vibration = Math.sin(dig.elapsed * 95) * (phase === "penetrate" || phase === "fracture" ? 2.2 : 0.8);
    const recoilAmount = phase === "recoil" ? lerp(7, 0, (progress - 0.78) / 0.22) : brace * 4 + vibration;
    const crossJitter = Math.sin(dig.elapsed * 67) * 0.9;
    const perp = perpendicular(direction);
    this.recoilX = -direction.x * recoilAmount + perp.x * crossJitter;
    this.recoilY = -direction.y * recoilAmount + perp.y * crossJitter;

    if (this.characterMode === CHARACTER_MODES.drillHead) {
      const targetBite = this.getLivingDrillBiteTarget(dig);
      const ease = dig.broken ? 34 : targetBite < (this.livingDrillBiteVisual || 0) ? 8 : 20;
      this.livingDrillBiteVisual = lerp(this.livingDrillBiteVisual || 0, targetBite, dt * ease);
    }

    if (progress > 0.18 && progress < 0.72 && dig.particleClock > 0.035) {
      dig.particleClock = 0;
      this.spawnDrillContactParticles(progress);
    }

    if (!dig.broken && progress >= BREAK_PROGRESS) {
      dig.broken = true;
      if (this.world[dig.target.ty][dig.target.tx] !== TILE.AIR) {
        this.world[dig.target.ty][dig.target.tx] = TILE.AIR;
        this.spawnBreakBurst(dig);
      }
      if (this.characterMode === CHARACTER_MODES.drillHead) {
        this.livingDrillCommitPending = {
          tx: dig.target.tx,
          ty: dig.target.ty,
          direction: directionCopy(dig.direction),
        };
      }
    }

    if (progress >= 1) {
      if (this.characterMode === CHARACTER_MODES.drillHead) {
        this.livingDrillBiteVisual = LIVING_DRILL_COMMIT_DISTANCE;
        this.recoilX = 0;
        this.recoilY = 0;
      }
      this.commitLivingDrillDig();
      this.activeDig = null;
      this.chassis.play("tank-idle", true);
    }
  },

  commitLivingDrillDig: function () {
    const pending = this.livingDrillCommitPending;
    this.livingDrillCommitPending = null;
    if (!pending || this.characterMode !== CHARACTER_MODES.drillHead) return;

    const nextX = pending.tx * TILE_SIZE;
    const nextY = pending.ty * TILE_SIZE;
    if (!this.canOccupy(nextX, nextY)) return;

    this.body.x = nextX;
    this.body.y = nextY;
    this.body.vx = 0;
    this.body.vy = 0;
    this.recoilX = 0;
    this.recoilY = 0;
    this.livingDrillBiteVisual = 0;
    this.digAim = pending.direction;
    if (pending.direction.x < 0) this.facing = -1;
    else if (pending.direction.x > 0) this.facing = 1;
  },

  spawnDrillContactParticles: function (progress) {
    const dig = this.activeDig;
    if (!dig) return;
    const face = this.getTargetFace(dig.target, dig.direction);
    const perp = perpendicular(dig.direction);
    const strength = progress > 0.55 ? 1.4 : 1;
    for (let i = 0; i < 5; i += 1) {
      const side = Phaser.Math.Between(-13, 13);
      const outward = Phaser.Math.Between(35, 135) * strength;
      const spread = Phaser.Math.Between(-105, 95) * strength;
      this.spawnParticle({
        x: face.x + dig.direction.x * Phaser.Math.Between(0, 5) + perp.x * side,
        y: face.y + dig.direction.y * Phaser.Math.Between(0, 5) + perp.y * side,
        vx: -dig.direction.x * outward + perp.x * spread,
        vy: -dig.direction.y * outward + perp.y * spread,
        life: Phaser.Math.FloatBetween(0.18, 0.48),
        size: Phaser.Math.Between(2, 5),
        color: Phaser.Math.RND.pick([0xd3d0c6, 0x8f8371, 0x5b5147, 0xe6e0ce]),
        gravity: 420,
      });
    }
    if (progress > 0.28) {
      const sparkOut = Phaser.Math.Between(160, 240);
      const sparkSide = Phaser.Math.Between(-70, 70);
      this.spawnParticle({
        x: face.x + dig.direction.x * 2 + perp.x * Phaser.Math.Between(-8, 8),
        y: face.y + dig.direction.y * 2 + perp.y * Phaser.Math.Between(-8, 8),
        vx: -dig.direction.x * sparkOut + perp.x * sparkSide,
        vy: -dig.direction.y * sparkOut + perp.y * sparkSide,
        life: 0.16,
        size: 2,
        color: 0xffd77d,
        gravity: 80,
      });
    }
  },

  spawnBreakBurst: function (dig) {
    const cx = dig.target.tx * TILE_SIZE + TILE_SIZE * 0.5;
    const cy = dig.target.ty * TILE_SIZE + TILE_SIZE * 0.5;
    const outAngle = Math.atan2(-dig.direction.y, -dig.direction.x);
    for (let i = 0; i < 34; i += 1) {
      const angle = outAngle + Phaser.Math.FloatBetween(-1.15, 1.15);
      const speed = Phaser.Math.Between(90, 330);
      this.spawnParticle({
        x: cx + Phaser.Math.Between(-20, 20),
        y: cy + Phaser.Math.Between(-28, 28),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Phaser.Math.Between(20, 110),
        life: Phaser.Math.FloatBetween(0.45, 0.95),
        size: Phaser.Math.Between(4, 11),
        color: Phaser.Math.RND.pick([0x9c8b71, 0x736653, 0xc2b08d, 0x57504a]),
        gravity: 760,
        spin: Phaser.Math.FloatBetween(-6, 6),
      });
    }
    for (let i = 0; i < 16; i += 1) {
      this.spawnParticle({
        x: cx + Phaser.Math.Between(-30, 30),
        y: cy + Phaser.Math.Between(-30, 30),
        vx: Phaser.Math.Between(-80, 80),
        vy: Phaser.Math.Between(-60, 40),
        life: Phaser.Math.FloatBetween(0.55, 1.2),
        size: Phaser.Math.Between(12, 26),
        color: 0x9b9285,
        gravity: 140,
        dust: true,
      });
    }
  },

  spawnParticle: function (particle) {
    particle.maxLife = particle.life;
    particle.rotation = Phaser.Math.FloatBetween(0, Math.PI);
    this.particles.push(particle);
  },

  updateParticles: function (dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += (p.gravity || 0) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rotation += (p.spin || 0) * dt;
    }
  },

  updateChassisAnimation: function () {
    if (this.characterMode !== CHARACTER_MODES.tank) {
      this.chassis.setVisible(false);
      return;
    }
    this.livingDrillSprite.setVisible(false);
    this.pickaxeMinerSprite.setVisible(false);
    this.chassis.setVisible(true);
    if (this.activeDig) {
      this.chassis.play("tank-dig", true);
    } else if (this.flyMode) {
      this.chassis.play("tank-fly", true);
    } else if (Math.abs(this.body.vx) > 1) {
      this.chassis.play("tank-drive", true);
    } else {
      this.chassis.play("tank-idle", true);
    }
    this.chassis.setFlipX(this.facing < 0);
    this.chassis.setPosition(this.body.x + this.recoilX, this.body.y + this.recoilY);
  },

  getDrillRig: function (direction) {
    const dir = direction || this.getCurrentDigDirection();
    if (this.characterMode === CHARACTER_MODES.drillHead || isEnergyConceptMode(this.characterMode)) {
      return {
        mode: this.characterMode === CHARACTER_MODES.arcCore ? "arc core bore" : "wormhole maw",
        pivot: {
          x: BODY_SIZE * 0.5 + dir.x * BODY_SIZE * 0.5,
          y: BODY_SIZE * 0.5 + dir.y * BODY_SIZE * 0.5,
        },
        baseRadius: 0,
        tipRadius: 0,
        ringCount: 0,
      };
    }
    if (this.characterMode === CHARACTER_MODES.pickaxeMiner) {
      return {
        mode: "pickaxe swing",
        pivot: {
          x: BODY_SIZE * 0.5 + dir.x * BODY_SIZE * 0.5,
          y: BODY_SIZE * 0.5 + dir.y * BODY_SIZE * 0.5,
        },
        baseRadius: 0,
        tipRadius: 0,
        ringCount: 0,
      };
    }
    if (isVerticalDirection(dir)) {
      return {
        mode: "center bore",
        pivot: {
          x: CENTER_BORE_X,
          y: dir.y > 0 ? CENTER_BORE_BOTTOM_Y : CENTER_BORE_TOP_Y,
        },
        baseRadius: 15,
        tipRadius: 4,
        ringCount: 4,
      };
    }
    return {
      mode: "front drill",
      pivot: {
        x: dir.x > 0 ? DRILL_PIVOT.x : BODY_SIZE - DRILL_PIVOT.x,
        y: DRILL_PIVOT.y,
      },
      baseRadius: 17,
      tipRadius: 3,
      ringCount: 4,
    };
  },

  getPivotWorld: function (direction) {
    const rig = this.getDrillRig(direction);
    const pivot = rig.pivot;
    return {
      x: this.body.x + this.recoilX + pivot.x,
      y: this.body.y + this.recoilY + pivot.y,
    };
  },

  getTargetFace: function (target, direction) {
    if (this.characterMode === CHARACTER_MODES.drillHead || this.characterMode === CHARACTER_MODES.pickaxeMiner || isEnergyConceptMode(this.characterMode)) {
      const pivot = this.getPivotWorld(direction);
      if (direction.x > 0) return { x: target.tx * TILE_SIZE, y: pivot.y };
      if (direction.x < 0) return { x: (target.tx + 1) * TILE_SIZE, y: pivot.y };
      return {
        x: pivot.x,
        y: direction.y > 0 ? target.ty * TILE_SIZE : (target.ty + 1) * TILE_SIZE,
      };
    }
    if (direction.x > 0) {
      return { x: target.tx * TILE_SIZE, y: target.ty * TILE_SIZE + DRILL_PIVOT.y };
    }
    if (direction.x < 0) {
      return { x: (target.tx + 1) * TILE_SIZE, y: target.ty * TILE_SIZE + DRILL_PIVOT.y };
    }
    const pivot = this.getPivotWorld(direction);
    return {
      x: pivot.x,
      y: direction.y > 0 ? target.ty * TILE_SIZE : (target.ty + 1) * TILE_SIZE,
    };
  },

  getDrillLength: function () {
    if (this.characterMode === CHARACTER_MODES.drillHead || isEnergyConceptMode(this.characterMode)) return 0;
    if (!this.activeDig) return DRILL_REST;
    const progress = clamp(this.activeDig.elapsed / DIG_DURATION, 0, 1);
    if (isVerticalDirection(this.activeDig.direction)) {
      if (progress < CENTER_BORE_EJECT_PROGRESS) return 0;
      if (progress < 0.4) return lerp(0, DRILL_REST + 2, (progress - CENTER_BORE_EJECT_PROGRESS) / (0.4 - CENTER_BORE_EJECT_PROGRESS));
      if (progress < BREAK_PROGRESS) {
        const t = (progress - 0.4) / (BREAK_PROGRESS - 0.4);
        return lerp(DRILL_REST + 2, DRILL_MAX, easeOutCubic(t));
      }
      if (progress < 0.78) return DRILL_MAX + 5;
      return lerp(DRILL_MAX + 5, 0, (progress - 0.78) / 0.22);
    }
    if (progress < 0.16) return lerp(DRILL_REST, DRILL_REST + 4, progress / 0.16);
    if (progress < BREAK_PROGRESS) {
      const t = (progress - 0.16) / (BREAK_PROGRESS - 0.16);
      return lerp(DRILL_REST + 4, DRILL_MAX, easeOutCubic(t));
    }
    if (progress < 0.78) return DRILL_MAX + 5;
    return lerp(DRILL_MAX + 5, DRILL_REST, (progress - 0.78) / 0.22);
  },

  getLivingDrillBiteTarget: function (dig) {
    if (!dig) return 0;
    const progress = clamp(dig.elapsed / DIG_DURATION, 0, 1);
    if (progress < 0.12) return 0;
    if (progress < BREAK_PROGRESS) {
      const t = (progress - 0.12) / (BREAK_PROGRESS - 0.12);
      return lerp(0, LIVING_DRILL_BITE_MAX, easeOutCubic(t));
    }
    return lerp(LIVING_DRILL_BITE_MAX, LIVING_DRILL_COMMIT_DISTANCE, easeOutCubic((progress - BREAK_PROGRESS) / (1 - BREAK_PROGRESS)));
  },

  getLivingDrillBite: function () {
    if (this.characterMode !== CHARACTER_MODES.drillHead) return 0;
    return this.livingDrillBiteVisual || 0;
  },

  getCenterBoreOpen: function () {
    if (!this.activeDig || !isVerticalDirection(this.activeDig.direction)) {
      return 0;
    }
    const progress = clamp(this.activeDig.elapsed / DIG_DURATION, 0, 1);
    if (progress < 0.08) return 0;
    if (progress < 0.22) return easeOutCubic((progress - 0.08) / 0.14);
    if (progress < 0.78) return 1;
    return 1 - easeOutCubic((progress - 0.78) / 0.22);
  },

  getOccluderTarget: function () {
    if (this.activeDig && !this.activeDig.broken) return this.activeDig.target;
    const direction = this.getCurrentDigDirection();
    const target = this.getTargetInDirection(direction);
    if (!target || target.type === TILE.AIR || target.type === TILE.BEDROCK) return null;
    const pivot = this.getPivotWorld(direction);
    const face = this.getTargetFace(target, direction);
    const distance = dot(face.x - pivot.x, face.y - pivot.y, direction.x, direction.y);
    if (distance >= 0 && distance <= DRILL_REST + 2) return target;
    return null;
  },

  drawAll: function () {
    this.drawWorld();
    this.drawPlayer();
    this.drawDrill();
    this.drawOccluderAndDamage();
    this.drawParticles();
    this.drawDebug();
  },

  drawPlayer: function () {
    const g = this.playerGfx;
    g.clear();
    if (this.characterMode === CHARACTER_MODES.tank) {
      this.livingDrillSprite.setVisible(false);
      this.pickaxeMinerSprite.setVisible(false);
      return;
    }

    if (this.characterMode === CHARACTER_MODES.pickaxeMiner) {
      this.drawPickaxeMinerPlayer(g);
      return;
    }

    if (this.characterMode === CHARACTER_MODES.arcCore) {
      this.drawArcCorePlayer(g);
      return;
    }

    if (this.characterMode === CHARACTER_MODES.wormholeMaw) {
      this.drawWormholePlayer(g);
      return;
    }

    const direction = this.getCurrentDigDirection();
    this.pickaxeMinerSprite.setVisible(false);
    const perp = perpendicular(direction);
    const digProgress = this.activeDig ? clamp(this.activeDig.elapsed / DIG_DURATION, 0, 1) : 0;
    const shake = this.activeDig ? Math.sin(this.activeDig.elapsed * 120) * 1.6 : 0;
    const bite = this.getLivingDrillBite();
    const cx = this.body.x + BODY_SIZE * 0.5 + this.recoilX + direction.x * bite + perp.x * shake;
    const cy = this.body.y + BODY_SIZE * 0.5 + this.recoilY + direction.y * bite + perp.y * shake;

    this.livingDrillSprite.setVisible(true);
    this.livingDrillSprite.setPosition(cx, cy);
    this.livingDrillSprite.setScale(LIVING_DRILL_VISUAL_SCALE);
    this.livingDrillSprite.setFlipX(direction.x < 0);
    this.livingDrillSprite.setAngle(direction.y < 0 ? -90 : direction.y > 0 ? 90 : 0);
    if (this.activeDig) {
      this.livingDrillSprite.play("living-drill-dig", true);
    } else if (this.flyMode) {
      this.livingDrillSprite.play("living-drill-fly", true);
    } else {
      this.livingDrillSprite.play("living-drill-idle", true);
    }

    if (this.activeDig && digProgress > 0.12 && digProgress < 0.72) {
      const face = this.getTargetFace(this.activeDig.target, direction);
      g.lineStyle(3, 0xffd77d, 0.75);
      g.lineBetween(face.x - perp.x * 15, face.y - perp.y * 15, face.x + perp.x * 15, face.y + perp.y * 15);
    }

    this.drillSpinFrame = (this.drillSpinFrame + (this.activeDig ? 1.35 : 0.22)) % 4;
  },

  drawPickaxeMinerPlayer: function (g) {
    this.livingDrillSprite.setVisible(false);
    const direction = this.getCurrentDigDirection();
    const cx = this.body.x + BODY_SIZE * 0.5 + this.recoilX;
    const cy = this.body.y + BODY_SIZE * 0.5 + this.recoilY;
    const moving = Math.abs(this.body.vx) > 1;
    const digProgress = this.activeDig ? clamp(this.activeDig.elapsed / DIG_DURATION, 0, 1) : 0;

    this.pickaxeMinerSprite.setVisible(true);
    this.pickaxeMinerSprite.setPosition(cx, cy);
    this.pickaxeMinerSprite.setScale(1);
    this.pickaxeMinerSprite.setFlipX(direction.x < 0);
    this.pickaxeMinerSprite.setAngle(0);
    if (this.activeDig) {
      this.pickaxeMinerSprite.play("pickaxe-miner-dig", true);
    } else if (moving) {
      this.pickaxeMinerSprite.play("pickaxe-miner-walk", true);
    } else {
      this.pickaxeMinerSprite.play("pickaxe-miner-idle", true);
    }

    if (this.activeDig && digProgress > 0.18 && digProgress < 0.72) {
      const face = this.getTargetFace(this.activeDig.target, direction);
      const perp = perpendicular(direction);
      g.lineStyle(3, 0xffd77d, 0.65);
      g.lineBetween(face.x - perp.x * 14, face.y - perp.y * 14, face.x + perp.x * 14, face.y + perp.y * 14);
    }
  },

  drawArcCorePlayer: function (g) {
    this.livingDrillSprite.setVisible(false);
    this.pickaxeMinerSprite.setVisible(false);
    const direction = this.getCurrentDigDirection();
    const cx = this.body.x + BODY_SIZE * 0.5 + this.recoilX * 0.35;
    const cy = this.body.y + BODY_SIZE * 0.5 + this.recoilY * 0.35 + Math.sin(this.time.now * 0.004) * 2;
    const active = this.activeDig;
    const progress = active ? clamp(active.elapsed / DIG_DURATION, 0, 1) : 0;
    const charge = active ? clamp((progress - 0.06) / 0.34, 0, 1) : 0.2 + Math.sin(this.time.now * 0.003) * 0.08;
    const pulse = 1 + Math.sin(this.time.now * 0.018) * 0.05 + charge * 0.1;

    g.lineStyle(2, 0x76ecff, 0.28 + charge * 0.42);
    g.strokeCircle(cx, cy, 32 * pulse);
    g.lineStyle(2, 0xffd36a, 0.28 + charge * 0.38);
    g.strokeCircle(cx, cy, 22 + Math.sin(this.time.now * 0.01) * 2);

    g.fillStyle(0x091b24, 0.92);
    g.fillCircle(cx, cy, 22);
    g.lineStyle(4, 0x050505, 1);
    g.strokeCircle(cx, cy, 22);
    g.lineStyle(3, 0xf9d66d, 0.95);
    for (let i = 0; i < 4; i += 1) {
      const angle = this.time.now * 0.002 + i * Math.PI * 0.5;
      g.lineBetween(cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8, cx + Math.cos(angle) * 20, cy + Math.sin(angle) * 20);
    }
    g.fillStyle(0x9ff6ff, 0.95);
    g.fillCircle(cx, cy, 8 + charge * 4);
    g.fillStyle(0xffffff, 0.75);
    g.fillCircle(cx - 4, cy - 5, 3);

    if (active && progress > 0.08 && progress < 0.78) {
      this.drawArcCoreBore(g, cx, cy, direction, progress);
    }
  },

  drawArcCoreBore: function (g, cx, cy, direction, progress) {
    const face = this.getTargetFace(this.activeDig.target, direction);
    const perp = perpendicular(direction);
    const beamStartX = cx + direction.x * 22;
    const beamStartY = cy + direction.y * 22;
    const contactX = face.x - direction.x * 5;
    const contactY = face.y - direction.y * 5;
    const energy = clamp((progress - 0.08) / 0.42, 0, 1);
    const width = lerp(5, 16, energy) + Math.sin(this.time.now * 0.03) * 2;

    g.lineStyle(width + 9, 0x0aa8ff, 0.18 + energy * 0.16);
    g.lineBetween(beamStartX, beamStartY, contactX, contactY);
    g.lineStyle(width, 0x67ecff, 0.82);
    g.lineBetween(beamStartX, beamStartY, contactX, contactY);
    g.lineStyle(3, 0xffd36a, 0.95);
    g.lineBetween(beamStartX + perp.x * 8, beamStartY + perp.y * 8, contactX + perp.x * Math.sin(this.time.now * 0.02) * 10, contactY + perp.y * Math.sin(this.time.now * 0.02) * 10);
    g.lineBetween(beamStartX - perp.x * 8, beamStartY - perp.y * 8, contactX - perp.x * Math.cos(this.time.now * 0.02) * 10, contactY - perp.y * Math.cos(this.time.now * 0.02) * 10);

    for (let i = 0; i < 4; i += 1) {
      const t = ((this.time.now * 0.004 + i * 0.25) % 1);
      const x = lerp(beamStartX, contactX, t);
      const y = lerp(beamStartY, contactY, t);
      g.lineStyle(2, 0xffffff, 0.45);
      g.strokeCircle(x, y, 5 + t * 11);
    }
  },

  drawWormholePlayer: function (g) {
    this.livingDrillSprite.setVisible(false);
    this.pickaxeMinerSprite.setVisible(false);
    const direction = this.getCurrentDigDirection();
    const cx = this.body.x + BODY_SIZE * 0.5 + this.recoilX * 0.25;
    const cy = this.body.y + BODY_SIZE * 0.5 + this.recoilY * 0.25 + Math.sin(this.time.now * 0.0035) * 1.5;
    const active = this.activeDig;
    const progress = active ? clamp(active.elapsed / DIG_DURATION, 0, 1) : 0;
    const open = active ? clamp((progress - 0.08) / 0.28, 0, 1) : 0.25;
    const spin = this.time.now * 0.004;

    g.lineStyle(5, 0x050505, 1);
    g.strokeCircle(cx, cy, 25);
    g.lineStyle(4, 0x9b5cff, 0.78);
    g.strokeCircle(cx, cy, 24 + Math.sin(spin * 4) * 2);
    g.lineStyle(3, 0x42ffdc, 0.5 + open * 0.28);
    g.strokeCircle(cx, cy, 17 + open * 4);
    g.fillStyle(0x04030a, 0.96);
    g.fillCircle(cx, cy, 16 + open * 4);

    for (let i = 0; i < 5; i += 1) {
      const angle = spin + i * Math.PI * 0.4;
      const r0 = 7 + i * 3;
      const r1 = r0 + 8;
      g.lineStyle(2, i % 2 ? 0x42ffdc : 0xb680ff, 0.72);
      g.lineBetween(cx + Math.cos(angle) * r0, cy + Math.sin(angle) * r0, cx + Math.cos(angle + 0.7) * r1, cy + Math.sin(angle + 0.7) * r1);
    }

    if (active && progress > 0.08 && progress < 0.78) {
      this.drawWormholeTether(g, cx, cy, direction, progress);
    }
  },

  drawWormholeTether: function (g, cx, cy, direction, progress) {
    const face = this.getTargetFace(this.activeDig.target, direction);
    const perp = perpendicular(direction);
    const mouthX = face.x + direction.x * 11;
    const mouthY = face.y + direction.y * 11;
    const pull = clamp((progress - 0.1) / 0.48, 0, 1);

    g.lineStyle(4 + pull * 7, 0x1d0c42, 0.6);
    g.lineBetween(cx + direction.x * 18, cy + direction.y * 18, mouthX, mouthY);
    g.lineStyle(2, 0x48ffdf, 0.7);
    for (let i = 0; i < 5; i += 1) {
      const t = ((this.time.now * 0.003 + i * 0.19) % 1);
      const side = Math.sin(t * Math.PI * 4) * (18 * (1 - t));
      const x = lerp(mouthX, cx, t) + perp.x * side;
      const y = lerp(mouthY, cy, t) + perp.y * side;
      g.strokeCircle(x, y, 3 + (1 - t) * 5);
    }
  },

  drawWorld: function () {
    const g = this.worldGfx;
    g.clear();
    g.fillStyle(0x162026, 1);
    g.fillRect(0, 0, WORLD_COLS * TILE_SIZE, WORLD_ROWS * TILE_SIZE);

    for (let row = 0; row < WORLD_ROWS; row += 1) {
      for (let col = 0; col < WORLD_COLS; col += 1) {
        this.drawTile(g, col, row, this.world[row][col], 1);
      }
    }

    g.lineStyle(1, 0x27323a, 0.34);
    for (let col = 0; col <= WORLD_COLS; col += 1) {
      g.lineBetween(col * TILE_SIZE, 0, col * TILE_SIZE, WORLD_ROWS * TILE_SIZE);
    }
    for (let row = 0; row <= WORLD_ROWS; row += 1) {
      g.lineBetween(0, row * TILE_SIZE, WORLD_COLS * TILE_SIZE, row * TILE_SIZE);
    }
  },

  drawTile: function (g, tx, ty, type, alpha) {
    if (type === TILE.AIR) return;
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    const colorMap = {
      [TILE.DIRT]: 0x8d765b,
      [TILE.STONE]: 0x787c80,
      [TILE.FLOOR]: 0x4d555a,
      [TILE.BEDROCK]: 0x292d31,
    };
    const darkMap = {
      [TILE.DIRT]: 0x5c4b3b,
      [TILE.STONE]: 0x4d5255,
      [TILE.FLOOR]: 0x2e3438,
      [TILE.BEDROCK]: 0x111417,
    };
    g.fillStyle(colorMap[type] || 0x777777, alpha);
    g.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    g.fillStyle(darkMap[type] || 0x444444, alpha);
    g.fillRect(x, y + TILE_SIZE - 12, TILE_SIZE, 12);
    g.lineStyle(3, 0x151515, alpha * 0.7);
    g.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    g.lineStyle(1, 0xffffff, alpha * 0.08);
    g.lineBetween(x + 8, y + 10, x + TILE_SIZE - 10, y + 5);
    g.lineStyle(1, 0x000000, alpha * 0.12);
    g.lineBetween(x + 12, y + TILE_SIZE - 16, x + TILE_SIZE - 12, y + TILE_SIZE - 20);
  },

  drawDrill: function () {
    const g = this.drillGfx;
    g.clear();
    if (this.characterMode === CHARACTER_MODES.drillHead || this.characterMode === CHARACTER_MODES.pickaxeMiner || isEnergyConceptMode(this.characterMode)) return;
    const direction = this.getCurrentDigDirection();
    const rig = this.getDrillRig(direction);
    const pivot = this.getPivotWorld(direction);
    const length = this.getDrillLength();

    if (isVerticalDirection(direction) && !this.activeDig) {
      this.drawCenterBorePreview(g, direction, pivot);
      return;
    }

    const wobble = this.activeDig ? Math.sin(this.activeDig.elapsed * 120) * 1.8 : 0;
    const perp = perpendicular(direction);
    const startX = pivot.x + perp.x * wobble;
    const startY = pivot.y + perp.y * wobble;
    const baseR = rig.baseRadius;
    const tipR = rig.tipRadius;
    const endX = startX + direction.x * length;
    const endY = startY + direction.y * length;

    if (isVerticalDirection(direction)) {
      this.drawCenterBoreOverlay(g, direction, pivot, this.getCenterBoreOpen());
    } else {
      this.drawDrillMount(g, pivot, direction);
    }

    if (length <= 0.5) {
      this.drillSpinFrame = (this.drillSpinFrame + 0.35) % 4;
      return;
    }

    const ringCount = rig.ringCount;
    for (let i = 0; i < ringCount; i += 1) {
      const t0 = i / ringCount;
      const t1 = (i + 1) / ringCount;
      const x0 = lerp(startX, endX, t0);
      const y0 = lerp(startY, endY, t0);
      const x1 = lerp(startX, endX, t1);
      const y1 = lerp(startY, endY, t1);
      const r0 = lerp(baseR, tipR, t0);
      const r1 = lerp(baseR, tipR, t1);
      const colors = [0xdbddd9, 0xaeb2af, 0x828784, 0xc8cbc8];
      g.fillStyle(colors[(i + Math.floor(this.drillSpinFrame)) % colors.length], 1);
      g.lineStyle(3, 0x050505, 1);
      g.beginPath();
      g.moveTo(x0 + perp.x * -r0, y0 + perp.y * -r0);
      g.lineTo(x1 + perp.x * -r1, y1 + perp.y * -r1);
      g.lineTo(x1 + perp.x * r1, y1 + perp.y * r1);
      g.lineTo(x0 + perp.x * r0, y0 + perp.y * r0);
      g.closePath();
      g.fillPath();
      g.strokePath();
      g.lineStyle(2, 0xffffff, 0.35);
      g.lineBetween(
        x0 + direction.x * 2 + perp.x * (-r0 + 4),
        y0 + direction.y * 2 + perp.y * (-r0 + 4),
        x1 - direction.x * 2 + perp.x * (-r1 + 2),
        y1 - direction.y * 2 + perp.y * (-r1 + 2),
      );
    }
    g.fillStyle(0x050505, 1);
    g.beginPath();
    g.moveTo(endX, endY);
    g.lineTo(endX - direction.x * 8 + perp.x * -5, endY - direction.y * 8 + perp.y * -5);
    g.lineTo(endX - direction.x * 8 + perp.x * 5, endY - direction.y * 8 + perp.y * 5);
    g.closePath();
    g.fillPath();
    if (isVerticalDirection(direction)) {
      this.drawCenterBoreForeground(g, direction, pivot, this.getCenterBoreOpen());
    }
    this.drillSpinFrame = (this.drillSpinFrame + 0.35) % 4;
  },

  drawDrillMount: function (g, pivot, direction) {
    g.fillStyle(0x2c2e2d, 1);
    g.lineStyle(3, 0x050505, 1);
    g.fillRect(pivot.x - 5, pivot.y - 18, 10, 36);
    g.strokeRect(pivot.x - 5, pivot.y - 18, 10, 36);
  },

  drawCenterBorePreview: function (g, direction, pivot) {
    const target = this.getTargetInDirection(direction);
    if (!target || target.type === TILE.AIR || target.type === TILE.BEDROCK) return;
    const face = this.getTargetFace(target, direction);
    g.lineStyle(2, 0x9bd7ff, 0.55);
    g.lineBetween(pivot.x, pivot.y, face.x, face.y);
    g.fillStyle(0x9bd7ff, 0.7);
    g.fillCircle(pivot.x, pivot.y, 3);
    if (direction.y > 0) {
      g.lineStyle(2, 0x0b0b0b, 0.75);
      g.strokeRect(this.body.x + 25, this.body.y + 72, 44, 18);
    } else {
      g.lineStyle(2, 0x0b0b0b, 0.75);
      g.strokeRect(this.body.x + 27, this.body.y + 9, 40, 13);
    }
  },

  drawCenterBoreOverlay: function (g, direction, pivot, openAmount) {
    const bx = this.body.x + this.recoilX;
    const by = this.body.y + this.recoilY;
    const open = clamp(openAmount, 0, 1);
    g.lineStyle(3, 0x050505, 1);

    if (direction.y > 0) {
      const slotW = lerp(10, 36, open);
      const retractY = lerp(by + 76, by + 55, open);
      g.fillStyle(0x151615, 1);
      g.fillRect(bx + 25, by + 56, 44, 37);
      g.fillStyle(0x1d1f1e, 1);
      g.fillRect(bx + 33, by + 53, 28, 36);
      g.fillStyle(0x2b2d2b, 1);
      g.fillRect(bx + 24, by + 70, 46, 21);
      g.strokeRect(bx + 24, by + 70, 46, 21);
      g.fillStyle(0x111211, 1);
      g.fillRect(bx + 47 - slotW * 0.5, by + 70, slotW, 23);
      g.fillStyle(0x202220, 1);
      g.fillRect(bx + 47 - slotW * 0.5 + 3, by + 56, slotW - 6, 16);
      g.fillStyle(0x2c2e2c, 1);
      g.fillRect(bx + 47 - slotW * 0.5 + 4, retractY, slotW - 8, 15);
      g.lineStyle(2, 0x050505, 0.95);
      g.strokeRect(bx + 47 - slotW * 0.5 + 4, retractY, slotW - 8, 15);
      g.lineStyle(1, 0xaeb2af, 0.45);
      g.lineBetween(bx + 47 - slotW * 0.5 + 6, retractY + 3, bx + 47 + slotW * 0.5 - 6, retractY + 3);
      g.fillStyle(0x0a0a0a, 1);
      g.fillRect(bx + 47 - slotW * 0.5, by + 87, slotW, 6);
      g.lineStyle(2, 0xd9dad6, 0.75);
      g.lineBetween(bx + 47 - slotW * 0.5 + 2, by + 88, bx + 47 + slotW * 0.5 - 2, by + 88);
      g.lineStyle(3, 0x050505, 1);
      g.fillStyle(0xbfc1bd, 1);
      g.fillRect(pivot.x - 15, pivot.y - 7, 30, 9);
      g.strokeRect(pivot.x - 15, pivot.y - 7, 30, 9);
      return;
    }

    const lidOpen = lerp(0, 18, open);
    g.fillStyle(0x141515, 1);
    g.fillRect(bx + 27, by + 6, 40, 18);
    g.fillStyle(0x2b2d2b, 1);
    g.fillRect(bx + 27, by + 9, 40, 13);
    g.strokeRect(bx + 27, by + 9, 40, 13);
    g.fillStyle(0x0a0a0a, 1);
    g.fillRect(bx + 35, by + 7, 24, 17);
    g.fillStyle(0xd9dad6, 1);
    g.fillRect(bx + 27 - lidOpen, by + 5, 20, 10);
    g.strokeRect(bx + 27 - lidOpen, by + 5, 20, 10);
    g.fillRect(bx + 47 + lidOpen, by + 5, 20, 10);
    g.strokeRect(bx + 47 + lidOpen, by + 5, 20, 10);
    g.fillStyle(0xbfc1bd, 1);
    g.fillRect(pivot.x - 15, pivot.y - 3, 30, 9);
    g.strokeRect(pivot.x - 15, pivot.y - 3, 30, 9);
  },

  drawCenterBoreForeground: function (g, direction, pivot, openAmount) {
    const bx = this.body.x + this.recoilX;
    const by = this.body.y + this.recoilY;
    const open = clamp(openAmount, 0, 1);
    g.lineStyle(3, 0x050505, 1);

    if (direction.y > 0) {
      const slotW = lerp(10, 36, open);
      const leftEdge = bx + 47 - slotW * 0.5;
      const rightEdge = bx + 47 + slotW * 0.5;
      g.fillStyle(0x5f6360, 1);
      g.fillRect(bx + 24, by + 70, Math.max(0, leftEdge - (bx + 24)), 21);
      g.fillRect(rightEdge, by + 70, Math.max(0, bx + 70 - rightEdge), 21);
      g.strokeRect(bx + 24, by + 70, 46, 21);
      g.fillStyle(0xbfc1bd, 1);
      g.fillRect(bx + 28, by + 65, 38, 6);
      g.strokeRect(bx + 28, by + 65, 38, 6);
      g.fillStyle(0x0a0a0a, 1);
      g.fillRect(leftEdge, by + 87, slotW, 6);
      g.lineStyle(2, 0xd9dad6, 0.85);
      g.lineBetween(leftEdge + 2, by + 88, rightEdge - 2, by + 88);
      return;
    }

    const lidOpen = lerp(0, 18, open);
    g.fillStyle(0xd9dad6, 1);
    g.fillRect(bx + 27 - lidOpen, by + 5, 20, 10);
    g.strokeRect(bx + 27 - lidOpen, by + 5, 20, 10);
    g.fillRect(bx + 47 + lidOpen, by + 5, 20, 10);
    g.strokeRect(bx + 47 + lidOpen, by + 5, 20, 10);
    g.fillStyle(0x0a0a0a, 1);
    g.fillRect(bx + 35, by + 18, 24, 6);
  },

  drawOccluderAndDamage: function () {
    const g = this.occluderGfx;
    g.clear();
    const target = this.getOccluderTarget();
    if (!target) return;
    const type = this.activeDig ? this.activeDig.typeBeforeBreak : target.type;
    this.drawTile(g, target.tx, target.ty, type, 1);

    if (this.debug.occluder) {
      g.fillStyle(0x00d4ff, 0.05);
      g.fillRect(target.tx * TILE_SIZE, target.ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    const dig = this.activeDig;
    if (dig && !dig.broken) {
      const progress = clamp(dig.elapsed / DIG_DURATION, 0, 1);
      if (this.characterMode === CHARACTER_MODES.arcCore) {
        this.drawArcCoreTileDamage(g, dig, progress);
      } else if (this.characterMode === CHARACTER_MODES.wormholeMaw) {
        this.drawWormholeTileDamage(g, dig, progress);
      } else {
      const face = this.getTargetFace(dig.target, dig.direction);
      const perp = perpendicular(dig.direction);
      const insideX = face.x + dig.direction.x * 7;
      const insideY = face.y + dig.direction.y * 7;
      const holeRadius = lerp(5, 14, clamp((progress - 0.18) / 0.42, 0, 1));

      if (progress > 0.16) {
        const boreDepth = lerp(8, DRILL_PENETRATION, clamp((progress - 0.16) / 0.44, 0, 1));
        const boreX = face.x + dig.direction.x * boreDepth;
        const boreY = face.y + dig.direction.y * boreDepth;
        g.fillStyle(0x17120f, 0.78);
        g.beginPath();
        g.moveTo(face.x + dig.direction.x + perp.x * -9, face.y + dig.direction.y + perp.y * -9);
        g.lineTo(boreX + perp.x * -4, boreY + perp.y * -4);
        g.lineTo(boreX + perp.x * 4, boreY + perp.y * 4);
        g.lineTo(face.x + dig.direction.x + perp.x * 9, face.y + dig.direction.y + perp.y * 9);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0x4c4135, 0.6);
        g.beginPath();
        g.moveTo(face.x + dig.direction.x * 2 + perp.x * -10, face.y + dig.direction.y * 2 + perp.y * -10);
        g.lineTo(boreX + perp.x * -5, boreY + perp.y * -5);
        g.moveTo(face.x + dig.direction.x * 2 + perp.x * 10, face.y + dig.direction.y * 2 + perp.y * 10);
        g.lineTo(boreX + perp.x * 5, boreY + perp.y * 5);
        g.strokePath();

        g.fillStyle(0x16120f, 0.95);
        g.fillEllipse(
          insideX,
          insideY,
          holeRadius * (dig.direction.y === 0 ? 1.35 : 0.92),
          holeRadius * (dig.direction.y === 0 ? 0.92 : 1.35),
        );
        g.lineStyle(3, 0x3b332b, 0.85);
        g.strokeEllipse(
          insideX,
          insideY,
          holeRadius * (dig.direction.y === 0 ? 1.55 : 1.05),
          holeRadius * (dig.direction.y === 0 ? 1.05 : 1.55),
        );
      }

      if (progress > 0.28) {
        const crack = clamp((progress - 0.28) / 0.38, 0, 1);
        g.lineStyle(2, 0x211b16, 0.84);
        this.drawCrack(g, insideX, insideY, dig.direction, 22 * crack, -25 * crack);
        this.drawCrack(g, insideX, insideY, dig.direction, 32 * crack, 4 * crack);
        this.drawCrack(g, insideX, insideY, dig.direction, 18 * crack, 29 * crack);
        g.lineStyle(1, 0xffe0a3, 0.55);
        g.lineBetween(
          face.x + dig.direction.x * 2 + perp.x * -7,
          face.y + dig.direction.y * 2 + perp.y * -7,
          face.x - dig.direction.x * 10 + perp.x * -15,
          face.y - dig.direction.y * 10 + perp.y * -15,
        );
      }
      }
    }

    if (this.debug.occluder) {
      g.lineStyle(2, 0x00d4ff, 0.9);
      g.strokeRect(target.tx * TILE_SIZE + 2, target.ty * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
  },

  drawCrack: function (g, x, y, direction, forward, side) {
    const perp = perpendicular(direction);
    const midX = x + direction.x * forward * 0.55 + perp.x * side * 0.35;
    const midY = y + direction.y * forward * 0.55 + perp.y * side * 0.35;
    const endX = x + direction.x * forward + perp.x * side;
    const endY = y + direction.y * forward + perp.y * side;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(midX, midY);
    g.lineTo(endX, endY);
    g.strokePath();
  },

  drawArcCoreTileDamage: function (g, dig, progress) {
    const face = this.getTargetFace(dig.target, dig.direction);
    const perp = perpendicular(dig.direction);
    const insideX = face.x + dig.direction.x * 12;
    const insideY = face.y + dig.direction.y * 12;
    const charge = clamp((progress - 0.1) / 0.22, 0, 1);
    const fracture = clamp((progress - 0.24) / 0.42, 0, 1);
    const boreDepth = lerp(4, 54, fracture);

    g.lineStyle(3, 0xffd36a, 0.35 + charge * 0.45);
    g.strokeEllipse(insideX, insideY, 14 + charge * 20, 10 + charge * 12);
    g.fillStyle(0x061a21, 0.45 + fracture * 0.35);
    g.beginPath();
    g.moveTo(face.x + perp.x * -13, face.y + perp.y * -13);
    g.lineTo(face.x + dig.direction.x * boreDepth + perp.x * -5, face.y + dig.direction.y * boreDepth + perp.y * -5);
    g.lineTo(face.x + dig.direction.x * boreDepth + perp.x * 5, face.y + dig.direction.y * boreDepth + perp.y * 5);
    g.lineTo(face.x + perp.x * 13, face.y + perp.y * 13);
    g.closePath();
    g.fillPath();

    if (progress > 0.24) {
      g.lineStyle(2, 0x77f2ff, 0.78);
      this.drawCrack(g, insideX, insideY, dig.direction, 30 * fracture, -27 * fracture);
      this.drawCrack(g, insideX, insideY, dig.direction, 40 * fracture, 8 * fracture);
      this.drawCrack(g, insideX, insideY, dig.direction, 22 * fracture, 30 * fracture);
      g.lineStyle(2, 0xffdc76, 0.75);
      g.lineBetween(face.x - dig.direction.x * 7 + perp.x * -16, face.y - dig.direction.y * 7 + perp.y * -16, face.x + dig.direction.x * 24 + perp.x * -4, face.y + dig.direction.y * 24 + perp.y * -4);
      g.lineBetween(face.x - dig.direction.x * 7 + perp.x * 16, face.y - dig.direction.y * 7 + perp.y * 16, face.x + dig.direction.x * 24 + perp.x * 4, face.y + dig.direction.y * 24 + perp.y * 4);
    }
  },

  drawWormholeTileDamage: function (g, dig, progress) {
    const face = this.getTargetFace(dig.target, dig.direction);
    const perp = perpendicular(dig.direction);
    const centerX = dig.target.tx * TILE_SIZE + TILE_SIZE * 0.5;
    const centerY = dig.target.ty * TILE_SIZE + TILE_SIZE * 0.5;
    const insideX = face.x + dig.direction.x * 18;
    const insideY = face.y + dig.direction.y * 18;
    const open = clamp((progress - 0.1) / 0.3, 0, 1);
    const collapse = clamp((progress - 0.3) / 0.36, 0, 1);

    g.fillStyle(0x05020a, 0.44 + open * 0.42);
    g.fillEllipse(insideX, insideY, 12 + open * 34, 10 + open * 28);
    g.lineStyle(3, 0xa76cff, 0.45 + open * 0.35);
    g.strokeEllipse(insideX, insideY, 20 + open * 40, 14 + open * 34);
    g.lineStyle(2, 0x48ffdf, 0.7);
    g.strokeEllipse(insideX, insideY, 12 + Math.sin(this.time.now * 0.025) * 3 + open * 20, 8 + open * 18);

    if (progress > 0.22) {
      for (let i = 0; i < 6; i += 1) {
        const angle = i * Math.PI / 3 + this.time.now * 0.004;
        const startX = centerX + Math.cos(angle) * lerp(34, 10, collapse);
        const startY = centerY + Math.sin(angle) * lerp(34, 10, collapse);
        const endX = lerp(startX, insideX, 0.55 + collapse * 0.28);
        const endY = lerp(startY, insideY, 0.55 + collapse * 0.28);
        g.lineStyle(2, i % 2 ? 0x2de8d0 : 0x8e52ff, 0.65);
        g.lineBetween(startX, startY, endX, endY);
      }
      g.lineStyle(2, 0x1a0b2b, 0.9);
      this.drawCrack(g, insideX, insideY, dig.direction, 20 * collapse, -28 * collapse);
      this.drawCrack(g, insideX, insideY, dig.direction, 28 * collapse, 18 * collapse);
    }
  },

  drawParticles: function () {
    const g = this.fxGfx;
    g.clear();
    for (let i = 0; i < this.particles.length; i += 1) {
      const p = this.particles[i];
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      g.fillStyle(p.color, p.dust ? alpha * 0.28 : alpha);
      if (p.dust) {
        g.fillCircle(p.x, p.y, p.size * (1.2 - alpha * 0.35));
      } else {
        g.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
      }
    }
  },

  drawDebug: function () {
    const g = this.debugGfx;
    g.clear();
    if (this.debug.bodyBox) {
      g.lineStyle(2, 0x4be0ff, 0.95);
      g.strokeRect(this.body.x, this.body.y, BODY_SIZE, BODY_SIZE);
    }
    if (this.debug.anchor) {
      const ax = this.body.x + BODY_SIZE * 0.5;
      const ay = this.body.y + BODY_SIZE * 0.5;
      g.lineStyle(2, 0xffe066, 0.95);
      g.lineBetween(ax - 9, ay, ax + 9, ay);
      g.lineBetween(ax, ay - 9, ax, ay + 9);
      g.lineStyle(2, 0xff8f66, 0.85);
      g.lineBetween(this.body.x, this.body.y + BODY_SIZE - 1, this.body.x + BODY_SIZE, this.body.y + BODY_SIZE - 1);
    }
    if (this.debug.chassisBounds) {
      g.lineStyle(2, 0xb2ff59, 0.9);
      g.strokeRect(this.body.x + 7 + this.recoilX, this.body.y + 8 + this.recoilY, 82, 85);
    }
    const direction = this.getCurrentDigDirection();
    const pivot = this.getPivotWorld(direction);
    if (this.debug.drillPivot) {
      g.fillStyle(0xff66c4, 1);
      g.fillCircle(pivot.x, pivot.y, 4);
    }
    if (this.debug.drillTip) {
      const length = this.getDrillLength();
      g.lineStyle(1, 0xff66c4, 0.9);
      g.lineBetween(pivot.x, pivot.y, pivot.x + direction.x * length, pivot.y + direction.y * length);
      g.fillStyle(0xff66c4, 1);
      g.fillCircle(pivot.x + direction.x * length, pivot.y + direction.y * length, 4);
    }
    if (this.debug.targetTile) {
      const target = this.activeDig ? this.activeDig.target : this.getFacingTarget();
      if (target) {
        g.lineStyle(3, 0xffffff, 0.64);
        g.strokeRect(target.tx * TILE_SIZE + 4, target.ty * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      }
    }
  },

  updateInfo: function (dt) {
    if (!this.infoEl) return;
    const digProgress = this.activeDig ? clamp(this.activeDig.elapsed / DIG_DURATION, 0, 1) : 0;
    const phase = this.activeDig ? phaseFor(digProgress) : "none";
    const target = this.activeDig ? this.activeDig.target : this.getFacingTarget();
    const direction = this.getCurrentDigDirection();
    const aim = directionName(direction);
    const mode = this.getDrillRig(direction).mode;
    this.infoEl.innerHTML = [
      "Tank Test V1",
      `Body: ${BODY_SIZE}x${BODY_SIZE}`,
      `Tile: (${this.body.tileX}, ${this.body.tileY})`,
      `Pos: (${this.body.x.toFixed(1)}, ${this.body.y.toFixed(1)})`,
      `Facing: ${this.facing > 0 ? "right" : "left"}`,
      `Drill aim: ${aim}`,
      `Mode: ${mode}`,
      "Press E to drill",
      `Fly: ${this.flyMode}`,
      `Dig phase: ${phase}`,
      `Dig progress: ${(digProgress * 100).toFixed(0)}%`,
      `Target: ${target ? `(${target.tx}, ${target.ty}) ${tileName(target.type)}` : "none"}`,
      `Particles: ${this.particles.length}`,
      `dt: ${dt.toFixed(3)}`,
    ].join("<br>");
  },
});

const GAME = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "sandbox-root",
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: "#13191d",
  physics: { default: "arcade", arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [TankScene],
});
