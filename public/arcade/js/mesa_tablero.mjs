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
import { volcarMesa, volcando, ponerBoton } from './protohub/render/volcar.js';

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
// Igual que la mesa de cartas publica su motor en `window.ALISA_MESA`: sin esto no
// hay forma de comprobar desde fuera qué está dibujado ni dónde, y las pruebas
// acaban adivinando globales. Adivinar globales ya me costó una medición falsa hoy.
window.ALISA_PINTOR = pintor;
// Y la cámara, que es lo que hace falta para saber DÓNDE cae en pantalla una
// casilla. Sin ella una prueba sólo puede tocar a ciegas — y tocar a ciegas ya me
// ha dado hoy tres veredictos falsos seguidos.
window.ALISA_CAMARA = camara;

// ── El HUD ──────────────────────────────────────────────────────────────────
const caja = document.getElementById('hud-container');
if (caja && !caja.querySelector('#mesa-jugadas')) {
    caja.innerHTML =
        `<div class="overlay"><div class="hud-panel"><div class="hud-header">`
      + `<h1>${window.ALISA_TITULO ?? juego}</h1></div>`
      + `<div id="hud-content"><div id="estado-txt" class="status-row"></div></div>`
      // ⚠️ La caja de jugadas va FUERA de `#hud-content`, hermana suya. Plegar el
      // panel deja `#hud-content` con `max-height: 0` y `overflow: hidden`, y en
      // pantalla estrecha el panel arranca plegado: con los botones dentro, la mesa
      // se ve entera y no hay forma de jugar. Lo encontró un betatester en un móvil
      // de 276 px, y el mismo fallo estaba en la mesa de cartas.
      + `<div id="mesa-jugadas" class="mesa-jugadas"></div></div></div>`;
}

/**
 * La rabieta, en la cabecera y no entre las jugadas: ahí dentro parecería una acción
 * del juego y no lo es. Aquí se vuelca el TABLERO ENTERO como un solo cuerpo —es lo
 * que quiere decir «volcar la mesa», y además `pintor.raiz` es un `Group` sin
 * geometría, así que no hay piezas sueltas que medir.
 */
ponerBoton(document.querySelector('.hud-header'), async () => {
    await volcarMesa([pintor.raiz], { comoTablero: true, suelo: -8 });
    await refrescar();
});

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
    const caja = cajaReal(grupo);
    const c = caja.getCenter(new THREE.Vector3());
    controles.target.copy(c);

    /**
     * ⚠️ LA CÁMARA SE APARTA HASTA QUE EL TABLERO CABE. NO A UNA DISTANCIA FIJA.
     *
     * Esto era `d = LADO * 1.15` y ya está: un número que salió de mirar UN tablero
     * en UNA ventana. El resultado, medido abriendo las capturas, es que el tablero
     * se sale por abajo en fagocito, mancala, damas y reversi — cuatro juegos, y los
     * dos últimos porque acabo de traerlos a esta mesa.
     *
     * No se arregla con un número mejor: una ventana apaisada y otra estrecha no
     * admiten la misma distancia, y un sokoban de 5x3 no encuadra como un go de
     * 19x19 aunque los dos se normalicen. Así que no se calcula: se COMPRUEBA.
     *
     * Se proyectan las ocho esquinas de la caja a la pantalla y, si alguna se sale,
     * se aparta la cámara y se vuelve a mirar. Doce intentos y un margen del 8%
     * bastan para cualquiera de los quince. Es la misma idea que llevo usando todo
     * el día en las pruebas —mirar el resultado en vez de fiarme de la cuenta—,
     * sólo que aquí dentro.
     */
    const esquinas = [];
    for (const x of [caja.min.x, caja.max.x])
        for (const y of [caja.min.y, caja.max.y])
            for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));

    const cabe = () => {
        camara.updateMatrixWorld();
        camara.updateProjectionMatrix();
        return esquinas.every((e) => {
            const v = e.clone().project(camara);
            return Math.abs(v.x) < 0.92 && Math.abs(v.y) < 0.92;
        });
    };

    let d = LADO * 1.15;
    for (let i = 0; i < 12; i++) {
        camara.position.set(c.x, c.y + d * Math.sin(INCLINACION), c.z + d * Math.cos(INCLINACION));
        camara.lookAt(c);
        if (cabe()) break;
        d *= 1.12;
    }
    // Y el tope de alejarse sube con la distancia que ha hecho falta: si no, los
    // controles devolverían la cámara adentro en cuanto alguien la tocara.
    if (controles) controles.maxDistance = Math.max(controles.maxDistance, d * 1.6);
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
        // Se publica igual que el pintor y la cámara: sin esto no hay forma de
    // comprobar desde fuera si dos pestañas están en la misma mesa, y la prueba
    // acaba adivinando globales. Van cuatro medidas falsas hoy por eso.
    mesaCompartida = window.ALISA_SALA = crearSala({
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  EL DEDO, EN LA MESA GENÉRICA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esta mesa sirve a quince juegos y NO TENÍA NI UN MANEJADOR DE TOQUE: cero
 * coincidencias buscando `pointerdown`. Se jugaban sólo por el panel, también en
 * escritorio.
 *
 * ⚠️ Y LO PRIMERO FUE MIRAR QUÉ FORMA TIENEN SUS JUGADAS, PORQUE NO SON CASILLAS.
 *
 * Iba a escribir un «toca la casilla y muevo ahí», y midiéndolo resultó que la
 * mayoría de estos juegos no tiene jugadas espaciales:
 *
 *     sokoban, cripta, sigilo, rebaño, pradera, nave, relevo → arriba/abajo/…
 *     cabina → di:arriba          defensa → enviar a         frentes → a, b, c
 *     parchís, oca, generala → tirar        canadiense → sacar:C_K:0
 *     flota → a1, b1, c1          ← el único con coordenadas
 *
 * Así que un «toca la casilla» habría servido a UNO. Lo que sirve a los siete de
 * dirección es lo que hace cualquier juego de móvil: DESLIZAR. Y el toque se queda
 * para los de coordenadas, que es donde significa algo.
 *
 * ⚠️ NADA QUE NO ESTÉ EN `legal_moves` SALE DE AQUÍ.
 *
 * Todo pasa por `enviarSiEsLegal`. Un atajo que pudiera mandar algo ilegal sería un
 * atajo que se cree las reglas, y eso ya nos costó caro. El panel sigue estando y
 * sigue siendo la lista literal que ve un agente: esto es un segundo camino a las
 * mismas jugadas, no otras jugadas.
 */
let legalesAhora = [];

function enviarSiEsLegal(m) {
    if (!m || !legalesAhora.includes(m)) return false;
    hub.move(juego, { move: m });
    refrescar();
    return true;
}


/**
 * ⚠️ TOCAR UNA CASILLA: SÓLO SI LA CASILLA DICE CÓMO SE LLAMA.
 *
 * La rejilla puede publicar `nombres`, un array paralelo a `celdas` con el nombre
 * de la jugada de cada casilla (y `null` donde no se puede jugar). Flota es el
 * primero que lo hace, y salió de un aviso de Oscar: «que el panel no tenga la
 * misma forma que el tablero es un follón».
 *
 * Con eso el toque es exacto y no hay nada que adivinar. Sin eso —los otros
 * catorce— no pasa nada al tocar, que es justo lo correcto: ver más abajo por qué
 * adivinar el nombre de una casilla salía caro.
 */
function celdaDesde(ev, rej) {
    const caja = render.domElement.getBoundingClientRect();
    const raton = new THREE.Vector2(
        ((ev.clientX - caja.left) / caja.width) * 2 - 1,
        -((ev.clientY - caja.top) / caja.height) * 2 + 1,
    );
    const rayo = new THREE.Raycaster();
    rayo.setFromCamera(raton, camara);
    const punto = new THREE.Vector3();
    if (!rayo.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), punto)) return null;
    // El punto está en el mundo y la rejilla vive dentro del grupo, que esta mesa
    // escala para que quepa. Sin este paso la casilla sale bien sólo con escala 1.
    grupo.worldToLocal(punto);
    const c = Math.round(punto.x + (rej.ancho - 1) / 2);
    const f = Math.round(punto.z + (rej.alto - 1) / 2);
    if (c < 0 || f < 0 || c >= rej.ancho || f >= rej.alto) return null;
    return { c, f };
}

/**
 * ⚠️ SE TOCA LA CASILLA, Y VALE PARA CUALQUIER JUEGO QUE PROYECTE SUS ACCIONES.
 *
 * El sustrato dice ahora, por cada jugada legal, qué casillas toca:
 *
 *     "a3b4" → [40, 33]    de una a otra: hacen falta dos toques
 *     "e6"   → [20]        una sola: se juega al primer toque
 *
 * Con eso esta mesa ofrece el ajedrez, las damas, el reversi, el xiangqi y el go
 * sin saber nada de ninguno — y sin adivinar, que es lo que tuve que quitar esta
 * mañana. Antes había un camino especial leyendo `rejilla.nombres`, que flota
 * publicaba a medida; se conserva como respaldo porque su sustrato es propio y no
 * pasa por el derivador.
 */
let seleccion = null;

function alTocar(ev) {
    const sus = hub.sustrato(juego);
    const rej = sus?.rejilla;
    if (!rej) return;
    const p = celdaDesde(ev, rej);
    if (!p) return;
    const celda = p.f * rej.ancho + p.c;

    const acciones = sus.acciones;
    if (acciones) {
        // Un toque basta cuando la jugada es una sola casilla.
        for (const [m, celdas] of Object.entries(acciones)) {
            if (celdas.length === 1 && celdas[0] === celda && enviarSiEsLegal(m)) {
                seleccion = null;
                return;
            }
        }
        // Segundo toque: la jugada que sale de lo marcado y acaba aquí.
        if (seleccion !== null) {
            for (const [m, celdas] of Object.entries(acciones)) {
                if (celdas[0] === seleccion && celdas[celdas.length - 1] === celda) {
                    seleccion = null;
                    if (enviarSiEsLegal(m)) return;
                }
            }
        }
        // Primer toque: se marca si de aquí sale alguna jugada. Si no, se suelta —
        // así tocar en vacío deselecciona en vez de dejar la mesa a medias.
        seleccion = Object.values(acciones).some(c => c[0] === celda) ? celda : null;
        return;
    }

    // Respaldo: rejillas que publican el nombre de cada casilla (flota).
    const n = rej.nombres?.[celda];
    if (n) enviarSiEsLegal(String(n));
}

/**
 * ⚠️ Y NO SE ADIVINA. LO ESCRIBÍ ASÍ Y LO QUITÉ.
 *
 * De estos quince juegos sólo `flota` tiene jugadas que son casillas (`a1`, `b1`).
 * La idea era: tocas la casilla, se mira cómo se llamaría, y si ese nombre está en
 * `legal_moves` se manda. Comprobar contra la lista parecía suficiente garantía.
 *
 * No lo es. Medido en flota, rejilla de 17x8 con 64 jugadas legales:
 *
 *   - LAS DOS FORMAS DE NUMERAR LAS FILAS SON LEGALES A LA VEZ. La casilla (0,0)
 *     se llama `a1` contando desde arriba y `a8` contando desde abajo, y las dos
 *     están en la lista. Tocar la esquina mandaría una jugada legal... que puede
 *     no ser la que la persona señaló. Eso es peor que no responder al toque: es
 *     jugar por ella y que parezca que funciona.
 *   - Y esos 17 de ancho son DOS tableros con un pasillo en medio. Se dispara al
 *     del rival, que cae en las columnas 9 a 16 y por tanto en las letras `j`–`q`.
 *     Ninguna es legal.
 *
 * O sea que hace falta saber de flota: qué mitad es la enemiga y hacia dónde cuenta
 * las filas. Eso es conocimiento del juego, y va en el juego, no en una mesa que
 * sirve a quince. Cuando `flota` quiera dedo, que publique sus casillas.
 *
 * Se queda el deslizamiento, que no es ambiguo: una dirección es una dirección.
 */

/**
 * El deslizamiento vive en `protohub/gestos.js`, no aquí: hacía falta igual en los
 * visualizadores propios de snake, fagocito y peatón, y cuatro copias de la misma
 * cuenta es como se consigue que tres se arreglen y una no.
 */
window.ALISA_GESTOS.deslizarParaMoverse({
    lienzo: render.domElement,
    camara,
    legales: () => legalesAhora,
    enviar: enviarSiEsLegal,
    tocar: alTocar,
});

// ── Lo que se repinta ───────────────────────────────────────────────────────
async function refrescar() {
    // Con la mesa por el aire no se repinta: pintar coloca cada pieza en su celda,
    // así que a mitad del vuelo se recompondría de golpe. La bandera vive en
    // `volcar.js` y no aquí, para que no haya dos que digan cosas distintas.
    if (volcando()) return;
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
    legalesAhora = st.legal_moves ?? st.legal_actions ?? [];
    pintarJugadas(document.getElementById('mesa-jugadas'), {
        acciones: legalesAhora,
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