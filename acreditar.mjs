/**
 * acreditar.mjs — ¿ESTA PARTIDA DEMUESTRA ALGO, O PODRÍA HABERLA JUGADO EL AZAR?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node acreditar.mjs recibo.json
 *     node acreditar.mjs --juego sokoban --semilla 42 --jugadas arriba,derecha,...
 *
 * ⚠️ POR QUÉ EXISTE, Y ES LA PIEZA QUE FALTABA ENTRE JUGAR Y ACREDITAR.
 *
 * El 25-08 el banco abrió sus puertas a agentes de verdad. Motoko jugó, encontró
 * en su primera hora que 19 juegos no mandaban el mapa —y por tanto que un modelo
 * de lenguaje jugaba a ciegas— y dijo que volvería a intentarlo.
 *
 * Y ahí se ve el hueco: cuando vuelva y saque 400 puntos, ¿qué significa 400?
 * Sin nada contra qué compararlo, es un número. El banco sabía decir «este entorno
 * separa políticas distintas» (`prueba_senal.mjs`, 46 de 49) y no sabía decir
 * «esta PARTIDA está por encima de lo que consigue jugar sin mirar».
 *
 * Eso es justo lo que hace falta si esto va a acreditar a nadie. La ley de la
 * federación dice que la especialización sale de los recibos y no de las
 * declaraciones — pero un recibo que cualquiera puede sacar dando botones al azar
 * es una declaración con más pasos.
 *
 * ⚠️ CORRECCIÓN DEL 29-08-2026: AQUÍ PONÍA UNA COSA QUE NO ERA VERDAD.
 *
 * Ponía «se compara contra EL MISMO SUELO que usa el banco», y no lo era. La
 * tabla publicada —`suelo_por_entorno.json`, que escribe `prueba_senal.mjs`—
 * acumula la SUMA DE RECOMPENSAS a lo largo del episodio, jugando a través del
 * entorno de gym. Esto de aquí devuelve la PUNTUACIÓN FINAL, jugando directamente
 * sobre las reglas. Son dos cantidades distintas, no dos caminos a la misma.
 *
 * Medido en sokoban con sus 400 pasos: aquí sale -201 donde la tabla dice -198.
 * Poco, y da igual cuánto: el problema no es el número, es que la frase invitaba
 * a poner las dos notas en la misma columna.
 *
 * Lo que SÍ es cierto, y es lo que sostiene el veredicto:
 *
 *   · son LAS MISMAS siete políticas —se importan de `baseline.js`, no se copian;
 *   · juegan el MISMO horizonte que trae el recibo;
 *   · y sobre todo: **el recibo y las siete se puntúan igual**, con la misma
 *     función y por el mismo camino. Eso es lo que hace justa la comparación, y
 *     lo vigila `prueba_acreditar.mjs` re-jugando la política «primera» como si
 *     fuera un recibo y exigiendo que salga su mismo número.
 *
 * Unificar las dos medidas es una tarea aparte y hay que hacerla mirando qué
 * cambia en la tabla publicada, no de tapadillo.
 *
 * ⚠️ SE COMPARA CONTRA LAS MISMAS SIETE POLÍTICAS, Y CON EL MISMO HORIZONTE.
 *
 * Las siete políticas ciegas son las de `prueba_senal.mjs`: ciclo, primera,
 * última, tres de azar con semilla y un bandido que aprende del premio. No se
 * inventa un rival nuevo: si el suelo fuera otro, esta nota no se podría comparar
 * con las que ya están publicadas.
 *
 * Y juegan EL MISMO NÚMERO DE JUGADAS que trae el recibo. Es la trampa fácil de
 * esta medida: dejar que las ciegas corran 300 pasos contra los 40 de una persona
 * hace que ganen por cansancio y no por acierto — o al revés. Mismo mundo, misma
 * semilla, mismo horizonte, o no es una comparación.
 *
 * ⚠️ Y EL VEREDICTO ES CONSERVADOR A PROPÓSITO.
 *
 * Acredita sólo si supera a LA MEJOR de las siete, no a la media. Un título que
 * se saca empatando con el azar no vale nada, y el día que una nota abra una
 * puerta valiosa, alguien intentará sacarla barata. La defensa va antes del
 * incentivo.
 */
import { readFileSync } from 'node:fs';
import { cargarReglas, JUEGOS } from './public/arcade/js/protohub/rules/index.js';
import { puntuacionDe } from './public/arcade/js/protohub/Verificador.js';

/**
 * ⚠️ EL SUELO SE IMPORTA, Y AQUÍ HUBO UN FALLO MÍO QUE DURÓ UNA TARDE.
 *
 * La primera versión de este fichero llevaba las siete políticas COPIADAS, con
 * el comentario «las MISMAS siete de prueba_senal.mjs, no se inventa un suelo
 * nuevo». Era falso mientras lo escribía:
 *
 *     prueba_senal   semillas [1, 7, 99]   bandido con exploración ε=0.15
 *     esta copia     semillas [1, 7, 42]   bandido SIN exploración
 *
 * O sea que un recibo se juzgaba contra una vara distinta de la que publica el
 * banco, y las dos habrían dicho «superó a las siete políticas ciegas»
 * significando cosas distintas. La misma avería que estaba auditando ese día en
 * el parser del organismo, cometida por mí en la misma tarde.
 *
 * Ahora hay una sola, en `suelo.js`, y es la de `prueba_senal` — la que tiene
 * trinquete y la que produjo el «46 de 49».
 */
import { blindPolicies } from './public/js/alisa-engine/src/gym/baseline.js';

/**
 * Re-simula una partida enviada. Mismo mecanismo que `/api/gym`: sin estado, se
 * manda la partida entera y se recalcula desde la semilla. Por eso nadie puede
 * mentir sobre su nota: no se guarda, se vuelve a jugar.
 *
 * ⚠️ `mover` MUTA la partida y devuelve si la jugada era legal. No devuelve la
 * partida nueva — lo supuse y me costó dos intentos. La legalidad la juzga él, no
 * yo: duplicar esa comprobación aquí sería un segundo árbitro que algún día
 * discreparía del primero.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA CASA JUEGA LOS OTROS ASIENTOS — Y ESTO SE ESCRIBIÓ SIN ELLA.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Este fichero re-simulaba aplicando todas las jugadas del recibo a pelo, y
 * corría las siete ciegas moviendo lo que tocara sin más. En un juego de un
 * asiento da igual. En uno de dos significa que el recibo y las ciegas juegan
 * TAMBIÉN por el rival, y entonces la nota no mide jugar: mide construir una
 * línea a favor.
 *
 * Motoko lo destapó jugando: hizo el mate del loco eligiendo ella las dos peores
 * jugadas de las negras, y lo dijo con la frase exacta — «el entorno no mide mi
 * capacidad de jugar a los barquitos, mide que soy dios en ese tablero».
 *
 * ⚠️ Y HAY UN SEGUNDO MOTIVO, QUE ES PEOR Y ES EL QUE ROMPÍA COSAS.
 *
 * La cabecera de arriba promete que «se compara contra EL MISMO SUELO que usa el
 * banco». El suelo publicado lo mide `prueba_senal.mjs` **a través del entorno de
 * gym**, y ese entorno hace jugar a la casa desde siempre. O sea que la promesa
 * era falsa para todo juego de más de un asiento: aquí se recalculaba otro suelo.
 *
 * Y en cuanto arreglé `a_ciegas.mjs` para que la casa jugara, los recibos nuevos
 * dejaron de poder verificarse aquí: traen sólo TUS jugadas, y sin la casa de por
 * medio el tablero es otro. Lo cantó el dominó de Motoko — «3 jugadas ilegales,
 * ignoradas»— una hora después de que yo escribiera que este proyecto arregla las
 * cosas en un extremo y no en el otro. Van nueve, y ésta es mía.
 */
const CASA_MAX = 64;

/** Deja jugar a la casa mientras no le toque a `miTurno`. */
function dejaJugarALaCasa(reglas, p, miTurno) {
    if (!reglas.sugerencia) return;
    for (let i = 0; i < CASA_MAX; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        if (st.turn === undefined || st.turn === miTurno) break;
        const j = reglas.sugerencia(p);
        if (!j || !reglas.mover(p, j)) break;
    }
}

function reproducir(reglas, semilla, jugadas) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    const miTurno = reglas.estado(p).turn;
    let rechazadas = 0;
    dejaJugarALaCasa(reglas, p, miTurno);      // por si la casa abre
    for (const j of jugadas) {
        if (reglas.estado(p).is_game_over) break;
        if (!reglas.mover(p, j)) rechazadas++;
        dejaJugarALaCasa(reglas, p, miTurno);
    }
    return { p, rechazadas };
}

function correrCiega(reglas, semilla, pasos, pol) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    const miTurno = reglas.estado(p).turn;
    dejaJugarALaCasa(reglas, p, miTurno);
    for (let i = 0; i < pasos; i++) {
        const st = reglas.estado(p);
        const v = (st.legal_moves ?? []).map(String);
        if (!v.length || st.is_game_over) break;
        const antes = puntuacionDe(st);
        const o = pol.elegir(v, i);
        try { if (!reglas.mover(p, o)) break; } catch { break; }
        dejaJugarALaCasa(reglas, p, miTurno);
        pol.aprender?.(o, puntuacionDe(reglas.estado(p)) - antes);
    }
    return puntuacionDe(reglas.estado(p));
}

// ─── Entrada ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
let recibo;
if (args[0] && !args[0].startsWith('--')) {
    recibo = JSON.parse(readFileSync(args[0], 'utf8'));
} else {
    const dame = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : null; };
    recibo = {
        juego: dame('juego'),
        semilla: Number(dame('semilla') ?? 42),
        jugadas: (dame('jugadas') ?? '').split(',').filter(Boolean),
        quien: dame('quien') ?? 'anónimo',
    };
}

if (!recibo?.juego || !JUEGOS.includes(recibo.juego)) {
    console.log(`\n  uso: node acreditar.mjs recibo.json`);
    console.log(`       node acreditar.mjs --juego sokoban --semilla 42 --jugadas arriba,derecha --quien Motoko`);
    console.log(`\n  juegos: ${JUEGOS.join(', ')}\n`);
    process.exit(2);
}

const reglas = await cargarReglas(recibo.juego, {});
const jugadas = (recibo.jugadas ?? []).map(String);
const { p, rechazadas } = reproducir(reglas, recibo.semilla, jugadas);
const suya = puntuacionDe(reglas.estado(p));

const ciegas = blindPolicies().map(pol => ({
    nombre: pol.nombre,
    nota: correrCiega(reglas, recibo.semilla, jugadas.length, pol),
}));
const mejor = ciegas.reduce((a, b) => (b.nota > a.nota ? b : a));
const media = ciegas.reduce((s, c) => s + c.nota, 0) / ciegas.length;

console.log(`\n  ${recibo.juego} · semilla ${recibo.semilla} · ${jugadas.length} jugadas · ${recibo.quien ?? 'anónimo'}\n`);
console.log(`  quien juega              nota`);
console.log(`  ${String(recibo.quien ?? 'la partida').padEnd(22)} ${String(suya).padStart(7)}`);
for (const c of ciegas.sort((a, b) => b.nota - a.nota)) {
    console.log(`  ${('· ' + c.nombre).padEnd(22)} ${String(c.nota).padStart(7)}`);
}
console.log(`\n  mejor ciega: ${mejor.nombre} (${mejor.nota}) · media ciega: ${media.toFixed(1)}`);

if (rechazadas) console.log(`  ⚠️ ${rechazadas} jugada(s) ilegales, ignoradas — el recibo no cuadra con las reglas`);

/**
 * ⚠️ EL VEREDICTO. Tres estados y ninguno es «casi».
 *
 * Un entorno donde TODAS las ciegas empatan no puede acreditar a nadie, por muy
 * buena que sea la partida: si el suelo es plano, estar encima no dice nada. Eso
 * es un fallo del entorno, no de quien juega, y se dice así.
 */
const plano = ciegas.every(c => c.nota === ciegas[0].nota);
console.log('');
if (plano) {
    /**
     * ⚠️ «PLANO» NO ES LO MISMO QUE «EL ENTORNO ESTÁ ROTO», Y LA PRIMERA VERSIÓN
     * DE ESTA FRASE LO CONFUNDÍA.
     *
     * Con un recibo de 4 jugadas las siete ciegas empatan en cualquier juego —no
     * les da tiempo a separarse— y yo acusaba al entorno. Pero `prueba_senal.mjs`
     * demuestra que sokoban SÍ discrimina con horizonte largo: el suelo plano era
     * mío, por medir con un palmo de partida.
     *
     * Así que se dice lo que se sabe: plano CON ESTE HORIZONTE. Quién tiene la
     * culpa —el entorno o el recibo— lo dice el número de jugadas.
     */
    console.log(`  ⚠️ NO ACREDITA — con ${jugadas.length} jugadas, las siete políticas ciegas empatan.`);
    console.log(`     El suelo es plano a este horizonte, así que estar encima no demostraría nada.`);
    console.log(jugadas.length < 20
        ? `     Es un recibo corto: prueba con una partida más larga antes de culpar al juego.`
        : `     Con esta longitud ya debería separarse: mira el entorno con prueba_senal.mjs.`);
    process.exit(1);
}
if (suya > mejor.nota) {
    console.log(`  ✓ ACREDITA — supera a la mejor política ciega por ${(suya - mejor.nota).toFixed(1)}.`);
    console.log(`    Con el mismo mundo, la misma semilla y el mismo horizonte.`);
    process.exit(0);
}
console.log(`  ✗ NO ACREDITA — no supera a «${mejor.nombre}» (${mejor.nota}) jugando a ciegas.`);
console.log(`    No significa que jugara mal: significa que esta partida no demuestra que mirara.`);
process.exit(1);
