"""Masked, user-operated OpenRouter credential handoff for replacement voices."""
import getpass
import importlib.util
import os
from pathlib import Path

spec = importlib.util.spec_from_file_location("secure_voice_key", Path(__file__).with_name("2026-09-04-capture-openrouter-key.py"))
secure = importlib.util.module_from_spec(spec)
spec.loader.exec_module(secure)
target = Path(os.environ["TEMP"]) / "codex-understar-player-voice-v2.dpapi"
print("UNDERSTAR: 24 short replacement voice lines")
print("Enter a current OpenRouter key here. Input is hidden; never paste it in chat.")
key_bytes = bytearray()
try:
    key = getpass.getpass("OpenRouter key: ").strip()
    key_bytes = bytearray(key.encode("utf-8"))
    secure.validate(key)
    target.write_bytes(secure.protect(key_bytes))
    del key
    print("Key verified and encrypted. Return to Codex and reply: ready")
except Exception as error:
    print("Key could not be verified. Status:", getattr(error, "code", type(error).__name__))
finally:
    for index in range(len(key_bytes)):
        key_bytes[index] = 0
input("Press Enter to close.")
