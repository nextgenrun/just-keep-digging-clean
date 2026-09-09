"""Local review using the existing production range-capable media handler."""
from pathlib import Path
import functools,runpy
ROOT=Path(__file__).resolve().parents[2]
server=runpy.run_path(str(ROOT/'tools/2026-07-17-serve-production.py'))
handler=functools.partial(server['ProductionHandler'],directory=str(ROOT))
with server['ThreadingServer'](('127.0.0.1',8080),handler) as httpd:
    print('http://127.0.0.1:8080/testing/2026-09-09-menu-logo-motion/',flush=True)
    httpd.serve_forever()
