"""Keep full-detail environmental motion and bake a forward circular overlap."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'testing/2026-09-07-menu-atmosphere'
CFG=json.loads((ROOT/'values/menuAtmosphereLiving.json').read_text(encoding='utf-8'))
FFMPEG=os.environ.get('FFMPEG_EXE','ffmpeg')
FFPROBE=os.environ.get('FFPROBE_EXE','ffprobe')
OUT=ROOT/'sprites/backgrounds/menu-atmosphere-v3'

def run(args):
    return subprocess.check_output(args)

def inspect(path):
    meta=json.loads(run([FFPROBE,'-v','error','-show_streams','-of','json',str(path)]))
    video=next(s for s in meta['streams'] if s['codec_type']=='video')
    assert video['width']==CFG['width'] and video['height']==CFG['height']
    assert not any(s['codec_type']=='audio' for s in meta['streams'])
    data=run([FFMPEG,'-v','error','-i',str(path),'-vf','scale=320:180','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
    frames=np.frombuffer(data,dtype=np.uint8).reshape((-1,180,320,3)).astype(np.float32)
    steps=np.abs(frames[1:]-frames[:-1]).mean(axis=(1,2,3))
    seam=float(np.abs(frames[0]-frames[-1]).mean())
    step95=float(np.percentile(steps,95))
    assert seam<=max(1,step95*3), f'Loop boundary {seam} exceeds ordinary step {step95}'
    temporal=np.std(frames,axis=0).mean(axis=2)
    second=round(CFG['fps'])
    change=np.abs(frames[second:]-frames[:-second]).mean(axis=3)
    return {'width':video['width'],'height':video['height'],'fps':video['avg_frame_rate'],
            'frames':len(frames),'durationSeconds':float(video['duration']),'audioStreams':0,
            'encodedBoundaryStep':seam,'encodedStepP95':step95,
            'temporalStdP95':float(np.percentile(temporal,95)),
            'oneSecondChangeP95':float(np.percentile(change,95))}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--only',choices=[p['id'] for p in CFG['profiles']])
    args=parser.parse_args()
    generation=json.loads((LAB/'generation-v3.json').read_text(encoding='utf-8'))
    proof_path=LAB/'living-motion-proof.json'
    proof=json.loads(proof_path.read_text(encoding='utf-8')) if proof_path.exists() else {'version':3,'clips':[]}
    for job in sorted(generation['jobs'],key=lambda j:j['index']):
        name=job['scene']
        if args.only and name!=args.only: continue
        if job['status']!='completed' or any(c['id']==name for c in proof['clips']): continue
        source=LAB/job['output']
        assert hashlib.sha256((ROOT/job['source']).read_bytes()).hexdigest()==job['sourceSha256']
        destination=OUT/(name+'.mp4')
        overlap=CFG['overlapSeconds']
        offset=CFG['duration']-2*overlap
        filters=(f"[0:v]fps={CFG['fps']},setsar=1,split=2[a][b];"
                 f"[a]trim=start={overlap},setpts=PTS-STARTPTS[tail];"
                 f"[b]trim=end={overlap},setpts=PTS-STARTPTS[head];"
                 f"[tail][head]xfade=transition=fade:duration={overlap}:offset={offset},"
                 f"setpts={CFG['slowdown']}*PTS,fps={CFG['fps']},format=yuv420p[out]")
        print('Building full-detail',name,flush=True)
        run([FFMPEG,'-y','-v','error','-i',str(source),'-filter_complex_threads','2','-filter_complex',filters,
             '-map','[out]','-an','-c:v','libx264','-threads','4','-preset','medium','-crf',str(CFG['encodeCrf']),
             '-movflags','+faststart',str(destination)])
        result={'id':name,'path':destination.relative_to(ROOT).as_posix(),'bytes':destination.stat().st_size,
                'sha256':hashlib.sha256(destination.read_bytes()).hexdigest(),'sourceSha256':job['sourceSha256'],
                'rawSha256':hashlib.sha256(source.read_bytes()).hexdigest(),**inspect(destination)}
        proof['clips'].append(result)
        proof_path.write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
        print(json.dumps(result),flush=True)

if __name__=='__main__':main()
