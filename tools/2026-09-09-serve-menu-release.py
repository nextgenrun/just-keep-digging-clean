"""Preview the exact live-based delta over a hash-verified deployed base package."""
from pathlib import Path
import json,runpy,functools
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'.tmp/menu-motion-live-20260909'
P=E/'payload';BASE=Path(json.loads((E/'base-package-verified.json').read_text())['base'])
server=runpy.run_path(str(ROOT/'tools/2026-07-17-serve-production.py'))
class Overlay(server['ProductionHandler']):
 def send_head(self):
  self.directory=str(P)
  candidate=Path(self.translate_path(self.path))
  if not candidate.exists():self.directory=str(BASE)
  return super().send_head()
handler=functools.partial(Overlay,directory=str(P))
with server['ThreadingServer'](('127.0.0.1',0),handler) as httpd:
 info={'url':'http://127.0.0.1:'+str(httpd.server_address[1])}
 (E/'preview-server.json').write_text(json.dumps(info));print(json.dumps(info),flush=True);httpd.serve_forever()
