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
import { crearMarcas, VERDE, MORADO, RECHAZO, ACIERTO } from './protohub/marcas.js';
import { pintarHistorial } from './protohub/historial.js';
import { celdasDeJugada } from './protohub/sustrato.js';
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

/**
 * ⚠️ CON MUROS HAY QUE MIRAR DESDE MÁS ARRIBA, Y NO ES CUESTIÓN DE GUSTO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es geometría: un muro de altura `h` tapa la celda que tiene detrás —a una unidad—
 * salvo que la cámara mire desde un ángulo mayor que `atan(h / 1)`. Los muros miden
 * 1.0 (`ALTO.muro` en el pintor), así que el mínimo son **45°**… y la inclinación de
 * arriba es 42°.
 *
 * Tres grados por debajo del límite, y el resultado se ve en la captura de sokoban:
 * el cono amarillo del jugador medio escondido detrás de la primera fila de bloques.
 * No es «se ve regular»: es que la fila de delante esconde la de detrás, siempre, en
 * los doce juegos con muros —fagocito (226 muros), nave (139), cabina (68), pradera
 * (64), rebaño (60), cripta, sigilo, relevo, defensa, flota, frentes, sokoban—.
 *
 * 55° deja margen sobre los 45 sin llegar a la vista cenital, que aplanaría el
 * tablero y quitaría la profundidad a los que no tienen muros. Por eso se elige
 * según lo que HAY en la mesa y no se sube para todos: damas, oca o el parchís se
 * ven mejor a 42°, y ahí ninguna pieza tapa a otra porque son planas.
 */
const INCLINACION_CON_MUROS = 55 * Math.PI / 180;

/**
 * ⚠️ Y LA MISMA INCLINACIÓN SIRVE PARA UN SEGUNDO MOTIVO: EL ESCORZO.
 *
 * En un tablero grande, mirar de lado comprime el fondo. Medido en el go (19×19)
 * proyectando la primera y la última fila y comparando su alto en pantalla:
 *
 *     42°  →  delante 43 px · detrás 15 px  ·  el fondo mide el 35 %
 *     55°  →  delante 45 px · detrás 20 px  ·  45 %
 *     62°  →  delante 45 px · detrás 23 px  ·  52 %
 *     70°  →  delante 43 px · detrás 27 px  ·  62 %, pero ya casi cenital
 *
 * Con 42° una piedra de la fila de atrás cabe en quince píxeles, y el goban se
 * pierde en el horizonte — que es exactamente lo que se ve en la captura.
 *
 * Se reutiliza la constante de los muros en vez de inventar un tercer número: son
 * dos motivos distintos para la misma respuesta —mirar más desde arriba—, y un
 * número nuevo por cada motivo es como se acaba con cinco constantes que nadie sabe
 * de dónde salieron.
 *
 * El umbral son 13 filas porque por debajo el escorzo no llega a molestar: damas y
 * ajedrez (8) están en el 55 % a 42°, y aplanarlos les quitaría profundidad sin
 * ganar nada.
 */
const FILAS_QUE_ESCORZAN = 13;

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
      + `<div id="hud-content"><div id="estado-txt" class="status-row"></div>`
      // El registro va DENTRO del plegado, al contrario que los botones: es para
      // entender lo que ha pasado, no para jugar. Quien pliega el panel quiere ver
      // la mesa, y lo único que no puede perder son las jugadas.
      + `<div id="mesa-historial" class="historial"></div></div>`
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

/**
 * ⚠️ EN LOS JUEGOS CON NIEBLA SE ENCUADRA LO QUE SABES, NO EL TABLERO ENTERO.
 *
 * En cripta lo sin explorar es casi todo, así que encajar el tablero completo deja
 * la partida en una esquina de tres centímetros mientras el 90% de la pantalla es
 * lo que NO has visto. Relevo y sigilo, igual. Es la misma queja que las cartas de
 * esta noche con otra ropa: la cámara reparte sitio por igual entre lo que hay que
 * leer y lo que sólo hay que saber que existe.
 *
 * La niebla se dibuja en su propio montón instanciado, así que basta con dejarlo
 * fuera de la medida. Y como el encuadre CRECE conforme exploras, la vista se abre
 * sola: al principio ves tu esquina y al final el mapa entero.
 *
 * ⚠️ CON UN SUELO, PORQUE AL EMPEZAR SÓLO SE CONOCE UNA CASILLA.
 *
 * Sin él, la primera partida se abriría con una casilla ocupando la pantalla. Se
 * limita a que lo conocido no pueda salir más de tres veces más grande de lo que
 * saldría el tablero completo.
 *
 * ⚠️ Y SÓLO SE APLICA SI HAY NIEBLA. Los treinta y pico juegos sin ella pasan por
 * la misma rama de siempre, con la misma medida de siempre. Un cambio en el
 * encuadre puede romper quince mesas a la vez, así que no se toca a quien no lo pide.
 */
const SIN_NIEBLA = new Set(['niebla']);

let encuadrado = false;
function encajar() {
    if (anfitrion || !grupo.children.length) return;   // de invitada manda la sala
    grupo.scale.setScalar(1);

    const todo = cajaReal(grupo).getSize(new THREE.Vector3());
    const mayorTodo = Math.max(todo.x, todo.z);
    if (!(mayorTodo > 0.001)) return;

    let mayor = mayorTodo;
    // ⚠️ `traverse` y no `children`: el pintor cuelga su raíz DENTRO de `grupo`, así
    // que la niebla es nieta y no hija. Con `children.some(...)` la condición era
    // falsa siempre y todo este bloque no hacía nada — la tercera vez esta noche que
    // doy por sabida una estructura en vez de preguntarla.
    let conNiebla = false;
    // Y de paso se pregunta si hay MUROS, con el mismo recorrido y por el mismo
    // motivo: el pintor los publica con `name = 'muro'`, así que no hay que
    // adivinarlo mirando el sustrato ni fiarse de una lista de juegos.
    let conMuros = false;
    grupo.traverse(o => {
        if (o.name === 'niebla' && o.visible && o.count > 0) conNiebla = true;
        if (o.name === 'muro' && o.visible && o.count > 0) conMuros = true;
    });
    if (conNiebla) {
        const s = cajaReal(grupo, SIN_NIEBLA).getSize(new THREE.Vector3());
        const sabido = Math.max(s.x, s.z);
        // El suelo: nunca más de 3x el tablero entero, o una casilla llenaría la mesa.
        if (sabido > 0.001) mayor = Math.max(sabido, mayorTodo / 3);
    }

    grupo.scale.setScalar(LADO / mayor);

    if (encuadrado) return;
    // El centro y el `target` de los controles los pone ya `encajarCamara`.

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
    /**
     * ⚠️ ESTO VIVÍA AQUÍ Y AHORA VIVE EN `js/encuadre.js`.
     *
     * No es limpieza: es que un betatester avisó de que en fagocito «no se ve el
     * tablero completo», y fagocito no pasa por esta mesa. Los visualizadores
     * propios siguen con su `camera.position.set(0, 20, 15)` escrito a mano en una
     * ventana concreta, que acierta en esa ventana y en ninguna otra —la suya era
     * de 1366x633—. Lo que esta mesa aprendió no le servía a nadie más porque
     * estaba encerrado aquí dentro.
     *
     * `encuadre.js` es un script clásico y global, como `gestos.js`, justo para
     * que lo puedan usar los que no pueden importar.
     */
    ALISA_ENCUADRE.encajarCamara({
        camara, objeto: grupo, controles,
        // Se mira desde 55° en vez de 42° por dos motivos que piden lo mismo: con
        // muros, porque por debajo de 45 la fila de delante esconde la de detrás; y
        // con tableros grandes, porque el escorzo deja el fondo en el 35 % del
        // tamaño. Las dos son aritmética, no gusto.
        inclinacion: (conMuros || filasDelTablero >= FILAS_QUE_ESCORZAN)
            ? INCLINACION_CON_MUROS : INCLINACION,
        distancia: LADO * 1.15,
        // La niebla tampoco cuenta aquí: si la cámara se aparta hasta que quepa lo
        // desconocido, escalar sólo lo conocido no sirve de nada — se ganaría por
        // un lado y se perdería por el otro.
        saltar: conNiebla ? SIN_NIEBLA : null,

        /**
         * ⚠️ CUÁNTO SE COME EL PANEL, PREGUNTADO Y NO SUPUESTO.
         *
         * Se mide el rectángulo del panel de verdad, ahora, en esta pantalla. Un
         * número escrito a mano —«en móvil quita 200 px»— se queda viejo el día que
         * el panel cambie de contenido, y anoche cambió tres veces.
         *
         * Sólo cuenta si el panel llega hasta ARRIBA: en escritorio es una columna
         * lateral que empieza arriba pero deja libre todo el centro y la derecha, y
         * ahí no hay nada que esquivar. En móvil ocupa el ancho entero y sí.
         *
         * El umbral de 0,6 de ancho es lo que distingue «columna» de «franja». Y si
         * sale 0 —veintinueve de treinta casos medidos— esto no toca nada.
         */
        arribaLibre: (() => {
            const r = document.querySelector('.hud-panel')?.getBoundingClientRect();
            if (!r || r.height < 1) return 0;
            const anchoPantalla = window.innerWidth || 1;
            const altoPantalla = window.innerHeight || 1;
            if (r.width / anchoPantalla < 0.6) return 0;   // columna lateral: no estorba
            return Math.max(0, Math.min(0.5, r.bottom / altoPantalla));
        })(),
    });
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

/**
 * Si esta mesa está enseñando una partida repetirse en vez de dejar jugar. Se
 * declara AQUÍ y no junto al repetidor, abajo, porque `refrescar()` se llama antes
 * de montarlo y con `let` eso es un ReferenceError, no un `undefined` — la mesa se
 * quedaba en negro sin más pista que una línea en la consola.
 */
let repitiendo = false;

/**
 * Cuántas filas tiene el tablero que se está dibujando. Lo apunta `refrescar` al
 * pintar, porque el encuadre corre en el bucle de animación y allí sólo hay
 * geometría — preguntarle al sustrato desde ahí sería derivarlo otra vez.
 */
let filasDelTablero = 0;

function enviarSiEsLegal(m) {
    // Viendo repetirse una partida no se juega: lo que hay en la mesa es de otro
    // momento y meterle una jugada encima rompería justo lo que se está enseñando.
    if (repitiendo) return false;
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA JUGADA SE VE ANTES DE HACERLA. ANTES NO SE VEÍA NADA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `seleccion` se guardaba desde hace días y no se dibujaba NUNCA. O sea que en
 * damas, reversi o el ajedrez de esta mesa tocabas una pieza y la pantalla no
 * cambiaba: ni sabías que la habías cogido, ni a dónde podía ir. La jugada existía
 * en la cabeza del código y en ningún sitio más.
 *
 * Salió de mirar cómo lo hacen fuera. La guía de interfaz de Board Game Arena
 * —que la publican y la usan como puerta para pasar un juego a release— lo pone de
 * norma primera: «resalta las opciones válidas para que la acción esperada sea
 * obvia», y muestra las consecuencias antes de comprometerse. En ajedrez.com los
 * puntos de jugada legal vienen ENCENDIDOS por defecto en las cuentas nuevas.
 *
 * ⚠️ Y EL DATO LLEVABA DOS DÍAS PUESTO.
 *
 * `sus.acciones` dice, para cada jugada legal, qué casillas toca — se construyó
 * para poder jugar tocando el tablero. Nadie lo usaba al revés. Esto no añade
 * información nueva: enseña la que ya había.
 *
 * Dos colores y dos significados:
 *   · morado — de aquí sale algo: la pieza que has cogido, o el origen de la
 *     jugada que estás señalando en el panel;
 *   · verde  — aquí puedes ir: los destinos.
 */
const marcas = crearMarcas(grupo, { y: 0.10, ancho: 0.92, largo: 0.92 });

/** El centro de una casilla, en coordenadas del grupo (una unidad por casilla). */
const centroDe = (celda, rej) => ({
    x: (celda % rej.ancho) - (rej.ancho - 1) / 2,
    z: Math.floor(celda / rej.ancho) - (rej.alto - 1) / 2,
});

/** Marca una jugada concreta: su origen y su destino. */
function marcarJugada(m) {
    const sus = hub.sustrato(juego);
    const rej = sus?.rejilla, celdas = sus?.acciones?.[m];
    marcas.limpiar();
    if (!rej || !celdas?.length) return;
    celdas.forEach((celda, i) => {
        const { x, z } = centroDe(celda, rej);
        // Con una sola casilla la jugada ES el destino (poner una ficha, disparar);
        // con dos, la primera es de dónde sale.
        const soloUna = celdas.length === 1;
        marcas.poner(x, z, { color: (i === 0 && !soloUna) ? MORADO : VERDE, opacidad: 0.5 });
    });
}

/** Marca lo cogido y TODO lo que se puede hacer desde ahí. */
function marcarSeleccion() {
    const sus = hub.sustrato(juego);
    const rej = sus?.rejilla, acciones = sus?.acciones;
    marcas.limpiar();
    if (seleccion === null || !rej || !acciones) return;
    const o = centroDe(seleccion, rej);
    marcas.poner(o.x, o.z, { color: MORADO, opacidad: 0.55 });
    for (const celdas of Object.values(acciones)) {
        if (celdas.length < 2 || celdas[0] !== seleccion) continue;
        const d = centroDe(celdas[celdas.length - 1], rej);
        marcas.poner(d.x, d.z, { color: VERDE, opacidad: 0.45 });
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ «AHÍ NO». LA MESA TIENE QUE CONTESTAR ALGO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hasta ahora, tocar una casilla a la que no se puede ir no hacía NADA:
 * `enviarSiEsLegal` devolvía `false` en silencio y la pantalla se quedaba igual.
 * Desde fuera eso no se distingue de que la mesa se haya colgado, y lo primero que
 * hace quien juega es volver a tocar más fuerte.
 *
 * La guía de Board Game Arena lo pone en su capítulo de retroalimentación:
 * «sacudida corta, atenuado o tooltip» inmediato ante un intento inválido.
 *
 * ⚠️ Y SÓLO CUANDO DE VERDAD HA SIDO UN INTENTO.
 *
 * Tocar en vacío para soltar la pieza es legítimo y no merece un rojo. La
 * diferencia está en si HABÍA algo cogido: con una pieza en la mano, tocar una
 * casilla es intentar ir ahí. Sin ella, es mirar.
 *
 * Distinguirlo importa más de lo que parece: un aviso que salta también cuando no
 * has hecho nada mal enseña a ignorarlo, y entonces deja de avisar.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ QUÉ ACABA DE PASAR. LAS PIEZAS SALTABAN SIN DECIR NADA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Esta mesa no anima: repinta el sustrato entero en cada vuelta, así que cuando
 * mueve la casa las fichas aparecen en su sitio nuevo de golpe. Si estabas mirando
 * el panel —que es lo normal, ahí están las jugadas— el tablero cambia y no sabes
 * QUÉ ha cambiado. La guía de Board Game Arena pide animación corta y un log de
 * toda acción mayor, y el log ya está: falta enseñarlo en el tablero.
 *
 * ⚠️ Y NO ES UNA ANIMACIÓN, ES UN SUBRAYADO. A PROPÓSITO.
 *
 * Interpolar de verdad obligaría a que el pintor recordara de dónde venía cada
 * pieza entre dos estados, y este pintor está hecho justo al revés: recibe una
 * matriz plana y la dibuja sin memoria. Ésa es la tesis del motor y no se toca por
 * un efecto.
 *
 * Marcar las casillas de la última jugada cuenta lo mismo —de dónde a dónde— con
 * la maquinaria que ya hay, y encima funciona igual en jugadas que no son
 * movimientos: poner una piedra, disparar a una casilla, sembrar un hoyo.
 */
let ultimaVista = 0;
let subrayado = null;
function subrayarUltima(rec, rej) {
    const n = rec?.jugadas?.length ?? 0;
    if (n === ultimaVista) return;          // nada nuevo que contar
    const primera = ultimaVista === 0 && n > 0 && subrayado === null;
    ultimaVista = n;
    if (!n || !rej) return;
    // Al abrir una partida ya empezada no se subraya: no ha «acabado de pasar»
    // nada, y un destello al cargar es ruido que enseña a ignorar los destellos.
    if (primera && n > 1) return;

    /**
     * ⚠️ LAS CASILLAS SALEN DEL NOMBRE, NO DE `acciones`.
     *
     * Lo escribí primero buscando la jugada en `sus.acciones`, y no puede funcionar:
     * ese mapa son las jugadas LEGALES AHORA, y la que acaba de hacerse ya no lo
     * es. Habría sido un subrayado que no aparece nunca — de los que se dan por
     * «no se ve» y se acaban borrando sin entender por qué.
     *
     * `celdasDeJugada` traduce `a3b4` a casillas con la misma regla que usa el
     * sustrato, y vale igual para una jugada pasada.
     */
    const celdas = celdasDeJugada(rec.jugadas[n - 1], rej);
    if (!celdas?.length) return;
    clearTimeout(subrayado);
    for (const celda of celdas) {
        const { x, z } = centroDe(celda, rej);
        marcas.poner(x, z, { color: ACIERTO, opacidad: 0.4, altura: 0.11 });
    }
    // 700 ms: más que el acuse de «ahí no» porque esto no responde a un gesto tuyo
    // — hay que darle tiempo a alguien que estaba mirando a otro sitio.
    subrayado = setTimeout(() => marcarSeleccion(), 700);
}

let rechazo = null;
function avisarIlegal(celda, rej) {
    if (celda === null || !rej) return;
    clearTimeout(rechazo);
    const { x, z } = centroDe(celda, rej);
    // Encima de lo que ya hubiera: la marca del rechazo no borra lo que tenías
    // cogido, porque después del «ahí no» sigues teniendo la pieza en la mano.
    const m = marcas.poner(x, z, { color: RECHAZO, opacidad: 0.55, altura: 0.12 });
    rechazo = setTimeout(() => {
        // 320 ms: lo justo para verlo sin que se quede señalando el error. Es una
        // respuesta, no una regañina.
        m.visible = false;
        marcarSeleccion();
    }, 320);
}

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
                marcas.limpiar();
                return;
            }
        }
        // Segundo toque: la jugada que sale de lo marcado y acaba aquí.
        if (seleccion !== null) {
            for (const [m, celdas] of Object.entries(acciones)) {
                if (celdas[0] === seleccion && celdas[celdas.length - 1] === celda) {
                    seleccion = null;
                    marcas.limpiar();
                    if (enviarSiEsLegal(m)) return;
                }
            }
        }
        // Primer toque: se marca si de aquí sale alguna jugada. Si no, se suelta —
        // así tocar en vacío deselecciona en vez de dejar la mesa a medias.
        const teniaAlgo = seleccion !== null;
        seleccion = Object.values(acciones).some(c => c[0] === celda) ? celda : null;
        marcarSeleccion();
        // Si venías con una pieza cogida y esto no era ni destino ni otra pieza,
        // era un intento. Y un intento merece respuesta.
        if (teniaAlgo && seleccion === null) avisarIlegal(celda, rej);
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
            const sus = sustratoDe(juego, st);
            pintor.pintar(sus);
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
                rejilla: sus?.rejilla ?? null,
                estado: st,
                // En una sala el recibo lo lleva el árbitro, no esta pestaña: la
                // pantalla de fin ofrece lo que se puede ofrecer y calla el resto.
                enSala: true,
                enviar: (m) => mesaCompartida.jugar(m).then(refrescar),
            });
        }
        return;
    }

    const st = hub.state(juego);
    const susLocal = hub.sustrato(juego);
    pintor.pintar(susLocal);
    // Para el encuadre: un tablero grande necesita más inclinación o el fondo se
    // comprime. Se apunta aquí, que es donde se conoce el sustrato.
    filasDelTablero = susLocal?.rejilla?.alto ?? 0;

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
        // Repitiendo se mira, no se juega — y se dice por qué, en vez de dejar
        // botones puestos que no harían nada.
        espectador: repitiendo ? 'estás viendo una partida volver a jugarse' : false,
        terminada: !!st.is_game_over,
        // Para la pantalla de fin de partida: el resultado sale del estado y los dos
        // botones que importan —copiar el enlace y aportar— salen del recibo.
        estado: st,
        recibo: hub.partida(juego),
        rejilla: susLocal?.rejilla ?? null,
        // Señalar un botón enseña dónde cae; soltarlo devuelve lo que tenías cogido.
        alSeñalar: (m) => (m === null ? marcarSeleccion() : marcarJugada(m)),
        enviar: (m) => { hub.move(juego, { move: m }); refrescar(); },
    });

    // Lo que ha pasado, y que se puede volver a jugar. La semilla a la vista no es
    // un adorno técnico: es la respuesta a «esto está amañado», que es la queja más
    // repetida de los sitios de cartas y la única que no se contesta con palabras.
    const rec = hub.partida(juego) ?? {};

    // Y se subraya en el tablero lo que acaba de pasar, que es lo mismo que cuenta
    // el registro pero donde está mirando quien juega.
    subrayarUltima(rec, susLocal?.rejilla);

    pintarHistorial(document.getElementById('mesa-historial'), {
        juego, semilla: rec.semilla, jugadas: rec.jugadas, autores: rec.autores,
        /**
         * ⚠️ `yo` VA VACÍO EN LA MESA LOCAL, Y ES A PROPÓSITO.
         *
         * Lo puse primero como `st.turn` y quedaba bonito —las jugadas propias en
         * verde— hasta que se mira lo que significa: `turn` es DE QUIÉN ES EL TURNO
         * AHORA, no quién soy yo. Así que el color se daba la vuelta en cada jugada
         * y el mismo movimiento aparecía tuyo o ajeno según cuándo miraras.
         *
         * Y en la mesa local no hay un «yo» que valga: aquí se juegan los dos lados
         * salvo que la casa lleve uno, y eso lo decide un desplegable del motor que
         * esta mesa no ve. En una sala compartida sí lo hay —tu asiento— y allí se
         * pasa de verdad.
         *
         * Antes que enseñar una distinción que cambia de sentido cada turno, ninguna.
         */
        yo: null,
    });
}
refrescar();

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL REPETIDOR: LA TESIS DEL PROYECTO, PUESTA DONDE SE VE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     /arcade/checkers.html?semilla=7&repetir=a3b4,b6a5,b4c5
 *
 * Todo esto se sostiene sobre una frase: «cualquiera puede verificar una partida
 * volviéndola a jugar». Estaba en el README, en la API y en el verificador — y
 * vivía entera dentro de un recibo de texto. Se podía COMPROBAR y no se podía VER.
 *
 * ⚠️ Y NO TOCA NI EL PINTOR NI LAS REGLAS. NI UNA LÍNEA.
 *
 * El repetidor sólo llama a `hub.reset` y `hub.move` — exactamente lo que hace
 * jugar. La mesa repinta lo que el hub diga, como siempre, porque el render es un
 * espectador y no un nervio. Consecuencia: sale gratis en los quince juegos de esta
 * mesa y en los que vengan, sin escribir nada por juego.
 *
 * ⚠️ Y POR ESO EL HISTORIAL Y EL SUBRAYADO FUNCIONAN SOLOS.
 *
 * Como las jugadas se aplican de verdad, el hub las graba, `hub.partida()` las
 * devuelve, y el registro y el subrayado de la última jugada aparecen sin una línea
 * más. No estaba planeado: es lo que pasa cuando repetir es jugar otra vez y no
 * reproducir un vídeo.
 */
if (!mesaCompartida) {
    const { reciboDeLaURL, crearRepetidor } = await import('./protohub/repetidor.js');
    const recibo = reciboDeLaURL();
    if (recibo?.jugadas?.length) {
        if (recibo.semilla === null) {
            // Sin semilla el reparto sería otro y las jugadas caerían sobre un
            // tablero distinto: se dice, no se finge. Un repetidor que enseña algo
            // que no es la partida es peor que no tener repetidor.
            console.warn('[Arcade] hay `repetir=` sin `semilla=`: no se puede repetir.');
        } else {
            repitiendo = true;
            const { ponerMandoRepetir } = await import('./protohub/mando_repetir.js');
            const repetidor = crearRepetidor({
                hub, juego,
                jugadas: recibo.jugadas,
                semilla: recibo.semilla,
                alCambiar: refrescar,
            });
            window.ALISA_REPETIDOR = repetidor;
            // El mando va FUERA de `#hud-content`, hermano de las jugadas y por el
            // mismo motivo: plegado, `#hud-content` queda con `max-height: 0`, y
            // quien pliega el panel para ver bien la mesa es exactamente quien está
            // mirando una partida repetirse.
            const panel = document.querySelector('.hud-panel');
            const antes = panel?.querySelector(':scope > #mesa-jugadas');
            const hueco = document.createElement('div');
            if (antes) panel.insertBefore(hueco, antes); else panel?.appendChild(hueco);
            ponerMandoRepetir(hueco, repetidor, { juego, semilla: recibo.semilla });
            repetidor.alInicio();
        }
    }
}

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