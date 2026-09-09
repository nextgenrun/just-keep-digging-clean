import {addMenuBackground,MENU_BACKGROUND_ASSETS,isMenuMotionAllowed} from '../../ui/components/MenuBackgroundView.js';
import {createMenuLoadingPanel} from '../../ui/components/MenuLoadingPanel.js';
import {BRAND_CONFIG} from '../../values/branding.js';
import {MAIN_MENU_PRESENTATION} from '../../values/mainMenuPresentation.js';
import {resolveRenderDensityProfile,installRenderDensityFoundation,finalizeRenderDensityFoundation} from '../../systems/visual/RenderDensitySystem.js';
import {createReviewLogo} from './logo.js';
import {watchMedia} from './cadence.js';
const base=new URL('../../',import.meta.url).href;
const cfg=await(await fetch(new URL('../../values/menuMotionReview20260909.json',import.meta.url))).json();
const baseTag=document.createElement('base');baseTag.href=base;document.head.append(baseTag);
const el=id=>document.getElementById(id);
const params=new URLSearchParams(location.search);
let style=cfg.styles.find(s=>s.id===params.get('style'))??cfg.styles.find(s=>s.id===cfg.defaultStyle);
let scene,background,logo,shade,panel,menu,paused=false,backgroundStats,logoStats,timer;
for(const art of MENU_BACKGROUND_ASSETS)el('scenery').add(new Option(art.name,art.id));
el('scenery').value=params.get('scenery')??'lantern-forest';
for(const s of cfg.styles){
  const button=document.createElement('button');button.dataset.style=s.id;
  button.textContent=s.label;const subtitle=document.createElement('span');
  subtitle.textContent=s.id==='quiet-sky'?'Soft shade behind the title':s.id==='silhouette'?'Dark contour, open scenery':'Approved matte stone';
  button.append(subtitle);button.onclick=()=>{style=s;applyStyle();};el('styles').append(button);
}
function applyStyle(){
  if(!scene)return;
  shade.clear();shade.fillGradientStyle(0,0,0,0,style.shadeAlpha,style.shadeAlpha,0,0);
  shade.fillRect(0,0,cfg.width,style.shadeHeight);logo.style(style);
  for(const button of el('styles').children)button.setAttribute('aria-pressed',String(button.dataset.style===style.id));
  el('description').textContent=style.description;
}
function switchBackground(){
  if(!scene)return;
  backgroundStats?.stop();background?.destroy();
  const art=MENU_BACKGROUND_ASSETS.find(a=>a.id===el('scenery').value)??MENU_BACKGROUND_ASSETS[0];
  const source=el('quality').value==='current'?cfg.backgroundSource:cfg.backgroundOutput;
  background=addMenuBackground(scene,{key:art.key,videoPath:base+source+art.id+'.mp4?v='+cfg.assetRevision,motion:true,bufferedLoops:false,alpha:1,videoMix:1,replacePoster:true});
  background.setDepth(0);
  background.on('media-created',video=>{backgroundStats?.stop();backgroundStats=watchMedia(video,'Scenery',cfg.sampleWindow);});
  // The first native video is created synchronously by the component.
  const first=background.list.find(child=>child.type==='Video');
  if(first?.video)backgroundStats=watchMedia(first,'Scenery',cfg.sampleWindow);
  if(paused)scene.events.emit('pause');
}
function switchView(){const loading=el('view').value==='loading';panel.anchor.setVisible(loading);menu.setVisible(!loading);}
function togglePause(){paused=!paused;logo.pause(paused);scene.events.emit(paused?'pause':'resume');el('pause').textContent=paused?'Resume motion':'Pause motion';backgroundStats?.reset();logoStats?.reset();}
class ReviewScene extends Phaser.Scene{
  preload(){
    this.load.setBaseURL(base);
    for(const art of MENU_BACKGROUND_ASSETS)this.load.image(art.key,art.path);
    this.load.image('review-logo',cfg.logo.poster);this.load.image('review-stone',BRAND_CONFIG.backing.path);
    this.load.image('review-button',MAIN_MENU_PRESENTATION.button.idlePath);
  }
  create(){
    scene=this;switchBackground();shade=this.add.graphics().setDepth(1);
    logo=createReviewLogo(this,cfg,base);logoStats=logo.video.video?watchMedia(logo.video,'Logo',cfg.sampleWindow):null;
    panel=createMenuLoadingPanel(this,cfg.loadingCopy);panel.setProgress(cfg.progress);panel.anchor.setDepth(4);
    menu=this.add.container(0,0).setDepth(4);
    cfg.menu.labels.forEach((text,index)=>{const y=cfg.menu.firstY+index*cfg.menu.spacing;menu.add(this.add.image(cfg.menu.x,y,'review-button').setDisplaySize(MAIN_MENU_PRESENTATION.button.widthPx,MAIN_MENU_PRESENTATION.button.heightPx));menu.add(this.add.text(cfg.menu.x,y,text,cfg.menu.text).setOrigin(.5));});
    applyStyle();switchView();
    if(!isMenuMotionAllowed()){el('pause').disabled=true;el('pause').textContent='Still artwork';}
    timer=setInterval(()=>{
      el('playback').textContent=paused?'Motion paused':logo.root.getData('state');
      el('diagnostics').textContent=JSON.stringify({reviewOnly:true,style:style.id,source:el('quality').value,canvas:[this.game.canvas.width,this.game.canvas.height],scenery:backgroundStats?.sample(),logo:logoStats?.sample()},null,2);
    },cfg.statusIntervalMs);
    this.events.once('shutdown',()=>{clearInterval(timer);backgroundStats?.stop();logoStats?.stop();logo.destroy();panel.destroy();});
  }
}
const density=resolveRenderDensityProfile('');
new Phaser.Game({type:Phaser.WEBGL,parent:'preview-root',width:density.backingWidth,height:density.backingHeight,
  backgroundColor:'#080e15',audio:{noAudio:true},render:{antialias:true,antialiasGL:true,powerPreference:'high-performance'},
  scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},
  callbacks:{preBoot:game=>installRenderDensityFoundation(game,density),postBoot:game=>finalizeRenderDensityFoundation(game,density)},scene:[ReviewScene]});
el('scenery').onchange=()=>switchBackground();el('quality').onchange=()=>switchBackground();el('view').onchange=switchView;el('pause').onclick=togglePause;
el('reset-stats').onclick=()=>{backgroundStats?.reset();logoStats?.reset();};
