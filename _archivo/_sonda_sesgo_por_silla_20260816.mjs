/**
 * EL SESGO DE LA SILLA, CON LAS SILLAS YA ENUMERADAS.
 *
 * Antes, pedir la silla 2 en un juego de dos no te sentaba en ninguna silla nueva: te
 * hacía empezar dos turnos más tarde en la misma. Así que la medida mezclaba «qué
 * silla ocupo» con «cuándo entro».
 *
 * Ahora `asientos` sale de la longitud del `marcador` y la silla pedida se envuelve.
 * La prueba de que funciona es concreta: en un juego de DOS, las sillas 0 y 2 tienen
 * que dar EXACTAMENTE lo mismo, y las 1 y 3 también. Si no, siguen mezcladas.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

const N = 30;
const JUEGOS = ['brisca', 'tute', 'hearts', 'spades', 'gofish',
                'parchis', 'canadiense', 'oca', 'remigio', 'entropy'];

console.log(`\n  ${N} semillas por silla · política tonta en todas\n`);
for (const e of CATALOGO.filter(x => x.familia === 'protohub' && JUEGOS.includes(x.juego))) {
    const medias = [];
    let sillas = null;
    for (const silla of [0, 1, 2, 3]) {
        let suma = 0, n = 0;
        for (let s = 1; s <= N; s++) {
            const Env = await e.cargar();
            const env = new Env();
            env.asiento = silla;
            env.reset(s);
            sillas ??= env.asientos;
            for (let i = 0; i < 400; i++) {
                const v = env.affordances();
                if (!v.length) break;
                if (env.step(v[0].verb).done) break;
            }
            suma += env._puntosDe(env._estado()); n++;
        }
        medias.push(suma / n);
    }
    // La comprobación que no se puede falsear: sillas que son LA MISMA silla tienen
    // que dar el mismo número hasta el último decimal.
    let coherente = true;
    for (let i = 0; i < 4; i++) {
        const j = i % sillas;
        if (Math.abs(medias[i] - medias[j]) > 1e-9) coherente = false;
    }
    console.log(`  ${e.juego.padEnd(11)} ${sillas} sillas · ${medias.map(m => m.toFixed(1).padStart(8)).join(' ')}`
        + `   ${coherente ? '✓ las sillas repetidas dan lo mismo' : '✗ SIGUEN MEZCLADAS'}`);
}
