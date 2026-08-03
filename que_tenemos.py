"""¿QUÉ TENEMOS YA DE ESTO? — mirar antes de construir.

    python que_tenemos.py cartas
    python que_tenemos.py "voxel|katamari"
    python que_tenemos.py boids --todo

⚠️ POR QUÉ EXISTE (1 de agosto de 2026, dicho por Oscar)

    «te das cuenta que todo el rato estas haciendo lo mismo? por no mirar lo
     que ya tenemos te buscas mas trabajo del necesario»

Y tenía razón. Ese mismo día escribí a mano las reglas del blackjack —valores
de carta, regla del crupier, reparto— existiendo ya:

    · arcade/data/card_library.json      6 barajas y 25 juegos DECLARADOS
    · arcade/engines/sovereign_card_rules.py   77 KB: controlador universal,
      DeckFactory, CardVerbs, PokerHandEvaluator y motores de 10 juegos

Mi versión era además peor: una baraja donde la ficha dice seis.

El fallo no fue de conocimiento sino de MÉTODO: buscaba en mi memoria en vez de
en el disco. Esto convierte «¿existe algo de X?» en un comando, que es la única
forma de que la respuesta no dependa de lo que yo recuerde ese día.

Busca por CONTENIDO y por nombre, porque aquí los ficheros mienten sobre lo que
contienen: `croupier_phantom_predator.html` era el hall, `RaccoonSpaceSystem.js`
se declara headless y recibe objetos THREE.
"""
import pathlib
import re
import sys

BASE = pathlib.Path(__file__).parent
ALISA = BASE.parents[3]                      # …/alisa_project/alisa
PROYECTO = ALISA.parent                      # …/alisa_project

# ⚠️ Esto empezó mirando solo cuatro carpetas, y volví a tropezar con lo mismo:
# una herramienta con MI punto ciego no me salva de mi punto ciego. Medí la
# frontera y había barrido el 0,9% de los ficheros. Ahora pregunta al
# territorio, no al barrio: motores fuera del sitio web, el ML en Python, los
# candidatos de recuperación, la copia congelada del motor y el archivo de Q:\AI.
# TODO Q:. Empecé con cuatro carpetas, luego con diez, y las dos veces me faltó
# justo lo que buscaba. Son ~8.700 ficheros html+js en toda la unidad: cabe.
# Poner una frontera aquí es ponerme una venda, y ya sé cómo acaba eso.
RAICES = [pathlib.Path("Q:\\")]
EXT = {".js", ".py", ".html", ".json", ".md"}
# Al abrir el radio a todo el territorio, lo primero que salió fue un entorno
# virtual de Python entero (transformers, torch, sklearn…). Una herramienta que
# se ahoga en código de TERCEROS no sirve para encontrar lo NUESTRO.
RUIDO = ("node_modules", "__pycache__", ".git", "package-lock.json", "vendor",
         "site-packages", "dist-info", ".venv", "_env\\Lib", "/Lib/", "\\Lib\\",
         "\\dist\\", "/dist/", ".min.js", "three.module", "three-vrm",
         # Al abrir a toda la unidad entran cosas que no son código nuestro:
         "\\Data\\Memory\\", "\\Data\\Logs\\", "\\Data\\Backups\\", "OldBackups",
         "\\weechat\\", "\\.pnpm-store\\", "\\Antigravity\\", "\\.antigravity\\",
         "\\SystemRelief\\OscarTemp\\Active\\claude\\",   # mis propios temporales
         # Y al abrir a la unidad entera aparecieron los cachés: navegadores,
         # extensiones, ms-playwright, uv… megas de código de OTROS que tapan
         # lo nuestro. Tercera vez que aprendo lo mismo: una búsqueda que se
         # ahoga en dependencias ajenas no encuentra nada propio.
         "\\Caches\\", "\\BrowserProfiles\\", "\\Extensions\\", "ms-playwright")

# Lo que hace que un fichero sea una PIEZA y no una mención de pasada.
PESO = re.compile(r"\bclass\s+(\w+)|\bexport\s+(?:class|function|const)\s+(\w+)|"
                  r"\bdef\s+(\w+)|\bfactory\b|\bplugin\b|\bengine\b|\bsystem\b", re.I)


def buscar(patron, umbral=3, todo=False):
    rx = re.compile(patron, re.I)
    filas = []
    vistas = set()
    for raiz in RAICES:
        if not raiz.exists() or raiz in vistas:
            continue
        vistas.add(raiz)
        for f in raiz.rglob("*"):
            if f.suffix.lower() not in EXT or any(r in str(f) for r in RUIDO):
                continue
            try:
                if f.stat().st_size > 1_500_000:
                    continue
                txt = f.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            n = len(rx.findall(txt)) + (5 if rx.search(f.name) else 0)
            if n < umbral:
                continue
            simbolos = [g for m in PESO.finditer(txt) for g in m.groups() if g]
            filas.append((n, f.stat().st_size, f, simbolos[:6]))
    filas.sort(reverse=True)
    return filas if todo else filas[:15]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        raise SystemExit(1)
    patron = sys.argv[1]
    filas = buscar(patron, todo="--todo" in sys.argv)
    if not filas:
        print(f"  nada sobre '{patron}'. OJO: eso NO prueba que no exista —")
        print("  prueba otro término (en castellano y en inglés) antes de construir.")
        raise SystemExit(0)
    print(f"  '{patron}' — {len(filas)} ficheros, del más denso al menos:\n")
    for n, tam, f, simbolos in filas:
        try:
            corto = f.relative_to(PROYECTO)
        except ValueError:
            corto = f
        print(f"  {n:4d}  {tam//1024:5d}K  {corto}")
        if simbolos:
            print(f"              {', '.join(simbolos)}")
