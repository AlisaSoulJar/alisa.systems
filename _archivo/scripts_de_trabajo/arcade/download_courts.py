import urllib.request
from PIL import Image
import io
import os

COURTS_DIR = r"q:\alisa_project\alisa\World\Web\arcade\assets\cards\courts"
os.makedirs(COURTS_DIR, exist_ok=True)

# French standard codes for Deck Of Cards API
codes = [
    ('S', 'J'), ('S', 'Q'), ('S', 'K'),
    ('H', 'J'), ('H', 'Q'), ('H', 'K'),
    ('D', 'J'), ('D', 'Q'), ('D', 'K'),
    ('C', 'J'), ('C', 'Q'), ('C', 'K')
]

print("🃏 Descargando assets oficiales de casino...")

for suit, rank in codes:
    url = f"https://deckofcardsapi.com/static/img/{rank}{suit}.png"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = response.read()
        
        # Load image
        img = Image.open(io.BytesIO(data))
        
        # The cards are 226 x 314. The center portrait is roughly bordered.
        # We will crop the center rectangle to get just the art and not the numbers.
        w, h = img.size
        left = int(w * 0.18)
        right = int(w * 0.82)
        top = int(h * 0.15)
        bottom = int(h * 0.85)
        
        # Crop the portrait and resize to standard WebP portrait frame
        portrait = img.crop((left, top, right, bottom)).resize((196, 256), Image.Resampling.LANCZOS)
        
        # Save directly as WebP
        filename = f"{suit}_{rank}.webp"
        filepath = os.path.join(COURTS_DIR, filename)
        portrait.save(filepath, "WEBP", quality=85)
        print(f"✅ {filename} descargada, recortada y comprimida ({os.path.getsize(filepath)//1024}KB)")
        
    except Exception as e:
        print(f"❌ Error con {rank}{suit}: {e}")

print("✨ Proceso completado. Assets listos.")
