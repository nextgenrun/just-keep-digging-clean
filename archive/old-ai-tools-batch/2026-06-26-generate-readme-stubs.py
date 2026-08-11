"""
Generate minimal readme.md stubs for all directories that lack one.
Skips deeply nested asset directories (sprites/ subdirectories with only images).
"""
import os
import pathlib

BASE = pathlib.Path(r"c:\xampp\_Backups\dig-game-simple\dig-game-dev-env-cleaned")

# Directories to skip (too deep, asset-only, or temporary)
SKIP_PATTERNS = [
    "sprites/character/",
    "sprites/npc/",
    "sprites/tiles/",
    "sprites/backgrounds/",
    "sprites/UI/",
    "sprites/constellations/",
    "sprites/branding/",
    "sprites/external-reference/",
    "sprites/infinite-loops/",
    "sprites/maps/",
    "sprites/previews/",
    "sprites/tiled-authoring-examples/",
    "sound/soundEffects/",
    "sound/voice-lines/",
    "sound/library-v2/SoundLibrary_Review/",
    "back-ups-dig-game/",
    "dig-game-dev-env/",
    "dig-game-dev-env-cleaned-2/",
    "live-push-version-compressed/",
]

def should_skip(rel_path):
    for pattern in SKIP_PATTERNS:
        if (rel_path + "/").startswith(pattern):
            return True
    return False

def dir_has_content(d):
    """Check if dir has any .js, .py, .md, .json, .html, or .css files (not just images/sounds)"""
    for f in d.iterdir():
        if f.is_file() and f.suffix.lower() in {'.js', '.py', '.md', '.json', '.html', '.css', '.txt', '.bat', '.ps1', '.vbs'}:
            return True
        elif f.is_dir() and dir_has_content(f):
            return True
    return False

def generate_readme(dir_path, rel_path):
    """Generate a minimal readme.md based on directory purpose."""
    name = dir_path.name
    
    # Determine directory type
    if "systems/" in rel_path:
        content = f"# {name.replace('-', ' ').title()}\n\nGame system — {name}."
    elif "world/" in rel_path:
        content = f"# {name.replace('-', ' ').title()}\n\nWorld layer module — {name}."
    elif "ui/" in rel_path:
        content = f"# {name.replace('-', ' ').title()}\n\nUI module — {name}."
    elif "values" in rel_path:
        content = f"# Values\n\nSingle Source of Truth — ALL numeric/string/config values."
    elif "dynamic-systems" in rel_path:
        content = f"# {name.replace('-', ' ').title()}\n\nDynamic system — {name}."
    else:
        content = f"# {name.replace('-', ' ').title()}\n\n{name} directory."
    
    return content + "\n"

total = 0
skipped = 0

for dirpath, dirnames, filenames in os.walk(BASE):
    d = pathlib.Path(dirpath)
    rel = str(d.relative_to(BASE)).replace("\\", "/")
    
    if rel == ".":
        continue
    
    if should_skip(rel):
        skipped += 1
        continue
    
    # Skip if readme.md already exists
    if (d / "readme.md").exists():
        continue
    
    # Only generate for directories with meaningful content
    if not dir_has_content(d) and not d.name in {"systems", "world", "ui", "values", "sound", "testing", "css", "libs"}:
        continue
    
    content = generate_readme(d, rel)
    (d / "readme.md").write_text(content, encoding="utf-8")
    total += 1
    print(f"  Created: {rel}/readme.md")

print(f"\nDone! Created {total} readme.md files, skipped {skipped} asset directories.")