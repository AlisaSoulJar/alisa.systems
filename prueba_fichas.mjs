/**
 * prueba_fichas.mjs — ¿lo que promete la ficha es lo que hace el juego?
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La ficha de cada juego es la spec del banco para las cinco puertas —persona, FSM,
 * LLM, visión y OpenAPI—, y una spec que nadie comprueba es una lista escrita a mano
 * esperando a separarse de la realidad. Este proyecto lleva meses quitando de en
 * medio exactamente eso: el sello del `?v=` que no correspondía al código, la
 * clasificación publicada que llevaba ocho días sin corresponder a ninguna medida.
 *
 * Así que aquí no se comprueba que la ficha esté BIEN ESCRITA —eso no lo sabe una
 * máquina— sino que lo que declara sea VERDAD contra el juego que hay.
 *
 * ⚠️ LO IMPORTANTE ES EL CRUCE, NO LA CUENTA.
 *
 * Que 35 juegos declaren un número de asientos no vale nada si el número es inventado.
 * Lo que ata la ficha a la realidad es que, en los juegos que ADEMÁS publican
 * marcador —uno por silla—, las dos cosas coincidan. Ahí la ficha no puede mentir
 * sin que salte. Los que no publican marcador se quedan con su declaración sin
 * cruzar, y eso se dice en vez de contarlos como verificados.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const AQUI = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);
const { JUEGOS, cargarReglas, SILLAS } = await impo('public/arcade/js/protohub/rules/index.js');

/**
 * ⚠️ HAY DOS SITIOS QUE DICEN CUÁNTAS SILLAS TIENE CADA JUEGO, Y ESO SE VIGILA.
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * `SILLAS` en `rules/index.js` es un mapa escrito a mano que usa el árbitro de las
 * mesas compartidas; `ASIENTOS` lo declara cada juego en sus reglas. Son el mismo
 * dato en dos sitios, que es exactamente la clase de copia que este proyecto lleva
 * meses quitando de en medio — y apareció sin querer al añadir el segundo.
 *
 * No se unifican porque no pueden: `SILLAS` se lee de forma síncrona y sin cargar
 * ningún juego, y `cargarReglas` es un `import` dinámico. Quien reparte mesas no
 * puede esperar a que carguen treinta y cinco módulos para saber si caben cuatro.
 *
 * Así que la duplicación se queda VIGILADA en vez de escondida. Y de paso resuelve
 * lo que a esta prueba le faltaba: sólo diez juegos publican un marcador contra el
 * que cruzar el número, y los otros veinticinco se creían sin comprobar. Ahora esos
 * veinticinco tienen su segunda opinión. Dos listas que se escribieron por separado
 * y coinciden valen mucho más que una sola en la que confiar.
 */

/**
 * ⚠️ TRINQUETE: cuántos juegos declaran sus asientos. Hoy son 35 —todos— y
 * **sólo puede subir** (con juegos nuevos). Nació en 0: hasta el 16-08 no lo
 * declaraba ninguno y la ficha lo deducía del marcador, que existía en diez
 * juegos y en los otros veinticinco no — así que la ficha del ajedrez, juego
 * de dos, llegó a anunciar UN asiento. Subió a 4 el mismo día con la familia
 * de bazas (brisca, tute, hearts, spades) y llegó a 35 revisando uno a uno
 * los 31 que faltaban.
 */
const SUELO_ASIENTOS = 40;   // 24-08: los 40 declaran asientos. Antes 35, y la
                             // prueba llevaba pasadas pidiendo que se apretara.

const declaran = [], mudos = [], cruzados = [], mentiras = [], sinCruzar = [];
const cruzadosSillas = [], discrepan = [];

for (const juego of JUEGOS) {
    let reglas;
    try { reglas = await cargarReglas(juego, {}); } catch { continue; }

    const n = reglas.ASIENTOS;
    if (!Number.isInteger(n) || n < 1) { mudos.push(juego); continue; }
    declaran.push(juego);

    const p = reglas.nuevaPartida({ semilla: 7, seed: 7 });
    const st = reglas.estado(p, 0) ?? {};
    const real = Array.isArray(st.marcador) ? st.marcador.length
               : Array.isArray(st.manos_rivales) ? st.manos_rivales.length + 1 : null;

    if (real !== null && real !== n) {
        mentiras.push(`${juego}: la ficha dice ${n} y el juego reparte ${real}`);
    } else if (real !== null) {
        cruzados.push(juego);
    }

    // Y la segunda opinión, que cubre a los que no publican marcador.
    const s = SILLAS?.[juego];
    if (Number.isInteger(s) && s !== n) {
        discrepan.push(`${juego}: sus reglas dicen ${n} y el mapa SILLAS dice ${s}`);
    } else if (Number.isInteger(s) && real === null) {
        cruzadosSillas.push(juego);
    }

    if (real === null && !Number.isInteger(s)) sinCruzar.push(juego);
}

console.log('\n¿Lo que promete la ficha es lo que hace el juego?\n');
console.log(`  ${declaran.length}/${JUEGOS.length} juegos declaran sus asientos (suelo: ${SUELO_ASIENTOS})`);
if (cruzados.length) {
    console.log(`  ✓ ${cruzados.length} comprobados contra el juego: ${cruzados.join(', ')}`);
}
if (cruzadosSillas.length) {
    console.log(`  ✓ ${cruzadosSillas.length} más, contra el mapa \`SILLAS\` del árbitro de mesas`);
}
if (sinCruzar.length) {
    console.log(`  · ${sinCruzar.length} lo declaran y NO se pueden cruzar contra nada:`
              + ` ${sinCruzar.join(', ')}`);
    console.log('    Su número se cree, no se comprueba. No cuenta como verificado.');
}

let fallos = 0;
if (discrepan.length) {
    fallos++;
    console.log(`\n  ✗ los dos sitios que dicen las sillas NO coinciden en ${discrepan.length}:`);
    for (const d of discrepan) console.log(`      ${d}`);
    console.log('    Uno de los dos está mal. Mira cómo REPARTE el juego antes de');
    console.log('    tocar ninguno: cuadrar el número para que la prueba pase es el');
    console.log('    error que esto viene a impedir.');
}
if (mentiras.length) {
    fallos++;
    console.log(`\n  ✗ la ficha NO dice la verdad en ${mentiras.length}:`);
    for (const m of mentiras) console.log(`      ${m}`);
}
if (declaran.length < SUELO_ASIENTOS) {
    fallos++;
    console.log(`\n  ✗ la deuda SUBIÓ: ${declaran.length} < ${SUELO_ASIENTOS}.`);
    console.log('    Un juego ha dejado de declarar sus asientos. Añade `ASIENTOS: n`');
    console.log('    en sus reglas, al lado de `OBJETIVO`.');
} else if (declaran.length > SUELO_ASIENTOS) {
    console.log(`\n  ↑ ya son ${declaran.length}: sube SUELO_ASIENTOS a ${declaran.length}.`);
}
if (mudos.length) {
    console.log(`\n  todavía sin declararlos (${mudos.length}): ${mudos.slice(0, 10).join(', ')}`
              + (mudos.length > 10 ? '…' : ''));
}

/**
 * ⚠️ ¿SE PUEDE PEDIR LO QUE LA FICHA PROMETE, O SÓLO EXISTE EN MI DISCO?
 *
 * La ficha decía «captura 35/35, derivado y listo» y no había NI UNA publicada: apuntaba
 * a `capturas_laboratorio/`, que está en `.gitignore` porque son ficheros de trabajo que
 * el laboratorio rehace en cada pasada. Treinta y cinco rutas que desde el sitio dan 404,
 * y el instrumento en verde — porque comprobaba que el fichero EXISTA, no que se pueda
 * PEDIR. Es un error de denominador, y el sabotaje no lo ve: la comprobación sabía
 * suspender perfectamente dentro del árbol equivocado.
 *
 * Esto mira lo que de verdad se sirve. Una ruta que empiece por `/` sale de `public/`, y
 * si no está ahí, no está en el sitio.
 */
{
    const { existsSync, readFileSync } = await import('node:fs');
    // Se lee el JSON PUBLICADO, no se recalcula: lo que hay que comprobar es lo que se
    // sirve. Recalcularlo aquí comprobaría mi cuenta contra mi cuenta.
    const fichas = JSON.parse(readFileSync(path.join(AQUI, 'public/data/fichas.json'), 'utf-8'));
    const rotas = [];
    for (const [juego, f] of Object.entries(fichas)) {
        for (const [campo, valor] of Object.entries(f ?? {})) {
            if (typeof valor !== 'string' || !valor.startsWith('/')) continue;
            if (!existsSync(path.join(AQUI, 'public', valor.slice(1)))) rotas.push(`${juego}.${campo} → ${valor}`);
        }
    }
    if (rotas.length) {
        fallos++;
        console.log(`\n  ✗ ${rotas.length} ruta(s) que la ficha promete y NO se publican:`);
        for (const r of rotas.slice(0, 8)) console.log(`      ${r}`);
        console.log('    Existir en tu disco no es estar en el sitio. Mira si la carpeta');
        console.log('    está en .gitignore antes de mirar la ficha.');
    }
}

/**
 * ⚠️ Y QUE SE PUEDA LLEGAR A ELLAS DESDE EL JUEGO. ESO NO LO MIRABA NADIE.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Todo lo de arriba comprueba que la ficha no MIENTA. Faltaba lo anterior a
 * mentir: que alguien la lea. Medido el 24-08: las cuarenta fichas en prosa
 * están completas —qué es, reparto, turno, cómo se gana, lo que pilla la primera
 * vez, en qué se aparta del juego de la calle— y **2 de 55 páginas de arcade
 * enlazaban a la ficha**.
 *
 * O sea: el trabajo hecho, bien hecho, y sin llegar a la pantalla. Quien entra a
 * jugar veía el objetivo en una línea y los botones de las jugadas legales, y no
 * tenía camino a las reglas. La mitad humana de este banco depende de que una
 * persona pueda aprender a jugar.
 *
 * El enlace lo pone `objetivo_visible.js`, pegado al recuadro de «A qué se
 * juega»: uno dice a QUÉ juegas y el otro CÓMO, y los busca la misma persona en
 * el mismo momento. Ese fichero lo cargan los cuarenta, también los catorce con
 * visualizador propio que no pasan por ninguna de las dos mesas.
 *
 * ⚠️ ESTA COMPROBACIÓN MIRABA `montarMesa.js`, QUE ES DONDE ESTUVO PRIMERO.
 * El enlace se movió —flotando en la esquina quedaba TAPADO por la fila de
 * botones, y eso se vio en la captura, no en el código— y el guardia se quedó
 * vigilando el sitio de antes. Lo cazó él mismo en la pasada siguiente, que es
 * exactamente para lo que sirve; pero un guardia apuntando a la puerta que ya no
 * existe habría dado verde para siempre si el enlace se hubiera ido del todo.
 */
{
    const { existsSync, readFileSync } = await import('node:fs');
    const objetivo = readFileSync(path.join(AQUI, 'public/arcade/js/objetivo_visible.js'), 'utf-8');
    const css = readFileSync(path.join(AQUI, 'public/arcade/css/jugables.css'), 'utf-8');
    const tieneEnlace = /hud-objetivo-reglas/.test(objetivo)
                     && /ficha\.html\?juego=/.test(objetivo);
    /**
     * Y que se pueda PULSAR. `.hud-objetivo` lleva `pointer-events: none` para no
     * robarle el ratón a la mesa; un enlace heredando eso se pinta perfecto y no
     * hace nada. Sin esta línea, la comprobación aprobaría una pantalla en la que
     * las reglas se ven y no se abren — el fallo de siempre, sin error y en verde.
     */
    const sePuedePulsar = /\.hud-objetivo-reglas\s*\{[^}]*pointer-events:\s*auto/.test(css);

    if (!tieneEnlace) {
        fallos++;
        console.log('\n  ✗ `objetivo_visible.js` ya no pone el enlace a la ficha.');
        console.log('    Las reglas de los 40 vuelven a estar escritas y sin camino:');
        console.log('    quien entre a jugar verá el objetivo y los botones, y nada más.');
    } else if (!existsSync(path.join(AQUI, 'public/arcade/ficha.html'))) {
        fallos++;
        console.log('\n  ✗ el enlace apunta a `/arcade/ficha.html` y ese fichero no se publica');
    } else if (!sePuedePulsar) {
        fallos++;
        console.log('\n  ✗ el enlace a las reglas está, y NO se puede pulsar.');
        console.log('    `.hud-objetivo` tiene `pointer-events: none` y el enlace lo hereda:');
        console.log('    se pinta perfecto y no abre nada. Le falta `pointer-events: auto`.');
    } else {
        console.log(`  ✓ los ${JUEGOS.length} juegos llevan a sus reglas, y se puede pulsar`
                  + `  (junto al objetivo → /arcade/ficha.html?juego=…)`);
    }
}

console.log(fallos ? '' : '\n  ✓ ninguna ficha promete algo que el juego no cumpla\n');
process.exit(fallos ? 1 : 0);
