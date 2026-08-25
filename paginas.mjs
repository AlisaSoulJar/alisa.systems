/**
 * paginas.mjs — ¿CUÁNTO CÓDIGO PROPIO TIENE CADA PÁGINA?
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run paginas
 *
 * El patrón dorado de una página, dicho del derecho: **no debería saber hacer
 * casi nada**. Compone piezas compartidas —el sustrato, un pintor, una factoría,
 * `montarMundo`— y aporta cosmética. Ni reglas, ni dibujo, ni física.
 *
 * ⚠️ POR QUÉ SE MIDE, Y NO SE DEJA COMO BUENA INTENCIÓN.
 *
 * Una página con lógica propia acierta el día que se escribe y se separa
 * después. Es lo que pasó con ¡Busca!: sus tres páginas llevaban el juego
 * escrito dentro mientras el banco medía otro motor, y la persona y el agente
 * jugaron dos juegos con el mismo nombre durante semanas.
 *
 * `defiende_sendero.html` acaba de pasar por esto: sus cuarenta líneas de lienzo
 * se fueron a `PintorMatriz` y lo único que le queda es qué emoji lleva cada
 * torreta. Ese es el listón.
 *
 * LO QUE SE CUENTA
 *   propio     líneas de código en sus `<script type="module">`
 *   compone    cuántas piezas compartidas importa
 *   señales    marcas de que hace algo que no le toca: pintar a mano en un
 *              lienzo, tocar mallas de THREE, o aritmética de simulación
 *   sustrato   si lo que enseña sale de `sustrato()` o se lo saca al motor
 *
 * ⚠️ LAS DOS COLUMNAS NO MIDEN LO MISMO, Y ESA ES LA TRAMPA.
 *
 * `raccoon_planet.html` compone tres piezas compartidas y no dibuja ni una malla
 * — sale «limpia» de sobra. Pero lee el estado del motor por dentro
 * (`nucleo.ciudades[i].escaneada`), no el sustrato. Es exactamente lo que era
 * ¡Busca! cuando la persona y el banco jugaban a dos juegos con el mismo nombre.
 *
 * Componer bien evita duplicar máquina. Leer el sustrato evita duplicar VERDAD.
 * Sólo lo segundo es la tesis, y por eso va en columna aparte.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const DIRS = ['public/games', 'public/labs'];

/** Piezas compartidas: si una página importa esto, está componiendo. */
const COMPARTIDAS = [
    'montarMundo', 'montarMesa', 'pintor_matriz', 'pintor_mundo', 'mesa_tablero',
    'mesa_cartas', 'Factory', 'alisa-engine/src', 'protohub', '/js/sfx',
];

/**
 * ⚠️ SEÑALES DE QUE UNA PÁGINA HACE LO QUE NO LE TOCA.
 *
 * No son pecados por sí solas —una página puede necesitar un `fillRect` para un
 * HUD— pero juntas dibujan el perfil de una página que se ha escrito su propio
 * motor. Se cuentan y se dicen; el juicio es de quien lea.
 */
const SENALES = [
    [/ctx\.(fillRect|arc|fillText|drawImage|beginPath)/g, 'pinta a mano'],
    [/new THREE\.(Mesh|Geometry|\w*Geometry)/g, 'crea mallas'],
    [/\.position\.(set|copy|add)\(/g, 'mueve objetos 3D'],
    [/\bMath\.(hypot|atan2)\(/g, 'hace geometría'],
    [/\*\s*dt\b|\bdt\s*\*/g, 'integra por tiempo'],
];

const filas = [];
for (const d of DIRS) {
    let ficheros = [];
    try { ficheros = readdirSync(path.join(RAIZ, d)).filter(f => f.endsWith('.html')); } catch { continue; }
    for (const f of ficheros) {
        const bruto = readFileSync(path.join(RAIZ, d, f), 'utf8');
        let codigo = '';
        for (const m of bruto.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)) codigo += m[1] + '\n';
        if (!codigo.trim()) continue;

        /**
         * Se quitan los comentarios ANTES de contar. En esta casa se comenta
         * mucho a propósito, y contar prosa como código diría que las páginas
         * mejor documentadas son las peores — que es lo contrario de la verdad.
         * (Y ya me ha pasado cuatro veces con otros detectores.)
         */
        const limpio = codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        const propio = limpio.split('\n').filter(l => l.trim()).length;
        const compone = COMPARTIDAS.filter(p => new RegExp(`import[^;]*${p}`).test(limpio)).length;
        const senales = SENALES
            .map(([re, que]) => [(limpio.match(re) ?? []).length, que])
            .filter(([n]) => n > 0);
        /**
         * ⚠️ NO BASTA CON QUE LA PÁGINA NOMBRE EL SUSTRATO: TIENE QUE PINTARLO.
         *
         * La primera versión de esto buscaba `sustrato(` en cualquier parte, y
         * era inútil: ¡Defiende! lo llama en dos sitios —al dibujar y al
         * publicarlo en `window`— así que cambiar el dibujo a `observacion()`
         * seguía dando «sí». El sabotaje habría pasado con el cable cortado, que
         * es el fallo que llevo cometiendo toda la semana con mis propios
         * detectores.
         *
         * Lo que se exige es que el sustrato **entre en la llamada que pinta**.
         * Los dos pintores —plana y 3D— se llaman igual, `pintar(sus)`, así que la
         * regla vale para las dos sin saber cuál usa la página.
         */
        const sustrato = /pintar\s*\([^)]*sustrato/.test(limpio)
            || (/\b(?:const|let|var)\s+\w+\s*=\s*[^;\n]*sustrato\s*\(/.test(limpio)
                && /pintar\s*\(/.test(limpio));
        filas.push({
            f, propio, compone, senales, sustrato,
            esJuego: d === 'public/games',
            peso: senales.reduce((s, [n]) => s + n, 0),
        });
    }
}

filas.sort((a, b) => b.peso - a.peso || b.propio - a.propio);

console.log('\n  ¿Cuánto código propio tiene cada página?\n');
console.log('  página                              propio  compone  sustrato  señales de hacer lo que no le toca');
for (const r of filas) {
    const s = r.senales.map(([n, q]) => `${q}×${n}`).join(', ');
    const sus = r.sustrato ? '   sí   ' : '   no   ';
    console.log(`  ${r.f.padEnd(36)} ${String(r.propio).padStart(6)}  ${String(r.compone).padStart(7)}  ${sus}  ${s || '—'}`);
}

/**
 * ⚠️ EL TECHO SÓLO BAJA.
 *
 * Como el suelo de juegos completos, pero al revés: la suma de «señales» de todas
 * las páginas no puede subir. Una página nueva que se escriba su propio dibujo lo
 * dice aquí, y el día que se limpie una se actualiza a la baja.
 *
 * Medido el 25-08, después de pasar `defiende_sendero.html` a `PintorMatriz`.
 */
const TECHO_SENALES = 341;
const total = filas.reduce((s, r) => s + r.peso, 0);
console.log(`\n  señales en total: ${total} (techo: ${TECHO_SENALES})`);
console.log(`  ${filas.filter(r => r.peso === 0).length} de ${filas.length} páginas no hacen nada que no les toque`);

/**
 * ⚠️ Y EL SUELO QUE IMPORTA: CUÁNTOS JUEGOS ENSEÑAN EL SUSTRATO.
 *
 * Sólo se exige a `public/games` — los laboratorios son experimentos y no
 * pretenden ser la vista de un juego que el banco también mide. Exigírselo sería
 * medir por medir, y ya me ha pasado cuatro veces acusar a código sano.
 *
 * Medido el 25-08. Sube cuando se enchufa una página; nunca baja.
 *
 * ⚠️ Y SE PONE EN LO MEDIDO, NO EN UN NÚMERO CÓMODO.
 *
 * Estuvo un rato en 1 con dos páginas enchufadas, y con ese margen el sabotaje
 * APROBABA con el cable cortado: se podía romper ¡Defiende! entero y el suelo
 * seguía cumpliéndose gracias a ¡Busca!. Un trinquete con holgura no es un
 * trinquete, es un adorno.
 */
const SUELO_SUSTRATO = 2;
const juegos = filas.filter(r => r.esJuego);
const conSustrato = juegos.filter(r => r.sustrato);
console.log(`\n  juegos que enseñan el sustrato: ${conSustrato.length} de ${juegos.length} (suelo: ${SUELO_SUSTRATO})`);
console.log(`  ${conSustrato.map(r => r.f).join(', ') || '—'}`);
const sinSustrato = juegos.filter(r => !r.sustrato).map(r => r.f);
if (sinSustrato.length) console.log(`  leen el motor por dentro: ${sinSustrato.join(', ')}`);

let mal = 0;
if (total > TECHO_SENALES) { console.log(`\n  ✗ el techo de señales ha subido de ${TECHO_SENALES} a ${total}`); mal++; }
if (conSustrato.length < SUELO_SUSTRATO) { console.log(`\n  ✗ el suelo de sustrato ha bajado de ${SUELO_SUSTRATO} a ${conSustrato.length}`); mal++; }
console.log('');
process.exit(mal ? 1 : 0);
