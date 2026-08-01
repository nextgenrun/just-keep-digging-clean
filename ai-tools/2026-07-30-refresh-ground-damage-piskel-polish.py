"""Apply or roll back the editable ground-damage Piskel work-project polish."""

from __future__ import annotations

import argparse
import importlib.util
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "exports/piskel/ground-damage-anchor-v2-review"
REGISTERED = EXPORT / "projects/registered-source"
POLISHED = EXPORT / "projects/polished-work"
ROLLBACK = EXPORT / "projects/polished-work-rollback-v1"
FAMILY_NAMES = (
    "diagonal-fracture",
    "reverse-shear",
    "horizontal-shear",
    "vertical-pressure",
    "stress-arc",
    "hooked-fault",
    "double-kink",
    "staggered-shear",
    "abrasion-first",
    "compression-crescents",
)
WORK_SEED = (136, 136)
FPS = 6
STATES = 12


def _load(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


POLISH_HELPER = _load(
    ROOT / "ai-tools/2026-07-30-ground-damage-piskel-polish.py",
    "ground_damage_piskel_polish",
)
PACKAGE = _load(
    ROOT / "ai-tools/2026-07-30-ground-damage-piskel-package.py",
    "ground_damage_piskel_package",
)


def _path(root: Path, variant: int) -> Path:
    return root / f"variant-{variant + 1:02d}-{FAMILY_NAMES[variant]}.piskel"


def apply_polish() -> None:
    ROLLBACK.mkdir(parents=True, exist_ok=True)
    POLISHED.mkdir(parents=True, exist_ok=True)
    for variant in range(10):
        source_path = _path(REGISTERED, variant)
        polished_path = _path(POLISHED, variant)
        rollback_path = _path(ROLLBACK, variant)
        if not source_path.is_file() or not polished_path.is_file():
            raise FileNotFoundError(f"Missing source/work pair for variant {variant + 1}")
        if not rollback_path.is_file():
            shutil.copy2(polished_path, rollback_path)
        source_frames, _source_data = PACKAGE.read_editable_project(
            source_path,
            expected_size=(272, 272),
            expected_frames=STATES,
            expected_fps=FPS,
        )
        frames, audit = POLISH_HELPER.polish_registered_frames(
            source_frames,
            variant,
            seed=WORK_SEED,
        )
        source_sha = PACKAGE.sha256(source_path)
        metadata = {
            "version": 2,
            "stage": "polished-work",
            "editable": True,
            "reviewOnly": True,
            "productionChanged": False,
            "workSeedPx": list(WORK_SEED),
            "sourceProject": PACKAGE.relative(source_path),
            "sourceSha256": source_sha,
            "rollbackProject": PACKAGE.relative(rollback_path),
            "rollbackSha256": PACKAGE.sha256(rollback_path),
            "styleRevision": "material-opacity-and-strongest-core-v2",
            "audit": audit,
            "pixelSha256": [PACKAGE.pixel_sha256(frame) for frame in frames],
        }
        document = PACKAGE.make_document(
            frames,
            document_id=f"ground-damage-{variant + 1:02d}-{FAMILY_NAMES[variant]}-polished-work",
            display_name=f"Ground damage {variant + 1:02d} {FAMILY_NAMES[variant]} polished work",
            fps=FPS,
            description="Editable non-cumulative Piskel polish authority; production is unchanged.",
            layer_name="Polished Current Pixels",
            polish_metadata=metadata,
            seed=WORK_SEED,
            safe_box=(46, 46, 226, 226),
        )
        PACKAGE.write_document(polished_path, document, frames, overwrite=True)
    print("Applied Piskel work-project polish revision 2")
    print(f"Rollback projects retained at {PACKAGE.relative(ROLLBACK)}")


def rollback_polish() -> None:
    for variant in range(10):
        rollback_path = _path(ROLLBACK, variant)
        polished_path = _path(POLISHED, variant)
        if not rollback_path.is_file():
            raise FileNotFoundError(f"Missing rollback project for variant {variant + 1}")
        shutil.copy2(rollback_path, polished_path)
    print("Restored all ten polished-work Piskels from rollback-v1")
    print("Run the V3 package builder to regenerate derived review outputs")


def main() -> None:
    parser = argparse.ArgumentParser()
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--apply", action="store_true")
    action.add_argument("--rollback", action="store_true")
    args = parser.parse_args()
    apply_polish() if args.apply else rollback_polish()


if __name__ == "__main__":
    main()
