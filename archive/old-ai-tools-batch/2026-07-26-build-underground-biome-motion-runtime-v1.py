from pathlib import Path
import hashlib

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = (
    ROOT
    / "visual-approval-previews"
    / "underground-biome-motion-mockups-v1"
)
OUTPUT_DIR = (
    ROOT
    / "sprites"
    / "backgrounds"
    / "world-visual-v2"
    / "depth"
    / "biome-variation-v2"
)
EXPECTED_SIZE = (1536, 1024)
WEBP_QUALITY = 88
WEBP_METHOD = 6

SOURCE_TO_RUNTIME = {
    "2026-07-26-weathered-roots-root-tide-lantern-hollow.png":
        "weathered-roots-root-tide-lantern-hollow-motion-v1.webp",
    "2026-07-26-blue-caverns-resonant-crystal-rain.png":
        "blue-caverns-resonant-crystal-rain-motion-v1.webp",
    "2026-07-26-amber-depths-golden-dust-cathedral.png":
        "amber-depths-golden-dust-cathedral-motion-v1.webp",
    "2026-07-26-silver-core-mercury-shimmerfall.png":
        "silver-core-mercury-shimmerfall-motion-v1.webp",
    "2026-07-26-core-magma-basalt-heartbeat.png":
        "core-magma-basalt-heartbeat-motion-v1.webp",
    "2026-07-26-slagworks-pressure-breath-foundry.png":
        "slagworks-pressure-breath-foundry-motion-v1.webp",
    "2026-07-26-obsidian-catacombs-violet-ash-procession.png":
        "obsidian-catacombs-violet-ash-procession-motion-v1.webp",
    "2026-07-26-pressure-foundry-condenser-surge.png":
        "pressure-foundry-condenser-surge-motion-v1.webp",
    "2026-07-26-blackglass-abyss-prismatic-star-drift.png":
        "blackglass-abyss-prismatic-star-drift-motion-v1.webp",
    "2026-07-26-starfire-rift-celestial-current.png":
        "starfire-rift-celestial-current-motion-v1.webp",
}


def build():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    written = []

    for source_name, runtime_name in SOURCE_TO_RUNTIME.items():
        source_path = SOURCE_DIR / source_name
        output_path = OUTPUT_DIR / runtime_name
        if not source_path.is_file():
            raise RuntimeError(f"Missing approved motion plate: {source_path}")

        with Image.open(source_path) as image:
            if image.size != EXPECTED_SIZE:
                raise RuntimeError(
                    f"{source_name} is {image.size}, expected {EXPECTED_SIZE}"
                )
            image.convert("RGB").save(
                output_path,
                "WEBP",
                quality=WEBP_QUALITY,
                method=WEBP_METHOD,
            )
        written.append(output_path)

    expected_paths = set(written)
    actual_paths = set(OUTPUT_DIR.glob("*-motion-v1.webp"))
    if actual_paths != expected_paths:
        missing = sorted(path.name for path in expected_paths - actual_paths)
        extra = sorted(path.name for path in actual_paths - expected_paths)
        raise RuntimeError(
            f"Motion runtime output mismatch: missing={missing}, extra={extra}"
        )

    hashes = set()
    total_bytes = 0
    for output_path in written:
        payload = output_path.read_bytes()
        hashes.add(hashlib.sha256(payload).hexdigest())
        total_bytes += len(payload)
        with Image.open(output_path) as image:
            if image.format != "WEBP" or image.size != EXPECTED_SIZE:
                raise RuntimeError(
                    f"Invalid motion runtime card {output_path.name}: "
                    f"format={image.format}, size={image.size}"
                )

    if len(hashes) != len(written):
        raise RuntimeError(
            f"Expected {len(written)} unique motion cards, found {len(hashes)} hashes"
        )

    print(
        f"Built and verified {len(written)} unique {EXPECTED_SIZE[0]}x"
        f"{EXPECTED_SIZE[1]} motion WebP cards "
        f"({total_bytes / 1024 / 1024:.2f} MiB) in {OUTPUT_DIR}"
    )


if __name__ == "__main__":
    build()
