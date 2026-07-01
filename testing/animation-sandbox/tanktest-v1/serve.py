#!/usr/bin/env python3
"""Serve the tank animation sandbox without file:// asset/CORS issues."""

from __future__ import annotations

import argparse
import contextlib
import http.server
import socket
import webbrowser
from pathlib import Path


SANDBOX_DIR = Path(__file__).resolve().parent
REPO_ROOT = SANDBOX_DIR.parents[2]
SANDBOX_PATH = "/testing/animation-sandbox/tanktest-v1/index.html"


class SandboxHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def port_is_free(host: str, port: int) -> bool:
    with contextlib.closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(0.2)
        return sock.connect_ex((host, port)) != 0


def pick_port(host: str, preferred: int) -> int:
    for port in range(preferred, preferred + 50):
        if port_is_free(host, port):
            return port
    raise RuntimeError(f"No free port found from {preferred} to {preferred + 49}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve Tank Test V1 from the repo root.")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8081)
    parser.add_argument("--no-open", action="store_true", help="Do not open the browser.")
    args = parser.parse_args()

    port = pick_port(args.host, args.port)
    if port != args.port:
        print(f"Port {args.port} is busy, using {port}.")

    url = f"http://{args.host}:{port}{SANDBOX_PATH}"
    handler = lambda *h_args, **h_kwargs: SandboxHandler(  # noqa: E731
        *h_args,
        directory=str(REPO_ROOT),
        **h_kwargs,
    )

    with http.server.ThreadingHTTPServer((args.host, port), handler) as server:
        print(f"Serving repo root: {REPO_ROOT}")
        print(f"Open sandbox: {url}")
        if not args.no_open:
            webbrowser.open(url)
        server.serve_forever()


if __name__ == "__main__":
    main()
