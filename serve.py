"""Minimal HTTP server with correct JS MIME type for Windows."""
from email import policy
from email.parser import BytesParser
import datetime
import http.server
import json
import mimetypes
import os
import re
import socket
import socketserver
import sys
import threading
import webbrowser
from urllib.parse import urlsplit
from urllib.request import urlopen

# Force correct MIME type for ES modules regardless of Windows registry
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

NO_CACHE_EXTENSIONS = frozenset((".html", ".js", ".mjs", ".css", ".json"))
MEDIA_EXTENSIONS = frozenset((".mp4", ".webm", ".ogg", ".mp3", ".wav"))
COPY_CHUNK_BYTES = 64 * 1024

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
    # A disconnected/paused media client must not occupy a request slot forever.
    timeout = 30

    def send_head(self):
        self.range_remaining = None
        path = self.translate_path(self.path)
        requested_range = self.headers.get("Range", "")
        if os.path.splitext(path)[1].lower() not in MEDIA_EXTENSIONS or not requested_range:
            return super().send_head()
        try:
            source = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None
        size = os.fstat(source.fileno()).st_size
        match = re.fullmatch(r"bytes=(\d*)-(\d*)", requested_range)
        try:
            if not match or not any(match.groups()):
                raise ValueError
            first, last = match.groups()
            start = int(first) if first else max(0, size - int(last))
            end = min(size - 1, int(last)) if first and last else size - 1
            if start > end or start >= size:
                raise ValueError
        except ValueError:
            source.close()
            self.send_response(416)
            self.send_header("Content-Range", f"bytes */{size}")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        self.range_remaining = end - start + 1
        self.send_response(206)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Content-Length", str(self.range_remaining))
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.end_headers()
        source.seek(start)
        return source

    def copyfile(self, source, outputfile):
        try:
            if self.range_remaining is None:
                return super().copyfile(source, outputfile)
            remaining = self.range_remaining
            while remaining:
                chunk = source.read(min(COPY_CHUNK_BYTES, remaining))
                if not chunk:
                    break
                outputfile.write(chunk)
                remaining -= len(chunk)
        except (ConnectionError, TimeoutError):
            pass  # Navigation and media seeks routinely cancel old responses.

    def end_headers(self):
        request_path = urlsplit(self.path).path
        extension = os.path.splitext(request_path)[1].lower()
        if extension in MEDIA_EXTENSIONS:
            self.send_header("Accept-Ranges", "bytes")
        if request_path.endswith("/") or extension in NO_CACHE_EXTENSIONS:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_POST(self):
        if self.path != "/screenrecord":
            self.send_error(404, "Unknown POST endpoint")
            return

        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            self.send_error(400, "Expected multipart/form-data")
            return

        content_length = self.headers.get("Content-Length")
        if not content_length:
            self.send_error(411, "Missing Content-Length")
            return

        try:
            content_length = int(content_length)
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return

        raw_body = self.rfile.read(content_length)
        envelope = (
            f"Content-Type: {content_type}\r\n"
            f"MIME-Version: 1.0\r\n"
            f"\r\n"
        ).encode("utf-8") + raw_body
        parsed = BytesParser(policy=policy.default).parsebytes(envelope)
        if not parsed.is_multipart():
            self.send_error(400, "Invalid multipart/form-data payload")
            return

        upload = None
        for part in parsed.iter_parts():
            if part.get_content_disposition() != "form-data":
                continue
            name = part.get_param("name", header="content-disposition")
            if name == "recording":
                upload = part
                break

        if upload is None:
            self.send_error(400, "Missing recording field")
            return

        filename = upload.get_filename() or "screenrecord.webm"
        output_root = os.path.join(os.getcwd(), "systems", "screenrecord")
        os.makedirs(output_root, exist_ok=True)

        safe_filename = os.path.basename(filename)
        if not safe_filename.lower().endswith(".webm"):
            safe_filename += ".webm"
        safe_prefix = f"screenrecord-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S-%f')}"
        safe_filename = f"{safe_prefix}-{safe_filename}"

        output_path = os.path.join(output_root, safe_filename)
        with open(output_path, "wb") as fp:
            fp.write(upload.get_payload(decode=True) or b"")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({
            "ok": True,
            "file": os.path.basename(output_path),
        }).encode("utf-8"))

    def guess_type(self, path):
        _, ext = os.path.splitext(path)
        if ext in ('.js', '.mjs'):
            return 'application/javascript'
        return super().guess_type(path)

    def log_message(self, fmt, *args):
        # Thousands of successful module requests can fill an undrained console
        # pipe and block every worker before the runtime graph finishes loading.
        if len(args) > 1 and str(args[1]).isdigit() and int(args[1]) >= 400:
            print(fmt % args, file=sys.stderr)

class ReuseAddrServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = os.name != "nt"
    daemon_threads = True
    request_queue_size = 64
    request_slots = threading.BoundedSemaphore(16)

    def process_request(self, request, client_address):
        self.request_slots.acquire()
        try:
            super().process_request(request, client_address)
        except BaseException:
            self.request_slots.release()
            raise

    def process_request_thread(self, request, client_address):
        try:
            super().process_request_thread(request, client_address)
        finally:
            self.request_slots.release()

    def server_bind(self):
        if os.name == "nt":
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()

def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    url = f"http://localhost:{port}/index.html"
    try:
        httpd = ReuseAddrServer(("", port), Handler)
    except OSError as error:
        # Double-clicking the launcher should still open our running checkout.
        # Verify its entry page before reusing an occupied port.
        try:
            with open("index.html", "rb") as entry:
                expected = entry.read()
            with urlopen(url, timeout=3) as response:
                same_checkout = response.status == 200 and response.read(len(expected) + 1) == expected
            if same_checkout:
                print(f"Game server already running — {url}")
                if "--no-open" not in sys.argv:
                    webbrowser.open(url)
                return
        except (OSError, ValueError):
            pass
        print(f"Cannot start server on port {port}: {error}. Close the existing server or choose another port.", file=sys.stderr)
        return
    with httpd:
        print(f"Just Keep Digging — {url}")
        if "--no-open" not in sys.argv:
            webbrowser.open(url)
        httpd.serve_forever()


if __name__ == "__main__":
    main()
