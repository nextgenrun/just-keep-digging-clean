import { TILE_TYPES } from "../values/tileTypes.js";

export function createOpeningFlightWorldScene() {
  const cells = new Map();
  const rendererUpdates = [];
  const key = (tx, ty) => `${tx},${ty}`;
  for (let tx = 0; tx < 280; tx += 1) {
    cells.set(key(tx, 65), {
      type: tx < 132 ? TILE_TYPES.FLOOR_TOWN_1 : TILE_TYPES.FLOOR_TOWN_2,
      hp: 0,
    });
    cells.set(key(tx, 66), { type: TILE_TYPES.AIR, hp: 0 });
  }
  const worldModel = {
    dugTiles: new Map(),
    inBounds(tx, ty) {
      return tx >= 0 && tx < 280 && ty >= 0 && ty < 5065;
    },
    setTile(tx, ty, type, hp) {
      cells.set(key(tx, ty), { type, hp });
      if (type !== TILE_TYPES.AIR) this.dugTiles.delete(key(tx, ty));
    },
    isSolid(tx, ty) {
      return (cells.get(key(tx, ty))?.type ?? TILE_TYPES.DIRT)
        !== TILE_TYPES.AIR;
    },
    tileToWorld(tx, ty) {
      return { x: tx * 94 + 47, y: ty * 94 + 47 };
    },
  };
  return {
    cells,
    rendererUpdates,
    scene: {
      config: {
        spawnTileX: 28,
        topAirRows: 65,
        tileSize: 94,
      },
      worldModel,
      worldRenderer: {
        applyTileUpdate(tx, ty) {
          rendererUpdates.push(key(tx, ty));
        },
      },
    },
  };
}

export function createOpeningFlightViewStub() {
  return {
    hud: [],
    passed: [],
    cachesShown: 0,
    cacheCelebrations: 0,
    rewardReveals: [],
    createBuriedGuidance() {},
    setBuriedProximity() {},
    revealArtifact() {},
    settleArtifact() {},
    showHud(payload) { this.hud.push(payload); },
    showEscapeRings() {},
    passRing(index) { this.passed.push(index); },
    showCache() { this.cachesShown += 1; },
    celebrateCache() { this.cacheCelebrations += 1; },
    showRewardReveal(payload) { this.rewardReveals.push(payload); },
    hideRewardReveal() {},
    hideHud() {},
    destroy() {},
  };
}

export function createOpeningFlightRuntimeScene() {
  const fixture = createOpeningFlightWorldScene();
  const rewards = {
    upgrades: [],
    money: 0,
    resources: {
      dirt: 2,
      stone: 3,
      copper: 4,
    },
    fills: 0,
    saves: 0,
    quakePaused: [],
    weather: [],
    notifications: [],
  };
  let flying = false;
  const scene = {
    ...fixture.scene,
    earthquakeSystem: {
      setPaused(value) { rewards.quakePaused.push(value); },
    },
    weatherSystem: {
      forceWeather(...args) { rewards.weather.push(args); },
    },
    upgradeSystem: {
      isGemPowerUnlocked() { return false; },
      grantUpgrade(id, level = 1) {
        rewards.upgrades.push([id, level]);
        return { success: true, level };
      },
      addMoney(amount) { rewards.money += amount; },
    },
    digSystem: {
      getResourceTotals() { return { ...rewards.resources }; },
      setResourceTotals(next) { rewards.resources = { ...next }; },
    },
    playerLevelSystem: {
      level: 1,
      gainLevel(count) {
        this.level += count;
        return { levelUp: true, newLevel: this.level };
      },
    },
    playerController: {
      physicsBody: { x: 0, y: 0, w: 32, h: 48 },
      getPlayerTile() { return { tx: 28, ty: 78 }; },
      input: {
        controlsEnabled: true,
        getVerticalAim() { return { down: true }; },
        setControlsEnabled() {},
      },
      abilities: {
        fillGemPower() { rewards.fills += 1; },
        isFlying() { return flying; },
        setFreeFlightProvider(provider) { this.provider = provider; },
      },
    },
    uiNotifications: {
      success(...args) { rewards.notifications.push(args); },
      info() {},
    },
    hudSystem: { flashStatus() {} },
    floatingTextSystem: { showFloatingText() {} },
    uiResourceBar: { setResources() {} },
    uiInventoryPopup: { setResources() {} },
    soundSystem: { playUiConfirm() {} },
    time: {
      delayedCall(_delay, callback) {
        callback();
        return { remove() {} };
      },
    },
    queueDugTilesSave() { rewards.saves += 1; },
  };
  return {
    scene,
    rewards,
    setFlying(value) { flying = value; },
  };
}
