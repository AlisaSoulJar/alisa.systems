#!/usr/bin/env python3
"""
empaquetar.py — construir lo que se publica, sin tocar lo que tenemos
==============================================================================
    python empaquetar.py --simulacro   # qué viajaría y cuánto pesa
    python empaquetar.py               # construye dist_publico/

⚠️ POR QUÉ NO BORRA NADA
`public/` es a la vez nuestro taller y el producto. Pesa 670 MB porque dentro
hay una biblioteca de recursos entera: fuentes de Blender, mallas en FBX y OBJ,
packs con sus vistas previas. Eso es *nuestro*, y se queda. Lo que no puede
pasar es que el visitante lo pague.

Así que esto **copia** lo publicable a `dist_publico/`. Si me equivoco al elegir,
se borra la carpeta y se vuelve a construir. Nada de lo que tenemos depende de
que yo acierte a la primera — que ya nos costó una vez perder datos sin control
de versiones.

LAS TRES REGLAS
---------------
1. **Formato**: sólo lo que un navegador sabe abrir. `.blend`, `.fbx`, `.obj` y
   `.mtl` no los carga nadie — y es comprobable, no una intuición: en
   `vendor/` no hay ni `FBXLoader` ni `OBJLoader`, porque la cadena de imports
   de la web nunca los pidió.

2. **Uso**: un recurso viaja si alguien lo nombra. Los `.gltf` van con su `.bin`
   y sus texturas vecinas, que sin eso son un fichero roto.

3. **Licencia**: hay un pack cuya licencia PROHÍBE la redistribución
   (`Lowpoly Animals`, de Seaeees: «Resale, redistribution, and modified sales
   are prohibited»). En un repositorio abierto eso no es un detalle: es la
   diferencia entre publicar y infringir. Se queda fuera, y el resto —todo
   CC0 de Quaternius y MordragT— se acredita en `CREDITOS.md`.
==============================================================================
"""
import json
import re
import shutil
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
PUBLIC = RAIZ / "public"
DESTINO = RAIZ / "dist_publico"
SIMULACRO = "--simulacro" in sys.argv

#: formatos que un navegador sabe abrir. Todo lo demás es material de taller.
WEB = {".html", ".js", ".mjs", ".css", ".json", ".md", ".txt", ".map",
       ".glb", ".gltf", ".bin", ".vrm", ".ktx2", ".hdr", ".exr",
       ".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico", ".gif",
       ".mp3", ".ogg", ".wav", ".woff", ".woff2", ".ttf", ".csv"}

#: material de taller: se queda en casa, sin discusión
TALLER = {".blend", ".blend1", ".fbx", ".obj", ".mtl", ".psd", ".ma", ".max",
          ".exe", ".bak", ".pyc", ".zip", ".7z", ".rar"}

#: carpetas que no viajan
FUERA_CARPETA = ("node_modules", "__pycache__", ".vite", ".wrangler")

#: ⚠️ LICENCIA: prohíben la redistribución. No es negociable.
FUERA_LICENCIA = {
    "Lowpoly Animals eng": "Seaeees — «resale, redistribution … are prohibited»",
}

#: hasta aquí una carpeta citada viaja entera (ver `carpetas_citadas`)
TOPE_CARPETA_MB = 20

#: se copian siempre, los nombre alguien o no (son el andamiaje del sitio)
SIEMPRE = (".html", ".js", ".mjs", ".css", ".md", ".json", ".txt",
           ".woff", ".woff2", ".ttf", ".ico", ".svg")

#: recursos pesados: sólo si alguien los nombra
PESADOS = (".glb", ".gltf", ".bin", ".vrm", ".png", ".jpg", ".jpeg",
           ".webp", ".gif", ".hdr", ".exr", ".ktx2", ".mp3", ".ogg", ".wav")

RE_ACTIVO = re.compile(
    r"[\w %\-\.\(\)\[\]/\\]+\.(?:glb|gltf|bin|vrm|png|jpe?g|webp|gif|hdr|exr|ktx2|mp3|ogg|wav)",
    re.I)


def nombrados():
    """Todo nombre de recurso que aparezca en el código del sitio.

    Se compara por NOMBRE de fichero, no por ruta: media web construye la ruta
    a trozos en tiempo de ejecución (`'/props/models/' + nombre + '.glb'`), así
    que exigir la ruta entera dejaría fuera lo que sí se usa. Prefiero que
    viaje algún recurso de más a que el visitante se encuentre un hueco.
    """
    vistos = set()
    for p in PUBLIC.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in (".html", ".js", ".json", ".css", ".md"):
            continue
        if any(x in p.parts for x in FUERA_CARPETA):
            continue
        # ⚠️ LAS FICHAS QUE VIVEN AL LADO DEL MODELO NO CUENTAN.
        # `props/` tiene mil `X.glb.katamari.json`, y cada uno nombra su propio
        # `X.glb`. Con ellos dentro, «alguien lo nombra» era cierto para 966
        # modelos de 979: **cada modelo avalándose a sí mismo**, y el paquete
        # cargaba 250 MB que ninguna página abre.
        # Los catálogos de `data/` sí cuentan: nombran modelos ajenos.
        if "props" in p.parts and p.suffix.lower() == ".json":
            continue
        for m in RE_ACTIVO.finditer(p.read_text(encoding="utf-8", errors="ignore")):
            vistos.add(m.group(0).replace("\\", "/").split("/")[-1].strip().lower())
    return vistos


#: rutas de recurso construidas con plantilla: `` `.../Rock_${i}.glb` ``
RE_PLANTILLA = re.compile(
    r"`([^`\n]*\$\{[^`\n]*?\.(?:glb|gltf|vrm|png|jpe?g|webp|hdr|exr|mp3|ogg|wav))`")


def patrones_citados():
    """Recursos que el código pide con una plantilla, no con un nombre.

    ⚠️ ESTO ME COSTÓ UN JUEGO SIN PIEDRAS. Las siete rocas del shmup se piden
    como `` `../props/models/Rock_${i}.glb` ``, así que la cadena `Rock_3.glb`
    **no existe en ningún sitio del código**. El paquete las dejó fuera y el
    juego salió con los asteroides invisibles, sin un solo error de red que lo
    delatara.

    Y no era un caso aislado: `AsteroidsFactory.js` —del motor— hace lo mismo,
    y las texturas por tiras y las caras de las cartas también.

    Así que cada `${...}` se convierte en un comodín y se buscan los ficheros
    que encajen. Lo ideal sigue siendo **declarar** los recursos en vez de
    construirlos —una ruta armada en ejecución es invisible para cualquier
    herramienta— pero el empaquetador no puede depender de que todo el mundo se
    acuerde.
    """
    patrones = set()
    for p in PUBLIC.rglob("*"):
        if not p.is_file() or p.suffix.lower() not in (".html", ".js"):
            continue
        if any(x in p.parts for x in FUERA_CARPETA) or "manifiesto" in p.parts:
            continue
        for m in RE_PLANTILLA.finditer(p.read_text(encoding="utf-8", errors="ignore")):
            plantilla = m.group(1).replace("\\", "/").split("/")[-1]
            trozos = re.split(r"\$\{[^}]*\}", plantilla)
            # ⚠️ UN PATRÓN SIN PARTE LITERAL NO ES UN PATRÓN.
            # `${passport.name.toLowerCase()}.glb` se convierte en «cualquier
            # .glb» y se lleva los 979 modelos: el paquete pasó de 64 MB a 468.
            # Hace falta un anclaje de verdad —`Rock_`— fuera de la extensión.
            ancla = max((t for t in trozos[:-1]), key=len, default="")
            if len(ancla.strip("/_-. ")) < 3:
                continue
            # `Rock_${i}.glb` → `^rock_[^/]*\.glb$`
            patrones.add(re.compile(
                "^" + "[^/]*".join(re.escape(t) for t in trozos) + "$", re.I))
    return patrones


def carpetas_citadas():
    """Carpetas de recursos que el código nombra, aunque no nombre los ficheros.

    ⚠️ ESTO LO APRENDÍ ROMPIÉNDOLO. La primera versión sólo miraba nombres de
    fichero, construí el paquete, lo serví… y el póker salió con doce 404: las
    figuras se piden como `` `${palo}_${valor}.webp` ``, así que el nombre
    `S_J.webp` **no aparece en ningún sitio del código**. Ninguna regla basada
    en nombres podía verlo.

    La carpeta sí aparece (`arcade/assets/cards/courts/`). Así que si el código
    nombra un directorio, viaja entero: es la única forma de acertar con las
    rutas que se arman en tiempo de ejecución.
    """
    corpus = []
    for p in PUBLIC.rglob("*"):
        if p.is_file() and p.suffix.lower() in (".html", ".js", ".json", ".css"):
            if not any(x in p.parts for x in FUERA_CARPETA):
                corpus.append(p.read_text(encoding="utf-8", errors="ignore"))
    corpus = "\n".join(corpus)

    vivas = set()
    for d in PUBLIC.rglob("*"):
        if not d.is_dir() or any(x in d.parts for x in FUERA_CARPETA):
            continue
        rel = str(d.relative_to(PUBLIC)).replace("\\", "/")
        # Sin exigir barra final: la llamada real es
        # `preloadCourtImages('/arcade/assets/cards/courts')`, y pedir la barra
        # dejó fuera las doce figuras otra vez. Entre que viaje algo de más y
        # que el visitante vea un hueco, prefiero lo primero.
        if not rel or rel not in corpus:
            continue
        # …pero sólo para carpetas PEQUEÑAS. `props/models` también se nombra, y
        # con la regla a secas se llevaba la biblioteca entera (355 MB). Una
        # carpeta chica que se cita es un juego de piezas que se usa a la vez
        # —las figuras de la baraja—; una biblioteca de 300 MB se recorre por
        # catálogo, y el catálogo sí escribe los nombres uno a uno.
        peso = sum(f.stat().st_size for f in d.glob("*") if f.is_file())
        if peso <= TOPE_CARPETA_MB * 1024 * 1024:
            vivas.add(rel)
    return vivas


def acompanantes(citados):
    """Un `.gltf` sin su `.bin` y sus texturas es un fichero roto.

    El `.gltf` es JSON y dice qué necesita; se lee y se añaden sus vecinos.
    """
    extra = set()
    for p in PUBLIC.rglob("*.gltf"):
        if p.name.lower() not in citados:
            continue
        try:
            d = json.loads(p.read_text(encoding="utf-8", errors="ignore"))
        except Exception:
            continue
        for grupo in ("buffers", "images"):
            for item in d.get(grupo, []):
                uri = item.get("uri", "")
                if uri and not uri.startswith("data:"):
                    extra.add(uri.split("/")[-1].lower())
    return extra


def main():
    print("=" * 78)
    print("  EMPAQUETAR" + ("   [SIMULACRO]" if SIMULACRO else ""))
    print("=" * 78)

    citados = nombrados()
    citados |= acompanantes(citados)
    vivas = carpetas_citadas()
    plantillas = patrones_citados()
    print(f"  recursos que el código nombra: {len(citados):,}")
    print(f"  carpetas de recursos citadas:  {len(vivas):,}")
    print(f"  patrones tipo `X_${{i}}.glb`:    {len(plantillas):,}")

    llevados, dejados = [], {"taller": [], "sin usar": [], "licencia": []}

    for p in PUBLIC.rglob("*"):
        if not p.is_file():
            continue
        rel = p.relative_to(PUBLIC)
        if any(x in rel.parts for x in FUERA_CARPETA):
            continue

        motivo_licencia = next((v for k, v in FUERA_LICENCIA.items() if k in rel.parts), None)
        if motivo_licencia:
            dejados["licencia"].append((p, motivo_licencia))
            continue

        # ⚠️ LA CONFIGURACIÓN DE CLOUDFLARE NO TIENE EXTENSIÓN, Y AQUÍ TODO SE
        # DECIDE POR EXTENSIÓN.
        #
        # `_headers` y `_redirects` se llaman así por diseño: sin punto y sin
        # sufijo. Este filtro los mandaba al taller sin decir nada, así que el
        # paquete salía sin ellos y las reglas de caché que arreglan el despliegue
        # a medias simplemente no llegaban al sitio. Un fichero que se queda fuera
        # del paquete no da error: sencillamente no hace nada, y cuesta media hora
        # entender por qué la cabecera sigue diciendo `max-age=14400`.
        if p.name in ("_headers", "_redirects"):
            llevados.append(p)
            continue

        # ⚠️ UN FICHERO QUE EMPIEZA POR `_` ES UN BANCO DE PRUEBAS, NO UNA PAGINA.
        #
        # Hay comprobaciones que solo se pueden hacer en un navegador de verdad
        # —que un `importmap` inyectado llegue a tiempo, que el composer pinte— y
        # viven como HTML servible porque no hay otra forma. Pero no son el sitio:
        # `_prueba_mundo.html` viajaba al dominio publico como si fuera un juego.
        #
        # La convencion ya estaba puesta en `gen_lab_index.py` para que el catalogo
        # no las ofreciera, y aqui faltaba — o sea que no salian en el indice y aun
        # asi estaban servidas. Media convencion es la que se olvida.
        #
        # ⚠️ Y SOLO PARA `.html`, QUE LA PRIMERA VERSION ERA `p.name.startswith("_")`
        # A SECAS Y SE LLEVO POR DELANTE `_routes.json`.
        #
        # En Cloudflare la configuracion se llama con barra baja por diseño:
        # `_headers`, `_redirects`, `_routes.json`. Los dos primeros estaban
        # exceptuados justo encima —hay medio comentario ahi explicando lo que
        # costo— y el tercero no, asi que la regla ancha dejaba el sitio sin la
        # declaracion de rutas de las Functions. Lo caza la comprobacion de que
        # `_routes.json` viaja, que es por lo que se mira despues de empaquetar y
        # no se da por bueno el resumen.
        #
        # La convencion es de PAGINAS: un `.html` que empieza por `_` es un banco
        # de pruebas. Los datos y la configuracion no entran en ella.
        if p.name.startswith("_") and p.suffix.lower() == ".html":
            dejados["taller"].append((p, "banco de pruebas"))
            continue

        ext = p.suffix.lower()
        if ext in TALLER or (ext not in WEB and ext):
            dejados["taller"].append((p, ext))
            continue
        carpeta = str(rel.parent).replace("\\", "/")
        if (ext in PESADOS and p.name.lower() not in citados and carpeta not in vivas
                and not any(rx.match(p.name) for rx in plantillas)):
            dejados["sin usar"].append((p, ext))
            continue
        if ext not in SIEMPRE and ext not in PESADOS:
            dejados["taller"].append((p, ext))
            continue

        llevados.append(p)

    def mb(lista):
        return sum((x[0] if isinstance(x, tuple) else x).stat().st_size
                   for x in lista) / 1024 / 1024

    print(f"\n── viaja ──\n  {len(llevados):,} ficheros · {mb(llevados):,.1f} MB")
    print("\n── se queda ──")
    for k, v in dejados.items():
        if v:
            print(f"  {len(v):5,} ficheros · {mb(v):7,.1f} MB   {k}")
    for p, motivo in dejados["licencia"][:1]:
        print(f"        ⚠️  {motivo}")

    if SIMULACRO:
        print("\n  SIMULACRO — no se ha escrito nada.")
        return 0

    if DESTINO.exists():
        shutil.rmtree(DESTINO)
    for p in llevados:
        d = DESTINO / p.relative_to(PUBLIC)
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, d)

    # ── créditos: CC0 no obliga, pero no acreditar sería feo ─────────
    creditos = DESTINO / "CREDITOS.md"
    creditos.write_text("""# Créditos de los recursos

El motor y el código son nuestros, con licencia MIT. Los modelos 3D no: son de
otra gente que los regaló, y eso merece decirse aunque su licencia no lo exija.

## Modelos 3D — CC0 1.0 (dominio público)

- **[Quaternius](https://quaternius.com)** — animales, dinosaurios, coches,
  personajes base. La mayor parte de lo que se ve en la sala y en los juegos.
  Regala su trabajo y se sostiene con Patreon; si te sirve, apóyale.
- **[MordragT](https://mordrag.itch.io/)** — Low Poly Animal Bundle.

CC0 no pide atribución. Está aquí porque sin ellos esto no tendría cara.

## Figuras de la baraja española — CC BY-SA 3.0

Las doce figuras españolas —sota, caballo y rey de oros, copas, espadas y
bastos— son de **Basquetteur y Germarquezm**, publicadas en Wikimedia Commons
bajo [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.es):

- [Category:Castilian pattern](https://commons.wikimedia.org/wiki/Category:Castilian_pattern)
- Ficheros: `arcade/assets/cards/courts/{O,P,E,B}_{S,C,R}.png`

Ésta es la única licencia del sitio que pide algo a cambio, y pide dos cosas:
crédito —esto— y que las propias imágenes sigan siendo CC BY-SA. **No afecta al
código**, que sigue siendo MIT: son obras separadas que viajan juntas.

Se sirven **tal cual vinieron**, sin recortar ni convertir. No es pereza: una
versión modificada sería obra derivada y la licencia se arrastraría a un fichero
generado por nosotros. Colocarlas bien en pantalla no las modifica.

Se buscó una baraja española completa en dominio público y no la hay: todos los
caminos abiertos llevan al mismo dibujante. Las de 1889 que hay escaneadas en
Commons también están bajo CC BY-SA, por el escaneo.

## Lo que NO se publica

`Lowpoly Animals` (Seaeees) se usa en local pero **no viaja en el paquete**: su
licencia prohíbe expresamente la redistribución. Un repositorio abierto
redistribuye por definición.

## three.js

r128, r160 y r170 van dentro de `vendor/`, con licencia MIT, para que el motor
funcione sin conexión y sin depender de un CDN ajeno.
""", encoding="utf-8")

    # ── las Functions de Cloudflare ──────────────────────────────────
    # Viven fuera de `public/` porque no son parte del sitio: son el
    # verificador de servidor. Pero tienen que viajar EN LA RAÍZ del paquete,
    # que es donde Pages las busca. Sin esto, se publica el sitio y la
    # verificación se queda en casa — o sea, justo lo que nos diferencia.
    origen_fn = RAIZ / "functions"
    if origen_fn.is_dir():
        n_fn = 0
        for p in origen_fn.rglob("*"):
            if p.is_file() and p.suffix.lower() in (".js", ".mjs", ".json"):
                d = DESTINO / "functions" / p.relative_to(origen_fn)
                d.parent.mkdir(parents=True, exist_ok=True)
                
                # REWRITE IMPORTS: the function in source imports from '../../public/arcade/...'
                # But in dist_publico, everything that was in 'public' is now at the root.
                # So we must remove 'public/' from the relative path.
                contenido = p.read_text(encoding="utf-8")
                contenido = contenido.replace("../../public/", "../../")
                d.write_text(contenido, encoding="utf-8")
                
                n_fn += 1
        print(f"\n  functions/: {n_fn} ficheros (el verificador de servidor)")

    total = sum(p.stat().st_size for p in DESTINO.rglob("*") if p.is_file()) / 1024 / 1024
    n = sum(1 for p in DESTINO.rglob("*") if p.is_file())
    print(f"\n  dist_publico/  →  {n:,} ficheros · {total:,.1f} MB")
    print("\n  Siguiente: `python preflight.py` y abrir la sala servida desde el paquete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
