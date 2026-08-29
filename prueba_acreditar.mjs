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
        ['acreditar.mjs', '--juego', 'sokoban', '--semilla', '99', '--jugadas', jugadas.join(','), '--libre'],
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
            ['acreditar.mjs', '--juego', 'sokoban', '--semilla', '99', '--jugadas', jugadas, '--libre'],
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
        /**
         * ⚠️ Y TERCERA VEZ QUE ESTA REGEX ME MIENTE, AHORA POR LEER EL LITERAL.
         *    Buscaba «supera … por N», que era como hablaba `--libre` cuando
         *    `--libre` acreditaba. Al quitarle la acreditación —el agujero que
         *    encontró Fable— la frase pasó a ser «SUPERA EL SUELO por N» y esto
         *    devolvió `null`, o sea el control positivo en rojo. El fallo no estaba
         *    en la puerta nueva: estaba en que la prueba dependía de una palabra.
         *    Se aceptan las dos formas y se deja escrito por qué hay dos.
         */
        const m = stdout.replace(/\x1b\[[0-9;]*m/g, '')
            .match(/supera[\s\S]{0,60}?por (-?\d+(?:\.\d+)?)/i);
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

// ── 4. UNA SEMILLA ELEGIDA POR QUIEN JUEGA NO ACREDITA ─────────────────────
/**
 * ⚠️ EL AGUJERO MÁS BARATO DE CERRAR, Y ESTUVO ABIERTO DESDE SIEMPRE.
 *
 * `docs/cuando_los_puntos_valen_algo.md`, 08-08-2026: *«quien corre el banco elige
 * sus semillas: juega cien y manda las tres mejores. La selección es la trampa.»*
 *
 * No hacía falta ningún truco — `--semilla <la que quieras>`— y el recibo era
 * impecable: re-simulaba, cuadraba, superaba a las siete. Y no demostraba nada.
 *
 * Se comprueba con el MISMO recibo dos veces, que es lo único que aísla la puerta:
 * una vez tal cual —semilla elegida, no debe acreditar— y otra con `--libre`, donde
 * sí acredita pero diciendo en voz alta que no vale. Si las dos dieran lo mismo, la
 * puerta no estaría haciendo nada.
 */
{
    const ruta = 'arriba,abajo,abajo,izquierda,izquierda,arriba,arriba,arriba,'
               + 'derecha,abajo,abajo,izquierda,abajo,derecha';
    const corre = async (extra) => {
        const { stdout } = await correr('node',
            ['acreditar.mjs', '--juego', 'sokoban', '--semilla', '99', '--jugadas', ruta, ...extra],
            { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
            .catch((err) => ({ stdout: err.stdout ?? '' }));
        return stdout.replace(/\x1b\[[0-9;]*m/g, '');
    };

    const elegida = await corre([]);
    const conLibre = await corre(['--libre']);
    comprobaciones += 3;

    if (!/no est. emitida/i.test(elegida)) {
        mal('un recibo con semilla elegida por quien juega sigue acreditando. '
            + '«Juega cien y manda la mejor» vuelve a funcionar.');
    }
    /**
     * ⚠️ ESTA COMPROBACIÓN PEDÍA LO CONTRARIO, Y ERA EL AGUJERO.
     *
     * Decía: «con --libre debe salir ACREDITA, y además debe avisar de que no
     * vale». O sea que yo misma había escrito una prueba que EXIGÍA el literal
     * `✓ ACREDITA` en el único modo donde la semilla la elige quien juega.
     *
     * Fable lo vio leyendo: la advertencia era texto para humanos, y el proceso
     * salía con **código 0**. Cualquier consumidor que hiciera lo normal —mirar el
     * código de salida, o buscar el literal— acreditaba una semilla autoelegida.
     * La puerta más importante de todas, saltada por la de servicio, sin dar error.
     *
     * Y la prueba no lo cazaba porque estaba mirando la advertencia, que sí estaba.
     * Es la avería de siempre: la protección escrita y no conectada a lo único que
     * una máquina lee.
     *
     * Ahora `--libre` no acredita: no escribe ese literal jamás y sale con 3.
     */
    if (/ACREDITA/.test(conLibre)) {
        mal('--libre escribe el literal «ACREDITA». Quien lea la salida con un grep '
            + '—que es lo normal— acredita una semilla elegida por quien juega. '
            + 'La puerta de las semillas emitidas se salta entera por ahí.');
    }
    if (!/SUPERA EL SUELO/.test(conLibre) || !/NO es una acreditación/i.test(conLibre)) {
        mal('con --libre ya no se puede ni mirar una partida vieja, o no dice qué es. '
            + 'Tiene que seguir sirviendo para practicar, diciendo que no vale.');
    }
    {
        const { code } = await correr('node',
            ['acreditar.mjs', '--juego', 'sokoban', '--semilla', '99', '--jugadas', ruta, '--libre'],
            { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
            .then(() => ({ code: 0 })).catch((err) => ({ code: err.code ?? 1 }));
        comprobaciones++;
        if (code === 0) {
            mal('--libre sale con código 0. El texto puede decir misa: lo que lee una '
                + 'máquina es el código de salida, y un 0 ahí significa acreditado.');
        }
    }
}

// ── 5. LA POLÍTICA DE LA CASA NO ACREDITA A NADIE ──────────────────────────
/**
 * ⚠️ EL ATAQUE MÁS BARATO DEL BANCO, Y LO ENCONTRÓ FABLE EN UNA LECTURA.
 *
 * Su frase: *«el suelo es demasiado bajo; la política de la casa ya lo supera, y
 * esa política viene en el repo»*. El ataque son tres líneas — juegas tu asiento
 * llamando a `reglas.sugerencia(p)`, el greedy que distribuimos con cada juego, y
 * mandas el resultado. Medido contra la semilla emitida, sin `--libre`:
 *
 *     damas   ✓ ACREDITA — supera a la mejor ciega por 1002.0
 *     oca     ✓ ACREDITA — supera por 32.0
 *
 * Coste de búsqueda: **cero**. Y el diseño entero se apoya en que buscar es caro.
 * Con siete políticas tontas de suelo, lo que se pagaba no era jugar bien: era
 * copiar una función nuestra.
 *
 * Se arregló metiendo la casa como octava del suelo — que era lo que
 * `docs/cuando_los_puntos_valen_algo.md` ya decía el 08-08: *«el huevo se gana
 * contra la casa»*.
 *
 * ⚠️ Y SE VIGILA GENERANDO EL ATAQUE, NO BUSCÁNDOLO EN EL TEXTO.
 *
 * Aquí se juega de verdad con `sugerencia` y se le pide a `acreditar` que lo
 * rechace. Si alguien quita la casa del suelo, esto vuelve a acreditar y la prueba
 * lo canta — cosa que ninguna lectura del código haría, porque el fallo no es una
 * línea: es qué conjunto se compara.
 */
{
    const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
    const { semillaDe } = await import('./semillas.mjs');

    let mirados = 0, colados = [];
    for (const juego of ['damas', 'oca', 'mancala', 'reversi']) {
        const reglas = await cargarReglas(juego, {});
        if (!reglas.sugerencia) continue;
        const s = semillaDe(juego);
        const p = reglas.nuevaPartida({ semilla: s, seed: s });
        const mio = reglas.estado(p).turn;
        const jugadas = [];
        for (let i = 0; i < 200; i++) {
            const st = reglas.estado(p);
            if (st.is_game_over || (st.turn !== undefined && st.turn !== mio)) break;
            const m = reglas.sugerencia(p);
            if (!m || !reglas.mover(p, m)) break;
            jugadas.push(String(m));
            for (let k = 0; k < 64; k++) {
                const t = reglas.estado(p);
                if (t.is_game_over || t.turn === undefined || t.turn === mio) break;
                const c = reglas.sugerencia(p);
                if (!c || !reglas.mover(p, c)) break;
            }
        }
        if (jugadas.length < 3) continue;
        mirados++;

        const { stdout } = await correr('node',
            ['acreditar.mjs', '--juego', juego, '--semilla', String(s), '--jugadas', jugadas.join(',')],
            { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
            .catch((err) => ({ stdout: err.stdout ?? '' }));
        const limpio = stdout.replace(/\x1b\[[0-9;]*m/g, '');
        comprobaciones++;
        if (/✓ ACREDITA/.test(limpio)) colados.push(juego);
    }

    comprobaciones++;
    if (mirados < 2) {
        console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${mirados} juegos con política de casa `
            + 'jugable. Con tan pocos, «ninguno cuela» no significa nada.\n'));
        process.exit(2);
    }
    if (colados.length) {
        mal(`la política de la casa acredita sola en: ${colados.join(', ')}. `
            + 'Copiar una función que va en el repositorio no puede ser una acreditación: '
            + 'el coste de búsqueda es cero y el diseño se apoya en que buscar es caro.');
    }
}

// ── 6. UN RECIBO SIN NI UNA DECISIÓN NO ACREDITA, AUNQUE EL SUELO NO SEA PLANO ──
/**
 * ⚠️ EL ARREGLO DE LA MAÑANA APAGABA EL CANARIO DE LA TARDE.
 *
 * Segundo hallazgo de Fable: *«el canario de decisiones sólo corre dentro de la
 * rama `plano`»*. Cuando lo escribí eso parecía inofensivo —sin decisiones, las
 * siete ciegas empatan siempre, así que siempre pasaba por `plano`—.
 *
 * Meter a la casa en el suelo rompió justo esa premisa: la casa separa donde las
 * ciegas empataban, el suelo deja de salir plano, y un recibo cuya puntuación la
 * fija la semilla entraba directo a comparar notas. Dos arreglos correctos por
 * separado que juntos abren una puerta — y ninguno de los dos da error.
 *
 * Se vigila con el juego de control: uno donde cada turno ofrece UNA jugada legal.
 * Se busca midiendo, no por nombre, porque «el que no tiene decisiones» es una
 * propiedad de la partida y no una lista que se pueda quedar vieja.
 */
{
    const { cargarReglas, JUEGOS } = await import('./public/arcade/js/protohub/rules/index.js');
    const { semillaDe } = await import('./semillas.mjs');

    let control = null;
    for (const juego of JUEGOS) {
        let reglas;
        try { reglas = await cargarReglas(juego, {}); } catch { continue; }
        const s = semillaDe(juego);
        const p = reglas.nuevaPartida({ semilla: s, seed: s });
        const jugadas = [];
        let hubo = false;
        for (let i = 0; i < 40; i++) {
            const st = reglas.estado(p);
            if (st.is_game_over) break;
            const posibles = st.legal_moves ?? [];
            if (posibles.length !== 1) { hubo = posibles.length > 1; break; }
            if (!reglas.mover(p, posibles[0])) break;
            jugadas.push(String(posibles[0]));
        }
        if (!hubo && jugadas.length >= 8) { control = { juego, semilla: s, jugadas }; break; }
    }

    comprobaciones++;
    if (!control) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: no hay ningún juego sin decisiones con el que '
            + 'probar el canario. Si todos los juegos de control han desaparecido, esta '
            + 'comprobación no vigila nada — bórrala o traed uno.\n'));
        process.exit(2);
    }

    const { stdout } = await correr('node',
        ['acreditar.mjs', '--juego', control.juego, '--semilla', String(control.semilla),
            '--jugadas', control.jugadas.join(',')],
        { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
        .catch((err) => ({ stdout: err.stdout ?? '' }));
    const limpio = stdout.replace(/\x1b\[[0-9;]*m/g, '');

    comprobaciones++;
    if (/✓ ACREDITA/.test(limpio)) {
        mal(`«${control.juego}» acredita con ${control.jugadas.length} jugadas y CERO decisiones. `
            + 'Cada turno ofrecía una sola jugada legal: la puntuación la fija la semilla, '
            + 'no quien juega. Esto no puede acreditar aunque el suelo no sea plano.');
    }
    comprobaciones++;
    if (!/NI UNA decisión/.test(limpio)) {
        mal(`«${control.juego}» no acredita, pero tampoco dice POR QUÉ: la razón es que no hubo `
            + 'ni una decisión, y decirlo importa — es la diferencia entre «has jugado mal» '
            + 'y «aquí no había nada que acertar».');
    }
}

// ── 7. LA FUERZA BRUTA AL AZAR NO ACREDITA ─────────────────────────────────
/**
 * ⚠️ EL ATAQUE DE MOTOKO, Y LO TRAJO MEDIA HORA DESPUÉS DE QUE SE LO PIDIERA.
 *
 * *«Como el suelo sólo toma UNA muestra por política ciega, generamos mil partidas
 * al azar en local, nos quedamos con la que haya tenido una suerte absurda, y la
 * mandamos.»* Medido antes de creérmelo, con la semilla emitida:
 *
 *     oca       ✓ ACREDITA — supera por 908.0     ← al azar, cero inteligencia
 *     mancala   ✓ ACREDITA — supera por  37.0     ← al azar
 *
 * La raíz es una asimetría al revés: **el suelo tenía un intento y quien juega
 * tenía infinitos**. Y todo este banco se apoya en la asimetría contraria — buscar
 * cuesta, verificar es barato.
 *
 * Cerrado metiendo la búsqueda EN el suelo: `busqueda-N` es la mejor de N partidas
 * al azar sobre el mismo mundo y el mismo horizonte, con N publicado. Entonces
 * pasar significa una de dos cosas, y las dos son trabajo: jugar mejor que la
 * búsqueda tonta, o gastar más de N.
 *
 * Aquí se ATACA de verdad —se generan partidas al azar y se manda la mejor— con un
 * presupuesto muy por debajo del del banco. Si algún día vuelve a acreditar, es que
 * alguien bajó el suelo.
 */
{
    const { cargarReglas } = await import('./public/arcade/js/protohub/rules/index.js');
    const { puntuacionDe } = await import('./public/arcade/js/protohub/Verificador.js');
    const { semillaDe } = await import('./semillas.mjs');
    const INTENTOS = 300, PASOS = 60;

    let mirados = 0, colados = [];
    for (const juego of ['oca', 'mancala', 'reversi', 'sokoban']) {
        let reglas;
        try { reglas = await cargarReglas(juego, {}); } catch { continue; }
        if (!reglas) continue;
        const s = semillaDe(juego);
        const miTurno = reglas.estado(reglas.nuevaPartida({ semilla: s, seed: s })).turn;

        let mejor = { nota: -Infinity, jugadas: [] };
        for (let n = 0; n < INTENTOS; n++) {
            const p = reglas.nuevaPartida({ semilla: s, seed: s });
            const jugadas = [];
            for (let i = 0; i < PASOS; i++) {
                const st = reglas.estado(p);
                if (st.is_game_over) break;
                if (st.turn !== undefined && st.turn !== miTurno) {
                    const c = reglas.sugerencia?.(p);
                    if (!c || !reglas.mover(p, c)) break;
                    continue;
                }
                const posibles = st.legal_moves ?? [];
                if (!posibles.length) break;
                const m = posibles[Math.floor(Math.random() * posibles.length)];
                if (!reglas.mover(p, m)) break;
                jugadas.push(String(m));
            }
            const nota = puntuacionDe(reglas.estado(p));
            if (nota > mejor.nota && jugadas.length >= 4) mejor = { nota, jugadas };
        }
        if (!mejor.jugadas.length) continue;
        mirados++;

        const { stdout } = await correr('node',
            ['acreditar.mjs', '--juego', juego, '--semilla', String(s), '--jugadas', mejor.jugadas.join(',')],
            { cwd: process.cwd(), maxBuffer: 8 * 1024 * 1024 })
            .catch((err) => ({ stdout: err.stdout ?? '' }));
        comprobaciones++;
        if (/✓ ACREDITA/.test(stdout.replace(/\x1b\[[0-9;]*m/g, ''))) colados.push(`${juego} (${mejor.nota})`);
    }

    comprobaciones++;
    if (mirados < 2) {
        console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${mirados} juegos atacables. `
            + 'Con tan pocos, «la fuerza bruta no cuela» no significa nada.\n'));
        process.exit(2);
    }
    if (colados.length) {
        mal(`la fuerza bruta al azar acredita en: ${colados.join(', ')}, con sólo ${INTENTOS} `
            + 'intentos en local. Dar botones al azar y quedarse con la partida afortunada '
            + 'no puede repartir títulos: no hay ninguna capacidad detrás.');
    }
}

// ── 8. LOS TRES VEREDICTOS EXISTEN Y SE DISTINGUEN ─────────────────────────
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
console.log(verde('✓ la casa juega, la semilla no la eliges tú, rellenar no paga, y todo se puntúa igual\n'));
