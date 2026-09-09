from pathlib import Path
import json,re,gzip,hashlib
R=Path.cwd();E=R/'testing/2026-09-10-live-f9';n='values/keybindActions.js'
for base,dest in [(R,R),(E/'before',E/'candidate')]:
 s=(base/n).read_text();old='defaultKey: "F9", group: "Display", devOnly: true';assert s.count(old)==1;s=s.replace(old,'defaultKey: "F9", group: "Display"');(dest/n).write_text(s,encoding='utf-8',newline='\n')
p=E/'candidate'/n;p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),mtime=0))
plan=json.loads((E/'plan.json').read_text());plan[n]={'before':hashlib.sha256((E/'before'/n).read_bytes()).hexdigest(),'after':hashlib.sha256(p.read_bytes()).hexdigest()}
p=E/'candidate/index.html';html=p.read_text();m=re.search('<script type="importmap">(.*?)</script>',html);data=json.loads(m[1]);data['imports']['./'+n+'?v=6793e7c5ce64']='./'+n+'?v=6793e7c5ce64-f9-20260910';data['imports']['./'+n]='./'+n+'?v=6793e7c5ce64-f9-20260910';html=html[:m.start(1)]+json.dumps(data)+html[m.end(1):];p.write_text(html,encoding='utf-8',newline='\n');p.with_name(p.name+'.gz').write_bytes(gzip.compress(p.read_bytes(),mtime=0));plan['index.html']['after']=hashlib.sha256(p.read_bytes()).hexdigest();(E/'plan.json').write_text(json.dumps(plan,indent=2))
