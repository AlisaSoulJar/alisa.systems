#!/usr/bin/env python3
"""
reparar_rutas_legacy.py — los juegos no eran obsoletos: estaban desenchufados
==============================================================================
    python reparar_rutas_legacy.py --simulacro
    python reparar_rutas_legacy.py

QUÉ PASÓ
Oscar dijo haber visto «juegos con acabados increíbles que hemos perdido o
dejado obsoletos». Buscando en los respaldos —incluido `H:\\ALISA_BACKUPS`, 710
páginas que el atlas nunca ha visto porque sólo escanea `Q:`— resultó que los
juegos no estaban en ningún otro sitio: **estaban aquí, en `legacy/`**.

Y no estaban obsoletos. `asteroids_v3_legacy.html` pide
`props/models/Rock_1.glb` **sin `../`**, porque se escribió cuando vivía un
nivel más arriba. Al moverlo a `legacy/` cada ruta pasó a apuntar a
`legacy/props/…`, que no existe: dieciocho errores 404 y un juego sin nave, sin
rocas y sin dron.

Ocho páginas, entre 40 y 130 KB cada una —trabajo de verdad, terminado— rotas
por un traslado de carpeta. Nadie lo vio porque nadie las abría.

⚠️ LA LECCIÓN, QUE ES LA CARA
Un juego «obsoleto» y un juego con las rutas mal se ven exactamente igual desde
fuera: una pantalla a medias. Sólo se distinguen abriéndolo. Llevábamos meses
dando por perdido lo segundo creyendo que era lo primero.
==============================================================================
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
LEGACY = RAIZ / "public" / "legacy"
PUBLIC = RAIZ / "public"
SIMULACRO = "--simulacro" in sys.argv

#: carpetas que viven en la raíz de `public/` y que estas páginas piden como si
#: siguieran a su lado
CARPETAS = ("props", "textures", "js", "data", "assets", "css")

RE_RUTA = re.compile(
    r"""(['"`])((?:%s)/[^'"`]*)\1""" % "|".join(CARPETAS))

#: ⚠️ Y las que se arman con plantilla: `` `props/models/Rock_${i}.glb` ``.
#: La primera versión sólo miraba cadenas entrecomilladas y dejó las siete
#: rocas rotas — el mismo disfraz que ya me engañó en `empaquetar.py`. Una ruta
#: construida en ejecución es invisible para cualquier herramienta que lea el
#: código, incluida esta.
RE_PLANTILLA = re.compile(
    r"`((?:%s)/[^`\n]*\$\{[^`\n]*)`" % "|".join(CARPETAS))


def main():
    print("=" * 74)
    print("  REPARAR RUTAS DE LEGACY" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 74)

    total, tocados = 0, 0
    for p in sorted(LEGACY.glob("*.html")):
        txt = original = p.read_text(encoding="utf-8", errors="ignore")
        arregladas, rotas = [], []

        for m in RE_RUTA.finditer(original):
            ruta = m.group(2)
            # ¿existe donde apunta ahora? entonces no se toca.
            if (LEGACY / ruta).exists():
                continue
            # ¿existe un nivel más arriba? entonces era eso.
            if (PUBLIC / ruta).exists():
                arregladas.append(ruta)
                txt = txt.replace(m.group(0),
                                  m.group(0).replace(ruta, "../" + ruta, 1))
            else:
                rotas.append(ruta)

        # Las de plantilla: no se puede comprobar el fichero exacto, así que se
        # mira si la CARPETA existe un nivel arriba y no aquí.
        for m in RE_PLANTILLA.finditer(original):
            ruta = m.group(1)
            carpeta = ruta.split("/")[0]
            if (LEGACY / carpeta).exists() or not (PUBLIC / carpeta).exists():
                continue
            arregladas.append(ruta + "   (plantilla)")
            txt = txt.replace(m.group(0), "`../" + ruta + "`")

        if arregladas or rotas:
            print(f"\n  {p.name}")
            for r in arregladas:
                print(f"     ✔ ../{r}")
            for r in rotas:
                # Se dice, no se inventa: puede que ese recurso ya no exista.
                print(f"     ✘ {r}  (no está ni aquí ni un nivel arriba)")
        total += len(arregladas)
        if txt != original:
            tocados += 1
            if not SIMULACRO:
                p.write_text(txt, encoding="utf-8")

    print(f"\n  {total} rutas reparadas en {tocados} páginas")
    if SIMULACRO:
        print("  SIMULACRO — no se ha escrito nada.")
    else:
        print("  Siguiente: abrirlas UNA A UNA. Que carguen no es que se jueguen.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
