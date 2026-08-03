#!/usr/bin/env python3
"""
separar_colonia.py — el motor por un lado, ALISA por otro
==============================================================================
    python separar_colonia.py --simulacro
    python separar_colonia.py

QUÉ SEPARA Y POR QUÉ
--------------------
El motor se publica libre; **ALISA es una aplicación que lo usa**. Eso es lo que
promete el README, y `check_vanilla_boundary.py` lleva meses diciendo que el
núcleo está limpio pero que **el árbol miente sobre la frontera**: hay 16
módulos que hablan del hub, del JobBoard o de los pasaportes viviendo en
`soma/`, `psyche/` y `world/`, como si fueran motor.

No es cosmético. Quien clone esto tiene que poder ver de un vistazo qué se lleva
y qué es nuestro. Un `soma/plugins/` con un `ColonialPassportPlugin` dentro dice
que el motor sabe de pasaportes, y no los sabe: sólo comparte carpeta.

Comprobado antes de mover, uno a uno, que el acoplamiento es real y no una
mención en un comentario: `EntityCardSystem` tiene el hub en la línea 832 y
`SovereignTickerPlugin` en la 68.

CÓMO
----
Mover un módulo rompe los imports **en las dos direcciones**: los suyos hacia
el motor, y los de todo el que le llama. Se recalculan ambos. Y como las páginas
usan el alias `@alisa-engine/src/…`, también se reescribe esa forma.

Nada se borra: es un `git mv` en la práctica, y el original queda en el
historial.
==============================================================================
"""
import os
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PUBLIC = RAIZ / "public"
SRC = PUBLIC / "js" / "alisa-engine" / "src"
DESTINO = SRC / "extensions" / "alisa-colony"
SIMULACRO = "--simulacro" in sys.argv

#: Los 16 que señala `check_vanilla_boundary.py`, con su sitio nuevo.
#: Se conserva el agrupamiento: la tubería de avatares es una pieza con sentido
#: propio y aplanarla dentro de `alisa-colony/` perdería esa información.
MUDANZA = {
    "soma/plugins/ColonialPassportPlugin.js":   "plugins",
    "soma/plugins/ColonialTerminalPlugin.js":   "plugins",
    "soma/plugins/JobBoardDisplayPlugin.js":    "plugins",
    "soma/plugins/PythonTelemetrySensor.js":    "plugins",
    "soma/plugins/SovereignAvatarSystem.js":    "plugins",
    "soma/plugins/SovereignTickerPlugin.js":    "plugins",
    "soma/utils/HubClient.js":                  "utils",
    "psyche/EntityCardSystem.js":               "psyche",
    "psyche/TerminalInteractionEngine.js":      "psyche",
    "psyche/TerminalUIEngine.js":               "psyche",
    "world/systems/ColonialMetabolismSystem.js": "systems",
    "world/systems/HubCartographerSystem.js":   "systems",
    "extensions/avatar-pipeline/ArachneIngestionSystem.js":   "avatar-pipeline",
    "extensions/avatar-pipeline/GeppettoChoreographySystem.js": "avatar-pipeline",
    "extensions/avatar-pipeline/MorpheusSimulationSystem.js": "avatar-pipeline",
    "extensions/avatar-pipeline/PygmalionTopologySystem.js":  "avatar-pipeline",
}

RE_IMPORT = re.compile(r"""(["'])((?:\.{1,2}/|@alisa-engine/)[^"']*?\.js)(\?[^"']*)?\1""")


def ficheros_de_texto():
    for p in PUBLIC.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in (".js", ".html"):
            continue
        if any(x in p.parts for x in ("node_modules", "vendor", "dist", "manifiesto")):
            continue
        yield p


def rel(desde: Path, hasta: Path) -> str:
    """Ruta relativa en forma de import: siempre con `./` o `../` delante."""
    r = os.path.relpath(hasta, desde).replace("\\", "/")
    return r if r.startswith(".") else "./" + r


def main():
    plan = {}
    for viejo, sub in MUDANZA.items():
        o = SRC / viejo
        if not o.exists():
            print(f"  ⚠️ ya no está: {viejo}")
            continue
        plan[o] = DESTINO / sub / o.name

    print("=" * 74)
    print("  SEPARAR EL MOTOR DE LA COLONIA" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 74)
    print(f"  {len(plan)} módulos → extensions/alisa-colony/\n")
    for o, n in sorted(plan.items()):
        print(f"   {str(o.relative_to(SRC)):52s} → {n.relative_to(DESTINO).as_posix()}")

    # ── quién importa a quién, ANTES de mover ────────────────────────
    reescrituras = 0
    tocados = set()
    for f in ficheros_de_texto():
        txt = original = f.read_text(encoding="utf-8", errors="ignore")
        for m in RE_IMPORT.finditer(original):
            cita = m.group(2)
            # resolver la cita a un fichero real
            if cita.startswith("@alisa-engine/"):
                objetivo = (PUBLIC / "js" / "alisa-engine" /
                            cita[len("@alisa-engine/"):]).resolve()
            else:
                objetivo = (f.parent / cita).resolve()
            if objetivo not in plan:
                continue
            nuevo_abs = plan[objetivo]
            if cita.startswith("@alisa-engine/"):
                nueva = "@alisa-engine/" + nuevo_abs.relative_to(
                    PUBLIC / "js" / "alisa-engine").as_posix()
            else:
                # si el que cita también se muda, la cuenta sale desde su
                # destino: si no, quedaría apuntando desde donde ya no está.
                base = plan.get(f, f).parent
                nueva = rel(base, nuevo_abs)
            txt = txt.replace(m.group(0), m.group(0).replace(cita, nueva))
            reescrituras += 1
        # y los imports PROPIOS de un módulo que se muda, hacia el resto del motor
        if f in plan:
            for m in RE_IMPORT.finditer(txt):
                cita = m.group(2)
                if cita.startswith("@alisa-engine/"):
                    continue
                objetivo = (f.parent / cita).resolve()
                if objetivo in plan or not objetivo.exists():
                    continue
                nueva = rel(plan[f].parent, objetivo)
                if nueva != cita:
                    txt = txt.replace(m.group(0), m.group(0).replace(cita, nueva))
                    reescrituras += 1
        if txt != original:
            tocados.add(f)
            if not SIMULACRO:
                f.write_text(txt, encoding="utf-8")

    print(f"\n  imports reescritos: {reescrituras} en {len(tocados)} ficheros")

    if SIMULACRO:
        print("\n  SIMULACRO — no se ha movido nada.")
        return 0

    for o, n in plan.items():
        n.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(o), str(n))
    print(f"  {len(plan)} módulos movidos.")
    print("\n  Siguiente: `python check_vanilla_boundary.py` y abrir la sala.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
