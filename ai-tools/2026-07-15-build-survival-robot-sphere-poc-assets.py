"""Build transparent sandbox cutouts from the approved character proof sheets."""

from __future__ import annotations

from collections import deque
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
CANVAS_SIZE = 512

SURVIVAL_ROOT = ROOT / "sprites" / "character" / "survival-miner-poc-v1"
ROBOT_ROOT = ROOT / "sprites" / "character" / "robot-sphere-poc-v1"

SURVIVAL_SOURCE = SURVIVAL_ROOT / "reference" / "approved-action-proof.png"
ROBOT_SOURCE = ROBOT_ROOT / "reference" / "approved-arc-core-proof.png"

SURVIVAL_POSES = {
    "idle": (85, 5, 480, 440),
    "run": (535, 0, 1000, 450),
    "dig-side": (1030, 0, 1670, 450),
    "dig-vertical": (25, 465, 520, 930),
    "fly": (550, 465, 1010, 930),
    "quickslash": (1035, 470, 1670, 930),
}

ROBOT_POSES = {
    "closed": (210, 365, 570, 900),
    "hover": (530, 145, 1015, 900),
    "drill": (1018, 330, 1536, 990),
}


def _ensure_sources() -> None:
    missing = [path for path in (SURVIVAL_SOURCE, ROBOT_SOURCE) if not path.exists()]
    if missing:
        joined = "\n".join(str(path) for path in missing)
        raise FileNotFoundError(f"Missing approved proof source(s):\n{joined}")


def _background_model(rgb: np.ndarray) -> np.ndarray:
    height, width = rgb.shape[:2]
    yy, xx = np.mgrid[0:height, 0:width]
    x = xx.astype(np.float32) / max(1, width - 1)
    y = yy.astype(np.float32) / max(1, height - 1)
    features = np.stack((np.ones_like(x), x, y, x * y, x * x, y * y), axis=2)

    border_width = max(5, min(width, height) // 40)
    border = (xx < border_width) | (xx >= width - border_width) | (yy < border_width) | (yy >= height - border_width)
    sample_features = features[border]
    sample_rgb = rgb[border]
    keep = np.ones(sample_rgb.shape[0], dtype=bool)
    coefficients = None
    for _ in range(3):
        coefficients = np.stack(
            [np.linalg.lstsq(sample_features[keep], sample_rgb[keep, channel], rcond=None)[0] for channel in range(3)],
            axis=1,
        )
        predicted_samples = sample_features @ coefficients
        residual = np.linalg.norm(sample_rgb - predicted_samples, axis=1)
        keep = residual <= np.percentile(residual, 72)
    if coefficients is None:
        raise RuntimeError("Unable to fit proof-sheet background")
    return features @ coefficients


def _modeled_background_alpha(image: Image.Image, expand: int) -> Image.Image:
    rgb_image = image.convert("RGB")
    rgb = np.asarray(rgb_image, dtype=np.float32)
    background = _background_model(rgb)
    residual = np.linalg.norm(rgb - background, axis=2) / np.sqrt(3.0)
    luminance_delta = np.abs(rgb.mean(axis=2) - background.mean(axis=2))
    alpha = np.maximum(
        np.clip((residual - 3.5) / 18.0, 0.0, 1.0),
        np.clip((luminance_delta - 3.0) / 24.0, 0.0, 1.0),
    )
    alpha = np.where(alpha < 0.045, 0.0, alpha)
    alpha_image = Image.fromarray(np.uint8(alpha * 255), mode="L")
    if expand > 1:
        alpha_image = alpha_image.filter(ImageFilter.MaxFilter(expand))
    alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(0.9))

    rgba = rgb_image.convert("RGBA")
    rgba.putalpha(alpha_image)
    return rgba


def _light_background_alpha(image: Image.Image) -> Image.Image:
    return _modeled_background_alpha(image, 3)


def _dark_background_alpha(image: Image.Image) -> Image.Image:
    return _modeled_background_alpha(image, 17)


def _remove_small_alpha_components(image: Image.Image) -> Image.Image:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    subject = alpha >= 28
    height, width = subject.shape
    visited = np.zeros_like(subject, dtype=bool)
    keep = np.zeros_like(subject, dtype=bool)

    for start_y, start_x in zip(*np.nonzero(subject & ~visited)):
        if visited[start_y, start_x]:
            continue
        queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
        visited[start_y, start_x] = True
        component: list[tuple[int, int]] = []
        min_x = max_x = start_x
        min_y = max_y = start_y
        while queue:
            x, y = queue.popleft()
            component.append((x, y))
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
            for ny in range(max(0, y - 1), min(height, y + 2)):
                for nx in range(max(0, x - 1), min(width, x + 2)):
                    if subject[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        queue.append((nx, ny))
        component_width = max_x - min_x + 1
        component_height = max_y - min_y + 1
        if len(component) >= 500 and min(component_width, component_height) >= 6:
            for x, y in component:
                keep[y, x] = True

    cleaned_alpha = np.where(keep, alpha, 0).astype(np.uint8)
    cleaned = image.copy()
    cleaned.putalpha(Image.fromarray(cleaned_alpha, mode="L"))
    return cleaned


def _trim_and_anchor(image: Image.Image, max_extent: int = 478) -> Image.Image:
    image = _remove_small_alpha_components(image)
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        raise ValueError("Cutout produced an empty alpha mask")
    subject = image.crop(bbox)
    scale = min(max_extent / subject.width, max_extent / subject.height)
    size = (
        max(1, round(subject.width * scale)),
        max(1, round(subject.height * scale)),
    )
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    x = (CANVAS_SIZE - subject.width) // 2
    y = CANVAS_SIZE - subject.height - 10
    canvas.alpha_composite(subject, (x, y))
    return canvas


def _build_pose_set(
    source_path: Path,
    output_root: Path,
    poses: dict[str, tuple[int, int, int, int]],
    alpha_builder,
) -> dict[str, dict[str, object]]:
    source = Image.open(source_path).convert("RGB")
    runtime = output_root / "runtime"
    runtime.mkdir(parents=True, exist_ok=True)
    built: dict[str, dict[str, object]] = {}
    preview_frames: list[tuple[str, Image.Image]] = []

    for name, crop_box in poses.items():
        cutout = alpha_builder(source.crop(crop_box))
        anchored = _trim_and_anchor(cutout)
        output = runtime / f"{output_root.name}-{name}.png"
        anchored.save(output, optimize=True)
        built[name] = {
            "path": output.relative_to(ROOT).as_posix(),
            "canvas": [CANVAS_SIZE, CANVAS_SIZE],
            "crop": list(crop_box),
        }
        preview_frames.append((name, anchored))

    preview_dir = output_root / "previews"
    preview_dir.mkdir(parents=True, exist_ok=True)
    card_width = 300
    card_height = 340
    preview = Image.new("RGBA", (card_width * len(preview_frames), card_height), (16, 20, 25, 255))
    for index, (name, frame) in enumerate(preview_frames):
        display = frame.resize((280, 280), Image.Resampling.LANCZOS)
        preview.alpha_composite(display, (index * card_width + 10, 14))
        # Labels intentionally omitted; filenames and manifest keep the proof deterministic.
    preview.save(preview_dir / f"{output_root.name}-contact-sheet.png", optimize=True)
    return built


def main() -> None:
    _ensure_sources()
    survival = _build_pose_set(
        SURVIVAL_SOURCE,
        SURVIVAL_ROOT,
        SURVIVAL_POSES,
        _light_background_alpha,
    )
    robot = _build_pose_set(
        ROBOT_SOURCE,
        ROBOT_ROOT,
        ROBOT_POSES,
        _dark_background_alpha,
    )

    manifests = (
        (SURVIVAL_ROOT, "Survival Character proof-of-concept", survival, SURVIVAL_SOURCE),
        (ROBOT_ROOT, "Robot Sphere Arc Core proof-of-concept", robot, ROBOT_SOURCE),
    )
    for root, label, assets, source in manifests:
        payload = {
            "version": 1,
            "label": label,
            "scope": "testing/animation-sandbox/tanktest-v1 only",
            "source": source.relative_to(ROOT).as_posix(),
            "assets": assets,
        }
        (root / "manifest.json").write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")

    print(f"Built {len(survival)} survivor poses and {len(robot)} Robot Sphere poses")


if __name__ == "__main__":
    main()
