"""EL MAPA: qué carpetas hay, qué pesan, y qué no referencia NADIE.

    python mapa_del_sitio.py            # el mapa por carpetas
    python mapa_del_sitio.py --sueltos  # solo lo gordo que nadie enlaza

⚠️ POR QUÉ EXISTE (1 de agosto de 2026)
`inventario_piezas.py` solo miraba `js/alisa-engine/src/`, o sea los módulos JS
del motor. Por eso dio 66 huérfanos y me quedé tan tranquila… teniendo al lado
`arcade/engines/` con 77 KB de reglas de cartas en Python, la biblioteca de 25
juegos y el banco de pruebas. Un inventario con un punto ciego es peor que no
tener inventario: da la falsa sensación de haber mirado.

Esto no pregunta por un concepto (para eso está `que_tenemos.py`): dibuja el
mapa entero para que salten a la vista las carpetas donde no he entrado nunca.
"""
import pathlib
import re
import sys
from collections import defaultdict

BASE = pathlib.Path(__file__).parent
RAIZ = BASE / "public"
RUIDO = ("node_modules", "__pycache__", ".git", ".playwright-mcp", "OldBackups")
CODIGO = {".js", ".py", ".html", ".json", ".css", ".md"}

# Un fichero está "suelto" si su nombre no aparece en ningún otro fichero.
referencias = defaultdict(int)
ficheros = []

for f in RAIZ.rglob("*"):
    if not f.is_file() or any(r in str(f) for r in RUIDO):
        continue
    if f.suffix.lower() in CODIGO:
        ficheros.append(f)

textos = {}
for f in ficheros:
    try:
        if f.stat().st_size < 2_000_000:
            textos[f] = f.read_text(encoding="utf-8", errors="replace")
    except OSError:
        pass

nombres = {f.name: f for f in ficheros}
for f, txt in textos.items():
    for nombre in set(re.findall(r"[\w\-.]+\.(?:js|py|json|html|css)", txt)):
        if nombre in nombres and nombres[nombre] != f:
            referencias[nombres[nombre]] += 1

if "--sueltos" in sys.argv:
    sueltos = [(f.stat().st_size, f) for f in ficheros
               if referencias[f] == 0 and f.stat().st_size > 6000]
    sueltos.sort(reverse=True)
    print(f"  {len(sueltos)} ficheros de más de 6 KB que NADIE nombra:\n")
    for tam, f in sueltos[:45]:
        # La primera línea de docstring/comentario suele decir qué es.
        pista = ""
        for linea in textos.get(f, "").splitlines()[:12]:
            l = linea.strip(" *#/\"'")
            if len(l) > 25 and not l.startswith(("import", "from", "<!DOCTYPE", "<html")):
                pista = l[:78]; break
        print(f"  {tam//1024:5d}K  {f.relative_to(RAIZ)}")
        if pista:
            print(f"          {pista}")
    raise SystemExit(0)

carpetas = defaultdict(lambda: [0, 0, 0])     # ficheros, bytes, sueltos
for f in ficheros:
    d = f.parent.relative_to(RAIZ)
    c = carpetas[str(d) or "."]
    c[0] += 1; c[1] += f.stat().st_size
    if referencias[f] == 0 and f.stat().st_size > 6000:
        c[2] += 1

print(f"  {len(ficheros)} ficheros de código en public/\n")
print("   fich    tamaño  sueltos  carpeta")
for d, (n, tam, sueltos) in sorted(carpetas.items(), key=lambda x: -x[1][1])[:32]:
    marca = f"  ⚠ {sueltos}" if sueltos else "    ·"
    print(f"  {n:5d}  {tam//1024:6d}K {marca:>8}  {d}")
