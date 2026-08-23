/**
 * UN SONIDO QUE NO EXISTE NO SUENA, Y NO SE QUEJA
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_sonido.mjs
 *
 * `SFX.play` empieza por `if (sounds[name])`. Si el nombre no está, no hay error,
 * no hay aviso: se va callando. Así llevaba `menu_select` desde siempre —lo pedía
 * `autoWireUI` en cada mousedown— y nadie podía notarlo, porque la única señal de
 * que un sonido falta es un silencio, que es exactamente lo que hace un sonido
 * flojo. El fallo y el funcionamiento correcto suenan igual.
 *
 * Es el mismo defecto que ya conocemos con otra cara: aquí los fallos salen en
 * verde. La cura es la de siempre, comparar dos listas que nadie compara solo:
 * los nombres que el sitio PIDE contra los nombres que `sfx.js` TIENE.
 *
 * ⚠️ LÍMITE HONRADO: `sfx.js` no es un módulo —es una IIFE que toca `document` y
 * `AudioContext`— así que esto lo lee, no lo ejecuta. Cuenta claves declaradas y
 * llamadas escritas. Un `play(variable)` calculado en tiempo de ejecución se le
 * escapa, y por eso se declara aparte cuántas llamadas eran dinámicas: si ese
 * número crece mucho, esta comprobación está mirando cada vez menos juego.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const SALTAR = /node_modules|[\\/]vendor[\\/]|_archivo|dist_publico|[\\/]dist[\\/]|\.git/;

async function* recorrer(dir) {
    let e;
    try { e = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const x of e) {
        const p = path.join(dir, x.name);
        if (SALTAR.test(p)) continue;
        if (x.isDirectory()) yield* recorrer(p);
        else if (/\.(js|mjs|html)$/.test(x.name)) yield p;
    }
}

/**
 * Las claves de `sounds`, acotadas al bloque que las declara.
 *
 * Se acota a propósito: `music` y `radio` traen métodos con la misma forma
 * (`start() {`), y contarlos aquí daría por existente un `play('start')` que no
 * existe. El bloque va de `const sounds = {` a la siguiente declaración hermana.
 */
function sonidosDeclarados(texto) {
    const lineas = texto.split(/\r?\n/);
    const desde = lineas.findIndex((l) => /^\s*const\s+sounds\s*=\s*\{/.test(l));
    if (desde < 0) return null;
    let hasta = lineas.length;
    for (let i = desde + 1; i < lineas.length; i++) {
        if (/^\s*const\s+\w+\s*=\s*\{/.test(lineas[i])) { hasta = i; break; }
    }
    const nombres = new Set();
    for (const l of lineas.slice(desde + 1, hasta)) {
        const m = l.match(/^\s{8}([A-Za-z_]\w*)\s*\(\s*\)\s*\{/);
        if (m) nombres.add(m[1]);
    }
    return nombres;
}

/**
 * Todo `play('x')` DE SFX escrito en el sitio, con su fichero. Y aparte, los
 * dinámicos.
 *
 * Se exige el receptor y no vale cualquier `.play(`: `test_engines.js` llama a
 * `engine.play('ninja_1')`, que es otro objeto entero, y contarlo denunciaba a
 * `sfx.js` por un sonido que nunca fue suyo. Dentro del propio `sfx.js` sí valen
 * `this` y `self`, que es como se llama a sí mismo.
 */
function llamadas(texto, fichero, pedidos, dinamicas) {
    const propio = path.basename(fichero) === 'sfx.js';
    const quien = propio ? '(?:SFX\\??|this|self)' : 'SFX\\??';
    const conNombre = new RegExp(`${quien}\\.play\\(\\s*(['"\`])([A-Za-z_]\\w*)\\1`, 'g');
    const calculado = new RegExp(`${quien}\\.play\\(\\s*[^'"\`\\s)]`, 'g');
    for (const m of texto.matchAll(conNombre)) {
        if (!pedidos.has(m[2])) pedidos.set(m[2], new Set());
        pedidos.get(m[2]).add(fichero);
    }
    for (const _ of texto.matchAll(calculado)) dinamicas.push(fichero);
}

console.log('\nUn sonido que no existe no suena, y no se queja\n');

const RUTA = path.join('public', 'js', 'sfx.js');
const fuente = await readFile(RUTA, 'utf-8');
const tiene = sonidosDeclarados(fuente);
const fallos = [];

if (!tiene || tiene.size === 0) {
    console.log(rojo(`\n✗ no se pudo leer el catálogo de ${RUTA}: la forma del fichero ha cambiado\n`));
    process.exit(1);
}

const pedidos = new Map();
const dinamicas = [];
for await (const f of recorrer('public')) {
    llamadas(await readFile(f, 'utf-8'), f, pedidos, dinamicas);
}

// 1 — todo lo que se pide, existe.
const huerfanos = [...pedidos.keys()].filter((n) => !tiene.has(n)).sort();
if (huerfanos.length) {
    for (const n of huerfanos) {
        const donde = [...pedidos.get(n)].map((f) => path.basename(f)).join(', ');
        fallos.push(`se pide '${n}' y no está en sounds — lo llama ${donde}`);
    }
} else {
    console.log(`  ${verde('✓')} los ${pedidos.size} nombres que pide el sitio existen`
        + gris(` (de ${tiene.size} declarados)`));
}

// 2 — y se declara cuánto NO se está mirando, que es la mitad honrada del asunto.
console.log(`  ${verde('✓')} ${dinamicas.length} llamada(s) con nombre calculado, fuera del alcance de esto`);

/**
 * 3 — ⚠️ EL SABOTAJE, que es lo que le da valor a los dos verdes de arriba.
 *
 * Se pide un sonido que seguro no existe. Si esto NO suspendiera, querría decir
 * que la comparación no compara: que el catálogo se leyó vacío, que el recorrido
 * no encontró ficheros, o que el patrón de `play` dejó de encajar. Cualquiera de
 * las tres deja la comprobación en verde para siempre sin mirar nada.
 */
const inventado = 'trompeta_de_jerico';
if (tiene.has(inventado)) {
    fallos.push(`el sabotaje no sirve: '${inventado}' existe de verdad, hay que cambiarlo`);
} else if (pedidos.size === 0) {
    fallos.push('no se encontró ni una llamada a play() en todo el sitio: el patrón no encaja con nada');
} else {
    console.log(`  ${verde('✓')} un nombre inventado se detectaría`
        + gris(` (sabotaje: '${inventado}')`));
}

/**
 * ── 4. Y QUE SIGA ENCHUFADO, QUE ES LA MITAD QUE SE PIERDE SOLA ──
 *
 * Que los sonidos existan no sirve de nada si nadie los pide: `sfx.js` llevaba
 * meses escrito y lo usaban dos páginas de ciento once. El enganche son tres
 * líneas —dos en el andamio y una en cada motor— y quitar cualquiera de ellas
 * devuelve las cuarenta mesas al silencio SIN romper nada: la página carga, el
 * juego se juega, y sólo falta el ruido. Nadie lo notaría en una prueba.
 */
{
    const leer = async (n) => {
        try { return await readFile(path.join('public', 'arcade', 'js', n), 'utf-8'); }
        catch { return ''; }
    };
    const andamio = await leer('montarMesa.js');
    const enganches = [
        ['el andamio carga sfx.js', andamio.includes(`'/js/sfx.js'`)],
        ['el andamio carga sonido_mesa.js', andamio.includes(`'js/sonido_mesa.js'`)],
        ['el motor de cartas envuelve su backend',
            (await leer('SovereignCardEngine.js')).includes('conSonidoDeMesa')],
        ['el motor de tablero envuelve su backend',
            (await leer('SovereignBoardEngine.js')).includes('conSonidoDeMesa')],
    ];
    const rotos = enganches.filter(([, ok]) => !ok).map(([q]) => q);
    if (rotos.length) fallos.push(`el sonido está desenchufado: ${rotos.join('; ')}`);
    else console.log(`  ${verde('✓')} las cuarenta mesas siguen enchufadas al sonido`
        + gris(' (andamio ×2 · motores ×2)'));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ ningún play() apunta a un sonido que no existe\n'));
