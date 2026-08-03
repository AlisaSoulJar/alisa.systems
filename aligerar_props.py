#!/usr/bin/env python3
"""
aligerar_props.py — que el repositorio pese lo que se juega
==============================================================================
    python aligerar_props.py --simulacro
    python aligerar_props.py

QUÉ HACE
Aparta a `_archivo/props_sin_usar/` todo recurso de `public/props/` que
**`empaquetar.py` no mete en el paquete**. No inventa criterio propio: usa
exactamente el mismo, para que no puedan divergir.

POR QUÉ
El paquete son 65 MB; el repositorio, 1.079. La diferencia es una biblioteca de
taller: 173 MB de formatos que un navegador no abre (`.blend`, `.fbx`, `.obj`) y
433 MB de modelos que no carga ninguna demo. Nadie clona eso — y quien lo clone
no encuentra el proyecto entre los muebles.

⚠️ NADA SE BORRA. Va a `_archivo/`, fuera de `public/`, con la estructura de
carpetas intacta. Volver a meter un modelo es moverlo de vuelta. Regla de la
casa, y viene de un `git clean` que se llevó trabajo sin versionar.
==============================================================================
"""
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PROPS = RAIZ / "public" / "props"
DESTINO = RAIZ / "_archivo" / "props_sin_usar"
SIMULACRO = "--simulacro" in sys.argv

# El mismo criterio que el paquete, importado — no copiado.
sys.path.insert(0, str(RAIZ))
import empaquetar as emp


def main():
    if not PROPS.is_dir():
        sys.exit("  no encuentro public/props/")

    citados = emp.nombrados()
    citados |= emp.acompanantes(citados)
    vivas = emp.carpetas_citadas()
    plantillas = emp.patrones_citados()

    viajan, fuera, mb_v, mb_f = [], [], 0.0, 0.0
    for p in PROPS.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(RAIZ / "public")
        ext = p.suffix.lower()
        carpeta = str(rel.parent).replace("\\", "/")
        mb = p.stat().st_size / 1024 / 1024

        # Igual que en el paquete: formato de taller, o nadie lo nombra.
        de_taller = ext in emp.TALLER or (ext not in emp.WEB and ext)
        sin_usar = (ext in emp.PESADOS and p.name.lower() not in citados
                    and carpeta not in vivas
                    and not any(rx.match(p.name) for rx in plantillas))

        if de_taller or sin_usar:
            fuera.append(p); mb_f += mb
        else:
            viajan.append(p); mb_v += mb

    print("=" * 74)
    print("  ALIGERAR PROPS" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 74)
    print(f"  se quedan en public/props: {len(viajan):5,} ficheros · {mb_v:7,.1f} MB")
    print(f"  se apartan a _archivo/:    {len(fuera):5,} ficheros · {mb_f:7,.1f} MB")

    porext = {}
    for p in fuera:
        e = p.suffix.lower() or "(sin extensión)"
        porext[e] = porext.get(e, [0, 0.0])
        porext[e][0] += 1
        porext[e][1] += p.stat().st_size / 1024 / 1024
    print("\n  lo que se aparta, por formato:")
    for e, (n, mb) in sorted(porext.items(), key=lambda x: -x[1][1])[:10]:
        print(f"    {e:<8} {n:5,} · {mb:7,.1f} MB")

    if SIMULACRO:
        print("\n  SIMULACRO — no se ha movido nada.")
        return 0

    for p in fuera:
        d = DESTINO / p.relative_to(PROPS)
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(p), str(d))

    # Carpetas que se quedan vacías: se retiran, pero el contenido ya está a salvo.
    for d in sorted(PROPS.rglob("*"), key=lambda x: -len(x.parts)):
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()

    print(f"\n  {len(fuera):,} ficheros apartados. `public/props/` queda en {mb_v:,.1f} MB.")
    print("  Siguiente: `npm test` y abrir la sala y el shmup.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
