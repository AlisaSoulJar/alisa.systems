/**
 * UNA FICHA QUIETA NO SE MUEVE, Y UNA QUE SE MUEVE NO APARECE
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_acercar.mjs
 *
 * Cuatro betatesters escribieron lo mismo en cuatro juegos distintos —go, dominó,
 * alisapolis, mancala—: «parece que juego yo solo». Comprobado por el árbitro, la
 * casa SÍ juega. Lo que falla es que no se VE mover a nadie: `pintar3d.js`
 * escribía las posiciones nuevas directamente y las fichas se teletransportaban.
 *
 * `acercar.js` es lo que convierte un salto en un viaje, y se equivoca de tres
 * formas que no dan error:
 *
 *   1. emparejar mal — una ficha quieta sale deslizándose y la que se movió
 *      aparece de golpe: se ve MÁS movimiento y peor;
 *   2. no emparejar nada — todo se teletransporta, que es el aspecto de antes, así
 *      que el fallo se disfraza de «todavía no está hecho»;
 *   3. emparejar cosas lejísimos — una ficha nueva llega deslizándose desde donde
 *      estaba otra, o sea un movimiento que nadie hizo. En un juego con recibo,
 *      inventarse un movimiento es peor que dar un salto.
 *
 * La 1 es la que de verdad protege, y es el caso normal: en un juego por turnos se
 * mueve UNA ficha y las otras tienen que quedarse clavadas.
 */
import { acercar, ACERCAMIENTO } from './public/arcade/js/protohub/render/acercar.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

console.log('\nUna ficha quieta no se mueve, y una que se mueve no aparece\n');
const fallos = [];

// ── 1. Lo que aparece de la nada se pone en su sitio ──
{
    const r = acercar([], [{ x: 5, z: 3 }]);
    if (r[0].x !== 5 || r[0].z !== 3 || r[0].venia) {
        fallos.push(`una pieza nueva no se puso en su sitio: ${JSON.stringify(r[0])}`);
    } else console.log(`  ${verde('✓')} una pieza nueva se pone donde toca, sin venir de ninguna parte`);
}

/**
 * ── 2. ⚠️ LA QUE PROTEGE: SÓLO SE MUEVE LA QUE SE MOVIÓ ──
 *
 * Tres fichas iguales SIN id —el caso de los juegos que aún no lo publican— y una
 * cambia de sitio. Las otras dos no pueden desplazarse ni una milésima: si lo
 * hacen, el emparejamiento las ha confundido y la pantalla enseñará un movimiento
 * que no ocurrió.
 */
{
    const previas = [{ x: 0, z: 0 }, { x: 3, z: 0 }, { x: 6, z: 0 }];
    const r = acercar(previas, [{ x: 0, z: 0 }, { x: 4, z: 0 }, { x: 6, z: 0 }]);
    const quietas = [r[0].x === 0, r[2].x === 6];
    const viajera = r[1].x > 3 && r[1].x < 4;
    if (!quietas.every(Boolean)) {
        fallos.push(`las fichas quietas se movieron: ${r.map(o => o.x.toFixed(3)).join(', ')}`);
    } else if (!viajera) {
        fallos.push(`la que se movió no está a medio camino: ${r[1].x}`);
    } else console.log(`  ${verde('✓')} de tres fichas sin nombre, sólo viaja la que cambió de sitio`
        + gris(`  (${r.map(o => o.x.toFixed(2)).join(' · ')})`));
}

// ── 3. Con id se empareja por nombre, aunque la cercanía diría otra cosa ──
// Dos fichas que se CRUZAN: la cercanía las confundiría, el nombre no.
{
    const previas = [{ x: 0, z: 0, id: 'a' }, { x: 6, z: 0, id: 'b' }];
    const r = acercar(previas, [{ x: 6, z: 0, id: 'a' }, { x: 0, z: 0, id: 'b' }]);
    const a = r.find((o) => o.id === 'a'), b = r.find((o) => o.id === 'b');
    if (!(a.x > 0 && a.x < 6) || !(b.x > 0 && b.x < 6)) {
        fallos.push(`al cruzarse, los id no mandaron: a=${a.x} b=${b.x}`);
    } else console.log(`  ${verde('✓')} dos fichas que se cruzan no se confunden si tienen nombre`
        + gris(`  (a ${a.x.toFixed(2)} · b ${b.x.toFixed(2)})`));
}

// ── 4. Lo lejísimos no se arrastra ──
{
    const r = acercar([{ x: 0, z: 0 }], [{ x: 40, z: 40 }]);
    if (r[0].venia) fallos.push('una pieza a 40 de distancia se emparejó: llegaría deslizándose de la nada');
    else console.log(`  ${verde('✓')} lo que está lejísimos no se arrastra: se pone y ya`);
}

// ── 5. Y el viaje CONVERGE, que si no la ficha no llega nunca ──
{
    let o = { x: 0, z: 0 };
    for (let i = 0; i < 60; i++) o = acercar([o], [{ x: 10, z: 0 }])[0];
    if (Math.abs(o.x - 10) > 0.05) fallos.push(`tras 60 fotogramas sigue en ${o.x.toFixed(3)} y el destino era 10`);
    else console.log(`  ${verde('✓')} el viaje converge` + gris(`  (60 fotogramas → ${o.x.toFixed(3)} de 10, acercamiento ${ACERCAMIENTO})`));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ las piezas viajan, y sólo viaja la que se movió\n'));
