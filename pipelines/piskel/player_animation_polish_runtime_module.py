"""Write the generated JavaScript contract for player animation polish."""

from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

from piskel_document import ensure_parent


def _circular_distance(left: int, right: int, count: int) -> int:
    distance = abs(left - right) % count
    return min(distance, count - distance)


def _animation(
    key: str,
    sheet: str,
    frames: list[int],
    frame_rate: int,
    repeat: int = 0,
) -> dict[str, Any]:
    return {
        "key": key,
        "sheet": sheet,
        "frames": frames,
        "frameRate": frame_rate,
        "repeat": repeat,
    }


def _nearest_phase_map(phases: list[int], count: int) -> list[int]:
    return [
        min(phases, key=lambda phase: (_circular_distance(outgoing, phase, count), phase))
        for outgoing in range(count)
    ]


def write_runtime_module(
    root: Path,
    config: dict[str, Any],
    transition_layout: dict[str, Any],
    transition_frame_count: int,
    diagonal_variants: list[dict[str, Any]],
    diagonal_frame_count: int,
) -> dict[str, Any]:
    runtime = deepcopy(config)
    transition_sheet = runtime["sheets"]["transitions"]
    diagonal_sheet = runtime["sheets"]["diagonalDig"]
    transition_sheet["frames"] = list(range(transition_frame_count))
    transition_sheet["frameCount"] = transition_frame_count
    diagonal_sheet["frames"] = list(range(diagonal_frame_count))
    diagonal_sheet["frameCount"] = diagonal_frame_count

    animations = []
    ground = runtime["groundHandoff"]
    ground["start"] = _animation(
        ground["startAnimationKey"],
        transition_sheet["sheetKey"],
        transition_layout["ground"]["start"],
        runtime["frameRate"],
    )
    stop_variants = []
    for source in transition_layout["ground"]["stopVariants"]:
        phase = source["runFrame"]
        spec = _animation(
            f"{ground['stopAnimationKeyPrefix']}-{phase:02d}-anim",
            transition_sheet["sheetKey"],
            source["frames"],
            runtime["frameRate"],
        )
        spec["runFrame"] = phase
        stop_variants.append(spec)
    ground["stopVariants"] = stop_variants
    nearest = _nearest_phase_map(
        [variant["runFrame"] for variant in stop_variants],
        ground["runFrameCount"],
    )
    ground["stopAnimationKeyByOutgoingJogFrame"] = [
        next(variant["key"] for variant in stop_variants if variant["runFrame"] == phase)
        for phase in nearest
    ]
    animations.extend([ground["start"], *stop_variants])

    recovery = runtime["actionRecovery"]
    for family, spec in recovery["families"].items():
        spec.update(_animation(
            spec["animationKey"],
            transition_sheet["sheetKey"],
            transition_layout["recovery"][family],
            recovery["frameRate"],
        ))
        animations.append(spec)

    landing = runtime["landing"]
    landing["soft"] = _animation(
        landing["softAnimationKey"],
        transition_sheet["sheetKey"],
        transition_layout["landing"]["soft"],
        landing["frameRate"],
    )
    landing["hard"] = _animation(
        landing["hardAnimationKey"],
        transition_sheet["sheetKey"],
        transition_layout["landing"]["hard"],
        landing["frameRate"],
    )
    animations.extend([landing["soft"], landing["hard"]])

    wall = runtime["wallBrace"]
    wall["entry"] = _animation(
        wall["entryAnimationKey"],
        transition_sheet["sheetKey"],
        transition_layout["wall"]["entry"],
        wall["frameRate"],
    )
    wall["exit"] = _animation(
        wall["exitAnimationKey"],
        transition_sheet["sheetKey"],
        transition_layout["wall"]["exit"],
        wall["frameRate"],
    )
    animations.extend([wall["entry"], wall["exit"]])
    runtime["transitionAnimations"] = animations

    diagonal = runtime["diagonalMining"]
    generated_variants = []
    variants_by_family: dict[str, list[dict[str, Any]]] = {"up": [], "down": []}
    for source in diagonal_variants:
        family = source["family"]
        family_config = diagonal[family]
        run_start = source["runStartFrame"]
        variant_id = f"{family}-phase-{run_start:02d}"
        spec = {
            "id": variant_id,
            "family": family,
            "runStartFrame": run_start,
            "resumeJogFrame": (
                run_start + diagonal["frameCount"]
            ) % diagonal["runFrameCount"],
            "animationKey": f"{family_config['animationKeyPrefix']}-{run_start:02d}-anim",
            "sheetKey": diagonal_sheet["sheetKey"],
            "frames": source["frames"],
            "frameRate": runtime["frameRate"],
            "repeat": 0,
            "contactFrame": family_config["contactSequenceIndex"],
            "contactSequenceIndex": family_config["contactSequenceIndex"],
            "sourceAction": f"{family_config['manifestActionPrefix']}-{run_start:02d}",
            "markerGroup": family_config["markerGroup"],
        }
        generated_variants.append(spec)
        variants_by_family[family].append(spec)
    diagonal["variants"] = generated_variants
    for family, variants in variants_by_family.items():
        ideal_phases = [
            (outgoing + diagonal["entryPhaseOffset"]) % diagonal["runFrameCount"]
            for outgoing in range(diagonal["runFrameCount"])
        ]
        selected = [
            min(
                variants,
                key=lambda variant: (
                    _circular_distance(
                        ideal,
                        variant["runStartFrame"],
                        diagonal["runFrameCount"],
                    ),
                    variant["runStartFrame"],
                ),
            )
            for ideal in ideal_phases
        ]
        maximum_error = max(
            _circular_distance(
                ideal,
                variant["runStartFrame"],
                diagonal["runFrameCount"],
            )
            for ideal, variant in zip(ideal_phases, selected)
        )
        if maximum_error > diagonal["maxEntryPhaseError"]:
            raise ValueError(f"{family} diagonal phase error {maximum_error} exceeds policy")
        diagonal[family]["entryVariantIdByOutgoingJogFrame"] = [
            variant["id"] for variant in selected
        ]

    target = root / "values" / "playerAnimationPolish.generated.js"
    payload = json.dumps(runtime, indent=2)
    source = (
        "// Generated by the centralized player-animation Piskel production builder.\n"
        "const deepFreeze = (value) => {\n"
        "  if (!value || typeof value !== \"object\" || Object.isFrozen(value)) return value;\n"
        "  Object.values(value).forEach(deepFreeze);\n"
        "  return Object.freeze(value);\n"
        "};\n\n"
        f"export const PLAYER_ANIMATION_POLISH = deepFreeze({payload});\n"
    )
    ensure_parent(target)
    target.write_text(source, encoding="utf-8")
    return runtime
