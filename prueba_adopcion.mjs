/**
 * prueba_adopcion.mjs — que el denominador esté publicado y no mienta
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_adopcion.mjs      → 0 bien · 1 mal · 2 la prueba no vale
 *
 * ⚠️ POR QUÉ EXISTE.
 *
 * `public/adopcion.html` contesta la pregunta de Oscar —«el proyecto tiene mejor
 * maquinaria de la que ejecuta»— con la única forma que sirve: cuántos USAN cada
 * cosa de los que PODÍAN. Los números los escriben las pruebas al pasar.
 *
 * Y ahí está el riesgo, que es el mismo de siempre en esta casa: **una página que
 * lee un fichero que nadie escribe no da error, se ve bonita y está vacía**.
 * `clasificacion.html` estuvo ocho días publicando números que no correspondían a
 * ninguna medida guardada. Esto lo vigila por los dos lados: que el fichero tenga
 * ratios, y que cada ratio apunte a un fichero que existe y lo escribe de verdad.
 *
 * ⚠️ Y VIGILA EL TRINQUETE AL REVÉS: LOS RATIOS SÓLO PUEDEN SUBIR.
 *
 * Si alguien quita el `apuntar` de una prueba, el número desaparece de la página
 * sin que nada falle — y la página seguiría enseñando los otros, tan tranquila.
 * Eso es exactamente lo que hace peligroso a este patrón: se pierde en silencio.
 */
import { readFile } from 'node:fs/promises';
import { ratios } from './adopcion.mjs';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

/**
 * ⚠️ TRINQUETE. Hoy son los que apuntan las pruebas que ya medían su número; si
 * baja, alguien ha desenchufado uno. Cuando suba, se sube aquí a mano — que es lo
 * que obliga a mirarlo.
 */
const SUELO_RATIOS = 6;

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const r = await ratios();
const claves = Object.keys(r);

console.log('\n¿Está publicado el denominador?\n');

comprobaciones++;
if (claves.length < SUELO_RATIOS) {
    mal(`sólo ${claves.length} ratios publicados y había ${SUELO_RATIOS}. `
        + 'Alguien ha quitado un `apuntar` de una prueba, y eso no da error en ningún sitio.');
}

for (const [clave, v] of Object.entries(r)) {
    comprobaciones += 4;
    if (!v.titulo || v.titulo.length < 10) mal(`«${clave}» no dice de qué va`);
    if (!Number.isFinite(v.usan) || !Number.isFinite(v.podrian)) mal(`«${clave}» no trae dos números`);
    if (v.usan > v.podrian) mal(`«${clave}»: ${v.usan} de ${v.podrian} — los dos lados no cuentan lo mismo`);
    if (!v.podrian) mal(`«${clave}» tiene denominador cero: no mide nada`);

    /**
     * ⚠️ EL RATIO TIENE QUE APUNTAR A QUIEN LO MIDE, Y ESE FICHERO TIENE QUE
     *    SEGUIR LLAMANDO A `apuntar`.
     *
     * Sin esto, un ratio se quedaría en el JSON para siempre después de que su
     * prueba dejara de escribirlo: la página seguiría enseñando un número real de
     * hace tres meses como si fuera de hoy. Es la misma avería que los ocho días
     * de la clasificación, sólo que más lenta.
     */
    comprobaciones++;
    const fuente = await readFile(`./${v.quien}`, 'utf8').catch(() => null);
    if (fuente === null) mal(`«${clave}» dice que lo mide ${v.quien}, que no existe`);
    else if (!fuente.includes('apuntar(')) {
        mal(`${v.quien} ya no llama a \`apuntar\`: el ratio «${clave}» se quedaría congelado`);
    }
    const p = v.podrian ? v.usan / v.podrian : 0;
    const marca = p >= 0.999 ? verde('lleno') : p >= 0.6 ? '   ' : rojo('hueco');
    console.log(`  ${marca}  ${clave.padEnd(26)} ${String(v.usan).padStart(4)} de ${String(v.podrian).padEnd(5)}`
        + gris(` ${v.titulo}`));
}

// ── la página existe y no lleva números dentro ──────────────────────────────
{
    const html = await readFile('./public/adopcion.html', 'utf8').catch(() => null);
    comprobaciones += 2;
    if (html === null) mal('no existe public/adopcion.html: los ratios no los ve nadie');
    else {
        if (!html.includes('/data/adopcion.json')) {
            mal('adopcion.html ya no lee el fichero de medidas: estaría inventándose la tabla');
        }
    }
}

const huecos = Object.entries(r).filter(([, v]) => v.usan < v.podrian);
console.log(gris(`\n  ${claves.length} ratios · ${claves.length - huecos.length} al completo · `
    + `${huecos.length} con hueco · ${comprobaciones} comprobaciones`));

if (fallos.length) {
    for (const f of fallos.slice(0, 10)) console.log(rojo(`  ✗ ${f}`));
    console.log(rojo(`\n✗ ${fallos.length} problema(s) con el denominador publicado\n`));
    process.exit(1);
}
console.log(verde('✓ el denominador está publicado, y lo escribe quien lo mide\n'));
