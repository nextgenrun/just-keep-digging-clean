"""Contract for the review-only three-stage ground-damage Piskel polish."""

from __future__ import annotations

import hashlib
import importlib.util
import json
import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "exports/piskel/ground-damage-anchor-v2-review"
HELPER_PATH = ROOT / "ai-tools/2026-07-30-ground-damage-piskel-polish.py"
PISKEL_TOOLS = ROOT / "tools/piskel-mcp"
sys.path.insert(0, str(PISKEL_TOOLS))
from piskel_document import read_piskel  # noqa: E402

SUPPORT_ALPHA = 12
WORK_SIZE = (272, 272)
OUTPUT_SIZE = (188, 188)
WORK_SEED = [136, 136]
OUTPUT_SEED = [94, 94]
VISIBLE_ENVELOPE = [4, 4, 184, 184]
FRAME_COUNT = 12
FPS = 6


def load_helper():
    if not HELPER_PATH.is_file():
        raise AssertionError(f"Missing polish helper: {HELPER_PATH}")
    spec = importlib.util.spec_from_file_location("ground_damage_piskel_polish", HELPER_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Unable to load polish helper: {HELPER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixel_sha256(image: Image.Image) -> str:
    return hashlib.sha256(image.convert("RGBA").tobytes()).hexdigest()


def visible_mask(image: Image.Image) -> np.ndarray:
    return np.asarray(image.getchannel("A"), dtype=np.uint8) > SUPPORT_ALPHA


def visible_bounds(image: Image.Image) -> list[int] | None:
    ys, xs = np.where(visible_mask(image))
    if not len(xs):
        return None
    return [int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1]


class SyntheticPolishUnitContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.helper = load_helper()
        for name in (
            "cleanup_temporal_components",
            "previous_wins_merge",
            "ensure_seed_core",
        ):
            if not callable(getattr(cls.helper, name, None)):
                raise AssertionError(f"Polish helper is missing callable {name}()")

    @staticmethod
    def synthetic_registered_frames() -> list[Image.Image]:
        frames = [Image.new("RGBA", (64, 64), (0, 0, 0, 0)) for _ in range(12)]
        for frame in frames:
            ImageDraw.Draw(frame).rectangle((24, 31, 40, 33), fill=(80, 72, 66, 255))

        # One-state, tiny and isolated: automatic removal is safe.
        ImageDraw.Draw(frames[0]).rectangle((2, 2, 3, 3), fill=(210, 210, 210, 255))
        # Large one-state secondary branch: size protects it.
        ImageDraw.Draw(frames[2]).rectangle((48, 7, 56, 10), fill=(170, 160, 150, 255))
        # Small detached branch repeated in adjacent states: time protects it.
        for index in (4, 5):
            ImageDraw.Draw(frames[index]).rectangle(
                (7, 47, 10, 50),
                fill=(145, 135, 125, 255),
            )
        # Initially detached branch connects to the main fracture next state.
        ImageDraw.Draw(frames[7]).rectangle((44, 31, 47, 33), fill=(90, 82, 74, 255))
        ImageDraw.Draw(frames[8]).rectangle((40, 31, 47, 33), fill=(90, 82, 74, 255))
        return frames

    def test_temporal_cleanup_protects_structural_branches(self) -> None:
        cleaned, report = self.helper.cleanup_temporal_components(
            self.synthetic_registered_frames(),
            seed=(32, 32),
            support_alpha=SUPPORT_ALPHA,
            core_alpha=36,
            max_dust_area_px=24,
            bridge_px=2,
            future_attach_px=4,
        )
        self.assertEqual(len(cleaned), 12)
        self.assertEqual(cleaned[0].getpixel((2, 2))[3], 0)
        self.assertGreater(cleaned[2].getpixel((50, 8))[3], SUPPORT_ALPHA)
        self.assertGreater(cleaned[4].getpixel((8, 48))[3], SUPPORT_ALPHA)
        self.assertGreater(cleaned[5].getpixel((8, 48))[3], SUPPORT_ALPHA)
        self.assertGreater(cleaned[7].getpixel((45, 32))[3], SUPPORT_ALPHA)
        self.assertIn("removedComponents", report)
        self.assertIn("keptComponents", report)
        self.assertGreaterEqual(len(report["removedComponents"]), 1)

    def test_previous_wins_merge_preserves_existing_rgba(self) -> None:
        previous = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
        current = Image.new("RGBA", (24, 24), (0, 0, 0, 0))
        previous.putpixel((8, 8), (210, 30, 20, 180))
        current.putpixel((8, 8), (20, 70, 220, 255))
        current.putpixel((9, 8), (20, 180, 90, 200))
        merged = self.helper.previous_wins_merge(
            previous,
            current,
            support_alpha=SUPPORT_ALPHA,
        )
        self.assertEqual(merged.getpixel((8, 8)), previous.getpixel((8, 8)))
        self.assertEqual(merged.getpixel((9, 8)), current.getpixel((9, 8)))

    def test_ensure_seed_core_only_repairs_missing_core(self) -> None:
        frame = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
        frame.putpixel((15, 16), (100, 92, 84, 255))
        repaired = self.helper.ensure_seed_core(
            frame,
            seed=(16, 16),
            core_alpha=36,
            radius_px=1,
            core_rgba=(64, 58, 52, 255),
        )
        self.assertGreater(repaired.getpixel((16, 16))[3], 36)
        self.assertEqual(repaired.getpixel((15, 16)), frame.getpixel((15, 16)))
        second_pass = self.helper.ensure_seed_core(
            repaired,
            seed=(16, 16),
            core_alpha=36,
            radius_px=1,
            core_rgba=(64, 58, 52, 255),
        )
        self.assertEqual(second_pass.tobytes(), repaired.tobytes())


class PiskelPolishPackageContract(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        manifest_path = EXPORT / "manifest.json"
        report_path = EXPORT / "geometry-report.json"
        if not manifest_path.is_file() or not report_path.is_file():
            raise AssertionError("Missing ground-damage polish manifest or geometry report")
        cls.manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        cls.report = json.loads(report_path.read_text(encoding="utf-8"))
        cls.links = cls.manifest.get("projectLinks", [])

    def test_review_only_inventory_and_link_hashes(self) -> None:
        manifest = self.manifest
        self.assertIs(manifest["reviewOnly"], True)
        self.assertIs(manifest["productionChanged"], False)
        self.assertEqual(len(manifest["registeredSourceProjects"]), 10)
        self.assertEqual(len(manifest["polishedWorkProjects"]), 10)
        self.assertEqual(len(manifest["piskelProjects"]), 10)
        self.assertEqual(len(self.links), 10)

        for link in self.links:
            with self.subTest(variant=link["variant"]):
                source = ROOT / link["registeredSourceProject"]
                polished = ROOT / link["polishedWorkProject"]
                derived = ROOT / link["derivedProject"]
                self.assertIn("/projects/registered-source/", source.as_posix())
                self.assertIn("/projects/polished-work/", polished.as_posix())
                self.assertEqual(derived.parent.as_posix(), (EXPORT / "projects").as_posix())
                self.assertEqual(sha256(source), link["registeredSourceSha256"])
                self.assertEqual(sha256(polished), link["polishedWorkSha256"])
                self.assertEqual(sha256(derived), link["derivedSha256"])

    def test_source_polished_and_derived_piskel_contract(self) -> None:
        families = {entry["variant"]: entry for entry in self.report["families"]}
        for link in self.links:
            variant = int(link["variant"])
            with self.subTest(variant=variant):
                source_path = ROOT / link["registeredSourceProject"]
                polished_path = ROOT / link["polishedWorkProject"]
                derived_path = ROOT / link["derivedProject"]
                source, sw, sh, sfps = read_piskel(source_path)
                polished, pw, ph, pfps = read_piskel(polished_path)
                derived, dw, dh, dfps = read_piskel(derived_path)
                self.assertEqual((len(source), sw, sh, sfps), (FRAME_COUNT, *WORK_SIZE, FPS))
                self.assertEqual((len(polished), pw, ph, pfps), (FRAME_COUNT, *WORK_SIZE, FPS))
                self.assertEqual((len(derived), dw, dh, dfps), (FRAME_COUNT, *OUTPUT_SIZE, FPS))

                source_data = json.loads(source_path.read_text(encoding="utf-8"))
                polished_data = json.loads(polished_path.read_text(encoding="utf-8"))
                derived_data = json.loads(derived_path.read_text(encoding="utf-8"))
                source_meta = source_data["jkdPolish"]
                polished_meta = polished_data["jkdPolish"]
                derived_meta = derived_data["jkdPolish"]
                alignment = derived_data["jkdAlignment"]
                self.assertEqual(source_meta["stage"], "registered-source")
                self.assertIs(source_meta["immutable"], True)
                self.assertEqual(source_meta["workSeedPx"], WORK_SEED)
                self.assertEqual(polished_meta["stage"], "polished-work")
                self.assertIs(polished_meta["editable"], True)
                self.assertEqual(polished_meta["workSeedPx"], WORK_SEED)
                self.assertEqual(polished_meta["sourceProject"], link["registeredSourceProject"])
                self.assertEqual(polished_meta["sourceSha256"], link["registeredSourceSha256"])
                self.assertEqual(derived_meta["polishedWorkProject"], link["polishedWorkProject"])
                self.assertEqual(derived_meta["polishedWorkSha256"], link["polishedWorkSha256"])
                self.assertEqual(alignment["targetPivotPx"], OUTPUT_SEED)
                self.assertEqual(alignment["targetFractureSeedPx"], OUTPUT_SEED)

                transforms = alignment["normalizationTransforms"]
                self.assertEqual(len(transforms), FRAME_COUNT)
                matrices = {
                    json.dumps(item["matrix"], separators=(",", ":"))
                    for item in transforms
                }
                self.assertEqual(len(matrices), 1)
                self.assertEqual(
                    next(iter(matrices)),
                    json.dumps(alignment["sharedMatrix"], separators=(",", ":")),
                )
                expected_hashes = alignment["pixelSha256"]
                self.assertEqual(
                    [pixel_sha256(frame) for frame in derived],
                    expected_hashes,
                )

                previous = None
                for frame in derived:
                    bounds = visible_bounds(frame)
                    self.assertIsNotNone(bounds)
                    self.assertGreaterEqual(bounds[0], VISIBLE_ENVELOPE[0])
                    self.assertGreaterEqual(bounds[1], VISIBLE_ENVELOPE[1])
                    self.assertLessEqual(bounds[2], VISIBLE_ENVELOPE[2])
                    self.assertLessEqual(bounds[3], VISIBLE_ENVELOPE[3])
                    visible = visible_mask(frame)
                    if previous is not None and previous.any():
                        retained = float((visible & previous).sum() / previous.sum())
                        self.assertGreaterEqual(retained, 0.998)
                    previous = visible

                family = families[variant]
                scale = float(family["sharedScale"])
                self.assertAlmostEqual(scale, float(alignment["sharedScale"]), places=8)
                if variant in (1, 4, 10):
                    self.assertAlmostEqual(scale, 1.0, places=8)
                if variant in (5, 6):
                    registered_scale = float(family["registeredSharedScale"])
                    self.assertLess(scale, 1.0)
                    self.assertLessEqual(scale, registered_scale * 1.025)

    def test_production_isolation_guard(self) -> None:
        guard = self.manifest["productionGuard"]
        production = ROOT / guard["path"]
        self.assertEqual(sha256(production), guard["sha256"])
        self.assertIn("ground-damage-imagegen-v1.png", production.name)
        reviewed_paths = [
            self.manifest["candidateAtlas"],
            *self.manifest["registeredSourceProjects"],
            *self.manifest["polishedWorkProjects"],
        ]
        runtime_sources = (
            (ROOT / "values/worldVisualDamage.js").read_text(encoding="utf-8")
            + (ROOT / "ui/scenes/BootScene.js").read_text(encoding="utf-8")
        )
        for path in reviewed_paths:
            self.assertNotIn(path, runtime_sources)
        self.assertNotIn("ground-damage-anchor-v2-review", runtime_sources)


if __name__ == "__main__":
    unittest.main()
