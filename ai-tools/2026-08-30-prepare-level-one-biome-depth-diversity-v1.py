"""Prepare exact ImageGen jobs for the Level One depth-diversity pass."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "level-one-biome-depth-diversity-v1"
SPEC_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-depth-diversity-specs-v1.json"
EXPANDED_SPEC_PATH = ROOT / "visual-approval-previews" / "level-one-biome-families-v3" / "2026-08-29-level-one-biome-50-family-expansion-specs-v3.json"
FIELD_PATH = ROOT / "values" / "levelOneBiomeField.js"
JOBS_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-depth-imagegen-jobs-v1.json"
PROMPTS_PATH = REVIEW_DIR / "2026-08-30-level-one-biome-depth-prompts-v1.md"
ROLE_IDS = ("background", "signature", "foreground")


def load_json(path: Path) -> dict[str, object]:
    return json.loads(path.read_text(encoding="utf-8"))


def profile_order() -> list[dict[str, str]]:
    pattern = re.compile(r'profile\("([^"]+)",\s*"([^"]+)",\s*"([^"]+)"')
    entries = [{"id": match[0], "label": match[1], "parentRegionId": match[2]} for match in pattern.findall(FIELD_PATH.read_text(encoding="utf-8"))]
    if len(entries) != 50 or len({entry["id"] for entry in entries}) != 50:
        raise RuntimeError("Expected exactly fifty Level One profiles")
    return entries


def build_families(spec: dict[str, object]) -> list[dict[str, object]]:
    expanded = load_json(EXPANDED_SPEC_PATH)["families"]
    directions = {entry["id"]: entry for entry in [*spec["baseFamilies"], *expanded]}
    expanded_ids = {entry["id"] for entry in expanded}
    experiments = {entry["familyId"]: entry["direction"] for entry in spec["experimentalVisuals"]}
    families = []
    for index, profile in enumerate(profile_order()):
        direction = directions.get(profile["id"])
        if not direction or direction["parentRegionId"] != profile["parentRegionId"]:
            raise RuntimeError(f"Missing or mismatched art direction for {profile['id']}")
        experimental_direction = experiments.get(profile["id"])
        families.append({**profile, "artDirection": direction["artDirection"], "expanded": profile["id"] in expanded_ids, "experimentalDirection": experimental_direction, "scenicRole": "background" if experimental_direction else ROLE_IDS[index % len(ROLE_IDS)]})
    return families


def ground_prompt(family: dict[str, object]) -> str:
    return "\n".join((
        "Use case: stylized-concept",
        "Asset type: production full-coverage 2D underground terrain material plate for UNDERSTAR gameplay",
        f"Primary request: Create the tertiary true ground-material plate for the {family['label']} biome. Use {family['artDirection']}. Make this a substantially different material composition from a simple object illustration and from a repeated generic rock texture.",
        "Scene/backdrop: No scene and no backdrop; show only one continuous edge-to-edge material surface.",
        "Subject: a broad side-view excavated geology face with multiple readable material scales, irregular strata, embedded motif fragments, eroded pockets, fractures, and natural local variation spread across the complete canvas.",
        "Style/medium: painterly high-detail premium dark-fantasy game environment texture, realistic tactile geology and embedded materials, readable at gameplay zoom, compatible with UNDERSTAR's restrained subterranean palette.",
        "Composition/framing: exact 1536x1024 landscape output, opaque material covering all four edges and every pixel, no single centered object, no horizon and no perspective scene.",
        "Lighting/mood: restrained low-key upper-left mineral relief, dark values with controlled local edge highlights, no bright wash.",
        "Constraints: fully opaque edge-to-edge image; no transparent gaps; no cavern scene; no sky; no floor plane; no rectangular frame or panel; no characters or creatures; no ore nodes, resources, collectibles, treasure, UI, icons, text, letters, logo, watermark, checkerboard, green screen, border, contact sheet, or multiple variants.",
    ))


def identity_prompt(family: dict[str, object]) -> str:
    experiment = f" Experimental hard-swap direction: {family['experimentalDirection']}. Apply this boldly and consistently across all four pieces." if family["experimentalDirection"] else ""
    return "\n".join((
        "Use case: sprites",
        "Asset type: production transparent 2x2 identity-kit atlas for an UNDERSTAR side-view underground biome",
        f"Primary request: Create four distinct but related identity pieces for {family['label']}, using {family['artDirection']}.{experiment}",
        "Required quadrant subjects: top-left one terrain buttress; top-right one embedded ground structure; bottom-left one compact foreground cluster; bottom-right one small grouped prop formation.",
        "Style/medium: painterly high-detail premium dark-fantasy game environment art with tactile rock, root, mineral, masonry, or metal materials; crisp silhouette readability at gameplay zoom.",
        "Composition/framing: exact 1536x1024 landscape RGBA canvas divided conceptually into four equal 768x512 quadrants; exactly one complete isolated object centered inside each quadrant; wide transparent gutters between every object and every outer edge; no object crosses a quadrant boundary.",
        "Lighting/mood: restrained low-key upper-left relief with small material glints and deep readable shadows.",
        "Constraints: genuinely transparent background and gutters; no visible grid, divider, panel, card, label, text, letters, numbering, icons, UI, characters, creatures, ore nodes, resources, collectibles, treasure, particles, logo, watermark, checkerboard, green screen, border, or cropped object edges.",
    ))


def scenic_prompt(family: dict[str, object]) -> str:
    role = family["scenicRole"]
    request = {"background": "one broad lower-contrast shallow-relief silhouette with three overlapping depth shelves, irregular internal passages, tapered broken ends, and a strong asymmetrical flow", "signature": "one unmistakable hero formation with a large asymmetric landmark silhouette, a bold central negative-space aperture, broken secondary masses, and distinctive construction", "foreground": "one compact crisp deeply shadowed decorative cluster with a strong diagonal or vertical silhouette, long irregular tips, overlapping fragments, and generous negative space"}[role]
    experiment = f" Hard-swap experiment: {family['experimentalDirection']} Be blunt and unmistakable: change the dominant color hierarchy, massing, and fantasy silhouette while keeping the stated parent geology visible at grounded edges." if family["experimentalDirection"] else ""
    return "\n".join((
        "Use case: stylized-concept",
        f"Asset type: production transparent alternate {role} composition for an UNDERSTAR side-view underground biome",
        f"Primary request: Create {request} for the {family['label']} biome. Use {family['artDirection']}. This must be a new composition, not a recolor or rearrangement of an existing asset.{experiment}",
        "Style/medium: painterly high-detail premium dark-fantasy game environment art, coherent tactile materials, readable at gameplay zoom.",
        "Composition/framing: exact 1536x1024 landscape RGBA output; one isolated connected formation; strict side-view orthographic presentation; genuine negative space and transparent margin on all four sides.",
        "Lighting/mood: dark restrained values, controlled local rim light, small material glints, no bright wash.",
        "Constraints: genuine alpha transparency; no full cavern scene, continuous floor, playable platform, rectangular card edge, characters, creatures, ore nodes, resources, collectibles, treasure, UI, icons, text, letters, logo, watermark, checkerboard, green screen, border, contact sheet, or multiple variants.",
    ))


def boundary_prompt(join: dict[str, object], variant_index: int) -> str:
    composition = "a long grounded diagonal cleft-bridge with interlocked teeth, one broken aperture, torn asymmetric ends, and a low heavy base" if variant_index == 1 else "an irregular rising fan where both materials braid through a bent central spine, with two open gaps, hanging fragments, and a wide grounded foot"
    return "\n".join((
        "Use case: stylized-concept",
        "Asset type: production transparent terrain-transition cutout for UNDERSTAR side-view gameplay",
        f"Primary request: Create transition variant {variant_index} for {join['label']}: {composition}. Interweave {join['materials']} so neither material reads as a flat half-and-half split.",
        "Style/medium: painterly high-detail premium dark-fantasy geology, tactile and readable at gameplay zoom, with a cohesive authored material handoff.",
        "Composition/framing: exact 1536x1024 landscape RGBA output; one connected grounded formation; irregular diagonal material boundary; transparent space around every outer edge; no straight horizontal dividing line.",
        "Lighting/mood: restrained upper-left mineral relief, dark values, small controlled edge glints.",
        "Constraints: genuine alpha transparency; no scene backdrop, full floor, rectangular panel, text, letters, characters, creatures, UI, icons, resources, collectibles, particles, logo, watermark, checkerboard, green screen, border, contact sheet, or multiple variants.",
    ))


def landmark_prompt(entry: dict[str, object], family: dict[str, object]) -> str:
    experiment = f" Apply the matching hard-swap palette and silhouette direction: {family['experimentalDirection']}" if family["experimentalDirection"] else ""
    return "\n".join((
        "Use case: stylized-concept",
        "Asset type: production rare major transparent landmark for UNDERSTAR side-view underground gameplay",
        f"Primary request: Create {entry['label']} for {family['label']}: {entry['subject']}. Use the material language {family['artDirection']}.{experiment}",
        "Style/medium: painterly high-detail premium dark-fantasy hero environment art, tactile materials, iconic silhouette, readable at gameplay zoom without resembling a UI emblem.",
        "Composition/framing: exact 1536x1024 landscape RGBA output; one monumental asymmetric connected formation occupying roughly 55-75% of the canvas; strong negative-space aperture; broad grounded visual weight; generous transparent outer margins; strict side-view orthographic presentation.",
        "Lighting/mood: deep restrained values with controlled local rim light and a few material glints; dramatic but not bright or emissive-washed.",
        "Constraints: genuine alpha transparency; no full cavern scene, continuous floor, playable platform, rectangular card, characters, creatures, ore nodes, resources, collectibles, treasure, UI, icons, text, letters, logo, watermark, checkerboard, green screen, border, contact sheet, or multiple variants.",
    ))


def job(job_id: str, category: str, prompt: str, target: str, **metadata) -> dict[str, object]:
    return {"id": job_id, "category": category, "prompt": prompt, "targetRelativePath": target, **metadata}


def build_jobs(spec: dict[str, object], families: list[dict[str, object]]) -> list[dict[str, object]]:
    jobs = []
    family_by_id = {entry["id"]: entry for entry in families}
    for family in families:
        family_id = family["id"]
        shared = {"familyId": family_id, "parentRegionId": family["parentRegionId"], "experimental": bool(family["experimentalDirection"])}
        jobs.append(job(f"ground:{family_id}", "ground", ground_prompt(family), f"visual-approval-previews/level-one-biome-depth-diversity-v1/sources/ground/2026-08-30-{family_id}-ground-material-tertiary-source-v2.png", **shared, variantId="tertiary"))
        jobs.append(job(f"scenic:{family_id}:{family['scenicRole']}", "scenic", scenic_prompt(family), f"visual-approval-previews/level-one-biome-depth-diversity-v1/sources/scenic/2026-08-30-{family_id}-{family['scenicRole']}-alternate-source-v1.png", **shared, roleId=family["scenicRole"]))
        if family["expanded"]:
            jobs.append(job(f"identity:{family_id}", "identity", identity_prompt(family), f"visual-approval-previews/level-one-biome-depth-diversity-v1/sources/identity-kits/2026-08-30-{family_id}-identity-kit-source-v1.png", **shared))
    for join in spec["boundaryJoins"]:
        for variant_index in (1, 2):
            jobs.append(job(f"boundary:{join['id']}:{variant_index}", "boundary", boundary_prompt(join, variant_index), f"visual-approval-previews/level-one-biome-depth-diversity-v1/sources/boundaries/2026-08-30-{join['id']}-transition-{variant_index}-source-v2.png", pairKey=join["pairKey"], joinId=join["id"], variantIndex=variant_index))
    for entry in spec["landmarks"]:
        family = family_by_id[entry["familyId"]]
        jobs.append(job(f"landmark:{entry['id']}", "landmark", landmark_prompt(entry, family), f"visual-approval-previews/level-one-biome-depth-diversity-v1/sources/landmarks/2026-08-30-{entry['id']}-source-v1.png", landmarkId=entry["id"], familyId=entry["familyId"], seedIndex=entry["seedIndex"]))
    expected = {"ground": 50, "identity": 30, "scenic": 50, "boundary": 14, "landmark": 12}
    counts = {category: sum(entry["category"] == category for entry in jobs) for category in expected}
    if counts != expected or len(jobs) != 156 or len({entry["id"] for entry in jobs}) != 156:
        raise RuntimeError(f"Invalid ImageGen job inventory: {counts}")
    return jobs


def write_prompt_manifest(jobs: list[dict[str, object]]) -> None:
    lines = ["# Level One Biome Depth Diversity ImageGen Prompts V1", "", "Generation mode: built-in ImageGen, one independent call per distinct source asset.", "", f"Total calls: {len(jobs)}.", ""]
    for entry in jobs:
        lines.extend((f"## `{entry['id']}`", "", f"Target: `{entry['targetRelativePath']}`", "", "```text", entry["prompt"], "```", ""))
    PROMPTS_PATH.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--emit-json", choices=("all", "ground", "identity", "scenic", "boundary", "landmark"))
    args = parser.parse_args()
    spec = load_json(SPEC_PATH)
    families = build_families(spec)
    jobs = build_jobs(spec, families)
    REVIEW_DIR.mkdir(parents=True, exist_ok=True)
    JOBS_PATH.write_text(json.dumps({"version": 1, "jobs": jobs}, indent=2) + "\n", encoding="utf-8")
    write_prompt_manifest(jobs)
    if args.emit_json:
        selected = jobs if args.emit_json == "all" else [entry for entry in jobs if entry["category"] == args.emit_json]
        print(json.dumps(selected))
    else:
        print(json.dumps({"jobs": len(jobs), "counts": {category: sum(entry["category"] == category for entry in jobs) for category in ("ground", "identity", "scenic", "boundary", "landmark")}, "jobManifest": JOBS_PATH.relative_to(ROOT).as_posix(), "promptManifest": PROMPTS_PATH.relative_to(ROOT).as_posix()}, indent=2))


if __name__ == "__main__":
    main()
