export const HUD_TORCH_TEXTURE_KEYS = Object.freeze({
  off: "_hud_torch_off_v2",
  on: "_hud_torch_on_v2",
});

const SIZE = 72;

function roundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawFlamePath(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.moveTo(x, y - 24 * scale);
  ctx.bezierCurveTo(x - 16 * scale, y - 8 * scale, x - 12 * scale, y + 9 * scale, x, y + 12 * scale);
  ctx.bezierCurveTo(x + 15 * scale, y + 8 * scale, x + 14 * scale, y - 11 * scale, x + 4 * scale, y - 17 * scale);
  ctx.bezierCurveTo(x + 2 * scale, y - 19 * scale, x + 1 * scale, y - 22 * scale, x, y - 24 * scale);
  ctx.closePath();
}

function drawTorchBody(ctx, active) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const handleGradient = ctx.createLinearGradient(23, 45, 42, 64);
  handleGradient.addColorStop(0, active ? "#9b642f" : "#574338");
  handleGradient.addColorStop(1, active ? "#4a2a14" : "#2b241f");
  ctx.strokeStyle = handleGradient;
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(27, 44);
  ctx.lineTo(43, 62);
  ctx.stroke();

  ctx.strokeStyle = active ? "#c99745" : "#6c5a4d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(22, 42);
  ctx.lineTo(35, 37);
  ctx.stroke();

  const cupGradient = ctx.createLinearGradient(18, 32, 52, 43);
  cupGradient.addColorStop(0, active ? "#3d2b20" : "#2b3036");
  cupGradient.addColorStop(0.5, active ? "#c0842f" : "#5b6470");
  cupGradient.addColorStop(1, active ? "#5a3217" : "#24282d");
  ctx.fillStyle = cupGradient;
  ctx.beginPath();
  ctx.moveTo(18, 31);
  ctx.lineTo(50, 31);
  ctx.lineTo(43, 43);
  ctx.lineTo(25, 43);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = active ? "rgba(255, 205, 112, 0.75)" : "rgba(120, 135, 150, 0.65)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = active ? "#23140c" : "#161a1f";
  roundedRect(ctx, 23, 27, 22, 8, 3);
  ctx.fill();

  ctx.restore();
}

function drawTorchOn(ctx) {
  const glow = ctx.createRadialGradient(35, 26, 4, 35, 26, 31);
  glow.addColorStop(0, "rgba(255, 210, 112, 0.46)");
  glow.addColorStop(0.45, "rgba(255, 119, 24, 0.18)");
  glow.addColorStop(1, "rgba(255, 119, 24, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  drawFlamePath(ctx, 35, 30, 1.02);
  const outer = ctx.createLinearGradient(35, 6, 35, 43);
  outer.addColorStop(0, "#ffe07a");
  outer.addColorStop(0.38, "#ff8a22");
  outer.addColorStop(1, "#c34812");
  ctx.fillStyle = outer;
  ctx.fill();

  drawFlamePath(ctx, 36, 32, 0.54);
  const inner = ctx.createLinearGradient(36, 17, 36, 41);
  inner.addColorStop(0, "#fff6be");
  inner.addColorStop(1, "#ffd04f");
  ctx.fillStyle = inner;
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.58)";
  ctx.beginPath();
  ctx.ellipse(31, 24, 3.4, 7.4, 0.28, 0, Math.PI * 2);
  ctx.fill();

  drawTorchBody(ctx, true);
}

function drawTorchOff(ctx) {
  ctx.strokeStyle = "rgba(120, 142, 155, 0.32)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(33, 23);
  ctx.bezierCurveTo(24, 15, 43, 11, 35, 4);
  ctx.stroke();

  ctx.strokeStyle = "rgba(92, 108, 120, 0.30)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(41, 25);
  ctx.bezierCurveTo(52, 16, 30, 16, 42, 8);
  ctx.stroke();

  drawTorchBody(ctx, false);

  const ember = ctx.createRadialGradient(36, 29, 1, 36, 29, 9);
  ember.addColorStop(0, "rgba(255, 125, 52, 0.88)");
  ember.addColorStop(0.35, "rgba(224, 112, 48, 0.46)");
  ember.addColorStop(1, "rgba(224, 112, 48, 0)");
  ctx.fillStyle = ember;
  ctx.fillRect(26, 19, 20, 18);

  ctx.fillStyle = "#e07030";
  ctx.beginPath();
  ctx.arc(36, 29, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawBadge(ctx, active) {
  const panel = ctx.createLinearGradient(0, 0, 0, SIZE);
  panel.addColorStop(0, active ? "rgba(23, 28, 35, 0.98)" : "rgba(16, 21, 27, 0.98)");
  panel.addColorStop(1, active ? "rgba(10, 12, 17, 0.98)" : "rgba(7, 9, 13, 0.98)");
  ctx.fillStyle = panel;
  roundedRect(ctx, 5, 5, 62, 62, 13);
  ctx.fill();

  ctx.strokeStyle = active ? "rgba(255, 192, 106, 0.92)" : "rgba(74, 90, 106, 0.88)";
  ctx.lineWidth = 2.4;
  roundedRect(ctx, 6.5, 6.5, 59, 59, 12);
  ctx.stroke();

  ctx.strokeStyle = active ? "rgba(255, 230, 170, 0.18)" : "rgba(255, 255, 255, 0.055)";
  ctx.lineWidth = 1.5;
  roundedRect(ctx, 10, 9, 52, 29, 10);
  ctx.stroke();
}

function createTorchTexture(scene, key, active) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, SIZE, SIZE);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawBadge(ctx, active);
  if (active) drawTorchOn(ctx);
  else drawTorchOff(ctx);
  texture.refresh();
}

export function ensureHudTorchTextures(scene) {
  if (!scene?.textures) return HUD_TORCH_TEXTURE_KEYS;
  createTorchTexture(scene, HUD_TORCH_TEXTURE_KEYS.off, false);
  createTorchTexture(scene, HUD_TORCH_TEXTURE_KEYS.on, true);
  return HUD_TORCH_TEXTURE_KEYS;
}
