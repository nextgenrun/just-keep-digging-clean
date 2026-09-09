import assert from 'node:assert/strict';
import fs from 'node:fs';
import {blendRidgeSilhouettes} from '../world/rendering/scenic-world/landscapeRidgeJoin.js';
import {landscapeJoinWeights} from '../world/rendering/scenic-world/WorldVisualLandscapeSections.js';
import {WORLD_VISUAL_LAYERED_SKY_REVIEW as C} from '../values/worldVisualLayeredSkyReview.js';
const width=360,height=160,stride=320,overlap=260;
function mountain(top,color){
 const data=new Uint8ClampedArray(width*height*4);
 for(let y=top;y<height;y++)for(let x=0;x<width;x++)data.set([...color,255],(y*width+x)*4);
 return {width,height,data};
}
const columns=Array.from({length:width},(_,x)=>landscapeJoinWeights(x,stride,overlap,C.landscapeJoin.coverageFeatherPx));
const previous=mountain(100,[50,70,90]),current=mountain(20,[100,120,140]),next=mountain(100,[50,70,90]);
const original=new Uint8ClampedArray(current.data);
blendRidgeSilhouettes(current,previous,next,columns,C.landscapeJoin.ridgeSilhouetteAlpha);
let lastTop=100,maxStep=0;
for(let x=0;x<overlap;x++){
 let top=height;
 for(let y=0;y<height;y++)if(current.data[(y*width+x)*4+3]>0){top=y;break;}
 maxStep=Math.max(maxStep,Math.abs(top-lastTop));lastTop=top;
 for(let y=top+1;y<height;y++)assert.equal(current.data[(y*width+x)*4+3],255,'Ridge interior stays opaque');
}
assert(maxStep<=1,'Eighty-pixel height mismatch becomes a continuous skyline, without a vertical curtain');
for(let y=0;y<height;y++)for(let c=0;c<4;c++){
 assert.equal(current.data[(y*width)*4+c],previous.data[(y*width)*4+c],'Incoming boundary preserves previous pixels');
 assert.equal(current.data[(y*width+overlap)*4+c],original[(y*width+overlap)*4+c],'Outside join preserves source');
}
const result={passed:true,heightMismatchPx:80,maxSkylineStepPx:maxStep,opaqueInterior:true,unchangedOutsideOverlap:true};
fs.writeFileSync('testing/2026-09-06-level-one-live-v6/ridge-join-contract.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
