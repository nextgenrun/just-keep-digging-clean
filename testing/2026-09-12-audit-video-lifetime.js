// Isolated real-Phaser reproduction using the production segment destructor.
import { WorldVisualDepthBackdropRegionView } from '../world/rendering/scenic-world/WorldVisualDepthBackdropRegionView.js';
const output=document.querySelector('#audit-status');
const results=[];
new Phaser.Game({type:Phaser.WEBGL,width:400,height:260,audio:{noAudio:true},scene:{
  preload(){this.load.video('audit-loop','/sprites/backgrounds/world-visual-v2/depth/biome-motion-v3/weathered-roots-root-tide-lantern-hollow-loop-v3.mp4',true);},
  async create(){
    try {
      const initial=this.textures.getTextureKeys().length;
      for(let cycle=0;cycle<(new URLSearchParams(location.search).has('soak') ? 20 : 4);cycle++) {
        const card=this.add.video(0,0,'audit-loop').setOrigin(0).setDisplaySize(384,256);
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('Video creation timeout')),15000);
          card.once('created',()=>{clearTimeout(timer);resolve();});
          card.setMute(true).play(true);
        });
        const key=card.videoTexture.key;
        const source=card.videoTexture.source[0];
        const bytes=source.width*source.height*4;
        WorldVisualDepthBackdropRegionView.prototype._destroySegment.call({}, {backwall:card,isSmoothVideo:true});
        results.push({cycle,key,rgbaBytes:bytes,retainedAfterProductionDestroy:this.textures.exists(key),extraTextureCount:this.textures.getTextureKeys().length-initial});
        output.textContent=JSON.stringify({phase:'running',results});
      }
      // Demonstrate that explicit ownership cleanup releases just these private textures.
      for(const row of results) if (this.textures.exists(row.key)) this.textures.remove(row.key);
      output.textContent=JSON.stringify({phase:'complete',results,extraTexturesAfterOwnedCleanup:this.textures.getTextureKeys().length-initial});
      this.scene.pause();
    } catch(error){output.textContent=JSON.stringify({phase:'failed',error:error.stack,results});}
  },
}});
