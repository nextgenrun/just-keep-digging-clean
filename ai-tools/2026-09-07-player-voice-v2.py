"""Generate and build the short player library with the existing capped TTS client."""
from __future__ import annotations

import argparse
import importlib.util
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "values/playerVoiceCharacterLeoV2.json"
LIBRARY = ROOT / "sound/voice-lines/player-character-leo-v2"


def module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--execute", action="store_true")
    parser.add_argument("--key-file", type=Path)
    args = parser.parse_args()
    source = json.loads(SOURCE.read_text(encoding="utf-8"))
    if args.execute and source.get("reviewStatus") == "design-review-required":
        print("Voice design review is required. No generation request was sent.", flush=True)
        return 2
    for clip in source["clips"]:
        if len(clip["text"].split()) > source["preparation"]["maxWords"]:
            raise ValueError("Line exceeds the short-speech word limit: " + clip["id"])
        if clip.get("reuseFrom"):
            raise ValueError("Rejected recordings may not be reused.")
    builder = module("voice_builder", "ai-tools/2026-08-30-build-player-leo-runtime-catalog.py")
    builder.BASE_PATH = "sound/voice-lines/player-character-leo-v2/audio/"
    output = builder.build_module(source, builder.source_hash(SOURCE.read_bytes()))
    (ROOT / "values/playerVoiceCharacterLeoV2.generated.js").write_text(output, encoding="utf-8")
    generator = module("voice_generator", "ai-tools/2026-08-30-generate-player-leo-library.py")
    generator.SOURCE_PATH = SOURCE
    generator.LIBRARY_DIR = LIBRARY
    generator.OUTPUT_DIR = LIBRARY / "raw"
    generator.MANIFEST_PATH = LIBRARY / "2026-09-07-generation-manifest.json"
    generator.MIN_CLIP_CHARACTERS = source["preparation"]["minCharacters"]
    generator.MAX_CLIP_CHARACTERS = source["preparation"]["maxCharacters"]
    validated, authored, provider, estimate = generator.load_and_validate_source()
    print(f"V2: {len(source['clips'])} fresh clips; {provider} characters; estimated ${estimate}; cap ${source['localBatchCapUsd']}.", flush=True)
    if not args.execute:
        return 0
    protected = None
    inherited_key = os.environ.get("OPENROUTER_API_KEY")
    try:
        if not inherited_key and args.key_file:
            key_reader = module("voice_key_reader", "ai-tools/2026-09-04-probe-seedance-player-effects.py")
            protected = key_reader.unprotect_key(args.key_file)
            os.environ["OPENROUTER_API_KEY"] = protected.decode("utf-8")
        return generator.generate_library(validated, estimate, False)
    finally:
        if not inherited_key:
            os.environ.pop("OPENROUTER_API_KEY", None)
        if protected is not None:
            for index in range(len(protected)):
                protected[index] = 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        # Never emit request headers, credentials, or provider error bodies.
        print(f"Voice generation stopped: {type(error).__name__}", file=sys.stderr)
        raise SystemExit(1)
