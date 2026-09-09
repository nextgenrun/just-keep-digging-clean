import { WORLD_VISUAL_LAYERED_SKY_REVIEW as CONFIG } from "../../../values/worldVisualLayeredSkyReview.js";

// Composites ImageGen's explicit magenta matte into an owned runtime texture.
export function compositeGeneratedMatte(context,width,height){
  const frame=context.getImageData(0,0,width,height),pixels=frame.data;
  for(let index=0;index<pixels.length;index+=4){
    const amount=Math.max(0,(Math.min(pixels[index],pixels[index+2])-pixels[index+1])/255);
    if(!amount)continue;
    const t=Math.min(1,Math.max(0,(amount-CONFIG.matte.softKeyStart)/(CONFIG.matte.opaqueKeyThreshold-CONFIG.matte.softKeyStart)));
    const alpha=1-t*t*(3-2*t);
    if(alpha>0){
      pixels[index]=Math.min(pixels[index],pixels[index+1]);
      pixels[index+2]=Math.min(pixels[index+2],pixels[index+1]+CONFIG.matte.blueFringeMax);
    }
    pixels[index+3]=Math.round(pixels[index+3]*alpha);
  }
  context.putImageData(frame,0,0);
}
