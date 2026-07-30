#!/usr/bin/env python3
"""Prove the guarded commit preserves success and auto-reverts post-check failure."""

from __future__ import annotations

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GUARD = ROOT / "tools/2026-07-29-guarded-git-commit.py"


def find_git() -> str | None:
    located = shutil.which("git")
    candidates = [Path(located)] if located else []
    candidates.append(
        Path.home()
        / ".cache/codex-runtimes/codex-primary-runtime/dependencies/native/git/cmd/git.exe"
    )
    return str(next((path for path in candidates if path.is_file()), "")) or None


def run(command: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        cwd=cwd,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=True,
        check=check,
    )


def main() -> int:
    git = find_git()
    if not git:
        print("guarded Git rollback contract requires git", file=sys.stderr)
        return 1
    with tempfile.TemporaryDirectory(prefix="guarded-git-contract-") as temporary:
        root = Path(temporary)
        repo = root / "repo"
        repo.mkdir()
        run([git, "init", "-b", "main"], repo)
        run([git, "config", "user.name", "Rollback Contract"], repo)
        run([git, "config", "user.email", "rollback-contract@example.invalid"], repo)
        value = repo / "value.txt"
        value.write_text("base\n", encoding="utf-8")
        run([git, "add", "value.txt"], repo)
        run([git, "commit", "-m", "base"], repo)

        value.write_text("green\n", encoding="utf-8")
        run([git, "add", "value.txt"], repo)
        success = run(
            [
                sys.executable,
                str(GUARD),
                "--repo",
                str(repo),
                "--git",
                git,
                "--message",
                "green candidate",
                "--gate-command",
                sys.executable,
                "-c",
                "raise SystemExit(0)",
            ],
            repo,
        )
        assert "GUARDED_COMMIT_PASS" in success.stdout
        assert value.read_text(encoding="utf-8") == "green\n"

        marker = root / "post-check.marker"
        gate = root / "fail_second_gate.py"
        gate.write_text(
            "from pathlib import Path\n"
            f"marker = Path({str(marker)!r})\n"
            "if marker.exists(): raise SystemExit(9)\n"
            "marker.write_text('preflight passed', encoding='utf-8')\n",
            encoding="utf-8",
        )
        value.write_text("broken\n", encoding="utf-8")
        run([git, "add", "value.txt"], repo)
        failed = run(
            [
                sys.executable,
                str(GUARD),
                "--repo",
                str(repo),
                "--git",
                git,
                "--message",
                "candidate with failing post-check",
                "--gate-command",
                sys.executable,
                str(gate),
            ],
            repo,
            check=False,
        )
        assert failed.returncode == 1
        assert "AUTO_ROLLBACK_COMPLETE" in failed.stdout
        assert value.read_text(encoding="utf-8") == "green\n"
        assert run([git, "status", "--porcelain"], repo).stdout.strip() == ""
        log = run([git, "log", "-3", "--pretty=%s"], repo).stdout
        assert "Revert \"candidate with failing post-check\"" in log

    print("guarded Git commit contract: successful commits persist and failed post-checks auto-revert")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
