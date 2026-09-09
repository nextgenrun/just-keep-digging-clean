import { DYNAMIC_EVENT_REVIEW as cfg } from "../../values/dynamicEventReview.js";
import { TILE_TYPES } from "../../values/tileTypes.js";

export function createReviewWorld(depth = cfg.world.depth) {
  const tune = cfg.world;
  const standingTy = tune.topAirRows + depth - 1;
  const tiles = new Map(), rubble = new Map(), dug = new Map();
  const key = (x, y) => `${x},${y}`;
  const model = {
    widthTiles: tune.widthTiles, depthTiles: standingTy + tune.depthPadding,
    topAirRows: tune.topAirRows, config: { seed: cfg.seed }, standingTy,
    destroyedCount: 0,
    dugTiles: dug, rubbleTiles: rubble, dugTileSource: new Map(),
    inBounds: (x, y) => x >= 0 && x < tune.widthTiles && y >= 0 && y < model.depthTiles,
    getTileType(x, y) {
      return tiles.get(key(x, y))?.type ?? (
        Math.abs(x - tune.centerTx) <= tune.chamberHalfWidth
        && y > standingTy - tune.airRows && y <= standingTy ? TILE_TYPES.AIR : TILE_TYPES.STONE);
    },
    isSolid(x, y) { return model.getTileType(x, y) !== TILE_TYPES.AIR; },
    isDiggable(x, y) { return model.inBounds(x, y) && model.isSolid(x, y); },
    getTileHp(x, y) { return tiles.get(key(x, y))?.hp ?? tune.tileHp; },
    getTileMaxHp: () => tune.tileHp,
    getRubbleTiles: () => [...rubble.values()],
    getDugTiles: () => [...dug.values()],
    getDugTileSource: (x, y) => dug.has(key(x, y)) ? { tx: x, ty: y, type: TILE_TYPES.STONE, maxHp: tune.tileHp } : null,
    getOriginalTileType: () => TILE_TYPES.STONE,
    getNaturalTileType: () => TILE_TYPES.STONE,
    setTile(x, y, type, hp = tune.tileHp) {
      if (!model.inBounds(x, y)) return false;
      tiles.set(key(x, y), { tx: x, ty: y, type, hp });
      return true;
    },
    damageTile(x, y, damage) {
      const type = model.getTileType(x, y), wasRubble = rubble.has(key(x, y));
      const hp = Math.max(0, model.getTileHp(x, y) - damage);
      const destroyed = type !== TILE_TYPES.AIR && hp === 0;
      model.setTile(x, y, destroyed ? TILE_TYPES.AIR : type, hp);
      if (destroyed) {
        model.destroyedCount++;
        dug.set(key(x, y), { tx: x, ty: y, type });
        model.dugTileSource.set(key(x, y), type);
        rubble.delete(key(x, y));
      }
      return { destroyed, hp, typeBeforeDamage: type, wasRubble };
    },
    setRubbleTile(x, y, type, hp, maxHp) {
      if (!model.setTile(x, y, type, hp)) return false;
      rubble.set(key(x, y), { tx: x, ty: y, type, hp, maxHp });
      return true;
    },
  };
  return model;
}

export function installReviewWorld(scene, depth) {
  const tune = cfg.world, ts = tune.tileSize;
  scene.worldModel = createReviewWorld(depth);
  scene.config = { ...tune, seed: cfg.seed, worldWidthTiles: tune.widthTiles,
    viewportWidth: cfg.viewport.width, viewportHeight: cfg.viewport.height };
  const floorY = (scene.worldModel.standingTy + 1) * ts;
  const body = { x: tune.centerTx * ts, y: floorY - tune.bodyHeight,
    w: tune.bodyWidth, h: tune.bodyHeight };
  let gp = tune.tileHp;
  scene.playerController = {
    physicsBody: body,
    getPlayerTile: () => ({ tx: Math.floor((body.x + body.w / 2) / ts),
      ty: Math.floor((body.y + body.h / 2) / ts) }),
    getGemPowerExact: () => gp, getGemPowerMax: () => tune.tileHp,
    getEffectiveGemPowerCost: value => value,
    setGemPowerExact: value => { gp = value; },
    consumeGemPower: amount => { const used = Math.min(gp, amount); gp -= used; scene.metrics.hits++; return used; },
    drainAllGemPower: () => { const used = gp; gp = 0; scene.metrics.hits++; return used; },
    applyExternalKnockback() {},
  };
  scene.player = scene.add.sprite(body.x + body.w / 2, floorY, cfg.assets.idle.key)
    .setOrigin(0.5, tune.playerOriginY).setDisplaySize(tune.displaySize, tune.displaySize).setDepth(20);
  scene.player.play("event-lab-idle");
  scene.cameras.main.setZoom(cfg.viewport.zoom);
  scene.cameras.main.centerOn(tune.centerTx * ts, floorY - cfg.viewport.height / 3);
  const viewW = cfg.viewport.width / cfg.viewport.zoom;
  const viewH = cfg.viewport.height / cfg.viewport.zoom;
  scene.background = scene.add.image(tune.centerTx * ts, floorY - cfg.viewport.height / 3,
    cfg.assets.background.key).setDisplaySize(viewW, viewH).setAlpha(tune.backgroundAlpha).setDepth(-10);
  scene.terrain = scene.add.graphics().setDepth(0);
  scene.worldRenderer = {
    dirty: true,
    applyTileUpdate() { this.dirty = true; },
    applyTileUpdates() { this.dirty = true; },
    invalidate() { this.dirty = true; },
  };
  scene.queueDugTilesSave = () => { scene.metrics.saveRequestsIntercepted++; };
  scene.digSystem = { processDestroyedTile: () => { scene.metrics.destroyed++; return null; } };
  scene.retentionProgressSystem = {
    getJournalSnapshot: () => ({ stats: { earthquakesSurvived: scene.metrics.quakesCompleted } }),
    recordEarthquake: () => { scene.metrics.quakesCompleted++; },
  };
  scene.upgradeSystem = {
    isGemPowerUnlocked: () => scene.controls.flight,
    getUpgradeLevel: id => id === "seismicSuppression" && scene.controls.suppressed ? 1 : 0,
  };
  scene.uiNotifications = { warning: message => scene.log(message) };
}

export function paintReviewTerrain(scene) {
  if (!scene.worldRenderer.dirty) return;
  scene.worldRenderer.dirty = false;
  const tune = cfg.world, ts = tune.tileSize, world = scene.worldModel;
  scene.terrain.clear().fillStyle(tune.terrainColor).lineStyle(1, tune.terrainEdgeColor, 0.25);
  const radius = Math.ceil(cfg.viewport.width / cfg.viewport.zoom / ts / 2) + 1;
  for (let tx = tune.centerTx - radius; tx <= tune.centerTx + radius; tx++) {
    for (let ty = world.standingTy - tune.airRows - 4; ty <= world.standingTy + 4; ty++) {
      if (!world.isSolid(tx, ty)) continue;
      scene.terrain.fillRect(tx * ts, ty * ts, ts, ts);
      scene.terrain.strokeRect(tx * ts, ty * ts, ts, ts);
    }
  }
}

export function moveReviewBody(scene, delta) {
  const tune = cfg.world, body = scene.playerController.physicsBody;
  let direction = (scene.keys.D.isDown ? 1 : 0) - (scene.keys.A.isDown ? 1 : 0);
  if (!direction && scene.controls.patrol) {
    const reach = cfg.movement.patrolTiles * tune.tileSize;
    const center = tune.centerTx * tune.tileSize;
    if (body.x > center + reach) scene.patrolDirection = -1;
    if (body.x < center - reach) scene.patrolDirection = 1;
    direction = scene.patrolDirection;
  }
  body.x += direction * tune.moveSpeed * delta / 1000;
  body.x = Math.max((tune.centerTx - tune.chamberHalfWidth) * tune.tileSize,
    Math.min((tune.centerTx + tune.chamberHalfWidth) * tune.tileSize, body.x));
  scene.player.setPosition(body.x + body.w / 2, body.y + body.h).setFlipX(direction < 0);
  scene.player.play(direction ? "event-lab-walk" : "event-lab-idle", true);
}

export function seedReviewTrail(scene) {
  const history = scene.shadow.history, trail = cfg.trail, tune = cfg.world;
  const body = scene.playerController.physicsBody;
  body.x = (tune.centerTx + trail.distanceTiles / 2) * tune.tileSize;
  scene.player.x = body.x + body.w / 2;
  const endX = scene.player.x, endY = scene.player.y;
  scene.patrolDirection = 1;
  history.clear();
  for (let elapsed = 0; elapsed <= trail.durationMs; elapsed += trail.intervalMs) {
    scene.player.x = endX - trail.distanceTiles * tune.tileSize * (1 - elapsed / trail.durationMs);
    const tile = { tx: Math.floor(scene.player.x / tune.tileSize), ty: scene.worldModel.standingTy };
    history.record(scene.clockMs - trail.durationMs + elapsed, scene.player, tile);
  }
  scene.player.setPosition(endX, endY);
}
