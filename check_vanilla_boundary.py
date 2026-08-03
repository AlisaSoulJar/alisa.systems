#!/usr/bin/env python3
"""
check_vanilla_boundary.py — ¿sigue el motor libre de colonia?
==============================================================================
El motor se publica libre; ALISA es una aplicación que lo usa. Para que eso sea
cierto, nada bajo `src/` —salvo `extensions/alisa-colony/`— puede hablar del
hub, los pasaportes, el JobBoard, $NEURO ni el overworld.

Este script mide ese límite. Se puede volver a ejecutar siempre:

    python check_vanilla_boundary.py            # informe
    python check_vanilla_boundary.py --estricto # sale con código 1 si hay bloqueantes

POR QUÉ EXISTE
--------------
`AlisaRenderCore` importaba y auto-registraba `ColonialPassportPlugin` contra
`http://127.0.0.1:8741`. O sea: cualquier escena hecha con el motor —incluida
una copia descargada por un desconocido— arrancaba hablando con un hub privado.
Nadie lo había notado porque `getPlugin()` no se llamaba en ningún sitio.

Ese fallo concreto ya está corregido. Este script existe para que no vuelva.

CÓMO SE LEE EL INFORME
----------------------
  BLOQUEANTE  el núcleo (soma/, world/, psyche/, gym/) importa colonia o llama
              al hub. Impide publicar.
  A MOVER     módulo que ES de la colonia y todavía vive fuera de la extensión.
              No impide publicar (un build vainilla puede excluirlo), pero el
              repositorio miente sobre dónde está la frontera.
  MENCIÓN     la palabra aparece en un comentario o un nombre. Ruido.
==============================================================================
"""
import re
import sys
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent / "public"
RAIZ = PUBLIC / "js" / "alisa-engine" / "src"
EXTENSION = "extensions/alisa-colony"

# ⚠️ ALCANCE — corregido tras un fallo real.
# Este script solo miraba `src/`, así que dio "publicable ✅" mientras el ARCADE
# entero seguía llamando a `http://127.0.0.1:8741` desde su propio código. Al
# abrir una partida de ajedrez en el navegador, la página martilleaba el hub de
# la colonia en bucle infinito: 28 errores en segundos, con una IP privada a la
# vista de cualquiera. El motor estaba limpio y el producto no.
#
# Lección: una auditoría con el alcance mal puesto es peor que no auditar,
# porque te da un aprobado y dejas de mirar.
OTRAS_ZONAS = ["arcade", "labs", "rooms"]

# Contenido que es de ALISA, no del motor: NO viaja en el paquete público.
# Que hable con el hub no es un fallo — es su razón de ser. El despacho de la
# Reina pide `/system` porque es el despacho de la Reina.
# Ver PAQUETE_PUBLICO.md para el razonamiento completo.
NO_SE_PUBLICA = {
    "rooms/",                                   # las salas enteras son de la colonia
    "lab_heritage.html",                        # copia museo
    "labs/croupier_arista_self.html",
    "labs/croupier_terminal.html",
    "labs/croupier_el_reparto.html",
    "labs/croupier_chopper_aquarium.html",      # acuña $NEURO
    "labs/croupier_phantom_predator.html",
    "labs/croupier_avatar_integration_test.html",
    "labs/croupier_digital_twin_test.html",
}


def es_publico(ruta: str) -> bool:
    """¿Este fichero viaja en el paquete libre?"""
    return not any(ruta.startswith(x) or ruta == x for x in NO_SE_PUBLICA)

# Módulos que SON de la colonia: su sitio es la extensión.
MODULOS_COLONIA = {
    "ColonialPassportPlugin", "ColonialTerminalPlugin", "JobBoardDisplayPlugin",
    "SovereignAvatarSystem", "SovereignTickerPlugin", "PythonTelemetrySensor",
    "ColonialMetabolismSystem", "HubClient", "TerminalInteractionEngine",
    "TerminalUIEngine", "EntityCardSystem", "PygmalionTopologySystem",
    "ArachneIngestionSystem", "GeppettoChoreographySystem",
    "MorpheusSimulationSystem", "HubCartographerSystem",
}

# Acoplamiento duro: red al hub, o importar un módulo de colonia.
RE_RED = re.compile(
    r"(?:fetch|WebSocket|ws://|http://)[^\n]{0,80}?"
    r"(?:8741|8732|/overworld|/beings|/jobboard)",
    re.IGNORECASE,
)
RE_IMPORT = re.compile(
    r"import[^;\n]{0,200}?from\s+['\"][^'\"]*?(" + "|".join(MODULOS_COLONIA) + r")[^'\"]*['\"]"
)
# Menciones sueltas (ruido, informativo).
RE_MENCION = re.compile(r"colonial|passport|jobboard|overworld|\$?NEURO|akasha", re.IGNORECASE)

IGNORAR = ("node_modules", "/dist/", "\\dist\\")


def relativo(p: Path) -> str:
    return p.relative_to(RAIZ).as_posix()


def main() -> int:
    if not RAIZ.is_dir():
        print(f"No encuentro el código del motor en:\n  {RAIZ}")
        return 2

    bloqueantes, a_mover, menciones = [], [], []

    for f in sorted(RAIZ.rglob("*.js")):
        ruta = relativo(f)
        if any(x in str(f) for x in IGNORAR):
            continue
        if ruta.startswith(EXTENSION):
            continue  # aquí la colonia SÍ puede vivir

        try:
            txt = f.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            print(f"  (no se pudo leer {ruta}: {e})")
            continue

        # Las líneas de comentario no cuentan como acoplamiento.
        codigo = "\n".join(
            l for l in txt.splitlines()
            if not l.lstrip().startswith(("//", "*", "/*"))
        )

        red = RE_RED.findall(codigo)
        imports = RE_IMPORT.findall(codigo)

        if red or imports:
            bloqueantes.append((ruta, len(imports), len(red)))
        elif f.stem in MODULOS_COLONIA:
            a_mover.append(ruta)
        elif RE_MENCION.search(codigo):
            menciones.append(ruta)

    # Los módulos que SON de colonia y además tienen acoplamiento duro no son
    # "bloqueantes del núcleo": es su naturaleza. Solo están en el sitio equivocado.
    reales, mal_ubicados = [], list(a_mover)
    for ruta, ni, nr in bloqueantes:
        if Path(ruta).stem in MODULOS_COLONIA:
            mal_ubicados.append(ruta)
        else:
            reales.append((ruta, ni, nr))

    print("=" * 74)
    print("  ¿SIGUE EL MOTOR LIBRE DE COLONIA?")
    print("=" * 74)

    print(f"\n🔴 BLOQUEANTES — núcleo acoplado a la colonia: {len(reales)}")
    if reales:
        for ruta, ni, nr in sorted(reales, key=lambda x: -(x[1] + x[2])):
            print(f"     {ruta}   (imports:{ni} red:{nr})")
        print("\n     Esto impide publicar: son ficheros del núcleo, no de la colonia.")
    else:
        print("     ninguno ✅  el núcleo no conoce la colonia")

    print(f"\n🟡 A MOVER — módulos de colonia fuera de la extensión: {len(set(mal_ubicados))}")
    for ruta in sorted(set(mal_ubicados)):
        print(f"     {ruta}")
    if mal_ubicados:
        print(f"\n     Su sitio es {EXTENSION}/. Un build vainilla puede excluirlos hoy")
        print("     (solo se cargan por import dinámico), pero el árbol miente sobre la frontera.")

    print(f"\n⚪ menciones sueltas en comentarios/nombres: {len(menciones)}")

    # ── el resto del producto, no solo el motor ───────────────────
    print("\n" + "=" * 74)
    print("  FUERA DEL MOTOR — lo que también se publica")
    print("=" * 74)
    fuera = []
    for zona in OTRAS_ZONAS:
        base = PUBLIC / zona
        if not base.is_dir():
            continue
        for f in sorted(base.rglob("*")):
            if f.suffix.lower() not in {".js", ".html"} or any(x in str(f) for x in IGNORAR):
                continue
            try:
                txt = f.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            codigo = "\n".join(
                l for l in txt.splitlines()
                if not l.lstrip().startswith(("//", "*", "/*", "<!--"))
            )
            hits = len(RE_RED.findall(codigo))
            if hits:
                fuera.append((f.relative_to(PUBLIC).as_posix(), hits))

    publicos = [(r, h) for r, h in fuera if es_publico(r)]
    coloniales = [(r, h) for r, h in fuera if not es_publico(r)]

    # El arcade ya no cuenta si tiene reglas locales: el ProtoHub sondea el hub
    # UNA vez y, si no está, juega solo. Eso es una mejora opcional, no una
    # dependencia — que es exactamente la diferencia que buscábamos.
    protohub = PUBLIC / "arcade" / "js" / "protohub" / "rules"
    con_reglas = sorted(p.stem for p in protohub.glob("*.js")) if protohub.is_dir() else []
    if con_reglas:
        print(f"\n🟢 juegos con reglas LOCALES (funcionan sin hub): {len(con_reglas)}")
        print(f"     {', '.join(con_reglas)}")

    if coloniales:
        print(f"\n⚪ {len(coloniales)} páginas hablan con el hub PERO NO SE PUBLICAN:")
        for ruta, h in sorted(coloniales, key=lambda x: -x[1])[:6]:
            print(f"     {h:3d}  {ruta}")
        if len(coloniales) > 6:
            print(f"     … y {len(coloniales) - 6} más")
        print("     Son contenido de ALISA (el despacho de la Reina, la terminal,")
        print("     el acuñado de $NEURO…). Que llamen al hub es su razón de ser.")
        print("     Ver PAQUETE_PUBLICO.md.")

    if publicos:
        total = sum(h for _, h in publicos)
        print(f"\n🔴 {len(publicos)} ficheros DEL PAQUETE PÚBLICO llaman al hub ({total} llamadas):")
        for ruta, h in sorted(publicos, key=lambda x: -x[1]):
            nota = ""
            if "SovereignBoardEngine" in ruta or "SovereignCardEngine" in ruta or "arcade_core" in ruta:
                nota = "  ← sondeo único con repliegue local, no es dependencia"
            print(f"     {h:3d}  {ruta}{nota}")
    else:
        print("\n🟢 ningún fichero del paquete público depende del hub ✅")

    print("\n" + "-" * 74)
    # El veredicto tenía el mismo fallo de alcance que el análisis: cantaba
    # "publicable" mirando solo el motor. Ahora cuenta todo lo que se publica.
    if reales:
        print("VEREDICTO: ❌ el NÚCLEO del motor sigue acoplado. No se publica.")
    # Los motores del arcade y el propio ProtoHub SÍ nombran el hub: es donde
    # vive el sondeo único y el repliegue local. Que aparezcan aquí es correcto.
    elif [p for p, _ in publicos
          if "Sovereign" not in p and "arcade_core" not in p and "protohub" not in p]:
        print("VEREDICTO: ⚠️  hay páginas del PAQUETE PÚBLICO que dependen del hub.")
        print("           No funcionarían para quien se descargue el motor.")
    elif mal_ubicados:
        print("VEREDICTO: ✅ publicable — el núcleo está limpio.")
        print("           Queda ordenar: mover los módulos de colonia a su carpeta.")
    else:
        print("VEREDICTO: ✅ frontera limpia y ordenada.")
    print("-" * 74)

    if "--estricto" in sys.argv and reales:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
