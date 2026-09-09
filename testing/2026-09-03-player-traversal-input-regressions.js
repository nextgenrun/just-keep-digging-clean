import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { PlayerController } from "../player/PlayerController.js";
import { PlayerJumpInputBuffer } from "../player/PlayerJumpInputBuffer.js";
import { PlayerSurfaceDropInputBuffer } from
  "../player/PlayerSurfaceDropInputBuffer.js";
import { TileCollisionSystem } from "../systems/mining/TileCollisionSystem.js";
import { GAME_CONFIG } from "../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../values/playerStats.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../values/survivalUalPlayerAssetProfile.js";
import { TILE_TYPES } from "../values/tileTypes.js";
import { PLAYER_TRAVERSAL_CONFIG } from "../values/playerTraversal.js";

// Match Phaser Key.onDown/onUp: a released tap loses _justDown before update.
class TestKey extends EventEmitter {
  isDown = false;
  _justDown = false;

  press(event) {
    if (this.isDown) return;
    this.isDown = true;
    this._justDown = true;
    this.emit("down", this, event);
  }

  release() {
    this.isDown = false;
    this._justDown = false;
    this.emit("up", this);
  }
}

const originalPhaser = globalThis.Phaser;
globalThis.Phaser = {
  Input: { Keyboard: { JustDown(key) {
    const result = key?._justDown === true;
    if (key) key._justDown = false;
    return result;
  } } },
};

const failures = [];
let cases = 0;
function check(name, run) {
  cases += 1;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}

function createRig({ gp = 0, townFloor = false, terrace = false } = {}) {
  const floorRow = 8;
  const config = {
    ...GAME_CONFIG,
    ...PLAYER_STATS_CONFIG,
    playerBodyWidthPx: profile.playerBodyWidthPx,
    playerBodyHeightPx: profile.playerBodyHeightPx,
    spawnTileX: 3,
    spawnTileY: floorRow - 1,
    playerSpawnTileX: 3,
    playerSpawnTileY: floorRow - 1,
    topAirRows: townFloor ? floorRow : 1,
  };
  const getTileType = (_tx, ty) => {
    if (terrace || ty < floorRow) return TILE_TYPES.AIR;
    if (!townFloor) return TILE_TYPES.STONE;
    if (ty === floorRow) return TILE_TYPES.FLOOR_TOWN_1;
    if (ty === floorRow + 1) return TILE_TYPES.AIR;
    return TILE_TYPES.STONE;
  };
  const world = {
    isSolid: (tx, ty) => getTileType(tx, ty) !== TILE_TYPES.AIR,
    inBounds: (tx, ty) => tx >= 0 && tx < 16 && ty >= 0 && ty < 16,
    getTile: getTileType,
    getTileType,
    worldToTile: (x, y) => ({
      tx: Math.floor(x / config.tileSize), ty: Math.floor(y / config.tileSize),
    }),
  };
  const keys = Object.fromEntries([
    "left", "right", "aimUp", "aimDown", "jump", "shift", "run", "mine", "q", "reset",
  ].map((name) => [name, new TestKey()]));
  keys.aimLeft = keys.left;
  keys.aimRight = keys.right;
  const scene = { playerAssetProfile: profile, events: new EventEmitter() };
  const sprite = {
    scene,
    setOrigin(x, y) { this.originX = x; this.originY = y; },
  };
  const upgrades = { isGemPowerUnlocked: () => true };
  const collision = new TileCollisionSystem(world, config);
  if (terrace) collision.setOneWayPlatformProvider(() => [{
    id: "test-terrace", leftX: 0, y: floorRow * config.tileSize,
    rightX: 16 * config.tileSize,
  }]);
  const player = new PlayerController(
    scene, sprite, world, config, upgrades, { getKeys: () => keys },
    null, null, collision,
  );
  player.abilities.setGemPowerExact(gp);
  const step = (count = 1, delta = 1000 / 60) => {
    for (let index = 0; index < count; index += 1) player.update(delta);
  };
  step();
  return { player, keys, collision, config, scene, step };
}

try {
  for (const surface of [{}, { townFloor: true }, { terrace: true }]) {
    const label = JSON.stringify(surface);
    check(`normal Space jump ${label}`, () => {
      const rig = createRig(surface);
      assert.equal(rig.player.state.isGrounded(), true);
      const before = rig.player.physicsBody.y;
      rig.keys.jump.press();
      rig.step();
      assert.ok(rig.player.physicsBody.y < before, "Space must lift the real body");
      assert.ok(rig.player.physicsBody.vy < 0);
      assert.equal(rig.collision.isBodyOverlappingSolid(rig.player.physicsBody), false);
      rig.scene.events.emit("shutdown");
    });
    check(`short Space tap across a delayed frame ${label}`, () => {
      const rig = createRig(surface);
      const before = rig.player.physicsBody.y;
      rig.keys.jump.press();
      rig.keys.jump.release();
      rig.step(1, 100);
      assert.ok(rig.player.physicsBody.y < before, "released Space tap was dropped");
      rig.scene.events.emit("shutdown");
    });
  }

  for (const surface of [{ townFloor: true }, { terrace: true }]) {
    const label = surface.townFloor ? "town floor" : "Worldroot terrace";
    for (const direction of ["left", "right"]) {
      for (const running of [false, true]) {
        for (const released of [false, true]) {
          check(JSON.stringify({ label, direction, running, released }), () => {
            const rig = createRig({ ...surface, gp: 50 });
            rig.keys[direction].press();
            if (running) rig.keys.run.press();
            rig.step(3);
            const body = rig.player.physicsBody;
            const sign = direction === "right" ? 1 : -1;
            assert.ok(body.vx * sign > 0, "fixture must already be moving");
            assert.equal(rig.player.isRunning(), running);
            const beforeY = body.y;
            let defaultPrevented = false;
            rig.keys.aimDown.press({ ctrlKey: running, preventDefault() { defaultPrevented = true; } });
            assert.equal(defaultPrevented, running, "Ctrl+S must stay in gameplay while running");
            if (released) rig.keys.aimDown.release();
            rig.step(1, released ? 100 : 1000 / 60);
            assert.ok(body.y > beforeY, "first S press was dropped");
            assert.ok(body.vx * sign > 0, "drop cancelled sideways velocity");
            rig.step(30);
            assert.ok(body.y >= 9 * rig.config.tileSize, "body was caught again crossing the floor");
            assert.equal(rig.collision.isBodyOverlappingSolid(body), false);
            if (surface.townFloor) assert.equal(body.surfaceDropThroughRow, null);
            rig.scene.events.emit("shutdown");
          });
        }
      }
    }
  }

  check("released S tap cannot drop through ordinary solid ground", () => {
    const rig = createRig();
    rig.keys.right.press();
    rig.step(3);
    const beforeY = rig.player.physicsBody.y;
    rig.keys.aimDown.press();
    rig.keys.aimDown.release();
    rig.step(1, 100);
    assert.equal(rig.player.physicsBody.y, beforeY);
    rig.scene.events.emit("shutdown");
  });

  check("holding Space cannot auto-jump after landing", () => {
    const rig = createRig();
    const before = rig.player.physicsBody.y;
    rig.keys.jump.press();
    rig.step(180);
    assert.equal(rig.player.state.isGrounded(), true);
    assert.equal(rig.player.physicsBody.y, before);
    rig.keys.jump.emit("down", rig.keys.jump, { repeat: true });
    rig.step();
    assert.equal(rig.player.physicsBody.y, before, "OS repeat cannot retrigger a jump");
    rig.scene.events.emit("shutdown");
  });

  check("empty Flight plus Shift cannot create a jump", () => {
    const rig = createRig();
    const before = rig.player.physicsBody.y;
    rig.keys.shift.press();
    rig.step(60);
    assert.equal(rig.player.abilities.isFlying(), false);
    assert.equal(rig.player.physicsBody.y, before);
    assert.equal(rig.player.physicsBody.vy, 0);
    rig.scene.events.emit("shutdown");
  });

  check("Space remains available while empty Flight is held", () => {
    const rig = createRig();
    const before = rig.player.physicsBody.y;
    rig.keys.shift.press();
    rig.keys.jump.press();
    rig.keys.jump.release();
    rig.step();
    assert.equal(rig.player.abilities.isFlying(), false);
    assert.ok(rig.player.physicsBody.y < before);
    rig.scene.events.emit("shutdown");
  });

  check("Space pressed during powered Flight cannot linger until fuel runs out", () => {
    const rig = createRig({ gp: 50 });
    rig.keys.shift.press();
    rig.keys.jump.press();
    rig.step();
    assert.equal(rig.player.abilities.isFlying(), true);
    assert.equal(rig.keys.jump._justDown, false, "flight left an unconsumed Space press");
    rig.scene.events.emit("shutdown");
  });

  check("disabled controls cannot queue a jump for resume", () => {
    const rig = createRig();
    const before = rig.player.physicsBody.y;
    rig.player.setControlsEnabled(false);
    rig.keys.jump.press();
    rig.player.setControlsEnabled(true);
    rig.step();
    assert.equal(rig.player.physicsBody.y, before);
    rig.scene.events.emit("shutdown");
  });

  check("rebinding detaches the former jump key", () => {
    const rig = createRig();
    const before = rig.player.physicsBody.y;
    const former = rig.keys.jump;
    const replacement = new TestKey();
    rig.player.input.setKeys({ ...rig.keys, jump: replacement });
    former.press();
    rig.step();
    assert.equal(rig.player.physicsBody.y, before);
    replacement.press();
    replacement.release();
    rig.step();
    assert.ok(rig.player.physicsBody.y < before);
    rig.scene.events.emit("shutdown");
    assert.equal(former.listenerCount("down"), 0);
    assert.equal(replacement.listenerCount("down"), 0);
  });

  check("an old request expires instead of jumping after a long suspension", () => {
    let nowMs = 0;
    const key = new TestKey();
    const buffer = new PlayerJumpInputBuffer(
      { controlsEnabled: true, keys: { jump: key } }, () => nowMs,
    );
    key.press();
    nowMs += PLAYER_TRAVERSAL_CONFIG.jump.inputBufferMs + 1;
    assert.equal(buffer.consume(), false);
    assert.equal(key._justDown, false);
    key.release();
    key.press();
    key.release();
    assert.equal(buffer.consume(), true);
    assert.equal(buffer.consume(), false);
    buffer.destroy();
    assert.equal(key.listenerCount("down"), 0);
  });

  check("surface-drop input waits for one gameplay sample and never replays", () => {
    const aimDown = new TestKey();
    const shift = new TestKey();
    const input = {
      controlsEnabled: true,
      keys: { aimDown, shift },
    };
    const buffer = new PlayerSurfaceDropInputBuffer(input);
    aimDown.press({ ctrlKey: true });
    aimDown.release();
    assert.equal(buffer.consume(), false, "Ctrl alone is not the bound Run action");
    aimDown.press({ ctrlKey: true, altKey: true });
    aimDown.release();
    assert.equal(buffer.consume(), false, "modified S must stay available to shortcuts");
    aimDown.press();
    aimDown.release();
    shift.press();
    assert.equal(buffer.consume(), false);
    shift.release();
    assert.equal(buffer.consume(), false);
    aimDown.press();
    aimDown.release();
    assert.equal(buffer.consume(), true, "the next gameplay sample must keep the tap");
    assert.equal(buffer.consume(), false, "one tap must be consumed exactly once");
    buffer.destroy();
    assert.equal(aimDown.listenerCount("down"), 0);
  });

  check("a press during knockback cannot replay once the lock expires", () => {
    const rig = createRig();
    const before = rig.player.physicsBody.y;
    rig.player.externalKnockbackMs = 100;
    rig.keys.jump.press();
    rig.step(10);
    assert.equal(rig.player.physicsBody.y, before);
    rig.scene.events.emit("shutdown");
  });

  check("Space spends no GP and works at low or full charge", () => {
    for (const gp of [1, 10, 100]) {
      const rig = createRig({ gp });
      const before = rig.player.physicsBody.y;
      rig.keys.jump.press();
      rig.keys.jump.release();
      rig.step();
      assert.ok(rig.player.physicsBody.y < before);
      assert.ok(rig.player.abilities.gemPower >= gp);
      rig.scene.events.emit("shutdown");
    }
  });
} finally {
  if (originalPhaser === undefined) delete globalThis.Phaser;
  else globalThis.Phaser = originalPhaser;
}

assert.deepEqual(failures, [], failures.join("\n"));
console.log("PLAYER_TRAVERSAL_INPUT_REGRESSIONS_OK", { cases });
