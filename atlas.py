"""ATLAS — qué ES cada fichero nuestro, en una línea. Se construye una vez.

    python atlas.py              # reconstruir  -> atlas.json
    python atlas.py buscar mesa  # buscar en el atlas (nombre, símbolos y qué es)

⚠️ POR QUÉ EXISTE (1 de agosto de 2026, tras la tercera bronca de Oscar)

    «no estas mirando muy profundo en tus busquedas cuando tengo que estar
     diciendote que ya existen las cosas y es entonces cuando las encuentras»

Y el diagnóstico honesto no es "busco poco": es que **busco por el nombre que ya
tengo en la cabeza**, y este código está nombrado con otras palabras.

    busqué `fliptable`  → 0 resultados.  Se llama `KinematicRageSystem`.
    busqué `minimapa`   → 0 resultados.  Es un radar, dentro de un juego.
    busqué `tablero`    → tarde.         Se llama `arcade_boards.js`.

Buscar en el CONTENIDO no basta, porque el contenido usa esas mismas palabras
ajenas. Lo que hace falta es un índice de QUÉ ES cada cosa —sacado de su primera
línea de documentación, de sus clases y de sus funciones exportadas— para poder
LEER el inventario en vez de adivinar la consulta.

Y una regla que va con esto: **una búsqueda vacía no prueba que algo no exista.**
Prueba que no acerté la palabra. Hay que probar el concepto en castellano y en
inglés, y mirar los VECINOS de lo que sí aparezca: la carpeta y el laboratorio
que lo usa enseñan más que el fichero suelto.
"""
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path("Q:\\")
SALIDA = pathlib.Path(__file__).parent / "atlas.json"
EXT = {".js", ".html", ".py"}
RUIDO = ("node_modules", "__pycache__", "\\.git\\", "site-packages", ".venv",
         "\\dist\\", ".min.js", "three.module", "three-vrm", "dist-info",
         "\\Caches\\", "\\BrowserProfiles\\", "\\Extensions\\", "ms-playwright",
         "\\Data\\Memory\\", "\\Data\\Logs\\", "\\Data\\Backups\\", "OldBackups",
         "\\weechat\\", "\\.pnpm-store\\", "\\Antigravity\\", "\\.antigravity\\",
         "\\SystemRelief\\OscarTemp\\Active\\claude\\", "\\found.00")

RE_SIMBOLO = re.compile(
    r"^\s*(?:export\s+)?(?:async\s+)?(?:class|function|def)\s+(\w+)|"
    r"^\s*(?:export\s+)?(?:const|let)\s+(\w+)\s*=\s*(?:function|\(|\{|new\s)|"
    r"^\s*window\.(\w+)\s*=", re.M)

# La primera frase de verdad: docstring, comentario de cabecera o <title>.
RE_TITULO = re.compile(r"<title>([^<]{4,120})</title>", re.I)


def que_es(txt, ruta):
    m = RE_TITULO.search(txt[:4000])
    if m:
        return m.group(1).strip()
    for linea in txt[:2500].splitlines():
        l = linea.strip(" *#/'\"\t")
        # Saltar cabeceras vacías, imports y separadores
        if len(l) < 18 or l.startswith(("import", "from", "<!", "<html", "===", "---", "@")):
            continue
        if re.match(r"^[\w./\\-]+\.(js|py|html)\b", l):        # "Fichero.js — ..."
            resto = l.split("—", 1)
            if len(resto) > 1 and len(resto[1].strip()) > 10:
                return resto[1].strip()[:150]
        return l[:150]
    return ""


def construir():
    filas = []
    for f in RAIZ.rglob("*"):
        try:
            if f.suffix.lower() not in EXT or not f.is_file():
                continue
            s = str(f)
            if any(r in s for r in RUIDO):
                continue
            tam = f.stat().st_size
            if tam < 400 or tam > 900_000:
                continue
            txt = f.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        simbolos = [g for m in RE_SIMBOLO.finditer(txt) for g in m.groups() if g]
        filas.append({
            "ruta": s,
            "kb": round(tam / 1024),
            "es": que_es(txt, f),
            "simbolos": sorted(set(simbolos))[:14],
        })
    SALIDA.write_text(json.dumps(filas, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"  atlas construido: {len(filas):,} ficheros -> {SALIDA.name}")
    con = sum(1 for x in filas if x["es"])
    print(f"  con descripción: {con:,}  ·  sin ella: {len(filas)-con:,}")
    return filas


def buscar(patron):
    filas = json.loads(SALIDA.read_text(encoding="utf-8"))
    rx = re.compile(patron, re.I)
    hits = []
    for x in filas:
        puntos = (3 if rx.search(pathlib.Path(x["ruta"]).name) else 0) \
               + (2 if rx.search(x["es"]) else 0) \
               + sum(1 for s in x["simbolos"] if rx.search(s))
        if puntos:
            hits.append((puntos, x))
    hits.sort(key=lambda h: -h[0])
    print(f"  '{patron}' — {len(hits)} ficheros en el atlas\n")
    for p, x in hits[:18]:
        corto = x["ruta"].replace("Q:\\alisa_project\\alisa\\", "").replace("Q:\\", "")
        print(f"  [{p}] {x['kb']:5d}K  {corto}")
        if x["es"]:
            print(f"            {x['es'][:110]}")
        if x["simbolos"]:
            print(f"            · {', '.join(x['simbolos'][:8])}")
    if not hits:
        print("  nada. Y eso NO prueba que no exista: prueba OTRA palabra —"
              "\n  el concepto en castellano y en inglés, y mira los vecinos de lo que sí salga.")


def mapa(prefijo="", profundidad=4):
    """Leer el atlas POR ESTRUCTURA, sin consultar ninguna palabra.

    `buscar` tiene el mismo punto ciego que tenía yo: sólo encuentra lo que ya
    sé nombrar. Esto no pregunta nada — enseña las carpetas y cuántos ficheros
    hay en cada una, para poder ver los directorios que nunca he abierto.
    Un directorio con 22 ficheros que no me suena de nada es una señal mucho
    más fiable que cualquier búsqueda que se me ocurra.
    """
    filas = json.loads(SALIDA.read_text(encoding="utf-8"))
    grupos = {}
    for x in filas:
        r = x["ruta"].replace("Q:\\alisa_project\\alisa\\", "").replace("Q:\\", "")
        if prefijo and not r.lower().startswith(prefijo.lower()):
            continue
        carpeta = "\\".join(r.split("\\")[:profundidad - 1]) or "."
        g = grupos.setdefault(carpeta, {"n": 0, "kb": 0})
        g["n"] += 1
        g["kb"] += x["kb"]
    print(f"  {len(grupos)} carpetas · {sum(g['n'] for g in grupos.values()):,} ficheros\n")
    for carpeta, g in sorted(grupos.items(), key=lambda kv: -kv[1]["n"]):
        print(f"  {g['n']:5d}  {g['kb']:7,d}K  {carpeta}")


def ver(prefijo, limite=200):
    """Volcar QUÉ ES cada fichero de una carpeta. El paso después de `mapa`."""
    filas = json.loads(SALIDA.read_text(encoding="utf-8"))
    n = 0
    for x in sorted(filas, key=lambda x: x["ruta"]):
        r = x["ruta"].replace("Q:\\alisa_project\\alisa\\", "").replace("Q:\\", "")
        if not r.lower().startswith(prefijo.lower()):
            continue
        n += 1
        if n > limite:
            break
        print(f"  {x['kb']:5d}K  {r.split(chr(92))[-1]}")
        if x["es"]:
            print(f"           {x['es'][:120]}")
    print(f"\n  {n} ficheros bajo '{prefijo}'")


if __name__ == "__main__":
    orden = sys.argv[1] if len(sys.argv) > 1 else ""
    if orden == "buscar" and len(sys.argv) > 2:
        buscar(sys.argv[2])
    elif orden == "mapa":
        mapa(sys.argv[2] if len(sys.argv) > 2 else "",
             int(sys.argv[3]) if len(sys.argv) > 3 else 4)
    elif orden == "ver" and len(sys.argv) > 2:
        ver(sys.argv[2])
    else:
        construir()
