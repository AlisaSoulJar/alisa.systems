/**
 * functions/api/dataset.js — el corpus que no se puede envenenar
 * ═══════════════════════════════════════════════════════════════════════════
 *     POST /api/dataset   { juego, semilla, jugadas, tipo?, quien? }
 *     GET  /api/dataset                → qué hay dentro
 *     GET  /api/dataset?formato=jsonl  → descárgatelo entero
 *
 * POR QUÉ ESTE DATASET ES DISTINTO
 * Los corpus de partidas de este sector se recogen de una de dos formas: te
 * fías de quien los sube, o pones a otro modelo a hacer de juez. Las dos tienen
 * el mismo agujero — alguien tiene que creerse algo.
 *
 * Aquí no. Una fila entra **sólo si este servidor ha vuelto a jugar la partida**
 * con el mismo fichero de reglas que corre en el navegador de quien la jugó. Se
 * guarda la puntuación RECALCULADA, nunca la declarada.
 *
 * Consecuencias, y son grandes:
 *   · nadie puede meter basura: la partida inflada, la jugada ilegal o la
 *     semilla que no cuadra se rechazan solas;
 *   · no hace falta moderación, ni reputación, ni cuentas, ni confianza;
 *   · **se puede abrir a cualquiera** — humano, agente, un desconocido con
 *     `curl`— sin que eso degrade el corpus. Cuanta más gente, mejor, que es
 *     justo lo contrario de lo que le pasa a un dataset que hay que vigilar.
 *
 * Y lo que se guarda es minúsculo: `{juego, semilla, jugadas}`. Con eso y las
 * reglas se reconstruye cualquier estado intermedio, así que guardar el estado
 * sería guardar algo que ya sabemos deducir. Una partida entera son unos
 * cientos de bytes.
 *
 * ⚠️ MÁS `normas`, EN LOS JUEGOS QUE LAS TIENEN VARIABLES.
 *
 * Damas es el primero (`damaVuela`, `peonComeAtras`) y rompe la frase de arriba: con
 * una variable de por medio, `{juego, semilla, jugadas}` YA NO identifica una
 * partida, porque la misma lista es legal con unas normas e ilegal con otras. Sin
 * guardarlas, esas partidas se rechazaban —y peor: las cortas, donde la norma no
 * llega a influir, entraban diciendo haberse jugado con reglas que no eran las
 * suyas—. La columna se añadió el 15-08-2026; las filas anteriores llevan NULL, que
 * significa «por defecto» y es exactamente lo que eran.
 *
 * ⚠️ SE GUARDA LA HUELLA DE LAS REGLAS. Si mañana cambiamos una regla, las
 * filas viejas siguen siendo ciertas — pero de otro juego. Sin esa columna
 * acabaríamos promediando dos juegos distintos creyendo que es uno.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { verificar } from '../../public/arcade/js/protohub/Verificador.js';
import { huellaDeReglas } from '../../public/arcade/js/protohub/huella.js';
import { JUEGOS, cargarReglas } from '../../public/arcade/js/protohub/rules/index.js';

const BIBLIOTECA = '/arcade/data/card_library.json';
const TOPE_JUGADAS = 4000;
const TIPOS = new Set(['persona', 'agente', 'politica']);

const CABECERAS = {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
};
const responder = (codigo, cuerpo, cabeceras = CABECERAS) =>
    new Response(typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo, null, 2),
                 { status: codigo, headers: cabeceras });

/**
 * Las normas variables con las que se jugó, saneadas contra lo que el juego DECLARA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ NO SE GUARDA LO QUE MANDE EL CLIENTE, TAL CUAL.
 *
 * Es el mismo principio que con la puntuación: aquí no se cree nada de lo que llega.
 * Si el cuerpo trae `normas: {loQueSea: true}`, eso no es una norma de damas y no
 * puede acabar en la tabla — ni como dato ni influyendo en la verificación.
 *
 * Se parte de lo que el juego declara en `NORMAS` (con sus valores por defecto) y
 * sólo se sobrescriben las claves que existen ahí. Lo inventado se cae solo.
 *
 * Devuelve `null` si el juego no tiene normas variables, y entonces la columna queda
 * NULL — que es lo que significa: «este juego no las tiene». Las dos filas que ya
 * había en el corpus se quedan igual y siguen siendo ciertas.
 */
function normasSaneadas(reglas, pedidas) {
    if (!reglas?.NORMAS) return null;
    const limpias = { ...reglas.NORMAS };
    if (pedidas && typeof pedidas === 'object') {
        for (const k of Object.keys(reglas.NORMAS)) {
            if (k in pedidas) limpias[k] = !!pedidas[k];
        }
    }
    return limpias;
}

const cache = new Map();
/**
 * ⚠️ AQUÍ HABÍA DOS COMPROBACIONES QUE NO DECÍAN LO MISMO, Y GANABA LA MALA.
 *
 * Estaba `if (!JUEGOS.includes(juego)) return null;` delante de `cargarReglas`.
 * Parece una guarda inofensiva y dejaba fuera a los dos juegos con más betatesters:
 *
 *     checkers.html → { juego: 'damas',   idJuego: 'checkers' }
 *     chess.html    → { juego: 'ajedrez', idJuego: 'chess' }
 *
 * El recibo se lleva el nombre del VISUALIZADOR, así que una partida de damas llega
 * aquí diciendo `juego: 'checkers'` — que no está en `JUEGOS`, porque `JUEGOS` son
 * las claves de las reglas. Resultado: «no sé jugar a 'checkers'», y las damas y el
 * ajedrez no podían entrar en el corpus. Con un mensaje que además culpa al que
 * aporta.
 *
 * `cargarReglas` YA resuelve los dos nombres —lo arregló en su día el mismo fallo
 * en `npm run avisos`— así que la guarda no protegía de nada y sólo contradecía a la
 * comprobación buena. Se quita: si las reglas cargan, se puede jugar; si no, no. Una
 * sola pregunta, hecha donde se sabe la respuesta.
 *
 * Y no abre ninguna puerta: `REGLAS` es un mapa literal, un nombre inventado da
 * `undefined` y de aquí sale `null` igual que antes. No hay ruta que construir.
 */
async function reglasDe(juego, urlPeticion, normas = null) {
    if (!juego || typeof juego !== 'string') return null;
    /**
     * ⚠️ LA CACHÉ VA POR JUEGO **Y NORMAS**, NO POR JUEGO.
     *
     * Estaba indexada sólo por juego, y con la llegada de las normas variables eso
     * pasa de inofensivo a veneno: la primera partida de damas que entrara dejaría
     * sus reglas cacheadas, y la siguiente —jugada con `damaVuela`— se verificaría
     * con las de la anterior. Sin error, sin aviso, y guardando una fila que dice
     * haberse jugado con unas reglas con las que no se comprobó.
     *
     * Es el mismo fallo que ya costó caro dos veces hoy en el cliente, aquí con el
     * agravante de que esto ESCRIBE en el corpus.
     */
    const clave = normas ? `${juego}|${JSON.stringify(normas)}` : juego;
    if (cache.has(clave)) return cache.get(clave);
    const reglas = await cargarReglas(juego, {
        url: new URL(BIBLIOTECA, urlPeticion).href,
        ...(normas ? { normas } : {}),
    });
    if (!reglas) return null;
    cache.set(clave, reglas);
    return reglas;
}

const limpio = (v, tope) =>
    String(v ?? '').replace(/[<>&"'\x00-\x1f\x7f]/g, '').trim().slice(0, tope);

/**
 * La identidad de una partida: el juego, el mundo y lo que se hizo en él.
 *
 * ⚠️ Y LAS NORMAS, CUANDO LAS HAY: SON PARTIDAS DISTINTAS.
 *
 * La firma es UNIQUE, o sea que decide qué cuenta como «esta partida ya estaba». Con
 * normas variables, la misma lista de jugadas jugada con `damaVuela` y sin él son dos
 * partidas diferentes —una puede ser legal y la otra no—, y sin esto la segunda en
 * llegar se rechazaría como duplicada. Se perdería en silencio la mitad del dato que
 * acabamos de añadir la columna para guardar.
 *
 * ⚠️ Y SÓLO SE AÑADEN SI LAS HAY, PARA NO MOVER LAS FIRMAS QUE YA EXISTEN.
 *
 * Las dos filas del corpus se firmaron con el formato viejo. Si esto cambiara el
 * texto para todos, las mismas partidas volverían a entrar como nuevas y tendríamos
 * duplicados que sólo se distinguen por cuándo se guardaron. Los 34 juegos sin normas
 * siguen firmando exactamente igual que ayer.
 */
async function firmaDe(juego, semilla, jugadas, normas = null) {
    const texto = `${juego}|${semilla}|${jugadas.join(',')}`
        + (normas ? `|${JSON.stringify(normas)}` : '');
    const bytes = new TextEncoder().encode(texto);
    const hash = await crypto.subtle.resumir('SHA-256', bytes);
    return [...new Uint8Array(hash)].slice(0, 12)
        .map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function onRequestOptions() {
    return new Response(null, { status: 204, headers: CABECERAS });
}

export async function onRequestPost({ request, env }) {
    if (!env?.DATASET) return responder(503, { guardada: false, motivo: 'sin almacén' });

    let d;
    try { d = await request.json(); }
    catch { return responder(400, { guardada: false, motivo: 'JSON inválido' }); }

    const jugadas = d?.jugadas;
    if (!Array.isArray(jugadas) || !jugadas.length) {
        return responder(400, { guardada: false, motivo: 'faltan las jugadas' });
    }
    if (jugadas.length > TOPE_JUGADAS) {
        return responder(413, { guardada: false, motivo: `demasiadas jugadas (tope ${TOPE_JUGADAS})` });
    }
    const semilla = Number(d?.semilla);
    if (!Number.isFinite(semilla)) {
        return responder(400, { guardada: false, motivo: 'falta la semilla' });
    }
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  LAS NORMAS VARIABLES: SE GUARDAN Y SE VERIFICA CON ELLAS
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Damas es el primer juego con normas variables (`damaVuela`, `peonComeAtras`), y
     * en cuanto existe una variable, `{juego, semilla, jugadas}` deja de identificar
     * una partida: la misma lista es legal con unas normas e ilegal con otras.
     *
     * ⚠️ EL ORDEN IMPORTA: PRIMERO LAS NORMAS, LUEGO LAS REGLAS.
     *
     * Hay que cargar las reglas CON las normas de esa partida, o se verificaría con
     * otras. Por eso se piden dos veces: una para saber qué normas declara el juego
     * —y poder sanear lo que llegó— y otra ya con ellas puestas. La segunda no cuesta
     * nada: el módulo está en memoria.
     *
     * Antes esto rechazaba las partidas con normas cambiadas, porque la tabla no
     * tenía dónde ponerlas. Ya la tiene (`ALTER TABLE partidas ADD COLUMN normas`,
     * 15-08-2026), y las dos filas anteriores se quedan con NULL — que es exactamente
     * lo que eran: normas por defecto.
     */
    const declara = await reglasDe(d?.juego, request.url);
    if (!declara) return responder(400, { guardada: false, motivo: `no sé jugar a '${d?.juego}'`, juegos: JUEGOS });

    const normas = normasSaneadas(declara, d?.normas);
    const reglas = normas ? await reglasDe(d.juego, request.url, normas) : declara;
    if (!reglas) return responder(400, { guardada: false, motivo: `no sé jugar a '${d?.juego}'` });

    // ── LA ÚNICA PUERTA: se vuelve a jugar ──────────────────────────────
    let v;
    try { v = verificar(reglas, { ...d, semilla }); }
    catch (e) { return responder(200, { guardada: false, motivo: `las reglas fallaron: ${e.message}` }); }
    if (!v.valida) {
        // Rechazar NO es un error del servicio: es el servicio funcionando.
        return responder(200, { guardada: false, motivo: v.motivo, puntos: v.puntos });
    }

    const firma = await firmaDe(d.juego, semilla, jugadas, normas);
    const fila = {
        firma, juego: d.juego, semilla: semilla >>> 0,
        jugadas: JSON.stringify(jugadas), n_jugadas: jugadas.length,
        puntos: v.puntos,                       // el RECALCULADO
        reglas: huellaDeReglas(reglas),
        tipo: TIPOS.has(d?.tipo) ? d.tipo : 'desconocido',
        quien: limpio(d?.quien, 24) || null,
        terminada: v.terminada ? 1 : 0,
        fecha: Date.now(),
        // NULL cuando el juego no tiene normas variables — que es lo que significa,
        // y lo que ya dicen las filas anteriores a que existiera esta columna.
        normas: normas ? JSON.stringify(normas) : null,
    };

    try {
        await env.DATASET.prepare(
            `INSERT INTO partidas
               (firma, juego, semilla, jugadas, n_jugadas, puntos, reglas, tipo, quien, terminada, fecha, normas)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
            .bind(fila.firma, fila.juego, fila.semilla, fila.jugadas, fila.n_jugadas,
                  fila.puntos, fila.reglas, fila.tipo, fila.quien, fila.terminada, fila.fecha,
                  fila.normas)
            .run();
    } catch (e) {
        // Misma partida dos veces: no es un fallo, es que ya está.
        if (/UNIQUE/i.test(e.message)) {
            return responder(200, { guardada: false, motivo: 'esta partida ya estaba', firma });
        }
        throw e;
    }
    return responder(201, { guardada: true, firma, puntos: v.puntos, jugadas: fila.n_jugadas });
}

export async function onRequestGet({ request, env }) {
    if (!env?.DATASET) return responder(503, { motivo: 'sin almacén' });
    const url = new URL(request.url);

    // Descarga entera, una partida por línea. Sin paginar, sin clave, sin pedir
    // permiso: un corpus que no puedes bajarte no es un corpus, es una demo.
    if (url.searchParams.get('formato') === 'jsonl') {
        const { results } = await env.DATASET.prepare(
            `SELECT juego, semilla, jugadas, puntos, reglas, tipo, quien, terminada, fecha, normas
               FROM partidas ORDER BY id LIMIT 20000`).all();
        /**
         * ⚠️ LAS NORMAS SALEN COMO OBJETO, Y SI FALTAN NO VA EL CAMPO.
         *
         * Guardarlas y no devolverlas sería tenerlas para nada: quien se descargue el
         * corpus tiene que poder re-simular cada fila, y sin las normas no puede — es
         * el mismo agujero que tenía el enlace del repetidor esta mañana.
         *
         * Y el campo se omite cuando es NULL en vez de mandar `normas: null`, para que
         * una fila de brisca siga teniendo exactamente la forma de siempre. Los
         * consumidores que ya existen no se enteran de nada.
         */
        const cuerpo = results.map(r => {
            const { normas, ...resto } = r;
            return JSON.stringify({
                ...resto,
                jugadas: JSON.parse(r.jugadas),
                terminada: !!r.terminada,
                ...(normas ? { normas: JSON.parse(normas) } : {}),
            });
        }).join('\n');
        return responder(200, cuerpo, {
            ...CABECERAS,
            'content-type': 'application/x-ndjson; charset=utf-8',
            'content-disposition': 'attachment; filename="alisa-partidas.jsonl"',
        });
    }

    const total = await env.DATASET.prepare('SELECT COUNT(*) AS n FROM partidas').first();
    const porJuego = await env.DATASET.prepare(
        `SELECT juego, COUNT(*) AS n, ROUND(AVG(puntos), 2) AS media
           FROM partidas GROUP BY juego ORDER BY n DESC`).all();
    const porTipo = await env.DATASET.prepare(
        `SELECT tipo, COUNT(*) AS n FROM partidas GROUP BY tipo`).all();

    return responder(200, {
        que_es: 'Partidas verificadas: cada fila la ha vuelto a jugar este servidor '
              + 'antes de guardarla. La puntuación es la recalculada, nunca la declarada.',
        como_aportar: 'POST /api/dataset { juego, semilla, jugadas, tipo?, quien?, normas? }',
        descarga: '/api/dataset?formato=jsonl',
        partidas: total?.n ?? 0,
        por_juego: porJuego.results,
        por_tipo: porTipo.results,
    });
}
