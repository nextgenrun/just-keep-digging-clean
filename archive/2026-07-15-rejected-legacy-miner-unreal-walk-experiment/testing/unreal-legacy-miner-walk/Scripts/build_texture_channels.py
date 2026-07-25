"""Create deterministic grayscale R/G/B texture inputs for Unreal capture."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


PROJECT_DIR = Path(__file__).resolve().parents[1]
SOURCE_PATH = PROJECT_DIR / "SourceAssets" / "Textures" / "T_LegacyMiner_texture_0.png"
OUTPUT_DIR = PROJECT_DIR / "SourceAssets" / "Textures"


source = Image.open(SOURCE_PATH).convert("RGB")
for channel_index, channel_name in enumerate(("R", "G", "B")):
    channel = source.getchannel(channel_index)
    output = Image.merge("RGB", (channel, channel, channel))
    output_path = OUTPUT_DIR / f"T_LegacyMiner_channel_{channel_name}.png"
    output.save(output_path, optimize=True)
    print(f"TEXTURE_CHANNEL_OK channel={channel_name} output={output_path}")
