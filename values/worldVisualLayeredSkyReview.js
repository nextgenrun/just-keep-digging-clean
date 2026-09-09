import { resolveGameplayCapabilities } from "./gameplayCapabilities.js";
import { WORLD_VISUAL_RUNTIME_MODES, resolveWorldVisualRuntimeMode } from "./worldVisualRuntimeSelection.js";
import { LEVEL_ONE_AMBIENT_EVENTS } from "./levelOneAmbientEvents.js";
import { LEVEL_TWO_SCENIC_MOTION } from "./levelTwoScenicMotion.js";
// Regenerated above-ground composition. Town motion retains its existing owner.
const asset = (id, file) => Object.freeze({ key: "regenerated-horizon-v2-" + id, file });
export const WORLD_VISUAL_LAYERED_SKY_REVIEW = Object.freeze({
  generation: "regenerated-horizon-v2",
  release: "level-one-living-v6",
  enabled: true,
  disabledValues: Object.freeze(["0", "off", "false"]),
  queryParam: "layeredSky",
  enabledValues: Object.freeze(["1", "on", "true"]),
  motionQueryParam: "layeredSkyMotion",
  assetRoot: "sprites/backgrounds/world-visual-v2/regenerated-horizon-v2",
  sky: asset("sky", "sky.png"),
  ridges: Object.freeze([asset("ridge-west","ridge-west.png"),asset("ridge-central","ridge-central.png"),asset("ridge-east","ridge-east.png")]),
  forestAsset: asset("forest","forest.png"),
  cloudAtlas: Object.freeze({...asset("clouds","cloud-wisps.png"),grid:Object.freeze({columns:2,rows:2})}),
  cumulusAtlas: Object.freeze({...asset("cumulus","cloud-cumulus-v3.png"),grid:Object.freeze({columns:2,rows:2})}),
  cloudBankAtlas: Object.freeze({...asset("cloud-banks","cloud-banks-v4.png"),frames:Object.freeze([[0,0,1672,516],[0,516,1672,425]])}),
  weatherAtlas: asset("weather","weather-v4.png"),
  cloudCeiling: Object.freeze({surfaceCameraClearancePx:560,rowSpacingPx:820}),
  cloudEvolution: Object.freeze({periodSeconds:67,variation:.25,minimumBank:.23,coverGain:1.08,
    growthPeriodSeconds:79,growthAmount:.035,clearSize:.82,coverSizeGain:.18,
    seedMultiplier:1597334677,growthSeed:79,sizeSeed:311,heightSeed:733,defaultSizeRange:Object.freeze([.70,1]),heightRange:Object.freeze([.82,1])}),
  celestialAtlas: asset("celestial","celestial-v3.png"),
  celestial: Object.freeze({depth:-10.3,sunSizePx:260,moonSizePx:220,haloCore:.27,haloEdge:.47,
    sunDayTint:0xffffff,sunHorizonTint:0xffbd7a,moonTint:0xc4d7ff,moonCoverExtinction:.82,texturePrefix:"layered-celestial:"}),
  detailAssets: Object.freeze([
    Object.freeze({key:"layered-canopy-leaf",path:"sprites/environment/worldroot-sanctuary-v2/falling-leaf.png",type:"image"}),
    Object.freeze({key:"layered-canopy-glimmer",path:"sprites/environment/worldroot-sanctuary-v2/crown-star.png",type:"image"}),
  ]),
  floatingDetails: Object.freeze({maxSprites:42,depth:-4.4,parallaxX:.86,startTile:18,boundaryFadePx:240,
    columnSpacingPx:160,bandHeightPx:520,groundClearancePx:36,lifetimeSeconds:24,windSpeed:12,
    curlWidthPx:26,curlHeightPx:17,curlSpeed:.58,flutterSpeed:1.2,minWidthPx:7,maxWidthPx:16,
    leafAlpha:.43,glimmerAlpha:.42,nightLeafDim:.75,flutterBase:.65,flutterGain:.35,visibleAlpha:.01,clearTint:0xe7ddad,nightTint:0xadc7dd,glimmerTint:0xffda85,
    rainSuppression:.86,stormSuppression:.95,fadeFraction:.18,seed:941,seedSteps:997}),
  matte: Object.freeze({softKeyStart:.04,opaqueKeyThreshold:.65,blueFringeMax:80}),
  visibilityBelowSurfacePx: 120,
  streamPaddingPx: 180,
  maxCloudSprites: 96,
  cloudBoundaryFadePx:220,
  maxDeltaMs: 80,
  skyField: Object.freeze({
    parallaxX: 0.10, parallaxY: 0.12,
    overlapX: 384, overlapY: 256, depth: -10.5,
    rowDepthStep: 0.00001, columnDepthStep: 0.000001,
  }),
  landscapeJoin:Object.freeze({ridgeSilhouetteAlpha:128,coverageFeatherPx:36,paddingPx:16,frameName:"joined-core",texturePrefix:"regenerated-landscape-section:"}),
  townTransition:Object.freeze({skyRightFadeFraction:.42,skyFadeStartY:.25,skyFadeEndY:.72,topFadeFraction:.25,maskSize:256}),
  ridgeOffsets: Object.freeze([0, 30, 100]),
  forestOffsets: Object.freeze([0, 20, -12, 8]),
  landscapeLayers: Object.freeze([
    Object.freeze({id:"distant-ridges",family:"ridges",heightPx:530,bottomOffsetPx:10,parallaxX:.22,overlapPx:260,depth:-9.8,alpha:.58,tint:0xb4c9e2,variantOffset:1}),
    Object.freeze({id:"valley",family:"ridges",heightPx:650,bottomOffsetPx:112,parallaxX:.44,overlapPx:290,depth:-8.9,alpha:1,tint:0xffffff,variantOffset:0}),
    Object.freeze({id:"forest-rear",family:"forest",heightPx:490,bottomOffsetPx:125,parallaxX:.58,overlapPx:240,depth:-7.6,alpha:.62,tint:0xb5c9de,variantOffset:0}),
    Object.freeze({id:"forest",family:"forest",heightPx:410,bottomOffsetPx:70,parallaxX:.76,overlapPx:170,depth:-6.2,alpha:1,tint:0xd1e2f3,variantOffset:0}),
  ]),
  heavenblocks: Object.freeze({backdropDepth:-9}),
  cloudJitter: Object.freeze({x:120,y:56,steps:997,columnSeed:73856093,rowSeed:19349663,shift:8}),
  wind: Object.freeze({base:.65,referenceSpeed:90,gustGain:.65,response:.45,directionThreshold:28}),
  environment: Object.freeze({
    skyDepth:-10.6,horizonHeightPx:850,coverDarkening:.46,stormDarkening:.36,
    stormSky:0x202c3f,stormHorizon:0x6a798b,lightningTint:0xeaf7ff,skyFlash:.45,
    dayTerrainTint:0xffffff,nightTerrainTint:0xbdcfee,stormTerrainTint:0x94a6bb,terrainWarmth:.18,
    dayCloudTint:0xfff9ed,nightCloudTint:0x647b9d,stormCloudTint:0x63758b,cloudWarmth:.46,
    clearCloudOpacity:.22,coverCloudGain:1.32,clearMistOpacity:.85,fogMistGain:1.8,rainMistGain:.8,
    maxCloudAlpha:.94,clearCloudThickness:.32,coverThicknessGain:3.8,
  }),
  review: Object.freeze({
    startX: 47, startY: 63, minX: 7, maxX: 126, minY: 6, maxY: 63, profile:"demo",
    weatherDurationMs:120000,weatherIntensity:.85,
    weatherIntensityByKind:Object.freeze({clear:0,drizzle:.28,rain:.64,storm:.94,snow:.66}),
    times:Object.freeze([["Dawn",.16],["Sunrise",.29],["Day",.40],["Noon",.50],["Dusk",.70],["Night",.95]].map(Object.freeze)),
    weatherKinds:Object.freeze(["clear","drizzle","rain","storm","snow"]),
    maxDeltaSeconds: 0.05, tourTilesPerSecond: 1.7, panTilesPerSecond: 6,
    riseTilesPerSecond: 5, followLerp: 0.12,
    bookmarks: Object.freeze([
      ["Town Square",7,63], ["Town forest transition",19,63], ["Western woodland",31,63],
      ["Moonlit promenade",47,63], ["Central woodland",63,63], ["Titan grove",79,63],
      ["Eastern woodland",95,63], ["Level 1 eastern boundary",126,63],
      ["Above the canopy",47,58], ["Cloud corridor",63,48], ["Upper sky",63,24],
    ].map(Object.freeze)),
  }),
  cloudLayers: Object.freeze([
    Object.freeze({id:"cloud-deck",atlas:"banks",parallaxX:.10,parallaxY:.14,scale:.84,heightScale:.78,sizeRange:[.78,1],strideX:660,bandBottomPx:210,speed:7,alpha:.78,depth:-10.0,seed:113}),
    Object.freeze({id:"weather-ceiling",atlas:"banks",weatherOnly:true,parallaxX:.22,parallaxY:.14,scale:.86,heightScale:.76,sizeRange:[.85,1],strideX:680,bandBottomPx:245,speed:10,alpha:.83,depth:-9.95,seed:229}),
    Object.freeze({id:"distant-cumulus",atlas:"cumulus",parallaxX:.14,parallaxY:.14,scale:.66,heightScale:.80,sizeRange:[.48,1],strideX:430,bandBottomPx:220,speed:9,alpha:.55,depth:-10.04,seed:419}),
    Object.freeze({id:"high-cirrus",parallaxX:.18,parallaxY:.14,scale:.80,heightScale:.72,strideX:850,bandBottomPx:150,speed:11,alpha:.26,depth:-10.12,seed:311}),
    Object.freeze({id:"silver-cloud",atlas:"cumulus",parallaxX:.36,parallaxY:.14,scale:.78,heightScale:.78,sizeRange:[.48,1],strideX:740,bandBottomPx:230,speed:19,alpha:.40,depth:-9.93,seed:733}),
  ]),
});
// Approved Level 1 default; explicit rollback and the opt-in full-world review remain available.
export function resolveLayeredSkyReviewEnabled(search=globalThis.location?.search||""){
  const config=WORLD_VISUAL_LAYERED_SKY_REVIEW;
  if(resolveWorldVisualRuntimeMode(undefined,search)===WORLD_VISUAL_RUNTIME_MODES.legacy)return false;
  const value=new URLSearchParams(search).get(config.queryParam)?.trim().toLowerCase();
  if(config.disabledValues.includes(value))return false;
  if(config.enabledValues.includes(value))return true;
  return config.enabled&&layeredGameplayCapabilities(search).demoMode;
}
function layeredGameplayCapabilities(search){
  return resolveGameplayCapabilities({search,hostname:globalThis.location?.hostname||"",
    allowProfileOverride:globalThis.__DIG_GAME_PRODUCTION__!==true});
}
export function getLayeredSkyReviewAssets(search=globalThis.location?.search||""){
  if(!resolveLayeredSkyReviewEnabled(search))return [];
  const config=WORLD_VISUAL_LAYERED_SKY_REVIEW;
  const landmarks=layeredGameplayCapabilities(search).isLevelEnabled(2)?LEVEL_TWO_SCENIC_MOTION.assets:[];
  return [config.sky,...config.ridges,config.forestAsset,config.cloudAtlas,config.cumulusAtlas,config.cloudBankAtlas,config.celestialAtlas,config.weatherAtlas,...landmarks].map(asset=>Object.freeze({
    key:asset.key,path:config.assetRoot+"/"+asset.file,type:"image",
  })).concat(config.detailAssets,landmarks.length?[]:[LEVEL_ONE_AMBIENT_EVENTS.birdAsset]);
}
