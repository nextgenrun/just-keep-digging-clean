"""2026-09-07: Audition Leo's emotional range without replacing restrained takes."""
import argparse
import importlib.util
import json
from pathlib import Path
import re
import shutil
import sys
import urllib.error
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "values/playerVoiceLeoEmotionReviewV1.json"


def module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


audio_tools = module("leo_review_audio", "ai-tools/2026-09-07-generate-mystery-voice-review.py")
provider = module("leo_existing_provider", "ai-tools/2026-08-30-generate-player-leo-library.py")


def words(text):
    return re.findall(r"[a-z]+(?:'[a-z]+)?", text.lower())


def validate(source, original):
    if not source["reviewOnly"] or source["runtimeWired"] or source["voice"] != "leo":
        raise ValueError("This is a Leo-only review audition.")
    limits = source["generation"]
    clips = source["clips"]
    if len(clips) > limits["maxRequests"] or len({clip["id"] for clip in clips}) != len(clips):
        raise ValueError("Invalid audition count or duplicate IDs.")
    total = sum(len(clip["ttsInput"]) for clip in clips)
    cost = total * limits["pricePerMillionCharactersUSD"] / 1_000_000
    if total > limits["maxCharacters"] or cost > limits["estimatedSpendLimitUSD"]:
        raise ValueError("Audition budget exceeded.")
    groups = {group["id"]: group for group in original["groups"]}
    originals = {clip["id"]: clip for group in original["groups"] for clip in group["clips"]}
    for clip in clips:
        if clip["group"] not in groups or not limits["minWords"] <= len(words(clip["text"])) <= limits["maxWords"]:
            raise ValueError("Invalid context or script length: " + clip["id"])
        for tag in re.findall(r"\[([^\]]+)\]", clip["ttsInput"]):
            if tag not in source["supportedInlineTags"]:
                raise ValueError("Unsupported inline speech tag.")
        wrapped = ET.fromstring("<root>" + clip["ttsInput"] + "</root>")
        if any(node.tag != "root" and node.tag not in source["supportedWrappingTags"] for node in wrapped.iter()):
            raise ValueError("Unsupported wrapping speech tag.")
        spoken = re.sub(r"\[[^\]]+\]", "", re.sub(r"<[^>]+>", "", clip["ttsInput"]))
        if words(spoken) != words(clip["text"]):
            raise ValueError("Synthesis input changes the spoken script: " + clip["id"])
        if clip.get("originalId") and words(originals[clip["originalId"]]["text"]) != words(clip["text"]):
            raise ValueError("Same-word comparison changed its wording.")
    return total, cost


def write_review_data(source, original, baseline, manifest, out):
    payload = {"source": source, "original": original, "baseline": baseline, "manifest": manifest}
    (out / "review" / "emotion-data.js").write_text(
        "window.LEO_EMOTION = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--process-only", action="store_true")
    parser.add_argument("--key-file", type=Path)
    args = parser.parse_args()
    source = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    original = json.loads((ROOT / source["originalCatalog"]).read_text(encoding="utf-8"))
    baseline = json.loads((ROOT / source["originalManifest"]).read_text(encoding="utf-8"))
    total, estimate = validate(source, original)
    out = (ROOT / source["outputRoot"]).resolve()
    if ROOT.resolve() not in out.parents:
        raise ValueError("Output must remain in this checkout.")
    manifest_path = out / "2026-09-07-emotion-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {
        "created": source["created"], "reviewOnly": True, "runtimeWired": False,
        "status": "awaiting-recording", "clips": [], "montages": {}}
    manifest.update({"source": SOURCE_PATH.relative_to(ROOT).as_posix(),
        "sourceSha256": audio_tools.hash_bytes(SOURCE_PATH.read_bytes()),
        "model": source["model"], "voice": "leo", "requestedRecordings": len(source["clips"]),
        "inputCharacters": total, "estimatedCostUSD": round(estimate, 6),
        "humanListeningApproval": "Pending; synthetic acting cues are an audition, not a guarantee."})
    print(f"Leo emotion audition: {len(source['clips'])} takes; {total} input characters; estimated USD {estimate:.4f}.", flush=True)
    if not args.execute and not args.process_only:
        audio_tools.save_json(manifest_path, manifest)
        write_review_data(source, original, baseline, manifest, out)
        print("DESIGN_READY: no synthesis requested.", flush=True)
        return
    if not shutil.which("ffmpeg") or not shutil.which("ffprobe"):
        raise RuntimeError("Put the installed ffmpeg and ffprobe on PATH.")
    key, protected = None, None
    try:
        if not args.process_only:
            if args.key_file:
                reader = module("leo_key_reader", "ai-tools/2026-09-04-probe-seedance-player-effects.py")
                protected = reader.unprotect_key(args.key_file)
                key = protected.decode("utf-8")
            else:
                key = audio_tools.private_key()
        manifest.update({"status": "generating", "clips": [], "montages": {}})
        for index, clip in enumerate(source["clips"], 1):
            basename = clip["id"].lower() + "-leo"
            raw, target = out / "raw" / (basename + ".mp3"), out / "audio" / (basename + ".mp3")
            receipt = raw.with_suffix(".json")
            request_hash = audio_tools.hash_bytes(json.dumps({
                "model": source["model"], "voice": "leo", "input": clip["ttsInput"],
                "format": source["responseFormat"]}, sort_keys=True).encode())
            cached = raw.exists() and receipt.exists() and json.loads(receipt.read_text())["requestSha256"] == request_hash
            if not cached:
                if args.process_only:
                    raise RuntimeError("Missing matching raw recording; offline mode cannot synthesize.")
                audio, media_type, generation_id = provider.request_audio(key, source, {"text": clip["ttsInput"]})
                raw.write_bytes(audio)
                audio_tools.save_json(receipt, {"id": clip["id"], "voice": "leo",
                    "text": clip["text"], "ttsInput": clip["ttsInput"], "requestSha256": request_hash,
                    "contentType": media_type, "generationId": generation_id,
                    "rawSha256": audio_tools.hash_bytes(audio)})
            metrics = audio_tools.process_audio(raw, target, source["audio"])
            manifest["clips"].append(dict(clip, voice="leo", audio=target.relative_to(out).as_posix(),
                raw=raw.relative_to(out).as_posix(), requestSha256=request_hash, **metrics))
            audio_tools.save_json(manifest_path, manifest)
            write_review_data(source, original, baseline, manifest, out)
            print(f"{index:02}/{len(source['clips'])} {clip['id']}: {metrics['durationSeconds']:.2f}s" +
                (" [DURATION REVIEW]" if metrics["durationFlag"] else ""), flush=True)
        pairs = []
        for clip in manifest["clips"]:
            if not clip.get("originalId"):
                continue
            old = next(c for c in baseline["clips"] if c["id"] == clip["originalId"] and c["voice"] == "leo")
            pairs.append(dict(old, id=old["id"] + " original",
                audio="../player-mystery-review-v1/" + old["audio"]))
            pairs.append(clip)
        fresh = [clip for clip in manifest["clips"] if clip["kind"] == "new-line"]
        manifest["montages"] = {
            "performance": audio_tools.montage("01-original-then-emotive-leo", pairs, out, source["audio"]),
            "character": audio_tools.montage("02-leo-new-character-lines", fresh, out, source["audio"])}
        manifest["status"] = "complete"
        print("EMOTION_AUDITION_COMPLETE: original restrained recordings remain intact.", flush=True)
    except Exception as error:
        manifest["status"] = "incomplete"
        manifest["failureType"] = type(error).__name__
        if isinstance(error, urllib.error.HTTPError):
            manifest["httpStatus"] = error.code
        print("EMOTION_AUDITION_STOPPED:", type(error).__name__, getattr(error, "code", ""), flush=True)
        raise SystemExit(1)
    finally:
        key = None
        if protected is not None:
            for index in range(len(protected)):
                protected[index] = 0
        audio_tools.save_json(manifest_path, manifest)
        write_review_data(source, original, baseline, manifest, out)


if __name__ == "__main__":
    main()
