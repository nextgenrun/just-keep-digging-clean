#!/usr/bin/env python3
"""Commit staged work only after health checks and auto-revert on post-check failure."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run(command: list[str], repo: Path, capture: bool = False) -> subprocess.CompletedProcess:
    return subprocess.run(
        command,
        cwd=repo,
        text=True,
        encoding="utf-8",
        errors="replace",
        capture_output=capture,
        check=False,
    )


def git(git_program: str, repo: Path, *arguments: str, capture: bool = False):
    return run([git_program, *arguments], repo, capture)


def fail(message: str, code: int = 2) -> int:
    print(f"[GUARDED COMMIT] {message}", file=sys.stderr)
    return code


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--message", required=True)
    parser.add_argument("--repo", type=Path, default=ROOT)
    parser.add_argument("--git", dest="git_program", default=shutil.which("git") or "git")
    parser.add_argument(
        "--gate-command",
        nargs=argparse.REMAINDER,
        help="override the default health gate; all remaining arguments form the command",
    )
    args = parser.parse_args()
    repo = args.repo.resolve()
    gate = args.gate_command or [
        sys.executable,
        str(ROOT / "tools/2026-07-29-heavenblocks-commit-health-gate.py"),
    ]

    inside = git(args.git_program, repo, "rev-parse", "--is-inside-work-tree", capture=True)
    if inside.returncode != 0 or inside.stdout.strip() != "true":
        return fail(f"not a Git worktree: {repo}")
    if git(args.git_program, repo, "diff", "--quiet").returncode != 0:
        return fail("unstaged tracked changes exist; stage or resolve them first")
    untracked = git(
        args.git_program,
        repo,
        "ls-files",
        "--others",
        "--exclude-standard",
        capture=True,
    )
    if untracked.returncode != 0 or untracked.stdout.strip():
        return fail("untracked files exist; stage or remove them first")
    staged = git(args.git_program, repo, "diff", "--cached", "--quiet")
    if staged.returncode == 0:
        return fail("nothing is staged")
    if staged.returncode != 1:
        return fail("unable to inspect staged changes")

    print("[GUARDED COMMIT] Running pre-commit health gate")
    if run(gate, repo).returncode != 0:
        return fail("pre-commit health gate failed; no commit was created", 1)

    committed = git(args.git_program, repo, "commit", "-m", args.message)
    if committed.returncode != 0:
        return fail("git commit failed", committed.returncode)
    head = git(args.git_program, repo, "rev-parse", "HEAD", capture=True).stdout.strip()
    print(f"[GUARDED COMMIT] Created {head}; running post-commit health gate")

    if run(gate, repo).returncode == 0:
        print(f"GUARDED_COMMIT_PASS {head}")
        return 0

    print("[GUARDED COMMIT] Post-commit gate failed; starting automatic Git rollback")
    status = git(args.git_program, repo, "status", "--porcelain", capture=True)
    current = git(args.git_program, repo, "rev-parse", "HEAD", capture=True).stdout.strip()
    if status.returncode != 0 or status.stdout.strip() or current != head:
        return fail(
            "automatic rollback refused because HEAD moved or the worktree became dirty",
            3,
        )
    reverted = git(args.git_program, repo, "revert", "--no-edit", head)
    if reverted.returncode != 0:
        return fail(f"automatic revert of {head} failed; inspect Git state", 3)
    rollback_head = git(args.git_program, repo, "rev-parse", "HEAD", capture=True).stdout.strip()
    print(f"AUTO_ROLLBACK_COMPLETE failed={head} revert={rollback_head}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
