// Align the two painted skylines within each overlap before blending. A tall
// incoming mountain can then rise continuously from the previous ridge instead
// of appearing as a vertical transparent curtain. Source files stay unchanged.
export function blendRidgeSilhouettes(current,previous,next,columns,alphaThreshold){
  const {width,height}=current,output=current.data;
  const original=new Uint8ClampedArray(output);
  const top=(pixels,x)=>{
    for(let y=0;y<height;y++)if(pixels[(y*width+x)*4+3]>=alphaThreshold)return y;
    return height;
  };
  for(let x=0;x<width;x++){
    const weights=columns[x];if(!weights)continue;
    const from=weights.right?original:previous.data,to=weights.right?next.data:original;
    const fromTop=top(from,x),toTop=top(to,x),t=weights.t;
    // Guards beyond an image boundary inherit the present neighbour exactly.
    if(fromTop===height||toTop===height){
      const source=fromTop===height?to:from;
      for(let y=0;y<height;y++){const i=(y*width+x)*4;for(let c=0;c<4;c++)output[i+c]=source[i+c];}
      continue;
    }
    const skyline=fromTop+(toTop-fromTop)*t,bottom=height-1;
    for(let y=0;y<height;y++){
      const i=(y*width+x)*4;
      if(y<Math.floor(skyline)){output.fill(0,i,i+4);continue;}
      const fraction=(y-skyline)/Math.max(1,bottom-skyline);
      const fy=Math.max(0,Math.min(bottom,fromTop+fraction*(bottom-fromTop)));
      const ty=Math.max(0,Math.min(bottom,toTop+fraction*(bottom-toTop)));
      const f0=Math.floor(fy),f1=Math.min(bottom,f0+1),ff=fy-f0;
      const t0=Math.floor(ty),t1=Math.min(bottom,t0+1),tf=ty-t0;
      const fi0=(f0*width+x)*4,fi1=(f1*width+x)*4,ti0=(t0*width+x)*4,ti1=(t1*width+x)*4;
      const a0=from[fi0+3]*(1-ff)*(1-t),a1=from[fi1+3]*ff*(1-t);
      const b0=to[ti0+3]*(1-tf)*t,b1=to[ti1+3]*tf*t,alpha=a0+a1+b0+b1;
      for(let c=0;c<3;c++)output[i+c]=alpha>0?(from[fi0+c]*a0+from[fi1+c]*a1+to[ti0+c]*b0+to[ti1+c]*b1)/alpha:0;
      output[i+3]=alpha;
    }
  }
}
