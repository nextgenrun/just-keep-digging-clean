"""Generate six living landscape loops with clearly visible physical motion; credentials stay in memory."""
from pathlib import Path
import base64, hashlib, json, sys, time, urllib.request, urllib.error

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'testing/2026-09-07-menu-atmosphere'
SOURCE = ROOT / 'exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/sprites/backgrounds/background-database'
CFG = json.loads((ROOT / 'values/menuAtmosphereLiving.json').read_text(encoding='utf-8'))
API = CFG['api']
MODEL = CFG['model']
PROMPT = CFG['prompt']

def request(path, key='', payload=None, binary=False):
 headers={'Accept':'application/json'}
 if key: headers['Authorization']='Bearer '+key
 data=None
 if payload is not None:
  headers['Content-Type']='application/json'; data=json.dumps(payload).encode()
 req=urllib.request.Request(API+path,data=data,headers=headers)
 with urllib.request.urlopen(req,timeout=90) as r:
  content=r.read()
 return content if binary else json.loads(content)

def main():
 key=sys.stdin.readline().strip()
 if not key.startswith('sk-or-'): raise RuntimeError('Missing process-only credential')
 OUT.mkdir(parents=True,exist_ok=True)
 state_path=OUT/'generation-v3.json'
 state=json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else {'model':MODEL,'prompt':PROMPT,'duration':CFG['duration'],'resolution':'720p','jobs':[]}
 if '--retry-failed' in sys.argv:
  assert not state.get('retried'), 'Retry allowance already used'
  state['failedAttempts']=[j for j in state['jobs'] if j['status']=='submission_failed']
  state['jobs']=[j for j in state['jobs'] if j['status']!='submission_failed']
  state['retried']=True
 if '--grotto-water-revision' in sys.argv:
  assert not state.get('grottoWaterRevision'), 'Water revision already submitted'
  state.setdefault('supersededJobs',[]).extend({**j,'rejectionReason':'Exaggerated cyan mist; replace with natural water and flame motion.'} for j in state['jobs'] if j['index']==4)
  state['jobs']=[j for j in state['jobs'] if j['index']!=4]
  state['grottoWaterRevision']=True
 catalog=request('/videos/models')
 model=next(m for m in catalog['data'] if m['id']==MODEL)
 assert CFG['duration'] in model['supported_durations'] and '720p' in model['supported_resolutions']
 assert 'last_frame' in model['supported_frame_images']
 # Six silent 720p clips, 24 fps, 1024 pixels per billable video token.
 estimate=len(CFG['profiles'])*CFG['width']*CFG['height']*CFG['fps']*CFG['duration']/1024*float(model['pricing_skus']['video_tokens_without_audio'])
 if estimate>CFG['generationCeilingUsd']: raise RuntimeError('Batch estimate exceeds USD 5 internal ceiling')
 request('/key',key)
 state['estimateUsd']=estimate; state['modelCapabilities']=model
 def save(): state_path.write_text(json.dumps(state,indent=2)+'\n',encoding='utf-8')
 save(); print('Credential accepted; six-clip estimate USD %.3f'%estimate,flush=True)
 files=sorted(SOURCE.glob('ChatGPT Image Jun 29, 2026, 07_*.png'))
 assert len(files)==6
 for i,path in enumerate(files,1):
  if any(j['index']==i for j in state['jobs']): continue
  from PIL import Image
  import io
  data=path.read_bytes()
  buffer=io.BytesIO();Image.open(path).convert('RGB').resize((CFG['width'],CFG['height']),Image.Resampling.LANCZOS).save(buffer,format='JPEG',quality=CFG['referenceJpegQuality'])
  reference=buffer.getvalue();mime='image/jpeg'
  url='data:'+mime+';base64,'+base64.b64encode(reference).decode()
  frame=lambda kind: {'type':'image_url','image_url':{'url':url},'frame_type':kind}
  prompt=PROMPT+CFG['profiles'][i-1]['motion']
  payload={'model':MODEL,'prompt':prompt,'duration':CFG['duration'],'resolution':'720p','aspect_ratio':'16:9','generate_audio':False,'seed':CFG['seedBase']+i,'frame_images':[frame('first_frame'),frame('last_frame')]}
  job={'index':i,'scene':CFG['profiles'][i-1]['id'],'prompt':prompt,'source':str(path.relative_to(ROOT)).replace('\\','/'),'sourceSha256':hashlib.sha256(data).hexdigest(),'status':'submitting'}
  state['jobs'].append(job); save()
  try:
   result=request('/videos',key,payload)
   job.update({'id':result['id'],'status':result.get('status','queued')}); save()
   print('Submitted background',i,job['id'],flush=True)
  except urllib.error.HTTPError as e:
   job['status']='submission_failed'; job['httpStatus']=e.code; job['error']=e.read().decode().replace(key,'[redacted]')[:500]; save()
   print('Submission failed',i,e.code,job['error'],flush=True)
   if e.code in (401,402,403): return
 deadline=time.time()+CFG['deadlineSeconds']
 while time.time()<deadline:
  pending=[j for j in state['jobs'] if j.get('id') and j['status'] not in ('completed','failed','cancelled')]
  if not pending: break
  for job in pending:
   result=request('/videos/'+job['id'],key)
   previous=job['status']; job['status']=result.get('status','unknown')
   if result.get('usage'): job['usage']=result['usage']
   if result.get('error'): job['error']=result['error']
   if job['status']=='completed':
    raw=OUT/CFG['profiles'][job['index']-1].get('outputName','raw-v3-%02d.mp4'%job['index'])
    raw.write_bytes(request('/videos/'+job['id']+'/content',key,binary=True))
    job['output']=raw.name; job['bytes']=raw.stat().st_size
   save()
   if previous!=job['status']: print('Background',job['index'],job['status'],flush=True)
  if any(j.get('id') and j['status'] not in ('completed','failed','cancelled') for j in state['jobs']): time.sleep(CFG['pollSeconds'])
 print('Generation complete',[(j['index'],j['status']) for j in state['jobs']],flush=True)

if __name__=='__main__': main()


