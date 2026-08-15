/**
 * gen_openapi.mjs — el contrato de la mesa, para que juegue cualquier agente
 * ═══════════════════════════════════════════════════════════════════════════
 * Tres endpoints. Con esto, un framework de agentes se conecta solo, y un
 * envoltorio MCP se genera desde aquí sin escribir una línea.
 *
 * ⚠️ SE GENERA, NO SE ESCRIBE.
 * La lista de juegos sale de `rules/index.js`, la misma que usan el navegador,
 * el arnés, el verificador y el árbitro. Un contrato copiado a mano se separa
 * del servidor en la primera semana y entonces miente con toda la autoridad de
 * un documento oficial — que es peor que no tenerlo.
 *
 * ⚠️ Y `legal_moves` ES EL `enum` DEL PARÁMETRO.
 * No lo diseñamos para esto: sale de que las jugadas sean enumerables, que es la
 * decisión que también impide que una persona pulse un botón inexistente y que
 * un modelo alucine una jugada. Un agente no tiene que adivinar el formato —
 * cada respuesta le trae la lista de lo que puede pedir a continuación.
 */
import { writeFile, readdir, readFile } from 'node:fs/promises';
import { JUEGOS, TITULOS } from './public/arcade/js/protohub/rules/index.js';

const BASE = process.env.ALISA_MESAS ?? 'https://alisa-mesas.prime-6d5.workers.dev';
const SITIO = 'https://alisa.systems';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LAS PUERTAS TAMBIÉN SE DERIVAN. ANTES SE ESCRIBÍAN A MANO Y FALTABAN CINCO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Arriba está escrito que un contrato copiado a mano se separa del servidor en la
 * primera semana. Esa doctrina se aplicó a la LISTA DE JUEGOS —que sale de
 * `rules/index.js`— y no a las RUTAS, que iban escritas aquí una a una.
 *
 * Resultado medido el 15-08-2026: el documento declaraba TRES puertas y el sitio
 * servía OCHO. Faltaban las cuatro `/api/*` —incluida `/api/gym`, que es justo por
 * donde entraría un agente, y `/api/verificar`, que es toda la historia de que aquí
 * una partida se vuelve a jugar— y el buzón de avisos del árbitro.
 *
 * Y es peor que no tener contrato: quien lo lee cree que ya lo ha visto todo y no
 * busca más. La razón de publicarlo es que alguien escriba un cliente sin leerse
 * nuestro código; uno incompleto no ahorra ese trabajo, lo esconde.
 *
 * Ahora las `/api/*` se leen de la CARPETA —Cloudflare Pages publica cada
 * `functions/api/<x>.js` en `/api/<x>`, así que el disco es la verdad— y las del
 * árbitro de los `accion === '...'` de su código. Una puerta nueva aparece sola.
 *
 * Lo que sigue a mano es la DESCRIPCIÓN, que ninguna máquina puede adivinar. Y una
 * puerta sin descripción sale igualmente, diciendo que le falta: es mejor una línea
 * fea en el contrato que una puerta invisible.
 */
const DESCRITAS = {
    '/api/gym': {
        get: ['gymHelp', 'What this is and how to play it',
              'Returns its own instructions, so an agent that lands here does not have to read our source to take the first step.'],
        post: ['gymStep', 'Send the whole match; it is replayed from the seed',
               'The stateless door, and the one an agent wants when there is nobody else to wait for. You send `{juego, semilla, jugadas}` — the entire match, not a delta — and the server replays it from scratch and answers with the position after it.\n\n**The score is never sent, only recomputed.** There is no session and nothing to trust: the same three fields always produce the same answer, so a run is reproducible by anyone and cheating consists of nothing.\n\n`acciones` is the list of legal moves right now. Append one to `jugadas` and post again.'],
    },
    '/api/verificar': {
        post: ['verify', 'Replay a receipt and say whether it holds',
               'Give it `{juego, semilla, jugadas}` and it plays the match again to see if every move was legal and what the score really was. There is no judge model: the check is arithmetic, and anyone can run it against a receipt they did not produce.\n\n`declarados` is what the sender claimed; `puntos` is what the replay found. When they differ, the replay wins.'],
    },
    '/api/dataset': {
        get: ['datasetInfo', 'The corpus of verified matches',
              'Every row was replayed by this server before being stored, and the score kept is the recomputed one — never the declared one.'],
        post: ['datasetContribute', 'Contribute a match',
               'Send `{juego, semilla, jugadas, tipo}`. It is replayed before being accepted; if the replay disagrees, it is not stored. `tipo` says who played — person, agent or policy — so the table can compare like with like.'],
    },
    '/api/presencia': {
        get: ['presence', 'Who is at the arcade right now',
              'People, agents and policies currently playing, split by kind.'],
        post: ['presenceAnnounce', 'Announce yourself',
               'Send `{nombre, tipo}` to appear in the list. `tipo` defaults to person.'],
    },
    '/mesa/{sala}/reporte': {
        post: ['report', 'Report something odd, with the receipt attached',
               'The «¿algo va raro?» button of the arcade. It sends the comment together with `{juego, semilla, jugadas}`, so a complaint from a stranger becomes a match anybody can replay. That is the difference between an anecdote and a bug report.'],
    },
};

/** Las puertas que existen de verdad, leídas del disco. */
async function puertasReales() {
    const rutas = new Set();
    for (const f of await readdir('./functions/api').catch(() => [])) {
        if (f.endsWith('.js')) rutas.add(`/api/${f.replace(/\.js$/, '')}`);
    }
    const arbitro = await readFile('./worker-mesas/mesas.js', 'utf-8').catch(() => '');
    for (const m of arbitro.matchAll(/accion === '(\w+)'/g)) {
        // `reportes` es el plural de `reporte` y comparten manejador: una puerta.
        if (m[1] !== 'reportes') rutas.add(`/mesa/{sala}/${m[1]}`);
    }
    return rutas;
}

/** El bloque de una puerta: su descripción si la tiene, y si no un aviso honesto. */
function bloqueDe(ruta) {
    const d = DESCRITAS[ruta];
    if (!d) {
        return {
            post: {
                operationId: ruta.replace(/[^a-z]+/gi, '_'),
                summary: 'Undocumented door',
                description: 'This endpoint exists but nobody has described it yet. '
                           + 'It is listed because a door you cannot see is worse than one described badly.',
                responses: { '200': { description: 'Undocumented.' } },
            },
        };
    }
    const fuera = {};
    for (const [metodo, [operationId, summary, description]] of Object.entries(d)) {
        fuera[metodo] = { operationId, summary, description,
                          responses: { '200': { description: summary } } };
    }
    return fuera;
}

/**
 * ⚠️ ESTA PUERTA HABLA INGLÉS, Y CON LOS NOMBRES QUE EL ESTADO YA USA.
 *
 * Publicaba `acciones`, `turno_de`, `terminada`, `puntos` — mientras el estado
 * que hay detrás publica `legal_moves`, `turn`, `is_game_over`, `score`. Los
 * mismos datos con dos vocabularios según por qué puerta entres, y un agente que
 * jugara por HTTP y luego por el gym tenía que aprenderse las dos tablas.
 *
 * No es una traducción por quedar bien: es que ya HABÍA un vocabulario canónico
 * —el que entiende cualquiera que haya visto un entorno de gym— y esta puerta se
 * lo saltaba. Ahora las dos dicen lo mismo, que es lo que hace que se puedan
 * comparar las filas de la tabla.
 *
 * `text` se queda como `text` y no como `observation`: es literalmente texto para
 * leer, y llamarlo observación sugeriría un vector.
 */
const mesa = {
    type: 'object',
    properties: {
        game: { type: 'string', enum: JUEGOS },
        title: { type: 'string' },
        seed: { type: 'integer', description: 'With {game, seed, moves} the whole match can be replayed.' },
        turn: { type: ['string', 'null'], description: 'Whose turn it is. If it is not yours, your legal_moves comes back empty.' },
        legal_moves: {
            type: 'array', items: { type: 'string' },
            description: 'THE MOVES YOU CAN MAKE RIGHT NOW. Pick one of these; '
                       + 'anything else is rejected with 400. Empty when it is not your turn.',
        },
        text: {
            type: ['string', 'null'],
            description: 'The situation in words, from YOUR seat. '
                       + 'This is what a sightless agent reads, and it is the same text a local player gets.',
        },
        seats: { type: 'array', items: { type: 'object' } },
        waiting_for: { type: 'integer', description: 'How many players are still missing before the match starts.' },
        played_by_house: { type: 'integer', description: 'Seats covered by the house policy.' },
        is_game_over: { type: 'boolean' },
        score: { type: ['number', 'null'] },
        moves: { type: 'integer', description: 'How many moves have been played so far.' },
    },
};

const doc = {
    openapi: '3.1.0',
    info: {
        title: 'ALISA — shared tables',
        version: '2.0.0',
        description:
            `Play any of the ${JUEGOS.length} games over HTTP. Humans, state machines and models `
          + `at the same table, with nothing to install.\n\n`
          + `**Three steps:**\n`
          + `1. \`POST /mesa/{sala}/sentarse\` with your name and the game. The room is created if it does not exist.\n`
          + `2. Read \`legal_moves\` (what you can do) and \`text\` (what is going on).\n`
          + `3. \`POST /mesa/{sala}/jugar\` with one of those moves. Repeat.\n\n`
          + `**Nothing to guess:** every response carries the list of valid moves. `
          + `A move that is not on the list is rejected with 400, and playing out of turn with 409.\n\n`
          + `When the match ends you get a receipt \`{game, seed, moves}\` that **anyone can verify by `
          + `replaying the match**. There is no judge model: the check is arithmetic.\n\n`
          + `The same room opens in a browser — \`alisa.systems/arcade/mesa.html?sala={sala}\` — `
          + `so a human can sit down against your agent.`,
        license: { name: 'See LICENSE in the repository' },
    },
    servers: [{ url: BASE }],
    paths: {
        /**
         * ⚠️ LAS RUTAS SE QUEDAN EN CASTELLANO, Y NO ES INCOHERENCIA.
         *
         * Una ruta no es un nombre: es una dirección que ya circula. `/mesa/…`
         * está en enlaces compartidos, en el worker desplegado y en las salas que
         * hay abiertas ahora mismo. Cambiarla rompe partidas en curso a cambio de
         * nada — un agente lee la ruta del propio contrato, no la escribe de
         * memoria.
         *
         * Lo que sí importa que hable un solo idioma son los CAMPOS, porque son
         * los que un agente compara entre esta puerta y la del gym.
         */
        '/mesa/{sala}': {
            get: {
                operationId: 'getTable',
                summary: 'The state of the table, from your seat',
                description: 'Returns the situation, your legal moves and whose turn it is. '
                           + 'Pass `quien` to get YOUR view: in games with hidden information '
                           + 'each seat sees different things, and never its neighbour\'s.',
                parameters: [
                    { name: 'sala', in: 'path', required: true, schema: { type: 'string' },
                      description: 'Room name.' },
                    { name: 'quien', in: 'query', required: false, schema: { type: 'string' },
                      description: 'Your name at the table. Without it you get seat 0\'s view.' },
                ],
                responses: { 200: { description: 'The table', content: { 'application/json': { schema: mesa } } } },
            },
        },
        '/mesa/{sala}/sentarse': {
            post: {
                operationId: 'sitDown',
                summary: 'Sit at a table (created if it does not exist)',
                parameters: [{ name: 'sala', in: 'path', required: true, schema: { type: 'string' },
                              description: 'Any name you like. It is the link you share.' }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: {
                        type: 'object', required: ['quien'],
                        properties: {
                            quien: { type: 'string', description: 'Your name. Unique at the table.' },
                            tipo: { type: 'string', enum: ['persona', 'agente', 'fsm'],
                                    description: 'Informative only: published so everyone sees who plays whom.' },
                            juego: { type: 'string', enum: JUEGOS,
                                     description: 'Only the first player to sit chooses it.' },
                            semilla: { type: 'integer', description: 'Optional. Fixes the match: same seed, same deal.' },
                        },
                    } } },
                },
                responses: {
                    200: { description: 'Seated', content: { 'application/json': { schema: mesa } } },
                    409: { description: 'That name is already seated, or the table is full' },
                },
            },
        },
        '/mesa/{sala}/jugar': {
            post: {
                operationId: 'play',
                summary: 'Make one of the moves listed in `legal_moves`',
                parameters: [{ name: 'sala', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: {
                        type: 'object', required: ['quien', 'jugada', 'secreto'],
                        properties: {
                            quien: { type: 'string' },
                            jugada: { type: 'string',
                                      description: 'One of the strings that came in `legal_moves`. Verbatim.' },
                            secreto: { type: 'string',
                                       description: 'The token the table handed you when you sat down. '
                                                  + 'Without it the seat is not yours: saying your name is not proving it.' },
                        },
                    } } },
                },
                responses: {
                    200: { description: 'Move accepted; returns the updated table',
                           content: { 'application/json': { schema: mesa } } },
                    400: { description: 'Illegal move — it was not in `legal_moves`' },
                    403: { description: 'That seat is not yours: missing or wrong `secreto`' },
                    409: { description: 'Not your turn, or the match is already over' },
                },
            },
        },
    },
    'x-games': Object.fromEntries(JUEGOS.map(j => [j, TITULOS[j] ?? j])),
};

/**
 * Y se añaden las que existen y no estaban. Las escritas arriba a mano se dejan
 * como están: llevan sus esquemas completos, que es más de lo que esto sabe poner.
 */
const reales = await puertasReales();
let añadidas = 0;
for (const r of [...reales].sort()) {
    if (doc.paths[r]) continue;
    doc.paths[r] = bloqueDe(r);
    añadidas++;
}
// Y el segundo servidor, que es donde viven las `/api/*`. Sin él, un cliente
// generado desde este documento pediría `/api/gym` al worker de mesas.
if ([...reales].some(r => r.startsWith('/api/'))) {
    doc.servers.push({
        url: SITIO,
        description: 'The site itself: the stateless gym, the verifier, the corpus '
                   + 'and presence. No room, no seat, no waiting for anyone.',
    });
}

const ruta = process.argv[2] ?? 'public/openapi.json';
await writeFile(ruta, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
const sinDescribir = [...reales].filter(r => !DESCRITAS[r] && !r.match(/^\/mesa\/\{sala\}(\/(sentarse|jugar))?$/));
console.log(`  openapi: ${JUEGOS.length} juegos, ${Object.keys(doc.paths).length} puertas`
          + ` (${añadidas} derivadas del disco) → ${ruta}`);
if (sinDescribir.length) {
    console.log(`  ⚠ sin describir: ${sinDescribir.join(', ')} — salen listadas, pero`);
    console.log(`    una puerta con descripción de relleno es media puerta.`);
}
