"""Probe candidate gameplay recordings and render labeled contact sheets."""
import json, subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'steam-marketing/2026-09-05-understar-three-minute-trailer/work'
BIN = Path('C:/Users/Mila/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.2-full_build/bin')
FONT = ROOT/'assets/fonts/barlow-semi-condensed/BarlowSemiCondensed-SemiBold.ttf'
sources = sorted((ROOT/'systems/screenrecord').glob('*202608*broad*.webm'))
sources += sorted((ROOT/'systems/screenrecord').glob('*20260803*short*.webm'))
inventory = []
font = ImageFont.truetype(str(FONT), 21)
for number, source in enumerate(sources):
    result = subprocess.run([str(BIN/'ffprobe.exe'), '-v','error','-show_format','-show_streams','-of','json',str(source)],capture_output=True,text=True,check=True)
    metadata = json.loads(result.stdout)
    duration = float(metadata['format']['duration'])
    record = {'id':f'archive-{number:02}', 'source':source.relative_to(ROOT).as_posix(),'duration':duration,'streams':metadata['streams']}
    inventory.append(record)
    sheet = Image.new('RGB',(1680,810),'#07111f')
    draw = ImageDraw.Draw(sheet)
    for i in range(12):
        seconds=max(.05,duration*i/12)
        frame=OUT/f'{record["id"]}-frame.png'
        subprocess.run([str(BIN/'ffmpeg.exe'),'-hide_banner','-loglevel','error','-y','-ss',str(seconds),'-i',str(source),'-frames:v','1','-vf','scale=420:236:force_original_aspect_ratio=decrease,pad=420:236:(ow-iw)/2:(oh-ih)/2',str(frame)],check=True)
        sheet.paste(Image.open(frame),((i%4)*420,(i//4)*270))
        draw.text(((i%4)*420+12,(i//4)*270+240),f'{record["id"]}  {seconds:.1f}s',font=font,fill='#d6edf1')
    contact=OUT/f'{record["id"]}-contact.jpg'
    sheet.save(contact,quality=90)
    record['contact']=contact.relative_to(ROOT).as_posix()
    print(json.dumps({k:v for k,v in record.items() if k!='streams'}),flush=True)
(OUT/'archive-inventory.json').write_text(json.dumps(inventory,indent=2)+'\n')
