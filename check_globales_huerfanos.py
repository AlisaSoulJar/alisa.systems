#!/usr/bin/env python3
"""check_globales_huerfanos.py — cazar restos de cuando el motor eran scripts

Cuando el motor pasó de scripts sueltos a módulos ES, todo lo que vivía en
`window` dejó de existir. Un fichero que use `AssetManager.loadModelAsync(...)`
sin importarlo **no falla al cargar**: falla en el momento en que se ejecuta esa
línea. Por eso el Cabinet Escape arrancaba, pintaba el mueble y se quedaba sin
mapache, sin serpiente y sin linterna, con un solo error en consola.

Este comprobador los caza antes de que lo haga un usuario.

    python check_globales_huerfanos.py     → 0 si está limpio, 1 si hay restos

⚠️ Sobre los falsos positivos
La primera versión buscaba `Simbolo\\s*\\.` y cazaba el `.js` de las propias
rutas de import: daba por rotos `ProceduralSPE.js` y `CarverSystem.js`, que
estaban perfectos. Ahora se quitan las cadenas antes de mirar el código. Un
comprobador que grita en falso se acaba ignorando, y entonces no sirve para
nada.
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(__file__).parent / "public" / "js" / "alisa-engine" / "src"

# Lo que antes era global y ahora es una exportación.
SIMBOLOS = [
    "AssetManager", "GLTFModelPool", "AssetResolver",
    "AlisaRenderCore", "DeterministicScope",
]


def limpiar(texto: str) -> str:
    """Quita comentarios y cadenas: solo queda código ejecutable."""
    texto = re.sub(r"/\*.*?\*/", "", texto, flags=re.S)
    texto = re.sub(r"//[^\n]*", "", texto)
    texto = re.sub(r"`(?:[^`\\]|\\.)*`", '""', texto, flags=re.S)
    texto = re.sub(r"'(?:[^'\\\n]|\\.)*'", '""', texto)
    texto = re.sub(r'"(?:[^"\\\n]|\\.)*"', '""', texto)
    return texto


def control_positivo(ficheros) -> str | None:
    """¿Está el instrumento enchufado?

    Un comprobador que no encuentra nada porque MIRÓ MAL da el mismo "OK" que
    uno que no encuentra nada porque todo está bien. Los dos ceros se leen
    igual y significan cosas opuestas.

    Ya pasó dos veces en un mismo día: un barrido de tokens dijo "ninguno"
    porque leyó un fichero que aún se estaba escribiendo (había 42), y una
    comparación de determinismo dijo "iguales" comparando dos cadenas vacías.

    Así que antes de fiarse del silencio, se busca algo que SABEMOS que está.
    Si no aparece, el silencio no vale nada y hay que decirlo.
    """
    if not ficheros:
        return "no se ha leido NI UN fichero .js — la ruta debe de estar mal"

    # `AssetManager` se importa en unos cuantos módulos del motor: si el
    # detector no ve ni uno, sus expresiones regulares no funcionan.
    for f in ficheros:
        codigo = limpiar(f.read_text(encoding="utf-8", errors="replace"))
        if re.search(r"import[^;]*\bAssetManager\b[^;]*from", codigo):
            return None
    return ("no se ha encontrado NINGUN import de AssetManager, y los hay: "
            "el detector no esta funcionando y su 'OK' no significa nada")


def main() -> int:
    ficheros = [f for f in sorted(RAIZ.rglob("*.js")) if "dist" not in f.parts]

    fallo = control_positivo(ficheros)
    if fallo:
        print(f"CONTROL POSITIVO FALLIDO: {fallo}")
        return 2                       # ni OK ni problemas: la prueba no vale

    problemas = []
    for f in ficheros:
        codigo = limpiar(f.read_text(encoding="utf-8", errors="replace"))

        for simbolo in SIMBOLOS:
            if not re.search(rf"\b{simbolo}\s*\.\s*[a-zA-Z_]", codigo):
                continue
            # ¿lo importa, lo declara, o lo reexporta (fichero barril)?
            tiene = re.search(
                rf"(import[^;]*\b{simbolo}\b[^;]*from"
                rf"|export\s*\{{[^}}]*\b{simbolo}\b[^}}]*\}}\s*from"
                rf"|(export\s+)?(const|let|var|class|function)\s+{simbolo}\b)",
                codigo,
            )
            if not tiene:
                problemas.append((f.relative_to(RAIZ).as_posix(), simbolo))

    if not problemas:
        print(f"OK — {len(ficheros)} ficheros revisados, control positivo pasado, "
              "ningun modulo usa un simbolo del motor sin importarlo.")
        return 0

    print(f"{len(problemas)} usos huerfanos (rompen en tiempo de ejecucion):\n")
    for ruta, simbolo in problemas:
        print(f"   {simbolo:<18} usado sin importar en  {ruta}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
