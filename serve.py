"""Minimal HTTP server with correct JS MIME type for Windows."""
import http.server, socketserver, mimetypes, webbrowser, sys, os, socket

# Force correct MIME type for ES modules regardless of Windows registry
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("text/css", ".css")

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

os.chdir(os.path.dirname(os.path.abspath(__file__)))

class Handler(http.server.SimpleHTTPRequestHandler):
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