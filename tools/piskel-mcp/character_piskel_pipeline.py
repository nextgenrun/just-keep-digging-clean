#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys

# Re-export the legacy helper surface so neighboring one-off tools keep working.
from piskel_artifacts import *  # noqa: F403
from piskel_commands import *  # noqa: F403
from piskel_document import *  # noqa: F403
from piskel_frame_polish import *  # noqa: F403
from piskel_pack import *  # noqa: F403


def parse_ids(value: str | None) -> list[str] | None:
    if not value:
        return None
    return [part.strip() for part in value.split(",") if part.strip()]


def main() -> int:
    parser = argparse.ArgumentParser(description="Piskel bridge for Just Keep Digging character assets.")
    parser.add_argument(
        "command",
        choices=["list", "import", "export", "audit", "preview", "pack", "validate", "align", "polish"],
    )
    parser.add_argument("--ids", help="Comma-separated animation ids. Defaults to all manifest animations.")
    parser.add_argument("--json", action="store_true", help="Emit JSON only.")
    args = parser.parse_args()
    try:
        manifest = load_manifest()  # noqa: F405
        entries = select_entries(manifest, parse_ids(args.ids))  # noqa: F405
        commands = {
            "list": list_entries,  # noqa: F405
            "import": import_entries,  # noqa: F405
            "export": export_entries,  # noqa: F405
            "audit": audit_entries,  # noqa: F405
            "preview": build_previews,  # noqa: F405
            "pack": build_all_pack,  # noqa: F405
            "validate": validate_entries,  # noqa: F405
            "align": auto_align_entries,  # noqa: F405
            "polish": auto_align_entries,  # noqa: F405
        }
        result = commands[args.command](entries)
    except Exception as error:
        result = {"ok": False, "error": str(error)}
    print(json.dumps(result, indent=2))
    return 0 if result.get("ok") else 1


if __name__ == "__main__":
    sys.exit(main())
