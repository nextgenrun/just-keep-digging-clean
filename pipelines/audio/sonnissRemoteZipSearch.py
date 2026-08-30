"""Search remote Sonniss ZIP filenames using HTTP ranges without downloading archives."""

from __future__ import annotations

import argparse
import binascii
import json
import re
import struct
import urllib.parse
import urllib.request
import zlib
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
USER_AGENT = "Mozilla/5.0 UNDERSTAR source-library indexer"
URL_SETS = {
    "2019": [
        "https://ftpmirror.your.org/pub/misc/sonniss2019/"
        f"Sonniss.com - GDC 2019 - Game Audio Bundle Part {part}of8.zip"
        for part in range(1, 9)
    ],
}
DEFAULT_TERMS = (
    "dirt", "earth", "soil", "mud", "sand", "gravel", "rock", "stone", "brick",
    "debris", "cave", "mine", "mining", "crystal", "ore", "pickaxe", "shovel",
    "ground impact", "footstep", "wood", "fire", "flame", "ember", "coin",
)


def get_range(url: str, value: str) -> tuple[bytes, int]:
    encoded = urllib.parse.quote(url, safe=":/%?=&")
    headers = {"User-Agent": USER_AGENT, "Range": f"bytes={value}"}
    with urllib.request.urlopen(urllib.request.Request(encoded, headers=headers), timeout=60) as response:
        data = response.read()
        content_range = response.headers.get("Content-Range", "")
    total_match = re.search(r"/(\d+)$", content_range)
    if not total_match:
        raise RuntimeError(f"Server did not return a ranged response for {url}")
    return data, int(total_match.group(1))


def central_directory(url: str) -> list[dict]:
    tail, total = get_range(url, "-131072")
    end = tail.rfind(b"PK\x05\x06")
    if end < 0:
        raise RuntimeError(f"ZIP end record not found for {url}")
    _, _, _, _, entries, size, offset, _ = struct.unpack_from("<4s4H2LH", tail, end)
    if entries == 0xFFFF or size == 0xFFFFFFFF or offset == 0xFFFFFFFF:
        raise RuntimeError(f"ZIP64 archive is not supported by this lightweight indexer: {url}")
    directory, _ = get_range(url, f"{offset}-{offset + size - 1}")
    records = []
    cursor = 0
    while cursor + 46 <= len(directory) and directory[cursor:cursor + 4] == b"PK\x01\x02":
        flags = struct.unpack_from("<H", directory, cursor + 8)[0]
        compression = struct.unpack_from("<H", directory, cursor + 10)[0]
        checksum = struct.unpack_from("<L", directory, cursor + 16)[0]
        compressed = struct.unpack_from("<L", directory, cursor + 20)[0]
        uncompressed = struct.unpack_from("<L", directory, cursor + 24)[0]
        name_length, extra_length, comment_length = struct.unpack_from("<3H", directory, cursor + 28)
        local_offset = struct.unpack_from("<L", directory, cursor + 42)[0]
        start = cursor + 46
        raw_name = directory[start:start + name_length]
        encoding = "utf-8" if flags & 0x800 else "cp437"
        records.append({
            "filename": raw_name.decode(encoding, errors="replace"),
            "compression": compression,
            "crc32": checksum,
            "compressedBytes": compressed,
            "uncompressedBytes": uncompressed,
            "localHeaderOffset": local_offset,
        })
        cursor = start + name_length + extra_length + comment_length
    if len(records) != entries:
        raise RuntimeError(f"Expected {entries} entries but parsed {len(records)} for {url}")
    return records


def safe_name(name: str) -> str:
    stem = re.sub(r"[^a-zA-Z0-9._-]+", "-", Path(name).stem).strip("-.")[:40]
    return stem or "recording"


def extract_entry(url: str, entry: dict, destination: Path, target_name: str | None = None) -> Path:
    offset = entry["localHeaderOffset"]
    header, _ = get_range(url, f"{offset}-{offset + 29}")
    if header[:4] != b"PK\x03\x04":
        raise RuntimeError(f"Local ZIP header missing for {entry['filename']}")
    name_length, extra_length = struct.unpack_from("<2H", header, 26)
    start = offset + 30 + name_length + extra_length
    end = start + entry["compressedBytes"] - 1
    compressed, _ = get_range(url, f"{start}-{end}")
    if entry["compression"] == 0:
        data = compressed
    elif entry["compression"] == 8:
        data = zlib.decompress(compressed, -zlib.MAX_WBITS)
    else:
        raise RuntimeError(f"Unsupported ZIP compression {entry['compression']}")
    if len(data) != entry["uncompressedBytes"]:
        raise RuntimeError(f"Size mismatch for {entry['filename']}")
    if binascii.crc32(data) & 0xFFFFFFFF != entry["crc32"]:
        raise RuntimeError(f"CRC mismatch for {entry['filename']}")
    suffix = Path(entry["filename"]).suffix.lower()
    target = destination / (target_name or f"{safe_name(entry['filename'])}{suffix}")
    if target.exists() and target.stat().st_size == len(data):
        return target
    temporary = target.with_suffix(target.suffix + ".partial")
    temporary.write_bytes(data)
    temporary.replace(target)
    return target


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", choices=URL_SETS, default="2019")
    parser.add_argument("--terms", default=",".join(DEFAULT_TERMS))
    parser.add_argument("--output")
    parser.add_argument("--extract-part", type=int)
    parser.add_argument("--extract-output")
    parser.add_argument("--max-files", type=int, default=50)
    args = parser.parse_args()
    terms = tuple(term.strip().lower() for term in args.terms.split(",") if term.strip())
    payload = {"year": args.year, "terms": terms, "archives": []}
    indexed = list(enumerate(URL_SETS[args.year], start=1))
    if args.extract_part:
        indexed = [item for item in indexed if item[0] == args.extract_part]
        if not indexed:
            raise ValueError(f"Part {args.extract_part} is outside the selected year")
    for part, url in indexed:
        print(f"Indexing {args.year} part {part}...", flush=True)
        entries = central_directory(url)
        matches = [
            entry for entry in entries
            if not entry["filename"].endswith("/")
            and any(term in entry["filename"].lower() for term in terms)
        ]
        payload["archives"].append({
            "part": part,
            "url": url,
            "entryCount": len(entries),
            "matchCount": len(matches),
            "matches": matches,
        })
        print(f"  {len(matches)} relevant filenames out of {len(entries)}")
        if args.extract_part:
            destination = Path(args.extract_output) if args.extract_output else ROOT / (
                "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"
                "sonniss-gdc2019-recorded-mining-pilot-2026-08-26/source-recordings"
            )
            destination = destination.resolve()
            destination.relative_to(ROOT.resolve())
            destination.mkdir(parents=True, exist_ok=True)
            for entry in matches[:args.max_files]:
                target = extract_entry(url, entry, destination)
                print(f"  extracted {target.name}")
    output = Path(args.output) if args.output else ROOT / (
        "sound/library-v2/SoundLibrary_Review/00_INBOX_RAW_EXPORTS/"
        f"sonniss-gdc{args.year}-remote-index.json"
    )
    output.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
