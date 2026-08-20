/**
 * ¿HACE ALGO EL MODO ULTRA, O ESTOY VIENDO LO QUE QUIERO VER?
 *
 * Las dos capturas parecen la misma, y «parecen» no es una medida. Se comparan píxel
 * a píxel: cuántos cambian, y cuánto. Si sale casi cero, el pipeline está encendido y
 * no toca nada — y eso hay que decirlo antes de publicar un botón que promete algo.
 */
import { readFile } from 'node:fs/promises';
import { leerPNG, colorEn } from './png.mjs';

const [a, b] = [process.argv[2], process.argv[3]];
const A = leerPNG(await readFile(a));
const B = leerPNG(await readFile(b));
if (A.ancho !== B.ancho || A.alto !== B.alto) {
    console.log('  tamaños distintos, no se pueden comparar'); process.exit(1);
}

let distintos = 0, suma = 0, maximo = 0, total = 0;
// Sólo la mitad derecha: la izquierda es el panel HTML, que no pasa por el pipeline y
// diluiría la medida con píxeles que no pueden cambiar.
for (let y = 0; y < A.alto; y += 2) {
    for (let x = Math.floor(A.ancho * 0.35); x < A.ancho; x += 2) {
        const p = colorEn(A, x, y, A.ancho), q = colorEn(B, x, y, B.ancho);
        if (!p || !q) continue;
        total++;
        const d = Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);
        if (d > 6) distintos++;
        suma += d;
        if (d > maximo) maximo = d;
    }
}
console.log(`\n  ${total} píxeles comparados (mitad derecha, 1 de cada 4)`);
console.log(`  cambian de verdad (>6): ${distintos}  (${(100 * distintos / total).toFixed(1)}%)`);
console.log(`  diferencia media: ${(suma / total).toFixed(2)} · máxima: ${maximo}`);
console.log(distintos / total > 0.10
    ? '  → el modo ultra SÍ está cambiando la imagen'
    : '  → el modo ultra apenas toca nada: encendido y sin efecto visible');
