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

    Hace falta que la llamada NO este protegida. Si hay un `catch`, un `??`, un
    `elegirBackend` (el selector del ProtoHub, escrito justo para esto) o el
    propio cartel de sin conexion, la pagina degrada sola y es publica.

    ⚠️ Y AUN ASI MIRABA DONDE NO ERA. Buscaba el guardia en el FICHERO ENTERO:
    bastaba un `catch` en cualquier rincon —y hay `catch` en casi todas— para
    dar por protegida una llamada al hub que estaba mil lineas mas alla y a la
    intemperie. Resultado: de las diecisiete paginas que hablan con el hub solo
    UNA se llevaba el sello, cuando siete se rompen de verdad sin colonia.

    Un guardia protege lo que tiene AL LADO, asi que se mira el vecindario de
    cada llamada. Es el mismo error de alcance que ya mordio en el censo
    (contar fichas pegadas a los modelos) y en el empaquetador (anclas sin
    literal): la pregunta estaba bien y el sitio donde se buscaba, mal.

    ⚠️ Y la primera version del vecindario se paso de estrecha: 400 caracteres
    a cada lado. Marco `croupier_chopper_aquarium` como rota cuando tiene un
    `try {` DOCE LINEAS mas arriba — con sangrado de veinte espacios, doce
    lineas son mas de 400 caracteres. De mirar todo el fichero a mirar por una
    rendija, y las dos veces mal.

    Lo que arregla el tamaño de la ventana es entender la FORMA del guardia:
    un `try {` va SIEMPRE antes de la llamada, y un `.catch()` o un `??`
    SIEMPRE despues. Asi que se mira lejos hacia atras y cerca hacia delante,
    en vez de un cuadrado a ojo.
    """
    txt = leer(path)
    llamadas = list(re.finditer(r"127\.0\.0\.1:874\d|localhost:874\d", txt))
    if not llamadas:
        return False

    antes = re.compile(r"try\s*\{|HAY_HUB_POSIBLE|elegirBackend", re.I)
    despues = re.compile(r"\.catch\(|\?\?|onerror|SIN CONEXI|timeout|catch\s*[\({]", re.I)

    def desprotegida(m):
        return not (antes.search(txt[max(0, m.start() - 1800): m.start()])
                    or despues.search(txt[m.start(): m.start() + 700]))

    # Si UNA sola llamada queda a la intemperie, la pagina se rompe.
    return any(desprotegida(m) for m in llamadas)


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
        marcas.append('<span class="badge ok">OK</span>')
    elif e == "obras":
        marcas.append('<span class="badge obras">EN OBRAS</span>')
    elif e == "indice":
        marcas.append('<span class="badge indice">ÍNDICE</span>')
    if necesita_colonia(path):
        marcas.append('<span class="badge hub">COLONIA</span>')
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
<link rel="stylesheet" href="vendor/fonts/fuentes.css">
 <style>
  * {{box-sizing:border-box}}
  :root {{ --bg: #030712; --bg-card: rgba(17, 24, 39, 0.6); --border: rgba(255, 255, 255, 0.08); --text: #e2e8f0; --accent: #38bdf8; --accent-glow: rgba(56, 189, 248, 0.4); }}
  body {{ margin:0; background: radial-gradient(circle at top center, #1e1b4b 0%, var(--bg) 60%); color: var(--text); font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; padding: 40px 60px 80px; min-height: 100vh; }}
  header {{ border-bottom: 1px solid var(--border); padding-bottom: 24px; margin-bottom: 32px; display: flex; flex-direction: column; gap: 12px; }}
  h1 {{ margin:0; font-size: 28px; font-weight: 800; color: #fff; letter-spacing: 2px; text-shadow: 0 0 20px rgba(255,255,255,0.2); font-family: 'JetBrains Mono', monospace; }}
  .sub {{ color: #94a3b8; font-size: 14px; line-height: 1.8; max-width: 800px; }}
  .sub b {{ color: #a7f3d0; font-weight: 600; }}
  code {{ font-family: 'JetBrains Mono', monospace; background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; font-size: 13px; color: #cbd5e1; }}
  h2 {{ font-size: 16px; color: #fff; margin: 40px 0 16px; font-weight: 600; letter-spacing: 1px; display: flex; align-items: center; gap: 12px; font-family: 'JetBrains Mono', monospace; }}
  h2 i {{ color: #64748b; font-style: normal; font-size: 13px; font-weight: 400; padding: 2px 8px; background: rgba(255,255,255,0.05); border-radius: 12px; }}
  .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }}
  
  .card {{ display: flex; flex-direction: column; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px 20px; text-decoration: none; color: var(--text); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); position: relative; overflow: hidden; }}
  .card::before {{ content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 100%); pointer-events: none; }}
  .card:hover {{ background: rgba(30, 41, 59, 0.8); border-color: rgba(255,255,255,0.2); transform: translateY(-3px); box-shadow: 0 12px 24px -8px rgba(0, 0, 0, 0.3), 0 0 15px var(--accent-glow); }}
  
  .card b {{ display: block; font-size: 14px; font-weight: 700; color: #fff; margin-bottom: 6px; letter-spacing: 0.5px; font-family: 'JetBrains Mono', monospace; }}
  .card .d {{ display: block; font-size: 12px; color: #94a3b8; line-height: 1.5; }}
  
  /* Colored borders on hover for different types */
  .card.room:hover {{ border-color: #c084fc; box-shadow: 0 12px 24px -8px rgba(0,0,0,0.3), 0 0 15px rgba(192, 132, 252, 0.3); }}
  .card.juego:hover {{ border-color: #34d399; box-shadow: 0 12px 24px -8px rgba(0,0,0,0.3), 0 0 15px rgba(52, 211, 153, 0.3); }}
  .card.mesa:hover {{ border-color: #fbbf24; box-shadow: 0 12px 24px -8px rgba(0,0,0,0.3), 0 0 15px rgba(251, 191, 36, 0.3); }}
  
  /* Badges */
  .badge {{ position: absolute; top: 16px; right: 20px; font-size: 9px; padding: 3px 8px; border-radius: 20px; font-weight: 700; letter-spacing: 1px; font-family: 'JetBrains Mono', monospace; text-transform: uppercase; box-shadow: 0 2px 5px rgba(0,0,0,0.2); }}
  .ok {{ background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(52, 211, 153, 0.3); }}
  .mal {{ background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(248, 113, 113, 0.3); }}
  .hub {{ background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }}
  .obras {{ background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(251, 191, 36, 0.3); }}
  .indice {{ background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); }}
  
  /* Make room for absolute badge */
  .card b {{ padding-right: 60px; }}
  
  /* Hero Banner */
  .hero {{ display: flex; flex-direction: column; background: linear-gradient(135deg, rgba(30, 58, 138, 0.4) 0%, rgba(17, 24, 39, 0.8) 100%); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 16px; padding: 32px 40px; text-decoration: none; color: #fff; margin-bottom: 16px; transition: all 0.3s ease; position: relative; overflow: hidden; backdrop-filter: blur(10px); }}
  .hero::after {{ content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 60%); opacity: 0; transition: opacity 0.5s ease; pointer-events: none; }}
  .hero:hover {{ border-color: #38bdf8; transform: translateY(-2px); box-shadow: 0 20px 40px -10px rgba(0,0,0,0.5), 0 0 30px rgba(56, 189, 248, 0.2); }}
  .hero:hover::after {{ opacity: 1; }}
  .hero b {{ display: block; font-size: 24px; color: #38bdf8; letter-spacing: 3px; margin-bottom: 12px; font-weight: 800; text-shadow: 0 2px 10px rgba(56, 189, 248, 0.3); font-family: 'JetBrains Mono', monospace; }}
  .hero span {{ font-size: 14px; color: #94a3b8; line-height: 1.7; max-width: 700px; }}
  
  footer {{ margin-top: 60px; color: #475569; font-size: 12px; border-top: 1px solid var(--border); padding-top: 24px; text-align: center; }}
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
