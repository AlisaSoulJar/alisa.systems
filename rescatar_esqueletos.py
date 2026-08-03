#!/usr/bin/env python3
"""
rescatar_esqueletos.py — sacar los arquetipos del backup a la base viva
==============================================================================
    python rescatar_esqueletos.py --simulacro
    python rescatar_esqueletos.py

QUÉ PASÓ (encontrado el 2 de agosto de 2026)
--------------------------------------------
`rooms/room_art_direction.html` pesa 19 KB. Su copia de seguridad del 20 de
abril pesa **132 KB** y se llama `…_21archetypes`. Dentro hay esqueletos
**colocados a mano, hueso a hueso**, con la anatomía comentada: la rodilla
verdadera del perro, el corvejón, las caderas saliendo de la espina.

La base viva —`data/skeletons.json`, que leen la Dirección de Arte e Igor— tiene
**13**. Faltan trece, y entre ellos el más importante:

    · `humanoid` en el backup: DOCE huesos (columna, cuello, hombros, dos
      brazos, cadera, fémures, tibias).
    · `bipedal` en la base viva: **UN hueso**, `[[0,0.5,0],[0,1.5,0]]`. Un palo.

O sea que el «esqueleto humanoide que hay que rellenar» que arrastrábamos como
tarea pendiente llevaba relleno desde abril, en un fichero de backup, y en el
mismo formato que lee la base. Nadie lo miró.

CÓMO, Y POR QUÉ NO PISA NADA
----------------------------
Sólo **añade** lo que falta. Los arquetipos que ya existen no se tocan: la
versión viva de `canine` tiene más huesos que la del backup, o sea que es
posterior. Un rescate que sobrescribe lo bueno con lo viejo no es un rescate.

Y antes de escribir, copia `skeletons.json` a `_archivo/`. Aquí no se destruye
nada — regla de la casa.
==============================================================================
"""
import json
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
BACKUP = RAIZ / "public/rooms/room_art_direction_BACKUP_20260420_0121_21archetypes.html"
BASE = RAIZ / "public/data/skeletons.json"
ARCHIVO = RAIZ / "_archivo"
SIMULACRO = "--simulacro" in sys.argv

#: nombres bonitos para los que rescatamos, en el estilo de los que ya hay
ETIQUETAS = {
    "humanoid":    "🧍 Bípedo humanoide (columna, hombros, cadera)",
    "equine":      "🐴 Cuadrúpedo ungulado (caballo/cebra)",
    "pachyderm":   "🐘 Cuadrúpedo grávido (elefante/rinoceronte)",
    "lagomorph":   "🐇 Saltador de patas traseras largas (conejo/liebre)",
    "mustelid":    "🦡 Cuadrúpedo alargado (hurón/nutria/tejón)",
    "cetacean":    "🐋 Nadador de aleta horizontal (ballena/delfín)",
    "piscine_alt": "🐟 Nadador de aleta vertical",
    "chelonian":   "🐢 Caparazón sobre cuatro patas (tortuga)",
    "crocodilian": "🐊 Reptil de patas laterales (cocodrilo)",
    "lacertilian": "🦎 Lagarto de marcha ondulante",
    "anuran":      "🐸 Anfibio saltador (rana/sapo)",
    "crustacean":  "🦀 Exoesqueleto de marcha lateral (cangrejo)",
    "theropod":    "🦖 Bípedo con cola de contrapeso (dinosaurio)",
    "hovering":    "🛸 Flotante sin patas (dron/espectro)",
}

RE_TIPO = re.compile(r"type\s*===\s*'(\w+)'")
RE_HUESO = re.compile(r"addBone\(\s*\[([^\]]+)\]\s*,\s*\[([^\]]+)\]\s*\)")


#: sólo aritmética y el lado. Si aparece cualquier otra cosa, se abandona en
#: vez de evaluarla: esto lee un fichero nuestro, no vamos a ejecutar sorpresas.
RE_SEGURO = re.compile(r"^[0-9.+\-*/() ]+$")


def numeros(txt, lado=None):
    """Convierte '0, 1.5, side * 0.5' en tres números.

    ⚠️ No todos los huesos son literales: las extremidades espejadas se
    escribieron dentro de `[1, -1].forEach(side => …)`, así que llevan
    expresiones como `side * 0.5`. La primera versión de esto reventó con
    `could not convert string to float: 'side*0.5'` — y menos mal, porque
    saltárselas en silencio habría dejado a las arañas sin patas.
    """
    out = []
    for trozo in txt.split(","):
        t = trozo.strip()
        if "side" in t:
            if lado is None:
                return None
            t = t.replace("side", f"({lado})")
        if not RE_SEGURO.match(t):
            return None
        out.append(float(eval(t, {"__builtins__": {}}, {})))
    return out


def leer_backup():
    """Bloque por bloque: cada `type === 'x'` se lleva sus `addBone` hasta el siguiente."""
    src = BACKUP.read_text(encoding="utf-8", errors="ignore")
    cortes = [(m.group(1), m.start()) for m in RE_TIPO.finditer(src)]
    salida, perdidos = {}, {}
    for i, (tipo, ini) in enumerate(cortes):
        fin = cortes[i + 1][1] if i + 1 < len(cortes) else len(src)
        huesos, fallos = [], 0
        for a, b in RE_HUESO.findall(src[ini:fin]):
            espejado = "side" in a or "side" in b
            # Un hueso espejado son DOS huesos: el izquierdo y el derecho.
            for lado in ([1, -1] if espejado else [None]):
                p, q = numeros(a, lado), numeros(b, lado)
                if p is None or q is None:
                    fallos += 1
                    continue
                huesos.append([p, q])
        if huesos:
            salida.setdefault(tipo, huesos)      # el primer bloque manda
            if fallos:
                perdidos[tipo] = fallos
    if perdidos:
        print("  ⚠️ huesos que no se han podido leer:",
              ", ".join(f"{k}×{v}" for k, v in perdidos.items()))
    return salida


def main():
    if not BACKUP.exists():
        sys.exit(f"  no encuentro el backup: {BACKUP}")

    delBackup = leer_backup()
    base = json.loads(BASE.read_text(encoding="utf-8"))

    print("=" * 74)
    print("  RESCATE DE ESQUELETOS" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 74)
    print(f"  en el backup: {len(delBackup)} arquetipos con huesos")
    print(f"  en la base:   {sum(1 for k in base if not k.startswith('_'))}\n")

    # Un esqueleto de uno o dos huesos no es un esqueleto: es un muñón que
    # alguien dejó para rellenar. `bipedal` tiene UNO y `wheeled` también,
    # mientras el backup trae diez para `wheeled`. Los muñones se rellenan; los
    # esqueletos de verdad —`canine` tiene 30 vivos contra 19— no se tocan,
    # porque los vivos son posteriores.
    MUNON = 2

    nuevos, ya, rellenados = [], [], []
    for tipo, huesos in sorted(delBackup.items()):
        if tipo not in base:
            nuevos.append((tipo, huesos))
            continue
        vivos = len(base[tipo].get("bones", []))
        if vivos <= MUNON < len(huesos):
            rellenados.append((tipo, huesos, vivos))
        else:
            ya.append(f"{tipo} ({vivos} vivos vs {len(huesos)} del backup)")

    print("── ya existen y son de verdad (NO se tocan) ──")
    for x in ya:
        print(f"   · {x}")

    if rellenados:
        print(f"\n── muñones que se rellenan ({len(rellenados)}) ──")
        for tipo, huesos, vivos in rellenados:
            print(f"   ↑ {tipo:14s} {vivos} → {len(huesos)} huesos")

    print(f"\n── se añaden ({len(nuevos)}) ──")
    for tipo, huesos in nuevos:
        print(f"   + {tipo:14s} {len(huesos):3d} huesos   {ETIQUETAS.get(tipo, '')}")

    # El palo humanoide merece una mención aparte.
    if "bipedal" in base:
        n = len(base["bipedal"].get("bones", []))
        if n <= 2:
            print(f"\n   ⚠️  `bipedal` en la base tiene {n} hueso(s) — es el muñón. "
                  f"`humanoid` entra con {len(dict(nuevos).get('humanoid', []))}.")

    if SIMULACRO:
        print("\n  SIMULACRO — no se ha escrito nada.")
        return 0

    ARCHIVO.mkdir(exist_ok=True)
    shutil.copy2(BASE, ARCHIVO / "skeletons.json.antes-del-rescate")
    print(f"\n  copia previa → _archivo/skeletons.json.antes-del-rescate")

    ORIGEN = "room_art_direction_BACKUP_20260420_0121_21archetypes.html"


    for tipo, huesos in nuevos:
        base[tipo] = {"label": ETIQUETAS.get(tipo, tipo), "bones": huesos,
                      "_origen": ORIGEN}
    for tipo, huesos, vivos in rellenados:
        base[tipo]["bones"] = huesos
        base[tipo]["_origen"] = f"{ORIGEN} (muñón de {vivos} hueso(s) rellenado)"

    # ── MARCHAS QUE SE QUEDARON SIN CUERPO ───────────────────────────
    # `bipedal`, `digitigrade`, `plantigrade` y `ungulate` no son arquetipos
    # anatómicos: son formas de ANDAR, y así se usan en `kinematics.json` y en
    # las fichas de los modelos (`mobility`, `base_gait`). Pero están en la
    # misma base que los esqueletos, cada uno con un palo de uno o dos huesos.
    # O sea que quien pide un cuadrúpedo digitígrado hoy se lleva una raya.
    #
    # Se les presta el esqueleto del arquetipo que les corresponde. No es lo
    # ideal —lo ideal sería separar marcha de anatomía— pero es honesto,
    # reversible y mucho mejor que un palo.
    #
    # ⚠️ Y una salvedad que hay que decir: un pollo camina a dos patas y no
    # tiene hombros. Para eso están `bird` y `primate`; esto arregla el caso
    # genérico, no todos.
    PRESTAMOS = {
        "bipedal": "humanoid",       # bípedo genérico
        "digitigrade": "canine",     # anda sobre los dedos: perro, gato
        "plantigrade": "bear",       # apoya toda la planta: oso, humano
        "ungulate": "equine",        # pezuña: caballo, ciervo
    }
    for marcha, arquetipo in PRESTAMOS.items():
        origen = base.get(arquetipo, {}).get("bones")
        if not origen:
            continue
        if len(base.get(marcha, {}).get("bones", [])) > MUNON:
            continue                  # ya tiene cuerpo propio: no se toca
        base.setdefault(marcha, {})
        base[marcha]["bones"] = [[list(a), list(b)] for a, b in origen]
        base[marcha]["label"] = (f"{base[arquetipo].get('label', arquetipo)} "
                                 f"— prestado a la marcha «{marcha}»")
        base[marcha]["_origen"] = f"huesos de `{arquetipo}`"
        print(f"   ↺ {marcha:14s} ← {arquetipo} ({len(origen)} huesos)")
    BASE.write_text(json.dumps(base, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  data/skeletons.json → {sum(1 for k in base if not k.startswith('_'))} arquetipos")
    return 0


if __name__ == "__main__":
    sys.exit(main())
