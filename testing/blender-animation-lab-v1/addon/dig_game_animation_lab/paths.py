"""Resolve repository inputs and enforce lab-only output paths."""

from __future__ import annotations

from pathlib import Path


PACKAGE_ROOT = Path(__file__).resolve().parent
LAB_ROOT = PACKAGE_ROOT.parents[1]
REPO_ROOT = PACKAGE_ROOT.parents[3]
DEFAULT_CONFIG = REPO_ROOT / "values" / "blenderAnimationLab.json"
DEFAULT_REVIEW_ROOT = LAB_ROOT / "review-drafts"
DEFAULT_RUNTIME_MANIFEST = (
    REPO_ROOT
    / "sprites"
    / "character"
    / "survival-ual-player-v1"
    / "runtime"
    / "manifest.json"
)
DEFAULT_SOURCE_FBX_ROOT = (
    REPO_ROOT
    / "testing"
    / "unreal-survival-motion-v2"
    / "SourceAssets"
    / "ual-exports"
)


def resolve_path(value: str, repo_root: str | Path | None = None) -> Path:
    """Resolve an absolute path or a repository-relative path."""
    path = Path(value).expanduser()
    if path.is_absolute():
        return path.resolve()
    root = Path(repo_root).resolve() if repo_root else REPO_ROOT
    return (root / path).resolve()


def review_root(state) -> Path:
    value = str(getattr(state, "review_output_root", "") or DEFAULT_REVIEW_ROOT)
    return resolve_path(value, getattr(state, "repo_root", REPO_ROOT))


def require_review_path(path: Path) -> Path:
    """Reject writes outside the lab review-drafts directory."""
    root = DEFAULT_REVIEW_ROOT.resolve()
    resolved = path.resolve()
    if resolved != root and root not in resolved.parents:
        raise ValueError(f"Review output must stay below {root}")
    return resolved


def session_output_root(state) -> Path:
    name = str(getattr(state, "session_name", "") or "unsaved-session")
    safe_name = "".join(character if character.isalnum() or character in "-_" else "-" for character in name)
    return require_review_path(review_root(state) / safe_name)


def ensure_session_output_root(state) -> Path:
    """Create documented review-only output folders and return the session path."""
    root = require_review_path(review_root(state))
    output = session_output_root(state)
    root.mkdir(parents=True, exist_ok=True)
    output.mkdir(parents=True, exist_ok=True)
    root_readme = root / "readme.md"
    if not root_readme.exists():
        root_readme.write_text(
            "# Blender animation lab review drafts\n\n"
            "Generated, review-only sessions. Nothing here is loaded by the game runtime.\n",
            encoding="utf-8",
        )
    session_readme = output / "readme.md"
    if not session_readme.exists():
        session_readme.write_text(
            "# Review session\n\n"
            "Blender renders, reports, and editable copies for this isolated lab session.\n",
            encoding="utf-8",
        )
    return output
