import { TILE_TYPES } from "../../../values/tileTypes.js";
import { V7_VISUAL_APPROVAL } from "../../../values/v7VisualApproval.js";

function rgba(color, alpha) {
  const r = (color >> 16) & 255;
  const g = (color >> 8) & 255;
  const b = color & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}

function makeOverlayTexture(scene, key, playerScreen, palette) {
  const bufferScale = 0.5;
  const width = V7_VISUAL_APPROVAL.viewport.width * bufferScale;
  const height = V7_VISUAL_APPROVAL.viewport.height * bufferScale;
  playerScreen = { x: playerScreen.x * bufferScale, y: playerScreen.y * bufferScale };
  const cfg = V7_VISUAL_APPROVAL.compositor;
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, width, height);

  const ambient = ctx.createLinearGradient(0, 0, 0, height);
  ambient.addColorStop(0, rgba(palette.ambient, 0.24));
  ambient.addColorStop(0.55, "rgba(4,7,15,0.08)");
  ambient.addColorStop(1, "rgba(2,3,8,0.24)");
  ctx.fillStyle = ambient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = `rgba(0,2,9,${cfg.darknessAlpha})`;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "destination-out";
  const reveal = ctx.createRadialGradient(
    playerScreen.x,
    playerScreen.y + cfg.playerLightOffsetY,
    cfg.playerLightCore * bufferScale,
    playerScreen.x,
    playerScreen.y + cfg.playerLightOffsetY,
    cfg.playerLightRadius * bufferScale,
  );
  reveal.addColorStop(0, "rgba(0,0,0,1)");
  reveal.addColorStop(0.48, "rgba(0,0,0,0.88)");
  reveal.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = reveal;
  ctx.fillRect(0, 0, width, height);
  ctx.globalCompositeOperation = "source-over";

  const bounce = ctx.createRadialGradient(
    playerScreen.x,
    playerScreen.y - 22,
    0,
    playerScreen.x,
    playerScreen.y - 22,
    cfg.playerLightRadius * 0.86 * bufferScale,
  );
  bounce.addColorStop(0, rgba(palette.bounce, 0.24));
  bounce.addColorStop(0.52, rgba(palette.accent, 0.11));
  bounce.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bounce;
  ctx.fillRect(0, 0, width, height);

  const vignette = ctx.createRadialGradient(width / 2, height / 2, height * 0.28, width / 2, height / 2, width * 0.68);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, `rgba(0,0,0,${cfg.vignetteAlpha})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  texture.refresh();
  return texture;
}

function makeGlowTexture(scene, key, playerScreen, palette) {
  const bufferScale = 0.5;
  const width = V7_VISUAL_APPROVAL.viewport.width * bufferScale;
  const height = V7_VISUAL_APPROVAL.viewport.height * bufferScale;
  const x = playerScreen.x * bufferScale;
  const y = (playerScreen.y - 52) * bufferScale;
  const texture = scene.textures.createCanvas(key, width, height);
  const ctx = texture.getContext();
  const glow = ctx.createRadialGradient(x, y, 0, x, y, 250);
  glow.addColorStop(0, rgba(palette.bounce, 0.34));
  glow.addColorStop(0.26, rgba(palette.bounce, 0.17));
  glow.addColorStop(0.62, rgba(palette.accent, 0.065));
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
  texture.refresh();
  return texture;
}

function materialColor(type, palette) {
  if (type === TILE_TYPES.CAVE_WALL || type === TILE_TYPES.BEDROCK) return 0x8fa8bd;
  if (type === TILE_TYPES.COPPER || type === TILE_TYPES.BRONZE) return 0xd48b52;
  if (type === TILE_TYPES.STEEL || type === TILE_TYPES.IRON || type === TILE_TYPES.SILVER) return 0xa9c4d6;
  if (type === TILE_TYPES.GOLD) return 0xf4cc5f;
  if (type >= TILE_TYPES.EMBER_ORE) return 0xff784c;
  return palette.bounce;
}

export function applyApprovalCompositor(scene, model, fixture, player, mode) {
  const lighting = mode === "lighting" || mode === "combined";
  if (!lighting) return;
  const camera = scene.cameras.main;
  const tileSize = model.tileSize;
  const playerScreen = camera.getWorldPoint(player.x, player.y);
  playerScreen.x = (player.x - camera.scrollX) * camera.zoom;
  playerScreen.y = (player.y - camera.scrollY) * camera.zoom;

  const edge = scene.add.graphics().setDepth(902).setBlendMode(Phaser.BlendModes.ADD);
  const minX = Math.max(0, Math.floor(camera.scrollX / tileSize) - 1);
  const maxX = Math.min(model.width - 1, Math.ceil((camera.scrollX + camera.width / camera.zoom) / tileSize) + 1);
  const minY = Math.max(0, Math.floor(camera.scrollY / tileSize) - 1);
  const maxY = Math.min(model.depth - 1, Math.ceil((camera.scrollY + camera.height / camera.zoom) / tileSize) + 1);
  for (let ty = minY; ty <= maxY; ty += 1) {
    for (let tx = minX; tx <= maxX; tx += 1) {
      const type = model.getType(tx, ty);
      if (type === TILE_TYPES.AIR) continue;
      if (Math.hypot(tx - fixture.playerTile.x, ty - fixture.playerTile.y) > 8.5) continue;
      const color = materialColor(type, fixture.palette);
      edge.lineStyle(2, color, V7_VISUAL_APPROVAL.compositor.edgeAlpha);
      const x = tx * tileSize;
      const y = ty * tileSize;
      if (model.getType(tx, ty - 1) === TILE_TYPES.AIR) edge.lineBetween(x + 3, y + 2, x + tileSize - 3, y + 2);
      if (model.getType(tx - 1, ty) === TILE_TYPES.AIR) edge.lineBetween(x + 2, y + 3, x + 2, y + tileSize - 3);
      if (model.getType(tx + 1, ty) === TILE_TYPES.AIR) edge.lineBetween(x + tileSize - 2, y + 3, x + tileSize - 2, y + tileSize - 3);
    }
  }

  const motes = scene.add.graphics().setScrollFactor(0).setDepth(905).setBlendMode(Phaser.BlendModes.ADD);
  for (let i = 0; i < V7_VISUAL_APPROVAL.compositor.particleCount; i += 1) {
    const x = (i * 277 + 83) % V7_VISUAL_APPROVAL.viewport.width;
    const y = (i * 163 + 149) % V7_VISUAL_APPROVAL.viewport.height;
    const radius = 0.8 + (i % 4) * 0.45;
    motes.fillStyle(i % 3 ? fixture.palette.bounce : fixture.palette.accent, 0.12 + (i % 5) * 0.025);
    motes.fillCircle(x, y, radius);
  }

  const key = `v7-approval-overlay-${fixture.id}-${mode}`;
  makeOverlayTexture(scene, key, playerScreen, fixture.palette);
  scene.add.image(0, 0, key)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDisplaySize(V7_VISUAL_APPROVAL.viewport.width, V7_VISUAL_APPROVAL.viewport.height)
    .setDepth(900);
  const glowKey = `${key}-glow`;
  makeGlowTexture(scene, glowKey, playerScreen, fixture.palette);
  scene.add.image(0, 0, glowKey)
    .setOrigin(0)
    .setScrollFactor(0)
    .setDisplaySize(V7_VISUAL_APPROVAL.viewport.width, V7_VISUAL_APPROVAL.viewport.height)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setDepth(901);

  const contact = scene.add.graphics().setDepth(21).setBlendMode(Phaser.BlendModes.ADD);
  contact.fillStyle(0xc7a477, 0.22);
  for (let i = 0; i < 9; i += 1) {
    contact.fillCircle(player.x - 26 + i * 7, player.y - 3 - (i % 3) * 2, 1 + (i % 2));
  }
}
