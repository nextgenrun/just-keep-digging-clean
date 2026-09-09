import fs from "node:fs";
import {createHash} from "node:crypto";
import {BAKED_CELESTIAL_FRAMES} from "../../values/bakedCelestialFrames.js";
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const pack="sprites/UI/baked-stars-talents-v2/";
const prompts=JSON.parse(fs.readFileSync(pack+"prompts.json","utf8"));
const manifest=prompts.assets.map(entry=>{
  const path=pack+entry.file,bytes=fs.readFileSync(path),source=fs.readFileSync(entry.source);
  if(sha(bytes)!==sha(source))throw Error("Source bytes changed: "+path);
  return {file:entry.file,source:entry.source,path,width:bytes.readUInt32BE(16),
    height:bytes.readUInt32BE(20),bytes:bytes.length,sha256:sha(bytes)};
});
fs.writeFileSync(pack+"manifest.json",JSON.stringify(manifest,null,2)+"\n");
const file="sprites/UI/baked-copy-v1/star-codex-v2.png",bytes=fs.readFileSync(file);
if(sha(bytes)!==sha(fs.readFileSync(prompts.foundation.source)))throw Error("Foundation source changed");
const provenancePath="sprites/UI/baked-copy-v1/source-frames.json";
const provenance=JSON.parse(fs.readFileSync(provenancePath,"utf8"));
provenance.starCodexV2={file:"star-codex-v2.png",source:prompts.foundation.source,
  sha256:sha(bytes),width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),mode:bytes[25]===6?"RGBA":"RGB",frames:[]};
fs.writeFileSync(provenancePath,JSON.stringify(provenance,null,2)+"\n");
console.log({assets:manifest.length,missingPrompts:prompts.assets.filter(x=>!x.prompt).map(x=>x.file),
  nodes:BAKED_CELESTIAL_FRAMES.nodes.length,compressedMiB:manifest.reduce((n,a)=>n+a.bytes,0)/1048576,
  decodedMiB:manifest.reduce((n,a)=>n+a.width*a.height*4,0)/1048576});
