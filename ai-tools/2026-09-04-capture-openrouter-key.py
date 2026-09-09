"""Validate an OpenRouter key and store only a user-scoped DPAPI ciphertext."""

from __future__ import annotations

import ctypes
import ctypes.wintypes as wt
import getpass
import json
import os
import urllib.error
import urllib.request
from pathlib import Path


TARGET = Path(os.environ["TEMP"]) / "codex-openrouter-01a06505.dpapi"


class DataBlob(ctypes.Structure):
    _fields_ = [("cbData", wt.DWORD), ("pbData", ctypes.POINTER(ctypes.c_ubyte))]


def validate(key: str) -> dict:
    request = urllib.request.Request(
        "https://openrouter.ai/api/v1/key",
        headers={"Authorization": "Bearer " + key, "Accept": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        return (json.loads(response.read().decode("utf-8")).get("data") or {})


def protect(key_bytes: bytearray) -> bytes:
    source_buffer = (ctypes.c_ubyte * len(key_bytes)).from_buffer(key_bytes)
    source = DataBlob(len(key_bytes), ctypes.cast(source_buffer, ctypes.POINTER(ctypes.c_ubyte)))
    output = DataBlob()
    crypt32 = ctypes.WinDLL("crypt32", use_last_error=True)
    kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
    crypt32.CryptProtectData.argtypes = [
        ctypes.POINTER(DataBlob), wt.LPCWSTR, ctypes.POINTER(DataBlob), wt.LPVOID,
        wt.LPVOID, wt.DWORD, ctypes.POINTER(DataBlob),
    ]
    crypt32.CryptProtectData.restype = wt.BOOL
    kernel32.LocalFree.argtypes = [wt.HLOCAL]
    if not crypt32.CryptProtectData(
        ctypes.byref(source), "Codex OpenRouter temporary key", None, None, None,
        0x1, ctypes.byref(output),
    ):
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        return ctypes.string_at(output.pbData, output.cbData)
    finally:
        kernel32.LocalFree(ctypes.cast(output.pbData, wt.HLOCAL))


def main() -> int:
    ctypes.windll.kernel32.SetConsoleTitleW("Codex Secure OpenRouter Key - Seedance")
    print("The previous temporary key expired during the capped Seedance batch.")
    print("Paste a fresh OpenRouter key below. Input is hidden and only DPAPI ciphertext is stored.\n")
    for _ in range(3):
        key = getpass.getpass("OpenRouter API key (input hidden): ").strip()
        key_bytes = bytearray(key.encode("utf-8"))
        try:
            if len(key) < 30 or not key.startswith("sk-or-"):
                print("Rejected locally: expected a key beginning with sk-or-.")
                continue
            try:
                info = validate(key)
            except urllib.error.HTTPError as error:
                print(f"OpenRouter rejected this key (HTTP {error.code}). Try a current key.")
                continue
            encrypted = protect(key_bytes)
            temporary = TARGET.with_suffix(".tmp")
            temporary.write_bytes(encrypted)
            os.replace(temporary, TARGET)
            print("\nKey validated and encrypted successfully.")
            if info.get("limit_remaining") is not None:
                print(f"Key spending limit remaining: ${float(info['limit_remaining']):.2f}")
            print("Return to Codex and reply: ready")
            input("Press Enter after Codex confirms receipt: ")
            return 0
        finally:
            del key
            for index in range(len(key_bytes)):
                key_bytes[index] = 0
    print("\nNo valid key was stored after three attempts.")
    input("Press Enter to close: ")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
