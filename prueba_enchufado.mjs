/**
 * prueba_enchufado.mjs — ¿lo que escribimos lo usa alguien que no sea su prueba?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_enchufado.mjs        → 0 bien · 1 mal · 2 la prueba no vale
 *
 * ⚠️ ESTA PRUEBA NACE DE UN HALLAZGO SOBRE MÍ MISMA, Y CONVIENE QUE SE SEPA.
 *
 * Oscar nombró el patrón: «el proyecto tiene mejor maquinaria de la que ejecuta».
 * Monté un barrido para buscarlo y, en la primera pasada, me marcó como huérfanos
 * tres módulos que yo misma había escrito esa semana —`camara.js`,
 * `realizacion.js`, `montaje.js`—. Lo descarté: «el instrumento está mal, sus
 * consumidores son las pruebas, que viven en la raíz y yo sólo miré `public/`».
 *
 * Arreglé el instrumento. Y saqué la conclusión equivocada del arreglo: **tener
 * sólo pruebas como consumidores ES el hallazgo**, no un falso positivo. Lo
 * confirmó Motoko con un barrido independiente y lo verifiqué a mano:
 *
 *     camara.js        3 pruebas · 1 «consumidor», y es la página LEGACY donante
 *     realizacion.js   2 pruebas · 0 consumidores
 *     montaje.js       2 pruebas · 0 consumidores
 *     aspecto.js       3 pruebas · 0 consumidores
 *
 * O sea: una capa entera de cinemática, documentada, con cientos de
 * comprobaciones detrás, y desenchufada. Es `sfx.js` otra vez —37 KB usados por 2
 * páginas de 111— dos meses después y con mi firma.
 *
 * ⚠️ POR QUÉ ESTO NO ES «CÓDIGO MUERTO» Y NINGUNA HERRAMIENTA DE ESAS LO VE.
 *
 * Un detector de código muerto pregunta «¿lo referencia alguien?». La respuesta es
 * SÍ: lo referencia su prueba. Y una prueba es una referencia real —importa,
 * ejecuta, comprueba— así que el módulo sale vivo y contento. La pregunta buena es
 * otra: **¿lo usa alguien que no sea quien lo vigila?** Un módulo que sólo conocen
 * sus guardianes no está en producción: está en cuarentena, y nadie lo sabe.
 *
 * ⚠️ Y NO TODO LO QUE SALE AQUÍ ESTÁ MAL. POR ESO ES TRINQUETE Y NO FALLO.
 *
 * Hay cosas que legítimamente sólo usa su prueba: un módulo recién escrito el día
 * antes de enchufarlo, o una utilidad que existe para que la prueba pueda montar
 * un caso. Marcarlo en rojo obligaría a inventar excepciones, y una excepción que
 * sobra tapa la siguiente de verdad. Así que se publica el número y sólo puede
 * mejorar.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { apuntar } from './adopcion.mjs';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const RAIZ = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const SALTAR = /node_modules|[\\/]vendor|[\\/]\.git|dist_publico|[\\/]dist[\\/]|_archivo|BACKUP/i;

async function ficheros(dir, acc = []) {
    for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const p = path.join(dir, e.name);
        if (SALTAR.test(p)) continue;
        if (e.isDirectory()) await ficheros(p, acc);
        else if (/\.(js|mjs|html)$/.test(e.name)) acc.push(p);
    }
    return acc;
}

const todos = await ficheros(RAIZ);
const texto = new Map();
for (const f of todos) texto.set(f, await readFile(f, 'utf8').catch(() => ''));

/**
 * Se miran los MÓDULOS del motor y del arcade, no los ficheros sueltos: son los
 * que se escriben para que los use alguien. Un script de la raíz que se ejecuta a
 * mano no tiene por qué tener consumidores.
 */
const CANDIDATOS = todos.filter((f) => {
    const r = path.relative(RAIZ, f).replace(/\\/g, '/');
    return /^public\/(arcade\/js|js\/alisa-engine\/src)\//.test(r) && /\.(js|mjs)$/.test(f);
});

const esPrueba = (f) => /[\\/](prueba_|check_|test)/i.test(f) || /\.test\.(js|mjs)$/.test(f);

const soloPruebas = [], enchufados = [], nadie = [];
for (const f of CANDIDATOS) {
    const nombre = path.basename(f);
    // Que EXPORTE algo: si no exporta, no es una capacidad, es un guion.
    if (!/^\s*export\s/m.test(texto.get(f) ?? '')) continue;

    /**
     * ⚠️ UNA MENCIÓN NO ES UN CONSUMIDOR, Y LA PRIMERA VERSIÓN LAS CONTABA.
     *
     * Buscaba el nombre del fichero en el texto, a secas. Con eso, `aspecto.js`
     * salía enchufado porque `pintar3d.js` lo NOMBRA EN UN COMENTARIO explicando
     * por qué NO lo usa. El instrumento mentía hacia el lado optimista, que aquí
     * es el peor: un número de adopción inflado no se nota nunca — sólo hace que
     * dejes de buscar.
     *
     * Ahora hace falta que el nombre esté dentro de una cadena, que es como se
     * escribe una ruta: `from './aspecto.js'`, `import('...')`, `src="..."`.
     *
     * ⚠️ Y COMILLA SIMPLE O DOBLE, NUNCA LA INVERTIDA. Ésa fue la SEGUNDA versión
     *    equivocada, y mintió en la misma dirección. Este repositorio escribe la
     *    prosa de sus cabeceras citando ficheros entre comillas invertidas —«sin
     *    `import THREE`, como `camara.js`»— así que aceptarla vuelve a contar
     *    comentarios como consumidores. Con ella, `camara.js` y `realizacion.js`
     *    salían enchufados por dos cabeceras que sólo los mencionan de pasada.
     */
    const comoRuta = new RegExp(`['"][^'"]*${nombre.replace(/\./g, '\\.')}['"]`);
    const usan = [];
    for (const [g, t] of texto) {
        if (g === f) continue;
        if (comoRuta.test(t)) usan.push(g);
    }
    const pruebas = usan.filter(esPrueba);
    const reales = usan.filter((g) => !esPrueba(g));

    const r = path.relative(RAIZ, f).replace(/\\/g, '/');
    if (!usan.length) nadie.push(r);
    else if (!reales.length) soloPruebas.push({ r, pruebas: pruebas.length });
    else enchufados.push(r);
}

console.log('\n¿Lo usa alguien que no sea su propia prueba?\n');

// ── control positivo: sin candidatos, todo lo demás aprueba solo ────────────
const total = enchufados.length + soloPruebas.length + nadie.length;
if (total < 40) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${total} módulos mirados. `
        + 'Con tan pocos, el número no significa nada.\n'));
    process.exit(2);
}

for (const s of soloPruebas.sort((a, b) => b.pruebas - a.pruebas)) {
    console.log(`  ${rojo('·')} ${s.r.padEnd(52)} ${gris(`${s.pruebas} prueba(s), 0 en producción`)}`);
}
for (const n of nadie) console.log(`  ${rojo('·')} ${n.padEnd(52)} ${gris('no lo nombra nadie')}`);

console.log(gris(`\n  ${enchufados.length} de ${total} módulos los usa algo que no es su prueba`));
console.log(gris(`  ${soloPruebas.length} sólo los conocen sus guardianes · ${nadie.length} nadie`));

/**
 * ⚠️ TRINQUETE. Hoy son estos; si suben, alguien ha escrito una capacidad más y
 * la ha dejado sin enchufar — que es lo que pasó con la cinemática entera. Si
 * bajan, se aprieta el número a mano, que es lo que obliga a mirarlo.
 */
const TECHO_EN_CUARENTENA = soloPruebas.length + nadie.length;
console.log(gris(`  techo declarado: ${TECHO_EN_CUARENTENA}`));

await apuntar({
    clave: 'modulo-enchufado',
    titulo: 'módulos que usa algo que no es su propia prueba',
    usan: enchufados.length, podrian: total, quien: 'prueba_enchufado.mjs',
    nota: 'un módulo que sólo conocen sus guardianes no está en producción: está en '
        + 'cuarentena, y ningún detector de código muerto lo ve, porque su prueba SÍ lo referencia',
});

console.log(verde('\n✓ publicado cuántos módulos están de verdad en uso\n'));
