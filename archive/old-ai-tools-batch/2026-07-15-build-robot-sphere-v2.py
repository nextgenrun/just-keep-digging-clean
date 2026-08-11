"""Build real 3D-rendered Robot Sphere animation strips for tanktest-v1."""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "sprites" / "character" / "robot-sphere-v2"
FRAME_ROOT = ASSET_ROOT / "blender" / "frames"
RUNTIME_ROOT = ASSET_ROOT / "runtime"
PREVIEW_ROOT = ASSET_ROOT / "previews"
BLEND_PATH = ASSET_ROOT / "blender" / "robot-sphere-v2.blend"
BLENDER = Path(r"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe")
FRAME_SIZE = 192
CLIPS = {
    "idle": (16, 18),
    "roll": (16, 20),
    "fly": (16, 18),
    "dig-side": (18, 22),
    "dig-up": (18, 22),
    "dig-down": (18, 22),
}


def smoothstep(a: float, b: float, value: float) -> float:
    t = max(0.0, min(1.0, (value - a) / max(0.0001, b - a)))
    return t * t * (3.0 - 2.0 * t)


def run_blender_build() -> None:
    if not BLENDER.exists():
        raise FileNotFoundError(f"Blender not found: {BLENDER}")
    FRAME_ROOT.mkdir(parents=True, exist_ok=True)
    command = [str(BLENDER), "--background", "--python", str(Path(__file__).resolve())]
    subprocess.run(command, cwd=ROOT, check=True)
    if not (FRAME_ROOT / "idle" / "000.png").exists():
        raise RuntimeError("Blender exited without rendering Robot Sphere frames")


def stitch_sheets() -> None:
    from PIL import Image, ImageDraw

    RUNTIME_ROOT.mkdir(parents=True, exist_ok=True)
    PREVIEW_ROOT.mkdir(parents=True, exist_ok=True)
    manifest = {"frameWidth": FRAME_SIZE, "frameHeight": FRAME_SIZE, "clips": {}}
    samples = []
    for clip, (frame_count, fps) in CLIPS.items():
        frames = [Image.open(FRAME_ROOT / clip / f"{index:03d}.png").convert("RGBA") for index in range(frame_count)]
        sheet = Image.new("RGBA", (FRAME_SIZE * frame_count, FRAME_SIZE), (0, 0, 0, 0))
        for index, frame in enumerate(frames):
            sheet.alpha_composite(frame, (index * FRAME_SIZE, 0))
        filename = f"robot-sphere-v2-{clip}-sheet.png"
        sheet.save(RUNTIME_ROOT / filename, optimize=True)
        manifest["clips"][clip] = {"file": filename, "frames": frame_count, "fps": fps}
        samples.append((clip, frames[frame_count // 2]))

    card = Image.new("RGB", (FRAME_SIZE * 3, FRAME_SIZE * 2), (13, 20, 25))
    draw = ImageDraw.Draw(card)
    for index, (clip, sample) in enumerate(samples):
        x = index % 3 * FRAME_SIZE
        y = index // 3 * FRAME_SIZE
        card.paste(sample, (x, y), sample)
        draw.rectangle((x + 5, y + 5, x + 78, y + 25), fill=(5, 9, 12))
        draw.text((x + 10, y + 9), clip.upper(), fill=(154, 235, 255))
    card.save(PREVIEW_ROOT / "robot-sphere-v2-motion-contact-sheet.png", quality=95)
    (ASSET_ROOT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    shutil.rmtree(FRAME_ROOT, ignore_errors=True)


def blender_render() -> None:
    import bpy
    from mathutils import Vector

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    def material(name, color, metallic=0.0, roughness=0.45, emission=None, strength=0.0):
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (*color, 1.0)
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if emission:
            emission_input = bsdf.inputs.get("Emission Color") or bsdf.inputs.get("Emission")
            if emission_input:
                emission_input.default_value = (*emission, 1.0)
            strength_input = bsdf.inputs.get("Emission Strength")
            if strength_input:
                strength_input.default_value = strength
        return mat

    dark = material("Battle-worn gunmetal", (0.045, 0.055, 0.065), 0.92, 0.22)
    steel = material("Brushed steel", (0.16, 0.19, 0.22), 0.86, 0.28)
    orange = material("Safety orange", (0.56, 0.12, 0.015), 0.76, 0.26)
    black = material("Face glass", (0.004, 0.012, 0.018), 0.35, 0.08)
    cyan = material("Cyan energy", (0.01, 0.22, 0.32), 0.12, 0.2, (0.03, 0.75, 1.0), 10.0)
    blue = material("Blue plasma", (0.01, 0.08, 0.2), 0.05, 0.22, (0.06, 0.35, 1.0), 5.0)

    def empty(name, parent=None):
        obj = bpy.data.objects.new(name, None)
        bpy.context.collection.objects.link(obj)
        obj.parent = parent
        return obj

    def smooth(obj):
        if obj.type == "MESH":
            for poly in obj.data.polygons:
                poly.use_smooth = True
        return obj

    def uv_sphere(name, location, scale, mat, parent=None):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48, ring_count=24, location=location)
        obj = bpy.context.object
        obj.name = name
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        obj.data.materials.append(mat)
        obj.parent = parent
        return smooth(obj)

    def rounded_cube(name, location, scale, mat, bevel=0.12, parent=None):
        bpy.ops.mesh.primitive_cube_add(location=location)
        obj = bpy.context.object
        obj.name = name
        obj.scale = scale
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        modifier = obj.modifiers.new("Soft machined edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 4
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.data.materials.append(mat)
        obj.parent = parent
        return obj

    root = empty("Robot motion root")
    shell_root = empty("Rolling shell", root)
    outer = uv_sphere("Outer armored shell", (0, 0, 0), (0.98, 0.82, 0.98), dark, shell_root)
    inner = uv_sphere("Energy core", (0, -0.24, 0), (0.62, 0.56, 0.62), cyan, root)
    left_panel = uv_sphere("Left orange panel", (-0.79, -0.08, 0), (0.34, 0.7, 0.72), orange, shell_root)
    right_panel = uv_sphere("Right orange panel", (0.79, -0.08, 0), (0.34, 0.7, 0.72), orange, shell_root)
    face = rounded_cube("Gimballed face screen", (0, -0.79, 0.2), (0.52, 0.09, 0.28), black, 0.15, root)
    left_eye = rounded_cube("Left eye", (-0.18, -0.9, 0.21), (0.055, 0.035, 0.12), cyan, 0.055, root)
    right_eye = rounded_cube("Right eye", (0.18, -0.9, 0.21), (0.055, 0.035, 0.12), cyan, 0.055, root)

    for angle in (0.0, math.pi / 2.0):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.88, minor_radius=0.025, major_segments=64, minor_segments=10)
        ring = bpy.context.object
        ring.name = "Shell seam"
        ring.rotation_euler = (math.pi / 2.0, angle, 0)
        ring.data.materials.append(steel)
        ring.parent = shell_root

    thruster = empty("Thruster", root)
    bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.08, radius2=0.24, depth=0.9, location=(0, 0, -1.14))
    plume = smooth(bpy.context.object)
    plume.name = "Plasma plume"
    plume.data.materials.append(blue)
    plume.parent = thruster
    thruster_parts = [plume]

    drill_orient = empty("Drill aim", root)
    drill_spin = empty("Drill spin", drill_orient)
    drill_parts = []
    for index in range(4):
        bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.31 - index * 0.055, radius2=0.24 - index * 0.055, depth=0.34)
        segment = smooth(bpy.context.object)
        segment.name = f"Drill segment {index + 1}"
        segment.location.z = 0.76 + index * 0.29
        segment.data.materials.append(steel if index % 2 == 0 else orange)
        segment.parent = drill_spin
        drill_parts.append(segment)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.27 - index * 0.05, minor_radius=0.025, major_segments=32, minor_segments=8)
        glow_ring = bpy.context.object
        glow_ring.name = f"Drill glow {index + 1}"
        glow_ring.location.z = 0.62 + index * 0.29
        glow_ring.data.materials.append(blue)
        glow_ring.parent = drill_spin
        drill_parts.append(glow_ring)
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=0.12, radius2=0.0, depth=0.44)
    tip = smooth(bpy.context.object)
    tip.name = "Drill tip"
    tip.location.z = 1.82
    tip.data.materials.append(blue)
    tip.parent = drill_spin
    drill_parts.append(tip)

    bpy.ops.object.camera_add(location=(0, -8.2, 0.35))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 4.6
    direction = Vector((0, 0, 0.05)) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.camera = camera

    for name, location, energy, color, size in (
        ("Key", (-4.5, -4.5, 6.0), 900, (0.52, 0.78, 1.0), 4.0),
        ("Warm fill", (4.0, -2.5, 3.5), 720, (1.0, 0.28, 0.08), 3.0),
        ("Rim", (0.0, 3.0, 5.0), 1100, (0.18, 0.55, 1.0), 3.0),
    ):
        bpy.ops.object.light_add(type="AREA", location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = color
        light.data.shape = "DISK"
        light.data.size = size
        light.rotation_euler = (Vector((0, 0, 0)) - light.location).to_track_quat("-Z", "Y").to_euler()

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.world.color = (0.006, 0.009, 0.012)
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    def reset_pose():
        root.location = (0, 0, 0)
        root.rotation_euler = (0, 0, 0)
        shell_root.location = (0, 0, 0)
        shell_root.rotation_euler = (0, 0, 0)
        left_panel.location = (-0.79, -0.08, 0)
        right_panel.location = (0.79, -0.08, 0)
        left_panel.rotation_euler = (0, 0, 0)
        right_panel.rotation_euler = (0, 0, 0)
        left_eye.scale = (1, 1, 1)
        right_eye.scale = (1, 1, 1)
        for part in thruster_parts + drill_parts:
            part.hide_render = True
        drill_orient.scale = (1, 1, 0.04)
        drill_orient.rotation_euler = (0, 0, 0)
        drill_spin.rotation_euler = (0, 0, 0)

    def pose(clip, t):
        reset_pose()
        phase = math.tau * t
        blink = 0.18 if 0.46 < t < 0.52 else 1.0
        left_eye.scale.z = blink
        right_eye.scale.z = blink
        if clip == "idle":
            root.location.z = math.sin(phase) * 0.055
            shell_root.rotation_euler.z = math.sin(phase) * 0.035
        elif clip == "roll":
            root.location.z = abs(math.sin(phase)) * 0.035
            shell_root.rotation_euler.y = -phase
            face.rotation_euler.z = math.sin(phase) * 0.025
        elif clip == "fly":
            root.location.z = math.sin(phase) * 0.085
            left_panel.location.x = -1.08 - math.sin(phase) * 0.035
            right_panel.location.x = 1.08 + math.sin(phase) * 0.035
            left_panel.rotation_euler.y = -0.38
            right_panel.rotation_euler.y = 0.38
            for part in thruster_parts:
                part.hide_render = False
            thruster.scale.z = 0.75 + math.sin(phase * 2.0) * 0.18
        else:
            deploy = smoothstep(0.04, 0.28, t) * (1.0 - smoothstep(0.78, 0.98, t))
            contact = smoothstep(0.2, 0.38, t)
            root.location.x = -0.075 * contact if clip == "dig-side" else math.sin(phase * 2.0) * 0.015 * contact
            root.location.z = 0.025 * math.sin(phase * 3.0) * contact
            left_panel.location.x = -1.07
            right_panel.location.x = 1.07
            left_panel.rotation_euler.y = -0.34
            right_panel.rotation_euler.y = 0.34
            for part in drill_parts:
                part.hide_render = False
            drill_orient.scale = (1, 1, max(0.04, deploy))
            if clip == "dig-side":
                drill_orient.rotation_euler.y = math.pi / 2.0
            elif clip == "dig-down":
                drill_orient.rotation_euler.x = math.pi
            drill_spin.rotation_euler.z = phase * 8.0

    for clip, (frame_count, _fps) in CLIPS.items():
        clip_dir = FRAME_ROOT / clip
        clip_dir.mkdir(parents=True, exist_ok=True)
        for index in range(frame_count):
            t = index / (frame_count if clip in {"idle", "roll", "fly"} else frame_count - 1)
            pose(clip, t)
            scene.render.filepath = str(clip_dir / f"{index:03d}.png")
            bpy.ops.render.render(write_still=True)

    reset_pose()
    BLEND_PATH.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))


if __name__ == "__main__":
    try:
        import bpy  # noqa: F401
    except ImportError:
        run_blender_build()
        stitch_sheets()
        print(f"Built Robot Sphere V2 animation assets in {ASSET_ROOT}")
    else:
        blender_render()
