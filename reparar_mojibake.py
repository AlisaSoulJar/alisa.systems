"""Reparar texto codificado DOS veces (mojibake) en el sitio.

Síntoma: `ALISA â€” Corporate Building`. El guion largo (U+2014) se guardó en
UTF-8 (E2 80 94), y esos tres bytes se releyeron como cp1252 y se volvieron a
codificar en UTF-8. El fichero declara UTF-8 y ES UTF-8 válido — por eso nadie
lo vio en meses: no hay error, solo texto roto. Viene de recuperar ficheros del
backup leyéndolos con la codificación equivocada.

⚠️ El primer intento hacía la vuelta con el FICHERO ENTERO y encontró cero
casos, incluido el que tenía delante. El motivo: los ficheros son una MEZCLA —
parte sana con caracteres que no caben en cp1252 (emoji, ✅), parte rota. La
vuelta entera reventaba y el fichero se descartaba en silencio. Hay que reparar
TRAMO a TRAMO.

Y por eso esto lleva CONTROL POSITIVO: antes de escanear nada, se repara un
caso conocido. Si no sale, el script se declara inválido (código 2) en vez de
decir tranquilamente "0 encontrados", que es la peor respuesta posible: parece
una buena noticia.

    python reparar_mojibake.py           # dry-run
    python reparar_mojibake.py --aplicar
"""
import pathlib
import re
import sys

RAIZ = pathlib.Path(r"Q:\alisa_project\alisa\World\Synthesis\Web\alisa-systems\public")
EXT = {".html", ".js", ".json", ".md", ".css"}

# Un tramo sospechoso: empieza por una CABEZA y sigue con caracteres del
# repertorio windows-1252 que salen de una segunda codificación.
#
# ⚠️ DOS ARREGLOS DEL 2026-08-26, DESPUÉS DE QUE ESTO DIJERA «0» CON UN RÓTULO
#    ROTO EN PANTALLA: el título de ¡Busca! 3 ponía `ðŸ¢ CORPORATE BUILDING`.
#
# 1) LA CABEZA. Sólo se admitían Ã/Â/â, que arrancan las secuencias UTF-8 de 2 y
#    3 bytes. Un emoji son CUATRO bytes y empieza por 0xF0 → `ð`. Ningún rótulo
#    con emoji podía cazarse, y los rótulos son lo que más se ve.
#
#    Y se añade `ð` SOLO, no el rango C2–F4 entero que sería lo «correcto»: con
#    el rango entra `É»` —la «É» de «NO LO SÉ» pegada a la comilla de cierre—,
#    que es castellano sano y cuyos bytes C9 BB son UTF-8 válido. Se
#    «repararía» a `ɻ` y nos cargaríamos la tilde de una frase correcta, en
#    cuatro ficheros del motor. `ð` no existe en castellano; las cajas y los
#    guiones largos ya entraban por `â`.
#
# 2) EL CODEC. `encode("cp1252")` REVIENTA en las cinco posiciones que cp1252
#    deja sin definir —0x81 0x8D 0x8F 0x90 0x9D— y el `except` de abajo se
#    tragaba el tramo dándolo por sano. El «windows-1252» de un navegador es la
#    norma WHATWG, que mapea esos huecos a su propio control C1. Y 🏢 es
#    F0 9F 8F A2: lleva un 0x8F dentro. Por eso la tabla se fabrica aquí.
_HUECOS = {0x81, 0x8D, 0x8F, 0x90, 0x9D}
_CH = {b: (chr(b) if b in _HUECOS else bytes([b]).decode("cp1252")) for b in range(256)}
_BYTE = {c: b for b, c in _CH.items()}
TRAMO = re.compile(r"[ÃÂâð][\u0080-\u00bf\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u2020"
                   r"\u2021\u2022\u2026\u2030\u20ac\u2039\u203a\u02c6\u02dc\u0152\u0153"
                   r"\u0160\u0161\u0178\u017d\u017e\u0192]+")


def reparar(txt):
    """Devuelve (texto_reparado, nº de tramos arreglados)."""
    arreglos = 0

    def sustituir(m):
        nonlocal arreglos
        try:
            bueno = bytes(_BYTE[c] for c in m.group(0)).decode("utf-8")
        except (KeyError, UnicodeDecodeError):
            return m.group(0)          # no era mojibake: se queda como está
        arreglos += 1
        return bueno

    return TRAMO.sub(sustituir, txt), arreglos


# ── CONTROL POSITIVO ───────────────────────────────────────────────────────
CONOCIDOS = [
    ("ALISA â€” Corporate Building", "ALISA — Corporate Building"),
    # ⚠️ El caso que se escapó hasta el 2026-08-26. Iba en el <title> y en el HUD
    # de ¡Busca! 3, o sea en lo primero que ve una persona que abre el juego, y
    # este comprobador decía «0 con doble codificación» mientras tanto.
    ("ðŸ¢ CORPORATE BUILDING", "🏢 CORPORATE BUILDING"),
]
for malo, bien in CONOCIDOS:
    salida, n = reparar(malo)
    if salida != bien or n != 1:
        print(f"  CONTROL POSITIVO FALLIDO: {malo!r} -> {salida!r}")
        print("  El reparador no arregla un caso que SÉ que existe. No me fío del escaneo.")
        raise SystemExit(2)
    print(f"  control positivo ok: {malo!r} -> {salida!r}")

# ── CONTROL NEGATIVO ───────────────────────────────────────────────────────
#
# Un reparador que arregla de más es peor que uno que no arregla: cambia texto
# BUENO y nadie va a revisar 1798 ficheros para descubrirlo. `É»` es la «É» de
# «NO LO SÉ» seguida de la comilla de cierre, y sus bytes C9 BB son UTF-8
# válido: un detector ingenuo la «arregla» a `ɻ` y se lleva por delante la tilde.
# Aparece en cuatro ficheros del motor, así que esto no es hipotético.
SANOS = ["«NO LO SÉ» no es lo mismo", "una canción· y un año", "✅ hecho · 100 %"]
for sano in SANOS:
    salida, n = reparar(sano)
    if salida != sano or n != 0:
        print(f"  CONTROL NEGATIVO FALLIDO: {sano!r} -> {salida!r}")
        print("  El reparador toca texto SANO. Prefiero no reparar nada a estropear esto.")
        raise SystemExit(2)
print(f"  control negativo ok: {len(SANOS)} frases sanas se quedan como están\n")

aplicar = "--aplicar" in sys.argv
revisados = tocados = 0

for f in RAIZ.rglob("*"):
    if f.suffix.lower() not in EXT or "node_modules" in f.parts:
        continue
    revisados += 1
    try:
        txt = f.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    nuevo, n = reparar(txt)
    if n == 0 or nuevo == txt:
        continue
    tocados += 1
    m = TRAMO.search(txt)
    print(f"  {f.relative_to(RAIZ)}  ({n} tramos)")
    print(f"      ...{txt[max(0, m.start()-30):m.start()+25]!r}...".replace("\\n", " "))
    if aplicar:
        f.write_text(nuevo, encoding="utf-8")

print(f"\n  {revisados} ficheros revisados · {tocados} con doble codificacion")
print("  " + ("APLICADO" if aplicar else "dry-run: nada escrito (pasa --aplicar)"))
