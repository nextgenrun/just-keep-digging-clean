from pathlib import Path
import subprocess,shlex,json
E=Path.cwd()/'testing/2026-09-10-live-f9';plan=json.loads((E/'plan.json').read_text())
script='''import json,urllib.request,hashlib
plan=PLAN
results={}
for n,m in plan.items():
 url='https://www.nextgen.run/diggame-beta-1/'+('' if n=='index.html' else n+'?v=6793e7c5ce64-f9-20260910')
 response=urllib.request.urlopen(urllib.request.Request(url,headers={'Accept-Encoding':'identity'}),timeout=30)
 body=response.read();digest=hashlib.sha256(body).hexdigest()
 results[n]={'status':response.status,'sha256':digest,'matches':digest==m['after']}
print(json.dumps(results,indent=2))
'''.replace('PLAN',repr(plan))
ssh=['ssh','-F',r'C:\Users\Mila\.ssh\config','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','cline-local']
response=subprocess.check_output(ssh+['python3 -c '+shlex.quote(script)])
(E/'public-http.json').write_bytes(response);print(response.decode())
