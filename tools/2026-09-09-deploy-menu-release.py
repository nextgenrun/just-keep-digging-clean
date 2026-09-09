"""Send the verified approved menu payload through the saved SSH connection."""
from pathlib import Path
import argparse,json,subprocess,shlex
ROOT=Path(__file__).resolve().parents[1];E=ROOT/'.tmp/menu-motion-live-20260909'
mode=argparse.ArgumentParser();mode.add_argument('mode',choices=['stage','apply','verify','rollback']);mode=mode.parse_args().mode
plan=json.loads((E/'plan.json').read_text());raw=json.dumps(plan,separators=(',',':')).encode()
remote=(ROOT/'tools/2026-09-09-menu-release-remote.py').read_text()
cmd=['ssh','-F',r'C:\Users\Mila\.ssh\config','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=15','-o','ServerAliveInterval=30','cline-local','python3 -u -c '+shlex.quote(remote)+' '+mode]
with (E/(mode+'-receipt.jsonl')).open('wb') as receipt:
 process=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=receipt,stderr=subprocess.PIPE)
 try:
  process.stdin.write(str(len(raw)).encode()+b'\n'+raw)
  if mode=='stage':
   for n,r in plan['changes'].items():
    with (E/'payload'/n).open('rb') as f:
     for b in iter(lambda:f.read(1024*1024),b''):process.stdin.write(b)
  process.stdin.close();error=process.stderr.read();code=process.wait()
  if code:raise RuntimeError(error.decode('utf-8','replace'))
 finally:
  if process.poll() is None:process.terminate();process.wait()
print((E/(mode+'-receipt.jsonl')).read_text())
