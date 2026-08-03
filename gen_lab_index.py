"""Genera public/lab.html — el indice de TODO lo jugable y visitable.
Re-ejecutable: lee los <title> reales de cada pagina.

AMPLIADO 2026-08-01: antes solo miraba `labs/` y `rooms/`, asi que los JUEGOS y
el ARCADE —lo unico que una persona quiere probar primero— no aparecian por
ninguna parte. Un indice que se deja fuera el producto no es un indice.

Ahora ademas marca dos cosas que deciden si algo funciona en el ordenador de
otro:
  · NECESITA COLONIA — la pagina llama al hub (127.0.0.1:8741). Sin ALISA
    levantada se vera a medias o vacia. No esta rota: no es del motor.
  · el estado medido, si existe `public/data/estado_salas.json` (lo escribe la
    auditoria del navegador). Sin ese fichero no se pinta nada: prefiero un
    hueco a un sello inventado.
"""
import os, re, html, json

PUB = r"Q:\alisa_project\alisa\World\Synthesis\Web\alisa-systems\public"
LABS = os.path.join(PUB, "labs")
ROOMS = os.path.join(PUB, "rooms")
GAMES = os.path.join(PUB, "games")
ARCADE = os.path.join(PUB, "arcade")

# La portada: la sala manda, y va arriba y grande.
HALL = "rooms/room_sala_del_huevo.html"

# categorias por patron de nombre (orden importa)
CATS = [
    ("🏆 Gym y benchmark", ["gym_bench","rue_del_percebe"]),
    ("🎬 Realización · ALISA Labs", ["confessional", "el_reparto", "cinematic_room", "arista_self", "avatar_face_lab", "aris_self_puppet"]),
    ("🦍 Avatares y rig",           ["rig_avatar", "animator_dojo", "archetype_matrix", "morpholog", "proportional"]),
    ("🛂 Colonia y datos",          ["customs", "aduana", "scumm", "terminal", "digital_twin"]),
    ("🌍 Mundo y escala",           ["world_builder", "katamari", "lod_", "procgen", "matrioshka", "camera_compiz", "holographic"]),
    ("🐜 Vida y simulación",        ["interaction_lab", "frogger", "cucco", "phantom", "math_boids", "chopper", "asteroids", "alisa_defender", "physics_locomotion", "tfjs", "resonance", "thermodynamics"]),
    ("🎲 Juegos y arcade",          ["table_games", "rig_vending", "scanner", "fx_voxel", "volumetric", "ui_item", "rosetta"]),
]

ESTADOS = {}
_ruta_estado = os.path.join(PUB, "data", "estado_salas.json")
if os.path.exists(_ruta_estado):
    try:
        ESTADOS = json.load(open(_ruta_estado, encoding="utf-8"))
    except Exception:
        ESTADOS = {}


def leer(path, n=200000):
    try:
        return open(path, encoding="utf-8", errors="ignore").read(n)
    except Exception:
        return ""


def title_of(path):
    m = re.search(r"<title>([^<]+)</title>", leer(path, 4000), re.I)
    return m.group(1).strip() if m else os.path.basename(path)


def necesita_colonia(path):
    """¿La NECESITA, o solo habla con ella si esta?

    ⚠️ Antes bastaba con nombrar el hub para llevarse el sello COLONIA, y eso
    marcaba tambien la Sala del Huevo — que sin hub funciona entera y enseña
    «INCUBACION — SIN CONEXION». Una insignia que asusta sobre la pagina
    estrella no informa: espanta.

    Ahora hace falta que la llamada NO este protegida. Si hay un `catch`, un
    `??`, un `elegirBackend` (el selector del ProtoHub, escrito justo para
    esto) o el propio cartel de sin conexion, la pagina degrada sola y es
    publica.
    """
    txt = leer(path)
    if not re.search(r"127\.0\.0\.1:874\d|localhost:874\d", txt):
        return False
    protegida = re.search(r"catch\s*[\({]|\.catch\(|elegirBackend|\?\?|SIN CONEXI",
                          txt, re.I)
    return not protegida


def sello(rel, path):
    """Insignias honestas: lo medido si lo hay, y la dependencia del hub."""
    marcas = []
    # ⚠️ Aqui se pintaba un FALLA rojo sobre ocho paginas que NO fallan: cinco
    # estaban en obras y tres ni siquiera son juegos —son portadas de
    # categoria—. Quien llegaba al catalogo veia ocho alarmas rojas y se iba.
    # Decir «en obras» de lo que esta en obras es honesto; decir «FALLA» de lo
    # que funciona es un autogol.
    e = ESTADOS.get(rel)
    if e == "ok":
        marcas.append('<span class="ok">OK</span>')
    elif e == "obras":
        marcas.append('<span class="obras">EN OBRAS</span>')
    elif e == "indice":
        marcas.append('<span class="indice">ÍNDICE</span>')
    if necesita_colonia(path):
        marcas.append('<span class="hub">COLONIA</span>')
    return "".join(marcas)


def tarjetas(carpeta, prefijo, clase="", recorte=0):
    fs = sorted(f for f in os.listdir(carpeta) if f.endswith(".html")
                and "BACKUP" not in f and f != "index.html") if os.path.isdir(carpeta) else []
    out = []
    for f in fs:
        p = os.path.join(carpeta, f)
        rel = f"{prefijo}{f}"
        nombre = f[recorte:-5].replace("_", " ")
        out.append(f'<a class="card {clase}" href="{rel}"><b>{html.escape(nombre)}</b>{sello(rel, p)}'
                   f'<span class="d">{html.escape(title_of(p))[:78]}</span></a>')
    return fs, "".join(out)


files = sorted(f for f in os.listdir(LABS) if f.endswith(".html"))
used, groups = set(), []
for cat, pats in CATS:
    items = []
    for f in files:
        if f in used: continue
        if any(p in f.lower() for p in pats):
            items.append(f); used.add(f)
    if items: groups.append((cat, items))
rest = [f for f in files if f not in used]
if rest: groups.append(("🔬 Otros laboratorios", rest))

cards = []

# ── EMPIEZA POR AQUI ────────────────────────────────────────────────────────
# ⚠️ Este bloque no estaba, y era el fallo mas caro del catalogo: las tres
# paginas que SON el argumento del proyecto estaban mezcladas entre 67 tarjetas
# ordenadas por nombre, al mismo nivel que un experimento de camara de abril.
# Asi lo hace three.js con sus ejemplos: una galeria esta muy bien, pero alguien
# tiene que decir por donde se entra.
DESTACADAS = [
    ("labs/croupier_verificacion_servidor.html", "La puntuación no se envía: se recalcula",
     "El servidor vuelve a jugar tu partida con el mismo fichero de reglas. "
     "11 de 11 legítimas aceptadas, 25 trampas cazadas, sin que ningún juez opine."),
    ("labs/croupier_gym_estaciones.html", "Las mismas máquinas, jugadas por una máquina",
     "16 entornos, 16 reproducibles. Un agente deja el mismo recibo que una persona."),
    ("labs/croupier_banco_motores.html", "El banco de motores",
     "Los 22 arneses headless, de una vez y sin hub. Cazó 5 motores rotos el día que se estrenó."),
]
destacadas_html = []
for rel, titulo, desc in DESTACADAS:
    p = os.path.join(PUB, rel.replace("/", os.sep))
    if not os.path.exists(p):
        continue
    destacadas_html.append(
        f'<a class="card destacada" href="{rel}"><b>{html.escape(titulo)}</b>'
        f'{sello(rel, p)}<span class="d">{html.escape(desc)}</span></a>')
if destacadas_html:
    cards.append('<h2>⭐ Empieza por aquí <i>si sólo vas a abrir tres</i></h2>'
                 f'<div class="grid">{"".join(destacadas_html)}</div>')

# ── Lo primero, lo que se juega ─────────────────────────────────────────────
juegos_fs, juegos_html = tarjetas(GAMES, "games/", "juego")
if juegos_html:
    cards.append(f'<h2>🕹️ Juegos <i>{len(juegos_fs)}</i></h2><div class="grid">{juegos_html}</div>')

arcade_fs, arcade_html = tarjetas(ARCADE, "arcade/", "mesa")
if arcade_html:
    cards.append(f'<h2>🃏 Arcade — tablero y cartas <i>{len(arcade_fs)}</i>'
                 f' <a href="arcade/index.html" style="color:#7fd0ff;font-size:11px">· índice propio</a></h2>'
                 f'<div class="grid">{arcade_html}</div>')

for cat, items in groups:
    inner = []
    for f in items:
        p = os.path.join(LABS, f)
        t = html.escape(title_of(p))
        short = t.split("—")[-1].strip() if "—" in t else t
        inner.append(f'<a class="card" href="labs/{f}"><b>{html.escape(f[9:-5].replace("_"," "))}</b>'
                     f'{sello(f"labs/{f}", p)}<span class="d">{short[:78]}</span></a>')
    cards.append(f'<h2>{cat} <i>{len(items)}</i></h2><div class="grid">{"".join(inner)}</div>')

rooms_fs, rooms_html = tarjetas(ROOMS, "rooms/", "room", recorte=5)
if rooms_html:
    cards.append(f'<h2>🏛️ Estancias (rooms) <i>{len(rooms_fs)}</i></h2><div class="grid">{rooms_html}</div>')

n_colonia = sum(1 for grupo, carpeta, pre in
                ((juegos_fs, GAMES, "games/"), (arcade_fs, ARCADE, "arcade/"),
                 (rooms_fs, ROOMS, "rooms/"), (files, LABS, "labs/"))
                for f in grupo if necesita_colonia(os.path.join(carpeta, f)))
total = len(juegos_fs) + len(arcade_fs) + len(rooms_fs) + len(files)

page = f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ALISA · lab.html — índice del motor</title>
<style>
 *{{box-sizing:border-box}}
 body{{margin:0;background:#070a11;color:#cfe3f5;font-family:ui-monospace,monospace;padding:28px 34px 60px}}
 header{{border-bottom:1px solid #1d2b3e;padding-bottom:14px;margin-bottom:22px}}
 h1{{margin:0 0 4px;font-size:20px;color:#7fd0ff;letter-spacing:1px}}
 .sub{{color:#5f7a92;font-size:12px;line-height:1.7}}
 .sub b{{color:#7CFC98}}
 h2{{font-size:13px;color:#9fd0ff;margin:26px 0 10px;font-weight:normal;letter-spacing:.5px}}
 h2 i{{color:#41566b;font-style:normal;font-size:11px}}
 .grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(252px,1fr));gap:9px}}
 .card{{display:block;background:#0d141f;border:1px solid #1a2839;border-radius:8px;padding:10px 12px;
        text-decoration:none;color:#cfe3f5;transition:.15s}}
 .card:hover{{background:#132133;border-color:#2f5878;transform:translateY(-1px)}}
 .card b{{display:block;font-size:12.5px;color:#e6f1fb;margin-bottom:3px}}
 .card .d{{display:block;font-size:10.5px;color:#5f7a92;line-height:1.45}}
 .card.room{{border-color:#2b2038}} .card.room:hover{{border-color:#5a3f78}}
 .card.juego{{border-color:#20372b}} .card.juego:hover{{border-color:#3f7856}}
 .card.mesa{{border-color:#2e2a1c}} .card.mesa:hover{{border-color:#7a6a34}}
 .ok{{float:right;background:#1d4d32;color:#8ff0b6;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px}}
 .mal{{float:right;background:#5a1f1f;color:#ffb3b3;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px}}
 .hub{{float:right;background:#3a2d12;color:#e0b020;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px}}
 .obras{{float:right;background:#3a2d12;color:#e0b020;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px}}
 .indice{{float:right;background:#1c2b3a;color:#7fb0e0;font-size:9px;padding:1px 5px;border-radius:3px;margin-left:4px}}
 .hero{{display:block;background:linear-gradient(120deg,#111c2b,#0d141f);border:1px solid #2f5878;
        border-radius:10px;padding:20px 22px;text-decoration:none;color:#e6f1fb;margin-bottom:6px}}
 .hero:hover{{border-color:#7fd0ff}}
 .hero b{{display:block;font-size:17px;color:#7fd0ff;letter-spacing:2px;margin-bottom:5px}}
 .hero span{{font-size:11.5px;color:#7d97ad;line-height:1.6}}
 footer{{margin-top:34px;color:#3a4a5a;font-size:10.5px;border-top:1px solid #131e2b;padding-top:12px}}
</style></head><body>
<header>
 <h1>▓ ALISA · lab.html</h1>
 <div class="sub">
   <b>Juegas, y tu partida son unos cientos de bytes que cualquiera puede volver a
   jugar para comprobar que es verdad.</b><br>
   Esto es el cuaderno: <b>{total}</b> páginas — {len(juegos_fs)} juegos ·
   {len(arcade_fs)} mesas de arcade · {len(files)} laboratorios · {len(rooms_fs)} estancias.
   El producto es la sala de arriba; lo demás es de dónde salió.<br>
   Arranca con <code>python servir.py</code> (NO con <code>http.server</code>: sirve
   módulos viejos y te miente).<br>
   <span style="color:#e0b020">COLONIA</span> = esa página habla con el hub de ALISA
   (<b>{n_colonia}</b> de {total}); sin la colonia levantada se verá a medias. No está rota:
   simplemente no es del motor.
 </div>
</header>

<a class="hero" href="{HALL}">
  <b>LA SALA DEL HUEVO</b>
  <span>La portada. Se entra andando: arcades, mesas de tablero y cartas, terminales,
  y el huevo en el centro. Todo lo que se juega aquí dentro puntúa.</span>
</a>

{"".join(cards)}
<footer>Generado por Aris · <code>gen_lab_index.py</code> (re-ejecutable)</footer>
</body></html>"""

out = os.path.join(PUB, "lab.html")
open(out, "w", encoding="utf-8").write(page)
print(f"escrito {out}  ({len(page):,} bytes)")
print(f"  juegos: {len(juegos_fs)} · arcade: {len(arcade_fs)} · labs: {len(files)} · rooms: {len(rooms_fs)}")
print(f"  necesitan la colonia: {n_colonia} de {total}")
if not ESTADOS:
    print("  (sin data/estado_salas.json todavia: no se pinta ningun sello de estado)")
