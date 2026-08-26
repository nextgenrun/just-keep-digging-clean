"""Build a self-contained browser sampler for an ElevenLabs review batch."""

from __future__ import annotations

import html
import json
from pathlib import Path


RATING_OPTIONS = ["UNRATED", "GOOD", "NEEDS_EDIT", "REJECT"]


def _audio_row(job: dict, ready: bool) -> str:
    label = html.escape(job["layer"].replace("-", " ").title())
    if not ready:
        return f'<div class="layer missing"><b>{label}</b><span>generation missing</span></div>'
    loop_attribute = " loop" if job["loop"] else ""
    role = html.escape(job["role"])
    filename = html.escape(job["file"], quote=True)
    return (
        f'<div class="layer" data-role="{role}">'
        f'<div><b>{label}</b><small>{job["durationSeconds"]:g}s · {role}</small></div>'
        f'<audio controls preload="metadata" src="{filename}"{loop_attribute}></audio>'
        '<label class="volume">Mix <input type="range" min="0" max="1" step="0.05" value="0.7"></label>'
        "</div>"
    )


def write_review_page(output_dir: Path, assets: list[dict], jobs: list[dict]) -> None:
    jobs_by_asset: dict[str, list[dict]] = {}
    for job in jobs:
        jobs_by_asset.setdefault(job["assetId"], []).append(job)
    cards: list[str] = []
    for asset in assets:
        asset_jobs = jobs_by_asset.get(asset["id"], [])
        rows = "".join(_audio_row(job, (output_dir / job["file"]).exists()) for job in asset_jobs)
        options = "".join(f'<option value="{value}">{value}</option>' for value in RATING_OPTIONS)
        cards.append(
            f'<article class="card" data-asset="{html.escape(asset["id"])}">'
            f'<header><div><span class="asset-id">{html.escape(asset["id"])}</span>'
            f'<h2>{html.escape(asset["name"].replace("_", " ").title())}</h2></div>'
            '<div class="actions"><button class="play-layers">Play isolated mix</button>'
            '<button class="stop">Stop</button></div></header>'
            f'<p>{html.escape(asset["prompt"])}</p>{rows}'
            f'<footer><label>Verdict <select class="rating">{options}</select></label>'
            '<label>Notes <input class="notes" placeholder="What works or fails?"></label></footer>'
            "</article>"
        )
    metadata = html.escape(json.dumps({"assets": len(assets), "jobs": len(jobs)}))
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ElevenLabs layered SFX mockup</title>
<style>
:root{{--bg:#0a0d12;--panel:#121821;--line:#273241;--text:#e8edf4;--muted:#92a0b1;--accent:#72e0b7}}
*{{box-sizing:border-box}} body{{margin:0;background:radial-gradient(circle at top,#172231,var(--bg) 40%);color:var(--text);font:15px/1.45 system-ui,sans-serif}}
main{{width:min(1180px,94vw);margin:auto;padding:40px 0 80px}} h1{{font-size:clamp(28px,5vw,52px);margin:0}} .intro{{color:var(--muted);max-width:780px}}
.notice{{border:1px solid #8a6c26;background:#251e0e;padding:12px 16px;border-radius:10px;margin:22px 0}} .grid{{display:grid;gap:18px}}
.card{{background:color-mix(in srgb,var(--panel) 94%,transparent);border:1px solid var(--line);border-radius:16px;padding:18px;box-shadow:0 18px 50px #0005}}
header,footer,.layer{{display:flex;align-items:center;gap:14px}} header{{justify-content:space-between}} h2{{margin:2px 0 0;font-size:20px}} .asset-id{{color:var(--accent);font:700 12px ui-monospace,monospace}}
.actions{{display:flex;gap:8px}} button,select,input{{border:1px solid #39485b;background:#0e141c;color:var(--text);border-radius:8px;padding:9px 11px}} button{{cursor:pointer}} .play-layers{{background:#164936;border-color:#267356}}
.layer{{display:grid;grid-template-columns:minmax(145px,1fr) minmax(280px,2.5fr) minmax(110px,.8fr);border-top:1px solid var(--line);padding:12px 0}} .layer small{{display:block;color:var(--muted)}} audio{{width:100%}} .volume{{color:var(--muted)}} .volume input{{width:100%;padding:0}}
.missing{{color:#e59b9b}} footer{{margin-top:14px;flex-wrap:wrap}} footer label{{display:flex;align-items:center;gap:8px}} .notes{{width:min(420px,65vw)}}
@media(max-width:760px){{header,.layer{{display:flex;align-items:stretch;flex-direction:column}}.actions button{{flex:1}}audio{{width:100%}}}}
</style></head><body><main data-metadata="{metadata}">
<span class="asset-id">REVIEW-ONLY · UNTESTED</span><h1>ElevenLabs layered SFX mockup</h1>
<p class="intro">Eight representative Dig Game sounds. Audition the complete reference effect first, then compare the isolated layers or play those layers together. Ratings stay in this browser only.</p>
<div class="notice">Nothing here is wired into the game. Promote only sounds explicitly rated GOOD after listening.</div>
<section class="grid">{''.join(cards)}</section></main>
<script>
const key = id => `elevenlabs-sfx-review:${{id}}`;
function stop(card){{card.querySelectorAll('audio').forEach(a=>{{a.pause();a.currentTime=0}})}}
document.querySelectorAll('.card').forEach(card=>{{
 const saved=JSON.parse(localStorage.getItem(key(card.dataset.asset))||'{{}}');
 const rating=card.querySelector('.rating'), notes=card.querySelector('.notes'); rating.value=saved.rating||'UNRATED'; notes.value=saved.notes||'';
 const persist=()=>localStorage.setItem(key(card.dataset.asset),JSON.stringify({{rating:rating.value,notes:notes.value}})); rating.onchange=persist; notes.oninput=persist;
 card.querySelector('.stop').onclick=()=>stop(card);
 card.querySelector('.play-layers').onclick=()=>{{stop(card); card.querySelectorAll('.layer[data-role="layer"]').forEach(row=>{{const a=row.querySelector('audio'); a.volume=Number(row.querySelector('input[type="range"]').value); a.play()}})}};
}});
</script></body></html>'''
    (output_dir / "index.html").write_text(page, encoding="utf-8")
    (output_dir / "readme.md").write_text(
        "# ElevenLabs layered SFX mockup\n\n"
        "Review-only output. Open `index.html`, listen to each reference mix and isolated layer, "
        "then mark the sound GOOD, NEEDS_EDIT, or REJECT. Nothing is runtime-wired.\n",
        encoding="utf-8",
    )
