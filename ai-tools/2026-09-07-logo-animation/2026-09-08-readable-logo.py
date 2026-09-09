import bpy,json
from pathlib import Path
ROOT=Path.cwd();C=json.loads((ROOT/'values/startupCompression.json').read_text(encoding='utf-8-sig'));width,height=C['logoWidth'],C['logoHeight'];out=ROOT/'sprites/branding/understar-world-within-v4/understar-world-logo-readable.png'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.mesh.primitive_plane_add(size=2);obj=bpy.context.object;obj.scale=(width/height,1,1)
mat=bpy.data.materials.new('Readable authored logo');mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();links=mat.node_tree.links
tex=n.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(ROOT/'sprites/branding/understar-world-within-v4/understar-world-logo-4k.png'))
gamma=n.new('ShaderNodeGamma');gamma.inputs[1].default_value=C['logoGamma'];links.new(tex.outputs['Color'],gamma.inputs[0])
em=n.new('ShaderNodeEmission');links.new(gamma.outputs[0],em.inputs['Color']);transparent=n.new('ShaderNodeBsdfTransparent');mix=n.new('ShaderNodeMixShader');links.new(tex.outputs['Alpha'],mix.inputs[0]);links.new(transparent.outputs[0],mix.inputs[1]);links.new(em.outputs[0],mix.inputs[2]);output=n.new('ShaderNodeOutputMaterial');links.new(mix.outputs[0],output.inputs['Surface']);obj.data.materials.append(mat)
bpy.ops.object.camera_add(location=(0,0,10));camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=2*width/height
s=bpy.context.scene;s.camera=camera;s.render.engine='CYCLES';s.cycles.samples=1;s.render.resolution_x=width;s.render.resolution_y=height;s.render.resolution_percentage=100;s.render.film_transparent=True;s.view_settings.view_transform='Standard';s.view_settings.look='None';s.render.image_settings.color_mode='RGBA';s.render.filepath=str(out);bpy.ops.render.render(write_still=True)
