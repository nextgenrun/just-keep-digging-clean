"""Build infinite-loop V4 previews for the clear Mixamo proof audit."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageSequence


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "testing/animation-sandbox/mixamo-proof-audit-v3/previews"
SOURCES = {
    "library": ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-library-v1/renders/candidate-runtime",
    "combat": ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-punch-sequence-sandbox-v1/renders/candidate",
    "locomotion": ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1/renders/candidate-runtime",
    "atlas": ROOT / "testing/blender-animation-lab-v1/review-drafts/mixamo-atlas-v2/renders/candidate-runtime",
}


def rebuild_preview(source: Path, destination: Path):
    with Image.open(source) as image:
        frames = [frame.convert("RGBA") for frame in ImageSequence.Iterator(image)]
        durations = [frame.info.get("duration", image.info.get("duration", 42)) for frame in ImageSequence.Iterator(image)]
    destination.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        destination,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        disposal=2,
        loop=0,
        optimize=True,
    )
    return {
        "frames": len(frames),
        "durationMs": sum(durations),
        "infiniteReplay": True,
    }


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "version": "mixamo-proof-audit-v3-20260820",
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeWired": False,
        "previews": {},
    }
    for family, source_root in SOURCES.items():
        for source in sorted(source_root.glob("*.gif")):
            name = f"{family}-{source.name}"
            details = rebuild_preview(source, OUTPUT / name)
            manifest["previews"][name] = {
                "source": source.relative_to(ROOT).as_posix(),
                **details,
            }
    if len(manifest["previews"]) != 44:
        raise RuntimeError(f"Expected 44 V4 proofs, got {len(manifest['previews'])}")
    (OUTPUT / "manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(f"MIXAMO_PROOF_AUDIT_V3_PREVIEWS_OK previews={len(manifest['previews'])} infinite=true")


if __name__ == "__main__":
    main()
