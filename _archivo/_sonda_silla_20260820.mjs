/**
 * ¿DE DÓNDE SALE EL RUIDO QUE DEJA A REMIGIO, CHINCHÓN Y UNIT FUERA DE LA TABLA?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Sé dos cosas y no encajan:
 *
 *   · la silla pesa una barbaridad — con la política tonta, remigio da −54,5 en la
 *     silla 0 y +131,8 en la 1, medido y anotado en `correr`;
 *   · y sin embargo PAREAR las dos referencias por semilla no baja el ruido nada
 *     (±16,6 → ±16,7), cuando el pareado tendría que cancelar justo eso, porque las
 *     dos juegan la misma semilla en la misma silla.
 *
 * Una de las dos cosas que creo es falsa, así que se mide en vez de razonarla. Se usa
 * el MISMO `jugarEpisodio` que usa la tabla: medir con un arnés propio ya me ha dado
 * hoy un hueco de 114,9 donde la tabla veía 10,5, y la diferencia era el arnés.
 *
 * Se responden tres preguntas:
 *   1. ¿cuánto de la varianza es de la SILLA y cuánto de dentro de la silla?
 *   2. ¿cuánto correlacionan de verdad las dos series pareadas?
 *   3. si cada semilla se jugara en LAS DOS sillas y se promediara, ¿qué hueco y qué
 *      ruido saldrían? Eso es lo que costaría el arreglo, y dice si vale la pena.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);

const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const { cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
const { jugarEpisodio } = await impo('public/arcade/js/agentes/llm.js');
const { POLITICAS } = await impo('public/arcade/js/agentes/politicas.js');

const JUEGOS = process.argv.slice(2).filter(a => !a.startsWith('-'));
const N = 120;                 // semillas, cada una jugada en LAS DOS sillas
const TOPE = 400;

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const varianza = (xs) => {
    if (xs.length < 2) return 0;
    const m = media(xs);
    return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
};
const ic95 = (xs) => 1.96 * Math.sqrt(varianza(xs) / xs.length);

for (const juego of (JUEGOS.length ? JUEGOS : ['remigio', 'chinchon', 'unit', 'domino'])) {
    const e = CATALOGO.find(x => x.juego === juego);
    if (!e) { console.log(`  ${juego}: no está en el catálogo`); continue; }
    const Clase = await e.cargar();
    const reglas = await cargarReglas(juego);

    // serie[politica][silla][semilla]
    const s = { primera: [[], []], casa: [[], []] };
    for (const [nom, hacer] of [['primera', POLITICAS.primera], ['casa', POLITICAS.casa]]) {
        const politica = hacer();
        for (let sem = 1; sem <= N; sem++) {
            for (const asiento of [0, 1]) {
                politica?.sembrar?.(sem * 1000 + asiento);
                const r = await jugarEpisodio(Clase, async () => ({ texto: '1' }),
                    { semilla: sem, tope: TOPE, politica, asiento });
                s[nom][asiento].push(r.error ? 0 : r.puntos);
            }
        }
    }

    console.log(`\n  ${juego.toUpperCase()} · ${N} semillas × 2 sillas`);

    // 1. Cuánto pesa la silla.
    for (const nom of ['primera', 'casa']) {
        const m0 = media(s[nom][0]), m1 = media(s[nom][1]);
        const dentro = (varianza(s[nom][0]) + varianza(s[nom][1])) / 2;
        const entre = ((m0 - m1) / 2) ** 2;
        console.log(`    ${nom.padEnd(8)} silla 0: ${m0.toFixed(1).padStart(8)} · silla 1: ${m1.toFixed(1).padStart(8)}`
                  + `   varianza dentro ${dentro.toFixed(0).padStart(7)} · entre sillas ${entre.toFixed(0).padStart(7)}`);
    }

    // 2. Correlación pareada, por silla (que es como las parea la tabla).
    for (const asiento of [0, 1]) {
        const a = s.primera[asiento], b = s.casa[asiento];
        const ma = media(a), mb = media(b);
        const cov = media(a.map((v, i) => (v - ma) * (b[i] - mb)));
        const r = cov / Math.sqrt(varianza(a) * varianza(b) || 1e-9);
        console.log(`    correlación pareada en la silla ${asiento}: ${r.toFixed(3)}`);
    }

    // 3. Lo que se ganaría promediando las DOS sillas por semilla.
    const comoHoy = [];      // una silla por semilla, alternando: lo que hace la tabla
    const lasDos = [];       // las dos sillas promediadas
    for (let i = 0; i < N; i++) {
        const a = i % 2;
        comoHoy.push(s.casa[a][i] - s.primera[a][i]);
        lasDos.push(((s.casa[0][i] + s.casa[1][i]) - (s.primera[0][i] + s.primera[1][i])) / 2);
    }
    const di = (xs, et) => {
        const h = media(xs), r = ic95(xs);
        console.log(`    ${et.padEnd(26)} hueco ${h.toFixed(1).padStart(8)} ± ${r.toFixed(1).padStart(6)}`
                  + `   ${Math.abs(h) > r ? '✓ separa' : '✗ no separa'}`);
    };
    di(comoHoy, 'como hoy (una silla)');
    di(lasDos, 'las dos sillas por semilla');
}
