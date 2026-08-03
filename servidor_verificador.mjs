/**
 * servidor_verificador.mjs — la puntuación deja de ser un informe
 * ═══════════════════════════════════════════════════════════════════════════
 *     node servidor_verificador.mjs [puerto]      # 8020 por defecto
 *
 *     POST /verificar   { juego, semilla, jugadas, puntos }
 *                    →  { valida, puntos, motivo, jugadas, ms }
 *     GET  /juegos      → los juegos que este servidor sabe re-simular
 *
 * POR QUÉ ESTO, Y POR QUÉ AHORA
 * -----------------------------
 * En abril de 2026 se demostró que los ocho grandes bancos de pruebas de
 * agentes se podían reventar hasta ~100 %, y se encontraron trampas en nueve de
 * ellos: agentes leyendo el directorio `/tests`, claves de respuestas metidas
 * en el prompt, soluciones bajadas de writeups, demostraciones falsificadas.
 *
 * El remedio del sector es **mandar la traza y que un juez la mire**. O sea,
 * un LLM opinando si un registro *parece* limpio.
 *
 * Aquí no se envía una puntuación: se envía la semilla y las jugadas, y **el
 * servidor la vuelve a jugar**. No es «¿esto parece limpio?», es «¿esta partida
 * existe?». Cuesta milisegundos y no admite opinión.
 *
 * LA REGLA DE ORO: UN SOLO FICHERO DE REGLAS
 * ------------------------------------------
 * Este servidor importa EXACTAMENTE los mismos módulos que juega el navegador,
 * `public/arcade/js/protohub/rules/*.js`. No hay una versión de servidor. Si
 * hubiera dos implementaciones acabarían divergiendo, y una verificación que
 * usa reglas distintas de las que jugaste no verifica nada: miente con más
 * ceremonia.
 *
 * ⚠️ EL PARCHE DE `fetch` NO ES UN ADORNO
 * Dos módulos (blackjack y póker) leen `card_library.json` con
 * `fetch(new URL(..., import.meta.url))`. En el navegador eso es HTTP; en Node
 * es `file://`, y el `fetch` de Node **no sirve ficheros locales**: lanza. Los
 * módulos tienen un respaldo interno y habrían seguido funcionando **en
 * silencio, con otra baraja** — o sea, el servidor verificaría con reglas
 * distintas de las del navegador y las partidas legítimas saldrían inválidas.
 * Un fallo así no se ve: se nota meses después en forma de quejas.
 * Por eso se enseña a `fetch` a leer `file://` en vez de tocar las reglas.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const REGLAS = path.join(AQUI, 'public', 'arcade', 'js', 'protohub', 'rules');

// ── `fetch` que también entiende ficheros locales ────────────────
const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    const datos = await readFile(fileURLToPath(url), 'utf-8');
    return new Response(datos, { status: 200,
        headers: { 'content-type': 'application/json' } });
};

// ── los mismos módulos que juega el navegador ────────────────────
const { verificar } = await import(
    pathToFileURL(path.join(REGLAS, '..', 'Verificador.js')).href);
const { huellaDeReglas } = await import(
    pathToFileURL(path.join(REGLAS, '..', 'huella.js')).href);

/** juego → cómo se obtiene su módulo de reglas. */
const CATALOGO = {
    ajedrez:   { fichero: 'ajedrez.js',   exporta: 'ajedrez' },
    go:        { fichero: 'go.js',        exporta: 'go' },
    reversi:   { fichero: 'reversi.js',   exporta: 'reversi' },
    damas:     { fichero: 'damas.js',     exporta: 'damas' },
    xiangqi:   { fichero: 'xiangqi.js',   exporta: 'xiangqi' },
    mancala:   { fichero: 'mancala.js',   exporta: 'mancala' },
    snake:     { fichero: 'snake.js',     exporta: 'snake' },
    fagocito:  { fichero: 'fagocito.js',  exporta: 'fagocito' },
    peaton:    { fichero: 'peaton.js',    exporta: 'peaton' },
    blackjack: { fichero: 'blackjack.js', crea: 'crearBlackjack' },
    poker:     { fichero: 'poker.js',     crea: 'crearPoker' },
};

const cache = new Map();
async function reglasDe(juego) {
    if (cache.has(juego)) return cache.get(juego);
    const c = CATALOGO[juego];
    if (!c) return null;
    const mod = await import(pathToFileURL(path.join(REGLAS, c.fichero)).href);
    const reglas = c.crea ? await mod[c.crea]() : mod[c.exporta];
    cache.set(juego, reglas);
    return reglas;
}

// ── el servidor ──────────────────────────────────────────────────
const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    // Cualquiera puede pedir que le verifiquen una partida: ese es el punto.
    // No hay nada que proteger — no se guarda nada y no se cree nada.
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
};

function responder(res, codigo, cuerpo) {
    res.writeHead(codigo, CABECERAS);
    res.end(JSON.stringify(cuerpo, null, 2));
}

/**
 * LA HUELLA DE LAS REGLAS — cómo se sabe que los dos lados juegan a lo mismo.
 *
 * «Un solo fichero de reglas» es una promesa, y las promesas se rompen solas.
 * Medido hoy: blackjack reparte las mismas cartas con biblioteca o con el
 * respaldo interno, así que ahora mismo coinciden. Pero el respaldo es una
 * COPIA de los valores de `card_library.json`, y las copias se separan: el día
 * que alguien ponga 8 barajas en la biblioteca, el navegador jugará con 8 y
 * este servidor verificará con 6. Todas las partidas legítimas empezarían a
 * salir inválidas y nadie sabría por qué.
 *
 * Así que se publica una huella: la partida inicial de cada juego con la misma
 * semilla. El navegador calcula la suya y las compara. Si divergen, se ve el
 * primer día en vez de en forma de quejas.
 */
async function huellas() {
    const out = {};
    for (const juego of Object.keys(CATALOGO)) {
        try { out[juego] = huellaDeReglas(await reglasDe(juego)); }
        catch (err) { out[juego] = `error: ${err.message}`; }
    }
    return out;
}

const servidor = http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') return responder(res, 204, {});

    if (req.method === 'GET' && req.url.startsWith('/juegos')) {
        return responder(res, 200, { juegos: Object.keys(CATALOGO) });
    }

    if (req.method === 'GET' && req.url.startsWith('/huella')) {
        return responder(res, 200, { huellas: await huellas() });
    }

    if (req.method !== 'POST' || !req.url.startsWith('/verificar')) {
        return responder(res, 404, { error: 'usa POST /verificar' });
    }

    let crudo = '';
    for await (const trozo of req) {
        crudo += trozo;
        // Una partida son unos cientos de bytes. Cualquier cosa por encima de
        // esto no es una partida: es alguien probando a ver qué pasa.
        if (crudo.length > 512 * 1024) {
            return responder(res, 413, { valida: false, motivo: 'envío demasiado grande' });
        }
    }

    let partida;
    try { partida = JSON.parse(crudo || '{}'); }
    catch { return responder(res, 400, { valida: false, motivo: 'JSON inválido' }); }

    const reglas = await reglasDe(partida.juego);
    if (!reglas) {
        return responder(res, 400, {
            valida: false,
            motivo: `no sé jugar a '${partida.juego}'`,
            juegos: Object.keys(CATALOGO),
        });
    }

    const t0 = performance.now();
    let r;
    // Las reglas son de terceros desde el punto de vista de este proceso: una
    // partida rara no puede tumbar el servidor de todo el mundo.
    try { r = verificar(reglas, partida); }
    catch (e) { r = { valida: false, motivo: `las reglas fallaron: ${e.message}` }; }
    const ms = +(performance.now() - t0).toFixed(2);

    // ⚠️ `puntos` es SIEMPRE el recalculado, nunca el que venía en el envío.
    // Devolver el del cliente aquí convertiría todo esto en un adorno caro.
    responder(res, 200, {
        valida: r.valida,
        puntos: r.puntos,
        motivo: r.motivo ?? null,
        jugadas: r.jugadas,
        declarados: partida.puntos ?? null,
        ms,
    });
});

const puerto = Number(process.argv[2]) || 8020;
servidor.listen(puerto, '127.0.0.1', () => {
    console.log(`  verificador  ->  http://127.0.0.1:${puerto}/verificar`);
    console.log(`  juegos: ${Object.keys(CATALOGO).join(', ')}`);
});
