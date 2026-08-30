"""Build the local A/B review page for an ElevenLabs prompt contrast batch."""

from __future__ import annotations

import html
import json
from pathlib import Path


RATING_OPTIONS = ["UNRATED", "GOOD", "MAYBE", "REJECT"]


def _rating_controls(rating_options: list[str]) -> str:
    options = "".join(f'<option value="{value}">{value}</option>' for value in rating_options)
    return (
        f'<label>Verdict <select class="rating">{options}</select></label>'
        '<label>Notes <input class="notes" placeholder="Why does it work or fail?"></label>'
    )


def _candidate_row(job: dict, ready: bool, rating_options: list[str]) -> str:
    qc = job.get("qc") or {}
    qc_flags = qc.get("flags") or []
    state = ("ready" if ready else "pending") + (" quarantined" if qc_flags else "")
    audio = (
        f'<audio controls preload="metadata" src="{html.escape(job["file"], quote=True)}"'
        f'{" loop" if job["loop"] else ""}></audio>'
        if ready
        else '<div class="missing">Generation pending</div>'
    )
    duration = f'{job["durationSeconds"]:g}s' if job.get("durationSeconds") else "auto duration"
    qc_html = (
        '<div class="qc quarantine"><b>AUTO-QUARANTINE:</b> '
        f'{html.escape(", ".join(qc_flags))}</div>'
        if qc_flags else (
            '<div class="qc pass">Automated spectrum gate passed; listening is still required.</div>'
            if qc.get("verdict") == "REVIEW" else ""
        )
    )
    return (
        f'<section class="candidate {state}" data-key="{html.escape(job["jobKey"], quote=True)}" '
        f'data-kind="candidate" data-prompt="{html.escape(job["prompt"], quote=True)}">'
        '<div class="candidate-head">'
        f'<div><span class="pill">NEW</span><h3>{html.escape(job["title"])}</h3>'
        f'<small>{duration} · influence {job["promptInfluence"]:g}'
        f'{" · seamless loop" if job["loop"] else ""}</small></div>{audio}</div>'
        f'<details><summary>Prompt</summary><p>{html.escape(job["prompt"])}</p></details>'
        f'{qc_html}<div class="review">{_rating_controls(rating_options)}</div></section>'
    )


def _baseline_row(output_dir: Path, asset: dict, rating_options: list[str]) -> str:
    baseline = output_dir.parent / asset["baselineFile"]
    relative = f"../{asset['baselineFile']}"
    audio = (
        f'<audio controls preload="metadata" src="{html.escape(relative, quote=True)}"'
        f'{" loop" if asset["type"] == "Loop" else ""}></audio>'
        if baseline.exists()
        else '<div class="missing">Previous reference file missing</div>'
    )
    key = f'{asset["id"]}:baseline-v2'
    return (
        f'<section class="candidate baseline" data-key="{html.escape(key, quote=True)}" '
        f'data-kind="baseline" data-prompt="Previous v2 reference mix" '
        f'data-initial-rating="{html.escape(asset.get("baselineVerdict", "UNRATED"), quote=True)}">'
        '<div class="candidate-head"><div><span class="pill old">OLD</span>'
        '<h3>Previous reference mix</h3><small>Original broad prompt</small></div>'
        f'{audio}</div><div class="review">{_rating_controls(rating_options)}</div></section>'
    )


def write_prompt_contrast_review_page(output_dir: Path, config: dict, jobs: list[dict]) -> None:
    rating_options = config.get("ratingOptions", RATING_OPTIONS)
    ready_count = sum((output_dir / job["file"]).exists() for job in jobs)
    quarantine_count = sum(bool((job.get("qc") or {}).get("flags")) for job in jobs)
    jobs_by_asset: dict[str, list[dict]] = {}
    for job in jobs:
        jobs_by_asset.setdefault(job["assetId"], []).append(job)
    cards: list[str] = []
    for asset in config["assets"]:
        asset_jobs = jobs_by_asset.get(asset["id"])
        if not asset_jobs:
            continue
        candidates = "".join(
            _candidate_row(job, (output_dir / job["file"]).exists(), rating_options)
            for job in asset_jobs
        )
        cards.append(
            f'<article class="card" data-asset="{html.escape(asset["id"], quote=True)}">'
            '<header><div>'
            f'<span class="asset-id">{html.escape(asset["id"])}</span>'
            f'<h2>{html.escape(asset["name"].replace("_", " ").title())}</h2>'
            f'<p>{html.escape(asset["objective"])}</p></div></header>'
            '<div class="criteria">'
            f'<p><b>Listen for:</b> {html.escape(asset["listeningFor"])}</p>'
            f'<p><b>Reject if:</b> {html.escape(asset["rejectIf"])}</p></div>'
            f'{_baseline_row(output_dir, asset, rating_options) if asset.get("baselineFile") else ""}'
            f'{candidates}</article>'
        )
    metadata = html.escape(json.dumps({"assets": len(cards), "jobs": len(jobs)}), quote=True)
    storage_key = json.dumps(config["reviewStorageKey"])
    page_title = html.escape(config.get("reviewTitle", "ElevenLabs prompt contrast lab"))
    page_label = html.escape(config.get("reviewLabel", "REVIEW-ONLY · UNTESTED · V3"))
    page_heading = html.escape(config.get("reviewHeading", "Prompt contrast lab"))
    page_intro = html.escape(config.get(
        "reviewIntro",
        "Compare each previous broad-prompt reference with candidates built from distinct physical materials. Rate individual candidates; the export lets the useful results guide the next generation pass.",
    ))
    page_notice = html.escape(config.get(
        "reviewNotice",
        "Nothing here is wired into the game. Headphones recommended. Judge identity and repeatability before loudness.",
    ))
    export_file = json.dumps(config.get(
        "reviewExportFile", "elevenlabs-prompt-contrast-v3-review.json"
    ))
    page = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{page_title}</title>
<style>
:root{{--bg:#090d12;--panel:#121923;--line:#2a3747;--text:#edf2f7;--muted:#98a7ba;--accent:#78e0b6;--old:#efb35e}}
*{{box-sizing:border-box}}body{{margin:0;background:radial-gradient(circle at top,#182538,var(--bg) 42%);color:var(--text);font:15px/1.5 system-ui,sans-serif}}
main{{width:min(1160px,94vw);margin:auto;padding:38px 0 80px}}h1{{font-size:clamp(30px,5vw,54px);margin:4px 0}}h2,h3{{margin:0}}.intro{{max-width:800px;color:var(--muted)}}
.topbar{{display:flex;justify-content:space-between;gap:16px;align-items:end;flex-wrap:wrap}}.top-actions{{display:flex;gap:9px;flex-wrap:wrap}}button,select,input{{border:1px solid #40516a;background:#0d141d;color:var(--text);border-radius:8px;padding:9px 11px}}button{{cursor:pointer;background:#17503b;border-color:#2b795b}}
.notice,.criteria{{border:1px solid #765f29;background:#241e10;border-radius:11px;padding:11px 15px;margin:18px 0}}.grid{{display:grid;gap:22px}}.card{{background:#111923eF;border:1px solid var(--line);border-radius:17px;padding:19px;box-shadow:0 18px 55px #0005}}
.asset-id,.pill{{color:var(--accent);font:700 12px ui-monospace,monospace}}.pill{{border:1px solid #2b795b;border-radius:999px;padding:2px 7px;margin-right:8px}}.pill.old{{color:var(--old);border-color:#8c6831}}header p,.criteria p{{margin:7px 0}}
.candidate{{border-top:1px solid var(--line);padding:14px 0}}.candidate-head{{display:grid;grid-template-columns:minmax(240px,1fr) minmax(300px,1.5fr);gap:18px;align-items:center}}.candidate h3{{display:inline;font-size:17px}}small,summary{{color:var(--muted)}}audio{{width:100%}}.missing{{color:#e49b9b}}
details{{margin:9px 0}}details p{{margin:7px 0;color:#c6d1de}}.review{{display:flex;gap:12px;flex-wrap:wrap}}.review label{{display:flex;align-items:center;gap:8px}}.notes{{width:min(460px,64vw)}}
.qc{{margin:9px 0;padding:8px 10px;border-radius:8px;font-size:13px}}.qc.quarantine{{border:1px solid #9a4850;background:#32161b;color:#ffb8bf}}.qc.pass{{border:1px solid #2b795b;background:#112b23;color:#a8e7cf}}
.hide-quarantine .candidate.quarantined{{display:none}}
@media(max-width:720px){{.candidate-head{{display:flex;align-items:stretch;flex-direction:column}}audio{{width:100%}}.notes{{width:65vw}}}}
</style></head><body><main class="hide-quarantine" data-metadata="{metadata}">
<div class="topbar"><div><span class="asset-id">{page_label}</span><h1>{page_heading}</h1></div><div class="top-actions"><button id="toggle-quarantine">Show {quarantine_count} quarantined</button><button id="export">Export ratings JSON</button></div></div>
<p class="intro">{page_intro}</p>
<div class="notice">{page_notice}</div>
<section class="grid">{''.join(cards)}</section></main>
<script>
const prefix={storage_key};
const storageKey=key=>`${{prefix}}:${{key}}`;
const main=document.querySelector('main'),toggle=document.querySelector('#toggle-quarantine');
toggle.onclick=()=>{{const hidden=main.classList.toggle('hide-quarantine');toggle.textContent=hidden?'Show {quarantine_count} quarantined':'Hide quarantined'}};
document.querySelectorAll('.candidate').forEach(row=>{{
 const saved=JSON.parse(localStorage.getItem(storageKey(row.dataset.key))||'{{}}');
 const rating=row.querySelector('.rating'),notes=row.querySelector('.notes');
 rating.value=saved.rating||row.dataset.initialRating||'UNRATED';notes.value=saved.notes||'';
 const persist=()=>localStorage.setItem(storageKey(row.dataset.key),JSON.stringify({{rating:rating.value,notes:notes.value}}));
 rating.onchange=persist;notes.oninput=persist;
}});
document.querySelector('#export').onclick=()=>{{
 const rows=[...document.querySelectorAll('.candidate')].map(row=>({{
  key:row.dataset.key,kind:row.dataset.kind,prompt:row.dataset.prompt,
  rating:row.querySelector('.rating').value,notes:row.querySelector('.notes').value
 }}));
 const blob=new Blob([JSON.stringify({{schemaVersion:1,exportedAt:new Date().toISOString(),reviews:rows}},null,2)],{{type:'application/json'}});
 const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download={export_file};link.click();URL.revokeObjectURL(link.href);
}};
</script></body></html>'''
    (output_dir / "index.html").write_text(page, encoding="utf-8")
    (output_dir / "readme.md").write_text(
        f"# {config.get('reviewHeading', 'ElevenLabs prompt contrast V3')}\n\n"
        f"Review-only library with {len(jobs)} candidates; {ready_count} currently have audio "
        f"and {quarantine_count} are hidden by the automated quarantine gate. "
        "Open `index.html` to compare the previous broad-prompt references with the new "
        "physical-material candidates. Rate individual rows and use "
        "**Export ratings JSON** to preserve the listening decisions. Nothing is runtime-wired.\n",
        encoding="utf-8",
    )
