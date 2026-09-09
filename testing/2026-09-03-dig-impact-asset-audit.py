"""Read-only source-pixel inspection: extract authored contacts, never alter runtime art."""
from pathlib import Path
import json
import sys
import hashlib
from functools import lru_cache
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ROOT / "sprites/character/survival-character-unified-v1/runtime"
MANIFEST = json.loads((RUNTIME / "2026-08-25-survival-unified-animation-runtime-v1-manifest.json").read_text())
COMPLEX = "survival-mixamo-v3-complex-dig-"
UAL = "survival-ual-player-v1-"
CASES = [(name, COMPLEX + name + "-sheet", frame) for name, frame in [
    ("cross", 10), ("jab", 9), ("roundhouse", 8), ("jab-elbow", 9),
    ("jab-elbow", 20), ("low-kick", 8), ("high-kick", 9),
    ("spinning-back-kick", 16), ("elbow-uppercut", 11),
    ("elbow-uppercut", 22), ("single-elbow", 10), ("hook", 11), ("uppercut", 17),
]] + [
    ("dig-up", "survival-blender-v2-dig-up-polished-sheet", 11),
    ("down", UAL + "ground-strike-sheet", 18),
    ("native-jab", UAL + "punch-jab-sheet", 7),
    ("native-cross", UAL + "punch-cross-sheet", 9),
]


@lru_cache(maxsize=24)
def sheet_image(sheet):
    return Image.open(RUNTIME / MANIFEST["sheets"][sheet]["file"]).convert("RGBA")


def frame_image(sheet, frame):
    spec = MANIFEST["sheets"][sheet]
    source = sheet_image(sheet)
    size = spec["frameSizePx"]
    columns = source.width // size
    x, y = frame % columns * size, frame // columns * size
    return source.crop((x, y, x + size, y + size))


def contact_sheet(cases, output, columns=5):
    width, height = 256, 280
    canvas = Image.new("RGB", (columns * width, ((len(cases) + columns - 1) // columns) * height), "#101923")
    draw = ImageDraw.Draw(canvas)
    for index, (label, sheet, frame) in enumerate(cases):
        x, y = index % columns * width, index // columns * height
        tile = frame_image(sheet, frame)
        canvas.paste(tile, (x, y + 20), tile)
        draw.text((x + 5, y + 3), f"{label} / {frame}", fill="white")
        for step in [64, 128, 192]:
            draw.line((x + step, y + 20, x + step, y + 276), fill="#253341")
            draw.line((x, y + 20 + step, x + 256, y + 20 + step), fill="#253341")
    canvas.save(ROOT / "testing" / output)


def endpoint(sheet, frame, axis="right", region=(0.42, 0.08, 1, 0.72)):
    im = frame_image(sheet, frame)
    w, h = im.size
    pixels = im.load()
    points = [(x, y) for y in range(int(h * region[1]), int(h * region[3]))
              for x in range(int(w * region[0]), int(w * region[2]))
              if pixels[x, y][3] >= 160]
    assert points, (sheet, frame, region)
    score = lambda p: p[0] if axis == "right" else -p[1] if axis == "up" else p[1]
    edge = max(map(score, points))
    tip = set(point for point in points if score(point) >= edge - 3)
    groups = []
    while tip:
        group = [tip.pop()]
        for x, y in group:
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    neighbor = (x + dx, y + dy)
                    if neighbor in tip:
                        tip.remove(neighbor)
                        group.append(neighbor)
        groups.append(group)
    group = max(groups, key=lambda g: (len(g), max(map(score, g))))
    center = [sum(p[i] for p in group) / len(group) for i in range(2)]
    # A centroid across disconnected hand/boot pixels can land in empty air.
    point = min(group, key=lambda p: (p[0] - center[0]) ** 2 + (p[1] - center[1]) ** 2)
    return list(point), edge


def generate_contacts(descriptors):
    output = {}
    annotated = []
    fixes = {("roundhouse", 8): 9, ("spinning-back-kick", 16): 12,
             ("uppercut", 17): 10, ("elbow-uppercut", 11): 8,
             ("elbow-uppercut", 22): 16}
    for desc in descriptors:
        sheet, source = desc["sheet"], desc["source"]
        if sheet not in MANIFEST["sheets"]:
            continue
        name = sheet.removeprefix(COMPLEX).removesuffix("-sheet")
        moving = "moving-complex" in sheet
        if moving:
            name = desc["name"]
        for index, old_frame in enumerate(desc["contacts"]):
            if str(old_frame) in output.get(sheet, {}).get("contacts", {}):
                continue
            axis, region = "right", (0.42, 0.08, 1, 0.72)
            strength = 1.06
            if "low-kick" in name or "lowKick" in name:
                region, strength = (0.48, 0.42, 1, 0.95), 1.1
            elif any(word in name for word in ["roundhouse", "high-kick", "highKick", "spinning"]):
                region, strength = (0.5, 0.08, 1, 0.65), 1.22
            elif "jab" in name.lower() and index == 0:
                strength = 0.86
            if (name == "uppercut") or ("elbow" in name.lower() and "uppercut" in name.lower() and index > 0):
                axis, region, strength = "up", (0.4 if name == "uppercut" else 0.6, 0, 1, 0.46), 1.14
            if "ground-strike" in sheet:
                axis, region, strength = "down", (0.65, 0.48, 1, 0.95), 1.12
            frame = fixes.get((name, old_frame), old_frame)
            if "diagonal-dig" in sheet and "moving-diagonal-down" in source:
                frame = old_frame - 2
            if moving:
                # Preserve phase-locked running timing. Sample the limb visible
                # at each real atlas frame, never reuse a stationary crop.
                frame = old_frame
                if axis == "up":
                    axis, region = "right", (0.48, 0.2, 1, 0.58)
            point, _ = endpoint(sheet, frame, axis, region)
            previous, _ = endpoint(sheet, max(desc["frames"][0], frame - 2), axis, region)
            spec = MANIFEST["sheets"][sheet]
            if sheet not in output:
                output[sheet] = {
                    "size": spec["frameSizePx"],
                    "sha256": hashlib.sha256((RUNTIME / spec["file"]).read_bytes()).hexdigest(),
                    "contacts": {},
                }
            output[sheet]["contacts"][str(old_frame)] = [frame, *point, *previous, strength]
            annotated.append((name, sheet, old_frame, frame, point))
    for moving in [False, True]:
        selected = [item for item in annotated if ("moving-complex" in item[1]) == moving]
        width, height, columns = 192, 216, 8
        canvas = Image.new("RGB", (width * columns, ((len(selected) + columns - 1) // columns) * height), "#101923")
        draw = ImageDraw.Draw(canvas)
        for index, (name, sheet, old, frame, point) in enumerate(selected):
            x, y = index % columns * width, index // columns * height
            im = frame_image(sheet, frame)
            scale = width / im.width
            tile = im.resize((width, width))
            canvas.paste(tile, (x, y + 24), tile)
            draw.text((x + 3, y + 2), f"{name[:18]} {old}>{frame}", fill="white")
            px, py = x + point[0] * scale, y + 24 + point[1] * scale
            draw.ellipse((px - 4, py - 4, px + 4, py + 4), outline="#ffcc44", width=1)
        suffix = "moving" if moving else "standing"
        canvas.save(ROOT / f"testing/2026-09-03-dig-impact-authored-{suffix}.png")
    return output


if "--contacts" in sys.argv:
    print(json.dumps(generate_contacts(json.load(sys.stdin))))
    sys.exit(0)


contact_sheet(CASES, "2026-09-03-dig-impact-contact-audit.png")
for name, sheet, count in [
    ("roundhouse", COMPLEX + "roundhouse-sheet", 22),
    ("spinning-back-kick", COMPLEX + "spinning-back-kick-sheet", 26),
    ("uppercut", COMPLEX + "uppercut-sheet", 24),
    ("dig-up", "survival-blender-v2-dig-up-polished-sheet", 24),
    ("jab-elbow", COMPLEX + "jab-elbow-sheet", 30),
    ("elbow-uppercut", COMPLEX + "elbow-uppercut-sheet", 28),
]:
    contact_sheet([(name, sheet, frame) for frame in range(count)],
                  f"2026-09-03-dig-impact-{name}-timing.png", 6)
contact_sheet([(f"moving-{i}", UAL + "moving-complex-dig-sheet", i)
               for i in [5, 15, 25, 35, 45, 55, 65, 75, 85, 95, 105, 115]],
              "2026-09-03-dig-impact-moving-audit.png", 4)
source = Image.open(ROOT / "sprites/fx/tile-destruction-fx-v3/tile-break-core-v3.png").convert("RGBA")
source.crop((0, 416, 1024, 624)).save(ROOT / "testing/2026-09-03-dig-impact-hard-atlas-audit.png")
print("Extracted current runtime contact frames and the existing hard-material effect phases.")
