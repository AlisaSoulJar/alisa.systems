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


    /**
     * ⚠️ LA TABLA SE MIDE CONTRA `data/paginas.json`, QUE SE GENERA.
     *
     * `enlace_repetidor.js` lleva una tabla de dos alias (damas→checkers,
     * ajedrez→chess) y eso es una lista escrita a mano — exactamente lo que
     * `entrar.html` avisa que no se vuelva a hacer: «este proyecto ya ha tenido
     * cinco listas escritas a mano separándose de la realidad sin avisar».
     *
     * No se puede quitar del todo: la función tiene que funcionar sin red, síncrona,
     * en Node y en el navegador. Lo que sí se puede es que NO SE SEPARE EN SILENCIO,
     * y eso se consigue midiéndola en cada `npm test` contra el mapa que `gen_paginas`
     * produce leyendo las propias páginas. Si alguien añade un juego con nombre
     * distinto al de su fichero, o renombra uno, salta aquí.
     */
    const mapa = JSON.parse(await readFile('./public/data/paginas.json', 'utf8'));
    const alias = {};
    for (const [juego, info] of Object.entries(mapa)) {
        const pagina = String(info.pagina ?? '').replace(/\.html$/, '');
        if (pagina && pagina !== juego) alias[juego] = pagina;
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

// ── 4. Todos los caminos de panel montan el repetidor ──────────────────────
/**
 * ⚠️ ESTO EXISTE PORQUE ME DEJÉ CUATRO JUEGOS FUERA.
 *
 * Monté el repetidor en la mesa genérica y en el motor de cartas y di el trabajo por
 * terminado, sin haber contado nunca cuántos caminos había. Había tres:
 *
 *     mesa genérica    20 juegos
 *     motor de cartas  11
 *     motor de tablero  4   ← chess, mancala, peatón, snake
 *
 * Los cuatro generaban su enlace y abrían una partida cualquiera, el ajedrez entre
 * ellos. No fallaba: enseñaba otra cosa, que es peor.
 *
 * Esto no comprueba que el repetidor FUNCIONE en cada juego —eso vive en el
 * navegador y se prueba abriéndolo—; comprueba que ninguna página se quede sin el
 * cable. Si mañana aparece un cuarto camino, o alguien mueve una página a un motor
 * distinto, salta aquí en vez de en un enlace que enseña otra partida.
 */
{
    /**
     * ⚠️ LA MARCA ES `crearRepetidor({`, CON EL PARÉNTESIS, Y NO ES QUISQUILLOSO.
     *
     * Estaba como `crearRepetidor` a secas. Al comprobar que esta prueba PUEDE fallar
     * —renombrando la llamada a `crearRepetidorZZZ` en un motor— siguió en verde: el
     * nombre saboteado CONTIENE el original, así que `includes` decía que sí.
     *
     * El sabotaje era malo y la prueba también: buscar un identificador suelto da por
     * bueno cualquier cosa que lo contenga, incluida una mención en un comentario
     * explicando que ya no se usa. Con el paréntesis se busca una LLAMADA.
     */
    const MOTORES = [
        { fichero: 'public/arcade/js/mesa_tablero.mjs',           marca: 'crearRepetidor({' },
        { fichero: 'public/arcade/js/SovereignCardEngine.js',     marca: 'crearRepetidor({' },
        { fichero: 'public/arcade/js/SovereignBoardEngine.js',    marca: 'crearRepetidor({' },
        { fichero: 'public/arcade/js/mesa_cartas.mjs',            marca: null },  // usa el motor de cartas
    ];
    const conCable = new Set();
    for (const m of MOTORES) {
        const txt = await readFile(`./${m.fichero}`, 'utf8').catch(() => '');
        if (!txt) { mal(`falta ${m.fichero}`); continue; }
        if (m.marca === null || txt.includes(m.marca)) conCable.add(m.fichero.split('/').pop());
        else mal(`${m.fichero} no monta el repetidor`);
    }

    // Y ahora se mira qué usa CADA página, que es lo que de verdad importa.
    const sinCable = [];
    for (const f of await readdir('./public/arcade')) {
        if (!f.endsWith('.html')) continue;
        const txt = await readFile(`./public/arcade/${f}`, 'utf8');
        if (!txt.includes('montarMesa({')) continue;
        const vis = txt.match(/visualizador:\s*'([^']+)'/);
        // Sin visualizador propio va la mesa genérica, que ya está comprobada.
        if (!vis) continue;
        const cuerpo = await readFile(`./public/arcade/js/${vis[1]}`, 'utf8').catch(() => '');
        const motor = cuerpo.includes('SovereignBoardEngine') ? 'SovereignBoardEngine.js'
                    : cuerpo.includes('SovereignCardEngine')  ? 'SovereignCardEngine.js'
                    : 'mesa_tablero.mjs';
        if (!conCable.has(motor)) sinCable.push(`${f} (${motor})`);
    }
    if (sinCable.length) mal(`páginas cuyo motor no monta el repetidor: ${sinCable.join(', ')}`);
    else bien(`los ${MOTORES.length} caminos de panel montan el repetidor, y ninguna página se queda fuera`);
}

console.log(fallos ? `\n✗ ${fallos} fallo(s)\n` : '\n✓ el repetidor cumple lo que promete el enlace\n');
process.exit(fallos ? 1 : 0);
