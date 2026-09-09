"""Render faithful 1080p menu loops with scene-specific, interpolated timing."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import argparse, hashlib, json, os, subprocess
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'testing/2026-09-07-menu-atmosphere'
CFG=json.loads((ROOT/'values/menuAtmosphereLiving.json').read_text(encoding='utf-8'))
OUT=ROOT/f"sprites/backgrounds/menu-atmosphere-v{CFG['renderVersion']}"
FFMPEG=os.environ.get('FFMPEG_EXE','ffmpeg')
FFPROBE=os.environ.get('FFPROBE_EXE','ffprobe')

def run(args):
    return subprocess.check_output(args)

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inspect(path):
    meta=json.loads(run([FFPROBE,'-v','error','-show_streams','-of','json',str(path)]))
    video=next(s for s in meta['streams'] if s['codec_type']=='video')
    assert (video['width'],video['height'])==(CFG['renderWidth'],CFG['renderHeight'])
    assert not any(s['codec_type']=='audio' for s in meta['streams'])
    data=run([FFMPEG,'-v','error','-i',str(path),'-vf','scale=320:180','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
    frames=np.frombuffer(data,dtype=np.uint8).reshape((-1,180,320,3)).astype(np.float32)
    steps=np.abs(frames[1:]-frames[:-1]).mean(axis=(1,2,3))
    seam=float(np.abs(frames[0]-frames[-1]).mean())
    step95=float(np.percentile(steps,95))
    assert seam<=max(1,step95*3), f'Loop boundary {seam} exceeds normal motion {step95}'
    change=np.abs(frames[CFG['fps']:]-frames[:-CFG['fps']]).mean(axis=3)
    return {'width':video['width'],'height':video['height'],'fps':video['avg_frame_rate'],
            'frames':len(frames),'durationSeconds':float(video['duration']),'audioStreams':0,
            'encodedBoundaryStep':seam,'encodedStepP95':step95,
            'duplicateFrameSteps':int(np.count_nonzero(steps<0.01)),
            'oneSecondChangeP95':float(np.percentile(change,95))}

def build(profile,job):
    name=profile['id']
    source=LAB/('raw-v3-04-natural.mp4' if name=='luminous-grotto' else job['output'])
    assert digest(ROOT/job['source'])==job['sourceSha256']
    destination=OUT/(name+'.mp4')
    candidate=OUT/(name+'.building.mp4')
    overlap=CFG['overlapSeconds']
    offset=CFG['duration']-2*overlap
    fps=CFG['interpolation']['fps']
    filters=(f"[0:v]fps={CFG['fps']},setsar=1,split=2[a][b];"
             f"[a]trim=start={overlap},setpts=PTS-STARTPTS[tail];"
             f"[b]trim=end={overlap},setpts=PTS-STARTPTS[head];"
             f"[tail][head]xfade=transition=fade:duration={overlap}:offset={offset},"
             f"setpts={profile['slowdown']}*PTS,framerate=fps={fps}:interp_start=0:interp_end=255:flags=0,"
             f"scale={CFG['renderWidth']}:{CFG['renderHeight']}:flags={CFG['upscaleMethod']},format=yuv420p[out]")
    print('Rendering HD',name,flush=True)
    run([FFMPEG,'-y','-v','error','-i',str(source),'-filter_complex_threads','2','-filter_complex',filters,
         '-map','[out]','-an','-c:v','libx264','-threads','4','-preset','medium','-crf',str(CFG['encodeCrf']),
         '-movflags','+faststart',str(candidate)])
    metrics=inspect(candidate)
    candidate.replace(destination)
    return {'id':name,'path':destination.relative_to(ROOT).as_posix(),'bytes':destination.stat().st_size,
            'sha256':digest(destination),'sourceSha256':job['sourceSha256'],
            'rawPath':source.relative_to(ROOT).as_posix(),'rawSha256':digest(source),
            'slowdownFromSource':profile['slowdown'],
            'speedReductionFromV3Percent':round(100*(1-CFG['slowdown']/profile['slowdown']),2),
            'originalCaveHoldout':name=='luminous-grotto',**metrics}

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--only',choices=[p['id'] for p in CFG['profiles']])
    args=parser.parse_args()
    generation=json.loads((LAB/'generation-v3.json').read_text(encoding='utf-8'))
    jobs={j['scene']:j for j in generation['jobs']+generation.get('supersededJobs',[]) if j['status']=='completed'}
    proof_path=LAB/'living-hd-proof.json'
    proof=json.loads(proof_path.read_text(encoding='utf-8')) if proof_path.exists() else {
        'version':CFG['renderVersion'],'upscale':'Local Lanczos 720p to 1080p; no AI detail reconstruction',
        'interpolation':CFG['interpolation'],'fullScreenFilter':False,'clips':[]}
    pending=[p for p in CFG['profiles'] if (not args.only or p['id']==args.only)
             and not any(c['id']==p['id'] for c in proof['clips'])]
    with ThreadPoolExecutor(max_workers=2) as pool:
        for task in as_completed([pool.submit(build,p,jobs[p['id']]) for p in pending]):
            result=task.result()
            proof['clips'].append(result)
            proof_path.write_text(json.dumps(proof,indent=2)+'\n',encoding='utf-8')
            print(json.dumps(result),flush=True)

if __name__=='__main__': main()
