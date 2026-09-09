"""Mix the game-owned score, master the 180-second trailer, and verify the export."""
import hashlib, json, os, re, subprocess, wave
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
PACK=ROOT/'steam-marketing/2026-09-05-understar-three-minute-trailer'
WORK=PACK/'work'
BIN=Path('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin')
FF=str(BIN/'ffmpeg.exe'); FP=str(BIN/'ffprobe.exe')
CFG=json.loads((PACK/'edit.json').read_text(encoding='utf-8'))
FINAL=PACK/'understar-gameplay-trailer-3min.mp4'
def rel(p): return Path(p).relative_to(ROOT).as_posix()
def run(args,name):
    proc=subprocess.run([FF,'-hide_banner','-y',*args],cwd=ROOT,capture_output=True,text=True)
    (WORK/(name+'.log')).write_text(proc.stderr,encoding='utf-8')
    if proc.returncode: raise RuntimeError(name+': '+proc.stderr[-2400:])
    return proc.stderr
def norm_json(stderr):
    return json.loads(re.findall(r'\{\s*"input_i".*?\}',stderr,re.S)[-1])
def probe(p):
    return json.loads(subprocess.run([FP,'-v','error','-show_format','-show_streams','-of','json',rel(p)],cwd=ROOT,capture_output=True,text=True,check=True).stdout)
def audio():
    target=WORK/'final-mix.wav'
    if target.exists():return
    shape='0.88-0.23*clip((t-10)/2,0,1)+0.13*clip((t-22)/5,0,1)-0.10*clip((t-49)/4,0,1)+0.30*clip((t-76)/8,0,1)-0.24*clip((t-112)/2,0,1)+0.32*clip((t-130)/8,0,1)'
    music=f'atrim=duration=180,asetpts=PTS-STARTPTS,aresample=48000,loudnorm=I=-20:TP=-2:LRA=10,volume=\'{shape}\':eval=frame,afade=t=in:d=0.08,afade=t=out:st=176:d=4'
    run(['-i',CFG['soundtrack'],'-af',music,'-t','180','-ar','48000','-ac','2','-c:a','pcm_s24le',rel(WORK/'score.wav')],'score')
    fx='aresample=48000,loudnorm=I=-23:TP=-3:LRA=11,afade=t=out:st=177:d=3'
    run(['-i',rel(WORK/'gameplay-effects.wav'),'-af',fx,'-t','180','-ar','48000','-ac','2','-c:a','pcm_s24le',rel(WORK/'effects-balanced.wav')],'effects')
    chime='sound/soundEffects/approved-sfx-findings-v1/rare-discovery-tight-reward.ogg'
    filters=['[0:a][1:a]amix=inputs=2:duration=longest:normalize=0[bed]',
             '[2:a]aresample=48000,volume=0.25,asplit=2[c1][c2]',
             '[c1]adelay=10000:all=1[h1]','[c2]adelay=174000:all=1[h2]',
             '[bed][h1][h2]amix=inputs=3:duration=longest:normalize=0,atrim=duration=180,afade=t=out:st=179.2:d=0.8[mix]']
    run(['-i',rel(WORK/'score.wav'),'-i',rel(WORK/'effects-balanced.wav'),'-i',chime,'-filter_complex',';'.join(filters),'-map','[mix]','-ar','48000','-ac','2','-c:a','pcm_s24le',rel(WORK/'mix-raw.wav')],'mix-raw')
    first=run(['-i',rel(WORK/'mix-raw.wav'),'-af','loudnorm=I=-15:TP=-1.5:LRA=10:print_format=json','-f','null',os.devnull],'loudness-pass1')
    m=norm_json(first)
    filt=f'loudnorm=I=-15:TP=-1.5:LRA=10:measured_I={m["input_i"]}:measured_TP={m["input_tp"]}:measured_LRA={m["input_lra"]}:measured_thresh={m["input_thresh"]}:offset={m["target_offset"]}:linear=true:print_format=json'
    second=run(['-i',rel(WORK/'mix-raw.wav'),'-af',filt,'-ar','48000','-ac','2','-c:a','pcm_s24le',rel(target)],'loudness-pass2')
    (PACK/'audio-mastering.json').write_text(json.dumps({'targetLUFS':-15,'truePeakLimitDBTP':-1.5,'analysis':m,'master':norm_json(second)},indent=2)+'\n')
    print('AUDIO mastered',flush=True)
def render():
    if FINAL.exists():return
    filters=[
      '[0:v]drawbox=x=0:y=0:w=iw:h=ih:color=0x030916@0.32:t=fill:enable=\'between(t,10,16)\',drawbox=x=0:y=0:w=iw:h=ih:color=0x030916@0.66:t=fill:enable=\'between(t,174,180)\'[base]',
      '[1:v]split=2[mark1][mark2]',
      '[mark1]scale=1120:-1,format=rgba,fade=t=in:st=10:d=0.5:alpha=1,fade=t=out:st=15.5:d=0.5:alpha=1[l1]',
      '[mark2]scale=1350:-1,format=rgba,fade=t=in:st=174:d=0.6:alpha=1[l2]',
      '[base][l1]overlay=x=(W-w)/2:y=205:enable=\'between(t,10,16)\':eof_action=pass[brand1]',
      '[brand1][l2]overlay=x=(W-w)/2:y=320:enable=\'between(t,174,180)\':eof_action=pass[brand2]',
      '[brand2]ass=filename='+rel(PACK/'titles.ass')+':fontsdir='+rel(WORK)+',fade=t=out:st=179.4:d=0.6,format=yuv420p[v]'
    ]
    run(['-threads','8','-i',rel(WORK/'picture-lock.mp4'),'-loop','1','-framerate','60','-i',rel(WORK/'understar-logo.png'),'-i',rel(WORK/'final-mix.wav'),
         '-filter_complex_threads','4','-filter_complex',';'.join(filters),'-map','[v]','-map','2:a:0','-t','180','-r','60','-c:v','libx264','-preset','medium','-b:v','20M','-maxrate','24M','-bufsize','40M','-threads','8',
         '-profile:v','high','-level:v','4.2','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709',
         '-c:a','aac','-b:a','320k','-ar','48000','-ac','2','-movflags','+faststart','-metadata','title=UNDERSTAR - The Depths Are Calling','-metadata','comment=Three-minute gameplay trailer',rel(FINAL)],'final-render')
    print('FINAL rendered',flush=True)
def verify():
    meta=probe(FINAL);v=next(s for s in meta['streams'] if s['codec_type']=='video');a=next(s for s in meta['streams'] if s['codec_type']=='audio')
    assert float(meta['format']['duration'])==180.0,meta['format']['duration']
    assert (v['width'],v['height'],v['avg_frame_rate'],int(v['nb_frames']))==(1920,1080,'60/1',10800),v
    assert a['sample_rate']=='48000' and a['channels']==2
    run(['-v','error','-i',rel(FINAL),'-f','null',os.devnull],'full-decode')
    result=run(['-i',rel(FINAL),'-vn','-af','loudnorm=I=-15:TP=-1.5:LRA=10:print_format=json','-f','null',os.devnull],'final-audio-analysis')
    measured=norm_json(result)
    assert float(measured['input_tp'])<=-1.0,measured
    digest=hashlib.sha256()
    with FINAL.open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''):digest.update(chunk)
    report={'file':FINAL.name,'bytes':FINAL.stat().st_size,'sha256':digest.hexdigest(),'durationSeconds':180,'frames':10800,'fullDecodePassed':True,'audioMeasured':measured,'metadata':meta,'published':False}
    (PACK/'media-verification.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print('VERIFIED 180.000s / 10800 frames / 1080p60 / full decode / '+measured['input_i']+' LUFS',flush=True)
def contacts():
    frames=WORK/'final-frames';frames.mkdir(exist_ok=True)
    (frames/'readme.md').write_text('# Final inspection frames\nEvery five seconds of the mastered export.\n')
    run(['-i',rel(FINAL),'-vf','fps=1/5,scale=480:270','-frames:v','36',rel(frames/'frame-%02d.png')],'contact-frames')
    font=ImageFont.truetype(str(WORK/'BarlowSemiCondensed-SemiBold.ttf'),23)
    for page in range(3):
        sheet=Image.new('RGB',(1920,918),'#07111f');draw=ImageDraw.Draw(sheet)
        for i in range(12):
            num=page*12+i+1
            frame=frames/f'frame-{num:02}.png'
            x=(i%4)*480;y=(i//4)*306
            sheet.paste(Image.open(frame),(x,y))
            t=(num-1)*5+2.5
            draw.text((x+12,y+277),f'{int(t//60):02}:{t%60:04.1f}',font=font,fill='#d6edf1')
        sheet.save(PACK/f'contact-sheet-{page+1}.jpg',quality=93)
    run(['-ss','7.5','-i',rel(FINAL),'-frames:v','1',rel(PACK/'poster-gameplay.png')],'poster')
    print('CONTACT SHEETS and poster ready',flush=True)
if __name__=='__main__':
    audio();render();verify();contacts()
