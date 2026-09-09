import { SIGNAL_EVENT as cfg } from "../../values/signalEvent.js";
const pending = new WeakMap();

// Register the four authored poses without resampling the source pixels.
export function ensureSignalSurvivor(scene, survivor) {
  const register = () => {
    const texture = scene.textures.get(survivor.sheet), source = texture.getSourceImage();
    const width = Math.floor(source.width / cfg.art.columns), height = Math.floor(source.height / cfg.art.columns);
    for (let index = 0; index < cfg.art.columns ** 2; index++) if (!texture.has(String(index)))
      texture.add(String(index), 0, (index % cfg.art.columns) * width, Math.floor(index / cfg.art.columns) * height, width, height);
    survivor.portraits?.forEach((rect, index) => {
      const name = "portrait-" + index;
      if (!texture.has(name)) texture.add(name, 0, ...rect);
    });
  };
  if (scene.textures.exists(survivor.sheet)) { register(); return Promise.resolve(true); }
  let bank = pending.get(scene);
  if (!bank) { bank = new Map(); pending.set(scene, bank); }
  if (bank.has(survivor.sheet)) return bank.get(survivor.sheet);
  const promise = new Promise(resolve => {
    const key = survivor.sheet;
    let timer;
    const finish = ok => {
      clearTimeout(timer);
      scene.load.off("filecomplete-image-" + key, complete);
      scene.load.off("loaderror", failed);
      if (ok && scene.textures?.exists(key)) register();
      bank.delete(key); resolve(ok);
    };
    const complete = () => finish(true);
    const failed = file => { if (file.key === key) finish(false); };
    scene.load.once("filecomplete-image-" + key, complete);
    scene.load.on("loaderror", failed);
    timer = setTimeout(() => finish(false), cfg.audio.loadTimeoutMs);
    scene.load.image(key, survivor.source);
    if (!scene.load.isLoading()) scene.load.start();
  });
  bank.set(survivor.sheet, promise);
  return promise;
}
