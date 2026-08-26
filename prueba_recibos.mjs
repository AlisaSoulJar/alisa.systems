/**
 * prueba_recibos.mjs — ¿VERIFICA UN RECIBO DESDE CUALQUIER SILLA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm test   (va dentro; tarda unos segundos)
 *
 * La frase que sostiene este banco es «toda fila lleva recibo, y lo que no verifica
 * no puntúa». El 20-08-2026 resultó que eso era verdad SÓLO EN LA SILLA 0.
 *
 *     remigio   silla 0: 12/12   silla 1: 0/12
 *     brisca    silla 0: 12/12   silla 1: 1/12   silla 2: 0/12   silla 3: 0/12
 *
 * Todas fallaban igual —«la puntuación no cuadra: dice −3, sale 103»— y esos dos
 * números eran literalmente los de las dos sillas: el recibo guardaba la puntuación
 * de quien jugó y el verificador la releía desde la silla 0, porque `estado(p)` sin
 * segundo argumento cae ahí.
 *
 * ⚠️ Y LO QUE HACE QUE ESTO MEREZCA UN INSTRUMENTO NO ES EL FALLO, ES CÓMO SE VEÍA.
 *
 * La clasificación rota la silla por semilla, así que su contador de recibos ponía
 * `100/200`. Exactamente la mitad. Y un `100/200` se lee como un número normal, no
 * como «la mitad de mis filas están apoyadas en nada». Estuvo así meses. Sólo saltó
 * al hacer que cada semilla se jugara en TODAS las sillas, cuando el contador se
 * desplomó a `1/500` y dejó de poder leerse bien.
 *
 * `npm test` no lo habría cazado ni lo cazaría si volviera: sus 74 trampas se juegan
 * desde la silla 0. Por eso existe esto.
 *
 * ⚠️ Y COMPRUEBA LAS DOS DIRECTIONS, que es lo que separa esta prueba de una que
 * sólo dice que sí: una partida legítima desde cualquier silla tiene que ACEPTARSE,
 * y una con los puntos inflados desde cualquier silla tiene que RECHAZARSE. Sin lo
 * segundo, `verificar` podría devolver `true` a todo y esto seguiría en verde.
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);

const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registry.js');
const { cargarReglas, SILLAS } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');
const { jugarEpisodio } = await impo('public/arcade/js/agentes/llm.js');
const { POLITICAS } = await impo('public/arcade/js/agentes/politicas.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo  = (s) => `\x1b[31m${s}\x1b[0m`;

/** Semillas por silla. Pocas: esto busca un fallo SISTEMÁTICO, no uno raro. */
const SEMILLAS = 3;
const TOPE = 400;

console.log('\n¿Verifica un recibo desde cualquier silla?\n');

let fallos = 0, sillasVistas = 0, aceptadas = 0, cazadas = 0;
const malos = [];

// Sólo los de más de una silla: en un solitario esta prueba no dice nada.
const conVariasSillas = CATALOGO
    .filter(e => e.familia !== 'propio')
    .filter(e => (SILLAS[e.juego] ?? 1) > 1);

for (const e of conVariasSillas) {
    const Clase = await e.cargar();
    const reglas = await cargarReglas(e.juego);
    const sillas = SILLAS[e.juego] ?? 1;
    const politica = POLITICAS.casa();
    const porSilla = [];

    for (let asiento = 0; asiento < sillas; asiento++) {
        let ok = 0, trampas = 0, n = 0;
        let motivo = null;
        for (let s = 1; s <= SEMILLAS; s++) {
            const r = await jugarEpisodio(Clase, async () => ({ texto: '1' }),
                { semilla: s, tope: TOPE, politica, asiento });
            if (r.error || !r.recibo) { motivo ??= r.error ?? 'sin recibo'; n++; continue; }
            n++;
            const v = verificar(reglas, r.recibo);
            if (v.valida) ok++;
            else motivo ??= String(v.motivo ?? v.razon ?? 'sin motivo').slice(0, 70);

            // El control negativo: los mismos puntos, inflados. Tiene que caer.
            const inflado = { ...r.recibo, puntos: Number(r.recibo.puntos ?? 0) + 999 };
            if (!verificar(reglas, inflado).valida) trampas++;
        }
        sillasVistas++;
        aceptadas += ok; cazadas += trampas;
        const bien = ok === n && trampas === n;
        if (!bien) {
            fallos++;
            malos.push(`${e.juego} silla ${asiento}: ${ok}/${n} aceptadas · ${trampas}/${n} trampas cazadas`
                     + (motivo ? ` — ${motivo}` : ''));
        }
        porSilla.push(`${ok}/${n}`);
    }
    const bien = !malos.some(m => m.startsWith(`${e.juego} `));
    console.log(`  ${bien ? verde('✓') : rojo('✗')} ${e.juego.padEnd(11)} ${sillas} sillas · ${porSilla.join(' ')}`);
}

console.log('');
for (const m of malos) console.log(`    ${rojo(m)}`);
console.log(fallos
    ? rojo(`\n✗ ${fallos} silla(s) donde el recibo no vale — y en la 0 sí. Ver la nota de cabecera.\n`)
    : verde(`\n✓ las ${sillasVistas} sillas de ${conVariasSillas.length} juegos: `
          + `${aceptadas} recibos legítimos aceptados y ${cazadas} inflados cazados\n`));
process.exit(fallos ? 1 : 0);
