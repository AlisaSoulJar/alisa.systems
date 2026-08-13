/**
 * functions/api/verificar.js — el verificador, en producción
 * ═══════════════════════════════════════════════════════════════════════════
 * Cloudflare Pages Function. `alisa.systems` ya vive en Pages, así que la
 * verificación de servidor no necesita ningún servidor nuestro: el MISMO
 * JavaScript que juega en el navegador corre aquí, al lado del sitio.
 *
 *     POST /api/verificar   { juego, semilla, jugadas, puntos }
 *     GET  /api/verificar   → la huella de las reglas de este lado
 *
 * POR QUÉ ESTO NO REIMPLEMENTA NADA
 * ---------------------------------
 * Importa los mismos ficheros de `public/arcade/js/protohub/`. Ninguna regla se
 * escribe dos veces: si hubiera una versión «de servidor», el día que se
 * separaran, la verificación estaría comparando tu partida contra otro juego.
 *
 * ⚠️ ESTADO: **el manejador está probado en Node** (`node prueba_funcion.mjs`,
 * con una `Request` sintética: sólo usa APIs web estándar). Lo que **no** está
 * probado es el entorno de Cloudflare — en concreto que `fetch` de un activo
 * del propio sitio traiga `card_library.json`. Si eso fallara, blackjack y
 * póker caerían a su respaldo interno **en silencio**.
 *
 * Por eso el primer gesto tras desplegar es comparar huellas:
 *
 *     curl https://alisa.systems/api/verificar        # las de allí
 *     curl http://127.0.0.1:8020/huella               # las de aquí
 *
 * Si `blackjack` y `poker` no coinciden, el activo no se está leyendo. Es un
 * fallo silencioso con una prueba de una línea, que es como hay que dejarlos.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { verificar, puntuacionDe } from '../../public/arcade/js/protohub/Verificador.js';
import { huellaDeReglas } from '../../public/arcade/js/protohub/huella.js';
// ⚠️ Aquí había ONCE `import` escritos a mano y un objeto `DIRECTOS`. El
// catálogo llegó a dieciséis juegos y esta lista se quedó en once: quien
// jugara una brisca y mandara su partida recibía «no sé jugar a brisca» —
// partida válida, registro equivocado. Ahora sale de la única lista que hay.
import { JUEGOS, TITULOS, cargarReglas } from '../../public/arcade/js/protohub/rules/index.js';

const BIBLIOTECA = '/arcade/data/card_library.json';

const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    // Cualquiera puede pedir que le verifiquen una partida: ese es el punto.
    // No se guarda nada y no se cree nada de lo que llega.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
};

const cache = new Map();

/**
 * ⚠️ DOS FALLOS VIVOS AQUÍ, Y LOS DOS RECHAZABAN PARTIDAS LEGÍTIMAS.
 *
 * Los encontró Fable revisando la arquitectura el 13-08-2026, y los dos son de la
 * peor familia: el verificador diciendo «no» a alguien honrado.
 *
 * 1. EL ALIAS NO LLEGABA A PRODUCCIÓN. `JUEGOS.includes(juego)` se comprobaba
 *    ANTES de llamar a `cargarReglas`, que es quien sabe que `checkers` son las
 *    damas y `chess` el ajedrez. Un recibo de `/arcade/checkers` viaja con
 *    `juego: 'checkers'` —el hub se registra con `idJuego`— y este endpoint
 *    contestaba «no sé jugar a 'checkers'». Es literalmente el epitafio que este
 *    fichero tiene escrito arriba («no sé jugar a brisca»), reencarnado. Yo arreglé
 *    el alias por la mañana en `cargarReglas` y no miré quién más comprobaba la
 *    lista por su cuenta.
 *
 * 2. LA CACHÉ IGNORABA LAS NORMAS. Se guardaba por juego y se cargaba siempre con
 *    las de fábrica. Y esta misma tarde añadí a `verificar` que rechace si las
 *    normas del recibo no son las de las reglas... así que una partida de damas con
 *    `damaVuela` llegaba, no cuadraba, y se rechazaba. Metí la comprobación y no
 *    completé el otro lado: las reglas se construyen DESDE el recibo, o la
 *    comprobación sólo sabe decir que no.
 */
async function reglasDe(juego, urlPeticion, normas) {
    // La clave lleva las normas: dos partidas del mismo juego con reglas distintas
    // no pueden compartir el objeto que las juzga.
    const clave = normas ? `${juego}::${JSON.stringify(Object.entries(normas).sort())}` : juego;
    if (cache.has(clave)) return cache.get(clave);

    // Ruta absoluta al activo del propio sitio: en un Worker no hay disco ni
    // rutas relativas a un fichero. Los juegos que no leen la biblioteca
    // ignoran esta opción.
    const url = new URL(BIBLIOTECA, urlPeticion).href;
    // Se le pide a `cargarReglas` y se juzga por lo que devuelve, en vez de
    // adelantarse con una lista: ella conoce los alias y esta lista no.
    const reglas = await cargarReglas(juego, normas ? { url, normas } : { url });
    if (!reglas) return null;
    cache.set(clave, reglas);
    return reglas;
}

const responder = (codigo, cuerpo) =>
    new Response(JSON.stringify(cuerpo, null, 2), { status: codigo, headers: CABECERAS });

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CABECERAS });
}

/** La huella de las reglas de ESTE lado, para poder compararla con la del tuyo. */
export async function onRequestGet({ request }) {
    const huellas = {};
    for (const juego of JUEGOS) {
        try { huellas[juego] = huellaDeReglas(await reglasDe(juego, request.url)); }
        catch (e) { huellas[juego] = `error: ${e.message}`; }
    }
    return responder(200, { huellas });
}

export async function onRequestPost({ request }) {
    let partida;
    try { partida = await request.json(); }
    catch { return responder(400, { valida: false, motivo: 'JSON inválido' }); }

    const jugadas = partida?.jugadas;
    if (!Array.isArray(jugadas)) {
        return responder(400, { valida: false, motivo: 'faltan las jugadas' });
    }
    // Una partida son unos cientos de bytes. Un tope aquí es lo que separa un
    // servicio abierto de una invitación a tumbarlo.
    if (jugadas.length > 10000) {
        return responder(413, { valida: false, motivo: 'demasiadas jugadas' });
    }

    // Las reglas se montan CON LAS NORMAS DEL RECIBO. Sin esto, una partida de
    // damas con la dama voladora se juzga con las reglas de siempre y se rechaza
    // siendo legítima.
    const reglas = await reglasDe(partida.juego, request.url, partida.normas);
    if (!reglas) {
        return responder(400, {
            valida: false,
            motivo: `no sé jugar a '${partida.juego}'`,
            juegos: JUEGOS,
        });
    }

    const t0 = Date.now();
    let r;
    try { r = verificar(reglas, partida); }
    catch (e) { r = { valida: false, motivo: `las reglas fallaron: ${e.message}` }; }

    // ⚠️ `puntos` es SIEMPRE el recalculado, nunca el que venía en el envío.
    // Devolver aquí el del cliente convertiría todo esto en un adorno caro.
    return responder(200, {
        valida: r.valida,
        puntos: r.puntos,
        motivo: r.motivo ?? null,
        jugadas: r.jugadas,
        declarados: partida.puntos ?? null,
        ms: Date.now() - t0,
    });
}

// Exportado para poder probar el manejador fuera de Cloudflare.
export const _interno = { reglasDe, puntuacionDe };
