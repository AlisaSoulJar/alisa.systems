"""
gen_motor_manifest.py — la lista de piezas del motor, sacada del disco
═══════════════════════════════════════════════════════════════════════════════
    python gen_motor_manifest.py    →  public/data/motor.json

Sirve a `labs/catalogo.html`, que carga cada pieza, la inspecciona y la clasifica.

⚠️ SE GENERA, NO SE ESCRIBE. Una lista de 180 módulos a mano se separa del disco
en la primera semana — y en este proyecto ya hemos pagado esa factura tres veces
(`board`/`tablero`, la lista de juegos, las opciones de asiento). Aquí el disco
manda.

No entran los artefactos de build (`dist/`), las pruebas ni los runners: no son
piezas del motor, son andamio.
"""
import os
import json

AQUI = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(AQUI, "public", "js", "alisa-engine", "src")
FUERA = ("dist", "tests", "gym_runners", "vendor", "node_modules")

# Ficheros que están dentro de `src/` y NO son piezas del motor. Se excluyen por
# nombre porque son pocos y concretos; una regla más lista se equivocaría más.
# `vite.config.js` salía en el catálogo como «pieza rota» —no puede resolver
# `vite`— y no está rota: es que no es una pieza. Un falso positivo en una lista
# de fallos enseña a ignorar la lista.
NO_SON_PIEZAS = {"vite.config.js"}


def piezas():
    salida = []
    for raiz, dirs, ficheros in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in FUERA]
        for f in sorted(ficheros):
            if not f.endswith(".js") or f in NO_SON_PIEZAS:
                continue
            ruta = os.path.relpath(os.path.join(raiz, f), SRC).replace("\\", "/")
            salida.append({
                "ruta": ruta,
                "nombre": os.path.splitext(f)[0],
                # La carpeta dice mucho de qué clase de pieza es: `systems`,
                # `factories`, `plugins`, `envs`… Se guarda para poder agrupar
                # sin volver a adivinar por el nombre.
                "familia": os.path.basename(os.path.dirname(ruta)) or "raiz",
                "kb": round(os.path.getsize(os.path.join(raiz, f)) / 1024, 1),
            })
    return salida


if __name__ == "__main__":
    p = piezas()
    destino = os.path.join(AQUI, "public", "data", "motor.json")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    with open(destino, "w", encoding="utf-8") as f:
        json.dump({"piezas": p, "total": len(p)}, f, ensure_ascii=False, indent=1)

    por_familia = {}
    for x in p:
        por_familia[x["familia"]] = por_familia.get(x["familia"], 0) + 1
    print(f"\n{len(p)} piezas → {destino}")
    for fam, n in sorted(por_familia.items(), key=lambda kv: -kv[1]):
        print(f"  {fam:<18} {n:>3}")
