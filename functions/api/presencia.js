/**
 * functions/api/presencia.js — que las tres audiencias se vean
 * ═══════════════════════════════════════════════════════════════════════════
 *     POST /api/presencia   { quien, tipo, estacion, juego }   → «sigo aquí»
 *     GET  /api/presencia                                      → quién hay ahora
 *
 * POR QUÉ EXISTE
 * El sitio promete ser la puerta para personas, agentes de lenguaje y políticas
 * numéricas. Las tres podían jugar —la sala por un lado, `/api/gym` por otro—
 * pero vivían en **dos mundos disjuntos**: una persona en la sala no veía jamás
 * a un agente, y un agente no veía jamás la sala. Jugaban a lo mismo, con las
 * mismas reglas y contra el mismo verificador, sin coincidir nunca.
 *
 * Esto es lo más pequeño que arregla eso.
 *
 * ⚠️ EL ÚNICO ESTADO COMPARTIDO DE TODO EL SITIO, Y DUELE
 * Lo demás no guarda nada: el gym re-simula, el verificador re-simula. Esa es
 * la fuerza del proyecto — nada que corromper, nada que auditar, nada que
 * puedas falsear diciéndome dónde ibas.
 *
 * Pero «vernos» es irreduciblemente un estado compartido: **no hay manera de
 * que dos seres coincidan si nadie recuerda que el otro está ahí**. Así que se
 * paga el precio en el sitio más pequeño posible y con las esquinas limadas:
 *
 *   · las entradas caducan solas a los 60 s — no hay que borrar nada;
 *   · no hay cuentas, ni sesión, ni contraseña;
 *   · no se guarda IP ni cabecera alguna: sólo el nombre que te pongas;
 *   · no hay histórico. Lo que pasó hace un minuto no existe;
 *   · y si esto se cae, **la sala sigue funcionando en solitario**. Verse es
 *     una mejora, no un requisito. Es la misma regla que con el hub local.
 *
 * SOBRE FIARSE
 * Cualquiera puede decir que se llama como quiera y que está donde quiera. No
 * se comprueba, y no pasa nada: la presencia es decorado social, no puntúa.
 * **Lo que puntúa sigue siendo la partida re-simulada**, que no se puede
 * falsear. Un sitio que se cree lo que le cuentas sobre dónde estás no es
 * grave; uno que se cree lo que le cuentas sobre lo que ganaste, sí.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    // La presencia es de AHORA. Cachearla sería servir fantasmas.
    'cache-control': 'no-store',
};

/** 60 s es el mínimo que admite el almacén, y encaja: se refresca cada 20. */
const VIDA = 60;
const TIPOS = new Set(['persona', 'agente', 'politica']);

const responder = (codigo, cuerpo) =>
    new Response(JSON.stringify(cuerpo, null, 2), { status: codigo, headers: CABECERAS });

/** Recorta y limpia lo que llega. Nadie escribe en nuestra pantalla. */
const limpio = (v, tope) =>
    String(v ?? '').replace(/[<>&"'\x00-\x1f\x7f]/g, '').trim().slice(0, tope);

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CABECERAS });
}

/**
 * Anuncia que sigues aquí. Se llama cada ~20 s mientras estés.
 * Es idempotente: repetirlo sólo renueva el plazo.
 */
export async function onRequestPost({ request, env }) {
    if (!env?.PRESENCIA) {
        // Sin almacén, la sala tiene que seguir yendo. Se dice y no se rompe.
        return responder(200, { anotado: false, motivo: 'sin almacén de presencia' });
    }
    let d;
    try { d = await request.json(); }
    catch { return responder(400, { error: 'JSON inválido' }); }

    const quien = limpio(d?.quien, 24);
    if (!quien) return responder(400, { error: 'falta `quien` (el nombre que te pongas)' });

    const tipo = TIPOS.has(d?.tipo) ? d.tipo : 'persona';
    const ficha = {
        quien, tipo,
        estacion: limpio(d?.estacion, 40) || null,
        juego: limpio(d?.juego, 24) || null,
        desde: Date.now(),
    };
    // La clave lleva el tipo delante para poder contar sin leerlo todo.
    await env.PRESENCIA.put(`p:${tipo}:${quien}`, JSON.stringify(ficha),
                            { expirationTtl: VIDA });
    return responder(200, { anotado: true, caduca_en: VIDA, ...ficha });
}

/** Quién hay ahora mismo, y dónde. */
export async function onRequestGet({ env }) {
    if (!env?.PRESENCIA) return responder(200, { seres: [], motivo: 'sin almacén de presencia' });

    const lista = await env.PRESENCIA.list({ prefix: 'p:', limit: 200 });
    const seres = [];
    for (const k of lista.keys) {
        const v = await env.PRESENCIA.get(k.name);
        if (v) { try { seres.push(JSON.parse(v)); } catch { /* entrada rota: se ignora */ } }
    }
    // Primero quien lleva más tiempo: da sensación de sala, no de lista.
    seres.sort((a, b) => (a.desde ?? 0) - (b.desde ?? 0));

    const porTipo = { persona: 0, agente: 0, politica: 0 };
    for (const s of seres) porTipo[s.tipo] = (porTipo[s.tipo] ?? 0) + 1;

    return responder(200, {
        ahora: Date.now(),
        cuantos: seres.length,
        por_tipo: porTipo,
        // Lo que hace especial a esta lista: las tres audiencias en la MISMA
        // tabla. Una persona andando por la sala y un modelo jugando por HTTP
        // salen como dos seres del mismo sitio, porque lo son.
        seres,
    });
}
