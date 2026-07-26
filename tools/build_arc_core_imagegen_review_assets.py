"""Pack keyed Arc Core ImageGen boards into fixed Phaser sprite sheets.

Updated: 2026-07-26
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


COLS = 4
ROWS = 2
FRAME_SIZE = 512
FRAME_COUNT = COLS * ROWS


def _pack_board(source_path: Path, output_path: Path) -> None:
    board = Image.open(source_path).convert("RGBA")
    expected_ratio = COLS / ROWS
    actual_ratio = board.width / board.height
    if abs(actual_ratio - expected_ratio) > 0.01:
        raise ValueError(
            f"{source_path.name} must use a {COLS}x{ROWS} board ratio; "
            f"received {board.width}x{board.height}"
        )

    board = board.resize(
        (COLS * FRAME_SIZE, ROWS * FRAME_SIZE),
        Image.Resampling.LANCZOS,
    )
    packed = Image.new("RGBA", (FRAME_SIZE * FRAME_COUNT, FRAME_SIZE))

    for row in range(ROWS):
        for col in range(COLS):
            index = row * COLS + col
            left = col * FRAME_SIZE
            top = row * FRAME_SIZE
            cell = board.crop(
                (left, top, left + FRAME_SIZE, top + FRAME_SIZE),
            )
            packed.alpha_composite(cell, (index * FRAME_SIZE, 0))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    packed.save(output_path, optimize=True)
    print(
        f"Packed {source_path.name}: {board.width}x{board.height} -> "
        f"{output_path.name}: {packed.width}x{packed.height}"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--small-alpha", type=Path, required=True)
    parser.add_argument("--omega-alpha", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    outputs = (
        (
            args.small_alpha,
            args.output_dir / "2026-07-26-small-arc-runtime-sheet-v1.png",
        ),
        (
            args.omega_alpha,
            args.output_dir / "2026-07-26-omega-arc-runtime-sheet-v1.png",
        ),
    )
    for source_path, output_path in outputs:
        if output_path.exists():
            raise FileExistsError(f"Refusing to overwrite {output_path}")
        _pack_board(source_path, output_path)


if __name__ == "__main__":
    main()
