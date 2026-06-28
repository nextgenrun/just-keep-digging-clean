import os

ROOT = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'js')
fixes = 0

for d, _, fs in os.walk(ROOT):
    for f in fs:
        if not f.endswith('.js'):
            continue
        fp = os.path.join(d, f)
        c = open(fp, 'r', encoding='utf-8').read()
        orig = c

        # Fix stale values/subdir/ imports (files are flat in values/)
        for sub in ['player/', 'core/', 'ui/', 'world/', 'mining/',
                     'audio/', 'input/', 'combo/', 'weather/', 'lighting/',
                     'gamefeel/', 'gem-power/', 'upgrades/', 'resources/',
                     'shaders/', 'shadowMiner/', 'abilities/', 'progression/']:
            c = c.replace('values/' + sub, 'values/')

        # Fix world/systems/ -> systems/
        c = c.replace('world/systems/', 'systems/')

        # Fix ui/scenes files importing from ui/ui/ pattern
        rel = os.path.relpath(fp, ROOT)
        if rel.startswith('ui' + os.sep + 'scenes'):
            c = c.replace('../ui/PhaserUiKit', '../PhaserUiKit')
            c = c.replace('../ui/SettingsPanelContent', '../SettingsPanelContent')
            c = c.replace('./shared/', '../shared/')

        if c != orig:
            open(fp, 'w', encoding='utf-8').write(c)
            fixes += 1
            print('Fixed: ' + rel)

print(str(fixes) + ' files fixed')
