"""Compile one existing Observatory plate into review-only GPU motion maps."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import types
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = (
    ROOT
    / "sprites/backgrounds/world-visual-v2/far/sky-cohesion-v1"
    / "2026-07-28-sky-13-level2-lower-iron-forge-haze-v1.webp"
)
TOWN_VIDEO = (
    ROOT
    / "sprites/backgrounds/start-zone-scenic-v1/living-background-v1"
    / "surface-town-air-v1.mp4"
)
OUTPUT = (
    ROOT
    / "testing/animation-sandbox"
    / "2026-08-30-observatory-realtime-depth-motion-v1/pack"
)
AUTHORING = ROOT / "values/observatoryRealtimeDepthMotionAuthoring.json"
SEGMENTATION_MODEL = "nvidia/segformer-b0-finetuned-ade-512-512"
DEPTH_REPOSITORY_COMMIT = "a561b849ebae10a6f5ef49e26c83cbbcd36c71bf"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalized(values: np.ndarray, low=1.0, high=99.0) -> np.ndarray:
    minimum, maximum = np.percentile(values, (low, high))
    return np.clip((values - minimum) / max(maximum - minimum, 1e-6), 0.0, 1.0)


def smoothstep(edge0: float, edge1: float, values: np.ndarray) -> np.ndarray:
    amount = np.clip((values - edge0) / max(edge1 - edge0, 1e-6), 0.0, 1.0)
    return amount * amount * (3.0 - 2.0 * amount)


def blurred(values: np.ndarray, radius: float) -> np.ndarray:
    image = Image.fromarray(np.uint8(np.clip(values, 0.0, 1.0) * 255.0), "L")
    return np.asarray(image.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0


def save_gray(path: Path, values: np.ndarray) -> None:
    Image.fromarray(np.uint8(np.round(np.clip(values, 0.0, 1.0) * 255.0)), "L").save(
        path, optimize=True
    )


def install_cv2_compatibility(torch_module) -> None:
    """Provide only the four OpenCV operations used by official depth inference."""
    functional = torch_module.nn.functional
    module = types.ModuleType("cv2")
    module.INTER_NEAREST = 0
    module.INTER_AREA = 3
    module.INTER_CUBIC = 2
    module.COLOR_BGR2RGB = 4

    def resize(array, size, interpolation=module.INTER_AREA):
        tensor = torch_module.from_numpy(np.asarray(array).copy()).float()
        grayscale = tensor.ndim == 2
        if grayscale:
            tensor = tensor[None, None]
        else:
            tensor = tensor.permute(2, 0, 1)[None]
        mode = "nearest" if interpolation == module.INTER_NEAREST else "bicubic"
        options = {} if mode == "nearest" else {"align_corners": False}
        result = functional.interpolate(tensor, size=(size[1], size[0]), mode=mode, **options)[0]
        return result[0].numpy() if grayscale else result.permute(1, 2, 0).numpy()

    module.resize = resize
    module.cvtColor = lambda array, _code: np.asarray(array)[..., ::-1].copy()
    sys.modules["cv2"] = module


def infer_depth(rgb: np.ndarray, repository: Path, checkpoint: Path) -> np.ndarray:
    import torch

    install_cv2_compatibility(torch)
    sys.path.insert(0, str(repository))
    from depth_anything_v2.dpt import DepthAnythingV2

    model = DepthAnythingV2(
        encoder="vits", features=64, out_channels=[48, 96, 192, 384]
    )
    model.load_state_dict(torch.load(checkpoint, map_location="cpu"))
    model.eval()
    with torch.inference_mode():
        depth = model.infer_image(rgb[..., ::-1].copy(), input_size=518)
    sys.modules.pop("cv2", None)
    return normalized(depth)


def infer_semantics(rgb_image: Image.Image, cache: Path):
    import torch
    from transformers import AutoImageProcessor, SegformerForSemanticSegmentation

    processor = AutoImageProcessor.from_pretrained(SEGMENTATION_MODEL, cache_dir=cache)
    model = SegformerForSemanticSegmentation.from_pretrained(
        SEGMENTATION_MODEL, cache_dir=cache
    ).eval()
    inputs = processor(images=rgb_image, return_tensors="pt")
    with torch.inference_mode():
        logits = model(**inputs).logits
        logits = torch.nn.functional.interpolate(
            logits,
            size=(rgb_image.height, rgb_image.width),
            mode="bilinear",
            align_corners=False,
        )[0]
        probabilities = logits.softmax(dim=0).cpu().numpy()
    labels = {int(key): value.lower() for key, value in model.config.id2label.items()}
    sky_ids = [key for key, value in labels.items() if value == "sky"]
    rigid_words = ("building", "house", "skyscraper", "tower", "bridge", "wall", "castle")
    rigid_ids = [key for key, value in labels.items() if any(word in value for word in rigid_words)]
    sky = probabilities[sky_ids].sum(axis=0) if sky_ids else np.zeros(rgb_image.size[::-1])
    rigid = probabilities[rigid_ids].sum(axis=0) if rigid_ids else np.zeros_like(sky)
    class_map = probabilities.argmax(axis=0).astype(np.uint8)
    return sky, rigid, class_map, getattr(model.config, "_commit_hash", None), labels


def authored_rigid_map(height: int, width: int, polygons: list[dict]) -> np.ndarray:
    result = np.zeros((height, width), dtype=np.float32)
    for polygon in polygons:
        mask = Image.new("L", (width, height), 0)
        points = [
            (round(point[0] * (width - 1)), round(point[1] * (height - 1)))
            for point in polygon["points"]
        ]
        ImageDraw.Draw(mask).polygon(points, fill=255)
        mask = mask.filter(ImageFilter.GaussianBlur(float(polygon["featherPx"])))
        result = np.maximum(result, np.asarray(mask, dtype=np.float32) / 255.0)
    return result


def build_motion_domains(
    rgb: np.ndarray, sky: np.ndarray, polygons: list[dict]
):
    height, width = sky.shape
    gray = rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    fine = np.abs(gray - blurred(gray, 3.0))
    medium = np.abs(blurred(gray, 4.0) - blurred(gray, 24.0))
    cloud_texture = normalized(blurred(fine * 0.12 + medium * 1.45, 3.5), 12.0, 97.0)
    y = np.linspace(0.0, 1.0, height, dtype=np.float32)[:, None]
    lower_prior = smoothstep(0.49, 0.67, y)
    upper_prior = 1.0 - smoothstep(0.49, 0.68, y)

    derived_rigid = authored_rigid_map(height, width, polygons)
    upper_cloud = smoothstep(0.10, 0.72, cloud_texture) * smoothstep(0.08, 0.58, sky)
    lower_cloud = smoothstep(0.07, 0.61, cloud_texture)
    upper = blurred(upper_cloud * upper_prior * (1.0 - derived_rigid), 4.0)
    lower = blurred(lower_cloud * lower_prior * (1.0 - derived_rigid), 6.0)
    return upper, lower, derived_rigid


def save_review(rgb: np.ndarray, upper: np.ndarray, lower: np.ndarray, rigid: np.ndarray, path: Path):
    overlay = rgb.copy()
    overlay = overlay * (1.0 - upper[..., None] * 0.38) + np.array([0.10, 0.68, 1.0]) * upper[..., None] * 0.38
    overlay = overlay * (1.0 - lower[..., None] * 0.42) + np.array([0.28, 1.0, 0.62]) * lower[..., None] * 0.42
    overlay = overlay * (1.0 - rigid[..., None] * 0.52) + np.array([1.0, 0.29, 0.16]) * rigid[..., None] * 0.52
    Image.fromarray(np.uint8(np.clip(overlay, 0.0, 1.0) * 255.0), "RGB").save(path, optimize=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth-repository", type=Path, required=True)
    parser.add_argument("--depth-checkpoint", type=Path, required=True)
    parser.add_argument("--model-cache", type=Path, required=True)
    args = parser.parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)

    image = Image.open(SOURCE).convert("RGB")
    authoring = json.loads(AUTHORING.read_text(encoding="utf-8"))
    if authoring["sourceWidth"] != image.width or authoring["sourceHeight"] != image.height:
        raise ValueError("Observatory rigid guards do not match the source dimensions")
    rgb = np.asarray(image, dtype=np.float32) / 255.0
    depth = infer_depth(rgb, args.depth_repository, args.depth_checkpoint)
    sky, semantic_rigid, class_map, segment_commit, labels = infer_semantics(image, args.model_cache)
    upper, lower, rigid = build_motion_domains(
        rgb, sky, authoring["rigidPolygons"]
    )

    save_gray(OUTPUT / "depth-v2-small.png", depth)
    save_gray(OUTPUT / "upper-cloud-mask.png", upper)
    save_gray(OUTPUT / "lower-cloud-mask.png", lower)
    save_gray(OUTPUT / "rigid-architecture-mask.png", rigid)
    save_gray(OUTPUT / "semantic-sky-probability.png", sky)
    save_gray(OUTPUT / "semantic-rigid-probability.png", semantic_rigid)
    motion_domains = np.uint8(np.round(np.clip(np.dstack([upper, lower, rigid]), 0.0, 1.0) * 255.0))
    Image.fromarray(motion_domains, "RGB").save(OUTPUT / "motion-domain-map.png", optimize=True)
    Image.fromarray(class_map, "L").save(OUTPUT / "semantic-class-map.png", optimize=True)
    save_review(rgb, upper, lower, rigid, OUTPUT / "mask-review.png")

    assets = sorted(path for path in OUTPUT.iterdir() if path.suffix == ".png")
    manifest = {
        "status": "review-only",
        "source": {
            "path": SOURCE.relative_to(ROOT).as_posix(),
            "sha256": sha256(SOURCE),
            "width": image.width,
            "height": image.height,
        },
        "townSquareGuard": {
            "path": TOWN_VIDEO.relative_to(ROOT).as_posix(),
            "sha256": sha256(TOWN_VIDEO),
            "modified": False,
        },
        "depthModel": {
            "name": "Depth Anything V2 Small",
            "repositoryCommit": DEPTH_REPOSITORY_COMMIT,
            "checkpointSha256": sha256(args.depth_checkpoint),
            "inputSize": 518,
        },
        "segmentationModel": {
            "name": SEGMENTATION_MODEL,
            "commit": segment_commit,
            "usedLabels": {str(key): value for key, value in labels.items() if value == "sky" or any(word in value for word in ("building", "house", "skyscraper", "tower", "bridge", "wall", "castle"))},
        },
        "coverage": {
            "upperCloud": round(float(upper.mean()), 5),
            "lowerCloud": round(float(lower.mean()), 5),
            "rigidArchitecture": round(float(rigid.mean()), 5),
        },
        "authoring": {
            "path": AUTHORING.relative_to(ROOT).as_posix(),
            "sha256": sha256(AUTHORING),
            "rigidPolygonCount": len(authoring["rigidPolygons"]),
        },
        "assets": {path.name: sha256(path) for path in assets},
    }
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
