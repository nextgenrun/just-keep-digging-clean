from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlsplit,unquote
ROOT=Path(__file__).resolve().parents[1]
CANDIDATE=ROOT/'.tmp/hints-wiki-release/candidate'
class Preview(SimpleHTTPRequestHandler):
 def translate_path(self,url):
  name=unquote(urlsplit(url).path).lstrip('/') or 'index.html'
  p=(CANDIDATE/name).resolve(); fallback=(ROOT/name).resolve()
  if not p.is_relative_to(CANDIDATE) or not fallback.is_relative_to(ROOT): return str(CANDIDATE/'missing')
  if p.is_file(): return str(p)
  if name.startswith('game/undersstar-wiki/') or not name.endswith('.js'): return str(fallback)
  return str(p)
 def end_headers(self):
  self.send_header('Cache-Control','no-store')
  super().end_headers()
 def log_message(self,format,*args):
  if args and args[1:2]==('404',): print(format%args,flush=True)
print('Scoped production preview: http://127.0.0.1:8093/',flush=True)
ThreadingHTTPServer(('127.0.0.1',8093),Preview).serve_forever()
