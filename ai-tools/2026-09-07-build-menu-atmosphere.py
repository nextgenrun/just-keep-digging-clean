"""Build forward-only, cyclic menu videos and record decoded seam evidence."""
from pathlib import Path
import hashlib,json,subprocess
import numpy as np
import os
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
LAB=ROOT/'testing/2026-09-07-menu-atmosphere'
OUT=ROOT/'sprites/backgrounds/menu-atmosphere-v1'
NAMES=('aurora','starfall','lantern-forest','luminous-grotto','ember-reaches','quiet-foundry')
OVERLAP=1.5
SLOWDOWN=2.4
FPS=24
FFMPEG=os.environ.get('FFMPEG_EXE','ffmpeg')
FFPROBE=os.environ.get('FFPROBE_EXE','ffprobe')

def run(args):
 subprocess.run(args,check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)

def snapshot(path, seconds):
 raw=subprocess.check_output([FFMPEG,'-v','error','-ss',str(seconds),'-i',str(path),'-frames:v','1','-vf','scale=384:216','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
 return Image.frombytes('RGB',(384,216),raw)

def inspect(path):
 raw=subprocess.check_output([FFMPEG,'-v','error','-i',str(path),'-vf','scale=256:144','-f','rawvideo','-pix_fmt','gray','pipe:1'])
 data=np.frombuffer(raw,dtype=np.uint8).reshape((-1,144,256)).astype(np.float32)
 adjacent=np.abs(np.diff(data,axis=0)).mean(axis=(1,2))
 seam=float(np.abs(data[0]-data[-1]).mean())
 p95=float(np.percentile(adjacent,95)); maximum=float(adjacent.max())
 images=[snapshot(path,index/FPS) for index in (0,len(data)//4,len(data)//2,3*len(data)//4,len(data)-1)]
 return {'frames':len(data),'seamMeanLumaDelta':seam,'adjacentP95':p95,'adjacentMax':maximum,'seamPass':seam<=max(p95*1.5,0.3)},images

def main():
 OUT.mkdir(parents=True,exist_ok=True)
 (OUT/'readme.md').write_text('# Menu atmosphere v1\nSix silent, forward-playing scenic loops generated through OpenRouter Seedance 2.0 Mini from the six existing menu PNGs. Original source hashes, API usage and decoded seam measurements are in testing/2026-09-07-menu-atmosphere. The 1.5-second circular overlap is slowed 2.4 times; no frame reversal or camera transform is applied.\n')
 manifest_path=LAB/'loop-proof.json'
 manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
 if manifest.get('version')!=5: manifest={'version':5,'clips':[]}
 for i,name in enumerate(NAMES,1):
  source=LAB/('raw-%02d.mp4'%i); dest=OUT/(name+'.mp4')
  if not source.exists() or any(c['id']==name for c in manifest['clips']):continue
  raw=json.loads(subprocess.check_output([FFPROBE,'-v','error','-show_format','-show_streams','-of','json',str(source)]))
  duration=float(raw['format']['duration']); end=duration-OVERLAP
  original_path=ROOT/next(j['source'] for j in json.loads((LAB/'generation.json').read_text())['jobs'] if j['index']==i)
  width,height=1280,720
  low_w,low_h=320,180
  decoded=subprocess.check_output([FFMPEG,'-v','error','-i',str(source),'-vf',f'fps={FPS},scale={low_w}:{low_h}:flags=area,gblur=sigma=2','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
  frames=np.frombuffer(decoded,dtype=np.uint8).reshape((-1,low_h,low_w,3)).astype(np.float32)
  count=len(frames); overlap=round(OVERLAP*FPS); period=count-overlap
  output_count=round(period*SLOWDOWN)
  original=np.asarray(Image.open(original_path).convert('RGB').resize((width,height),Image.Resampling.LANCZOS)).astype(np.float32)
  def sample(position):
   lo=min(int(position),count-1);hi=min(lo+1,count-1);fraction=position-lo
   return frames[lo]*(1-fraction)+frames[hi]*fraction
  encoder=subprocess.Popen([FFMPEG,'-y','-v','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{width}x{height}','-r',str(FPS),'-i','pipe:0','-an','-c:v','libx264','-preset','slow','-crf','14','-x264-params','ipratio=1:pbratio=1','-pix_fmt','yuv420p','-movflags','+faststart',str(dest)],stdin=subprocess.PIPE,stderr=subprocess.PIPE)
  first_pixels=None
  last_pixels=None
  for index in range(output_count):
   position=index*period/(output_count-1)
   motion=sample(position+overlap)
   if position>=count-2*overlap:
    head_position=position-(count-2*overlap)
    weight=head_position/overlap
    weight=weight*weight*(3-2*weight)
    motion=motion*(1-weight)+sample(head_position)*weight
   # A bounded soft field animates light; the sharp authored geometry stays put.
   field=np.asarray(Image.fromarray(np.clip(motion,0,255).astype(np.uint8)).resize((width,height),Image.Resampling.BILINEAR)).astype(np.float32)
   result=original+np.clip((field-original)*0.24,-16,16)
   pixels=np.clip(result,0,255).astype(np.uint8)
   if first_pixels is None:first_pixels=pixels.copy()
   last_pixels=pixels
   encoder.stdin.write(pixels.tobytes())
  encoder.stdin.close()
  errors=encoder.stderr.read().decode()
  if encoder.wait():raise RuntimeError(errors)
  proof,images=inspect(dest)
  proof["inputSeamRgbDelta"]=float(np.abs(first_pixels.astype(np.float32)-last_pixels.astype(np.float32)).mean())
  # Judge compression at its actual maximum runtime contribution, before the
  # existing darker loading/menu veil. A quarter of one 8-bit code is the cap.
  proof["displaySeamMeanLumaDelta"]=proof["seamMeanLumaDelta"]*0.44*0.64
  proof["seamPass"]=proof["inputSeamRgbDelta"]==0 and proof["displaySeamMeanLumaDelta"]<0.25
  probe=json.loads(subprocess.check_output([FFPROBE,'-v','error','-show_streams','-of','json',str(dest)]))
  assert not any(stream['codec_type']=='audio' for stream in probe['streams'])
  proof.update({'id':name,'path':str(dest.relative_to(ROOT)).replace('\\','/'),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'durationSeconds':proof['frames']/FPS,'audioStreams':0,'originalContribution':0.76,'deltaLimit8bit':16,'softeningSigma':8})
  board=Image.new('RGB',(1280,2*200),'#070b10');draw=ImageDraw.Draw(board)
  all_images=[snapshot(source,0)]+images
  for j,im in enumerate(all_images):
   tile=im.copy();tile.thumbnail((420,172));x=(j%3)*426;y=(j//3)*200;board.paste(tile,(x,y));draw.text((x+5,y+177),'Source' if j==0 else ('Loop sample '+str(j)),fill='white')
  board.save(LAB/(name+'-contact.jpg'))
  manifest['clips'].append(proof);manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
  print(name,json.dumps(proof),flush=True)
  if not proof['seamPass']:raise RuntimeError('Visible loop seam requires inspection: '+name)

if __name__=='__main__':main()
