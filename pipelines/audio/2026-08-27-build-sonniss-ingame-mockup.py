"""Render review-only in-game scenario mixes from approved Sonniss sources."""

from __future__ import annotations

import hashlib
import html
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from audioWavMixer import TARGET_RATE, finish_mix, normalize_clip, place, read_wav, slice_audio, write_wav


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("2026-08-27-sonniss-ingame-mockup.json")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def db_peak(audio: np.ndarray) -> float | None:
    peak = float(np.max(np.abs(audio))) if audio.size else 0.0
    return round(20.0 * math.log10(peak), 3) if peak > 0 else None


def source_root(manifest_path: Path) -> Path:
    return manifest_path.parent


def render_scenario(scenario: dict, records: dict, source_base: Path, output: Path, ceiling_db: float, cache: dict) -> tuple[dict, np.ndarray]:
    canvas = np.zeros((round(scenario["duration"] * TARGET_RATE), 2), dtype=np.float32)
    rendered_events = []
    for order, event in enumerate(scenario["events"], start=1):
        record = records[event["sourceId"]]
        if not record["sourceApproved"]:
            raise ValueError(f"Mockup source is not approved: {record['id']}")
        if event["sourceStart"] + event["sourceDuration"] > record["durationSeconds"] + 0.001:
            raise ValueError(f"Source window exceeds {record['id']}: {event['key']}")
        if event["at"] + event["sourceDuration"] > scenario["duration"] + 0.001:
            raise ValueError(f"Scenario window exceeds {scenario['id']}: {event['key']}")
        source_path = source_base / record["sourceFile"]
        audio = cache.setdefault(record["id"], read_wav(source_path))
        clip = slice_audio(audio, event["sourceStart"], event["sourceDuration"], event.get("fadeMs", 8.0))
        clip, normalization_db = normalize_clip(clip, event.get("peakDb", -3.0))
        slice_name = f"{scenario['id']}-{order:02d}-{record['id']}-{round(event['sourceStart'] * 1000):06d}ms.wav"
        slice_path = output / "slices" / slice_name
        write_wav(slice_path, clip)
        place(canvas, clip, event["at"], event.get("gainDb", 0.0), event.get("pan", 0.0))
        rendered_events.append({**event, "order": order, "sourceOriginalName": Path(record["originalArchivePath"]).name, "sourceFile": record["sourceFile"], "sourceSha256": record["sourceSha256"], "sourceWasCompound": record["compoundEvent"], "sliceFile": slice_path.relative_to(output).as_posix(), "sliceSha256": sha256(slice_path), "sliceNormalizationDb": round(normalization_db, 3)})
    mixed, peak_before, mix_gain_db = finish_mix(canvas, ceiling_db)
    mix_path = output / "mixes" / f"{scenario['id']}.wav"
    write_wav(mix_path, mixed)
    result = {"id": scenario["id"], "title": scenario["title"], "description": scenario["description"], "durationSeconds": scenario["duration"], "mixFile": mix_path.relative_to(output).as_posix(), "mixSha256": sha256(mix_path), "peakBeforeMixDb": round(20.0 * math.log10(peak_before), 3) if peak_before > 0 else None, "mixBusGainDb": round(mix_gain_db, 3), "outputPeakDb": db_peak(mixed), "eventCount": len(rendered_events), "events": rendered_events}
    return result, mixed


def full_sequence(results: list[dict], audio_by_id: dict, output: Path, gap_seconds: float) -> dict:
    gap = np.zeros((round(gap_seconds * TARGET_RATE), 2), dtype=np.float32)
    pieces = []
    sections = []
    cursor = 0.0
    for index, result in enumerate(results):
        audio = audio_by_id[result["id"]]
        sections.append({"scenarioId": result["id"], "title": result["title"], "startsAt": round(cursor, 3), "durationSeconds": result["durationSeconds"]})
        pieces.append(audio)
        cursor += len(audio) / TARGET_RATE
        if index < len(results) - 1:
            pieces.append(gap)
            cursor += gap_seconds
    combined = np.concatenate(pieces, axis=0)
    path = output / "mixes" / "full-gameplay-sequence.wav"
    write_wav(path, combined)
    return {"title": "Full gameplay sound sequence", "description": "All four scenario mixes in order with short silent review gaps.", "mixFile": path.relative_to(output).as_posix(), "mixSha256": sha256(path), "durationSeconds": round(len(combined) / TARGET_RATE, 3), "outputPeakDb": db_peak(combined), "sections": sections}


def write_page(output: Path, manifest: dict) -> None:
    full = manifest["fullSequence"]
    cards = []
    for scenario in manifest["scenarios"]:
        rows = "".join(f"<tr><td>{event['at']:.2f}s</td><td>{html.escape(event['target'])}</td><td>{html.escape(event['label'])}</td><td>{html.escape(event['sourceId'])}</td><td>{event['sourceStart']:.2f}–{event['sourceStart'] + event['sourceDuration']:.2f}s{' · SLICED REEL' if event['sourceWasCompound'] else ''}</td></tr>" for event in scenario["events"])
        cards.append(f'''<article class="card" data-id="{scenario['id']}"><span class="eyebrow">{scenario['eventCount']} TIMED EVENTS · {scenario['durationSeconds']:.1f}s</span><h2>{html.escape(scenario['title'])}</h2><p>{html.escape(scenario['description'])}</p><audio controls preload="metadata" src="{scenario['mixFile']}"></audio><p class="metrics">Peak {scenario['outputPeakDb']:.1f} dBFS · bus gain {scenario['mixBusGainDb']:.1f} dB</p><details><summary>Exact source recipe</summary><div class="table"><table><thead><tr><th>At</th><th>GX target</th><th>Role</th><th>Source</th><th>Window</th></tr></thead><tbody>{rows}</tbody></table></div></details><label>Verdict <select class="rating"><option>UNRATED</option><option>EXCELLENT DIRECTION</option><option>GOOD DIRECTION</option><option>NEEDS BALANCE</option><option>WRONG DIRECTION</option></select></label><label>Notes <input class="notes" placeholder="Too loud, too busy, change material, timing..."></label></article>''')
    sections = " · ".join(f"{item['startsAt']:.1f}s {html.escape(item['title'])}" for item in full["sections"])
    page = f'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>UNDERSTAR in-game SFX mockup V1</title><style>
:root{{color-scheme:dark}}body{{margin:0;background:#0a0e11;color:#edf3f4;font:15px system-ui}}main{{max-width:1240px;margin:auto;padding:24px}}header{{background:linear-gradient(135deg,#16282b,#111820);border:1px solid #345058;border-radius:14px;padding:20px}}.eyebrow{{color:#73ddb2;font-size:11px;font-weight:750;letter-spacing:.08em}}h1{{margin:5px 0}}.notice{{padding:10px 12px;background:#382d17;border-left:4px solid #e9ad45}}.hero{{margin:16px 0;padding:16px;background:#10191e;border:1px solid #47616c;border-radius:12px}}audio{{width:100%}}.sections,.metrics{{color:#aebbc1;font-size:13px}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(430px,1fr));gap:14px}}.card{{background:#171f24;border:1px solid #35434b;border-radius:12px;padding:15px}}h2{{font-size:18px}}label{{display:block;margin-top:9px}}input,select,button{{font:inherit;padding:6px}}input{{width:96%}}details{{margin-top:10px}}.table{{overflow:auto}}table{{border-collapse:collapse;width:100%;font-size:12px}}th,td{{border-bottom:1px solid #35434b;text-align:left;padding:6px;vertical-align:top}}button{{margin-top:12px}}a{{color:#8ac8ff}}
</style></head><body><main><header><span class="eyebrow">REVIEW-ONLY · APPROVED RECORDED SOURCES · NOT RUNTIME-WIRED</span><h1>In-game SFX sound-stage mockup V1</h1><p>Four scripted gameplay situations using explicit source slices, game-style timing, gain, and stereo placement. No pitch shifting, AI generation, or runtime code changes.</p><p class="notice"><b>This tests direction, not final implementation.</b> Compound recordings were cut to the exact windows shown in each recipe. Every raw source and every derived mockup remains outside the game runtime.</p></header><section class="hero"><span class="eyebrow">CONTINUOUS DEMO · {full['durationSeconds']:.1f}s</span><h2>{html.escape(full['title'])}</h2><audio controls preload="metadata" src="{full['mixFile']}"></audio><p class="sections">{sections}</p></section><section class="grid">{''.join(cards)}</section><button id="export">Export mockup ratings JSON</button></main><script>
const key='sonniss-ingame-sfx-mockup-v1';const baked=Object.fromEntries([...document.querySelectorAll('.card')].map(card=>[card.dataset.id,{{rating:'UNRATED',notes:''}}]));const saved={{...baked,...JSON.parse(localStorage.getItem(key)||'{{}}')}};document.querySelectorAll('.card').forEach(card=>{{const id=card.dataset.id,r=card.querySelector('.rating'),n=card.querySelector('.notes');r.value=saved[id].rating;n.value=saved[id].notes||'';const save=()=>{{saved[id]={{rating:r.value,notes:n.value}};localStorage.setItem(key,JSON.stringify(saved))}};r.onchange=save;n.oninput=save}});document.querySelector('#export').onclick=()=>{{const blob=new Blob([JSON.stringify({{source:'UNDERSTAR Sonniss in-game SFX mockup V1',exportedAt:new Date().toISOString(),ratings:saved}},null,2)],{{type:'application/json'}});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='sonniss-ingame-sfx-mockup-v1-review.json';a.click();URL.revokeObjectURL(a.href)}};
</script></body></html>'''
    (output / "index.html").write_text(page, encoding="utf-8")


def write_readmes(output: Path) -> None:
    (output / "readme.md").write_text("# Sonniss in-game SFX mockup V1\n\nReview-only sound-stage mixes built from explicitly approved Sonniss GameAudioGDC 2019 sources. Compound recordings are represented only by the exact source windows in `manifest.json`. No file is runtime-wired or runtime-eligible.\n", encoding="utf-8")
    (output / "mixes" / "readme.md").write_text("# Scenario mixes\n\nStereo 48 kHz PCM WAV mockups for listening review only.\n", encoding="utf-8")
    (output / "slices" / "readme.md").write_text("# Explicit source slices\n\nDeterministic source windows used by the scenario mixes. These are mockup derivatives, not final runtime assets.\n", encoding="utf-8")


def main() -> int:
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    if config["sampleRate"] != TARGET_RATE:
        raise ValueError(f"Configured rate must remain {TARGET_RATE}")
    manifest_path = (ROOT / config["sourceManifest"]).resolve()
    source_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    records = {record["id"]: record for record in source_manifest["records"]}
    output = (ROOT / config["outputDirectory"]).resolve()
    output.relative_to(ROOT.resolve())
    (output / "mixes").mkdir(parents=True, exist_ok=True)
    (output / "slices").mkdir(parents=True, exist_ok=True)
    results, audio_by_id, cache = [], {}, {}
    for scenario in config["scenarios"]:
        result, audio = render_scenario(scenario, records, source_root(manifest_path), output, config["outputCeilingDb"], cache)
        results.append(result)
        audio_by_id[scenario["id"]] = audio
    full = full_sequence(results, audio_by_id, output, config["fullSequenceGapSeconds"])
    manifest = {"schemaVersion": 1, "title": "UNDERSTAR recorded-source in-game SFX mockup V1", "createdAt": datetime.now(timezone.utc).isoformat(), "reviewOnly": True, "runtimeWired": False, "runtimeEligible": False, "sampleRate": TARGET_RATE, "channels": 2, "format": "PCM WAV 16-bit", "sourceManifest": manifest_path.relative_to(ROOT).as_posix(), "sourceApprovalCount": source_manifest["approvedSourceCount"], "mixingPolicy": "source-window slicing, peak normalization, gain, stereo pan, short anti-click fades, and final ceiling attenuation only", "scenarios": results, "fullSequence": full}
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    write_page(output, manifest)
    write_readmes(output)
    print(f"Rendered {len(results)} scenarios, {sum(item['eventCount'] for item in results)} timed events, and a {full['durationSeconds']:.2f}s full sequence")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
