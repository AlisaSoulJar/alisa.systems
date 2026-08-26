/**
 * EL NÚCLEO DE UN JUEGO CUMPLE SU CONTRATO, Y NO PUEDE CUMPLIRLO MENOS
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_contrato.mjs
 *
 * Un núcleo es la pieza que POSEE EL MUNDO de una etapa. La página lo mira para
 * dibujar y el banco para medir, y por eso la persona y el agente juegan a lo
 * mismo. Si un núcleo deja de publicar su mundo, no se rompe nada: simplemente
 * el aviso de un beta deja de traer partida y la nota deja de poder repetirse.
 * Nadie mira eso en una batería — por eso esto existe.
 *
 * Vigila tres cosas, y las tres son de la clase «se deshace sola y en silencio»:
 *
 *   1. que cada núcleo declarado siga cumpliendo `GameContract`;
 *   2. que siga siendo HEADLESS — sin THREE ni DOM. Es la línea que separa un
 *      núcleo de una vista, y cruzarla no da error: simplemente el banco ya no
 *      puede ejecutarlo, y la etapa se queda sin nota sin que nadie lo note;
 *   3. que el SUELO no baje. Hoy son 7 núcleos; que entre uno más está bien,
 *      que salga uno no.
 *
 * ⚠️ EL CONTRATO SALE DE UN CENSO, NO DE UNA OPINIÓN.
 * Iba a exigir `tick(dt)` a todos. El censo de los ocho núcleos dijo que
 * avanzar el mundo se dice de cuatro maneras y que tres no lo dicen de ninguna,
 * mientras `sustrato()` lo tienen 6 de 8. Así que se exige lo que ya existía sin
 * nombre y el verbo de avanzar va por familias. Está explicado en
 * `GameContract.js`.
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NUCLEOS, SIN_NUCLEO, OBLIGATORIO, PEDIDO, FAMILIAS, revisar }
    from './public/js/alisa-engine/src/world/core/GameContract.js';

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const RAIZ = 'public/js/alisa-engine/src';

/**
 * ⚠️ EL SUELO, Y ES UN NÚMERO QUE SÓLO PUEDE SUBIR.
 *
 * Empezó en 6 el 2026-08-26 y subió a 7 el mismo día, al sacar
 * `InteractionLabSystem` de dentro de su motor. Quedan fuera ¡Busca! 2 y
 * ¡Busca! 3, y el porqué de cada una está escrito en `SIN_NUCLEO` — no en la
 * cabeza de nadie.
 */
const SUELO_NUCLEOS = 9;

/**
 * ⚠️ Y EL OTRO SUELO: CUÁNTOS CUMPLEN EL CONTRATO ENTERO.
 *
 * Empezó en 2 de 6 — el mismo número que tenía el pipeline cinematográfico antes
 * de `montarMundo`, y por el mismo motivo: nadie lo quitó, nadie lo copió.
 *
 *     2/6  →  3/7  al sacar `InteractionLabSystem`, que nació cumpliéndolo
 *          →  4/7  al renombrar `update` → `tick` en `BulletHeavenEngine`
 *          →  6/7  al dar `reset` a AsteroidsSystem y `reset`+`step` a
 *                  CabinetEscapeSystem
 *
 * Y sube DE UNO EN UNO a propósito: cada uno tocaba una etapa que el banco mide,
 * así que se hizo solo y se abrió el juego a mirarlo. Ponerlo en 7 de golpe para
 * que la prueba se calle es cambiar el número sin cambiar la casa.
 *
 * Queda `tick` en ChopperAquariumEngine, y ése NO es un renombrado: su verbo se
 * llama `stepSimulation`, que es la PUERTA DE LOS AGENTES — la usan
 * `alisa_sim_sdk.js`, los dos gym runners del chopper, y hay un laboratorio que
 * comprueba que exista. Mover eso sin avisar rompe a terceros, así que está
 * consultado con Motoko, Annie y Codex antes de tocarlo.
 */
const SUELO_CUMPLEN = 9;

console.log('\nEl núcleo de un juego cumple su contrato\n');
const fallos = [];

const sinComentarios = (t) =>
    t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// ── 1 — TODOS publican su mundo. Esto no admite suelo ───────────────────────
let cumplen = 0;
const sinPublicar = [];
const aMedias = [];
for (const n of NUCLEOS) {
    const mod = await import(`./${RAIZ}/${n.ruta}`.replace(/\\/g, '/'));
    const Clase = mod[n.clase];
    if (!Clase) {
        fallos.push(`${n.etapa}: ${n.ruta} no exporta \`${n.clase}\``);
        continue;
    }
    const r = revisar(Clase, n.familia);
    if (!r.publica) sinPublicar.push(`${n.etapa} (${n.clase})`);
    if (r.cumple) cumplen++;
    else if (r.publica) aMedias.push(`${n.clase} → le falta ${r.faltan.join(', ')}`);

    /**
     * ⚠️ Y ADEMÁS SE INSTANCIA, PORQUE MIRAR LA CLASE NO BASTA.
     *
     * Lo aprendí rompiéndolo el 2026-08-26. Al renombrar `update` → `tick` en
     * `BulletHeavenEngine`, el método quedó perfecto en el prototipo… y la clase
     * YA TENÍA un campo `this.tick = 0`, el contador de tics. Una propiedad de
     * instancia SOMBREA al método: `g.tick` era el número 0 y `g.tick(dt)`
     * reventaba con «is not a function».
     *
     * Esta prueba daba verde: el prototipo tenía todo lo pedido. El juego estaba
     * roto. Un contrato que se comprueba sobre la clase no dice nada sobre lo
     * que le pasa al objeto.
     *
     * Se construye sin argumentos y en try/catch: un núcleo puede exigir
     * configuración, y no poder instanciarlo no es un fallo del contrato. Pero
     * si se deja instanciar, lo que prometió tiene que seguir siendo una función.
     */
    let inst = null;
    try { inst = new Clase(); } catch { /* pide configuración: no es asunto de esto */ }
    if (inst) {
        const tapados = r.tiene.filter((m) => typeof inst[m] !== 'function');
        if (tapados.length) {
            fallos.push(`${n.etapa} (${n.clase}): la INSTANCIA tapa ${tapados
                .map((m) => `\`${m}\` (es ${typeof inst[m]})`).join(', ')} — `
                + 'un campo del objeto con el mismo nombre sombrea al método');
        }
    }
}
if (sinPublicar.length) {
    fallos.push(`no publican \`${Object.keys(OBLIGATORIO).join('/')}\`, así que su etapa `
        + `no puede repintarse ni repetirse: ${sinPublicar.join(', ')}`);
} else {
    console.log(`  ${verde('✓')} los ${NUCLEOS.length} núcleos publican `
        + `${Object.keys(OBLIGATORIO).join(' + ')}`
        + gris(' — el idioma que hace que texto, números, 2D y 3D hablen del mismo mundo'));
}

// ── 2 — y cuántos cumplen el contrato ENTERO. Esto sí lleva suelo ───────────
if (cumplen < SUELO_CUMPLEN) {
    fallos.push(`cumplían el contrato entero ${SUELO_CUMPLEN} núcleos y quedan ${cumplen}: `
        + 'este número sólo puede subir');
} else {
    const sube = cumplen > SUELO_CUMPLEN ? verde(`  (${cumplen}: sube el suelo)`) : '';
    console.log(`  ${verde('✓')} ${cumplen}/${NUCLEOS.length} cumplen el contrato entero`
        + ` (${[...Object.keys(OBLIGATORIO), ...Object.keys(PEDIDO)].join(' + ')} + verbo)`
        + sube
        + gris(`  · turnos: ${FAMILIAS.turnos.metodo} · tiempo real: ${FAMILIAS.tiempo_real.metodo}`));
    // Lo que falta se DICE aunque no falle: un suelo que no enseña la deuda
    // acaba siendo una excusa para no subirlo.
    aMedias.forEach((s) => console.log(gris(`      ${s}`)));
}

// ── 3 — y siguen siendo headless ────────────────────────────────────────────
//
// Se mira el FICHERO y no el módulo cargado a propósito: importar `three` en
// Node funciona (hay resolver), así que un núcleo podría ensuciarse y esta
// prueba pasaría igual. Lo que rompe al banco es la dependencia, no el import.
const SUCIO = [
    ['three', /^\s*import[^\n]*['"]three/m],
    ['DOM', /\b(document|window)\s*\./],
];
const manchados = [];
for (const n of NUCLEOS) {
    const t = sinComentarios(await readFile(path.join(RAIZ, n.ruta), 'utf-8'));
    const m = SUCIO.filter(([, rx]) => rx.test(t)).map(([nom]) => nom);
    if (m.length) manchados.push(`${n.clase} (${m.join('+')})`);
}
if (manchados.length) {
    fallos.push(`núcleos atados a la pantalla, el banco ya no puede correrlos: ${manchados.join(', ')}`);
} else {
    console.log(`  ${verde('✓')} los ${NUCLEOS.length} son headless`
        + gris(' — sin three ni DOM, así que el banco puede ejecutarlos'));
}

// ── 4 — el suelo ────────────────────────────────────────────────────────────
if (NUCLEOS.length < SUELO_NUCLEOS) {
    fallos.push(`había ${SUELO_NUCLEOS} núcleos declarados y quedan ${NUCLEOS.length}: `
        + 'este número sólo puede subir');
} else {
    const nuevo = NUCLEOS.length > SUELO_NUCLEOS ? ` (${NUCLEOS.length}: sube el suelo)` : '';
    console.log(`  ${verde('✓')} ${NUCLEOS.length} núcleos declarados${nuevo}`
        + gris(`  · ${SIN_NUCLEO.length} etapas sin núcleo, y cada una dice por qué`));
}

// ── 5 — lo que falta está DICHO, no supuesto ────────────────────────────────
//
// Una lista de lo que falta al lado de la de lo que hay es lo que impide que
// dentro de un mes alguien crea que el mapa está completo. Si alguien añade una
// etapa a `SIN_NUCLEO` sin explicar por qué, esto lo dice.
const mudas = SIN_NUCLEO.filter((s) => !s.porque || s.porque.length < 40);
if (mudas.length) {
    fallos.push(`${mudas.length} etapa(s) sin núcleo y sin explicar por qué: `
        + mudas.map((s) => s.etapa).join(', '));
} else {
    console.log(`  ${verde('✓')} las ${SIN_NUCLEO.length} etapas sin núcleo declaran su motivo`
        + gris(' — faltar no es lo mismo que faltar en silencio'));
}

if (fallos.length) {
    console.log(rojo(`\n✗ ${fallos.length} fallo(s):`));
    fallos.forEach((f) => console.log(rojo(`    · ${f}`)));
    process.exit(1);
}
console.log(verde('\n✓ los núcleos poseen su mundo, lo publican y corren sin pantalla\n'));
