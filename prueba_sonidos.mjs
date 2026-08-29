/**
 * prueba_sonidos.mjs — los sonidos ya no se leen: se oyen
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_sonidos.mjs      → 0 bien · 1 mal · 2 la prueba no vale
 *
 * POR QUÉ EXISTE, ADEMÁS DE `prueba_sonido.mjs`
 *
 * Aquella compara dos listas de NOMBRES: los que el sitio pide contra los que
 * `sfx.js` declara. Y lo dice en su propia cabecera: «`sfx.js` no es un módulo
 * —es una IIFE que toca `document` y `AudioContext`— así que esto lo lee, no lo
 * ejecuta». Un sonido podía estar declarado, tener el nombre correcto y sonar a
 * silencio, y aquello aprobaba.
 *
 * Ahora 53 de los 63 sonidos son RECETAS en `public/data/sonidos.json`, y la
 * síntesis es matemática pura en `soma/audio/sonido.js`. Así que aquí se pueden
 * renderizar de verdad, en Node, sin navegador, y preguntarles lo que importa:
 * ¿suena? ¿satura? ¿dura lo que dice?
 *
 * Las dos pruebas se quedan: aquélla vigila que no falte ningún nombre que
 * alguien pida; ésta, que lo que hay dentro no sea silencio.
 */
import { readFile } from 'node:fs/promises';
import { capasDe, nombresDe, sintetizar, revisarLexico }
    from './public/js/alisa-engine/src/soma/audio/sonido.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const LEX = JSON.parse(await readFile('./public/data/sonidos.json', 'utf8'));

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const conReceta = Object.keys(LEX.sonidos ?? {});
const soloCodigo = LEX.soloCodigo ?? [];

// ── control positivo: sin sonidos, todo lo demás aprueba solo ───────────────
if (conReceta.length < 30) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${conReceta.length} recetas en el léxico. `
        + `Un recorrido casi vacío aprueba siempre.\n`));
    process.exit(2);
}

// ── 1. El léxico se sostiene ────────────────────────────────────────────────
comprobaciones++;
const quejas = revisarLexico(LEX);
if (quejas.length) mal(`el léxico no pasa su propia revisión: ${quejas.slice(0, 4).join('; ')}`);

// ⚠️ Y el revisor sabe decir que no: si aprobara cualquier cosa, lo de arriba
//    sería decorado.
{
    const roto = structuredClone(LEX);
    roto.sonidos[conReceta[0]].capas[0].tipo = 'un_tipo_que_no_existe';
    roto.sonidos[conReceta[0]].capas[0].vol = 9;
    comprobaciones++;
    if (revisarLexico(roto).length < 2) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: revisarLexico aprueba un léxico roto a propósito.\n'));
        process.exit(2);
    }
}

// ── 2. CADA SONIDO SUENA ────────────────────────────────────────────────────
/**
 * ⚠️ SE MIDE LA ENERGÍA, NO QUE EL ARRAY EXISTA.
 *
 * Un `Float32Array` lleno de ceros tiene la longitud correcta, se renderiza sin
 * error y es silencio. Ésa es exactamente la avería que ninguna prueba de nombres
 * puede ver, y por eso lo que se mira es la raíz cuadrática media.
 */
const rnd = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; }; })();
let mudos = 0, saturados = 0;
for (const nombre of conReceta) {
    const capas = capasDe(nombre, LEX);
    comprobaciones++;
    if (!capas) { mal(`«${nombre}» tiene entrada pero no devuelve capas`); continue; }

    const muestras = sintetizar(capas, { muestreo: 22050, rnd });
    comprobaciones += 3;

    if (!muestras.length) { mal(`«${nombre}» renderiza cero muestras`); continue; }

    let suma = 0, pico = 0;
    for (const x of muestras) {
        if (!Number.isFinite(x)) { mal(`«${nombre}» produce muestras que no son números`); break; }
        suma += x * x;
        pico = Math.max(pico, Math.abs(x));
    }
    const rms = Math.sqrt(suma / muestras.length);

    if (rms < 0.005) { mudos++; mal(`«${nombre}» es prácticamente silencio (rms ${rms.toFixed(4)})`); }
    if (pico >= 0.999) saturados++;

    // La duración que dice la receta es la que sale.
    const dur = Math.max(...capas.map((c) => Number(c.dur) || 0));
    const durReal = muestras.length / 22050;
    if (Math.abs(durReal - dur) > 0.01) {
        mal(`«${nombre}» dice durar ${dur}s y dura ${durReal.toFixed(3)}s`);
    }
}

// ── 3. Sonidos distintos suenan distinto ────────────────────────────────────
/**
 * ⚠️ SI DOS RECETAS DAN LA MISMA ONDA, UNA DE LAS DOS SOBRA — o peor, alguien
 *    copió una entrada y cambió sólo el nombre. Es el mismo control que en las
 *    ocho caras del avatar: compararlas de verdad, no fiarse del nombre.
 */
{
    const huella = (n) => {
        const m = sintetizar(capasDe(n, LEX), { muestreo: 8000, rnd });
        let h = 0;
        for (let i = 0; i < m.length; i += 7) h = (h * 31 + Math.round(m[i] * 1000)) | 0;
        return `${m.length}:${h}`;
    };
    const vistos = new Map();
    for (const n of conReceta) {
        comprobaciones++;
        const h = huella(n);
        if (vistos.has(h)) mal(`«${n}» y «${vistos.get(h)}» suenan exactamente igual`);
        else vistos.set(h, n);
    }
}

// ── 4. UNA SOLA FUENTE: sfx.js declara los diez, y ni uno más ───────────────
/**
 * ⚠️ ESTA COMPROBACIÓN CAMBIÓ AL SALDAR LA DEUDA, Y AHORA ES MÁS FUERTE.
 *
 * Antes `sfx.js` tenía sus propias copias de los sesenta y tres, así que esto
 * sólo podía vigilar que las dos listas no se separaran: había dos fuentes y lo
 * único que cabía era que estuvieran de acuerdo.
 *
 * Ya no. `sfx.js` monta los 53 desde el léxico y se queda únicamente con los diez
 * que son código de verdad. Así que la invariante buena es exacta: **lo que
 * declara `sfx.js` tiene que ser EXACTAMENTE `soloCodigo`**.
 *
 * Y eso caza algo que la versión anterior no podía: alguien que escriba un sonido
 * nuevo a mano en `sfx.js` en vez de como receta. Sonaría plano en el arcade y el
 * mundo 3D se quedaría sin él, en silencio — que es la avería que había.
 */
{
    const sfx = await readFile('./public/js/sfx.js', 'utf8');
    const cuerpo = sfx.match(/const sounds = \{([\s\S]*?)\n {4}\};/)?.[1] ?? '';
    const declarados = new Set([...cuerpo.matchAll(/\n {8}(\w+)\(\)/g)].map((m) => m[1]));
    const codigo = new Set(soloCodigo);

    comprobaciones += 3;
    if (!declarados.size) mal('no encuentro ningún sonido en sfx.js: la lectura falla');
    const deMas = [...declarados].filter((n) => !codigo.has(n));
    const deMenos = [...codigo].filter((n) => !declarados.has(n));
    if (deMas.length) {
        mal(`escritos a mano en sfx.js y no declarados en soloCodigo: ${deMas.join(', ')} `
            + `— o son recetas, o hay que declararlos`);
    }
    if (deMenos.length) mal(`declarados en soloCodigo y ausentes de sfx.js: ${deMenos.join(', ')}`);

    // Y que el cargador siga ahí: sin él, los 53 no llegan y nadie se entera.
    comprobaciones++;
    if (!/fetch\(['"]\/data\/sonidos\.json['"]\)/.test(sfx)) {
        mal('sfx.js ya no pide el léxico: los 53 sonidos de receta no llegarían');
    }
}

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 150;
console.log(`\n¿Suenan los sonidos, o sólo están declarados?\n`);
console.log(gris(`  ${conReceta.length} recetas · ${soloCodigo.length} que se quedan como código · `
    + `${comprobaciones} comprobaciones`));
console.log(gris(`  renderizados en Node a 22 kHz · ${mudos} mudos · ${saturados} llegan al tope`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: ${comprobaciones} comprobaciones, mínimo ${MINIMO}.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 12)) console.log(rojo(`  ✗ ${f}`));
    if (fallos.length > 12) console.log(gris(`  … y ${fallos.length - 12} más`));
    console.log(rojo(`\n✗ ${fallos.length} fallos de sonido\n`));
    process.exit(1);
}
console.log(verde('✓ las 53 recetas suenan, duran lo que dicen, y ninguna suena como otra\n'));
