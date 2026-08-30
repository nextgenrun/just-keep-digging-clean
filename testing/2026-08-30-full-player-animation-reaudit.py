"""Audit every active Survival player animation and render visual defect boards."""

from __future__ import annotations

import hashlib
import json
import re
import statistics
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
VIEWER = ROOT / "testing/animation-sandbox/current-animation-inventory-v1"
INVENTORY_PATH = VIEWER / "inventory-data.js"
MANIFEST_PATH = ROOT / "sprites/character/survival-character-unified-v1/runtime/2026-08-25-survival-unified-animation-runtime-v1-manifest.json"
REPORT_PATH = VIEWER / "2026-08-30-animation-audit-report.json"
LOOP_BOARD = VIEWER / "2026-08-30-animation-loop-seam-candidates.png"
DRIFT_BOARD = VIEWER / "2026-08-30-animation-scale-drift-candidates.png"
ROUTE_BOARD = VIEWER / "2026-08-30-animation-recovery-seam-candidates.png"
ALPHA_THRESHOLD = 8
WORLD_SIZE = 160
WORLD_ANCHOR = (80, 120)
PREVIEW_SIZE = 128
BOARD_ROWS = 12


def read_inventory() -> dict:
    source = INVENTORY_PATH.read_text(encoding="utf-8")
    prefix = "window.ANIMATION_INVENTORY = "
    if not source.startswith(prefix):
        raise AssertionError("animation inventory wrapper changed")
    return json.loads(source[len(prefix):].rstrip(";\r\n"))


def binary_mask(image: Image.Image) -> Image.Image:
    return image.getchannel("A").point(lambda value: 255 if value > ALPHA_THRESHOLD else 0)


def silhouette_distance(left: Image.Image, right: Image.Image) -> float:
    left_mask = binary_mask(left)
    right_mask = binary_mask(right)
    intersection = ImageChops.multiply(left_mask, right_mask).histogram()[255]
    union = ImageChops.lighter(left_mask, right_mask).histogram()[255]
    return 1.0 - intersection / max(1, union)


def checker(size: int) -> Image.Image:
    image = Image.new("RGBA", (size, size), "#121c2c")
    draw = ImageDraw.Draw(image)
    for y in range(0, size, 8):
        for x in range(0, size, 8):
            if (x // 8 + y // 8) % 2 == 0:
                draw.rectangle((x, y, x + 7, y + 7), fill="#1b2940")
    return image


class RuntimeFrames:
    def __init__(self, manifest: dict):
        self.manifest = manifest
        self.runtime = MANIFEST_PATH.parent
        self.sheets: dict[str, Image.Image] = {}
        self.cells: dict[tuple[str, int], Image.Image] = {}
        self.world: dict[tuple[str, int, int, float, float], Image.Image] = {}

    def cell(self, sheet_key: str, frame_index: int) -> Image.Image:
        cache_key = (sheet_key, frame_index)
        if cache_key in self.cells:
            return self.cells[cache_key]
        spec = self.manifest["sheets"][sheet_key]
        if sheet_key not in self.sheets:
            self.sheets[sheet_key] = Image.open(self.runtime / spec["file"]).convert("RGBA")
        size = int(spec["frameSizePx"])
        columns = int(spec["columns"])
        x = frame_index % columns * size
        y = frame_index // columns * size
        frame = self.sheets[sheet_key].crop((x, y, x + size, y + size))
        self.cells[cache_key] = frame
        return frame

    def anchored(self, entry: dict, sequence_index: int) -> Image.Image:
        texture_frame = int(entry["frameSequence"][sequence_index])
        display = int(round(entry["displaySizePx"]))
        origin_x = float(entry["originX"])
        origin_y = float(entry["originY"])
        cache_key = (entry["sheet"], texture_frame, display, origin_x, origin_y)
        if cache_key in self.world:
            return self.world[cache_key]
        cell = self.cell(entry["sheet"], texture_frame)
        scaled = cell.resize((display, display), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (WORLD_SIZE, WORLD_SIZE))
        x = round(WORLD_ANCHOR[0] - origin_x * display)
        y = round(WORLD_ANCHOR[1] - origin_y * display)
        canvas.alpha_composite(scaled, (x, y))
        self.world[cache_key] = canvas
        return canvas


def audit_sheet_integrity(manifest: dict, frames: RuntimeFrames) -> list[dict]:
    issues = []
    for sheet_key, spec in manifest["sheets"].items():
        path = MANIFEST_PATH.parent / spec["file"]
        if not path.is_file():
            issues.append({"severity": "critical", "sheet": sheet_key, "reason": "missing file"})
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest != spec["sha256"]:
            issues.append({"severity": "critical", "sheet": sheet_key, "reason": "hash mismatch"})
        with Image.open(path) as source:
            expected_width = int(spec["columns"]) * int(spec["frameSizePx"])
            expected_height = int(spec["rows"]) * int(spec["frameSizePx"])
            if source.size != (expected_width, expected_height):
                issues.append({"severity": "critical", "sheet": sheet_key, "reason": f"dimensions {source.size}"})
        edge_frames = []
        blank_frames = []
        for index in range(int(spec["frames"])):
            bounds = binary_mask(frames.cell(sheet_key, index)).getbbox()
            if bounds is None:
                blank_frames.append(index)
            elif min(bounds[0], bounds[1], int(spec["frameSizePx"]) - bounds[2], int(spec["frameSizePx"]) - bounds[3]) <= 1:
                edge_frames.append(index)
        if blank_frames:
            issues.append({"severity": "critical", "sheet": sheet_key, "reason": "blank frames", "frames": blank_frames})
        if edge_frames:
            issues.append({"severity": "high", "sheet": sheet_key, "reason": "alpha within 1 px of crop edge", "frames": edge_frames})
    return issues


def animation_metrics(entry: dict, frames: RuntimeFrames) -> dict:
    rendered = [frames.anchored(entry, index) for index in range(entry["frames"])]
    bounds = [binary_mask(frame).getbbox() for frame in rendered]
    heights = [bound[3] - bound[1] for bound in bounds if bound]
    bottoms = [bound[3] - 1 for bound in bounds if bound]
    centers = [0.5 * (bound[0] + bound[2]) for bound in bounds if bound]
    steps = [silhouette_distance(rendered[index], rendered[index + 1]) for index in range(len(rendered) - 1)]
    worst_step = max(steps, default=0.0)
    worst_pair = steps.index(worst_step) if steps else 0
    median_step = statistics.median(steps) if steps else 0.0
    loop_seam = silhouette_distance(rendered[-1], rendered[0]) if entry["repeat"] == -1 and len(rendered) > 1 else None
    return {
        "key": entry["key"],
        "sheet": entry["sheet"],
        "frames": entry["frames"],
        "frameRate": entry["frameRate"],
        "repeat": entry["repeat"],
        "displaySizePx": entry["displaySizePx"],
        "visibleHeightMedianPx": round(statistics.median(heights), 3),
        "visibleHeightRangePx": round(max(heights) - min(heights), 3),
        "baselineRangePx": round(max(bottoms) - min(bottoms), 3),
        "centerXRangePx": round(max(centers) - min(centers), 3),
        "worstConsecutiveSeam": round(worst_step, 4),
        "medianConsecutiveSeam": round(median_step, 4),
        "worstConsecutivePair": [worst_pair, min(worst_pair + 1, len(rendered) - 1)],
        "loopSeam": round(loop_seam, 4) if loop_seam is not None else None,
        "loopToMedianRatio": round(loop_seam / max(0.0001, median_step), 3) if loop_seam is not None else None,
    }


def transition_metrics(routes: list, by_key: dict, frames: RuntimeFrames) -> list[dict]:
    results = []
    for source_key, target_key in routes:
        source = by_key.get(source_key)
        target = by_key.get(target_key)
        if not source or not target:
            results.append({"source": source_key, "target": target_key, "missing": True})
            continue
        distance = silhouette_distance(frames.anchored(source, source["frames"] - 1), frames.anchored(target, 0))
        results.append({"source": source_key, "target": target_key, "seam": round(distance, 4)})
    return results


def frame_preview(frame: Image.Image) -> Image.Image:
    stage = checker(PREVIEW_SIZE)
    scaled = frame.resize((PREVIEW_SIZE, PREVIEW_SIZE), Image.Resampling.LANCZOS)
    stage.alpha_composite(scaled)
    return stage.convert("RGB")


def pair_board(path: Path, title: str, rows: list[dict], by_key: dict, frames: RuntimeFrames) -> None:
    font = ImageFont.load_default()
    row_height = PREVIEW_SIZE + 34
    canvas = Image.new("RGB", (660, 48 + len(rows) * row_height), "#09111f")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), title, fill="#ffffff", font=font)
    for row, item in enumerate(rows):
        y = 44 + row * row_height
        source = by_key[item["source"]]
        target = by_key[item["target"]]
        left_index = source["frames"] - 1
        canvas.paste(frame_preview(frames.anchored(source, left_index)), (16, y))
        canvas.paste(frame_preview(frames.anchored(target, 0)), (156, y))
        accent = "#ff8787" if item.get("seam", 0) >= 0.25 else "#ffd37a"
        draw.rectangle((16, y, 143, y + 127), outline=accent, width=2)
        draw.rectangle((156, y, 283, y + 127), outline=accent, width=2)
        label = source["key"].replace("survival-ual-player-v1-", "")
        draw.text((302, y + 12), label[:52], fill="#e7eefb", font=font)
        draw.text((302, y + 34), f"seam {item.get('seam', 0):.4f}", fill=accent, font=font)
        draw.text((302, y + 56), f"A {source['sheet']} [{left_index}]", fill="#9fb0c9", font=font)
        draw.text((302, y + 78), f"B {target['sheet']} [0]", fill="#9fb0c9", font=font)
    canvas.save(path)


def sequence_board(path: Path, title: str, metrics: list[dict], by_key: dict, frames: RuntimeFrames, mode: str) -> None:
    font = ImageFont.load_default()
    columns = 6
    cell = 104
    row_height = cell + 46
    canvas = Image.new("RGB", (columns * (cell + 8) + 330, 48 + len(metrics) * row_height), "#09111f")
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 16), title, fill="#ffffff", font=font)
    for row, metric in enumerate(metrics):
        entry = by_key[metric["key"]]
        y = 44 + row * row_height
        indices = sorted(set(round(i * (entry["frames"] - 1) / max(1, columns - 1)) for i in range(columns)))
        for column, index in enumerate(indices):
            preview = frame_preview(frames.anchored(entry, index)).resize((cell, cell), Image.Resampling.LANCZOS)
            x = 16 + column * (cell + 8)
            canvas.paste(preview, (x, y))
            draw.text((x, y + cell + 4), str(index), fill="#9fb0c9", font=font)
        x = columns * (cell + 8) + 24
        draw.text((x, y + 8), metric["key"].replace("survival-ual-player-v1-", "")[:50], fill="#e7eefb", font=font)
        value = metric[mode]
        draw.text((x, y + 32), f"{mode}: {value}", fill="#ffd37a", font=font)
        draw.text((x, y + 54), f"sheet: {metric['sheet']}", fill="#9fb0c9", font=font)
    canvas.save(path)


def main() -> None:
    inventory = read_inventory()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    active = [entry for entry in inventory["runtimeAnimations"] if entry["status"] == "current-default"]
    by_key = {entry["key"]: entry for entry in active}
    frames = RuntimeFrames(manifest)
    sheet_issues = audit_sheet_integrity(manifest, frames)
    metrics = [animation_metrics(entry, frames) for entry in active]
    routes = transition_metrics(inventory["transitionRoutes"], by_key, frames)
    loop_candidates = sorted((item for item in metrics if item["loopSeam"] is not None), key=lambda item: item["loopToMedianRatio"], reverse=True)[:BOARD_ROWS]
    grounded = re.compile(r"(idle|walk|crouch|wall|hang|recover|settle)", re.I)
    drift_candidates = sorted((item for item in metrics if grounded.search(item["key"])), key=lambda item: item["baselineRangePx"], reverse=True)[:BOARD_ROWS]
    route_candidates = sorted((item for item in routes if not item.get("missing")), key=lambda item: item["seam"], reverse=True)[:BOARD_ROWS]
    flags = []
    flags.extend(sheet_issues)
    flags.extend({"severity": "review", "category": "loop seam", **item} for item in loop_candidates if item["loopSeam"] >= 0.14 and item["loopToMedianRatio"] >= 2)
    flags.extend({"severity": "review", "category": "grounded vertical drift", **item} for item in drift_candidates if item["baselineRangePx"] >= 5)
    flags.extend({"severity": "review", "category": "action recovery seam", **item} for item in route_candidates if item["seam"] >= 0.22)
    flags.extend({"severity": "wiring", "category": "missing recovery registration", **item} for item in routes if item.get("missing"))
    report = {
        "generatedAt": inventory["generatedAt"],
        "scope": "active Survival/UAL player runtime",
        "summary": {
            "animations": len(active),
            "registeredSheets": len({entry["sheet"] for entry in active}),
            "manifestSheets": len(manifest["sheets"]),
            "sourceFrames": sum(int(spec["frames"]) for spec in manifest["sheets"].values()),
            "actionRecoveryRoutes": len(routes),
            "sheetIntegrityIssues": len(sheet_issues),
            "visualReviewFlags": len(flags) - len(sheet_issues),
        },
        "sheetIssues": sheet_issues,
        "animationMetrics": metrics,
        "actionRecoveryMetrics": routes,
        "candidateFlags": flags,
    }
    REPORT_PATH.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    sequence_board(LOOP_BOARD, "Loop seam candidates - visually compare last to first", loop_candidates, by_key, frames, "loopSeam")
    sequence_board(DRIFT_BOARD, "Grounded scale/baseline candidates - inspect feet and body bob", drift_candidates, by_key, frames, "baselineRangePx")
    pair_board(ROUTE_BOARD, "Highest action-to-recovery seams", route_candidates, by_key, frames)
    print("FULL_PLAYER_ANIMATION_REAUDIT_OK", json.dumps(report["summary"]))
    for output in (REPORT_PATH, LOOP_BOARD, DRIFT_BOARD, ROUTE_BOARD):
        print(output)


if __name__ == "__main__":
    main()
