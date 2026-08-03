"""Qué piezas del motor existen y cuántas las importan.

El patrón de toda la sesión: hay más motor construido que enchufado. Esto lo
mide en vez de recordarlo — la memoria ya me ha fallado en las dos direcciones
(dar por perdido lo que existía, y dar por existente lo que no).

Primera versión: por cada módulo, buscar su nombre en cada fichero. O(n·m) y no
terminaba. Esta lee cada fichero UNA vez y saca las rutas que importa.

⚠️ Y ESTA HERRAMIENTA ME MINTIÓ (2 ago 2026)
Dijo «22 módulos sin ningún importador, 430 KB de motor sin enchufar» y me lo
creí lo suficiente como para ir a contárselo a Oscar. Falso: cinco de ellos
—`VoxelGlitchFactory`, `CompizEnvironmentFactory`, `TreadmillEnvironmentFactory`,
`MatrioshkaPlugin`, `TrafficEnvironmentFactory`— tenían su laboratorio y lo
importaban tan ricamente.

El motivo: los laboratorios escriben `…/VoxelGlitchFactory.js?v=4`, con el
rompe-cachés detrás, y el patrón exigía que la cadena TERMINARA en `.js`. O sea
que la herramienta no veía justo a los módulos que alguien se molestó en
versionar — los más vivos.

Un inventario que da huérfanos de más es peor que no tenerlo: te manda a
rescatar cosas que ya estaban en casa.
"""
import pathlib
import re
from collections import defaultdict

RAIZ = pathlib.Path(r"Q:\alisa_project\alisa\World\Synthesis\Web\alisa-systems\public")
SRC = RAIZ / "js" / "alisa-engine" / "src"

#: `.js` seguido, opcionalmente, de `?v=4` o `#algo`. Sin esa cola el patrón
#: se saltaba todos los imports versionados.
RE_IMPORT = re.compile(r"""["']([^"']*\.js)(?:\?[^"']*)?(?:#[^"']*)?["']""")

modulos = {}
for p in SRC.rglob("*.js"):
    modulos.setdefault(p.name, []).append(p)

usos = defaultdict(set)
ficheros = [p for p in RAIZ.rglob("*") if p.suffix in (".js", ".html")]
for f in ficheros:
    try:
        txt = f.read_text(encoding="utf-8", errors="replace")
    except OSError:
        continue
    for ruta in RE_IMPORT.findall(txt):
        nombre = ruta.rsplit("/", 1)[-1]
        if nombre in modulos and f not in modulos[nombre]:
            usos[nombre].add(f)

filas = []
for nombre, rutas in modulos.items():
    for ruta in rutas:
        tam = ruta.stat().st_size
        if tam >= 2500:
            filas.append((len(usos[nombre]), tam, str(ruta.relative_to(SRC)).replace("\\", "/")))

filas.sort()
huerfanos = [f for f in filas if f[0] == 0]
print(f"  {len(ficheros)} ficheros escaneados · {len(filas)} modulos > 2.5 KB")
print(f"  SIN NINGUN IMPORTADOR: {len(huerfanos)}  ({sum(f[1] for f in huerfanos)/1024:.0f} KB de motor sin enchufar)\n")
print("  imp   bytes  modulo")
for n, tam, r in filas[:55]:
    print(f"  {n:3d}  {tam:6d}  {r}")
