/**
 * functions/api/gym.js — la puerta de las máquinas
 * ═══════════════════════════════════════════════════════════════════════════
 *     GET  /api/gym                                  → el catálogo
 *     POST /api/gym   { juego, semilla, jugadas }     → el estado ahí mismo
 *
 * POR QUÉ EXISTE
 * La portada dice «mismas reglas para personas y para máquinas». Para las
 * personas eso era cierto —hay una sala por la que se anda— y para las máquinas
 * no lo era en absoluto: lo único que respondía por HTTP era `/api/verificar`.
 * O sea que un agente podía pedir que le verificaran una partida **que había
 * jugado en otro sitio**, pero no podía jugar. Su puerta no era la web: era
 * clonar el repositorio.
 *
 * Esto la abre. Y con los mismos ficheros de reglas que usa el navegador y que
 * usa el verificador: si hubiera una versión «de servidor», el día que se
 * separaran, un agente estaría entrenando contra otro juego.
 *
 * ⚠️ SIN ESTADO, Y NO POR PEREZA
 * Un gym por HTTP pide a gritos sesiones: abres una, te dan un identificador,
 * mandas acciones. Eso necesita almacenamiento, caduca, se puede perder a media
 * partida y hay que limpiarlo.
 *
 * Aquí no hay nada de eso: **mandas la partida entera y se re-simula**. Es el
 * mismo mecanismo del verificador, y tiene tres consecuencias buenas:
 *
 *   1. no hay sesión que perder ni estado que se corrompa;
 *   2. cualquier paso es reproducible por cualquiera, incluido tú;
 *   3. y lo mejor — **el agente no puede hacer trampas por construcción**. No
 *      guardamos su puntuación: la recalculamos desde la semilla cada vez. Un
 *      gym con sesión se cree lo que le cuenta el cliente sobre dónde iba.
 *
 * El precio es cuadrático: la jugada N re-simula N jugadas. Con partidas de unos
 * cientos de movimientos sale a microsegundos, y se dice en voz alta en vez de
 * descubrirse. Quien necesite miles de pasos por segundo, que use el motor en
 * local — para eso se publica.
 *
 * LO QUE UN AGENTE RECIBE, Y POR QUÉ
 * `acciones` es la lista de jugadas legales **en este instante**. No es una
 * ayuda: es el contrato. Un agente de lenguaje no puede alucinar una jugada
 * ilegal porque sólo se le ofrecen las legales, y eso quita de en medio el
 * problema con el que se pelea medio sector —parsear intenciones, castigar
 * acciones inválidas— para dejar medido lo único interesante: si elige bien.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { puntuacionDe } from '../../public/arcade/js/protohub/Verificador.js';
import { huellaDeReglas } from '../../public/arcade/js/protohub/huella.js';
import { JUEGOS, TITULOS, cargarReglas } from '../../public/arcade/js/protohub/rules/index.js';

const BIBLIOTECA = '/arcade/data/card_library.json';
const TOPE_JUGADAS = 4000;

const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
};

const responder = (codigo, cuerpo) =>
    new Response(JSON.stringify(cuerpo, null, 2), { status: codigo, headers: CABECERAS });

const cache = new Map();
async function reglasDe(juego, urlPeticion) {
    if (cache.has(juego)) return cache.get(juego);
    if (!JUEGOS.includes(juego)) return null;
    const url = new URL(BIBLIOTECA, urlPeticion).href;
    const reglas = await cargarReglas(juego, { url });
    cache.set(juego, reglas);
    return reglas;
}

/** Las jugadas que se pueden pedir ahora. `nueva`/`reset` las maneja el hub. */
const accionesDe = (st) =>
    (st.legal_moves ?? st.legal_actions ?? []).filter(m => m !== 'nueva' && m !== 'reset');

/**
 * Re-simula la partida y devuelve dónde queda.
 *
 * Si una jugada no es legal se para AHÍ y se dice cuál, en vez de seguir como si
 * nada. Un gym que ignora una acción inválida deja al agente creyendo que hizo
 * algo, y el siguiente estado que recibe no cuadra con nada de lo que decidió.
 */
function reproducir(reglas, semilla, jugadas) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    for (let i = 0; i < jugadas.length; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) {
            return { p, rechazada: { indice: i, jugada: jugadas[i], motivo: 'la partida ya había terminado' } };
        }
        if (!reglas.mover(p, jugadas[i])) {
            return {
                p,
                rechazada: {
                    indice: i, jugada: jugadas[i], motivo: 'jugada ilegal en ese momento',
                    legales_entonces: accionesDe(st).slice(0, 40),
                },
            };
        }
    }
    return { p, rechazada: null };
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CABECERAS });
}

/**
 * El catálogo. Es también el manual: un agente que llega solo tiene que poder
 * enterarse de cómo se juega sin leer nuestra documentación.
 */
export async function onRequestGet({ request }) {
    const entornos = [];
    for (const juego of JUEGOS) {
        try {
            const reglas = await reglasDe(juego, request.url);
            const st = reglas.estado(reglas.nuevaPartida({ semilla: 1, seed: 1 }));
            entornos.push({
                juego,
                titulo: TITULOS[juego] ?? juego,
                huella: huellaDeReglas(reglas),
                acciones_al_empezar: accionesDe(st).length,
                ejemplo_de_accion: accionesDe(st)[0] ?? null,
                describe: typeof reglas.describir === 'function' ? 'sí' : 'derivado del estado',
            });
        } catch (e) {
            entornos.push({ juego, error: e.message });
        }
    }
    return responder(200, {
        que_es: 'Un gym sin estado: mandas la partida entera y se re-simula. '
              + 'La puntuación no se envía nunca — se recalcula desde la semilla.',
        como_se_juega: {
            paso_1: 'POST /api/gym  { "juego": "gofish", "semilla": 7, "jugadas": [] }',
            paso_2: 'te devuelve `acciones`: las jugadas legales AHORA. Elige una.',
            paso_3: 'vuelve a llamar con esa jugada añadida al array. Y así.',
            al_terminar: 'POST /api/verificar con { juego, semilla, jugadas, puntos } '
                       + 'para que un tercero pueda comprobar tu resultado.',
        },
        reglas_del_juego_limpio: [
            'no se guarda nada de lo que mandas',
            'la puntuación que recibes es siempre la recalculada, nunca la que digas',
            'las mismas reglas que corren en el navegador de una persona',
        ],
        entornos,
    });
}

export async function onRequestPost({ request, env }) {
    let pet;
    try { pet = await request.json(); }
    catch { return responder(400, { error: 'JSON inválido' }); }

    const jugadas = pet?.jugadas ?? [];
    if (!Array.isArray(jugadas)) return responder(400, { error: '`jugadas` tiene que ser una lista' });
    if (jugadas.length > TOPE_JUGADAS) {
        return responder(413, { error: `demasiadas jugadas (tope ${TOPE_JUGADAS})` });
    }
    // La semilla ES el mundo: sin ella la partida no se puede repetir, y sin eso
    // no hay nada que verificar después.
    const semilla = Number(pet?.semilla);
    if (!Number.isFinite(semilla)) {
        return responder(400, { error: 'falta `semilla` (un número: el mismo da el mismo mundo)' });
    }

    const reglas = await reglasDe(pet?.juego, request.url);
    if (!reglas) {
        return responder(400, { error: `no sé jugar a '${pet?.juego}'`, juegos: JUEGOS });
    }

    const t0 = Date.now();
    let r;
    try { r = reproducir(reglas, semilla >>> 0, jugadas); }
    catch (e) { return responder(500, { error: `las reglas fallaron: ${e.message}` }); }

    const st = reglas.estado(r.p);
    const acciones = accionesDe(st);

    // ⚠️ UN AGENTE QUE JUEGA, EXISTE.
    // Hasta ahora un modelo podía jugar la misma partida que una persona y no
    // estar en ninguna parte: la sala nunca supo de él. Si dice cómo se llama,
    // ocupa sitio como cualquiera — y quien esté paseando por la sala lo verá
    // sentado en esa estación.
    //
    // Es opcional a propósito: sin `quien` se juega igual. Nadie tiene que
    // identificarse para usar el gym, y nada de esto puntúa. Y si el almacén
    // falla, la partida sigue: se envuelve en su propio `try` porque **una
    // caída del decorado social no puede tumbar una partida**.
    if (env?.PRESENCIA && pet?.quien) {
        try {
            const quien = String(pet.quien).replace(/[<>&"'\x00-\x1f\x7f]/g, '').trim().slice(0, 24);
            if (quien) {
                await env.PRESENCIA.put(`p:agente:${quien}`, JSON.stringify({
                    quien, tipo: 'agente',
                    estacion: TITULOS[pet.juego] ?? pet.juego,
                    juego: pet.juego, desde: Date.now(),
                }), { expirationTtl: 60 });
            }
        } catch { /* sin presencia se juega igual */ }
    }

    // El estado tal cual lo publican las reglas, sin recortar: es lo que ve una
    // persona en su pantalla. Lo que un agente NO recibe es lo que una persona
    // tampoco ve — las cartas tapadas salen `null` desde las propias reglas.
    return responder(200, {
        juego: pet.juego,
        titulo: TITULOS[pet.juego] ?? pet.juego,
        semilla,
        jugadas: jugadas.length,
        rechazada: r.rechazada,
        terminada: !!st.is_game_over,
        puntos: puntuacionDe(st),
        acciones,
        estado: st,
        huella: huellaDeReglas(reglas),
        ms: Date.now() - t0,
    });
}

export const _interno = { reproducir, accionesDe, reglasDe };
