import xml.etree.ElementTree as ET

# New TMX
tree1 = ET.parse(r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\exports\dig-game-world-edit-v-5-26-06-2026.tmx')
root1 = tree1.getroot()
print('=== OLD TMX (v5) ===')
print('Map:', root1.attrib['width'], 'x', root1.attrib['height'])
print('Tilesets:')
for ts in root1.findall('tileset'):
    print(f'  firstgid={ts.attrib["firstgid"]:>5}  source={ts.attrib.get("source", "inline")}')
print('Tile Layers:')
for layer in root1.findall('layer'):
    print(f'  name={layer.attrib["name"]}  w={layer.attrib["width"]}  h={layer.attrib["height"]}')
print('Object Groups:')
for og in root1.findall('objectgroup'):
    print(f'  name={og.attrib["name"]}  objs={len(og.findall("object"))}')

print()
print('=== NEW TMX (v7 layered) ===')
tree2 = ET.parse(r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\exports\dig-game-world-edit-v-7-29-06-2026-;layered.tmx')
root2 = tree2.getroot()
print('Map:', root2.attrib['width'], 'x', root2.attrib['height'])
print('Tilesets:')
for ts in root2.findall('tileset'):
    print(f'  firstgid={ts.attrib["firstgid"]:>5}  source={ts.attrib.get("source", "inline")}')
print('Tile Layers:')
for layer in root2.findall('layer'):
    print(f'  name={layer.attrib["name"]}  w={layer.attrib["width"]}  h={layer.attrib["height"]}')
print('Object Groups:')
for og in root2.findall('objectgroup'):
    print(f'  name={og.attrib["name"]}  objs={len(og.findall("object"))}')