// Frozen-frame real-Phaser comparison; never imported by production.
import { MINING_READABILITY_REVIEW as C } from "../values/miningReadabilityReview.js?v=2";
import { WORLD_VISUAL_TERRAIN_VARIATION } from "../values/worldVisualTerrainVariation.js";
import { TILE_TYPES } from "../values/tileTypes.js";

export function restoreMiningReadabilityReview(scene) {
  const previous = scene._miningReadabilityReview;
  if (!previous) return;
  previous.added.forEach(object => object.destroy());
  previous.originals.forEach((v, object) => {
    if (!object.scene) return;
    object.setTexture(v.key, v.frame).setScale(v.scaleX, v.scaleY)
      .setAlpha(v.alpha).setTint(v.tintTL, v.tintTR, v.tintBL, v.tintBR);
  });
  previous.effects.forEach(effect => scene.player.postFX.remove(effect));
  scene._miningReadabilityReview = null;
}

export function applyMiningReadabilityReview(scene, mode = "terrain") {
  restoreMiningReadabilityReview(scene);
  if (!scene._saveWritesBlocked) throw new Error("This visual review requires blocked save writes");
  if (!scene.sys.isPaused()) throw new Error("Freeze the comparison frame before applying this review");
  if (!scene.textures.exists(C.terrainTexture) || !scene.textures.exists(C.capTexture)) {
    throw new Error("Load the existing weathered-roots artwork before this comparison");
  }
  const originals = new Map(), added = [], effects = [];
  scene._miningReadabilityReview = {originals,added,effects,reviewOnly:true,mode};
  const save = object => {
    if (!originals.has(object)) originals.set(object, {
      key: object.texture.key, frame: object.frame.name,
      scaleX: object.scaleX, scaleY: object.scaleY, alpha: object.alpha,
      tintTL: object.tintTopLeft, tintTR: object.tintTopRight,
      tintBL: object.tintBottomLeft, tintBR: object.tintBottomRight,
    });
    return object;
  };
  for (const object of scene.children.list) {
    if (!object.visible || object.type !== "Image" || object.scrollFactorX !== 1) continue;
    const key = object.texture.key;
    if (object.name.startsWith("world-visual-terrain-variation-")) {
      const width = object.displayWidth, height = object.displayHeight;
      save(object).setTexture(C.terrainTexture).setDisplaySize(width, height);
    } else if (C.decorationPrefixes.some(prefix => key.startsWith(prefix))) {
      save(object).setAlpha(object.alpha * C.decorationAlpha);
    }
  }
  for (const image of scene.worldRenderer.semanticAssetLayer.resourcePool) {
    if (image.visible) save(image).setTint(C.oreTint).setAlpha(C.oreAlpha);
  }
  const renderer = scene.worldRenderer;
  const caps = WORLD_VISUAL_TERRAIN_VARIATION.caps;
  const atlas = scene.textures.get(C.capTexture);
  if (!scene.textures.exists(C.terrainTexture) || !scene.textures.exists(C.capTexture)) {
    throw new Error("Load the existing weathered-roots artwork before this comparison");
  }
  const ts = scene.config.tileSize, b = renderer.lastBounds;
  const material=scene.add.tileSprite(b.left*ts,b.top*ts,
    (b.right-b.left)*ts,(b.bottom-b.top)*ts,C.terrainTexture)
    .setOrigin(0).setDepth(C.materialDepth).setAlpha(C.materialAlpha)
    .setMask(renderer.materialField.geometryMask);
  material.tilePositionX=b.left*ts;
  material.tilePositionY=b.top*ts;
  added.push(material);
  const isAir = (tx, ty) => scene.worldModel.getTileType(tx, ty) === TILE_TYPES.AIR;
  for (let ty=b.top; ty<b.bottom; ty++) for(let tx=b.left; tx<b.right; tx++) {
    if (isAir(tx,ty)) continue;
    const frame = ((Math.imul(tx+11,73856093)^Math.imul(ty+17,19349663))>>>0)%caps.frameCount;
    const name = C.framePrefix + frame;
    if (!atlas.has(name)) atlas.add(name,0,(frame%caps.columns)*caps.frameWidthPx,
      Math.floor(frame/caps.columns)*caps.frameHeightPx,caps.frameWidthPx,caps.frameHeightPx);
    const edges = [
      [tx,ty-1,(tx+0.5)*ts,ty*ts,0],
      [tx,ty+1,(tx+0.5)*ts,(ty+1)*ts,Math.PI],
      [tx-1,ty,tx*ts,(ty+0.5)*ts,-Math.PI/2],
      [tx+1,ty,(tx+1)*ts,(ty+0.5)*ts,Math.PI/2],
    ];
    for (const [nx,ny,x,y,rotation] of edges) {
      if (!isAir(nx,ny)) continue;
      const image=scene.add.image(x+(nx-tx)*C.edgeBleed,y+(ny-ty)*C.edgeBleed,C.capTexture,name).setOrigin(0.5,0)
        .setDisplaySize(ts+caps.overlapPx,ts*caps.displayHeightTiles)
        .setRotation(rotation).setDepth(C.edgeDepth).setAlpha(C.edgeAlpha)
        .setTint(C.edgeTint);
      added.push(image);
    }
  }
  if (mode === "player" && scene.player.postFX) {
    effects.push(scene.player.postFX.addColorMatrix().brightness(C.playerBrightness));
    effects.push(scene.player.postFX.addGlow(C.playerRimColor,C.playerRimStrength,0));
  }
  scene._miningReadabilityReview = {originals,added,effects,reviewOnly:true,mode};
  return {reviewOnly:true,mode,changedImages:originals.size,authoredEdges:added.length-1,
    playerEffects:effects.length,saveWritesBlocked:scene._saveWritesBlocked};
}