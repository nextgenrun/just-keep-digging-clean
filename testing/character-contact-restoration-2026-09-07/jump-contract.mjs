import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { PlayerController } from "../../player/PlayerController.js";
import { PlayerJumpInputBuffer } from "../../player/PlayerJumpInputBuffer.js";
import { PlayerSurfaceDropInputBuffer } from
  "../../player/PlayerSurfaceDropInputBuffer.js";
import { TileCollisionSystem } from "../../systems/mining/TileCollisionSystem.js";
import { GAME_CONFIG } from "../../values/gameConfig.js";
import { PLAYER_STATS_CONFIG } from "../../values/playerStats.js";
import { SURVIVAL_UAL_PLAYER_ASSET_PROFILE as profile } from
  "../../values/survivalUalPlayerAssetProfile.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { PLAYER_TRAVERSAL_CONFIG } from "../../values/playerTraversal.js";

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
  const summaries=[];
  for (const fps of [30,60,144]) for (const direction of ["left","right"]) {
    const r=createRig({gp:100}); const sign=direction==="right"?1:-1, dt=1000/fps;
    r.keys[direction].press();r.keys.run.press();r.step(Math.ceil(fps/3),dt);
    const body=r.player.physicsBody,takeoff=Math.abs(body.vx),floor=body.y+body.h;
    assert.ok(takeoff>330,"run reaches its existing ground speed");
    r.keys.jump.press();r.step(1,dt);r.keys.jump.release();
    assert.equal(Math.abs(body.vx),takeoff,"takeoff retains speed on the same input frame");
    for(let n=0;n<Math.floor(fps/4);n++) {r.step(1,dt);assert.ok(Math.abs(body.vx)>=takeoff*.99,"held air input must not cap run speed to walking speed");}
    r.keys[direction].release();r.keys.run.release();
    let guard=0;
    while(!r.player.isGrounded()&&guard++<fps*2) {r.step(1,dt);assert.equal(r.collision.isBodyOverlappingSolid(body),false);}
    assert.ok(r.player.isGrounded());assert.ok(Math.abs(body.y+body.h-floor)<.001);
    const landedSpeed=Math.abs(body.vx),landedX=body.getVisualAnchor().x;assert.ok(landedSpeed>takeoff*.88);
    let previous=landedSpeed,brakeFrames=0;
    while(body.vx && brakeFrames++<fps) {r.step(1,dt);assert.ok(Math.abs(body.vx)<=previous);assert.equal(Math.sign(body.vx)||sign,sign);previous=Math.abs(body.vx);}
    const slide=Math.abs(body.getVisualAnchor().x-landedX),brakeMs=brakeFrames*dt;
    assert.equal(body.vx,0);assert.ok(slide>25&&slide<48,`bounded landing slide ${slide}`);
    assert.ok(brakeMs>=200&&brakeMs<310,`short landing brake ${brakeMs}`);
    summaries.push({fps,direction,takeoff,landedSpeed,slide,brakeMs});r.scene.events.emit("shutdown");
  }
  for(const reverse of [false,true]) {
    const r=createRig({gp:100});r.keys.right.press();r.keys.run.press();r.step(24);r.keys.jump.press();r.step();r.keys.jump.release();
    while(!r.player.isGrounded())r.step();
    if(reverse){r.keys.right.release();r.keys.left.press();}
    const before=r.player.physicsBody.vx;r.step();
    assert.ok(r.player.physicsBody.vx>0,"landing opposite input brakes before reversing");
    if(reverse){assert.ok(r.player.physicsBody.vx<before);r.step(24);assert.ok(r.player.physicsBody.vx<0);} else assert.equal(r.player.physicsBody.vx,before);
    r.scene.events.emit("shutdown");
  }
  const reset=createRig({gp:100});reset.keys.right.press();reset.keys.run.press();reset.step(20);reset.keys.jump.press();reset.step();
  reset.player.setControlsEnabled(false);assert.equal(reset.player.jumpMotion.airborne,false);assert.equal(reset.player.jumpMotion.inheritedSpeedPxPerSec,0);assert.equal(reset.player.physicsBody.vx,0);
  reset.scene.events.emit("shutdown");
  console.log("JUMP_CARRY_LANDING_CONTROLLER_PASS",JSON.stringify(summaries));
} finally {globalThis.Phaser=originalPhaser;}
