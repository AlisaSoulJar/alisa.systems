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

/**
 * ⚠️ LA VERSIÓN QUE VIAJA EN LA URL. NO ES COSMÉTICA: IMPIDE MEZCLAR.
 *
 * Un despliegue llegó a medias y costó una tarde: el navegador tenía el
 * `mesa_cartas.mjs` nuevo y el `montarMesa.js` viejo, una combinación que NUNCA
 * existió en el repositorio. Se arregló en el panel de Cloudflare, pero eso deja
 * la salud del sitio dependiendo de un desplegable que ya estuvo mal una vez.
 *
 * Con la versión pegada a la URL el problema no puede darse: si cambia el código,
 * cambia la dirección, y una copia guardada de la anterior sencillamente no se
 * pide. Y lo importante es que el número vive AQUÍ, dentro del propio fichero que
 * carga a los demás — así que un `montarMesa.js` viejo pide sus compañeros viejos.
 * Viejo y coherente es un estado que existió y se probó; mezclado, no.
 *
 * `prueba_version.mjs` comprueba que corresponde a lo que hay en disco y, si no,
 * dice el valor que toca. No hay que acordarse: hay que hacer caso a la prueba.
 */
const VERSION = 'c12540cc';

/**
 * Lo que toda página de tablero necesitaba y repetía. En orden.
 *
 * ⚠️ SE EXPORTA PORQUE HABÍA UNA SEGUNDA LISTA, MÁS CORTA, Y NADIE LO SABÍA.
 *
 * `sala.html` —la sala de bolsillo, a la que te lleva sentarte en una mesa de la
 * Sala del Huevo— montaba `mesa_tablero.mjs` cargando sólo los tres de vendor. Le
 * faltaban `gestos.js`, `objetivo_visible.js`, `encuadre.js` y `mandos.js`.
 *
 * El resultado, medido: las SEIS mesas de tablero de la Sala del Huevo —ajedrez, go,
 * reversi, damas, xiangqi y mancala— daban pantalla negra con
 * `Cannot read properties of undefined (reading 'deslizarParaMoverse')`. Las once de
 * cartas funcionaban, porque `SovereignCardEngine` mira si existe antes de usarlo y
 * `mesa_tablero.mjs` no.
 *
 * O sea: la mitad de la idea entera —te sientas en una mesa y entras al juego— llevaba
 * rota quién sabe cuánto en su mitad de tablero, sin que ninguna prueba lo mirara.
 * Es la octava lista de este proyecto que se separa de la realidad sin avisar, y la
 * cura es siempre la misma: que haya una sola.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ THREE 0.170 PARA TODO EL ARCADE, Y SIN TOCAR LOS 27 SCRIPTS CLÁSICOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El arcade corría en r128 y los laboratorios en 0.160/0.170. Esa frontera dejaba al
 * arcade sin lo que de verdad cambia el aspecto: SSAO, bloom, cielo de Rayleigh y
 * sombras en cascada viven en `vendor` SÓLO para las versiones modernas. O sea que
 * `croupier_cinematic_room.html` —que hace todo eso con dos líneas de plugin— estaba
 * al otro lado de un muro.
 *
 * ⚠️ Y LA MIGRACIÓN ERA MUCHO MÁS BARATA DE LO QUE PARECÍA. MEDIDO:
 *
 *     99 ficheros del arcade · 72 YA eran módulos · 27 clásicos
 *     THREE.Geometry 0 · Face3 0 · sRGBEncoding 0 · outputEncoding 0
 *     physicallyCorrectLights 0 · OrbitControls 4
 *
 * Cero incompatibilidades. Lo único que r128 daba y 0.170 no es `THREE.OrbitControls`
 * como global, y eso son cuatro sitios.
 *
 * ⚠️ ASÍ QUE NO SE MIGRAN 27 FICHEROS: SE MIGRA EL CARGADOR.
 *
 * Los 27 clásicos leen `window.THREE`. Se importa 0.170 como módulo, se deja en
 * `window.THREE` con `OrbitControls` colgado, y los 27 siguen funcionando SIN TOCARLOS.
 * Convertirlos uno a uno habría sido veintisiete oportunidades de romper algo para
 * conseguir exactamente lo mismo.
 *
 * ⚠️ LO QUE SÍ VA A CAMBIAR DE ASPECTO, Y HAY QUE MIRARLO.
 *
 * De r155 en adelante las luces son físicamente correctas por defecto: `intensity` ya
 * no significa lo mismo. Y desde r152 la salida es sRGB, así que los colores salen más
 * vivos. Las dos cosas son CORRECTAS y las dos cambian lo que se ve — por eso esto no
 * se da por bueno hasta abrir las capturas.
 */
const THREE_MODERNO = '/vendor/three-0.170.0/build/three.module.js';
const ORBIT_MODERNO = '/vendor/three-0.170.0/arcade/OrbitControls.js';

export async function montarThree() {
    if (window.THREE && window.THREE.OrbitControls) return window.THREE;
    const mod = await import(THREE_MODERNO);
    const { OrbitControls } = await import(ORBIT_MODERNO);
    /**
     * ⚠️ SE COPIA, NO SE USA EL MÓDULO TAL CUAL. Y esto lo dijo el primer intento:
     * «Cannot assign to property 'OrbitControls' of [object Module]». El objeto de
     * espacio de nombres de un módulo es INMUTABLE, así que colgarle `OrbitControls`
     * revienta — y con r128, que era un script clásico, se podía.
     *
     * La copia lleva las mismas clases (`{...mod}` copia referencias), así que los
     * `instanceof` de los 27 clásicos siguen valiendo. Los clásicos hablan por
     * `window` y se les deja lo mismo que tenían, con otra versión debajo: eso es
     * toda la migración.
     */
    const THREE = { ...mod, OrbitControls };

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ LAS LUCES: EL ÚNICO PRECIO REAL DE LA MIGRACIÓN, Y SE PAGA AQUÍ
     * ═══════════════════════════════════════════════════════════════════════
     *
     * De r155 en adelante `useLegacyLights` desapareció y las luces son físicamente
     * correctas por defecto. La consecuencia: `intensity` NO significa lo mismo, y las
     * intensidades afinadas contra r128 dan bastante menos luz.
     *
     * Se vio en la primera captura tras migrar, y sin ninguna duda: el ajedrez pasó de
     * un tablero azul y blanco con piezas nítidas a un tablero casi negro con piezas
     * fantasma. Ningún error en consola — el modo de fallo de siempre.
     *
     * ⚠️ Y SE ARREGLA EN EL CONSTRUCTOR, NO EN DIECISÉIS FICHEROS.
     *
     * Las luces las crean las dos mesas y los CATORCE visualizadores propios, cada uno
     * con sus números afinados a ojo contra r128. Retocar dieciséis sitios sería
     * dieciséis oportunidades de dejarse uno — y el que se quedara oscuro no daría
     * error, sólo saldría feo, que es justo lo que nadie mira.
     *
     * Así que se envuelven las clases de luz y se escala la intensidad al construir.
     * Son SUBCLASES para que `instanceof` siga valiendo, que es lo que usa medio
     * `encuadre.js` y toda prueba que recorra la escena.
     *
     * El factor es π, que es el que convierte una intensidad del modo antiguo al
     * nuevo. No es una constante de gusto: es la que estaba metida en el renderizador
     * de antes.
     */
    const LUZ_LEGADO = Math.PI;
    for (const nombre of ['AmbientLight', 'HemisphereLight', 'DirectionalLight',
                          'PointLight', 'SpotLight', 'RectAreaLight']) {
        const Base = mod[nombre];
        if (!Base) continue;
        THREE[nombre] = class extends Base {
            constructor(...args) {
                super(...args);
                this.intensity *= LUZ_LEGADO;
            }
        };
    }
    // Se publica para quien quiera cambiar una intensidad DESPUÉS de crearla y
    // necesite saber en qué escala está. Lo usa `atmosfera.js`.
    THREE.LUZ_LEGADO = LUZ_LEGADO;

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ Y EL COLOR: UNA MIGRACIÓN TIENE QUE SER NEUTRA A LA VISTA
     * ═══════════════════════════════════════════════════════════════════════
     *
     * De r152 en adelante three gestiona el color: la salida es sRGB y los colores que
     * se escriben se interpretan como sRGB, se llevan a lineal para iluminar y se
     * devuelven. Es lo correcto y es mejor. También cambia TODOS los contrastes.
     *
     * Medido justo después de migrar, con `npm run legibilidad`: de **55/58 a 30/58**.
     * Quince juegos con piezas que se funden con su suelo — ajedrez, damas, fagocito,
     * sokoban, cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebaño,
     * pradera... Ninguno daba error. Los 38 seguían jugándose. Sólo se veían mal.
     *
     * ⚠️ Y POR ESO ESTO SE QUEDA EN LINEAL, DE MOMENTO.
     *
     * Una migración que cambia el motor Y el aspecto a la vez es una migración que no
     * se puede juzgar: cuando algo se vea raro no habrá forma de saber si es del
     * cambio de versión o del cambio de color. Se separan las dos cosas — motor hoy,
     * gestión de color el día que se retoquen las paletas con el instrumento delante.
     *
     * No es «lo dejamos como estaba»: es una deuda con fecha y con la medida que la
     * cierra. Poner `SRGBColorSpace` aquí y volver a correr `legibilidad` dice
     * exactamente cuánto queda por afinar.
     */
    mod.ColorManagement.enabled = false;
    const RendererBase = mod.WebGLRenderer;
    THREE.WebGLRenderer = class extends RendererBase {
        constructor(...args) {
            super(...args);
            this.outputColorSpace = mod.LinearSRGBColorSpace;
        }
    };

    window.THREE = THREE;
    return THREE;
}

export const ANDAMIO = [
    '/vendor/tween/tween.umd.js',
    'js/Entrada.js',
    // El gesto de deslizar. Va en el andamio porque quien más lo necesita es
    // `SovereignBoardEngine.js`, que es un script clásico y no puede importarlo:
    // tiene que estar cargado ANTES que él.
    'js/protohub/gestos.js',
    // Igual: el recuadro de «a qué se juega» lo pintan los dos motores, que son
    // scripts clásicos, así que tiene que estar antes que ellos.
    'js/objetivo_visible.js',
    // El encuadre. Lo aprendió la mesa genérica y lo necesitan los visualizadores
    // propios, que son clásicos: por eso vive aquí y no dentro de la mesa.
    'js/encuadre.js',
    // Pantalla completa y esconder el panel. Van fuera del panel a propósito: uno
    // de los dos lo hace desaparecer, y un botón que se esconde a sí mismo deja
    // sin salida a quien no tiene teclado.
    'js/mandos.js',
    /**
     * El sonido. `sfx.js` llevaba meses escrito —37 KB, sesenta sonidos, cuatro
     * temas y radio— y lo usaban DOS páginas de ciento once: no estaba roto ni
     * perdido, estaba desenchufado. Va en el andamio porque quien lo usa son los
     * dos motores, que son scripts clásicos y no pueden importarlo.
     *
     * `sfx.js` va con ruta absoluta porque vive en `/js/`, fuera del arcade, y lo
     * comparten también los juegos propios. `sonido_mesa.js` es de aquí y va
     * detrás, que es quien lo enchufa.
     */
    '/js/sfx.js',
    'js/sonido_mesa.js',
];

/**
 * ⚠️ QUÉ MOTOR HACE FALTA LO DICE EL SUSTRATO, NO UNA LISTA.
 *
 * Hay dos: `SovereignBoardEngine` para tableros y `SovereignCardEngine` para
 * cartas. Se podría poner en la configuración de cada página —`motor:'cartas'`—
 * y sería otra lista paralela que se separa el día que alguien añada un juego y
 * se olvide de tocarla. Es literalmente el fallo que este proyecto ha arreglado
 * seis veces.
 *
 * El sustrato ya lo dice: un juego que publica **zonas y ninguna rejilla** es de
 * cartas. No hay que declarar nada porque el dato ya existe, sólo había que
 * mirarlo.
 */
const MOTOR_TABLERO = ['js/SovereignBoardEngine.js'];
const MOTOR_CARTAS  = ['js/arcade_mats.js', 'js/SovereignCardEngine.js'];

export const cargar = (src) => new Promise((listo, falla) => {
    /**
     * ⚠️ LO QUE YA ESTÁ EN LA PÁGINA NO SE VUELVE A CARGAR.
     *
     * `entropy.html` conservaba los tres <script> de vendor del cascarón viejo y
     * esto los cargaba otra vez. Con three sólo salía un aviso; con tween salió
     * caro: dos objetos TWEEN distintos, uno recibiendo los movimientos de las
     * cartas y otro siendo el que se actualiza en cada fotograma. Las cartas se
     * quedaban clavadas donde nacen, la mesa parecía vacía y **no había ni un
     * error en consola** — el peor tipo de fallo que existe.
     *
     * Se comprueba aquí y no en cada página porque las páginas se copian entre
     * ellas: la próxima que herede un <script> de más ya no romperá nada.
     */
    // El vendor no cambia con el proyecto y ya viene con su versión en la ruta
    // (`three-r128`), así que sellarlo sólo obligaría a redescargarlo sin motivo.
    const sellado = src.startsWith('/vendor/') ? src : `${src}?v=${VERSION}`;
    const url = new URL(sellado, location.href).href;
    if ([...document.scripts].some(s => s.src === url)) return listo();

    const s = document.createElement('script');
    // ⚠️ `.mjs` se carga como módulo. Los visualizadores viejos son scripts
    // clásicos que hablan por variables globales; los nuevos importan el
    // sustrato, que es un módulo. Distinguirlos por la extensión evita tener que
    // declarar en la configuración algo que el nombre del fichero ya dice.
    if (src.endsWith('.mjs')) s.type = 'module';
    s.src = sellado;
    s.onload = listo;
    // Un script que no carga tiene que decirlo aquí y no veinte líneas después
    // como un `X is not defined` que no señala a nada.
    s.onerror = () => falla(new Error(`no se pudo cargar ${src}`));
    document.head.appendChild(s);
});

/**
 * ⚠️ LAS HOJAS DE ESTILO TAMBIÉN SE SELLAN. AQUÍ HABÍA UN AGUJERO.
 *
 * Todo el sistema de `?v=` existe para que un navegador no empareje una copia
 * guardada con código nuevo. Los `.js` iban sellados desde el principio y el CSS
 * no, o sea que la mitad del cuadro podía llegar vieja.
 *
 * No es teórico: hoy el arreglo de que el panel dejara pasar los clics del tablero
 * vive ENTERO en `jugables.css`. Sin sello, quien ya hubiera abierto una mesa se
 * quedaba con la hoja de antes y el arreglo no le llegaba nunca — y desde fuera
 * todo verde, porque el despliegue sí subió el fichero.
 */
const hoja = (href) => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    // El vendor queda fuera, con el mismo criterio que los scripts: no cambia con
    // el proyecto y sellarlo sólo obligaría a redescargar las fuentes sin motivo.
    l.href = href.startsWith('/vendor/') ? href : `${href}?v=${VERSION}`;
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

    const nombre = titulo ?? TITULOS[juego] ?? juego;
    document.title = `ALISA Arcade — ${nombre}`;
    hoja('css/arcade.css');
    hoja('css/mesa3d.css');
    // Va la ÚLTIMA a propósito: revierte el `pointer-events: none` que las otras
    // ponen en la capa del HUD, y sólo para los botones de jugar. El porqué está
    // escrito en el fichero, y lo encontró un betatester en un móvil de 276 px.
    hoja('css/jugables.css');
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
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  LAS NORMAS, EN LA DIRECCIÓN
     * ═══════════════════════════════════════════════════════════════════════
     *
     *     /arcade/checkers?normas=damaVuela
     *     /arcade/checkers?normas=damaVuela,peonComeAtras
     *
     * Un juego puede exportar `NORMAS`: un objeto con sus normas variables y el
     * valor de cada una por defecto. Damas es el primero —`damaVuela`,
     * `peonComeAtras`— y con esas dos salen la anglosajona, la española, la
     * internacional y una cuarta que nadie ha tenido que escribir.
     *
     * ⚠️ SE NOMBRAN LAS NORMAS, NO LAS VARIANTES.
     *
     * `?normas=española` sería más bonito de leer y sería otra lista paralela: el
     * día que alguien añada una tercera norma habría que repasar los nombres de
     * variante uno a uno, y el que se olvide se queda contando lo de antes. Las
     * normas son el dato; las variantes son un resumen que cada cual hace.
     *
     * ⚠️ Y SÓLO SE ACEPTAN LAS QUE EL JUEGO DECLARA.
     *
     * Una norma inventada en la dirección se ignora y se avisa. Si se pasara tal
     * cual, la partida se jugaría con las de siempre mientras el recibo diría otra
     * cosa — y eso es exactamente la clase de mentira silenciosa que aquí sale
     * cara.
     */
    const pedidas = String(new URLSearchParams(location.search).get('normas') ?? '')
        .split(',').map(s => s.trim()).filter(Boolean);

    /**
     * ⚠️ LAS NORMAS LAS DECLARAN LAS PROPIAS REGLAS, NO UNA RUTA ADIVINADA.
     *
     * Primero lo escribí como `import('./protohub/rules/' + juego + '.js')` para
     * leer su `NORMAS`. Parecía inofensivo porque el fallo estaba capturado — y
     * rompió cuatro juegos de golpe: brisca, tute, hearts y spades no viven en esa
     * ruta, así que el navegador pedía un fichero que no existe y **anotaba un 404
     * en la consola** aunque yo me tragara el error. El laboratorio los suspendió
     * a los cuatro, con razón.
     *
     * Se carga una vez sin opciones y se le pregunta a lo que devuelve. Si declara
     * normas y la dirección pide alguna, se vuelve a cargar con ellas: el módulo ya
     * está en memoria, así que no cuesta nada.
     */
    let reglas = await cargarReglas(juego, {});
    const declaradas = reglas?.NORMAS ?? null;

    if (declaradas) {
        const normas = { ...declaradas };
        for (const n of pedidas) {
            if (n in declaradas) normas[n] = true;
            else console.warn(`[Arcade] '${juego}' no tiene la norma '${n}'. Tiene: ${Object.keys(declaradas).join(', ')}`);
        }
        window.ALISA_NORMAS = normas;
        window.ALISA_NORMAS_POSIBLES = declaradas;
        if (pedidas.length) reglas = await cargarReglas(juego, { normas });
    } else if (pedidas.length) {
        console.warn(`[Arcade] '${juego}' no declara normas variables; se ignora ?normas=`);
    }
    const hub = new ProtoHub().registrar(idJuego, reglas);
    window.ALISA_PROTOHUB = hub;

    /**
     * ⚠️ Y A QUÉ SE JUEGA. NO ES REDUNDANTE CON EL HUB.
     *
     * Los visualizadores se cargan como `<script type="module">` que se montan
     * solos: no hay a quién pasarle argumentos, así que leen `window.ALISA_JUEGO`.
     * `entropy.html` lo ponía a mano de cuando era una página escrita entera, y al
     * convertir las demás en una línea de configuración nadie lo trajo aquí — con
     * lo cual siete juegos abrían su mesa y repartían ENTROPY, en silencio, porque
     * `mesa_cartas` tenía un `?? 'entropy'` que tapaba justo el único caso probado.
     *
     * Va antes de `cargar()` a propósito: el módulo lo lee al montarse.
     */
    window.ALISA_JUEGO = idJuego;
    window.ALISA_TITULO = nombre;  // el nombre pelado: el HUD ya pone lo demás

    /**
     * ⚠️ Y A QUÉ SE JUEGA, PARA LA PERSONA. Lo pidió un betatester en mancala
     * («ni idea tengo de cómo se juega») el mismo día que terminé de escribir los
     * treinta y cinco objetivos: se lo estaba contando al agente y no a él.
     *
     * Va aquí y no en el HUD porque quien tiene las reglas cargadas es esto. Y va
     * ANTES de que se monte el visualizador, por la misma razón que `ALISA_JUEGO`:
     * el HUD se pinta una vez, al montarse, y lo que no esté puesto para entonces
     * no aparece.
     */
    window.ALISA_OBJETIVO = reglas?.OBJETIVO ?? null;

    /**
     * ⚠️ `?semilla=` NO SE APLICABA, Y LAS PÁGINAS PROMETÍAN QUE SÍ.
     *
     * Esto registraba las reglas y dejaba que la primera consulta creara la
     * partida sola — y `nuevaPartida()` sin semilla usa `Date.now()`. O sea que
     * abrir dos veces la misma dirección daba dos repartos distintos, mientras el
     * comentario de la página decía «?semilla=7 fija el reparto». La mesa de texto
     * sí lo hacía (`hub.reset(juego, { semilla })`); estas páginas no, y nadie lo
     * notó porque una partida con otro reparto sigue siendo una partida válida.
     *
     * Y no es cosmético: compartir «juega esta mano» es un enlace, comparar dos
     * agentes exige el mismo reparto, y un recibo sin semilla declarada no se
     * puede re-simular. Es la misma dirección = la misma partida, o no es nada.
     */
    const semilla = Number(new URLSearchParams(location.search).get('semilla'));
    if (Number.isFinite(semilla) && semilla > 0) hub.reset(idJuego, { semilla, seed: semilla });

    await montarThree();
    for (const s of ANDAMIO) await cargar(s);

    // Una partida de muestra basta para saber de qué está hecho el juego.
    const { obtenerSustrato } = await import('./protohub/sustrato.js');
    let deCartas = false;
    try {
        const q = reglas.nuevaPartida({ semilla: 1, seed: 1 });
        const sus = reglas.sustrato ? reglas.sustrato(q, 0)
                                    : obtenerSustrato(juego, reglas, q, reglas.estado(q));
        deCartas = !!(sus?.zonas?.length) && !sus?.rejilla;
    } catch { /* si no se puede mirar, tablero: es lo de siempre */ }

    for (const s of (deCartas ? MOTOR_CARTAS : MOTOR_TABLERO)) await cargar(s);

    /**
     * ⚠️ SIN VISUALIZADOR PROPIO NO SE QUEDA EN BLANCO: SALE LA VISTA GENÉRICA.
     *
     * Antes, un juego sin `visualizador` cargaba el motor y nada más — o sea una
     * página con HUD y un lienzo vacío. Por eso los once juegos nuevos vivían en
     * `mesa.html`, que es de TEXTO: era eso o nada.
     *
     * Y no hacía falta escribir un renderizador para ninguno. `crearPintor3d`
     * lleva meses dibujando rejilla, piezas y montones sin saber a qué se juega;
     * lo único que faltaba era que alguien lo montara. `mesa_tablero.mjs` hace por
     * los tableros lo que `mesa_cartas.mjs` por las cartas.
     *
     * Se elige por lo que el juego PUBLICA —igual que el motor—, no por una lista:
     * si reparte cartas, la mesa de casino; si no, la de tablero. Un `visualizador`
     * declarado sigue mandando, para los que tienen uno a medida y bonito.
     */
    /**
     * ⚠️ Y SI LA PÁGINA NO LO DICE, LO DICE EL JUEGO.
     *
     * `VISUALIZADOR` es el mismo dato que estas páginas venían pasando a mano, pero
     * puesto donde pertenece: en el juego, no en una de las páginas donde se le mira.
     * Lo que declare la página sigue mandando —no se rompe ninguna— y quien no declare
     * nada hereda el suyo. La sala de bolsillo lee ESTE mapa, así que sentarse a una
     * mesa y abrir la página del juego dibujan lo mismo, que es lo que no pasaba.
     */
    const { VISUALIZADOR } = await import('./visualizadores.js');
    const cual = visualizador ?? VISUALIZADOR[juego]
        ?? (deCartas ? 'mesa_cartas.mjs' : 'mesa_tablero.mjs');
    await cargar(`js/${cual}`);

    /**
     * ⚠️ LOS DE VISUALIZADOR PROPIO NO PUEDEN ENSEÑAR EL ESTADO POR SÍ SOLOS.
     *
     * Las dos mesas genéricas ya pintan las filas del estado con `filasDeEstado`, así
     * que veintiuno de los veintiocho juegos donde el agente sabía más que la persona
     * quedaron arreglados solos. Los siete con visualizador propio no: son scripts
     * clásicos y no pueden importar un módulo.
     *
     * Se les vigila el panel desde aquí. Ver la nota larga de `protohub/panel.js`
     * sobre por qué no son siete parches — el juego 39 con visualizador propio
     * nacería otra vez mudo.
     */
    if (!/^mesa_(cartas|tablero)\.mjs$/.test(cual)) {
        const { vigilarPanel } = await import('./protohub/panel.js');
        vigilarPanel(window.ALISA_PROTOHUB, idJuego);
    }

    // Pantalla completa y esconder el panel, en las treinta y cinco. Va DESPUÉS del
    // visualizador porque uno de los botones necesita el panel, y espera a que
    // aparezca: la mesa genérica es un módulo y lo construye más tarde que los
    // visualizadores clásicos.
    window.ALISA_MANDOS?.montarCuandoHaya();

    /**
     * ⚠️ EL BOTÓN DE «ALGO VA RARO», EN LAS TREINTA Y CINCO DE UNA LÍNEA.
     *
     * Va aquí y no en cada página por el mismo motivo que todo lo demás de este
     * fichero: una cosa que hay que acordarse de poner en cada página acaba
     * faltando en una, y será justo en la que falle algo.
     *
     * Y lo que manda no es un comentario: es un comentario CON EL RECIBO de la
     * partida. Aquí una partida se vuelve a jugar con `{juego, semilla, jugadas}`,
     * así que un aviso de un desconocido pasa de anécdota a caso reproducible. Los
     * fallos de esta semana —la brisca repartiendo entropy, las cartas ilegibles,
     * el póker sin botones— no los habría encontrado ningún informe; todos salieron
     * de MIRAR una partida concreta. Esto es dar a otro la forma de señalar cuál.
     *
     * No manda nada solo: sólo lo que alguien escriba y pulse, y lo enseña antes.
     */
    import('./protohub/reportar.js').catch(() => { /* sin buzón se juega igual */ });

    return window.ALISA_PROTOHUB;
}
