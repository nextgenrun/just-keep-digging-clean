"""Quick sanity check for changed JS files: balanced brackets, terminated strings."""
import sys

FILES = [
    'values/comboConfig.js',
    'values/postFxConfig.js',
    'values/gamefeel.js',
    'values/materialFeedback.js',
    'values/ambientParticleConfig.js',
    'values/depthMilestones.js',
    'values/depthCinematicConfig.js',
    'values/hudJuiceConfig.js',
    'systems/visual/PostFxSystem.js',
    'systems/visual/PlayerBodyLanguageSystem.js',
    'systems/visual/DepthMilestoneCinematic.js',
    'systems/visual/HUDSystem.js',
    'systems/environment/AmbientParticleSystem.js',
    'systems/mining/DigSystem.js',
    'sound/SoundSystem.js',
    'world/playScene/PlaySceneGameplay.js',
    'world/playScene/PlaySceneSetup.js',
    'world/playScene/PlaySceneUpdate.js',
]

PAIRS = {')': '(', ']': '[', '}': '{'}

def check(path):
    src = open(path, encoding='utf-8').read()
    stack = []
    i, n = 0, len(src)
    line = 1
    in_str = None  # quote char or '`'
    in_line_comment = False
    in_block_comment = False
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ''
        if c == '\n':
            line += 1
            if in_line_comment:
                in_line_comment = False
            if in_str in ('"', "'"):
                return f"{path}: unterminated string at line {line - 1}"
            i += 1
            continue
        if in_line_comment:
            i += 1
            continue
        if in_block_comment:
            if c == '*' and nxt == '/':
                in_block_comment = False
                i += 2
                continue
            i += 1
            continue
        if in_str:
            if c == '\\':
                i += 2
                continue
            if c == in_str:
                in_str = None
            i += 1
            continue
        if c == '/' and nxt == '/':
            in_line_comment = True
            i += 2
            continue
        if c == '/' and nxt == '*':
            in_block_comment = True
            i += 2
            continue
        if c in ('"', "'", '`'):
            in_str = c
            i += 1
            continue
        if c in '([{':
            stack.append((c, line))
        elif c in ')]}':
            if not stack or stack[-1][0] != PAIRS[c]:
                return f"{path}: unbalanced '{c}' at line {line}"
            stack.pop()
        i += 1
    if stack:
        return f"{path}: unclosed '{stack[-1][0]}' opened at line {stack[-1][1]}"
    if in_str:
        return f"{path}: unterminated template/string at EOF"
    if in_block_comment:
        return f"{path}: unterminated block comment"
    return None

fails = 0
for f in FILES:
    err = check(f)
    if err:
        print("FAIL", err)
        fails += 1
    else:
        print("OK  ", f)
sys.exit(1 if fails else 0)