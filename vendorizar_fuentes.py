#!/usr/bin/env python3
"""
vendorizar_fuentes.py — las tipografías, dentro del paquete
==============================================================================
    python vendorizar_fuentes.py --simulacro
    python vendorizar_fuentes.py

POR QUÉ, Y NO ES SÓLO EL MODO AVIÓN
53 páginas pedían las fuentes a `fonts.googleapis.com`. Eso son dos cosas:

  1. La puerta de la descarga vuelve a ser mentira a medias: sin línea, el
     sitio se ve con las tipografías del sistema.
  2. **Cada visitante le manda su IP a Google sin haberlo elegido.** En la UE
     eso ya ha costado sentencias (Múnich, 2022). Publicamos un producto que
     invita a jugar a desconocidos: no vamos a filtrar su IP de propina.

Se descargan una vez, se guardan en `vendor/fonts/` y se sirven desde casa.

QUÉ SE DESCARGA
Sólo los subconjuntos **latinos**. Google sirve cirílico, griego y vietnamita en
la misma hoja; traerlos sería multiplicar el peso por cinco para nada.
==============================================================================
"""
import re
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PUBLIC = RAIZ / "public"
FUENTES = PUBLIC / "vendor" / "fonts"
HOJA = FUENTES / "fuentes.css"
SIMULACRO = "--simulacro" in sys.argv

#: la unión de todo lo que piden las páginas, en una sola petición por familia
FAMILIAS = [
    "Inter:wght@300;400;500;600;700;800;900",
    "JetBrains+Mono:wght@300;400;500;600;700",
    "Orbitron:wght@400;700;900",
    "Roboto+Mono:wght@400;700",
    "Open+Sans:wght@400;600",
    "Fredoka+One",
    "Press+Start+2P",
    "Share+Tech+Mono",
    "VT323",
]

#: sin esto Google devuelve TTF antiguo en vez de woff2 (mira el User-Agent)
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

RE_BLOQUE = re.compile(r"/\*\s*([\w\-\[\]]+)\s*\*/\s*(@font-face\s*\{[^}]+\})", re.S)
RE_URL = re.compile(r"url\((https://[^)]+\.woff2)\)")


def bajar(url, binario=True):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read() if binario else r.read().decode("utf-8")


def main():
    print("=" * 78)
    print("  VENDORIZAR FUENTES" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 78)

    bloques, ficheros, saltados = [], {}, 0
    for fam in FAMILIAS:
        css = bajar(f"https://fonts.googleapis.com/css2?family={fam}&display=swap", False)
        n = 0
        for subconjunto, bloque in RE_BLOQUE.findall(css):
            if not subconjunto.startswith("latin"):
                saltados += 1
                continue
            m = RE_URL.search(bloque)
            if not m:
                continue
            url = m.group(1)
            nombre = re.sub(r"[^\w\.\-]", "_", url.rsplit("/", 2)[-2] + "_" + url.rsplit("/", 1)[-1])
            ficheros[nombre] = url
            bloques.append(RE_URL.sub(f"url(./{nombre})", bloque))
            n += 1
        print(f"   {n:2d} cortes latinos   {fam.split(':')[0].replace('+', ' ')}")

    print(f"\n   {len(ficheros)} ficheros woff2 · {saltados} cortes no latinos descartados")

    if SIMULACRO:
        print("\n  SIMULACRO — no se ha escrito nada.")
        return 0

    FUENTES.mkdir(parents=True, exist_ok=True)
    total = 0
    for nombre, url in ficheros.items():
        d = FUENTES / nombre
        if not d.exists():
            d.write_bytes(bajar(url))
        total += d.stat().st_size
    HOJA.write_text(
        "/* Las tipografías del sitio, servidas desde casa.\n"
        "   Generado por `vendorizar_fuentes.py` — no se edita a mano.\n"
        "   Están aquí para que el motor funcione sin conexión y para no\n"
        "   mandarle la IP de quien juega a un tercero. */\n\n"
        + "\n\n".join(bloques) + "\n", encoding="utf-8")
    print(f"   vendor/fonts/  →  {total/1024:,.0f} KB + la hoja")

    # ── reescribir las páginas ───────────────────────────────────────
    RE_LINK = re.compile(
        r"[ \t]*<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>[ \t]*\n?", re.I)
    NUESTRO = '<link rel="stylesheet" href="/vendor/fonts/fuentes.css">\n'
    # ⚠️ No todo el mundo enlaza con <link>. Media docena de páginas lo mete
    # como `@import url(...)` dentro de un <style>, y un `.css` del arcade
    # también. Buscar sólo la etiqueta dejaba cinco fugas a Google abiertas.
    RE_IMPORT = re.compile(
        r"@import\s+url\(['\"]?https?://fonts\.googleapis\.com[^)]*\);?", re.I)

    tocadas = 0
    for p in list(PUBLIC.rglob("*.html")) + list(PUBLIC.rglob("*.css")):
        if "vendor" in p.parts or "node_modules" in p.parts:
            continue
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if not (RE_LINK.search(txt) or RE_IMPORT.search(txt)):
            continue
        nuevo = RE_IMPORT.sub("@import url('/vendor/fonts/fuentes.css');", txt)
        tenia_link = bool(RE_LINK.search(nuevo))
        nuevo = RE_LINK.sub("", nuevo)
        if tenia_link and "/vendor/fonts/fuentes.css" not in nuevo:
            if "</head>" in nuevo:
                nuevo = nuevo.replace("</head>", NUESTRO + "</head>", 1)
            else:
                nuevo = NUESTRO + nuevo
        p.write_text(nuevo, encoding="utf-8")
        tocadas += 1
    print(f"   {tocadas} páginas ya no llaman a Google")
    return 0


if __name__ == "__main__":
    sys.exit(main())
