"""Contract for ground-damage Piskel review rollback inventory."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "exports/piskel/ground-damage-anchor-v2-review"
MANIFEST = json.loads((EXPORT / "manifest.json").read_text(encoding="utf-8"))
REPORT = json.loads((EXPORT / "geometry-report.json").read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


assert MANIFEST["reviewOnly"] is True
assert MANIFEST["productionChanged"] is False
assert len(MANIFEST["rollbackProjects"]) == 10
assert (
    MANIFEST["rollbackCommand"]
    == "python ai-tools/2026-07-30-refresh-ground-damage-piskel-polish.py --rollback"
)

for active_relative, rollback_relative in zip(
    MANIFEST["polishedWorkProjects"],
    MANIFEST["rollbackProjects"],
):
    active = ROOT / active_relative
    rollback = ROOT / rollback_relative
    assert active.is_file()
    assert rollback.is_file()
    assert active.parent.name == "polished-work"
    assert rollback.parent.name == "polished-work-rollback-v1"
    metadata = json.loads(active.read_text(encoding="utf-8"))["jkdPolish"]
    assert metadata["rollbackProject"] == rollback_relative
    assert metadata["rollbackSha256"] == sha256(rollback)
    assert MANIFEST["sha256"][rollback_relative] == sha256(rollback)

script = (
    ROOT / "ai-tools/2026-07-30-refresh-ground-damage-piskel-polish.py"
).read_text(encoding="utf-8")
assert "--apply" in script
assert "--rollback" in script
assert "shutil.copy2" in script

for family in REPORT["families"]:
    assert all(frame["seedAlpha"] > 12 for frame in family["frames"])

production = ROOT / MANIFEST["productionGuard"]["path"]
assert sha256(production) == MANIFEST["productionGuard"]["sha256"]

print(
    "Ground-damage Piskel rollback contract passed: "
    "10 hash-linked editable backups, apply/rollback commands, production guard unchanged"
)
