import xml.etree.ElementTree as ET

tree = ET.parse(r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\exports\dig-game-world-edit-v-7-29-06-2026-;layered.tmx')
root = tree.getroot()

print('Map:', root.attrib['width'], 'x', root.attrib['height'])
print()

print('=== TILESETS ===')
for ts in root.findall('tileset'):
    source = ts.attrib.get('source', 'inline')
    print(f'  firstgid={ts.attrib["firstgid"]:>5}  source={source}')

print()
print('=== TILE LAYERS ===')
for layer in root.findall('layer'):
    data_el = layer.find('data')
    encoding = data_el.attrib.get('encoding', 'none')
    compression = data_el.attrib.get('compression', 'none')
    print(f'  name={layer.attrib["name"]:40s} w={layer.attrib["width"]:>4} h={layer.attrib["height"]:>4} encoding={encoding} compression={compression}')

print()
print('=== OBJECT GROUPS ===')
for og in root.findall('objectgroup'):
    visible = og.attrib.get('visible', '1')
    locked = og.attrib.get('locked', '0')
    obj_count = len(og.findall('object'))
    print(f'  name={og.attrib["name"]:40s} visible={visible:>1} locked={locked:>1} objects={obj_count}')