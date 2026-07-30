#!/usr/bin/env python3
"""Fail-closed pre/post-commit health gate for the Heavenblocks rebuild."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def find_node() -> str:
    located = shutil.which("node")
    candidates = [Path(located)] if located else []
    runtime_root = Path(sys.executable).resolve().parent.parent
    candidates.extend(
        [
            runtime_root / "node/bin/node.exe",
            runtime_root / "node/bin/node",
            Path.home()
            / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe",
        ]
    )
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate.resolve())
    raise RuntimeError("Node.js was not found")


def run(label: str, command: list[str]) -> bool:
    print(f"[HEAVENBLOCKS GATE] {label}")
    result = subprocess.run(
        command,
        cwd=ROOT,
        env={**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0", "PYTHONUTF8": "1"},
        check=False,
    )
    if result.returncode != 0:
        print(f"[HEAVENBLOCKS GATE] FAIL {label} ({result.returncode})", file=sys.stderr)
        return False
    return True


def main() -> int:
    node = find_node()
    commands = [
        (
            "native world contract",
            [node, "testing/2026-07-29-heavenblocks-native-world-contract.mjs"],
        ),
        (
            "complete gameplay regression",
            [
                sys.executable,
                "testing/2026-07-22-deep-game-logic-health.py",
                "--timeout",
                "240",
            ],
        ),
        (
            "production builder contract",
            [sys.executable, "testing/2026-07-18-production-deployment-smoke.py"],
        ),
    ]
    for label, command in commands:
        if not run(label, command):
            return 1

    with tempfile.TemporaryDirectory(
        prefix=".heavenblocks-canary-",
        dir=ROOT,
    ) as temporary:
        output = Path(temporary) / "dist"
        if not run(
            "isolated production package",
            [
                sys.executable,
                "tools/2026-07-17-build-production.py",
                "--out-dir",
                str(output),
            ],
        ):
            return 1
        if not run(
            "production HTTP and rollback identity",
            [
                sys.executable,
                "testing/2026-07-25-production-http-canary.py",
                "--directory",
                str(output),
            ],
        ):
            return 1

    print("HEAVENBLOCKS_COMMIT_GATE PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
