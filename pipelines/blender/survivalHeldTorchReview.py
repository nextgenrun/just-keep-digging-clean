"""Model and render the review-only Survival held-torch geometry."""

import math

import bpy
from mathutils import Matrix, Vector


def material(name, spec):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = spec["color"]
    bsdf.inputs["Metallic"].default_value = spec.get("metallic", 0.0)
    bsdf.inputs["Roughness"].default_value = spec.get("roughness", 0.45)
    emission = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
    strength = bsdf.inputs.get("Emission Strength")
    if "emission" in spec:
        emission.default_value = spec["color"]
        strength.default_value = spec["emission"]
    return mat, strength


def link_under(obj, root, collection, mat=None, z=0.0):
    for owner in tuple(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
    obj.parent = root
    obj.location = (0, 0, z)
    if mat:
        obj.data.materials.append(mat)
    return obj


def cylinder(name, root, collection, radius, depth, z, mat, vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth)
    obj = bpy.context.object
    obj.name = name
    return link_under(obj, root, collection, mat, z)


def flame_mesh(name, rings, root, collection, mat, phase=0.0):
    segments, vertices, faces = 20, [], []
    for level, (z, radius) in enumerate(rings):
        for index in range(segments):
            angle = math.tau * index / segments
            squash = 0.84 + 0.08 * math.sin(angle + phase)
            vertices.append((radius * math.cos(angle) * squash, radius * math.sin(angle), z))
    for level in range(len(rings) - 1):
        for index in range(segments):
            a, b = level * segments + index, level * segments + (index + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(mat)
    return obj


def build_torch(scene, rig, config, calibrated_grip):
    torch, mats = config["torch"], config["materials"]
    collection = bpy.data.collections.new("DG_HELD_TORCH_V1")
    scene.collection.children.link(collection)
    root = bpy.data.objects.new("DG_TorchRoot_weapon_r", None)
    grip = bpy.data.objects.new("DG_TorchGrip", None)
    collection.objects.link(root)
    collection.objects.link(grip)
    grip.parent = root
    grip.empty_display_type = "SPHERE"
    grip.empty_display_size = 0.025
    grip.hide_render = True
    made = {key: material(f"DG_{key}", value) for key, value in mats.items()}
    cylinder("DG_Torch_WoodShaft", root, collection, torch["shaftRadius"], torch["shaftDepth"],
             torch["shaftCenterZ"], made["wood"][0], 32)
    cylinder("DG_Torch_LowerCap", root, collection, torch["lowerCapRadius"], torch["lowerCapDepth"],
             torch["lowerCapZ"], made["darkMetal"][0])
    for index, z in enumerate(torch["wrapZ"], 1):
        cylinder(f"DG_Torch_BrassWrap_{index}", root, collection, torch["wrapRadius"],
                 torch["wrapDepth"], z, made["brass"][0])
    cylinder("DG_Torch_UpperCollar", root, collection, torch["upperCollarRadius"],
             torch["upperCollarDepth"], torch["upperCollarZ"], made["brass"][0])
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=torch["cupBottomRadius"],
                                    radius2=torch["cupTopRadius"], depth=torch["cupDepth"])
    cup = bpy.context.object
    cup.name = "DG_Torch_DarkFireCup"
    link_under(cup, root, collection, made["darkMetal"][0], torch["cupZ"])
    for index in range(4):
        angle = math.tau * index / 4
        bar = cylinder(f"DG_Torch_Cage_{index + 1}", root, collection, torch["cageBarRadius"],
                       torch["cageBarDepth"], torch["cageBarZ"], made["darkMetal"][0], 16)
        bar.location.x = torch["cageRadius"] * math.cos(angle)
        bar.location.y = torch["cageRadius"] * math.sin(angle)
    outer = flame_mesh("DG_Torch_FlameOuter", torch["flameOuterRings"], root, collection,
                       made["outerFlame"][0])
    inner = flame_mesh("DG_Torch_FlameInner", torch["flameInnerRings"], root, collection,
                       made["innerFlame"][0], 0.8)
    light_data = bpy.data.lights.new("DG_Torch_SoftLight", "POINT")
    light_data.color = (1.0, 0.29, 0.06)
    light_data.shadow_soft_size = 0.42
    light = bpy.data.objects.new("DG_Torch_SoftLight", light_data)
    collection.objects.link(light)
    light.parent = root
    light.location = (0, 0, 0.49)
    for index, frame in enumerate(torch["flamePulseFrames"]):
        xy, z = torch["flamePulseScaleXY"][index], torch["flamePulseScaleZ"][index]
        for flame in (outer, inner):
            flame.scale = (xy, xy, z)
            flame.keyframe_insert("scale", frame=frame)
        made["outerFlame"][1].default_value = torch["flameEmissionStrength"][index]
        made["outerFlame"][1].keyframe_insert("default_value", frame=frame)
        light.data.energy = torch["pointLightEnergy"][index]
        light.data.keyframe_insert("energy", frame=frame)
    scene.frame_set(1)
    bpy.context.view_layer.update()
    root.matrix_world = Matrix.Translation(calibrated_grip)
    root.parent = rig
    root.parent_type = "BONE"
    root.parent_bone = config["objects"]["attachmentBone"]
    root.matrix_world = Matrix.Translation(calibrated_grip)
    root["realGeometry"] = True
    root["spritePlaneUsed"] = False
    root["reviewOnly"] = True
    return root, grip, collection


def look_camera(name, source, focus, ortho, location=None):
    camera = source.copy()
    camera.data = source.data.copy()
    camera.name = name
    bpy.context.scene.collection.objects.link(camera)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ortho
    direction = (source.matrix_world.to_3x3() @ Vector((0, 0, -1))).normalized()
    camera.location = focus - direction * 6.0 if location is None else Vector(location)
    if location is not None:
        camera.rotation_euler = (Vector(focus) - camera.location).to_track_quat("-Z", "Y").to_euler()
    return camera


def configure_render(scene, config):
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.fps = config["action"]["fps"]
    scene.world.color = config["render"]["backgroundColor"]


def render_outputs(scene, camera, grip, output, config):
    render = config["render"]
    focus = grip.matrix_world.translation.copy()
    closeup = look_camera("DG_TorchGrip_Closeup_Camera", camera, focus + Vector((0, 0, 0.15)),
                          render["closeupOrthoScale"])
    three = look_camera("DG_Torch_ThreeQuarter_Camera", camera, (0, 0, 0.98),
                        render["threeQuarterOrthoScale"], (4.2, 4.2, 2.65))
    stills = ((camera, render["stillSizePx"], "held-torch-fullbody.png"),
              (closeup, render["closeupSizePx"], "held-torch-grip-closeup.png"),
              (three, render["stillSizePx"], "held-torch-three-quarter.png"))
    scene.frame_set(1)
    for active, size, filename in stills:
        scene.camera = active
        scene.render.resolution_x = scene.render.resolution_y = size
        scene.render.filepath = str(output / filename)
        bpy.ops.render.render(write_still=True)
    motion = output / "soft-burn-frames"
    motion.mkdir(parents=True, exist_ok=True)
    for stale in motion.glob("frame-*.png"):
        stale.unlink()
    scene.camera = closeup
    scene.render.resolution_x = scene.render.resolution_y = render["videoSizePx"]
    motion_frames = range(1, config["action"]["frames"] + 1, render["videoFrameStep"])
    for index, frame in enumerate(motion_frames):
        scene.frame_set(frame)
        scene.render.filepath = str(motion / f"frame-{index:03d}.png")
        bpy.ops.render.render(write_still=True)
    scene.camera = camera
    scene.frame_set(1)
    return [item[2] for item in stills] + ["soft-burn-frames"]
