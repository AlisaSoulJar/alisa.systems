#!/usr/bin/env python3
"""
censo.py — QUÉ TENEMOS. Una sola pregunta, una sola respuesta.
==============================================================================
    python censo.py            # el censo por consola + public/inventario.html

⚠️ POR QUÉ EXISTE (2 de agosto de 2026)

En una sola tarde aparecieron, en nuestra propia carpeta:

  · 22 arneses headless que nadie ejecutaba desde la mudanza — y 5 estaban rotos
  · `js/sfx.js`, 56 sonidos y una radio online, cargado por 1 página de 131
  · siete modelos de roca YA ELEGIDOS, mientras yo pintaba icosaedros
  · 21 esqueletos anatómicos hechos a mano en un fichero de copia de seguridad,
    incluido el `humanoid` que arrastrábamos como «pendiente de rellenar»

Diagnóstico de Oscar, y es el correcto:

    «No nos falta capacidad. Nos falta saber lo que tenemos.»

Esto no mide si algo es bueno. Mide si es **ALCANZABLE**: si existe una página
que lo enseñe, una regla que lo juegue, un arnés que lo pruebe. Una capacidad a
la que no se llega es una capacidad que no tenemos.

Y lo saca a `public/inventario.html`, dentro del sitio. Publicar los propios
huecos es raro; esconderlos es lo normal y es peor. Un banco de pruebas que
presume de verificar no puede tener un inventario que nadie puede auditar.
==============================================================================
"""
import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PUBLIC = RAIZ / "public"
SRC = PUBLIC / "js" / "alisa-engine" / "src"
SALIDA = PUBLIC / "inventario.html"

FUERA = ("node_modules", "vendor", "__pycache__", ".vite")
CODIGO = {".html", ".js", ".json", ".css", ".md"}

#: `.js` con un `?v=4` opcional detrás. Sin esa cola, los imports versionados
#: —los de los módulos más vivos— no se veían y salían como huérfanos.
RE_IMPORT = re.compile(r"""["']([^"']*\.js)(?:\?[^"']*)?(?:#[^"']*)?["']""")
RE_ACTIVO = re.compile(r"[\w %\-\.\(\)\[\]/\\]+\.(?:glb|gltf|vrm|png|jpe?g|webp|ogg|mp3|wav)", re.I)


def leer(p):
    try:
        return p.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


def paginas():
    """Lo que un visitante puede abrir. Eso, y sólo eso, es «alcanzable»."""
    out = []
    for carpeta in ("labs", "rooms", "games", "arcade", "generators", "legacy"):
        out += list((PUBLIC / carpeta).rglob("*.html"))
    out += list(PUBLIC.glob("*.html"))
    return [p for p in out if not any(x in p.parts for x in FUERA)
            and p.name not in ("inventario.html",)]


# ── 1. EL MOTOR: qué sabe hacer y qué de eso se puede ver ─────────
def censar_motor(pags):
    por_nombre = defaultdict(list)
    for p in SRC.rglob("*.js"):
        por_nombre[p.name].append(p)

    importa = {}
    for f in list(SRC.rglob("*.js")) + pags:
        importa[f] = {r.rsplit("/", 1)[-1] for r in RE_IMPORT.findall(leer(f))}

    # De cada página, hasta dónde llega siguiendo imports (4 saltos bastan).
    alcanzados = set()
    for pagina in pags:
        frente = set(importa.get(pagina, ()))
        for _ in range(4):
            nuevo = set()
            for n in frente:
                for m in por_nombre.get(n, []):
                    if m not in alcanzados:
                        alcanzados.add(m)
                        nuevo |= importa.get(m, set())
            frente = nuevo
            if not frente:
                break

    grupos = {}
    for cat in ("world/systems", "world/factories", "soma/plugins", "psyche", "gym"):
        mods = [p for p in SRC.rglob("*.js")
                if str(p.relative_to(SRC)).replace("\\", "/").startswith(cat + "/")
                and p.stat().st_size > 2000]
        oscuros = sorted((p for p in mods if p not in alcanzados),
                         key=lambda x: -x.stat().st_size)
        grupos[cat] = {"total": len(mods), "oscuros": oscuros}
    return grupos


# ── 2. LOS JUEGOS: qué se juega de verdad ────────────────────────
def censar_juegos():
    reglas = sorted(p.stem for p in (PUBLIC / "arcade/js/protohub/rules").glob("*.js"))
    arcade = sorted(p.name for p in (PUBLIC / "arcade").glob("*.html")
                    if p.name != "index.html")
    sin = []
    for pagina in arcade:
        txt = leer(PUBLIC / "arcade" / pagina)
        if not any(f"rules/{r}.js" in txt for r in reglas):
            sin.append(pagina)
    return {"reglas": reglas, "paginas": arcade, "sin_reglas": sin}


# ── 3. LOS RECURSOS: cuánto hay y cuánto se usa ──────────────────
def censar_recursos(pags):
    citados = set()
    for p in PUBLIC.rglob("*"):
        if p.suffix.lower() not in CODIGO or not p.is_file():
            continue
        if any(x in p.parts for x in FUERA):
            continue
        # ⚠️ NO CUENTAN LAS FICHAS QUE VIVEN AL LADO DEL MODELO.
        # `props/` tiene mil `X.glb.katamari.json`, y cada uno nombra su propio
        # `X.glb`. Contándolos, el 99 % de los modelos «se usan» — cada modelo
        # avalándose a sí mismo. Es el mismo círculo que ya cacé al empaquetar
        # y que aquí volví a repetir. Un inventario que se hace la pelota es
        # peor que no tenerlo: da permiso para no mirar.
        # Los catálogos de `data/` SÍ cuentan: nombran modelos ajenos.
        if "props" in p.parts and p.suffix.lower() == ".json":
            continue
        for m in RE_ACTIVO.finditer(leer(p)):
            citados.add(m.group(0).replace("\\", "/").split("/")[-1].lower())

    modelos = [p for p in PUBLIC.rglob("*.glb") if not any(x in p.parts for x in FUERA)]
    usados = [p for p in modelos if p.name.lower() in citados]
    return {"modelos": len(modelos), "usados": len(usados),
            "mb": sum(p.stat().st_size for p in modelos) / 1024 / 1024}


# ── 4. EL SONIDO: capacidad contra alcance ───────────────────────
def censar_sonido(pags):
    sfx = PUBLIC / "js" / "sfx.js"
    if not sfx.exists():
        return None
    txt = leer(sfx)
    sonidos = len(set(re.findall(r"^\s{8}(\w+)\(\)\s*\{", txt, re.M)))
    emisoras = len(set(re.findall(r"somafm\.com/([\w\-]+)", txt)))
    # `set`, porque el patrón encuentra la definición Y la llamada de cada tema:
    # sin esto salían 8 temas donde hay 4.
    temas = len(set(re.findall(r"_(\w+)Theme\s*[\(=]", txt)))
    con = [p.name for p in pags if "sfx.js" in leer(p)]
    return {"sonidos": sonidos, "emisoras": emisoras, "temas": temas,
            "paginas": len(con), "de": len(pags)}


# ── 5. EL PRIOR ART: lo que sólo vive en borradores ──────────────
def censar_borradores(pags):
    borradores = [p for p in PUBLIC.rglob("*.html")
                  if "BACKUP" in p.name or "legacy" in p.parts]
    vivos = [p for p in pags if p not in borradores]

    def activos(lista):
        s = set()
        for p in lista:
            for m in RE_ACTIVO.finditer(leer(p)):
                s.add(m.group(0).split("/")[-1].lower())
        return s

    solo = activos(borradores) - activos(vivos)
    # Sólo cuenta lo que además EXISTE en disco: rescatable, no un recuerdo.
    en_disco = {a for a in solo if any(PUBLIC.rglob(a)) or any(PUBLIC.rglob(a.title()))}
    return {"ficheros": len(borradores), "activos_exclusivos": sorted(en_disco)[:14],
            "n": len(en_disco)}


# ── 6. LOS MUÑONES: datos que fingen estar ───────────────────────
def censar_munones():
    out = []
    esq = PUBLIC / "data" / "skeletons.json"
    if esq.exists():
        d = json.loads(leer(esq))
        munones = [k for k, v in d.items()
                   if not k.startswith("_") and len(v.get("bones", [])) <= 2]
        out.append(("skeletons.json", len(munones),
                    sum(1 for k in d if not k.startswith("_")), munones[:6]))
    return out


def barra(hechos, total, ancho=22):
    n = 0 if not total else round(ancho * hechos / total)
    return "█" * n + "·" * (ancho - n)


def main():
    pags = paginas()
    motor = censar_motor(pags)
    juegos = censar_juegos()
    recursos = censar_recursos(pags)
    sonido = censar_sonido(pags)
    borradores = censar_borradores(pags)
    munones = censar_munones()

    print("=" * 78)
    print("  QUÉ TENEMOS")
    print("=" * 78)
    print(f"  {len(pags)} páginas abribles · {sum(1 for _ in SRC.rglob('*.js'))} módulos de motor\n")

    print("── el motor: qué se puede VER ──")
    for cat, d in motor.items():
        vis = d["total"] - len(d["oscuros"])
        print(f"  {cat:18s} {barra(vis, d['total'])} {vis:3d}/{d['total']:<3d}")
        for p in d["oscuros"][:4]:
            print(f"        · a oscuras: {p.name} ({p.stat().st_size // 1024} KB)")

    print(f"\n── los juegos ──")
    print(f"  reglas locales: {len(juegos['reglas'])}  ({', '.join(juegos['reglas'])})")
    print(f"  páginas de arcade sin reglas: {len(juegos['sin_reglas'])}"
          f"  ({', '.join(juegos['sin_reglas'])})")

    print(f"\n── los recursos ──")
    print(f"  modelos en disco: {recursos['modelos']:,} ({recursos['mb']:,.0f} MB)")
    print(f"  los nombra alguien: {recursos['usados']:,}"
          f"  ({100 * recursos['usados'] / max(1, recursos['modelos']):.0f} %)")

    if sonido:
        print(f"\n── el sonido ──")
        print(f"  {sonido['sonidos']} sonidos · {sonido['temas']} temas · "
              f"{sonido['emisoras']} emisoras online")
        print(f"  páginas que lo cargan: {sonido['paginas']} de {sonido['de']}")

    print(f"\n── prior art: borradores y copias ──")
    print(f"  {borradores['ficheros']} ficheros apartados")
    print(f"  recursos que SÓLO viven ahí y están en disco: {borradores['n']}")
    if borradores["activos_exclusivos"]:
        print(f"        {', '.join(borradores['activos_exclusivos'][:8])}")

    for fichero, n, total, cuales in munones:
        estado = "✓ ninguno" if not n else f"⚠️ {n} de {total}: {', '.join(cuales)}"
        print(f"\n── muñones en {fichero} ──\n  {estado}")

    escribir_pagina(pags, motor, juegos, recursos, sonido, borradores, munones)
    print(f"\n  escrito {SALIDA.relative_to(RAIZ)}")
    return 0


def escribir_pagina(pags, motor, juegos, recursos, sonido, borradores, munones):
    def fila(nombre, hechos, total, detalle=""):
        pct = 0 if not total else 100 * hechos / total
        color = "#7CFC98" if pct > 90 else "#e0b020" if pct > 60 else "#ff8080"
        return (f'<tr><td>{nombre}</td>'
                f'<td class="n">{hechos}/{total}</td>'
                f'<td class="b"><i style="width:{pct:.0f}%;background:{color}"></i></td>'
                f'<td class="d">{detalle}</td></tr>')

    filas = []
    for cat, d in motor.items():
        vis = d["total"] - len(d["oscuros"])
        oscuros = ", ".join(p.name.replace(".js", "") for p in d["oscuros"][:5])
        filas.append(fila(f"motor · {cat}", vis, d["total"],
                          f"a oscuras: {oscuros}" if oscuros else "todo se puede ver"))
    filas.append(fila("arcade · páginas con reglas",
                      len(juegos["paginas"]) - len(juegos["sin_reglas"]),
                      len(juegos["paginas"]),
                      "sin reglas: " + ", ".join(s.replace(".html", "")
                                                 for s in juegos["sin_reglas"])))
    filas.append(fila("recursos · modelos que alguien nombra",
                      recursos["usados"], recursos["modelos"],
                      f"{recursos['mb']:,.0f} MB en disco"))
    if sonido:
        filas.append(fila("sonido · páginas que lo usan", sonido["paginas"], sonido["de"],
                          f"{sonido['sonidos']} sonidos, {sonido['temas']} temas y "
                          f"{sonido['emisoras']} emisoras esperando"))
    for fichero, n, total, cuales in munones:
        filas.append(fila(f"datos · {fichero} completos", total - n, total,
                          ("muñones: " + ", ".join(cuales)) if n else "sin muñones"))

    SALIDA.write_text(f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALISA — Qué tenemos</title>
<link rel="stylesheet" href="/vendor/fonts/fuentes.css">
<style>
 body{{margin:0;background:#0b0e14;color:#cfe3f5;font-family:ui-monospace,monospace;
      padding:26px 30px 70px;font-size:12px;line-height:1.75}}
 h1{{font-size:13px;letter-spacing:.24em;color:#7fd0ff;font-weight:400;margin:0 0 8px}}
 .sub{{color:#5f7a92;font-size:11px;max-width:900px;line-height:1.95;margin-bottom:20px}}
 table{{border-collapse:collapse;width:100%;max-width:1100px}}
 td{{padding:7px 10px;border-bottom:1px solid #16202c;vertical-align:middle}}
 .n{{color:#93a7b8;white-space:nowrap;text-align:right;width:70px}}
 .b{{width:180px}} .b i{{display:block;height:7px;border-radius:3px}}
 .b{{background:#16202c;border-radius:3px}}
 .d{{color:#41566b;font-size:11px}}
 footer{{margin-top:26px;color:#41566b;font-size:11px;max-width:900px;line-height:1.9}}
 code{{color:#7fd0ff}}
</style></head><body>
<h1>▓ QUÉ TENEMOS</h1>
<div class="sub">
  Esto no mide si algo es bueno: mide si es <b>alcanzable</b> — si existe una
  página que lo enseñe, una regla que lo juegue, un dato completo detrás.
  Una capacidad a la que no se llega es una capacidad que no tenemos.<br>
  {len(pags)} páginas abribles · {sum(1 for _ in SRC.rglob('*.js'))} módulos de motor
  · generado el {date.today().isoformat()} con <code>censo.py</code>
</div>
<table>{''.join(filas)}</table>
<footer>
  Publicamos esta lista a propósito. En una sola tarde aparecieron en nuestra
  carpeta 22 arneses que nadie ejecutaba, un motor de audio de {sonido['sonidos'] if sonido else '?'}
  sonidos cargado por una página, siete modelos de roca ya elegidos mientras se
  pintaban icosaedros, y 21 esqueletos anatómicos hechos a mano dentro de un
  fichero de copia de seguridad.<br>
  No nos faltaba capacidad: nos faltaba saber lo que teníamos. Un proyecto que
  presume de verificar no puede tener un inventario que nadie pueda auditar.
</footer>
</body></html>
""", encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
