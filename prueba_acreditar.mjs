/**
 * prueba_acreditar.mjs — la vara de medir, medida
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_acreditar.mjs      → 0 bien · 1 mal · 2 la prueba no vale
 *
 * ⚠️ POR QUÉ EXISTE, Y ES INCÓMODO.
 *
 * `acreditar.mjs` es lo que decide si la partida de alguien vale. Su cabecera lo
 * dice mejor que yo: «la ley de la federación dice que la especialización sale de
 * los recibos y no de las declaraciones — pero un recibo que cualquiera puede
 * sacar dando botones al azar es una declaración con más pasos».
 *
 * Y esa herramienta **no la corría `npm test` ni la vigilaba ningún sabotaje**.
 * El 29-08-2026 le encontré dos fallos en la misma hora, jugando el primer agente
 * externo que ha usado el banco:
 *
 *   1. No dejaba jugar a la casa. En un juego de dos asientos, eso significa que
 *      el recibo y las siete políticas ciegas juegan TAMBIÉN por el rival: la nota
 *      no mide jugar, mide construir una línea a favor. Motoko sacó 1000 puntos en
 *      el ajedrez haciendo el mate del loco con las negras — eligiéndolas ella.
 *
 *   2. Y por eso su cabecera MENTÍA. Prometía comparar «contra EL MISMO SUELO que
 *      usa el banco», y el suelo publicado lo mide `prueba_senal.mjs` a través del
 *      entorno de gym, que sí hace jugar a la casa. Para todo juego de más de un
 *      asiento, aquí se recalculaba un suelo distinto del publicado.
 *
 * Un recibo de dominó bien jugado salía «NO ACREDITA, 3 jugadas ilegales». Con la
 * casa puesta, el mismo recibo acredita por 10 puntos. O sea: la vara estaba
 * torcida y el que salía perdiendo era siempre quien jugaba bien.
 *
 * Y hubo un tercero, que encontró esta misma prueba en su primera pasada: su
 * cabecera prometía comparar «contra el mismo suelo que usa el banco» y la tabla
 * publicada mide otra cosa —suma de recompensas por el entorno de gym, no
 * puntuación final sobre las reglas—. La promesa se corrigió allí; aquí se vigila
 * lo que sí tiene que ser verdad.
 *
 * ⚠️ ESTO NO COMPRUEBA QUE ACREDITE A QUIEN DEBE — eso es una opinión. Comprueba
 *    las tres cosas que sí son verificables: que la casa juegue, que el recibo y
 *    las siete ciegas se puntúen por el mismo camino, y que los tres veredictos
 *    existan y se distingan.
 */
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const correr = promisify(execFile);
const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

const fuente = await readFile('./acreditar.mjs', 'utf8');

console.log('\n¿Está derecha la vara de medir?\n');

// ── 1. LA CASA JUEGA ────────────────────────────────────────────────────────
/**
 * ⚠️ SE MIDE JUGANDO, NO LEYENDO EL FICHERO.
 *
 * Podría bastar con buscar `sugerencia` en el texto, y sería la comprobación que
 * no sirve: alguien deja la función y la deja de llamar, y esto seguiría verde.
 * Lo que se hace es un recibo IMPOSIBLE con la casa puesta —dos jugadas seguidas
 * del mismo bando en el ajedrez— y se exige que lo rechace.
 */
{
    comprobaciones++;
    const { stdout } = await correr('node',
        ['acreditar.mjs', '--juego', 'ajedrez', '--semilla', '1234',
         '--jugadas', 'e2e4,f7f6,d2d4,g7g5,d1h5'],
        { cwd: process.cwd() }).catch((e) => ({ stdout: e.stdout ?? '' }));

    if (!/ilegales/.test(stdout)) {
        mal('el mate del loco jugando las dos bandas sigue colando: la casa no juega. '
            + 'Con casa, `f7f6` no puede ser legal después de `e2e4`.');
    }
}

// ── 2. EL RECIBO Y LAS CIEGAS SE PUNTÚAN IGUAL ──────────────────────────────
/**
 * ⚠️ ESTA ES LA INVARIANTE QUE DE VERDAD SOSTIENE EL VEREDICTO.
 *
 * La primera versión de esta comprobación exigía que el suelo calculado aquí
 * coincidiera con el publicado en `suelo_por_entorno.json`, porque la cabecera de
 * `acreditar.mjs` prometía que eran el mismo. Salió roja, y **tenía razón**: la
 * tabla publicada acumula la SUMA DE RECOMPENSAS jugando por el entorno de gym, y
 * `acreditar` devuelve la PUNTUACIÓN FINAL jugando sobre las reglas. Dos
 * cantidades distintas. La promesa se ha corregido allí en vez de ablandar esto.
 *
 * Lo que sí tiene que cumplirse, y es lo que hace justa la comparación: **el
 * recibo y las siete ciegas se puntúan por el mismo camino**. Si el anónimo se
 * midiera de una forma y las ciegas de otra, el veredicto sería una moneda
 * trucada, y ninguna lectura del código lo delataría.
 *
 * Se comprueba jugando: se reproduce a mano la política «primera» —coger siempre
 * la primera jugada legal—, se le da esa lista como si fuera un recibo, y se
 * exige que el anónimo saque EXACTAMENTE lo que acreditar le atribuye a «primera».
 */
{
    const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
    const reglas = await cargarReglas('sokoban', {});
    const p = reglas.nuevaPartida({ semilla: 99, seed: 99 });
    const jugadas = [];
    for (let i = 0; i < 60; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const m = (st.legal_moves ?? [])[0];
        if (!m || !reglas.mover(p, m)) break;
        jugadas.push(String(m));
    }

    comprobaciones++;
    if (jugadas.length < 5) {
        console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${jugadas.length} jugadas. `
            + 'Con tan pocas, que dos números coincidan no significa nada.\n'));
        process.exit(2);
    }

    const { stdout } = await correr('node',
        ['acreditar.mjs', '--juego', 'sokoban', '--semilla', '99', '--jugadas', jugadas.join(',')],
        { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
        .catch((err) => ({ stdout: err.stdout ?? '' }));

    const anon = stdout.match(/anónimo\s+(-?[\d.]+)/);
    const prim = stdout.match(/· primera\s+(-?[\d.]+)/);
    comprobaciones += 2;
    if (!anon || !prim) mal('no consigo leer «anónimo» y «primera» de la salida de acreditar.mjs');
    else if (Number(anon[1]) !== Number(prim[1])) {
        mal(`re-jugando la política «primera» como recibo, el anónimo saca ${anon[1]} y a ella `
            + `se le atribuye ${prim[1]}. El recibo y las ciegas no se puntúan igual, así que `
            + 'el veredicto compara dos cosas distintas.');
    }
}

// ── 3. RELLENAR EL RECIBO CON JUGADAS INÚTILES NO PAGA MÁS ─────────────────
/**
 * ⚠️ EL ATAQUE DEL NO-OP, Y LO ENCONTRÓ MOTOKO EN VEINTE MINUTOS.
 *
 * En SC-144 escribí que el dedupe era «exacto por construcción» porque el recibo
 * es determinista. Su respuesta: «un jugador puede coger una ruta ganadora de
 * Sokoban y añadirle al final un movimiento contra la pared; el hash de las
 * jugadas cambia, pero el trabajo es el mismo».
 *
 * Al comprobarlo salió peor de lo que ella pensaba. El horizonte de las siete
 * políticas ciegas salía de la LONGITUD DE LA LISTA, así que pegar jugadas
 * inútiles les daba más pasos para perder puntos:
 *
 *     recibo original       ✓ supera por 101.0
 *     el mismo + 1 NO-OP    ✓ supera por 102.0     ← MÁS
 *
 * O sea que rellenar estaba doblemente premiado: esquivaba el dedupe Y subía el
 * margen. Arreglado contando las jugadas EFECTIVAS —las que el árbitro aceptó— en
 * vez de las que trae la lista.
 *
 * Esto lo vigila comparando los dos veredictos, que es la única forma de que no
 * vuelva: el fallo no estaba en una línea reconocible, estaba en qué número se le
 * pasaba a una función.
 */
{
    const ruta = 'arriba,abajo,abajo,izquierda,izquierda,arriba,arriba,arriba,'
               + 'derecha,abajo,abajo,izquierda,abajo,derecha';
    const margen = async (jugadas) => {
        const { stdout } = await correr('node',
            ['acreditar.mjs', '--juego', 'sokoban', '--semilla', '99', '--jugadas', jugadas],
            { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
            .catch((err) => ({ stdout: err.stdout ?? '' }));
        /**
         * ⚠️ NI ACENTOS NI COLORES. La primera versión buscaba la frase entera
         *    —«supera a la mejor política ciega por N»— y devolvía `NaN` siempre:
         *    la salida viene con códigos ANSI y con la acentuación cambiada al
         *    capturarla desde otro proceso. Un instrumento que devuelve NaN y lo
         *    compara con NaN da rojo pase lo que pase, que es tan inútil como uno
         *    que da verde pase lo que pase.
         */
        /**
         * ⚠️ Y EL PUNTO FINAL DE LA FRASE NO ES PARTE DEL NÚMERO.
         *    La frase acaba en «por 101.0.» y `[\d.]+` se comía también el punto,
         *    así que `Number('101.0.')` daba NaN y la comprobación salía roja
         *    dijera lo que dijera el código. Dos veces seguidas el instrumento, no
         *    el mundo.
         */
        const m = stdout.replace(/\x1b\[[0-9;]*m/g, '')
            .match(/supera[\s\S]{0,60}?por (-?\d+(?:\.\d+)?)/);
        return m ? Number(m[1]) : null;
    };

    const limpio = await margen(ruta);
    const relleno = await margen(ruta + ',arriba'.repeat(20));
    comprobaciones += 2;

    if (limpio === null) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: el recibo limpio ya no acredita, '
            + 'así que comparar márgenes no mide nada.\n'));
        process.exit(2);
    }
    if (relleno !== limpio) {
        mal(`pegar veinte jugadas inútiles cambia el margen de ${limpio} a ${relleno}. `
            + 'El horizonte sale de la longitud de la lista en vez de las jugadas '
            + 'efectivas, así que rellenar paga — y encima esquiva el dedupe.');
    }
}

// ── 4. LOS TRES VEREDICTOS EXISTEN Y SE DISTINGUEN ─────────────────────────
{
    comprobaciones += 3;
    for (const [que, re] of [
        ['acredita', /ACREDITA — supera/],
        ['no acredita', /NO ACREDITA — no supera/],
        ['suelo plano', /empatan/],
    ]) {
        if (!re.source.split('').length || !new RegExp(re).test(fuente)) {
            mal(`acreditar.mjs ya no puede decir «${que}»: el veredicto se ha quedado en dos estados`);
        }
    }
}

// ── veredicto ───────────────────────────────────────────────────────────────
console.log(gris(`  ${comprobaciones} comprobaciones sobre la herramienta que reparte títulos`));

if (fallos.length) {
    for (const f of fallos) console.log(rojo(`  ✗ ${f}`));
    console.log(rojo(`\n✗ ${fallos.length} fallo(s) en la vara de medir\n`));
    process.exit(1);
}
console.log(verde('✓ la casa juega, rellenar no paga, el recibo y las ciegas se puntúan igual\n'));
