"""Validate a submitted Leo audit and build the approved recording selection."""
from pathlib import Path
import argparse
from collections import Counter
import csv
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
VALUES = ROOT / "values/player-voice-library-300-review-v1"
OUT = ROOT / "sound/voice-lines/player-library-300-review-v1/review"
RECEIPT = OUT / "2026-09-07-submitted-decisions.json"


def read(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write_json(name, data):
    (OUT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_catalog():
    text = (OUT / "catalog.generated.js").read_text(encoding="utf-8")
    prefix = "window.LEO_LIBRARY_REVIEW = "
    if not text.startswith(prefix):
        raise ValueError("Unexpected catalog format.")
    catalog = json.loads(text[len(prefix):].strip().removesuffix(";"))
    paths = sorted(VALUES.glob("*.json"))
    source_hash = sha(b"".join(path.name.encode() + path.read_bytes() for path in paths))
    if source_hash != catalog["sourceHash"]:
        raise ValueError("Catalog is stale; rebuild it before processing decisions.")
    return catalog


def validate(saved, catalog):
    policy = catalog["policy"]
    if saved.get("schemaVersion") != policy["review"]["schemaVersion"] or saved.get("libraryId") != policy["libraryId"]:
        raise ValueError("Decision file belongs to a different library.")
    if saved.get("catalogHash") != catalog["sourceHash"]:
        raise ValueError("Catalog version does not match the submitted review.")
    rows = saved.get("lines")
    if not isinstance(rows, list):
        raise ValueError("Decision rows must be a list.")
    canonical = {line["id"]: line for line in catalog["lines"]}
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid decision row.")
        lid = row.get("id")
        if not isinstance(lid, str) or lid in seen or lid not in canonical:
            raise ValueError("Duplicate or unknown line ID.")
        seen.add(lid)
        if any(row.get(key) != canonical[lid][key] for key in ("text", "group", "fingerprint")):
            raise ValueError(f"{lid}: reviewed wording or conditions changed.")
        if row.get("decision") not in ("yes", "no", "pending"):
            raise ValueError(f"{lid}: invalid decision.")
        if not isinstance(row.get("note", ""), str):
            raise ValueError(f"{lid}: invalid note.")
    if seen != set(canonical):
        raise ValueError("Decision file is incomplete; missing line IDs.")
    if not isinstance(saved.get("overall", ""), str):
        raise ValueError("Invalid overall note.")
    return {row["id"]: row for row in rows}


def build(path):
    catalog = load_catalog()
    raw = path.read_bytes()
    saved = json.loads(raw.decode("utf-8-sig"))
    decisions = validate(saved, catalog)
    if RECEIPT.exists() and RECEIPT.read_bytes() != raw:
        raise ValueError("An earlier submission is preserved here. Use a new version for a changed submission.")
    groups = {group["id"]: group for group in catalog["groups"]}
    accepted = [dict(line, decision="yes", note=decisions[line["id"]].get("note", ""))
                for line in catalog["lines"] if decisions[line["id"]]["decision"] == "yes"]
    for line in accepted:
        for take in line["audio"]:
            audio = (OUT / take["url"]).resolve()
            if ROOT.resolve() not in audio.parents or not audio.is_file() or sha(audio.read_bytes()) != take["sha256"]:
                raise ValueError(f'{line["id"]}: missing or changed reference recording.')
    fresh = [line for line in accepted if not line["audio"]]
    counts = {state: sum(row["decision"] == state for row in decisions.values()) for state in ("yes", "no", "pending")}
    counts.update({
        "acceptedEvent": sum(groups[line["group"]]["type"] == "event" for line in accepted),
        "acceptedRandom": sum(groups[line["group"]]["type"] == "random" for line in accepted),
        "withExistingAudio": len(accepted) - len(fresh), "newRecordingsNeeded": len(fresh),
        "existingAudioTakes": sum(len(line["audio"]) for line in accepted),
    })
    summary = {
        "schemaVersion": 1, "reviewOnly": True, "runtimeWired": False,
        "libraryId": saved["libraryId"], "catalogHash": catalog["sourceHash"],
        "submissionFile": RECEIPT.name, "submissionSha256": sha(raw),
        "approvalScope": saved.get("reviewScope", "script, emotional intention and exact trigger"),
        "scriptStatus": "review-complete" if not counts["pending"] else "review-incomplete",
        "audioStatus": "new-recordings-pending", "counts": counts,
        "acceptedIds": [line["id"] for line in accepted],
        "rejectedIds": [lid for lid, row in decisions.items() if row["decision"] == "no"],
        "pendingIds": [lid for lid, row in decisions.items() if row["decision"] == "pending"],
        "groups": [{"id": group["id"], "title": group["title"], **{state: sum(
            row["group"] == group["id"] and row["decision"] == state for row in decisions.values())
            for state in ("yes", "no", "pending")}} for group in catalog["groups"]],
        "overall": saved.get("overall", ""),
    }
    # The source library and its fingerprints remain unchanged. The receipt is exact user input.
    RECEIPT.write_bytes(raw)
    write_json("2026-09-07-approved-selection.json", dict(summary, lines=accepted))
    write_json("2026-09-07-recording-plan.json", {
        "reviewOnly": True, "runtimeWired": False, "submissionSha256": sha(raw),
        "catalogHash": catalog["sourceHash"], "voice": catalog["persona"]["voice"],
        "status": "approved-scripts-awaiting-recording", "requestCount": len(fresh),
        "performanceReference": "values/playerVoiceLeoEmotionReviewV1.json",
        "persona": catalog["persona"], "policy": catalog["policy"],
        "groups": catalog["groups"], "clips": fresh,
        "reuseExistingIds": [line["id"] for line in accepted if line["audio"]],
        "instructions": "Record only these approved scripts with their reviewed emotion. Keep wording exact. "
            "Reuse listed existing Leo takes. Review the resulting audio before gameplay integration.",
    })
    for name, selection in [("leo-approved-scripts.csv", accepted), ("leo-new-recordings.csv", fresh)]:
        with (OUT / name).open("w", encoding="utf-8-sig", newline="") as handle:
            writer = csv.writer(handle)
            writer.writerow(["ID", "Decision", "Line", "Emotion", "Flavour", "Event",
                             "Visible cue", "Exact condition", "Must not trigger", "Extra requirement",
                             "Recording status", "Existing takes", "Note"])
            for line in selection:
                group = groups[line["group"]]
                writer.writerow([line["id"], "yes", line["text"], line["emotion"], line["flavour"],
                    group["title"], group["visibleCue"], group["condition"], group["exclude"],
                    "Daylight only" if line.get("requires", {}).get("daylight") else "",
                    "Existing audio available" if line["audio"] else "Needs new recording",
                    len(line["audio"]), line["note"]])
    payload = {"review": saved, "summary": summary}
    (OUT / "submitted-review.generated.js").write_text(
        "window.LEO_SUBMITTED_REVIEW = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        .replace("<", "\\u003c").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029") + ";\n", encoding="utf-8")
    report = [
        "# Leo submitted review - 2026-09-07", "",
        f'{counts["yes"]} accepted, {counts["no"]} rejected, {counts["pending"]} pending.',
        f'{counts["acceptedEvent"]} accepted event reactions and {counts["acceptedRandom"]} rare random thoughts.',
        f'{counts["withExistingAudio"]} accepted scripts have {counts["existingAudioTakes"]} existing Leo takes; '
        f'{counts["newRecordingsNeeded"]} scripts need recording.', "",
        "The submission matches every ID, word, event group and condition fingerprint in the source catalog. "
        "Its original bytes are preserved. Accepted wording, emotional intentions and event conditions are unchanged. "
        "Rejected lines are excluded from both the approved selection and the recording plan.",
        "", "Approval covers scripts and triggers. New recordings still need a listening pass. Gameplay is unchanged.",
        "", "| Moment | Accepted | Rejected | Pending |", "|---|---:|---:|---:|",
        *[f'| {g["title"]} | {g["yes"]} | {g["no"]} | {g["pending"]} |' for g in summary["groups"]],
        "", f'Submission SHA-256: {sha(raw)}', f'Catalog SHA-256: {catalog["sourceHash"]}', "",
    ]
    (OUT / "2026-09-07-submitted-review.md").write_text("\n".join(report), encoding="utf-8")
    print("LEO_REVIEW_IMPORTED", json.dumps(counts))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("submission", nargs="?", type=Path, default=RECEIPT)
    build(parser.parse_args().submission)
