// Local-only fixture: real production scene, temporary world, no save writes.
import { TILE_TYPES } from '../values/tileTypes.js';
const output = document.querySelector('#status');
const frame = document.querySelector('iframe');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const results = [];
const errors = [];
const until = async predicate => {
  const deadline = Date.now() + 600000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Game readiness timeout');
    await delay(250);
  }
};
try {
  await until(() => frame.contentWindow.__phaserGame?.scene.isActive('MainMenuScene'));
  const win = frame.contentWindow;
  win.addEventListener('error', event => errors.push(event.message));
  const game = win.__phaserGame;
  game.scene.getScene('MainMenuScene').scene.start('WorldLoadScene', {
    saveSlot: 3, worldIdentity: 'depth-weather-profile-2026-09-12', isNewSave: true, tutorialChoice: 'no',
  });
  await until(() => game.scene.getScene('PlayScene')?.gameState === 'playing');
  const scene = game.scene.getScene('PlayScene');
  win.__jkdE2E?.closeAll?.();
  const totals = {};
  let recording = false;
  const wrap = (owner, key, label) => {
    if (typeof owner?.[key] !== 'function') return;
    const original = owner[key];
    owner[key] = function (...args) {
      if (!recording) return original.apply(this, args);
      const start = performance.now();
      try { return original.apply(this, args); }
      finally { totals[label] = (totals[label] || 0) + performance.now() - start; }
    };
  };
  for (const [key, owner] of Object.entries(scene)) wrap(owner, 'update', key);
  wrap(scene.worldRenderer, 'updateRenderWindow', 'renderWindow');
  wrap(scene, 'update', 'sceneUpdate');
  const weather = scene.weatherSystem;
  for (const [key, owner] of Object.entries(weather)) wrap(owner, 'update', `weather.${key}`);
  let renderStart = 0;
  game.events.on('prerender', () => { renderStart = performance.now(); });
  game.events.on('postrender', () => {
    if (recording) totals.render = (totals.render || 0) + performance.now() - renderStart;
  });
  for (const depth of [0, 800, 1200]) {
    if (depth) {
      const ty = scene.config.topAirRows + depth;
      for (let x = 57; x <= 63; x++) {
        for (let y = ty - 4; y <= ty; y++) scene.worldModel.setTile(x, y, TILE_TYPES.AIR, 0);
        scene.worldModel.setTile(x, ty + 1, TILE_TYPES.BEDROCK, 0);
      }
      if (scene.playerController.teleportToTile(60, ty) === false) throw new Error('Depth fixture placement failed');
      scene.worldRenderer.updateRenderWindow?.({tx:60,ty});
      const body = scene.playerController.physicsBody;
      body.vx = body.vy = 0;
      scene.cameras.main.centerOn(scene.player.x, scene.player.y);
    }
    for (const kind of ['clear', 'storm']) {
      output.textContent = JSON.stringify({ phase: 'settling', depth, kind, results, errors });
      weather.forceWeather(kind, kind === 'clear' ? 0 : 1, 600000);
      weather.intensity = weather.targetIntensity;
      weather.precipitationEnvelope.snap(kind, weather.intensity);
      await delay(10000);
      for (const key of Object.keys(totals)) delete totals[key];
      const intervals = [];
      let previous = performance.now();
      recording = true;
      await new Promise(resolve => {
        const collect = () => {
          const now = performance.now();
          intervals.push(now - previous);
          previous = now;
          if (intervals.length >= 90) {
            game.events.off('postrender', collect);
            resolve();
          }
        };
        game.events.on('postrender', collect);
      });
      recording = false;
      intervals.sort((a,b) => a-b);
      results.push({ depth, kind, actualTile: scene.playerController.getPlayerTile(),
        frameMedianMs: intervals[45], frameP95Ms: intervals[85],
        perFrameMs: Object.fromEntries(Object.entries(totals).map(([k,v])=>[k, +(v/90).toFixed(3)]).sort((a,b)=>b[1]-a[1])),
        displayObjects: scene.children.list.length,
        weather: { depth: weather._getDepthFactors(), drops: weather.impactRainController.drops.length },
        renderer: game.renderer.type,
      });
    }
  }
  output.textContent = JSON.stringify({ phase: 'complete', results, errors });
  scene.scene.pause();
} catch (error) {
  output.textContent = JSON.stringify({ phase: 'failed', error: error.stack, results, errors });
}
