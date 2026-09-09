"""Prepare a clean per-frame logo alpha matte without changing approved motion."""
import sys,json,subprocess
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
CFG=json.loads((ROOT/'values/understarLogoVideoMatte.json').read_text(encoding='utf-8-sig'))
sys.path.insert(0,str(ROOT/CFG['dependencies']))
import cv2
cv2.setNumThreads(2)
ff=str(ROOT/CFG['ffmpeg'])
w,h,x,y=CFG['crop']
source=ROOT/CFG['source']
output=ROOT/CFG['output']
preview='--preview' in sys.argv
decode=[ff,'-hide_banner','-loglevel','error']
if preview:decode+=['-ss',str(CFG['previewFrame']/CFG['fps'])]
decode+=['-i',str(source),'-vf',f'format=rgb24,crop={w}:{h}:{x}:{y}:exact=1','-f','rawvideo','-pix_fmt','rgb24','-']
if preview:decode=decode[:-1]+['-frames:v','1',decode[-1]]
reader=subprocess.Popen(decode,stdout=subprocess.PIPE)
writer=None
if not preview:
    encode=[ff,'-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgba','-s',f'{w}x{h}','-r',str(CFG['fps']),'-i','-','-an','-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-b:v','0','-crf',str(CFG['crf']),'-deadline','good','-cpu-used','4','-row-mt','1','-threads',str(CFG['threads']),'-y',str(output)]
    writer=subprocess.Popen(encode,stdin=subprocess.PIPE)
close=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(CFG['closeSize'],CFG['closeSize']))
opening=cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(CFG['openSize'],CFG['openSize']))
key=np.array(CFG['keyColor'],dtype=np.float32)
reference=cv2.imread(str(ROOT/CFG['coreMask']),cv2.IMREAD_UNCHANGED)
core=(cv2.resize(reference[:,:,3],(w,h),interpolation=cv2.INTER_AREA)>240).astype(np.uint8)
core=cv2.erode(core,np.ones((CFG['coreErodeSize'],CFG['coreErodeSize']),np.uint8))
count=0
try:
    while count < (1 if preview else CFG['frames']):
        raw=reader.stdout.read(w*h*3)
        if not raw:break
        assert len(raw)==w*h*3
        rgb=np.frombuffer(raw,np.uint8).reshape(h,w,3)
        dist=np.linalg.norm(rgb.astype(np.float32)-key,axis=2)
        mask=((dist>CFG['colorDistance']) & (rgb.max(axis=2)>CFG['minimumBrightness'])).astype(np.uint8)
        mask=np.maximum(mask,core)
        mask=cv2.morphologyEx(mask,cv2.MORPH_CLOSE,close)
        mask=cv2.morphologyEx(mask,cv2.MORPH_OPEN,opening)
        n,labels,stats,_=cv2.connectedComponentsWithStats(mask,connectivity=8)
        keep=stats[:,cv2.CC_STAT_AREA]>=CFG['minComponent'];keep[0]=False
        mask=keep[labels].astype(np.uint8)
        # Fill only small enclosed stone gaps; preserve real letter counters.
        n,holes,stats,_=cv2.connectedComponentsWithStats(1-mask,connectivity=8)
        fill=stats[:,cv2.CC_STAT_AREA]<=CFG['maxHole'];fill[0]=False
        boundary=np.unique(np.concatenate([holes[0],holes[-1],holes[:,0],holes[:,-1]]))
        fill[boundary]=False
        mask=np.maximum(mask,fill[holes])
        alpha=cv2.GaussianBlur(mask.astype(np.float32),(3,3),CFG['featherSigma'])
        alpha[alpha<0.03]=0
        alpha[alpha>0.97]=1
        # Unmix the carrier only on the antialiased contour, preserving solid art.
        clean=np.clip((rgb.astype(np.float32)-(1-alpha[:,:,None])*key)/np.maximum(alpha[:,:,None],0.001),0,255)
        rgba=np.dstack([clean.astype(np.uint8),np.rint(alpha*255).astype(np.uint8)])
        if preview:
            cv2.imwrite(str(output.parent/'alpha-v2-frame.png'),cv2.cvtColor(rgba,cv2.COLOR_RGBA2BGRA))
            bg=np.full_like(rgb,232)
            composite=np.rint(clean*alpha[:,:,None]+bg*(1-alpha[:,:,None])).clip(0,255).astype(np.uint8)
            cv2.imwrite(str(output.parent/'alpha-v2-light.png'),cv2.cvtColor(composite,cv2.COLOR_RGB2BGR))
        else:writer.stdin.write(rgba.tobytes())
        count+=1
        if count%60==0:print('MATTE_FRAMES',count,flush=True)
finally:
    reader.stdout.close()
    reader.terminate() if preview else None
    reader.wait()
    if writer:
        writer.stdin.close()
        assert writer.wait()==0
assert count==(1 if preview else CFG['frames'])
print('MATTE_READY',count,flush=True)




