/**
 * cadena.mjs — cuánto de la cadena del ajedrez tiene cada juego
 * ═══════════════════════════════════════════════════════════════════════════
 *     node cadena.mjs      → escribe public/data/cadena.json
 *
 * POR QUÉ EXISTE
 * `/lab` era un inventario de ficheros: 118 tarjetas ordenadas por carpeta. Un
 * inventario no demuestra nada — enseña que tienes cosas, no que el motor sepa
 * hacerlas.
 *
 * El ajedrez es el patrón oro porque tiene la cadena ENTERA: reglas propias,
 * página jugable, entorno de gym, marcador que cambia con la partida, rival de
 * casa, una prueba que comprueba sus reglas, y una estación en la sala. Medir
 * cuántos juegos llegan ahí sí dice lo que el motor sabe hacer — y también,
 * honestamente, dónde no llega.
 *
 * Lo que salió la primera vez que se midió:
 *
 *     reglas 19/19 · gym 19/19 · marcador 19/19 · casa 19/19
 *     página 12/19 · prueba 7/19 · sala 8/19
 *
 * O sea: **el motor está completo para los diecinueve; lo que falta es el
 * escaparate**. Esa frase no se podía decir antes de medirlo, y cambia lo que
 * hay que construir a continuación — no más reglas, sino más mesas.
 *
 * Se emite como JSON para que el índice lo pinte sin tener que ejecutar
 * JavaScript de juego dentro del generador de Python. Mismo patrón que
 * `estado_salas.json`.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(AQUI, 'public');

const fetchReal = globalThis.fetch;
globalThis.fetch = async (entrada, init) => {
    const url = entrada instanceof URL ? entrada : new URL(String(entrada));
    if (url.protocol !== 'file:') return fetchReal(entrada, init);
    return new Response(await readFile(fileURLToPath(url), 'utf-8'), { status: 200 });
};
const imp = (rel) => import(pathToFileURL(path.join(PUB, 'arcade/js/protohub', rel)).href);
const { JUEGOS, TITULOS, cargarReglas } = await imp('rules/index.js');
const { puntuacionDe } = await imp('Verificador.js');

const arcade = await readdir(path.join(PUB, 'arcade'));
const labs = await readdir(path.join(PUB, 'labs'));
const sala = await readFile(path.join(PUB, 'rooms/room_sala_del_huevo.html'), 'utf8');
const registro = await readFile(path.join(PUB, 'js/alisa-engine/src/gym/registro.js'), 'utf8');

// El fichero de la página no siempre se llama como el juego: son nombres de
// mesa, no identificadores. Se declara en vez de adivinarse.
const ALIAS = { ajedrez: 'chess', damas: 'checkers' };

const ESLABONES = [
    ['reglas',   'reglas propias en JavaScript'],
    ['pagina',   'una persona puede jugarlo en el navegador'],
    ['gym',      'entorno para máquinas'],
    ['marcador', 'puntúa, y el número cambia'],
    ['casa',     'rival de la casa'],
    // ⚠️ Esta columna decía «una prueba que comprueba SUS reglas» y era
    // engañosa: los 19 los cubre `prueba_reglas.mjs` en cada `npm test`. Lo que
    // mide de verdad es si tiene un LABORATORIO propio en el navegador — un
    // sitio donde un desconocido abra la página y vea el veredicto sin
    // instalarse nada. Es otra cosa, y menos común: 7 de 19.
    ['lab',      'laboratorio propio que se abre y canta el veredicto'],
    ['sala',     'estación en la Sala del Huevo'],

    // ═══ COLUMNAS AÑADIDAS EL 2026-08-06 ═══════════════════════════════════
    // ⚠️ EL METRO SE HABÍA QUEDADO CORTO, Y ESO ES PEOR QUE NO TENERLO.
    // En una sola jornada se construyeron mesas compartidas, asientos que admiten
    // personas, políticas y modelos, y ratón en cuatro tableros que no se podían
    // tocar. Ninguna de las siete columnas de arriba pregunta por nada de eso, así
    // que la tabla seguía cantando 19/19 en cinco columnas mientras go no dibujaba
    // su tablero y siete juegos de cartas no tenían mesa que ver.
    //
    // Ya pasó una vez con la columna `prueba`, que medía otra cosa de la que decía.
    // Una medida que deja de medir lo que importa sigue dando verde, y el verde es
    // lo que hace que nadie mire.
    ['tablero3d',  'tablero 3D propio, no sólo la mesa funcional'],
    ['raton',      'se juega clicando el tablero, no escribiendo la jugada'],
    ['asientos',   'cada silla admite persona, política o modelo'],
    ['compartida', 'dos seres pueden sentarse a la MISMA partida'],
];

/**
 * ⚠️ LO QUE ESTA HERRAMIENTA NO PUEDE MEDIR, Y NO FINGE MEDIR.
 *
 * Falta una columna «se ve»: que el 3D dibuje algo de verdad. Go la fallaría —
 * juega, se clica, el minimapa lo refleja, y el tablero no aparece— y por eso
 * haría falta.
 *
 * No se añade porque desde Node NO SE PUEDE COMPROBAR: hace falta un navegador
 * que renderice y alguien que mire los píxeles. Poner aquí una columna que en
 * realidad detectara «tiene un fichero visualizador» sería exactamente el error
 * que estas cuatro columnas vienen a corregir: una medida con el nombre de otra.
 *
 * Va aparte, como prueba de navegador. Hasta que exista, `se ve` se comprueba a
 * ojo y se anota en `docs/adaptar_lo_que_hay.md`.
 */

// ── Con qué se juega cada juego, leído de los ficheros y no declarado ──────
//
// La página de cada juego es ya sólo configuración:
//     montarMesa({ juego: 'go', visualizador: 'go_visualizer.js' });
// así que basta con leerla. Nada de mantener aquí una lista paralela: eso es
// justo lo que se separa en cuanto entre el juego veinte.
const paginas = {};
for (const f of arcade.filter(f => f.endsWith('.html'))) {
    const txt = await readFile(path.join(PUB, 'arcade', f), 'utf8');
    const m = txt.match(/montarMesa\(\s*\{([^}]*)\}/s);
    if (!m) continue;
    const juego = m[1].match(/juego:\s*'([^']+)'/)?.[1];
    const vis = m[1].match(/visualizador:\s*'([^']+)'/)?.[1];
    if (juego) paginas[juego] = { fichero: f, visualizador: vis };
}

const visualizadores = {};
for (const [juego, p] of Object.entries(paginas)) {
    if (!p.visualizador) continue;
    try {
        visualizadores[juego] = await readFile(
            path.join(PUB, 'arcade/js', p.visualizador), 'utf8');
    } catch { /* declarado y ausente: se nota abajo como sin ratón */ }
}

// El panel de asientos llega por dos caminos, y los dos son el MISMO módulo:
// `mesa.html` lo importa para los diecinueve, y `SovereignBoardEngine` para las
// páginas de tablero. Se comprueba que esté, en vez de darlo por hecho.
const mesaGenerica = await readFile(path.join(PUB, 'arcade/mesa.html'), 'utf8');
const motorTablero = await readFile(path.join(PUB, 'arcade/js/SovereignBoardEngine.js'), 'utf8');
const hayAsientosEnLaMesa = mesaGenerica.includes('asientos.js');
const hayAsientosEnElMotor = motorTablero.includes('asientos.js');

// Quién NO admite compañía, y por qué. Se importa del propio árbitro para que no
// haya dos verdades: si mañana el póker aprende a sentar a dos, esta tabla se
// entera sola.
const { SOLITARIOS } = await import(
    pathToFileURL(path.join(AQUI, 'worker-mesas/mesas.js')).href);

const juegos = [];
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego);
    const st = reglas.estado(reglas.nuevaPartida({ semilla: 1, seed: 1 }));
    const pagina = ALIAS[juego] ?? juego;
    const tiene = {
        reglas: true,
        // ⚠️ Buscaba un fichero con el nombre del juego, y desde que existe
        // `mesa.html` —una mesa genérica dirigida por `rules/index.js`— los
        // diecinueve se pueden jugar en el navegador aunque no tengan página
        // propia. Seguir contando ficheros habría dado 12/19 con siete juegos
        // jugables delante: la pregunta era «¿se puede jugar?», no «¿hay un
        // .html que se llame así?».
        pagina: arcade.includes(pagina + '.html') || arcade.includes('mesa.html'),
        gym: registro.includes(`'${juego}'`),
        // Que exista un marcador NUMÉRICO publicado. El ajedrez no lo tenía y
        // valía 0 en toda partida jugara quien jugara — ver `docs/como-nos-equivocamos.md`.
        marcador: (st.score !== undefined || st.puntos !== undefined)
                  && typeof puntuacionDe(st) === 'number',
        casa: typeof reglas.sugerencia === 'function',
        lab: labs.some(f => f.includes(juego) && /test|perft/.test(f)),
        // ⚠️ Esto buscaba `'${juego}-protohub` con la comilla pegada, y el
        // identificador real es `'alisa/brisca-protohub-v0'`: entre la comilla
        // y el nombre va `alisa/`. Añadí ocho estaciones y el contador subió
        // UNA — la única que acertaba lo hacía por su página propia, no por el
        // entorno. Un detector que busca un patrón que no existe siempre dice
        // que no, y «no» suena a diagnóstico.
        sala: sala.includes(`${juego}-protohub`)
              || sala.includes(`juego=${juego}`)
              || sala.includes(`/${pagina}.html`),

        // Tablero 3D PROPIO. `mesa.html` no cuenta: es funcional a propósito y
        // vale para los diecinueve, así que contarla aquí daría 19/19 y esta
        // columna dejaría de distinguir nada — que es como se estropean las
        // medidas.
        tablero3d: !!visualizadores[juego],

        // ⚠️ Se pregunta por el RATÓN SOBRE EL TABLERO, no por «se puede clicar».
        // Los botones de `mesa.html` también son clics, así que la pregunta laxa
        // daría 19/19 y no diría nada. Lo que interesa es si el 3D se toca: hasta
        // hoy, cuatro de los seis tableros se dibujaban y no se podían tocar.
        raton: !!visualizadores[juego] && (
            visualizadores[juego].includes('raton_tablero')
            || /addEventListener\('(pointerdown|click|mousedown)'/.test(visualizadores[juego])),

        // Por `mesa.html` lo tienen los diecinueve; las páginas de tablero lo
        // reciben además por el motor. Un 19/19 aquí es un hecho, no un adorno:
        // dice que cualquier juego admite persona, política o modelo en su silla.
        asientos: hayAsientosEnLaMesa || (!!visualizadores[juego] && hayAsientosEnElMotor),

        // Lo dice el árbitro, no esta tabla. Seis dicen que no y cada uno con su
        // motivo escrito: `guerra` es el control del banco, `blackjack` y `poker`
        // se juegan contra la casa, y snake/fagocito/peaton son de un jugador.
        compartida: !SOLITARIOS[juego],
    };
    juegos.push({
        juego, titulo: TITULOS[juego] ?? juego, tiene,
        completos: ESLABONES.filter(([k]) => tiene[k]).length,
    });
}

const total = {};
for (const [k] of ESLABONES) total[k] = juegos.filter(j => j.tiene[k]).length;

await mkdir(path.join(PUB, 'data'), { recursive: true });
await writeFile(path.join(PUB, 'data', 'cadena.json'),
    JSON.stringify({ eslabones: ESLABONES, juegos, total, fecha: Date.now() }, null, 2));

const oro = juegos.filter(j => j.completos === ESLABONES.length);
console.log(`\n  cadena completa: ${oro.length}/${juegos.length}  → ${oro.map(j => j.titulo).join(', ')}`);
for (const [k, desc] of ESLABONES) {
    console.log(`    ${k.padEnd(9)} ${String(total[k]).padStart(2)}/${juegos.length}   ${desc}`);
}
console.log(`\n  escrito public/data/cadena.json\n`);
