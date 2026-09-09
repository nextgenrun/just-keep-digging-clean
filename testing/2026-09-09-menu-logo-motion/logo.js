import {isMenuMotionAllowed} from '../../ui/components/MenuBackgroundView.js';
export function createReviewLogo(scene, cfg, original) {
  const c=cfg.logo;
  const root=scene.add.container(c.x,c.y).setDepth(3);
  const backing=scene.add.image(0,0,'review-stone').setDisplaySize(c.displayWidth,c.displayHeight);
  const poster=scene.add.image(0,0,'review-logo').setDisplaySize(c.displayWidth,c.displayHeight);
  const shadows=c.shadowOffsets.map(([x,y])=>scene.add.image(x,y,'review-logo').setTint(0).setAlpha(c.shadowAlpha).setDisplaySize(c.displayWidth,c.displayHeight));
  const video=scene.add.video(0,0).setAlpha(0);
  root.add([backing,...shadows,poster,video]);
  let ready=false,disposed=false,paused=false;
  const fallback=()=>{poster.setVisible(true);video.setAlpha(0).setPaused(true);root.setData('state','Poster fallback');};
  root.setData('state','Loading full animation');
  const timer=setTimeout(fallback,cfg.readinessMs);
  video.once('play',()=>{
    if(disposed)return;
    ready=true;clearTimeout(timer);
    video.setDisplaySize(c.displayWidth,c.displayHeight).setAlpha(1);
    poster.setVisible(false);
    for(const shadow of shadows)shadow.setTexture(video.videoTexture.key).setDisplaySize(c.displayWidth,c.displayHeight);
    root.setData('state','Full logo animation');sync();
  });
  video.once('error',fallback);video.once('unsupported',fallback);
  const sync=()=>{if(ready)video.setPaused(paused||document.hidden);};
  document.addEventListener('visibilitychange',sync);
  if(isMenuMotionAllowed()){video.loadURL(original+c.output+'?v='+cfg.assetRevision,true);video.setMute(true).play(true);}
  else{clearTimeout(timer);root.setData('state','Still artwork (motion preference)');}
  return {
    root,video,
    style(s){backing.setAlpha(s.backingAlpha);for(const shadow of shadows)shadow.setVisible(s.shadow);},
    pause(value){paused=value;sync();},
    destroy(){disposed=true;clearTimeout(timer);document.removeEventListener('visibilitychange',sync);const key=video.videoTexture?.key;root.destroy();if(key&&scene.textures.exists(key))scene.textures.remove(key);}
  };
}
