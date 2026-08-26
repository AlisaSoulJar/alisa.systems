/**
 * montarVolumen.mjs — LA PUERTA HUMANA DEL GÉNERO «BUSCAR EN UN VOLUMEN»
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { montarVolumen } from '/js/montarVolumen.mjs';
 *     import { DroneTowerCore } from '@alisa-engine/src/world/systems/DroneTowerCore.js';
 *
 *     await montarVolumen({ Core: DroneTowerCore, nombre: 'dron_torre' });
 *
 * Y eso es la página entera.
 *
 * ⚠️ POR QUÉ ESTO EXISTE, Y CON QUÉ MEDIDA.
 *
 * Las dos etapas del género quedaron en 45 y 42 líneas después de sacar el
 * estilo, el HUD, las cartelas y las teclas. Al compararlas línea a línea:
 * **50 de 65 líneas útiles eran IDÉNTICAS**. Lo que de verdad cambiaba eran seis:
 * el título, qué núcleo, la piel del dibujo y el nombre del canal de vídeo.
 *
 * Cincuenta líneas repetidas dos veces son cien líneas que mantener, y la tercera
 * etapa habría hecho ciento cincuenta. Es la misma cuenta que llevó a
 * `montarMesa` en las mesas y a `SearchInVolumeCore` en los núcleos.
 *
 * ⚠️ Y DEJA UNA VENTANA AL BUCLE A PROPÓSITO.
 *
 * Dije que prefería «45 líneas que se leen a 25 que esconden el bucle», y lo
 * sigo pensando: hoy mismo tres fallos aparecieron mirando lo que pasa entre
 * `tick` y `pintar`. Por eso `porFotograma` existe: por defecto no hay nada que
 * mirar, y el día que haga falta se mira sin desmontar la página.
 *
 * Es el hermano pequeño de `montarMundo`: aquel monta el RENDER de cualquier
 * etapa en 3D; éste monta el GÉNERO — y por eso sabe de `figuras_torre` y del
 * `escanear`, que aquel no puede saber.
 */
import { montarMundo } from '/js/montarMundo.js';
import { PintorMundo } from '/js/pintor_mundo.mjs';
import { figurasDeTorre, encuadrarTorre, iluminarTorre } from '/js/figuras_torre.mjs';
import { montarHud, montarPie } from '/js/hud_mundo.mjs';
import { montarCartel } from '/js/cartelas_mundo.mjs';
import { montarTeclado } from '/js/teclado_mundo.mjs';
import { animarGLB } from '/js/figuras_glb.mjs';

/** El ambiente del género: de noche, sin cielo y sin suelo — se mira una torre. */
const AMBIENTE = {
    ambiente: 'night', cielo: false, suelo: false,
    nucleo: { clearColor: 0x05060c, fogColor: 0x05060c, fogDensity: 0.004 },
};

/**
 * @param {Object}   cfg
 * @param {Function} cfg.Core            el núcleo del cartucho (trae su `ROM`)
 * @param {string}   cfg.nombre          nombre del canal de vídeo del arcade
 * @param {Object}   [cfg.piel]          arte: `{ modelo, color, punto }`
 * @param {Object}   [cfg.ambiente]      pisa el ambiente por defecto
 * @param {Function} [cfg.porFotograma]  `(dt, nucleo, sustrato) => void`
 */
export async function montarVolumen(cfg) {
    const { Core, nombre, piel = {}, porFotograma = null } = cfg;
    const ROM = Core.ROM;
    document.title = `ALISA — ${ROM.cartel.titulo}`;

    const { app: gfx, THREE, arrancar } = await montarMundo({ ...AMBIENTE, ...(cfg.ambiente ?? {}) });

    let nucleo = null, pintor = null, hud = null, acabado = false;
    const mando = montarTeclado(() => nucleo);

    const cartel = montarCartel(ROM.cartel, (ajustes) => {
        nucleo = new Core(ajustes);
        /**
         * La PIEL es lo único de una etapa que NO está en la ROM, y es a
         * propósito: un cartucho dice cómo se juega y cómo se llama todo; qué
         * modelo se usa para dibujarlo es arte, y el arte cambia sin que el juego
         * cambie. Las claves salen de la voz de la ROM para que el dibujante
         * encuentre las piezas por su nombre.
         */
        pintor = new PintorMundo(gfx.scene, figurasDeTorre(THREE, nucleo.sustrato(), {
            jugador: ROM.voz.jugador, volumen: ROM.voz.volumen, ...piel,
        }), 1);
        hud = montarHud(ROM.hud);
        montarPie(ROM.hud.mandos);
        encuadrarTorre(gfx, nucleo.plantas, nucleo.altoPlanta);
        /**
         * El mundo, publicado, para que un aviso se pueda REPINTAR. Sale del
         * núcleo headless, el mismo que corre el banco: si se recompusiera aquí
         * desde el HUD, la persona y el agente describirían dos mundos parecidos.
         */
        window.getSustrato = () => { try { return nucleo?.sustrato() ?? null; } catch { return null; } };
    });

    arrancar((dt) => {
        if (!nucleo) return;
        const paso = Math.min(dt, 0.1);
        nucleo.tick(paso, mando.hayAlgo() ? mando.estado : null);
        const sus = nucleo.sustrato();
        pintor.pintar(sus);
        iluminarTorre(sus);
        animarGLB(paso);
        const info = nucleo.info();
        hud.pintar(info, nucleo);
        porFotograma?.(paso, nucleo, sus);
        if (info.terminado && !acabado) { acabado = true; cartel.final(info); }
    });

    /**
     * La puerta de los agentes, en la PÁGINA y no en el núcleo — como en las tres
     * etapas del mapache y a diferencia del acuario, que se había puesto el nombre
     * de la puerta dentro del motor.
     */
    window.stepSimulation = (accion, dt = 1 / 60) => {
        if (!nucleo) return null;
        if (accion === 5) nucleo.escanear();
        nucleo.tick(dt, { subir: accion === 1, bajar: accion === 2,
                          izquierda: accion === 3, derecha: accion === 4 });
        return { done: nucleo.terminado(), info: nucleo.info() };
    };
    window.ALISA_STREAM_SIM_NAME = nombre;

    return { dameNucleo: () => nucleo, gfx, THREE };
}
