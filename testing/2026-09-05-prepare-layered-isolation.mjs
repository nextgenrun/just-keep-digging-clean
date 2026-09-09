import fs from 'node:fs/promises';
let script=await fs.readFile('testing/2026-09-05-layered-world-review-smoke.mjs','utf8');
const start=script.indexOf(' const captures=[];');
const end=script.indexOf("\n} finally",start);
script=script.slice(0,start)+
" const captures=[];\n"+
" for(const [id,clouds,features,forest] of [['all',true,true,true],['no-clouds',false,true,true],['no-features',false,false,true],['sky-only',false,false,false],['cloud-only',true,false,false]]){\n"+
"  await page.evaluate(({clouds,features,forest})=>{const s=window.__layeredWorldReview.getScene();s.worldRenderer.surfaceStage.layeredSky.clouds.update=()=>{};for(const i of s.worldRenderer.surfaceStage.layeredSky.clouds.active.values())i.setVisible(clouds);s.worldRenderer.skyCohesionLayer.enabled=features;for(const {image} of s.worldRenderer.skyCohesionLayer.cards.values())image.setVisible(features);for(const i of s.worldRenderer.surfaceStage.far)i.setVisible(forest);},{clouds,features,forest});\n"+
"  await page.waitForTimeout(300);await page.locator('#viewport').screenshot({path:path.join(out,'isolate-'+id+'.png')});captures.push(id);\n"+
" }\n"+
" console.log(await page.evaluate(()=>{const s=window.__layeredWorldReview.getScene();const r=s.worldRenderer.surfaceStage.layeredSky;return [...r.cards.values()].slice(0,3).map(({image})=>{const c=image.texture.getSourceImage().getContext('2d');return {key:image.texture.key,x:image.x,y:image.y,a:Array.from(c.getImageData(0,0,8,1).data),center:Array.from(c.getImageData(800,400,1,1).data)}})}));\n"+
" await page.setContent('<body style=\"margin:0;background:#111;color:white;display:grid;grid-template-columns:1fr 1fr;font:16px sans-serif\">'+(await Promise.all(captures.map(async id=>'<div>'+id+'<img style=\"width:600px;display:block\" src=\"data:image/png;base64,'+(await fs.readFile(path.join(out,'isolate-'+id+'.png'))).toString('base64')+'\"></div>'))).join('')+'</body>');await page.screenshot({path:path.join(out,'isolation-sheet.png'),fullPage:true});\n"+
script.slice(end);
await fs.writeFile('testing/2026-09-05-layered-world-isolation.mjs',script);
