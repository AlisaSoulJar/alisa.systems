/**
 * gen_sagas.mjs — la antesala de las sagas, alimentada del mapa DECLARADO
 * ═══════════════════════════════════════════════════════════════════════════
 *     node gen_sagas.mjs   →   public/data/sagas.json
 *
 * ⚠️ LA PRIMERA VERSIÓN DE ESTE FICHERO ERA EL FALLO QUE DENUNCIA.
 *
 * Nació parseando el `<title>` de las páginas de `public/games`, para no escribir
 * una lista a mano. La intención era la correcta y el resultado fue una LISTA
 * PARALELA: el mapa de etapas ya existía dentro de `prueba_sagas.mjs`, y como
 * sólo miré una carpeta, la saga **¡Sobrevive! entera** se quedó fuera de la
 * puerta de los betas — sus dos etapas viven en `labs/`.
 *
 * Lo vio Oscar preguntando por qué faltaban sagas. No lo vio ninguna prueba mía.
 *
 * Ahora el mapa vive en `sagas.mjs`, expuesto, y aquí sólo se MIDE lo que se
 * puede medir de cada etapa. La lista se declara una vez; lo demás se comprueba.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { TODAS } from './sagas.mjs';

const SALIDA = 'public/data/sagas.json';

const etapas = TODAS.map(e => {
    const existe = existsSync(e.pagina);
    const html = existe ? readFileSync(e.pagina, 'utf8') : '';
    return {
        saga: e.saga,
        etapa: e.etapa,
        nombre: e.nombre,
        /** La ruta pública: `public/games/x.html` → `/games/x.html`. */
        pagina: '/' + e.pagina.replace(/^public\//, ''),
        existe,
        /** Si el banco la mide, la opinión de un beta se puede contrastar con una nota. */
        medida: e.medida,
        /**
         * Si publica su mundo, un aviso se puede REPETIR: se repinta la escena
         * exacta que esa persona tenía delante. Sin esto, «se ve raro» es una
         * anécdota. Ver `reportar.js`.
         */
        sustrato: /window\.getSustrato\s*=/.test(html),
        /** Y si no tiene botón, no hay forma de contar nada desde dentro. */
        avisa: html.includes('reportar.js'),
    };
});

const sagas = [...new Set(etapas.map(e => e.saga))].map(nombre => {
    const suyas = etapas.filter(e => e.saga === nombre).sort((a, b) => a.etapa - b.etapa);
    return {
        nombre,
        etapas: suyas,
        conSustrato: suyas.filter(e => e.sustrato).length,
        medidas: suyas.filter(e => e.medida).length,
    };
}).sort((a, b) => b.etapas.length - a.etapas.length);

const salida = {
    _que_es: 'Las sagas y sus etapas. La LISTA se declara en sagas.mjs —una sola vez, '
           + 'compartida con prueba_sagas.mjs—; lo demás se mide leyendo cada página.',
    _por_que: 'La primera versión parseaba títulos y sólo miraba public/games, así que '
            + 'dejó fuera la saga ¡Sobrevive! entera, que vive en labs/. Una lista '
            + 'paralela más en un proyecto que ya ha perdido cinco.',
    sagas,
    total: etapas.length,
};

mkdirSync(path.dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, JSON.stringify(salida, null, 2) + '\n', 'utf8');

console.log(`\n  ${sagas.length} saga(s) · ${etapas.length} etapa(s)`);
for (const s of sagas) {
    console.log(`    ¡${s.nombre}!  ${s.etapas.length} etapas · ${s.medidas} medidas · ${s.conSustrato} con mundo`);
}
const rotas = etapas.filter(e => !e.existe);
for (const r of rotas) console.log(`    ⚠️ ¡${r.saga}! ${r.etapa}: la página no existe — ${r.pagina}`);
const mudas = etapas.filter(e => e.existe && !e.avisa);
for (const m of mudas) console.log(`    ⚠️ ¡${m.saga}! ${m.etapa}: sin botón de aviso`);
console.log(`\n  ✎ ${SALIDA}\n`);
