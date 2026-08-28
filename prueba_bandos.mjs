/**
 * ¿Dice el mapa de texto de quién es cada pieza?
 *
 * ⚠️ LA PRIMERA VERSIÓN DE ESTA SONDA SE COPIÓ LA LÓGICA QUE QUERÍA MEDIR.
 *
 * Reimplementaba el cálculo del glifo —`simbolos[t] ?? inicial en mayúscula`— y
 * comparaba consigo misma. Así que después de ARREGLAR `descripcion.js` seguía
 * diciendo «6 afectados»: estaba midiendo su propia copia, no el código.
 *
 * Es la tercera vez esta noche que el instrumento es el culpable, y las tres con
 * la misma forma: medir algo que no es lo que se cree que se mide. Ahora llama a
 * `describirSustrato` y LEE EL MAPA QUE SALE, que es lo que ve un agente.
 */
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { obtenerSustrato } from './public/arcade/js/protohub/sustrato.js';
import { describirSustrato } from './public/arcade/js/protohub/descripcion.js';

const afectados = [], limpios = [], sinMapa = [];

for (const juego of JUEGOS) {
    try {
        const reglas = await cargarReglas(juego, {});
        const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
        const sus = reglas.sustrato ? reglas.sustrato(p, 0)
                                    : obtenerSustrato(juego, reglas, p, reglas.estado(p));
        if (!sus?.rejilla || !(sus.piezas?.length)) { sinMapa.push(juego); continue; }

        const duenos = new Set(sus.piezas.map(z => z.de ?? z.bando).filter(d => d != null));
        if (duenos.size < 2) { sinMapa.push(juego); continue; }

        const texto = describirSustrato(sus);
        const i = texto.indexOf('Mapa (');
        if (i < 0) { sinMapa.push(juego); continue; }
        const cuerpo = texto.slice(texto.indexOf('\n', i) + 1).split('\n\n')[0];

        /**
         * La pregunta, hecha sobre el texto de verdad: para cada tipo de pieza,
         * ¿los glifos que caen en las casillas de un dueño y en las del otro son
         * los mismos? Se leen del propio mapa por coordenada, que es lo que
         * garantiza que se mide lo publicado y no lo que yo creo que se publica.
         */
        const filas = cuerpo.split('\n');
        const en = (x, y) => filas[y]?.[x];
        const porTipo = new Map();
        for (const z of sus.piezas) {
            const g = en(z.x, z.y);
            if (!g) continue;
            const k = String(z.t);
            if (!porTipo.has(k)) porTipo.set(k, new Map());
            const m = porTipo.get(k);
            const d = String(z.de ?? z.bando);
            if (!m.has(d)) m.set(d, new Set());
            m.get(d).add(g);
        }
        /**
         * ⚠️ DOS PIEZAS EN LA MISMA CASILLA NO SON UN GLIFO AMBIGUO.
         *
         * Alisápolis salía en rojo y no lo estaba: sus peones EMPIEZAN TODOS EN LA
         * MISMA CASILLA, la de salida, y una rejilla sólo puede dibujar uno encima
         * de otro. El juego ya lo dice en su propia leyenda — «P=tu peón y el de
         * los demás»— así que es una limitación declarada del mapa, no una avería.
         *
         * Confundir las dos habría hecho que yo «arreglara» un glifo que estaba
         * bien. Se separan: solapamiento se cuenta aparte y no suspende.
         */
        const celda = (z) => `${z.x},${z.y}`;
        const celdasPorTipo = new Map();
        for (const z of sus.piezas) {
            const k = String(z.t);
            if (!celdasPorTipo.has(k)) celdasPorTipo.set(k, new Map());
            const m = celdasPorTipo.get(k);
            m.set(celda(z), (m.get(celda(z)) ?? 0) + 1);
        }
        const seSolapa = (t) => [...(celdasPorTipo.get(t)?.values() ?? [])].some(n => n > 1);

        const chocan = [], solapados = [];
        for (const [t, porDueno] of porTipo) {
            const conjuntos = [...porDueno.values()].map(s => [...s].join(''));
            if (porDueno.size > 1 && new Set(conjuntos).size === 1) {
                (seSolapa(t) ? solapados : chocan).push(`${t}→${conjuntos[0]}`);
            }
        }
        if (chocan.length) afectados.push({ juego, chocan });
        else { limpios.push(juego); if (solapados.length) console.log(`  · ${juego.padEnd(12)} se solapan en la misma casilla (declarado en su leyenda): ${solapados.join(' ')}`); }
    } catch (e) {
        console.log(`  ? ${juego}: ${e.message}`);
    }
}

console.log(`\n  ¿el mapa PUBLICADO dice de quién es cada pieza?\n`);
for (const a of afectados) {
    console.log(`  ✗ ${a.juego.padEnd(12)} mismo glifo para los dos dueños: ${a.chocan.slice(0, 8).join(' ')}`);
}
console.log(`  ${afectados.length} ambiguos · ${limpios.length} distinguen · ${sinMapa.length} sin mapa de dos bandos`);
if (limpios.length) console.log(`  distinguen: ${limpios.join(', ')}`);
console.log('');
process.exit(afectados.length ? 1 : 0);
