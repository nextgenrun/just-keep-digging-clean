#!/usr/bin/env python3
"""Deep, fail-closed regression gate for the Dig Game production systems."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
TESTING = ROOT / "testing"
SELF = Path(__file__).resolve()
LANE_MANIFEST = TESTING / "2026-08-12-contract-lanes.json"
META_TESTS = (
    TESTING / "2026-07-22-all-game-systems-health-check.mjs",
)
SKIP_TOKENS = ("all-game-systems", "deep-game-logic-health", "live-qa", "live-compare-qa", "live-visual")
TOOL_ONLY_CONTRACTS = {
    "2026-07-17-blender-animation-lab-contract.py",
    "2026-07-17-blender-animation-lab-simple-mode-smoke.py",
    "2026-07-18-production-deployment-smoke.py",
    "2026-07-25-production-http-canary.py",
    "2026-07-26-version-control-safety-contract.mjs",
}
SYSTEM_ROOTS = (ROOT / "systems", ROOT / "sound")
SYSTEM_SUFFIX_ROOTS = (ROOT / "world", ROOT / "player", ROOT / "ui")
CRITICAL_FAMILIES = {
    "mining": ("digsystem", "mining", "tile-contact"),
    "player": ("playerstate", "player-collision", "ual-action"),
    "world-model": ("worldmodel", "world-generation", "world-functionality"),
    "caves": ("cavegameplay", "caveentry", "caveactionanimation"),
    "weather": ("weathersystem", "weather-"),
    "lighting": ("lightsystem", "lighting-"),
    "earthquakes": ("earthquakesystem", "earthquake-"),
    "teleport": ("specialtilesystem", "teleport-route"),
    "abilities": ("playerabilities", "arc-core", "level-two-operational"),
    "rendering": ("worldrenderer", "render-density", "renderer-functionality"),
}


@dataclass
class Result:
    name: str
    ok: bool
    seconds: float
    detail: str = ""
    kind: str = "contract"


def contract_inventory_signature(contracts: list[Path]) -> str:
    payload = "\n".join(path.name for path in sorted(contracts)).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_lane_manifest(contracts: list[Path]) -> tuple[dict, dict[str, str]]:
    manifest = json.loads(LANE_MANIFEST.read_text(encoding="utf-8"))
    if manifest.get("schemaVersion") != 1:
        raise ValueError("unsupported contract-lane manifest schema")
    inventory = manifest.get("inventory", {})
    actual_signature = contract_inventory_signature(contracts)
    if inventory.get("count") != len(contracts) or inventory.get("sha256") != actual_signature:
        raise ValueError(
            "contract inventory changed without lane classification: "
            f"expected {inventory.get('count')} / {inventory.get('sha256')}, "
            f"got {len(contracts)} / {actual_signature}"
        )

    discovered = {path.name for path in contracts}
    full_compat = set(manifest.get("fullCompatContracts", []))
    missing = sorted(full_compat - discovered)
    if missing:
        raise ValueError(f"full-compat manifest references missing contracts: {', '.join(missing)}")
    tokens = tuple(manifest.get("artifactReviewNameTokens", []))
    lane_by_name = {}
    for contract in contracts:
        if contract.name in full_compat:
            lane_by_name[contract.name] = "full-compat"
        elif any(token in contract.name for token in tokens):
            lane_by_name[contract.name] = "artifact-review"
        else:
            lane_by_name[contract.name] = "demo-release"
    return manifest, lane_by_name


def failure_signature(result: Result) -> str:
    detail = concise_detail(result, limit=3500).replace("\\", "/")
    detail = re.sub(re.escape(str(ROOT).replace("\\", "/")), "<ROOT>", detail, flags=re.IGNORECASE)
    detail = re.sub(r":\d+:\d+", ":<LINE>", detail)
    detail = re.sub(r"Node\.js v[\d.]+", "Node.js <VERSION>", detail)
    detail = re.sub(r"\s+", " ", detail).strip()
    return hashlib.sha256(detail.encode("utf-8")).hexdigest()


def find_node() -> Path:
    located = shutil.which("node")
    candidates = [Path(located)] if located else []
    runtime_root = Path(sys.executable).resolve().parent.parent
    candidates += [
        runtime_root / "node" / "bin" / "node.exe",
        runtime_root / "node" / "bin" / "node",
        Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe",
        ROOT / "node.exe",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate.resolve()
    raise RuntimeError("Node.js was not found on PATH or beside the bundled Python runtime")


def run_process(name: str, command: list[str], timeout: int, kind: str) -> Result:
    started = time.perf_counter()
    try:
        process = subprocess.run(
            command,
            cwd=ROOT,
            text=True,
            encoding="utf-8",
            errors="replace",
            capture_output=True,
            timeout=timeout,
            env={**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0"},
            check=False,
        )
        output = "\n".join(part.strip() for part in (process.stdout, process.stderr) if part.strip())
        return Result(name, process.returncode == 0, time.perf_counter() - started, output, kind)
    except subprocess.TimeoutExpired as error:
        output = "\n".join(str(part or "") for part in (error.stdout, error.stderr)).strip()
        return Result(name, False, time.perf_counter() - started, f"TIMEOUT after {timeout}s\n{output}", kind)
    except OSError as error:
        return Result(name, False, time.perf_counter() - started, str(error), kind)


def discover_contracts() -> list[Path]:
    contracts = []
    for path in sorted(TESTING.glob("*.mjs")):
        if (path.name not in TOOL_ONLY_CONTRACTS
                and not any(token in path.name for token in SKIP_TOKENS)):
            contracts.append(path)
    for path in sorted(TESTING.glob("*.py")):
        if (path.resolve() != SELF
                and path.name not in TOOL_ONLY_CONTRACTS
                and not any(token in path.name for token in SKIP_TOKENS)):
            contracts.append(path)
    return contracts


def discover_systems() -> list[Path]:
    systems = []
    for directory in SYSTEM_ROOTS:
        if directory.is_dir():
            systems.extend(directory.rglob("*.js"))
    for directory in SYSTEM_SUFFIX_ROOTS:
        if directory.is_dir():
            systems.extend(path for path in directory.rglob("*System.js") if path.is_file())
    return sorted(set(path.resolve() for path in systems))


def imported_module_graph(seeds: list[Path]) -> set[Path]:
    patterns = (
        re.compile(r'^\s*import\s+(?:[\s\S]*?\s+from\s+)?["\']([^"\']+)["\']', re.MULTILINE),
        re.compile(r'^\s*export\s+(?:\*|\{[\s\S]*?\})\s+from\s+["\']([^"\']+)["\']', re.MULTILINE),
        re.compile(r'\bimport\s*\(\s*["\']([^"\']+)["\']\s*\)'),
    )
    visited: set[Path] = set()
    pending = [path.resolve() for path in seeds if path.suffix == ".mjs"]
    while pending:
        path = pending.pop()
        if path in visited or not path.is_file():
            continue
        visited.add(path)
        source = path.read_text(encoding="utf-8", errors="replace")
        for pattern in patterns:
            for specifier in pattern.findall(source):
                if not specifier.startswith("."):
                    continue
                unresolved = (path.parent / specifier.split("?", 1)[0].split("#", 1)[0]).resolve()
                candidates = [unresolved] if unresolved.suffix else [unresolved, Path(f"{unresolved}.js"), Path(f"{unresolved}.mjs"), unresolved / "index.js"]
                target = next((candidate for candidate in candidates if candidate.is_file()), None)
                if target and target.suffix in {".js", ".mjs"}:
                    pending.append(target)
    return visited


def coverage_audit(contracts: list[Path], systems: list[Path]) -> tuple[Result, dict]:
    corpus = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in contracts)
    corpus_lower = corpus.lower()
    covered = [path for path in systems if path.stem in corpus]
    imported = imported_module_graph(contracts)
    behavior_reached = set(covered) | (set(systems) & imported)
    uncovered = [path.relative_to(ROOT).as_posix() for path in systems if path not in behavior_reached]
    missing_families = [
        family for family, tokens in CRITICAL_FAMILIES.items()
        if not any(token in corpus_lower for token in tokens)
    ]
    detail = (
        f"behavior-reached systems={len(behavior_reached)}/{len(systems)} "
        f"(direct={len(covered)}); "
        f"critical families={len(CRITICAL_FAMILIES) - len(missing_families)}/{len(CRITICAL_FAMILIES)}"
    )
    if missing_families:
        detail += f"; missing families={', '.join(missing_families)}"
    if uncovered:
        detail += f"; indirect-only sample={', '.join(uncovered[:12])}"
    metrics = {
        "systemModules": len(systems),
        "directlyReferencedSystems": len(covered),
        "behaviorReachedSystems": len(behavior_reached),
        "notBehaviorReachedSystems": len(uncovered),
        "missingCriticalFamilies": missing_families,
        "notBehaviorReachedModules": uncovered,
    }
    return Result("behavioral system coverage", not missing_families, 0.0, detail, "coverage"), metrics


def wiring_audit() -> Result:
    source_files = sorted((ROOT / "world" / "playScene").glob("*.js"))
    corpus = "\n".join(path.read_text(encoding="utf-8", errors="replace") for path in source_files)
    lifecycle_source = (ROOT / "world" / "playScene" / "PlaySceneLifecycle.js").read_text(
        encoding="utf-8", errors="replace"
    )
    lifecycle_properties = set(re.findall(r'^\s+"(\w+)",?\s*$', lifecycle_source, re.MULTILINE))
    assignments = re.findall(r"(?:this|scene)\.(\w+)\s*=\s*new\s+(\w+)", corpus)
    orphaned = []
    for property_name, class_name in assignments:
        references = len(re.findall(rf"\b(?:this|scene)\.{re.escape(property_name)}\b", corpus))
        if references < 2 and property_name not in lifecycle_properties:
            orphaned.append(f"{property_name}:{class_name}")
    detail = f"constructed collaborators={len(assignments)}"
    if orphaned:
        detail += f"; never consumed={', '.join(orphaned)}"
    return Result("PlayScene collaborator wiring", not orphaned, 0.0, detail, "wiring")


def contact_routing_audit(node: Path, timeout: int) -> Result:
    probe = r'''
import { readFileSync } from "node:fs";
import { UAL_NATIVE_PLAYER_ASSET_PROFILE as profile } from "./values/ualNativePlayerAssetProfile.js";
import { resolveUalActionContact } from "./values/ualNativeActionTuning.js";
const manifest = JSON.parse(readFileSync("./sprites/character/ual-native-player-v1/runtime/manifest.json", "utf8"));
const actionByFile = new Map(Object.entries(manifest.actions).map(([key, value]) => [value.file, key]));
const fileBySheet = new Map(profile.sheetFiles.map(([profileKey, file]) => [profile[profileKey], file]));
const animationKeys = [...new Set([
  ...profile.digSidewaysHitAnims,
  ...profile.digUpHitAnims,
  ...profile.digUpSidewaysHitAnims,
  ...profile.digDownHitAnims,
])];
const rows = animationKeys.map((animationKey) => {
  const variant = profile.digAnimationVariants.find((entry) => entry.key === animationKey);
  const sheet = variant?.sheet
    || (animationKey === profile.quickslashAnim ? profile.quickslashSheet : null)
    || (profile.digDownHitAnims.includes(animationKey) ? profile.digDownSheet : null);
  const expectedAction = actionByFile.get(fileBySheet.get(sheet)) || null;
  const contact = resolveUalActionContact(profile, animationKey);
  return { animationKey, expectedAction, actualAction: contact?.sourceAction || null };
});
console.log("CONTACT_ROUTING_JSON " + JSON.stringify(rows));
'''
    result = run_process(
        "player visual/contact action routing",
        [str(node), "--input-type=module", "--eval", probe],
        timeout,
        "logic-probe",
    )
    if not result.ok:
        return result
    marker = next((line for line in result.detail.splitlines() if line.startswith("CONTACT_ROUTING_JSON ")), "")
    try:
        rows = json.loads(marker.removeprefix("CONTACT_ROUTING_JSON "))
    except (json.JSONDecodeError, TypeError):
        return Result(result.name, False, result.seconds, f"probe returned no parseable routing data\n{result.detail}", result.kind)
    mismatches = [row for row in rows if row["expectedAction"] != row["actualAction"]]
    if mismatches:
        detail = "; ".join(
            f"{row['animationKey']}: visual={row['expectedAction']} markers={row['actualAction']}"
            for row in mismatches
        )
        return Result(result.name, False, result.seconds, detail, result.kind)
    return Result(result.name, True, result.seconds, f"verified {len(rows)} directional action routes", result.kind)


def concise_detail(result: Result, limit: int = 3500) -> str:
    if not result.detail:
        return "ok"
    lines = [line for line in result.detail.splitlines() if line.strip()]
    if result.ok:
        return lines[-1][:500] if lines else "ok"
    text = "\n".join(lines[-35:])
    return text[-limit:]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--timeout", type=int, default=60, help="seconds allowed per isolated contract")
    parser.add_argument("--pattern", default="", help="only run contract filenames containing this text")
    parser.add_argument(
        "--lane",
        choices=("all", "demo-release", "full-compat", "artifact-review"),
        default="all",
        help="run one classified contract lane or the complete ratcheted gate",
    )
    parser.add_argument("--emit-signatures", action="store_true", help="print normalized hashes for raw failures")
    parser.add_argument("--json", action="store_true", help="also print the full machine-readable report")
    args = parser.parse_args()
    node = find_node()
    all_contracts = discover_contracts()
    try:
        lane_manifest, lane_by_name = load_lane_manifest(all_contracts)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"[FAIL] contract lane manifest: {error}", file=sys.stderr)
        return 2
    contracts = [
        path for path in all_contracts
        if args.lane == "all" or lane_by_name[path.name] == args.lane
    ]
    if args.pattern:
        contracts = [path for path in contracts if args.pattern.lower() in path.name.lower()]
    if not contracts:
        print("[FAIL] no gameplay contracts discovered", file=sys.stderr)
        return 2

    systems = discover_systems()
    results = []
    if args.lane in {"all", "demo-release"}:
        for meta in META_TESTS:
            results.append(run_process(meta.name, [str(node), str(meta)], args.timeout, "structural"))
    for contract in contracts:
        command = [sys.executable, str(contract)] if contract.suffix == ".py" else [str(node), str(contract)]
        results.append(run_process(contract.name, command, args.timeout, "contract"))
    if args.lane in {"all", "demo-release"}:
        results.append(contact_routing_audit(node, args.timeout))
        results.append(wiring_audit())
        coverage_result, coverage = coverage_audit(all_contracts, systems)
        results.append(coverage_result)
    else:
        coverage = {}

    known_by_lane = lane_manifest.get("knownFailureSignatures", {})
    accepted = []
    regressions = []
    resolved = []
    raw_failures = [result for result in results if not result.ok]
    contract_results = {result.name: result for result in results if result.kind == "contract"}
    selected_lanes = {args.lane} if args.lane != "all" else {
        "demo-release", "full-compat", "artifact-review"
    }
    for lane in selected_lanes:
        known = known_by_lane.get(lane, {})
        selected_names = {
            path.name for path in contracts if lane_by_name[path.name] == lane
        }
        for name, expected_signature in known.items():
            if name not in selected_names:
                continue
            result = contract_results.get(name)
            if result is None:
                regressions.append({"lane": lane, "name": name, "reason": "missing result"})
            elif result.ok:
                resolved.append({"lane": lane, "name": name})
            else:
                actual_signature = failure_signature(result)
                if actual_signature == expected_signature:
                    accepted.append({"lane": lane, "name": name, "signature": actual_signature})
                else:
                    regressions.append({
                        "lane": lane,
                        "name": name,
                        "reason": "failure signature changed",
                        "expected": expected_signature,
                        "actual": actual_signature,
                    })

    accepted_names = {item["name"] for item in accepted}
    unexpected_failures = [
        result for result in raw_failures
        if result.kind != "contract" or result.name not in accepted_names
    ]

    for result in results:
        status = "PASS" if result.ok else "KNOWN_FAIL" if result.name in accepted_names else "FAIL"
        print(f"[{status}] {result.kind}: {result.name} ({result.seconds:.2f}s) | {concise_detail(result)}")
    if args.emit_signatures:
        print("CONTRACT_FAILURE_SIGNATURES " + json.dumps({
            result.name: failure_signature(result)
            for result in raw_failures if result.kind == "contract"
        }, sort_keys=True, separators=(",", ":")))
    gate_failed = bool(unexpected_failures or regressions or resolved)
    summary = {
        "status": "FAIL" if gate_failed else "PASS",
        "lane": args.lane,
        "checks": len(results),
        "passed": sum(result.ok for result in results),
        "rawFailures": len(raw_failures),
        "acceptedKnownFailures": accepted,
        "regressions": regressions,
        "resolvedKnownFailures": resolved,
        "javascriptContracts": sum(path.suffix == ".mjs" for path in contracts),
        "pythonContracts": sum(path.suffix == ".py" for path in contracts),
        "excludedToolContracts": sorted(TOOL_ONLY_CONTRACTS),
        "node": str(node),
        "coverage": coverage,
        "failures": [{"kind": item.kind, "name": item.name, "detail": concise_detail(item)} for item in unexpected_failures],
    }
    print("DEEP_GAME_LOGIC_SUMMARY " + json.dumps(summary, separators=(",", ":")))
    if args.json:
        print(json.dumps(summary, indent=2))
    return 1 if gate_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
