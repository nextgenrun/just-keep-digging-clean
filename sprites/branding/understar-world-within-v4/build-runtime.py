"""Extract the approved logo chroma and export without changing its authored lighting."""
import bpy, json, numpy as np
from pathlib import Path
ROOT = Path(__file__).resolve().parents[3]
CFG = json.loads((ROOT/'values/understarWorldLogoExport.json').read_text())
OUT = ROOT/CFG['package']
bpy.ops.wm.read_factory_settings(use_empty=True)
source = bpy.data.images.load(str(OUT/CFG['source']))
w,h = source.size
p = np.empty(w*h*4,dtype=np.float32)
source.pixels.foreach_get(p)
p = p.reshape(h,w,4)
rgb = p[:,:,:3]
r,g,b = rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
# Pure magenta key, not authored blue/violet energy. Feather only its boundary.
background = (np.minimum(r,b) > 0.45) & (g < np.minimum(r,b)*0.16) & (np.minimum(r,b)/np.maximum(np.maximum(r,b),0.001) > 0.72)
near = background.copy()
for _ in range(2):
    padded = np.pad(near,1)
    near = np.logical_or.reduce([padded[dy:dy+h,dx:dx+w] for dy in range(3) for dx in range(3)])
screen = np.stack([np.median(row[bg],axis=0) if bg.any() else np.array([1,0,1]) for row,bg in zip(rgb,background)])[:,None,:]
key = np.maximum(np.minimum(screen[:,:,0],screen[:,:,2])-screen[:,:,1],0.001)
coverage = 1-np.clip((np.minimum(r,b)-g)/key,0,1)
alpha = np.where(near,coverage,1)
alpha[background] = 0
alpha = np.where(alpha < 0.035,0,np.where(alpha > 0.98,1,alpha))
clean = np.clip((rgb-(1-alpha[:,:,None])*screen)/np.maximum(alpha[:,:,None],0.001),0,1)
clean[:,:,1] = np.where(alpha < 0.999,np.minimum(clean[:,:,1],np.maximum(clean[:,:,0],clean[:,:,2])),clean[:,:,1])
p[:,:,:3] = np.where(alpha[:,:,None]>0,clean,0)
p[:,:,3] = alpha
assert max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max()) == 0
ys,xs=np.where(alpha>0.2)
crop=np.ascontiguousarray(p[max(0,ys.min()-5):min(h,ys.max()+6),max(0,xs.min()-5):min(w,xs.max()+6)])
ch,cw=crop.shape[:2]
art=bpy.data.images.new('Approved story logo - straight RGBA',width=cw,height=ch,alpha=True)
art.alpha_mode='STRAIGHT'
art.pixels.foreach_set(crop.ravel())
art.update()
art.filepath_raw=str(OUT/'understar-source-cutout.png')
art.file_format='PNG'
art.save()
art.pack()
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=CFG['samples']
scene.render.threads_mode='FIXED'
scene.render.threads=CFG['renderThreads']
scene.render.resolution_x=CFG['width']
scene.render.resolution_y=CFG['height']
scene.render.resolution_percentage=100
scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'
scene.view_settings.look='None'
bpy.ops.mesh.primitive_plane_add(size=2)
face=bpy.context.object
face.name='Approved UNDERSTAR story artwork - lighting preserved'
face.scale=(CFG['planeWidth']/2,CFG['planeWidth']*ch/cw/2,1)
mat=bpy.data.materials.new('Authored color with clean alpha')
mat.use_nodes=True
nodes=mat.node_tree.nodes
nodes.clear()
tex=nodes.new('ShaderNodeTexImage');tex.image=art;tex.interpolation='Cubic'
em=nodes.new('ShaderNodeEmission')
transparent=nodes.new('ShaderNodeBsdfTransparent')
mix=nodes.new('ShaderNodeMixShader')
output=nodes.new('ShaderNodeOutputMaterial')
links=mat.node_tree.links
links.new(tex.outputs['Color'],em.inputs['Color'])
links.new(tex.outputs['Alpha'],mix.inputs[0])
links.new(transparent.outputs[0],mix.inputs[1])
links.new(em.outputs[0],mix.inputs[2])
links.new(mix.outputs[0],output.inputs['Surface'])
face.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0,0,12))
camera=bpy.context.object
camera.data.type='ORTHO'
camera.data.ortho_scale=CFG['cameraWidth']
scene.camera=camera
scene['provenance']='ImageGen approved story logo; E readability corrected; Blender alpha extraction and emission export. No added relighting.'
scene.render.filepath=str(OUT/'understar-world-logo-4k.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'understar-world-logo.blend'))
bpy.ops.render.render(write_still=True)
report={'source':[w,h],'cutout':[cw,ch],'master':[CFG['width'],CFG['height']],'native4k':False,'relighting':False,'interiorVioletPreserved':True}
(OUT/'blender-verification.json').write_text(json.dumps(report,indent=2))
print('WORLD_LOGO_READY',json.dumps(report),flush=True)

