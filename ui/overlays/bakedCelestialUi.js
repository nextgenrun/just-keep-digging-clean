// Render authored Celestial PNG frames at uniform scale and native pixel density.
import { prepareArt, fitBakedUiImage } from "../../systems/visual/bakedUiArt.js";
import { BAKED_CELESTIAL_LABELS, BAKED_CELESTIAL_MESSAGES, BAKED_CELESTIAL_LAYOUT } from "../../values/bakedCelestialUi.js";

function fitArt(scene,image,asset,width,height) {
  const g=BAKED_CELESTIAL_LAYOUT;
  fitBakedUiImage(image,width,height);
  const matrix=image.parentContainer?.getWorldTransformMatrix?.();
  const parentScale=matrix?Math.max(Math.hypot(matrix.a,matrix.b),Math.hypot(matrix.c,matrix.d)):1;
  const density=scene.game?.canvas?.width / scene.scale?.width || 1;
  image.setScale(Math.min(image.scaleX,g.maximumSourceScale / (parentScale*density)));
  const glyph=g.glyphAssetKeys.includes(asset.key)
    || g.glyphFrameSuffixes.some(suffix=>asset.frame?.endsWith(suffix));
  image.setBlendMode(glyph?"SCREEN":"NORMAL");
  return image;
}

export function setCelestialArt(scene,image,asset,width,height) {
  const art=prepareArt(scene,asset);
  if(!art){image?.setVisible(false);return false;}
  image.setTexture(art.key,art.frame).setVisible(true);
  fitArt(scene,image,art,width,height);
  return true;
}

export function addCelestialArt(scene,parent,asset,x,y,width,height) {
  const art=prepareArt(scene,asset);
  if(!art)return null;
  const image=scene.add.image(x,y,art.key,art.frame);
  parent.add(image);
  return fitArt(scene,image,art,width,height);
}

export function addCelestialLabel(scene,parent,value,x,y,width,height) {
  const image=addCelestialArt(scene,parent,BAKED_CELESTIAL_LABELS[value],x,y,width,height);
  image?.setData?.("bakedLabel",value);
  return image;
}

export function addCelestialMessage(scene,parent,value,x,y,width,height) {
  const image=addCelestialArt(scene,parent,BAKED_CELESTIAL_MESSAGES[value],x,y,width,height);
  image?.setData?.("bakedLabel",value);
  return image;
}
