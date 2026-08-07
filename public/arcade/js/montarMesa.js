/**
 * montarMesa.js — UNA página de juego = UNA línea de configuración
 * ═══════════════════════════════════════════════════════════════════════════
 *     <script type="module">
 *       import { montarMesa } from './js/montarMesa.js';
 *       montarMesa({ juego: 'go', visualizador: 'go_visualizer.js' });
 *     </script>
 *
 * Y ya está. Ni CSS, ni lista de scripts, ni HUD, ni orden de carga.
 *
 * ⚠️ QUÉ HABÍA ANTES, QUE ES LO QUE JUSTIFICA ESTO
 * Cada página de tablero eran ~50 líneas de las que **5 eran el juego** y 35 un
 * CSS idéntico copiado seis veces. Las seis repetían además, a mano y en orden,
 * tres scripts de vendor + `Entrada.js` + `SovereignBoardEngine.js` + su
 * visualizador. Seis copias del mismo andamio.
 *
 * Eso no es sólo feo: es la forma en que las cosas se separan sin avisar. Ya
 * pasó — `checkers.html` se quedó sin el panel de agente que tenían las otras
 * cinco, y nadie lo notó hasta que un asiento no jugaba.
 *
 * ⚠️ POR QUÉ INYECTA SCRIPTS CLÁSICOS EN VEZ DE IMPORTARLOS
 * `three.min.js`, `Entrada.js`, `SovereignBoardEngine.js` y los visualizadores
 * NO son módulos: declaran globales y se leen entre ellos por `window`. Se
 * cargan en el mismo orden de siempre, uno detrás de otro. Convertirlos a
 * módulos es otra tarea, y mezclarla con ésta habría hecho imposible saber cuál
 * de los dos cambios rompió qué.
 *
 * ⚠️ Y POR QUÉ LAS REGLAS SE REGISTRAN ANTES QUE NADA
 * El visualizador espera encontrar `window.ALISA_PROTOHUB`. Si se cargara antes,
 * vería un tablero vacío — que es exactamente el fallo que tuvo esta página
 * cuando dependía del hub de la colonia para tener reglas.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { ProtoHub } from './protohub/ProtoHub.js';
import { JUEGOS, TITULOS, cargarReglas } from './protohub/rules/index.js';

/** Lo que toda página de tablero necesitaba y repetía. En orden. */
const ANDAMIO = [
    '/vendor/three-r128/three.min.js',
    '/vendor/three-r128/OrbitControls.js',
    '/vendor/tween/tween.umd.js',
    'js/Entrada.js',
    'js/SovereignBoardEngine.js',
];

const cargar = (src) => new Promise((listo, falla) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = listo;
    // Un script que no carga tiene que decirlo aquí y no veinte líneas después
    // como un `X is not defined` que no señala a nada.
    s.onerror = () => falla(new Error(`no se pudo cargar ${src}`));
    document.head.appendChild(s);
});

const hoja = (href) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    document.head.appendChild(l);
};

/**
 * @param {object} cfg
 *   juego         clave de `rules/index.js` — LA ÚNICA obligatoria
 *   visualizador  fichero en `js/` que dibuja el tablero; sin él, sólo el HUD
 *   titulo        opcional; por defecto, el del catálogo
 *   idJuego       opcional: el nombre con el que el visualizador busca la
 *                 partida, si no coincide con la clave de las reglas
 *                 (`checkers` dibuja `damas`, y eso viene de antiguo)
 */
export async function montarMesa(cfg) {
    const { juego, visualizador, titulo, idJuego = juego } = cfg;
    if (!JUEGOS.includes(juego)) {
        throw new Error(`'${juego}' no está en rules/index.js — y esa es la única lista`);
    }

    document.title = `ALISA Arcade — ${titulo ?? TITULOS[juego] ?? juego}`;
    hoja('css/arcade.css');
    hoja('css/mesa3d.css');
    hoja('/vendor/fonts/fuentes.css');

    // El lienzo y el HUD, que también estaban copiados en las seis páginas.
    if (!document.getElementById('canvas-container')) {
        const c = document.createElement('div');
        c.id = 'canvas-container';
        document.body.appendChild(c);
    }
    if (!document.getElementById('hud-container')) {
        const h = document.createElement('div');
        h.id = 'hud-container';
        document.body.appendChild(h);
    }

    // Primero las reglas: el visualizador las espera en `window`.
    const reglas = await cargarReglas(juego, {});
    window.ALISA_PROTOHUB = new ProtoHub().registrar(idJuego, reglas);

    for (const s of ANDAMIO) await cargar(s);
    if (visualizador) await cargar(`js/${visualizador}`);
    return window.ALISA_PROTOHUB;
}
