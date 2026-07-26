from pathlib import Path
import re

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "visual-approval-previews"
    / "underground-biome-background-production-v2"
)
OUTPUT_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "biome-variation-v2"
)
SOURCE_PATTERN = re.compile(
    r"^2026-07-26-(?P<index>\d{2,3})-(?P<stem>.+)-background-v2\.png$"
)
EXPECTED_SIZE = (1536, 1024)
EXPECTED_INDEXES = set(range(51, 101))
WEBP_QUALITY = 88
WEBP_METHOD = 6
MAX_NORMALIZE_DELTA_PX = 2


def collect_sources():
    entries = []
    for path in sorted(SOURCE_DIR.glob("2026-07-26-*-background-v2.png")):
        match = SOURCE_PATTERN.match(path.name)
        if not match:
            raise RuntimeError(f"Unexpected source filename: {path.name}")
        entries.append((int(match.group("index")), match.group("stem"), path))
    indexes = {index for index, _, _ in entries}
    if indexes != EXPECTED_INDEXES:
        missing = sorted(EXPECTED_INDEXES - indexes)
        extra = sorted(indexes - EXPECTED_INDEXES)
        raise RuntimeError(f"Source index mismatch: missing={missing}, extra={extra}")
    if len(entries) != len(EXPECTED_INDEXES):
        raise RuntimeError(f"Expected 50 unique sources, found {len(entries)}")
    return entries


def build():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    entries = collect_sources()
    written = []
    for _, stem, source_path in entries:
        output_path = OUTPUT_DIR / f"{stem}-v2.webp"
        with Image.open(source_path) as image:
            if image.size != EXPECTED_SIZE:
                original_size = image.size
                delta = max(
                    abs(image.width - EXPECTED_SIZE[0]),
                    abs(image.height - EXPECTED_SIZE[1]),
                )
                if delta > MAX_NORMALIZE_DELTA_PX:
                    raise RuntimeError(
                        f"{source_path.name} is {image.size}, expected {EXPECTED_SIZE}"
                    )
                image = image.resize(EXPECTED_SIZE, Image.Resampling.LANCZOS)
                print(f"Normalized {source_path.name} from {original_size} to {EXPECTED_SIZE}")
            image.convert("RGB").save(
                output_path,
                "WEBP",
                quality=WEBP_QUALITY,
                method=WEBP_METHOD,
            )
        written.append(output_path)
    print(f"Built {len(written)} biome background cards in {OUTPUT_DIR}")


if __name__ == "__main__":
    build()
