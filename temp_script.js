import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
import { VolumetricsPlugin } from '@alisa-engine/src/soma/plugins/VolumetricsPlugin.js';
import { mulberry32 }        from '@alisa-engine/src/world/core/DeterministicScope.js';
// La ficha de inspección: 19,9 KB escritos y con CERO importadores hasta hoy.
// Trae su propio renderer, escena y cámara para el retrato, o sea que hace
// primeros planos en 3D dentro de la tarjeta. Justo lo que hacía falta para que
// pulsar una estación no sea "abrir una pestaña" sino "examinar una cosa".
import { EntityCardSystem }  from '@alisa-engine/src/extensions/alisa-colony/psyche/EntityCardSystem.js';
// ⚠️ ESTO ES PRIOR ART Y ES MEJOR QUE LO QUE YO HABÍA HECHO.
//
// Yo creaba un iframe por cada estación a menos de 15 m — hasta media docena
// vivos a la vez, cada uno con un juego cargado. Funcionaba, pero es caro y es
// conceptualmente flojo: seis juegos corriendo para que mires uno.
//
// `room_arcade_hall.html` lo tenía resuelto mejor desde hace meses:
//     <!-- SINGLE SHARED IFRAME (only one game active at a time per player) -->
//     <iframe id="romCartridge">
// UN SOLO iframe que va de máquina en máquina, como un cartucho. Y no abres una
// pestaña: te SIENTAS. Eso es un arcade de verdad y no un menú con adornos.
//
// `CSS3DHologramPlugin` (17 KB, 0 importadores hasta hoy) trae el mecanismo
// entero: `loadMachine(url, pantalla, rotación)`, `setSeated()`,
// `setStandUpCallback()`, `disconnect()`.
import { CSS3DHologramPlugin } from '@alisa-engine/src/soma/plugins/CSS3DHologramPlugin.js';
// El teletipo (3,3 KB, 0 importadores). En una sala como esta, un
// panel colgado no es un adorno: es el mueble propio del sitio, el de destinos.
// Y resuelve lo que peor llevaba la sala: que la economía viviera solo en un
// HUD de esquina. Aquí la colonia HABLA dentro del mundo.
import { SovereignTickerPlugin } from '@alisa-engine/src/extensions/alisa-colony/plugins/SovereignTickerPlugin.js';
// Las almas (6,5 KB, 1 importador). Boids de Reynolds con `seek` a un objetivo
// y `flee` de un depredador — que es EXACTAMENTE la escena que pide el lore:
// las almas orbitan el huevo y se apartan de ti, porque el visitante no es el
// dueño del sitio, es la anomalía termodinámica que entra a perturbarlo.
import { BoidsSystem } from '@alisa-engine/src/world/systems/BoidsSystem.js';
// De esta factory NO uso la sala —monta dos mesas clavadas en x=±2,5, con sus
// luces, su click global y una cámara de órbita que aquí no existe— pero sí sus
// piezas: la baraja física de 52 cartas y el tapete, que estaban enterradas en
// su init(). Usar media pieza a propósito es mejor que copiarla o que tragarse
// una sala entera para sacarle un mazo.
import { ArcadeTableRoomFactory } from '@alisa-engine/src/world/factories/ArcadeTableRoomFactory.js';
// El radar: idea sacada de `games/raccoon_space.html`, donde llevaba meses
// funcionando encerrada en el juego. Aquí resuelve el peor problema de la sala
// —«aparezco y no sé adónde ir»— sin poner un mapa que rompa el hechizo.
import { RadarPlugin } from '@alisa-engine/src/soma/plugins/RadarPlugin.js';
import { AssetManager } from '@alisa-engine/src/soma/AssetManager.js';
import { AnomalyLensPlugin } from '@alisa-engine/src/soma/plugins/AnomalyLensPlugin.js';
import { SpatialAudioPlugin } from '@alisa-engine/src/soma/plugins/SpatialAudioPlugin.js';
import { ArcadeFXPlugin } from '@alisa-engine/src/soma/plugins/ArcadeFXPlugin.js';
import { ConstructMaterializerPlugin } from '@alisa-engine/src/soma/plugins/ConstructMaterializerPlugin.js';
import { EnvironmentPBRPlugin } from '@alisa-engine/src/soma/plugins/EnvironmentPBRPlugin.js';
import { SovereignHaloPlugin } from '@alisa-engine/src/extensions/alisa-colony/plugins/SovereignHaloPlugin.js';

// ═══════════════════════════════════════════════════════════════════════════
//  EL CATÁLOGO — las estaciones son DATOS, no objetos
// ═══════════════════════════════════════════════════════════════════════════
// Esto es lo único que existe al arrancar. La geometría se fabrica después, y
// solo para lo que estés mirando de cerca. Es el "JIT cuántico" de los apuntes,
// y de paso es lo que permite tener 24 estaciones sin fundir el navegador.
//
// `env` = el identificador del entorno de gym con el que una MÁQUINA juega esta
// misma estación. Está aquí, junto a la URL para personas, a propósito: son las
// dos puertas de la misma máquina, y separarlas es como acaban divergiendo.
//
// ⚠️ Esto faltaba, y era el hueco entre lo que promete la portada —«mismas
// reglas para personas y para máquinas»— y lo que había: existían 5 entornos y
// NINGUNA de las 24 estaciones declaraba el suyo. Se podía verificar la partida
// de otro, pero una máquina no podía jugar aquí.
//
// Las que no lo declaran es porque todavía no lo tienen; se dice, no se
// disimula. El catálogo completo vive en `js/alisa-engine/src/gym/registry.js`
// y se puede jugar entero sin abrir esta sala:
// `labs/croupier_gym_estaciones.html`.
const ARCADES = [
  // ⚠️ ESTOS TRES ESTABAN EN `legacy/` Y NO LOS ENLAZABA NADIE.
  // Son los juegos más terminados que tenemos —87, 62 y 42 KB— y llevaban
  // meses dados por obsoletos. No lo estaban: el traslado a `legacy/` les
  // rompió las rutas y una pantalla rota se parece a una pantalla vieja.
  // Sólo se distinguen abriéndolas, y nadie las abrió.
  { n:'Rue del Percebe', u:'../games/rue_del_percebe.html' },
  { n:'Chopper Terrarium', u:'../games/chopper_terrarium.html' },
  { n:'Asteroid Gauntlet', u:'../games/asteroid_gauntlet.html' },
  { n:'Cabinet Escape',  u:'../games/croupier_cabinet_escape.html', env:'alisa/CabinetEscape-v0' },
  { n:'Registro de Planta', u:'../games/raccoon_floor_search.html' },
  { n:'Corporate Building', u:'../games/croupier_corporate_building.html' },
  { n:'City Sector',     u:'../games/raccoon_city_sector.html' },
  { n:'Planeta',         u:'../games/raccoon_planet.html' },
  { n:'Interestelar',    u:'../games/raccoon_space.html',  env:'alisa/RaccoonSpace-v0' },
  { n:'Chopper Aquarium',u:'../labs/croupier_chopper_aquarium.html' },
  { n:'Cucco Swarm',     u:'../labs/croupier_cucco_swarm.html', env:'alisa/CuccoSwarm-v0' },
  { n:'Asteroids',       u:'../labs/croupier_asteroids_survival.html', env:'alisa/Asteroids-v0' },
  { n:'Katamari',        u:'../labs/croupier_katamari_swarm.html' },
  { n:'Peatón M-30',     u:'../labs/croupier_peaton_m30.html', env:'alisa/peaton-protohub-v0' },
  { n:'Boids',           u:'../labs/croupier_math_boids_flock.html' },
];
// `tablero` = el constructor de `js/arcade_boards.js` que pinta ESA mesa con su
// tablero y sus piezas de verdad. Los seis existían desde hace meses, con la
// firma `(grupoTablero, grupoPiezas)` — separados a propósito, porque así el
// volcado de mesa puede lanzar cada cosa por su lado.
// Las ocho mesas declaran entorno porque sus reglas YA estaban escritas para el
// ProtoHub: `ProtoHubEnv` las adapta al contrato de las tres puertas sin
// reescribir ninguna. Y hay un regalo en ese encaje — `legal_moves` ya *es* la
// lista de affordances, así que la puerta de lenguaje (la de los agentes LLM)
// sale exacta: no se puede alucinar una jugada ilegal porque solo se ofrecen
// las legales.
const MESAS = [
  { n:'Ajedrez',   u:'../arcade/chess.html',    tablero:'Checkers', env:'alisa/ajedrez-protohub-v0' },  // 8×8: el mismo damero
  { n:'Go',        u:'../arcade/go.html',       tablero:'Go',       env:'alisa/go-protohub-v0' },
  { n:'Reversi',   u:'../arcade/reversi.html',  tablero:'Reversi',  env:'alisa/reversi-protohub-v0' },
  { n:'Damas',     u:'../arcade/checkers.html', tablero:'Checkers', env:'alisa/damas-protohub-v0' },
  { n:'Xiangqi',   u:'../arcade/xiangqi.html',  tablero:'Xiangqi',  env:'alisa/xiangqi-protohub-v0' },
  { n:'Mancala',   u:'../arcade/mancala.html',  tablero:'Mancala',  env:'alisa/mancala-protohub-v0' },
  // `cartas` cambia lo que hay ENCIMA de la mesa: tapete y baraja física en
  // vez de tablero. Una mesa de póker con un damero pintado sería mentira.
  { n:'Blackjack', u:'../arcade/blackjack.html', cartas:true, env:'alisa/blackjack-protohub-v0' },
  { n:'Póker',     u:'../arcade/poker.html',     cartas:true, env:'alisa/poker-protohub-v0' },
];
const TERMINALES = [
  { n:'El Motor',       u:'../motor.html' },
  { n:'El Arcade',      u:'../arcade/index.html' },
  { n:'Investigación',  u:'../research.html' },
  { n:'El Catálogo',    u:'../lab.html' },
];

// ═══════════════════════════════════════════════════════════════════════════
//  ESCENA
// ═══════════════════════════════════════════════════════════════════════════
const escena = new THREE.Scene();
const camara = new THREE.PerspectiveCamera(50, window.innerWidth/window.innerHeight, 0.1, 400);
camara.position.set(0, 1.62, 54);
const colorFondo = new THREE.Color(0xffffff);
const colorNegro = new THREE.Color(0x000000);
escena.background = colorFondo.clone();
escena.fog = new THREE.FogExp2(0xffffff, 0.0062);

const render = new THREE.WebGLRenderer({ antialias:true, powerPreference:'high-performance' });
render.setPixelRatio(Math.min(devicePixelRatio, 2));
render.setSize(innerWidth, innerHeight);
render.toneMapping = THREE.ACESFilmicToneMapping;
render.toneMappingExposure = 1.02;
document.getElementById('lienzo').appendChild(render.domElement);

const envPbr = new EnvironmentPBRPlugin({ renderer: render, scene: escena }, { intensity: 0.7 });
envPbr.onInit();

render.domElement.style.position = 'absolute';
render.domElement.style.zIndex = '1';

const composer = new EffectComposer(render);
composer.addPass(new RenderPass(escena, camara));
const lente = new AnomalyLensPlugin({ radio: 0.35, fuerza: 0.25, anillo: 0.8, color: new THREE.Color(1.0, 0.4, 0.05) });
composer.addPass(lente.pase);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.11, 0.28, 1.12);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ── Luz ──────────────────────────────────────────────────────────────────
escena.add(new THREE.HemisphereLight(0xffffff, 0xdfe6ec, 3.1));
const cenital = new THREE.DirectionalLight(0xffffff, 1.5);
cenital.position.set(0, 60, 8);
escena.add(cenital);

// ── El entorno que se refleja ────────────────────────────────────────────
{
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#ffffff');
  grad.addColorStop(0.45, '#eef3f8');
  grad.addColorStop(0.55, '#dde5ee');
  grad.addColorStop(1.00, '#c3ced9');
  g.fillStyle = grad; g.fillRect(0, 0, 16, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;

  const pmrem = new THREE.PMREMGenerator(render);
  pmrem.compileEquirectangularShader();
  escena.environment = pmrem.fromEquirectangular(tex).texture;
  tex.dispose(); pmrem.dispose();
}

// ── El suelo ─────────────────────────────────────────────────────────────
const suelo = new THREE.Mesh(
  new THREE.CircleGeometry(320, 96).rotateX(-Math.PI/2),
  new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.82, metalness:0.02, transparent: true })
);
suelo.position.y = -0.02;
escena.add(suelo);

const rejilla = new THREE.GridHelper(320, 160, 0x9fb0c0, 0xd4dee6);
rejilla.material.transparent = true; rejilla.material.opacity = 0.5;
escena.add(rejilla);

// ═══════════════════════════════════════════════════════════════════════════
//  EL HUEVO — la anomalía
// ═══════════════════════════════════════════════════════════════════════════
const huevo = new THREE.Group();
const geoHuevo = new THREE.SphereGeometry(7, 64, 64);
const matHuevo = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x110000, emissiveIntensity: 0.2, roughness: 0.1, metalness: 0.9 });
const cascara = new THREE.Mesh(geoHuevo, matHuevo);
cascara.position.y = 10.2;
// huevo.add(cascara);

// Photon Ring
const photonGeo = new THREE.SphereGeometry(7.15, 64, 64);
const photonMat = new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.35, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false });
const photonRing = new THREE.Mesh(photonGeo, photonMat);
photonRing.position.y = 10.2;
// huevo.add(photonRing);

// Accretion Disk (Nucleo) - Procedural Plasma Shader
const discoUniforms = {
    time: { value: 0 },
    color1: { value: new THREE.Color(0xffaa00) },
    color2: { value: new THREE.Color(0xff3300) }
};
const geoDisco = new THREE.TorusGeometry(11, 2.5, 32, 200);
geoDisco.rotateX(Math.PI / 2);
geoDisco.rotateX(-0.15);
const matDisco = new THREE.ShaderMaterial({
    uniforms: discoUniforms,
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform vec3 color1;
        uniform vec3 color2;
        varying vec2 vUv;

        // Simple hash and noise
        float hash(float n) { return fract(sin(n) * 1e4); }
        float noise(vec2 x) {
            vec2 i = floor(x);
            vec2 f = fract(x);
            float a = hash(i.x + i.y * 57.0);
            float b = hash(i.x + 1.0 + i.y * 57.0);
            float c = hash(i.x + (i.y + 1.0) * 57.0);
            float d = hash(i.x + 1.0 + (i.y + 1.0) * 57.0);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }

        void main() {
            // Swirling plasma effect
            float n = noise(vec2(vUv.x * 25.0 - time * 6.0, vUv.y * 4.0));
            float n2 = noise(vec2(vUv.x * 60.0 + time * 2.0, vUv.y * 12.0));
            
            float intensity = smoothstep(0.2, 0.8, n * n2) * 2.5;
            float edge = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
            
            vec3 finalColor = mix(color2, color1, intensity) * intensity * edge * 2.5;
            gl_FragColor = vec4(finalColor, edge * intensity * 0.9);
        }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
});
const nucleo = new THREE.Mesh(geoDisco, matDisco);
nucleo.position.y = 10.2;
// Save reference to uniforms so tick() can update time
nucleo.userData.uniforms = discoUniforms;
// huevo.add(nucleo);

const volumetrics = new VolumetricsPlugin();
const radiationDust = VolumetricsPlugin.createFlashlightDust(350);
radiationDust.material.color.setHex(0xffaa00);
radiationDust.material.size = 0.2;
radiationDust.scale.set(30, 20, 30);
radiationDust.position.y = 10.2;
huevo.add(radiationDust);
volumetrics.registerDust(radiationDust);

const jetUp = VolumetricsPlugin.createFlashlightBeam();
jetUp.material.color.setHex(0xff3300);
jetUp.scale.set(7, 60, 7);
jetUp.position.y = 10.2;
huevo.add(jetUp);

const jetDown = VolumetricsPlugin.createFlashlightBeam();
jetDown.material.color.setHex(0xff3300);
jetDown.scale.set(7, 60, 7);
jetDown.rotation.x = Math.PI;
jetDown.position.y = 10.2;
huevo.add(jetDown);

const luzNucleo = new THREE.PointLight(0xff5500, 36, 80, 1.6);
luzNucleo.position.y = 10.2;
huevo.add(luzNucleo);
// escena.add(huevo);

let incubacionReportada = null;
let partidasVerificadas = 0;
const HAY_HUB_POSIBLE = location.protocol === 'file:'
  || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

if (HAY_HUB_POSIBLE) {
  fetch('http://127.0.0.1:8741/egg/incubation', { signal: AbortSignal.timeout(1200) })
    .then(r => r.ok ? r.json() : null)
    .then(d => { if (d && typeof d.incubation === 'number') incubacionReportada = d.incubation; })
    .catch(() => {});
}
const vistas = new Set();
let aportacion = 0;
let rota = false;
let nubeCascara = null;
let latido = 0;
let materializadas = 0;
let mirando = null;
const elMirilla = document.getElementById('mirilla');
const elObj = document.getElementById('objetivo');

const PUNTOS_HUEVO = 600;
let puntos = 0;
let huevoCaido = null;
let huevoRecogido = false;

function soltarHuevo() {
  if (huevoCaido || huevoRecogido) return;
  const g = new THREE.Group();
  const cuerpo = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 40, 30).scale(1, 1.4, 1),
    new THREE.MeshPhysicalMaterial({
      color:0xffffff, roughness:0.1, transmission:0.5, thickness:0.9, ior:1.34,
      clearcoat:1, emissive:0x4fd0ff, emissiveIntensity:0.9,
    })
  );
  g.add(cuerpo);
  const halo = new THREE.PointLight(0x9fe4ff, 9, 9, 1.6);
  g.add(halo);
  const frente = new THREE.Vector3(0,0,-1).applyQuaternion(camara.quaternion);
  g.position.set(camara.position.x + frente.x * 3.2, 1.15, camara.position.z + frente.z * 3.2);
  escena.add(g);
  huevoCaido = { grupo:g, cuerpo, nacido: reloj.getElapsedTime() };
  Sonido.cristal(0.62); Sonido.latido(1.6);
  avisar('HA CAÍDO UN HUEVO', 'acércate y púlsalo');
}

function recogerHuevo() {
  if (!huevoCaido || huevoRecogido) return;
  huevoRecogido = true;
  escena.remove(huevoCaido.grupo);
  huevoCaido = null;
  Sonido.cristal(1.6); Sonido.latido(2.4);
  avisar(`${puntos} PUNTOS → DUST`, 'con esto se arranca una colonia');
}

function avisar(titulo, pie) {
  const d = document.getElementById('aviso');
  d.innerHTML = `<div class="t">${titulo}</div><div class="p">${pie}</div>`;
  d.classList.add('visible');
  clearTimeout(avisar._t);
  avisar._t = setTimeout(() => d.classList.remove('visible'), 5200);
}

const grietas = new THREE.Mesh(
  geoHuevo.clone(),
  new THREE.MeshBasicMaterial({
    color: 0xff3300, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false,
    wireframe: true,
  })
);
grietas.scale.setScalar(1.004);
grietas.position.y = 10.2;
huevo.add(grietas);

function romperCascara() {
  if (rota) return;
  rota = true;
  nubeCascara = nubeDeVoxeles(14, 20, 14, 777);
  nubeCascara.malla.position.y = 10.2;
  nubeCascara.avance = 1;
  huevo.add(nubeCascara.malla);
  cascara.visible = false;
  grietas.visible = false;
  Sonido.cristal(0.5);
  Sonido.latido(2.2);
}

const haz = VolumetricsPlugin.createApplianceBeam('bulb');
haz.scale.set(4.2, 9.0, 4.2);
haz.position.y = 30;
haz.material.opacity *= 0.5;
escena.add(haz);

const panel = new SovereignHaloPlugin({ scene: escena }, {
  radio: 10, height: 1.8,
  position: new THREE.Vector3(0, 23, 0),
  tinta: '#ff6600',
  velocidad: 118,
  mensajes: ['LA SALA DEL HUEVO · BANCO DE PRUEBAS ABIERTO',
             'MISMAS REGLAS PARA PERSONAS Y PARA MÁQUINAS'],
  stream: HAY_HUB_POSIBLE ? 'http://127.0.0.1:8741/terminal/logs/stream' : null,
  filtro: (l) => {
    if (/error|traceback|exception|warning|debug/i.test(l)) return false;
    return l.replace(/^[\d\-:\s.]{10,}/, '').slice(0, 110).toUpperCase();
  },
});
panel.onInit();

const radar = new RadarPlugin({ alcance: 78, tam: 128, tinta: '#5a6675' })
                  .situar({ abajo: '22px', derecha: '22px' });

const oido = new SpatialAudioPlugin({ camera: camara });
oido.zumbido('maquina',  { hz: 92,  ancho: 0.35, volumen: 0.5 });
oido.zumbido('mesa',     { hz: 68,  ancho: 0.22, volumen: 0.42 });
oido.zumbido('terminal', { hz: 124, ancho: 0.6,  volumen: 0.34 });

function darVoz() {
  const ctx = oido.listener.context;
  if (ctx.state === 'suspended') ctx.resume();
  if (ctx.state !== 'running') return;
  for (const e of estaciones) {
    if (!e.grupo || e.zumbido) continue;
    const voz = e.tipo === 'mesa' ? 'mesa' : e.tipo === 'terminal' ? 'terminal' : 'maquina';
    e.zumbido = oido.playPositionalSound(voz, e.grupo, 1, true,
                                         e.tipo === 'terminal' ? 3.2 : 4.5);
  }
}

const NALMAS = 90;
const almas = new BoidsSystem({
  separationRadius: 1.9, alignmentRadius: 6.0, cohesionRadius: 8.0,
  maxSpeed: 6.0, maxForce: 0.34,
});
const geoAlma = new THREE.SphereGeometry(0.2, 6, 5);
const matAlma = new THREE.MeshBasicMaterial({
  color: 0x6fd8ff, transparent: true, opacity: 0.0,
  blending: THREE.AdditiveBlending, depthWrite: false,
});
const mallasAlma = [];
for (let i = 0; i < NALMAS; i++) {
  const m = new THREE.Mesh(geoAlma, matAlma);
  escena.add(m); mallasAlma.push(m);
}
almas.initAgents(NALMAS, { minX:-26, maxX:26, minY:3, maxY:26, minZ:-26, maxZ:26 }, mallasAlma);

const rnd = mulberry32(20260801);
const estaciones = [];

const TODAS = [
    ...ARCADES.map(it => ({ ...it, tipo: 'arcade', verbo: 'JUGAR' })),
    ...MESAS.map(it => ({ ...it, tipo: 'mesa', verbo: 'SENTARSE' })),
    ...TERMINALES.map(it => ({ ...it, tipo: 'terminal', verbo: 'LEER' }))
];

const urlParams = new URLSearchParams(window.location.search);
const focusId = urlParams.get('id');

const maquina = TODAS.find(m => m.n === focusId) || TODAS[0];

// Push strictly the one machine
estaciones.push({
    ...maquina, angulo: 0,
    x: 0, z: 0, // CENTER IN THE VOID
    grupo: null, pantalla: null, materia: 0,
});

try {
  const est = await fetch('../data/estado_salas.json').then(r => r.ok ? r.json() : {});
  const e = estaciones[0];
  const clave = e.u.replace(/^\.\.\//, '');
  if (est[clave] === 'roto') { e.enObras = true; e.verbo = 'EN OBRAS'; }
} catch { }

// Move camera in front of it and auto-sit after models load
camara.position.set(0, 1.62, 2.5); // Much closer since we are in focus mode


const matBlanca = new THREE.MeshStandardMaterial({ color:0xffffff, roughness:0.55, metalness:0.06 });
const matOscura = new THREE.MeshStandardMaterial({ color:0x1b232e, roughness:0.42, metalness:0.22 });

window.THREE = THREE;

await new Promise((listo) => {
  const s = document.createElement('script');
  s.src = '../js/arcade_boards.js';
  s.onload = listo;
  s.onerror = () => { console.warn('[Sala] sin arcade_boards.js: mesas sin tablero'); listo(); };
  document.head.appendChild(s);
});

const MODELOS = {};
const CATALOGO_MUEBLES = {
  arcade:   { url: '/props/models/Arcade Machine.glb', alto: 2.05 },
  mesa:     { url: '/props/models/Table.glb',          alto: 0.95 },
  terminal: { url: '/props/models/CRT Monitor.glb',    alto: 0.62 },
};
for (const [tipo, cfg] of Object.entries(CATALOGO_MUEBLES)) {
  try {
    const m = await AssetManager.loadModelAsync(cfg.url);
    const caja = new THREE.Box3().setFromObject(m);
    const t = caja.getSize(new THREE.Vector3());
    m.scale.multiplyScalar(cfg.alto / (t.y || 1));
    const caja2 = new THREE.Box3().setFromObject(m);
    m.position.y -= caja2.min.y;
    MODELOS[tipo] = m;
  } catch (err) {
    console.warn(`[Sala] sin modelo para ${tipo} (${err.message}); se usan cajas`);
    MODELOS[tipo] = null;
  }
}

function pantallaDe(grupo, ancho, alto, z) {
  let hallada = null;
  grupo.traverse(o => {
    if (!hallada && o.isMesh && /screen|pantalla|display|monitor/i.test(o.name || '')) hallada = o;
  });
  if (hallada) return hallada;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho, alto),
                           new THREE.MeshBasicMaterial({ color:0x0d1218 }));
  p.position.set(0, ...(Array.isArray(z) ? z : [alto, z]));
  grupo.add(p);
  return p;
}

const ATOMO = 0.3;
const geoVoxel = new THREE.BoxGeometry(ATOMO, ATOMO, ATOMO);
const matVoxel = new THREE.MeshStandardMaterial({
    color: 0x2e6f9e, roughness: 0.25, metalness: 0.15,
    emissive: 0x4fd0ff, emissiveIntensity: 1.9,
    transparent: true, opacity: 0.95,
});

function nubeDeVoxeles(ancho, alto, fondo, semilla) {
    const r = mulberry32(semilla);
    const nx = Math.max(1, Math.round(ancho / ATOMO));
    const ny = Math.max(1, Math.round(alto  / ATOMO));
    const nz = Math.max(1, Math.round(fondo / ATOMO));

    const destinos = [];
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < ny; j++)
        for (let k = 0; k < nz; k++) {
          const borde = i===0||i===nx-1||j===0||j===ny-1||k===0||k===nz-1;
          if (!borde) continue;
          destinos.push({
            x: (i - (nx-1)/2) * ATOMO,
            y: (j + 0.5) * ATOMO,
            z: (k - (nz-1)/2) * ATOMO,
          });
        }

    const malla = new THREE.InstancedMesh(geoVoxel, matVoxel.clone(), destinos.length);
    malla.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    malla.frustumCulled = false;

    const origen = destinos.map(() => {
        const a = r() * Math.PI * 2, d = 9 + r() * 15;
        return { x: Math.cos(a)*d, y: r()*13, z: Math.sin(a)*d, retraso: r() * 0.55 };
    });
    return { malla, destinos, origen, avance: 0 };
}

const maniquí = new THREE.Object3D();

function avanzarNube(nube, p) {
    const { malla, destinos, origen } = nube;
    for (let i = 0; i < destinos.length; i++) {
        const t = Math.max(0, Math.min(1, (p - origen[i].retraso) / (1 - origen[i].retraso)));
        const s = t * t * (3 - 2 * t);
        maniquí.position.set(
            origen[i].x + (destinos[i].x - origen[i].x) * s,
            origen[i].y + (destinos[i].y - origen[i].y) * s,
            origen[i].z + (destinos[i].z - origen[i].z) * s,
        );
        maniquí.rotation.set((1-s) * 5.5, (1-s) * 4.2, 0);
        maniquí.scale.setScalar(0.35 + s * 0.65);
        maniquí.updateMatrix();
        malla.setMatrixAt(i, maniquí.matrix);
    }
    malla.instanceMatrix.needsUpdate = true;
    malla.material.opacity = 0.95 * (1 - Math.pow(p, 3));
}

function materializar(e) {
  const g = new THREE.Group();
  g.position.set(e.x, 0, e.z);
  g.rotation.y = Math.atan2(e.x, e.z);

  if (e.tipo === 'mesa') {
    const tablero = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.11, 40), matBlanca);
    tablero.position.y = 0.92; g.add(tablero);
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.92, 20), matOscura);
    pie.position.y = 0.46; g.add(pie);
    for (let i = 0; i < 3; i++) {
      const t = (i/3)*Math.PI*2 + rnd();
      const tab = new THREE.Mesh(new THREE.CylinderGeometry(0.3,0.3,0.5,16), matBlanca);
      tab.position.set(Math.cos(t)*2.5, 0.25, Math.sin(t)*2.5); g.add(tab);
    }
    if (e.cartas) {
      const tapete = ArcadeTableRoomFactory.crearTapete(1.34, 0x14352a);
      tapete.position.set(0, 1.0, 0); g.add(tapete);
      const baraja = ArcadeTableRoomFactory.crearBaraja();
      baraja.position.set(0.34, 1.005, 0.2); g.add(baraja);
      for (let i = 0; i < 3; i++) {
        const c = ArcadeTableRoomFactory.crearBaraja({ n: 1 });
        c.position.set(-0.42 + i * 0.19, 1.006, -0.16 + (i % 2) * 0.06);
        c.rotation.y = (rnd() - 0.5) * 0.5;
        g.add(c);
      }
    } else {
      const grupoTablero = new THREE.Group(), grupoPiezas = new THREE.Group();
      const constructor = window[`build${e.tablero}Board`];
      if (constructor) {
        constructor(grupoTablero, grupoPiezas);
        const conjunto = new THREE.Group();
        conjunto.add(grupoTablero, grupoPiezas);
        const caja = new THREE.Box3().setFromObject(conjunto);
        const t = caja.getSize(new THREE.Vector3());
        conjunto.scale.setScalar(1.28 / Math.max(t.x, t.z, 0.001));
        conjunto.position.y = 1.005;
        g.add(conjunto);
        e.tableroGrupo = grupoTablero; e.piezasGrupo = grupoPiezas;
      } else {
        const tapete = ArcadeTableRoomFactory.crearTapete(1.34, 0x11161d);
        tapete.position.set(0, 1.0, 0); g.add(tapete);
      }
    }
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.125),
                             new THREE.MeshBasicMaterial({ color:0x0d1218,
                                                           transparent:true, opacity:0.9 }));
    p.position.set(0, 1.72, 0);
    g.add(p); e.pantalla = p;
  } else if (MODELOS[e.tipo]) {
    const mueble = MODELOS[e.tipo].clone(true);
    mueble.rotation.y = -Math.PI / 2;
    g.add(mueble);
    if (e.tipo === 'terminal') {
      const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 0.95, 18), matBlanca);
      pie.position.y = 0.475; g.add(pie);
      mueble.position.y = 0.95;
    }
    e.pantalla = pantallaDe(g, 1.24, 0.93, [1.28, 0.46]);
  } else {
    const alto = e.tipo === 'terminal' ? 2.5 : 2.0;
    const cuerpo = new THREE.Mesh(new THREE.BoxGeometry(1.7, alto, 0.85), matBlanca);
    cuerpo.position.y = alto/2; g.add(cuerpo);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.1, 1.1), matOscura);
    base.position.y = 0.05; g.add(base);
    e.pantalla = pantallaDe(g, 1.24, 0.93, [alto * 0.63, 0.44]);
  }

  const preparar = (m) => { const c = m.clone(); c.transparent = true; c.opacity = 0; return c; };
  g.traverse(o => {
    if (!o.isMesh) return;
    o.material = Array.isArray(o.material) ? o.material.map(preparar) : preparar(o.material);
  });
  escena.add(g);
  constructMaterializer.registerEntity(e);
  e.grupo = g;

  const caja = new THREE.Box3().setFromObject(g);
  const t = caja.getSize(new THREE.Vector3());
  e.nube = nubeDeVoxeles(
      Math.max(t.x, 0.6), Math.max(t.y, 0.6), Math.max(t.z, 0.6),
      Math.floor(e.angulo * 100000));
  g.add(e.nube.malla);
}

const holograma = new CSS3DHologramPlugin({ camera: camara, scene: escena });
const arcadeFX = new ArcadeFXPlugin(holograma);
const constructMaterializer = new ConstructMaterializerPlugin(escena);
let sentadoEn = null;
const PIE = document.getElementById('pie');
const PIE_ANDANDO = PIE.textContent;

Object.assign(holograma.css3dRenderer.domElement.style, { zIndex: '2', pointerEvents: 'none' });
holograma.acento = '#93a7bd';
holograma.setStandUpCallback(() => { levantarse(); });


function sentarse(e) {
  if (!e?.pantalla) return;
  sentadoEn = e;
  holograma.setSeated(true);
  document.exitPointerLock?.();
  
  // Load the actual live game into the 3D screen (CSS3D)
  holograma.loadMachine(e.u, e.pantalla, e.grupo.rotation.y);
  
  PIE.textContent = e.n.toUpperCase() + ' — FOCUS MODE — MOUSE/TECLADO PARA JUGAR — ESC PARA SALIR';
}

// Global ESC listener to exit Focus Room
document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' || ev.code === 'Escape') {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage('STAND_UP', '*');
        }
    }
});

async function cobrarPartida(e) {
  const marco = document.getElementById('romCartridge');
  const w = marco?.contentWindow;
  const ph = w?.ALISA_PROTOHUB;
  if (!e) return null;
  if (!ph) return null;
  const juego = [...ph.reglas.keys()][0];
  if (!juego) return null;
  const partida = ph.partida(juego);
  if (!partida || !partida.jugadas.length) return null;

  try {
    const { verificar } = await import('../arcade/js/protohub/Verificador.js');
    const v = verificar(ph.reglas.get(juego), partida);
    if (!v.valida) {
      panel.anunciar(`${e.n.toUpperCase()} · PARTIDA NO VERIFICADA`);
      mostrarFicha(partida, false, v.motivo);
      return { valida: false, motivo: v.motivo };
    }
    const ganados = Math.round(6 + partida.jugadas.length * 0.6 + Math.max(0, v.puntos ?? 0) * 4);
    puntos += ganados;
    if (!partidas.has(e)) partidas.set(e, []);
    partidas.get(e).push({ ...partida, verificada: true, ganados });
    panel.anunciar(`${e.n.toUpperCase()} · PARTIDA VERIFICADA · +${ganados}`);
    avisar('PARTIDA VERIFICADA', `${partida.jugadas.length} jugadas · +${ganados} puntos`);
    partida._trampas = await probarTrampas(ph.reglas.get(juego), partida);
    partidasVerificadas++;
    lanzarPulso();
    mostrarFicha(partida, true);
    Sonido.cristal(1.15);
    return { valida: true, ganados, partida };
  } catch (err) { return null; }
}

const partidas = new Map();
const geoPulso = new THREE.RingGeometry(0.6, 0.78, 128).rotateX(-Math.PI / 2);
const matPulso = new THREE.MeshBasicMaterial({
  color: 0x4fd0ff, transparent: true, opacity: 0,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});
const pulso = new THREE.Mesh(geoPulso, matPulso);
pulso.visible = false;
escena.add(pulso);
let tPulso = 0;
let fogonazo = 0;

function lanzarPulso() {
  pulso.position.set(camara.position.x, 0.04, camara.position.z);
  pulso.visible = true;
  tPulso = 0.0001;
  fogonazo = 1;
}

function avanzarPulso(dt) {
  if (fogonazo > 0) fogonazo = Math.max(0, fogonazo - dt * 1.6);
  if (!tPulso) return;
  tPulso += dt;
  const T = 2.6;
  const p = tPulso / T;
  if (p >= 1) { tPulso = 0; pulso.visible = false; return; }
  const r = 1 + Math.pow(p, 0.62) * 78;
  pulso.scale.set(r, 1, r);
  matPulso.opacity = 0.5 * Math.pow(1 - p, 1.7);
}

const fichaPartida = document.getElementById('ficha-partida');
let ultimaPartida = null;

function mostrarFicha(partida, valida, motivo) {
  ultimaPartida = partida;
  const bytes = JSON.stringify(partida).length;
  document.getElementById('fp-juego').textContent   = partida.juego;
  document.getElementById('fp-semilla').textContent = partida.semilla ?? '—';
  document.getElementById('fp-jugadas').textContent = partida.jugadas.length;
  document.getElementById('fp-bytes').textContent   = `${bytes} B`;
  const sello = document.getElementById('fp-sello');
  sello.textContent = valida ? 'VERIFICADA' : 'NO CUADRA';
  sello.className = valida ? '' : 'mal';
  fichaPartida.querySelector('.pie').textContent = valida
    ? 'Se verifica volviéndola a jugar.'
    : motivo || 'No se pudo reproducir.';
  fichaPartida.classList.add('visible');
}

async function probarTrampas(reglas, partida) {
  try {
    const { verificar } = await import('../arcade/js/protohub/Verificador.js');
    const trampas = [
      ['inflar la puntuación',  { ...partida, puntos: 9999 }],
      ['cambiar la semilla',    { ...partida, semilla: (partida.semilla + 1) >>> 0 }],
      ['colar una jugada',      { ...partida, jugadas: [...partida.jugadas, 'volar'] }],
      ['reordenar las jugadas', { ...partida, jugadas: [...partida.jugadas].reverse() }],
    ];
    return trampas.map(([nombre, p]) => {
      const v = verificar(reglas, p);
      return { nombre, colada: v.valida, motivo: v.motivo };
    });
  } catch { return null; }
}

document.getElementById('fp-falsear').addEventListener('click', (ev) => {
  ev.stopPropagation();
  const salida = document.getElementById('fp-veredicto');
  const t = ultimaPartida?._trampas;
  if (!t) return;
  const cazadas = t.filter(x => !x.colada).length;
  salida.innerHTML = t.map(x => x.colada
        ? `⚠ ${x.nombre}: HA COLADO`
        : `✕ ${x.nombre} — ${x.motivo}`).join('<br>')
      + `<br><b style="color:#1d6b45">${cazadas} de ${t.length} trampas cazadas</b>`;
  salida.classList.add('visible');
  panel.anunciar(`TRAMPAS PROBADAS · ${cazadas} DE ${t.length} CAZADAS`);
});

document.getElementById('fp-copiar').addEventListener('click', async (ev) => {
  ev.stopPropagation();
  if (!ultimaPartida) return;
  const texto = JSON.stringify(ultimaPartida);
  try { await navigator.clipboard.writeText(texto); } catch {}
});

async function levantarse() {
  if (!sentadoEn) return;
  const donde = sentadoEn;
  await cobrarPartida(donde);
  holograma.setSeated(false);
  holograma.disconnect();
  sentadoEn = null;
  PIE.textContent = PIE_ANDANDO;
  pedirPuntero();
}

const LLEGADA = 4.2;
let tLlegada = -1;
const onda = new THREE.Mesh(
  new THREE.RingGeometry(0.9, 1.25, 128).rotateX(-Math.PI/2),
  new THREE.MeshBasicMaterial({ color:0x6fdcff, transparent:true, opacity:0,
                                blending:THREE.AdditiveBlending, depthWrite:false, side:THREE.DoubleSide })
);
onda.position.y = 0.03;
escena.add(onda);
const onda2 = onda.clone();
onda2.material = onda.material.clone();
escena.add(onda2);

function aplicarLlegada(p) {
  const s = p * p * (3 - 2 * p);
  escena.fog.density = 0.075 - (0.075 - 0.009) * s;
  rejilla.material.opacity = 0.5 * s;
  const q = Math.max(0, (p - 0.42) / 0.58);
  cascara.visible = nucleo.visible = q > 0.001;
  cascara.scale.setScalar(0.55 + q * 0.45);
  nucleo.material.opacity = q * 0.85;
  luzNucleo.intensity = q * 26;
  haz.material.opacity = (haz.userData.op ??= haz.material.opacity) * q;
  polvo.material.opacity = 0.62 * Math.max(0, (p - 0.55) / 0.45);
  matAlma.opacity = 0.9 * Math.max(0, (p - 0.68) / 0.32);
  panel.tickerGroup.visible = p > 0.5;
}

const NPOLVO = 900;
const posPolvo = new Float32Array(NPOLVO * 3);
for (let i = 0; i < NPOLVO; i++) {
  const r = 12 + rnd() * 88, a = rnd() * Math.PI * 2;
  posPolvo[i*3]   = Math.cos(a) * r;
  posPolvo[i*3+1] = rnd() * 26;
  posPolvo[i*3+2] = Math.sin(a) * r;
}
const geoPolvo = new THREE.BufferGeometry();
geoPolvo.setAttribute('position', new THREE.BufferAttribute(posPolvo, 3));
const polvo = new THREE.Points(geoPolvo, new THREE.PointsMaterial({
  color:0xffffff, size:0.13, transparent:true, opacity:0.62,
  depthWrite:false, blending:THREE.AdditiveBlending,
}));
escena.add(polvo);

const Sonido = {
  ctx: null, maestro: null, zumbido: null,
  abrir() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.maestro = this.ctx.createGain();
    this.maestro.gain.value = 0.0;
    this.maestro.connect(this.ctx.destination);
    const mezcla = this.ctx.createGain();
    mezcla.gain.value = 0.055;
    for (const f of [55, 55.3, 110.2]) {
      const o = this.ctx.createOscillator();
      o.type = 'sine'; o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = f > 100 ? 0.22 : 1;
      o.connect(g); g.connect(mezcla); o.start();
    }
    const paso = this.ctx.createBiquadFilter();
    paso.type = 'lowpass'; paso.frequency.value = 220; paso.Q.value = 0.6;
    mezcla.connect(paso); paso.connect(this.maestro);
    this.zumbido = mezcla;
  },
  latido(fuerza = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(78, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.34);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * fuerza, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g); g.connect(this.maestro);
    o.start(t); o.stop(t + 0.55);
  },
  cristal(altura = 1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [1, 2.76, 5.4].forEach((mult, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = 880 * altura * mult;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.055 / (i + 1), t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6 / (i + 1));
      o.connect(g); g.connect(this.maestro);
      o.start(t); o.stop(t + 1.7);
    });
  },
  presencia(v) {
    if (!this.ctx) return;
    this.maestro.gain.setTargetAtTime(v, this.ctx.currentTime, 0.4);
  },
};

const teclas = {};
let giroH = 0, giroV = -0.04, dentro = false;
const vel = new THREE.Vector3();
addEventListener('keydown', e => { teclas[e.key.toLowerCase()] = true; });
addEventListener('keyup',   e => { teclas[e.key.toLowerCase()] = false; });
const umbral = document.getElementById('umbral');
umbral.addEventListener('click', () => {
  umbral.classList.add('ido');
  umbral.style.display = 'none';
  pedirPuntero();
  dentro = true;
  tLlegada = 0;
  Sonido.abrir();
  const pie = document.getElementById('pie');
  if (pie) pie.innerHTML = esTactil
    ? 'dedo izquierdo para andar · dedo derecho para mirar · toca para usar'
    : 'wasd para andar · ratón para mirar · clic para usar · esc para soltar';
});

let punteroVaBien = true;
function sinPuntero(motivo) {
  if (!punteroVaBien) return;
  punteroVaBien = false;
  console.warn('[Sala] puntero no concedido: arrastrar para mirar');
  if (!sentadoEn) PIE.textContent = 'arrastra para mirar · wasd para andar · clic para usar';
}
function pedirPuntero() {
  if (!punteroVaBien || esTactil) return;
  try {
    const p = document.body.requestPointerLock();
    if (p && typeof p.catch === 'function') p.catch(e => sinPuntero(e?.name));
  } catch (e) { sinPuntero(e?.name); }
}
addEventListener('pointerlockerror', () => sinPuntero('pointerlockerror'));

let arrastrando = false, ratonX = 0, ratonY = 0, arrastrado = 0;
addEventListener('mousedown', e => {
  if (e.button !== 0 || sentadoEn || document.pointerLockElement) return;
  arrastrando = true; arrastrado = 0;
  ratonX = e.clientX; ratonY = e.clientY;
});
addEventListener('mouseup', () => { arrastrando = false; });
const mirarV = (d) => { giroV = Math.max(-1.15, Math.min(1.15, giroV - d)); };
addEventListener('mousemove', e => {
  if (document.pointerLockElement) {
    giroH -= e.movementX * 0.0022;
    mirarV(e.movementY * 0.0022);
    return;
  }
  if (!arrastrando) return;
  const dx = e.clientX - ratonX, dy = e.clientY - ratonY;
  ratonX = e.clientX; ratonY = e.clientY;
  arrastrado += Math.abs(dx) + Math.abs(dy);
  giroH -= dx * 0.0034;
  mirarV(dy * 0.0034);
});

const esTactil = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
if (esTactil) {
  const m = document.getElementById('mandos-umbral');
  if (m) m.innerHTML = '<b>dedo izquierdo</b> para andar · <b>dedo derecho</b> para mirar · <b>toca</b> para usar';
}
function tocar(ev) {
  for (const t of ev.changedTouches) {
    dedos.set(t.identifier, {
      x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY,
      zona: t.clientX < innerWidth / 2 ? 'andar' : 'mirar',
      t0: performance.now(),
    });
  }
}
function mover(ev) {
  for (const t of ev.changedTouches) {
    const d = dedos.get(t.identifier);
    if (!d) continue;
    if (d.zona === 'mirar') {
      giroH -= (t.clientX - d.x) * 0.005;
      giroV = Math.max(-1.15, Math.min(1.15, giroV - (t.clientY - d.y) * 0.005));
    }
    d.x = t.clientX; d.y = t.clientY;
  }
  ev.preventDefault();
}
function soltar(ev) {
  for (const t of ev.changedTouches) {
    const d = dedos.get(t.identifier);
    if (d) {
      const quieto = Math.hypot(t.clientX - d.x0, t.clientY - d.y0) < 12;
      if (quieto && performance.now() - d.t0 < 350) usarLoQueMiro();
      dedos.delete(t.identifier);
    }
  }
}
addEventListener('touchstart', tocar,  { passive: false });
addEventListener('touchmove',  mover,  { passive: false });
addEventListener('touchend',   soltar, { passive: false });
addEventListener('touchcancel', soltar, { passive: false });

let enPocketDimension = false;
let transitionPocket = 0;
let fichaLista = false;

function usarLoQueMiro() {
  if (!dentro && !sentadoEn) return;
  if (!esTactil && punteroVaBien && !sentadoEn && !document.pointerLockElement) { pedirPuntero(); return; }
  if (arrastrado > 6) { arrastrado = 0; return; }
  if (tLlegada < LLEGADA) return;
  
  if (!sentadoEn) {
      if (!mirando) return;
      // First click: sit in front of the machine (it will load the preview via sentarse)
      sentarse(mirando);
      return;
  }
  
  }
window.usarLoQueMiro = usarLoQueMiro;
addEventListener('click', usarLoQueMiro);

function tick() {
  const t = performance.now() / 1000;
  const dt = Math.min(t - tick.ultimoTime || 0, 0.1);
  tick.ultimoTime = t;
  requestAnimationFrame(tick);
  
  if (tLlegada >= 0 && tLlegada < LLEGADA) {
    tLlegada += dt;
    const p = Math.min(1, tLlegada / LLEGADA);
    aplicarLlegada(p);
  }

  if (sentadoEn) {
    vel.set(0, 0, 0);
    if (tick.targetCamPos) {
        // Interpolación suave para entrada a las mesas
        camara.position.lerp(tick.targetCamPos, dt * 5.0);
        const diffH = tick.targetGiroH - giroH;
        const deltaH = Math.atan2(Math.sin(diffH), Math.cos(diffH));
        giroH += deltaH * (dt * 5.0);
        giroV += (tick.targetGiroV - giroV) * (dt * 5.0);
    }
  } else {
    const dir = new THREE.Vector3();
    if (teclas['w']||teclas['arrowup']) dir.z -= 1;
    if (teclas['s']||teclas['arrowdown']) dir.z += 1;
    if (teclas['a']||teclas['arrowleft']) dir.x -= 1;
    if (teclas['d']||teclas['arrowright']) dir.x += 1;
    if (dir.lengthSq()) {
      dir.normalize().applyAxisAngle(new THREE.Vector3(0,1,0), giroH);
      vel.addScaledVector(dir, 46 * dt);
    }
    vel.multiplyScalar(Math.pow(0.0016, dt));
    camara.position.addScaledVector(vel, dt);
    const lim = 110, d = Math.hypot(camara.position.x, camara.position.z);
    if (d > lim) { camara.position.x *= lim/d; camara.position.z *= lim/d; }
  }

  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(giroV, giroH, 0, 'YXZ'));
  camara.quaternion.copy(q);

  const dHuevo = Math.hypot(camara.position.x, camara.position.z);
  const cerca = Math.max(0, 1 - dHuevo / 60);
  lente.anillo = 0.50 + cerca * 0.30 + fogonazo * 1.4;

  if (enPocketDimension) {
    transitionPocket = Math.min(1, transitionPocket + dt * 1.5);
  } else {
    transitionPocket = Math.max(0, transitionPocket - dt * 1.5);
  }
  
  if (transitionPocket > 0) {
    escena.background.copy(colorFondo).lerp(colorNegro, transitionPocket);
    escena.fog.color.copy(colorFondo).lerp(colorNegro, transitionPocket);
    escena.fog.density = 0.0062 + transitionPocket * 0.05; 
    suelo.material.opacity = 1 - transitionPocket;
    huevo.scale.setScalar(1 - transitionPocket * 0.99);
    estaciones.forEach(e => { if (e !== sentadoEn && e.grupo) e.grupo.visible = (transitionPocket < 0.9); });
  }

  aportacion += (vistas.size / estaciones.length - aportacion) * Math.min(1, dt * 0.9);
  nucleo.rotation.y -= dt * 0.8;
  latido = (Math.sin(t * 3.8) + 1) / 2;
  if (!rota) {
    // Las grietas se encienden con lo que aportas y pulsan con el latido. Al
    // completar la sala brillan del todo — y ahí se quedan. Esa contención ES
    // el mensaje: has hecho tu parte, y aun así no basta. Hace falta todo el
    // mundo, y por eso el huevo sigue entero.
    grietas.material.opacity = Math.max(0, (aportacion - 0.2) / 0.8) * (0.2 + latido * 0.55);
  } else if (nubeCascara) {
    // Hacia atrás: de encajada (1) a dispersa (0). La cáscara se deshace.
    nubeCascara.avance = Math.max(0, nubeCascara.avance - dt * 0.22);
    avanzarNube(nubeCascara, nubeCascara.avance);
    nubeCascara.malla.material.opacity = nubeCascara.avance;
    if (nubeCascara.avance <= 0.001) {
      huevo.remove(nubeCascara.malla); nubeCascara = null;
      escena.fog.density = 0.0062;      // la sala respira: queda consumada
    }
  }

  // El sonido sigue el MISMO dato que la imagen, no un temporizador aparte:
  // el zumbido se abre cuando te acercas al huevo.
  if (Sonido.zumbido) Sonido.zumbido.gain.value = 0.04 + cerca * 0.075 + aportacion * 0.03;
  // Y el latido suena cuando el latido visual pasa por su cresta.
  if (latido > 0.985 && t - (tick.ultimoLatido ?? -9) > 0.4) {
    tick.ultimoLatido = t;
    Sonido.latido(0.35 + cerca * 0.85 + aportacion * 0.5);
  }
  
  if (nucleo.userData && nucleo.userData.uniforms) {
      nucleo.userData.uniforms.time.value = t;
  }
  
  nucleo.scale.setScalar(0.86 + latido * (0.16 + cerca * 0.3));
  nucleo.material.opacity = 0.55 + latido * 0.35;
  luzNucleo.intensity = 18 + latido * (12 + cerca * 40);
  matHuevo.emissiveIntensity = 0.24 + latido * 0.2 + cerca * 0.14;
  cascara.rotation.y += dt * 0.045;

  // ── El polvo deriva HACIA la anomalía (tú) ──
  const p = geoPolvo.attributes.position.array;
  for (let i = 0; i < NPOLVO; i++) {
    const ix = i*3;
    const dx = camara.position.x - p[ix], dz = camara.position.z - p[ix+2];
    const dd = Math.hypot(dx, dz) || 1;
    const tira = Math.min(0.5, 5 / (dd*dd)) * dt;   // solo se nota de cerca
    p[ix]   += dx * tira + Math.sin(t*0.4 + i) * dt * 0.05;
    p[ix+1] += dt * 0.16;
    p[ix+2] += dz * tira + Math.cos(t*0.35 + i) * dt * 0.05;
    if (p[ix+1] > 26) { p[ix+1] = 0;                 // vuelve a caer
      const r = 30 + rnd()*70, a = rnd()*Math.PI*2;
      p[ix] = Math.cos(a)*r; p[ix+2] = Math.sin(a)*r; }
  }
  geoPolvo.attributes.position.needsUpdate = true;

  // ── JIT: la materia entra con la cercanía ──
  materializadas = 0;
  let mejor = null, mejorAng = 0.985;
  const haciaDelante = new THREE.Vector3(0,0,-1).applyQuaternion(q);

  for (const e of estaciones) {
    const dist = Math.hypot(e.x - camara.position.x, e.z - camara.position.z);

    if (dist < 46 && !e.grupo) materializar(e);         // fabricar
    if (!e.grupo) continue;

    // Materia por distancia: entre 46 y 30 metros.
    const objetivo = Math.max(0, Math.min(1, (46 - dist) / 16));
    e.materia += (objetivo - e.materia) * Math.min(1, dt * 2.6);
    e.grupo.visible = e.materia > 0.01;

    // La nube ensambla PRIMERO (0 → 0.55 de materia) y la geometría entra
    // DESPUÉS (0.45 → 1), solapándose un poco. Ese solape es lo que hace que
    // parezca que los cubos se convierten en la cosa, en vez de dos efectos
    // seguidos.
    if (e.nube) {
        const p = Math.min(1, e.materia / 0.55);
        avanzarNube(e.nube, p);
        e.nube.malla.visible = e.materia > 0.01 && e.materia < 0.72;
    }
    const solido = Math.max(0, (e.materia - 0.45) / 0.55);
    e.grupo.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh) return;
      if (Array.isArray(o.material)) o.material.forEach(m => { m.opacity = solido; });
      else o.material.opacity = solido;
    });
    if (e.materia > 0.5) materializadas++;

    // Una estación "vista" es la que has resuelto del todo. Alimenta el huevo,
    // y suena el cristal — el dato deja de estar pendiente y el oído te lo
    // confirma. Solo la primera vez: si no, sonaría cada vez que pasas.
    if (e.materia > 0.94 && !vistas.has(e)) {
      vistas.add(e);
      // Puntúa resolver una estación. Los arcades valen más porque son los que
      // producen dataset de juego; los terminales son lectura.
      // ⚠️ Aquí se sumaban 55 puntos por MATERIALIZAR la estación, o sea por
      // pasear cerca. Cualquiera salía con 500 puntos sin tocar un juego, y el
      // pacto de la puerta —«todo lo de aquí puntúa: qué resuelves»— era una
      // frase sobre nada. Explorar sigue contando, pero cuenta donde debe:
      // en la APORTACIÓN, que es cuánta sala has vuelto real y alimenta al
      // huevo. Los PUNTOS ahora solo salen de partidas verificadas.
      Sonido.cristal(e.tipo === 'mesa' ? 1.35 : e.tipo === 'terminal' ? 0.8 : 1);
      panel.anunciar(`${e.n.toUpperCase()} · MATERIA · ${vistas.size}/${estaciones.length} DE LA SALA`);
      if (vistas.size === estaciones.length) {
        panel.anunciar('SALA COMPLETA · Y AUN ASÍ EL HUEVO SIGUE ENTERO');
      }
    }

    // Ya no hay que encender ni apagar pantallas: hay un solo cartucho y solo
    // se monta cuando te sientas. La malla oscura de la pantalla se queda como
    // el cristal apagado de una máquina que espera.

    // ¿La estoy mirando?
    if (dist < 26) {
      const v = new THREE.Vector3(e.x - camara.position.x, 0, e.z - camara.position.z).normalize();
      const alineado = v.dot(new THREE.Vector3(haciaDelante.x, 0, haciaDelante.z).normalize());
      if (alineado > mejorAng) { mejorAng = alineado; mejor = e; }
    }
  }

  // ── El huevo cae cuando te lo has ganado ──
  // Solo lo ve quien lo ha ganado: no es un evento de la sala, es un objeto
  // TUYO que aparece en un sitio compartido. Por eso cae delante de ti y no en
  // un pedestal — nadie más lo está viendo.
  if (puntos >= PUNTOS_HUEVO && !huevoCaido && !huevoRecogido) soltarHuevo();

  if (huevoCaido) {
    const h = huevoCaido;
    const edad = t - h.nacido;
    h.grupo.position.y = 1.15 + Math.sin(t * 1.7) * 0.12;      // flota
    h.grupo.rotation.y += dt * 0.55;
    h.cuerpo.material.emissiveIntensity = 0.7 + Math.sin(t * 3.1) * 0.35;
    h.grupo.scale.setScalar(Math.min(1, edad * 1.6));           // entra creciendo

    const dh = h.grupo.position.distanceTo(camara.position);
    if (dh < 2.6) { mejor = { n:'Huevo', verbo:'RECOGER', __huevo:true }; mejorAng = 2; }
  }

  // ── Lo que estás mirando ──
  if (mejor !== mirando) {
    mirando = mejor;
    elMirilla.classList.toggle('activa', !!mirando);
    elObj.classList.toggle('visible', !!mirando);
    if (mirando) {
      document.getElementById('oVerbo').textContent  = mirando.verbo;
      document.getElementById('oNombre').textContent = mirando.n;
    }
  }

  // ── Estado ──
  // Dos cifras y significan cosas distintas a propósito:
  //   INCUBACIÓN — el progreso global hacia la Avenida de la Reina. No es tuyo,
  //                no lo mueves tú, y está lejos. Esa distancia es la promesa.
  //   APORTACIÓN — lo que tú has calculado estando aquí. Sube al explorar.
  // La incubación es un dato GLOBAL de la colonia, no tuyo: solo se enseña si
  // la colonia la ha reportado. Inventarla —aunque sea con el número real de
  // hoy— sería exactamente lo que este sitio dice que no hace.
  document.getElementById('vInc').textContent =
      rota ? 'ECLOSIONADO'
           : (incubacionReportada === null ? '— sin conexión'
                                           : `${(incubacionReportada * 100).toFixed(1)}%`);
  document.getElementById('vPar').textContent =
      `${partidasVerificadas} verificada${partidasVerificadas === 1 ? '' : 's'}`;
  document.getElementById('vMat').textContent =
      `${(aportacion * 100).toFixed(0)}% · ${vistas.size}/${estaciones.length}`;
  // Puntos, sin más. Nada de "eres candidato a X": un marcador honesto, como
  // cualquier benchmark. El huevo llega solo cuando el número llega, y hasta
  // entonces nadie ha prometido nada.
  document.getElementById('vCan').textContent =
      huevoRecogido ? `${puntos} → DUST` : String(puntos);

  // ⚠️ Aquí se escribía `anomalía: latente/presente/desplazándose`. Se quitó del
  // HUD a propósito: era telemetría sobre TI que nadie había explicado, y el
  // umbral ahora lo dice mejor en una frase («tú eres la anomalía»). Dejar el
  // código escribiendo en un elemento borrado tiraba la sala entera en el primer
  // fotograma — 197 errores y pantalla muerta.

  if (dentro) darVoz();          // las máquinas que ya existen y aún no suenan
  avanzarPulso(dt);              // el anillo de una partida verificada

  // ── El radar ──
  // Los tres anillos con su color, y en tenue lo que todavía no es materia:
  // así el radar cuenta la verdad de la sala —hay algo ahí, aún sin construir—
  // en vez de fingir que el mundo entero existe desde el principio.
  if (dentro) {
    radar.pintar(estaciones.map(e => ({
      x: e.x, z: e.z,
      color: e.tipo === 'arcade' ? '#1a2230' : e.tipo === 'mesa' ? '#14352a' : '#7a6320',
      tenue: (e.materia ?? 0) < 0.5,
    })).concat([{ x: 0, z: 0, color: '#4fd0ff' }]),   // el huevo, siempre
    camara.position, giroH);
  }

  // ── El panel y las almas ──
  panel.onUpdate(dt);
  // ⚠️ El objetivo GIRA, y ese es todo el truco. Una bandada que persigue un
  // punto fijo se apelmaza encima de él: lo medí, radio medio 1,6 m — 90 almas
  // clavadas en el eje del huevo. Persiguiendo un punto que orbita, la
  // persecución ES la órbita. Sin tocar la física, que es del motor.
  const gira = t * 0.33;
  almas.update(dt,
    { position: camara.position, power: 10 },          // tú, la anomalía
    { position: { x: Math.cos(gira) * 14, y: 10.5 + Math.sin(t * 0.21) * 3.5,
                  z: Math.sin(gira) * 14 }, power: 90 });

  // ── La anomalía ──
  // Apunta al huevo y crece con lo que la sala lleva resuelto: el espacio se
  // dobla MÁS cuanto más has aportado. Así el efecto no es decorado, es el
  // marcador — y a la vez explica el pacto de la puerta sin una sola palabra.
  // ⚠️ La anomalía se doblaba con la APORTACIÓN, o sea con lo que paseas. Era
  // la misma mentira que tenía el HUD, escondida en la imagen: el efecto más
  // vistoso de la sala premiaba andar. Ahora crece con lo que has DEMOSTRADO —
  // partidas verificadas— y el paseo solo aporta un roce.
  //
  // Es la frase del sitio hecha luz: lo que doblas del mundo es lo que puedes
  // probar. Nadie tiene que leerlo para entenderlo; se ve.
  const probado = 1 - Math.exp(-partidasVerificadas / 3);   // sube y se satura
  lente.apuntar(huevo.position.clone().setY(10.2), camara, innerWidth / innerHeight);
  lente.radio  = 0.25 + probado * 0.20 + aportacion * 0.05 + cerca * 0.08;
  lente.fuerza = 0.15 + probado * 0.25 + aportacion * 0.04 + latido * 0.02 + fogonazo * 0.08;
  lente.anillo = 0.50 + latido * 0.30 + fogonazo * 1.4;

  composer.render();
  // El plugin renderiza su propia capa CSS3D aquí dentro, además de mover el
  // cartucho cuando lo proyectas hacia ti. Sin esta llamada la pantalla se
  // monta pero no se dibuja: el iframe existe y no se ve.
  holograma.onUpdate(dt);
  arcadeFX.onUpdate(dt);
  constructMaterializer.onUpdate(dt);
  volumetrics.onUpdate(dt);
  panel.onUpdate(dt);
}
tick();

addEventListener('resize', () => {
  camara.aspect = innerWidth/innerHeight; camara.updateProjectionMatrix();
  render.setSize(innerWidth, innerHeight);
  holograma.onResize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
});

// Escuchar mensajes del Pocket Dimension por si el juego pide salir (ej. con ESC)
window.addEventListener('message', (event) => {
  if (event.data === 'STAND_UP' && sentadoEn?.tipo === 'mesa') {
    const btn = document.getElementById('btn-standup-pocket');
    if (btn && btn.offsetParent !== null) btn.click();
  }
});

// La sala arranca SIN EXISTIR. Si no, la onda de llegada no crea nada: llega a
// un sitio que ya estaba puesto, y el efecto se lee como un adorno en vez de
// como una causa.
aplicarLlegada(0);

// Para poder comprobarlo desde fuera.
window.__sala = {
  escena, camara, estaciones, holograma, bloom, composer, render, panel, almas, radar, oido,
  cobrarPartida,          // expuesta para poder auditar el cobro desde fuera
  sentarse, levantarse,

  /**
   * QUÉ ESTACIONES PUEDE JUGAR UNA MÁQUINA, Y CON QUÉ ENTORNO.
   *
   * Esto es la portada hecha comprobable: `[{estacion, env, url}]`. Un agente
   * enumera esto, carga el entorno por su id desde
   * `js/alisa-engine/src/gym/registry.js`, juega, y su episodio deja el MISMO
   * recibo que dejaría una persona sentada aquí —{juego, semilla, jugadas,
   * puntos}— así que lo verifica el mismo `Verificador.js`.
   *
   * `sinEntorno` no se esconde: son las estaciones que todavía solo saben
   * jugarse con manos.
   */
  get entornos() {
    return [...ARCADES, ...MESAS]
      .filter(e => e.env)
      .map(e => ({ estacion: e.n, env: e.env, url: e.u }));
  },
  get sinEntorno() {
    return [...ARCADES, ...MESAS].filter(e => !e.env).map(e => e.n);
  },

  get sentadoEn(){ return sentadoEn; },
  get materializadas(){ return materializadas; },
  get llegada(){ return tLlegada; },
  saltarLlegada(){ tLlegada = LLEGADA; onda.visible = onda2.visible = false; aplicarLlegada(1); },

  // EL DÍA DE LA AVENIDA DE LA REINA.
  // La eclosión NO se dispara explorando: es un acontecimiento global, único y
  // de todos, no un premio de sesión. Que lo llame el hub el día que haya
  // cómputo en red suficiente y existan las divisas.
  // El mecanismo está escrito y probado, esperando. Construir el mecanismo sin
  // gastar el acontecimiento.
  eclosionar(){ romperCascara(); },
  get aportacion(){ return aportacion; },
  get rota(){ return rota; },
};