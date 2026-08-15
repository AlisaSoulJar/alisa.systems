/**
 * prueba_repetidor.mjs — que una partida se pueda VER volverse a jugar
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_repetidor.mjs        (entra en `npm test`)
 *
 * La tesis del proyecto es que cualquiera puede verificar una partida volviéndola
 * a jugar. `prueba_reglas` ya comprueba que las reglas son deterministas y el
 * verificador que un recibo se re-simula. Lo que falta —y es lo que esto mira— es
 * el ESLABÓN QUE LO HACE VISIBLE: el enlace.
 *
 * Un enlace del repetidor es una promesa muy concreta: «abre esto y verás
 * exactamente esta partida». Si la promesa falla, falla callando — la página abre,
 * se ve un tablero, y no hay forma de saber que es otro. Justo la clase de fallo
 * que este proyecto ha pagado seis veces.
 *
 * Se comprueban tres cosas, y cada una nació de algo que se rompió de verdad:
 *
 *   1. LA PÁGINA EXISTE. Las reglas se llaman `damas` y la página `checkers.html`.
 *      Un enlace con la clave de las reglas da un 404 que parece que el repetidor
 *      no funciona. La tabla de alias se MIDE contra las páginas en disco, no se
 *      recuerda: el día que alguien renombre una, salta aquí.
 *
 *   2. LO QUE VIAJA EN EL ENLACE BASTA PARA REPETIR. Se juega una partida, se
 *      construye el enlace, se LEE de vuelta como lo leería el navegador, y se
 *      vuelve a jugar desde cero. El tablero final tiene que ser el mismo. Aquí es
 *      donde se destapó que faltaban las `normas`: sin ellas, damas repetía con
 *      otras reglas.
 *
 *   3. UN RECIBO FALSO SE PARA Y SE DICE. Se corrompe una jugada a propósito y el
 *      repetidor tiene que negarse a seguir, no saltársela. Un repetidor que
 *      disimula un recibo roto es peor que ninguno: enseña una ficción con aspecto
 *      de prueba.
 */
import { readdir, readFile } from 'node:fs/promises';

const { cargarReglas, JUEGOS } = await import('./public/arcade/js/protohub/rules/index.js');
const { enlaceRepetidor, PAGINA } = await import('./public/arcade/js/protohub/enlace_repetidor.js');
const { reciboDeLaURL, crearRepetidor } = await import('./public/arcade/js/protohub/repetidor.js');

let fallos = 0;
const mal = (m) => { console.log(`  ✗ ${m}`); fallos++; };
const bien = (m) => console.log(`  ✓ ${m}`);

/**
 * Un hub de mentira con la misma superficie que usa el repetidor: `reset` y `move`.
 * No se importa el ProtoHub de verdad porque arrastra el navegador; y no hace falta:
 * el repetidor sólo conoce esas dos puertas, que es justo lo que lo hace servir para
 * los treinta y cinco juegos sin saber de ninguno.
 */
function hubDePrueba(reglas) {
    let p = null;
    return {
        reset(_, opts = {}) { p = reglas.nuevaPartida({ ...opts, seed: opts.semilla }); return p; },
        move(_, accion) {
            const j = accion.move ?? accion.params?.uci ?? accion.params?.action;
            return reglas.mover(p, j) ? { ok: true } : { ok: false, error: `jugada ilegal: ${j}` };
        },
        estado: () => reglas.estado(p),
    };
}

/** Juega una partida corta y determinista: siempre la primera jugada legal. */
function jugar(reglas, semilla, tope, opciones = {}) {
    const p = reglas.nuevaPartida({ semilla, seed: semilla, ...opciones });
    const jugadas = [];
    for (let i = 0; i < tope; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const legales = (st.legal_moves ?? st.legal_actions ?? [])
            .filter(m => m !== 'nueva' && m !== 'reset');
        if (!legales.length) break;
        if (!reglas.mover(p, legales[0])) break;
        jugadas.push(legales[0]);
    }
    return { jugadas, estado: reglas.estado(p) };
}

console.log('\nEL REPETIDOR — que una partida se pueda ver volverse a jugar\n');

// ── 1. Cada enlace apunta a una página que existe ───────────────────────────
{
    const paginas = new Set((await readdir('./public/arcade'))
        .filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)));

    // Y la tabla de alias se comprueba contra lo que las páginas DECLARAN, que es
    // la medida que evita recordar mal: se lee el `juego:` de cada `montarMesa`.
    const alias = {};
    for (const f of await readdir('./public/arcade')) {
        if (!f.endsWith('.html')) continue;
        const txt = await readFile(`./public/arcade/${f}`, 'utf8');
        if (!txt.includes('montarMesa({')) continue;
        const m = txt.match(/juego:\s*'([^']+)'/);
        if (m && m[1] !== f.slice(0, -5)) alias[m[1]] = f.slice(0, -5);
    }

    const sobran = Object.keys(PAGINA).filter(k => alias[k] !== PAGINA[k]);
    const faltan = Object.keys(alias).filter(k => PAGINA[k] !== alias[k]);
    if (sobran.length || faltan.length) {
        mal(`la tabla de alias no cuadra con las páginas — sobran [${sobran}], faltan [${faltan}]`);
    } else {
        bien(`tabla de alias al día (${Object.keys(alias).length}: `
           + `${Object.entries(alias).map(([j, p]) => `${j}→${p}`).join(', ')})`);
    }

    let rotos = 0;
    for (const juego of JUEGOS) {
        const url = enlaceRepetidor({ juego, semilla: 1, jugadas: ['x'] });
        const pagina = url.split('/arcade/')[1].split('.html')[0];
        if (!paginas.has(pagina)) { mal(`'${juego}' → ${pagina}.html no existe`); rotos++; }
    }
    if (!rotos) bien(`los ${JUEGOS.length} juegos apuntan a una página que existe`);
}

// ── 2. Lo que viaja en el enlace basta para repetir la partida ──────────────
{
    // Damas primero y por su nombre: es el único con normas variables, o sea el
    // único donde el enlace puede ser insuficiente sin parecerlo.
    const casos = [
        { juego: 'damas', semilla: 7, tope: 14, opciones: {} },
        { juego: 'damas', semilla: 7, tope: 14, opciones: { normas: { damaVuela: true, peonComeAtras: true } } },
        { juego: 'brisca', semilla: 7, tope: 10, opciones: {} },
        { juego: 'ajedrez', semilla: 3, tope: 8, opciones: {} },
        { juego: 'mancala', semilla: 5, tope: 12, opciones: {} },
    ];

    for (const c of casos) {
        const reglas = await cargarReglas(c.juego, c.opciones);
        if (!reglas) { mal(`sin reglas para '${c.juego}'`); continue; }

        const jugada = jugar(reglas, c.semilla, c.tope, {});
        const normas = jugada.estado.normas;
        const url = enlaceRepetidor({ juego: c.juego, semilla: c.semilla,
                                      jugadas: jugada.jugadas, normas });
        const etiqueta = `${c.juego}${normas ? ' ' + JSON.stringify(normas) : ''}`;
        if (!url) { mal(`${etiqueta}: no dio enlace`); continue; }

        // Se lee el enlace como lo leería el navegador — la misma función, no una
        // copia. Si el formato cambiara sólo en un lado, aquí se nota.
        const recibo = reciboDeLaURL(url.slice(url.indexOf('?')));
        if (recibo.semilla !== c.semilla) { mal(`${etiqueta}: la semilla no viaja`); continue; }
        if (recibo.jugadas.length !== jugada.jugadas.length) {
            mal(`${etiqueta}: viajan ${recibo.jugadas.length} de ${jugada.jugadas.length} jugadas`);
            continue;
        }

        /**
         * ⚠️ Y LAS NORMAS SE CARGAN DESDE EL ENLACE, NO DESDE `c.opciones`.
         *
         * Es la trampa entera de esta prueba: reutilizar las reglas de arriba la
         * pondría verde aunque el enlace no llevara las normas, porque las tendría
         * de todas formas. Se vuelven a cargar leyendo `?normas=`, igual que hace
         * `montarMesa`, para que el enlace tenga que bastarse solo.
         */
        const pedidas = String(new URLSearchParams(url.slice(url.indexOf('?'))).get('normas') ?? '')
            .split(',').map(s => s.trim()).filter(Boolean);
        const declaradas = reglas.NORMAS ?? null;
        const delEnlace = declaradas
            ? { normas: Object.fromEntries(Object.entries(declaradas)
                  .map(([k, v]) => [k, pedidas.includes(k) ? true : v])) }
            : {};
        const reglas2 = await cargarReglas(c.juego, delEnlace);

        const hub = hubDePrueba(reglas2);
        const rep = crearRepetidor({ hub, juego: c.juego, jugadas: recibo.jugadas,
                                     semilla: recibo.semilla });
        rep.alFinal();
        const e = rep.estado();
        if (e.roto) {
            mal(`${etiqueta}: se paró en la jugada ${e.roto.en + 1} («${e.roto.jugada}») — ${e.roto.motivo}`);
            continue;
        }
        if (e.i !== jugada.jugadas.length) {
            mal(`${etiqueta}: repitió ${e.i} de ${jugada.jugadas.length}`);
            continue;
        }

        // Y el tablero final tiene que ser el mismo, no sólo «no dio error».
        const final = hub.estado();
        const antes = JSON.stringify(jugada.estado.board ?? jugada.estado.tablero ?? jugada.estado);
        const ahora = JSON.stringify(final.board ?? final.tablero ?? final);
        if (antes !== ahora) { mal(`${etiqueta}: repitió entera y el estado final NO coincide`); continue; }

        bien(`${etiqueta}: ${jugada.jugadas.length} jugadas repetidas desde el enlace, mismo final`);
    }
}

// ── 3. Un recibo falso se para y se dice cuál ───────────────────────────────
{
    const reglas = await cargarReglas('damas', {});
    const { jugadas } = jugar(reglas, 7, 10, {});
    // Se cambia una jugada por otra imposible: el recibo deja de ser cierto.
    const corrupto = [...jugadas];
    corrupto[4] = 'h8h1';

    const hub = hubDePrueba(reglas);
    const rep = crearRepetidor({ hub, juego: 'damas', jugadas: corrupto, semilla: 7 });
    rep.alFinal();
    const e = rep.estado();
    if (!e.roto) mal('un recibo con una jugada imposible se repitió entero — se está disimulando');
    else if (e.roto.en !== 4) mal(`se paró en la jugada ${e.roto.en + 1}, y la falsa era la 5`);
    else bien(`un recibo falso se para en la jugada exacta y dice cuál («${e.roto.jugada}»)`);

    // Y avanzar de uno en uno tiene que parar en el mismo sitio que ir al final:
    // son dos caminos distintos en el código y podrían no coincidir.
    const rep2 = crearRepetidor({ hub, juego: 'damas', jugadas: corrupto, semilla: 7 });
    rep2.alInicio();
    for (let i = 0; i < corrupto.length; i++) rep2.siguiente();
    const e2 = rep2.estado();
    if (e2.roto?.en !== e.roto?.en) {
        mal(`paso a paso se para en ${e2.roto?.en} y de golpe en ${e.roto?.en} — no dicen lo mismo`);
    } else bien('paso a paso y de golpe se paran en la misma jugada');
}

console.log(fallos ? `\n✗ ${fallos} fallo(s)\n` : '\n✓ el repetidor cumple lo que promete el enlace\n');
process.exit(fallos ? 1 : 0);
