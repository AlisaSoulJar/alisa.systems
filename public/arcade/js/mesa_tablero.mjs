/**
 * mesa_tablero.mjs — la mesa de CUALQUIER juego que no reparta cartas
 * ═══════════════════════════════════════════════════════════════════════════
 *     montarMesa({ juego: 'sokoban' })        ← sin visualizador: sale ésta
 *
 * Es la hermana de `mesa_cartas.mjs`, y hace lo mismo por el otro lado: una sola
 * mesa para todos los juegos de rejilla y piezas, dirigida por el SUSTRATO.
 *
 * ⚠️ POR QUÉ EXISTE, QUE ES LA SÉPTIMA VEZ QUE PASA LO MISMO
 *
 * `crearPintor3d` lleva meses sabiendo dibujar rejilla, piezas Y montones —los
 * tres a la vez— sin saber a qué se juega. Y sólo lo usaba `sala.html`, que a su
 * vez no estaba enlazada desde ninguna parte. Resultado medido: ONCE juegos
 * —sokoban, cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebaño,
 * pradera y nave— sólo se podían abrir como PÁGINA DE TEXTO, teniendo su vista 3D
 * hecha y funcionando. Se comprobó abriéndolos: sokoban dibuja sus muros, sus
 * cajas, sus destinos y su jugador, con 63 instancias en la escena.
 *
 * Algo construido, funcionando y sin cable. Van siete hoy.
 *
 * ⚠️ Y POR QUÉ ES UN MÓDULO Y NO UN TROZO MÁS DE `sala.html`
 *
 * Estas treinta líneas vivían sueltas dentro de esa página. En cuanto una segunda
 * mesa las necesitara habría dos copias de la misma regla de oro —«no se manda
 * nada que no esté en `legal_moves`»— con la posibilidad de que una se la saltara.
 * Este proyecto ha pagado seis veces por esa decisión tomada al revés.
 *
 * ⚠️ INVITADA O DUEÑA, COMO LA MESA DE CARTAS
 *
 * Si alguien puso `window.ALISA_ANFITRION = { grupo, escena, camara }` —lo hace
 * `sala.html`, y a través de ella la Sala del Huevo— dibuja DENTRO de esa escena y
 * no toca la cámara: las piezas pasan a ser objetos de la sala, con sus sombras.
 * Sin anfitrión monta su propia escena. El mismo contrato exacto que ya usa
 * `mesa_cartas.mjs`, para que las dos se comporten igual en los dos sitios.
 */
import { crearPintor3d } from './protohub/render/pintar3d.js';
import { pintarJugadas } from './protohub/jugadas.js';

const hub = window.ALISA_PROTOHUB;
const juego = window.ALISA_JUEGO;
if (!hub || !juego) {
    throw new Error('mesa_tablero: falta `window.ALISA_JUEGO` o el hub. Los pone `montarMesa`.');
}
const anfitrion = window.ALISA_ANFITRION ?? null;

/**
 * ⚠️ CUÁNTO MIDE UN TABLERO SUELTO. NO ES «LO QUE QUEPA».
 *
 * De invitada manda el anfitrión, que la pone a escala de persona sobre una mesa
 * de verdad. De dueña no hay mesa ni metros: la referencia es la pantalla, así que
 * el tablero se normaliza a un tamaño fijo y la cámara se coloca para encuadrarlo.
 *
 * Se normaliza EL LADO MAYOR y no el área: un sokoban de 5×3 y un go de 19×19
 * tienen que caber los dos, y lo que decide es el lado largo.
 */
const LADO = 10;
const INCLINACION = 42 * Math.PI / 180;   // mirar el tablero, no asomarse a él

let escena, camara, grupo, render, controles;

if (anfitrion) {
    ({ escena, camara, grupo } = anfitrion);
} else {
    escena = new THREE.Scene();
    escena.background = new THREE.Color(0x07070a);

    camara = new THREE.PerspectiveCamera(
        45,
        // ⚠️ `innerWidth` puede ser 0 —pestaña de fondo, ventana minimizada— y una
        // proporción NaN da pantalla negra SIN un solo error. Ya pasó.
        (innerWidth > 0 && innerHeight > 0) ? innerWidth / innerHeight : 16 / 9,
        0.1, 400,
    );

    render = new THREE.WebGLRenderer({ antialias: true });
    render.setSize(innerWidth || 1280, innerHeight || 720);
    render.setPixelRatio(Math.min(devicePixelRatio, 2));
    render.shadowMap.enabled = true;
    render.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(render.domElement);

    escena.add(new THREE.HemisphereLight(0xbfd4e6, 0x14121c, 0.7));
    const foco = new THREE.DirectionalLight(0xfff4e0, 1.15);
    foco.position.set(6, 16, 9);
    foco.castShadow = true;
    escena.add(foco);

    grupo = new THREE.Group();
    escena.add(grupo);

    controles = new THREE.OrbitControls(camara, render.domElement);
    controles.maxPolarAngle = Math.PI / 2.05;   // que no se meta bajo el tablero
    controles.minDistance = LADO * 0.5;
    controles.maxDistance = LADO * 4;
    camara.position.set(0, LADO * 0.8, LADO * 0.9);
    controles.update();
}

const pintor = crearPintor3d(grupo, THREE);

// ── El HUD ──────────────────────────────────────────────────────────────────
const caja = document.getElementById('hud-container');
if (caja && !caja.querySelector('#mesa-jugadas')) {
    caja.innerHTML =
        `<div class="overlay"><div class="hud-panel"><div class="hud-header">`
      + `<h1>${window.ALISA_TITULO ?? juego}</h1></div>`
      + `<div id="hud-content"><div id="estado-txt" class="status-row"></div>`
      + `<div id="mesa-jugadas" class="mesa-jugadas"></div></div></div></div>`;
}

/**
 * ⚠️ SI NO HAY NADA QUE MEDIR, NO SE ESCALA.
 *
 * `Math.max(x, z, 0.001)` evita dividir por cero y produce algo peor que un
 * error: una escala de 2550. Pasó con cripta cuando su sustrato llegaba vacío —la
 * mesa salía sin nada y con las jugadas perfectamente listadas al lado—, y ese
 * número no llamaba la atención porque el resultado visible era el mismo que el de
 * una mesa vacía. Un grupo sin tamaño no es pequeño: es que todavía no está.
 *
 * Y se mide con las matrices de instancia a mano, porque `Box3.setFromObject` NO
 * las mira en el three que servimos: devuelve la caja de la geometría base. Eso me
 * escaló un ajedrez ocho veces de más, y luego me hizo contar «16 mallas» donde
 * había 63 instancias. Van dos veces con la misma piedra.
 */
function cajaReal(raiz) {
    const c = new THREE.Box3(), m = new THREE.Matrix4(), b = new THREE.Box3();
    raiz.updateMatrixWorld(true);
    raiz.traverse((o) => {
        if (!o.isMesh || !o.geometry) return;
        if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
        if (o.isInstancedMesh && o.instanceMatrix) {
            for (let i = 0; i < o.count; i++) {
                o.getMatrixAt(i, m);
                m.premultiply(o.matrixWorld);
                c.union(b.copy(o.geometry.boundingBox).applyMatrix4(m));
            }
        } else {
            c.union(b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
        }
    });
    return c;
}

let encuadrado = false;
function encajar() {
    if (anfitrion || !grupo.children.length) return;   // de invitada manda la sala
    grupo.scale.setScalar(1);
    const t = cajaReal(grupo).getSize(new THREE.Vector3());
    const mayor = Math.max(t.x, t.z);
    if (!(mayor > 0.001)) return;
    grupo.scale.setScalar(LADO / mayor);

    if (encuadrado) return;
    const c = cajaReal(grupo).getCenter(new THREE.Vector3());
    controles.target.copy(c);
    // Se mira desde arriba y de frente. Los tableros son planos: desde el borde
    // no se ve un tablero, se ve su canto.
    const d = LADO * 1.15;
    camara.position.set(c.x, c.y + d * Math.sin(INCLINACION), c.z + d * Math.cos(INCLINACION));
    camara.lookAt(c);
    controles.update();
    encuadrado = true;
}

/**
 * ⚠️ Y SI HAY `?sala=`, LA PARTIDA NO OCURRE AQUÍ: OCURRE EN EL ÁRBITRO.
 *
 * Esta mesa hablaba SIEMPRE con el hub local, así que con un enlace compartido
 * cada pestaña jugaba su propia partida tan contenta y sin un solo error. Es el
 * mismo fallo que Oscar encontró en el ajedrez —abrió una sala en dos navegadores
 * y salieron dos partidas— sólo que en los doce juegos que dibuja esta mesa.
 *
 * `entrar.html` ofrece «con más gente» a los veinticuatro que admiten compañía y
 * fabrica el enlace igual. Prometer algo y no cumplirlo callando es lo peor que
 * puede hacer una interfaz, y estaba pasando en tres sitios de tres.
 *
 * El cliente es el mismo `sala.js` de las otras mesas. Va por CUARTA vez, y ésa es
 * exactamente la razón de que sea un módulo y no código copiado.
 */
const params = new URLSearchParams(location.search);
let mesaCompartida = null;
if (params.get('sala') && hub.soporta?.(juego)) {
    try {
        const { crearSala, limpiar, nombreParaSala } = await import('./protohub/sala.js');
        const salaLimpia = limpiar(params.get('sala'), 40);
        mesaCompartida = crearSala({
            sala: salaLimpia,
            yo: nombreParaSala(salaLimpia, params.get('yo')),
            juego,
            semilla: Number(params.get('semilla')) || 1,
        });
        await mesaCompartida.entrar();
        console.log(`[Arcade] sala '${salaLimpia}' — '${juego}' con árbitro compartido.`);
    } catch (e) {
        console.warn(`[Arcade] no se pudo entrar en la sala:`, e);
        mesaCompartida = null;
    }
}

// ── Lo que se repinta ───────────────────────────────────────────────────────
async function refrescar() {
    if (mesaCompartida) {
        // En una sala el estado llega del árbitro por la red, así que aquí no hay
        // partida viva que preguntar: el sustrato se DERIVA de lo publicado. Es la
        // misma excepción, por el mismo motivo, que en la mesa de cartas.
        await mesaCompartida.refrescar().catch(() => {});
        const st = mesaCompartida.estado();
        if (st) {
            const { sustratoDe } = await import('./protohub/sustrato.js');
            pintor.pintar(sustratoDe(juego, st));
            const txt = document.getElementById('estado-txt');
            if (txt) {
                txt.innerHTML = `<span>Turno</span><span class="val">${st.turn ?? '—'}</span>`
                    + `<span>·</span><span class="val">${mesaCompartida.yo}</span>`;
            }
            pintarJugadas(document.getElementById('mesa-jugadas'), {
                acciones: mesaCompartida.acciones(),
                meToca: mesaCompartida.meToca(),
                turnoDe: st.turn,
                terminada: !!st.is_game_over,
                espectador: mesaCompartida.espectador,
                enviar: (m) => mesaCompartida.jugar(m).then(refrescar),
            });
        }
        return;
    }

    const st = hub.state(juego);
    pintor.pintar(hub.sustrato(juego));

    const marcador = st.puntos ?? st.score ?? st.marcador;
    const txt = document.getElementById('estado-txt');
    if (txt) {
        txt.innerHTML =
            `<span>Turno</span><span class="val">${st.turn ?? '—'}</span>`
          + (marcador !== undefined ? ` <span>·</span><span class="val">${marcador}</span>` : '');
    }
    pintarJugadas(document.getElementById('mesa-jugadas'), {
        acciones: st.legal_moves ?? st.legal_actions ?? [],
        terminada: !!st.is_game_over,
        enviar: (m) => { hub.move(juego, { move: m }); refrescar(); },
    });
}
refrescar();

/**
 * Hay juegos cuyo mundo avanza SOLO —rebaño, pradera, peatón—, así que no basta
 * con repintar cuando alguien juega: se comprobó en el laboratorio, que los
 * detecta preguntando si el estado cambia sin tocar nada.
 */
setInterval(refrescar, 1000);

// ── El bucle, sólo si esta mesa es la dueña ─────────────────────────────────
if (!anfitrion) {
    (function tick(t) {
        requestAnimationFrame(tick);
        if (typeof TWEEN !== 'undefined' && !document.hidden) TWEEN.update(t);
        encajar();
        controles.update();
        render.render(escena, camara);
    })();

    addEventListener('resize', () => {
        if (!(innerWidth > 0 && innerHeight > 0)) return;
        camara.aspect = innerWidth / innerHeight;
        camara.updateProjectionMatrix();
        render.setSize(innerWidth, innerHeight);
        // Al cambiar la forma de la pantalla el encuadre anterior ya no vale.
        encuadrado = false;
    });
}

// Para poder mirarla desde fuera, igual que la mesa de cartas.
window.ALISA_MESA = { escena, camara, grupo, pintor, refrescar };
