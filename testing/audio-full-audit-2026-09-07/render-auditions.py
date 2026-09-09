"""Render matched before/after listening examples; never rewrite source recordings."""
import argparse, json, subprocess
from pathlib import Path
from measure import measure, ROOT, HERE
parser=argparse.ArgumentParser()
parser.add_argument('--ffmpeg',required=True)
parser.add_argument('--ffprobe',required=True)
args=parser.parse_args()
mix=json.loads((HERE/'source-mix.json').read_text(encoding='utf8'))
rows=mix['items']
loud_music=max((r for r in rows if r['kind']=='music'),key=lambda r:r['beforeLufs'])
loud_voice=max((r for r in rows if r['kind']=='voice'),key=lambda r:r['beforeLufs'])
trimmed=next(r for r in rows if r['path'].endswith('Dwarf Uplifted.wav'))
star_path='sound/soundEffects/approved-sfx-findings-v1/star-destruction-shockwave-freesound-814053.mp3'
examples=[
 {'id':'music','title':'Music loudness','note':'The loudest measured track; a 12-second excerpt at the default Music and Master levels.','row':loud_music,'bus':.4*.9,'excerpt':12},
 {'id':'voice','title':'Dialogue balance','note':'The loudest shared dialogue recording at the default Voice and Master levels. NPC attenuation is included where applicable.','row':loud_voice,'bus':.8*.72*.9*(.7 if '/npc-voicelines/' in loud_voice['path'] else 1)},
 {'id':'npc','title':'Quicker dialogue release','note':'A real NPC line with excess trailing silence removed and short fades at the edited edges.','row':trimmed,'bus':.8*.72*.7*.9},
 {'id':'star','title':'Star destruction cleanup','note':'The same approved recording at its existing gain, with a 20 Hz high-pass to remove DC.','row':{'path':star_path,'gain':1},'bus':.18*.9*.9,'star':True}
]
out=HERE/'auditions';out.mkdir(exist_ok=True)
result=[]
for example in examples:
 row=example['row'];variants={}
 for variant in ('before','after'):
  filters=[]
  if variant=='after':
   if example.get('star'):filters.append('highpass=f=20:t=q:w=0.7071067811865476:p=2')
   window=row.get('window')
   if window:
    filters.extend([f"atrim=start={window['start']}:duration={window['duration']}",'asetpts=PTS-STARTPTS',
      f"afade=t=in:st=0:d={window['fadeIn']}",f"afade=t=out:st={window['duration']-window['fadeOut']}:d={window['fadeOut']}"])
  if example.get('excerpt'):filters.extend([f"atrim=duration={example['excerpt']}",'asetpts=PTS-STARTPTS'])
  gain=example['bus']*(row['gain'] if variant=='after' else 1)
  filters.append(f'volume={gain}')
  path=out/f"{example['id']}-{variant}.wav"
  subprocess.run([args.ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-i',str(ROOT/row['path']),
    '-vn','-af',','.join(filters),'-c:a','pcm_s24le',str(path)],check=True)
  m=measure({'path':path.relative_to(ROOT).as_posix(),'kind':'audition','families':['audit']},args)
  if m.get('error') or m.get('truePeakDbTP',1)>0:raise RuntimeError(m)
  variants[variant]={'file':path.relative_to(HERE).as_posix(),'metrics':m}
 result.append({'id':example['id'],'title':example['title'],'note':example['note'],'source':row['path'],
   'defaultBusGain':example['bus'],'sourceGainAfter':row['gain'],'variants':variants})
(HERE/'auditions.json').write_text(json.dumps({'examples':result},indent=2)+'\n',encoding='utf8')
print(json.dumps({'rendered':len(result)*2,'allDecoded':True,'maxTruePeakDbTP':max(v['metrics']['truePeakDbTP'] for r in result for v in r['variants'].values())}))
