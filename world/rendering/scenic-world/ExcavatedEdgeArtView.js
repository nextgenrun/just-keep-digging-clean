import { TILE_TYPES } from "../../../values/tileTypes.js";
import { RESOURCE_BY_TILE_TYPE } from "../../../values/resourceTypes.js";
import { APPROVED_POLISH_ART, EXCAVATED_EDGE_ART as CFG } from "../../../values/approvedPolishArt.js";
import { COMPLEMENTARY_EDGE_ART as ART, COMPLEMENTARY_EDGES as EDGE, complementaryEdgesEnabled } from "../../../values/complementaryTerrainEdges.js";

/** Adds bounded edge-only overlays; core tiles, backgrounds and world state are untouched. */
export class ExcavatedEdgeArtView {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.edges = []; this.roots = []; this.corners = []; this.shadows = [];
    this.enhanced = complementaryEdgesEnabled();
  }
  sync(bounds, lighting, reduced = false) {
    for (const pool of [this.edges, this.roots, this.corners, this.shadows]) pool.forEach(i => i.setVisible(false));
    const size = this.scene.config.tileSize;
    const top = this.scene.config.topAirRows + CFG.surfaceClearanceTiles;
    const maximum = this.enhanced ? EDGE.maxEdges : CFG.maxEdges;
    const cap = reduced ? Math.floor(maximum / 2) : maximum;
    let edges = 0; let roots = 0; let corners = 0; let shadows = 0;
    for (let ty = Math.max(bounds.top, top); ty < bounds.bottom && edges < cap; ty++) {
      for (let tx = bounds.left; tx < bounds.right && edges < cap; tx++) {
        const resource = RESOURCE_BY_TILE_TYPE[this.world.getTileType(tx, ty)];
        if (!resource) continue;
        const soil = CFG.soil.includes(resource);
        const metal = CFG.copper.includes(resource);
        const family = soil ? "soil" : "stone";
        const freshArt = ART[`${family}-rim`];
        const fresh = this.enhanced && !metal && this.scene.textures.exists(freshArt.key);
        const art = fresh ? freshArt : APPROVED_POLISH_ART[soil ? "soil-edge" : metal ? "metal-edge" : "stone-edge"];
        if (!this.scene.textures.exists(art.key)) continue;
        const exposed = CFG.faces.map(f => this.world.getTileType(tx + f.dx, ty + f.dy) === TILE_TYPES.AIR);
        for (let f = 0; f < CFG.faces.length; f++) {
          const face = CFG.faces[f];
          if (edges >= cap || !exposed[f]) continue;
          const image = this.edges[edges] || this._create(this.edges, art.key, CFG.depth);
          const variant = ((tx + ty * EDGE.variants + f) % EDGE.variants + EDGE.variants) % EDGE.variants;
          const frame = fresh ? this._rimFrame(art.key, variant) : "__BASE";
          image.setTexture(art.key, frame).setOrigin(0.5, fresh ? 0 : 0.5)
            .setPosition((tx + face.x) * size, (ty + face.y) * size)
            .setDisplaySize(size * CFG.lengthTiles, size * (fresh ? EDGE.thicknessTiles : CFG.thicknessTiles))
            .setAngle(face.angle).setAlpha(CFG.alpha).setVisible(true);
          edges++;
          if (fresh && shadows < EDGE.maxShadows && this.scene.textures.exists(ART["crevice-shadow"].key)) {
            const shade = this.shadows[shadows] || this._create(this.shadows, ART["crevice-shadow"].key, EDGE.shadowDepth);
            shade.setOrigin(0.5, 0).setPosition((tx + face.x) * size, (ty + face.y) * size)
              .setDisplaySize(size, size * EDGE.shadowThicknessTiles).setAngle(face.angle + 180)
              .setAlpha(EDGE.shadowAlpha).setVisible(true);
            shadows++;
          }
          if (soil && face.dy === 1 && roots < CFG.maxRoots && Math.abs(tx * 7 + ty * 11) % CFG.rootSpacing === 0) {
            const rootArt = APPROVED_POLISH_ART["cave-roots"];
            if (!this.scene.textures.exists(rootArt.key)) continue;
            const root = this.roots[roots] || this._create(this.roots, rootArt.key, CFG.rootDepth);
            root.setPosition((tx + face.x) * size, (ty + face.y) * size)
              .setOrigin(0.5, 0).setDisplaySize(size * CFG.rootSizeTiles, size * CFG.rootSizeTiles)
              .setFlipX(tx % 2 === 0).setAlpha(CFG.rootAlpha).setVisible(true);
            roots++;
          }
        }
        const cornerArt = ART[`${family}-corner`];
        if (!fresh || !this.scene.textures.exists(cornerArt.key)) continue;
        for (const corner of EDGE.corners) {
          if (corners >= EDGE.maxCorners || !exposed[corner.a] || !exposed[corner.b]) continue;
          const image = this.corners[corners] || this._create(this.corners, cornerArt.key, EDGE.cornerDepth);
          image.setTexture(cornerArt.key).setOrigin(0, 0)
            .setPosition((tx + corner.x) * size, (ty + corner.y) * size)
            .setDisplaySize(size * EDGE.cornerSizeTiles, size * EDGE.cornerSizeTiles)
            .setAngle(corner.angle).setAlpha(CFG.alpha).setVisible(true);
          corners++;
        }
      }
    }
    this.setLighting(lighting);
  }
  _rimFrame(key, variant) {
    const texture = this.scene.textures.get(key);
    const frame = `edge-${variant}`;
    if (!texture.has(frame)) {
      const source = texture.getSourceImage();
      const width = source.width / EDGE.variants;
      texture.add(frame, 0, variant * width, 0, width, source.height);
    }
    return frame;
  }
  _create(pool, key, depth) {
    const image = this.scene.add.image(0, 0, key).setDepth(depth);
    pool.push(image); return image;
  }
  setLighting(lighting) {
    const tint = lighting?.terrainTint ?? 0xffffff;
    for (const image of [...this.edges, ...this.roots, ...this.corners]) if (image.visible) image.setTint(tint);
  }
  getSnapshot() {
    const visible = pool => pool.filter(i => i.visible).length;
    return { enabled: this.enhanced, edges: visible(this.edges), corners: visible(this.corners), shadows: visible(this.shadows), roots: visible(this.roots),
      pooled: this.edges.length + this.corners.length + this.shadows.length + this.roots.length };
  }
  destroy() {
    for (const pool of [this.edges, this.roots, this.corners, this.shadows]) pool.forEach(i => i.destroy());
    this.edges = []; this.roots = []; this.corners = []; this.shadows = [];
  }
}
