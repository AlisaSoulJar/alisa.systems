#!/usr/bin/env python3
"""
vendorizar.py — meter three DENTRO del paquete, para que la descarga sea verdad
==============================================================================
    python vendorizar.py --simulacro   # qué haría, sin tocar nada
    python vendorizar.py               # lo hace

⚠️ POR QUÉ EXISTE (2 de agosto de 2026)

Prometemos dos puertas: jugar en la web, o **descargarte el motor y jugar en
local**. Medido antes de escribir esto:

    92 páginas cargaban `three` desde un CDN.   2 desde `node_modules`.

O sea: te descargas el motor, te quedas sin línea y se caen 92 páginas. La
segunda puerta estaba anunciada y no existía. Y no es sólo el modo avión: un
CDN es un tercero que puede caerse, cambiar o desaparecer, en un motor que
presume de no necesitar a nadie.

Y de camino salieron dos cosas que ya estaban rotas EN PRODUCCIÓN:

  · tres páginas de `legacy/` piden `three@0.160.0/examples/js/…`, que da **404**
    hoy mismo: r160 dejó de publicar la carpeta `examples/js` (las clásicas).
    Alguien reemplazó `0.128.0`→`0.160.0` a ciegas y nadie volvió a abrirlas.
  · había DOS copias de three en disco —r160 dentro de `src/node_modules` y r170
    en `alisa-engine/node_modules`— que son exactamente las dos versiones que
    piden las páginas. Estuve a punto de borrar la carpeta que contenía justo lo
    que hacía falta.

CÓMO
----
No se copia el paquete npm entero (26 MB, 1.074 ficheros) para usar 19 addons.
Se sigue la **cadena de imports**: de cada addon que la web usa de verdad, se
leen sus `import`, y los de esos, hasta cerrar. `EffectComposer` sólo arrastra
`Pass`, `CopyShader` y `ShaderPass`; no los 555 ficheros de `examples/jsm`.

Las rutas quedan **absolutas** (`/vendor/three-0.160.0/…`) porque las páginas
viven a profundidades distintas (`public/`, `labs/`, `rooms/`, `arcade/`) y la
raíz que sirve el servidor es `public/` tanto en local como en Cloudflare Pages.
==============================================================================
"""
import re
import shutil
import sys
import urllib.request
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PUBLIC = RAIZ / "public"
VENDOR = PUBLIC / "vendor"
SIMULACRO = "--simulacro" in sys.argv

#: de dónde sale cada familia de módulos. Ya están en disco: no se descarga nada.
ORIGENES = {
    "0.160.0": PUBLIC / "js/alisa-engine/src/node_modules/three",
    "0.170.0": PUBLIC / "js/alisa-engine/node_modules/three",
}

#: los ficheros sueltos de `build/` que alguna página pide por su nombre
BUILDS = {
    "0.160.0": ["three.module.js", "three.module.min.js", "three.min.js"],
    "0.170.0": ["three.module.js", "three.module.min.js", "three.webgpu.js"],
}

#: las páginas clásicas (script global, sin módulos) usan r128, que no está en
#: disco. Son cuatro ficheros y se fijan a la versión exacta que ya pedían.
DESCARGAS = {
    "three-r128/three.min.js":
        "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
    "three-r128/OrbitControls.js":
        "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
    "three-r128/GLTFLoader.js":
        "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
    "tween/tween.umd.js":
        "https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js",
    "tween/tween.esm.js":
        "https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js",
}

#: viejo → nuevo. El orden importa: lo más específico primero, porque
#: `…/examples/jsm/` es prefijo de sí mismo dentro de otras URLs.
def sustituciones():
    s = []
    # 1) las tres páginas de legacy que piden classic de r160 (404 hoy). Vuelven
    #    a la familia r128, que es para la que estaban escritas.
    s += [
        ("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/controls/OrbitControls.js",
         "/vendor/three-r128/OrbitControls.js"),
        ("https://cdn.jsdelivr.net/npm/three@0.160.0/examples/js/loaders/GLTFLoader.js",
         "/vendor/three-r128/GLTFLoader.js"),
        ("https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js",
         "/vendor/three-r128/three.min.js"),
    ]
    # 2) clásicas r128 y tween
    s += [
        ("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js",
         "/vendor/three-0.160.0/build/three.module.js"),
        ("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js",
         "/vendor/three-r128/three.min.js"),
        ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js",
         "/vendor/three-r128/OrbitControls.js"),
        ("https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js",
         "/vendor/three-r128/GLTFLoader.js"),
        ("https://cdnjs.cloudflare.com/ajax/libs/tween.js/18.6.4/tween.umd.js",
         "/vendor/tween/tween.umd.js"),
        ("https://cdn.jsdelivr.net/npm/@tweenjs/tween.js@18.6.4/dist/tween.esm.js",
         "/vendor/tween/tween.esm.js"),
    ]
    # 3) módulos, en los dos CDN que se colaron
    for ver in ("0.160.0", "0.170.0"):
        for host in ("https://cdn.jsdelivr.net/npm", "https://unpkg.com"):
            s.append((f"{host}/three@{ver}/examples/jsm/",
                      f"/vendor/three-{ver}/examples/jsm/"))
            s.append((f"{host}/three@{ver}/build/",
                      f"/vendor/three-{ver}/build/"))
    # 4) las dos páginas que apuntaban al node_modules de dentro de public/
    s += [
        ("../js/alisa-engine/node_modules/three/build/",  "/vendor/three-0.170.0/build/"),
        ("../js/alisa-engine/node_modules/three/examples/jsm/",
         "/vendor/three-0.170.0/examples/jsm/"),
    ]
    return s


RE_IMPORT = re.compile(r"""(?:from|import)\s*\(?\s*["']([^"']+)["']""")


def cerrar_cadena(base_jsm, semillas):
    """Devuelve el conjunto de ficheros de `examples/jsm` que hacen falta.

    Un addon importa a otros con rutas relativas. Copiar sólo los 19 que nombra
    la web dejaría `EffectComposer` sin su `Pass.js` y la página moriría al
    primer render — un fallo que no se ve hasta que alguien abre esa página.
    """
    pendientes, vistos = list(semillas), set()
    while pendientes:
        rel = pendientes.pop()
        if rel in vistos:
            continue
        f = base_jsm / rel
        if not f.exists():
            print(f"   ⚠️  no está en el paquete: {rel}")
            continue
        vistos.add(rel)
        for spec in RE_IMPORT.findall(f.read_text(encoding="utf-8", errors="ignore")):
            if not spec.startswith("."):
                continue                      # 'three' lo resuelve el importmap
            destino = (f.parent / spec).resolve()
            try:
                pendientes.append(str(destino.relative_to(base_jsm)).replace("\\", "/"))
            except ValueError:
                pass                          # sale de examples/jsm: no es nuestro
    return vistos


def paginas():
    for p in PUBLIC.rglob("*"):
        if p.suffix.lower() not in (".html", ".js") or not p.is_file():
            continue
        if "node_modules" in str(p) or f"{VENDOR.name}" in p.parts:
            continue
        yield p


def main():
    print("=" * 78)
    print("  VENDORIZAR THREE" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 78)

    # ── 1. qué addons usa la web de verdad ───────────────────────────
    usados = {v: set() for v in ORIGENES}
    for p in paginas():
        txt = p.read_text(encoding="utf-8", errors="ignore")
        for ver in ORIGENES:
            corto = ver.rsplit(".", 1)[0].split(".", 1)[1]        # 160 / 170
            marca = f"three@{ver}" in txt or (ver == "0.170.0" and "node_modules/three" in txt)
            if not marca:
                continue
            for m in re.finditer(r"(?:examples/jsm|three/addons)/([A-Za-z0-9_/\.\-]+\.js)", txt):
                usados[ver].add(m.group(1))
            _ = corto
    # `three/addons/` no dice versión: lo usan las páginas de módulos, que son
    # de la familia 0.160.0 salvo los labs WebGPU, que ya quedan cubiertos.
    for p in paginas():
        txt = p.read_text(encoding="utf-8", errors="ignore")
        if "three/addons/" in txt:
            for m in re.finditer(r"three/addons/([A-Za-z0-9_/\.\-]+\.js)", txt):
                usados["0.160.0"].add(m.group(1))
                usados["0.170.0"].add(m.group(1))

    # ── 2. cerrar la cadena y copiar ─────────────────────────────────
    total_ficheros = total_kb = 0
    for ver, origen in ORIGENES.items():
        if not origen.exists():
            # ⚠️ Y esto pasó: la primera pasada copió lo necesario, y después
            # borramos los `node_modules` de dentro de `public/` —76 MB que no
            # tienen por qué viajar—. O sea que la herramienta se quedó sin la
            # fuente de la que había copiado. Volver a ejecutarla fallaba, y una
            # herramienta que sólo funciona una vez no sirve para mantener nada.
            #
            # Si ya está vendorizado, no hay nada que copiar: se sigue con el
            # trabajo que sí queda, que es reescribir las páginas.
            if (VENDOR / f"three-{ver}").exists():
                print(f"\n── three {ver} ──\n   ya vendorizado; no hay fuente que copiar")
                continue
            print(f"\n  ❌ falta el paquete {ver} y tampoco está en vendor/.")
            print(f"     `npm install` en public/js/alisa-engine, o coge la copia")
            print(f"     de otro clon: {origen}")
            return 1
        jsm = origen / "examples/jsm"
        print(f"\n── three {ver} ──")
        print(f"   addons que nombra la web: {len(usados[ver])}")
        cierre = cerrar_cadena(jsm, sorted(usados[ver]))
        print(f"   con su cadena de imports: {len(cierre)}  "
              f"(el paquete entero son {sum(1 for _ in jsm.rglob('*.js'))})")

        destino = VENDOR / f"three-{ver}"
        for rel in sorted(cierre):
            d = destino / "examples/jsm" / rel
            if not SIMULACRO:
                d.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(jsm / rel, d)
            total_ficheros += 1
            total_kb += (jsm / rel).stat().st_size / 1024
        for nombre in BUILDS[ver]:
            f = origen / "build" / nombre
            if not f.exists():
                continue
            if not SIMULACRO:
                (destino / "build").mkdir(parents=True, exist_ok=True)
                shutil.copy2(f, destino / "build" / nombre)
            total_ficheros += 1
            total_kb += f.stat().st_size / 1024

    # ── 3. lo clásico, que no está en disco ──────────────────────────
    print("\n── clásicas (script global) ──")
    for rel, url in DESCARGAS.items():
        d = VENDOR / rel
        if d.exists():
            print(f"   ya estaba  {rel}")
            continue
        if SIMULACRO:
            print(f"   descargaría  {rel}")
            continue
        try:
            d.parent.mkdir(parents=True, exist_ok=True)
            with urllib.request.urlopen(url, timeout=45) as r:
                d.write_bytes(r.read())
            kb = d.stat().st_size / 1024
            total_ficheros += 1
            total_kb += kb
            print(f"   {kb:7.0f}K  {rel}")
        except Exception as e:
            print(f"   ❌ {rel}: {e}")

    # ── 4. reescribir las páginas ────────────────────────────────────
    print("\n── páginas ──")
    subs, tocadas, cambios = sustituciones(), 0, 0
    for p in paginas():
        txt = original = p.read_text(encoding="utf-8", errors="ignore")
        for viejo, nuevo in subs:
            if viejo in txt:
                cambios += txt.count(viejo)
                txt = txt.replace(viejo, nuevo)
        if txt != original:
            tocadas += 1
            if not SIMULACRO:
                p.write_text(txt, encoding="utf-8")
    print(f"   {tocadas} páginas reescritas · {cambios} referencias")

    print("\n" + "-" * 78)
    print(f"  vendor/: {total_ficheros} ficheros · {total_kb/1024:.1f} MB")
    if SIMULACRO:
        print("\n  SIMULACRO — no se ha tocado nada.")
    else:
        print("\n  Siguiente: comprobar que no queda ni una petición a un CDN")
        print("  (`python preflight.py` y abrir la sala mirando la red).")
    print("-" * 78)
    return 0


if __name__ == "__main__":
    sys.exit(main())
