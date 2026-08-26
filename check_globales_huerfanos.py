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
    """Quita comentarios, cadenas y plantillas: solo queda código ejecutable.

    ⚠️ ESCÁNER Y NO EXPRESIÓN REGULAR, DESDE EL 26-08.
    Una plantilla puede llevar OTRA dentro: `a ${ b ? `x` : `y` } c`. Un
    ``...`` no anidado corta en la comilla equivocada y deja HTML suelto en lo
    que cree que es código. Medido: producía cuatro denuncias falsas en
    `ArcadeRoomManager.js`, todas sacadas de un `<span style="...">` que vivía
    dentro de una plantilla anidada.
    """
    fuera, i, n = [], 0, len(texto)
    while i < n:
        c = texto[i]
        if c == "/" and texto[i + 1:i + 2] == "*":
            j = texto.find("*/", i + 2)
            i = n if j < 0 else j + 2
        elif c == "/" and texto[i + 1:i + 2] == "/":
            j = texto.find("\n", i)
            i = n if j < 0 else j
        elif c in "\"'":
            i += 1
            while i < n and texto[i] != c:
                i += 2 if texto[i] == "\\" else 1
            i += 1
            fuera.append('""')
        elif c == "`":
            i, prof = i + 1, 0
            while i < n:
                if texto[i] == "\\":
                    i += 2
                    continue
                if texto[i] == "`" and prof == 0:
                    break
                if texto[i] == "$" and texto[i + 1:i + 2] == "{":
                    prof += 1
                    i += 2
                    continue
                if texto[i] == "}" and prof > 0:
                    prof -= 1
                i += 1
            i += 1
            fuera.append('""')
        else:
            fuera.append(c)
            i += 1
    return "".join(fuera)


# ═══════════════════════════════════════════════════════════════════════════
#  SEGUNDA FORMA: ASIGNAR A UN NOMBRE QUE NADIE DECLARA
# ═══════════════════════════════════════════════════════════════════════════
#
# La de arriba caza `AssetManager.algo()` sin importar. Ésta caza la otra mitad
# de la misma herencia: `targetFloor = 3` sin declarar. En un módulo ES —que es
# strict— eso NO es crear una global: es un `ReferenceError` en el momento en
# que se ejecuta esa línea, a mitad de función, llevándose por delante todo lo
# que venía después.
#
# ⚠️ SE AÑADE EL 26-08 PORQUE COSTÓ UNA NOCHE ENCONTRARLO A MANO. Medido:
# `ProceduralBuildingFactory.build()` moría en `targetFloor is not defined` en
# CADA partida de ¡Busca! 3. La excepción salía por el `onError` del
# `GLTFLoader` —que envuelve el callback— así que parecía «un modelo que no
# carga», y de paso abortaba el resto del arranque de la página. La penumbra que
# esa etapa llevaba meses enseñando era el efecto de ese fallo.
#
# El fichero ya tenía cuatro huérfanas declaradas a mano en `build()` con una
# nota que explica exactamente esto. Se les habían escapado tres más. Un
# comprobador no se cansa de mirar; una persona sí.
GLOBALES_DE_VERDAD = {
    "window", "document", "self", "globalThis", "console", "navigator",
    "location", "performance", "localStorage", "sessionStorage", "module",
    "exports", "process", "THREE", "requestAnimationFrame", "setTimeout",
    "setInterval", "clearTimeout", "clearInterval", "fetch", "Math", "JSON",
    "Object", "Array", "String", "Number", "Boolean", "Promise", "Map", "Set",
    "Date", "Error", "Symbol", "Float32Array", "Uint8Array", "innerWidth",
    "innerHeight", "devicePixelRatio", "addEventListener", "structuredClone",
}

ASIGNACION = re.compile(
    r"(?<![.\w$?])([A-Za-z_$][\w$]*)\s*(?<![=!<>+\-*/%&|^])=(?![=>])")


def _trozos(texto: str) -> list[str]:
    """Parte por las comas de NIVEL 0, respetando paréntesis y llaves."""
    partes, prof, actual = [], 0, ""
    for ch in texto:
        if ch in "([{":
            prof += 1
        elif ch in ")]}":
            prof -= 1
        if prof == 0 and ch == ",":
            partes.append(actual)
            actual = ""
        else:
            actual += ch
    partes.append(actual)
    return partes


def _del_patron(patron: str) -> set:
    """Nombres que ATA un destructuring, sin sus valores por defecto.

    `const { size = 60, color = 0x0a0a0f } = config` declara DOS nombres. Cortar
    por el primer `=` deja fuera todos menos el primero, y los demás salían luego
    denunciados: diez denuncias falsas en un solo fichero.
    """
    fuera = set()
    for parte in _trozos(patron.strip()[1:-1]):
        izq = parte.split("=")[0]
        if ":" in izq:                       # `{ a: b }` ata b, no a
            izq = izq.split(":")[-1]
        ident = re.findall(r"[A-Za-z_$][\w$]*", izq)
        if ident:
            fuera.add(ident[-1])
    return fuera


def _parametros(c: str) -> set:
    """Nombres atados por cualquier lista de parámetros.

    Con paréntesis EQUILIBRADOS, no `\\([^()]*\\)`: un parámetro puede llevar
    paréntesis en su valor por defecto —`constructor(hubUrl = 'x', opts = {})`—
    y el patrón ingenuo no casa, así que sus nombres salían sin declarar.
    """
    fuera = set()
    for i, ch in enumerate(c):
        if ch != "(":
            continue
        prof, j = 1, i + 1
        while j < len(c) and prof:
            prof += (c[j] == "(") - (c[j] == ")")
            j += 1
        if prof:
            continue
        if not c[j:j + 4].lstrip()[:2].startswith(("{", "=>")):
            continue
        for parte in _trozos(c[i + 1:j - 1]):
            parte = parte.strip()
            if not parte:
                continue
            if parte[0] in "{[":
                cierre = parte.rfind("}") if parte[0] == "{" else parte.rfind("]")
                fuera |= _del_patron(parte[:cierre + 1])
            else:
                izq = parte.split("=")[0].strip().lstrip(".")
                if re.fullmatch(r"[A-Za-z_$][\w$]*", izq):
                    fuera.add(izq)
    return fuera


def _campos_de_clase(c: str) -> set:
    """`static id = 'x'` es una DECLARACIÓN aunque lleve `=`.

    Era el grueso del ruido: todos los `id`, `meta`, `observationSpace` y
    `actionSpace` de los entornos del gimnasio salían denunciados.
    """
    fuera = set()
    for m in re.finditer(r"\bclass\b[^{;]*\{", c):
        i, prof = m.end(), 1
        while i < len(c) and prof > 0:
            if c[i] == "{":
                prof += 1
            elif c[i] == "}":
                prof -= 1
            elif prof == 1 and c[i] == "\n":
                fin = c.find("\n", i + 1)
                d = re.match(r"\s*(?:static\s+)?#?([A-Za-z_$][\w$]*)\s*=(?!=)",
                             c[i + 1:fin if fin > 0 else len(c)])
                if d:
                    fuera.add(d.group(1))
            i += 1
    return fuera


def _lista_declaradores(resto: str) -> set:
    """De `a = 1, b, c = f(x);` saca a, b, c — los de nivel 0."""
    fin, prof = 0, 0
    for i, ch in enumerate(resto):
        if ch in "([{":
            prof += 1
        elif ch in ")]}":
            prof -= 1
            if prof < 0:
                break
        if prof == 0 and ch == ";":
            break
        fin = i + 1
    fuera = set()
    for n in _trozos(resto[:fin]):
        n = n.strip()
        if n[:1] in "{[":
            cierre = n.rfind("}") if n[0] == "{" else n.rfind("]")
            fuera |= _del_patron(n[:cierre + 1])
        else:
            n = n.split("=")[0].strip()
            if re.fullmatch(r"[A-Za-z_$][\w$]*", n):
                fuera.add(n)
    return fuera


def declarados(c: str) -> set:
    """Todo nombre que este fichero ata de alguna forma."""
    d = set()
    for m in re.finditer(r"\b(?:let|const|var)\s+", c):
        d |= _lista_declaradores(c[m.end():m.end() + 400])
    for rx in (r"\b(?:function|class)\s+([A-Za-z_$][\w$]*)",
               r"\bimport\s+([A-Za-z_$][\w$]*)",
               r"\bcatch\s*\(\s*([A-Za-z_$][\w$]*)"):
        d |= set(re.findall(rx, c))
    for bloque in re.findall(r"import\s*\{([^}]*)\}", c):
        d |= set(re.findall(r"[A-Za-z_$][\w$]*", bloque))
    d |= _parametros(c)
    d |= _campos_de_clase(c)
    d |= set(re.findall(
        r"^\s*(?:async\s+|static\s+|\*\s*)*([A-Za-z_$][\w$]*)\s*\([^()]*\)\s*\{",
        c, flags=re.M))
    return d


def asignaciones_huerfanas(c: str) -> set:
    """Nombres a los que se ASIGNA sin que nadie los declare."""
    d = declarados(c)
    return {m.group(1) for m in ASIGNACION.finditer(c)
            if m.group(1) not in d and m.group(1) not in GLOBALES_DE_VERDAD}


# ── controles del segundo detector ─────────────────────────────────────────
#
# Positivo: el caso REAL, tal y como estaba escrito en la fábrica.
# Negativo: las cuatro formas de declarar que producían denuncias falsas. Un
# comprobador que grita en falso se acaba ignorando, y entonces no sirve.
_ROTO = """
class F {
  static id = 'x';
  build(totalFloors, opts = {}) {
    let scent = { floor: 0, door: 0 };
    targetFloor = scent.floor;
  }
}
"""
_SANO = """
class F {
  static id = 'x';
  static meta = {};
  constructor(hubUrl = 'http://a', opts = {}) { this.u = hubUrl; }
  pinta({ size = 60, color = 0x0a0a0f, spread = f(2) } = {}) {
    let a = 1, b = 2, [c, d] = [3, 4];
    a = b; c = d; size = color; spread = 1;
    const s = `x ${ cond ? `y` : `z` } <span style="color:red">w</span>`;
    return s;
  }
}
"""


def control_del_segundo() -> str | None:
    visto = asignaciones_huerfanas(limpiar(_ROTO))
    if visto != {"targetFloor"}:
        return f"el caso roto deberia dar {{'targetFloor'}} y da {visto!r}"
    ruido = asignaciones_huerfanas(limpiar(_SANO))
    if ruido:
        return f"denuncia codigo SANO: {sorted(ruido)!r}"
    return None


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

    fallo = control_positivo(ficheros) or control_del_segundo()
    if fallo:
        print(f"CONTROL POSITIVO FALLIDO: {fallo}")
        return 2                       # ni OK ni problemas: la prueba no vale

    problemas = []
    asignados = []
    for f in ficheros:
        codigo = limpiar(f.read_text(encoding="utf-8", errors="replace"))

        for nombre in sorted(asignaciones_huerfanas(codigo)):
            asignados.append((f.relative_to(RAIZ).as_posix(), nombre))

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

    if not problemas and not asignados:
        print(f"OK — {len(ficheros)} ficheros revisados, controles pasados, "
              "ningun modulo usa un simbolo del motor sin importarlo\n"
              "     ni asigna a un nombre que nadie declara.")
        return 0

    if problemas:
        print(f"{len(problemas)} usos huerfanos (rompen en tiempo de ejecucion):\n")
        for ruta, simbolo in problemas:
            print(f"   {simbolo:<18} usado sin importar en  {ruta}")
    if asignados:
        print(f"\n{len(asignados)} asignaciones a nombres sin declarar "
              "(ReferenceError en cuanto se ejecuta la linea):\n")
        for ruta, nombre in asignados:
            print(f"   {nombre:<18} asignado sin declarar en  {ruta}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
