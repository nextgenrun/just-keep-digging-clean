// Dossier values align with fixed lettering baked into the Codex foundation.
import { STAR_IDENTITY_LIBRARY_CONFIG } from "../../values/starIdentityLibrary.js?rev=20260906-baked-celestial-v2";
import { BAKED_STAR_LAYOUT, BAKED_CELESTIAL_LAYOUT } from "../../values/bakedCelestialUi.js";
import { getStarRarityTier } from "../../values/starRarityProgressionMath.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { starAtlasFontSize, starAtlasPoint, starAtlasSize } from "./UIInventoryStarAtlasLayout.js?rev=20260906-baked-celestial-v2";
import { addStarAtlasText } from "./UIInventoryStarAtlasPrimitives.js?rev=20260906-baked-celestial-v2";
import { fitBakedUiImage, fitLiveUiText } from "../../systems/visual/bakedUiArt.js";
import { addCelestialLabel } from "./bakedCelestialUi.js";
import { animateBakedStar } from "./UIBakedStarMotion.js";

export function renderEmptyStarAtlasDossier() {
  // The empty dossier is itself an authored frame, installed by the atlas view.
  return null;
}

export function renderStarAtlasDossier(scene, parent, bounds, identity, collectionCount) {
  const config = STAR_IDENTITY_LIBRARY_CONFIG;
  const layout = config.inventory.layout;
  const appearance = config.inventory.appearance;
  const g = BAKED_STAR_LAYOUT;
  const tier = getStarRarityTier(identity.rarityIndex);
  const at = (x,y) => starAtlasPoint(bounds,x,y,layout);
  const size = value => starAtlasSize(bounds,value,layout);
  const value = (x,y,text,font,width,height,style={}) => {
    const point = at(x,y);
    const display = addStarAtlasText(scene,parent,point.x,point.y,text,{
      fontFamily:UI_FONTS.mono,fontSizePx:starAtlasFontSize(bounds,font,layout),
      color:appearance.body,align:"center",wordWrapWidth:size(width),...style,
    });
    return fitLiveUiText(display,size(width),size(height));
  };
  const point = at(layout.previewCenterXPx,layout.previewCenterYPx);
  // The original 256px portrait already contains its unique light phenomenon.
  const preview = scene.add.image(point.x,point.y,identity.atlasKey,identity.frameName);
  const density = scene.game.canvas.width / scene.scale.width;
  const previewSize = size(layout.previewImageSizePx);
  fitBakedUiImage(preview,Math.min(previewSize,preview.width/density),Math.min(previewSize,preview.height/density));
  preview.setBlendMode?.(globalThis.Phaser?.BlendModes?.SCREEN);
  preview.setData("bakedStarPortrait",identity.index);
  parent.add(preview);
  animateBakedStar(scene,preview,identity.index);

  value(layout.previewBadgeXPx,g.badgeY,`${tier.name.toUpperCase()}\n×${collectionCount}`,
    layout.previewBadgeFontSizePx,g.badgeWidth,g.badgeHeight,{color:tier.palette.highlight});
  value(layout.nameCenterXPx,layout.nameCenterYPx,identity.name.toUpperCase(),
    layout.nameFontSizePx,g.nameWidth,g.nameHeight,
    {fontFamily:UI_FONTS.display,fontStyle:"bold",color:appearance.title});
  value(g.colourLabelValueX,g.colourY,identity.colourName.toUpperCase(),
    layout.colourFontSizePx,g.colourWidth,BAKED_CELESTIAL_LAYOUT.statusLineGap,{color:appearance.focus});
  value(g.starValueX,g.colourY,String(identity.index+1).padStart(3,"0"),
    layout.colourFontSizePx,g.starWidth,BAKED_CELESTIAL_LAYOUT.statusLineGap,{color:appearance.focus});
  value(layout.nameCenterXPx,layout.flavourCenterYPx,identity.flavour,
    layout.flavourFontSizePx,layout.flavourWidthPx,g.flavourHeight,
    {fontFamily:UI_FONTS.body,fontStyle:"italic"});
  value(g.lightValueX,g.metadataY,identity.light.style.toUpperCase(),
    layout.lightFontSizePx,g.lightWidth,BAKED_CELESTIAL_LAYOUT.statusLineGap,{color:appearance.muted});
  if (tier.minDepthTiles > 0) {
    value(g.depthValueX,g.metadataY,`${tier.minDepthTiles}M`,
      layout.lightFontSizePx,g.depthWidth,BAKED_CELESTIAL_LAYOUT.statusLineGap,{color:appearance.muted});
  } else {
    const depthPoint=at(g.depthValueX,g.metadataY);
    addCelestialLabel(scene,parent,"ANY DEPTH",depthPoint.x,depthPoint.y,size(g.depthWidth),
      size(BAKED_CELESTIAL_LAYOUT.statusLineGap));
  }
  [`+${tier.signXp}`,`${tier.multiplier}x`,`+${tier.engineCharge}`].forEach((text,index)=>
    value(layout.statCentersXPx[index],layout.statCenterYPx,text,
      layout.statFontSizePx,g.depthWidth,BAKED_CELESTIAL_LAYOUT.statusLineGap,
      {fontFamily:UI_FONTS.display,color:index===1?appearance.focus:appearance.title}));
  return preview;
}
