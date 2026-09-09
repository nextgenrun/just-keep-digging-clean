"""Export the authored panel silhouette with transparent pixels using Blender."""
import bpy,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
cfg=json.loads((ROOT/'values/understarLogoStoneExport.json').read_text(encoding='utf-8-sig'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
w,h=cfg['sourceSize'];cx,cy=cfg['center']
mesh=bpy.data.meshes.new('Authored panel silhouette');mesh.from_pydata([(x-cx,cy-y,0) for x,y in cfg['corners']],[],[tuple(range(8))]);mesh.update()
obj=bpy.data.objects.new('Authored bronze panel',mesh);bpy.context.collection.objects.link(obj)
uv=mesh.uv_layers.new(name='Source pixels')
for poly in mesh.polygons:
 for li in poly.loop_indices:
  x,y=cfg['corners'][mesh.loops[li].vertex_index];uv.data[li].uv=(x/w,1-y/h)
mat=bpy.data.materials.new('Unchanged authored color');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear()
out=n.new('ShaderNodeOutputMaterial');em=n.new('ShaderNodeEmission');tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/cfg['source']));mat.node_tree.links.new(tex.outputs['Color'],em.inputs['Color']);mat.node_tree.links.new(em.outputs[0],out.inputs['Surface']);obj.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0,0,100));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=cfg['size'][0]
s=bpy.context.scene;s.camera=camera;s.render.engine='BLENDER_EEVEE';s.render.resolution_x,s.render.resolution_y=cfg['size'];s.render.resolution_percentage=100;s.render.film_transparent=True
s.view_settings.view_transform='Standard';s.view_settings.look='None';s.view_settings.exposure=0;s.view_settings.gamma=1;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGBA';s.render.filepath=str(ROOT/cfg['output']);bpy.ops.render.render(write_still=True)
