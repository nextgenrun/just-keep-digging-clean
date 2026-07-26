#!/usr/bin/env python3
"""Probe a built Dig Game production endpoint without mutating it."""

from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import dataclass
from functools import partial
import json
from pathlib import Path
import runpy
import threading
from urllib.error import HTTPError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
SERVER_PATH = ROOT / "tools" / "2026-07-17-serve-production.py"
REQUEST_TIMEOUT_SECONDS = 20


@dataclass
class Response:
    status: int
    headers: object
    body: bytes


def request(url: str, method: str = "GET", headers: dict[str, str] | None = None) -> Response:
    outgoing = Request(url, method=method, headers=headers or {})
    try:
        with urlopen(outgoing, timeout=REQUEST_TIMEOUT_SECONDS) as incoming:
            return Response(incoming.status, incoming.headers, incoming.read())
    except HTTPError as error:
        return Response(error.code, error.headers, error.read())


def endpoint(base_url: str, relative: str) -> str:
    return urljoin(base_url.rstrip("/") + "/", relative.lstrip("/"))


def require_header(response: Response, name: str, expected: str) -> None:
    actual = response.headers.get(name, "")
    assert expected.lower() in actual.lower(), f"{name} expected {expected!r}, received {actual!r}"


def require_javascript_contract(
    base_url: str,
    build_id: str,
    relative: str,
    required_tokens: tuple[str, ...],
) -> None:
    response = request(
        endpoint(base_url, f"{relative}?v={build_id}"),
        headers={"Accept-Encoding": "identity"},
    )
    assert response.status == 200, f"{relative} returned {response.status}"
    require_header(response, "Content-Type", "application/javascript")
    source = response.body.decode("utf-8")
    for token in required_tokens:
        assert token in source, f"{relative} missing deployed contract token {token!r}"


def probe(base_url: str, include_write_guard: bool) -> dict:
    parsed = urlparse(base_url)
    assert parsed.scheme in {"http", "https"}, "canary URL must use http or https"

    manifest_response = request(
        endpoint(base_url, "build-manifest.json"),
        headers={"Accept-Encoding": "identity"},
    )
    assert manifest_response.status == 200, f"manifest returned {manifest_response.status}"
    require_header(manifest_response, "Content-Type", "application/json")
    require_header(manifest_response, "Cache-Control", "no-cache")
    manifest = json.loads(manifest_response.body.decode("utf-8"))
    build_id = manifest["buildId"]
    assert manifest["debugMode"] is False
    assert manifest["moduleCount"] >= 200
    assert manifest["assetCount"] >= 1000

    index_response = request(endpoint(base_url, ""), headers={"Accept-Encoding": "identity"})
    assert index_response.status == 200, f"index returned {index_response.status}"
    require_header(index_response, "X-Content-Type-Options", "nosniff")
    require_header(index_response, "Cache-Control", "no-cache")
    index = index_response.body.decode("utf-8")
    assert "globalThis.__DIG_GAME_PRODUCTION__ = true" in index
    assert f"globalThis.__DIG_GAME_BUILD_ID__ = {json.dumps(build_id)}" in index
    assert f"./main.js?v={build_id}" in index
    assert f"./libs/phaser.js?v={build_id}" in index

    main_response = request(
        endpoint(base_url, f"main.js?v={build_id}"),
        headers={"Accept-Encoding": "identity"},
    )
    assert main_response.status == 200, f"main.js returned {main_response.status}"
    require_header(main_response, "Content-Type", "application/javascript")
    require_header(main_response, "Cache-Control", "no-cache")
    main_source = main_response.body.decode("utf-8")
    assert "installRuntimeCanarySystem" in main_source
    assert "installAdminHealthPanel" in main_source

    require_javascript_contract(
        base_url,
        build_id,
        "world/playScene/NPCManager.js",
        (
            '"boboMerchant"',
            "checkNPCInteraction()",
            "this.scene.shopOverlay.show(nearestNPC.merchantId)",
            "getInteractionHealthSnapshot()",
        ),
    )
    require_javascript_contract(
        base_url,
        build_id,
        "systems/visual/MilestoneBoardSystem.js",
        (
            "allowOpen || this._isBoardOpen",
            "Phaser.Input.Keyboard.JustDown(keys.interact)",
        ),
    )
    require_javascript_contract(
        base_url,
        build_id,
        "ui/overlays/ShopOverlay.js",
        (
            "show(merchantId)",
            "this.currentMerchant = merchantId",
        ),
    )

    range_response = request(
        endpoint(base_url, f"libs/phaser.js?v={build_id}"),
        headers={"Accept-Encoding": "identity", "Range": "bytes=0-63"},
    )
    assert range_response.status == 206, f"range request returned {range_response.status}"
    require_header(range_response, "Content-Range", "bytes 0-63/")
    assert len(range_response.body) == 64

    compressed_response = request(
        endpoint(base_url, f"main.js?v={build_id}"),
        headers={"Accept-Encoding": "gzip"},
    )
    assert compressed_response.status == 200
    require_header(compressed_response, "Content-Encoding", "gzip")

    if include_write_guard:
        post_response = request(endpoint(base_url, ""), method="POST")
        assert post_response.status == 405, f"read-only guard returned {post_response.status}"

    return {
        "status": "PASS",
        "baseUrl": base_url,
        "buildId": build_id,
        "moduleCount": manifest["moduleCount"],
        "assetCount": manifest["assetCount"],
        "writeGuardChecked": include_write_guard,
    }


@contextmanager
def local_production_server(directory: Path):
    server_module = runpy.run_path(str(SERVER_PATH))
    production_handler = server_module["ProductionHandler"]
    threading_server = server_module["ThreadingServer"]

    class SilentProductionHandler(production_handler):
        def log_message(self, format, *args):
            return

    handler = partial(SilentProductionHandler, directory=str(directory))
    server = threading_server(("127.0.0.1", 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        yield f"http://127.0.0.1:{server.server_address[1]}/"
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=REQUEST_TIMEOUT_SECONDS)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", help="serve and probe this local production directory")
    parser.add_argument("--url", help="probe an already deployed read-only canary URL")
    args = parser.parse_args()
    if args.directory and args.url:
        parser.error("choose either --directory or --url")

    try:
        if args.url:
            summary = probe(args.url, include_write_guard=False)
        else:
            directory = Path(args.directory or ROOT / "dist").resolve()
            if not (directory / "build-manifest.json").is_file():
                raise AssertionError(f"production manifest is missing from {directory}")
            with local_production_server(directory) as base_url:
                summary = probe(base_url, include_write_guard=True)
    except Exception as error:
        print("PRODUCTION_CANARY_SUMMARY " + json.dumps({
            "status": "FAIL",
            "error": str(error),
        }, separators=(",", ":")))
        return 1

    print("PRODUCTION_CANARY_SUMMARY " + json.dumps(summary, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
