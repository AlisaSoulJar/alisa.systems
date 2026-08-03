/**
 * extensions/alisa-colony — LA COLONIA, COMO EXTENSIÓN OPCIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 * Todo lo que ata el motor a ALISA vive detrás de esta puerta. El núcleo no
 * sabe que existe.
 *
 * POR QUÉ
 * -------
 * El motor se publica libre y limpio; la colonia es una aplicación que lo usa.
 * Si el núcleo conociera el hub, cualquiera que se descargara el motor tendría
 * un cliente de ALISA dentro sin haberlo pedido — y llamadas a `127.0.0.1:8741`
 * en su consola. Era literalmente el caso: `AlisaRenderCore` auto-registraba
 * `ColonialPassportPlugin`.
 *
 * USO (desde los labs y salas de la colonia)
 * -----------------------------------------
 *     import { AlisaRenderCore } from '@alisa-engine/src/soma/AlisaRenderCore.js';
 *     import { attachColony } from '@alisa-engine/src/extensions/alisa-colony/index.js';
 *
 *     const core = new AlisaRenderCore();
 *     await attachColony(core);            // hub por defecto
 *     // o: await attachColony(core, { hubUrl: 'http://otro:8741', passports: false });
 *
 * REGLA PARA QUIEN TOQUE ESTO
 * ---------------------------
 * Nada bajo `src/` fuera de esta carpeta debe mencionar el hub, los pasaportes,
 * el JobBoard, $NEURO ni el overworld. Si necesitas eso desde el núcleo, es que
 * falta un gancho en el núcleo — no un import.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Hub de la colonia por defecto. */
export const HUB_URL_DEFECTO = 'http://127.0.0.1:8741';

/**
 * Engancha las piezas de la colonia a un núcleo de render.
 *
 * Los plugins se cargan de forma perezosa (import dinámico) para que un build
 * del motor vainilla pueda dejarlos fuera sin que nada se rompa.
 *
 * @param {Object} core instancia de AlisaRenderCore
 * @param {Object} [opts]
 * @param {string}  [opts.hubUrl]      hub al que hablar
 * @param {boolean} [opts.passports=true] instanciar avatares desde los pasaportes
 * @param {boolean} [opts.terminal=false] terminal colonial
 * @param {boolean} [opts.jobBoard=false] panel del JobBoard
 * @returns {Promise<{registrados: string[], fallidos: string[]}>}
 */
export async function attachColony(core, opts = {}) {
    const hubUrl = opts.hubUrl ?? HUB_URL_DEFECTO;
    const quiere = {
        ColonialPassportPlugin: opts.passports !== false,
        ColonialTerminalPlugin: opts.terminal === true,
        JobBoardDisplayPlugin:  opts.jobBoard === true,
    };

    const registrados = [], fallidos = [];
    for (const [nombre, activo] of Object.entries(quiere)) {
        if (!activo) continue;
        try {
            const mod = await import(`../../soma/plugins/${nombre}.js`);
            const Cls = mod[nombre];
            if (!Cls) throw new Error(`el módulo no exporta ${nombre}`);
            core.registerPlugin(new Cls(hubUrl));
            registrados.push(nombre);
        } catch (e) {
            // Que falte una pieza de la colonia NO debe tumbar la escena.
            console.warn(`[alisa-colony] no se pudo enganchar ${nombre}:`, e.message);
            fallidos.push(nombre);
        }
    }

    console.log(`[alisa-colony] enganchada al hub ${hubUrl} — ${registrados.length} plugin(s): ${registrados.join(', ') || 'ninguno'}`);
    return { registrados, fallidos };
}

/**
 * ¿Hay hub al otro lado? Útil para que un lab decida si engancharse o correr
 * suelto, en vez de llenar la consola de errores de red.
 * @param {string} [hubUrl]
 * @param {number} [timeoutMs=1500]
 * @returns {Promise<boolean>}
 */
export async function hayHub(hubUrl = HUB_URL_DEFECTO, timeoutMs = 1500) {
    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        const r = await fetch(`${hubUrl}/health`, { signal: ctrl.signal });
        clearTimeout(t);
        return r.ok;
    } catch {
        return false;
    }
}
