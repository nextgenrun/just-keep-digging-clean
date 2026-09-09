// Frozen-frame presentation proposals, loaded solely by the isolated review.
import { MOST_SEEN_VISUAL_REVIEW as C } from '../values/mostSeenVisualReview.js?v=2';
export function restoreMostSeenReview(s) {
  const previous=s._mostSeenReview;
  if(!previous)return;
  for(const o of previous.added)o.destroy();
  for(const [o,v] of previous.originals){
    o.setPosition?.(v.x,v.y);o.setScale?.(v.scaleX,v.scaleY);o.setAlpha?.(v.alpha);o.setVisible?.(v.visible);
    if(v.text!==undefined)o.setText?.(v.text);
    if(o.type==='Zone')o.setSize(v.width,v.height);
  }
  s._mostSeenReview=null;
}
export function applyMostSeenReview(s,options={}) {
  restoreMostSeenReview(s);
  const originals=new Map(),added=[];
  const save=o=>{if(o&&!originals.has(o))originals.set(o,{x:o.x,y:o.y,scaleX:o.scaleX,scaleY:o.scaleY,alpha:o.alpha,visible:o.visible,text:o.text,width:o.width,height:o.height});return o};
  const hide=o=>save(o)?.setVisible(false);
  const add=o=>{added.push(o);return o};
  const text=(x,y,value,size,color=C.font.ink)=>add(s.add.text(x,y,value,{
    fontFamily:C.font.family,fontSize:size,fontStyle:'bold',color,stroke:C.font.shadow,strokeThickness:C.font.stroke,
  }).setOrigin(.5).setScrollFactor(0).setDepth(C.depth+1));
  const plate=(x,y,w,h)=>add(s.add.image(x,y,C.art.plate).setDisplaySize(w,h).setScrollFactor(0).setDepth(C.depth));
  const goal=s.nextPromiseHudSystem;
  hide(goal?.root);
  plate(C.goal.x,C.goal.y,C.goal.width,C.goal.height);
  const heading=goal.promiseText.text.replace(/^NEXT MASTERY PATH\s*•\s*/,'NEXT  ·  ');
  const detail=goal.detailText.text==='THE STAR PILLAR UNLOCKS YOUR FIRST CELESTIAL ABILITY'
    ? 'Star Pillar unlocks your first Celestial ability' : goal.detailText.text;
  text(C.goal.x,C.goal.y-C.goal.lineOffset,heading,C.goal.titleSize,C.font.gold);
  const body=text(C.goal.x,C.goal.y+C.goal.lineOffset,detail,C.goal.detailSize,C.font.secondary);
  if(body.width>C.goal.width-32)body.setFontSize(C.goal.detailSize*(C.goal.width-32)/body.width);
  const q=s.hudSystem.quickControls,u=C.utility;
  const place=(container,frame,hit,x,width)=>{
    save(container)?.setPosition(x,u.y);
    save(frame)?.setDisplaySize(width,u.height);
    save(hit)?.setSize(width+10,u.height+8);
  };
  place(q.wikiShortcut.container,q.wikiShortcut.frame,q.wikiShortcut.hit,u.wikiX,u.wikiWidth);
  place(q.mapContainer,q.mapFrame,q.mapHit,u.mapX,u.mapWidth);
  place(q.pauseContainer,q.pauseFrame,q.pauseHit,u.menuX,u.menuWidth);
  const bar=s.celestialActionBarSystem;
  const regular=[...bar.slotsById.values()].filter(slot=>slot.entry.id!=='campfire');
  const empty=regular.every(slot=>slot.state?.unlocked===false);
  if(empty){
    hide(bar.foundationView.foundation);
    hide(bar.metrics?.gpText);hide(bar.metrics?.damageText);
    for(const slot of regular)hide(slot.root);
    text(C.damage.x,C.damage.y,bar.metrics.damageText.text.replace('MINE DMG','DMG'),C.damage.fontSize,C.font.secondary);
  }
  let quieterDecorations=0;
  if(options.quietTerrain){
    for(const o of s.children.list){
      if(o.type!=='Image'||o.scrollFactorX!==1)continue;
      const key=o.texture?.key||'';
      if(/^world-visual-(underground-foreground|ground-structure|underground-overlay|biome-expansion)/.test(key)){
        save(o).setAlpha(o.alpha*C.decorationAlpha);quieterDecorations++;
      }
    }
  }
  if(options.target){
    const {tx,ty}=options.target,cam=s.cameras.main;
    const hp=s.worldModel.getHp(tx,ty);
    const x=(tx+.5)*s.config.tileSize-cam.scrollX;
    const y=(ty+.5)*s.config.tileSize-cam.scrollY-C.target.rise;
    plate(x,y,C.target.width,C.target.height);
    text(x,y,C.target.label+'  ·  '+Math.ceil(hp)+' HP',C.target.fontSize,C.font.gold);
  }
  if(options.shopPrompt){
    const label=s.children.list.find(o=>o.type==='Text'&&o.visible&&/Bobo.s Shop/.test(o.text));
    if(label){
      hide(label);
      const bounds=label.getBounds(),cam=s.cameras.main;
      const x=bounds.centerX-cam.scrollX,y=bounds.centerY-cam.scrollY;
      plate(x,y,C.prompt.width,C.prompt.height);
      text(x,y-10,"BOBO'S SHOP",C.prompt.titleSize,C.font.gold);
      text(x,y+10,C.prompt.detail,C.prompt.detailSize,C.font.ink);
    }
  }
  s._mostSeenReview={originals,added,reviewOnly:true};
  return {reviewOnly:true,productionChanged:false,changedObjects:originals.size,addedObjects:added.length,
    collapsedLockedSlots:empty?regular.length:0,campfirePreserved:bar.slotsById.get('campfire').root.visible,
    quieterDecorations,saveBlocked:s._saveWritesBlocked};
}
