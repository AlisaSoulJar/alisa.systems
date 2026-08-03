#!/usr/bin/env python3
"""
renombrar_marcas.py — saca las marcas registradas del arcade
==============================================================================
El motor y el arcade se publican libres. Cinco juegos llevaban nombres de marca
registrada, lo que es buscarse un pleito gratis:

    balatro  LocalThunk / Playstack        mtg      Wizards of the Coast
    pacman   Bandai Namco                  frogger  Konami
    vgc      Pokémon / Nintendo

LA ESTRATEGIA: "The Boys", no "Pak-Man"
---------------------------------------
Un disfraz fino ("Pak-Man") es PEOR que no cambiar nada: sigue siendo infracción
por similitud confusa, y encima demuestra que sabías lo que hacías.

The Boys resuelve esto bien: Patriota no evoca "Superman" como palabra. Cambian
al ARQUETIPO, y los arquetipos no se registran — el forzudo volador, el corredor
veloz, el que habla con peces son de dominio público; solo la expresión concreta
está protegida.

Así que aquí se nombra por la MECÁNICA y el arquetipo:

    Usura      póker con multiplicadores: romper las matemáticas del casino
    Grimorio   magos gastando maná (término de dominio público)
    Fagocito   célula que engulle mientras la persiguen (exacto, y muy ALISA)
    Peatón     alguien intentando cruzar una carretera con tráfico
    Bestiario  duelo de criaturas por equipos

⚠️ EL NOMBRE NO ES SUFICIENTE — TRADE DRESS
--------------------------------------------
La imagen distintiva también está protegida, aunque cambies el nombre. Este
script avisa de lo que hay que retocar a mano:
  · `vgc` dibujaba el suelo con patrón de POKÉBALL  → cambiado a anillos neutros
  · `pacman` — revisar que los perseguidores no sean fantasmas reconocibles
  · revisar paletas: el amarillo-círculo, el rojo-fantasma, etc.

⚠️ NOMBRAR UNA MARCA NO ES USARLA — SIEMPRE EN SIMULACRO PRIMERO
-----------------------------------------------------------------
Este script sustituye a ciegas, y hay un caso donde eso hace daño: los
comentarios que EXPLICAN qué marca se retiró. En `bestiario_visualizer.js` dice
«este suelo era, literalmente, una Pokéball», que es la documentación del
arreglo; aplicarle la tabla lo deja diciendo «era, literalmente, una Sello» y se
pierde el porqué. Decir el nombre para contar que lo has quitado es legítimo;
usarlo como nombre de tu producto no.

Así que: `--simulacro` siempre, y lo que salga en comentarios se mira a mano.

USO
---
    python renombrar_marcas.py --simulacro   # enseña qué haría, sin tocar nada
    python renombrar_marcas.py               # lo hace
==============================================================================
"""
import re
import sys
import shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent          # …/public/arcade
PUBLIC = RAIZ.parent                             # …/public

#: viejo → (nuevo_id, Título bonito)
CAMBIOS = {
    "balatro": ("usura", "Usura"),
    "mtg":     ("grimorio", "Grimorio"),
    "pacman":  ("fagocito", "Fagocito"),
    "frogger": ("peaton", "Peatón"),
    "vgc":     ("bestiario", "Bestiario"),
}

#: títulos que aparecen escritos "bonito" en HTML y hay que sustituir aparte
TITULOS = {
    "Balatro": "Usura",
    "MTG": "Grimorio",
    "Magic": "Grimorio",
    "Pacman": "Fagocito",
    "PacMan": "Fagocito",
    "Pac-Man": "Fagocito",
    "Frogger": "Peatón",
    "Pokemon": "Bestiario",
    "Pokémon": "Bestiario",
    "Pokeball": "Sello",
    "Pokéball": "Sello",
    "VGC": "Bestiario",
}

EXTENSIONES = {".html", ".js", ".json", ".py", ".css", ".md"}
EXCLUIR = ("node_modules", "\\dist\\", "/dist/", "renombrar_marcas.py", ".bak")


def ficheros():
    for p in PUBLIC.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in EXTENSIONES:
            continue
        if any(x in str(p) for x in EXCLUIR):
            continue
        yield p


def sustituir(texto: str) -> tuple:
    """Devuelve (texto_nuevo, nº de cambios)."""
    n = 0
    # 1) identificadores en minúscula, con frontera de palabra
    for viejo, (nuevo, _) in CAMBIOS.items():
        texto, k = re.subn(r"\b%s\b" % viejo, nuevo, texto)
        n += k
        texto, k = re.subn(r"\b%s_visualizer\b" % nuevo, "%s_visualizer" % nuevo, texto)
    # 2) títulos escritos para humanos
    for viejo, nuevo in TITULOS.items():
        texto, k = re.subn(r"\b%s\b" % re.escape(viejo), nuevo, texto)
        n += k
    return texto, n


def main():
    simulacro = "--simulacro" in sys.argv
    print("=" * 74)
    print("  SACANDO LAS MARCAS DEL ARCADE" + ("  [SIMULACRO]" if simulacro else ""))
    print("=" * 74)
    for viejo, (nuevo, titulo) in CAMBIOS.items():
        print("   %-9s → %-10s (%s)" % (viejo, nuevo, titulo))

    # ── 1. contenido ──────────────────────────────────────────────
    print("\n── contenido ──")
    tocados = 0
    for p in ficheros():
        try:
            txt = p.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError):
            continue
        nuevo_txt, n = sustituir(txt)
        if n:
            tocados += 1
            rel = p.relative_to(PUBLIC)
            print("   %3d cambios  %s" % (n, rel))
            if not simulacro:
                p.write_text(nuevo_txt, encoding="utf-8")

    # ── 2. nombres de fichero ─────────────────────────────────────
    print("\n── ficheros a renombrar ──")
    renombrados = 0
    for p in list(ficheros()):
        nombre = p.name
        nuevo_nombre = nombre
        for viejo, (nuevo, _) in CAMBIOS.items():
            nuevo_nombre = re.sub(r"\b%s\b" % viejo, nuevo, nuevo_nombre)
        if nuevo_nombre != nombre:
            destino = p.with_name(nuevo_nombre)
            print("   %s → %s" % (p.relative_to(PUBLIC), nuevo_nombre))
            renombrados += 1
            if not simulacro:
                if destino.exists():
                    print("      (ya existía; se conserva el nuevo)")
                    p.unlink()
                else:
                    shutil.move(str(p), str(destino))

    print("\n" + "-" * 74)
    print("  ficheros con contenido cambiado: %d" % tocados)
    print("  ficheros renombrados:            %d" % renombrados)
    if simulacro:
        print("\n  SIMULACRO — no se ha tocado nada. Quita --simulacro para aplicarlo.")
    else:
        print("\n  ⚠️  PENDIENTE A MANO (el nombre no arregla la imagen):")
        print("     · revisar que los perseguidores de Fagocito no sean fantasmas reconocibles")
        print("     · revisar paletas que copien la identidad visual del original")
    print("-" * 74)


if __name__ == "__main__":
    main()
