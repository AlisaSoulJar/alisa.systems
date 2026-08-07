"""
gen_escaparate.py — el lab PÚBLICO: lo que se declara, y nada más
═══════════════════════════════════════════════════════════════════════════════
    python gen_escaparate.py        →  public/escaparate.html

QUÉ PROBLEMA RESUELVE
`/lab` lista 116 cosas porque las recoge del disco: todo lo que haya, sale. Más
de un tercio no es escaparate sino taller — `croupier_arista_self`,
`croupier_confessional`, `room_queen_office`, `room_arachne_ingestion`. Eso no
enseña de qué es capaz el motor: enseña cómo vivimos.

⚠️ SE DECLARA, NO SE FILTRA. Y ESA ES TODA LA DECISIÓN.
Lo natural sería una lista de exclusiones. Es la opción peligrosa, y no por
gusto: con una lista negra **cada página nueva es pública hasta que alguien se
acuerde de taparla**. El olvido publica. Al revés, el olvido no hace nada.

Así que cada página que quiera salir lo dice en su propio HTML:

    <meta name="alisa-escaparate" content="motor/render">
    <meta name="alisa-muestra"    content="Subdivisión procedural, sin un solo asset">

Tres cosas se ganan de una vez:
  · el defecto es seguro — un experimento interno nuevo no sale solo;
  · no hay lista paralela: la declaración vive en la página que describe, que es
    la ley que más veces se ha pagado en este proyecto;
  · y `alisa-muestra` obliga a la pregunta correcta —¿qué capacidad demuestra
    esto?—. Si no se sabe escribir esa frase, la página no pertenece aquí. El
    filtro de calidad sale gratis del formato.

⚠️ Y ADEMÁS SE COMPRUEBA, PORQUE DECLARARSE NO BASTA
Una página puede declararse y aun así llamar al hub de la colonia o enlazar sus
salas. Aquí eso NO se avisa: se excluye y se dice por qué. Es una pregunta
distinta de la que hace `necesita_colonia()` en `gen_lab_index.py` —aquélla es
«¿funciona sin la colonia?» y ésta es «¿es seguro publicarlo?»— y por eso vive
aparte en vez de reutilizarse.
"""
import os
import re
import json

PUB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")

# Lo que delata que una página tira de la casa. Excluye aunque se declare.
RASTROS_DE_CASA = [
    (r"127\.0\.0\.1", "llama a una dirección local nuestra"),
    (r"\b8741\b", "usa el puerto del hub de la colonia"),
    (r"ALISA_HUB_URL", "espera el hub de la colonia"),
    (r"/colony/", "enlaza rutas de la colonia"),
    (r"\bJobBoard\b|\bNEURO\b|\bKARMA\b", "menciona la economía interna"),
]

# El orden en que se presentan. Al desconocido que llega no le dice nada «labs»
# ni «rooms»; le dice algo «qué sabe hacer esto».
ORDEN = [
    ("juegos", "Juegos", "Diecinueve, y los mismos para personas, políticas y modelos."),
    ("gym", "Gym y verificación", "Una partida se verifica volviéndola a jugar. Sin jueces."),
    ("motor/render", "Motor y render", "Lo que dibuja: procedural, LOD, voxel, cámara."),
    ("fisica", "Física y vida artificial", "Bandadas, enjambres, depredadores, acumulación."),
    ("avatares", "Avatares y rigging", "Esqueletos, caras y arquetipos."),
    ("factorias", "Factorías y plugins", "Las piezas que se componen para construir lo demás."),
]

META = re.compile(
    r'<meta\s+name=["\']alisa-(escaparate|muestra)["\']\s+content=["\']([^"\']*)["\']',
    re.I)


def declara(path):
    """Lee la declaración de una página. Devuelve None si no se declara."""
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            txt = f.read(200000)
    except OSError:
        return None
    campos = {k.lower(): v.strip() for k, v in META.findall(txt)}
    if not campos.get("escaparate"):
        return None
    motivos = [por_que for patron, por_que in RASTROS_DE_CASA
               if re.search(patron, txt)]
    return {
        "categoria": campos["escaparate"].strip(),
        "muestra": campos.get("muestra", ""),
        "rastros": motivos,
    }


def recorrer():
    """Todas las páginas declaradas, con su veredicto."""
    fuera, dentro = [], []
    for raiz, _dirs, ficheros in os.walk(PUB):
        # El manifiesto es un artefacto preservado de otra época; no es escaparate.
        if "manifiesto" in raiz or "vendor" in raiz:
            continue
        for f in ficheros:
            if not f.endswith(".html"):
                continue
            ruta = os.path.join(raiz, f)
            d = declara(ruta)
            if not d:
                continue
            d["rel"] = os.path.relpath(ruta, PUB).replace("\\", "/")
            d["titulo"] = titulo_de(ruta)
            (fuera if d["rastros"] else dentro).append(d)
    return dentro, fuera


"""
⚠️ SEGUNDA FUENTE: LAS PIEZAS SE DECLARAN CON SU CÓDIGO, NO CON UN `<meta>`.

Los entornos de gym no son páginas: son módulos del motor. No pueden llevar una
etiqueta HTML. Pero se declaran igual, y mejor: **exponiendo `reset`, `step` y
`getObservation`**. Eso es una declaración más fuerte que un `<meta>`, porque no
se puede poner de adorno — si mientes, no funciona.

La lee `clasificar_piezas.mjs` y la deja en `clasificacion_piezas.json`.

⚠️ Y SE LES APLICA EL MISMO GUARDIÁN. Que una pieza se clasifique sola no basta:
se revisa su código fuente en busca de rastros de casa igual que a las páginas.
Sin esto, cualquier módulo nuevo del motor entraría solo en el escaparate — que
es justo la propiedad que este diseño existe para impedir.
"""
INFRAESTRUCTURA = {
    # No son entornos que jugar: son el contrato que los define. Enseñarlos
    # mezclados con los jugables haría creer que hay 17 juegos y hay 14.
    "GymEnv": "la clase base: define las tres puertas",
    "GymBridge": "el puente para conducir el navegador desde fuera",
    "ProtoHubEnv": "el adaptador que convierte los 19 juegos en entornos",
}


def entornos_de_gym():
    """Los entornos del motor, sacados de cómo se declaran en su propio código."""
    ruta = os.path.join(PUB, "data", "clasificacion_piezas.json")
    if not os.path.exists(ruta):
        return [], []
    with open(ruta, encoding="utf-8") as f:
        datos = json.load(f)

    jugables, contrato = [], []
    for p in datos.get("piezas", []):
        if p.get("clase") != "gym":
            continue
        fuente = os.path.join(PUB, "js", "alisa-engine", "src", p["ruta"])
        try:
            with open(fuente, encoding="utf-8", errors="ignore") as f:
                txt = f.read()
        except OSError:
            continue
        if [1 for patron, _ in RASTROS_DE_CASA if re.search(patron, txt)]:
            continue                      # el mismo guardián que para las páginas
        item = {
            "rel": f"labs/pieza.html?m={p['ruta']}",
            "titulo": p["nombre"],
            "muestra": (INFRAESTRUCTURA.get(p["nombre"])
                        or f"{', '.join(p['gym'][:3])} — {p['kb']} KB"),
        }
        (contrato if p["nombre"] in INFRAESTRUCTURA else jugables).append(item)
    return jugables, contrato


def titulo_de(path):
    try:
        with open(path, encoding="utf-8", errors="ignore") as f:
            m = re.search(r"<title>(.*?)</title>", f.read(20000), re.S | re.I)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else os.path.basename(path)
    except OSError:
        return os.path.basename(path)


def escribir(dentro, fuera):
    por_cat = {}
    for d in dentro:
        por_cat.setdefault(d["categoria"], []).append(d)

    # Los entornos entran por su código, no por un `<meta>`. Ver la nota de
    # `entornos_de_gym()`.
    jugables, contrato = entornos_de_gym()
    por_cat.setdefault("gym", []).extend(jugables + contrato)
    # ⚠️ El total cuenta LAS DOS fuentes. La primera versión imprimía
    # `len(dentro)` —sólo las páginas con `<meta>`— y decía «10 piezas» con 27
    # dentro. Un número mal en el propio escaparate es de lo peor que puede
    # haber: es la primera cifra que alguien comprueba.
    total = sum(len(v) for v in por_cat.values())

    bloques = []
    for clave, titulo, sub in ORDEN:
        items = sorted(por_cat.pop(clave, []), key=lambda d: d["titulo"])
        if not items:
            continue
        tarjetas = "\n".join(
            f'      <a class="t" href="/{d["rel"]}">'
            f'<b>{d["titulo"]}</b><span>{d["muestra"]}</span></a>'
            for d in items)
        bloques.append(
            f'    <section>\n      <h2>{titulo}</h2>\n'
            f'      <p class="sub">{sub}</p>\n{tarjetas}\n    </section>')

    # Una categoría inventada no se traga en silencio: se enseña al final para
    # que se vea y se decida, en vez de desaparecer del escaparate sin avisar.
    for clave, items in por_cat.items():
        tarjetas = "\n".join(
            f'      <a class="t" href="/{d["rel"]}"><b>{d["titulo"]}</b>'
            f'<span>{d["muestra"]}</span></a>' for d in items)
        bloques.append(
            f'    <section>\n      <h2>{clave}</h2>\n'
            f'      <p class="sub">⚠️ categoría no declarada en ORDEN, revísala</p>\n'
            f'{tarjetas}\n    </section>')

    page = f"""<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALISA — de qué es capaz el motor</title>
<link rel="stylesheet" href="/vendor/fonts/fuentes.css">
<style>
  :root {{ color-scheme: light; }}
  body {{ margin:0; background:#f7f9fb; color:#1a2230;
         font:14px/1.7 'JetBrains Mono', ui-monospace, monospace; padding:44px 22px; }}
  main {{ max-width:900px; margin:0 auto; }}
  h1 {{ font-size:13px; letter-spacing:.45em; text-transform:uppercase;
       font-weight:400; margin:0 0 6px; }}
  .lede {{ font-size:12px; color:#6b7684; margin:0 0 40px; max-width:60ch; }}
  section {{ margin:0 0 34px; }}
  h2 {{ font-size:11px; letter-spacing:.28em; text-transform:uppercase;
       color:#39485c; margin:0 0 4px; font-weight:400; }}
  .sub {{ font-size:11.5px; color:#8b95a3; margin:0 0 14px; }}
  a.t {{ display:block; border:1px solid #dde3ea; border-radius:4px; background:#fff;
        padding:12px 14px; margin-bottom:7px; text-decoration:none; color:inherit; }}
  a.t:hover {{ border-color:#1a2230; }}
  a.t b {{ display:block; font-weight:500; font-size:13px; }}
  a.t span {{ display:block; font-size:11.5px; color:#6b7684; margin-top:3px; }}
  footer {{ font-size:11px; color:#8b95a3; border-top:1px solid #dde3ea;
           padding-top:16px; margin-top:20px; }}
</style>
</head>
<body>
<main>
  <h1>de qué es capaz el motor</h1>
  <p class="lede">
    Todo lo de aquí corre en el navegador, sin instalar nada y sin ningún
    servidor nuestro detrás. Cada pieza dice qué demuestra.
  </p>
{chr(10).join(bloques)}
  <footer>
    {total} piezas, de dos fuentes que se declaran solas: las páginas con
    <code>&lt;meta name="alisa-escaparate"&gt;</code> y los módulos del motor que
    exponen <code>reset</code>/<code>step</code>/<code>getObservation</code> — una
    declaración más fuerte que una etiqueta, porque no se puede poner de adorno.
    Lo que no se declara no sale: un experimento interno nuevo nunca aparece por
    olvido.
  </footer>
</main>
</body>
</html>
"""
    salida = os.path.join(PUB, "escaparate.html")
    with open(salida, "w", encoding="utf-8") as f:
        f.write(page)
    return salida


if __name__ == "__main__":
    dentro, fuera = recorrer()
    salida = escribir(dentro, fuera)
    jugables, contrato = entornos_de_gym()
    print(f"\nescaparate: {len(dentro) + len(jugables) + len(contrato)} piezas → {salida}")
    print(f"  {len(dentro)} páginas declaradas con <meta>")
    print(f"  {len(jugables)} entornos de gym + {len(contrato)} piezas de contrato")
    for d in sorted(dentro, key=lambda x: x["categoria"]):
        print(f"  · {d['categoria']:<14} {d['titulo'][:48]}")
    if fuera:
        print(f"\n⚠️ {len(fuera)} se declaran pero NO se publican:")
        for d in fuera:
            print(f"  ✗ {d['rel']}  — {', '.join(d['rastros'])}")
    if not dentro:
        print("\n  (ninguna página se ha declarado todavía: el escaparate sale vacío,")
        print("   que es el fallo seguro de este diseño — no se publica nada por error)")
