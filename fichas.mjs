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
/**
 * ⚠️ `obtenerSustrato`, NO `sustratoDe` — Y ESA DIFERENCIA ME HIZO PUBLICAR UN
 *    NÚMERO FALSO.
 *
 * Hay DOS caminos para el sustrato: 18 juegos publican el suyo propio desde sus
 * reglas, y los otros 17 pasan por el adaptador, que es el único que usa el mapa
 * `LEYENDAS` de `sustrato.js`. `sustratoDe()` es sólo la segunda mitad.
 *
 * Preguntándole a esa mitad salía «30 de 35 juegos no dicen qué se ve en pantalla» y
 * lo dije en voz alta: la puerta de visión al 14 %, el agujero más grande del banco.
 * Falso — diecisiete de los que contaba como mudos declaran su leyenda dentro de su
 * propio `sustrato()`, y nunca pasan por el mapa. Estaba midiendo un camino y
 * concluyendo sobre los dos.
 *
 * `obtenerSustrato()` es el que decide cuál de los dos toca, o sea el que ven de
 * verdad los jugadores. Preguntar por donde se entra, no por donde uno mira.
 */
const { obtenerSustrato } = await impo('public/arcade/js/protohub/sustrato.js');
const paginas = await leer('public/data/paginas.json', {});
const tabla = await leer('resultados/tabla.json', {});
const prosa = await leer('public/data/fichas_prosa.json', {});
/**
 * Lo que midieron `npm run tacto` y `npm run verbos` al pasar por los 35. Si no están,
 * quedan vacíos y la ficha dirá «sin medir»: esto NO se recalcula aquí, porque medirlo
 * pide abrir treinta y cinco páginas en un navegador y `fichas.mjs` tiene que poder
 * correr en dos segundos dentro de `npm test`.
 */
// Nombres largos a propósito: dentro del bucle ya hay un `verbos` local —el conjunto de
// jugadas del juego— y llamar `verbos` a esto lo taparía sin dar ningún error.
const medidoTacto = await leer('public/data/tacto.json', {});
const medidoVerbos = await leer('public/data/verbos.json', {});
/**
 * ⚠️ LA FICHA PROMETÍA UNA CAPTURA QUE NO SE PUBLICA. 35 DE 35.
 *
 * Esto comprobaba que el fichero existiera en `capturas_laboratorio/` y daba «captura
 * 35/35 derivado y listo». Pero esa carpeta está en `.gitignore` —y con razón: son
 * ficheros de trabajo que el laboratorio rehace en cada pasada— así que no hay ni un
 * png en `public/` ni en `dist_publico/`. La ficha apuntaba a una ruta que desde el
 * sitio da 404, en los treinta y cinco.
 *
 * Es el mismo error de denominador que llevo cazando todo el día, esta vez en mi propio
 * instrumento: comprobé que el fichero EXISTA, no que se pueda PEDIR. El día que montara
 * el catálogo habrían salido 35 imágenes rotas y habría empezado a mirar el catálogo.
 *
 * Se arregla copiándolas a `public/capturas/` DESDE AQUÍ, o sea desde la misma línea que
 * hace la promesa. Así no pueden volver a separarse: si no se copia, no se promete.
 */
const fs = await import('node:fs/promises');
const origenCapturas = path.join(AQUI, 'capturas_laboratorio');
const destinoCapturas = path.join(AQUI, 'public/capturas');
await fs.mkdir(destinoCapturas, { recursive: true });
const capturas = new Set();
for (const juego of JUEGOS) {
    const de = path.join(origenCapturas, `${juego}.png`);
    try {
        await fs.copyFile(de, path.join(destinoCapturas, `${juego}.png`));
        capturas.add(`${juego}.png`);
    } catch { /* no hay captura de ese juego: se cuenta abajo como que falta */ }
}

/**
 * Qué juegos tienen puerta HTTP. Se mira el texto entero del OpenAPI en vez de
 * recorrer su estructura: las rutas nombran el juego de varias formas —en el path,
 * en un enum de parámetros, en los ejemplos— y bastaría cambiar una de ellas para
 * que un recorrido fino diera un falso «no está» sobre un juego perfectamente
 * servido.
 */
const textoApi = await readFile(path.join(AQUI, 'public/openapi.json'), 'utf-8').catch(() => '');
const enOpenApi = new Set(JUEGOS.filter(j => textoApi.includes(`"${j}"`) || textoApi.includes(`/${j}`)));

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

    let leyenda = null, tieneRejilla = false;
    try {
        const sus = obtenerSustrato(juego, reglas, p, st);
        if (sus?.leyenda && Object.keys(sus.leyenda).length) leyenda = sus.leyenda;
        tieneRejilla = !!sus?.rejilla;
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
    const asientos = Number.isInteger(reglas.ASIENTOS) ? reglas.ASIENTOS
                   : Array.isArray(st.marcador) ? st.marcador.length
                   : Array.isArray(st.manos_rivales) ? st.manos_rivales.length + 1 : null;
    const cl = enClasificacion(juego);
    const textos = prosa[juego] ?? {};

    if (!textos.reglas) faltan.prosa.push(juego);
    if (!textos.origen) faltan.origen.push(juego);
    /**
     * Un juego SIN REJILLA no necesita leyenda y contarlo como hueco es inventar
     * deuda: las mesas de cartas son montones y zonas, no un tablero de casillas, y
     * forzarles una leyenda sería relleno. Se cuentan aparte para que se vea que no
     * están olvidados, sino que no aplica.
     */
    if (!leyenda && tieneRejilla) faltan.leyenda.push(juego);
    else if (!leyenda) (faltan.sinRejilla ??= []).push(juego);
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
        // Ruta SERVIDA, no la de trabajo: es la que un navegador va a pedir de verdad.
        captura: capturas.has(`${juego}.png`) ? `/capturas/${juego}.png` : null,
        /**
         * ⚠️ CÓMO SE JUEGA CON LA MANO, MEDIDO. Y `null` SI NADIE LO HA MEDIDO.
         *
         * Hasta hoy la ficha decía qué necesita cada puerta pero no si una persona
         * puede JUGAR: mancala llevaba quién sabe cuánto sin un solo escuchador de
         * clic —sólo se puede jugar desde el panel— y ninguna ficha lo decía. Un
         * betatester abría el juego y descubría eso él solo, si es que lo descubría.
         *
         * Sale de `tacto.json` y `verbos.json`, que escriben los instrumentos al pasar
         * por los 35. Si el fichero no está, esto es `null` y la ficha dice «sin
         * medir» — que es distinto de «no se puede». Poner un valor por defecto aquí
         * sería repetir el `asientos: 1` que hizo a la ficha del ajedrez publicar que
         * es un juego de una persona.
         */
        conLaMano: (() => {
            const t = medidoTacto.juegos?.[juego], v = medidoVerbos.juegos?.[juego];
            if (!t && !v) return null;
            const tocando = t ? (t.mesa?.dedo ?? 0) > 0 || (t.casillas?.ok ?? 0) > 0 || (t.pares?.ok ?? 0) > 0 : null;
            return {
                medido: t ? medidoTacto.fecha : medidoVerbos.fecha,
                panel: t ? t.panel.dedo : null,
                tocandoLaMesa: tocando,
                barraDeVerbos: v ? v.enLaBarra : null,
                verbos: v ? v.verbos : null,
                // La frase que le interesa a quien va a probarlo, en vez de seis números.
                /**
                 * La frase que le interesa a quien va a probarlo, en vez de seis
                 * números. Y sólo se dice «sólo desde el panel» cuando las DOS cosas
                 * se han mirado y las dos han salido que no: con una sin medir, la
                 * frase sería una acusación sin pruebas.
                 */
                resumen: tocando ? 'se juega tocando la mesa'
                    : (v?.verbos ?? 0) > 0 ? 'se juega con los botones de abajo'
                    : tocando === false && v?.verbos === 0 ? 'SÓLO se puede jugar desde el panel'
                    /**
                     * Ni tocando ni con botones, pero el juego tampoco ofrecía verbos
                     * en ese instante — o sea que no se puede afirmar que NUNCA los
                     * tenga. Se dice lo que se vio y cuándo, en vez de dejarlo en
                     * blanco: en blanco se lee «sin medir», y esto sí se midió.
                     */
                    : tocando === false ? 'en el momento de medir, sólo respondía el panel'
                    : null,
            };
        })(),
        // ── lo único escrito a mano ────────────────────────────────────────
        reglas: textos.reglas ?? null,
        origen: textos.origen ?? null,
    };

    /**
     * ⚠️ Y UNA COLUMNA POR PUERTA: LA FICHA COMO TABLERO DE ESTADO.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Idea de Oscar, y es la que le da a esto un segundo uso: si la ficha reúne lo
     * que cada puerta necesita, entonces también dice **qué funciona y qué no**,
     * juego por juego. No hace falta un panel aparte — sale de lo que ya se ha
     * recogido arriba.
     *
     * Cada puerta se marca según lo que le hace falta para poder jugar de verdad:
     *
     *   persona   una captura para reconocer el juego y un objetivo que leer
     *   llm       el objetivo y un vocabulario o formato de jugada que mandar
     *   visión    la leyenda: sin ella se ve la pantalla y no se entiende
     *   fsm       que el juego ENTRE en la clasificación; si no, su rival de casa
     *             no sirve para medir a nadie, aunque el juego se pueda jugar
     *   openapi   que el juego esté declarado en la puerta HTTP
     *
     * ⚠️ Esto dice si la puerta está MONTADA, no si está BIEN. Un objetivo puede
     * estar escrito y ser malo, y una leyenda puede nombrar mal las casillas. Lo
     * que se puede comprobar de verdad —que lo declarado coincida con lo que hace
     * el juego— es trabajo de `prueba_fichas.mjs`, no de esta cuenta.
     */
    const f = fichas[juego];
    f.puertas = {
        persona: !!(f.captura && f.objetivo),
        llm: !!(f.objetivo && (f.verbos?.length || f.formatoJugada)),
        // Un juego sin rejilla no puede tener leyenda y no por eso su pantalla es
        // ilegible: son montones de cartas, y lo que hay que entender de ellos lo
        // cuentan el objetivo y el panel. Contarlos como puerta rota sería inventar
        // un agujero.
        vision: !!f.leyenda || !tieneRejilla,
        fsm: !!f.clasificacion?.entra,
        openapi: enOpenApi.has(juego),
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

/**
 * El tablero de estado: cuántos juegos tiene montada cada puerta. Es la lectura que
 * pidió Oscar —«esto nos vale también para ver qué funciona y qué no»— y sale gratis
 * de lo ya recogido.
 */
const puertas = ['persona', 'llm', 'vision', 'fsm', 'openapi'];
console.log(`\n  por PUERTA (de las cinco maneras de jugar):`);
for (const p of puertas) {
    const ok = Object.values(fichas).filter(f => f.puertas?.[p]).length;
    const barra = '█'.repeat(Math.round(ok / n * 20)).padEnd(20, '·');
    console.log(`    ${p.padEnd(8)} ${barra} ${ok}/${n}`);
}
const cojos = Object.entries(fichas)
    .filter(([, f]) => puertas.filter(p => f.puertas?.[p]).length <= 2)
    .map(([j]) => j);
if (cojos.length) {
    console.log(`\n  con dos puertas o menos (${cojos.length}): ${cojos.slice(0, 8).join(', ')}`
              + (cojos.length > 8 ? '…' : ''));
}

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
