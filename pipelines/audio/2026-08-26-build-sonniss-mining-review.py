"""Build the review-only Sonniss source library and preserve human decisions."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import wave
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / (
    "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"
    "sonniss-gdc2019-recorded-mining-pilot-2026-08-26"
)
SOURCE_DIR = OUTPUT / "source-recordings"
PREVIEW_DIR = OUTPUT / "previews"
APPROVAL_PATH = OUTPUT / "2026-08-27-source-approvals.json"
LICENSE_URL = "https://sonniss.com/gdc-bundle-license/"
ARCHIVE_URL = "https://sonniss.com/gameaudiogdc/"
EXCLUDED = {"Bag-Foley_Wallet_Leather_Grab.wav"}
COMPOUND_TERMS = (
    "multi", "multiple", "various", "sequence", "loop", "walking", "jogging",
    "x2", "x3", "x5", "x6", "x11", "pair", "several", "many", "ambience", "atmo",
    "long", "steady", "mixed", "handling", "manipulation", "rolling", "oscillating",
    "clinking", "back and forth", "scrapes", "singles", "falling rocks", "rocks falling",
    "rain", "wind", "blizzard",
)
FAMILIES = (
    {"id": "mechanical-ui-foley", "terms": ("ui-mechanical", "button", "door-lock", "drawer", "toolbox", "socket-wrench", "antique-crank"), "targets": "GX201-GX220, GX291-GX315, GX333-GX335", "listen": "Tactile relays, locks, buttons, trays and tool mechanisms with clean edit points."},
    {"id": "metal-machine-movement", "terms": ("electric-motor", "heavy-metal", "elements-metal", "metal-hits", "metallic-ball", "battery-rolling", "robotic-lifeforms", "metal-grid"), "targets": "GX206-GX240, GX245, GX252-GX257, GX284-GX287, GX335, GX346-GX359", "listen": "Physical motor, chassis, rolling and metal-body layers without tonal ringing."},
    {"id": "air-whoosh-flight", "terms": ("whoosh", "swipe", "swing", "air-release", "blowing-wind"), "targets": "GX221-GX240, GX277-GX278, GX299, GX323, GX364", "listen": "Natural air displacement and cloth, tool or grille passes that remain non-musical."},
    {"id": "glass-ice-crystal", "terms": ("glass", "ice", "icy", "snowball", "icicle", "crystal", "shatter"), "targets": "GX247, GX249, GX260, GX274-GX276, GX284, GX320, GX326, GX330, GX366, GX391-GX393", "listen": "Distinct brittle bodies and debris; use darker layers to avoid a glass-only identity."},
    {"id": "weather-water-depth", "terms": ("thunder", "rain", "water", "drip", "winter-open-space", "wind-in-pines"), "targets": "GX327, GX356-GX371, GX373-GX380", "listen": "Natural weather, water and distant pressure beds with usable isolated moments or loop regions."},
    {"id": "surface-footstep-body", "terms": ("footsteps", "bodyfall", "snow-single", "doormat"), "targets": "GX205-GX211, GX231-GX232, GX240-GX243, GX261-GX267", "listen": "Distinct contact, weight and surface identity; sequences need isolated step or landing exports."},
    {"id": "electrical-energy", "terms": ("electric-magnetic", "electric-crackling", "electromagnetic", "locked-screen"), "targets": "GX201-GX203, GX216-GX220, GX221-GX239, GX254-GX256, GX318, GX331-GX333, GX374-GX375", "listen": "Physical contacts, arcs and electromagnetic textures that can support energy without generic synth tone."},
    {"id": "chain-rattle", "terms": ("metal-chain", "bicycle-chain"), "targets": "GX218, GX284, GX307, GX346-GX348, GX359, GX363, GX382", "listen": "Short real chain motion, latch weight and restrained rattle with separable gestures."},
    {"id": "thermal-fire", "terms": ("sizzle", "fire-spell", "boom-crackle"), "targets": "GX248, GX255, GX327, GX373, GX393, GX399", "listen": "Heat, ignition and crackle layers; reject magical or synthetic character that cannot be physically grounded."},
    {"id": "dirt-gravel-movement", "terms": ("dirt", "grit", "footstep", "rolling-stones", "stones-small", "doormat"), "targets": "GX205, GX208, GX210, GX241-GX243, GX261-GX267, GX279, GX281, GX290", "listen": "Natural soil/gravel weight, loose grains, non-tonal movement, useful layer boundaries."},
    {"id": "stone-impact-debris", "terms": ("rocks-falling", "falling-rocks", "ground-impact", "brick_bricks", "concrete", "stone", "sledgehammer"), "targets": "GX211, GX244-GX249, GX268-GX270, GX282-GX288, GX356-GX362, GX370", "listen": "Convincing mass, fracture, rock bodies, chips and debris with no synthetic ringing."},
    {"id": "wood-mine-support", "terms": ("wood", "wooden", "beam", "mine-shaft", "fence", "creak"), "targets": "GX258, GX321-GX322, GX328, GX365, GX368", "listen": "Dry timber stress, snaps, thuds and collapse layers suitable for mine structures."},
    {"id": "coin-reward-foley", "terms": ("coin", "coins"), "targets": "GX305-GX312, GX315, GX349-GX355", "listen": "Real restrained coin weight; avoid arcade sparkle and harsh metallic resonance."},
    {"id": "cave-depth-bed", "terms": ("atmo-eerie-cave", "mining-on-mars"), "targets": "GX356-GX371, GX380", "listen": "Low physical space and distant activity without musical or horror-score character."},
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_name(name: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", Path(name).stem).strip("-.")[:40]
    return stem or "recording"


def find_binary(name: str) -> str:
    direct = shutil.which(name)
    if direct:
        return direct
    winget = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    try:
        matches = list(winget.glob(f"Gyan.FFmpeg_*/ffmpeg-*/bin/{name}.exe"))
    except OSError:
        matches = []
    if matches:
        return str(matches[0])
    linked = Path.home() / f"AppData/Local/Microsoft/WinGet/Links/{name}.exe"
    try:
        if linked.exists():
            return str(linked.resolve())
    except OSError:
        pass
    raise RuntimeError(f"{name} is required to prepare review previews")


def duration_seconds(path: Path) -> float | None:
    try:
        with wave.open(str(path), "rb") as source:
            return source.getnframes() / source.getframerate()
    except (wave.Error, EOFError):
        return None


def classify(text: str) -> dict:
    lowered = text.lower().replace("_", "-").replace(" ", "-")
    for family in FAMILIES:
        if any(term.replace("_", "-").replace(" ", "-") in lowered for term in family["terms"]):
            return family
    return next(family for family in FAMILIES if family["id"] == "stone-impact-debris")


def provenance() -> dict[str, dict]:
    by_copy = {}
    for index_path in sorted(OUTPUT.glob("source-index*.json")):
        payload = json.loads(index_path.read_text(encoding="utf-8"))
        for archive in payload.get("archives", []):
            for entry in archive.get("matches", []):
                copied = entry.get("copiedFile")
                if not copied:
                    suffix = Path(entry["filename"]).suffix.lower()
                    copied = f"{safe_name(entry['filename'])}{suffix}"
                details = {key: entry[key] for key in ("family", "targetAssets", "listenFor", "sourceKind") if key in entry}
                by_copy[copied] = {"archivePart": archive["part"], "originalArchivePath": entry["filename"], **details}
    return by_copy


def previous_ids() -> tuple[dict[str, str], int]:
    manifest_path = OUTPUT / "manifest.json"
    if not manifest_path.exists():
        return {}, 1
    records = json.loads(manifest_path.read_text(encoding="utf-8")).get("records", [])
    mapping = {record["sourceSha256"]: record["id"] for record in records}
    numbers = [int(match.group(1)) for record in records if (match := re.search(r"(\d+)$", record["id"]))]
    return mapping, max(numbers, default=0) + 1


def approvals() -> tuple[set[str], str | None]:
    if not APPROVAL_PATH.exists():
        return set(), None
    payload = json.loads(APPROVAL_PATH.read_text(encoding="utf-8"))
    return set(payload.get("approvedSourceSha256", [])), payload.get("approvedAt")


def implementation_handling(original: str, duration: float | None) -> str:
    lowered = original.lower().replace("_", " ").replace("-", " ")
    if duration is None:
        return "manual_inspection_required"
    if duration > 3.0 or any(term.replace("-", " ") in lowered for term in COMPOUND_TERMS):
        return "slice_required"
    return "isolated_source_candidate"


def preview(source: Path, destination: Path) -> None:
    if destination.exists():
        return
    destination.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run([find_binary("ffmpeg"), "-v", "error", "-y", "-i", str(source), "-t", "12", "-map", "0:a:0", "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "256k", str(destination)], capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"FFmpeg failed for {source.name}: {result.stderr.strip()}")


def build_records() -> list[dict]:
    origin = provenance()
    id_by_hash, next_id = previous_ids()
    approved_hashes, approved_at = approvals()
    records = []
    for source in sorted(SOURCE_DIR.glob("*.wav")):
        if source.name in EXCLUDED:
            continue
        digest = sha256(source)
        source_info = origin.get(source.name, {})
        original = source_info.get("originalArchivePath", source.name)
        family = classify(original)
        if source_info.get("family"):
            family = next(item for item in FAMILIES if item["id"] == source_info["family"])
        preview_path = PREVIEW_DIR / f"{source.stem}.mp3"
        preview(source, preview_path)
        duration = duration_seconds(source)
        handling = implementation_handling(original, duration)
        designed_terms = ("designed", "strange worlds", "ghosts return", "sound design", "soundmorph")
        source_kind = source_info.get("sourceKind") or ("designed-library-sample" if any(term in original.lower() for term in designed_terms) else "recorded-source-sample")
        record_id = id_by_hash.get(digest)
        if not record_id:
            record_id = f"SONNISS19-SRC-{next_id:03d}"
            next_id += 1
        approved = digest in approved_hashes
        records.append({"id": record_id, "family": family["id"], "targetAssets": source_info.get("targetAssets", family["targets"]), "listenFor": source_info.get("listenFor", family["listen"]), "sourceKind": source_kind, "archivePart": source_info.get("archivePart"), "originalArchivePath": original, "sourceFile": source.relative_to(OUTPUT).as_posix(), "previewFile": preview_path.relative_to(OUTPUT).as_posix(), "sourceBytes": source.stat().st_size, "durationSeconds": duration, "sourceSha256": digest, "humanRating": "APPROVED_SOURCE" if approved else "UNREVIEWED", "sourceApproved": approved, "sourceApprovedAt": approved_at if approved else None, "compoundEvent": handling == "slice_required", "implementationHandling": handling, "runtimeEligible": False})
    return sorted(records, key=lambda record: record["id"])


def record_current_approval(records: list[dict]) -> None:
    history = []
    if APPROVAL_PATH.exists():
        previous = json.loads(APPROVAL_PATH.read_text(encoding="utf-8"))
        history = previous.get("decisionHistory", [])
        prior = {"approvedAt": previous.get("approvedAt"), "approvedCandidateCount": previous.get("approvedCandidateCount"), "verdict": previous.get("verdict")}
        if prior not in history:
            history.append(prior)
    payload = {"schemaVersion": 2, "verdict": "APPROVE_ALL_CURRENT_SOURCE_CANDIDATES", "approvedAt": utc_now(), "approvedCandidateCount": len(records), "approvedSourceSha256": [record["sourceSha256"] for record in records], "decisionHistory": history, "note": "User approved every candidate currently present as a useful source. Approval does not make whole files game-ready; compound recordings still require slicing and no raw source is runtime-eligible."}
    APPROVAL_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def options(selected: str) -> str:
    values = ("UNREVIEWED", "APPROVED_SOURCE", "GOOD_BUT_NEEDS_TRIM", "MAYBE", "REJECT")
    return "".join(f'<option value="{value}"{" selected" if value == selected else ""}>{value.replace("_", " ")}</option>' for value in values)


def write_page(records: list[dict]) -> None:
    approved_count = sum(record["sourceApproved"] for record in records)
    slice_count = sum(record["compoundEvent"] for record in records)
    cards = []
    baked = {}
    for record in records:
        duration = record["durationSeconds"]
        duration_label = f"{duration:.1f}s" if duration is not None else "duration unavailable"
        approval_label = "APPROVED SOURCE" if record["sourceApproved"] else "UNREVIEWED SOURCE"
        handling_label = record["implementationHandling"].replace("_", " ").upper()
        baked[record["id"]] = {"rating": record["humanRating"], "notes": "", "family": record["family"], "handling": record["implementationHandling"]}
        cards.append(f'''<article class="card" data-id="{record['id']}" data-family="{record['family']}" data-status="{record['humanRating']}" data-handling="{record['implementationHandling']}" data-name="{html.escape(Path(record['originalArchivePath']).name.lower(), quote=True)}">
<span class="eyebrow">{record['id']} · {record['sourceKind']}</span><div><span class="badge {'approved' if record['sourceApproved'] else 'unreviewed'}">{approval_label}</span><span class="badge {'slice' if record['compoundEvent'] else 'isolated'}">{handling_label}</span></div>
<h2>{html.escape(Path(record['originalArchivePath']).name)}</h2><p class="target"><b>Possible targets:</b> {html.escape(record['targetAssets'])}</p><audio controls preload="metadata" src="{html.escape(record['previewFile'], quote=True)}"></audio>
<p class="listen"><b>Listen for:</b> {html.escape(record['listenFor'])}</p><details><summary>Provenance · Part {record['archivePart']} · {duration_label}</summary><p>{html.escape(record['originalArchivePath'])}</p></details>
<div class="review"><label>Verdict <select class="rating">{options(record['humanRating'])}</select></label><label>Notes <input class="notes" placeholder="Best slice, weight, fit, trim point"></label></div></article>''')
    families = "".join(f'<option value="{family}">{family}</option>' for family in sorted({record["family"] for record in records}))
    page = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>UNDERSTAR recorded SFX source library</title><style>
:root{{color-scheme:dark}}body{{margin:0;background:#0d1114;color:#edf1f2;font:15px system-ui}}main{{max-width:1400px;margin:auto;padding:24px}}.top{{position:sticky;top:0;z-index:3;background:#0d1114f2;padding:12px 0 16px;border-bottom:1px solid #35414a}}h1{{margin:3px 0}}.intro{{max-width:1000px;color:#bac5cb}}.notice{{padding:10px 12px;background:#14271f;border-left:4px solid #6ce0a7}}.filters{{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0}}.filters input{{min-width:260px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;margin-top:18px}}.card{{background:#192026;border:1px solid #34424c;border-radius:10px;padding:14px}}.eyebrow{{font-size:11px;color:#78dba9}}h2{{font-size:15px;min-height:40px;overflow-wrap:anywhere}}.target,.listen{{color:#c8d0d4;font-size:13px}}audio{{width:100%}}label{{display:block;margin-top:8px}}input,select,button{{font:inherit;padding:5px}}.review input{{width:96%}}a{{color:#91caff}}.badge{{display:inline-block;margin:7px 6px 0 0;padding:3px 7px;border-radius:999px;font-size:11px;font-weight:700}}.approved,.isolated{{background:#174d36;color:#9cf2c9}}.unreviewed{{background:#38434b;color:#d8e2e8}}.slice{{background:#614115;color:#ffd38a}}[hidden]{{display:none!important}}
</style></head><body><main><div class="top"><span class="eyebrow">REAL LIBRARY AUDIO · SOURCE REVIEW · NOT RUNTIME-WIRED</span><h1>Recorded SFX source library</h1><p class="intro">{len(records)} licensed candidates. {approved_count} sources from the first listening batch are approved; later additions remain unreviewed. {slice_count} compound recordings are explicitly blocked for slicing before implementation.</p><p class="notice"><b>Approved source does not mean game-ready file.</b> Anything marked SLICE REQUIRED contains multiple events, a sequence, a loop, ambience, or a long recording. It needs exact edit points and a new isolated export before runtime consideration. <a href="{LICENSE_URL}">License</a> · <a href="{ARCHIVE_URL}">Official archive</a></p><div class="filters"><input id="search" placeholder="Search filenames"><select id="family"><option value="">All families</option>{families}</select><select id="status"><option value="">All review states</option><option>APPROVED_SOURCE</option><option>UNREVIEWED</option></select><select id="handling"><option value="">All handling</option><option>slice_required</option><option>isolated_source_candidate</option></select><button id="export">Export ratings JSON</button></div></div><section class="grid">{''.join(cards)}</section></main><script>
const key='sonniss-gdc2019-recorded-library-v2';const baked={json.dumps(baked, ensure_ascii=False)};const saved={{...baked,...JSON.parse(localStorage.getItem(key)||'{{}}')}};const cards=[...document.querySelectorAll('.card')];cards.forEach(c=>{{const id=c.dataset.id,r=c.querySelector('.rating'),n=c.querySelector('.notes');if(saved[id]){{r.value=saved[id].rating;n.value=saved[id].notes||''}}const save=()=>{{saved[id]={{rating:r.value,notes:n.value,family:c.dataset.family,handling:c.dataset.handling}};localStorage.setItem(key,JSON.stringify(saved))}};r.onchange=save;n.oninput=save}});const filter=()=>{{const q=document.querySelector('#search').value.toLowerCase(),f=document.querySelector('#family').value,s=document.querySelector('#status').value,h=document.querySelector('#handling').value;cards.forEach(c=>c.hidden=!!((q&&!c.dataset.name.includes(q))||(f&&c.dataset.family!==f)||(s&&c.dataset.status!==s)||(h&&c.dataset.handling!==h)))}};['search','family','status','handling'].forEach(id=>document.querySelector('#'+id).addEventListener('input',filter));document.querySelector('#export').onclick=()=>{{const blob=new Blob([JSON.stringify({{source:'Sonniss GDC 2019 recorded SFX source library',exportedAt:new Date().toISOString(),ratings:saved}},null,2)],{{type:'application/json'}});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sonniss-gdc2019-recorded-library-review.json';a.click();URL.revokeObjectURL(a.href)}};
</script></body></html>'''
    (OUTPUT / "index.html").write_text(page, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--approve-current", action="store_true", help="Record explicit source approval for the candidates currently present")
    args = parser.parse_args()
    records = build_records()
    if args.approve_current:
        record_current_approval(records)
        records = build_records()
    approved_count = sum(record["sourceApproved"] for record in records)
    slice_count = sum(record["compoundEvent"] for record in records)
    manifest = {"schemaVersion": 2, "source": "Sonniss GameAudioGDC 2019", "sourceKind": "professional-recorded-sound-effects", "sourceUrl": ARCHIVE_URL, "licenseUrl": LICENSE_URL, "reviewOnly": True, "runtimeWired": False, "createdAt": utc_now(), "candidateCount": len(records), "approvedSourceCount": approved_count, "unreviewedSourceCount": len(records) - approved_count, "sliceRequiredCount": slice_count, "approvalBoundary": "source usefulness only; runtime promotion requires isolated editing and in-game mix validation", "records": records}
    (OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    write_page(records)
    print(f"Prepared {len(records)} candidates: {approved_count} approved sources, {slice_count} slice required")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
