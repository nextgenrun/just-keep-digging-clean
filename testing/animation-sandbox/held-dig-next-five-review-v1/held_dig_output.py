"""Write review artifacts without exposing partial files to the browser."""

from __future__ import annotations

import os
from pathlib import Path
from tempfile import mkstemp
from time import sleep

from PIL import Image


def save_gif(frames: list[Image.Image], path: Path, duration_ms: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = mkstemp(
        prefix=f".{path.stem}-",
        suffix=".gif",
        dir=path.parent,
    )
    os.close(descriptor)
    temporary = Path(temporary_name)
    paletted = [
        frame.convert("P", palette=Image.Palette.ADAPTIVE, colors=255)
        for frame in frames
    ]
    try:
        paletted[0].save(
            temporary,
            save_all=True,
            append_images=paletted[1:],
            duration=duration_ms,
            loop=0,
            disposal=2,
            optimize=False,
        )
        for attempt in range(8):
            try:
                os.replace(temporary, path)
                return
            except OSError:
                if attempt == 7:
                    raise
                sleep(0.05 * (attempt + 1))
    finally:
        temporary.unlink(missing_ok=True)
