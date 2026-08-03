"""Las figuras de la baraja apuntaban a una ruta anterior a la reorganización.

`/colony/arcade/assets/cards/courts` -> `/arcade/assets/cards/courts`

Las 12 imágenes (J/Q/K de los cuatro palos) ESTABAN ahí todo el tiempo: solo se
pedían donde ya no viven. El póker y el blackjack cargaban con 12 errores de red
cada uno y dibujaban las figuras con un apaño.

Mismo patrón que dejó escrito otro fichero del motor:
    // was '/colony/libs/tween.js/...' (pre-reorg absolute path → 404)
o sea que esto es un rastro conocido de la mudanza, no un caso aislado.

CONTROL POSITIVO: antes de tocar nada, comprueba que el destino existe de
verdad. Reescribir rutas hacia una carpeta vacía sería cambiar un fallo ruidoso
por uno silencioso, que es peor.
"""
import pathlib
import sys

RAIZ = pathlib.Path(r"Q:\alisa_project\alisa\World\Synthesis\Web\alisa-systems\public")
VIEJA, NUEVA = "/colony/arcade/assets", "/arcade/assets"

destino = RAIZ / "arcade/assets/cards/courts"
figuras = sorted(p.name for p in destino.glob("*.webp")) if destino.is_dir() else []
esperadas = [f"{palo}_{fig}.webp" for palo in "CDHS" for fig in "JKQ"]
faltan = [f for f in esperadas if f not in figuras]
if faltan:
    print(f"  CONTROL FALLIDO: faltan {len(faltan)} figuras en {destino}: {faltan[:4]}")
    print("  No reescribo rutas hacia una carpeta incompleta.")
    raise SystemExit(2)
print(f"  control ok: las 12 figuras estan en {destino.relative_to(RAIZ)}\n")

aplicar = "--aplicar" in sys.argv
for f in RAIZ.rglob("*"):
    if f.suffix not in (".js", ".html") or "node_modules" in f.parts:
        continue
    try:
        txt = f.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        continue
    if VIEJA not in txt:
        continue
    print(f"  {f.relative_to(RAIZ)}  ({txt.count(VIEJA)})")
    if aplicar:
        f.write_text(txt.replace(VIEJA, NUEVA), encoding="utf-8")

print("\n  " + ("APLICADO" if aplicar else "dry-run (pasa --aplicar)"))
