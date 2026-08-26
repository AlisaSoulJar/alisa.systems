/**
 * functions/api/mundos.js — LA PUERTA DE LAS MÁQUINAS, PARA LOS MUNDOS
 * ═══════════════════════════════════════════════════════════════════════════
 *     GET  /api/mundos                                    → el catálogo
 *     POST /api/mundos  { mundo, semilla, jugadas }        → el estado ahí mismo
 *
 * POR QUÉ EXISTE
 * `/api/gym` abrió la puerta HTTP a los 40 juegos de arcade — un agente puede
 * jugar al ajedrez desde cualquier sitio sin clonar el repositorio. Medido el
 * 25-08: **sirve 40 juegos de arcade y CERO mundos**. O sea que ¡Busca!,
 * ¡Defiende!, Marabunta y los demás sólo se podían jugar clonando.
 *
 * Es el mismo hueco que tenía el sustrato esta misma tarde: el arcade con su
 * pieza compartida y los mundos sin ella.
 *
 * ⚠️ Y AQUÍ ESTÁ LO QUE ESTO DESBLOQUEA DE VERDAD
 * Un decisor local es una demo. Lo que hace falta es una PUERTA donde enchufar
 * cualquiera que piense: un modelo en el portátil, uno detrás de una API, un
 * subagente, o una persona con curl. Con esto, «quién juega» deja de ser una
 * decisión de arquitectura y pasa a ser quien haga la petición.
 *
 * ⚠️ SIN ESTADO, IGUAL QUE SU HERMANO, Y POR LOS MISMOS TRES MOTIVOS
 * Mandas la partida entera y se re-simula desde la semilla:
 *
 *   1. no hay sesión que perder ni estado que se corrompa;
 *   2. cualquier paso es reproducible por cualquiera;
 *   3. y **el agente no puede hacer trampas por construcción** — no guardamos su
 *      puntuación, la recalculamos. Un gym con sesión se cree lo que le cuenta
 *      el cliente sobre dónde iba.
 *
 * ⚠️ LA UNIDAD ES LA DECISIÓN, NO EL TICK. ESO HAY QUE DECIRLO.
 * Estos mundos corren a 60 Hz: una partida de ¡Defiende! son 7.200 ticks, y
 * nadie va a hacer 7.200 peticiones. Cada entrada de `jugadas` vale por un
 * INTERVALO DE DECISIÓN (`ticksPorJugada`, 30 por defecto = medio segundo), y el
 * mundo avanza ese intervalo con el verbo elegido.
 *
 * Es la misma regla que aplican las páginas y `PuenteDeGimnasio`: un verbo por
 * decisión. Si aquí se decidiera más a menudo que en la puerta humana, la
 * comparación tendría trampa a favor de la máquina y encima invisible.
 *
 * El precio es cuadrático —la decisión N re-simula N intervalos—. Una partida
 * entera de ¡Defiende! cuesta 9 ms de CPU medidos, así que sale a microsegundos
 * por decisión. Se dice en voz alta en vez de descubrirse.
 */
import { CATALOGO } from '../../public/js/alisa-engine/src/gym/registry.js';

const TOPE_JUGADAS = 2000;
const TICKS_POR_JUGADA = 30;          // medio segundo de mundo por decisión
const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
};
const responder = (codigo, cuerpo) =>
    new Response(JSON.stringify(cuerpo, null, 2), { status: codigo, headers: CABECERAS });

const cache = new Map();
async function claseDe(id) {
    if (cache.has(id)) return cache.get(id);
    const entrada = CATALOGO.find(e => e.id === id && e.familia === 'propio');
    if (!entrada) return null;
    const Clase = await entrada.cargar();
    cache.set(id, Clase);
    return Clase;
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CABECERAS });
}

/**
 * El catálogo, que es también el manual: un agente que llega solo tiene que
 * poder enterarse de cómo se juega sin leer documentación nuestra.
 */
export async function onRequestGet() {
    const mundos = [];
    for (const e of CATALOGO) {
        if (e.familia !== 'propio') continue;
        try {
            const Clase = await claseDe(e.id);
            const env = new Clase();
            env.reset(1);
            const menu = typeof env.affordances === 'function' ? env.affordances() : [];
            mundos.push({
                mundo: e.id,
                titulo: Clase.meta?.title ?? e.titulo ?? e.id,
                de_que_va: Clase.meta?.summary ?? null,
                etiquetas: Clase.meta?.tags ?? [],
                horizonte_en_ticks: Clase.meta?.horizon ?? null,
                observacion: Clase.observationSpace?.shape?.[0] ?? null,
                verbos_al_empezar: menu.length,
                ejemplo_de_verbo: menu[0] ? { verbo: menu[0].verb, args: menu[0].args ?? {} } : null,
            });
        } catch (err) {
            // Un mundo que no arranca se dice, no se esconde: si desaparece del
            // catálogo en silencio, nadie va a notar que dejó de estar.
            mundos.push({ mundo: e.id, error: String(err?.message ?? err).slice(0, 200) });
        }
    }
    return responder(200, {
        que_es: 'La puerta de las máquinas para los MUNDOS del banco. Mismos motores '
              + 'que juega una persona en la web y que mide el gimnasio en local.',
        como_se_juega: {
            paso_1: 'POST /api/mundos  { "mundo": "alisa/Defiende-v0", "semilla": 7, "jugadas": [] }',
            paso_2: 'te devuelve `descripcion` (el estado en prosa) y `verbos` (lo legal AHORA).',
            paso_3: 'elige uno, añádelo a `jugadas` y vuelve a pedir. La partida entera viaja contigo.',
            verbo_con_argumentos: '{ "verbo": "construir_guijarro", "args": { "x": 3, "z": 4 } }',
            verbo_simple: '"esperar"  — vale la cadena a secas',
        },
        reglas_del_juego_limpio: {
            sin_sesion: 'no guardamos nada: se re-simula desde la semilla en cada petición.',
            sin_trampas: 'tu puntuación no se acepta, se recalcula.',
            una_decision_por_intervalo:
                `cada jugada avanza ${TICKS_POR_JUGADA} ticks de mundo, igual que la puerta `
              + 'humana. Decidir más a menudo que una persona sería trampa invisible.',
            el_precio: 'la decisión N re-simula N intervalos. Para miles de pasos por '
                     + 'segundo, usa el motor en local: para eso se publica.',
        },
        mundos,
    });
}

export async function onRequestPost({ request }) {
    let cuerpo;
    try { cuerpo = await request.json(); }
    catch { return responder(400, { error: 'el cuerpo tiene que ser JSON' }); }

    const { mundo, semilla = 1, jugadas = [], ticksPorJugada = TICKS_POR_JUGADA } = cuerpo ?? {};
    if (!mundo) return responder(400, { error: 'falta `mundo`. Pide GET /api/mundos para ver cuáles hay.' });
    if (!Array.isArray(jugadas)) return responder(400, { error: '`jugadas` tiene que ser una lista' });
    if (jugadas.length > TOPE_JUGADAS) {
        return responder(400, { error: `demasiadas jugadas (${jugadas.length} > ${TOPE_JUGADAS})` });
    }

    const Clase = await claseDe(mundo);
    if (!Clase) {
        return responder(404, { error: `no conozco el mundo "${mundo}"`,
                                pista: 'GET /api/mundos trae el catálogo' });
    }

    const env = new Clase();
    env.reset(Number(semilla) >>> 0);

    /**
     * ⚠️ UNA JUGADA RECHAZADA DETIENE LA RE-SIMULACIÓN Y SE DICE CUÁL.
     *
     * Seguir como si nada dejaría al agente creyendo que su plan iba bien
     * mientras el mundo hace otra cosa — y su nota hablaría de un malentendido,
     * no de él. Es el mismo criterio que la frontera de `PuenteDeGimnasio`.
     */
    let rechazada = null, recompensa = 0;
    for (let i = 0; i < jugadas.length && !env.done; i++) {
        const j = jugadas[i];
        const verbo = typeof j === 'string' ? j : j?.verbo ?? j?.verb;
        const args = typeof j === 'string' ? {} : (j?.args ?? {});
        const legales = env.affordances();
        if (!legales.some(a => a.verb === verbo)) {
            rechazada = { indice: i, jugada: j, motivo:
                `"${verbo}" no estaba entre los verbos legales en ese momento`,
                legales_entonces: legales.slice(0, 40).map(a => a.verb) };
            break;
        }
        // El intervalo de decisión: el verbo en el primer tick, inercia en el resto.
        for (let t = 0; t < ticksPorJugada && !env.done; t++) {
            const r = t === 0 ? env.stepVerb(verbo, args) : env.step(0);
            recompensa += r?.reward ?? 0;
        }
    }

    const menu = env.done ? [] : env.affordances();
    return responder(200, {
        mundo, semilla: Number(semilla) >>> 0,
        jugadas_aceptadas: rechazada ? rechazada.indice : jugadas.length,
        rechazada,
        terminada: !!env.done,
        descripcion: env.describe(),
        verbos: menu.map(a => ({ verbo: a.verb, args: a.args ?? {}, de_que_va: a.desc ?? '' })),
        observacion: env.getObservation(),
        recompensa_acumulada: +recompensa.toFixed(4),
        nota: env.getScore?.().score ?? null,
        metricas: env.getScore?.().metrics ?? null,
        ticks_por_jugada: ticksPorJugada,
    });
}
