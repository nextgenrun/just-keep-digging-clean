"""Exercise actual HTTP media ranges, parallel module loads and exclusive binding."""
import concurrent.futures
import functools
import importlib.util
import io
from pathlib import Path
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from contextlib import redirect_stdout

spec = importlib.util.spec_from_file_location("dev_server", Path(__file__).parents[1] / "serve.py")
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)


class LocalServerContract(unittest.TestCase):
    def test_http_contract(self):
        with tempfile.TemporaryDirectory() as directory:
            payload = bytes(range(256)) * 32
            Path(directory, "clip.mp4").write_bytes(payload)
            Path(directory, "module.js").write_text("export default 1;")
            handler = functools.partial(server.Handler, directory=directory)
            with server.ReuseAddrServer(("127.0.0.1", 0), handler) as httpd:
                worker = threading.Thread(target=httpd.serve_forever, daemon=True)
                worker.start()
                base = f"http://127.0.0.1:{httpd.server_address[1]}"
                try:
                    for value, expected in (("bytes=0-15", payload[:16]),
                                            ("bytes=-16", payload[-16:]),
                                            ("bytes=8000-", payload[8000:])):
                        request = urllib.request.Request(base + "/clip.mp4", headers={"Range": value})
                        with urllib.request.urlopen(request, timeout=5) as response:
                            self.assertEqual(response.status, 206)
                            self.assertEqual(response.read(), expected)
                            self.assertEqual(response.headers["Accept-Ranges"], "bytes")
                    request = urllib.request.Request(base + "/clip.mp4", method="HEAD", headers={"Range": "bytes=0-15"})
                    with urllib.request.urlopen(request, timeout=5) as response:
                        self.assertEqual(response.status, 206)
                        self.assertEqual(response.read(), b"")
                        self.assertEqual(response.headers["Content-Length"], "16")
                    for value in ("bytes=9000-", "bytes=-0", "bytes=3-2", "bytes=0-1,3-4"):
                        with self.assertRaises(urllib.error.HTTPError) as error:
                            urllib.request.urlopen(urllib.request.Request(base + "/clip.mp4", headers={"Range": value}), timeout=5)
                        self.assertEqual(error.exception.code, 416)
                        self.assertEqual(error.exception.headers["Content-Range"], f"bytes */{len(payload)}")
                        error.exception.close()
                    with self.assertRaises(OSError):
                        server.ReuseAddrServer(httpd.server_address, handler)
                    def fetch_module(_):
                        with urllib.request.urlopen(base + "/module.js", timeout=10) as response:
                            self.assertIn("no-store", response.headers["Cache-Control"])
                            self.assertIn("javascript", response.headers["Content-Type"])
                            return response.read()
                    output = io.StringIO()
                    with redirect_stdout(output), concurrent.futures.ThreadPoolExecutor(max_workers=20) as pool:
                        self.assertEqual(len(list(pool.map(fetch_module, range(1200)))), 1200)
                    self.assertEqual(output.getvalue(), "")
                finally:
                    httpd.shutdown()
                    worker.join()


if __name__ == "__main__":
    unittest.main()
