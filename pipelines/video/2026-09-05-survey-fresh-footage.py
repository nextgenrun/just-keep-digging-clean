"""Survey the new native gameplay recordings for the three-minute trailer."""
import json, subprocess
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'steam-marketing/2026-09-05-understar-three-minute-trailer/work'
BIN=Path('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin')
FONT=ROOT/'assets/fonts/barlow-semi-condensed/BarlowSemiCondensed-SemiBold.ttf'
PREFIXES=['155418','155535','155604','160012','160614','160643','161124','161153','161523','161552','161748','161817','163334','163655']
sources=[next((ROOT/'systems/screenrecord').glob('screenrecord-20260905-'+p+'*.webm')) for p in PREFIXES]
def survey(source):
    meta=json.loads(subprocess.run([str(BIN/'ffprobe.exe'),'-v','error','-show_format','-show_streams','-of','json',str(source)],capture_output=True,text=True,check=True).stdout)
    tag=source.name.split('-')[2]+'-'+source.name.split('trailer-')[1].split('-broad')[0]
    duration=float(meta['format']['duration'])
    stem=str(OUT/(tag+'-%02d.png'))
    subprocess.run([str(BIN/'ffmpeg.exe'),'-hide_banner','-loglevel','error','-threads','2','-y','-i',str(source),'-vf','fps=1/2,scale=420:236','-frames:v','12',stem],check=True)
    sheet=Image.new('RGB',(1680,810),'#07111f')
    draw=ImageDraw.Draw(sheet)
    font=ImageFont.truetype(str(FONT),21)
    frames=sorted(OUT.glob(tag+'-*.png'))
    for i,frame in enumerate(frames):
        sheet.paste(Image.open(frame),((i%4)*420,(i//4)*270))
        draw.text(((i%4)*420+12,(i//4)*270+240),f'{tag} {1+i*2}s',font=font,fill='#d6edf1')
    contact=OUT/(tag+'-contact.jpg')
    sheet.save(contact,quality=90)
    rec={'id':tag,'source':source.relative_to(ROOT).as_posix(),'duration':duration,'streams':meta['streams'],'contact':contact.relative_to(ROOT).as_posix()}
    print(json.dumps({k:v for k,v in rec.items() if k!='streams'}),flush=True)
    return rec
with ThreadPoolExecutor(max_workers=3) as pool:
    records=list(pool.map(survey,sources))
(OUT/'fresh-inventory.json').write_text(json.dumps(records,indent=2)+'\n')
