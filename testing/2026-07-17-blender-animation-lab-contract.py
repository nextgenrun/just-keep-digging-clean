"""Validate the Blender animation lab's isolated, reproducible build contract."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = ROOT / "values" / "blenderAnimationLab.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", default=str(DEFAULT_CONFIG))
    parser.add_argument("--require-build", action="store_true")
    return parser.parse_args()


def resolve(value: str) -> Path:
    return (ROOT / value).resolve()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def load(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_config(config: dict[str, Any]) -> list[Path]:
    require(config["version"] == 1, "config version must be 1")
    require(config["status"] == "review-only", "lab must remain review-only")
    carriers = config["carriers"]
    require(len(carriers) == 17, "lab must consolidate exactly 17 FBX carriers")
    ids = [item["id"] for item in carriers]
    files = [item["file"] for item in carriers]
    runtime_actions = [action for item in carriers for action in item["runtimeActions"]]
    require(len(ids) == len(set(ids)), "carrier ids must be unique")
    require(len(files) == len(set(files)), "carrier files must be unique")
    require(len(runtime_actions) == 18, "17 carriers must map to 18 runtime actions")
    require(len(runtime_actions) == len(set(runtime_actions)), "runtime action aliases must be unique")
    require(config["master"]["defaultAction"] in ids, "default action must name a carrier")
    require(config["master"]["actionPrefix"] == "DGAL_", "lab action prefix drifted")

    browser = config.get("animationBrowser")
    require(isinstance(browser, dict), "animation browser presentation must be values-owned")
    categories = browser.get("categories", [])
    browser_actions = [action for category in categories for action in category.get("actions", [])]
    require(sorted(browser_actions) == sorted(runtime_actions), "animation browser must expose every runtime action exactly once")
    labels = browser.get("displayNames", {})
    require(all(labels.get(action) for action in runtime_actions), "every animation needs a readable browser name")

    arm_tween = config.get("armTween")
    require(isinstance(arm_tween, dict), "whole-arm tween controls must be values-owned")
    chains = arm_tween.get("chains", [])
    chain_ids = [item.get("id") for item in chains if isinstance(item, dict)]
    require(chain_ids == ["LEFT", "RIGHT"], "whole-arm tween must expose left and right arm chains")
    require(arm_tween.get("defaultSide") in chain_ids, "whole-arm tween default side is invalid")
    require(arm_tween.get("minimumSpanFrames") == 1, "whole-arm tween must allow adjacent-frame poses")
    require(arm_tween.get("interpolation") == "BEZIER", "whole-arm tween must build smooth source motion")
    require(arm_tween.get("bakedInterpolation") == "LINEAR", "whole-arm tween bake must preserve sampled frames")
    for chain in chains:
        require(
            isinstance(chain, dict) and len(chain.get("semanticBones", [])) == 4 and chain.get("activeSemanticBone"),
            "each whole-arm tween chain must include shoulder through hand",
        )
    required_arm_labels = {"section", "start", "end", "editStart", "saveStart", "editEnd", "saveEnd", "generate"}
    require(required_arm_labels.issubset(arm_tween.get("labels", {})), "whole-arm tween labels are incomplete")

    render = config["renderContract"]
    body = config["hitboxContract"]["playerBodyPx"]
    require(render["targetVisibleHeightTiles"] == 0.8, "visible-height target must remain 0.8 tile")
    require(render["tileSizePx"] == 94, "lab grid must match the 94px game tile")
    require(body == {"width": 31, "height": 75}, "lab body must begin from the 31x75 collider")
    require(config["poseInterpolation"]["bezierHandleType"] == "AUTO_CLAMPED", "Bezier interpolation must avoid overshoot")
    require(config["poseInterpolation"]["poseSlots"] == ["start", "anticipation", "contact", "recovery", "end"], "pose-slot quality contract drifted")

    simple_ui = config["simpleUi"]
    require(simple_ui["showAdvanced"] is False, "beginner UI must hide advanced tools by default")
    require(simple_ui["focusOnLaunch"] is True, "beginner UI must open in the focused workspace")
    require(simple_ui["defaultCharacter"] == "SURVIVAL", "beginner UI must start from the stable character")
    require(
        [item["id"] for item in simple_ui["characters"]] == ["SURVIVAL", "MESHY"],
        "beginner character choices drifted",
    )

    guide_module = ROOT / "testing" / "blender-animation-lab-v1" / "addon" / "dig_game_animation_lab" / "bone_labels.py"
    if guide_module.is_file():
        guide = config.get("boneGuide")
        require(isinstance(guide, dict), "named bone guide must be values-owned when its module is installed")
        require(guide.get("armatureDisplayType") == "OCTAHEDRAL", "beginner named bones must be readable")
        require(guide.get("showTechnicalBoneNames") is False, "beginner view must hide raw technical bone names")
        semantic_bones = guide.get("semanticBones", [])
        semantic_ids = [entry.get("id") for entry in semantic_bones if isinstance(entry, dict)]
        require(len(semantic_ids) == len(set(semantic_ids)), "semantic bone ids must be unique")
        require(
            {"hips", "head", "left-hand", "right-hand"}.issubset(semantic_ids),
            "named bone guide must keep the major beginner controls",
        )
        for entry in semantic_bones:
            require(
                isinstance(entry, dict) and entry.get("label") and entry.get("hint") and entry.get("bones"),
                "each named bone guide needs a label, hint, and canonical-bone alias",
            )

    paths = config["paths"]
    source_blend = resolve(paths["sourceBlend"])
    carrier_root = resolve(paths["carrierRoot"])
    output_blend = resolve(paths["outputBlend"])
    source_paths = [source_blend] + [carrier_root / item["file"] for item in carriers]
    for source in source_paths:
        require(source.is_file(), f"missing read-only source: {source}")
    require(output_blend != source_blend, "lab output cannot overwrite the approved source blend")
    require(carrier_root not in output_blend.parents, "lab output cannot live beside source FBX carriers")
    require(paths["reviewOutputRoot"].endswith("review-drafts"), "builder and addon review roots must agree")

    candidates = {item["id"]: item for item in config["meshCandidates"]}
    primary = candidates.get("meshy-warrior-demo")
    legacy = candidates.get("legacy-miner-meshy-proof")
    require(primary is not None and primary["status"] == "approved-review-primary", "primary Meshy proof is not configured")
    require(resolve(primary["path"]).is_file(), "primary Meshy review GLB is missing")
    require(legacy is not None and "rejected-disabled" in legacy["status"], "legacy Meshy evidence must stay rejected and disabled")
    return source_paths


def validate_tools() -> None:
    builder = ROOT / "ai-tools" / "2026-07-17-build-blender-animation-lab.py"
    launcher = ROOT / "ai-tools" / "2026-07-17-launch-blender-animation-lab.ps1"
    for path in (builder, launcher):
        require(path.is_file(), f"missing lab tool: {path}")
    addon = ROOT / "testing" / "blender-animation-lab-v1" / "addon" / "dig_game_animation_lab"
    for path in (addon / "simple_ui.py", addon / "simple_workspace.py", addon / "animation_browser.py", addon / "arm_tween_ops.py"):
        require(path.is_file(), f"missing beginner workspace module: {path}")
    browser_text = (addon / "animation_browser.py").read_text(encoding="utf-8")
    for token in ("grouped_clip_indices", "dgal.browser_choose_clip", "dgal.browser_restart_preview"):
        require(token in browser_text, f"animation browser contract token missing: {token}")
    arm_tween_text = (addon / "arm_tween_ops.py").read_text(encoding="utf-8")
    for token in ("dgal.arm_tween_edit_pose", "dgal.arm_tween_save_pose", "dgal.arm_tween_generate", "_remove_interior_keys"):
        require(token in arm_tween_text, f"whole-arm tween contract token missing: {token}")
    guide_module = addon / "bone_labels.py"
    if guide_module.is_file():
        guide_text = guide_module.read_text(encoding="utf-8")
        for token in ("semantic_bone_entries", "refresh_bone_labels", "resolve_semantic_pose_bone"):
            require(token in guide_text, f"named bone guide contract token missing: {token}")
    builder_text = builder.read_text(encoding="utf-8")
    launcher_text = launcher.read_text(encoding="utf-8")
    for token in ("consolidate_carrier", "validate_master", "save_as_mainfile", "sourcesPreserved"):
        require(token in builder_text, f"builder contract token missing: {token}")
    require("--register-only" in builder_text and "--register-only" in launcher_text, "GUI addon registration handoff is missing")
    require("--python-exit-code" in launcher_text, "background build must propagate Blender failures")


def validate_build(config: dict[str, Any], source_paths: list[Path], required: bool) -> None:
    paths = config["paths"]
    blend = resolve(paths["outputBlend"])
    report_path = resolve(paths["buildReport"])
    if not required and (not blend.is_file() or not report_path.is_file()):
        return
    require(blend.is_file() and blend.stat().st_size > 1_000_000, "built Blender master is missing or implausibly small")
    require(report_path.is_file(), "Blender build report is missing")
    report = load(report_path)
    require(report["id"] == config["id"], "build report id drifted")
    require(report["carrierCount"] == 17, "build report carrier count drifted")
    require(report["runtimeActionCount"] == 18, "build report runtime action count drifted")
    require(report["masterActionCount"] == 17, "master blend must contain 17 consolidated actions")
    require(report["canonicalArmature"] == config["master"]["armatureObject"], "canonical armature drifted")
    require(report["sourcesPreserved"] is True, "builder did not preserve source hashes")
    require(report["productionChanged"] is False, "review build cannot claim a production change")
    current_hashes = {path.relative_to(ROOT).as_posix(): sha256(path) for path in source_paths}
    require(current_hashes == report["sourceHashes"], "source blend or FBX carrier changed after lab build")
    expected_actions = {f"{config['master']['actionPrefix']}{item['id']}" for item in config["carriers"]}
    require({item["name"] for item in report["actions"]} == expected_actions, "reported master actions are incomplete")


def main() -> None:
    args = parse_args()
    config = load(Path(args.config).resolve())
    source_paths = validate_config(config)
    validate_tools()
    validate_build(config, source_paths, args.require_build)
    print("BLENDER_ANIMATION_LAB_CONTRACT_OK carriers=17 runtimeActions=18 sourcesPreserved=true")


if __name__ == "__main__":
    main()
