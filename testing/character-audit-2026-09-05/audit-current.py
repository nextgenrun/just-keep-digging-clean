"""Current character source-pixel audit; review outputs only."""
from pathlib import Path
import importlib.util
import json
import statistics
import hashlib
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[1]

def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

audit = load('source_audit', 'testing/2026-08-30-full-player-animation-reaudit.py')
evidence = load('transition_evidence', 'testing/2026-08-30-animation-transition-evidence.py')
inv = json.loads((OUT / 'inventory.json').read_text())
p = json.loads((OUT / 'profile.json').read_text())
manifest = json.loads(audit.MANIFEST_PATH.read_text())
rows = inv['runtimeAnimations']
by_key = {row['key']: row for row in rows}
manifest_omissions = []
for row in rows:
    if row['sheet'] in manifest['sheets']:
        continue
    asset = ROOT / row['assetPath']
    with Image.open(asset) as source:
        cols, grid_rows = source.width // row['frameWidth'], source.height // row['frameHeight']
    used = [r for r in rows if r['sheet'] == row['sheet']]
    count = max(max(r['frameSequence']) for r in used) + 1
    manifest_omissions.append({'sheet': row['sheet'], 'assetPath': row['assetPath'], 'registeredSourceFrames': count})
    manifest['sheets'][row['sheet']] = {
        'file': asset.name, 'frames': count, 'frameSizePx': row['frameWidth'],
        'columns': cols, 'rows': grid_rows,
        'sha256': hashlib.sha256(asset.read_bytes()).hexdigest(),
    }
frames = audit.RuntimeFrames(manifest)
issues = audit.audit_sheet_integrity(manifest, frames)
metrics = [audit.animation_metrics(row, frames) for row in rows]
route_metrics = audit.transition_metrics([(a, b) for a, b in inv['transitionRoutes'] if b], by_key, frames)
k = inv['defaultAnimationKeys']

def pair(label, source, target, source_indices=(-1,), target_indices=(0,), note=None):
    return evidence.transition(audit, frames, by_key, label, source, target, source_indices, target_indices, note)

core = [
    pair('Ordinary walk starts directly from idle', k['idle'], k['walkLoop'], range(by_key[k['idle']]['frames'])),
    pair('Ordinary walk stops directly to idle', k['walkLoop'], k['idle'], range(by_key[k['walkLoop']]['frames'])),
    pair('Ctrl run starts through an authored bridge', k['idle'], k['walkStart'], (0,)),
    pair('Ctrl run start to gait', k['walkStart'], k['walkRun'], (-1,), (7,)),
    pair('Flight loop: last to first', k['fly'], k['fly']),
    pair('Airborne phase directly to flight', k['airborne'], k['fly'], range(by_key[k['airborne']]['frames'])),
    pair('Flight phase directly to falling', k['fly'], k['falling'], range(by_key[k['fly']]['frames'])),
    pair('Hard landing to idle', k['landing'], k['idle']),
    pair('Hard landing early movement exit to walk', k['landing'], k['walkLoop'], (2,), (0,), 'Selector cancellation; game-time proof still required'),
    pair('Crouch exit to idle', k['crouchExit'], k['idle']),
]
held = 'survival-held-torch-v1-'
secondary = [
    pair('Torch start to gait', held+'walkStart-anim', held+'walkLoop-anim', (-1,), (7,)),
    pair('Torch gait to a stop entry', held+'walkLoop-anim', held+'walkStop-anim', range(24)),
    pair('Torch idle to ordinary torch gait', held+'idle-anim', held+'legacyWalkLoop-anim', range(48)),
    pair('Torch flight loop wrap', held+'flight-anim', held+'flight-anim'),
    pair('Falling phase to ledge catch', k['falling'], k['ledgeCatch'], range(by_key[k['falling']]['frames']), note='Controller also eases sprite position; raw pose flag only'),
    pair('Ledge catch to hang', k['ledgeCatch'], k['ledgeHang']),
    pair('Ledge climb to idle', k['ledgeClimb'], k['idle'], note='Controller movement and final world anchor require live checking'),
    pair('Ledge drop to falling', k['ledgeHang'], k['falling']),
    pair('Torch idle to bare-handed Quick Slash', held+'idle-anim', k['quickslash'], range(48), note='No torch binding on this action'),
]
report = {
    'generatedAt': inv['generatedAt'], 'reviewOnly': True, 'productionChanged': False,
    'browserProof': 'Unavailable: browser JavaScript tool timed out even for a trivial diagnostic.',
    'method': 'Exact registered frame order, profile display size/origin, alpha threshold 8. 1-IoU is a pose-change flag, not a quality score. Physics offsets, occlusion, time scale and effects are not simulated.',
    'summary': {**inv['summary'], 'manifestSheets': len(manifest['sheets'])-len(manifest_omissions),
        'manifestSourceFrames': sum(s['frames'] for s in manifest['sheets'].values())-sum(s['registeredSourceFrames'] for s in manifest_omissions),
        'additionalSheetsMeasured': len(manifest_omissions), 'integrityIssues': len(issues)},
    'manifestOmissions': manifest_omissions, 'sheetIssues': issues,
    'animationMetrics': metrics, 'transitions': core+secondary,
    'actionRecoveryMetrics': route_metrics,
}
(OUT/'metrics.json').write_text(json.dumps(report, indent=2)+'\n')
# Smaller boards preserve legibility in the app.
evidence.render_board(audit, OUT/'core-transitions.png', 'CURRENT CLIPS - core pose handoffs (not a gameplay capture)', core[:7], by_key, frames)
evidence.render_board(audit, OUT/'torch-and-ledge.png', 'CURRENT CLIPS - torch and ledge pose flags', secondary, by_key, frames)
font_path = 'C:/Windows/Fonts/segoeui.ttf'
font = ImageFont.truetype(font_path, 15)
small = ImageFont.truetype(font_path, 12)
roles = [('Idle', k['idle']), ('Walk', k['walkLoop']), ('Ctrl run', k['walkRun']),
         ('Jump', k['airborne']), ('Fall', k['falling']), ('Flight', k['fly']),
         ('Side jab', p['complexDigSideAnimationKeys'][0]), ('Down strike', k['digDown']), ('Up strike', k['digUp']),
         ('Quick Slash', k['quickslash']), ('Torch idle', held+'idle-anim'), ('Death source', k['death'])]
board = Image.new('RGB', (1400, 1080), '#0d1727')
draw = ImageDraw.Draw(board)
draw.text((20, 12), 'CURRENT DEFAULT CHARACTER | source frames at profile display size, enlarged copy at 2x', font=font, fill='#eaf2ff')
for n, (label, key) in enumerate(roles):
    row = by_key[key]
    index = row['frames']//2
    x, y = (n % 4)*350, 45+(n//4)*340
    draw.text((x+15,y), label, font=font, fill='#c5dcf8')
    stage = frames.anchored(row,index)
    board.paste(stage, (x+5,y+32), stage)
    size = round(row['displaySizePx'])
    original = frames.cell(row['sheet'], row['frameSequence'][index])
    scaled = original.resize((size,size), Image.Resampling.LANCZOS)
    alpha_bounds = scaled.getchannel('A').getbbox()
    detail = scaled.crop(alpha_bounds)
    detail = detail.resize((detail.width*2,detail.height*2), Image.Resampling.NEAREST)
    board.paste(detail, (x+245-detail.width//2, y+235-detail.height), detail)
    draw.text((x+14,y+274), f"{row['frames']} frames / {row['frameRate']} fps | frame {index}", font=small, fill='#9eb1cc')
board.save(OUT/'character-overview.png')
# This reel concatenates exact source clips. It is explicitly not game-time evidence.
evidence.render_gif(audit, OUT/'source-transition-reel.gif', [core[4],core[5],core[6],secondary[0],secondary[6]], by_key, frames)
print(json.dumps({'summary': report['summary'], 'manifestOmissions': manifest_omissions, 'sheetIssues': issues,
  'transitions': [{'label': r['label'], 'max': r['seamMax'], 'median': r['seamMedian']} for r in core+secondary],
  'notableMetrics': [m for m in metrics if m['key'] in {k['idle'],k['walkLoop'],k['walkRun'],k['fly'],k['death']}]}, indent=2))

