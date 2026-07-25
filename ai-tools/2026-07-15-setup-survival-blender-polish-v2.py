"""Build the persistent Survival Miner v2 authoring scene inside Blender MCP."""
from pathlib import Path
import bpy
from mathutils import Matrix, Vector
ROOT = Path(r"C:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")
ASSET_ROOT = ROOT / "sprites" / "character" / "survival-character-blender-v2"
BLEND_PATH = ASSET_ROOT / "blender" / "survival-character-blender-v2.blend"
COLLECTION_NAME, RIG_NAME, BODY_NAME = "SurvivalMinerPolishV2", "SurvivalPolishRig", "SurvivalPolishBody"
MATERIAL_ORDER = (
    "Jacket1", "Brows_Leashes", "Hair3", "Backpack2", "Gloves1", "Mouth",
    "Head", "Body2", "Arms", "Body_Arkit:Eye", "Jeans1", "Shoes1",
)
ACTION_NAMES = ("SRC_idle", "SRC_walk", "SRC_run", "SRC_fly", "SRC_attack",
                "SRC_dig_side", "SRC_dig_up", "SRC_dig_down")
ENABLE_IDENTITY_GEAR = ENABLE_PICKAXE = False
def reset_polish_collection():
    old = bpy.data.collections.get(COLLECTION_NAME)
    if old:
        for obj in list(old.all_objects):
            bpy.data.objects.remove(obj, do_unlink=True)
        bpy.data.collections.remove(old)
    collection = bpy.data.collections.new(COLLECTION_NAME)
    bpy.context.scene.collection.children.link(collection)
    return collection
def move_to_collection(obj, collection):
    for owner in list(obj.users_collection):
        owner.objects.unlink(obj)
    collection.objects.link(obj)
def make_material(name, color, metallic=0.0, roughness=0.45, emission=None, strength=0.0):
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    material.use_nodes = True; nodes = material.node_tree.nodes
    nodes.clear()
    output = nodes.new("ShaderNodeOutputMaterial")
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    emission_input = shader.inputs.get("Emission Color") or shader.inputs.get("Emission")
    if emission and emission_input:
        emission_input.default_value = emission
        strength_input = shader.inputs.get("Emission Strength")
        if strength_input:
            strength_input.default_value = strength
    material.node_tree.links.new(shader.outputs["BSDF"], output.inputs["Surface"])
    material.diffuse_color = color
    return material
def finish_mesh(obj, name, collection, material, bevel=0.008, smooth=True):
    obj.name = name
    move_to_collection(obj, collection)
    obj.data.materials.append(material)
    if smooth:
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    if bevel:
        modifier = obj.modifiers.new("Industrial edge bevel", "BEVEL")
        modifier.width, modifier.segments = bevel, 3
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    return obj
def add_box(name, location, dimensions, collection, material, rotation=None, bevel=0.008):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    if rotation:
        obj.rotation_mode = "QUATERNION"
        obj.rotation_quaternion = rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish_mesh(obj, name, collection, material, bevel, False)
def add_cylinder(name, point_a, point_b, radius, collection, material, vertices=24, bevel=0.005):
    vector = Vector(point_b) - Vector(point_a)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=vector.length,
                                       location=(Vector(point_a) + Vector(point_b)) * 0.5)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = vector.to_track_quat("Z", "Y")
    return finish_mesh(obj, name, collection, material, bevel)
def add_profile(name, profile, thickness, collection, material):
    count = len(profile)
    vertices = [(x, -thickness / 2, z) for x, z in profile]
    vertices += [(x, thickness / 2, z) for x, z in profile]
    faces = [tuple(reversed(range(count))), tuple(range(count, count * 2))]
    faces += [(index, (index + 1) % count, (index + 1) % count + count, index + count)
              for index in range(count)]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    return finish_mesh(bpy.data.objects.new(name, mesh), name, collection, material, 0.012)
def bone_points(rig, bone_name):
    bone = rig.pose.bones.get(bone_name)
    if not bone:
        raise RuntimeError(f"Survival rig is missing required bone: {bone_name}")
    return rig.matrix_world @ bone.head, rig.matrix_world @ bone.tail
def bone_parent_keep_world(obj, rig, bone_name):
    world = obj.matrix_world.copy()
    obj.parent, obj.parent_type, obj.parent_bone = rig, "BONE", bone_name
    obj.matrix_world = world
def rename_source_actions(rig):
    base = "root|Unreal Take|Base Layer"
    legacy = [base] + [f"{base}.{index:03d}" for index in range(1, 8)]
    for old_name, new_name in zip(legacy, ACTION_NAMES):
        if bpy.data.actions.get(new_name):
            continue
        action = bpy.data.actions.get(old_name)
        if not action:
            raise RuntimeError(f"Missing expected source action: {old_name}")
        action.name = new_name
    rig.animation_data_create()
    rig.animation_data.action = bpy.data.actions["SRC_idle"]
    for action in list(bpy.data.actions):
        if action.name.startswith(base) and action.users == 0:
            bpy.data.actions.remove(action)
def build_accessories(rig, collection, materials):
    scene = bpy.context.scene
    scene.frame_set(1)
    bpy.context.view_layer.update()
    head_a, head_b = bone_points(rig, "head")
    head = (head_a + head_b) * 0.5 + Vector((0, 0, 0.025))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.105, minor_radius=0.013,
                                    major_segments=32, minor_segments=8, location=head)
    band = finish_mesh(bpy.context.object, "ACC_HeadlampBand", collection, materials["armor"], 0.003)
    housing = add_cylinder("ACC_HeadlampHousing", head + Vector((0, 0.09, 0.012)),
                           head + Vector((0, 0.145, 0.012)), 0.052, collection, materials["metal"])
    lens = add_cylinder("ACC_HeadlampLens", head + Vector((0, 0.145, 0.012)),
                        head + Vector((0, 0.157, 0.012)), 0.039, collection, materials["cyan"], bevel=0.002)
    for obj in (band, housing, lens):
        bone_parent_keep_world(obj, rig, "head")
    spine_a, spine_b = bone_points(rig, "spine_03")
    spine = (spine_a + spine_b) * 0.5
    frame_parts = []
    for x in (-0.18, 0.18):
        frame_parts.append(add_cylinder("ACC_BackpackRail", spine + Vector((x, -0.16, -0.22)),
                                        spine + Vector((x, -0.16, 0.22)), 0.018,
                                        collection, materials["metal"]))
    for z in (-0.2, 0.2):
        frame_parts.append(add_cylinder("ACC_BackpackCrossbar", spine + Vector((-0.18, -0.16, z)),
                                        spine + Vector((0.18, -0.16, z)), 0.016,
                                        collection, materials["metal"]))
    core_center = spine + Vector((0.20, -0.19, 0.01))
    frame_parts.append(add_cylinder("ACC_PurpleEnergyCore", core_center + Vector((0, 0, -0.17)),
                                    core_center + Vector((0, 0, 0.17)), 0.052,
                                    collection, materials["purple"], vertices=32, bevel=0.004))
    for z in (-0.19, 0.19):
        frame_parts.append(add_cylinder("ACC_CanisterCollar", core_center + Vector((0, 0, z - 0.025)),
                                        core_center + Vector((0, 0, z + 0.025)), 0.072,
                                        collection, materials["metal"], vertices=32))
    frame_parts.append(add_cylinder("ACC_ThrusterNozzle", core_center + Vector((0, 0, -0.25)),
                                    core_center + Vector((0, 0, -0.19)), 0.043,
                                    collection, materials["orange"], vertices=24))
    for obj in frame_parts:
        bone_parent_keep_world(obj, rig, "spine_03")
    for side in ("l", "r"):
        arm_a, arm_b = bone_points(rig, f"lowerarm_{side}")
        arm_vector = arm_b - arm_a
        arm_mid = arm_a + arm_vector * 0.52 + Vector((0, 0.025, 0))
        rotation = arm_vector.to_track_quat("Z", "Y")
        guard = add_box(f"ACC_ForearmGuard_{side.upper()}", arm_mid,
                        (0.105, 0.07, max(0.16, arm_vector.length * 0.55)),
                        collection, materials["armor"], rotation, 0.014)
        strip = add_box(f"ACC_ForearmGlow_{side.upper()}", arm_mid + Vector((0, 0.04, 0)),
                        (0.055, 0.012, max(0.08, arm_vector.length * 0.28)),
                        collection, materials["cyan"], rotation, 0.004)
        bone_parent_keep_world(guard, rig, f"lowerarm_{side}")
        bone_parent_keep_world(strip, rig, f"lowerarm_{side}")
        calf_a, calf_b = bone_points(rig, f"calf_{side}")
        calf_vector = calf_b - calf_a
        knee = calf_a + calf_vector * 0.12 + Vector((0, 0.045, 0))
        knee_rotation = calf_vector.to_track_quat("Z", "Y")
        plate = add_box(f"ACC_KneePlate_{side.upper()}", knee, (0.15, 0.075, 0.16),
                        collection, materials["armor"], knee_rotation, 0.018)
        bone_parent_keep_world(plate, rig, f"calf_{side}")
def build_pickaxe(rig, collection, materials):
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0, 0, 0))
    control = bpy.context.object
    control.name = "CTRL_Pickaxe"
    control.empty_display_size = 0.18
    move_to_collection(control, collection)
    control["contract"] = "world-space; optional hideable proof prop; local +Z shaft"
    parts = [add_cylinder("PickaxeShaft", (0, 0, -0.64), (0, 0, 0.58), 0.028,
                          collection, materials["shaft"], vertices=32)]
    for z, depth, radius in ((-0.42, 0.22, 0.036), (0.05, 0.14, 0.035)):
        parts.append(add_cylinder("PickaxeGrip", (0, 0, z - depth / 2), (0, 0, z + depth / 2),
                                  radius, collection, materials["grip"], vertices=32, bevel=0.003))
    for z in (-0.59, 0.52):
        parts.append(add_cylinder("PickaxeCollar", (0, 0, z - 0.025), (0, 0, z + 0.025),
                                  0.045, collection, materials["orange"], vertices=32))
    parts.append(add_box("PickaxeSocket", (0, 0, 0.62), (0.18, 0.105, 0.12),
                         collection, materials["metal"], bevel=0.018))
    right_pick = ((0.04, 0.68), (0.22, 0.72), (0.40, 0.68), (0.56, 0.58),
                  (0.66, 0.46), (0.58, 0.50), (0.40, 0.58), (0.21, 0.61), (0.04, 0.60))
    left_adze = ((-0.04, 0.69), (-0.22, 0.74), (-0.42, 0.72), (-0.58, 0.66),
                 (-0.58, 0.55), (-0.43, 0.59), (-0.22, 0.61), (-0.04, 0.60))
    parts.append(add_profile("PickaxeForgedPick", right_pick, 0.075, collection, materials["metal"]))
    parts.append(add_profile("PickaxeForgedAdze", left_adze, 0.09, collection, materials["metal"]))
    bpy.ops.object.select_all(action="DESELECT")
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    tool = bpy.context.object
    tool.name = "SurvivalMinerPickaxe"
    tool.parent = control
    for name, z in (("GRIP_R", -0.42), ("GRIP_L", 0.05)):
        grip = bpy.data.objects.new(name, None)
        grip.empty_display_type = "CUBE"
        grip.empty_display_size = 0.055
        grip.parent = control
        grip.location = (0, 0, z)
        collection.objects.link(grip)
    hand_r = sum(bone_points(rig, "hand_r"), Vector()) * 0.5
    hand_l = sum(bone_points(rig, "hand_l"), Vector()) * 0.5
    direction = hand_l - hand_r
    rotation = direction.to_track_quat("Z", "Y")
    origin = hand_r - rotation @ Vector((0, 0, -0.42))
    control.matrix_world = Matrix.Translation(origin) @ rotation.to_matrix().to_4x4()
def build_camera_and_lights(rig, body, collection):
    scene = bpy.context.scene
    for name in ("SurvivalMotionCamera", "Key", "Fill", "Rim"):
        obj = bpy.data.objects.get(name)
        if obj:
            bpy.data.objects.remove(obj, do_unlink=True)
    foot_l = bone_points(rig, "foot_l")[1]
    foot_r = bone_points(rig, "foot_r")[1]
    pelvis = bone_points(rig, "pelvis")[0]
    feet = (foot_l + foot_r) * 0.5
    minimum_z = min((body.matrix_world @ Vector(corner)).z for corner in body.bound_box)
    target = Vector((feet.x * 0.65 + pelvis.x * 0.35, feet.y * 0.65 + pelvis.y * 0.35,
                     minimum_z + 0.96))
    anchor = bpy.data.objects.new("CTRL_RenderAnchor", None)
    anchor.location = target
    anchor.empty_display_type = "SPHERE"
    anchor.empty_display_size = 0.08
    anchor["contract"] = "fixed feet/root framing; never recenter per frame"
    collection.objects.link(anchor)
    camera_data = bpy.data.cameras.new("SurvivalPolishCamera")
    camera_data.type, camera_data.ortho_scale = "ORTHO", 2.55
    camera = bpy.data.objects.new("SurvivalPolishCamera", camera_data)
    camera.location = target + Vector((1.85, 5.8, 0.34))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    collection.objects.link(camera)
    scene.camera = camera
    for name, offset, energy, color, size in (
        ("SurvivalPolishKey", (3.5, 4.0, 4.5), 950, (1.0, 0.72, 0.48), 4.0),
        ("SurvivalPolishFill", (-3.0, 2.6, 2.2), 560, (0.30, 0.55, 1.0), 3.0),
        ("SurvivalPolishRim", (-2.2, -3.2, 4.0), 850, (0.48, 0.70, 1.0), 2.6),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy, data.color, data.shape, data.size = energy, color, "DISK", size
        light = bpy.data.objects.new(name, data)
        light.location = target + Vector(offset)
        light.rotation_euler = (target - light.location).to_track_quat("-Z", "Y").to_euler()
        collection.objects.link(light)
def main():
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")
    rig = bpy.data.objects.get(RIG_NAME)
    body = bpy.data.objects.get(BODY_NAME)
    if not rig or rig.type != "ARMATURE" or not body or body.type != "MESH":
        raise RuntimeError("Import and name the Survivor FBX rig/body before running v2 setup")
    if len(body.material_slots) != len(MATERIAL_ORDER):
        raise RuntimeError(f"Expected 12 Survivor body slots, found {len(body.material_slots)}")
    for index, name in enumerate(MATERIAL_ORDER):
        material = bpy.data.materials.get(name)
        if not material:
            raise RuntimeError(f"Approved source material is missing: {name}")
        body.material_slots[index].material = material
    rename_source_actions(rig)
    collection = reset_polish_collection()
    materials = {
        "armor": make_material("M_MinerV2_CharcoalArmor", (0.018, 0.024, 0.032, 1), 0.62, 0.27),
        "metal": make_material("M_MinerV2_Gunmetal", (0.055, 0.075, 0.095, 1), 0.88, 0.23),
        "orange": make_material("M_MinerV2_OrangeAccent", (0.44, 0.12, 0.018, 1), 0.55, 0.31),
        "cyan": make_material("M_MinerV2_CyanGlow", (0.01, 0.14, 0.18, 1), 0.22, 0.2,
                              (0.02, 0.75, 1.0, 1), 7.0),
        "purple": make_material("M_MinerV2_PurpleCore", (0.08, 0.01, 0.18, 1), 0.18, 0.18,
                                (0.45, 0.04, 1.0, 1), 11.0),
        "shaft": make_material("M_MinerV2_PickaxeShaft", (0.075, 0.038, 0.018, 1), 0.18, 0.42),
        "grip": make_material("M_MinerV2_PickaxeGrip", (0.025, 0.028, 0.032, 1), 0.05, 0.56),
    }
    if ENABLE_IDENTITY_GEAR:
        build_accessories(rig, collection, materials)
    if ENABLE_PICKAXE:
        build_pickaxe(rig, collection, materials)
    build_camera_and_lights(rig, body, collection)
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = scene.render.resolution_y = 256
    scene.render.resolution_percentage, scene.render.film_transparent = 100, True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.color = (0.005, 0.008, 0.014)
    scene["survivalMinerV2Contract"] = "persistent Blender MCP master; clean PBR base; fixed camera"
    scene["identityGearEnabled"], scene["pickaxeEnabled"] = ENABLE_IDENTITY_GEAR, ENABLE_PICKAXE
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    print(f"SURVIVAL_MINER_V2_SAVED {BLEND_PATH}")
main()
