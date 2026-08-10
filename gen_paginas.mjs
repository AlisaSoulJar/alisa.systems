/**
 * gen_paginas.mjs — en qué página se juega cada juego, LEÍDO de las páginas
 * ═══════════════════════════════════════════════════════════════════════════
 *     node gen_paginas.mjs   →   public/data/paginas.json
 *
 * ⚠️ POR QUÉ SE GENERA Y NO SE ESCRIBE
 *
 * La antesala necesita saber a dónde mandar a cada uno: entropy tiene su mesa de
 * casino, el ajedrez su tablero, y los dieciséis juegos nuevos no tienen página
 * propia — se juegan en `mesa.html`, que sirve a los treinta.
 *
 * Escribir ese mapa a mano sería la sexta lista paralela de este proyecto, y las
 * cinco anteriores acabaron todas igual: separadas de la realidad sin dar un
 * error. Los juegos del README, el escaparate, el catálogo del gym, «los veinte
 * juegos» de la página de jugar, las barajas. Un número o un nombre escrito a
 * mano no falla: sólo deja de ser cierto.
 *
 * Aquí se lee lo que cada página YA declara. Las de tablero y la de cartas dicen
 * `montarMesa({ juego: 'entropy', … })`; las viejas, `registrar('chess', …)`.
 * Esa declaración no se puede quedar vieja, porque es la que hace funcionar la
 * página: si alguien la cambia, cambia el juego que se carga.
 *
 * Es el mismo trato que `gen_openapi.mjs` — el contrato sale del código, no de
 * una copia del contrato.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JUEGOS, TITULOS, SILLAS } from './public/arcade/js/protohub/rules/index.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
const ARCADE = join(AQUI, 'public/arcade');

/** La mesa que sirve a los treinta. Quien no tenga página propia, juega aquí. */
const GENERICA = 'mesa.html';

const paginas = {};
for (const f of readdirSync(ARCADE).filter(n => n.endsWith('.html'))) {
    const txt = readFileSync(join(ARCADE, f), 'utf-8');
    // `montarMesa({ juego: 'x' })` en las páginas nuevas; `registrar('x', …)` en
    // las viejas. Se miran las dos porque conviven, no porque dé igual cuál.
    const m = /montarMesa\(\s*\{[^}]*juego:\s*['"]([^'"]+)['"]/.exec(txt)
           ?? /registrar\(\s*['"]([^'"]+)['"]/.exec(txt);
    if (!m) continue;
    const juego = m[1];
    if (!JUEGOS.includes(juego)) continue;   // páginas de algo que ya no existe
    paginas[juego] = f;
}

/**
 * ⚠️ Y LOS QUE NO TIENEN PÁGINA NO SE OMITEN: SE MANDAN A LA GENÉRICA.
 *
 * Omitirlos dejaría a dieciséis juegos fuera de la antesala sin decir por qué —
 * y no están rotos, se juegan perfectamente en `mesa.html`. Un catálogo que
 * esconde la mitad de lo que hay es peor que uno que lo lista todo.
 */
const salida = {};
for (const j of JUEGOS) {
    salida[j] = {
        pagina: paginas[j] ?? GENERICA,
        propia: !!paginas[j],
        titulo: TITULOS[j] ?? j,
        sillas: SILLAS[j] ?? null,
    };
}

const destino = join(AQUI, 'public/data/paginas.json');
writeFileSync(destino, JSON.stringify(salida, null, 2) + '\n', 'utf-8');

const propias = Object.values(salida).filter(v => v.propia).length;
console.log(`\n  ${JUEGOS.length} juegos · ${propias} con página propia · `
          + `${JUEGOS.length - propias} en ${GENERICA}`);
console.log(`  → public/data/paginas.json\n`);
