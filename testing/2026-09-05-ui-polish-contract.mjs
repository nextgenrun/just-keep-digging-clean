
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createButton, createSlider, createFocusController } from '../ui/PhaserUiKit.js';
globalThis.Phaser={Math:{Clamp:(v,min,max)=>Math.max(min,Math.min(max,v))}};
class Display extends EventEmitter {
  constructor(x=0,y=0,width=0,height=0,text=''){super();Object.assign(this,{x,y,width,height,text,active:true,visible:true,scaleX:1,scaleY:1,list:[]});}
  setPosition(x,y){this.x=x;this.y=y;return this;}
  setSize(w,h){this.width=w;this.height=h;return this;}
  setScale(x,y=x){this.scaleX=x;this.scaleY=y;return this;}
  setOrigin(x,y=x){this.originX=x;this.originY=y;return this;}
  setDepth(){return this;} setScrollFactor(){return this;}
  setInteractive(){this.input={enabled:true};return this;}
  disableInteractive(){this.input.enabled=false;return this;}
  setAlpha(v){this.alpha=v;return this;} setVisible(v){this.visible=v;return this;}
  setColor(){return this;} setText(s){this.text=String(s);this.width=this.text.length*7;return this;}
  clear(){return this;} fillStyle(){return this;} fillRoundedRect(){return this;}
  lineStyle(w){this.strokeWidth=w;return this;} strokeRoundedRect(){return this;}
  add(children){for(const c of [children].flat()){c.parentContainer=this;this.list.push(c);}return this;}
  iterate(f){this.list.forEach(f);}
  getWorldTransformMatrix(){return{applyInverse:(x,y)=>({x:x-this.x,y:y-this.y})};}
  destroy(){this.emit('destroy');this.active=false;this.list.forEach(c=>c.destroy());this.removeAllListeners();}
}
const input=new EventEmitter();input.keyboard=new EventEmitter();
const pending=[];
const scene={input,textures:{exists:()=>false},soundSystem:{},add:{
  container:(x,y)=>new Display(x,y),graphics:()=>new Display(),
  text:(x,y,t)=>new Display(x,y,String(t).length*7,14,String(t)),
  rectangle:(x,y,w,h)=>new Display(x,y,w,h)
},tweens:{killTweensOf(){},add:c=>pending.push(c)}};
const flush=()=>{while(pending.length)pending.shift().onComplete?.();};
let clicks=0;
const button=createButton(scene,{label:'A longer action',hint:'ENTER',width:180,autoIcon:false,enabled:false,onClick:()=>clicks++});
assert.equal(button.hit.input.enabled,false,'Initially disabled controls do not show a pointer target');
assert.equal(button.activate(),false);
button.setEnabled(true);button.activate();button.setEnabled(false);button.setEnabled(true);flush();
assert.equal(clicks,0,'A canceled press cannot fire after the control is re-enabled');
button.hit.emit('pointerdown',{button:2});flush();assert.equal(clicks,0,'Secondary mouse buttons do not activate');
let consumed=0;
button.hit.emit('pointerdown',{button:0},0,0,{stopPropagation:()=>consumed++});flush();
assert.equal(clicks,1);assert.equal(consumed,1);
const left=button.text.x-button.text.width*button.text.scaleX*button.text.originX;
const right=left+button.text.width*button.text.scaleX;
const hintLeft=button.hintText.x-button.hintText.width*button.hintText.scaleX;
assert.ok(left>=-78 && right<hintLeft,'Long labels and keyboard hints fit without overlapping');
const parent=new Display();parent.add(button.root);parent.setVisible(false);
assert.equal(button.activate(),false,'Hidden parent controls cannot activate');parent.setVisible(true);
const mkItem=(enabled=true,visible=true)=>({root:{active:true,visible},hit:new EventEmitter(),focused:false,isEnabled:()=>enabled,setFocused(v){this.focused=v},activate(){this.activations=(this.activations||0)+1}});
const first=mkItem(),disabled=mkItem(false),hidden=mkItem(true,false),last=mkItem();
let controllerEnabled=true,horizontalCalls=0,tabConsumed=0;
const focus=createFocusController(scene,{items:[first,disabled,hidden,last],enabled:()=>controllerEnabled,onHorizontal:()=>horizontalCalls++});
input.keyboard.emit('keydown-TAB',{preventDefault:()=>tabConsumed++});assert.equal(last.focused,true);
input.keyboard.emit('keydown-TAB',{shiftKey:true,preventDefault:()=>tabConsumed++});assert.equal(first.focused,true);
assert.equal(tabConsumed,2);
last.hit.emit('pointerdown');input.keyboard.emit('keydown-ENTER',{});assert.equal(last.activations,1,'Click and keyboard activation use the same control');
input.keyboard.emit('keydown-ENTER',{repeat:true});assert.equal(last.activations,1);
controllerEnabled=false;input.keyboard.emit('keydown-RIGHT',{});assert.equal(horizontalCalls,0,'Inactive controllers cannot route horizontal input');
controllerEnabled=true;last.root.visible=false;input.keyboard.emit('keydown-ENTER',{});assert.equal(last.activations,1);
focus.setItems([first]);assert.equal(last.hit.listenerCount('pointerdown'),0);
focus.destroy();assert.equal(input.keyboard.listenerCount('keydown-TAB'),0);assert.equal(first.hit.listenerCount('pointerdown'),0);
const slider=createSlider(scene,{width:200,value:0.5});slider.setFocused(true);
slider.hit.emit('pointerover');slider.hit.emit('pointerout');
assert.equal(slider.root.list[2].strokeWidth,2,'Mouse exit preserves keyboard focus highlight');
slider.hit.emit('pointerdown',{x:25,y:0,button:0},0,0,{stopPropagation(){}});
slider.hit.emit('pointerup',{},0,0,{stopPropagation(){}});
const released=slider.getValue();input.emit('pointermove',{x:90,y:0});assert.equal(slider.getValue(),released,'Releasing on the slider ends its drag');
slider.hit.emit('pointerdown',{x:0,y:0,button:0});input.emit('gameout');const exited=slider.getValue();
input.emit('pointermove',{x:100,y:0});assert.equal(slider.getValue(),exited,'Leaving the game cancels slider dragging');
const sliderParent=new Display();sliderParent.add(slider.root);sliderParent.destroy();
assert.equal(input.listenerCount('pointermove'),0,'Destroying a panel releases global slider listeners');
assert.equal(input.listenerCount('pointerup'),0);assert.equal(input.listenerCount('gameout'),0);

parent.uiClosing=true;assert.equal(button.activate(),false);assert.equal(parent.active,true,'Closing UI retains its lifecycle state');parent.uiClosing=false;
let section=0,tabChanges=0;
const firstOwner=createFocusController(scene,{items:[],enabled:()=>section===0,onTab:()=>{section=1;tabChanges++;return true}});
const secondOwner=createFocusController(scene,{items:[],enabled:()=>section===1,onTab:()=>{tabChanges++;return true}});
const tabEvent={ctrlKey:true,cancelled:0,preventDefault(){},stopPropagation(){this.cancelled=-1}};
input.keyboard.emit('keydown-TAB',tabEvent);assert.equal(tabChanges,1,'A Tab event cannot advance a newly active controller twice');
firstOwner.destroy();secondOwner.destroy();
globalThis.Phaser.Input={Keyboard:{JustDown:key=>{const down=!!key?.justDown;if(key)key.justDown=false;return down}}};
globalThis.Phaser.Scenes={Events:{SHUTDOWN:'shutdown'}};
const { GameInputHandler }=await import('../world/playScene/GameInputHandler.js');
const escape=new EventEmitter();let opened=0,closed=0;
const gameScene={gameState:'playing',events:new EventEmitter(),input:{keyboard:new EventEmitter()},showPauseMenu(){opened++;this._pausePanel={};this.gameState='paused'},closeTopOverlay(){closed++;this._pausePanel=null;this.gameState='playing'}};
const gameInput=new GameInputHandler(gameScene,{getKeys:()=>({escape,hardEscape:escape})},{});
escape.emit('down');escape.justDown=false;
assert.equal(gameInput.handleEscapeInput(),true);assert.equal(opened,1,'A short released Escape tap reaches the next game frame');
assert.equal(gameInput.handleEscapeInput(),false);
escape.emit('down');escape.justDown=false;
gameInput.handleEscapeInput();assert.equal(closed,1);assert.equal(opened,1,'A buffered close press cannot reopen Pause');
const nativeEscape={code:'Escape'};
escape.emit('down',escape,nativeEscape);gameInput.handleEscapeInput();assert.equal(opened,2);
escape.emit('down',escape,nativeEscape);assert.equal(closed,1,'Repeated delivery of a native Escape event cannot close the UI it just opened');
escape.emit('down',escape,{code:'Escape'});gameInput.handleEscapeInput();assert.equal(closed,2);
gameInput.destroy();
button.destroy();

const { UIInventoryPopup } = await import('../ui/overlays/UIInventoryPopup.js');
const { UIInventoryStarAtlasKeyboard } = await import('../ui/overlays/UIInventoryStarAtlasKeyboard.js');
const { INVENTORY_SPECIAL_BLOCKS } = await import('../values/inventorySpecialBlocks.js');
let loadedStars=0,rendered=0;
const inventory={scene:{systemIntroductionSystem:{isFeatureAvailable:()=>false}},isOpen:true,activeTab:1,selectedSpecialBlock:INVENTORY_SPECIAL_BLOCKS.entries[0].id,_render:()=>rendered++,_activateStarAtlasRarity:()=>loadedStars++};
UIInventoryPopup.prototype._cycleTab.call(inventory,1);
assert.equal(inventory.activeTab,2);assert.equal(loadedStars,0,'Tab never loads a hidden Star Codex');
UIInventoryPopup.prototype._navigateSpecialBlock.call(inventory,{code:'ArrowDown',preventDefault(){},stopPropagation(){}});
assert.equal(inventory.selectedSpecialBlock,INVENTORY_SPECIAL_BLOCKS.entries[1].id,'Special Blocks support keyboard selection');
let starSelections=0;
const starKeyboard=new UIInventoryStarAtlasKeyboard(scene,{getState:()=>({isOpen:true,activeTab:2,starAtlasAvailable:false}),onSelectIdentity:()=>starSelections++});
starKeyboard._handleKeyDown({code:'ArrowDown'});
assert.equal(starSelections,0,'The hidden Star Codex cannot consume Special Blocks input');
starKeyboard.destroy();
const { ShopOverlay }=await import('../ui/overlays/ShopOverlay.js');
const { ASSET_KEYS }=await import('../values/assetKeys.js');
const { NEW_RUN_SETUP_CONFIG }=await import('../values/newRunSetup.js');
const offer={scene:{textures:{exists:()=>false}}};
assert.equal(ShopOverlay.prototype._hardcoreIconKey.call(offer),NEW_RUN_SETUP_CONFIG.cards.hardcoreIconName,'Casual shop uses the approved resident fallback icon');
offer.scene.textures.exists=()=>true;
assert.equal(ShopOverlay.prototype._hardcoreIconKey.call(offer),ASSET_KEYS.ui.hardcore.oathCrest,'Loaded Hardcore crest remains the preferred artwork');
console.log('UI_POLISH_BEHAVIOR_CONTRACT_OK: button geometry, canceled clicks, input isolation, Tab, hover focus, repeat keys, slider focus/drag/cleanup');

