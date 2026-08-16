/**
 * fichas.mjs — la ficha de cada juego, con TODO lo que ya se sabe de él
 * ═══════════════════════════════════════════════════════════════════════════
 *     npm run fichas
 *
 * ⚠️ UNA SOLA FICHA PARA LAS CINCO PUERTAS, NO UNA POR AUDIENCIA
 *
 * Este banco tiene cinco maneras de jugar —persona, FSM, LLM, visión y OpenAPI— y
 * su tesis es que todas juegan al MISMO juego: el panel de jugadas es literalmente
 * `legal_moves`, la misma lista que recibe un agente por la puerta de texto.
 *
 * Así que la ficha sigue esa misma ley. No hay una ficha «de jugador» y otra «de
 * spec»: hay UNA, con toda la información al alcance de todos, presentada distinto
 * según por dónde entres. Escribir dos sería crear dos verdades, y este proyecto
 * lleva semanas quitando de en medio listas escritas a mano que se separaron de la
 * realidad en silencio.
 *
 * ⚠️ Y POR ESO LO DERIVABLE SE DERIVA. NUNCA SE COPIA.
 *
 * Todo lo que la máquina ya sabe se saca de donde vive —las reglas, el estado, la
 * clasificación medida, las capturas— y no se escribe aquí. A mano queda sólo lo
 * que ninguna máquina puede contestar: las reglas en prosa y de dónde viene el
 * juego. Eso vive aparte, en `public/data/fichas_prosa.json`, y esto lo pega.
 *
 * ⚠️ LA CONSECUENCIA QUE HACE QUE ESTO VALGA LA PENA: LA FICHA ES VERIFICABLE.
 *
 * Si la ficha dice «verbos: arriba, abajo, izquierda, derecha, esperar», eso se
 * puede comprobar contra `legal_moves`. Si dice «4 asientos», contra la longitud
 * del marcador. El día que alguien cambie un juego sin tocar su ficha, salta —
 * igual que salta el sello del `?v=` o la clasificación publicada. Deja de ser
 * documentación y pasa a ser la spec ejecutable del banco.
 *
 * Esto sólo RECOGE. Comprobar que lo recogido sigue siendo cierto es trabajo de
 * `prueba_fichas.mjs`, que se apoya en este JSON.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const leer = async (rel, x = null) => {
    try { return JSON.parse(await readFile(path.join(AQUI, rel), 'utf-8')); } catch { return x; }
};

const { JUEGOS, cargarReglas } = await impo('public/arcade/js/protohub/rules/index.js');
/**
 * La leyenda —qué significa cada valor de la rejilla— NO vive en cada juego: está
 * centralizada en `sustrato.js`, en un mapa `LEYENDAS` escrito a mano. Por eso hay
 * que pedírsela a `sustratoDe()` y no buscarla en el estado, que fue mi primer
 * intento: daba «faltan las 35» cuando en realidad la mitad la tiene.
 */
const { sustratoDe } = await impo('public/arcade/js/protohub/sustrato.js');
const paginas = await leer('public/data/paginas.json', {});
const tabla = await leer('resultados/tabla.json', {});
const prosa = await leer('public/data/fichas_prosa.json', {});
const capturas = new Set(
    (await import('node:fs')).readdirSync(path.join(AQUI, 'capturas_laboratorio')));

/** Lo que la clasificación dice de un juego: si entra y con qué hueco, o por qué no. */
const enClasificacion = (j) => {
    if ((tabla.juegos ?? []).includes(j)) return { entra: true, motivo: null };
    const d = tabla.descartados?.[j];
    return { entra: false, motivo: d ?? 'no medido en la última pasada' };
};

const fichas = {};
const faltan = { prosa: [], origen: [], leyenda: [], captura: [] };

for (const juego of JUEGOS) {
    let reglas;
    try { reglas = await cargarReglas(juego, {}); }
    catch (e) { fichas[juego] = { error: String(e.message).slice(0, 80) }; continue; }

    const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
    const st = reglas.estado(p, 0) ?? {};

    /**
     * Los verbos se toman de la partida INICIAL y, además, de unas cuantas jugadas
     * después: hay juegos cuyo vocabulario crece al avanzar —la generala abre con
     * `tirar` y luego tiene quince— y una ficha que sólo mire la primera pantalla
     * prometería menos verbos de los que el juego acepta.
     */
    const verbo = (m) => String(m).split(':')[0];
    const verbos = new Set((st.legal_moves ?? []).map(verbo));
    let q = p;
    for (let i = 0; i < 12; i++) {
        const e = reglas.estado(q, 0) ?? {};
        const legales = (e.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset');
        if (!legales.length || e.is_game_over) break;
        for (const m of legales) verbos.add(verbo(m));
        if (!reglas.mover(q, legales[0])) break;
    }

    let leyenda = null;
    try {
        const sus = sustratoDe(juego, st);
        if (sus?.leyenda && Object.keys(sus.leyenda).length) leyenda = sus.leyenda;
    } catch { /* un juego sin sustrato no tiene leyenda que dar */ }
    /**
     * ⚠️ SI NO SE SABE, SE DICE `null`. NO SE PONE 1.
     *
     * La primera versión ponía 1 cuando no encontraba marcador ni manos rivales, y
     * la ficha del AJEDREZ salía anunciando «1 asiento». Un juego de dos. En una
     * ficha que quiere ser la spec del banco, un valor por defecto que parece un
     * dato es peor que un hueco: el hueco se ve y se rellena, el 1 se publica.
     *
     * Los juegos de tablero de dos no declaran sus asientos en ninguna parte, así
     * que ese hueco es real y sale en el informe de lo que falta EN EL CÓDIGO, no
     * en el de lo que falta por escribir.
     */
    const asientos = Array.isArray(st.marcador) ? st.marcador.length
                   : Array.isArray(st.manos_rivales) ? st.manos_rivales.length + 1 : null;
    const cl = enClasificacion(juego);
    const textos = prosa[juego] ?? {};

    if (!textos.reglas) faltan.prosa.push(juego);
    if (!textos.origen) faltan.origen.push(juego);
    if (!leyenda) faltan.leyenda.push(juego);
    if (!capturas.has(`${juego}.png`)) faltan.captura.push(juego);
    if (asientos === null) (faltan.asientos ??= []).push(juego);

    fichas[juego] = {
        // ── de las reglas, que son la única autoridad ──────────────────────
        titulo: paginas[juego]?.titulo ?? juego,
        pagina: paginas[juego]?.pagina ?? null,
        objetivo: reglas.OBJETIVO ?? null,
        asientos,
        /**
         * ⚠️ HAY DOS CLASES DE JUEGO Y CONFUNDIRLAS LLENABA LA FICHA DE BASURA.
         *
         * Unos tienen VOCABULARIO cerrado —`arriba`, `abajo`, `robar_mazo`— y ahí la
         * lista es la spec: eso es exactamente lo que acepta el juego, siempre.
         * Otros GENERAN sus jugadas del tablero: el ajedrez salía con `a1a2`, `b1c3`
         * y cincuenta y dos más, que no son verbos sino las jugadas legales de ESA
         * postura, distintas al turno siguiente. Publicar esa lista como spec sería
         * prometer un vocabulario que caduca en una jugada.
         *
         * Se distinguen por su forma: una jugada generada no lleva separador y son
         * muchas. En ese caso la ficha da el FORMATO y un puñado de ejemplos, que es
         * lo que de verdad necesita quien va a mandar una jugada.
         */
        ...(verbos.size > 8 && ![...verbos].some(v => String(v).includes(':'))
            ? { verbos: null,
                formatoJugada: `notación propia del juego, ${[...verbos][0].length} caracteres`,
                ejemplos: [...verbos].slice(0, 6) }
            : { verbos: [...verbos].sort(), formatoJugada: null, ejemplos: null }),
        normas: reglas.NORMAS ? Object.keys(reglas.NORMAS) : [],
        // Qué significa lo que se VE. Es la puerta que hoy está más coja, y sirve
        // igual a una persona («las casillas amarillas son la meta») que a un
        // agente que mira la pantalla en vez de leer el estado.
        leyenda,
        // ── de lo medido, no de lo prometido ───────────────────────────────
        clasificacion: cl,
        captura: capturas.has(`${juego}.png`) ? `capturas_laboratorio/${juego}.png` : null,
        // ── lo único escrito a mano ────────────────────────────────────────
        reglas: textos.reglas ?? null,
        origen: textos.origen ?? null,
    };
}

await writeFile(path.join(AQUI, 'public/data/fichas.json'),
                JSON.stringify(fichas, null, 2) + '\n');

const n = Object.keys(fichas).length;
console.log(`\n  ${n} fichas en public/data/fichas.json\n`);
console.log(`  derivado y listo:`);
console.log(`    objetivo    ${n - Object.values(fichas).filter(f => !f.objetivo).length}/${n}`);
console.log(`    verbos      ${Object.values(fichas).filter(f => f.verbos?.length).length}/${n}`);
console.log(`    asientos    ${n - (faltan.asientos?.length ?? 0)}/${n}`);
console.log(`    captura     ${n - faltan.captura.length}/${n}`);
console.log(`    en la tabla ${Object.values(fichas).filter(f => f.clasificacion?.entra).length}/${n}`);

console.log(`\n  falta por escribir a mano:`);
console.log(`    reglas en prosa   ${faltan.prosa.length}/${n}`
          + (faltan.prosa.length ? `  — ${faltan.prosa.slice(0, 6).join(', ')}…` : ''));
console.log(`    de dónde viene    ${faltan.origen.length}/${n}`);
console.log(`\n  y falta en el CÓDIGO (no es prosa, es que el juego no lo declara):`);
console.log(`    leyenda de la pantalla   ${faltan.leyenda.length}/${n}`
          + (faltan.leyenda.length ? `  — ${faltan.leyenda.slice(0, 6).join(', ')}…` : ''));
console.log(`    cuántos asientos tiene   ${faltan.asientos?.length ?? 0}/${n}`
          + (faltan.asientos?.length ? `  — ${faltan.asientos.slice(0, 6).join(', ')}…` : ''));
console.log('');
