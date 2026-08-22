#!/usr/bin/env python3
"""
preflight.py — la comprobación de antes de publicar
==============================================================================
Una lista que se EJECUTA, no que se lee. Cada punto o pasa o no pasa.

    python preflight.py

No sustituye a los laboratorios (que son los que prueban las reglas de verdad,
en el navegador). Comprueba lo que se puede comprobar sin abrir un navegador:
que estén los ficheros que hacen falta, que no queden marcas registradas, que
la imagen no sea de otro, y que la frontera con la colonia siga en su sitio.
==============================================================================
"""
import json
import re
import subprocess
import sys
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

RAIZ = Path(__file__).resolve().parent
PUBLIC = RAIZ / "public"

VERDE, ROJO, AMBAR, FIN = "\033[92m", "\033[91m", "\033[93m", "\033[0m"
resultados = []


def comprobar(nombre, ok, detalle="", bloqueante=True):
    resultados.append((nombre, ok, detalle, bloqueante))
    marca = "✓" if ok else ("✗" if bloqueante else "!")
    print(f"  {marca}  {nombre}" + (f"  — {detalle}" if detalle else ""))
    return ok


print("=" * 74)
print("  ANTES DE PUBLICAR")
print("=" * 74)

# -- 1. LO QUE TIENE QUE ESTAR ------------------------------------
print("\n-- papeles --")
for f, motivo in [
    ("LICENSE", "sin licencia nadie puede usarlo legalmente"),
    ("README.md", "nadie sabrá qué es ni cómo arrancarlo"),
    (".gitignore", ""),
    # Los documentos pasaron a `docs/`: en la raíz sólo quedan los que GitHub
    # espera ahí (README, LICENSE). Veintiún ficheros `.md` sueltos en la
    # portada del repositorio no son documentación: son un muro.
    ("docs/PAQUETE_PUBLICO.md", "qué se publica y qué no"),
    ("docs/ARQUITECTURA_BENCHMARK.md", "cómo se sostiene el benchmark"),
]:
    comprobar(f, (RAIZ / f).is_file(), motivo)

pkg = json.loads((RAIZ / "package.json").read_text(encoding="utf-8"))
comprobar("package.json con licencia", pkg.get("license") == "MIT", pkg.get("license", "sin licencia"))
comprobar("package.json con descripción", bool(pkg.get("description")), "", bloqueante=False)

# ── 2. MARCAS REGISTRADAS ────────────────────────────────────────
print("\n── marcas registradas ──")
# OJO: sin \b. El guión bajo ES carácter de palabra, así que `\bpacman\b` NO
# casa con `pacman_visualizer.js` — ese error nos dio un falso "limpio".
# ⚠️ Las cinco primeras salieron del arcade en su dia (ver
# `_archivo/scripts_de_trabajo/arcade/renombrar_marcas.py`). Las tres ultimas son
# de los entornos con fisica propia, que nunca pasaron por ese filtro y ahora van
# a entrar en la tabla — o sea que sus identificadores se publican:
#
#   cucco            palabra INVENTADA por Nintendo (la gallina de sus juegos)
#   rue del percebe  titulo de Francisco Ibaniez
#   Asteroids-v0     titulo registrado por Atari. Ojo: se vigila el IDENTIFICADOR,
#                    no la palabra «asteroide», que es comun y no la posee nadie —
#                    `AsteroidsSystem` describe fisica de asteroides y se queda.
#
# Los comentarios se quitan antes de buscar (ver abajo), asi que un aviso puede
# nombrar la marca y una CITA puede conservarse tal cual se dijo.
MARCAS = re.compile(r"(?i)(balatro|mtg|pac-?man|frogger|vgc|pok[eé]mon|pok[eé]ball"
                    r"|cucco|rue.?del.?percebe|Asteroids-v0)")
IGNORAR = ("node_modules", "renombrar_marcas", "preflight.py", "CUADERNO_", "PAQUETE_PUBLICO")

en_nombres, en_contenido = [], []
for p in PUBLIC.rglob("*"):
    if not p.is_file() or any(x in str(p) for x in IGNORAR):
        continue
    if MARCAS.search(p.name):
        en_nombres.append(p.relative_to(PUBLIC).as_posix())
    if p.suffix.lower() in {".js", ".html", ".json", ".css", ".md"}:
        try:
            crudo = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        # Fuera comentarios: los avisos que dejamos NOMBRAN la marca prohibida
        # para que nadie la reintroduzca, y hacían saltar el propio detector.
        txt = re.sub(r"/\*.*?\*/|<!--.*?-->", "", crudo, flags=re.S)
        txt = "\n".join(l for l in txt.splitlines() if not l.lstrip().startswith("//"))
        # Y lo mismo con la documentación: `manifiesto/LEEME.md` explica QUÉ
        # marca se quitó y por qué, y hacía saltar la alarma él solito. Decir el
        # nombre para contar que lo has retirado es legítimo; usarlo como nombre
        # de tu producto no. Los `.md` documentan, no bautizan nada.
        if p.suffix.lower() == ".md":
            continue
        for m in MARCAS.finditer(txt):
            # "lastAvgCohesion" contiene "vgc". Se descartan los casos en que la
            # marca va pegada a más letras: es parte de otra palabra.
            i, j = m.start(), m.end()
            antes = txt[i-1] if i > 0 else " "
            despues = txt[j] if j < len(txt) else " "
            if antes.isalpha() or despues.isalpha():
                continue
            en_contenido.append(f"{p.relative_to(PUBLIC).as_posix()}: {m.group(0)}")
            break

comprobar("sin marcas en nombres de fichero", not en_nombres, ", ".join(en_nombres[:3]))
comprobar("sin marcas en el contenido", not en_contenido, "; ".join(en_contenido[:3]))

# ── 3. IMAGEN AJENA (trade dress) ────────────────────────────────
print("\n── imagen propia ──")
# El nombre no arregla la imagen: la paleta y la geometría también están
# protegidas. Estos colores concretos son los de otros juegos.
SOSPECHOSOS = {
    "0xFFFF00": "amarillo icónico de otro juego",
    "0x0000BB": "azul de laberinto de otro juego",
    "0xFFB8FF": "paleta de personaje ajeno",
    "0xEE1515": "rojo de marca ajena",
}
def sin_comentarios(txt: str) -> str:
    """
    Quita comentarios antes de buscar.

    Hace falta porque el aviso que dejé en `fagocito_visualizer.js` NOMBRA los
    colores prohibidos para que nadie vuelva a usarlos… y hacía saltar mi propio
    detector. Un comprobador que se muerde la cola no sirve.
    """
    txt = re.sub(r"/\*.*?\*/", "", txt, flags=re.S)
    return "\n".join(l for l in txt.splitlines() if not l.lstrip().startswith("//"))


def es_barra_de_vida(linea: str) -> bool:
    """
    Verde-amarillo-rojo en la misma línea es un semáforo de salud, no la imagen
    de nadie. Es convención universal y marcarla sería un falso positivo.
    """
    return "0x00FF00" in linea and "0xFF0000" in linea


manchas = []
for p in (PUBLIC / "arcade" / "js").rglob("*.js"):
    codigo = sin_comentarios(p.read_text(encoding="utf-8", errors="ignore"))
    for linea in codigo.splitlines():
        if es_barra_de_vida(linea):
            continue
        for color, motivo in SOSPECHOSOS.items():
            if color in linea:
                manchas.append(f"{p.name}: {color} ({motivo})")
nombres_ajenos = []
for p in (PUBLIC / "arcade" / "js").rglob("*.js"):
    txt = p.read_text(encoding="utf-8", errors="ignore")
    for n in ("Blinky", "Pinky", "Inky", "Clyde"):
        if n in txt:
            nombres_ajenos.append(f"{p.name}: {n}")

comprobar("sin paletas de otros juegos", not manchas, "; ".join(manchas[:3]))
comprobar("sin nombres de personajes ajenos", not nombres_ajenos, "; ".join(nombres_ajenos[:3]))

# ── 4. LOS JUEGOS ────────────────────────────────────────────────
print("\n── el arcade ──")
reglas_dir = PUBLIC / "arcade" / "js" / "protohub" / "rules"
reglas = sorted(p.stem for p in reglas_dir.glob("*.js")) if reglas_dir.is_dir() else []
comprobar(f"reglas locales ({len(reglas)})", len(reglas) >= 8, ", ".join(reglas))

# ¿Están enchufadas las páginas que TIENEN reglas?
# Una página sin reglas locales (backgammon, bestiario) no está rota: es un
# visualizador a la espera de su motor, y el índice ya lo dice como "sin reglas".
# Exigirle ProtoHub sería pedirle que enchufe algo que no existe.
sin_enchufar, sin_reglas = [], []
for html in (PUBLIC / "arcade").glob("*.html"):
    txt = html.read_text(encoding="utf-8", errors="ignore")
    if "SovereignBoardEngine.js" not in txt and "SovereignCardEngine.js" not in txt:
        continue
    # El identificador REAL está declarado en la página (`registrar('chess', …)`).
    # Emparejar por nombre de fichero fallaba: las reglas están en castellano
    # (`ajedrez.js`) y las páginas en inglés (`chess.html`), así que daba por
    # "sin reglas" a juegos que sí las tenían.
    m = re.search(r"registrar\(\s*['\"]([^'\"]+)['\"]", txt)
    juego = m.group(1) if m else html.stem
    tiene_reglas = bool(m)
    if not tiene_reglas:
        sin_reglas.append(html.name)
    elif "protohub/ProtoHub.js" not in txt:
        sin_enchufar.append(html.name)

comprobar("las páginas con reglas están enchufadas", not sin_enchufar, ", ".join(sin_enchufar))
comprobar("páginas sin reglas locales (declaradas)", True,
          ", ".join(sin_reglas) or "ninguna", bloqueante=False)

# ¿Algún visualizador vacío? (damas estuvo a 0 bytes y no se notaba)
vacios = [p.name for p in (PUBLIC / "arcade" / "js").glob("*_visualizer.js") if p.stat().st_size == 0]
comprobar("ningún visualizador vacío", not vacios, ", ".join(vacios))

# ── 5. ENLACES INTERNOS ──────────────────────────────────────────
print("\n── enlaces ──")
NO_PUBLICO = ("lab_heritage.html",)
rotos = []
for html in PUBLIC.rglob("*.html"):
    if any(x in html.name for x in NO_PUBLICO) or "node_modules" in str(html):
        continue
    txt = html.read_text(encoding="utf-8", errors="ignore")
    for m in re.finditer(r'(?:href|src)="([^"#?:]+\.(?:html|js))"', txt):
        rel = m.group(1)
        if rel.startswith(("http", "//")):
            continue
        # Una ruta que empieza por "/" NO cuelga de la carpeta del fichero:
        # cuelga de la raíz que sirve el servidor, que es `public/`. Al
        # resolverlas como relativas, este comprobador daba por rotos dos
        # enlaces que funcionan (`research.html` → `/labs/…`). Un comprobador
        # que grita en falso se acaba ignorando, y entonces no sirve de nada.
        base = PUBLIC if rel.startswith("/") else html.parent
        if not (base / rel.lstrip("/")).exists():
            rotos.append(f"{html.name} → {rel}")
comprobar("sin enlaces rotos", not rotos, "; ".join(rotos[:4]), bloqueante=False)

# ── 6. LA FRONTERA ───────────────────────────────────────────────
print("\n── frontera con la colonia ──")
try:
    # encoding explícito: en Windows la consola es cp1252 y los emojis del
    # guardián reventaban la lectura con UnicodeDecodeError.
    # ⚠️ Esto miraba si la palabra «publicable» aparecía en la salida. El día
    # que la frontera quedó ORDENADA, el guardián cambió su veredicto a
    # «✅ frontera limpia y ordenada» —mejor resultado, sin esa palabra— y
    # `preflight` empezó a fallar. Un comprobador que se rompe porque lo
    # comprobado mejora no comprueba: adivina.
    #
    # Ahora se usa el código de salida, que es para lo que existe `--estricto`.
    r = subprocess.run([sys.executable, "check_vanilla_boundary.py", "--estricto"],
                       cwd=RAIZ, capture_output=True, text=True, timeout=60,
                       encoding="utf-8", errors="replace")
    salida = (r.stdout or "").strip()
    veredicto = next((l.strip() for l in reversed(salida.splitlines())
                      if "VEREDICTO" in l), salida.splitlines()[-1] if salida else "sin salida")
    comprobar("guardián de frontera", r.returncode == 0,
              veredicto.replace("VEREDICTO:", "").strip())
except Exception as e:
    comprobar("guardián de frontera", False, str(e))

# ── 7. EL PESO DE LO QUE SE PUBLICA ──────────────────────────────
# ⚠️ Esto faltaba, y la primera versión medía la cosa equivocada: puse un
# presupuesto de 150 MB sobre `public/` entero, como si al visitante le llegara
# el repositorio. No le llega. Medido en el navegador, **la sala pesa 1,72 MB**
# —de los cuales 1,24 MB son `three`— porque una página sólo carga lo suyo.
#
# Lo que sí importa aquí es lo que viaja al repositorio, y se mide sobre
# `dist_publico/` (lo que construye `empaquetar.py`), no sobre el taller.
# Los topes duros de Cloudflare Pages son 20.000 ficheros y 25 MB por fichero.
print("\n── el peso de lo que se publica ──")
TOPE_FICHEROS, TOPE_UNO_MB, AVISO_MB = 20_000, 25, 350

PAQUETE = RAIZ / "dist_publico"
hay_paquete = PAQUETE.exists()
medido = PAQUETE if hay_paquete else PUBLIC
ficheros = [p for p in medido.rglob("*") if p.is_file()]
total_mb = sum(p.stat().st_size for p in ficheros) / 1024 / 1024
gordos = [p for p in ficheros if p.stat().st_size > TOPE_UNO_MB * 1024 * 1024]

comprobar("el paquete está construido", hay_paquete,
          "dist_publico/" if hay_paquete else
          "falta `python empaquetar.py` — sin él se mide el taller, no el producto")
comprobar(f"menos de {TOPE_FICHEROS:,} ficheros", len(ficheros) < TOPE_FICHEROS,
          f"{len(ficheros):,}")
comprobar(f"ninguno pasa de {TOPE_UNO_MB} MB", not gordos,
          ", ".join(p.name for p in gordos[:3]))
comprobar(f"el paquete no pasa de {AVISO_MB} MB", total_mb < AVISO_MB,
          f"{total_mb:,.0f} MB — clonar cuesta; mira qué recursos nombra el "
          f"código sin usarlos de verdad", bloqueante=False)

# Lo que nunca debería viajar: dependencias y binarios de desarrollo.
intrusos = [p for p in ficheros
            if "node_modules" in str(p) or p.suffix.lower() in (".exe", ".bak")]
comprobar("sin node_modules ni binarios", not intrusos,
          f"{len(intrusos):,} ficheros; p.ej. " +
          ", ".join(sorted({p.name for p in intrusos})[:3]))

# ⚠️ LICENCIA: un pack prohíbe la redistribución. Que no se cuele al paquete.
prohibidos = [p for p in ficheros if "Lowpoly Animals eng" in str(p)]
comprobar("sin recursos que prohíban redistribuirse", not prohibidos,
          f"{len(prohibidos)} ficheros de Seaeees — su licencia no lo permite")

# Y las páginas no pueden depender de un tercero: la puerta de la descarga
# sólo es verdad si el paquete funciona sin conexión.
cdn = []
for p in medido.rglob("*"):
    if p.suffix.lower() in (".html", ".js") and p.is_file() and "vendor" not in p.parts:
        t = p.read_text(encoding="utf-8", errors="ignore")
        if re.search(r"https?://(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com)", t):
            cdn.append(p.name)
comprobar("ninguna página carga código desde un CDN", not cdn,
          f"{len(cdn)} páginas; p.ej. " + ", ".join(sorted(set(cdn))[:3]))

# ── 8. LA TESIS: ¿verifica de verdad? ────────────────────────────
# Todo lo demás de esta lista comprueba que el paquete está bien hecho. Esto
# comprueba que el ARGUMENTO es cierto: que una partida legítima se acepta, que
# las trampas se cazan, y que el verificador de producción usa exactamente las
# mismas reglas que el navegador. Si esto falla, da igual lo bonito que esté
# todo lo demás.
print("\n── el verificador ──")
try:
    r = subprocess.run(["node", "prueba_funcion.mjs"], cwd=RAIZ,
                       capture_output=True, text=True, timeout=180,
                       encoding="utf-8", errors="replace")
    salida = (r.stdout or "") + (r.stderr or "")
    linea = next((l.strip() for l in salida.splitlines()
                  if "legítimas aceptadas" in l), "sin veredicto")
    # Se quitan los colores de consola, que aquí sobran.
    linea = re.sub(r"\x1b\[[0-9;]*m", "", linea)
    comprobar("partidas legítimas aceptadas y trampas cazadas",
              r.returncode == 0, linea)
except FileNotFoundError:
    comprobar("partidas legítimas aceptadas y trampas cazadas", False,
              "no encuentro `node` — hace falta para probar el verificador")
except Exception as e:
    comprobar("partidas legítimas aceptadas y trampas cazadas", False, str(e))

# ── VEREDICTO ────────────────────────────────────────────────────
bloqueantes = [n for n, ok, _, b in resultados if not ok and b]
avisos = [n for n, ok, _, b in resultados if not ok and not b]

print("\n" + "=" * 74)
if bloqueantes:
    print(f"  ❌ NO PUBLICAR TODAVÍA — {len(bloqueantes)} bloqueante(s):")
    for n in bloqueantes:
        print(f"       · {n}")
else:
    print("  ✅ LISTO PARA PUBLICAR")
if avisos:
    print(f"\n  ⚠️  {len(avisos)} aviso(s) que no bloquean:")
    for n in avisos:
        print(f"       · {n}")
print("\n  Recuerda: esto NO prueba las reglas de los juegos. Eso lo hacen los")
print("  laboratorios en el navegador (croupier_sin_hub, los perft, etc.).")
print("=" * 74)

sys.exit(1 if bloqueantes else 0)
