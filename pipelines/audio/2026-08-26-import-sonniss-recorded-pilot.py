"""Download and prepare a review-only pilot from the Sonniss GDC 2026 bundle."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
OUTPUT = ROOT / (
    "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"
    "sonniss-gdc2026-recorded-pilot-2026-08-26"
)
ARCHIVE = OUTPUT / "raw" / "Sonniss.com-GDC2026-GameAudioBundle1of5.zip"
FILE_ID = "1ndDWhCoq0NgkrJH6ku5MSA65zinEby9r"
SOURCE_URL = "https://gdc.sonniss.com/"
LICENSE_URL = "https://sonniss.com/gdc-bundle-license/"
TRACKLIST_URL = (
    "https://docs.google.com/spreadsheets/d/"
    "1MkoGwA6FfgNXhye9wLnY0gNLvjEp4H2iYXM1YxMI6Qs/export?format=csv"
)
USER_AGENT = "Mozilla/5.0 UNDERSTAR recorded-SFX review importer"

CATEGORY_RULES = {
    "earth-stone-debris": (
        "dirt", "earth", "soil", "sand", "gravel", "rock", "stone", "brick",
        "debris", "ice", "crack", "crush", "collapse", "falling", "rattle",
    ),
    "physical-impacts-tools": (
        "impact", "hit", "punch", "slam", "bang", "drop", "fall", "wood",
        "metal", "weapon", "sword", "spear", "shield", "lock", "climbing",
    ),
    "fire-cave-darkness": (
        "fire", "flame", "ember", "burn", "haunting", "ghost", "ambience",
        "forest", "wind", "storm", "breath", "creak", "squeak",
    ),
    "air-void-magic-ui": (
        "air", "blast", "whoosh", "rush", "bass", "downer", "drone", "magic",
        "energy", "ui", "game", "creation", "transition",
    ),
}
CATEGORY_LIMIT = 10
EXCLUDED = (
    "voice", "vox", "police", "telephone", "typewriter", "dog", "dinosaur",
    "car foley", "casino", "christmas", "barbershop", "hair", "spectator",
)
AUDIO_SUFFIXES = {".wav", ".wave", ".aif", ".aiff", ".flac", ".ogg", ".mp3"}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".partial")
    temporary.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def request(url: str, headers: dict[str, str] | None = None):
    merged = {"User-Agent": USER_AGENT}
    merged.update(headers or {})
    return urllib.request.urlopen(urllib.request.Request(url, headers=merged), timeout=60)


def drive_download_url() -> str:
    landing = f"https://drive.google.com/uc?export=download&id={FILE_ID}"
    with request(landing) as response:
        page = response.read().decode("utf-8")
    action = re.search(r'<form[^>]+action="([^"]+)"', page)
    fields = dict(re.findall(r'name="([^"]+)" value="([^"]*)"', page))
    if not action or not fields:
        raise RuntimeError("Google Drive confirmation form was not found")
    return html.unescape(action.group(1)) + "?" + urllib.parse.urlencode(fields)


def download_archive() -> None:
    ARCHIVE.parent.mkdir(parents=True, exist_ok=True)
    if ARCHIVE.exists():
        with zipfile.ZipFile(ARCHIVE) as archive:
            archive.infolist()
        print(f"Archive already ready: {ARCHIVE}")
        return

    partial = ARCHIVE.with_suffix(ARCHIVE.suffix + ".partial")
    offset = partial.stat().st_size if partial.exists() else 0
    headers = {"Range": f"bytes={offset}-"} if offset else {}
    with request(drive_download_url(), headers) as response:
        append = offset > 0 and response.status == 206
        mode = "ab" if append else "wb"
        if not append:
            offset = 0
        content_range = response.headers.get("Content-Range", "")
        total_match = re.search(r"/(\d+)$", content_range)
        total = int(total_match.group(1)) if total_match else (
            offset + int(response.headers.get("Content-Length", "0"))
        )
        downloaded = offset
        next_report = downloaded + 64 * 1024 * 1024
        with partial.open(mode) as target:
            while True:
                block = response.read(1024 * 1024)
                if not block:
                    break
                target.write(block)
                downloaded += len(block)
                if downloaded >= next_report:
                    print(f"Downloaded {downloaded / 1024**2:.0f} / {total / 1024**2:.0f} MiB", flush=True)
                    next_report += 64 * 1024 * 1024
    if total and downloaded != total:
        raise RuntimeError(f"Incomplete archive: {downloaded} of {total} bytes")
    partial.replace(ARCHIVE)
    with zipfile.ZipFile(ARCHIVE) as archive:
        archive.infolist()
    print(f"Archive ready: {ARCHIVE} ({downloaded / 1024**3:.2f} GiB)")


def download_tracklist() -> Path:
    destination = OUTPUT / "source-tracklist.csv"
    if not destination.exists():
        with request(TRACKLIST_URL) as response:
            destination.write_bytes(response.read())
    return destination


def classify(name: str) -> tuple[str, int] | None:
    lowered = name.lower().replace("_", " ").replace("-", " ")
    if any(term in lowered for term in EXCLUDED):
        return None
    scored = []
    for category, terms in CATEGORY_RULES.items():
        score = sum(1 for term in terms if term in lowered)
        scored.append((score, category))
    score, category = max(scored)
    return (category, score) if score else None


def select_entries(archive: zipfile.ZipFile) -> list[tuple[zipfile.ZipInfo, str, int]]:
    grouped: dict[str, list[tuple[zipfile.ZipInfo, int]]] = {key: [] for key in CATEGORY_RULES}
    for entry in archive.infolist():
        if entry.is_dir() or Path(entry.filename).suffix.lower() not in AUDIO_SUFFIXES:
            continue
        classification = classify(entry.filename)
        if classification:
            category, score = classification
            grouped[category].append((entry, score))
    selected = []
    for category, entries in grouped.items():
        ranked = sorted(entries, key=lambda item: (-item[1], item[0].file_size, item[0].filename.lower()))
        selected.extend((entry, category, score) for entry, score in ranked[:CATEGORY_LIMIT])
    return selected


def safe_stem(name: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", Path(name).stem).strip("-.")
    # The review root is already deep on Windows; keep derived copies below MAX_PATH.
    return stem[:48] or "recording"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def find_ffmpeg() -> str | None:
    direct = shutil.which("ffmpeg")
    if direct:
        return direct
    winget = Path.home() / "AppData/Local/Microsoft/WinGet/Packages"
    matches = list(winget.glob("Gyan.FFmpeg_*/ffmpeg-*/bin/ffmpeg.exe"))
    return str(matches[0]) if matches else None


def make_preview(source: Path, destination: Path) -> None:
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise RuntimeError("FFmpeg is required to build browser previews")
    destination.parent.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(
        [ffmpeg, "-v", "error", "-y", "-i", str(source), "-t", "12", "-map", "0:a:0",
         "-ar", "48000", "-c:a", "libmp3lame", "-b:a", "256k", str(destination)],
        capture_output=True,
        text=True,
    )
    if result.returncode:
        raise RuntimeError(f"FFmpeg failed for {source.name}: {result.stderr.strip()}")


def extract_candidates() -> list[dict]:
    source_dir = OUTPUT / "source-recordings"
    preview_dir = OUTPUT / "previews"
    source_dir.mkdir(parents=True, exist_ok=True)
    preview_dir.mkdir(parents=True, exist_ok=True)
    records = []
    with zipfile.ZipFile(ARCHIVE) as archive:
        selected = select_entries(archive)
        for index, (entry, category, score) in enumerate(selected, start=1):
            suffix = Path(entry.filename).suffix.lower()
            name = f"{index:02d}_{safe_stem(entry.filename)}{suffix}"
            source_path = source_dir / name
            if not source_path.exists():
                with archive.open(entry) as incoming, source_path.open("wb") as outgoing:
                    shutil.copyfileobj(incoming, outgoing, length=1024 * 1024)
            preview_path = preview_dir / f"{Path(name).stem}.mp3"
            if not preview_path.exists():
                make_preview(source_path, preview_path)
            records.append({
                "id": f"SONNISS26-P1-{index:02d}",
                "category": category,
                "keywordScore": score,
                "originalArchivePath": entry.filename,
                "sourceFile": source_path.relative_to(OUTPUT).as_posix(),
                "previewFile": preview_path.relative_to(OUTPUT).as_posix(),
                "sourceBytes": source_path.stat().st_size,
                "sourceSha256": sha256(source_path),
                "humanRating": "UNRATED",
                "runtimeEligible": False,
            })
    return records


def write_review_page(records: list[dict]) -> None:
    cards = []
    for record in records:
        original = html.escape(record["originalArchivePath"])
        cards.append(
            f'<article class="card" data-id="{record["id"]}" data-category="{record["category"]}">'
            f'<span class="id">{record["id"]} · {record["category"]}</span>'
            f'<h2>{html.escape(Path(record["originalArchivePath"]).name)}</h2>'
            f'<audio controls preload="metadata" src="{html.escape(record["previewFile"], quote=True)}"></audio>'
            f'<details><summary>Recorded source</summary><p>{original}</p></details>'
            '<label>Verdict <select class="rating"><option>UNRATED</option><option>EXCELLENT</option>'
            '<option>USABLE</option><option>MAYBE</option><option>REJECT</option></select></label>'
            '<label>Notes <input class="notes" placeholder="Material, weight, fit, problems"></label></article>'
        )
    document = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Sonniss recorded-SFX pilot</title><style>
body{{margin:0;background:#101316;color:#e9ecef;font:15px system-ui}}main{{max-width:1200px;margin:auto;padding:28px}}
.top{{position:sticky;top:0;background:#101316ee;padding:16px 0;z-index:2}}h1{{margin:4px 0}}.note{{color:#b9c1c8}}
.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:14px}}.card{{background:#1a2025;border:1px solid #34404a;border-radius:10px;padding:14px}}
.id{{color:#79d6ae;font-size:12px}}h2{{font-size:15px;min-height:38px}}audio{{width:100%}}label{{display:block;margin-top:9px}}input,select,button{{font:inherit}}input{{width:95%}}
.license{{padding:10px;border-left:4px solid #79d6ae;background:#18251f}}a{{color:#8cc8ff}}
</style></head><body><main><div class="top"><span class="id">RECORDED · REVIEW-ONLY · UNTESTED</span><h1>Sonniss GDC 2026 Part 1 pilot</h1>
<p class="note">{len(records)} real recordings selected by filename relevance. Twelve-second previews are codec-only transcodes, not generated or sonically redesigned.</p>
<p class="license">Commercial game use and modification are allowed without attribution under the <a href="{LICENSE_URL}">official bundle license</a>. AI training/use is prohibited. Nothing is runtime-wired.</p>
<button id="export">Export ratings JSON</button></div><section class="grid">{''.join(cards)}</section></main><script>
const key='sonniss-gdc2026-recorded-pilot'; const saved=JSON.parse(localStorage.getItem(key)||'{{}}');
document.querySelectorAll('.card').forEach(c=>{{const id=c.dataset.id,r=c.querySelector('.rating'),n=c.querySelector('.notes'); if(saved[id]){{r.value=saved[id].rating;n.value=saved[id].notes||''}} const save=()=>{{saved[id]={{rating:r.value,notes:n.value,category:c.dataset.category}};localStorage.setItem(key,JSON.stringify(saved))}};r.onchange=save;n.oninput=save}});
document.querySelector('#export').onclick=()=>{{const blob=new Blob([JSON.stringify({{source:'Sonniss GDC 2026 Part 1',exportedAt:new Date().toISOString(),ratings:saved}},null,2)],{{type:'application/json'}});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sonniss-gdc2026-recorded-pilot-review.json';a.click();URL.revokeObjectURL(a.href)}};
</script></body></html>'''
    (OUTPUT / "index.html").write_text(document, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-only", action="store_true")
    args = parser.parse_args()
    download_archive()
    download_tracklist()
    if args.download_only:
        return 0
    records = extract_candidates()
    manifest = {
        "schemaVersion": 1,
        "source": "Sonniss GDC 2026 Game Audio Bundle",
        "sourceUrl": SOURCE_URL,
        "licenseUrl": LICENSE_URL,
        "sourceKind": "professional-recorded-sound-effects",
        "archivePart": 1,
        "reviewOnly": True,
        "runtimeWired": False,
        "createdAt": utc_now(),
        "candidateCount": len(records),
        "records": records,
    }
    write_json(OUTPUT / "manifest.json", manifest)
    write_review_page(records)
    print(f"Prepared {len(records)} recorded candidates in {OUTPUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
