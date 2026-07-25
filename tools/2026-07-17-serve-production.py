"""Serve the isolated production snapshot with deployment-grade HTTP headers."""

from __future__ import annotations

import argparse
from email.utils import formatdate
import hashlib
import http.server
import mimetypes
from pathlib import Path
import re
import socketserver
from urllib.parse import unquote, urlsplit
import webbrowser


ROOT = Path(__file__).resolve().parents[1]
HASHED_NAME_RE = re.compile(r"(?:^|[-.])[0-9a-f]{8,64}(?:[-.]|$)", re.IGNORECASE)
MIME_TYPES = {
    ".avif": "image/avif",
    ".br": "application/octet-stream",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".ktx": "image/ktx",
    ".ktx2": "image/ktx2",
    ".mjs": "application/javascript; charset=utf-8",
    ".ogg": "audio/ogg",
    ".wasm": "application/wasm",
    ".webm": "video/webm",
    ".webp": "image/webp",
}


class ProductionHandler(http.server.SimpleHTTPRequestHandler):
    server_version = "DigGameProduction/1.0"
    protocol_version = "HTTP/1.1"

    def __init__(self, *args, directory: str, **kwargs):
        self.content_encoding = None
        self.range_bytes = None
        super().__init__(*args, directory=directory, **kwargs)

    def guess_type(self, path):
        suffix = Path(path).suffix.lower()
        return MIME_TYPES.get(suffix, mimetypes.guess_type(path)[0] or "application/octet-stream")

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()

    def do_POST(self):
        self.send_error(405, "Production server is read-only")

    def _cache_control(self, requested: Path) -> str:
        relative = requested.relative_to(Path(self.directory))
        if relative.as_posix() in ("index.html", "build-manifest.json"):
            return "no-cache, must-revalidate"
        if HASHED_NAME_RE.search(requested.name):
            return "public, max-age=31536000, immutable"
        if requested.suffix.lower() in (".js", ".mjs", ".css", ".json"):
            return "no-cache, must-revalidate"
        return "public, max-age=86400, must-revalidate"

    def _select_encoded(self, requested: Path) -> tuple[Path, str | None]:
        accepted = self.headers.get("Accept-Encoding", "").lower()
        if "br" in accepted and Path(str(requested) + ".br").is_file():
            return Path(str(requested) + ".br"), "br"
        if "gzip" in accepted and Path(str(requested) + ".gz").is_file():
            return Path(str(requested) + ".gz"), "gzip"
        return requested, None

    def _requested_path(self) -> Path | None:
        url_path = unquote(urlsplit(self.path).path)
        if url_path.endswith("/"):
            url_path += "index.html"
        requested = Path(self.translate_path(url_path)).resolve()
        root = Path(self.directory).resolve()
        if root not in requested.parents or requested.suffix.lower() in (".br", ".gz"):
            return None
        return requested

    def send_head(self):
        requested = self._requested_path()
        if requested is None or not requested.is_file():
            self.send_error(404, "File not found")
            return None
        served, encoding = self._select_encoded(requested)
        stat = served.stat()
        etag_seed = f"{requested.stat().st_mtime_ns}:{requested.stat().st_size}".encode()
        etag = f'"{hashlib.sha256(etag_seed).hexdigest()[:16]}"'
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", self._cache_control(requested))
            self.end_headers()
            return None

        range_header = self.headers.get("Range") if encoding is None else None
        start, end = 0, stat.st_size - 1
        if range_header and range_header.startswith("bytes="):
            try:
                start_raw, end_raw = range_header[6:].split("-", 1)
                start = int(start_raw) if start_raw else max(0, stat.st_size - int(end_raw))
                end = min(stat.st_size - 1, int(end_raw)) if end_raw else stat.st_size - 1
                if start > end:
                    raise ValueError
                self.range_bytes = end - start + 1
            except (TypeError, ValueError):
                self.send_error(416, "Invalid byte range")
                return None

        self.send_response(206 if self.range_bytes is not None else 200)
        self.send_header("Content-Type", self.guess_type(str(requested)))
        self.send_header("Content-Length", str(self.range_bytes or stat.st_size))
        self.send_header("Last-Modified", formatdate(stat.st_mtime, usegmt=True))
        self.send_header("ETag", etag)
        self.send_header("Cache-Control", self._cache_control(requested))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Vary", "Accept-Encoding")
        if encoding:
            self.send_header("Content-Encoding", encoding)
        if self.range_bytes is not None:
            self.send_header("Content-Range", f"bytes {start}-{end}/{stat.st_size}")
        self.end_headers()
        handle = served.open("rb")
        handle.seek(start)
        return handle

    def copyfile(self, source, outputfile):
        remaining = self.range_bytes
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(64 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)


class ThreadingServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("port", nargs="?", type=int, default=8081)
    parser.add_argument("--bind", default="127.0.0.1")
    parser.add_argument("--directory", default=str(ROOT / "dist"))
    parser.add_argument("--open", action="store_true")
    args = parser.parse_args()
    directory = Path(args.directory).resolve()
    if not (directory / "build-manifest.json").is_file():
        raise SystemExit(f"No production build found at {directory}; run the build script first")
    handler = lambda *a, **kw: ProductionHandler(*a, directory=str(directory), **kw)
    with ThreadingServer((args.bind, args.port), handler) as server:
        url = f"http://{args.bind}:{args.port}/"
        print(f"Just Keep Digging production preview — {url}")
        if args.open:
            webbrowser.open(url)
        server.serve_forever()


if __name__ == "__main__":
    main()
