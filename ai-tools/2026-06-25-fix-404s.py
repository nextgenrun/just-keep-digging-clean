#!/usr/bin/env python3
"""Fix all 404-causing import paths found during live testing."""
import os, re

BASE = os.path.dirname(__file__)

FIXES = {
    # Fix values/constants.js -> values/gameConfig.js
    r'"\.\./\.\./values/constants\.js"': '"../../values/gameConfig.js"',
    r'"\.\./values/constants\.js"': '"../values/gameConfig.js"',
    r'"\.\./\.\./\.\./values/constants\.js"': '"../../../values/gameConfig.js"',
    # Fix values/audio/audioConfig.js -> values/audioConfig.js
    r'"\.\./\.\./values/audio/audioConfig\.js"': '"../../values/audioConfig.js"',
    r'"\.\./values/audio/audioConfig\.js"': '"../values/audioConfig.js"',
    # Fix values/input/keybindActions.js -> values/keybindActions.js
    r'"\.\./\.\./values/input/keybindActions\.js"': '"../../values/keybindActions.js"',
    r'"\.\./values/input/keybindActions\.js"': '"../values/keybindActions.js"',
    # Fix values/ui/uiColors.js -> values/uiColors.js
    r'"\.\./\.\./values/ui/uiColors\.js"': '"../../values/uiColors.js"',
    r'"\.\./values/ui/uiColors\.js"': '"../values/uiColors.js"',
    # Fix ui/overlays/PhaserUiKit.js -> ui/PhaserUiKit.js
    r'"\.\./\.\./ui/overlays/PhaserUiKit\.js"': '"../../ui/PhaserUiKit.js"',
    r'"\.\./ui/overlays/PhaserUiKit\.js"': '"../ui/PhaserUiKit.js"',
}

def fix_file(filepath):
    ext = os.path.splitext(filepath)[1]
    if ext != '.js':
        return False
    
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    original = content
    for pattern, replacement in FIXES.items():
        content = re.sub(pattern, replacement, content)
    
    if content != original:
        rel = os.path.relpath(filepath, BASE)
        print(f"  FIXED: {rel}")
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    count = 0
    for root, dirs, files in os.walk(BASE):
        # Skip node_modules, git, archive
        if any(skip in root for skip in ['node_modules', '.git', 'archive', '_ssh-git', '__pycache__']):
            continue
        for f in files:
            if f.endswith('.js'):
                filepath = os.path.join(root, f)
                if fix_file(filepath):
                    count += 1
    print(f"\nFixed {count} files.")

if __name__ == '__main__':
    main()