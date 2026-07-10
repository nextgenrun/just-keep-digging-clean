"""Minimal HTTP server with correct JS MIME type for Windows."""
from email import policy
from email.parser import BytesParser
import datetime
import http.server
import json
import mimetypes
import os
import socket
import socketserver
import sys
import webbrowser

# Force correct MIME type for ES modules regardless of Windows registry
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
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
        base, ext = os.path.splitext(path)
        if ext in ('.js', '.mjs'):
            return 'application/javascript'
        return super().guess_type(path)
    def log_message(self, fmt, *args):
        print(fmt % args)

class ReuseAddrServer(socketserver.TCPServer):
    allow_reuse_address = True
    def server_bind(self):
        self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self.socket.bind(self.server_address)

with ReuseAddrServer(("", PORT), Handler) as httpd:
    print(f"Just Keep Digging — http://localhost:{PORT}/index.html")
    webbrowser.open(f"http://localhost:{PORT}/index.html")
    httpd.serve_forever()
