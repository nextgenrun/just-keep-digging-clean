from pathlib import Path
import json, subprocess, wave, html
from concurrent.futures import ThreadPoolExecutor
import numpy as np
root=Path(__file__).resolve().parents[2]; out=Path(__file__).resolve().parent
ffmpeg=Path('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin/ffmpeg.exe')
sr=48000
traces={mode:json.loads((out/f'{mode}-traces.json').read_text()) for mode in ['before','after']}
paths={e['path'] for trace in traces.values() for s in trace['scenarios'] for e in s['events']}
legacy=json.loads((out/'before/testing__audio-runtime-reaudit-2026-09-04__catalog.json').read_text())['items']
paths.update(item['path'] for item in legacy if any(r['source']=='legacy-runtime' and r['role']=='footsteps' for r in item['routes']))
if None in paths: raise RuntimeError('Unresolved audio source in trace')
def decode(path):
 r=subprocess.run([str(ffmpeg),'-v','error','-i',str(root/path),'-f','f32le','-ac','2','-ar',str(sr),'pipe:1'],capture_output=True,check=True)
 return path,np.frombuffer(r.stdout,dtype='<f4').reshape(-1,2).copy()
with ThreadPoolExecutor(max_workers=4) as executor: decoded=dict(executor.map(decode,paths))
(out/'source-metrics.json').write_text(json.dumps({path:{'duration':len(audio)/sr,'peak':float(np.max(np.abs(audio)))} for path,audio in decoded.items()},indent=2))
report=[]
for mode,trace in traces.items():
 for scenario in trace['scenarios']:
  mix=np.zeros((int(scenario['seconds']*sr),2),dtype=np.float32)
  for event in scenario['events']:
   audio=decoded[event['path']]; rate=event['rate']
   if rate!=1:
    times=np.arange(0,len(audio),rate)
    audio=np.column_stack([np.interp(times,np.arange(len(audio)),audio[:,channel]) for channel in range(2)])
   if event['end'] is not None: audio=audio[:max(0,round((event['end']-event['at'])*sr/1000))]
   start=round(event['at']*sr/1000); length=min(len(audio),len(mix)-start)
   if length>0:
    envelope=np.full(length,event['gain'],dtype=np.float32)
    for point in event.get('gains',[]):
     index=max(0,round((point['at']-event['at'])*sr/1000))
     if index<length: envelope[index:]=point['gain']
    mix[start:start+length]+=audio[:length]*envelope[:,None]
  peak=float(np.max(np.abs(mix))); clipped=int(np.count_nonzero(np.abs(mix)>=1))
  if clipped: raise RuntimeError(f'Clipping in {mode}/{scenario["id"]}: {peak}')
  filename=f'{mode}-{scenario["id"]}.wav'
  with wave.open(str(out/filename),'wb') as wav:
   wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(sr); wav.writeframes((mix*32767).astype('<i2').tobytes())
  report.append({'mode':mode,'id':scenario['id'],'voices':len(scenario['events']),'peak':round(peak,6),'clippedSamples':clipped,'file':filename})
(out/'render-audit.json').write_text(json.dumps({'renders':report,'sampleRate':sr,'scope':'Captured runtime events with mixer gain changes, playback rates, natural completions and stop times. Music, speech ducking, device output and full-game timing are not simulated.'},indent=2))
import hashlib
config=json.loads((root/'values/audioPickupFootstepReview.json').read_text())
catalog=json.loads((out/'source-catalog.json').read_text())
edits={}; candidate_assets=[]
for scenario_id,spec in config['edits'].items():
 scenario=next(s for s in traces['after']['scenarios'] if s['id']==scenario_id)
 edits[scenario_id]={}
 for event in scenario['events']:
  path=event['path']
  if path in edits[scenario_id]: continue
  rate=config['candidateSampleRate']
  filters=f"highpass=f={spec['highpassHz']},lowpass=f={spec['lowpassHz']}"
  result=subprocess.run([str(ffmpeg),'-v','error','-i',str(root/path),'-af',filters,'-f','f32le','-ac','1','-ar',str(rate),'pipe:1'],capture_output=True,check=True)
  full_pcm=np.frombuffer(result.stdout,dtype='<f4').copy()
  window=max(1,round(config['attackWindowSeconds']*rate))
  energy=np.convolve(full_pcm**2,np.ones(window)/window,mode='valid')
  onset=int(np.flatnonzero(energy >= max(energy)*config['attackThresholdRatio']**2)[0])
  trim_start=max(0,onset-round(config['attackPreRollSeconds']*rate))
  pcm=full_pcm[trim_start:trim_start+round(spec['maxSeconds']*rate)]
  start=min(len(pcm),round(config['fadeInSeconds']*rate)); end=min(len(pcm),round(config['fadeOutSeconds']*rate))
  pcm[:start]*=np.linspace(0,1,start); pcm[-end:]*=np.linspace(1,0,end)
  assert np.max(np.abs(pcm))<1
  stem=f"candidate-{scenario_id}-{event['key']}"
  with wave.open(str(out/f'{stem}.wav'),'wb') as wav:
   wav.setnchannels(1); wav.setsampwidth(2); wav.setframerate(rate); wav.writeframes((pcm*32767).astype('<i2').tobytes())
  subprocess.run([str(ffmpeg),'-v','error','-y','-i',str(out/f'{stem}.wav'),'-c:a','libvorbis','-q:a','4',str(out/f'{stem}.ogg')],capture_output=True,check=True)
  edited_path=(out/f'{stem}.ogg').relative_to(root).as_posix(); _,data=decode(edited_path)
  edits[scenario_id][path]=data
  candidate_assets.append({'file':f'{stem}.ogg','sourcePath':path,'sourceSha256':hashlib.sha256((root/path).read_bytes()).hexdigest(),
   'trimStartSeconds':trim_start/rate,'duration':len(data)/sr,'peak':float(np.max(np.abs(data))),'filters':filters,'maxSeconds':spec['maxSeconds'],
   'fadeInSeconds':config['fadeInSeconds'],'fadeOutSeconds':config['fadeOutSeconds'],'channels':1,'sampleRate':rate,
   'bytes':(out/f'{stem}.ogg').stat().st_size,'reviewOnly':True,'runtimeWired':False,'approval':'pending-listening'})
 mix=np.zeros((int(scenario['seconds']*sr),2),dtype=np.float32)
 for event in scenario['events']:
  data=edits[scenario_id][event['path']]
  assert event['rate']==1,'Candidate gain comparison requires unchanged rate'
  if event['end'] is not None: data=data[:max(0,round((event['end']-event['at'])*sr/1000))]
  start=round(event['at']*sr/1000); length=min(len(data),len(mix)-start)
  if length<=0: continue
  envelope=np.full(length,event['gain'],dtype=np.float32)
  for point in event.get('gains',[]):
   index=max(0,round((point['at']-event['at'])*sr/1000))
   if index<length: envelope[index:]=point['gain']
  mix[start:start+length]+=data[:length]*envelope[:,None]
 assert np.max(np.abs(mix))<1
 filename=f'candidate-{scenario_id}.wav'
 with wave.open(str(out/filename),'wb') as wav:
  wav.setnchannels(2); wav.setsampwidth(2); wav.setframerate(sr); wav.writeframes((mix*32767).astype('<i2').tobytes())
 report.append({'mode':'candidate','id':scenario_id,'voices':len(scenario['events']),'peak':float(np.max(np.abs(mix))),'clippedSamples':0,'file':filename})
for row in report:
 with wave.open(str(out/row['file']),'rb') as wav: pcm=np.frombuffer(wav.readframes(wav.getnframes()),dtype='<i2').astype(float)/32768
 row['rmsDb']=float(20*np.log10(max(1e-12,np.sqrt(np.mean(pcm**2)))))
sources=[]
for path in sorted(paths):
 asset=next((a for a in catalog.values() if a['path']==path),{})
 sources.append({'path':path,'sha256':hashlib.sha256((root/path).read_bytes()).hexdigest(),'title':asset.get('title',asset.get('id',asset.get('key'))),'sourceUrl':asset.get('sourceUrl'),'licenseDeclared':asset.get('licenseDeclared')})
(out/'credits.json').write_text(json.dumps({'sources':sources,'candidateEdits':candidate_assets,'sourceRegistries':['sound/soundEffects/approved-freesound-2026-09-03/manifest.json','sound/soundEffects/approved-review-2026-09-03/manifest.json'],'note':'Original recordings are unchanged. These are offline edits, not new AI-generated recordings. Dry candidates require listening approval.'},indent=2))
(out/'render-audit.json').write_text(json.dumps({'renders':report,'candidateAssets':candidate_assets,'scope':'Actual SoundSystem fixture calls, gain changes, natural completions and stop times. Full gameplay, music, speech ducking and hardware output are not simulated.'},indent=2))
rows=[]
for scenario_id in ['walk','hard-walk','pickup','shop','mine-loot','special-pickup']:
 scenario=next(s for s in traces['after']['scenarios'] if s['id']==scenario_id)
 a=next(r for r in report if r['id']==scenario_id and r['mode']=='before'); b=next(r for r in report if r['id']==scenario_id and r['mode']=='after')
 players=''.join(f'<label>{label}<audio controls preload="none" src="{mode}-{scenario_id}.wav"></audio></label>' for mode,label in [('before','Before this follow-up'),('after','Earlier mix snapshot')])
 if scenario_id in edits: players+=f'<label>Short, filtered edit <small>audition only</small><audio controls preload="none" src="candidate-{scenario_id}.wav"></audio></label>'
 if scenario_id in ['hard-walk','mine-loot']:
  anchor='contacts' if scenario_id=='hard-walk' else 'mining-live'
  rows.append(f'<section id="{scenario_id}"><h2>{html.escape(scenario["title"])}</h2><p>Old mixed recording withdrawn. <a href="../audio-destruction-pickup-2026-09-05/#{anchor}">Open the current game-audio preview</a>.</p></section>')
  continue
 rows.append(f'<section id="{scenario_id}"><h2>{html.escape(scenario["title"])}</h2><p>{a["voices"]} &rarr; {b["voices"]} sound starts for the same actions.</p><div class="players">{players}</div></section>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UNDERSTAR | Footsteps and pickups</title><style>body{margin:0;background:#121719;color:#ece8da;font:16px/1.55 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:32px 22px 70px}h1{font-size:32px;line-height:1.2}h2{font-size:21px;margin:0 0 6px}p,small{color:#b9c0bc}a{color:#dfc18d}section{margin:22px 0;padding:22px;background:#1b2323;border:1px solid #394543;border-radius:12px}.players{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:22px}label{font-weight:600}label small{display:block}audio{width:100%;display:block;margin-top:12px}.note{padding-left:16px;border-left:3px solid #dfc18d}@media(max-width:600px){h1{font-size:26px}}</style><main><small>UNDERSTAR / AUDIO FOLLOW-UP / 05 SEPTEMBER 2026</small><h1>Quieter pickups. Less dominant footsteps.</h1><p>Compare the repeated actions at your usual listening volume. This earlier mix pass lowered footstep gain by about 8 dB and routine pickup gain by 13 dB. The current runtime has no XP arrival sound. Resource pickups share an 850 ms gap; rapid shop interactions share a 700 ms gap.</p><p>Ground detection now follows the actual feet. Dirt footsteps and soft landings no longer fall through to hard-ground recordings.</p><p class="note">The third player offers a shorter, filtered edit of the existing recording. These edits are ready for audition and are not installed in gameplay. They use the current gain without loudness matching. Your existing review decisions are preserved.</p><p><a href="../audio-runtime-reaudit-2026-09-04/">Continue the active sound review</a> | <a href="credits.json">Recordings and edit details</a> | <a href="verification.json">Behavior checks</a> | <a href="render-audit.json">Render measurements</a></p>'''+''.join(rows)+'''<p><small>These sequences use the actual SoundSystem with scripted actions. They do not prove full-game playback or subjective sound quality. No device listening or browser playthrough is claimed.</small></p></main><script>for(const player of document.querySelectorAll('audio'))player.addEventListener('play',()=>{for(const other of document.querySelectorAll('audio'))if(other!==player)other.pause()})</script></html>'''
(out/'index.html').write_text(page,encoding='utf-8')
print(json.dumps({'renders':len(report),'candidateAssets':len(candidate_assets),'sources':len(paths),'clippedSamples':sum(r['clippedSamples'] for r in report),'selected':[r for r in report if r['id'] in ['walk','hard-walk','pickup','shop']]}))
