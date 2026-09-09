from pathlib import Path
import json,gzip,hashlib,re
R=Path.cwd();E=R/'testing/2026-09-10-live-f9';plan=json.loads((E/'plan.json').read_text(encoding='utf-8'));names=list(plan)+['values/keybindActions.js']
for n in names:
 for base in ([E/'candidate'] if n=='index.html' else [R,E/'candidate']):
  p=base/n;s=p.read_text(encoding='utf-8');p.write_bytes(s.encode('cp1252').decode('utf-8').encode('utf-8'))
n='values/keybindActions.js';plan[n]={'before':hashlib.sha256((E/'before'/n).read_bytes()).hexdigest()}
p=E/'candidate/index.html';html=p.read_text(encoding='utf-8');m=re.search('<script type="importmap">(.*?)</script>',html);data=json.loads(m[1]);data['imports']['./'+n+'?v=6793e7c5ce64']='./'+n+'?v=6793e7c5ce64-f9-20260910';data['imports']['./'+n]='./'+n+'?v=6793e7c5ce64-f9-20260910';html=html[:m.start(1)]+json.dumps(data)+html[m.end(1):];p.write_bytes(html.encode('utf-8'))
for n in plan:
 p=E/'candidate'/n;plan[n]['after']=hashlib.sha256(p.read_bytes()).hexdigest();p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),mtime=0))
(E/'plan.json').write_text(json.dumps(plan,indent=2),encoding='utf-8')
print('UTF8 preserved; candidate refreshed')
