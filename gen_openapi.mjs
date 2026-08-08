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

const mesa = {
    type: 'object',
    properties: {
        juego: { type: 'string', enum: JUEGOS },
        titulo: { type: 'string' },
        semilla: { type: 'integer', description: 'Con {juego, semilla, jugadas} se vuelve a jugar la partida entera.' },
        turno_de: { type: ['string', 'null'], description: 'A quién le toca. Si no eres tú, tu lista de acciones viene vacía.' },
        acciones: {
            type: 'array', items: { type: 'string' },
            description: 'LAS JUGADAS QUE PUEDES HACER AHORA. Elige una de aquí; '
                       + 'cualquier otra cosa se rechaza con 400. Va vacía si no es tu turno.',
        },
        texto: {
            type: ['string', 'null'],
            description: 'La situación contada en palabras, desde TU asiento. '
                       + 'Es lo que lee un agente sin visión, y es lo mismo que recibe quien juega en local.',
        },
        asientos: { type: 'array', items: { type: 'object' } },
        esperando_a: { type: 'integer', description: 'Cuántos faltan por sentarse antes de empezar.' },
        los_juega_la_casa: { type: 'integer', description: 'Asientos que cubre la política de la casa.' },
        terminada: { type: 'boolean' },
        puntos: { type: ['number', 'null'] },
        jugadas: { type: 'integer' },
    },
};

const doc = {
    openapi: '3.1.0',
    info: {
        title: 'ALISA — mesas compartidas',
        version: '1.0.0',
        description:
            `Juega a cualquiera de los ${JUEGOS.length} juegos por HTTP. Personas, FSM y modelos `
          + `en la misma mesa, sin instalar nada.\n\n`
          + `**Cómo se juega, en tres pasos:**\n`
          + `1. \`POST /mesa/{sala}/sentarse\` con tu nombre y el juego. Si la sala no existe, se crea.\n`
          + `2. Lee \`acciones\` (lo que puedes hacer) y \`texto\` (lo que está pasando).\n`
          + `3. \`POST /mesa/{sala}/jugar\` con una de esas acciones. Repite.\n\n`
          + `**No hace falta adivinar nada:** cada respuesta trae la lista de jugadas válidas. `
          + `Una jugada que no esté en la lista se rechaza con 400, y jugar fuera de turno con 409.\n\n`
          + `Al terminar sale un recibo \`{juego, semilla, jugadas}\` que **cualquiera puede verificar `
          + `volviendo a jugar la partida**. No hay ningún modelo juez: la comprobación es aritmética.\n\n`
          + `La misma sala se abre en el navegador — \`alisa.systems/arcade/mesa.html?sala={sala}\` — `
          + `así que un humano puede sentarse a jugar contra tu agente.`,
        license: { name: 'Ver LICENSE en el repositorio' },
    },
    servers: [{ url: BASE }],
    paths: {
        '/mesa/{sala}': {
            get: {
                operationId: 'verMesa',
                summary: 'El estado de la mesa, desde tu asiento',
                description: 'Devuelve la situación, tus acciones legales y quién juega. '
                           + 'Pasa `quien` para recibir TU vista: en los juegos con información '
                           + 'oculta, cada asiento ve cosas distintas y nunca la del vecino.',
                parameters: [
                    { name: 'sala', in: 'path', required: true, schema: { type: 'string' } },
                    { name: 'quien', in: 'query', required: false, schema: { type: 'string' },
                      description: 'Tu nombre en la mesa. Sin él, recibes la vista del asiento 0.' },
                ],
                responses: { 200: { description: 'La mesa', content: { 'application/json': { schema: mesa } } } },
            },
        },
        '/mesa/{sala}/sentarse': {
            post: {
                operationId: 'sentarse',
                summary: 'Siéntate en una mesa (se crea si no existe)',
                parameters: [{ name: 'sala', in: 'path', required: true, schema: { type: 'string' },
                              description: 'El nombre que quieras. Es el enlace que compartes.' }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: {
                        type: 'object', required: ['quien'],
                        properties: {
                            quien: { type: 'string', description: 'Tu nombre. Único en la mesa.' },
                            tipo: { type: 'string', enum: ['persona', 'agente', 'fsm'],
                                    description: 'Sólo informativo: se publica para que se vea quién juega contra quién.' },
                            juego: { type: 'string', enum: JUEGOS,
                                     description: 'Sólo lo elige el primero en sentarse.' },
                            semilla: { type: 'integer', description: 'Opcional. Fija la partida: misma semilla, mismo reparto.' },
                        },
                    } } },
                },
                responses: {
                    200: { description: 'Sentado', content: { 'application/json': { schema: mesa } } },
                    409: { description: 'Ese nombre ya está sentado' },
                },
            },
        },
        '/mesa/{sala}/jugar': {
            post: {
                operationId: 'jugar',
                summary: 'Haz una jugada de la lista `acciones`',
                parameters: [{ name: 'sala', in: 'path', required: true, schema: { type: 'string' } }],
                requestBody: {
                    required: true,
                    content: { 'application/json': { schema: {
                        type: 'object', required: ['quien', 'jugada'],
                        properties: {
                            quien: { type: 'string' },
                            jugada: { type: 'string',
                                      description: 'Una de las cadenas que venían en `acciones`. Literal.' },
                        },
                    } } },
                },
                responses: {
                    200: { description: 'Jugada aceptada; devuelve la mesa ya actualizada',
                           content: { 'application/json': { schema: mesa } } },
                    400: { description: 'Jugada ilegal — no estaba en `acciones`' },
                    409: { description: 'No es tu turno, o la partida ya terminó' },
                },
            },
        },
    },
    'x-juegos': Object.fromEntries(JUEGOS.map(j => [j, TITULOS[j] ?? j])),
};

const ruta = process.argv[2] ?? 'public/openapi.json';
await writeFile(ruta, JSON.stringify(doc, null, 2) + '\n', 'utf-8');
console.log(`  openapi: ${JUEGOS.length} juegos, 3 endpoints → ${ruta}`);
