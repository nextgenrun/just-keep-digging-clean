import fs from 'node:fs/promises';
import { EventEmitter } from 'node:events';
globalThis.Phaser = { Scene: class {}, Math: { Between: min => min } };
globalThis.location = { search: '', hostname: 'localhost', protocol:'http:' };
globalThis.__DIG_GAME_PRODUCTION__ = true;
Math.random = () => 0;
globalThis.fetch = async url => ({ json: async () => JSON.parse(await fs.readFile(new URL('../'+String(url),import.meta.url),'utf8')) });
const { BootScene } = await import('../ui/scenes/BootScene.js');
const { GAME_CONFIG } = await import('../values/gameConfig.js');
const queued = [];
const load = new EventEmitter();
for (const type of ['image','spritesheet','audio','video','atlas','json']) {
  load[type] = (key,path,extra) => {
    for (const item of Array.isArray(path) ? path : [path]) {
      const file = {url:item};
      load.emit('addfile',key,type === 'spritesheet' || type === 'atlas' ? 'image' : type,load,file);
      queued.push({key,type,path:file.url,extra});
    }
    return load;
  };
}
const boot = new BootScene();
boot.sys = {game:{device:{video:{webm:true,vp9:true}}}};
boot.events = new EventEmitter();
boot.load = load;
boot.textures = { exists:()=>false };
boot.cache = { audio:{exists:()=>false},video:{exists:()=>false},json:{get:()=>null} };
const registry = new Map();
boot.registry = {get:key=>registry.get(key),set:(key,value)=>registry.set(key,value)};
boot.preload();
const methods = ['preloadBranding','preloadBackgrounds','preloadSurfaceSkyPropAtlasesV3',
  'preloadWeatherVfx','preloadConstellationSprites','preloadPillarSprites','preloadOpeningFlightSprites',
  'preloadNPCs','preloadTileSprites','preloadFxSprites','preloadHeavenblocksSkyAltars',
  'preloadGraveborerWurmSprites','preloadUiSprites','preloadAudio'];
const stages = [];
for (const method of methods) {
  const before = queued.length;
  await boot[method]();
  for (const item of queued.slice(before)) item.stage = method; stages.push({method,count:queued.length-before});
}
const result = {mode:'production-demo',renderer:GAME_CONFIG.rendererQuality,stages,queued};
await fs.writeFile(new URL('./2026-09-12-further-boot.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({entries:queued.length,stages}));
