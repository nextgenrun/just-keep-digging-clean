"""Add the quality-gated effects passes to the Seedance EUR10 review plan."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "testing/animation-sandbox/2026-09-04-seedance-player-effects-eur10-v1/generation-plan.json"
FIRST = "references/fx-clean-first.png"
LAST = "references/fx-clean-last.png"


def profile(identifier: str, label: str, role: str, reference: str, seeds: list[int], motion: str) -> dict:
    prompt = (
        "Create one isolated forward-time 2D game aftereffect on the supplied pure-black locked plate. "
        "Use the supplied current-game art only as palette, material and rendering-style authority. "
        "Do not draw the referenced icon, tile, weapon, character, floor, scenery or UI. "
        "Keep the camera, crop, exposure and every untouched black pixel perfectly static. "
        "Hold completely clean through 0.25 seconds. " + motion + " "
        "The action must progress once, decelerate naturally, and fully disappear by 3.35 seconds so the final frame exactly matches the clean plate. "
        "No loop, rewind, reverse motion, ping-pong, suction return, rubberbanding, morphing, duplicated particles, texture crawl, flicker, smoke billboard, text, logo, UI or watermark. Silent."
    )
    return {
        "id": identifier,
        "label": label,
        "role": role,
        "duration": 4,
        "resolution": "720p",
        "aspectRatio": "16:9",
        "firstFrame": FIRST,
        "lastFrame": LAST,
        "references": [reference],
        "seeds": seeds,
        "prompt": prompt,
    }


def main() -> int:
    plan = json.loads(PLAN_PATH.read_text(encoding="utf-8"))
    plan["strategyRevision"] = {
        "date": "2026-09-04",
        "reason": "Calibration accepted isolated effects and rejected raw player-video use because of traversal, prop invention and identity drift.",
        "playerVideoDisposition": "reference-only; never direct runtime playback",
        "remainingSpendRule": "Two candidates per effect, then spend reserve only on failed high-frequency roles.",
    }
    plan["allocation"] = [
        {"stage": "calibration", "seconds": 48, "estimatedEur": 1.25, "purpose": "Player/effect feasibility gate"},
        {"stage": "core-effects-pass", "seconds": 96, "estimatedEur": 2.5, "purpose": "Frequent mining, break, XP, loot and movement feedback"},
        {"stage": "celestial-effects-pass", "seconds": 48, "estimatedEur": 1.25, "purpose": "Six signature power moments"},
        {"stage": "adaptive-reserve", "seconds": 168, "estimatedEur": 4.375, "purpose": "QA-driven replacements and highest-value extensions only"},
    ]
    plan["stages"]["core-effects"] = [
        profile("fx-stone-contact", "Stone contact", "masked-one-shot-aftereffect", "references/style-stone-contact.png", [26090501, 26090502],
                "At 0.42 seconds create one tight pale-gray impact cross at screen center, followed by eight to twelve angular stone chips and a low granular dust fan moving outward and down under gravity."),
        profile("fx-metal-contact", "Metal and ore contact", "masked-one-shot-aftereffect", "references/style-metal-contact.png", [26090511, 26090512],
                "At 0.42 seconds create one crisp warm-white contact flash at screen center, a narrow fan of six to ten short copper, iron and gold sparks, and three tiny angular ore chips that continue outward and fall."),
        profile("fx-crystal-contact", "Crystal contact", "masked-one-shot-aftereffect", "references/style-crystal-contact.png", [26090521, 26090522],
                "At 0.42 seconds create one sharp faceted crystal contact flash at screen center, six thin spectral rays, and eight small luminous crystal splinters that travel outward, rotate consistently and fade while continuing forward."),
        profile("fx-magma-contact", "Magma contact", "masked-one-shot-aftereffect", "references/style-magma-contact.png", [26090531, 26090532],
                "At 0.42 seconds create one compact ember-orange impact flare at screen center, four heavy glowing slag chips, six tiny hot sparks and three molten droplets that arc outward and fall without reversing."),
        profile("fx-dirt-break", "Dirt tile break", "masked-destructive-one-shot", "references/style-break-dirt.png", [26090541, 26090542],
                "At 0.42 seconds create one tile-sized dry-soil collapse centered in frame: twelve to eighteen irregular brown chunks, a dense low dust cone and a few grains that burst outward and down, then settle or leave the effect bounds."),
        profile("fx-stone-break", "Stone tile break", "masked-destructive-one-shot", "references/style-break-stone.png", [26090551, 26090552],
                "At 0.42 seconds create one tile-sized stone fracture centered in frame: a bright compression crack, ten to fourteen angular gray shards and a compact chalky dust ring, all moving outward and down under gravity."),
        profile("fx-crystal-break", "Crystal tile break", "masked-destructive-one-shot", "references/style-break-crystal.png", [26090561, 26090562],
                "At 0.42 seconds create one tile-sized crystal shatter centered in frame: a white-violet faceted core flash, ten sharp shards, fine glitter and a thin prismatic ring that expands once and fades."),
        profile("fx-xp-arrival", "XP arrival", "masked-ui-arrival-one-shot", "references/style-xp-gathering.png", [26090571, 26090572],
                "From 0.35 seconds, send three small emerald-and-gold motes along distinct curved paths from the lower sides into screen center; they arrive once near 1.15 seconds, compress into a bright pinprick and release one tiny gold ring before clearing."),
        profile("fx-level-up", "Level-up crest", "masked-ui-celebration-one-shot", "references/style-xp-gathering.png", [26090581, 26090582],
                "At 0.45 seconds build one compact emerald-and-gold level-up flourish at screen center: a crown-like star crest, a single expanding rune ring and six upward rays, reaching its peak near 1.05 seconds and dissolving upward."),
        profile("fx-rare-pickup", "Rare pickup arrival", "masked-ui-arrival-one-shot", "references/style-xp-gathering.png", [26090591, 26090592],
                "From 0.35 seconds, curl five tiny emerald-and-gold glints upward around screen center in a short helix; converge once at 1.0 seconds into a warm reward flash with two small outward rings, then continue fading outward."),
        profile("fx-landing-dust", "Player landing dust", "masked-ground-one-shot", "references/style-break-dirt.png", [26090601, 26090602],
                "At 0.42 seconds create a low symmetrical landing response along an invisible ground line at screen center: two compact brown-gray dust puffs push left and right, six grains hop outward and fall, and the center clears immediately."),
        profile("fx-neutral-contact", "Tintable mining contact", "masked-one-shot-aftereffect", "references/style-material-icons.png", [26090611, 26090612],
                "At 0.42 seconds create one small neutral pale-gold impact cross at screen center, one thin compression ring and six short wedge-shaped streaks moving outward. Keep it clean and readable at 64-pixel game size with no material object."),
    ]
    plan["stages"]["celestial-effects"] = [
        profile("fx-wayward-bounce", "Wayward Star bounce", "additive-one-shot-aftereffect", "references/style-wayward-star.png", [26090701, 26090702],
                "At 0.42 seconds create one cyan-and-gold ricochet contact at screen center: a five-point star flash, a tight curved deflection arc toward the upper right and six tiny stardust sparks that keep traveling away."),
        profile("fx-hollow-pulse", "Hollow Sun pulse", "additive-one-shot-aftereffect", "references/style-hollow-sun.png", [26090711, 26090712],
                "At 0.42 seconds create one violet gravity pulse centered in frame: a dark circular core, a thin luminous lensing ring that expands once, three warped arc fragments and sparse purple motes drifting outward."),
        profile("fx-hollow-implosion", "Hollow Sun implosion", "additive-one-shot-aftereffect", "references/style-hollow-sun.png", [26090721, 26090722],
                "From 0.38 seconds draw twelve violet motes and three curved lensing arcs physically inward toward screen center; collapse once at 1.05 seconds into a tiny white-violet singularity flash, then extinguish without re-expanding."),
        profile("fx-lance-launch", "Stellar Lance launch", "additive-one-shot-aftereffect", "references/style-stellar-lance.png", [26090731, 26090732],
                "At 0.42 seconds launch one right-facing violet crescent energy wave from just left of screen center. It sharpens, travels continuously to the right with a short tapered plasma wake, exits the frame, and never stalls or reverses."),
        profile("fx-lance-impact", "Stellar Lance impact", "additive-one-shot-aftereffect", "references/style-stellar-lance.png", [26090741, 26090742],
                "At 0.42 seconds create one concentrated violet Stellar Lance impact at screen center: a white-hot contact core, one expanding purple ring, eight radial energy shards and a brief forward-right plasma spray."),
        profile("fx-star-heart-activation", "Star Heart activation", "additive-one-shot-aftereffect", "references/style-star-heart.png", [26090751, 26090752],
                "At 0.42 seconds create one turquoise, violet and gold Star Heart awakening flourish at screen center: three nested heart-like arcs lock into place, a star core flashes once, and a crown of fine rays rises and dissolves."),
    ]

    seconds = sum(
        item["duration"] * len(item["seeds"])
        for stage in plan["stages"].values()
        for item in stage
    )
    plan["estimate"]["committedFirstPassSeconds"] = seconds
    plan["estimate"]["committedFirstPassUsd"] = round(seconds * plan["estimate"]["usdPerSecond"], 6)
    plan["estimate"]["committedFirstPassEur"] = round(
        plan["estimate"]["committedFirstPassUsd"] / plan["currency"]["eurUsdReference"], 4
    )
    PLAN_PATH.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"stages": list(plan["stages"]), "committedFirstPassSeconds": seconds}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
