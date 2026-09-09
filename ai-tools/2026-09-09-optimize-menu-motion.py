"""Build review candidates with lower transfer/decode cost and unchanged scenic tempo."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib,json,os,subprocess,argparse
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'testing/2026-09-09-menu-logo-motion'
CFG=json.loads((ROOT/'values/menuMotionReview20260909.json').read_text(encoding='utf-8'))
FF=os.environ.get('FFMPEG_EXE','ffmpeg');PROBE=os.environ.get('FFPROBE_EXE','ffprobe')
def run(args):return subprocess.check_output(args)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def metadata(p):
 d=json.loads(run([PROBE,'-v','error','-show_streams','-show_format','-of','json',str(p)]))
 return d,next(s for s in d['streams'] if s['codec_type']=='video')
def inspect(p,alpha=False):
 d,v=metadata(p);iw=CFG['inspectionWidth'];ih=round(iw*v['height']/v['width'])
 args=[FF,'-v','error']+(['-c:v','libvpx-vp9'] if alpha else [])+['-i',str(p),'-vf',f'scale={iw}:{ih}','-f','rawvideo','-pix_fmt','rgba' if alpha else 'rgb24','pipe:1']
 a=np.frombuffer(run(args),dtype=np.uint8).reshape((-1,ih,iw,4 if alpha else 3)).astype(np.float32)
 step=np.abs(a[1:,:,:,:3]-a[:-1,:,:,:3]).mean(axis=(1,2,3))
 result={'width':v['width'],'height':v['height'],'fps':v['avg_frame_rate'],'frames':len(a),'duration':float(d['format']['duration']),'audioStreams':sum(s['codec_type']=='audio' for s in d['streams']),'boundaryStep':float(np.abs(a[0,:,:,:3]-a[-1,:,:,:3]).mean()),'stepP95':float(np.percentile(step,95)),'duplicateSteps':int(np.count_nonzero(step<.005))}
 if alpha:
  result['alphaMin']=float(a[:,:,:,3].min());result['alphaMax']=float(a[:,:,:,3].max());assert result['alphaMin']==0 and result['alphaMax']==255
 assert result['audioStreams']==0
 return result
def build(source,alpha=False):
 before=sha(source);_,v=metadata(source)
 if alpha:
  c=CFG['logo'];out=ROOT/c['output'];candidate=out.with_name('logo-full.building.webm')
  motion=f"setpts={c['slowdown']}*PTS,framerate=fps={CFG['fps']}:interp_start=0:interp_end=255:flags=0"
  graph=f"[0:v]scale={c['width']}:{c['height']}:flags=lanczos,format=yuva420p,setsar=1,split[c][a];[c]format=yuv444p,{motion}[color];[a]alphaextract,{motion},format=gray[alpha];[color][alpha]alphamerge,format=yuva420p[out]"
  command=[FF,'-y','-v','error','-c:v','libvpx-vp9','-i',str(source),'-filter_complex_threads','2','-filter_complex',graph,'-map','[out]','-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-b:v','0','-crf',str(c['crf']),'-deadline','good','-cpu-used','2','-row-mt','1','-auto-alt-ref','0','-threads','4','-g',str(CFG['gop']),str(candidate)]
 else:
  out=ROOT/CFG['backgroundOutput']/source.name;candidate=out.with_suffix('.building.mp4')
  count=int(int(v['nb_frames'])*CFG['fps']/60)
  filters=f"fps={CFG['fps']},trim=end_frame={count},setpts=PTS-STARTPTS,setsar=1"
  command=[FF,'-y','-v','error','-i',str(source),'-vf',filters,'-an','-c:v','libx264','-threads','4','-preset','medium','-crf',str(CFG['backgroundCrf']),'-maxrate',CFG['maxRate'],'-bufsize',CFG['bufferSize'],'-bf','0','-refs','1','-g',str(CFG['gop']),'-keyint_min',str(CFG['gop']),'-sc_threshold','0','-pix_fmt','yuv420p','-movflags','+faststart',str(candidate)]
 print('Encoding',source.name,flush=True);run(command);checks=inspect(candidate,alpha)
 assert before==sha(source)
 candidate.replace(out)
 return {'id':'logo-full' if alpha else source.stem,'path':out.relative_to(ROOT).as_posix(),'source':source.relative_to(ROOT).as_posix(),'sourceSha256':before,'sha256':sha(out),'sourceBytes':source.stat().st_size,'bytes':out.stat().st_size,'savingPercent':round(100*(1-out.stat().st_size/source.stat().st_size),2),**checks}
def main():
 parser=argparse.ArgumentParser();parser.add_argument('--only');args=parser.parse_args()
 path=LAB/'optimized-media.json';proof=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {'reviewOnly':True,'clips':[]}
 todo=[(p,False) for p in sorted((ROOT/CFG['backgroundSource']).glob('*.mp4'))]+[(ROOT/CFG['logo']['source'],True)]
 todo=[(p,a) for p,a in todo if (not args.only or args.only==('logo-full' if a else p.stem)) and not any(c['id']==('logo-full' if a else p.stem) for c in proof['clips'])]
 with ThreadPoolExecutor(max_workers=CFG['workers']) as pool:
  for future in as_completed([pool.submit(build,p,a) for p,a in todo]):
   row=future.result();proof['clips'].append(row);path.write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8');print(json.dumps(row),flush=True)
if __name__=='__main__':main()
