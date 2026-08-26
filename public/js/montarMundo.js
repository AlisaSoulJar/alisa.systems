/**
 * montarMundo.js — UN juego que es un sitio = UNA línea de configuración
 * ═══════════════════════════════════════════════════════════════════════════
 *     <head>
 *       <script src="/js/mundo.js"></script>       ← el importmap común, ANTES
 *     </head>
 *     <script type="module">
 *       import { montarMundo } from '/js/montarMundo.js';
 *       const { app, THREE, cine } = await montarMundo({ ambiente: 'night' });
 *     </script>
 *
 * Es el hermano de `montarMesa.js`. Aquel monta las cuarenta mesas —tablero y
 * cartas—; éste monta los juegos que son UN SITIO: las etapas de ¡Busca!, las de
 * ¡Sobrevive!, los laboratorios, los que vengan.
 *
 * ⚠️ NO SE LLAMA `montarArcade` A PROPÓSITO.
 * En esta casa «arcade» ya es una cosa concreta —`public/arcade/`, los cuarenta
 * juegos de mesa— y dos cosas con el mismo nombre acaban confundiéndose. `mesa` y
 * `mundo` dicen exactamente lo que son y no se pisan.
 *
 * ⚠️ QUÉ HABÍA ANTES, QUE ES LO QUE JUSTIFICA ESTO. MEDIDO.
 *
 * Seis páginas de la saga, y cada una con su `importmap`, su bloque de estilos y
 * su lista de imports a mano. Lo que compartían:
 *
 *     5/6  AlisaRenderCore          el núcleo
 *     5/6  three
 *     3/6  OrbitControls
 *     2/6  CinematicPipelinePlugin  ← AQUÍ ESTÁ EL PROBLEMA
 *
 * El pipeline que hace bonito a lo bonito —tono filmico, bloom, SSAO, cielo de
 * Rayleigh, sombras— lo importaban DOS de seis. No porque sea difícil: porque
 * cuando el andamio se copia a mano, lo que no es imprescindible no se copia.
 * Por eso aquí el pipeline va PUESTO por defecto y hay que pedir que se quite.
 *
 * Y por eso los efectos se ajustan en un sitio: cambiar el `preset` por defecto
 * de este fichero cambia el aspecto de todos los mundos a la vez, que es lo que
 * no se podía hacer teniendo el pipeline escrito seis veces.
 *
 * ⚠️ Y TRAE EL SONIDO, QUE ES LA MITAD QUE SIEMPRE FALTA.
 * `sfx.js` son 37 KB y sesenta y tres sonidos que usaban DOS páginas de ciento
 * once. Aquí entra solo, igual que en las mesas.
 */

const RUTA_SFX = '/js/sfx.js';

/**
 * ⚠️ Y TRAE LA DIRECCIÓN DE ARTE, QUE ERA LA OTRA MITAD QUE FALTABA.
 *
 * `montarMesa` reparte cuatro hojas a las cincuenta y cinco páginas del arcade, y
 * su cabecera cuenta por qué: encontró «CSS idéntico copiado seis veces». Las
 * etapas en 3D no tenían nada de eso — cada una escribía sus cuarenta líneas de
 * estilo dentro del HTML, y el día que se quisiera cambiar el color de un panel
 * había que abrirlas todas.
 *
 * Medido antes de escribir esto: **71 variables CSS distintas** por el proyecto,
 * con `--bg`, `--text` y `--accent` declaradas cuatro y seis veces en ficheros que
 * no se conocen. Eso no es una paleta: son cuatro paletas parecidas.
 */
const HOJA_MUNDO = '/css/mundo.css';

/** Pone una hoja de estilo una sola vez. Mismo gesto que `hoja()` en las mesas. */
function hoja(href) {
    if (document.querySelector(`link[data-mundo="${href}"]`)) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = href;
    l.dataset.mundo = href;
    document.head.appendChild(l);
}

/** Carga un script clásico una sola vez. Devuelve cuando está listo. */
function cargarClasico(src) {
    return new Promise((listo, falla) => {
        if (document.querySelector(`script[data-mundo="${src}"]`)) return listo();
        const s = document.createElement('script');
        s.src = src;
        s.dataset.mundo = src;
        s.onload = () => listo();
        // Sin sonido se juega igual: es adorno, no mecánica. Se avisa y se sigue.
        s.onerror = () => { console.warn(`[mundo] no se pudo cargar ${src}`); listo(); };
        document.head.appendChild(s);
    });
}

/**
 * Monta el mundo y devuelve las tres cosas con las que se trabaja.
 *
 * @param {Object}  [cfg]
 * @param {string}  [cfg.ambiente='golden_hour']  preset del pipeline: golden_hour · noon · night · interior
 * @param {boolean} [cfg.cielo=true]     cielo atmosférico (apagar en interiores)
 * @param {boolean} [cfg.luces=true]     key+hemi+fill (apagar si la escena trae las suyas)
 * @param {boolean} [cfg.bloom=true]
 * @param {boolean} [cfg.ssao=true]
 * @param {boolean} [cfg.cine=true]      false = sin pipeline, para depurar
 * @param {boolean} [cfg.suelo=true]     el entorno por defecto del núcleo
 * @param {boolean} [cfg.sonido=true]
 * @param {Object}  [cfg.nucleo]         opciones crudas para `AlisaRenderCore`
 * @returns {Promise<{app, THREE, cine, sonar}>}
 */
export async function montarMundo(cfg = {}) {
    // La línea visual, antes que nada: si llegara después del primer dibujo, la
    // etapa parpadearía en blanco. Se puede quitar con `estilo: false` para una
    // página que quiera su propio aspecto entero — hoy no la hay.
    if (cfg.estilo !== false) hoja(HOJA_MUNDO);

    /**
     * ⚠️ LOS IMPORTS SON DINÁMICOS Y NO DE CABECERA, Y NO ES CAPRICHO.
     *
     * `mundo.js` inyecta el `importmap` desde un script clásico del `<head>`. Si
     * este fichero importara `three` arriba del todo, el navegador resolvería ese
     * especificador al analizar el módulo — y con el mapa puesto o no según el
     * orden exacto de la página, que es la clase de fallo que sale en una máquina
     * y no en otra. Importando dentro de la función, el mapa lleva puesto desde
     * hace rato porque `mundo.js` es síncrono y va antes.
     */
    const THREE = await import('three');
    const { AlisaRenderCore } = await import('@alisa-engine/src/soma/AlisaRenderCore.js');

    const app = new AlisaRenderCore({
        clearColor: 0x050508,
        cameraPosition: new THREE.Vector3(0, 12, 22),
        ...(cfg.nucleo || {}),
    });
    if (cfg.suelo !== false) app.setupDefaultEnvironment();

    /**
     * El pipeline, PUESTO salvo que se pida lo contrario. Ver la nota de arriba:
     * dos de seis lo tenían cuando había que acordarse.
     *
     * Se registra después del entorno por defecto para que `luces:false` tenga
     * sentido — quien trae sus luces las ha puesto ya.
     */
    let cine = null;
    if (cfg.cine !== false) {
        const { CinematicPipelinePlugin } = await import(
            '@alisa-engine/src/soma/plugins/CinematicPipelinePlugin.js');
        cine = new CinematicPipelinePlugin({
            preset: cfg.ambiente || 'golden_hour',
            sky:    cfg.cielo !== false,
            lights: cfg.luces !== false,
            bloom:  cfg.bloom !== false,
            ssao:   cfg.ssao !== false,
        });
        app.registerPlugin(cine);
    }

    if (cfg.sonido !== false) await cargarClasico(RUTA_SFX);

    /**
     * El audio no puede arrancar antes de que toquen la página: `AudioContext`
     * nace suspendido y despertarlo antes no da error, deja el contexto muerto y
     * todo calla para siempre. Misma nota que en `sonido_mesa.js`.
     */
    let despierto = false;
    const despertar = () => {
        if (despierto) return;
        despierto = true;
        try { window.SFX?.init?.(); window.SFX?.autoWireUI?.(); } catch { /* sin sonido se juega */ }
    };
    document.addEventListener('pointerdown', despertar, { once: true, capture: true });
    document.addEventListener('keydown', despertar, { once: true, capture: true });

    /** Sonar sin tener que comprobar si hay sonido. Devuelve si sonó. */
    const sonar = (nombre) => {
        try { window.SFX?.play?.(nombre); return true; } catch { return false; }
    };

    /**
     * ⚠️ QUIEN TIENE PIPELINE TIENE QUE PINTAR CON ÉL.
     *
     * `startLoop(update)` pinta con el renderer pelado, así que un mundo con
     * pipeline registrado y `startLoop` a secas se vería SIN post-proceso y sin
     * un solo error: bloom, SSAO y tono filmico registrados, funcionando, y sin
     * llegar a la pantalla. Por eso el bucle se arranca desde aquí con la función
     * de pintado del pipeline ya puesta.
     */
    const arrancar = (actualizar) => app.startLoop(actualizar, cine ? cine.renderFn : null);

    window.ALISA_MUNDO = { app, cine, sonar };     // para que una prueba lo vea
    return { app, THREE, cine, sonar, arrancar };
}
