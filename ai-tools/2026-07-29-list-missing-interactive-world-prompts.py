"""Emit a small, non-truncated batch of missing interactive-world prompts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REVIEW_DIR = ROOT / "visual-approval-previews" / "interactive-world-states-v1"
MANIFEST_PATH = (
    REVIEW_DIR / "2026-07-29-interactive-world-states-prompts-v1.json"
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("start", type=int)
    parser.add_argument("count", type=int)
    args = parser.parse_args()
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    records = manifest["records"]
    if args.start < 0 or args.count < 1 or args.start + args.count > len(records):
        raise RuntimeError("Requested range is outside the 0..99 prompt set")
    selected = []
    for record in records[args.start:args.start + args.count]:
        source_path = REVIEW_DIR / record["sourceFile"]
        if source_path.is_file():
            continue
        selected.append({
            "index": record["index"],
            "assetId": record["assetId"],
            "prompt": record["prompt"],
        })
    print(json.dumps(selected))


if __name__ == "__main__":
    main()
