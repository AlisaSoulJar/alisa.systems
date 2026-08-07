/**
 * clasificar_piezas.mjs — qué ES cada pieza del motor, por escrito y en disco
 * ═══════════════════════════════════════════════════════════════════════════
 *     node clasificar_piezas.mjs    →  public/data/clasificacion_piezas.json
 *
 * POR QUÉ EXISTE, Y POR QUÉ EN NODE
 * `labs/catalogo.html` ya clasifica las 179 piezas importándolas de verdad — y
 * eso es más fiable que leer código. Pero su resultado **vive sólo en la
 * pestaña**: nada puede consumirlo. Ni el escaparate para proponer candidatas,
 * ni una prueba para avisar de una regresión, ni un `git diff` para ver qué
 * cambió esta semana.
 *
 * Aquí se hace en Node, leyendo el código, con dos ventajas que el navegador no
 * puede dar: entra en `npm test`, y el resultado es un fichero que se versiona.
 *
 * ⚠️ NO SUSTITUYE AL CATÁLOGO, LO COMPLEMENTA — Y HAY QUE SABER EN QUÉ FALLA.
 * Leer el código no ejecuta nada, así que esto NO sabe si una pieza pinta algo
 * de verdad; sólo si expone por dónde encenderla. El catálogo sí lo sabe (mide
 * cuántos objetos mete en la escena). Si algún día se contradicen, **manda el
 * catálogo**: ejecutar es más verdad que leer.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(AQUI, 'public', 'js', 'alisa-engine', 'src');

const { piezas } = JSON.parse(
    await readFile(path.join(AQUI, 'public', 'data', 'motor.json'), 'utf8'));

// Lo que hace que una pieza sea arrancable, y lo que la delata como ENTORNO.
// El vocabulario del gym —estados, ticks, observaciones— no es el del render.
const ARRANQUE = ['buildAll', 'build', 'init', 'start'];
const DE_GYM = /^(reset|step|tick\w*|get\w*Observation|create\w*State|observ\w*|act|legalMoves)$/i;

/**
 * Saca los nombres de método de una clase o de un objeto literal exportado.
 *
 * ⚠️ Se miran LAS DOS FORMAS. En este motor conviven `export class X {}` y
 * `export const X = { init(), update() }` — y `FileSystemDioramaSystem`, los
 * 52 KB más grandes de todo, es de la segunda. La primera versión del catálogo
 * sólo conocía clases y lo dio por «sin métodos» teniendo `init()`.
 */
function metodosDe(src) {
    const nombres = new Set();
    // `nombre(args) {` con sangría — vale para métodos de clase y de objeto.
    for (const m of src.matchAll(/^\s{2,}(?:async\s+)?(?:static\s+)?([a-zA-Z_]\w*)\s*\([^)]*\)\s*\{/gm)) {
        nombres.add(m[1]);
    }
    // `nombre: function` y `nombre: (args) =>`
    for (const m of src.matchAll(/^\s{2,}([a-zA-Z_]\w*)\s*:\s*(?:async\s+)?(?:function|\()/gm)) {
        nombres.add(m[1]);
    }
    // Palabras que no son métodos aunque lo parezcan.
    for (const p of ['if', 'for', 'while', 'switch', 'catch', 'return', 'constructor', 'function']) {
        nombres.delete(p);
    }
    return [...nombres];
}

/**
 * Quita comentarios antes de buscar señales de código.
 *
 * ⚠️ ESTO NO ES REFINAMIENTO: ES UN FALSO POSITIVO QUE YO MISMA CAUSÉ.
 * Al arreglar `FileSystemDioramaSystem` dejé escrito en un comentario, como
 * documentación de cómo se usa:
 *
 *     FileSystemDioramaSystem.init();
 *
 * …y el detector de «se arranca sola al importarse» lo encontró ahí y la marcó.
 * O sea que la pieza salía en la lista de sospechosas POR EXPLICAR cómo se
 * arranca bien.
 *
 * Es el cuarto detector con falso positivo en esta jornada, y todos del mismo
 * tipo: buscar en el texto sin distinguir código de prosa. Un aviso falso en una
 * lista de avisos enseña a ignorar la lista entera.
 */
const sinComentarios = (s) => s
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const resultado = [];
for (const p of piezas) {
    const src = await readFile(path.join(SRC, p.ruta), 'utf8');
    const codigo = sinComentarios(src);
    const metodos = metodosDe(src);
    const arranque = metodos.filter(m => ARRANQUE.includes(m));
    const gym = metodos.filter(m => DE_GYM.test(m));
    const exporta = [...src.matchAll(/export\s+(?:default\s+)?(?:const|class|function)\s+(\w+)/g)]
        .map(m => m[1]);

    let clase;
    if (gym.length >= 2) clase = 'gym';
    else if (arranque.length) clase = 'escena';
    else if (!exporta.length) clase = 'sin_exportar';
    else clase = 'apagada';

    resultado.push({
        ...p, clase, exporta,
        arranque, gym,
        actualiza: metodos.includes('update'),
        // ⚠️ Dos señales de «sólo funciona donde nació», que costaron caro:
        // `FileSystemDioramaSystem` usaba THREE sin importarlo (111 veces) y se
        // auto-arrancaba al importarse con `Renderer.init()`. Un módulo así no
        // se puede catalogar ni reutilizar, y no da error hasta que alguien lo
        // importa desde fuera — o sea, meses después.
        // ⚠️ TAMBIÉN VALE RECIBIRLO POR PARÁMETRO, Y NO ES LO MISMO QUE OLVIDARLO.
        // `RenderBackend` hace `crearRenderer(THREE, opciones)` a propósito:
        // `three` y `three/webgpu` son builds DISTINTOS y quien llama decide
        // cuál. Marcarlo como «se le olvidó el import» habría llevado a
        // "arreglarlo" rompiendo justo lo que hace bien — que es exactamente lo
        // que hoy ya me pasó una vez con dos páginas sanas.
        usa_three_sin_importar: /\bTHREE\./.test(codigo)
            && !/import\s[^;]*\bTHREE\b/.test(codigo)
            && !/\(\s*THREE\s*[,)]/.test(codigo),
        arranca_al_importar: /^[A-Z]\w*\.(init|start|main)\s*\(/m.test(codigo),
        metodos: metodos.slice(0, 12),
    });
}

/**
 * ═══ SEGUNDA PASADA: EJECUTARLAS, NO SÓLO LEERLAS ═══════════════════════
 *
 * Leer el código dice si una pieza expone `build()`. **No dice si construye
 * algo.** Y esa es justo la pregunta que importaba: `CarverEnvironmentFactory`
 * exponía `buildAll` y durante meses dibujó una rejilla vacía, porque se
 * construía sin los datos que pedía.
 *
 * Hasta ahora esto sólo se podía comprobar en un navegador (`labs/catalogo.html`)
 * porque las piezas importan `'three'`, un especificador que Node no resuelve.
 * Con `resolver_three.mjs` —que apunta al MISMO three que carga el navegador— se
 * hace aquí, y entra en `npm test`.
 *
 * ⚠️ SE EJECUTA EN UNA ESCENA DE MENTIRA, SIN RENDERER NI BUCLE. No se busca
 * belleza, se busca un número: cuántos objetos mete. Cero con `build()` presente
 * es la señal más útil de todas — quiere decir «le faltan datos», no «está rota».
 */
if (!process.argv.includes('--sin-ejecutar')) {
    /**
     * ⚠️ CUATRO GLOBALES DE MENTIRA, Y NADA MÁS.
     *
     * Muchas piezas tocan `localStorage`, `window` o `document` al arrancar. Sin
     * ellos ni llegan a construir nada y saldrían como «vacías» por un motivo
     * que no tiene que ver con lo que hacen.
     *
     * Se dan mínimos y tontos a propósito: lo justo para que no exploten. Si se
     * montara aquí un DOM de verdad (jsdom), esto dejaría de medir «¿construye
     * algo?» y pasaría a medir «¿funciona en mi simulacro?», que es otra cosa y
     * más frágil. Para lo de verdad está el navegador.
     */
    const nada = () => {};
    globalThis.localStorage ??= {
        _d: new Map(),
        getItem(k) { return this._d.get(k) ?? null; },
        setItem(k, v) { this._d.set(k, String(v)); },
        removeItem(k) { this._d.delete(k); },
    };
    globalThis.window ??= globalThis;
    globalThis.document ??= {
        createElement: () => ({ getContext: () => null, style: {}, appendChild: nada,
                                setAttribute: nada, addEventListener: nada }),
        querySelector: () => null, getElementById: () => null,
        body: { appendChild: nada }, addEventListener: nada,
    };
    globalThis.addEventListener ??= nada;

    const THREE = await import('three').catch(() => null);
    if (!THREE) {
        console.log('\n⚠️  sin `three`: lánzalo con  node --import ./resolver_three.mjs clasificar_piezas.mjs');
    } else {
        for (const r of resultado.filter(x => x.clase === 'escena')) {
            try {
                const mod = await import(pathToFileURL(path.join(SRC, r.ruta)).href);
                const pares = Object.entries(mod);
                const Clase = pares.map(([, v]) => v)
                    .find(v => typeof v === 'function' && /^[A-Z]/.test(v.name ?? ''));
                const objeto = !Clase && pares.map(([, v]) => v)
                    .find(v => v && typeof v === 'object'
                            && Object.keys(v).some(k => typeof v[k] === 'function'));

                const escena = new THREE.Scene();
                let inst = objeto;
                if (Clase) {
                    inst = Clase.length >= 2 ? new Clase(escena, {})
                         : Clase.length === 1 ? new Clase(escena) : new Clase();
                }
                for (const m of r.arranque) {
                    // Los objetos literales suelen guardar estado global y
                    // arrancarlos aquí, uno detrás de otro, se pisa. Sólo clases.
                    if (objeto) break;
                    // ⚠️ EL `await` NO SOBRA. Sin él, un método `async` que falla
                    // no lanza: devuelve una promesa rechazada, el `catch`
                    // síncrono no la ve y Node tumba el proceso entero por
                    // rechazo no gestionado. Pasó con `GymIdentity.init()`, que
                    // es async y pide `localStorage`.
                    try { await inst?.[m]?.(escena); } catch { /* se refleja en el conteo */ }
                }
                /**
                 * ⚠️ SE CUENTAN LAS MALLAS, NO LOS HIJOS DE LA ESCENA.
                 *
                 * La primera versión hacía `escena.children.length` y daba
                 * números que engañaban: una factoría que mete TODO dentro de un
                 * `Group` salía con «1 objeto» igual que otra que no puso nada.
                 * `ArcadeRoomManager` marcaba 2 y `KatamariFactory` 1 — con eso
                 * habría mandado a mirar las piezas equivocadas.
                 *
                 * Lo que importa es cuánta geometría hay, a la profundidad que
                 * sea. Y se guardan las dos cifras: la de raíz dice cómo está
                 * organizado, la de mallas dice si hay algo que ver.
                 */
                let mallas = 0, luces = 0;
                escena.traverse(o => { if (o.isMesh) mallas++; if (o.isLight) luces++; });
                r.objetos = escena.children.length;
                r.mallas = mallas;
                r.luces = luces;
            } catch (e) {
                r.objetos = null;
                r.fallo_al_ejecutar = e.message.slice(0, 110);
            }
        }
    }
}

const cuenta = {};
for (const r of resultado) cuenta[r.clase] = (cuenta[r.clase] ?? 0) + 1;

const salida = path.join(AQUI, 'public', 'data', 'clasificacion_piezas.json');
await mkdir(path.dirname(salida), { recursive: true });
await writeFile(salida, JSON.stringify({
    fecha: new Date().toISOString().slice(0, 10),
    total: resultado.length, cuenta, piezas: resultado,
}, null, 1), 'utf8');

console.log(`\n${resultado.length} piezas clasificadas → public/data/clasificacion_piezas.json\n`);
for (const [k, n] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(14)} ${String(n).padStart(3)}`);
}

const conObjetos = resultado.filter(r => typeof r.objetos === 'number');
if (conObjetos.length) {
    // Se ordena por MALLAS, que es lo que se ve, no por hijos de la raíz.
    const construyen = conObjetos.filter(r => r.mallas > 0).sort((a, b) => b.mallas - a.mallas);
    const vacias = conObjetos.filter(r => !r.mallas);
    console.log(`\n${construyen.length} construyen geometría al arrancarlas:`);
    for (const r of construyen) {
        console.log(`   ${r.nombre.padEnd(34)} ${String(r.mallas).padStart(5)} mallas`
                  + `${r.luces ? ` · ${r.luces} luces` : ''}`);
    }
    if (vacias.length) {
        console.log(`\n${vacias.length} exponen build/init y NO ponen nada (les faltan datos):`);
        for (const r of vacias) console.log(`   ${r.nombre}`);
    }
}

const fallan = resultado.filter(r => r.fallo_al_ejecutar);
if (fallan.length) {
    console.log(`\n${fallan.length} fallan al ejecutarse:`);
    for (const r of fallan) console.log(`   ${r.nombre.padEnd(30)} ${r.fallo_al_ejecutar}`);
}

const sospechosas = resultado.filter(r => r.usa_three_sin_importar || r.arranca_al_importar);
if (sospechosas.length) {
    console.log(`\n⚠️  ${sospechosas.length} pieza(s) que sólo funcionan donde nacieron:`);
    for (const s of sospechosas) {
        const por = [s.usa_three_sin_importar && 'usa THREE sin importarlo',
                     s.arranca_al_importar && 'se arranca sola al importarse'].filter(Boolean);
        console.log(`   ${s.nombre.padEnd(32)} ${por.join(' · ')}`);
    }
}
console.log('');

/**
 * ⚠️ SALIDA EXPLÍCITA, Y NO ES UN ATAJO: ES UN HALLAZGO.
 *
 * Al ejecutar las piezas, el proceso terminaba su trabajo —el JSON quedaba
 * escrito— y **no salía nunca**. Node no puede salir mientras haya un temporizador
 * pendiente, y varias piezas arrancan un `setInterval` en su `init()` sin
 * guardarse forma de pararlo.
 *
 * En un navegador eso no se nota, porque la página vive para siempre de todos
 * modos. Aquí sí: significa que esas piezas **no se pueden usar en lote ni parar
 * limpiamente**, que es un problema real el día que alguien quiera correr cien
 * episodios seguidos en un servidor.
 *
 * Se sale a mano para que la herramienta sirva hoy, y queda apuntado como deuda:
 * lo suyo es que toda pieza que arranca algo ofrezca cómo pararlo.
 */
process.exit(0);
