"""Measure authored raster bounds and emit JSON; never modify source pixels."""
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / 'sprites/UI/baked-stars-talents-v2'

def pixels(name):
    return np.asarray(Image.open(ART / name).convert('RGB'))

def bands(counts, minimum, gap=8):
    positions = np.where(counts > minimum)[0]
    groups = []
    for position in positions:
        if not groups or position - groups[-1][-1] > gap:
            groups.append([int(position)])
        else:
            groups[-1].append(int(position))
    return [(group[0], group[-1] + 1) for group in groups if len(group) > 8]

def bounds(data, region, gold=False, pad=3):
    x, y, w, h = region
    crop = data[y:y+h, x:x+w].astype(float)
    mask = ((crop[:,:,0] > 115) & (crop[:,:,1] > 82)
            & (crop[:,:,0] > crop[:,:,1] * 1.06)
            & (crop[:,:,1] > crop[:,:,2] * 1.18)) if gold else crop.max(axis=2) > 65
    ys, xs = np.where(mask)
    return [x + int(xs.min()) - pad, y + int(ys.min()) - pad,
            int(xs.max() - xs.min()) + pad*2+1, int(ys.max() - ys.min()) + pad*2+1]

result = {'talents': {}, 'stars': {}, 'labels': [], 'messages': []}
rows = {
    'wayward': ([[27,322],[409,689],[772,1043],[1123,1409]], [[325,395],[691,763],[1045,1114],[1414,1487]]),
    'hollow': ([[27,325],[414,700],[787,1080],[1162,1447]], [[328,396],[707,779],[1084,1153],[1458,1523]]),
    'lance': ([[23,326],[421,720],[806,1092],[1173,1442]], [[333,411],[723,795],[1095,1165],[1453,1517]]),
}
for name, (faces, titles) in rows.items():
    data = pixels(f'talents-{name}.png')
    entries = []
    for row in range(4):
        for col in range(3):
            x, end = [8,348,677,1018][col:col+2]
            fy, fe = faces[row]
            ty, te = titles[row]
            entries.append({'face': bounds(data, [x,fy,end-x,fe-fy]),
                            'title': bounds(data, [x,ty,end-x,te-ty]),
                            'name': bounds(data, [x+18,ty+14,end-x-36,te-ty-25], gold=True)})
    result['talents'][name] = entries

star_grid = {
    'common': ([88,243,398,552,706,861,1015,1169,1323,1477], [91,239,386,535,682,831], 151,144),
    'uncommon': ([97,253,407,563,719,875,1032,1187,1342,1497], [101,268,434,598,764], 153,160),
    'rare': ([88,244,396,550,703,857,1012,1167,1324,1478], [95,253,425,598,771], 150,158),
    'epic': ([87,247,406,568,727,887,1047,1207,1367,1524], [144,343,542,741], 158,185),
    'mythic': ([134,354,572,794,1014,1234], [124,314,504,697,888], 207,184),
    'astral': ([165,428,695,965,1235], [173,424,676,928], 254,243),
}
for name, (centers_x, centers_y, cell_width, cell_height) in star_grid.items():
    data = pixels(f'stars-{name}.png')
    entries = []
    for y in centers_y:
        for x in centers_x:
            entries.append(bounds(data, [round(x-cell_width/2),round(y-cell_height/2),cell_width,cell_height], pad=2))
    result['stars'][name] = entries

data = pixels('labels.png')
for row, (y, h) in enumerate([(43,115),(190,117),(339,111),(487,115),(638,115),(787,114)]):
    for x,w in [(28,367),(419,351),(789,348),(1155,353)]:
        result['labels'].append({'plaque':[x-2,y-2,w+4,h+4],
                                 'glyph': bounds(data,[x+26,[80,229,375,530,680,824][row],w-52,[43,42,40,38,38,44][row]],gold=True)})
data = pixels('messages.png')
message_regions = [[76,201,380,60],[605,194,322,126],[79,506,385,200],[557,487,418,275],
                   [64,880,399,246],[557,886,414,239],[75,1250,386,162],[573,1259,382,154]]
for row,(y,h) in enumerate([(69,352),(454,355),(840,330),(1204,249)]):
    for x,w in [(16,485),(525,484)]:
        result['messages'].append({'card':[x,y,w,h],
                                  'glyph':bounds(data,message_regions[len(result['messages'])],gold=True)})
target = ROOT / 'testing/2026-09-06-baked-copy/celestial-frame-measurements.json'
target.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(json.dumps({key:{name:len(entries) for name,entries in value.items()} if isinstance(value,dict) else len(value) for key,value in result.items()}))
