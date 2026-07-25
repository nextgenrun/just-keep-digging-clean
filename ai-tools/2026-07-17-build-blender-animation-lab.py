"""Build or initialize the non-destructive Dig Game Blender animation lab."""

from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import math
import sys
from pathlib import Path
from typing import Any

import bpy


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "values" / "blenderAnimationLab.json"


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--register-only", action="store_true")
    parser.add_argument("--validate-only", action="store_true")
    return parser.parse_args(argv)


def resolve(relative: str) -> Path:
    return (ROOT / relative).resolve()


def load_config(path: Path) -> dict[str, Any]:
    config = json.loads(path.read_text(encoding="utf-8"))
    carriers = config.get("carriers", [])
    if len(carriers) != 17:
        raise ValueError(f"Blender lab requires exactly 17 unique FBX carriers, found {len(carriers)}")
    runtime_actions = [name for carrier in carriers for name in carrier["runtimeActions"]]
    if len(runtime_actions) != 18 or len(set(runtime_actions)) != 18:
        raise ValueError("The 17 carriers must cover exactly 18 unique runtime action ids")
    return config


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_paths(config: dict[str, Any]) -> list[Path]:
    paths = config["paths"]
    carrier_root = resolve(paths["carrierRoot"])
    return [resolve(paths["sourceBlend"])] + [carrier_root / item["file"] for item in config["carriers"]]


def require_sources(config: dict[str, Any]) -> dict[str, str]:
    missing = [path for path in source_paths(config) if not path.is_file()]
    if missing:
        raise FileNotFoundError("Missing Blender lab sources: " + ", ".join(str(path) for path in missing))
    return {path.relative_to(ROOT).as_posix(): sha256(path) for path in source_paths(config)}


def register_addon(config: dict[str, Any]) -> bool:
    addon_root = resolve(config["paths"]["addonRoot"])
    module_name = str(config["paths"]["addonModule"])
    if not (addon_root / module_name / "__init__.py").is_file():
        print(f"DGAL_ADDON_PENDING path={addon_root / module_name}")
        return False
    if str(addon_root) not in sys.path:
        sys.path.insert(0, str(addon_root))
    module = importlib.import_module(module_name)
    if not hasattr(bpy.types.Scene, "dgal"):
        module.register()
    return hasattr(bpy.types.Scene, "dgal")


def ensure_collections(config: dict[str, Any]) -> None:
    scene_root = bpy.context.scene.collection
    for name in config["master"]["collections"]:
        collection = bpy.data.collections.get(name) or bpy.data.collections.new(name)
        if collection.name not in {child.name for child in scene_root.children}:
            scene_root.children.link(collection)


def configure_scene(config: dict[str, Any], addon_registered: bool) -> None:
    scene = bpy.context.scene
    paths = config["paths"]
    scene.render.fps = int(config["blender"]["fps"])
    scene["dgal_contract"] = str(config["id"])
    scene["dgal_review_only"] = True
    scene["dgal_source_preservation"] = "all source blends and FBX carriers are read-only"
    scene["dgal_repo_root"] = str(ROOT)
    scene["dgal_source_fbx_directory"] = str(resolve(paths["carrierRoot"]))
    scene["dgal_runtime_manifest_path"] = str(resolve(paths["runtimeManifest"]))
    scene["dgal_review_output_root"] = str(resolve(paths["reviewOutputRoot"]))
    scene["dgal_session_name"] = str(config["sessionName"])
    if not addon_registered:
        return
    state = getattr(scene, "dgal", None)
    if state is None:
        return
    values = {
        "repo_root": str(ROOT),
        "source_fbx_directory": str(resolve(paths["carrierRoot"])),
        "runtime_manifest_path": str(resolve(paths["runtimeManifest"])),
        "review_output_root": str(resolve(paths["reviewOutputRoot"])),
        "session_name": str(config["sessionName"]),
    }
    for name, value in values.items():
        if hasattr(state, name):
            setattr(state, name, value)
    module = importlib.import_module(str(paths["addonModule"]))
    canonical = bpy.data.objects.get(config["master"]["armatureObject"])
    active_action = canonical.animation_data.action if canonical and canonical.animation_data else None
    if canonical:
        state.active_rig = canonical
        state.reference_mesh = bpy.data.objects.get("Body3")
    if active_action:
        state.frame_start = math.floor(active_action.frame_range[0])
        state.frame_end = math.ceil(active_action.frame_range[1])
    module.stage.ensure_review_stage(scene)
    module.session_ops.initialize_contract_state(state)
    module.session_ops.refresh_catalog(state)


def normalize_image_paths() -> None:
    for image in bpy.data.images:
        if image.filepath and not image.packed_file:
            image.filepath = bpy.path.abspath(image.filepath)


def data_snapshot() -> dict[str, set[int]]:
    names = ("meshes", "armatures", "materials", "images", "textures", "node_groups")
    return {name: {item.as_pointer() for item in getattr(bpy.data, name)} for name in names}


def cleanup_import(snapshot: dict[str, set[int]], imported_objects: list[bpy.types.Object]) -> None:
    for obj in imported_objects:
        if obj.name in bpy.data.objects:
            bpy.data.objects.remove(obj, do_unlink=True)
    for name, pointers in snapshot.items():
        collection = getattr(bpy.data, name)
        for item in list(collection):
            if item.as_pointer() not in pointers and item.users == 0:
                collection.remove(item)


def consolidate_carrier(
    canonical: bpy.types.Object,
    carrier: dict[str, Any],
    carrier_root: Path,
    config: dict[str, Any],
) -> bpy.types.Action:
    before_objects = {obj.as_pointer() for obj in bpy.data.objects}
    before_actions = {action.as_pointer() for action in bpy.data.actions}
    snapshot = data_snapshot()
    source = carrier_root / carrier["file"]
    bpy.ops.import_scene.fbx(filepath=str(source), automatic_bone_orientation=False, use_anim=True)
    imported_objects = [obj for obj in bpy.data.objects if obj.as_pointer() not in before_objects]
    imported_armatures = [obj for obj in imported_objects if obj.type == "ARMATURE"]
    if len(imported_armatures) != 1:
        raise RuntimeError(f"{carrier['id']}: expected one imported armature, found {len(imported_armatures)}")
    source_rig = imported_armatures[0]
    source_action = source_rig.animation_data.action if source_rig.animation_data else None
    if source_action is None or source_action.as_pointer() in before_actions:
        raise RuntimeError(f"{carrier['id']}: imported FBX has no unique assigned action")
    required = set(config["master"]["requiredBones"])
    missing = sorted(required - {bone.name for bone in source_rig.data.bones})
    if missing:
        raise RuntimeError(f"{carrier['id']}: imported carrier is missing bones {missing}")

    action = source_action.copy()
    action.name = f"{config['master']['actionPrefix']}{carrier['id']}"
    action.use_fake_user = True
    action["dgal_managed"] = True
    action["dgal_carrier_id"] = carrier["id"]
    action["dgal_source_clip"] = carrier["sourceClip"]
    action["dgal_source_fbx"] = source.relative_to(ROOT).as_posix()
    action["dgal_runtime_actions"] = json.dumps(carrier["runtimeActions"])
    action["dgal_loop"] = bool(carrier["loop"])
    canonical.animation_data_create()
    canonical.animation_data.action = action
    canonical.animation_data.action_slot = action.slots[0]
    bpy.context.view_layer.update()
    canonical.animation_data.action = None

    imported_actions = [item for item in bpy.data.actions if item.as_pointer() not in before_actions and item != action]
    cleanup_import(snapshot, imported_objects)
    for imported in imported_actions:
        if imported.name in bpy.data.actions and imported.users == 0:
            bpy.data.actions.remove(imported)
    print(f"DGAL_CARRIER_OK id={carrier['id']} range={tuple(round(v, 3) for v in action.frame_range)}")
    return action


def validate_master(config: dict[str, Any]) -> tuple[bpy.types.Object, list[bpy.types.Action]]:
    master = config["master"]
    canonical = bpy.data.objects.get(master["armatureObject"])
    if canonical is None or canonical.type != "ARMATURE":
        raise RuntimeError(f"Canonical armature is missing: {master['armatureObject']}")
    missing_meshes = [name for name in master["meshObjects"] if bpy.data.objects.get(name) is None]
    missing_bones = [name for name in master["requiredBones"] if canonical.data.bones.get(name) is None]
    if missing_meshes or missing_bones:
        raise RuntimeError(f"Master validation failed meshes={missing_meshes} bones={missing_bones}")
    expected = {f"{master['actionPrefix']}{item['id']}" for item in config["carriers"]}
    actions = [action for action in bpy.data.actions if bool(action.get("dgal_managed"))]
    actual = {action.name for action in actions}
    if actual != expected:
        raise RuntimeError(f"Master action mismatch missing={sorted(expected-actual)} extra={sorted(actual-expected)}")
    return canonical, sorted(actions, key=lambda item: item.name)


def write_report(config: dict[str, Any], hashes: dict[str, str], actions: list[bpy.types.Action]) -> None:
    paths = config["paths"]
    report_path = resolve(paths["buildReport"])
    output_path = resolve(paths["outputBlend"])
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "version": 1,
        "id": config["id"],
        "blenderVersion": list(bpy.app.version),
        "outputBlend": output_path.relative_to(ROOT).as_posix(),
        "sourceHashes": hashes,
        "sourcesPreserved": hashes == require_sources(config),
        "carrierCount": len(config["carriers"]),
        "runtimeActionCount": len({name for item in config["carriers"] for name in item["runtimeActions"]}),
        "masterActionCount": len(actions),
        "actions": [{"name": item.name, "frameRange": list(item.frame_range)} for item in actions],
        "canonicalArmature": config["master"]["armatureObject"],
        "productionChanged": False,
    }
    if not report["sourcesPreserved"]:
        raise RuntimeError("A Blender lab source changed while building")
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"DGAL_REPORT_OK path={report_path}")


def build(config: dict[str, Any]) -> None:
    hashes = require_sources(config)
    source_blend = resolve(config["paths"]["sourceBlend"])
    output = resolve(config["paths"]["outputBlend"])
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.open_mainfile(filepath=str(source_blend))
    normalize_image_paths()
    canonical = bpy.data.objects.get(config["master"]["armatureObject"])
    if canonical is None or canonical.type != "ARMATURE":
        raise RuntimeError("Approved Survival source has no canonical armature")
    carrier_root = resolve(config["paths"]["carrierRoot"])
    for carrier in config["carriers"]:
        consolidate_carrier(canonical, carrier, carrier_root, config)
    addon_registered = register_addon(config)
    ensure_collections(config)
    canonical, actions = validate_master(config)
    default_action = bpy.data.actions[f"{config['master']['actionPrefix']}{config['master']['defaultAction']}"]
    canonical.animation_data_create()
    canonical.animation_data.action = default_action
    canonical.animation_data.action_slot = default_action.slots[0]
    bpy.context.scene.frame_start = math.floor(default_action.frame_range[0])
    bpy.context.scene.frame_end = math.ceil(default_action.frame_range[1])
    bpy.context.scene.frame_set(bpy.context.scene.frame_start)
    configure_scene(config, addon_registered)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), check_existing=False)
    bpy.ops.wm.open_mainfile(filepath=str(output))
    _canonical, actions = validate_master(config)
    write_report(config, hashes, actions)
    print(f"DGAL_BUILD_OK carriers={len(actions)} output={output}")


def main() -> None:
    args = parse_args()
    config = load_config(Path(args.config).resolve())
    minimum = tuple(config["blender"]["minimumVersion"])
    if tuple(bpy.app.version) < minimum:
        raise RuntimeError(f"Blender {minimum} or newer is required")
    if args.register_only:
        registered = register_addon(config)
        ensure_collections(config)
        configure_scene(config, registered)
        validate_master(config)
        print(f"DGAL_REGISTER_OK addon={registered}")
    elif args.validate_only:
        _canonical, actions = validate_master(config)
        print(f"DGAL_VALIDATE_OK actions={len(actions)}")
    else:
        build(config)


if __name__ == "__main__":
    main()
