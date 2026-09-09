"""Compare existing registered walk/run art with an unpromoted local run source."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]
inv = json.loads((OUT/'inventory.json').read_text())
active = next(r for r in inv['runtimeAnimations'] if r['key'] == inv['defaultAnimationKeys']['walkRun'])
base = ROOT/'testing/blender-animation-lab-v1/review-drafts/mixamo-locomotion-comparison-v1/renders/candidate-runtime'
spec = json.loads((base/'manifest.json').read_text())['clips']['run-loop']
board = Image.new('RGB', (1120, 490), '#101c2b')
draw = ImageDraw.Draw(board)
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 16)
small = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 13)
lanes = [('CURRENT CTRL RUN: Mixamo Standard Walk, speed-scaled in game', ROOT/active['assetPath'], active['frameWidth'], active['frameSequence'], active['displaySizePx'], active['originY']),
         ('EXISTING REVIEW CANDIDATE: Unarmed Run Forward (not promoted or game-calibrated)', base/spec['file'], spec['packedFrameSizePx'], list(range(spec['frames'])), 101, 0.890625)]
for lane, (label, path, cell, sequence, display, origin) in enumerate(lanes):
    sheet = Image.open(path).convert('RGBA')
    columns = sheet.width//cell
    y = 12 + lane*235
    draw.text((16,y), label, fill='#e6efff', font=font)
    for n in range(6):
        index = round(n*(len(sequence)-1)/5)
        texture = sequence[index]
        sx, sy = texture%columns*cell, texture//columns*cell
        frame = sheet.crop((sx,sy,sx+cell,sy+cell)).resize((display*2,display*2),Image.Resampling.LANCZOS)
        x = 95+n*183
        board.paste(frame,(x-display,round(y+194-origin*display*2)),frame)
        draw.text((x-25,y+208),f'frame {index}',fill='#91accb',font=small)
board.save(OUT/'library-run-comparison.png')
metadata = {'candidate':str(base.relative_to(ROOT)/spec['file']),'source':spec['source'],
 'reviewOnly':True,'approvalStatus':'Not established by this audit','note':'Availability and pose comparison only. No verdict or gameplay-fit acceptance inferred from the historical preview.'}
(OUT/'library-run-comparison.json').write_text(json.dumps(metadata,indent=2))
print('Library comparison generated')
