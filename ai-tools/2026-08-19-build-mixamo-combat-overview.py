"""Compose the 16 new combat contact sheets into one review overview."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
CONFIG = json.loads(
    (ROOT / "values/mixamoCombatExpansionClips.json").read_text(encoding="utf-8")
)
CANDIDATES = ROOT / (
    "testing/blender-animation-lab-v1/review-drafts/"
    "mixamo-punch-sequence-sandbox-v1/renders/candidate"
)
CELL_WIDTH = 576
CELL_HEIGHT = 117
TITLE_HEIGHT = 54
COLUMNS = 2
ROWS = 8


font_path = Path("C:/Windows/Fonts/segoeuib.ttf")
font = ImageFont.truetype(str(font_path), 24) if font_path.is_file() else ImageFont.load_default()
canvas = Image.new(
    "RGB",
    (CELL_WIDTH * COLUMNS, TITLE_HEIGHT + CELL_HEIGHT * ROWS),
    (7, 14, 18),
)
draw = ImageDraw.Draw(canvas)
draw.text((16, 12), "MIXAMO COMBAT EXPANSION · 16 NEW V4 RETARGETS · REVIEW ONLY", font=font, fill=(238, 242, 247))
for index, clip_id in enumerate(CONFIG["clips"]):
    source = CANDIDATES / f"{clip_id}-contact-sheet.png"
    with Image.open(source) as image:
        cell = image.convert("RGB").resize((CELL_WIDTH, CELL_HEIGHT), Image.Resampling.LANCZOS)
    x = index % COLUMNS * CELL_WIDTH
    y = TITLE_HEIGHT + index // COLUMNS * CELL_HEIGHT
    canvas.paste(cell, (x, y))
output = CANDIDATES / "combat-expansion-overview.png"
canvas.save(output, optimize=True)
print(f"MIXAMO_COMBAT_OVERVIEW_OK clips={len(CONFIG['clips'])} output={output}")
