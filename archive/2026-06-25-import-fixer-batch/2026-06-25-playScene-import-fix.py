import os
ROOT = r'c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned\js'
ps = os.path.join(ROOT, 'world', 'playScene')

fixed = []

for fn in os.listdir(ps):
    if not fn.endswith('.js'):
        continue
    fp = os.path.join(ps, fn)
    c = open(fp, 'r', encoding='utf-8').read()
    orig = c

    # Fix ../../../systems/ -> ../../systems/ (depth change after restructure)
    c = c.replace('../../../systems/', '../../systems/')

    # Fix ../../PlayerController -> ../../player/PlayerController
    c = c.replace('../../PlayerController.js', '../../player/PlayerController.js')

    # Fix ../../TileCollision -> ../../systems/mining/TileCollision
    c = c.replace('../../TileCollisionSystem.js', '../../systems/mining/TileCollisionSystem.js')

    if c != orig:
        open(fp, 'w', encoding='utf-8').write(c)
        fixed.append(fn)
        print('Fixed:', fn)

print('Fixed ' + str(len(fixed)) + ' playScene files')
</content-file>
</write_to_file>