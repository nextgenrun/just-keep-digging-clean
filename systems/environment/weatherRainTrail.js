import { clamp01, lerp } from "../../values/mathUtils.js";

// A photographic shutter trail stays readable at 30, 60 or 144 fps.
export function rainTrailPose(drop,style,impact,motion){
  const y2=drop.usesSweptCollision?drop.y:Math.min(drop.y,drop.impactWorldY-impact.hardStopPaddingPx);
  if(!motion){
    const y1=Math.max(drop.previousY,y2-style.lengthPx),height=Math.max(1,y2-y1);
    const dx=drop.speedX*height/Math.max(1,drop.speedY);
    return {x:drop.x-dx/2,y:(y1+y2)/2,width:style.widthPx,height,
      rotation:Math.atan2(y2-y1,dx)-Math.PI/2,x1:drop.x-dx,y1,x2:drop.x,y2};
  }
  const speed=Math.hypot(drop.speedX,drop.speedY);
  const length=motion?Math.min(style.lengthPx*motion.maxLengthFraction,
    Math.max(style.lengthPx*motion.minLengthFraction,speed*motion.shutterSeconds))*(drop.lengthScale||1):style.lengthPx;
  const start=motion?(drop.spawnY??drop.previousY):drop.previousY;
  const dy=Math.max(0,Math.min(y2-start,length*drop.speedY/Math.max(1,speed)));
  const dx=drop.speedX*dy/Math.max(1,drop.speedY);
  return {x:drop.x-dx/2,y:y2-dy/2,width:style.widthPx*(drop.widthScale||1),
    height:Math.hypot(dx,dy),rotation:Math.atan2(dy,dx)-Math.PI/2,x1:drop.x-dx,y1:y2-dy,x2:drop.x,y2};
}
export function drawRainDrop(drop,style,impact,motion,flash,night,graphics){
  const pose=rainTrailPose(drop,style,impact,motion);
  const alpha=clamp01(drop.alpha*style.alphaScale*flash);
  if(drop.sprite){
    drop.sprite.setPosition(pose.x,pose.y).setDisplaySize(pose.width,pose.height)
      .setRotation(pose.rotation).setAlpha(alpha).setVisible(pose.height>0);
    if(motion){
      const tint=[16,8,0].reduce((color,shift)=>color|(Math.round(lerp((motion.dayTint>>shift)&255,(motion.nightTint>>shift)&255,night))<<shift),0);
      drop.sprite.setTint?.(tint);
    }
  }else{
    graphics.lineStyle(pose.width,0xbfeeff,alpha);graphics.beginPath();
    graphics.moveTo(pose.x1,pose.y1);graphics.lineTo(pose.x2,pose.y2);graphics.strokePath();
  }
}
