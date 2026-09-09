"""Build the frame-exact UNDERSTAR gameplay edit and editable title sidecars."""
import concurrent.futures, json, shutil, subprocess, sys, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PACK=ROOT/'steam-marketing/2026-09-05-understar-three-minute-trailer'
WORK=PACK/'work'
CLIPS=WORK/'clips'
BIN=Path('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin')
FF=str(BIN/'ffmpeg.exe')
CFG=json.loads((PACK/'edit.json').read_text(encoding='utf-8'))
FPS=CFG['fps']
INV={}
for name in ['fresh','archive']:
    INV.update({x['id']:x for x in json.loads((WORK/(name+'-inventory.json')).read_text())})
def rel(p): return Path(p).relative_to(ROOT).as_posix()
def run(args,log):
    with open(log,'w',encoding='utf-8') as f:
        subprocess.run([FF,'-hide_banner','-y','-loglevel','warning',*args],cwd=ROOT,stdout=f,stderr=f,check=True)
def prep():
    CLIPS.mkdir(exist_ok=True)
    (CLIPS/'readme.md').write_text('# Normalized edit clips\n1920x1080, 60 fps, H.264. Sample-exact PCM effects are separate WAV files. Original gameplay timing is preserved.\n')
    shutil.copy2(ROOT/CFG['logo'],WORK/'understar-logo.png')
    for name in ['Bold','SemiBold','Regular']:
        shutil.copy2(ROOT/f'assets/fonts/barlow-semi-condensed/BarlowSemiCondensed-{name}.ttf',WORK/f'BarlowSemiCondensed-{name}.ttf')
def cut_video(c):
    vid=CLIPS/(c['id']+'.mp4')
    aud=CLIPS/(c['id']+'.wav')
    n=round(c['duration']*FPS)
    if vid.exists() and aud.exists(): return
    args=['-threads','3']
    if c['source']=='triptych':
        source=ROOT/INV['archive-05']['source']
        for t in [18,42,57]: args+=['-ss',str(t),'-t',str(c['duration']),'-i',rel(source)]
        filters=[]
        for i in range(3):
            filters.append(f'[{i}:v]fps={FPS},scale=640:1138:flags=lanczos,crop=640:1080:0:29,setsar=1,setpts=PTS-STARTPTS[p{i}]')
        filters.append('[p0][p1][p2]hstack=inputs=3,drawbox=x=638:y=0:w=4:h=ih:color=0x72bac6@0.8:t=fill,drawbox=x=1278:y=0:w=4:h=ih:color=0x72bac6@0.8:t=fill,eq=brightness=0.014:gamma=1.08:saturation=1.06,format=yuv420p[v]')
        args+=['-filter_complex',';'.join(filters),'-map','[v]']
    else:
        source=ROOT/INV[c['source']]['source']
        args+=['-ss',str(c['in']),'-t',str(c['duration']),'-i',rel(source)]
        filters=[f'fps={FPS}','setpts=PTS-STARTPTS']
        z=c.get('zoom',1)
        if z>1:
            w=int(1920/z)//2*2; h=int(1080/z)//2*2
            filters.extend([f'crop={w}:{h}:(iw-ow)/2:(ih-oh)/2','scale=1920:1080:flags=lanczos'])
        filters+=['setsar=1','eq=brightness=0.012:contrast=1.025:gamma=1.065:saturation=1.07','format=yuv420p']
        args+=['-map','0:v:0','-vf',','.join(filters)]
    args+=['-an','-frames:v',str(n),'-c:v','libx264','-preset','fast','-crf','17','-threads','3','-pix_fmt','yuv420p','-color_primaries','bt709','-color_trc','bt709','-colorspace','bt709','-r',str(FPS),'-video_track_timescale','60000',rel(vid)]
    run(args,CLIPS/(c['id']+'-video.log'))
    if c['source'].startswith('archive') or c['source']=='triptych':
        samples=int(c['duration']*48000)
        with wave.open(str(aud),'wb') as f:
            f.setnchannels(2);f.setsampwidth(2);f.setframerate(48000)
            f.writeframes(b'\0'*(samples*4))
    else:
        af=f'aresample=48000,asetpts=PTS-STARTPTS,afade=t=in:d=0.025,afade=t=out:st={c["duration"]-.06}:d=0.06,apad,atrim=duration={c["duration"]}'
        run(['-ss',str(c['in']),'-t',str(c['duration']),'-i',rel(source),'-vn','-af',af,'-ac','2','-ar','48000','-c:a','pcm_s16le',rel(aud)],CLIPS/(c['id']+'-audio.log'))
    print('CUT '+c['id']+' '+str(c['duration'])+'s',flush=True)
def ass_time(t):
    h=int(t//3600);m=int(t//60)%60;s=t%60
    return f'{h}:{m:02}:{s:05.2f}'
def srt_time(t):
    ms=round(t*1000);return f'{ms//3600000:02}:{ms//60000%60:02}:{ms//1000%60:02},{ms%1000:03}'
def titles():
    header="""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.709

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Feature,Barlow Semi Condensed SemiBold,62,&H00F0F7F4,&H00FFFFFF,&H00100B07,&H90000000,0,0,0,0,100,100,3.5,0,1,2.6,1.5,5,90,90,70,1
Style: Power,Barlow Semi Condensed SemiBold,42,&H00D8DED2,&H00FFFFFF,&H00100B07,&H90000000,0,0,0,0,100,100,5,0,1,2,1,5,90,90,70,1
Style: Eyebrow,Barlow Semi Condensed SemiBold,30,&H00CBD6BB,&H00FFFFFF,&H00100B07,&H90000000,0,0,0,0,100,100,6,0,1,1.5,1,5,90,90,70,1
Style: CTA,Barlow Semi Condensed Bold,64,&H00F3FAF4,&H00FFFFFF,&H00100B07,&H90000000,0,0,0,0,100,100,5,0,1,2.5,1,5,90,90,70,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines=[];sub=[]
    for i,t in enumerate(CFG['titles']):
        a,b=t['start'],t['end'];y=t['y']
        tag='{\\an5\\move(960,'+str(y+14)+',960,'+str(y)+',0,420)\\fad(300,250)}'
        lines.append(f'Dialogue: 1,{ass_time(a)},{ass_time(b)},{t["style"]},,0,0,0,,{tag}{t["text"]}')
        if t['style'] in ['Feature','CTA']:
            y2=y+49
            rule='{\\an7\\pos(875,'+str(y2)+')\\p1\\bord0\\shad0\\1c&H84B7CE&\\fad(350,250)}m 0 0 l 170 0 170 2 0 2'
            lines.append(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},Feature,,0,0,0,,{rule}')
        sub.append(f'{i+1}\n{srt_time(a)} --> {srt_time(b)}\n{t["text"]}\n')
    (PACK/'titles.ass').write_text(header+'\n'.join(lines)+'\n',encoding='utf-8')
    (PACK/'titles.srt').write_text('\n'.join(sub),encoding='utf-8')
def assemble():
    listing=WORK/'video-concat.txt'
    listing.write_text(''.join("file 'clips/"+c['id']+".mp4'\n" for c in CFG['cuts']))
    run(['-f','concat','-safe','0','-i',rel(listing),'-c','copy','-an',rel(WORK/'picture-lock.mp4')],WORK/'picture-lock.log')
    with wave.open(str(WORK/'gameplay-effects.wav'),'wb') as out:
        out.setnchannels(2);out.setsampwidth(2);out.setframerate(48000)
        for c in CFG['cuts']:
            with wave.open(str(CLIPS/(c['id']+'.wav')),'rb') as src:
                out.writeframes(src.readframes(src.getnframes()))
    assert round(sum(c['duration'] for c in CFG['cuts'])*FPS)==10800
    manifest={**CFG,'sourceInventory':{k:v for k,v in INV.items() if k in {c['source'] for c in CFG['cuts']} or k=='archive-05'}}
    (PACK/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    print('PICTURE LOCK 180s / 10800 frames',flush=True)
def main():
    prep();titles()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool: list(pool.map(cut_video,CFG['cuts']))
    assemble()
if __name__=='__main__': main()
