from PIL import Image
import shutil, os

BASE = os.path.dirname(os.path.abspath(__file__))

# Match dig sprites to idle canvas size so Phaser's setDisplaySize(89,89)
# renders both at the same on-screen size.
ref_path = os.path.join(BASE, "character-movement/movement-bare-hands/idle/idle-1.png")
with Image.open(ref_path) as ref:
    target_w, target_h = ref.size   # 1024x1024
print(f"Target canvas (from idle-1.png): {target_w}x{target_h}")

targets = [
    "digging/digging-bare-hand/dig-left/dig-1.png",
    "digging/digging-bare-hand/dig-right/dig-1.png",
]

for rel_path in targets:
    path = os.path.join(BASE, rel_path)
    backup = path.replace(".png", "_original.png")

    # Always restore from the true original before processing
    if os.path.exists(backup):
        shutil.copy2(backup, path)
        print(f"\nRestored from backup: {rel_path}")
    else:
        shutil.copy2(path, backup)
        print(f"\nCreated backup: {os.path.basename(backup)}")

    with Image.open(path) as img:
        img = img.convert("RGBA")
        orig_w, orig_h = img.size
        print(f"  Original canvas: {orig_w}x{orig_h}")

        # Resize entire sprite (character + dust effects) to target canvas
        resized = img.resize((target_w, target_h), Image.LANCZOS)
        resized.save(path)
        print(f"  Saved at: {target_w}x{target_h}")

print("\nDone.")
