// Level 2 scenic landmark placements and their water channels.
const art=(id)=>Object.freeze({id,key:"regenerated-horizon-v2-"+id,file:id+".png",matte:"magenta"});
export const LEVEL_TWO_SCENIC_MOTION=Object.freeze({
  assets:Object.freeze([art("moonfall-escarpment"),art("crownfall-sanctuary")]),
  parallaxX:.60,depth:-7.8,edgeFeatherPx:110,referenceWidthPx:1472,
  water:Object.freeze({
    pipelinePrefix:"RegeneratedWaterfall:",flowRate:.92,streakFrequency:42,streakSpeed:53,
    rippleFrequency:76,rippleSpeed:9,ripplePx:.0035,flowMix:.88,
    brightnessLow:.30,brightnessHigh:.70,highlightStrength:.40,
    accelerationPower:.68,edgeFeather:.012,sourceFloor:.65,sourceGain:.62,
    crossFrequency:670,breakupFrequency:83,breakupSpeed:97,foamStrength:.15,
    channels:Object.freeze({
      "moonfall-escarpment":Object.freeze([[.405,.515,.28,.90],[.652,.732,.44,.91],[0,0,0,0]].map(Object.freeze)),
      "crownfall-sanctuary":Object.freeze([[.347,.409,.407,.66],[.455,.54,.30,.75],[.635,.709,.55,.92]].map(Object.freeze)),
    }),
  }),
  spray:Object.freeze({
    puffsPerChannel:5,scaleStart:.10,scaleEnd:.32,alpha:.21,depth:-7.3,
    lifetimes:Object.freeze([3.8,4.7,5.6,4.2,5.1]),driftPxPerSecond:28,
    liftPxPerSecond:13,spreadPx:34,curlPx:11,curlSpeed:1.3,rainGain:.55,
  }),
  placements:Object.freeze([
    Object.freeze({id:"moonfall",label:"Moonfall Reach",asset:"moonfall-escarpment",tileX:155,heightPx:590,bottomOffsetPx:100}),
    Object.freeze({id:"crownfall",label:"Crownfall Sanctuary",asset:"crownfall-sanctuary",tileX:196,heightPx:650,bottomOffsetPx:115}),
    Object.freeze({id:"eastern-cascades",label:"Eastern Cascades",asset:"moonfall-escarpment",tileX:258,heightPx:550,bottomOffsetPx:90}),
  ]),
});


