#!/usr/bin/env python3
"""Normalize a GLB and bake deterministic 2D scenic passes in Blender."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import bpy
from mathutils import Vector


def _args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-glb", required=True)
    parser.add_argument("--asset-manifest", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--profile", required=True)
    return parser.parse_args(argv)


def _read_json(path: Path) -> dict:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Cannot read JSON {path}: {error}") from None
    if not isinstance(value, dict):
        raise RuntimeError(f"JSON root must be an object: {path}")
    return value


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _validate(source: Path, manifest: dict, profile: dict) -> tuple[str, str, float]:
    if not source.is_file() or source.suffix.lower() != ".glb":
        raise RuntimeError("--source-glb must point to an existing GLB file")
    asset_id = manifest.get("assetId")
    if not isinstance(asset_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]*", asset_id):
        raise RuntimeError("assetId must be a filesystem-safe identifier")
    dimensions = [(name, manifest.get(name)) for name in ("heightTiles", "widthTiles") if name in manifest]
    if len(dimensions) != 1:
        raise RuntimeError("Asset manifest must define exactly one of heightTiles or widthTiles")
    dimension, target = dimensions[0]
    if not isinstance(target, (int, float)) or target <= 0:
        raise RuntimeError(f"{dimension} must be a positive number")
    if profile.get("tileSizePx") != 94:
        raise RuntimeError("This pipeline requires the shared 94 px per world unit contract")
    reference = profile.get("referenceViewport", {})
    camera = profile.get("camera", {})
    expected_height = reference.get("heightPx", 0) / 94
    if abs(float(camera.get("orthoHeightWorldUnits", 0)) - expected_height) > 1e-9:
        raise RuntimeError("Bake profile orthographic height does not match viewportHeight / 94")
    return asset_id, dimension, float(target)


def _clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def _bounds(objects: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == "MESH" for corner in obj.bound_box]
    if not points:
        raise RuntimeError("Imported GLB contains no mesh geometry")
    minimum = Vector(tuple(min(point[index] for point in points) for index in range(3)))
    maximum = Vector(tuple(max(point[index] for point in points) for index in range(3)))
    return minimum, maximum


def _import_and_normalize(source: Path, manifest: dict, dimension: str, target: float) -> tuple[list, dict]:
    before = {obj.name for obj in bpy.context.scene.objects}
    bpy.ops.import_scene.gltf(filepath=str(source))
    imported = [obj for obj in bpy.context.scene.objects if obj.name not in before]
    imported_ids = {obj.as_pointer() for obj in imported}
    root = bpy.data.objects.new("SCENIC_BAKE_ROOT", None)
    bpy.context.scene.collection.objects.link(root)
    for obj in imported:
        if obj.parent is None or obj.parent.as_pointer() not in imported_ids:
            world = obj.matrix_world.copy()
            obj.parent = root
            obj.matrix_world = world
    rotations = {"-Y": 0.0, "+Y": math.pi, "+X": -math.pi / 2, "-X": math.pi / 2}
    front_axis = manifest.get("frontAxis", "-Y")
    if front_axis not in rotations:
        raise RuntimeError("frontAxis must be one of -Y, +Y, -X, +X")
    root.rotation_euler[2] = rotations[front_axis]
    bpy.context.view_layer.update()
    minimum, maximum = _bounds(imported)
    axis = 2 if dimension == "heightTiles" else 0
    current = maximum[axis] - minimum[axis]
    if current <= 1e-8:
        raise RuntimeError(f"Imported geometry has no usable {dimension} extent")
    scale = target / current
    root.scale = (scale, scale, scale)
    bpy.context.view_layer.update()
    minimum, maximum = _bounds(imported)
    center = (minimum + maximum) * 0.5
    root.location += Vector((-center.x, -center.y, -minimum.z))
    bpy.context.view_layer.update()
    minimum, maximum = _bounds(imported)
    return imported, {
        "frontAxis": front_axis,
        "uniformScale": scale,
        "minimum": list(minimum),
        "maximum": list(maximum),
        "widthWorldUnits": maximum.x - minimum.x,
        "depthWorldUnits": maximum.y - minimum.y,
        "heightWorldUnits": maximum.z - minimum.z,
    }


def _look_at(obj: bpy.types.Object, point: Vector) -> None:
    obj.rotation_euler = (point - obj.location).to_track_quat("-Z", "Y").to_euler()


def _add_area(name: str, location: tuple, energy: float, size: float, color: tuple) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    _look_at(obj, Vector((0, 0, 1.5)))


def _configure_scene(profile: dict) -> bpy.types.Scene:
    scene = bpy.context.scene
    render = profile["render"]
    master = profile["masterViewport"]
    camera_profile = profile["camera"]
    scene.render.engine = render["engine"]
    scene.render.resolution_x = int(master["widthPx"])
    scene.render.resolution_y = int(master["heightPx"])
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = render["colorDepth"]
    scene.render.film_transparent = bool(render["filmTransparent"])
    scene.render.use_file_extension = True
    scene.render.fps = 24
    scene.view_settings.view_transform = render["viewTransform"]
    scene.view_settings.look = render["look"]
    camera_data = bpy.data.cameras.new("SCENIC_ORTHO_CAMERA")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = float(camera_profile["orthoHeightWorldUnits"])
    camera_data.clip_start = float(camera_profile["clipStart"])
    camera_data.clip_end = float(camera_profile["clipEnd"])
    camera = bpy.data.objects.new("SCENIC_ORTHO_CAMERA", camera_data)
    scene.collection.objects.link(camera)
    camera.location = camera_profile["location"]
    _look_at(camera, Vector(camera_profile["target"]))
    scene.camera = camera
    world = bpy.data.worlds.new("SCENIC_BAKE_WORLD")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.012, 0.02, 0.035, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18
    scene.world = world
    _add_area("Key", (-5, -6, 7), 900, 5, (0.72, 0.84, 1.0))
    _add_area("Fill", (5, -3, 3), 420, 4, (1.0, 0.62, 0.33))
    _add_area("Rim", (0, 4, 6), 750, 3, (0.30, 0.54, 1.0))
    return scene


def _output_node(tree, output_dir: Path, prefix: str, color_mode: str = "RGB", non_color: bool = False):
    node = tree.nodes.new("CompositorNodeOutputFile")
    node.directory = str(output_dir)
    node.file_name = prefix + "-####"
    node.format.media_type = "IMAGE"
    node.format.file_format = "PNG"
    node.format.color_mode = color_mode
    node.format.color_depth = "16"
    if non_color:
        node.format.color_management = "OVERRIDE"
        node.format.linear_colorspace_settings.name = "Non-Color"
    node.file_output_items.new("RGBA", "Image")
    return node


def _constant(tree, value: tuple):
    node = tree.nodes.new("CompositorNodeRGB")
    node.outputs[0].default_value = value
    return node.outputs[0]


def _setup_passes(scene: bpy.types.Scene, output_dir: Path, asset_id: str) -> list[str]:
    layer = scene.view_layers[0]
    pass_properties = {
        "use_pass_z": True,
        "use_pass_normal": True,
        "use_pass_diffuse_color": True,
        "use_pass_ambient_occlusion": True,
        "use_pass_emit": True,
    }
    for name, value in pass_properties.items():
        if hasattr(layer, name):
            setattr(layer, name, value)
    tree = bpy.data.node_groups.new("SCENIC_BAKE_COMPOSITOR", "CompositorNodeTree")
    scene.compositing_node_group = tree
    scene.use_nodes = True
    tree.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    source = tree.nodes.new("CompositorNodeRLayers")
    group_output = tree.nodes.new("NodeGroupOutput")
    tree.links.new(source.outputs["Image"], group_output.inputs["Image"])
    fallback_passes = []
    tree.links.new(source.outputs["Image"], _output_node(tree, output_dir, f"{asset_id}-beauty", "RGBA").inputs[0])
    alpha = source.outputs.get("Alpha") or _constant(tree, (1, 1, 1, 1))
    albedo = source.outputs.get("Diffuse Color") or source.outputs.get("DiffCol")
    if not albedo:
        raise RuntimeError("Blender did not expose a real diffuse-color pass; refusing a beauty-backed albedo")
    set_alpha = tree.nodes.new("CompositorNodeSetAlpha")
    tree.links.new(albedo, set_alpha.inputs["Image"])
    tree.links.new(alpha, set_alpha.inputs["Alpha"])
    albedo = set_alpha.outputs["Image"]
    tree.links.new(albedo, _output_node(tree, output_dir, f"{asset_id}-albedo", "RGBA").inputs[0])
    normal = source.outputs.get("Normal")
    if normal:
        multiply = tree.nodes.new("ShaderNodeVectorMath")
        multiply.operation = "MULTIPLY"
        multiply.inputs[1].default_value = (0.5, 0.5, 0.5)
        add = tree.nodes.new("ShaderNodeVectorMath")
        add.operation = "ADD"
        add.inputs[1].default_value = (0.5, 0.5, 0.5)
        tree.links.new(normal, multiply.inputs[0])
        tree.links.new(multiply.outputs[0], add.inputs[0])
        normal = add.outputs[0]
    else:
        raise RuntimeError("Blender did not expose a normal pass")
    tree.links.new(normal, _output_node(tree, output_dir, f"{asset_id}-normal", non_color=True).inputs[0])
    depth = source.outputs.get("Depth")
    if depth:
        normalize = tree.nodes.new("CompositorNodeNormalize")
        tree.links.new(depth, normalize.inputs[0])
        depth = normalize.outputs[0]
    else:
        raise RuntimeError("Blender did not expose a depth pass")
    tree.links.new(depth, _output_node(tree, output_dir, f"{asset_id}-depth", non_color=True).inputs[0])
    for pass_name, socket_names, fallback in (
        ("ao", ("Ambient Occlusion", "AO"), (1, 1, 1, 1)),
        ("emissive", ("Emission", "Emit"), (0, 0, 0, 1)),
    ):
        socket = next((source.outputs.get(name) for name in socket_names if source.outputs.get(name)), None)
        if not socket:
            socket = _constant(tree, fallback)
            fallback_passes.append(pass_name)
        tree.links.new(
            socket,
            _output_node(tree, output_dir, f"{asset_id}-{pass_name}", non_color=pass_name == "ao").inputs[0],
        )
    return fallback_passes


def _solid_fallback(scene: bpy.types.Scene, path: Path, color: tuple) -> None:
    image = bpy.data.images.new(
        "SCENIC_PASS_FALLBACK",
        width=scene.render.resolution_x,
        height=scene.render.resolution_y,
        alpha=True,
    )
    image.generated_color = color
    image.file_format = "PNG"
    image.save_render(str(path), scene=scene)
    bpy.data.images.remove(image)


def _settle_outputs(scene: bpy.types.Scene, output_dir: Path, asset_id: str) -> tuple[list[Path], list[str]]:
    paths = []
    generated_fallbacks = []
    for pass_name in ("beauty", "albedo", "normal", "depth", "ao", "emissive"):
        matches = sorted(output_dir.glob(f"{asset_id}-{pass_name}-*.png"))
        if not matches:
            fallback_colors = {"ao": (1, 1, 1, 1), "emissive": (0, 0, 0, 0)}
            if pass_name not in fallback_colors:
                raise RuntimeError(f"Blender did not emit the {pass_name} pass")
            target = output_dir / f"{asset_id}-{pass_name}.png"
            _solid_fallback(scene, target, fallback_colors[pass_name])
            paths.append(target)
            generated_fallbacks.append(pass_name)
            continue
        target = output_dir / f"{asset_id}-{pass_name}.png"
        if target.exists():
            target.unlink()
        matches[-1].replace(target)
        for stale in matches[:-1]:
            stale.unlink()
        paths.append(target)
    return paths, generated_fallbacks


def _audit_provenance(source: Path, manifest: dict, manifest_path: Path) -> tuple[dict, list[str]]:
    actual_hash = _sha256(source)
    audit = {"actualGlbSha256": actual_hash, "status": "blocked"}
    blockers = []
    provenance_value = manifest.get("provenancePath")
    if not isinstance(provenance_value, str) or not provenance_value.strip():
        return audit, ["provenancePath is missing from the asset manifest"]
    provenance_path = (manifest_path.parent / provenance_value).resolve()
    audit["path"] = provenance_value
    try:
        provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return audit, ["provenance record is missing or invalid JSON"]
    if not isinstance(provenance, dict):
        return audit, ["provenance record root is not an object"]
    provider = str(provenance.get("provider", ""))
    task_id = provenance.get("taskId")
    audit.update({"provider": provider, "taskId": task_id, "licenseId": provenance.get("licenseId")})
    records = provenance.get("files")
    record = next(
        (
            item
            for item in records if isinstance(item, dict) and Path(str(item.get("path", ""))).name == source.name
        ),
        None,
    ) if isinstance(records, list) else None
    if not record or not isinstance(record.get("sha256"), str):
        blockers.append("provenance does not contain a SHA-256 record for the source GLB")
    elif record["sha256"].lower() != actual_hash.lower():
        blockers.append("source GLB SHA-256 does not match provenance")
    if str(provenance.get("licenseStatus", "")).lower() != "reviewed":
        blockers.append("source license is not human-reviewed")
    license_id = str(provenance.get("licenseId", ""))
    if not license_id or license_id.upper() == "UNVERIFIED":
        blockers.append("source license identifier is unverified")
    if manifest.get("licenseId") != provenance.get("licenseId"):
        blockers.append("asset manifest licenseId does not match provenance")
    if provider.lower() == "meshy":
        expected_task = manifest.get("sourceTaskId")
        if not isinstance(expected_task, str) or not expected_task.strip():
            blockers.append("Meshy asset manifest sourceTaskId is missing")
        elif expected_task != task_id:
            blockers.append("Meshy sourceTaskId does not match provenance")
    elif not provenance.get("sourceAssetId") and not provenance.get("sourcePageUrl"):
        blockers.append("non-Meshy provenance lacks a stable source identity")
    audit["status"] = "verified" if not blockers else "blocked"
    return audit, blockers


def _promotion(profile: dict, fallback_passes: list[str], provenance_blockers: list[str]) -> dict:
    optional = profile.get("promotionRules", {}).get("optionalNeutralPasses", [])
    allowed = set(optional) if isinstance(optional, list) else set()
    invalid_allowed = sorted(allowed - {"ao", "emissive"})
    blockers = list(provenance_blockers)
    if invalid_allowed:
        blockers.append(f"profile lists invalid optional neutral passes: {', '.join(invalid_allowed)}")
    required_fallbacks = sorted(set(fallback_passes) - allowed)
    if required_fallbacks:
        blockers.append(f"required passes used neutral fallbacks: {', '.join(required_fallbacks)}")
    return {
        "ready": not blockers,
        "blockers": blockers,
        "optionalNeutralPasses": sorted(allowed),
    }


def main() -> None:
    args = _args()
    source = Path(args.source_glb).resolve()
    manifest_path = Path(args.asset_manifest).resolve()
    profile_path = Path(args.profile).resolve()
    output_dir = Path(args.output_dir).resolve()
    manifest = _read_json(manifest_path)
    profile = _read_json(profile_path)
    asset_id, dimension, target = _validate(source, manifest, profile)
    provenance_audit, provenance_blockers = _audit_provenance(source, manifest, manifest_path)
    output_dir.mkdir(parents=True, exist_ok=True)
    _clear_scene()
    imported, normalized = _import_and_normalize(source, manifest, dimension, target)
    scene = _configure_scene(profile)
    fallback_passes = _setup_passes(scene, output_dir, asset_id)
    bpy.ops.wm.save_as_mainfile(filepath=str(output_dir / f"{asset_id}-bake.blend"))
    bpy.ops.render.render(write_still=False)
    outputs, generated_fallbacks = _settle_outputs(scene, output_dir, asset_id)
    fallback_passes = sorted(set(fallback_passes + generated_fallbacks))
    promotion = _promotion(profile, fallback_passes, provenance_blockers)
    non_color_passes = {"normal", "depth", "ao"}
    _ = imported
    bake_manifest = {
        "schemaVersion": 1,
        "assetId": asset_id,
        "bakedAtUtc": datetime.now(timezone.utc).isoformat(),
        "profileId": profile["profileId"],
        "tileSizePx": profile["tileSizePx"],
        "masterViewport": profile["masterViewport"],
        "scaleTarget": {dimension: target},
        "normalizedBounds": normalized,
        "source": {"path": source.name, "sha256": _sha256(source)},
        "assetManifestSha256": _sha256(manifest_path),
        "profileSha256": _sha256(profile_path),
        "licenseId": manifest.get("licenseId", "UNVERIFIED"),
        "provenancePath": manifest.get("provenancePath"),
        "fallbackPasses": fallback_passes,
        "provenanceAudit": provenance_audit,
        "promotion": promotion,
        "outputs": [
            {
                "path": path.name,
                "pass": path.stem.removeprefix(f"{asset_id}-"),
                "source": "neutral-fallback" if path.stem.removeprefix(f"{asset_id}-") in fallback_passes else "render-pass",
                "colorSpace": "Non-Color"
                if path.stem.removeprefix(f"{asset_id}-") in non_color_passes
                else f"scene:{profile['render']['viewTransform']}",
                "bytes": path.stat().st_size,
                "sha256": _sha256(path),
            }
            for path in outputs
        ],
    }
    (output_dir / "bake-manifest.json").write_text(
        json.dumps(bake_manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8"
    )
    print(f"Baked {asset_id} with {profile['profileId']} into {output_dir}")


if __name__ == "__main__":
    main()
