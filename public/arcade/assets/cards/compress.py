"""Compress court card PNGs to small WebP files for the card engine."""
from PIL import Image
import os

COURTS_DIR = os.path.join(os.path.dirname(__file__), "courts")

for f in os.listdir(COURTS_DIR):
    if f.endswith(".png"):
        src = os.path.join(COURTS_DIR, f)
        dst = os.path.join(COURTS_DIR, f.replace(".png", ".webp"))
        img = Image.open(src).resize((196, 256))
        img.save(dst, "WEBP", quality=75)
        
        orig_kb = os.path.getsize(src) // 1024
        new_kb = os.path.getsize(dst) // 1024
        print(f"  {f}: {orig_kb}KB -> {f.replace('.png','.webp')}: {new_kb}KB ({100*new_kb//orig_kb}%)")

print("\nDone!")
