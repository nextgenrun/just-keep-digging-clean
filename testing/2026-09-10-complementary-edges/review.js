import { ExcavatedEdgeArtView } from '../../world/rendering/scenic-world/ExcavatedEdgeArtView.js';
import { COMPLEMENTARY_EDGE_ART as ART } from '../../values/complementaryTerrainEdges.js';
import { APPROVED_POLISH_ART } from '../../values/approvedPolishArt.js';
import { TILE_TYPES as T } from '../../values/tileTypes.js';
import { WORLD_VISUAL_SEMANTIC_ASSETS as SEM } from '../../values/worldVisualSemanticAssets.js';
if(!['localhost','127.0.0.1'].includes(location.hostname))throw Error('Local fixture only');
class Review extends Phaser.Scene {
 preload(){for(const a of [...Object.values(ART),...Object.values(APPROVED_POLISH_ART)])this.load.image(a.key,'/'+a.path);this.load.image('core','/sprites/backgrounds/world-visual-v2/materials/town-dark-earth-v1.png');this.load.image('stone', '/'+SEM.resources.atlas.path);this.load.image('back','/sprites/backgrounds/world-scenic-facade-v1/level1-shallow-blue-seamless.webp');}
 create(){this.config={tileSize:64,topAirRows:0};this.dug=new Set();this.step=0;this.on=true;this.core=[];
 this.add.tileSprite(0,0,1280,640,'back').setOrigin(0).setDepth(-1).setTint(0x253a49);
 const atlas=SEM.resources.atlas;this.textures.get('stone').add('existing-stone',0,(54%atlas.columns)*atlas.frameSizePx,Math.floor(54/atlas.columns)*atlas.frameSizePx,atlas.frameSizePx,atlas.frameSizePx);
 this.world={getTileType:(x,y)=>x<0||x>=20||y<0||y>=10||this.dug.has(x+','+y)||(x>=2&&x<=17&&y>=4&&y<=6)||(x>=3&&x<=4&&y<4)?T.AIR:x>=10?T.STONE:T.DIRT};
 this.edges=new ExcavatedEdgeArtView(this,this.world);this.render();
 document.getElementById('toggle').onclick=()=>{this.on=!this.on;this.render();};
 document.getElementById('dig').onclick=()=>{this.dug.add((6+this.step%10)+',7');this.step++;this.render();};
 document.getElementById('reset').onclick=()=>{this.dug.clear();this.step=0;this.render();};
 }
 render(){this.core.forEach(i=>i.destroy());this.core=[];
 for(let y=0;y<10;y++)for(let x=0;x<20;x++){const t=this.world.getTileType(x,y);if(t===T.AIR)continue;const texture=this.textures.get('core');const frame='core-'+(x%4)+'-'+(y%4);if(!texture.has(frame)){const source=texture.getSourceImage();texture.add(frame,0,(x%4)*source.width/4,(y%4)*source.height/4,source.width/4,source.height/4);}const image=this.add.image(x*64,y*64,'core',frame).setOrigin(0).setDisplaySize(64,64).setDepth(2.4);this.core.push(image);if(t===T.STONE)this.core.push(this.add.image(x*64,y*64,'stone','existing-stone').setOrigin(0).setDisplaySize(64,64).setDepth(2.41));}
 this.edges.sync({left:0,top:0,right:20,bottom:10},{terrainTint:0xffffff});
 if(!this.on)for(const pool of [this.edges.edges,this.edges.corners,this.edges.shadows,this.edges.roots])pool.forEach(i=>i.setVisible(false));
 document.getElementById('status').textContent=JSON.stringify({edgeAdditions:this.on,coreTextures:'existing unchanged assets',...this.edges.getSnapshot(),dug:this.dug.size});
 }
}
new Phaser.Game({type:Phaser.AUTO,width:1280,height:640,parent:'game',backgroundColor:'#10151b',scene:Review,render:{antialias:true}});
