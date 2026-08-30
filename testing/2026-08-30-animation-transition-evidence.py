"""Measure reachable player transitions and render review boards plus an animated proof reel."""

from __future__ import annotations

import importlib.util
import json
import statistics
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
VIEWER = ROOT / "testing/animation-sandbox/current-animation-inventory-v1"
AUDIT_PATH = ROOT / "testing/2026-08-30-full-player-animation-reaudit.py"
MANIFEST_PATH = ROOT / "sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-unified-animation-runtime-v1-manifest.json"
REPORT_PATH = VIEWER / "2026-08-30-animation-transition-report.json"
CORE_BOARD = VIEWER / "2026-08-30-animation-core-transition-board.png"
HELD_LEDGE_BOARD = VIEWER / "2026-08-30-animation-held-torch-and-ledge-transition-board.png"
PRIORITY_GIF = VIEWER / "2026-08-30-animation-priority-transition-flags.gif"
PREVIEW = 128


def load_audit_module():
    spec = importlib.util.spec_from_file_location("player_animation_audit", AUDIT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def transition(audit, frames, by_key, label, source_key, target_key,
               source_indices=(-1,), target_indices=(0,), note=None):
    source = by_key[source_key]
    target = by_key[target_key]
    source_indices = [index % source["frames"] for index in source_indices]
    target_indices = [index % target["frames"] for index in target_indices]
    samples = [
        (audit.silhouette_distance(frames.anchored(source, left), frames.anchored(target, right)), left, right)
        for left in source_indices for right in target_indices
    ]
    seam, left, right = max(samples)
    values = [sample[0] for sample in samples]
    result = {
        "label": label,
        "source": source_key,
        "sourceIndex": left,
        "target": target_key,
        "targetIndex": right,
        "seam": round(seam, 4),
        "seamMin": round(min(values), 4),
        "seamMedian": round(statistics.median(values), 4),
        "seamMax": round(max(values), 4),
        "sampleCount": len(samples),
    }
    if note:
        result["note"] = note
    return result


def fixed_rows(audit, frames, by_key, inventory):
    keys = inventory["defaultAnimationKeys"]
    gait = "survival-ual-player-v1-run-anim"
    specs = [
        ("idle to walk start", keys["idle"], keys["walkStart"], (0,), (0,)),
        ("walk start to active gait", keys["walkStart"], gait, (-1,), (7,)),
        ("crouch enter to hold", keys["crouchEnter"], keys["crouch"], (-1,), (0,)),
        ("crouch exit to idle", keys["crouchExit"], keys["idle"], (-1,), (0,)),
        ("crouch exit to active gait", keys["crouchExit"], gait, (-1,), (7,)),
        ("hard landing to idle", keys["landing"], keys["idle"], (-1,), (0,)),
        ("hard landing movement cancel to gait", keys["landing"], gait, (2,), (13,)),
        ("continuous flight loop wrap", keys["flightTravelLoop"], keys["flightTravelLoop"], (-1,), (0,)),
    ]
    rows = [transition(audit, frames, by_key, *spec) for spec in specs]
    rows.extend([
        transition(audit, frames, by_key, "airborne phase to continuous flight",
                   keys["airborne"], keys["flightTravelLoop"], range(by_key[keys["airborne"]]["frames"])),
        transition(audit, frames, by_key, "continuous flight phase to falling",
                   keys["flightTravelLoop"], keys["falling"], range(by_key[keys["flightTravelLoop"]]["frames"])),
    ])
    stop_keys = [keys["walkStop"], *sorted(key for key in by_key if "walk-stop-phase" in key)]
    rows.extend(transition(audit, frames, by_key, f"walk stop phase {index:02d} to idle", key, keys["idle"])
                for index, key in enumerate(stop_keys))
    return rows


def held_and_ledge_rows(audit, frames, by_key, inventory):
    keys = inventory["defaultAnimationKeys"]
    held = "survival-held-torch-v1-"
    rows = [
        transition(audit, frames, by_key, "held idle phase to walk start", held + "idle-anim", held + "walkStart-anim", range(48)),
        transition(audit, frames, by_key, "held walk start to gait", held + "walkStart-anim", held + "walkLoop-anim", (-1,), (7,)),
        transition(audit, frames, by_key, "held gait phase to walk stop", held + "walkLoop-anim", held + "walkStop-anim", range(24)),
        transition(audit, frames, by_key, "held walk stop to idle", held + "walkStop-anim", held + "idle-anim"),
        transition(audit, frames, by_key, "held crouch enter to hold", held + "crouchEnter-anim", held + "crouch-anim"),
        transition(audit, frames, by_key, "held crouch exit to idle", held + "crouchExit-anim", held + "idle-anim"),
        transition(audit, frames, by_key, "held hard landing to idle", held + "hardLanding-anim", held + "idle-anim"),
        transition(audit, frames, by_key, "held landing movement cancel to gait", held + "hardLanding-anim", held + "walkLoop-anim", (2,), (13,)),
        transition(audit, frames, by_key, "held continuous flight loop wrap", held + "flight-anim", held + "flight-anim"),
        transition(audit, frames, by_key, "held flight phase to falling", held + "flight-anim", held + "falling-anim", range(48)),
        transition(audit, frames, by_key, "falling phase to ledge catch", keys["falling"], "survival-mixamo-v4-ledge-catch-anim", range(by_key[keys["falling"]]["frames"])),
        transition(audit, frames, by_key, "ledge catch to hang", "survival-mixamo-v4-ledge-catch-anim", "survival-mixamo-v4-ledge-hang-anim"),
        transition(audit, frames, by_key, "ledge hang to climb", "survival-mixamo-v4-ledge-hang-anim", "survival-mixamo-v4-ledge-climb-anim", (0,), (0,)),
        transition(audit, frames, by_key, "ledge climb to idle", "survival-mixamo-v4-ledge-climb-anim", keys["idle"]),
        transition(audit, frames, by_key, "ledge drop to falling", "survival-mixamo-v4-ledge-hang-anim", keys["falling"], (0,), (0,)),
        transition(audit, frames, by_key, "held idle to torchless Quick Slash", held + "idle-anim",
                   "survival-mixamo-v2-hurricane-quickslash-anim", range(48), (0,), "torch binding is absent on the target"),
    ]
    return rows


def render_board(audit, path, title, rows, by_key, frames):
    font = ImageFont.load_default()
    row_height = PREVIEW + 34
    canvas = Image.new("RGB", (820, 48 + row_height * len(rows)), "#09111f")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), title, fill="#ffffff", font=font)
    for row_index, item in enumerate(rows):
        y = 44 + row_index * row_height
        source = by_key[item["source"]]
        target = by_key[item["target"]]
        canvas.paste(audit.frame_preview(frames.anchored(source, item["sourceIndex"])), (16, y))
        canvas.paste(audit.frame_preview(frames.anchored(target, item["targetIndex"])), (156, y))
        accent = "#ff8787" if item["seam"] >= 0.25 else "#ffd37a" if item["seam"] >= 0.14 else "#8ee6a8"
        draw.rectangle((16, y, 143, y + 127), outline=accent, width=2)
        draw.rectangle((156, y, 283, y + 127), outline=accent, width=2)
        draw.text((302, y + 8), item["label"][:68], fill="#e7eefb", font=font)
        draw.text((302, y + 29), f"seam max {item['seamMax']:.4f} | median {item['seamMedian']:.4f} | min {item['seamMin']:.4f}", fill=accent, font=font)
        draw.text((302, y + 50), f"A {source['key']} [{item['sourceIndex']}]", fill="#9fb0c9", font=font)
        draw.text((302, y + 71), f"B {target['key']} [{item['targetIndex']}]", fill="#9fb0c9", font=font)
        if item.get("note"):
            draw.text((302, y + 92), item["note"][:74], fill="#ffb4b4", font=font)
    canvas.save(path)


def gif_stage(audit, frames, by_key, item, sequence_index, source_side):
    font = ImageFont.load_default()
    canvas = Image.new("RGB", (680, 235), "#09111f")
    draw = ImageDraw.Draw(canvas)
    draw.text((18, 14), item["label"], fill="#ffffff", font=font)
    draw.text((18, 34), f"candidate seam {item['seam']:.4f} | exact frames, both facings", fill="#ff9b9b", font=font)
    entry = by_key[item["source"] if source_side else item["target"]]
    index = sequence_index
    image = frames.anchored(entry, index)
    stage_right = audit.checker(160)
    stage_right.alpha_composite(image)
    stage_left = ImageOps.mirror(stage_right)
    canvas.paste(stage_right.convert("RGB"), (112, 58))
    canvas.paste(stage_left.convert("RGB"), (408, 58))
    draw.text((153, 218), "source-facing", fill="#9fb0c9", font=font)
    draw.text((459, 218), "mirrored", fill="#9fb0c9", font=font)
    marker = "A" if source_side else "B"
    draw.text((18, 205), f"{marker}: {entry['key']} [{index}]", fill="#d8e4f7", font=font)
    return canvas


def render_gif(audit, path, rows, by_key, frames):
    output = []
    durations = []
    for item in rows:
        source = by_key[item["source"]]
        target = by_key[item["target"]]
        left = item["sourceIndex"]
        right = item["targetIndex"]
        source_indices = range(max(0, left - 3), left + 1)
        target_indices = range(right, min(target["frames"], right + 4))
        for index in source_indices:
            output.append(gif_stage(audit, frames, by_key, item, index, True))
            durations.append(110)
        for offset, index in enumerate(target_indices):
            output.append(gif_stage(audit, frames, by_key, item, index, False))
            durations.append(320 if offset == 0 else 110)
        durations[-1] = 560
    output[0].save(path, save_all=True, append_images=output[1:], duration=durations, loop=0, disposal=2)


def main():
    audit = load_audit_module()
    inventory = audit.read_inventory()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    active = [entry for entry in inventory["runtimeAnimations"] if entry["status"] == "current-default"]
    by_key = {entry["key"]: entry for entry in active}
    frames = audit.RuntimeFrames(manifest)
    core = fixed_rows(audit, frames, by_key, inventory)
    held_ledge = held_and_ledge_rows(audit, frames, by_key, inventory)
    routes = [transition(audit, frames, by_key, "action recovery", source, target)
              for source, target in inventory["transitionRoutes"] if source in by_key and target in by_key]
    worst_recovery = max(routes, key=lambda item: item["seam"])
    active_sheets = {entry["sheet"] for entry in active}
    report = {
        "generatedAt": inventory["generatedAt"],
        "scope": "reachable transition candidates; scores flag review and are not perceptual verdicts",
        "core": core,
        "heldTorchAndLedge": held_ledge,
        "worstActionRecovery": worst_recovery,
        "unusedManifestSheets": sorted(set(manifest["sheets"]) - active_sheets),
        "orphanRecoveryRoutes": [{"source": source, "target": target} for source, target in inventory["transitionRoutes"] if source not in by_key or target not in by_key],
        "wiringFindings": [
            "continuousFlightLoop bypasses registered flight enter, travel-enter, and exit clips",
            "HardcoreDeathBridge stops animation and resets spawn without playing the registered death clip",
            "held-torch bindings omit combat, mining, death, and ledge clips; the torch-bearing sprite can disappear",
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    render_board(audit, CORE_BOARD, "Actual core locomotion routes", core, by_key, frames)
    render_board(audit, HELD_LEDGE_BOARD, "Held-torch and ledge routes", held_ledge, by_key, frames)
    priority = [core[7], core[3], core[5], held_ledge[1], held_ledge[8], held_ledge[10], held_ledge[13], worst_recovery, held_ledge[15]]
    render_gif(audit, PRIORITY_GIF, priority, by_key, frames)
    print("ANIMATION_TRANSITION_EVIDENCE_OK", json.dumps({
        "core": len(core), "heldTorchAndLedge": len(held_ledge), "worstRecovery": worst_recovery["seam"]
    }))
    for output in (REPORT_PATH, CORE_BOARD, HELD_LEDGE_BOARD, PRIORITY_GIF):
        print(output)


if __name__ == "__main__":
    main()
