/**
 * gen_sagas.mjs — qué sagas hay y qué etapas tiene cada una, LEÍDO de las páginas
 * ═══════════════════════════════════════════════════════════════════════════
 *     node gen_sagas.mjs   →   public/data/sagas.json
 *
 * ⚠️ POR QUÉ SE GENERA Y NO SE ESCRIBE.
 *
 * Es la misma razón que `gen_paginas.mjs` deja escrita, y no la voy a repetir
 * mejor de lo que está: este proyecto ha tenido **cinco listas paralelas** —los
 * juegos del README, el escaparate, el catálogo del gym, las barajas, las
 * páginas— y las cinco acabaron separadas de la realidad sin dar un solo error.
 *
 * La antesala de las sagas necesita saber qué hay. Escribirlo sería la sexta.
 *
 * ⚠️ DE DÓNDE SALE: DEL TÍTULO, QUE YA LO DICE.
 *
 * Las páginas se titulan `ALISA — ¡Busca! 4 — City Sector`. Ahí está todo: la
 * saga, el número de etapa y el nombre. No hace falta un fichero de metadatos
 * nuevo que alguien tenga que acordarse de actualizar — hace falta leer lo que ya
 * está escrito.
 *
 * Una página sin ese patrón NO entra. Es a propósito: `asteroid_gauntlet.html`,
 * `chopper_terrarium.html` y `corp_building.html` son versiones viejas o de
 * laboratorio, y meterlas en la puerta de los betas sería mandarles a probar algo
 * que no es la saga. Si algún día deben entrar, se les pone título de saga y
 * entran solas.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const DIR = 'public/games';
const SALIDA = 'public/data/sagas.json';

/** `ALISA — ¡Busca! 4 — City Sector` → saga, etapa, nombre. */
const TITULO = /<title>\s*(?:ALISA\s*[—-]\s*)?¡([^!]+)!\s*(\d+)\s*[—-]\s*([^<]+?)\s*<\/title>/i;

const sagas = new Map();
const fuera = [];

for (const f of readdirSync(DIR).filter(x => x.endsWith('.html')).sort()) {
    const html = readFileSync(path.join(DIR, f), 'utf8');
    const m = TITULO.exec(html);
    if (!m) {
        const t = /<title>([^<]*)<\/title>/i.exec(html);
        fuera.push({ pagina: f, titulo: t ? t[1].trim() : '(sin título)' });
        continue;
    }
    const [, saga, etapa, nombre] = m;

    /**
     * Se apunta si la página publica su sustrato. No es un adorno de depuración:
     * es lo que hace que un aviso de un betatester se pueda REPETIR — sin él,
     * «se ve raro» es una anécdota. Ver `reportar.js`.
     */
    const conSustrato = /window\.getSustrato\s*=/.test(html);

    if (!sagas.has(saga)) sagas.set(saga, []);
    sagas.get(saga).push({
        etapa: Number(etapa),
        nombre: nombre.trim(),
        pagina: `/games/${f}`,
        sustrato: conSustrato,
    });
}

const salida = {
    _que_es: 'Las sagas y sus etapas, leídas del <title> de cada página de public/games. '
           + 'No se escribe a mano: este proyecto ya ha tenido cinco listas paralelas '
           + 'separándose de la realidad sin dar un error.',
    _generado_por: 'node gen_sagas.mjs, dentro de npm run empaquetar',
    sagas: [...sagas.entries()]
        .map(([nombre, etapas]) => ({
            nombre,
            etapas: etapas.sort((a, b) => a.etapa - b.etapa),
            /** Cuántas de sus etapas publican sustrato — o sea, cuántas dan avisos repetibles. */
            conSustrato: etapas.filter(e => e.sustrato).length,
        }))
        .sort((a, b) => b.etapas.length - a.etapas.length),
    /** Lo que NO entra, con su título, para que se vea POR QUÉ y no se olvide. */
    fuera,
};

mkdirSync(path.dirname(SALIDA), { recursive: true });
writeFileSync(SALIDA, JSON.stringify(salida, null, 2) + '\n', 'utf8');

const total = salida.sagas.reduce((s, x) => s + x.etapas.length, 0);
console.log(`\n  ${salida.sagas.length} saga(s) · ${total} etapa(s) · ${fuera.length} página(s) fuera`);
for (const s of salida.sagas) {
    console.log(`    ¡${s.nombre}!  ${s.etapas.length} etapas, ${s.conSustrato} con sustrato`);
}
for (const f of fuera) console.log(`    fuera: ${f.pagina}  «${f.titulo}»`);
console.log(`\n  ✎ ${SALIDA}\n`);
