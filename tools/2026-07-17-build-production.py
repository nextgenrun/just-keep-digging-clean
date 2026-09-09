"""Build a portable production snapshot without changing the dev workflow."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
from functools import lru_cache
import re
import shutil
import tempfile

try:
    import brotli
except ImportError:  # Gzip remains a standards-compliant fallback.
    brotli = None


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = ROOT / "dist"
ENTRY_MODULE = ROOT / "main.js"
PACKAGING_POLICY_PATH = ROOT / "values/productionPackaging.json"
PACKAGING_POLICY = json.loads(PACKAGING_POLICY_PATH.read_text(encoding="utf-8"))
MAX_UNPACKED_BYTES = PACKAGING_POLICY["maxUnpackedBytes"]
MODULE_RE = re.compile(
    r"\b(?:import|export)\s+(?:[^\"']*?\s+from\s+)?[\"']([^\"']+)[\"']"
    r"|\bimport\s*\(\s*[\"']([^\"']+)[\"']\s*\)"
)
LITERAL_RE = re.compile(r"[\"'`]([^\"'`\r\n]{1,512})[\"'`]")
ASSET_SUFFIXES = frozenset({
    ".avif", ".gif", ".jpeg", ".jpg", ".json", ".m4a", ".mp3",
    ".ogg", ".mp4", ".png", ".svg", ".wav", ".webm", ".webp", ".woff",
    ".woff2", ".ttf", ".glb", ".gltf", ".bin", ".wasm",
})
DYNAMIC_ASSET_SUFFIXES = ASSET_SUFFIXES | frozenset({".ttf"})
COMPRESS_SUFFIXES = frozenset({".css", ".html", ".js", ".json", ".mjs", ".svg", ".txt"})
ROOT_ASSET_PREFIXES = ("sound/", "sprites/", "ai-tools/")
DYNAMIC_ASSET_DIRECTORIES = (
    "assets/fonts/barlow-semi-condensed",
    "sound/playlists",
    "sound/soundEffects",
    "sound/voice-lines/npc-voicelines",
    "sound/voice-lines/player-voice-lines",
    "sprites/npc/campfire/worldroot-v2/runtime",
    "sprites/environment/star-identities-v2",
    "sprites/environment/star-identity-lights-v1",
    "sprites/environment/worldroot-modular-v4/living",
    "sprites/environment/worldroot-modular-v4/consumed",
    "sprites/tiles/dynamic-soil",
    "sprites/tiles/resource-tiles-imagegen-v3",
    "sprites/UI/celestial-focus-v1",
)
EXCLUDED_ASSET_PATHS = tuple(PACKAGING_POLICY["excludedAssetPaths"])
STYLESHEET_TAG_RE = re.compile(
    r'<link rel="stylesheet" href="\./css/style\.css(?:\?[^"]*)?">'
)
PHASER_SCRIPT_TAG_RE = re.compile(
    r'<script src="\./libs/phaser\.js(?:\?[^"]*)?"></script>'
)
MAIN_SCRIPT_TAG_RE = re.compile(
    r'<script type="module" src="\./main\.js(?:\?[^"]*)?"></script>'
)


def release_support_files() -> set[Path]:
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    styles = {
        (ROOT / match).resolve()
        for match in re.findall(r'href="[.]/([^"?]+[.]css)(?:[?][^"]*)?"', html)
    }
    pending_styles = list(styles)
    while pending_styles:
        stylesheet = pending_styles.pop()
        if ROOT not in stylesheet.parents or not stylesheet.is_file():
            raise FileNotFoundError(f"Missing release stylesheet: {stylesheet}")
        for specifier in re.findall(
            r'''@import\s+(?:url\(\s*)?["']([^"']+)["']''',
            stylesheet.read_text(encoding="utf-8"),
        ):
            if specifier.startswith(("https:", "http:", "//", "data:")):
                continue
            imported = (stylesheet.parent / specifier.split("?", 1)[0].split("#", 1)[0]).resolve()
            if imported not in styles:
                styles.add(imported)
                pending_styles.append(imported)
    support = {
        ROOT / relative for relative in (
            "api/player-data.php", "api/.htaccess", "server/.htaccess",
            "server/PlayerDataConfig.php", "server/PlayerDataValidation.php",
            "server/DualCopyPlayerDataStore.php", "values/playerDataServer.php",
        )
    }
    for path in styles | support:
        if ROOT not in path.resolve().parents or not path.is_file():
            raise FileNotFoundError(f"Missing release support file: {path}")
    return styles | support


def production_build_id(modules: list[Path], assets: set[Path]) -> str:
    digest = hashlib.sha256()
    inputs = set(modules) | set(assets) | release_support_files() | {
        Path(__file__).resolve(),
        PACKAGING_POLICY_PATH,
        ROOT / "index.html",
        ROOT / "css/style.css",
        ROOT / "libs/phaser.js",
    }
    for path in sorted(inputs):
        digest.update(path.relative_to(ROOT).as_posix().encode("utf-8"))
        digest.update(b"\0")
        with path.open("rb") as source:
            while chunk := source.read(1024 * 1024):
                digest.update(chunk)
        digest.update(b"\0")
    return digest.hexdigest()[:12]


def safe_output_path(raw_path: str) -> Path:
    output = Path(raw_path).resolve()
    if output == ROOT or ROOT not in output.parents:
        raise ValueError("Output must be a child directory of the project root")
    return output


def module_graph(entry: Path) -> list[Path]:
    pending = [entry]
    if entry.resolve() == ENTRY_MODULE.resolve():
        # Inline entry modules can own browser controls without being imported by main.
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        for match in MODULE_RE.finditer(html):
            specifier = match.group(1) or match.group(2)
            if specifier.startswith("."):
                pending.append((ROOT / specifier.split("?", 1)[0].split("#", 1)[0]).resolve())
    found: set[Path] = set()
    while pending:
        source = pending.pop().resolve()
        if source in found:
            continue
        if not source.is_file() or ROOT not in source.parents:
            raise FileNotFoundError(f"Missing local module: {source}")
        found.add(source)
        text = source.read_text(encoding="utf-8")
        for match in MODULE_RE.finditer(text):
            specifier = match.group(1) or match.group(2)
            if not specifier.startswith("."):
                continue
            clean_specifier = specifier.split("?", 1)[0].split("#", 1)[0]
            target = (source.parent / clean_specifier).resolve()
            if not target.suffix:
                target = target.with_suffix(".js")
            pending.append(target)
    return sorted(found)


def root_candidate(value: str, source: Path) -> Path | None:
    return _root_candidate(value, source.parent)


@lru_cache(maxsize=65536)
def _root_candidate(value: str, parent: Path) -> Path | None:
    clean = value.split("?", 1)[0].split("#", 1)[0].replace("\\", "/")
    if not clean or "${" in clean or clean.startswith(("data:", "http:", "https:")):
        return None
    candidates = [(parent / clean).resolve(), (ROOT / clean.lstrip("./")).resolve()]
    for prefix in ROOT_ASSET_PREFIXES:
        index = clean.find(prefix)
        if index >= 0:
            candidates.append((ROOT / clean[index:]).resolve())
    for candidate in candidates:
        if (candidate == ROOT or ROOT in candidate.parents) and candidate.exists():
            return candidate
    return None


EXCLUDED_ASSET_ROOTS = tuple((ROOT / relative).resolve() for relative in EXCLUDED_ASSET_PATHS)


def is_excluded_asset(candidate: Path) -> bool:
    return any(
        candidate == excluded or excluded in candidate.parents
        for excluded in EXCLUDED_ASSET_ROOTS
    )


def json_strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from json_strings(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from json_strings(item)


def discover_assets(modules: list[Path]) -> tuple[set[Path], list[str]]:
    assets: set[Path] = set()
    directories: set[Path] = set()
    basenames: set[str] = set()
    unresolved: set[str] = set()

    def inspect_literal(value: str, source: Path) -> None:
        clean = value.split("?", 1)[0].split("#", 1)[0]
        suffix = Path(clean).suffix.lower()
        if suffix in ASSET_SUFFIXES:
            basenames.add(Path(clean).name)
        candidate = root_candidate(clean, source)
        if candidate and is_excluded_asset(candidate):
            return
        if candidate and candidate.is_file() and candidate.suffix.lower() in ASSET_SUFFIXES:
            assets.add(candidate)
        elif candidate and candidate.is_dir():
            directories.add(candidate)
        elif suffix in ASSET_SUFFIXES and "/" in clean and "${" not in clean:
            unresolved.add(clean)

    for module in modules:
        for literal in LITERAL_RE.findall(module.read_text(encoding="utf-8")):
            inspect_literal(literal, module)

    # These libraries construct paths from directory and filename fragments at
    # runtime. They are runtime content, not source-art workspaces, so copying
    # their supported media recursively is safer than guessing every join.
    for relative_directory in DYNAMIC_ASSET_DIRECTORIES:
        directory = ROOT / relative_directory
        for child in directory.rglob("*"):
            if (
                child.is_file()
                and child.suffix.lower() in DYNAMIC_ASSET_SUFFIXES
                and not is_excluded_asset(child.resolve())
            ):
                assets.add(child.resolve())

    changed = True
    parsed_json: set[Path] = set()
    scanned_directories: set[Path] = set()
    while changed:
        before = (len(assets), len(directories), len(basenames), len(parsed_json))
        for directory in tuple(directories - scanned_directories):
            scanned_directories.add(directory)
            for child in directory.iterdir():
                if (
                    child.is_file()
                    and child.suffix.lower() in ASSET_SUFFIXES
                    and not is_excluded_asset(child.resolve())
                ):
                    assets.add(child.resolve())
        # Directory enumeration already includes every supported basename.
        # Avoid a redundant directories-by-basenames filesystem cross product.
        for manifest in tuple(path for path in assets if path.suffix.lower() == ".json"):
            if manifest in parsed_json:
                continue
            parsed_json.add(manifest)
            try:
                data = json.loads(manifest.read_text(encoding="utf-8"))
            except (OSError, UnicodeDecodeError, json.JSONDecodeError):
                continue
            directories.add(manifest.parent.resolve())
            for value in json_strings(data):
                inspect_literal(value, manifest)
        after = (len(assets), len(directories), len(basenames), len(parsed_json))
        changed = after != before

    copied_suffixes = tuple(path.relative_to(ROOT).as_posix() for path in assets)
    unresolved = {
        literal for literal in unresolved
        if not any(path.endswith(literal.lstrip("./")) for path in copied_suffixes)
    }
    return assets, sorted(unresolved)


def copy_preserving_root(source: Path, staging: Path) -> None:
    target = staging / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    try:
        shutil.copy2(source, target)
    except FileNotFoundError as error:
        raise FileNotFoundError(
            f"Production asset copy failed: {source} -> {target}"
        ) from error


def version_local_module_specifier(specifier: str, build_id: str) -> str:
    if not specifier.startswith("."):
        return specifier
    path_and_query, separator, fragment = specifier.partition("#")
    clean_path = path_and_query.split("?", 1)[0]
    versioned = f"{clean_path}?v={build_id}"
    return f"{versioned}#{fragment}" if separator else versioned


def production_module_source(source: Path, build_id: str) -> str:
    text = source.read_text(encoding="utf-8")

    def replace_specifier(match: re.Match) -> str:
        group_index = 1 if match.group(1) is not None else 2
        specifier = match.group(group_index)
        versioned = version_local_module_specifier(specifier, build_id)
        if versioned == specifier:
            return match.group(0)
        relative_start = match.start(group_index) - match.start()
        relative_end = match.end(group_index) - match.start()
        return match.group(0)[:relative_start] + versioned + match.group(0)[relative_end:]

    return MODULE_RE.sub(replace_specifier, text)


def copy_versioned_module(source: Path, staging: Path, build_id: str) -> None:
    target = staging / source.relative_to(ROOT)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(production_module_source(source, build_id), encoding="utf-8")


def replace_required_tag(html: str, pattern: re.Pattern, replacement: str, label: str) -> str:
    updated, count = pattern.subn(replacement, html, count=1)
    if count != 1:
        raise ValueError(f"Production build could not find the {label} tag")
    return updated


def production_index(build_id: str) -> str:
    html = production_module_source(ROOT / "index.html", build_id)
    html = replace_required_tag(
        html,
        STYLESHEET_TAG_RE,
        f'<link rel="stylesheet" href="./css/style.css?v={build_id}">',
        "stylesheet",
    )
    html = replace_required_tag(
        html,
        PHASER_SCRIPT_TAG_RE,
        '<script>\n'
        '    globalThis.__DIG_GAME_PRODUCTION__ = true;\n'
        f'    globalThis.__DIG_GAME_BUILD_ID__ = {json.dumps(build_id)};\n'
        '    {\n'
        '      const productionUrl = new URL(location.href);\n'
        '      ["jkd_e2e", "ui-review", "cave-review", "wurm", "wurm10x"].forEach(name => productionUrl.searchParams.delete(name));\n'
        '      history.replaceState(history.state, "", productionUrl);\n'
        '    }\n'
        '  </script>\n'
        f'  <script src="./libs/phaser.js?v={build_id}"></script>',
        "Phaser script",
    )
    html = replace_required_tag(
        html,
        MAIN_SCRIPT_TAG_RE,
        f'<script type="module" src="./main.js?v={build_id}"></script>',
        "main module",
    )
    html = html.replace(
        '<script type="module" src="./session-logging.js"></script>',
        f'<script type="module" src="./session-logging.js?v={build_id}"></script>',
    )
    for path in release_support_files():
        if path.suffix == ".css":
            relative = path.relative_to(ROOT).as_posix()
            html = html.replace(f'href="./{relative}"', f'href="./{relative}?v={build_id}"')
    return html


def precompress(root: Path) -> tuple[int, int]:
    gzip_count = 0
    brotli_count = 0
    for path in tuple(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in COMPRESS_SUFFIXES or path.stat().st_size < 1024:
            continue
        data = path.read_bytes()
        (Path(str(path) + ".gz")).write_bytes(gzip.compress(data, compresslevel=9, mtime=0))
        gzip_count += 1
        if brotli is not None:
            (Path(str(path) + ".br")).write_bytes(brotli.compress(data, quality=11))
            brotli_count += 1
    return gzip_count, brotli_count


def enforce_size_budget(paths, label: str) -> dict:
    sizes = [path.stat().st_size for path in set(paths) if path.is_file()]
    total = sum(sizes)
    if total > MAX_UNPACKED_BYTES:
        raise ValueError(
            f"{label} is {total:,} bytes; maximum unpacked release is "
            f"{MAX_UNPACKED_BYTES:,} bytes. Nothing was published."
        )
    return {"unpackedBytes": total, "fileCount": len(sizes),
            "maxUnpackedBytes": MAX_UNPACKED_BYTES}


def build(output: Path) -> dict:
    if output.exists():
        raise FileExistsError("Output already exists; no old version was archived or copied")
    print("Collecting production modules and runtime assets...", flush=True)
    modules = module_graph(ENTRY_MODULE)
    assets, unresolved = discover_assets(modules)
    inputs = set(modules) | assets | release_support_files() | {
        ROOT / "index.html", ROOT / "libs/phaser.js", ROOT / "css/style.css",
    }
    input_size = enforce_size_budget(inputs, "Selected runtime files")
    print(f"Selected {input_size['fileCount']:,} files, "
          f"{input_size['unpackedBytes'] / 1_000_000_000:.3f} GB; "
          "development media and archives excluded.", flush=True)
    build_id = production_build_id(modules, assets)
    staging = Path(tempfile.mkdtemp(prefix=".production-stage-", dir=ROOT))
    try:
        for source in modules:
            copy_versioned_module(source, staging, build_id)
        for source in assets:
            copy_preserving_root(source, staging)
        for source in release_support_files() | {ROOT / "libs/phaser.js", ROOT / "css/style.css"}:
            copy_preserving_root(source, staging)
        (staging / "index.html").write_text(production_index(build_id), encoding="utf-8")
        manifest = {
            "buildId": build_id,
            "mode": "production-raw-modules",
            "debugMode": False,
            "moduleCount": len(modules),
            "assetCount": len(assets),
            "moduleCacheKey": build_id,
            "brotliAvailable": brotli is not None,
            "unresolvedAssetLiterals": unresolved,
            "maxUnpackedBytes": MAX_UNPACKED_BYTES,
            "excludedAssetPaths": list(EXCLUDED_ASSET_PATHS),
            "retainsPreviousRelease": False,
        }
        (staging / "build-manifest.json").write_text(
            json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print("Compressing text assets and checking final disk size...", flush=True)
        gzip_count, brotli_count = precompress(staging)
        manifest.update({"gzipSidecars": gzip_count, "brotliSidecars": brotli_count})
        manifest_path = staging / "build-manifest.json"
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest_data = manifest_path.read_bytes()
        Path(str(manifest_path) + ".gz").write_bytes(gzip.compress(manifest_data, compresslevel=9, mtime=0))
        if brotli is not None:
            Path(str(manifest_path) + ".br").write_bytes(brotli.compress(manifest_data, quality=11))
        if production_build_id(modules, assets) != build_id:
            raise RuntimeError("Runtime source changed during packaging; rebuild a fresh snapshot")
        size = enforce_size_budget(staging.rglob("*"), "Complete release including sidecars")
        if output.exists():
            raise FileExistsError("Output appeared during packaging; no existing files were replaced")
        os.replace(staging, output)
        return {**manifest, **size}
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--out-dir", default=str(DEFAULT_OUTPUT))
    args = parser.parse_args()
    output = safe_output_path(args.out_dir)
    manifest = build(output)
    print(json.dumps({"output": str(output), **manifest}, indent=2))


if __name__ == "__main__":
    main()
