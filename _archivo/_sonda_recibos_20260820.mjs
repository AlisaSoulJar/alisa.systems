/**
 * ¿VERIFICAN LOS RECIBOS DE LAS SILLAS QUE NO SON LA 0?
 *
 * Al hacer que cada semilla se juegue en TODAS las sillas, el contador de recibos
 * pasó de `100/200` a `1/500`. Y ese 100/200 es exactamente la MITAD — que es justo
 * la proporción de semillas que caían en la silla 0 con la rotación de antes.
 *
 * O sea que la sospecha es fea: los recibos de la silla 1 no verifican, nunca han
 * verificado, y el contador lo enseñaba como un 50 % que nadie leyó como un fallo.
 * En un banco cuya frase es «toda fila lleva recibo; lo que no verifica, no puntúa»,
 * eso sería la mitad de las filas apoyadas en nada.
 *
 * Se comprueba silla por silla y se dice el MOTIVO, que es lo que distingue «el
 * recibo está mal» de «el verificador no sabe leer una partida desde otra silla».
 */
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);

const { CATALOGO } = await impo('public/js/alisa-engine/src/gym/registro.js');
const { cargarReglas, SILLAS } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');
const { jugarEpisodio } = await impo('public/arcade/js/agentes/llm.js');
const { POLITICAS } = await impo('public/arcade/js/agentes/politicas.js');

const juegos = process.argv.slice(2).filter(a => !a.startsWith('-'));

for (const juego of (juegos.length ? juegos : ['remigio', 'domino', 'brisca', 'ajedrez'])) {
    const e = CATALOGO.find(x => x.juego === juego);
    if (!e) continue;
    const Clase = await e.cargar();
    const reglas = await cargarReglas(juego);
    const sillas = SILLAS[juego] ?? 1;
    const politica = POLITICAS.casa();

    const por = [];
    for (let asiento = 0; asiento < sillas; asiento++) {
        let ok = 0, n = 0;
        const motivos = new Set();
        for (let s = 1; s <= 12; s++) {
            const r = await jugarEpisodio(Clase, async () => ({ texto: '1' }),
                { semilla: s, tope: 400, politica, asiento });
            if (r.error || !r.recibo) { motivos.add(r.error ?? 'sin recibo'); n++; continue; }
            const v = verificar(reglas, r.recibo);
            n++;
            if (v.valida) ok++; else motivos.add(String(v.motivo ?? v.razon ?? 'sin motivo').slice(0, 90));
        }
        por.push(`silla ${asiento}: ${ok}/${n}`);
        if (ok < n) por.push(`      → ${[...motivos].join(' · ')}`);
    }
    console.log(`\n  ${juego} (${sillas} sillas)`);
    for (const l of por) console.log(`    ${l}`);
}
