from pathlib import Path
import functools, json, os, runpy
ROOT = Path(__file__).resolve().parents[2]
server = runpy.run_path(str(ROOT / 'tools/2026-07-17-serve-production.py'))
handler = functools.partial(server['ProductionHandler'], directory=str(ROOT / 'dist-startup-motion-fixed-20260908'))
with server['ThreadingServer'](('127.0.0.1', 0), handler) as httpd:
    port = httpd.server_address[1]
    info = {'pid': os.getpid(), 'port': port, 'url': f'http://127.0.0.1:{port}'}
    Path(__file__).with_name('preview-server-v2.json').write_text(json.dumps(info), encoding='utf-8')
    print(json.dumps(info), flush=True)
    httpd.serve_forever()
