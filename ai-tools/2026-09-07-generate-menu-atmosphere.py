"""Generate six restrained image-to-video menu loops; credentials stay in memory."""
from pathlib import Path
import base64, hashlib, json, sys, time, urllib.request, urllib.error

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'testing/2026-09-07-menu-atmosphere'
SOURCE = ROOT / 'exports/pallet-v10/dig_game_full_non_tile_runtime_assets_v10_08_07_2026/sprites/backgrounds/background-database'
API = 'https://openrouter.ai/api/v1'
MODEL = 'bytedance/seedance-2.0-mini'
PROMPT = (
 'Animate this exact painted UNDERSTAR game menu background as an extremely quiet atmospheric cinemagraph. '
 'Locked camera for the entire shot: zero pan, zoom, camera drift, dolly, shake, reframing or perspective change. '
 'Preserve every authored mountain, rock, crystal, monument, building, tree trunk, planet and star at its exact position and shape. '
 'Keep every rigid landmark perfectly still. Preserve the original colours, exposure, painterly detail and composition. '
 'Only existing soft atmospheric elements move: aurora curtains flow very slowly within their present envelope, '
 'existing haze softly curls in place, existing cloud contours evolve by a few pixels, existing foliage tips sway almost imperceptibly. '
 'If present, existing crystal light varies locally by no more than two percent. '
 'Never move the starfield, never add shooting stars, particles, people, objects, weather, text, watermarks or logos. '
 'No strobes, large pulses, dramatic event, expanding glow, or screen-wide brightness change. '
 'Motion stays peripheral and restful so a loading indicator and menu remain easy to read. '
 'Make one continuous periodic ten-second ambient cycle. Return smoothly to the provided identical final frame, '
 'with continuous velocity at the boundary, no cut, freeze, rewind or reversal. Silent video.'
)

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
 state_path=OUT/'generation.json'
 state=json.loads(state_path.read_text()) if state_path.exists() else {'model':MODEL,'prompt':PROMPT,'duration':10,'resolution':'720p','jobs':[]}
 if '--retry-failed' in sys.argv:
  assert not state.get('retried'), 'Retry allowance already used'
  state['failedAttempts']=[j for j in state['jobs'] if j['status']=='submission_failed']
  state['jobs']=[j for j in state['jobs'] if j['status']!='submission_failed']
  state['retried']=True
 if '--compact-foundry' in sys.argv:
  assert not state.get('compactFoundryAttempt'), 'Compact retry already used'
  state.setdefault('failedAttempts',[]).extend(j for j in state['jobs'] if j['index']==6 and j['status']=='submission_failed')
  state['jobs']=[j for j in state['jobs'] if not (j['index']==6 and j['status']=='submission_failed')]
  state['compactFoundryAttempt']=True
 catalog=request('/videos/models')
 model=next(m for m in catalog['data'] if m['id']==MODEL)
 assert 10 in model['supported_durations'] and '720p' in model['supported_resolutions']
 assert 'last_frame' in model['supported_frame_images']
 # Six silent 720p clips, 24 fps, 1024 pixels per billable video token.
 estimate=6*1280*720*24*10/1024*float(model['pricing_skus']['video_tokens_without_audio'])
 if estimate>5: raise RuntimeError('Batch estimate exceeds USD 5 internal ceiling')
 request('/key',key)
 state['estimateUsd']=estimate; state['modelCapabilities']=model
 def save(): state_path.write_text(json.dumps(state,indent=2)+'\n')
 save(); print('Credential accepted; six-clip estimate USD %.3f'%estimate,flush=True)
 files=sorted(SOURCE.glob('ChatGPT Image Jun 29, 2026, 07_*.png'))
 assert len(files)==6
 for i,path in enumerate(files,1):
  if any(j['index']==i for j in state['jobs']): continue
  data=path.read_bytes(); reference=data; mime='image/png'
  if i==6 and '--compact-foundry' in sys.argv:
   from PIL import Image
   import io
   buffer=io.BytesIO();Image.open(path).convert('RGB').resize((1280,720),Image.Resampling.LANCZOS).save(buffer,format='JPEG',quality=95)
   reference=buffer.getvalue();mime='image/jpeg'
  url='data:'+mime+';base64,'+base64.b64encode(reference).decode()
  frame=lambda kind: {'type':'image_url','image_url':{'url':url},'frame_type':kind}
  payload={'model':MODEL,'prompt':PROMPT,'duration':10,'resolution':'720p','aspect_ratio':'16:9','generate_audio':False,'seed':26090700+i,'frame_images':[frame('first_frame'),frame('last_frame')]}
  job={'index':i,'source':str(path.relative_to(ROOT)).replace('\\','/'),'sourceSha256':hashlib.sha256(data).hexdigest(),'status':'submitting'}
  state['jobs'].append(job); save()
  try:
   result=request('/videos',key,payload)
   job.update({'id':result['id'],'status':result.get('status','queued')}); save()
   print('Submitted background',i,job['id'],flush=True)
  except urllib.error.HTTPError as e:
   job['status']='submission_failed'; job['httpStatus']=e.code; job['error']=e.read().decode()[:500]; save()
   print('Submission failed',i,e.code,job['error'],flush=True)
   if e.code in (401,402,403): return
 deadline=time.time()+1800
 while time.time()<deadline:
  pending=[j for j in state['jobs'] if j.get('id') and j['status'] not in ('completed','failed','cancelled')]
  if not pending: break
  for job in pending:
   result=request('/videos/'+job['id'],key)
   previous=job['status']; job['status']=result.get('status','unknown')
   if result.get('usage'): job['usage']=result['usage']
   if result.get('error'): job['error']=result['error']
   if job['status']=='completed':
    raw=OUT/('raw-%02d.mp4'%job['index'])
    raw.write_bytes(request('/videos/'+job['id']+'/content',key,binary=True))
    job['output']=raw.name; job['bytes']=raw.stat().st_size
   save()
   if previous!=job['status']: print('Background',job['index'],job['status'],flush=True)
  if any(j.get('id') and j['status'] not in ('completed','failed','cancelled') for j in state['jobs']): time.sleep(20)
 print('Generation complete',[(j['index'],j['status']) for j in state['jobs']],flush=True)

if __name__=='__main__': main()


