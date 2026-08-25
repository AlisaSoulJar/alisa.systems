/**
 * ¿PUEDEN LOS BETAS ENTRAR A TODAS LAS SAGAS, Y CONTAR LO QUE VEAN?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_sagas_puerta.mjs
 *
 * `public/juegos/entrar.html` es la antesala de las sagas: la hermana de
 * `arcade/entrar.html`, que reparte mesas. Ésta reparte ¡Busca!, ¡Defiende! y las
 * que vengan.
 *
 * ⚠️ QUÉ VIGILA, Y POR QUÉ CADA COSA.
 *
 * 1. QUE LA LISTA SE GENERE Y NO SE ESCRIBA. Es la regla que `gen_paginas.mjs`
 *    dejó escrita tras cinco listas paralelas que se separaron de la realidad sin
 *    dar un error. Si la puerta guarda copia de los juegos, esta prueba lo dice.
 *
 * 2. QUE CADA ETAPA LISTADA EXISTA. Una puerta que ofrece una página borrada
 *    manda al betatester a un 404, y el betatester no vuelve.
 *
 * 3. QUE TODAS TENGAN BOTÓN DE AVISO. Hasta el 25-08 NINGUNA saga lo tenía:
 *    se podía jugar y no se podía contar nada. Un beta test sin canal de vuelta
 *    es mirar a la gente jugar por un cristal.
 *
 * 4. Y EL TRINQUETE: cuántas etapas publican su mundo. Un aviso sin sustrato es
 *    una anécdota —«se ve raro» y nadie puede repintar la escena—; con él es un
 *    fallo que se arregla. Sólo puede subir.
 */
import { readFileSync, existsSync } from 'node:fs';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Pueden los betas entrar a todas las sagas, y contar lo que vean?\n');

const DATOS = 'public/data/sagas.json';
const PUERTA = 'public/juegos/entrar.html';

if (!existsSync(DATOS)) {
    console.log(`  ✗ falta ${DATOS}. Se genera con \`node gen_sagas.mjs\`.\n`);
    process.exit(1);
}
const d = JSON.parse(readFileSync(DATOS, 'utf8'));
const puerta = readFileSync(PUERTA, 'utf8');
const etapas = d.sagas.flatMap(s => s.etapas.map(e => ({ ...e, saga: s.nombre })));

console.log(`  ${d.sagas.length} saga(s) · ${etapas.length} etapa(s)`);
for (const s of d.sagas) console.log(`    ¡${s.nombre}!  ${s.etapas.length} etapas`);

/** 1. La puerta pide la lista, no la lleva puesta. */
if (!puerta.includes('sagas.json')) {
    mal('la puerta no pide `sagas.json`: se ha traído la lista puesta');
} else {
    /**
     * Y no basta con que la pida: hay que comprobar que no lleve ADEMÁS los
     * nombres escritos. Es exactamente el fallo que tuvo `clasificacion.html`,
     * que se separó ocho días de su JSON con los números dentro del HTML.
     */
    const cuerpo = puerta.replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
    const colados = etapas.filter(e => cuerpo.includes(e.nombre));
    if (colados.length) {
        mal(`la puerta lleva ${colados.length} nombre(s) de etapa escritos: `
          + colados.map(e => e.nombre).join(', '));
    } else {
        console.log('  ✓ la puerta no guarda la lista: la pide');
    }
}

/** 2. Cada etapa ofrecida existe de verdad. */
const rotas = etapas.filter(e => !existsSync(`public${e.pagina}`));
if (rotas.length) mal(`${rotas.length} etapa(s) apuntan a una página que no existe: `
                    + rotas.map(e => e.pagina).join(', '));
else console.log(`  ✓ las ${etapas.length} etapas apuntan a una página que existe`);

/** 3. Todas con botón de aviso. */
const mudas = etapas.filter(e => !readFileSync(`public${e.pagina}`, 'utf8').includes('reportar.js'));
if (mudas.length) {
    mal(`${mudas.length} etapa(s) sin botón de aviso — se puede jugar y no contar nada:`);
    for (const m of mudas) console.log(`      ${m.pagina}`);
} else {
    console.log(`  ✓ las ${etapas.length} etapas llevan botón de aviso`);
}

/**
 * ⚠️ 4. EL TRINQUETE: CUÁNTAS DAN AVISOS REPETIBLES.
 *
 * Medido el 25-08: 2 de 7. Son las dos que pasaron al pintor compartido y
 * publican `window.getSustrato()`. Las otras cinco dibujan desde su sistema y
 * todavía no publican nada, así que sus avisos llegan sin mundo detrás.
 *
 * Sólo puede subir. Baja el día que alguien le quite el sustrato a una página, y
 * entonces esto lo dice — que es justo cuando hace falta saberlo.
 */
const SUELO_SUSTRATO = 2;
const conMundo = etapas.filter(e => e.sustrato);
console.log(`\n  ${conMundo.length} de ${etapas.length} etapas publican su mundo (suelo: ${SUELO_SUSTRATO})`);
console.log(`  repetibles: ${conMundo.map(e => `¡${e.saga}! ${e.etapa}`).join(', ') || '—'}`);
const sinMundo = etapas.filter(e => !e.sustrato);
if (sinMundo.length) {
    console.log(`  avisos sin mundo: ${sinMundo.map(e => `¡${e.saga}! ${e.etapa}`).join(', ')}`);
}
if (conMundo.length < SUELO_SUSTRATO) {
    mal(`el suelo de etapas con mundo ha bajado de ${SUELO_SUSTRATO} a ${conMundo.length}`);
}

console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s) en la puerta de las sagas\n`); process.exit(1); }
console.log('  ✓ la puerta ofrece lo que hay, y desde dentro se puede avisar\n');
