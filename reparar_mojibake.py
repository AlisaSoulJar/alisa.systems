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

# Un tramo sospechoso: empieza por Ã/Â/â —las tres cabezas típicas— y sigue con
# caracteres del repertorio cp1252 que salen de una segunda codificación.
TRAMO = re.compile(r"[ÃÂâ][\u0080-\u00bf\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u2020"
                   r"\u2021\u2022\u2026\u2030\u20ac\u2039\u203a\u02c6\u02dc\u0152\u0153"
                   r"\u0160\u0161\u0178\u017d\u017e\u0192]+")


def reparar(txt):
    """Devuelve (texto_reparado, nº de tramos arreglados)."""
    arreglos = 0

    def sustituir(m):
        nonlocal arreglos
        try:
            bueno = m.group(0).encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            return m.group(0)          # no era mojibake: se queda como está
        arreglos += 1
        return bueno

    return TRAMO.sub(sustituir, txt), arreglos


# ── CONTROL POSITIVO ───────────────────────────────────────────────────────
CONOCIDO = ("ALISA â€” Corporate Building", "ALISA — Corporate Building")
salida, n = reparar(CONOCIDO[0])
if salida != CONOCIDO[1] or n != 1:
    print(f"  CONTROL POSITIVO FALLIDO: {CONOCIDO[0]!r} -> {salida!r}")
    print("  El reparador no arregla un caso que SÉ que existe. No me fío del escaneo.")
    raise SystemExit(2)
print(f"  control positivo ok: {CONOCIDO[0]!r} -> {salida!r}\n")

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
