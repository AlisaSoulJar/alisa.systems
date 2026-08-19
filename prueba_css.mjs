/**
 * prueba_css.mjs — que un comentario mal cerrado no borre reglas en silencio
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTO ME COSTÓ UNA HORA Y NO DA NI UN ERROR.
 *
 * El 15-08-2026, arreglando que los botones del ajedrez se salieran de la
 * pantalla, escribí tres reglas distintas y NINGUNA cambió la medida. Ni un
 * píxel, las tres veces. Revisé la cascada, la especificidad, si el fichero se
 * servía, si el navegador cacheaba. Todo correcto.
 *
 * La causa era un cierre de comentario de más: al editar un comentario largo dejé
 * el cierre antiguo en medio, así que veinte líneas de prosa quedaron FUERA del
 * comentario y el analizador de CSS, al encontrarse texto suelto, se comió también
 * la regla que venía detrás. Sin error de consola, sin aviso, sin nada. La regla
 * estaba en el fichero, se servía por HTTP, y no existía para el navegador.
 *
 * (Y sí: la primera versión de ESTE fichero llevaba el cierre escrito literalmente
 *  aquí dentro, en la frase que lo explica, y se cerró a sí mismo. Node lo dijo en
 *  el acto con un error de sintaxis — que es justo lo que el CSS no hace.)
 *
 * Es el peor tipo de fallo que hay aquí: el que se parece exactamente a «mi
 * arreglo no funciona». Perseguí la cascada tres veces porque el síntoma era el
 * mismo.
 *
 * ⚠️ Y ESTE PROYECTO ES ESPECIALMENTE VULNERABLE.
 *
 * Las hojas llevan comentarios enormes a propósito —el porqué de cada regla, con
 * la medida que la justifica—, así que se editan mucho y son largos. Cuantos más
 * comentarios, más ocasiones de dejarse un cierre.
 *
 * Contar aperturas y cierres cuesta milisegundos y cierra la puerta para siempre.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));

/** Todas las hojas del sitio, no sólo las del arcade. */
async function hojas(dir) {
    const out = [];
    for (const e of await readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            // El paquete es una copia; mirarlo duplicaría cada aviso.
            if (e.name === 'dist_publico' || e.name === 'dist' || e.name === 'node_modules') continue;
            out.push(...await hojas(p));
        } else if (e.name.endsWith('.css')) out.push(p);
    }
    return out;
}

console.log('\n¿Hay algún comentario de CSS mal cerrado?\n');

const malas = [];
for (const f of await hojas(path.join(AQUI, 'public'))) {
    const txt = await readFile(f, 'utf8');

    /**
     * Se recorre en vez de contar, para poder decir la LÍNEA. Un «hay uno de más»
     * sin decir dónde obliga a buscarlo a mano en mil líneas, que es la mitad del
     * problema que esto viene a resolver.
     */
    let dentro = false, abrio = 0, linea = 1, i = 0;
    const fallos = [];
    /**
     * ⚠️ Y SE CUENTAN LAS LLAVES DE FUERA DE LOS COMENTARIOS. AQUÍ ESTABA EL AGUJERO.
     *
     * Esta prueba sólo miraba el BALANCE de `/*` y `*` `/`, y con eso se le escapaba
     * el caso peor: una apertura DE MÁS. Si alguien abre un comentario delante de una
     * regla, se cierra solo con el siguiente cierre legítimo —el balance sigue
     * cuadrando— y entre medias desaparecen todas las reglas que hubiera.
     *
     * Lo encontró `prueba_de_las_pruebas.mjs` el 15-08: comentó `.repetir-mandos {` a
     * propósito y esta comprobación aprobó tan contenta. O sea que llevaba desde que
     * se escribió vigilando la mitad del fallo que dice vigilar — y la mitad que se
     * dejaba es justo la que se come reglas.
     *
     * Las llaves lo delatan sin heurísticas: al tragarse la apertura `{`, su `}` se
     * queda huérfana fuera del comentario y el recuento se descuadra. Un CSS sano
     * tiene las llaves balanceadas; uno con una regla medio comida, no.
     */
    let llaves = 0, ultimaLlaveSuelta = 0, comillas = null;
    while (i < txt.length) {
        if (txt[i] === '\n') { linea++; i++; continue; }
        const dos = txt.slice(i, i + 2);
        if (!dentro && dos === '/*') { dentro = true; abrio = linea; i += 2; continue; }
        if (!dentro && dos === '*/') { fallos.push(`línea ${linea}: cierre sin apertura`); i += 2; continue; }
        if (dentro && dos === '*/') { dentro = false; i += 2; continue; }
        if (!dentro) {
            const c = txt[i];
            // Las comillas se saltan: `content: "{"` es CSS legítimo y contaría mal.
            if (comillas) { if (c === comillas && txt[i - 1] !== '\\') comillas = null; }
            else if (c === '"' || c === "'") comillas = c;
            else if (c === '{') llaves++;
            else if (c === '}') { llaves--; if (llaves < 0) { ultimaLlaveSuelta = linea; llaves = 0; } }
        }
        i++;
    }
    if (dentro) fallos.push(`comentario abierto en la línea ${abrio} y nunca cerrado`);
    if (ultimaLlaveSuelta) {
        fallos.push(`línea ${ultimaLlaveSuelta}: un «}» sin su «{` + `» — puede que un comentario`
            + ` se haya tragado el principio de una regla`);
    }
    if (llaves > 0) {
        fallos.push(`quedan ${llaves} «{» sin cerrar — alguna regla se quedó a medias`);
    }

    const rel = path.relative(AQUI, f).replace(/\\/g, '/');
    if (fallos.length) malas.push({ rel, fallos });
    console.log(`  ${fallos.length ? '✗' : '✓'} ${rel}${fallos.length ? '\n      ↳ ' + fallos.join('\n      ↳ ') : ''}`);
}

if (malas.length) {
    console.log(`\n  ✗ ${malas.length} hoja(s) con comentarios descuadrados.`);
    console.log('    Un `*/` de más NO da error: el analizador se come el texto suelto Y');
    console.log('    la regla que venga detrás. La regla existe en el fichero, se sirve, y');
    console.log('    no llega. Se parece exactamente a «mi arreglo no funciona».');
    process.exit(1);
}
console.log(`\n  ✓ todas cierran lo que abren`);

/**
 * ⚠️ Y LO SEGUNDO: EL PANEL NO PUEDE TRAGARSE TOQUES QUE VAN A LA MESA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `jugables.css` pone `.hud-panel { pointer-events: none }` y devuelve el clic sólo
 * a lo que HACE algo — la regla está escrita ahí y explicada: el panel flota sobre el
 * lienzo con fondo traslúcido, así que ves el tablero por debajo, pulsas donde lo ves
 * y no pasa nada. Ni un error.
 *
 * `.mesa-pista` —una línea de texto que explica la fase— se coló en esa lista. En
 * escritorio no se nota; en un móvil de 276 px el panel ocupa media pantalla y el
 * mazo de entropy cae justo debajo. Dos betatesters lo reportaron: «no se puede robar
 * del mazo, hay que hacerlo desde los comandos del menú».
 *
 * Así que la lista se vigila. Un selector nuevo que recupere el toque tiene que ser
 * algo pulsable; si no lo es, aquí salta. No es una lista paralela: es la MISMA lista
 * del CSS, leída del fichero y contrastada contra qué es interactivo.
 *
 * SABOTAJE: se le devuelve `pointer-events: auto` a `.mesa-pista` y esto debe suspender.
 */
/**
 * ⚠️ ESTA COMPROBACIÓN EMPEZÓ SIENDO LISTA Y GRITABA EN FALSO.
 *
 * El primer intento exigía que todo lo que recuperase el toque «pareciera
 * interactivo», con una expresión regular. Acusó a tres inocentes: un trozo de
 * comentario que mi regex leyó como selector, el propio `.hud-panel`, y
 * `.historial-lista`, que necesita el toque para poder DESPLAZARSE.
 *
 * Una prueba que grita en falso se acaba ignorando, y entonces no protege de nada.
 * Así que se estrecha a lo que de verdad muerde: lo que por su nombre es INFORMACIÓN
 * —una pista, un texto, un marcador— no puede quedarse el toque, porque encima del
 * lienzo eso es un muro. Cubre el caso que reportaron los betatesters y no inventa
 * culpables.
 */
const SOLO_INFORMA = /(pista|texto|marcador|estado-txt|leyenda|aviso)/i;
const jugables = path.join(AQUI, 'public/arcade/css/jugables.css');
// Sin comentarios: mi primera versión los leyó como selectores.
const css = (await readFile(jugables, 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
const culpables = [];
for (const m of css.matchAll(/([^{}]+)\{[^{}]*pointer-events\s*:\s*auto[^{}]*\}/g)) {
    for (const sel of m[1].split(',').map(s => s.trim()).filter(Boolean)) {
        if (SOLO_INFORMA.test(sel)) culpables.push(sel);
    }
}
if (culpables.length) {
    console.log(`\n  ✗ el panel devuelve el toque a cosas que no se pulsan:`);
    for (const c of culpables) console.log(`      ↳ ${c}`);
    console.log('    Sobre el lienzo eso es un muro: se ve la carta, se toca, y no pasa nada.');
    process.exit(1);
}
console.log(`  ✓ el panel sólo se queda los toques de lo que se pulsa`);
