"""Prepare the exact user-approved Freesound export; never touch review decisions."""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from elevenLabsAudioQc import find_ffmpeg
from freesoundApprovedPreparation import classify, digest, prepare

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "values/freesoundAudioPreparation.json"
CATALOG = ROOT / "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/freesound-review-2026-09-03/catalog.json"
OUTPUT = ROOT / "sound/soundEffects/approved-freesound-2026-09-03"
EVIDENCE = ROOT / "testing/audio-review-2026-09-03"
GENERATED = ROOT / "values/generated/approved-freesound"


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def download(entry, destination, config):
    if destination.is_file():
        return
    url = entry["previewUrl"]
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "cdn.freesound.org" or not parsed.path.startswith("/previews/"):
        raise ValueError(f"Untrusted preview URL: {entry['id']}")
    request = Request(url, headers={"User-Agent": "UnderstarApprovedAudioPreparation/1.0"})
    with urlopen(request, timeout=config["downloadTimeoutSeconds"]) as response:
        data = response.read(config["maxDownloadBytes"] + 1)
        if not data or len(data) > config["maxDownloadBytes"]:
            raise ValueError(f"Invalid preview size: {entry['id']}")
    destination.write_bytes(data)
    time.sleep(config["downloadPaceSeconds"])


def project_runtime(entries, config, export_hash):
    # Generated data only; importing it and routing actual events is a separate,
    # explicit runtime change. One family per file keeps projections small.
    GENERATED.mkdir(parents=True, exist_ok=True)
    families = sorted(set(item["family"] for item in entries))
    imports, spreads = [], []
    for index, family in enumerate(families):
        selected = [item for item in entries if item["family"] == family]
        lines = ["// Generated from the frozen approved export and measured derivatives.", "export default Object.freeze(["]
        for item in selected:
            asset = {key: item[key] for key in ["id", "key", "path", "role", "family", "palette", "title", "creator", "sourceUrl", "licenseDeclared", "licenseUrl"]}
            asset.update(duration=item["after"]["duration"], peak=item["after"]["peak"], activeRmsDb=item["after"]["activeRmsDb"],
                         gain=config["roles"][item["role"]]["gain"], loop=item["loop"],
                         channels=item["channels"], approved=True)
            lines.append("  Object.freeze(" + json.dumps(asset, ensure_ascii=False, separators=(",", ":")) + "),")
        lines.append("]);")
        (GENERATED / f"{family}.js").write_text("\n".join(lines) + "\n", encoding="utf-8")
        imports.append(f'import family{index} from "./{family}.js";')
        spreads.append(f"...family{index}")
    index_text = "\n".join(imports) + "\n"
    index_text += "export const FREESOUND_APPROVAL_HASH = " + json.dumps(export_hash) + ";\n"
    index_text += "export const FREESOUND_LEVEL_POLICY = Object.freeze(" + json.dumps({
        "targetRmsDb": config["activeRmsDb"], "minimum": config["minimumRoleGainMatch"],
        "maximum": config["maximumRoleGainMatch"]}, separators=(",", ":")) + ");\n"
    index_text += "export const FREESOUND_ROLE_SETTINGS = Object.freeze(" + json.dumps(config["roles"], separators=(",", ":")) + ");\n"
    index_text += "export const FREESOUND_APPROVED_LIST = Object.freeze([" + ",".join(spreads) + "]);\n"
    index_text += "export const FREESOUND_APPROVED_ASSETS = Object.freeze(Object.fromEntries(FREESOUND_APPROVED_LIST.map(asset => [asset.id, asset])));\n"
    (GENERATED / "index.js").write_text(index_text, encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--decisions", required=True)
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--project-only", action="store_true", help="Rebuild role metadata only from a complete hash-verified preparation")
    args = parser.parse_args()
    source_export = Path(args.decisions)
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    export_hash = digest(source_export)
    if export_hash != config["decisionSha256"]:
        raise ValueError("Decision export differs from the explicitly authorized plan")
    decisions = json.loads(source_export.read_text(encoding="utf-8"))
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))["candidates"]
    approved = [entry for entry in catalog if decisions["decisions"].get(entry["id"]) == "approved"]
    if len(approved) != config["approvedCount"] or len({entry["id"] for entry in approved}) != len(approved):
        raise ValueError("Incomplete or duplicate approval coverage")
    for entry in approved:
        if entry["licenseDeclared"] not in {"CC0-1.0", "CC-BY-3.0", "CC-BY-4.0"}:
            raise ValueError(f"Uncleared license: {entry['id']}")
        classify(entry, config)
    print(json.dumps({"approved": len(approved), "execute": args.execute, "decisionSha256": export_hash}), flush=True)
    if not args.execute:
        return
    if args.project_only:
        previous = json.loads((OUTPUT / "manifest.json").read_text(encoding="utf-8"))
        assets = previous["assets"]
        if previous["decisionSha256"] != export_hash or len(assets) != len(approved):
            raise ValueError("Projection requires the complete matching preparation")
        for item in assets:
            if digest(ROOT / item["path"]) != item["sha256"]:
                raise ValueError(f"Derivative changed: {item['id']}")
        project_runtime(assets, config, export_hash)
        print(json.dumps({"projected": len(assets), "networkRequests": 0}), flush=True)
        return
    ffmpeg = find_ffmpeg()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / "source-previews").mkdir(exist_ok=True)
    (EVIDENCE / "freesound-approved-decisions.json").write_bytes(source_export.read_bytes())
    manifest_path = OUTPUT / "manifest.json"
    previous = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    cached = {item["id"]: item for item in previous.get("assets", [])}
    prepared, errors = [], []
    for index, entry in enumerate(approved):
        role = classify(entry, config)
        destination = OUTPUT / f"{entry['id']}.ogg"
        source = OUTPUT / "source-previews" / f"{entry['id']}.mp3"
        existing = cached.get(entry["id"])
        try:
            if existing and existing.get("role") == role and destination.is_file() and digest(destination) == existing["sha256"]:
                item = existing
            else:
                download(entry, source, config)
                item = {key: entry[key] for key in ["id", "soundId", "family", "title", "creator", "sourceUrl", "licenseDeclared", "licenseUrl", "previewUrl"]}
                item.update(key=f"fs-approved-{entry['soundId']}", role=role,
                            palette=str(entry.get("pack") or entry["creator"]),
                            path=destination.relative_to(ROOT).as_posix(),
                            sourceKind="Freesound HQ MP3 preview; not a lossless original",
                            originalDownloaded=False, approved=True,
                            **prepare(entry, role, source, destination, config, ffmpeg))
            prepared.append(item)
        except Exception as error:
            errors.append({"id": entry["id"], "error": str(error)[:240]})
            print(json.dumps(errors[-1]), flush=True)
        if (index + 1) % 20 == 0 or index + 1 == len(approved):
            report = {"schemaVersion": 1, "decisionSha256": export_hash, "approvedCount": len(approved),
                      "preparedCount": len(prepared), "assets": prepared, "errors": errors}
            write_json(manifest_path, report)
            print(json.dumps({"progress": index + 1, "prepared": len(prepared), "errors": len(errors)}), flush=True)
    write_json(EVIDENCE / "freesound-preparation-audit.json", report)
    if errors or len(prepared) != len(approved):
        raise RuntimeError("Not all approved files are ready; projection withheld. Resume after fixing reported failures.")
    project_runtime(prepared, config, export_hash)
    credits = ["UNDERSTAR — approved Freesound audio, 2026-09-03", "",
               "Source recordings by the creators below, licensed as listed.",
               "Changes: HQ-preview derivation, onset/tail edits, level matching, loop seam treatment,",
               "and mono downmix for positional Star sources. Original recordings were not downloaded.", ""]
    for item in sorted(prepared, key=lambda item: (item["creator"].lower(), item["soundId"])):
        credits.extend([f"{item['title']} — {item['creator']} (Freesound {item['soundId']})",
                        item["sourceUrl"], f"{item['licenseDeclared']}: {item['licenseUrl']}", ""])
    (OUTPUT / "CREDITS.txt").write_text("\n".join(credits), encoding="utf-8")
    print(json.dumps({"complete": True, "prepared": len(prepared), "bytes": sum(item["bytes"] for item in prepared)}), flush=True)


if __name__ == "__main__":
    main()
