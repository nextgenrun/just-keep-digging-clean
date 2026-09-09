// Wind animation of the generated cloud and forest art; terrain stays anchored.
export const LAYERED_ATMOSPHERE_MOTION=Object.freeze({
  pipelinePrefix:"RegeneratedAtmosphere:",
  cloud:Object.freeze({
    fieldX:7.5,fieldY:4.8,advection:.32,rollSpeed:.16,
    warpX:.020,warpY:.052,detailScale:2.13,detailWeight:.34,
    desaturate:.65,opacityLow:.87,opacityGain:.24,gustGain:.45,frameInset:.001,edgeFade:.038,
    cumulusWarp:.60,cumulusDesaturate:.30,

  }),
  foliage:Object.freeze({
    swayPx:6.5,gustGain:3.5,rootStart:.18,rootEnd:.86,
    waveLength:.014,waveSpeed:1.55,flutterLength:.067,flutterSpeed:3.8,flutterGain:.24,
  }),
});
