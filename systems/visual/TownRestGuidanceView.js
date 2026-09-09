import { TOWN_REST } from '../../values/townRest.js';
import { TOWN_REST_GUIDANCE_ART as ART } from '../../values/townRestGuidanceArt.js';

// Places the baked bed crest, directional pointer and instruction in the game.
export class TownRestGuidanceView {
  constructor(scene) { this.scene = scene; this.config = TOWN_REST.guidance; this.objects = []; }
  create() {
    const key = this.config.asset.key;
    if (!this.scene.textures.exists(key)) return false;
    const texture = this.scene.textures.get(key);
    for (const [name, [x, y, width, height]] of Object.entries(ART.frames)) {
      if (!texture.has(name)) texture.add(name, 0, x, y, width, height);
      const image = this.scene.add.image(0, 0, key, name).setScrollFactor(0)
        .setDepth(this.config.depth).setVisible(false).setName('town-rest-guidance-' + name);
      // Same source-silhouette presentation used by the baked save menu.
      const clip = this.scene.make.graphics({ x: 0, y: 0, add: false }).setScrollFactor(0);
      clip.fillStyle(0xffffff).beginPath();
      ART.outlines[name].forEach(([px, py], index) =>
        clip[index ? 'lineTo' : 'moveTo'](px - width / 2, py - height / 2));
      clip.closePath().fillPath();
      const mask = clip.createGeometryMask();
      image.setMask(mask);
      image.once('destroy', () => { mask.destroy(); clip.destroy(); });
      image._restClip = clip;
      this[name] = image; this.objects.push(image);
    }
    return true;
  }
  place(image, screenX, screenY, height, rotation = 0) {
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom || 1;
    const originX = camera.width * camera.originX;
    const originY = camera.height * camera.originY;
    image.setPosition(originX + (screenX - camera.x - originX) / zoom,
      originY + (screenY - camera.y - originY) / zoom)
      .setScale(height / image.height / zoom).setRotation(rotation);
    image._restClip.setPosition(image.x, image.y).setScale(image.scaleX, image.scaleY).setRotation(rotation);
  }
  present({ target, alpha, showArrow, hintAlpha }) {
    const camera = this.scene.cameras.main;
    const cfg = this.config, zoom = camera.zoom || 1;
    const uiScale = Math.min(1, camera.width / cfg.referenceWidth, camera.height / cfg.referenceHeight);
    const badgeHeight = cfg.badgeHeight * uiScale, arrowHeight = cfg.arrowHeight * uiScale;
    const sx = camera.x + (target.x - camera.worldView.x) * zoom;
    const sy = camera.y + (target.y - camera.worldView.y) * zoom;
    const left = camera.x + cfg.edgeMarginX * uiScale;
    const right = camera.x + camera.width - cfg.edgeMarginX * uiScale;
    const top = camera.y + cfg.edgeMarginTop * uiScale;
    const bottom = camera.y + camera.height - cfg.edgeMarginBottom * uiScale;
    this.edge = sx < left || sx > right || sy - arrowHeight - badgeHeight < top || sy > bottom;
    let tipX = sx, tipY = sy, dx = 0, dy = 1;
    if (this.edge) {
      const cx = (left + right) / 2, cy = (top + bottom) / 2;
      dx = sx - cx; dy = sy - cy;
      const distance = Math.hypot(dx, dy) || 1;
      const ratio = Math.min(dx ? (right - left) / 2 / Math.abs(dx) : Infinity,
        dy ? (bottom - top) / 2 / Math.abs(dy) : Infinity);
      tipX = cx + dx * ratio; tipY = cy + dy * ratio;
      dx /= distance; dy /= distance;
    }
    this.place(this.arrow, tipX - dx * arrowHeight / 2, tipY - dy * arrowHeight / 2,
      arrowHeight, Math.atan2(dy, dx) - Math.PI / 2);
    const badgeOffset = arrowHeight + badgeHeight * cfg.badgeOverlap;
    this.place(this.badge, tipX - dx * badgeOffset, tipY - dy * badgeOffset, badgeHeight);
    this.arrow.setVisible(showArrow).setAlpha(alpha);
    this.badge.setVisible(showArrow).setAlpha(alpha);
    const hintWidth = Math.min(cfg.hintWidth, camera.width * cfg.hintWidthRatio);
    this.place(this.instruction, camera.x + camera.width / 2,
      camera.y + (this.edge ? camera.height - cfg.hintBottom * uiScale : cfg.hintTop * uiScale),
      hintWidth * this.instruction.height / this.instruction.width);
    this.instruction.setVisible(hintAlpha > 0).setAlpha(hintAlpha);
  }
  hide() { for (const object of this.objects) object.setVisible(false); }
  destroy() { for (const object of this.objects) object.destroy(); this.objects.length = 0; }
}
