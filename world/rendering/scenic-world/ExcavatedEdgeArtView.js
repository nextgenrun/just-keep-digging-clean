import { TILE_TYPES } from "../../../values/tileTypes.js";
import { RESOURCE_BY_TILE_TYPE } from "../../../values/resourceTypes.js";
import { APPROVED_POLISH_ART, EXCAVATED_EDGE_ART as CFG } from "../../../values/approvedPolishArt.js";

/** Pools thin material-specific excavation rims and sparse ceiling roots. */
export class ExcavatedEdgeArtView {
  constructor(scene, world) { this.scene = scene; this.world = world; this.edges = []; this.roots = []; }
  sync(bounds, lighting, reduced = false) {
    this.edges.forEach(image => image.setVisible(false));
    this.roots.forEach(image => image.setVisible(false));
    const size = this.scene.config.tileSize;
    const top = this.scene.config.topAirRows + CFG.surfaceClearanceTiles;
    const cap = reduced ? Math.floor(CFG.maxEdges / 2) : CFG.maxEdges;
    let edges = 0; let roots = 0;
    for (let ty = Math.max(bounds.top, top); ty < bounds.bottom && edges < cap; ty += 1) {
      for (let tx = bounds.left; tx < bounds.right && edges < cap; tx += 1) {
        const resource = RESOURCE_BY_TILE_TYPE[this.world.getTileType(tx, ty)];
        if (!resource) continue;
        const soil = CFG.soil.includes(resource);
        const slug = soil ? "soil-edge" : CFG.copper.includes(resource) ? "metal-edge" : "stone-edge";
        const art = APPROVED_POLISH_ART[slug];
        if (!this.scene.textures.exists(art.key)) continue;
        for (const face of CFG.faces) {
          if (edges >= cap || this.world.getTileType(tx + face.dx, ty + face.dy) !== TILE_TYPES.AIR) continue;
          const image = this.edges[edges] || this._create(this.edges, art.key, CFG.depth);
          image.setTexture(art.key).setPosition((tx + face.x) * size, (ty + face.y) * size)
            .setDisplaySize(size * CFG.lengthTiles, size * CFG.thicknessTiles)
            .setAngle(face.angle).setAlpha(CFG.alpha).setVisible(true);
          edges += 1;
          if (soil && face.dy === 1 && roots < CFG.maxRoots
            && Math.abs(tx * 7 + ty * 11) % CFG.rootSpacing === 0) {
            const rootArt = APPROVED_POLISH_ART["cave-roots"];
            if (!this.scene.textures.exists(rootArt.key)) continue;
            const root = this.roots[roots] || this._create(this.roots, rootArt.key, CFG.rootDepth);
            root.setPosition((tx + face.x) * size, (ty + face.y) * size)
              .setOrigin(0.5, 0).setDisplaySize(size * CFG.rootSizeTiles, size * CFG.rootSizeTiles)
              .setFlipX(tx % 2 === 0).setAlpha(CFG.rootAlpha).setVisible(true);
            roots += 1;
          }
        }
      }
    }
    this.setLighting(lighting);
  }
  _create(pool, key, depth) {
    const image = this.scene.add.image(0, 0, key).setDepth(depth);
    pool.push(image); return image;
  }
  setLighting(lighting) {
    const tint = lighting?.terrainTint ?? 0xffffff;
    for (const image of [...this.edges, ...this.roots]) if (image.visible) image.setTint(tint);
  }
  destroy() { [...this.edges, ...this.roots].forEach(image => image.destroy()); this.edges = []; this.roots = []; }
}
