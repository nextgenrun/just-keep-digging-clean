export function createWeatherParticleTextures(scene, keys) {
  createRainTexture(scene, keys.rain, 2, 48, 0xb9dfff, 0.95);
  createRainTexture(scene, keys.rainSoft, 1, 38, 0xd8f2ff, 0.54);
  createRainTexture(scene, keys.sheet, 3, 64, 0x8fc9ef, 0.28);
  createDripTexture(scene, keys.drip);
  createSplashTexture(scene, keys.splash);
  createMistTexture(scene, keys.mist);
  createDustTexture(scene, keys.dust);
  createRippleTexture(scene, keys.ripple);
}

function createRainTexture(scene, key, width, height, color, alpha) {
  if (scene.textures.exists(key)) return;
  const gfx = scene.make.graphics({ add: false });
  gfx.lineStyle(width, color, alpha);
  gfx.beginPath();
  gfx.moveTo(4, 2);
  gfx.lineTo(4, height - 4);
  gfx.strokePath();
  gfx.lineStyle(1, 0xffffff, alpha * 0.45);
  gfx.beginPath();
  gfx.moveTo(6, 6);
  gfx.lineTo(6, height - 14);
  gfx.strokePath();
  gfx.generateTexture(key, 12, height);
  gfx.destroy();
}

function createDripTexture(scene, key) {
  if (scene.textures.exists(key)) return;
  const gfx = scene.make.graphics({ add: false });
  gfx.fillStyle(0x9fdcff, 0.88);
  gfx.fillCircle(4, 6, 3);
  gfx.fillStyle(0xffffff, 0.45);
  gfx.fillCircle(3, 5, 1);
  gfx.generateTexture(key, 8, 12);
  gfx.destroy();
}

function createSplashTexture(scene, key) {
  if (scene.textures.exists(key)) return;
  const gfx = scene.make.graphics({ add: false });
  gfx.lineStyle(2, 0xbfe8ff, 0.80);
  gfx.strokeEllipse(12, 12, 18, 7);
  gfx.lineStyle(1, 0xffffff, 0.38);
  gfx.strokeEllipse(12, 12, 10, 4);
  gfx.generateTexture(key, 24, 24);
  gfx.destroy();
}

function createMistTexture(scene, key) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 64, 64);
  const ctx = texture.getContext();
  const gradient = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
  gradient.addColorStop(0, "rgba(190, 225, 255, 0.22)");
  gradient.addColorStop(0.55, "rgba(150, 200, 235, 0.10)");
  gradient.addColorStop(1, "rgba(130, 180, 220, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  texture.refresh();
}

function createDustTexture(scene, key) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, 48, 48);
  const ctx = texture.getContext();
  const gradient = ctx.createRadialGradient(24, 24, 3, 24, 24, 23);
  gradient.addColorStop(0, "rgba(205, 192, 156, 0.20)");
  gradient.addColorStop(1, "rgba(205, 192, 156, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 48, 48);
  texture.refresh();
}

function createRippleTexture(scene, key) {
  if (scene.textures.exists(key)) return;
  const gfx = scene.make.graphics({ add: false });
  gfx.lineStyle(1, 0xc9f0ff, 0.46);
  gfx.strokeEllipse(16, 16, 26, 8);
  gfx.generateTexture(key, 32, 32);
  gfx.destroy();
}
