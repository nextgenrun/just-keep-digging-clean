"""Native character-definition preview; never saves the source Blend."""
import bpy, hashlib, importlib.util, json, math, os, struct, sys
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT / os.environ.get("CHARACTER_PREVIEW_CONFIG", "values/characterDefinitionPreviewV1.json")).read_text(encoding="utf-8-sig"))
OUT = ROOT / C["outputRoot"]
OUT.mkdir(parents=True, exist_ok=True)
spec = importlib.util.spec_from_file_location("definition_unified", ROOT / "ai-tools/2026-08-25-render-survival-unified-animation-runtime-v1.py")
U = importlib.util.module_from_spec(spec)
spec.loader.exec_module(U)
U.CONFIG["renderRoot"] = str((OUT / "pose-capture").relative_to(ROOT)).replace(chr(92), "/")
U.CONFIG["sheets"] = {C["sheet"]: U.CONFIG["sheets"][C["sheet"]]}
body = bpy.data.objects[U.CONFIG["objects"]["body"]]
rig = bpy.data.objects[U.CONFIG["objects"]["rig"]]
def weight_audit():
    digest, sums, used = hashlib.sha256(), [], set()
    for vertex in body.data.vertices:
        sums.append(sum(g.weight for g in vertex.groups))
        for g in vertex.groups:
            digest.update(struct.pack("IIf", vertex.index, g.group, g.weight))
            if g.weight > 0: used.add(body.vertex_groups[g.group].name)
    return {"sha256": digest.hexdigest(), "unweighted": sum(s < .00001 for s in sums), "nonNormalized": sum(abs(s-1) > .001 for s in sums), "usedGroups": sorted(used)}
source_hash = hashlib.sha256((ROOT / C["sourceBlend"]).read_bytes()).hexdigest()
report = {"reviewOnly": True, "vertices": len(body.data.vertices), "polygons": len(body.data.polygons), "bones": len(rig.data.bones), "modifiers": [m.type for m in body.modifiers], "clothObjects": [o.name for o in bpy.data.objects if any(m.type=="CLOTH" for m in o.modifiers)], "weights": weight_audit()}
(OUT / "source-audit.json").write_text(json.dumps(report, indent=2))
print("SOURCE_AUDIT_OK " + json.dumps({k:v for k,v in report.items() if k != "weights"}), flush=True)
poses, drivers = [], []
def capture(scene, sheet, index, secondary, count, loop):
    bpy.context.view_layer.update()
    poses.append(U.poses.capture_pose(rig))
    drivers.append((rig.matrix_world @ rig.pose.bones[C["secondary"]["driverBone"]].matrix).translation.copy())
U.render_frame = capture
sys.argv = [sys.argv[0], "--", "--sheet=" + C["sheet"]]
U.main()
scene, camera = bpy.context.scene, bpy.context.scene.camera
if rig.animation_data: rig.animation_data.action = None
U.poses.restore_pose(rig, poses[0])
bpy.context.view_layer.update()
corners = [body.matrix_world @ Vector(p) for p in body.bound_box]
height = max(p.z for p in corners) - min(p.z for p in corners)
center = sum(corners, Vector()) / len(corners)
basis = camera.matrix_world.to_3x3()
right, up, toward = [basis @ Vector(a) for a in ((1,0,0),(0,1,0),(0,0,1))]
def set_input(shader, name, value):
    if name not in shader.inputs: return
    for link in list(shader.inputs[name].links): shader.id_data.links.remove(link)
    shader.inputs[name].default_value = value
detail = None
if C.get("materialMode") == "fixedAlbedo":
    spec = importlib.util.spec_from_file_location("definition_detail", ROOT / "ai-tools/2026-09-06-character-definition-detail.py")
    detail = importlib.util.module_from_spec(spec); spec.loader.exec_module(detail)
    report["surfaceDetail"] = detail.configure_materials(C, height)
else:
    for name, settings in C["materials"].items():
        tree = bpy.data.materials[name].node_tree
        shader = next(n for n in tree.nodes if n.type == "BSDF_PRINCIPLED")
        base = shader.inputs["Base Color"]
        source = base.links[0].from_socket
        for link in list(base.links): tree.links.remove(link)
        bw, ramp = tree.nodes.new("ShaderNodeRGBToBW"), tree.nodes.new("ShaderNodeValToRGB")
        for i,key in enumerate(("dark","light")):
            ramp.color_ramp.elements[i].position = C["rampPositions"][i]
            ramp.color_ramp.elements[i].color = settings[key]
        tree.links.new(source,bw.inputs["Color"])
        tree.links.new(bw.outputs[0],ramp.inputs["Fac"])
        tree.links.new(ramp.outputs[0],base)
        for socket,value in (("Roughness",settings["roughness"]),("Sheen Weight",settings["sheen"]),("Coat Weight",0)): set_input(shader,socket,value)
        for node in tree.nodes:
            if node.type=="NORMAL_MAP": node.inputs["Strength"].default_value=settings["normal"]
    skin = next(n for n in bpy.data.materials["Head"].node_tree.nodes if n.type=="BSDF_PRINCIPLED")
    set_input(skin,"Roughness",C["skin"]["roughness"])
    set_input(skin,"Subsurface Weight",C["skin"]["subsurface"])
for obj in bpy.data.objects:
    if obj.type=="LIGHT": obj.hide_render=True
for settings in C["lights"]:
    data=bpy.data.lights.new("DefinitionPreview"+settings["name"],"AREA")
    data.energy=settings["energy"]*(height/C["lightReferenceHeight"])**2
    data.shape="DISK"; data.size=height*settings["size"]; data.color=settings["color"]
    light=bpy.data.objects.new(data.name,data); scene.collection.objects.link(light)
    x,y,z=settings["offset"]
    light.location=center+height*(right*x+up*y+toward*z)
    light.rotation_euler=(center-light.location).to_track_quat("-Z","Y").to_euler()
for block in body.data.shape_keys.key_blocks: block.value=0
shapes, movement, maxima = {}, {}, {}
inverse=body.matrix_world.to_3x3().inverted()
count=len(poses); dt=1/C["fps"]
for name in ("jacket","backpack"):
    settings=C["secondary"][name]
    indices=U.ACCEPTED.V32.vertices_for_material(body,settings["material"])
    zs=[body.data.vertices[i].co.z for i in indices]; lo,hi=min(zs),max(zs)
    cutoff=lo+(hi-lo)*settings["lowerFraction"]; shapes[name]=[]
    for axis in (right,up):
        block=body.shape_key_add(name="Definition_"+name); block.slider_min=-1
        displacement=inverse@(axis*height*settings["amplitudeHeight"])
        for i in indices:
            w=max(0,min(1,(cutoff-body.data.vertices[i].co.z)/max(.00001,cutoff-lo)))
            block.data[i].co+=displacement*w*w
        shapes[name].append(block)
    omega=math.tau*settings["frequency"]; position=Vector((0,0)); velocity=Vector((0,0)); values=[]
    for i in range(count*C["secondary"]["settleCycles"]):
        j=i%count
        accel=(drivers[(j+1)%count]-2*drivers[j]+drivers[(j-1)%count])/(dt*dt)
        drive=Vector((accel.dot(right),accel.dot(up)))/height
        for a,gain in enumerate(settings.get("axisGain",[1,1])): drive[a]*=gain
        for _ in range(C["secondary"]["substeps"]):
            step=dt/C["secondary"]["substeps"]
            velocity+=(-omega*omega*position-2*settings["damping"]*omega*velocity-settings["inertia"]*drive)*step
            position+=velocity*step
        values.append([(math.tanh(v/settings["amplitudeHeight"]) if C["secondary"].get("smoothLimit") else max(-1,min(1,v/settings["amplitudeHeight"]))) for v in position])
    movement[name]=values[-count:]; maxima[name]=[max(abs(v[a]) for v in movement[name]) for a in (0,1)]
scene.render.resolution_x=scene.render.resolution_y=C["renderSize"]
scene.render.filter_size=C["filterWidth"]; scene.view_settings.exposure=C["exposure"]; scene.view_settings.look=C["look"]
if hasattr(scene.eevee,"taa_render_samples"): scene.eevee.taa_render_samples=C["renderSamples"]
camera.data.dof.use_dof=False
if detail: report["renderer"] = detail.configure_render(scene, body, C)
raw=OUT/"after-raw"; raw.mkdir(exist_ok=True)
requested=os.environ.get("CHARACTER_PREVIEW_FRAMES","all")
frames=list(range(count)) if requested=="all" else [int(v) for v in requested.split(",")]
for i in frames:
    U.poses.restore_pose(rig,poses[i])
    for name,blocks in shapes.items():
        for axis,block in enumerate(blocks): block.value=movement[name][i][axis]
    bpy.context.view_layer.update()
    scene.render.filepath=str(raw/f"frame-{i:04d}.png")
    bpy.ops.render.render(write_still=True)
    print(f"DEFINITION_FRAME_OK {i}/{count}",flush=True)
report.update({"frames":count,"renderedIndices":frames,"worldHeight":height,"springPeak":maxima,"springValues":movement,"weightsUnchanged":weight_audit()==report["weights"],"sourceBlendUnchanged":hashlib.sha256((ROOT/C["sourceBlend"]).read_bytes()).hexdigest()==source_hash,"runtimeWiring":"none","motion":"Acceleration-driven spring deformations; no cloth collision solver"})
(OUT/"preview-report.json").write_text(json.dumps(report,indent=2))
print("CHARACTER_DEFINITION_PREVIEW_OK",flush=True)

