from pathlib import Path


source = (Path(__file__).parents[1] / "serve.py").read_text(encoding="utf-8")

assert "socketserver.ThreadingTCPServer" in source
assert "daemon_threads = True" in source
assert "request_queue_size = 64" in source
assert "threading.BoundedSemaphore(16)" in source
assert "self.request_slots.release()" in source

print("THREADED_LOCAL_SERVER_CONTRACT_OK")
