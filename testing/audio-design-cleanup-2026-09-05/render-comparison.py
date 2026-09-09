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
rows=[]
for scenario in traces['after']['scenarios']:
 id=scenario['id']; a=next(r for r in report if r['id']==id and r['mode']=='before'); b=next(r for r in report if r['id']==id and r['mode']=='after')
 rows.append(f'<section><h2>{html.escape(scenario["title"])}</h2><p>{a["voices"]} → {b["voices"]} sound starts over the same actions.</p><div class="pair"><label>Before<audio controls preload="none" src="before-{id}.wav"></audio></label><label>Cleaned<audio controls preload="none" src="after-{id}.wav"></audio></label></div></section>')
page="""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>UNDERSTAR · Core audio comparison</title><style>body{margin:0;background:#121719;color:#ece8da;font:16px/1.55 system-ui,sans-serif}main{max-width:940px;margin:auto;padding:36px 22px 70px}h1{font-size:32px;line-height:1.2}h2{font-size:20px;margin:0 0 6px}p{color:#b9c0bc}a{color:#d5b87d}section{margin:20px 0;padding:22px;border:1px solid #394543;border-radius:12px;background:#1a2223}.pair{display:grid;grid-template-columns:1fr 1fr;gap:24px}label{font-weight:600}audio{display:block;width:100%;margin-top:10px}small{color:#a5afa9}.note{border-left:3px solid #b8a16d;padding-left:16px}@media(max-width:680px){.pair{grid-template-columns:1fr}h1{font-size:27px}}</style><main><small>UNDERSTAR / AUDIO DESIGN / 05 SEPTEMBER 2026</small><h1>Hear the core actions together</h1><p>Compare the same repeated actions before and after the routing cleanup. Start at your normal listening volume. These clips retain runtime gain differences; they are not loudness-matched.</p><p class="note">225 broad core-action candidates have become 15 selected physical contacts. Guitar notes, radio beeps, reversed textures and your nine rejected crystal clips are outside these active banks. Walking follows ground contacts; each mining contact plays one primary hit or break; braked descents no longer cause heavy landing debris. Hard-floor walking uses two short, level-matched contacts; the longer loud outlier is excluded.</p><p><a href="../audio-runtime-reaudit-2026-09-04/">Continue the active sound review</a> · <a href="review-export-original.json" download>Original review export</a> · <a href="credits.json">Source credits</a> · <a href="final-audit.json">Validation details</a></p>"""+''.join(rows)+"""<p><small>These are renders of the real SoundSystem event fixture. They verify routing and playback arithmetic, not a manual game playthrough or final listening approval. Original audio files and your saved decisions are preserved. The selected clips and mix still need your ears.</small></p></main><script>for(const player of document.querySelectorAll('audio'))player.addEventListener('play',()=>{for(const other of document.querySelectorAll('audio'))if(other!==player)other.pause()});</script></html>"""
(out/'index.html').write_text(page,encoding='utf-8')
print('AUDIO_COMPARISON_RENDERED',len(report),'renders;',len(decoded),'decoded sources; no clipped samples')
