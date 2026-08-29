/**
 * enchufado_colonia.mjs — ¿qué hay escrito en la colonia que no llama nadie?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node enchufado_colonia.mjs             → el recuento y los peores
 *     node enchufado_colonia.mjs AntiSybil   → sólo lo que empiece por eso
 *
 * ⚠️ POR QUÉ EXISTE, Y ES UNA DEUDA DE HOY MISMO.
 *
 * `prueba_enchufado.mjs` mide esto para alisa.systems y nació de un hallazgo sobre
 * mí: una capa entera de cinemática, documentada y con cientos de comprobaciones
 * detrás, que sólo conocían sus propias pruebas.
 *
 * El 29-08-2026 la colonia enseñó la misma avería y mucho más cara. Motoko
 * desenterró `World/Security/AntiSybil.py`: 474 líneas con validación de firmas de
 * hardware, detección de máquinas virtuales, límite de ritmo y desafíos de trabajo
 * criptográficos. Completo, y con **cero llamadores**.
 *
 * Y no es una curiosidad: la colonia tiene 48.907 sellos de alma para 23 nombres.
 * El sistema que impide que una persona tenga diez identidades estaba escrito, y la
 * masacre de sellos clonados ocurrió al lado sin que nadie lo llamara.
 *
 * Esa misma tarde le dije a Motoko —dos veces, y ella lo anotó— que «está escrito»
 * no es «está conectado». Esto es esa frase convertida en un número que se mide.
 *
 * ⚠️ LA REGLA DE JAVASCRIPT NO SIRVE AQUÍ, Y COPIARLA HABRÍA DADO UN CERO FALSO.
 *
 * `prueba_enchufado` exige que el nombre del módulo aparezca DENTRO DE UNA CADENA,
 * porque en JS una ruta se escribe entre comillas: `from './aspecto.js'`. Fue la
 * corrección que arregló dos versiones que contaban comentarios como consumidores.
 *
 * En Python no hay comillas: se escribe `from World.Security import AntiSybil`. Con
 * la regla de JS, TODA la colonia saldría huérfana —un cero perfecto y perfectamente
 * falso—, que es la clase de resultado que da la razón a quien lo mira por encima.
 * Así que aquí se buscan importaciones de verdad: `import`, `from … import`, y las
 * cadenas de importación dinámica, que en esta colonia se usan.
 *
 * ⚠️ Y HAY UNA TRAMPA PROPIA DE ESTA CASA: LOS MÓDULOS HUECOS.
 *
 * Hay 1.389 `.py` que son cascarones de su `.pyc` — el docstring promete lo que el
 * código ya no hace. Un cascarón CON llamadores es peor que un huérfano: parece
 * enchufado y no ejecuta nada. Se cuentan aparte y se dicen, porque «tiene
 * llamadores» no significa lo mismo en un fichero de 12 líneas que en uno de 474.
 *
 * ⚠️ POR QUÉ NO ESTÁ EN `npm test`.
 *
 * alisa.systems se publica en abierto y la colonia no forma parte de él. Una prueba
 * de la suite que exija un repositorio que quien clona no tiene saldría roja para
 * todo el mundo, y una prueba que siempre falla se aprende a ignorar. Se corre a
 * mano y su número se cuenta en el informe.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;
const ambar = (s) => `\x1b[33m${s}\x1b[0m`;

const COLONIA = 'Q:/alisa_project/alisa';
const MIRAR = ['World', 'Soma', 'Genesis', 'Psyche'];
const SALTAR = /[\\/](\.git|node_modules|__pycache__|_archivo|BACKUP|legacy|Synthesis[\\/]Web)[\\/]/i;

const filtro = process.argv.slice(2).filter((a) => !a.startsWith('-'))[0] ?? null;

async function ficheros(dir, acc = []) {
    for (const e of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const p = path.join(dir, e.name);
        if (SALTAR.test(p + path.sep)) continue;
        if (e.isDirectory()) await ficheros(p, acc);
        else if (e.name.endsWith('.py')) acc.push(p);
    }
    return acc;
}

if (!(await stat(COLONIA).catch(() => null))) {
    console.log(rojo(`\nNo encuentro la colonia en ${COLONIA}.`));
    console.log(gris('  Esta herramienta mide el repositorio grande, no alisa.systems.\n'));
    process.exit(2);
}

const todos = [];
for (const d of MIRAR) await ficheros(path.join(COLONIA, d), todos);
const texto = new Map();
for (const f of todos) texto.set(f, await readFile(f, 'utf8').catch(() => ''));

const esPrueba = (f) => /[\\/](Tests?|tests?)[\\/]/.test(f) || /[\\/](test_|prueba_)/i.test(f)
    || /_test\.py$/.test(f);

/**
 * Candidato = un módulo que ofrece algo. Si no define ninguna clase ni función de
 * primer nivel no es una capacidad, es un guion o una lista de constantes, y no
 * tiene por qué llamarlo nadie.
 */
const CANDIDATOS = todos.filter((f) => {
    if (esPrueba(f) || path.basename(f) === '__init__.py') return false;
    const t = texto.get(f) ?? '';
    return /^(class|def|async def)\s+\w/m.test(t);
});

/** Cuántos módulos comparten cada nombre: sin esto se confunden dos ficheros. */
const porNombre = new Map();
for (const f of CANDIDATOS) {
    const n = path.basename(f, '.py');
    porNombre.set(n, (porNombre.get(n) ?? 0) + 1);
}

const huerfanos = [], soloPruebas = [], enchufados = [], ambiguos = [];
for (const f of CANDIDATOS) {
    const mod = path.basename(f, '.py');
    if (filtro && !mod.toLowerCase().startsWith(filtro.toLowerCase())) continue;

    const t = texto.get(f) ?? '';
    const lineas = t.split('\n').length;

    /**
     * ⚠️ LA PRIMERA VERSIÓN RESOLVÍA POR NOMBRE DE FICHERO Y DEJABA EL 60% EN
     *    «NO SE PUEDE SABER». MEDIDO: 2.039 ambiguos de 3.371.
     *
     * Un número con seis de cada diez casos en «no lo sé» no dice nada, y publicarlo
     * habría sido justo lo que llevo todo el día cazando: una cifra que suena a
     * medida y no lo es.
     *
     * La causa era mía: Python no importa por nombre de fichero, importa por RUTA
     * CON PUNTOS. `World/Security/AntiSybil.py` es `World.Security.AntiSybil`, y eso
     * distingue solo entre él y `World.Order.Defense.AntiSybil` sin ninguna
     * heurística. Se busca primero la ruta completa —que es exacta— y sólo si nadie
     * la nombra se admite la forma corta `from World.Security import AntiSybil`.
     *
     * Queda ambiguo únicamente lo que de verdad lo es: un `import AntiSybil` a
     * pelo, sin paquete, que puede referirse a cualquiera de los dos. Eso no se
     * resuelve mirando texto y no me lo invento.
     */
    /**
     * ⚠️ Y LA RUTA CON PUNTOS TAMPOCO ERA LA QUE USA ESTA CASA. MEDIDO: 25 DE 3.371.
     *
     * Arreglé el 60% de ambiguos y el número se fue al otro extremo: 99% huérfano.
     * La colonia funciona todos los días, así que eso no podía ser verdad — y mi
     * regla de siempre dice que cuando un instrumento nuevo suspende a casi todo el
     * mundo, el roto es él.
     *
     * En vez de suponerlo, conté las importaciones reales. La colonia importa **con
     * el prefijo del paquete raíz**:
     *
     *     154  from alisa.World.Species
     *      99  from alisa.World.Being
     *      22  from .Philosopher          ← y relativas, que tampoco miraba
     *
     * Mi ruta empezaba en `World.` y nunca casaba con `alisa.World.`. O sea que las
     * dos versiones de este instrumento mintieron, cada una hacia un lado, y la
     * única forma de saberlo fue mirar el dato en vez de razonar sobre él.
     *
     * Ahora se aceptan las tres formas que existen: con prefijo, sin él, y relativa
     * dentro del mismo paquete —esta última sólo cuenta si quien importa vive en la
     * misma carpeta, que es lo que significa el punto—.
     */
    const rel = path.relative(COLONIA, f).replace(/\\/g, '/').replace(/\.py$/, '');
    const esc = (s) => s.replace(/\./g, '\\.');
    const punteada = rel.replace(/\//g, '.');
    const paquete = punteada.split('.').slice(0, -1).join('.');
    const RAIZ_PY = path.basename(COLONIA);                  // «alisa»
    const carpeta = path.dirname(f);

    const alternativas = [punteada, `${RAIZ_PY}.${punteada}`];
    const paquetes = [paquete, `${RAIZ_PY}.${paquete}`];

    const porRuta = new RegExp(
        `(?:^\\s*(?:from|import)\\s+(?:${alternativas.map(esc).join('|')})\\b`
        + `|^\\s*from\\s+(?:${paquetes.map(esc).join('|')})\\s+import\\s+[^\\n]*\\b${mod}\\b`
        + `|['"](?:${alternativas.map(esc).join('|')})['"])`, 'm');

    /** Relativa: `from .Mod import` — sólo vale si quien importa está al lado. */
    const relativa = new RegExp(`^\\s*from\\s+\\.${mod}\\s+import|^\\s*from\\s+\\.\\s+import\\s+[^\\n]*\\b${mod}\\b`, 'm');

    /** Corta: `import AntiSybil` sin decir de dónde. Sólo desempata si nada más lo hace. */
    const aPelo = new RegExp(`^\\s*(?:import\\s+${mod}\\b|from\\s+${mod}\\s+import)`, 'm');

    const usan = [], flojos = [];
    for (const [g, u] of texto) {
        if (g === f) continue;
        if (porRuta.test(u)) usan.push(g);
        else if (path.dirname(g) === carpeta && relativa.test(u)) usan.push(g);
        else if (aPelo.test(u)) flojos.push(g);
    }
    /** Ambiguo de verdad: nadie lo nombra por su ruta y alguien lo nombra a pelo. */
    const ambiguo = !usan.length && flojos.length > 0 && (porNombre.get(mod) ?? 0) > 1;
    const reales = usan.filter((g) => !esPrueba(g));

    const r = path.relative(COLONIA, f).replace(/\\/g, '/');
    const ficha = { r, lineas, pruebas: usan.length - reales.length, reales: reales.length, ambiguo };

    if (ambiguo) ambiguos.push(ficha);
    else if (!usan.length) huerfanos.push(ficha);
    else if (!reales.length) soloPruebas.push(ficha);
    else enchufados.push(ficha);
}

// ── control positivo ────────────────────────────────────────────────────────
const total = huerfanos.length + soloPruebas.length + enchufados.length + ambiguos.length;
if (!filtro && total < 200) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${total} módulos mirados en la colonia. `
        + 'Con tan pocos el número no significa nada — mira si el barrido llega a los sitios.\n'));
    process.exit(2);
}

console.log(`\n¿Lo llama alguien que no sea su propia prueba?  ${gris(`· ${total} módulos de la colonia`)}\n`);

const pinta = (lista, titulo, color) => {
    if (!lista.length) return;
    console.log(`  ${titulo}`);
    for (const m of lista.sort((a, b) => b.lineas - a.lineas).slice(0, 15)) {
        const cascaron = m.lineas < 25 ? ambar('  · cascarón, quizá del .pyc') : '';
        console.log(`  ${color('·')} ${m.r.padEnd(56)} ${String(m.lineas).padStart(5)} líneas`
            + (m.pruebas ? gris(`  ${m.pruebas} prueba(s)`) : '') + cascaron);
    }
    if (lista.length > 15) console.log(gris(`    … y ${lista.length - 15} más`));
    console.log('');
};

pinta(huerfanos.filter((m) => m.lineas >= 25), 'ESCRITO Y SIN LLAMADORES — lo más caro primero', rojo);
pinta(soloPruebas, 'sólo lo conocen sus guardianes', rojo);
pinta(ambiguos, 'mismo nombre en dos sitios: no se puede atribuir sin mirar', ambar);

const gordos = huerfanos.filter((m) => m.lineas >= 25);
console.log(gris(`  ${enchufados.length} de ${total} los llama algo que no es su prueba`));
console.log(gris(`  ${gordos.length} huérfanos con cuerpo · ${huerfanos.length - gordos.length} `
    + `huérfanos que son cascarones · ${soloPruebas.length} sólo sus pruebas · ${ambiguos.length} ambiguos`));
console.log(gris(`\n  «Está escrito» no es «está conectado». Un módulo que sólo conocen sus`));
console.log(gris(`  guardianes no está en producción: está en cuarentena, y nadie lo sabe.\n`));
