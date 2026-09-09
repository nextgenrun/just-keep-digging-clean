"""Restore visible scene-local atmosphere from the existing generated clips."""
from pathlib import Path
import argparse, hashlib, json, os, subprocess
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
LAB = ROOT / "testing/2026-09-07-menu-atmosphere"
OUT = ROOT / "sprites/backgrounds/menu-atmosphere-v2"
CFG = json.loads((ROOT / "values/menuAtmosphereMotion.json").read_text(encoding="utf-8"))
FFMPEG = os.environ.get("FFMPEG_EXE", "ffmpeg")
FFPROBE = os.environ.get("FFPROBE_EXE", "ffprobe")


def smooth(value):
    value = np.clip(value, 0, 1)
    return value * value * (3 - 2 * value)


def make_mask(profile, original):
    h, w = original.shape[:2]
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    x /= w - 1
    y /= h - 1
    def ellipse(zone):
        cx, cy, rx, ry = zone
        distance = np.sqrt(((x-cx)/rx)**2 + ((y-cy)/ry)**2)
        return smooth((1-distance) / CFG["ellipseFeather"])
    mask = np.zeros((h,w), dtype=np.float32)
    if "sky" in profile:
        start, end = profile["sky"]
        mask = smooth((end-y)/(end-start))
    for zone in profile["zones"]:
        mask = np.maximum(mask, ellipse(zone))
    if profile.get("warmGround"):
        warm_cfg = CFG["warmGround"]
        warm = smooth((original[:,:,0]-original[:,:,2]-warm_cfg["redBlueThreshold"])/warm_cfg["colorRange"])
        mask = np.maximum(mask, warm * smooth((y-warm_cfg["startY"])/warm_cfg["featherY"]))
    for zone in profile["holdouts"]:
        mask *= 1-ellipse(zone)
    return mask[:,:,None]


def inspect(path):
    raw = subprocess.check_output([FFMPEG,"-v","error","-i",str(path),"-vf","fps=4,scale=256:144","-f","rawvideo","-pix_fmt","rgb24","pipe:1"])
    frames = np.frombuffer(raw,dtype=np.uint8).reshape((-1,144,256,3)).astype(np.float32)
    variability = np.std(frames,axis=0).mean(axis=2)
    change = np.abs(frames[12:]-frames[:-12]).mean(axis=3)
    contribution = CFG["displayAlpha"]*CFG["displayVideoMix"]*(1-CFG["loadingVeilAlpha"])
    return {"meanTemporalStd":float(variability.mean()),"p95TemporalStd":float(np.percentile(variability,95)),
            "displayP95TemporalStd":float(np.percentile(variability,95))*contribution,
            "displayThreeSecondChangeP95":float(np.percentile(change,95))*contribution}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--only",choices=[p["id"] for p in CFG["profiles"]])
    args=parser.parse_args()
    provenance=json.loads((LAB/"generation.json").read_text(encoding="utf-8"))
    proof_path=LAB/"motion-v2-proof.json"
    proof=json.loads(proof_path.read_text(encoding="utf-8")) if proof_path.exists() else {"version":2,"clips":[]}
    width,height=CFG["width"],CFG["height"]
    low_w,low_h=CFG["workingWidth"],CFG["workingHeight"]
    fps=CFG["fps"]
    for i,profile in enumerate(CFG["profiles"],1):
        name=profile["id"]
        if args.only and args.only!=name:continue
        if any(c["id"]==name for c in proof["clips"]):continue
        source=LAB/f"raw-{i:02d}.mp4"
        job=next(j for j in provenance["jobs"] if j["index"]==i)
        original_path=ROOT/job["source"]
        assert hashlib.sha256(original_path.read_bytes()).hexdigest()==job["sourceSha256"]
        decoded=subprocess.check_output([FFMPEG,"-v","error","-i",str(source),"-vf",f"fps={fps},scale={low_w}:{low_h}:flags=area,gblur=sigma={CFG['blurSigma']}","-f","rawvideo","-pix_fmt","rgb24","pipe:1"])
        frames=np.frombuffer(decoded,dtype=np.uint8).reshape((-1,low_h,low_w,3))
        reference=frames[0].astype(np.float32)
        original_image=Image.open(original_path).convert("RGB")
        original=np.asarray(original_image.resize((width,height),Image.Resampling.LANCZOS)).astype(np.float32)
        mask=make_mask(profile,np.asarray(original_image.resize((low_w,low_h),Image.Resampling.LANCZOS)).astype(np.float32))
        mask_sum=max(1,float(mask.sum()))
        count=len(frames); overlap=round(CFG["overlapSeconds"]*fps); period=count-overlap
        output_count=round(period*CFG["slowdown"])
        def sample(position):
            lo=min(int(position),count-1); hi=min(lo+1,count-1); fraction=position-lo
            return frames[lo].astype(np.float32)*(1-fraction)+frames[hi].astype(np.float32)*fraction
        dest=OUT/(name+".mp4")
        encoder=subprocess.Popen([FFMPEG,"-y","-v","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{width}x{height}","-r",str(fps),"-i","pipe:0","-an","-c:v","libx264","-threads","4","-preset","medium","-crf","16","-x264-params","ipratio=1:pbratio=1","-pix_fmt","yuv420p","-movflags","+faststart",str(dest)],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
        print("Building visible",name,flush=True)
        first=last=None
        frame_steps=[]
        for index in range(output_count):
            # A regular cyclic time step avoids duplicating the endpoint frame.
            position=index*period/output_count
            moving=sample(position+overlap)
            if position>=count-2*overlap:
                head=position-(count-2*overlap)
                weight=smooth(head/overlap)
                moving=moving*(1-weight)+sample(head)*weight
            # Compare to the generated reference, not to the sharp painting.
            # This preserves moving billows instead of clipping their static bias.
            delta=(moving-reference)*mask
            delta-=mask*(delta.sum(axis=(0,1),keepdims=True)/mask_sum)
            limit=CFG["deltaLimit"]
            delta=limit*np.tanh(delta*profile["gain"]/limit)
            assert np.isfinite(delta).all(), "Non-finite atmosphere field"
            planes=[np.asarray(Image.fromarray(np.asarray(delta[:,:,channel],dtype=np.float32)).resize((width,height),Image.Resampling.BILINEAR)) for channel in range(3)]
            pixels=np.clip(original+np.stack(planes,axis=2),0,255).astype(np.uint8)
            if first is None:first=pixels.copy()
            if last is not None:
                frame_steps.append(float(np.abs(pixels.astype(np.float32)-last.astype(np.float32)).mean()))
            last=pixels
            encoder.stdin.write(pixels.tobytes())
        encoder.stdin.close()
        error=encoder.stderr.read().decode()
        if encoder.wait():raise RuntimeError(error)
        boundary_step=float(np.abs(first.astype(np.float32)-last.astype(np.float32)).mean())
        typical_step=float(np.percentile(frame_steps,95))
        assert boundary_step <= max(0.5,typical_step*2.5), f"Discontinuous loop: {boundary_step} vs {typical_step}"
        metadata=json.loads(subprocess.check_output([FFPROBE,"-v","error","-show_streams","-of","json",str(dest)]))
        assert not any(s["codec_type"]=="audio" for s in metadata["streams"])
        result={"id":name,"path":str(dest.relative_to(ROOT)).replace(chr(92),"/"),"bytes":dest.stat().st_size,
                "sha256":hashlib.sha256(dest.read_bytes()).hexdigest(),"frames":output_count,"durationSeconds":output_count/fps,
                "audioStreams":0,"sourceSha256":job["sourceSha256"],"inputBoundaryStep":boundary_step,"inputStepP95":typical_step,
                "duplicatedEndpoint":False,**inspect(dest)}
        proof["clips"].append(result)
        proof_path.write_text(json.dumps(proof,indent=2)+"\n",encoding="utf-8")
        print(json.dumps(result),flush=True)


if __name__=="__main__":main()
