"""Synthetic regression coverage for high-impact v2 sequence alignment."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))

from high_impact_v2_sequence import (  # noqa: E402
    OUTPUT_ALPHA_FLOOR,
    VISIBLE_ALPHA,
    normalize_sequence_row,
)


def legacy_reference(
    images: list[Image.Image],
    *,
    canvas_size: tuple[int, int],
    content_size: tuple[int, int],
    padding_px: int,
) -> list[Image.Image]:
    """Frozen copy of the pre-alignment implementation."""
    width = max(image.width for image in images)
    height = max(image.height for image in images)
    padded: list[Image.Image] = []
    union_alpha = np.zeros((height, width), dtype=np.uint8)
    for image in images:
        canvas = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        canvas.alpha_composite(
            image,
            ((width - image.width) // 2, (height - image.height) // 2),
        )
        padded.append(canvas)
        union_alpha = np.maximum(
            union_alpha,
            np.asarray(canvas.getchannel("A"), dtype=np.uint8),
        )
    ys, xs = np.where(union_alpha >= VISIBLE_ALPHA)
    if not len(xs):
        raise RuntimeError("Sequence row became empty after chroma removal")
    box = (
        max(0, int(xs.min()) - padding_px),
        max(0, int(ys.min()) - padding_px),
        min(width, int(xs.max()) + 1 + padding_px),
        min(height, int(ys.max()) + 1 + padding_px),
    )
    box_width, box_height = box[2] - box[0], box[3] - box[1]
    scale = min(content_size[0] / box_width, content_size[1] / box_height, 1.0)
    target = (max(1, round(box_width * scale)), max(1, round(box_height * scale)))
    normalized: list[Image.Image] = []
    for image in padded:
        frame = image.crop(box)
        if frame.size != target:
            frame = frame.resize(target, Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        canvas.alpha_composite(
            frame,
            ((canvas.width - frame.width) // 2, (canvas.height - frame.height) // 2),
        )
        array = np.asarray(canvas, dtype=np.uint8).copy()
        array[array[:, :, 3] < OUTPUT_ALPHA_FLOOR] = 0
        normalized.append(Image.fromarray(array, mode="RGBA"))
    return normalized


def opaque_box(
    size: tuple[int, int],
    bounds: tuple[int, int, int, int],
    color: tuple[int, int, int, int] = (210, 120, 40, 255),
) -> Image.Image:
    image = Image.new("RGBA", size, (0, 0, 0, 0))
    ImageDraw.Draw(image).rectangle(
        (bounds[0], bounds[1], bounds[2] - 1, bounds[3] - 1),
        fill=color,
    )
    return image


class SequenceAlignmentTests(unittest.TestCase):
    def test_legacy_path_is_byte_identical(self) -> None:
        images = [
            opaque_box((31, 24), (3, 5, 24, 21)),
            opaque_box((28, 29), (8, 2, 25, 26), (30, 160, 220, 180)),
            opaque_box((35, 21), (1, 7, 33, 19), (170, 40, 200, 255)),
        ]
        options = {
            "canvas_size": (48, 44),
            "content_size": (36, 31),
            "padding_px": 3,
        }
        expected = legacy_reference(images, **options)
        actual = normalize_sequence_row(images, **options)
        self.assertIsInstance(actual, list)
        self.assertEqual(
            [image.tobytes() for image in actual],
            [image.tobytes() for image in expected],
        )

    def test_asymmetric_sizes_share_contact(self) -> None:
        images = [
            opaque_box((47, 35), (7, 4, 42, 31)),
            opaque_box((32, 51), (2, 9, 29, 47), (40, 180, 100, 255)),
        ]
        frames, metadata = normalize_sequence_row(
            images,
            canvas_size=(96, 80),
            content_size=(80, 68),
            padding_px=2,
            source_anchors=[(24, 30), (11, 46)],
            target_contact=(48, 68),
            fit_bounds=[(7, 4, 42, 31), (2, 9, 29, 47)],
        )
        self.assertEqual(len(frames), 2)
        self.assertEqual(metadata["targetContactPx"], [48, 68])
        for frame in metadata["frames"]:
            self.assertEqual(frame["mappedContactPx"], [48, 68])
        self.assertGreater(max(frame.getchannel("A").getextrema()[1] for frame in frames), 0)

    def test_odd_even_parity_maps_contact_exactly(self) -> None:
        images = [
            opaque_box((101, 78), (1, 2, 100, 77)),
            opaque_box((100, 79), (0, 1, 99, 78), (80, 90, 230, 255)),
        ]
        _, metadata = normalize_sequence_row(
            images,
            canvas_size=(82, 70),
            content_size=(70, 58),
            padding_px=1,
            source_anchors=[(51, 72), (50, 73)],
            target_contact=(41, 61),
            fit_bounds=[(1, 2, 100, 77), (0, 1, 99, 78)],
        )
        self.assertGreater(metadata["sharedScale"], 0)
        self.assertLess(metadata["sharedScale"], 1)
        for frame in metadata["frames"]:
            self.assertEqual(frame["mappedContactPx"], [41, 61])
            self.assertTrue(all(isinstance(value, int) for value in frame["translationPx"]))

    def test_outlier_debris_does_not_control_fit(self) -> None:
        images = [
            opaque_box((160, 80), (60, 35, 101, 66)),
            opaque_box((160, 80), (60, 35, 101, 66), (60, 170, 210, 255)),
        ]
        images[1].putpixel((145, 20), (255, 220, 30, 255))
        frames, metadata = normalize_sequence_row(
            images,
            canvas_size=(200, 100),
            content_size=(100, 80),
            padding_px=2,
            source_anchors=[(80, 60), (80, 60)],
            target_contact=(100, 80),
            fit_bounds=[(60, 35, 101, 66), (60, 35, 101, 66)],
        )
        self.assertEqual(metadata["sharedScale"], 1.0)
        self.assertEqual(frames[1].getpixel((165, 40)), (255, 220, 30, 255))

    def test_faint_terminal_frame_uses_floor_fallback(self) -> None:
        strong = opaque_box((50, 40), (12, 9, 39, 35))
        faint = opaque_box((50, 40), (16, 13, 35, 34), (180, 220, 255, 4))
        frames, metadata = normalize_sequence_row(
            [strong, faint],
            canvas_size=(70, 58),
            content_size=(62, 50),
            padding_px=2,
            source_anchors=[(25, 34), (25, 34)],
            target_contact=(35, 50),
        )
        self.assertEqual(metadata["frames"][1]["fitAlphaThresholdUsed"], 3)
        self.assertGreaterEqual(frames[1].getchannel("A").getextrema()[1], 3)
        for frame in metadata["frames"]:
            self.assertEqual(frame["mappedContactPx"], [35, 50])


if __name__ == "__main__":
    unittest.main()
