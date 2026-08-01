#!/usr/bin/env python3
"""Build the review-only Understar high-impact visual library.

This tool intentionally writes only beneath:
visual-approval-previews/2026-07-29-high-impact-review-library-v1/

It never writes to sprites/, values/, preloaders, scenes, or production manifests.
The library contains 1,000 authored ImageGen cells and nine deterministic,
first-generation derivatives per source for exactly 10,000 candidate PNG files.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import shutil
import statistics
import sys
import time
from typing import Any, Iterable

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
LIBRARY_ID = "2026-07-29-high-impact-review-library-v1"
OUTPUT_ROOT = ROOT / "visual-approval-previews" / LIBRARY_ID
GENERATED_ROOT = Path(
    r"C:\Users\Mila\.codex\generated_images\019faee2-4c52-7fa1-8534-7da6b082d0fa"
)
CHROMA_HELPER_PATH = Path(
    r"C:\Users\Mila\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py"
)

CANVAS_SIZE = (320, 256)
CONTENT_SIZE = (296, 234)
VISIBLE_ALPHA = 12
PNG_COMPRESS_LEVEL = 6

PROFILE_SLUGS = [
    "p00-source",
    "p01-restrained",
    "p02-emphasized",
    "p03-shadow-safe",
    "p04-highlight-safe",
    "p05-cool-context",
    "p06-warm-context",
    "p07-compact-read",
    "p08-broad-read",
    "p09-detail-alt",
]

MASTER_FILES = [
    "call_AcEta1UCemCRKpzDiq086lWJ.png",
    "call_A7l7kTzGXnEvckrzsKIr2IFV.png",
    "call_V58jO41Kx7lzGsDdUa4vbSjf.png",
    "call_JvpFhoTQdhjZ4q5qwQO7LN8h.png",
    "call_MJF6C9uzw5ZZs4tWKd2d1CHT.png",
    "call_2NGeSDiqWRCATxTnnIwh8QrN.png",
    "call_9suhb32tOP09FnVah9VwYRDW.png",
    "call_4XK7rPPskaXTiyMwdOQ1XoAZ.png",
    "call_xbPZHC4OxnfyyaMAYh82rdD0.png",
    "call_0E80gQw5vpd7HJn4ybglAyp0.png",
    "call_Wtca2zL9yrEVXCErZW9giE8w.png",
    "call_UY6Dfc2Pn4Qk98kHoYzF3r2h.png",
    "call_MrJr1gB7XsF3i2sBHeI4nyzP.png",
    "call_Qj6GUY3KYoPJlXIZdHMMOIm2.png",
    "call_IyadnpvflEqGWj5KYySc9PkQ.png",
    "call_rl6E7jCRVHOwGc6AFMkGi3vi.png",
    "call_THXmvzSN5BnTYvjccb1Tm8a9.png",
    "call_ocorXI5oN4srClUdG7omNfKB.png",
    "call_HSuwB3jqjZbE64fD0uBYChg8.png",
    "call_k5QbAuXwn3vjeErcU2OLB9fg.png",
    "call_kAzCCEPtH0pOtu6NHjs8sN9f.png",
    "call_p3X8iC1qv9T9YhPaGSBQi9Ne.png",
    "call_Z7dZ4cKuL9YAr1pjBRHH04WO.png",
    "call_xXCAJHu9lorHtbkFkoDhgFY6.png",
    "call_Wn8wd5EQJfovS13I3GC0II6B.png",
    "call_g0LUkWlJey436AOut78LnOkF.png",
    "call_ZgvRItcU2YIbTXrubsjgkXRc.png",
    "call_nF9mLn7T3lEZizdGNDvyqAr2.png",
    "call_ZCRfwJWFQQZR4ViN0TKVUVXM.png",
    "call_mGa0AZ9SykKfwE1zgLg1K2ZS.png",
    "call_lAEoUtkte1I53BW1GdMohJba.png",
    "call_8r5y08RwLQWcwJxBCnqivFYg.png",
    "call_KsQJzt6O846EeA9lbmKYHNwr.png",
    "call_5KKLExe9MfzGEFRlTFQDvC5W.png",
    "call_Z7yxANQyE4fzOdSRpGU6SX5k.png",
    "call_KWNDxiiLZdQW9LN7XuHJmwbz.png",
    "call_m8n0dBaTrQpJrckn30RbMX42.png",
    "call_x1B5l02Fqp2M5yGNL6IIMCq8.png",
    "call_ERAKDdz7SrcqSJU0TBBvWwMU.png",
    "call_jeWWPleH0UxDJG8litQ8OzHW.png",
    "call_fN2gKFde5RDQB35zrNZx15Yc.png",
]


def slug(value: str) -> str:
    result = []
    dash = False
    for char in value.lower():
        if char.isalnum():
            result.append(char)
            dash = False
        elif not dash:
            result.append("-")
            dash = True
    return "".join(result).strip("-")


def standalone_pack(
    pack_id: int,
    title: str,
    family: str,
    columns: int,
    rows: int,
    names: list[str],
    consumer: str,
    layer_blend: str,
    risk: str,
) -> dict[str, Any]:
    assert len(names) == columns * rows
    return {
        "id": f"m{pack_id:02d}",
        "title": title,
        "slug": slug(title),
        "family": family,
        "columns": columns,
        "rows": rows,
        "kind": "standalone-set",
        "names": [slug(name) for name in names],
        "rowGroups": [],
        "consumer": consumer,
        "layerBlend": layer_blend,
        "risk": risk,
    }


def sequence_pack(
    pack_id: int,
    title: str,
    family: str,
    row_groups: list[tuple[str, str]],
    consumer: str,
    layer_blend: str,
    risk: str,
    *,
    loop_rows: Iterable[int] = (),
    state_rows: Iterable[int] = (),
) -> dict[str, Any]:
    names: list[str] = []
    groups: list[dict[str, Any]] = []
    loop_set = set(loop_rows)
    state_set = set(state_rows)
    for row_index, (group_slug, label) in enumerate(row_groups):
        group_slug = slug(group_slug)
        group_kind = (
            "state-set"
            if row_index in state_set
            else ("ordered-loop" if row_index in loop_set else "ordered-one-shot")
        )
        group_names = [
            f"{group_slug}-s{state_index + 1:02d}"
            if group_kind == "state-set"
            else f"{group_slug}-f{frame_index + 1:02d}"
            for frame_index, state_index in zip(range(5), range(5))
        ]
        names.extend(group_names)
        groups.append(
            {
                "id": group_slug,
                "label": label,
                "row": row_index,
                "kind": group_kind,
                "loop": group_kind == "ordered-loop",
                "frameCount": 5,
                "names": group_names,
            }
        )
    assert len(row_groups) == 5
    return {
        "id": f"m{pack_id:02d}",
        "title": title,
        "slug": slug(title),
        "family": family,
        "columns": 5,
        "rows": 5,
        "kind": "sequence-or-state-sheet",
        "names": names,
        "rowGroups": groups,
        "consumer": consumer,
        "layerBlend": layer_blend,
        "risk": risk,
    }


PACKS: list[dict[str, Any]] = [
    standalone_pack(
        1,
        "Mining Earth and Stone Impact Primitives",
        "mining-fx",
        5,
        4,
        [
            "dry topsoil pick contact burst",
            "damp loam clod burst",
            "root thread soil impact",
            "compact clay impact fan",
            "loose gravel strike scatter",
            "weathered limestone chip burst",
            "slate splinter fan",
            "granite spark shard hit",
            "sandstone crumble cloud",
            "basalt heavy contact burst",
            "bedrock stress flash",
            "bedrock radial crack dust",
            "cave wall shallow strike",
            "cave wall deep strike",
            "reinforced stone final break burst",
            "downward drill dust cone",
            "sideways mining dust wake",
            "heavy punch stone shock ring",
            "overkill rubble bloom",
            "settling fine dust puff",
        ],
        "DigSystem and world mining-feedback dispatch",
        "world FX depth 35-37, NORMAL",
        "Contact origin must remain registered to the struck tile.",
    ),
    standalone_pack(
        2,
        "Mining Metal Crystal and Volcanic Primitives",
        "mining-fx",
        5,
        4,
        [
            "copper ore warm spark impact",
            "iron ore cold spark impact",
            "silver vein white glint impact",
            "gold vein rich chip impact",
            "industrial alloy strike",
            "blue crystal chip burst",
            "violet crystal resonance burst",
            "amber crystal splinter fan",
            "green geode fracture",
            "prismatic crystal critical hit",
            "obsidian glass shard strike",
            "blackglass razor fragment burst",
            "ember ore hit",
            "molten magma stone hit",
            "cooling slag fracture",
            "crystal final break bloom",
            "metal final break shrapnel",
            "magma final break eruption",
            "ore jackpot sparkle",
            "rare resource discovery pulse",
        ],
        "DigSystem material feedback and tile destruction",
        "world FX depth 35-39, NORMAL debris plus restrained ADD cores",
        "Material identity must survive fast mining and dark backgrounds.",
    ),
    standalone_pack(
        3,
        "Hero Ability VFX Primitives",
        "ability-fx",
        5,
        4,
        [
            "quickslash charge glint",
            "quickslash cyan violet blade arc",
            "quickslash contact crescent",
            "quickslash followthrough shards",
            "quickslash final cross slash",
            "thunder charge corona",
            "thunder vertical bolt",
            "thunder ground slam flare",
            "thunder chain echo ring",
            "thunder lingering crackles",
            "eclipse portal aperture effect",
            "teleport departure implosion",
            "teleport transit streak",
            "teleport arrival bloom",
            "twin foot flight ignition",
            "flight hover motes",
            "flight ascent thrust",
            "flight dash ribbon",
            "heavy punch orange crown",
            "gem power spend burst",
        ],
        "Quickslash, Thunder Strike, SpecialTileSystem, FlightFootParticleSystem",
        "player-front depth 38-45, ADD/SCREEN with NORMAL fragments",
        "Peak frames must align with authoritative ability event markers.",
    ),
    standalone_pack(
        4,
        "Rewards and Discoveries",
        "reward-fx",
        5,
        5,
        [
            "resource suction trail",
            "money pickup sparkle",
            "gem power pickup aura",
            "xp wisp",
            "rare drop locator glint",
            "chest discovery shimmer",
            "chest open rays",
            "ancient cache break dust",
            "ancient relic reveal halo",
            "relic attunement pulse",
            "geode pocket reveal",
            "crystal collection convergence",
            "glow crystal ambient sparkle",
            "geode completion ring",
            "rare crystal jackpot prism",
            "star block fracture",
            "star core release",
            "constellation line complete",
            "constellation node unlock",
            "star pillar attunement",
            "titan guidance resonance",
            "titan discovery ring",
            "titan chamber dust",
            "combo checkpoint bloom",
            "grand jackpot starburst",
        ],
        "LootPickupFxSystem, relic/star/titan/pillar discovery presentation",
        "world-front depth 36-40; NORMAL fragments, ADD rings/beams",
        "Reward hierarchy must preserve rarity and avoid visual inflation.",
    ),
    standalone_pack(
        5,
        "Ambient and Weather Primitives",
        "weather-ambient",
        5,
        5,
        [
            "foreground rain streak",
            "midground rain streak",
            "storm sheet streak",
            "rain ground splash",
            "rain ceiling impact",
            "rain ripple",
            "warm ground steam",
            "wind dust curl",
            "cave water drip",
            "wet rock micro splash",
            "distant snowflake",
            "foreground snow cluster",
            "snow powder landing",
            "icy breath mist",
            "frost crystal mote",
            "cave mist plume",
            "cave dust mote cluster",
            "volcanic ember cluster",
            "falling ash flecks",
            "magma steam plume",
            "cyan crystal glint",
            "root spore wisp",
            "abyss mote cluster",
            "gold ruin dust",
            "horizon lightning branch",
        ],
        "WeatherParticleController, WeatherImpactRainController, AmbientParticleSystem",
        "weather depth 56-58 and ambient depth near 33",
        "Overdraw and collision-aligned particle bounds must remain capped.",
    ),
    standalone_pack(
        6,
        "Reusable UI Chrome",
        "ui",
        5,
        5,
        [
            "modal shell",
            "modal header cap",
            "tooltip frame",
            "notification toast frame",
            "confirmation dialog frame",
            "content card normal",
            "content card hover",
            "content card selected",
            "content card locked",
            "content card warning",
            "button normal",
            "button hover",
            "button pressed",
            "button disabled",
            "tab normal",
            "tab selected",
            "slider track",
            "slider fill",
            "slider thumb",
            "scrollbar thumb",
            "toggle off",
            "toggle on",
            "checkbox frame empty",
            "horizontal divider",
            "circular badge frame empty",
        ],
        "UiModalShell and PhaserUiKit",
        "fixed UI near depth 3400, NORMAL",
        "Nine-slice margins, content safe areas, and state geometry must be authored later.",
    ),
    standalone_pack(
        7,
        "HUD and State Feedback",
        "ui",
        5,
        5,
        [
            "gem power meter frame",
            "gem power fill full",
            "gem power fill low",
            "xp meter frame",
            "xp meter fill",
            "combo medallion",
            "depth plate",
            "money plate",
            "resource plate",
            "buff timer chip",
            "cooldown ring base",
            "cooldown ring fill",
            "quickslash ready accent",
            "thunder ready accent",
            "flight ready accent",
            "heavy punch ready accent",
            "warning banner",
            "success banner",
            "failure banner",
            "objective card",
            "interaction prompt shell",
            "reward toast glow frame",
            "critical gp corners",
            "save activity orbit",
            "checkpoint halo",
        ],
        "HUDSystem, UINotificationSystem, ability readiness HUD",
        "fixed HUD depth 2500-3500",
        "States need shape-coded accessibility and cannot rely on hue alone.",
    ),
    standalone_pack(
        8,
        "Light Response Companions",
        "light-companion",
        5,
        5,
        [
            "player torch halo",
            "torch flicker lobe",
            "player edge rim",
            "flight underlight",
            "hazard warning glow",
            "cyan crystal aura",
            "violet crystal aura",
            "geode light fan",
            "teleport aperture glow",
            "ancient relic aura",
            "star pillar halo",
            "star pillar beam cap",
            "titan resonance glow",
            "common star aura",
            "rare star aura",
            "legendary star aura",
            "ancient star aura",
            "cosmic star aura",
            "void star aura",
            "blackglass rim pool",
            "echo gallery light pool",
            "rootbound light pool",
            "prism nursery light pool",
            "storm scar light pool",
            "ember fault light pool",
        ],
        "LightSystem decorative companions and owner-local auras",
        "ADD near darkness companion depth 900.5",
        "Decorative art must never expand authoritative reveal radius.",
    ),
    standalone_pack(
        9,
        "Graveborer and Cave Hazard Primitives",
        "hazard",
        5,
        5,
        [
            "wurm tremor ring",
            "wurm noise motes",
            "wurm ground warning",
            "wurm breach eruption",
            "wurm burrow ridge",
            "wurm passage debris",
            "wurm head impact",
            "wurm tail wake",
            "wurm missed pass dust",
            "wurm gp rupture",
            "gate dormant nodes",
            "gate warning nodes",
            "gate active beam",
            "gate crossing sparks",
            "gate hit burst",
            "spike floor crack",
            "spike tip glow",
            "spike emergence dust",
            "spike hit burst",
            "spike retraction dust",
            "vent dormant mark",
            "vent telegraph",
            "vent active core",
            "vent flame tongues",
            "vent cooling smoke",
        ],
        "GraveborerWurmVisualSystem and CaveHazardView",
        "hazard depth 18-18.05; Wurm warning/body near 81-82",
        "Telegraphs must remain registered to collision footprint and timing.",
    ),
    standalone_pack(
        10,
        "Underground Deep World Ambience",
        "weather-ambient",
        5,
        5,
        [
            "cave dust motes",
            "ceiling grit",
            "ceiling drip",
            "drip impact",
            "low mist curl",
            "floor fog patch",
            "cold breath puff",
            "air current streak",
            "root spore",
            "root pollen",
            "root sap glint",
            "root breath wisp",
            "crystal glint",
            "prism flare",
            "geode dust",
            "silver mica motes",
            "gold dust sparks",
            "ash flecks",
            "ember motes",
            "magma steam",
            "lava bubble pop",
            "heat curl",
            "soot gust",
            "pressure vent",
            "blackglass void motes",
        ],
        "AmbientParticleSystem and deep-world atmosphere",
        "ambient depth near 33",
        "Particles must remain sparse, pooled, capped, and FPS-gated.",
    ),
    standalone_pack(
        11,
        "Cave Identity and Traversal",
        "weather-ambient",
        5,
        3,
        [
            "echo gallery entry wave",
            "echo gallery sound ribbon",
            "rootbound entry spore veil",
            "rootbound organic pulse",
            "prism refraction fan",
            "prism dust",
            "storm scar entry flash",
            "storm scar static filament",
            "gilded entry dust curtain",
            "gilded glint trail",
            "ember fault heat gust",
            "ember fault cinder wake",
            "cave threshold mist",
            "safe checkpoint pulse",
            "exit return trail",
        ],
        "CaveAtmosphereSystem and CaveLevelPresentationSystem",
        "cave identity depth 17-20",
        "Identity effects must not resemble hazards, pickups, or collision geometry.",
    ),
]


SEQUENCE_SPECS = [
    (
        12,
        "Animated Soil Mining",
        "mining-fx",
        [
            ("dry-topsoil-cycle", "Dry topsoil hit to settle"),
            ("damp-loam-cycle", "Damp loam hit to settle"),
            ("root-thread-soil-cycle", "Root-thread soil tear"),
            ("compact-clay-cycle", "Compact clay fracture"),
            ("lateral-soil-dig-cycle", "Lateral soil digging"),
        ],
        "DigSystem and mining-feedback dispatch",
        "world FX depth 35-37, NORMAL",
        "Strike origin must remain tile-locked.",
        (),
    ),
    (
        13,
        "Animated Common Metal Mining",
        "mining-fx",
        [
            ("copper-break-cycle", "Copper impact-to-break"),
            ("bronze-break-cycle", "Bronze impact-to-break"),
            ("iron-break-cycle", "Iron impact-to-break"),
            ("steel-break-cycle", "Steel impact-to-break"),
            ("silver-break-cycle", "Silver impact-to-break"),
        ],
        "DigSystem material feedback",
        "world FX depth 35-38, NORMAL plus restrained ADD",
        "Five metals must remain recognizable at 94px scale.",
        (),
    ),
    (
        14,
        "Animated Precious and Volcanic Mining",
        "mining-fx",
        [
            ("gold-break-cycle", "Gold impact-to-break"),
            ("lava-soil-break-cycle", "Lava soil impact-to-break"),
            ("obsidian-shatter-cycle", "Obsidian shatter"),
            ("ember-ore-break-cycle", "Ember ore break"),
            ("magma-crystal-break-cycle", "Magma crystal break"),
        ],
        "DigSystem deep material feedback",
        "world FX depth 35-39",
        "Molten alpha must not wash out terrain silhouettes.",
        (),
    ),
    (
        15,
        "Unbreakable and Special Tile Feedback",
        "mining-fx",
        [
            ("bedrock-reject-cycle", "Bedrock reject"),
            ("cave-wall-reject-cycle", "Cave-wall reject"),
            ("geode-heavy-fracture-cycle", "Geode Heavy Punch fracture"),
            ("relic-cache-break-effect-cycle", "Ancient cache break effect"),
            ("special-block-activation-effect-cycle", "Special block activation effect"),
        ],
        "DigSystem, AncientRelicSystem, special-tile feedback",
        "world FX depth 35-40",
        "Reject cycles must never imply progressive damage.",
        (),
    ),
    (
        16,
        "Quickslash Animation FX",
        "ability-fx",
        [
            ("quickslash-windup", "Quickslash windup"),
            ("quickslash-main-arc", "Quickslash main arc"),
            ("quickslash-contact", "Quickslash tile contact"),
            ("quickslash-combo-trail", "Quickslash combo trail"),
            ("quickslash-gp-fizzle", "Quickslash insufficient-GP fizzle"),
        ],
        "Quickslash runtime and animation event markers",
        "player-front depth 38-43, ADD/SCREEN",
        "Origin, flipping, and strike peak must match the player sheet.",
        (),
    ),
    (
        17,
        "Thunder Strike Animation FX",
        "ability-fx",
        [
            ("thunder-charge", "Thunder charge"),
            ("thunder-bolt-descent", "Thunder bolt descent"),
            ("thunder-ground-slam", "Thunder ground slam"),
            ("thunder-chain-echo", "Thunder chain echo"),
            ("thunder-finale", "Thunder finale"),
        ],
        "ThunderStrikeImpactFxSystem and chain timing",
        "player/world front 40-995, ADD",
        "Escalation must follow authoritative timing and avoid strobe.",
        (),
    ),
    (
        18,
        "Teleport and Powered Flight Transitions",
        "ability-fx",
        [
            ("teleport-departure", "Teleport departure"),
            ("teleport-transit", "Dimensional transit"),
            ("teleport-arrival", "Teleport arrival"),
            ("flight-ignition", "Flight ignition"),
            ("flight-shutdown", "Flight shutdown"),
        ],
        "SpecialTileSystem and FlightFootParticleSystem",
        "player-front depth 38-45, ADD/SCREEN",
        "Teleport cancellation and reposition must be atomic.",
        (),
    ),
    (
        19,
        "Heavy Punch Gem Power and Arc Core FX",
        "ability-fx",
        [
            ("heavy-punch-charge", "Heavy Punch charge"),
            ("heavy-punch-impact", "Heavy Punch impact"),
            ("gem-power-charge", "Gem Power charge"),
            ("gem-power-spend", "Gem Power spend"),
            ("arc-core-pulse-effect", "Arc Core pulse effect"),
        ],
        "DigSystem and GP/ability feedback",
        "player-front depth 38-44",
        "Charge, paid activation, failure, and damage resolution must differ.",
        (),
    ),
    (
        20,
        "Player Locomotion Feedback",
        "ability-fx",
        [
            ("player-run-footfall", "Running footfall"),
            ("player-turn-skid", "Direction-turn skid"),
            ("player-moving-side-dig", "Moving side-dig trail"),
            ("player-flight-dash", "Flight dash"),
            ("player-touchdown", "Flight touchdown"),
        ],
        "Player locomotion and moving-side-dig runtime",
        "feet/player-adjacent depth 32-39",
        "Ground-contact effects must stay planted.",
        (),
    ),
    (
        21,
        "Player Damage Depletion and Recovery",
        "ability-fx",
        [
            ("player-hit-reaction", "Player hit"),
            ("player-gp-low-warning", "Low GP warning"),
            ("player-gp-empty", "GP-empty rupture"),
            ("player-gp-recovery", "GP recovery"),
            ("player-protection-shimmer", "Recovery protection"),
        ],
        "Player hit feedback and HUD state bridge",
        "player-front 42-48 and restrained fixed-camera accents",
        "Feedback must remain accessible without color alone.",
        (),
    ),
    (
        22,
        "Rain Collision Animation",
        "weather-ambient",
        [
            ("rain-drop-cycle", "Falling rain"),
            ("rain-ground-splash", "Ground splash"),
            ("rain-ceiling-impact", "Ceiling impact"),
            ("rain-puddle-ripple", "Puddle ripple"),
            ("rain-warm-steam", "Warm-ground steam"),
        ],
        "WeatherParticleController and WeatherImpactRainController",
        "weather depth 56-58",
        "Particle bounds must stay collision-aligned and atlas-friendly.",
        (),
    ),
    (
        23,
        "Snow Wind and Storm Animation",
        "weather-ambient",
        [
            ("snowflake-tumble-loop", "Snowflake tumble"),
            ("snow-landing", "Snow landing"),
            ("wind-dust-gust", "Wind dust gust"),
            ("lightning-fork-flash", "Lightning fork flash"),
            ("storm-edge-pulse", "Storm edge pulse"),
        ],
        "WeatherSnowController and WeatherLightningController",
        "weather depth 56-58 and lightning near 995",
        "Loops must not pop and lightning must avoid unsafe flashing.",
        (0,),
    ),
    (
        24,
        "Cave Ambient Animation Loops",
        "weather-ambient",
        [
            ("cave-dust-loop", "Cave dust"),
            ("cave-drip-loop", "Ceiling drip"),
            ("cave-mist-loop", "Cave mist"),
            ("root-spore-loop", "Root spore"),
            ("crystal-glint-loop", "Crystal glint"),
        ],
        "AmbientParticleSystem and CaveAtmosphereSystem",
        "ambient depth near 33",
        "Loops must remain sparse, pooled, and FPS-gated.",
        (0, 1, 2, 3, 4),
    ),
    (
        25,
        "Volcanic and Industrial Ambience Loops",
        "weather-ambient",
        [
            ("volcanic-ash-loop", "Ash fall"),
            ("volcanic-ember-loop", "Ember flicker"),
            ("volcanic-steam-loop", "Magma steam"),
            ("lava-bubble-cycle", "Lava bubble"),
            ("heat-distortion-loop", "Heat distortion"),
        ],
        "Deep-world ambient presentation",
        "ambient depth 30-34",
        "Heat assets may be better consumed as masks; fringes require review.",
        (0, 1, 2, 4),
    ),
    (
        26,
        "Player and Major Object Light Loops",
        "light-companion",
        [
            ("player-torch-light-loop", "Torch flicker"),
            ("player-flight-light-loop", "Flight underlight"),
            ("teleport-light-loop", "Teleport aperture light"),
            ("relic-aura-light-loop", "Relic aura"),
            ("titan-resonance-light-loop", "Titan resonance"),
        ],
        "LightSystem decorative companions",
        "ADD near darkness companion depth 900.5",
        "No asset may expand reveal radius.",
        (0, 1, 2, 3, 4),
    ),
    (
        27,
        "Celestial Crystal and Hazard Light Loops",
        "light-companion",
        [
            ("star-block-light-loop", "Star Block aura"),
            ("glow-crystal-light-loop", "Glow Crystal aura"),
            ("geode-prism-light-loop", "Geode prism light"),
            ("star-pillar-light-loop", "Star Pillar light"),
            ("hazard-warning-light-loop", "Hazard warning light"),
        ],
        "SkySteadyLightRenderer and owner-local light companions",
        "ADD/SCREEN near darkness depth 900.5",
        "Overlapping additive textures must not clip to white.",
        (0, 1, 2, 3, 4),
    ),
    (
        28,
        "Earthquake Animation FX",
        "hazard",
        [
            ("earthquake-floor-warning", "Floor warning crack"),
            ("earthquake-ceiling-fracture", "Ceiling fracture"),
            ("earthquake-falling-rock-passage", "Falling-rock passage"),
            ("earthquake-rock-impact", "Rock impact"),
            ("earthquake-rubble-settle", "Rubble return and settle"),
        ],
        "EarthquakeFallZoneView and EarthquakeRockImpactView",
        "hazard/world-front depth 18-40",
        "Visual phases must follow warning, collision, mutation, and return timing.",
        (),
    ),
    (
        29,
        "Deep World Machinery Ambient FX",
        "weather-ambient",
        [
            ("machine-pressure-vent-effect", "Pressure vent effect"),
            ("machine-piston-steam-effect", "Piston steam effect"),
            ("machine-gear-sparks-effect", "Gear spark effect"),
            ("machine-drill-exhaust-effect", "Drill exhaust effect"),
            ("machine-furnace-glow-effect", "Furnace glow effect"),
        ],
        "WorldBackgroundAmbientMotionSystem attachment points",
        "background/object-local depths",
        "Effect anchors must register to separately authored machinery objects.",
        (),
    ),
    (
        30,
        "Graveborer Wurm Encounter FX",
        "hazard",
        [
            ("wurm-warning-pulse", "Wurm warning"),
            ("wurm-breach-effect", "Wurm breach"),
            ("wurm-burrow-wake", "Wurm body wake"),
            ("wurm-head-impact-effect", "Wurm head impact"),
            ("wurm-exit-dust", "Wurm exit dust"),
        ],
        "GraveborerWurmVisualSystem",
        "warning depth 81 and encounter FX near 82",
        "Direction and timing must follow the procedural Wurm path.",
        (),
    ),
    (
        31,
        "Cave Hazard State Animation",
        "hazard",
        [
            ("gate-activation-effect", "Gate activation"),
            ("gate-deactivation-effect", "Gate deactivation"),
            ("spike-warning-effect", "Spike warning"),
            ("ember-vent-telegraph", "Ember vent telegraph"),
            ("ember-vent-eruption-effect", "Ember vent eruption"),
        ],
        "CaveHazardView and CaveHazardSystem",
        "base 18 and glow 18.05",
        "Telegraph frames must match authoritative collision-active periods.",
        (),
    ),
    (
        32,
        "Environmental Danger Telegraphs",
        "hazard",
        [
            ("fall-zone-warning", "Fall-zone warning"),
            ("rock-landing-marker", "Rock landing marker"),
            ("cave-in-warning", "Cave-in warning"),
            ("magma-overheat-warning", "Magma overheat warning"),
            ("ceiling-crack-warning", "Unstable ceiling warning"),
        ],
        "Earthquake and cave hazard views",
        "world hazard depth 17-20",
        "Footprints must remain exact and distinct from rewards and checkpoints.",
        (),
    ),
    (
        33,
        "Cave Archetype Identity Loops",
        "weather-ambient",
        [
            ("echo-gallery-loop", "Echo Gallery resonance"),
            ("rootbound-hollow-loop", "Rootbound breathing energy"),
            ("prism-nursery-loop", "Prism refraction"),
            ("storm-scar-loop", "Storm Scar static"),
            ("gilded-burrow-loop", "Gilded dust"),
        ],
        "CaveAtmosphereSystem and CaveLevelPresentationSystem",
        "cave identity depth 17-20",
        "Identity particles must not resemble hazards or collectibles.",
        (0, 1, 2, 3, 4),
    ),
    (
        34,
        "Level One Depth Band Identity Loops",
        "weather-ambient",
        [
            ("surface-pollen-loop", "Surface pollen"),
            ("upper-earth-dust-loop", "Upper Earth dust"),
            ("iron-strata-sparks-loop", "Iron Strata magnetic sparks"),
            ("gilded-fault-glint-loop", "Gilded Fault glints"),
            ("ancient-deep-void-loop", "Ancient Deep void"),
        ],
        "World depth presentation and ambient motion",
        "ambient world depth 30-34",
        "Band selection must blend gradually at authoritative boundaries.",
        (0, 1, 2, 3, 4),
    ),
    (
        35,
        "Level Two Biome Identity Loops",
        "weather-ambient",
        [
            ("ember-shelf-loop", "Ember Shelf"),
            ("obsidian-reach-loop", "Obsidian Reach"),
            ("magma-veins-loop", "Magma Veins"),
            ("core-expanse-loop", "Core Expanse"),
            ("ember-fault-loop", "Ember Fault"),
        ],
        "Second-world living backdrop and ambient motion",
        "ambient world depth 30-34",
        "Strong palettes must not flatten material readability.",
        (0, 1, 2, 3, 4),
    ),
    (
        36,
        "Core UI Control States",
        "ui",
        [
            ("ui-button-state", "Button states"),
            ("ui-card-state", "Card states"),
            ("ui-tab-state", "Tab states"),
            ("ui-toggle-state", "Toggle states"),
            ("ui-slider-state", "Slider states"),
        ],
        "PhaserUiKit and UiModalShell",
        "fixed UI near depth 3400",
        "Outer geometry and nine-slice margins cannot jump.",
        (),
    ),
    (
        37,
        "HUD Meter and Indicator States",
        "ui",
        [
            ("ui-gp-meter-state", "Gem Power states"),
            ("ui-xp-meter-state", "XP states"),
            ("ui-combo-medallion-state", "Combo states"),
            ("ui-cooldown-ring-state", "Cooldown states"),
            ("ui-depth-plate-state", "Depth/proximity states"),
        ],
        "HUDSystem and ability/resource indicators",
        "fixed HUD depth 2500-3500",
        "State changes must be legible without hue alone.",
        (),
    ),
    (
        38,
        "Inventory and Resource Guide States",
        "ui",
        [
            ("ui-resource-slot-state", "Resource slot states"),
            ("ui-equipment-slot-state", "Equipment slot states"),
            ("ui-rarity-frame-state", "Rarity frame states"),
            ("ui-quantity-badge-state", "Quantity badge states"),
            ("ui-world-tile-preview-state", "World tile preview states"),
        ],
        "Inventory and resource-guide overlays",
        "fixed modal UI near 3400",
        "No baked quantities/icons and content-safe areas must remain fixed.",
        (),
    ),
    (
        39,
        "Starlight Talent and Star Heart States",
        "ui",
        [
            ("ui-talent-node-state", "Talent node states"),
            ("ui-talent-connector-state", "Connector states"),
            ("ui-talent-navigation-state", "Navigation states"),
            ("ui-engine-option-state", "Engine option states"),
            ("ui-star-heart-frame-state", "Star Heart frame states"),
        ],
        "StarlightTalentTreeView and StarHeartOverlay",
        "fixed modal UI near 3400",
        "Visual states must map one-to-one to the existing state machine.",
        (),
    ),
    (
        40,
        "Hardcore Notification and Transfer States",
        "ui",
        [
            ("ui-hardcore-medallion-state", "Hardcore status states"),
            ("ui-notification-severity-state", "Notification severity states"),
            ("ui-death-recap-card-state", "Death recap states"),
            ("ui-save-transfer-state", "Save transfer states"),
            ("ui-modal-severity-state", "Modal severity states"),
        ],
        "Hardcore HUD, recap, notification, and save transfer views",
        "fixed UI 2600-3600",
        "High-stakes status must prioritize unambiguous meaning.",
        (),
    ),
    (
        41,
        "Shop Journey Archive Map and Carousel States",
        "ui",
        [
            ("ui-shop-offer-state", "Shop offer states"),
            ("ui-journey-checkpoint-state", "Journey checkpoint states"),
            ("ui-titan-archive-state", "Titan Archive states"),
            ("ui-world-map-marker-state", "World map marker states"),
            ("ui-carousel-card-state", "Notification carousel states"),
        ],
        "Shop, Journey, Titan Archive, World Map, and notification carousel",
        "fixed modal UI near 3400",
        "Existing layout, hit areas, and navigation cannot be redefined.",
        (),
    ),
]

for (
    pack_id,
    title,
    family,
    row_groups,
    consumer,
    layer_blend,
    risk,
    loop_rows,
) in SEQUENCE_SPECS:
    PACKS.append(
        sequence_pack(
            pack_id,
            title,
            family,
            row_groups,
            consumer,
            layer_blend,
            risk,
            loop_rows=loop_rows,
            state_rows=(0, 1, 2, 3, 4) if family == "ui" else (),
        )
    )

PACKS.sort(key=lambda item: item["id"])
assert len(PACKS) == 41
assert sum(pack["columns"] * pack["rows"] for pack in PACKS) == 1000
assert len(MASTER_FILES) == len(PACKS)
for pack, master_file in zip(PACKS, MASTER_FILES):
    pack["generatedFile"] = master_file


def load_chroma_helper():
    if not CHROMA_HELPER_PATH.exists():
        raise FileNotFoundError(CHROMA_HELPER_PATH)
    spec = importlib.util.spec_from_file_location("imagegen_remove_chroma_key", CHROMA_HELPER_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {CHROMA_HELPER_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CHROMA = load_chroma_helper()


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def rgba_sha(image: Image.Image) -> str:
    return sha256_bytes(image.convert("RGBA").tobytes())


def png_save(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(
        path,
        format="PNG",
        compress_level=PNG_COMPRESS_LEVEL,
        optimize=False,
    )


def alpha_bbox(image: Image.Image, threshold: int = 8) -> tuple[int, int, int, int] | None:
    alpha = np.asarray(image.getchannel("A"), dtype=np.uint8)
    ys, xs = np.where(alpha >= threshold)
    if not len(xs):
        return None
    return int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1


def normalize_frame(image: Image.Image) -> Image.Image:
    bbox = alpha_bbox(image)
    if bbox is None:
        raise RuntimeError("No visible alpha after chroma removal")
    crop = image.crop(bbox)
    scale = min(CONTENT_SIZE[0] / crop.width, CONTENT_SIZE[1] / crop.height, 1.0)
    target = (
        max(1, int(round(crop.width * scale))),
        max(1, int(round(crop.height * scale))),
    )
    if target != crop.size:
        crop = crop.resize(target, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS_SIZE, (0, 0, 0, 0))
    x = (CANVAS_SIZE[0] - crop.width) // 2
    y = (CANVAS_SIZE[1] - crop.height) // 2
    canvas.alpha_composite(crop, (x, y))
    arr = np.asarray(canvas, dtype=np.uint8).copy()
    arr[arr[:, :, 3] < 3] = 0
    return Image.fromarray(arr, mode="RGBA")


def crop_cell(master: Image.Image, columns: int, rows: int, index: int) -> Image.Image:
    row, column = divmod(index, columns)
    left = round(column * master.width / columns)
    right = round((column + 1) * master.width / columns)
    top = round(row * master.height / rows)
    bottom = round((row + 1) * master.height / rows)
    cell_width = right - left
    cell_height = bottom - top
    inset = max(4, int(round(min(cell_width, cell_height) * 0.028)))
    if cell_width > inset * 2 + 16 and cell_height > inset * 2 + 16:
        left += inset
        right -= inset
        top += inset
        bottom -= inset
    return master.crop((left, top, right, bottom)).convert("RGBA")


def remove_cell_chroma(cell: Image.Image) -> tuple[Image.Image, tuple[int, int, int], list[str]]:
    warnings: list[str] = []
    key = CHROMA._sample_border_key(cell, "border")
    rgba = cell.copy()
    CHROMA._apply_alpha_to_image(
        rgba,
        key=key,
        tolerance=12,
        spill_cleanup=True,
        soft_matte=True,
        transparent_threshold=12.0,
        opaque_threshold=220.0,
    )
    rgba = CHROMA._apply_edge_feather(rgba, 1.0)
    visible = int(np.count_nonzero(np.asarray(rgba.getchannel("A")) > VISIBLE_ALPHA))
    if visible < 32:
        warnings.append("chroma-fallback-used")
        rgba = cell.copy()
        CHROMA._apply_alpha_to_image(
            rgba,
            key=key,
            tolerance=6,
            spill_cleanup=True,
            soft_matte=True,
            transparent_threshold=6.0,
            opaque_threshold=96.0,
        )
        visible = int(np.count_nonzero(np.asarray(rgba.getchannel("A")) > VISIBLE_ALPHA))
    if visible < 16:
        raise RuntimeError(f"Cell became empty after chroma removal; sampled key={key}")
    return rgba, key, warnings


def checkerboard(size: tuple[int, int], cell: int = 12) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, (42, 45, 54))
    draw = ImageDraw.Draw(image)
    colors = ((42, 45, 54), (57, 61, 71))
    for y in range(0, height, cell):
        for x in range(0, width, cell):
            draw.rectangle(
                (x, y, min(width, x + cell), min(height, y + cell)),
                fill=colors[((x // cell) + (y // cell)) % 2],
            )
    return image


def fit_thumbnail(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(size, Image.Resampling.LANCZOS)
    return copy


def font(size: int) -> ImageFont.ImageFont:
    for candidate in (
        Path(r"C:\Windows\Fonts\segoeui.ttf"),
        Path(r"C:\Windows\Fonts\arial.ttf"),
    ):
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def visible_stats(image: Image.Image) -> dict[str, Any]:
    rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[:, :, 3]
    visible = alpha > VISIBLE_ALPHA
    # Avoid uint8 overflow in the chroma-dominance thresholds below.
    rgb = rgba[:, :, :3].astype(np.int16)
    bbox = alpha_bbox(image, VISIBLE_ALPHA)
    if bbox is None:
        raise RuntimeError("No visible alpha")
    corners = [
        int(alpha[0, 0]),
        int(alpha[0, -1]),
        int(alpha[-1, 0]),
        int(alpha[-1, -1]),
    ]
    key_leak = np.logical_and(
        visible,
        np.logical_or(
            np.logical_and(
                rgb[:, :, 0] > np.maximum(rgb[:, :, 1], rgb[:, :, 2]) + 95,
                rgb[:, :, 2] > rgb[:, :, 1] + 95,
            ),
            rgb[:, :, 1] > np.maximum(rgb[:, :, 0], rgb[:, :, 2]) + 100,
        ),
    )
    return {
        "alphaMin": int(alpha.min()),
        "alphaMax": int(alpha.max()),
        "visibleAlphaPixels": int(np.count_nonzero(visible)),
        "alphaCoverage": round(float(np.mean(visible)), 6),
        "visibleBounds": {
            "x": bbox[0],
            "y": bbox[1],
            "width": bbox[2] - bbox[0],
            "height": bbox[3] - bbox[1],
        },
        "cornerAlphaMax": max(corners),
        "residualStrongKeyPixels": int(np.count_nonzero(key_leak)),
    }


def stable_seed(source_id: str, profile_slug: str, sequence_group: str | None) -> int:
    identity = sequence_group or source_id
    payload = f"{LIBRARY_ID}|{identity}|{profile_slug}".encode("utf-8")
    return int.from_bytes(hashlib.sha256(payload).digest()[:8], "big")


def contrast_array(rgb: np.ndarray, factor: float) -> np.ndarray:
    return np.clip((rgb - 127.5) * factor + 127.5, 0, 255)


def saturation_array(rgb: np.ndarray, factor: float) -> np.ndarray:
    luminance = (
        rgb[:, :, 0:1] * 0.2126
        + rgb[:, :, 1:2] * 0.7152
        + rgb[:, :, 2:3] * 0.0722
    )
    return np.clip(luminance + (rgb - luminance) * factor, 0, 255)


def derive_image(
    source: Image.Image,
    profile_slug: str,
    family: str,
    source_id: str,
    sequence_group: str | None,
) -> tuple[Image.Image, dict[str, Any]]:
    if profile_slug == "p00-source":
        return source.copy(), {"operations": ["canonical-source"]}

    arr = np.asarray(source.convert("RGBA"), dtype=np.uint8)
    rgb = arr[:, :, :3].astype(np.float32)
    alpha = arr[:, :, 3].copy()
    visible = alpha > 0
    locked = family in {"ui", "hazard"}
    operations: list[str] = []

    if profile_slug == "p01-restrained":
        rgb = saturation_array(rgb, 0.9)
        rgb = contrast_array(rgb, 0.94)
        if not locked:
            scaled = np.maximum(1, np.round(alpha[visible].astype(np.float32) * 0.82))
            alpha[visible] = np.clip(scaled, 1, 255).astype(np.uint8)
            operations.append("alpha-visible-x0.82")
        operations.extend(["saturation-x0.90", "contrast-x0.94"])
    elif profile_slug == "p02-emphasized":
        rgb = saturation_array(rgb, 1.08)
        rgb = contrast_array(rgb, 1.14)
        operations.extend(["saturation-x1.08", "contrast-x1.14"])
    elif profile_slug == "p03-shadow-safe":
        normalized = rgb / 255.0
        lift = (1.0 - normalized) * 24.0
        weight = np.clip((110.0 - rgb.mean(axis=2, keepdims=True)) / 110.0, 0.0, 1.0)
        rgb = np.clip(rgb + lift * weight, 0, 255)
        operations.append("midtone-shadow-lift")
    elif profile_slug == "p04-highlight-safe":
        normalized = np.clip(rgb / 255.0, 0.0, 1.0)
        rgb = np.power(normalized, 1.12) * 242.0
        rgb = contrast_array(rgb, 1.04)
        operations.extend(["highlight-compress", "dark-keyline-contrast"])
    elif profile_slug in {"p05-cool-context", "p06-warm-context"}:
        channel_range = rgb.max(axis=2) - rgb.min(axis=2)
        fringe = alpha < 176
        neutral = channel_range < 52
        mask = np.logical_and(visible, np.logical_or(fringe, neutral))
        target = (
            np.array([54.0, 165.0, 224.0], dtype=np.float32)
            if profile_slug == "p05-cool-context"
            else np.array([234.0, 157.0, 70.0], dtype=np.float32)
        )
        strength = 0.11
        rgb[mask] = rgb[mask] * (1.0 - strength) + target * strength
        operations.append("neutral-and-fringe-context-tint")
    elif profile_slug == "p07-compact-read":
        base = Image.fromarray(np.dstack([rgb.astype(np.uint8), alpha]), "RGBA")
        softened = base.filter(ImageFilter.GaussianBlur(radius=0.65))
        soft_arr = np.asarray(softened, dtype=np.uint8)[:, :, :3].astype(np.float32)
        rgb = rgb * 0.72 + soft_arr * 0.28
        rgb = contrast_array(rgb, 1.08)
        operations.extend(["internal-detail-simplify", "edge-clarity"])
    elif profile_slug == "p08-broad-read":
        base_rgb = Image.fromarray(rgb.astype(np.uint8), "RGB")
        blur = np.asarray(base_rgb.filter(ImageFilter.GaussianBlur(radius=2.1)), dtype=np.uint8)
        low_alpha_weight = ((255.0 - alpha.astype(np.float32)) / 255.0)[:, :, None]
        rgb = np.clip(rgb + blur.astype(np.float32) * low_alpha_weight * 0.13, 0, 255)
        rgb = saturation_array(rgb, 1.04)
        operations.extend(["within-support-fringe-lift", "saturation-x1.04"])
    elif profile_slug == "p09-detail-alt":
        seed = stable_seed(source_id, profile_slug, sequence_group)
        rng = np.random.Generator(np.random.PCG64(seed))
        noise_small = rng.normal(0.0, 1.0, (32, 40)).astype(np.float32)
        noise = Image.fromarray(
            np.clip((noise_small + 3.0) * 36.0, 0, 255).astype(np.uint8), "L"
        ).resize(CANVAS_SIZE, Image.Resampling.BICUBIC)
        noise_arr = np.asarray(noise, dtype=np.float32)
        noise_arr = (noise_arr - noise_arr.mean()) / max(1.0, noise_arr.std())
        grain = np.clip(noise_arr, -2.5, 2.5)[:, :, None] * 3.0
        rgb = np.clip(rgb + grain * (alpha[:, :, None].astype(np.float32) / 255.0), 0, 255)
        operations.append("group-seeded-canvas-microtexture")
    else:
        raise ValueError(profile_slug)

    out = np.zeros_like(arr)
    out[:, :, :3] = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
    out[:, :, 3] = alpha
    out[~visible] = 0
    image = Image.fromarray(out, mode="RGBA")

    if rgba_sha(image) == rgba_sha(source):
        fallback = np.asarray(image, dtype=np.uint8).copy()
        coords = np.argwhere(fallback[:, :, 3] > VISIBLE_ALPHA)
        if not len(coords):
            raise RuntimeError(f"Could not make derivative distinct for {source_id} {profile_slug}")
        y, x = coords[len(coords) // 2]
        channel = int(stable_seed(source_id, profile_slug, sequence_group) % 3)
        value = int(fallback[y, x, channel])
        fallback[y, x, channel] = value - 1 if value > 0 else 1
        image = Image.fromarray(fallback, mode="RGBA")
        operations.append("deterministic-visible-pixel-distinction")

    return image, {"operations": operations}


def write_readmes() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    documents = {
        OUTPUT_ROOT / "readme.md": f"""# High-impact review library v1

Review-only visual candidates for Understar. This package contains exactly
1,000 authored source assets and 9,000 deterministic first-generation
derivatives. It is pending approval, is not production eligible, and is not
wired into Phaser.

Production code must never load files directly from this folder. Later
promotion must copy only explicitly approved IDs into a separate runtime pack.
""",
        OUTPUT_ROOT / "masters" / "readme.md": "Original 41 ImageGen review masters. Never loaded by runtime.\n",
        OUTPUT_ROOT / "sources" / "readme.md": "1,000 transparent authored source candidates, profile p00.\n",
        OUTPUT_ROOT / "derivatives" / "readme.md": "9,000 deterministic review derivatives, profiles p01-p09.\n",
        OUTPUT_ROOT / "catalog" / "readme.md": "Static review catalogs and lineage matrices. Not runtime assets.\n",
        OUTPUT_ROOT / "mockups" / "readme.md": "Offline placement composites. Every image must be marked NOT WIRED.\n",
    }
    for path, text in documents.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")


def build_sources() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    masters_dir = OUTPUT_ROOT / "masters"
    sources_dir = OUTPUT_ROOT / "sources"
    source_records: list[dict[str, Any]] = []
    master_records: list[dict[str, Any]] = []
    global_index = 0

    for pack in PACKS:
        master_source = GENERATED_ROOT / pack["generatedFile"]
        if not master_source.exists():
            raise FileNotFoundError(master_source)
        master_name = f"{pack['id']}-{pack['slug']}.png"
        master_copy = masters_dir / master_name
        shutil.copy2(master_source, master_copy)

        with Image.open(master_source) as loaded:
            master = loaded.convert("RGBA")

        master_start = global_index + 1
        source_ids: list[str] = []
        sampled_keys: list[str] = []
        pack_warnings: list[str] = []

        group_by_row = {group["row"]: group for group in pack["rowGroups"]}
        for cell_index, semantic_name in enumerate(pack["names"]):
            global_index += 1
            row, column = divmod(cell_index, pack["columns"])
            source_id = f"a{global_index:04d}-{semantic_name}"
            source_ids.append(source_id)
            raw_cell = crop_cell(master, pack["columns"], pack["rows"], cell_index)
            keyed, key, warnings = remove_cell_chroma(raw_cell)
            sampled_keys.append(f"#{key[0]:02x}{key[1]:02x}{key[2]:02x}")
            normalized = normalize_frame(keyed)
            source_path = sources_dir / f"{source_id}.png"
            png_save(normalized, source_path)
            stats = visible_stats(normalized)
            if stats["cornerAlphaMax"] != 0:
                warnings.append("opaque-corner")
            if not (0.0001 <= stats["alphaCoverage"] <= 0.86):
                warnings.append("alpha-coverage-outlier")
            if stats["residualStrongKeyPixels"] > 0:
                warnings.append("residual-strong-key-pixels")

            group = group_by_row.get(row)
            sequence_group = f"{pack['id']}-{group['id']}" if group else None
            group_frame = column if group else None
            record = {
                "id": source_id,
                "globalIndex": global_index,
                "profileSlug": "p00-source",
                "family": pack["family"],
                "masterId": pack["id"],
                "semanticName": semantic_name,
                "role": group["label"] if group else semantic_name.replace("-", " "),
                "sourceCell": {"row": row, "column": column, "index": cell_index},
                "sequenceGroup": sequence_group,
                "frameIndex": group_frame,
                "frameCount": group["frameCount"] if group else None,
                "sequenceKind": group["kind"] if group else "unordered-variant",
                "loop": group["loop"] if group else False,
                "pivot": {"x": 0.5, "y": 0.5},
                "contactAnchor": {"x": 0.5, "y": 0.5},
                "path": source_path.relative_to(OUTPUT_ROOT).as_posix(),
                "width": normalized.width,
                "height": normalized.height,
                "bytes": source_path.stat().st_size,
                "decodedRgbaBytes": normalized.width * normalized.height * 4,
                "sha256": sha256_file(source_path),
                "rgbaSha256": rgba_sha(normalized),
                "sampledKey": sampled_keys[-1],
                "qa": {**stats, "warnings": sorted(set(warnings))},
                "approvalStatus": "pending",
                "runtimeWired": False,
                "productionEligible": False,
            }
            source_records.append(record)
            pack_warnings.extend(warnings)

        master_records.append(
            {
                "id": pack["id"],
                "title": pack["title"],
                "family": pack["family"],
                "kind": pack["kind"],
                "path": master_copy.relative_to(OUTPUT_ROOT).as_posix(),
                "generatedSource": str(master_source),
                "grid": {"columns": pack["columns"], "rows": pack["rows"]},
                "expectedCount": pack["columns"] * pack["rows"],
                "globalRange": [master_start, global_index],
                "sourceIds": source_ids,
                "dimensions": {"width": master.width, "height": master.height},
                "sampledKeys": sorted(set(sampled_keys)),
                "consumer": pack["consumer"],
                "layerBlend": pack["layerBlend"],
                "primaryRisk": pack["risk"],
                "warnings": sorted(set(pack_warnings)),
                "sha256": sha256_file(master_copy),
            }
        )
        print(f"Sources {pack['id']}: {master_start:04d}-{global_index:04d}")

    if global_index != 1000 or len(source_records) != 1000:
        raise RuntimeError(f"Expected 1000 sources, got {global_index}")
    return master_records, source_records


def build_derivatives(source_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sources_dir = OUTPUT_ROOT / "sources"
    derivatives_dir = OUTPUT_ROOT / "derivatives"
    derivative_records: list[dict[str, Any]] = []

    for source_number, source_record in enumerate(source_records, start=1):
        source_path = sources_dir / Path(source_record["path"]).name
        with Image.open(source_path) as loaded:
            source = loaded.convert("RGBA")
        source_rgba_sha = rgba_sha(source)
        for ordinal, profile_slug in enumerate(PROFILE_SLUGS[1:], start=1):
            derived, derivation = derive_image(
                source,
                profile_slug,
                source_record["family"],
                source_record["id"],
                source_record["sequenceGroup"],
            )
            output_path = derivatives_dir / f"{source_record['id']}__{profile_slug}.png"
            png_save(derived, output_path)
            stats = visible_stats(derived)
            derivative_records.append(
                {
                    "id": f"{source_record['id']}__{profile_slug}",
                    "sourceId": source_record["id"],
                    "sourceMasterId": source_record["masterId"],
                    "variantIndex": ordinal,
                    "profileSlug": profile_slug,
                    "family": source_record["family"],
                    "role": source_record["role"],
                    "sequenceGroup": source_record["sequenceGroup"],
                    "frameIndex": source_record["frameIndex"],
                    "path": output_path.relative_to(OUTPUT_ROOT).as_posix(),
                    "width": derived.width,
                    "height": derived.height,
                    "bytes": output_path.stat().st_size,
                    "decodedRgbaBytes": derived.width * derived.height * 4,
                    "sha256": sha256_file(output_path),
                    "rgbaSha256": rgba_sha(derived),
                    "lineage": {
                        "sourceId": source_record["id"],
                        "sourceFileSha256": source_record["sha256"],
                        "sourceRgbaSha256": source_rgba_sha,
                        "derivationDepth": 1,
                        "profileSlug": profile_slug,
                        "recipeOrdinal": ordinal,
                        "seed": str(
                            stable_seed(
                                source_record["id"],
                                profile_slug,
                                source_record["sequenceGroup"],
                            )
                        ),
                        **derivation,
                    },
                    "qa": {**stats, "warnings": []},
                    "approvalStatus": "pending",
                    "runtimeWired": False,
                    "productionEligible": False,
                }
            )
        if source_number % 25 == 0:
            print(f"Derivatives: {source_number:04d}/1000 sources")

    if len(derivative_records) != 9000:
        raise RuntimeError(f"Expected 9000 derivatives, got {len(derivative_records)}")
    return derivative_records


def build_source_sheet(
    master_record: dict[str, Any],
    source_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    columns = master_record["grid"]["columns"]
    rows = master_record["grid"]["rows"]
    card_w, card_h = 250, 205
    header_h = 58
    sheet = Image.new("RGB", (columns * card_w, header_h + rows * card_h), (20, 23, 30))
    draw = ImageDraw.Draw(sheet)
    draw.text((18, 14), f"{master_record['id'].upper()} — {master_record['title']}", fill=(238, 241, 249), font=font(24))
    small = font(14)
    tiny = font(12)
    for cell_index, source_id in enumerate(master_record["sourceIds"]):
        row, column = divmod(cell_index, columns)
        x = column * card_w
        y = header_h + row * card_h
        card = checkerboard((card_w - 8, card_h - 8), 12)
        source_record = source_by_id[source_id]
        image_path = OUTPUT_ROOT / source_record["path"]
        with Image.open(image_path) as loaded:
            thumb = fit_thumbnail(loaded.convert("RGBA"), (220, 145))
        card_rgba = card.convert("RGBA")
        tx = (card_rgba.width - thumb.width) // 2
        ty = 6 + (145 - thumb.height) // 2
        card_rgba.alpha_composite(thumb, (tx, ty))
        card = card_rgba.convert("RGB")
        card_draw = ImageDraw.Draw(card)
        card_draw.rectangle((0, 0, card.width - 1, card.height - 1), outline=(82, 91, 111), width=1)
        card_draw.text((8, 154), f"{source_record['globalIndex']:04d}", fill=(107, 218, 255), font=small)
        label = source_record["semanticName"][:30]
        card_draw.text((8, 176), label, fill=(226, 230, 239), font=tiny)
        sheet.paste(card, (x + 4, y + 4))
    output = OUTPUT_ROOT / "catalog" / f"{master_record['id']}-authored-sources.png"
    sheet.save(output, format="PNG", compress_level=6, optimize=False)
    return {
        "kind": "authored-source-sheet",
        "masterId": master_record["id"],
        "path": output.relative_to(OUTPUT_ROOT).as_posix(),
        "sha256": sha256_file(output),
    }


def build_library_map(
    master_records: list[dict[str, Any]],
    source_by_id: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    columns = 5
    card_w, card_h = 300, 220
    rows = math.ceil(len(master_records) / columns)
    sheet = Image.new("RGB", (columns * card_w, 72 + rows * card_h), (16, 19, 26))
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 16), "UNDERSTAR — 1,000 authored sources / 10,000 review candidates", fill=(242, 244, 251), font=font(28))
    small = font(14)
    tiny = font(12)
    for index, master_record in enumerate(master_records):
        row, column = divmod(index, columns)
        x, y = column * card_w, 72 + row * card_h
        card = checkerboard((card_w - 10, card_h - 10), 14).convert("RGBA")
        representative = source_by_id[master_record["sourceIds"][len(master_record["sourceIds"]) // 2]]
        with Image.open(OUTPUT_ROOT / representative["path"]) as loaded:
            thumb = fit_thumbnail(loaded.convert("RGBA"), (250, 130))
        card.alpha_composite(thumb, ((card.width - thumb.width) // 2, 8 + (130 - thumb.height) // 2))
        card_draw = ImageDraw.Draw(card)
        card_draw.rectangle((0, 0, card.width - 1, card.height - 1), outline=(76, 88, 112), width=2)
        card_draw.text((10, 145), f"{master_record['id'].upper()}  {master_record['title'][:32]}", fill=(236, 239, 247), font=small)
        card_draw.text(
            (10, 172),
            f"{master_record['expectedCount']} sources · {master_record['family']}",
            fill=(121, 211, 244),
            font=tiny,
        )
        card_draw.text((10, 193), f"Risk: {master_record['primaryRisk'][:39]}", fill=(204, 179, 116), font=tiny)
        sheet.paste(card.convert("RGB"), (x + 5, y + 5))
    output = OUTPUT_ROOT / "catalog" / "00-library-map.png"
    sheet.save(output, format="PNG", compress_level=6, optimize=False)
    return {
        "kind": "library-map",
        "path": output.relative_to(OUTPUT_ROOT).as_posix(),
        "sha256": sha256_file(output),
    }


def build_lineage_pages(
    source_records: list[dict[str, Any]],
    derivative_records: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    derivatives_by_source: dict[str, list[dict[str, Any]]] = {}
    for record in derivative_records:
        derivatives_by_source.setdefault(record["sourceId"], []).append(record)
    for records in derivatives_by_source.values():
        records.sort(key=lambda item: item["variantIndex"])

    outputs: list[dict[str, Any]] = []
    thumb_w, thumb_h = 116, 88
    label_w = 238
    row_h = 116
    header_h = 74
    page_size = 10
    total_pages = math.ceil(len(source_records) / page_size)
    title_font = font(22)
    small = font(11)
    tiny = font(10)

    for page_index in range(total_pages):
        page_sources = source_records[page_index * page_size : (page_index + 1) * page_size]
        width = label_w + 10 * thumb_w
        height = header_h + len(page_sources) * row_h
        sheet = Image.new("RGB", (width, height), (18, 21, 28))
        draw = ImageDraw.Draw(sheet)
        draw.text((14, 10), f"Lineage matrix {page_index + 1:03d}/{total_pages:03d}", fill=(239, 242, 249), font=title_font)
        for column, profile_slug in enumerate(PROFILE_SLUGS):
            draw.text((label_w + column * thumb_w + 5, 46), profile_slug.replace("p0", "p"), fill=(112, 211, 245), font=tiny)
        for row_index, source_record in enumerate(page_sources):
            y = header_h + row_index * row_h
            draw.rectangle((0, y, width - 1, y + row_h - 1), fill=(24 + (row_index % 2) * 5, 28 + (row_index % 2) * 5, 37 + (row_index % 2) * 5))
            draw.text((10, y + 12), f"{source_record['globalIndex']:04d} {source_record['semanticName'][:28]}", fill=(232, 235, 243), font=small)
            draw.text((10, y + 38), source_record["family"], fill=(151, 185, 204), font=tiny)
            draw.text((10, y + 60), source_record["masterId"].upper(), fill=(195, 166, 101), font=tiny)
            lineage = [source_record] + derivatives_by_source[source_record["id"]]
            if len(lineage) != 10:
                raise RuntimeError(f"Lineage count mismatch for {source_record['id']}")
            for column, record in enumerate(lineage):
                image_path = OUTPUT_ROOT / record["path"]
                with Image.open(image_path) as loaded:
                    thumb = fit_thumbnail(loaded.convert("RGBA"), (thumb_w - 10, thumb_h - 8))
                tile = checkerboard((thumb_w - 4, thumb_h), 8).convert("RGBA")
                tile.alpha_composite(thumb, ((tile.width - thumb.width) // 2, (tile.height - thumb.height) // 2))
                x = label_w + column * thumb_w + 2
                sheet.paste(tile.convert("RGB"), (x, y + 4))
                draw.rectangle((x, y + 4, x + tile.width - 1, y + 4 + tile.height - 1), outline=(67, 76, 94), width=1)
        output = OUTPUT_ROOT / "catalog" / f"lineage-{page_index + 1:03d}.jpg"
        sheet.save(output, format="JPEG", quality=91, optimize=True, progressive=True)
        outputs.append(
            {
                "kind": "lineage-matrix",
                "page": page_index + 1,
                "sourceRange": [page_sources[0]["globalIndex"], page_sources[-1]["globalIndex"]],
                "path": output.relative_to(OUTPUT_ROOT).as_posix(),
                "sha256": sha256_file(output),
            }
        )
        if (page_index + 1) % 10 == 0:
            print(f"Lineage pages: {page_index + 1:03d}/{total_pages:03d}")
    return outputs


def summarize_bytes(records: list[dict[str, Any]]) -> dict[str, Any]:
    values = [record["bytes"] for record in records]
    decoded = [record["decodedRgbaBytes"] for record in records]
    return {
        "count": len(records),
        "encodedBytes": sum(values),
        "decodedRgbaBytes": sum(decoded),
        "encodedBytesP50": int(statistics.median(values)),
        "encodedBytesP95": int(np.percentile(values, 95)),
        "encodedBytesMax": max(values),
    }


def validate_records(
    source_records: list[dict[str, Any]],
    derivative_records: list[dict[str, Any]],
) -> dict[str, Any]:
    errors: list[str] = []
    warnings: list[str] = []
    if len(source_records) != 1000:
        errors.append(f"source-count:{len(source_records)}")
    if len(derivative_records) != 9000:
        errors.append(f"derivative-count:{len(derivative_records)}")
    all_records = source_records + derivative_records
    if len(all_records) != 10000:
        errors.append(f"total-count:{len(all_records)}")

    ids = [record["id"].lower() for record in all_records]
    paths = [record["path"].lower() for record in all_records]
    hashes = [record["rgbaSha256"] for record in all_records]
    if len(set(ids)) != len(ids):
        errors.append("duplicate-ids")
    if len(set(paths)) != len(paths):
        errors.append("duplicate-paths")
    duplicate_hashes = len(hashes) - len(set(hashes))
    if duplicate_hashes:
        warnings.append(f"exact-rgba-hash-collisions:{duplicate_hashes}")

    children: dict[str, list[int]] = {}
    source_ids = {record["id"] for record in source_records}
    for derivative in derivative_records:
        children.setdefault(derivative["sourceId"], []).append(derivative["variantIndex"])
        if derivative["sourceId"] not in source_ids:
            errors.append(f"orphan:{derivative['id']}")
        if derivative["lineage"]["derivationDepth"] != 1:
            errors.append(f"depth:{derivative['id']}")
    for source_id in source_ids:
        if sorted(children.get(source_id, [])) != list(range(1, 10)):
            errors.append(f"child-ordinals:{source_id}")

    for record in all_records:
        resolved = (OUTPUT_ROOT / record["path"]).resolve()
        if OUTPUT_ROOT.resolve() not in resolved.parents:
            errors.append(f"out-of-root:{record['path']}")
            continue
        if not resolved.exists():
            errors.append(f"missing:{record['path']}")
        elif resolved.stat().st_size != record["bytes"]:
            errors.append(f"size-drift:{record['path']}")

    return {
        "passed": not errors,
        "errors": errors,
        "warnings": warnings,
        "sourceCount": len(source_records),
        "derivativeCount": len(derivative_records),
        "totalCandidateCount": len(all_records),
        "uniqueIdCount": len(set(ids)),
        "uniquePathCount": len(set(paths)),
        "uniqueRgbaHashCount": len(set(hashes)),
    }


def write_prompt_manifest(master_records: list[dict[str, Any]]) -> None:
    lines = [
        "# 2026-07-29 ImageGen prompt manifest",
        "",
        "All 41 masters used the built-in image-generation workflow.",
        "They are review sheets on a flat chroma key, with isolated cells,",
        "premium hand-painted Understar dark-fantasy/science-fiction art,",
        "no runtime wiring, and no production path.",
        "",
        "| Master | Grid | Family | Prompt content |",
        "|---|---:|---|---|",
    ]
    for pack, master in zip(PACKS, master_records):
        content = "; ".join(group["label"] for group in pack["rowGroups"]) if pack["rowGroups"] else "; ".join(name.replace("-", " ") for name in pack["names"])
        lines.append(
            f"| {master['id'].upper()} {master['title']} | "
            f"{pack['columns']}x{pack['rows']} | {pack['family']} | {content} |"
        )
    (OUTPUT_ROOT / "2026-07-29-imagegen-prompt-manifest.md").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )


def build_manifest(
    master_records: list[dict[str, Any]],
    source_records: list[dict[str, Any]],
    derivative_records: list[dict[str, Any]],
    review_outputs: list[dict[str, Any]],
    qa_summary: dict[str, Any],
    started_at: float,
) -> dict[str, Any]:
    source_by_id = {record["id"]: record for record in source_records}
    sequence_groups: list[dict[str, Any]] = []
    for pack in PACKS:
        for group in pack["rowGroups"]:
            group_id = f"{pack['id']}-{group['id']}"
            frames = [
                record
                for record in source_records
                if record["sequenceGroup"] == group_id
            ]
            frames.sort(key=lambda item: item["frameIndex"])
            sequence_groups.append(
                {
                    "id": group_id,
                    "masterId": pack["id"],
                    "label": group["label"],
                    "kind": group["kind"],
                    "loop": group["loop"],
                    "frameCount": len(frames),
                    "sourceIds": [frame["id"] for frame in frames],
                    "frameOrder": [frame["frameIndex"] for frame in frames],
                    "groupDerivativePolicy": "all frames share one profile configuration and group seed",
                }
            )

    profile_records = [
        {
            "slug": slug_value,
            "ordinal": index,
            "intent": {
                "p00-source": "Canonical authored source",
                "p01-restrained": "Lower nonessential visual energy",
                "p02-emphasized": "Stronger edge and impact readability",
                "p03-shadow-safe": "Lift separation in dark scenes",
                "p04-highlight-safe": "Compress whites for bright scenes",
                "p05-cool-context": "Cool neutral/fringe pixels only",
                "p06-warm-context": "Warm neutral/fringe pixels only",
                "p07-compact-read": "Simpler internal detail at locked geometry",
                "p08-broad-read": "Stronger fringe readability inside existing support",
                "p09-detail-alt": "Group-seeded alternate microtexture",
            }[slug_value],
        }
        for index, slug_value in enumerate(PROFILE_SLUGS)
    ]

    manifest = {
        "schemaVersion": 1,
        "libraryId": LIBRARY_ID,
        "date": "2026-07-29",
        "approvalStatus": "pending",
        "reviewOnly": True,
        "productionChanged": False,
        "runtimeWired": False,
        "productionEligible": False,
        "counts": {
            "masters": len(master_records),
            "authoredSources": len(source_records),
            "derivatives": len(derivative_records),
            "profiles": len(PROFILE_SLUGS),
            "candidateImages": len(source_records) + len(derivative_records),
        },
        "reviewBoundary": {
            "root": OUTPUT_ROOT.relative_to(ROOT).as_posix(),
            "productionMustNotLoadReviewPaths": True,
            "promotionRule": "Copy only explicitly approved IDs into a separate runtime package.",
            "solidInteractablesExcluded": True,
        },
        "profiles": profile_records,
        "sourceMasters": master_records,
        "sources": source_records,
        "derivatives": derivative_records,
        "sequenceGroups": sequence_groups,
        "reviewOutputs": review_outputs,
        "mockups": [],
        "qaSummary": qa_summary,
        "performanceSummary": {
            "sources": summarize_bytes(source_records),
            "derivatives": summarize_bytes(derivative_records),
            "allCandidates": summarize_bytes(source_records + derivative_records),
            "uniform320x256DecodedEstimateBytes": 10000 * 320 * 256 * 4,
            "uniform320x256DecodedEstimateGiB": round(10000 * 320 * 256 * 4 / (1024**3), 4),
            "runtimePolicy": "Never preload the full library; curate, atlas by family, and lazy-load approved subsets.",
        },
        "build": {
            "script": Path(__file__).relative_to(ROOT).as_posix(),
            "python": sys.version,
            "pillow": getattr(sys.modules.get("PIL"), "__version__", "unknown"),
            "numpy": np.__version__,
            "chromaHelper": str(CHROMA_HELPER_PATH),
            "canvas": {"width": CANVAS_SIZE[0], "height": CANVAS_SIZE[1]},
            "elapsedSeconds": round(time.time() - started_at, 3),
        },
    }
    return manifest


def build_all(*, skip_derivatives: bool = False, skip_catalog: bool = False) -> None:
    started_at = time.time()
    write_readmes()
    master_records, source_records = build_sources()

    manifest_path = OUTPUT_ROOT / "manifest.json"
    derivative_records: list[dict[str, Any]]
    if skip_derivatives:
        derivative_records = []
    else:
        derivative_records = build_derivatives(source_records)

    source_by_id = {record["id"]: record for record in source_records}
    review_outputs: list[dict[str, Any]] = []
    if not skip_catalog and derivative_records:
        review_outputs.append(build_library_map(master_records, source_by_id))
        for master_record in master_records:
            review_outputs.append(build_source_sheet(master_record, source_by_id))
        review_outputs.extend(build_lineage_pages(source_records, derivative_records))

    qa_summary = validate_records(source_records, derivative_records) if derivative_records else {
        "passed": len(source_records) == 1000,
        "sourceCount": len(source_records),
        "derivativeCount": 0,
        "totalCandidateCount": len(source_records),
        "errors": [],
        "warnings": ["derivatives-skipped"],
    }
    write_prompt_manifest(master_records)
    manifest = build_manifest(
        master_records,
        source_records,
        derivative_records,
        review_outputs,
        qa_summary,
        started_at,
    )
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    report = {
        "libraryId": LIBRARY_ID,
        "manifest": manifest_path.relative_to(ROOT).as_posix(),
        "counts": manifest["counts"],
        "qaSummary": qa_summary,
        "performanceSummary": manifest["performanceSummary"],
        "elapsedSeconds": manifest["build"]["elapsedSeconds"],
    }
    (OUTPUT_ROOT / "build-report.json").write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    if not qa_summary["passed"]:
        raise SystemExit(2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-derivatives", action="store_true")
    parser.add_argument("--skip-catalog", action="store_true")
    return parser.parse_args()


if __name__ == "__main__":
    arguments = parse_args()
    build_all(
        skip_derivatives=arguments.skip_derivatives,
        skip_catalog=arguments.skip_catalog,
    )
