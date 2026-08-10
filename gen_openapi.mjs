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
import { writeFile } from 'node:fs/promises';
import { JUEGOS, TITULOS } from './public/arcade/js/protohub/rules/index.js';

const BASE = process.env.ALISA_MESAS ?? 'https://alisa-mesas.prime-6d5.workers.dev';

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

const ruta = process.argv[2] ?? 'public/openapi.json';
await writeFile(ruta, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
console.log(`  openapi: ${JUEGOS.length} juegos, 3 endpoints → ${ruta}`);
