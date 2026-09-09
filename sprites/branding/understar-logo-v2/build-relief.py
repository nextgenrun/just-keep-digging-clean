"""Build the packed UNDERSTAR ImageGen/Blender relief and transparent 4K export."""
import bpy
import json
import numpy as np
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
CFG = json.loads((ROOT / 'values/understarLogoHdExport.json').read_text())
OUT = ROOT / CFG['package']
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = CFG['samples']
scene.cycles.use_denoising = True
scene.render.threads_mode = 'FIXED'
scene.render.threads = CFG['renderThreads']
scene.render.resolution_x, scene.render.resolution_y = CFG['width'], CFG['height']
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.world = bpy.data.worlds.new('Studio world')
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.2

source = bpy.data.images.load(str(OUT / CFG['source']))
w, h = source.size
pixels = np.empty(w*h*4, dtype=np.float32)
source.pixels.foreach_get(pixels)
pixels = pixels.reshape(h, w, 4)
rgb = pixels[:, :, :3]
chroma = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
# The generated magenta varies in brightness. Measure its color per row and
# identify fully saturated background independently of brightness.
background = (chroma > CFG['backgroundChromaMin']) & (rgb[:, :, 1] < np.minimum(rgb[:, :, 0],rgb[:, :, 2])*CFG['backgroundGreenRatio'])
screen = np.stack([np.median(row[bg],axis=0) for row,bg in zip(rgb,background)])[:, None, :]
screen_chroma = np.maximum(np.minimum(screen[:, :, 0],screen[:, :, 2])-screen[:, :, 1],0.001)
alpha = 1.0 - np.clip(chroma/screen_chroma,0,1)
alpha[background] = 0
alpha = np.where(alpha < CFG['alphaCutoff'], 0, np.where(alpha > 0.98, 1, alpha))
clean = np.clip((rgb-(1-alpha[:, :, None])*screen)/np.maximum(alpha[:, :, None], 0.001), 0, 1)
# Magenta removal can leave a green remainder only in antialiased boundary pixels.
clean[:, :, 1] = np.where(alpha < 0.999, np.minimum(clean[:, :, 1], np.maximum(clean[:, :, 0],clean[:, :, 2])), clean[:, :, 1])
pixels[:, :, :3] = np.where(alpha[:, :, None] > 0, clean, 0)
pixels[:, :, 3] = alpha
assert max(alpha[0].max(),alpha[-1].max(),alpha[:,0].max(),alpha[:,-1].max()) == 0, 'Background remains at source boundary'
ys, xs = np.where(alpha > 0.2)
x0, x1 = max(0, xs.min()-4), min(w, xs.max()+5)
y0, y1 = max(0, ys.min()-4), min(h, ys.max()+5)
cropped = np.ascontiguousarray(pixels[y0:y1, x0:x1])
ch, cw = cropped.shape[:2]
assert ch < h*0.75, 'Unexpected low-alpha background expanded the crop'
print('CLEAN_ALPHA_READY',cw,ch,flush=True)
art = bpy.data.images.new('UNDERSTAR - clean ImageGen RGBA', width=cw, height=ch, alpha=True)
art.alpha_mode = 'STRAIGHT'
art.pixels.foreach_set(cropped.ravel())
art.update()
art.filepath_raw = str(OUT / 'understar-source-cutout.png')
art.file_format = 'PNG'
art.save()
art.pack()

# Oriented alpha contours preserve the holes in D, R and A.
gw = CFG['grid']
gh = round(gw*ch/cw)
mask = cropped[np.minimum((np.arange(gh)+0.5)*ch/gh, ch-1).astype(int)[:, None],
               np.minimum((np.arange(gw)+0.5)*cw/gw, cw-1).astype(int)[None, :], 3] > 0.55
border = np.pad(mask, 1)
edges = {}
def edge(a, b):
    edges.setdefault(a, []).append(b)
for y, x in zip(*np.where(mask)):
    if not border[y, x+1]: edge((x, y), (x+1, y))
    if not border[y+1, x+2]: edge((x+1, y), (x+1, y+1))
    if not border[y+2, x+1]: edge((x+1, y+1), (x, y+1))
    if not border[y+1, x]: edge((x, y+1), (x, y))
loops = []
while edges:
    start = next(iter(edges))
    contour, current = [start], start
    while current in edges:
        follow = edges[current].pop()
        if not edges[current]: del edges[current]
        current = follow
        contour.append(current)
        if current == start: break
    if current != start or len(contour) < 4: continue
    area = abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(contour, contour[1:]))) / 2
    if area < 3: continue
    points = contour[:-1]
    # Remove collinear grid points without changing topology.
    points = [p for i,p in enumerate(points)
              if (p[0]-points[i-1][0],p[1]-points[i-1][1]) !=
                 (points[(i+1)%len(points)][0]-p[0],points[(i+1)%len(points)][1]-p[1])]
    loops.append(points)

curve = bpy.data.curves.new('Logo silhouette with counter-holes', 'CURVE')
curve.dimensions = '2D'
curve.fill_mode = 'BOTH'
curve.extrude, curve.bevel_depth, curve.bevel_resolution = CFG['extrude'], CFG['bevel'], 2
width, height = CFG['planeWidth'], CFG['planeWidth']*ch/cw
for contour in loops:
    if len(contour) < 3: continue
    spline = curve.splines.new('POLY')
    spline.points.add(len(contour)-1)
    for point,(x,y) in zip(spline.points,contour):
        point.co = ((x/gw-0.5)*width,(y/gh-0.5)*height,0,1)
    spline.use_cyclic_u = True
body = bpy.data.objects.new('EDITABLE shallow stone relief',curve)
scene.collection.objects.link(body)
body.location = CFG['bodyOffset']
bodymat = bpy.data.materials.new('Basalt undercut')
bodymat.use_nodes = True
bs = bodymat.node_tree.nodes['Principled BSDF']
bs.inputs['Base Color'].default_value = CFG['bodyColor']
bs.inputs['Metallic'].default_value = 0.22
bs.inputs['Roughness'].default_value = 0.57
body.data.materials.append(bodymat)

bpy.ops.mesh.primitive_plane_add(size=2)
face = bpy.context.object
face.name = 'ImageGen face - engraved basalt and cyan seams'
face.scale = (width/2,height/2,1)
mat = bpy.data.materials.new('Authored art with restrained physical surface')
mat.use_nodes = True
nodes, links = mat.node_tree.nodes, mat.node_tree.links
nodes.clear()
def node(kind,name,loc):
    n = nodes.new(kind)
    n.label, n.location = name, loc
    return n
tex = node('ShaderNodeTexImage','Packed authored color and alpha',(-700,180))
tex.image, tex.interpolation = art,'Cubic'
lit = node('ShaderNodeBsdfPrincipled','Soft material lighting',(-140,30))
links.new(tex.outputs['Color'],lit.inputs['Base Color'])
lit.inputs['Roughness'].default_value = 0.57
lit.inputs['Metallic'].default_value = 0.10
noise = node('ShaderNodeTexNoise','Fine mineral surface',(-700,-310))
noise.inputs['Scale'].default_value = CFG['microScale']
micro = node('ShaderNodeBump','Fine pores',(-440,-240))
micro.inputs['Distance'].default_value = CFG['microDistance']
micro.inputs['Strength'].default_value = CFG['microStrength']
links.new(noise.outputs['Fac'],micro.inputs['Height'])
bump = node('ShaderNodeBump','Engraving and fracture relief',(-410,-30))
bump.inputs['Distance'].default_value = CFG['stoneBump']
bump.inputs['Strength'].default_value = CFG['stoneStrength']
links.new(tex.outputs['Color'],bump.inputs['Height'])
links.new(micro.outputs['Normal'],bump.inputs['Normal'])
links.new(bump.outputs['Normal'],lit.inputs['Normal'])
em = node('ShaderNodeEmission','Preserve authored color and cyan light',(-120,250))
links.new(tex.outputs['Color'],em.inputs['Color'])
mix = node('ShaderNodeMixShader','Restrained studio contribution',(160,180))
mix.inputs[0].default_value = CFG['litMix']
links.new(em.outputs[0],mix.inputs[1])
links.new(lit.outputs[0],mix.inputs[2])
transparent = node('ShaderNodeBsdfTransparent','Transparent background',(150,-80))
alpha_mix = node('ShaderNodeMixShader','Clean alpha silhouette',(420,160))
links.new(tex.outputs['Alpha'],alpha_mix.inputs[0])
links.new(transparent.outputs[0],alpha_mix.inputs[1])
links.new(mix.outputs[0],alpha_mix.inputs[2])
output = node('ShaderNodeOutputMaterial','RGBA output',(660,160))
links.new(alpha_mix.outputs[0],output.inputs['Surface'])
face.data.materials.append(mat)

bpy.ops.object.camera_add(location=(0,0,12))
camera = bpy.context.object
camera.name = 'CAMERA - 4096px transparent logo'
camera.data.type, camera.data.ortho_scale = 'ORTHO',CFG['cameraWidth']
scene.camera = camera
for light in CFG['lights']:
    data = bpy.data.lights.new(light['name'],'AREA')
    data.energy, data.color, data.shape, data.size = light['power'],light['color'],'DISK',light['size']
    obj = bpy.data.objects.new(light['name'],data)
    scene.collection.objects.link(obj)
    obj.location = light['position']
    obj.rotation_euler = (Vector((0,0,0))-obj.location).to_track_quat('-Z','Y').to_euler()
scene['provenance'] = 'Built-in ImageGen texture plus Blender silhouette relief and physical lighting.'
scene['source_native_dimensions'] = f'{w} x {h}'
scene.render.filepath = str(OUT/'understar-rift-monolith-4k.png')
for area in getattr(bpy.context.screen,'areas',[]):
    if area.type == 'VIEW_3D':
        area.spaces.active.region_3d.view_perspective = 'CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'understar-logo-hd-v2.blend'))
bpy.ops.render.render(write_still=True)
report = {'blender':bpy.app.version_string,'sourceSize':[w,h],'nativeCutout':[cw,ch],
          'masterSize':[CFG['width'],CFG['height']],'contours':len(loops),'native4kTexture':False,
          'method':'ImageGen raster face; alpha traced relief; bump detail; Cycles studio lighting'}
(OUT/'blender-verification.json').write_text(json.dumps(report,indent=2))
print('UNDERSTAR_LOGO_RENDER_COMPLETE',json.dumps(report))
