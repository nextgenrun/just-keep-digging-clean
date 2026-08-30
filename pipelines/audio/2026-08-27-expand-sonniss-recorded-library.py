"""Select and optionally extract a bounded Sonniss 2019 source expansion."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from sonnissRemoteZipSearch import extract_entry


ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = Path(__file__).with_name("2026-08-27-sonniss-recorded-expansion.json")
DESIGNED_PACKAGES = (
    "Airborne Sound - Airy Whooshes", "Airborne Sound - Electric-Magnetic",
    "BlueZone - Dark Mesa", "BlueZone - Heavy Metal", "SoundMorph",
    "Rock The Speakerbox", "Magic Spells", "GLITCH FACTORY", "3maze - IMPACTUS",
)


def package_name(filename: str) -> str:
    parts = filename.split("/")
    return parts[1] if len(parts) > 1 else ""


def existing_paths(output: Path) -> set[str]:
    paths = set()
    for index_path in output.glob("source-index-part*.json"):
        payload = json.loads(index_path.read_text(encoding="utf-8"))
        for archive in payload.get("archives", []):
            paths.update(entry["filename"] for entry in archive.get("matches", []))
    return paths


def matches_group(entry: dict, group: dict) -> bool:
    filename = entry["filename"]
    lowered = filename.lower()
    if package_name(filename) not in group["packages"]:
        return False
    includes = [term.lower() for term in group.get("includeTerms", [])]
    excludes = [term.lower() for term in group.get("excludeTerms", [])]
    return (not includes or any(term in lowered for term in includes)) and not any(term in lowered for term in excludes)


def source_kind(package: str) -> str:
    return "designed-library-sample" if any(term.lower() in package.lower() for term in DESIGNED_PACKAGES) else "recorded-source-sample"


def make_selection(config: dict, candidate_index: dict, existing: set[str]) -> list[dict]:
    available = []
    for archive in candidate_index["archives"]:
        for entry in archive["matches"]:
            available.append((archive["part"], archive["url"], entry))
    selected = []
    selected_paths = set()
    total_bytes = 0
    for group in config["groups"]:
        candidates = []
        for part, url, entry in available:
            filename = entry["filename"]
            if filename in existing or filename in selected_paths:
                continue
            if Path(filename).suffix.lower() != ".wav" or entry["uncompressedBytes"] > config["maxFileBytes"]:
                continue
            if matches_group(entry, group):
                candidates.append((part, url, entry))
        candidates.sort(key=lambda item: (package_name(item[2]["filename"]).lower(), item[2]["filename"].lower()))
        for part, url, entry in candidates[: group["maxFiles"]]:
            if total_bytes + entry["uncompressedBytes"] > config["maxTotalBytes"]:
                continue
            copied = f"{Path(entry['filename']).stem[:36].replace(' ', '-')}-p{part}-{entry['crc32']:08x}.wav"
            copied = "".join(character if character.isalnum() or character in "-_." else "-" for character in copied)
            selected.append({**entry, "part": part, "url": url, "package": package_name(entry["filename"]), "copiedFile": copied, "family": group["family"], "targetAssets": group["targetAssets"], "listenFor": group["listenFor"], "sourceKind": source_kind(package_name(entry["filename"]))})
            selected_paths.add(entry["filename"])
            total_bytes += entry["uncompressedBytes"]
    return selected


def write_indexes(output: Path, selection_path: Path, source_index_path: Path, selected: list[dict], extracted: bool) -> None:
    total = sum(entry["uncompressedBytes"] for entry in selected)
    selection = {"schemaVersion": 1, "source": "Sonniss GameAudioGDC 2019", "reviewOnly": True, "runtimeWired": False, "extracted": extracted, "selectedCount": len(selected), "selectedBytes": total, "entries": selected}
    selection_path.write_text(json.dumps(selection, indent=2, ensure_ascii=False), encoding="utf-8")
    archives = []
    for part in sorted({entry["part"] for entry in selected}):
        matches = [{key: value for key, value in entry.items() if key not in ("part", "url", "package")} for entry in selected if entry["part"] == part]
        archives.append({"part": part, "url": next(entry["url"] for entry in selected if entry["part"] == part), "matchCount": len(matches), "matches": matches})
    source_index = {"schemaVersion": 1, "source": "Sonniss GameAudioGDC 2019", "selectionFile": selection_path.name, "extracted": extracted, "archives": archives}
    source_index_path.write_text(json.dumps(source_index, indent=2, ensure_ascii=False), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--extract", action="store_true")
    args = parser.parse_args()
    config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    output = (ROOT / config["outputDirectory"]).resolve()
    output.relative_to(ROOT.resolve())
    candidate_path = (ROOT / config["candidateIndex"]).resolve()
    candidate_index = json.loads(candidate_path.read_text(encoding="utf-8"))
    selected = make_selection(config, candidate_index, existing_paths(output))
    if args.extract:
        destination = output / "source-recordings"
        destination.mkdir(parents=True, exist_ok=True)
        for number, entry in enumerate(selected, start=1):
            print(f"[{number}/{len(selected)}] part {entry['part']} · {Path(entry['filename']).name}", flush=True)
            extract_entry(entry["url"], entry, destination, entry["copiedFile"])
    destination = output / "source-recordings"
    extracted = all(
        (destination / entry["copiedFile"]).exists()
        and (destination / entry["copiedFile"]).stat().st_size == entry["uncompressedBytes"]
        for entry in selected
    )
    selection_path = output / config["selectionFile"]
    source_index_path = output / config["sourceIndexFile"]
    write_indexes(output, selection_path, source_index_path, selected, extracted)
    print(f"Selected {len(selected)} new sources ({sum(entry['uncompressedBytes'] for entry in selected) / 1048576:.1f} MiB); extracted={extracted}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
