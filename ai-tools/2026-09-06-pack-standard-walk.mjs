/** Keep only the original Standard Walk bone tracks; reuse the existing runtime mesh. */
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
const path="sprites/character/survival-skeletal-walk-v1/standard-walk.glb";
const bytes=await fs.readFile(path), length=bytes.readUInt32LE(12);
const data=JSON.parse(bytes.subarray(20,20+length).toString());
const binary=bytes.subarray(28+length);
if(data.animations?.length!==1)throw new Error("Expected the original Standard Walk only");
data.animations[0].name="Original_Run_Standard_Walk";
const baseBytes=await fs.readFile("sprites/character/survival-skeletal-run-v1/survival-legacy-jog.glb");
const base=JSON.parse(baseBytes.subarray(20,20+baseBytes.readUInt32LE(12)).toString());
const baseNames=new Set(base.nodes.map(n=>n.name));
for(const channel of data.animations[0].channels){
  if(!baseNames.has(data.nodes[channel.target.node].name))throw new Error("Walk track cannot bind to the existing public rig");
}
const accessors=[],views=[],parts=[],lookup=new Map();let offset=0;
function include(oldIndex){
  if(lookup.has(oldIndex))return lookup.get(oldIndex);
  const accessor={...data.accessors[oldIndex]};
  const view=data.bufferViews[accessor.bufferView];
  const chunk=binary.subarray(view.byteOffset||0,(view.byteOffset||0)+view.byteLength);
  accessor.bufferView=views.length;
  views.push({buffer:0,byteOffset:offset,byteLength:chunk.length});
  parts.push(chunk);
  const padding=(4-chunk.length%4)%4;
  if(padding)parts.push(Buffer.alloc(padding));
  offset+=chunk.length+padding;
  const result=accessors.length;accessors.push(accessor);lookup.set(oldIndex,result);return result;
}
for(const sampler of data.animations[0].samplers){sampler.input=include(sampler.input);sampler.output=include(sampler.output);}
for(const node of data.nodes){delete node.mesh;delete node.skin;}
for(const property of ["meshes","skins","materials","textures","images","samplers","extensionsUsed","extensionsRequired"])delete data[property];
data.accessors=accessors;data.bufferViews=views;data.buffers=[{byteLength:offset}];
const json=Buffer.from(JSON.stringify(data));
const padded=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,32)]),bin=Buffer.concat(parts);
const header=Buffer.alloc(20),binHeader=Buffer.alloc(8);
header.writeUInt32LE(0x46546c67,0);header.writeUInt32LE(2,4);header.writeUInt32LE(28+padded.length+bin.length,8);
header.writeUInt32LE(padded.length,12);header.writeUInt32LE(0x4e4f534a,16);
binHeader.writeUInt32LE(bin.length,0);binHeader.writeUInt32LE(0x004e4942,4);
const result=Buffer.concat([header,padded,binHeader,bin]);
await fs.writeFile(path,result);
const manifest=JSON.parse(await fs.readFile(path.replace("standard-walk.glb","manifest.json"),"utf8"));
Object.assign(manifest,{animationOnly:true,glbBytes:result.length,glbSha256:createHash("sha256").update(result).digest("hex"),
  sharedMesh:"sprites/character/survival-skeletal-run-v1/survival-legacy-jog.glb",tracks:data.animations[0].channels.length});
await fs.writeFile(path.replace("standard-walk.glb","manifest.json"),JSON.stringify(manifest,null,2)+"\n");
console.log("STANDARD_WALK_PACK",JSON.stringify({before:bytes.length,after:result.length,tracks:manifest.tracks}));
