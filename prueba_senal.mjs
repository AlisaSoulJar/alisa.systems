/**
 * ¿PUNTÚA A ALGUIEN ESTE ENTORNO, O LE DA LA MISMA NOTA A TODO EL MUNDO?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_senal.mjs      → 0 todo bien · 1 hay fallos
 *
 * El banco ya comprobaba que sus entornos se importan, aceptan sus verbos y son
 * REPETIBLES: misma semilla, mismo resultado. Eso es la mitad del contrato —«lo
 * que no verifica, no puntúa»— y la otra mitad no la miraba nadie:
 *
 *     **lo que no DISTINGUE tampoco puntúa.**
 *
 * Un entorno que le da la misma nota a tres políticas distintas es perfectamente
 * verificable y no sirve para comparar a nadie. Sale en verde en todas las
 * comprobaciones que había, publica su recibo, entra en la tabla — y la tabla no
 * significa nada, porque la nota no depende de lo que hiciste. Es el modo de
 * fallo favorito de esta casa: verde y sin significar nada.
 *
 * Medido el 23-08 sobre los 46: siete no separaban. Dos con razón —`guerra` es un
 * juego de control sin decisiones, y a `sokoban` le tocó una semilla trivial— y
 * cinco de verdad, tres de ellos dando CERO a todo el mundo durante 150 pasos.
 *
 * ⚠️ Y ESTA PRUEBA TIENE UNA TRAMPA PROPIA, QUE ME COMIÓ CUATRO INTENTOS.
 * ───────────────────────────────────────────────────────────────────────────
 * «Las tres políticas sacan lo mismo» sólo significa algo si de verdad JUGARON
 * distinto. En los cuatro primeros intentos no lo hacían, por cuatro motivos
 * distintos, y las cuatro veces el resultado parecía un hallazgo:
 *
 *   1. `ciclo`/`primera`/`ultima` son la misma política si hay una sola opción.
 *   2. Mandar `opcion.verb` a secas junta las ocho de CabinetEscape en una: lo
 *      que las distingue vive en `args.cajon`. (`check_gym_envs.mjs` tiene este
 *      mismo fallo en su línea 77.)
 *   3. Mandar la OPCIÓN ENTERA es peor: no da error y **no hace nada**. Medido en
 *      oca — doce pasos, cero recompensa, el mismo `tirar` una y otra vez,
 *      mientras `action` da 220. La llamada más natural para quien lee
 *      `affordances()` es la que se ignora en silencio.
 *   4. Y mi traza guardaba `args`, que en muchos entornos está vacío: entonces
 *      todas las jugadas parecían la misma y salía «no hay elección que hacer»
 *      para entornos con siete opciones por paso.
 *
 * Por eso aquí se mide y se PUBLICA cuántas trazas distintas hubo. Si son una,
 * este instrumento no puede opinar y lo dice, en vez de acusar.
 */
import { CATALOGO } from './public/js/alisa-engine/src/gym/registro.js';

/**
 * ⚠️ TRINQUETE. Los entornos que hoy no separan, con su motivo. **Sólo puede
 * bajar.** Si sube, es que se ha añadido al banco un entorno que no puede
 * puntuar a nadie, y eso es justo lo que no queremos que pase callando.
 *
 * Los dos primeros tienen defensa y se quedan explicados, no tachados: un juego
 * de control no tiene decisiones que medir, y una semilla trivial es un problema
 * del generador de niveles, no del entorno.
 */
const NO_SEPARAN = {
    'alisa/guerra-protohub-v0':    'es un juego de CONTROL: la única jugada es voltear, no hay nada que decidir',
    'alisa/sokoban-protohub-v0':   'la semilla 1234 da un nivel que se resuelve de una jugada (14% de 200 semillas lo hacen)',
    'alisa/oca-protohub-v0':       'los dados mandan: casi todas las jugadas son forzadas',
    'alisa/relevo-protohub-v0':    'la recompensa es un castigo por paso, y no depende de lo que hagas',
    'alisa/snake-protohub-v0':     'cero recompensa en 21 pasos: sólo premia comer, y dando vueltas no se come',
    'alisa/RaccoonSpace-v0':       'CERO recompensa en 150 pasos con 7 opciones por paso',
    'alisa/ChopperAquarium-v0':    'CERO recompensa en 150 pasos con 9 opciones por paso',
};
const TECHO_PLANOS = Object.keys(NO_SEPARAN).length;   // 23-08: 7 de 46

const ENTORNOS = Object.fromEntries(CATALOGO.map(e => [e.id, e.cargar]));
const PASOS = 150;

/** Tres formas de recorrer las opciones. Distintas de verdad si hay más de una. */
const POLITICAS = [
    (v, i) => v[i % v.length],
    (v) => v[0],
    (v) => v[v.length - 1],
];

/**
 * Las dos formas VÁLIDAS de mandar una jugada. La opción entera no está: se
 * ignora en silencio (ver el punto 3 de la cabecera), así que incluirla haría que
 * el entorno pareciera plano por culpa de quien lo llama.
 */
const FORMAS = [['action', (o) => o.action], ['verb', (o) => o.verb]];

function correr(Clase, comoMandar) {
    const notas = [], trazas = [], pasos = [];
    for (const elegir of POLITICAS) {
        const env = new Clase();
        env.reset(1234);
        let r = 0, n = 0;
        const traza = [];
        for (let i = 0; i < PASOS; i++) {
            const v = env.affordances();
            if (!v.length) break;
            const o = elegir(v, i);
            // La traza guarda las TRES señas: verbo, argumentos y acción nativa.
            // Con sólo `args` —que muchos entornos dejan vacío— dos jugadas
            // distintas parecían la misma.
            traza.push(JSON.stringify([o.verb, o.args ?? null, o.action ?? null]));
            let paso;
            try { paso = env.step(comoMandar(o)); } catch { break; }
            r += (paso?.reward ?? 0);
            n++;
            if (paso?.done) break;
        }
        notas.push(r); trazas.push(traza.join('|')); pasos.push(n);
    }
    return {
        notas,
        pasos: Math.max(...pasos),
        jugadas: new Set(trazas).size,
        separa: new Set(notas.map(x => x.toFixed(3))).size,
    };
}

console.log('\n¿Le da este entorno la misma nota a todo el mundo?\n');

const fallos = [];
const planos = [], vivos = [], mudos = [];

for (const e of CATALOGO) {
    let Clase;
    try { Clase = await ENTORNOS[e.id](); }
    catch (err) { fallos.push(`${e.id}: no se pudo cargar (${err.message.slice(0, 50)})`); continue; }

    let mejor = null;
    for (const [nombre, f] of FORMAS) {
        const r = correr(Clase, f);
        // Gana la que más separa; a igualdad, la que más lejos llega.
        if (!mejor || r.separa > mejor.separa
            || (r.separa === mejor.separa && r.pasos > mejor.pasos)) {
            mejor = { ...r, forma: nombre };
        }
    }

    // Si las tres políticas jugaron lo MISMO, este instrumento no ha probado
    // nada y lo dice: no hay más de una opción que tomar.
    if (mejor.jugadas === 1 && mejor.separa === 1) mudos.push([e.id, mejor]);
    else if (mejor.separa > 1) vivos.push([e.id, mejor]);
    else planos.push([e.id, mejor]);
}

for (const [id, m] of [...planos, ...mudos]) {
    const razon = NO_SEPARAN[id];
    const marca = razon ? '·' : '✗';
    console.log(`  ${marca} ${id.padEnd(30)} ${m.notas.map(n => n.toFixed(1)).join(' ')}`
              + `  (${m.pasos} pasos, ${m.jugadas}/3 jugadas distintas)`);
    if (razon) console.log(`      ${razon}`);
    else fallos.push(`${id}: tres políticas distintas sacan ${m.notas[0].toFixed(1)} las tres`
                   + ` — este entorno no puede puntuar a nadie`);
}

const total = planos.length + mudos.length;
console.log(`\n  ${vivos.length}/${CATALOGO.length} entornos dan notas distintas a políticas distintas`);
console.log(`  ${total} no separan (techo: ${TECHO_PLANOS})`);

if (total > TECHO_PLANOS) {
    fallos.push(`la deuda subió: ${total} entornos no separan y el techo estaba en ${TECHO_PLANOS}. `
              + 'Alguien ha añadido al banco un entorno que le da la misma nota a todo el mundo.');
} else if (total < TECHO_PLANOS) {
    console.log(`\n  ↓ la deuda bajó. Baja TECHO_PLANOS a ${total} y quita de NO_SEPARAN`
              + ' los que ya separan — un trinquete que no se aprieta no aprieta.');
}

/**
 * CONTROL POSITIVO. Si esto midiera mal y diera «todos separan», el número de
 * arriba saldría perfecto y no significaría nada. Así que se exige que al menos
 * un entorno conocido SÍ separe: si ni ése lo hace, la rota es la prueba.
 */
if (!vivos.length) {
    fallos.push('CONTROL POSITIVO FALLIDO: ningún entorno separa. Antes de creer '
              + 'que el banco entero está roto, sospecha de esta prueba.');
}

if (fallos.length) {
    console.log(`\n✗ ${fallos.length} fallo(s):`);
    fallos.forEach(f => console.log(`    · ${f}`));
    process.exit(1);
}
console.log('\n✓ los entornos que puntúan, puntúan; y los que no, están declarados\n');
