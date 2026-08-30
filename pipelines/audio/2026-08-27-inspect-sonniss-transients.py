"""Print deterministic peak-window candidates for compound Sonniss recordings."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from audioWavMixer import read_wav, strongest_peak_times


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOT = ROOT / (
    "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"
    "sonniss-gdc2019-recorded-mining-pilot-2026-08-26"
)
DEFAULT_IDS = (
    "SONNISS19-MINE-18", "SONNISS19-MINE-28", "SONNISS19-MINE-32",
    "SONNISS19-SRC-063", "SONNISS19-SRC-077", "SONNISS19-SRC-097",
    "SONNISS19-SRC-100", "SONNISS19-SRC-101", "SONNISS19-SRC-104",
    "SONNISS19-SRC-109", "SONNISS19-SRC-116",
)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ids", default=",".join(DEFAULT_IDS))
    parser.add_argument("--count", type=int, default=8)
    args = parser.parse_args()
    wanted = {item.strip() for item in args.ids.split(",") if item.strip()}
    manifest = json.loads((SOURCE_ROOT / "manifest.json").read_text(encoding="utf-8"))
    records = {record["id"]: record for record in manifest["records"]}
    missing = sorted(wanted - records.keys())
    if missing:
        raise ValueError(f"Unknown source IDs: {', '.join(missing)}")
    for source_id in sorted(wanted):
        record = records[source_id]
        audio = read_wav(SOURCE_ROOT / record["sourceFile"])
        peaks = strongest_peak_times(audio, count=args.count)
        print(f"{source_id} | {record['durationSeconds']:.2f}s | peaks={peaks}")
        print(f"  {Path(record['originalArchivePath']).name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
