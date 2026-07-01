/**
 * Animation Sandbox — Dig Game
 * Standalone Phaser scene for rapid animation & collision testing.
 * Loads player spritesheets + tile textures and creates a small collidable world.
 *
 * Controls:
 *   ← → / A D    Move left/right
 *   ↑ / W / Space Jump
 *   ↓ / S         Dig down / crouch
 *   E             Dig tile in facing direction
 *   SHIFT         Fly/climb mode (hold)
 *   Q             Quickslash
 *   X             Thunderstrike
 *   R             Reset player to spawn
 *
 * Spawn panel on the right: click any button to force-play an animation.
 */
/* global Phaser */

// ── Config ────────────────────────────────────────────────────────────
const TILE_SIZE = 94;
const WORLD_COLS = 30;
const WORLD_ROWS = 20;
const VIEW_W = 1280;
const VIEW_H = 720;

const GRAVITY = 1400;
const MAX_FALL = 99500;
const WALK_SPEED = 200;
const JUMP_VEL = -520;

// Frame ranges (mirrors ASSET_KEYS.player)
const IDLE_FRAMES = Array.from({ length: 35 }, (_, i) => i);
const WALK_FRAMES = Array.from({ length: 51 }, (_, i) => i);
const WALK_LOOP_FRAMES = [...Array.from({ length: 47 }, (_, i) => i + 4), 0, 1, 2, 3];
const DIG_SIDEWAYS_FRAMES = Array.from({ length: 18 }, (_, i) => i);
const DIG_UP_FRAMES = Array.from({ length: 9 }, (_, i) => i);
const DIG_UP_SIDEWAYS_FRAMES = Array.from({ length: 13 }, (_, i) => i);
const FLY_CLIMB_FRAMES = Array.from({ length: 25 }, (_, i) => i);
const WALL_PUSH_FRAMES = Array.from({ length: 7 }, (_, i) => i);
const DIG_DOWN_FRAMES = Array.from({ length: 7 }, (_, i) => i);
const FALLING_FRAMES = Array.from({ length: 7 }, (_, i) => i);
const WALK_RUN_FRAMES = Array.from({ length: 7 }, (_, i) => i);
const COMBAT_IDLE_FRAMES = Array.from({ length: 16 }, (_, i) => i);
const JUMP_FRAMES = Array.from({ length: 39 }, (_, i) => i);
const DUCK_FRAMES = Array.from({ length: 26 }, (_, i) => i);
const QUICKSLASH_FRAMES = Array.from({ length: 10 }, (_, i) => i);
const THUNDER_CHARGE_FRAMES = Array.from({ length: 11 }, (_, i) => i);
const THUNDER_STRIKE_FRAMES = Array.from({ length: 13 }, (_, i) => i);

const DIG_SIDEWAYS_HIT_FRAMES = [
  [0, 1], [2, 3, 4, 5], [6, 7, 8], [9, 10, 11, 12, 13], [14, 15, 16, 17],
];
const DIG_UP_HIT_FRAMES = [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
const DIG_UP_SIDEWAYS_HIT_FRAMES = [
  [0, 1, 2], [3, 4], [5, 6], [7, 8], [9, 10], [11, 12],
];

// Asset paths
const V5_BASE = "sprites/character/character-v5-walk";
const V5_VER = "v5-idle-walk-upscale-20260623";
const V8_SHEETS = "sprites/character/character-v8/sheets";
const V8_RUNTIME = "sprites/character/character-v8/runtime";
const V2_BASE = "sprites/character/character-v2";
const V2_MOVEMENT = V2_BASE + "/character-movement/movement-bare-hands";
const V2_QUICKSLASH = V2_BASE + "/digging/abilities/quickslash";
const V2_THUNDER = V2_BASE + "/digging/abilities/thunder-strike";

// ── Tile world data ──────────────────────────────────────────────────
// 0 = air, 1 = dirt, 2 = stone, 3 = floor, 4 = bedrock
function buildWorld() {
  const grid = [];
  for (let row = 0; row < WORLD_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < WORLD_COLS; col++) {
      // Bottom 2 rows: floor/bedrock
      if (row >= WORLD_ROWS - 2) {
        grid[row][col] = row >= WORLD_ROWS - 1 ? 4 : 3;
      }
      // Middle area: mix of dirt, stone, and air pockets
      else if (row >= 8 && row < WORLD_ROWS - 2) {
        const val = (row * 7 + col * 3 + 11) % 17;
        grid[row][col] = val < 2 ? 0 : (val < 12 ? 1 : 2);
      }
      else {
        // Top rows: walls at edges
        if ((col === 0 || col === WORLD_COLS - 1 || col === WORLD_COLS - 2) && row >= 2) {
          grid[row][col] = 1;
        } else {
          grid[row][col] = 0;
        }
      }
    }
  }
  // Clear spawn area (rows 16-17, cols 5-7)
  grid[WORLD_ROWS - 3][5] = 0;
  grid[WORLD_ROWS - 3][6] = 0;
  grid[WORLD_ROWS - 3][7] = 0;
  grid[WORLD_ROWS - 4][5] = 0;
  grid[WORLD_ROWS - 4][6] = 0;
  grid[WORLD_ROWS - 4][7] = 0;
  return grid;
}

// ── Custom physics body (mirrors PlayerPhysicsBody) ───────────────────
class PhysicsBody {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 48;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.isClimbing = false;
  }

  update(dt) {
    if (!this.isClimbing) {
      this.vy += GRAVITY * dt;
    }
    this.vy = Math.min(this.vy, MAX_FALL);
  }

  moveX(dt) { this.x += this.vx * dt; }
  moveY(dt) { this.y += this.vy * dt; }
}

// ── Main sandbox scene ──────────────────────────────────────────────
const SandboxScene = new Phaser.Class({

  Extends: Phaser.Scene,

  initialize: function SandboxScene() {
    Phaser.Scene.call(this, { key: 'SandboxScene' });
  },

  preload: function () {
    // Helper: load 341×341 spritesheet
    const f341 = (key, path, endFrame) => {
      this.load.spritesheet(key, path, { frameWidth: 341, frameHeight: 341, endFrame: endFrame });
    };

    // v5 walk sheets
    f341('s_idle',             V5_BASE + "/idle-sheet.webp?v=" + V5_VER, IDLE_FRAMES.length - 1);
    f341('s_walk',             V5_BASE + "/walk-sheet.webp?v=" + V5_VER, WALK_FRAMES.length - 1);
    f341('s_dig_sideways',     V5_BASE + "/dig/dig-sideways-sheet.webp?v=" + V5_VER, DIG_SIDEWAYS_FRAMES.length - 1);
    f341('s_dig_up',           V5_BASE + "/dig/dig-up-sheet.webp?v=" + V5_VER, DIG_UP_FRAMES.length - 1);
    f341('s_dig_up_sideways',  V5_BASE + "/dig/dig-up-sideways-sheet.webp?v=" + V5_VER, DIG_UP_SIDEWAYS_FRAMES.length - 1);
    f341('s_fly_climb',        V5_BASE + "/fly-climb/fly-climb-sheet.webp?v=" + V5_VER, FLY_CLIMB_FRAMES.length - 1);

    // v8 sheets
    f341('s_jump',             V8_SHEETS + "/jump-sheet.webp", 38);
    f341('s_duck',             V8_SHEETS + "/duck-sheet.webp", 25);
    f341('s_dig_down',         V8_SHEETS + "/dig-down-sheet.webp", 6);
    f341('s_falling',          V8_SHEETS + "/falling-sheet.webp", 6);
    f341('s_quickslash',       V8_SHEETS + "/quickslash-sheet.webp", 9);
    f341('s_thunder_charge',   V8_SHEETS + "/thunder-charge-sheet.webp", 10);
    f341('s_thunder_strike',   V8_SHEETS + "/thunder-strike-sheet.webp", 12);

    // v8 runtime sheets
    f341('s_wall_push',        V8_RUNTIME + "/wall-push-sheet.webp", 6);
    f341('s_combat_idle',      V8_RUNTIME + "/combat-idle-recover-sheet.webp", 15);
    f341('s_walk_run',         V8_RUNTIME + "/walk-run-sheet.webp", 6);
    f341('s_dig_down_v8r',     V8_RUNTIME + "/dig-down-sheet.webp", 6);
    f341('s_falling_v8r',      V8_RUNTIME + "/falling-downward-through-sky-sheet.webp", 6);

    // v2 single-frame images
    this.load.image('s_jump_v2',       V2_MOVEMENT + "/jump/jump-1.webp");
    this.load.image('s_duck_v2',       V2_MOVEMENT + "/duck/duck-1.webp");
    this.load.image('s_quickslash_f1', V2_QUICKSLASH + "/uickslash-1.webp");
    this.load.image('s_quickslash_f2', V2_QUICKSLASH + "/uickslash-2 .webp");
    this.load.image('s_thunder_charge_img', V2_THUNDER + "/charging.webp");
    this.load.image('s_thunder_strike_img', V2_THUNDER + "/thunder-strike.webp");

    // ── Tile textures ──
    this.load.image('tile_dirt',    'sprites/tiles/tiles-under-1000/dirt-tiles/5-of-5-hp.webp');
    this.load.image('tile_stone',   'sprites/tiles/tiles-under-1000/resource-stone-tile/5-of-5-hp.webp');
    this.load.image('tile_floor',   'sprites/tiles/base-tiles/floor-town-1.webp');
    this.load.image('tile_bedrock', 'sprites/tiles/approved-world/bedrock-wall.webp');
    this.load.image('tile_copper',  'sprites/tiles/tiles-under-1000/resource-copper-tile/5-of-5-hp.webp');
  },

  create: function () {
    // ── Build world grid ──
    this.world = buildWorld();
    this.tileGroup = this.add.group();

    // ── Render tiles ──
    this.renderTiles();

    // ── Player sprite ──
    this.playerSprite = this.add.sprite(0, 0, 's_idle', 0);
    this.playerSprite.setOrigin(0.5, 1);
    this.playerSprite.setDepth(10);

    // ── Physics body ──
    this.physicsBody = new PhysicsBody(0, 0);
    this.teleportToTile(5, WORLD_ROWS - 4);

    // ── Create all animations ──
    this.createAllAnims();

    // ── State ──
    this.facingRight = true;
    this.currentAnimName = null;
    this.isDigging = false;
    this.isFlying = false;
    this.isClimbing = false;

    // ── Input ──
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keyA = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyD = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyW = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyS = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyShift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.keySpace = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ── Dig cooldown ──
    this.digCooldown = 0;

    // ── Camera ──
    this.cameras.main.setBounds(0, 0, WORLD_COLS * TILE_SIZE, WORLD_ROWS * TILE_SIZE);
    this.cameras.main.setBackgroundColor('#111820');

    // ── Info overlay ──
    this.infoEl = document.getElementById('info-overlay');
    if (this.infoEl) this.infoEl.textContent = 'Sandbox loaded.';

    // ── Spawn panel ──
    this.createSpawnPanel();
  },

  renderTiles: function () {
    this.tileGroup.clear(true, true);
    const keyMap = { 1: 'tile_dirt', 2: 'tile_stone', 3: 'tile_floor', 4: 'tile_bedrock' };
    for (let row = 0; row < WORLD_ROWS; row++) {
      for (let col = 0; col < WORLD_COLS; col++) {
        const type = this.world[row][col];
        const key = keyMap[type];
        if (!key) continue;
        const x = col * TILE_SIZE + TILE_SIZE / 2;
        const y = row * TILE_SIZE + TILE_SIZE;
        this.tileGroup.add(this.add.image(x, y, key).setOrigin(0.5, 1).setDepth(0));
      }
    }
  },

  teleportToTile: function (tx, ty) {
    const px = tx * TILE_SIZE + TILE_SIZE / 2;
    const py = ty * TILE_SIZE;
    const body = this.physicsBody;
    body.x = px;
    body.y = py;
    body.vx = 0;
    body.vy = 0;
    body.onGround = false;
    this.playerSprite.setPosition(px, py);
  },

  createAllAnims: function () {
    const self = this;
    // Spritesheet anim
    const sf = (key, sheetKey, frames, frameRate, repeat) => {
      if (self.anims.exists(key)) return;
      self.anims.create({
        key: key,
        frames: frames.map(function (f) { return { key: sheetKey, frame: f }; }),
        frameRate: frameRate,
        repeat: (repeat !== undefined ? repeat : -1),
      });
    };
    // Image anim (single frame)
    const si = (key, imageKey, frameRate, repeat) => {
      if (self.anims.exists(key)) return;
      self.anims.create({
        key: key,
        frames: [{ key: imageKey }],
        frameRate: frameRate || 1,
        repeat: (repeat !== undefined ? repeat : -1),
      });
    };
    // Hit-chain anims
    const hit = (animKeys, sheetKey, frameGroups, frameRate) => {
      for (let i = 0; i < animKeys.length; i++) {
        sf(animKeys[i], sheetKey, frameGroups[i], frameRate, 0);
      }
    };

    // Idle
    sf('sand_idle', 's_idle', IDLE_FRAMES, 8, -1);
    // Walk
    sf('sand_walk_start', 's_walk', [0, 1, 2, 3], 14, 0);
    sf('sand_walk_loop', 's_walk', WALK_LOOP_FRAMES, 14, -1);
    sf('sand_walk_stop', 's_walk', [3, 2, 1, 0], 14, 0);
    // Walk run (v8 runtime)
    sf('sand_walk_run', 's_walk_run', WALK_RUN_FRAMES, 16, -1);
    // Jump
    sf('sand_jump', 's_jump', JUMP_FRAMES, 12, 0);
    // Falling
    sf('sand_falling', 's_falling_v8r', FALLING_FRAMES, 12, -1);
    // Duck
    sf('sand_duck', 's_duck', DUCK_FRAMES, 8, 0);
    // Dig sideways hit chain
    hit(
      ['sand_dig_sideways_hit_1','sand_dig_sideways_hit_2','sand_dig_sideways_hit_3','sand_dig_sideways_hit_4','sand_dig_sideways_hit_5'],
      's_dig_sideways', DIG_SIDEWAYS_HIT_FRAMES, 30
    );
    // Dig up hit chain
    hit(
      ['sand_dig_up_hit_1','sand_dig_up_hit_2','sand_dig_up_hit_3'],
      's_dig_up', DIG_UP_HIT_FRAMES, 30
    );
    // Dig up sideways hit chain
    hit(
      ['sand_dig_up_sideways_hit_1','sand_dig_up_sideways_hit_2','sand_dig_up_sideways_hit_3','sand_dig_up_sideways_hit_4','sand_dig_up_sideways_hit_5','sand_dig_up_sideways_hit_6'],
      's_dig_up_sideways', DIG_UP_SIDEWAYS_HIT_FRAMES, 30
    );
    // Dig down
    sf('sand_dig_down', 's_dig_down_v8r', DIG_DOWN_FRAMES, 18, 0);
    // Fly / Climb
    sf('sand_climb', 's_fly_climb', FLY_CLIMB_FRAMES, 14, -1);
    sf('sand_fly', 's_fly_climb', FLY_CLIMB_FRAMES, 14, -1);
    // Wall push
    sf('sand_wall_push', 's_wall_push', WALL_PUSH_FRAMES, 8, -1);
    // Combat idle recover (plays once)
    sf('sand_combat_idle', 's_combat_idle', COMBAT_IDLE_FRAMES, 8, 0);
    // Quickslash
    sf('sand_quickslash', 's_quickslash', QUICKSLASH_FRAMES, 12, 0);
    // Thunderstrike
    sf('sand_thunder_charge', 's_thunder_charge', THUNDER_CHARGE_FRAMES, 8, -1);
    sf('sand_thunder_strike', 's_thunder_strike', THUNDER_STRIKE_FRAMES, 12, 0);
  },

  playAnim: function (name, ignoreCooldown) {
    if (!ignoreCooldown && this.isDigging) return;
    if (this.currentAnimName === name && this.playerSprite.anims.isPlaying) return;
    this.playerSprite.play(name);
    this.currentAnimName = name;
  },

  update: function (time, delta) {
    var dt = Math.min(delta / 1000, 0.05);
    var body = this.physicsBody;
    var sprite = this.playerSprite;

    // ── Dig cooldown ──
    if (this.digCooldown > 0) this.digCooldown -= dt;

    // ── Input ──
    var left = this.cursors.left.isDown || this.keyA.isDown;
    var right = this.cursors.right.isDown || this.keyD.isDown;
    var jump = this.cursors.up.isDown || this.keyW.isDown || this.keySpace.isDown;
    var down = this.cursors.down.isDown || this.keyS.isDown;
    var dig = Phaser.Input.Keyboard.JustDown(this.keyE);
    var reset = Phaser.Input.Keyboard.JustDown(this.keyR);
    var quickslash = Phaser.Input.Keyboard.JustDown(this.keyQ);
    var thunderstrike = Phaser.Input.Keyboard.JustDown(this.keyX);
    var flyToggle = this.keyShift.isDown;

    // ── Reset ──
    if (reset) {
      this.teleportToTile(5, WORLD_ROWS - 4);
      this.isDigging = false;
      this.isFlying = false;
      this.isClimbing = false;
      this.playerSprite.setFlipX(false);
      this.facingRight = true;
      return;
    }

    // ── Flying / climbing mode ──
    this.isFlying = flyToggle;
    body.isClimbing = this.isFlying;

    // ── Physics update ──
    body.update(dt);

    // ── Horizontal movement ──
    body.vx = 0;
    if (left) {
      body.vx = -WALK_SPEED;
      this.facingRight = false;
      sprite.setFlipX(true);
    } else if (right) {
      body.vx = WALK_SPEED;
      this.facingRight = true;
      sprite.setFlipX(false);
    }

    // ── Jump (only when on ground) ──
    if (jump && body.onGround && !this.isFlying) {
      body.vy = JUMP_VEL;
      body.onGround = false;
    }

    // ── Flying movement ──
    if (this.isFlying) {
      if (jump) body.vy = -WALK_SPEED * 1.2;
      else if (down) body.vy = WALK_SPEED * 1.2;
      else if (!left && !right) body.vy *= 0.92;
    }

    // ── Apply velocity to position ──
    body.moveX(dt);
    body.moveY(dt);

    // ── Tile collision resolution ──
    this.resolveCollision(body);

    // ── Ground check ──
    body.onGround = this.isOnGround(body);

    // ── Update sprite position ──
    sprite.setPosition(body.x, body.y);

    // ── Animation state machine ──
    this.updateAnimation(body, quickslash, thunderstrike, jump, down, left, right, dig);

    // ── Camera follow (lerped) ──
    var cam = this.cameras.main;
    cam.scrollX += ((body.x - VIEW_W / 2) - cam.scrollX) * 0.12;
    cam.scrollY += ((body.y - VIEW_H / 2) - cam.scrollY) * 0.12;

    // ── Update info overlay ──
    this.updateInfo();
  },

  isOnGround: function (body) {
    var checkY = body.y + 1;
    var col = Math.floor(body.x / TILE_SIZE);
    var row = Math.floor(checkY / TILE_SIZE);
    if (row >= WORLD_ROWS || col < 0 || col >= WORLD_COLS) return true;
    if (row < 0) return false;
    return this.world[row][col] !== 0;
  },

  resolveCollision: function (body) {
    var left = body.x - body.w / 2;
    var right = body.x + body.w / 2;
    var top = body.y - body.h;
    var bottom = body.y;

    var tileLeft = Math.floor(left / TILE_SIZE);
    var tileRight = Math.floor(right / TILE_SIZE);
    var tileTop = Math.floor(top / TILE_SIZE);
    var tileBottom = Math.floor(bottom / TILE_SIZE);

    var self = this;
    function isSolid(r, c) {
      if (r < 0 || r >= WORLD_ROWS || c < 0 || c >= WORLD_COLS) return true;
      return self.world[r][c] !== 0;
    }

    // X-axis collision
    if (body.vx !== 0) {
      var xDir = body.vx > 0 ? 1 : -1;
      var checkEdge = xDir > 0 ? tileRight : tileLeft;
      for (var r = tileTop; r <= tileBottom; r++) {
        if (isSolid(r, checkEdge)) {
          if (xDir > 0) {
            body.x = checkEdge * TILE_SIZE - body.w / 2;
          } else {
            body.x = checkEdge * TILE_SIZE + body.w / 2 + TILE_SIZE;
          }
          body.vx = 0;
          break;
        }
      }
    }

    // Y-axis collision
    if (body.vy !== 0) {
      var yDir = body.vy > 0 ? 1 : -1;
      var checkEdge = yDir > 0 ? tileBottom : tileTop;
      for (var c = tileLeft; c <= tileRight; c++) {
        if (isSolid(checkEdge, c)) {
          if (yDir > 0) {
            body.y = checkEdge * TILE_SIZE;
          } else {
            body.y = checkEdge * TILE_SIZE + body.h + TILE_SIZE;
          }
          body.vy = 0;
          if (yDir > 0) body.onGround = true;
          break;
        }
      }
    }
  },

  updateAnimation: function (body, quickslash, thunderstrike, jump, down, left, right, dig) {
    // ── Special abilities (interrupt) ──
    if (quickslash) {
      this.isDigging = true;
      this.playAnim('sand_quickslash');
      var self = this;
      this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function (anim) {
        if (anim.key === 'sand_quickslash') self.isDigging = false;
      });
      return;
    }
    if (thunderstrike) {
      this.isDigging = true;
      this.playAnim('sand_thunder_charge');
      var self2 = this;
      this.time.delayedCall(800, function () {
        self2.playAnim('sand_thunder_strike');
        self2.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function (anim) {
          if (anim.key === 'sand_thunder_strike') self2.isDigging = false;
        });
      });
      return;
    }

    // ── Digging ──
    if (dig && this.digCooldown <= 0) {
      this.digTile();
      this.digCooldown = 0.2;
      this.isDigging = true;
      var self3 = this;
      if (down) {
        this.playAnim('sand_dig_down');
        this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function (anim) {
          if (anim.key === 'sand_dig_down') self3.isDigging = false;
        });
      } else if (jump) {
        this.playAnim('sand_dig_up_hit_1');
        this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function (anim) {
          if (anim.key === 'sand_dig_up_hit_1') self3.isDigging = false;
        });
      } else {
        this.playAnim('sand_dig_sideways_hit_1');
        this.playerSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, function (anim) {
          if (anim.key === 'sand_dig_sideways_hit_1') self3.isDigging = false;
        });
      }
      return;
    }
    if (this.isDigging) return;

    // ── Flying / climbing ──
    if (this.isFlying) {
      this.playAnim('sand_fly');
      return;
    }

    // ── In air ──
    if (!body.onGround) {
      if (body.vy > 50) {
        this.playAnim('sand_falling');
      } else {
        this.playAnim('sand_jump');
      }
      return;
    }

    // ── On ground ──
    if (left || right) {
      this.playAnim('sand_walk_loop');
    } else if (down) {
      this.playAnim('sand_duck');
    } else {
      this.playAnim('sand_idle');
    }
  },

  digTile: function () {
    var body = this.physicsBody;
    var col = Math.floor(body.x / TILE_SIZE);
    var row = Math.floor(body.y / TILE_SIZE);
    var down = this.cursors.down.isDown || this.keyS.isDown;
    var up = this.cursors.up.isDown || this.keyW.isDown;

    var tx, ty;
    if (down) {
      // Dig tile below
      tx = col;
      ty = row + 1;
    } else if (up) {
      // Dig tile above
      tx = col;
      ty = row - 1;
    } else {
      // Dig tile in facing direction
      tx = col + (this.facingRight ? 1 : -1);
      ty = row;
    }

    // Clamp
    tx = Math.max(0, Math.min(WORLD_COLS - 1, tx));
    ty = Math.max(0, Math.min(WORLD_ROWS - 1, ty));

    // Dig it
    if (this.world[ty][tx] !== 0) {
      this.world[ty][tx] = 0;
      this.renderTiles();
    }
  },

  updateInfo: function () {
    if (!this.infoEl) return;
    var body = this.physicsBody;
    var col = Math.floor(body.x / TILE_SIZE);
    var row = Math.floor(body.y / TILE_SIZE);
    this.infoEl.innerHTML =
      'Anim: ' + (this.currentAnimName || 'none') + '<br>' +
      'Pos: (' + body.x.toFixed(0) + ', ' + body.y.toFixed(0) + ')<br>' +
      'Tile: (' + col + ', ' + row + ')<br>' +
      'Vel: (' + body.vx.toFixed(0) + ', ' + body.vy.toFixed(0) + ')<br>' +
      'Ground: ' + body.onGround + '<br>' +
      'Flying: ' + this.isFlying + '<br>' +
      'Facing: ' + (this.facingRight ? '\u2192' : '\u2190');
  },

  createSpawnPanel: function () {
    var panel = document.getElementById('spawn-panel');
    if (!panel) return;
    var scene = this;
    var btns = [
      ['Idle', 'sand_idle'],
      ['Walk Loop', 'sand_walk_loop'],
      ['Walk Run', 'sand_walk_run'],
      ['Walk Start', 'sand_walk_start'],
      ['Walk Stop', 'sand_walk_stop'],
      ['Jump', 'sand_jump'],
      ['Fall', 'sand_falling'],
      ['Duck', 'sand_duck'],
      ['Dig Sideways', 'sand_dig_sideways_hit_1'],
      ['Dig Up', 'sand_dig_up_hit_1'],
      ['Dig Up-Side', 'sand_dig_up_sideways_hit_1'],
      ['Dig Down', 'sand_dig_down'],
      ['Fly', 'sand_fly'],
      ['Climb', 'sand_climb'],
      ['Wall Push', 'sand_wall_push'],
      ['Combat Idle', 'sand_combat_idle'],
      ['Quickslash', 'sand_quickslash'],
      ['Thunder Charge', 'sand_thunder_charge'],
      ['Thunder Strike', 'sand_thunder_strike'],
    ];
    for (var i = 0; i < btns.length; i++) {
      (function (label, animKey) {
        var btn = document.createElement('button');
        btn.textContent = label;
        btn.onclick = function () {
          if (!scene.anims || !scene.anims.exists(animKey)) return;
          scene.isDigging = false;
          if (scene.playerSprite) scene.playerSprite.stop();
          scene.playAnim(animKey, true);
        };
        panel.appendChild(btn);
      })(btns[i][0], btns[i][1]);
    }
  },

});

// ── Phaser game config ───────────────────────────────────────────────
var GAME = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'sandbox-root',
  width: VIEW_W,
  height: VIEW_H,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#111820',
  physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [SandboxScene],
});