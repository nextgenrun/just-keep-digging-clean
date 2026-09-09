import { BAKED_UI_ART } from "/values/bakedUiArt.js";
import { getBakedUiArt, fitBakedUiImage } from "/systems/visual/bakedUiArt.js";
import { createButton } from "/ui/PhaserUiKit.js";
import { createModalShell } from "/ui/UiModalShell.js";

class AspectReview extends Phaser.Scene {
  preload() {
    for (const name of ["controls","controlsExtra","headingsA","headingsB","headingsC","iconBadges","inventorySettings","navigationLabels","wiki","menu","worldMap"]) {
      const asset=BAKED_UI_ART.assets[name]; this.load.image(asset.key,"/"+asset.path);
    }
  }
  create() {
    this.clicks=0;
    this.shell=createModalShell(this,{title:"PAUSED",subtitle:"Shared production buttons and title; click any button to check its interaction.",maxWidth:1150,maxHeight:680,showClose:false});
    this.buttons=[];
    const rows=[
      {y:-150,width:300,height:50,labels:["RESUME GAME","SAVE GAME","MAIN MENU"]},
      {y:-55,width:200,height:38,labels:["HOLDINGS","RESOURCE CODEX","STAR CODEX"]},
      {y:45,width:260,height:52,labels:["PLAY","SETTINGS","CREDITS"]},
      {y:140,width:90,height:30,labels:["ON","OFF","BACK"]},
    ];
    for(const row of rows)row.labels.forEach((label,index)=>{
      const button=createButton(this,{x:(index-1)*340,y:row.y,width:row.width,height:row.height,label,autoIcon:false,parent:this.shell.content,
        onClick:()=>{this.clicks++;button.setSelected(this.clicks%2===1);publish();}});
      this.buttons.push(button);
    });
    ["wiki","menu","worldMap"].forEach((name,index)=>{
      const art=getBakedUiArt(this,name);
      const image=this.add.image((index-1)*340,235,art.key,art.frame);
      fitBakedUiImage(image,180,44);this.shell.content.add(image);
    });
    this.shell.show();
    const publish=()=>{
      const images=[];
      const walk=root=>{for(const item of root.list||[]){if(item.type==="Image"&&item.visible&&item.texture.key.includes("baked"))images.push(item);if(item.list)walk(item);}};
      walk(this.shell.root);
      const faults=images.filter(image=>Math.abs(image.scaleX-image.scaleY)>1e-10).map(image=>({key:image.texture.key,frame:image.frame.name,scaleX:image.scaleX,scaleY:image.scaleY}));
      document.body.dataset.bakedAspectSnapshot=JSON.stringify({ready:true,images:images.length,faults,clicks:this.clicks});
      document.querySelector("#result").textContent=images.length+" images; "+faults.length+" stretched; "+this.clicks+" clicks.";
    };
    this.events.on("postupdate",publish);
    publish();
  }
}
new Phaser.Game({type:Phaser.WEBGL,width:1280,height:720,backgroundColor:"#090f16",scene:AspectReview});
