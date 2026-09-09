"""Build the review-only 300-line Leo catalog; never calls a speech provider."""
from pathlib import Path
import csv
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
VALUES = ROOT / "values/player-voice-library-300-review-v1"
OUT = ROOT / "sound/voice-lines/player-library-300-review-v1/review"


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def relative(path):
    import os
    return os.path.relpath(path, OUT).replace("\\", "/")


def build():
    persona = read(VALUES / "persona.json")
    policy = read(VALUES / "policy.json")
    groups = read(VALUES / "groups.json")
    lines = [line for path in sorted(VALUES.glob("lines-*.json")) for line in read(path)]
    assert len(lines) == policy["totalLines"] == 300
    assert [line["id"] for line in lines] == [f"L{i:03}" for i in range(1, 301)]
    assert len({line["text"].casefold() for line in lines}) == len(lines)
    by_group = {group["id"]: group for group in groups}
    assert len(by_group) == 24
    for group in groups:
        expected = 24 if group["type"] == "random" else 12
        assert sum(line["group"] == group["id"] for line in lines) == expected
        assert all((ROOT / path).is_file() for path in group["evidence"])
    assert sum(by_group[line["group"]]["type"] == "event" for line in lines) == 276
    references = {}
    for folder, manifest, label in [
        ("player-leo-emotion-review-v1", "2026-09-07-emotion-manifest.json", "Expressive Leo"),
        ("player-mystery-review-v1", "2026-09-07-audition-manifest.json", "Original Leo"),
    ]:
        base = ROOT / "sound/voice-lines" / folder
        for clip in read(base / manifest)["clips"]:
            if clip.get("voice") != "leo":
                continue
            path = base / clip["audio"]
            assert path.is_file()
            assert digest(path.read_bytes()) == clip["audioSha256"]
            references.setdefault(clip["text"], []).append({
                "label": label, "url": relative(path),
                "duration": clip["durationSeconds"], "sourceId": clip["id"],
                "sha256": clip["audioSha256"],
            })
    for line in lines:
        assert line["group"] in by_group and line["decision"] == "pending"
        words = re.findall(r"[A-Za-z]+(?:'[A-Za-z]+)*", line["text"])
        assert 3 <= len(words) <= policy["maxSpokenWords"], line["id"]
        line["wordCount"] = len(words)
        line["audio"] = references.get(line["text"], [])
        line["recordingStatus"] = "reference-available" if line["audio"] else "script-only"
        line["fingerprint"] = digest(json.dumps({key: line.get(key) for key in ["id", "text", "group", "emotion", "flavour", "requires"]} | {"conditions": by_group[line["group"]]}, sort_keys=True).encode())
    assert next(line for line in lines if line["id"] == "L193")["requires"]["daylight"]
    source_paths = sorted(VALUES.glob("*.json"))
    source_hash = digest(b"".join(path.name.encode() + path.read_bytes() for path in source_paths))
    music = ROOT / policy["preview"]["musicPath"]
    npc = ROOT / policy["preview"]["npcPath"]
    assert music.is_file() and npc.is_file()
    preview = {
        "music": relative(music), "npc": relative(npc),
        "leo": references["I've had gentler lovers."][0]["url"],
        "randomReference": references["Still alive. Sorry to disappoint."][0]["url"],
        **policy["preview"],
        "disclaimer": "Speech priority and music preview only. Existing recordings are references; this does not simulate the game's event detection.",
    }
    payload = {"persona": persona, "policy": policy, "groups": groups, "lines": lines,
               "sourceHash": source_hash, "preview": preview}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "catalog.generated.js").write_text(
        "window.LEO_LIBRARY_REVIEW = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    counts = {"total": len(lines), "event": 276, "random": 24,
              "withExistingAudio": sum(bool(line["audio"]) for line in lines),
              "newUnrecorded": sum(not line["audio"] for line in lines)}
    (OUT / "2026-09-07-library-manifest.json").write_text(json.dumps({
        "reviewOnly": True, "runtimeWired": False, "counts": counts, "sourceHash": source_hash,
        "scriptStatus": "ready-for-yes-no-audit", "recordingStatus": "accepted-references-only",
        "sourceFiles": [path.relative_to(ROOT).as_posix() for path in source_paths],
    }, indent=2) + "\n", encoding="utf-8")
    with (OUT / "leo-300-script-audit.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["ID", "Decision", "Line", "Event", "Visible cue", "Exact condition", "Must not trigger", "Emotion", "Flavour", "Extra requirement"])
        for line in lines:
            group = by_group[line["group"]]
            writer.writerow([line["id"], "", line["text"], group["title"], group["visibleCue"],
                             group["condition"], group["exclude"], line["emotion"], line["flavour"],
                             "Daylight only" if line.get("requires", {}).get("daylight") else ""])
    print("LEO_LIBRARY_READY", json.dumps(counts), source_hash)


if __name__ == "__main__":
    build()
