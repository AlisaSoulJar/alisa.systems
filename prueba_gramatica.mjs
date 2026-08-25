/**
 * ¿HABLA EL BANCO UN SOLO IDIOMA DE ACCIONES?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node --import ./resolver_three.mjs prueba_gramatica.mjs
 *
 * La tripleta `@objeto #metodo |parametros` es la ley del organismo entero — 802
 * usos en 267 ficheros del proyecto general, declarada en `Cycles/AIO/Over.py`
 * como `LEY AIO-I`. Esta comprobación vigila que el banco la hable, y que la
 * hable de UNA manera.
 *
 * ⚠️ QUÉ HABÍA, MEDIDO EL 25-08 SOBRE LOS 49 ENTORNOS.
 *
 *     otra                529 verbos  10 mundos   a2a3
 *     una palabra          99         29          subir
 *     palabra + espacio    68          1          enviar a
 *     metodo:parametro     53          6          jugar:P_5
 *     palabra_palabra      21         10          esquivar_izquierda
 *     un número             6          1          0
 *
 * Seis gramáticas, y ocho mundos mezclando dos en el MISMO menú. Quien lee ese
 * menú tiene que adivinar el formato línea por línea.
 *
 * ⚠️ Y POR QUÉ SE VIGILA EL MÉTODO Y NO EL VERBO.
 *
 * El `verb` crudo se queda como está a propósito: es lo que el banco lleva
 * semanas midiendo y lo que va en los recibos. Cambiarlo sería cambiar el juego
 * conservando el nombre. Lo que se exige es que la TRIPLETA que se emite encima
 * sea uniforme — y ahí sí hay una sola regla.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';
import { SEPARADORES, leer, escribir } from './public/js/alisa-engine/src/gym/Gramatica.js';

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };

console.log('\n¿Habla el banco un solo idioma de acciones?\n');

const metodos = new Map();
let mundos = 0, acciones = 0, sinTripleta = 0;
const conSeparador = [];

for (const e of CATALOGO) {
    let env;
    try { const C = await e.cargar(); env = new C(); env.reset(4); } catch { continue; }
    let lista = [];
    try { lista = env.verbos?.() ?? []; } catch { continue; }
    if (!lista.length) continue;
    mundos++;

    for (const a of lista) {
        acciones++;
        if (!a.objeto || !a.metodo) { sinTripleta++; continue; }

        /**
         * ⚠️ LA REGLA ÚNICA: UN MÉTODO NO LLEVA SEPARADORES DENTRO.
         *
         * Dos puntos o un espacio dentro de un `#metodo` significan que hay un
         * parámetro escondido ahí. Es literalmente el fallo de `enviar a`: 68
         * acciones con `args: {}` mientras el argumento viajaba pegado al verbo.
         */
        if (SEPARADORES.test(a.metodo)) {
            conSeparador.push(`${e.id}: #${a.metodo}`);
        }
        /**
         * ⚠️ Y EL PARÁMETRO TAMPOCO, QUE ES POR DONDE SE ESCAPABA.
         *
         * La primera versión sólo miraba el método, y el sabotaje APROBABA: al
         * dejar de partir por el espacio, `enviar a` no se quedaba como método
         * —el respaldo de ProtoHub lo mandaba a `#jugar |enviar a`— así que
         * ningún método llevaba separador y la comprobación cantaba victoria.
         *
         * Pero el fallo seguía ahí, sólo que mudado de sitio: el método pasaba a
         * ser `jugar` cuando era `enviar`, y las 68 acciones volvían a ser 68
         * fichas sueltas. Un parámetro con un espacio dentro es un método y un
         * argumento pegados, se mire por donde se mire.
         *
         * Van cuatro esta semana: comprobación nueva que aprueba con el cable
         * cortado. Por eso ninguna se da por buena hasta verla suspender.
         */
        for (const p of (a.params ?? [])) {
            if (SEPARADORES.test(String(p))) {
                conSeparador.push(`${e.id}: #${a.metodo} |${p}`);
            }
        }
        metodos.set(a.metodo, (metodos.get(a.metodo) ?? 0) + 1);

        /**
         * Y el átomo tiene que poder volver a leerse. Si `escribir` produce algo
         * que `leer` no entiende, hay dos gramáticas otra vez — una para hablar y
         * otra para escuchar— que es justo la avería del proyecto general, donde
         * Metatron acepta lo que Parse rechaza.
         */
        const vuelta = leer(a.atomo);
        if (!vuelta) {
            mal(`${e.id}: el átomo «${a.atomo}» no lo entiende el lector`);
        } else if (vuelta.objeto !== a.objeto || vuelta.metodo !== a.metodo) {
            mal(`${e.id}: «${a.atomo}» se lee como @${vuelta.objeto} #${vuelta.metodo}`);
        }
    }
}

console.log(`  ${mundos} mundos · ${acciones} acciones · ${metodos.size} métodos distintos`);
const top = [...metodos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
console.log(`  los más usados: ${top.map(([m, n]) => `#${m}×${n}`).join('  ')}`);

if (sinTripleta) mal(`${sinTripleta} acciones salen sin tripleta (@objeto o #metodo vacíos)`);
else console.log(`  ✓ las ${acciones} acciones salen con las tres partes`);

if (conSeparador.length) {
    mal(`${conSeparador.length} métodos llevan un separador dentro — hay un parámetro escondido:`);
    for (const s of conSeparador.slice(0, 6)) console.log(`      ${s}`);
} else {
    console.log('  ✓ ningún método esconde un parámetro dentro');
}

/**
 * ⚠️ Y EL LECTOR TIENE QUE SER UNO SOLO.
 *
 * Es la lección medida del proyecto general: allí la ley está declarada y la
 * máquina escrita, pero el paso texto→tripleta vive dentro de un `elif` de
 * `Parse.Flow` y no se puede llamar. Cinco sitios se escribieron su propia
 * regex, y 3 de cada 8 frases se leen distinto según quién las lea — hasta el
 * punto de que Metatron encola como orden lo que Parse trataría como charla.
 *
 * Aquí sólo puede haber una regex del átomo, y vive en `Gramatica.js`.
 */
{
    const { readdirSync, readFileSync } = await import('node:fs');
    const dir = './public/js/alisa-engine/src/gym';
    const lectores = [];
    const buscar = (ruta) => {
        for (const f of readdirSync(ruta, { withFileTypes: true })) {
            if (f.isDirectory()) { buscar(`${ruta}/${f.name}`); continue; }
            if (!f.name.endsWith('.js')) continue;
            const t = readFileSync(`${ruta}/${f.name}`, 'utf8')
                .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
            // Una regex que busca `@algo` seguido de `#algo` es un lector de átomos.
            if (/@\\?\(?\[?[A-Za-z\\][^\n]{0,40}#/.test(t)) lectores.push(`${ruta}/${f.name}`);
        }
    };
    buscar(dir);
    if (lectores.length !== 1) {
        mal(`hay ${lectores.length} lectores del átomo y tiene que haber 1: ${lectores.join(', ')}`);
    } else {
        console.log(`  ✓ un solo lector del átomo: ${lectores[0].split('/').pop()}`);
    }
}

console.log(`\n  ejemplo: ${escribir({ objeto: 'Chess', metodo: 'jugar', params: ['a2a3'] })}`);
console.log('');
if (fallos) { console.log(`  ✗ ${fallos} fallo(s) en la gramática\n`); process.exit(1); }
console.log('  ✓ un solo idioma, el mismo que habla el organismo entero\n');
