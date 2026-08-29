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
import { mulberry32 } from './public/js/alisa-engine/src/world/core/DeterministicScope.js';
import { estaEmitida, semillaDe, periodoActual } from './semillas.mjs';

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
    let rechazadas = 0, efectivas = 0, decisiones = 0;
    dejaJugarALaCasa(reglas, p, miTurno);      // por si la casa abre
    for (const j of jugadas) {
        const antes = reglas.estado(p);
        if (antes.is_game_over) break;
        /**
         * ⚠️ ¿HUBO ALGO QUE ELEGIR? EL CANARIO, GENERALIZADO.
         *
         * `docs/cuando_los_puntos_valen_algo.md` lo dejó escrito el 08-08-2026 y
         * nadie lo implementó: **`guerra` es el control del banco**, un juego
         * donde no hay una sola decisión y todo el mundo DEBE empatar. *«Si la
         * fila de guerra de un candidato se separa, no está jugando mejor: está
         * tocando el arnés. Es una alarma que cuesta cero y que sólo un tramposo
         * dispara.»*
         *
         * Al ir a escribirlo salió una versión mejor y que no menciona a `guerra`:
         * lo que hace a ese juego un control no es su nombre, es que **cada turno
         * ofrece UNA sola jugada legal**. Eso es medible en cualquier partida y en
         * cualquier momento — hay juegos que pasan tramos enteros sin elección.
         *
         * Así que se cuentan las DECISIONES REALES: los turnos donde había más de
         * una jugada posible. Un recibo con cero decisiones tiene la puntuación
         * forzada por la semilla, y entonces no puede demostrar nada: ni bien ni
         * mal, porque no había nada que acertar.
         */
        if ((antes.legal_moves ?? []).length > 1) decisiones++;
        if (reglas.mover(p, j)) efectivas++; else rechazadas++;
        dejaJugarALaCasa(reglas, p, miTurno);
    }
    return { p, rechazadas, efectivas, decisiones };
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA CASA ES LA OCTAVA, Y ES LA QUE DE VERDAD HAY QUE BATIR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lo encontró Fable atacando este fichero el 29-08-2026, y tumba la premisa
 * entera del diseño. Su frase: *«el suelo es demasiado bajo; la política de la
 * casa ya lo supera, y esa política viene en el repo»*.
 *
 * El ataque son tres líneas: juega TU asiento llamando a `reglas.sugerencia(p)`
 * —el greedy que ya distribuimos con cada juego— y manda el resultado. Medido
 * contra la semilla emitida de hoy, sin `--libre`:
 *
 *     damas   ✓ ACREDITA — supera a la mejor ciega por 1002.0
 *     oca     ✓ ACREDITA — supera por 32.0
 *
 * Coste de búsqueda: **cero**. Y el diseño entero se apoyaba en que buscar una
 * buena jugada es caro. Con siete políticas tontas de suelo, lo que se paga no es
 * jugar bien: es copiar una función nuestra.
 *
 * ⚠️ Y LA CORRECCIÓN YA ESTABA ESCRITA, COMO TODO HOY.
 *
 * `docs/cuando_los_puntos_valen_algo.md`, 08-08-2026: *«la respuesta más limpia es
 * también la más barata: el huevo se gana CONTRA LA CASA»*. La casa siempre fue el
 * listón; lo que faltaba era ponerla en el suelo.
 *
 * Con esto, el ataque empata consigo mismo y deja de acreditar. Quien juegue MEJOR
 * que la casa sigue acreditando, que es exactamente lo que la nota debía significar.
 */
function correrLaCasa(reglas, semilla, pasos) {
    if (!reglas.sugerencia) return null;
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    const miTurno = reglas.estado(p).turn;
    dejaJugarALaCasa(reglas, p, miTurno);
    for (let i = 0; i < pasos; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const j = reglas.sugerencia(p);
        if (!j || !reglas.mover(p, j)) break;
        dejaJugarALaCasa(reglas, p, miTurno);
    }
    return puntuacionDe(reglas.estado(p));
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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ LA SEMILLA NO LA ELIGE QUIEN JUEGA. ERA EL AGUJERO MÁS BARATO DE CERRAR.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `docs/cuando_los_puntos_valen_algo.md` lo dejó escrito el 08-08-2026:
 *
 *     «Semillas emitidas — el agujero más grande y el más barato de cerrar. Hoy,
 *      quien corre el banco elige sus semillas: juega cien y manda las tres
 *      mejores. LA SELECCIÓN ES LA TRAMPA.»
 *
 * Y no hacía falta ningún truco: `--semilla <la que quieras>`. El recibo no miente
 * —se re-simula y cuadra— y aun así la nota no significa nada, porque compara el
 * mejor de cien intentos contra lo que sacan las ciegas en ese mismo mundo.
 *
 * Con `semillas.mjs` hay UNA semilla emitida por juego y periodo. Se acepta también
 * la de los seis días anteriores: un recibo tarda en llegar y cerrar la ventana a
 * medianoche haría que la misma partida acreditara o no según la hora.
 *
 * ⚠️ `--libre` EXISTE Y GRITA. Sirve para practicar, para las pruebas y para mirar
 *    una partida vieja. Lo que NO hace es acreditar: si acreditara, el agujero
 *    seguiría abierto con un nombre más largo.
 */
const libre = args.includes('--libre');
const emision = estaEmitida(recibo.juego, recibo.semilla);

const reglas = await cargarReglas(recibo.juego, {});
const jugadas = (recibo.jugadas ?? []).map(String);
const { p, rechazadas, efectivas, decisiones } = reproducir(reglas, recibo.semilla, jugadas);
const suya = puntuacionDe(reglas.estado(p));

const ciegas = blindPolicies().map(pol => ({
    nombre: pol.nombre,
    nota: correrCiega(reglas, recibo.semilla, efectivas, pol),
}));
/**
 * La casa entra en el suelo. Ver la nota larga de `correrLaCasa`: sin ella, el
 * ataque más barato del banco es copiar una función que va en el propio repositorio.
 *
 * Se marca aparte porque NO es ciega —mira el tablero y decide— y la media de las
 * siete tiene que seguir significando «lo que saca quien no mira». El techo, en
 * cambio, es el máximo de las ocho: eso es lo que hay que batir.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL SUELO TENÍA UN INTENTO Y EL CANDIDATO TENÍA INFINITOS.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Lo encontró Motoko atacando este fichero el 29-08-2026, media hora después de
 * que le pidiera que lo rompiera. Su frase: *«como el suelo sólo toma UNA muestra
 * por política ciega, generamos mil partidas al azar en local, nos quedamos con la
 * que haya tenido una suerte absurda, y la mandamos»*.
 *
 * Medido de punta a punta —fuerza bruta al azar, mejor de 400, semilla emitida,
 * juzgado por este mismo fichero—:
 *
 *     sokoban   ✗ no supera a la casa (188)
 *     snake     ⚠️ suelo plano
 *     oca       ✓ ACREDITA — supera por 908.0      ← al azar
 *     mancala   ✓ ACREDITA — supera por  37.0      ← al azar
 *     reversi   ✗ no supera a la casa (40)
 *
 * La casa tapaba tres de cinco y no las otras dos. En `oca` no podía: es de dados,
 * y ahí la casa no sabe nada que el azar no sepa.
 *
 * ⚠️ EL ARREGLO NO ES SUBIR EL SUELO A OJO. ES METER LA BÚSQUEDA EN EL SUELO.
 *
 * La tentación es multiplicar las muestras hasta que el ataque no salga. Eso es una
 * carrera: quien ataca usa el doble y vuelve. Y sobre todo no dice nada — un número
 * elegido para que hoy salga verde caduca el día que alguien tenga más máquina.
 *
 * Lo que sí se puede decir es esto: **el suelo busca, y su presupuesto se publica.**
 * `busqueda-N` es la mejor de N partidas al azar sobre el mismo mundo, el mismo
 * horizonte y el mismo marcador. Entonces «supera al suelo» deja de significar
 * «tuvo más suerte que una tirada» y pasa a significar una de dos cosas, y las dos
 * son trabajo de verdad:
 *
 *   · o jugó mejor que la búsqueda tonta —eso es inteligencia—,
 *   · o gastó más de N partidas —eso es cómputo, y es medible y comparable.
 *
 * Que es exactamente la asimetría en la que se apoya todo esto: buscar cuesta,
 * verificar es barato. El agujero era que el suelo no buscaba nada.
 *
 * ⚠️ Y LA BÚSQUEDA VA CON SEMILLA, NO CON `Math.random`.
 *
 * Un veredicto que depende del azar del servidor no se puede volver a comprobar, y
 * un recibo que no se puede re-verificar no vale nada — es la propiedad que sostiene
 * el banco entero. El generador se IMPORTA de `DeterministicScope.js`: `prueba_azar`
 * lleva trinquete contando las copias de `mulberry32`, y dos copias de un generador
 * se separan igual que dos copias de una lista.
 */
const PRESUPUESTO = 2000;

function correrBusqueda(reglas, semilla, pasos, intentos) {
    const rnd = mulberry32(semilla ^ 0x5eed);
    const miTurno = reglas.estado(reglas.nuevaPartida({ semilla, seed: semilla })).turn;
    const notas = [];
    for (let n = 0; n < intentos; n++) {
        const p = reglas.nuevaPartida({ semilla, seed: semilla });
        /**
         * ⚠️ EL HORIZONTE SE CUENTA IGUAL QUE EN `correrCiega`, Y LA PRIMERA
         * VERSIÓN NO LO HACÍA.
         *
         * Aquí los turnos de la casa gastaban pasos del contador, así que la
         * búsqueda jugaba la mitad de jugadas PROPIAS que el recibo en cualquier
         * juego de dos asientos. Resultado medido: mancala y reversi seguían
         * acreditando al azar con un suelo que jugaba con un brazo atado.
         *
         * Es el mismo fallo que el relleno de NO-OPs que encontró Motoko: contar
         * pasos del reloj en vez de jugadas efectivas. Se cuenta lo mismo que
         * cuenta el suelo ciego —jugadas propias, la casa va aparte— o no es la
         * misma vara.
         */
        dejaJugarALaCasa(reglas, p, miTurno);
        for (let i = 0; i < pasos; i++) {
            const st = reglas.estado(p);
            const posibles = st.legal_moves ?? [];
            if (!posibles.length || st.is_game_over) break;
            try { if (!reglas.mover(p, posibles[Math.floor(rnd() * posibles.length)])) break; } catch { break; }
            dejaJugarALaCasa(reglas, p, miTurno);
        }
        notas.push(puntuacionDe(reglas.estado(p)));
    }
    const buenas = notas.filter(Number.isFinite).sort((a, b) => a - b);
    if (!buenas.length) return null;
    /**
     * ⚠️ EL SUELO ES EL MÁXIMO, Y PROBÉ ALGO MÁS LISTO QUE ESTABA MAL.
     *
     * Mi primer intento de cerrar la moneda al aire fue pedir `max + holgura`, con
     * `holgura = max − p90`: «que la nota quede fuera del alcance de la suerte».
     * Sonaba a medida y era un número inventado con disfraz. En una distribución
     * sesgada ese hueco es medio marcador:
     *
     *     mancala   max 29   p90 14   →  holgura 15   →  suelo 44
     *
     * O sea que pedía casi el DOBLE de lo mejor que saca el azar. Y lo cazó el
     * control positivo, no el ataque: **gastar diez veces el presupuesto seguía sin
     * acreditar en ninguno de los cuatro juegos**. Había construido una puerta que
     * no se abre nunca, que es el fallo peor de todos y el que sale en verde.
     *
     * Así que el suelo es el máximo de N y ya está. Y lo que eso garantiza —y lo
     * que no— se dice claro, porque es la propiedad de la que cuelga todo esto:
     *
     *   · con MENOS de N intentos, pasar es improbable;
     *   · con N justos es una moneda al aire — y ya has gastado N;
     *   · con más de N se pasa, y entonces has gastado más cómputo que el banco.
     *
     * Ese último caso NO es un agujero: es la premisa. Buscar cuesta, verificar es
     * barato, y quien gaste más que el presupuesto publicado ha hecho trabajo de
     * verdad. Lo que estaba roto era que el suelo no buscaba NADA: batir a una sola
     * tirada al azar no cuesta nada, y por eso `oca` acreditaba por +908.
     *
     * El único parámetro honesto aquí es N, y va escrito arriba y sale en la tabla.
     */
    return { max: buenas[buenas.length - 1], muestras: buenas.length };
}

const laCasa = correrLaCasa(reglas, recibo.semilla, efectivas);
const laBusqueda = correrBusqueda(reglas, recibo.semilla, efectivas, PRESUPUESTO);
const suelo = [
    ...ciegas,
    ...(laCasa === null ? [] : [{ nombre: 'casa', nota: laCasa, esCasa: true }]),
    ...(laBusqueda === null ? [] : [{
        nombre: `busqueda-${PRESUPUESTO}`,
        nota: laBusqueda.max,
        esBusqueda: true,
    }]),
];
const mejor = suelo.reduce((a, b) => (b.nota > a.nota ? b : a));
const media = ciegas.reduce((s, c) => s + c.nota, 0) / ciegas.length;

console.log(`\n  ${recibo.juego} · semilla ${recibo.semilla} · ${jugadas.length} jugadas · ${recibo.quien ?? 'anónimo'}\n`);
console.log(`  quien juega              nota`);
console.log(`  ${String(recibo.quien ?? 'la partida').padEnd(22)} ${String(suya).padStart(7)}`);
for (const c of suelo.sort((a, b) => b.nota - a.nota)) {
    console.log(`  ${('· ' + c.nombre).padEnd(22)} ${String(c.nota).padStart(7)}`
        + (c.esBusqueda ? `   (la mejor de ${PRESUPUESTO} partidas al azar)` : ''));
}
console.log(`\n  techo: ${mejor.nombre} (${mejor.nota}) · media de las siete ciegas: ${media.toFixed(1)}`);

if (rechazadas) console.log(`  ⚠️ ${rechazadas} jugada(s) ilegales, ignoradas — el recibo no cuadra con las reglas`);

/**
 * ⚠️ EL VEREDICTO. Tres estados y ninguno es «casi».
 *
 * Un entorno donde TODAS las ciegas empatan no puede acreditar a nadie, por muy
 * buena que sea la partida: si el suelo es plano, estar encima no dice nada. Eso
 * es un fallo del entorno, no de quien juega, y se dice así.
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ EL CANARIO SE MIRA SIEMPRE, NO SÓLO CUANDO EL SUELO SALE PLANO.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Segundo hallazgo de Fable sobre este fichero, el 29-08-2026: *«el canario de
 * decisiones sólo corre dentro de la rama `plano`»*. Y tenía razón — estaba
 * escondido dentro de un `if` por cómo lo escribí, no por ningún motivo.
 *
 * Por qué importa, y es justo lo que acaba de cambiar hoy: **al meter a la casa
 * en el suelo, el suelo deja de salir plano casi nunca**, porque la casa separa
 * donde las siete ciegas empataban. O sea que el arreglo de la mañana apagaba el
 * canario de la tarde. Un recibo sin NI UNA decisión —donde la puntuación la fija
 * la semilla y no quien juega— entraba directo a comparar notas.
 *
 * ⚠️ Y NO PONGO UMBRAL POR ENCIMA DE CERO, A PROPÓSITO.
 *
 * La tentación es rechazar por debajo de, digamos, un 20% de turnos con elección.
 * No lo hago porque **no tengo con qué justificar el número**: hay juegos con
 * tramos largos legítimamente forzados (una cadena de capturas obligadas en damas
 * es una sola decisión y muchas jugadas). Cero sí es defendible sin medir nada:
 * si no hubo nada que elegir, no hubo nada que acertar.
 *
 * Así que la fracción se PUBLICA siempre —en el veredicto, gane o pierda— y quien
 * lea el recibo juzga. Un número a la vista vale más que un umbral inventado.
 */
const fraccion = efectivas > 0 ? decisiones / efectivas : 0;
console.log('');
if (decisiones === 0) {
    console.log(`  ⚠️ NO ACREDITA — en estas ${efectivas} jugadas no hubo NI UNA decisión:`);
    console.log(`     cada turno ofrecía una sola jugada legal, así que la puntuación la`);
    console.log(`     fija la semilla y no quien juega. No hay nada que acertar.`);
    if (suya !== mejor.nota) {
        console.log(`\n  ✗ Y ADEMÁS ES IMPOSIBLE: sin decisiones, todo el mundo saca`);
        console.log(`     ${mejor.nota} en este mundo, y este recibo dice ${suya}. Eso no se`);
        console.log(`     consigue jugando mejor — se consigue tocando el arnés.`);
    }
    process.exit(1);
}
console.log(`  decisiones reales: ${decisiones} de ${efectivas} turnos (${(fraccion * 100).toFixed(0)}%)`);
const plano = ciegas.every(c => c.nota === ciegas[0].nota);
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
    /**
     * ⚠️ SI SE LLEGA AQUÍ, YA SE SABE QUE **SÍ** HUBO DECISIONES.
     *
     * «Suelo plano» y «no había nada que elegir» salen igual —siete ciegas
     * empatadas— y significan lo contrario:
     *
     *   · en `snake` a 33 jugadas el suelo es plano porque las ciegas son malas —
     *     el juego SÍ tiene decisiones y estar por encima significaría algo;
     *   · en `guerra` no hay ni una sola decisión: cada turno ofrece una jugada y
     *     la puntuación la fija la semilla. Ahí todo el mundo DEBE empatar.
     *
     * El segundo caso se corta arriba, antes de esta rama y de la de acreditar —
     * ver la nota del canario. Aquí sólo queda el primero: entorno sin señal a
     * este horizonte, que es un fallo del banco y no de quien juega.
     */
    console.log(`  ⚠️ NO ACREDITA — con ${jugadas.length} jugadas, las siete políticas ciegas empatan.`);
    console.log(`     El suelo es plano a este horizonte, así que estar encima no demostraría nada.`);
    console.log(jugadas.length < 20
        ? `     Es un recibo corto: prueba con una partida más larga antes de culpar al juego.`
        : `     Con esta longitud ya debería separarse: mira el entorno con prueba_senal.mjs.`);
    process.exit(1);
}
if (suya > mejor.nota) {
    /**
     * ⚠️ SUPERAR EL SUELO NO BASTA SI TÚ ELEGISTE EL MUNDO.
     *
     * Ésta es la última puerta y la más barata de todas: el recibo puede ser
     * impecable —re-simula, cuadra, supera a las siete— y aun así no demostrar
     * nada, porque quien lo manda jugó cien semillas y mandó ésta.
     *
     * Se dice el número que SÍ acreditaría, para que no haya que adivinarlo. Y se
     * dice que es la de hoy, no una cualquiera: quien quiera acreditar tiene una
     * partida por juego y por día, la misma para todo el mundo.
     */
    if (!emision.emitida && !libre) {
        console.log(`  ⚠️ NO ACREDITA — la semilla ${recibo.semilla} no está emitida.`);
        console.log(`     Supera a la mejor ciega por ${(suya - mejor.nota).toFixed(1)}, y da igual: el`);
        console.log(`     mundo lo elegiste tú. Jugar cien semillas y mandar la mejor no es jugar`);
        console.log(`     mejor, es elegir el examen.`);
        console.log(`\n     La de hoy para ${recibo.juego} es ${semillaDe(recibo.juego)} (${periodoActual()}).`);
        console.log(`     Se aceptan también las de los seis días anteriores.`);
        console.log(`     Con --libre se salta esta puerta, y entonces esto no acredita nada.`);
        process.exit(1);
    }
    /**
     * ⚠️ EL AGUJERO DE LA SELECCIÓN, ENTERO, POR LA PUERTA DE SERVICIO.
     *
     * Lo encontró Fable leyendo, el 29-08-2026, y es de los que dan más vergüenza:
     * `--libre` escribía el literal `✓ ACREDITA` y salía con **código 0**. La
     * advertencia de al lado era texto para humanos.
     *
     * O sea que toda la puerta de las semillas emitidas —la que cierra «juega cien
     * y manda la mejor», el agujero más barato de todos— la saltaba cualquier
     * consumidor que hiciera lo normal: mirar el código de salida, o buscar el
     * literal. Y no habría dado error nunca: la herramienta imprimía su aviso, se
     * quedaba tan tranquila, y quien la llamaba leía «acreditó».
     *
     * Es la avería de siempre en su forma más pura: la protección estaba escrita
     * —hasta con su ⚠️— y no estaba conectada a lo único que una máquina lee.
     *
     * `--libre` no acredita. Punto. Sale distinto, se llama distinto, y no escribe
     * jamás ese literal.
     */
    if (libre) {
        console.log(`  ~ SUPERA EL SUELO por ${(suya - mejor.nota).toFixed(1)}, y esto NO es una acreditación.`);
        console.log(`    Modo libre: la semilla ${recibo.semilla} la elegiste tú, así que la nota sólo`);
        console.log(`    vale para probar. La de hoy para ${recibo.juego} es ${semillaDe(recibo.juego)}.`);
        process.exit(3);
    }
    console.log(`  ✓ ACREDITA — supera a la mejor política ciega por ${(suya - mejor.nota).toFixed(1)}.`);
    console.log(`    Con el mismo mundo, la misma semilla y el mismo horizonte.`);
    console.log(`    Semilla emitida el ${emision.periodo}, la misma para todo el mundo.`);
    process.exit(0);
}
console.log(mejor.esCasa
    ? `  ✗ NO ACREDITA — no supera a LA CASA (${mejor.nota}), que es la política que va en el repositorio.`
    : mejor.esBusqueda
    ? `  ✗ NO ACREDITA — no supera a la BÚSQUEDA TONTA (${mejor.nota}): la mejor de\n`
      + `     ${PRESUPUESTO} partidas al azar en este mismo mundo. Para pasar hay que jugar\n`
      + `     mejor que eso, o gastar más de ${PRESUPUESTO} intentos. Las dos cosas son trabajo.`
    : `  ✗ NO ACREDITA — no supera a «${mejor.nombre}» (${mejor.nota}) jugando a ciegas.`);
console.log(`    No significa que jugara mal: significa que esta partida no demuestra que mirara.`);
process.exit(1);
