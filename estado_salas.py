"""Qué se puede jugar HOY sin nada levantado, medido fichero a fichero.

Escribe `public/data/estado_salas.json`, que `gen_lab_index.py` pinta como sello
en cada tarjeta. Regla honesta:

  ok      → la página registra reglas locales en el ProtoHub: se juega sola.
  obras   → ES un juego (tiene su visualizador) pero aún no tiene reglas locales.
  indice  → no es un juego: es una portada que lista otros juegos.
  (nada)  → no lo he medido; prefiero un hueco a un sello inventado.

No marco como roto lo que simplemente necesita la colonia: eso ya lo señala el
índice aparte, y no está roto — es que no es del motor.

⚠️ POR QUÉ CAMBIÓ ESTO (2 de agosto de 2026)
Antes sólo había `ok` y `roto`, y `roto` se pintaba en el catálogo como un
**FALLA** rojo. Resultado: ocho insignias rojas en la portada del proyecto…
sobre páginas que no fallan.

Y en cuatro de los ocho la etiqueta era directamente falsa: `ticks.html`,
`casino.html` y `synergy.html` **no son juegos**, son portadas que enlazan a
peatón, snake y fagocito — que funcionan los tres. Estábamos llamando rotas a
tres páginas correctas y asustando a quien llegara.

Decir «en obras» de lo que está en obras es honesto. Decir «FALLA» de lo que
funciona es un autogol.
"""
import json
import pathlib
import re

PUB = pathlib.Path(r"Q:\alisa_project\alisa\World\Synthesis\Web\alisa-systems\public")

estado = {}

# ── El arcade: ¿registra reglas locales? ────────────────────────────────────
for f in sorted((PUB / "arcade").glob("*.html")):
    if f.name == "index.html":
        continue
    txt = f.read_text(encoding="utf-8", errors="replace")
    registra = "ALISA_PROTOHUB" in txt and "registrar(" in txt
    # ¿Tiene visualizador propio? Entonces es un juego. Si no lo tiene y encima
    # enlaza a otras páginas del arcade, es una portada de categoría.
    tiene_visor = "_visualizer.js" in txt
    enlaza_juegos = len(re.findall(r'href="(\w+)\.html"', txt)) >= 2

    if registra:
        estado[f"arcade/{f.name}"] = "ok"
    elif not tiene_visor and enlaza_juegos:
        estado[f"arcade/{f.name}"] = "indice"
    else:
        estado[f"arcade/{f.name}"] = "obras"

# ── Los juegos y la sala: medido en el navegador (lienzo pintado, 0 errores) ─
medido_ok = [
    "rooms/room_sala_del_huevo.html",
    "games/raccoon_floor_search.html",
    "games/raccoon_city_sector.html",
    "games/croupier_corporate_building.html",
    "games/croupier_cabinet_escape.html",
    "games/raccoon_space.html",
]
for r in medido_ok:
    if (PUB / r).exists():
        estado[r] = "ok"

destino = PUB / "data" / "estado_salas.json"
destino.parent.mkdir(exist_ok=True)
destino.write_text(json.dumps(estado, indent=1, ensure_ascii=False), encoding="utf-8")

cuenta = {v: sum(1 for x in estado.values() if x == v) for v in set(estado.values())}
print(f"  {len(estado)} páginas evaluadas · "
      + " · ".join(f"{n} {k}" for k, n in sorted(cuenta.items(), key=lambda x: -x[1])))
for etiqueta, titulo in (("obras", "juegos en obras (sin reglas locales todavía)"),
                         ("indice", "portadas de categoría (no son juegos, y no fallan)")):
    items = [k for k, v in sorted(estado.items()) if v == etiqueta]
    if items:
        print(f"\n  {titulo}:")
        for k in items:
            print(f"    {k}")
