/**
 * prueba_sustrato.mjs — que la matriz plana exista de verdad, y que el
 * adaptador vaya muriendo
 * ═══════════════════════════════════════════════════════════════════════════
 * El motor promete que el estado es una matriz plana y que todo lo demás —el 3D,
 * el texto del LLM, los números de una política, el recibo— son proyecciones de
 * ella. Esta prueba comprueba que eso es cierto y no una intención.
 *
 * Tres cosas:
 *   1. cada juego produce un sustrato con forma válida;
 *   2. el sustrato NO pierde información que el juego sí publica —si hay
 *      tablero, hay rejilla o piezas; si hay manos, hay zonas—;
 *   3. ⚠️ y cuántos juegos siguen dependiendo del ADAPTADOR.
 *
 * El tercero es el que importa a largo plazo. `sustrato.js` deriva la matriz de
 * las cinco codificaciones distintas que hay hoy, y eso está bien como puente —
 * pero si nadie lo vigila, dentro de veinte juegos tendrá veinte casos
 * especiales, que es la situación de la que veníamos con otro nombre.
 *
 * **El número sólo puede bajar.** Por eso está escrito aquí como techo: cada vez
 * que un juego publique su `sustrato()` nativo, se baja el techo.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { obtenerSustrato } from './public/arcade/js/protohub/sustrato.js';

const fetchReal = globalThis.fetch;
globalThis.fetch = async (e, i) => {
    const u = e instanceof URL ? e : new URL(String(e));
    if (u.protocol !== 'file:') return fetchReal(e, i);
    return new Response(await readFile(fileURLToPath(u), 'utf-8'), { status: 200 });
};

/**
 * ⚠️ TECHO DE DEUDA. Hoy los diecinueve pasan por el adaptador.
 * Cada juego que publique `sustrato(p)` nativo baja este número. **Nunca sube.**
 * Si esta prueba falla porque el número creció, es que se añadió un juego sin
 * sustrato propio — y eso es exactamente lo que no queremos que pase callando.
 */
/**
 * ⚠️ ESTABA EN 19 CON LA DEUDA YA EN 17, Y ESO ES UN TRINQUETE FLOJO.
 *
 * Dos de holgura no parecen nada y son justo el hueco por el que se cuela lo que
 * este número existe para impedir: `prueba_de_las_pruebas.mjs` le quitó el sustrato
 * a las damas a propósito, la deuda subió a 18, y esta comprobación **aprobó**.
 *
 * La prueba llevaba diciéndolo en cada pasada —«↓ la deuda bajó. Actualiza
 * TECHO_DERIVADOS a 17»— y nadie lo hacía, porque salía en verde y un aviso en verde
 * no lo lee nadie. Un trinquete que no se aprieta cuando avanza no aprieta.
 */
const TECHO_DERIVADOS = 17;

let fallos = 0;
const mal = (m) => { fallos++; console.log(`  ✗ ${m}`); };

console.log('\n¿El estado es de verdad una matriz plana?\n');

let derivados = 0;
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    const p = reglas.nuevaPartida({ semilla: 4, seed: 4 });
    // Unas jugadas: hay sustrato que sólo aparece con la partida andando.
    for (let i = 0; i < 5; i++) {
        const s = reglas.estado(p);
        if (s.is_game_over) break;
        const m = (s.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !reglas.mover(p, m)) break;
    }
    const st = reglas.estado(p);
    const sus = obtenerSustrato(juego, reglas, p, st);
    if (sus.derivado) derivados++;

    // 1. Forma válida.
    if (!sus || typeof sus !== 'object') { mal(`${juego}: no devuelve sustrato`); continue; }
    if (sus.rejilla) {
        const { ancho, alto, celdas } = sus.rejilla;
        if (!(ancho > 0 && alto > 0)) mal(`${juego}: rejilla con tamaño ${ancho}x${alto}`);
        else if (celdas.length !== ancho * alto) {
            mal(`${juego}: la rejilla dice ${ancho}x${alto} y trae ${celdas.length} celdas`);
        }
    }
    for (const z of sus.zonas) {
        if (!Array.isArray(z.items)) mal(`${juego}: zona '${z.id}' sin items`);
        if (!Number.isFinite(z.ocultas)) mal(`${juego}: zona '${z.id}' no dice cuántas oculta`);

        /**
         * ⚠️ UNA ZONA CON CASILLAS NO PUEDE PERDER NINGUNA.
         *
         * `items` sólo trae las cartas destapadas y `ocultas` es un número, así
         * que juntos dicen CUÁNTAS hay y no DÓNDE. Para la caja de entropy eso no
         * basta: `cambiar:5` nombra un hueco fijo y dos cartas iguales en la misma
         * columna se anulan. El sustrato hacía `filter(Boolean)` y borraba las
         * posiciones; la mesa dibujaba las vistas a un lado y las tapadas al otro,
         * o sea un orden inventado, y la regla que hace interesante al juego era
         * invisible en la mesa que lo dibuja.
         *
         * `casillas` conserva el array con `null` donde hay carta boca abajo. Si
         * su longitud deja de cuadrar con vistas + tapadas, alguien ha vuelto a
         * filtrar por el camino.
         */
        if (z.casillas) {
            const esperado = z.items.length + z.ocultas;
            if (z.casillas.length !== esperado) {
                mal(`${juego}: zona '${z.id}' declara ${z.casillas.length} casillas `
                  + `y trae ${esperado} cartas (${z.items.length} vistas + ${z.ocultas} tapadas)`);
            }
            if (z.columnas !== undefined && !(z.columnas > 0)) {
                mal(`${juego}: zona '${z.id}' dice columnas=${z.columnas}`);
            }
        }
    }
    for (const pz of sus.piezas) {
        if (!Number.isFinite(pz.x) || !Number.isFinite(pz.y)) mal(`${juego}: pieza sin posición`);
    }

    /**
     * 1.bis — LA NIEBLA NO SE FILTRA.
     *
     * Esta comprobación existe porque en este proyecto la información oculta se
     * ha escapado DOS VECES, y las dos en silencio: primero las reglas
     * publicaban la mano del rival, después la mesa repartía sus jugadas legales
     * a quien mirase. Ninguna de las dos dio un error; las dos se vieron mirando.
     *
     * Con la observabilidad parcial el riesgo es el mismo con otra ropa: el mapa
     * entero está a un `p.muros` de distancia del sustrato, y basta un descuido
     * para publicarlo. Un juego de exploración con el mapa filtrado sigue
     * funcionando, sigue puntuando y no explora nadie — la partida se resuelve
     * sin salir de la primera sala y la tabla no dice por qué.
     *
     * Así que se comprueba, y no se confía: donde hay niebla, ni terreno ni
     * piezas. Y que la niebla ENCOJA al andar, porque una niebla decorativa que
     * nunca se levanta también pasaría las dos primeras.
     */
    if (sus.rejilla?.niebla) {
        const { ancho, alto, celdas, niebla } = sus.rejilla;
        if (niebla.length !== ancho * alto) mal(`${juego}: la niebla no cubre la rejilla`);
        const terreno = niebla.findIndex((n, i) => n && celdas[i] !== 0);
        if (terreno >= 0) mal(`${juego}: filtra terreno bajo la niebla (celda ${terreno})`);
        const espia = sus.piezas.find(pz => niebla[pz.y * ancho + pz.x]);
        if (espia) mal(`${juego}: enseña una pieza '${espia.t}' en casilla sin explorar`);

        if (!niebla.filter(Boolean).length) mal(`${juego}: declara niebla y no tapa nada`);

        /**
         * ⚠️ Y SE COMPRUEBA CON UN JUGADOR QUE ANDA, NO CON EL PRIMER MOVIMIENTO
         * QUE PILLE.
         *
         * La primera versión miraba la niebla tras cinco jugadas tomando siempre
         * la primera legal, y **suspendió a `sigilo` estando bien**: cinco pasos
         * eligiendo siempre «arriba» dejan al ladrón dando vueltas dentro de la
         * sala que ya tiene iluminada, así que la niebla no se movía y la prueba
         * cantaba niebla decorativa donde había un mapa entero por descubrir.
         *
         * Es un error de la MEDIDA, no del juego —el mismo que ya me hizo marcar
         * a sokoban como «mundo autónomo»—: preguntar mal y creerse la respuesta.
         * La invariante sigue siendo la misma y sigue siendo dura (la niebla debe
         * retroceder jugando); lo que cambia es que ahora se mide con el rival de
         * la casa, que existe precisamente para recorrer el mapa.
         */
        const q = reglas.nuevaPartida({ semilla: 4, seed: 4 });
        const nieblaDe = (e) => obtenerSustrato(juego, reglas, e, reglas.estado(e))
            .rejilla.niebla.filter(Boolean).length;
        const antes = nieblaDe(q);
        for (let i = 0; i < 30; i++) {
            const s = reglas.estado(q);
            if (s.is_game_over) break;
            const m = reglas.sugerencia?.(q)
                ?? (s.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
            if (!m || !reglas.mover(q, m)) break;
        }
        const despues = nieblaDe(q);
        if (despues >= antes) {
            mal(`${juego}: la niebla no se levanta al andar (${antes} → ${despues})`);
        }
    }

    // 2. No se pierde lo que el juego sí publica.
    const hayTablero = st.fen || Array.isArray(st.board) || Array.isArray(st.tablero);
    if (hayTablero && !sus.rejilla && !sus.piezas.length) {
        mal(`${juego}: publica tablero y el sustrato sale vacío`);
    }
    const hayCartas = Array.isArray(st.mano) || Array.isArray(st.player_hand) || Array.isArray(st.caja);
    if (hayCartas && !sus.zonas.length) mal(`${juego}: publica cartas y el sustrato no trae zonas`);

    const resumen = [
        sus.rejilla ? `rejilla ${sus.rejilla.ancho}x${sus.rejilla.alto}` : null,
        sus.piezas.length ? `${sus.piezas.length} piezas` : null,
        sus.zonas.length ? `${sus.zonas.length} zonas` : null,
    ].filter(Boolean).join(' · ') || '(sin sustrato espacial)';
    console.log(`  ${sus.derivado ? '·' : '✓'} ${juego.padEnd(10)} ${resumen}`);
}

/**
 * ⚠️ 2.bis — QUE EL README NO MIENTA SOBRE CUÁNTOS JUEGOS HAY.
 *
 * Decía «19 juegos» con veintiséis en la lista, en dos sitios distintos, y es lo
 * primero que lee quien llega al proyecto. No es un descuido aislado: es la
 * cuarta vez que un número escrito a mano se separa de la realidad sin avisar
 * —el escaparate, el catálogo del gym, el «los veinte juegos» de la página de
 * jugar— y las cuatro veces el fallo fue mudo, porque un número viejo no da
 * error, sólo dice algo que ya no es cierto.
 *
 * Arreglarlo a mano garantiza volver a tenerlo mal dentro de dos géneros. Esto
 * es lo que lo impide: si no cuadra, `npm test` se pone rojo antes de publicar.
 */
const readme = await readFile(new URL('./README.md', import.meta.url), 'utf-8');
const cifras = [...readme.matchAll(/(\d+)\s+juegos/g)].map(m => Number(m[1]));
const desfasadas = cifras.filter(n => n !== JUEGOS.length && n > 5);
if (desfasadas.length) {
    mal(`README dice "${desfasadas.join(', ')} juegos" y hay ${JUEGOS.length}. `
      + `Un número a mano en la primera página que alguien lee.`);
} else {
    console.log(`  ✓ README    dice ${JUEGOS.length} juegos, y hay ${JUEGOS.length}`);
}

/**
 * ⚠️ 2.bis.bis — Y QUE LOS DOCUMENTOS NO MIENTAN SOBRE CUÁNTAS BARAJAS HAY.
 *
 * Cinco sitios decían «6 barajas» el día que se añadió la séptima, y ninguno dio
 * error: un número viejo nunca da error, sólo deja de ser cierto. Es la quinta
 * vez que pasa esto mismo con otro número (los juegos del README, el escaparate,
 * el catálogo del gym, «los veinte juegos» de la página de jugar).
 *
 * El patrón es siempre el mismo, así que la respuesta también: se cuenta lo que
 * hay y se compara con lo que se dice.
 */
const lib = JSON.parse(await readFile(new URL('./public/arcade/data/card_library.json', import.meta.url), 'utf-8'));
const NBARAJAS = Object.keys(lib.decks ?? {}).length;
for (const doc of ['README.md', 'docs/que_juegos_caben.md', 'docs/INVENTARIO.md',
                   'docs/CUADERNO_ESTUDIO_MOTOR.md', 'docs/HALL_SALA_DEL_HUEVO.md']) {
    let texto;
    try { texto = await readFile(new URL('./' + doc, import.meta.url), 'utf-8'); } catch { continue; }
    const dichas = [...texto.matchAll(/(\d+)\s+barajas/g)].map(m => Number(m[1]));
    const malas = dichas.filter(n => n !== NBARAJAS);
    if (malas.length) mal(`${doc} dice "${malas.join(', ')} barajas" y hay ${NBARAJAS}`);
}
if (!fallos) console.log(`  ✓ barajas   los documentos dicen ${NBARAJAS}, y hay ${NBARAJAS}`);

/**
 * ⚠️ 2.ter — QUE `montarMesa` SIGA ELIGIENDO EL MOTOR DE CARTAS PARA LOS QUE
 * REPARTEN CARTAS.
 *
 * `mesa_cartas.mjs` es UNA mesa de casino para los diez juegos de cartas, y
 * sustituye a la costumbre de escribir un visualizador por juego —la costumbre
 * que dejó al go meses sin dibujar sus piedras—. Pero no se elige por una lista:
 * `montarMesa` mira el sustrato de una partida recién repartida y decide que es
 * de cartas si publica **zonas y ninguna rejilla**.
 *
 * Eso es lo bueno (el dato ya existe, no hay que declarar nada) y también lo
 * frágil: el día que un juego de cartas publique además una rejilla —para un
 * tapete, para unas casillas de apuesta— `montarMesa` cogerá el motor de TABLERO
 * y la mesa saldrá mal SIN UN SOLO ERROR. Es la forma exacta de fallo que este
 * proyecto lleva media docena de veces persiguiendo.
 *
 * Así que el número es un SUELO: diez juegos se dibujan hoy con la mesa
 * compartida y no pueden ser menos. Si baja, alguien ha desconectado uno.
 */
const SUELO_MESA_CARTAS = 11;
const conMesa = [];
const ambiguos = [];
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    // Igual que `montarMesa`: una partida de muestra, sin jugar.
    const q = reglas.nuevaPartida({ semilla: 1, seed: 1 });
    const sus = reglas.sustrato ? reglas.sustrato(q, 0)
                                : obtenerSustrato(juego, reglas, q, reglas.estado(q));
    if (!sus?.zonas?.length) continue;

    /**
     * ⚠️ ZONAS MÁS REJILLA NO ES UN FALLO: ES UN JUEGO CON TABLERO Y COSAS ENCIMA.
     *
     * Esto marcaba en rojo a cualquiera que publicara las dos, con el argumento de
     * que `montarMesa` le daría el motor de tablero y su mesa de casino saldría mal
     * en silencio. El argumento sólo vale si el juego ES de cartas: para un parchís
     * —rejilla, fichas y un dado sobre la mesa— el motor de tablero es el CORRECTO,
     * y la guarda lo suspendía estando perfectamente montado.
     *
     * Sobreaproximaba «tiene zonas» como «es de cartas». Lo distinguió Fable al
     * revisar la arquitectura, y el arreglo es suyo: mirar si los items de la zona
     * son CARTAS DE LA BIBLIOTECA. Eso no hay que declararlo en ninguna lista nueva
     * —los juegos de cartas ya publican `biblioteca`, que es el dato que
     * `prueba_biblioteca.mjs` usa para saber que leen el catálogo— así que un
     * `d6_5` pasa y una brisca que ganara una rejilla sigue cayendo.
     *
     * Y el riesgo original tampoco queda descubierto: si brisca perdiera su mesa de
     * casino, `SUELO_MESA_CARTAS` baja y la prueba falla igual, aquí abajo.
     */
    if (sus.rejilla) ambiguos.push(juego); else conMesa.push(juego);
}
/**
 * ⚠️ Y NO SE SUSPENDE A NADIE POR SER HÍBRIDO. HICIERON FALTA DOS INTENTOS.
 *
 * Esto era un FALLO —«zonas y rejilla a la vez»— hasta que llegó el parchís, que
 * tiene tablero, fichas y un dado sobre la mesa. Se afinó entonces a «items que
 * son cartas de la biblioteca», y aguantó hasta el parchís canadiense, que reparte
 * cartas de verdad SOBRE un tablero. Dos afinados y dos falsos positivos: la señal
 * no existe. No hay forma de distinguir «juego de cartas que perdió su mesa» de
 * «juego de tablero con cartas encima» mirando el sustrato, porque son lo mismo.
 *
 * Y no hace falta: el riesgo que esto protegía —que una brisca ganara una rejilla
 * y perdiera en silencio la mesa de casino— lo caza `SUELO_MESA_CARTAS` por el
 * otro lado, que es un suelo y sólo puede subir. Si brisca se cayera de la mesa
 * compartida, `conMesa` baja y la prueba falla igual, tres líneas más abajo.
 *
 * Los híbridos se cuentan aparte y se dicen. No son un error: son la respuesta a
 * la pregunta de si el contrato admite combinaciones, y la respuesta fue que sí.
 */
if (ambiguos.length) {
    console.log(`  · híbridos  ${ambiguos.join(', ')} — tablero Y montones a la vez. `
              + 'Van al motor de tablero, que los dibuja los dos.');
}
if (conMesa.length < SUELO_MESA_CARTAS) {
    mal(`la mesa compartida sirve a ${conMesa.length} juegos y servía a ${SUELO_MESA_CARTAS}. `
      + `Faltan: se han desconectado de \`mesa_cartas.mjs\`.`);
} else {
    console.log(`  ✓ mesa      ${conMesa.length} juegos de cartas PODRÍAN usar la mesa compartida `
              + `(suelo: ${SUELO_MESA_CARTAS})`);
}

/**
 * ⚠️ 2.ter — Y CUÁNTOS LA USAN DE VERDAD. SUELO, Y SÓLO PUEDE SUBIR.
 *
 * El número de arriba lleva meses diciendo diez y estaba en verde mientras OCHO
 * de esos diez no tenían página: mide lo que el sustrato PERMITE, no lo que
 * alguien puede abrir en el navegador. Un juego capaz de dibujarse en la mesa y
 * sin página que la monte está tan invisible como el go sin sus piedras — y la
 * prueba no se enteraba, que es lo que la hacía peligrosa y no sólo incompleta.
 *
 * Así que se cuenta la otra mitad: páginas que montan `mesa_cartas.mjs`. Los dos
 * números juntos dicen algo que ninguno dice solo — capacidad menos uso es
 * exactamente el trabajo que queda.
 *
 * Hoy son ocho. Blackjack y poker conservan visualizador propio a propósito:
 * funcionan y nadie los ha comparado con la mesa compartida todavía. Ese es el
 * hueco, y está aquí escrito en vez de en la cabeza de alguien.
 */
const SUELO_PAGINAS_MESA = 9;
const montanMesa = [];
for (const juego of conMesa) {
    let html;
    try { html = await readFile(new URL(`./public/arcade/${juego}.html`, import.meta.url), 'utf-8'); }
    catch { continue; }  // sin página propia: va por mesa.html, que ya la monta
    if (/visualizador:\s*'mesa_cartas\.mjs'/.test(html)) montanMesa.push(juego);
}
const sinMontar = conMesa.filter((j) => !montanMesa.includes(j));
if (montanMesa.length < SUELO_PAGINAS_MESA) {
    mal(`${montanMesa.length} páginas montan la mesa compartida y eran ${SUELO_PAGINAS_MESA}. `
      + `Alguien ha devuelto un juego a su visualizador propio: ${sinMontar.join(', ')}.`);
} else {
    console.log(`  ✓ páginas   ${montanMesa.length} la montan de verdad (suelo: ${SUELO_PAGINAS_MESA})`
              + (sinMontar.length ? ` · con visualizador propio: ${sinMontar.join(', ')}` : ''));
    if (montanMesa.length > SUELO_PAGINAS_MESA) {
        console.log(`  ↑ subió. Actualiza SUELO_PAGINAS_MESA a ${montanMesa.length}.`);
    }
}

/**
 * ⚠️ 2.quater — DOS NOMBRES PARA EL MISMO DATO. TECHO, Y SÓLO PUEDE BAJAR.
 *
 * Un juego que publica `legal_moves` y `legal_actions` con el mismo valor no
 * tiene dos campos: tiene uno y una trampa. El día que alguien quite el que
 * sobra, quien leyera el otro se queda sin nada — y no dará error, porque
 * `undefined.length` en un `??` es silencio. Pasó a punto de pasar: la mesa de
 * cartas leía el alias y no el canónico.
 *
 * ⚠️ SE MIDE POR VALOR, NO POR UNA LISTA DE SOSPECHOSOS.
 *
 * Una lista a mano es lo que ya falló seis veces en este proyecto — la última,
 * dentro de `desajustes.mjs`, que juraba que `legal_actions` no lo leía nadie
 * porque su lista de consumidores no incluía el motor de cartas.
 *
 * Comparar por valor tiene además una virtud: descarta solo los falsos
 * positivos. `result` y `desenlace` NO coexisten en ningún juego —uno es
 * notación de ajedrez (`1-0`), el otro una frase («Has salido de la cripta»)—
 * así que jamás pueden dar el mismo valor y nunca aparecen aquí. Y `score` de
 * go, reversi y mancala es un objeto `{black, white}` mientras `puntos` es tu
 * escalar: distintos, y con razón — esa distinción nació del peor fallo del
 * proyecto, un go que daba el marcador del rival como propio.
 *
 * La idea es de Fable 5, revisando esto como consultor externo.
 */
/**
 * Hoy vale 1, y ese uno es `puntos / score` en cuatro juegos.
 *
 * No se arregla aquí a propósito: bajarlo a cero obliga a elegir cuál de los dos
 * es el canónico, y ésa es una decisión de CONTRATO, no de limpieza. `score` es
 * el nombre que entiende cualquier agente de gym; `puntos` lo publican veintisiete
 * juegos y sale en el openapi de las mesas. Cambiar cualquiera de los dos toca a
 * gente de fuera que no podemos auditar —`package.json` exporta `./reglas/*`—, así
 * que se decide y se hace de una vez, no de pasada.
 *
 * Lo que este número garantiza mientras tanto es que no aparezca un segundo.
 */
const TECHO_SINONIMOS = 1;

/**
 * ⚠️ COINCIDIR UNA VEZ NO ES SER EL MISMO DATO.
 *
 * La primera versión contaba cualquier par que coincidiera en algún momento y
 * daba SEIS, de los que la mitad eran ruido: `biblioteca` y `cartas_intactas`
 * son dos booleanos que valen `true` los dos, y `explorado` y `puntos` cruzan el
 * mismo número al pasar. Un detector con falsos positivos se ignora, y entonces
 * deja de detectar.
 *
 * Se exige que coincidan en TODAS las jugadas medidas y que no diverjan NUNCA:
 * dos nombres del mismo dato se mueven juntos siempre, y dos datos distintos que
 * se cruzan un turno acaban separándose. Y los booleanos quedan fuera: que dos
 * preguntas tengan la misma respuesta no las hace la misma pregunta.
 */
/**
 * ⚠️ Y SE LLEVA LA CUENTA POR JUEGO, NO EN GLOBAL.
 *
 * Con una sola lista de «pares que han divergido», que `score` y `puntos` sean
 * cosas distintas en go —allí `score` es `{black, white}` y `puntos` tu escalar—
 * bastaría para absolver ese par en los OTROS seis juegos donde sí son el mismo
 * número con dos nombres. Un falso negativo cómodo: da cero y no molesta.
 *
 * Dos campos pueden ser sinónimos en un juego y datos distintos en otro, y lo
 * que hay que arreglar es sólo lo primero.
 */
const juntos = new Map();       // par -> juegos donde coinciden SIEMPRE
const separados = new Set();    // "juego|par" que ha divergido alguna vez

for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    const p = reglas.nuevaPartida({ semilla: 6, seed: 6 });
    for (let paso = 0; paso < 8; paso++) {
        const st = reglas.estado(p);
        const claves = Object.keys(st).filter(k => {
            const v = st[k];
            if (v === undefined || v === null || typeof v === 'boolean') return false;
            if (v === 0 || v === '') return false;
            if (Array.isArray(v)) return v.length > 0;
            if (typeof v === 'object') return Object.keys(v).length > 0;
            return true;
        });
        for (let i = 0; i < claves.length; i++) {
            for (let j = i + 1; j < claves.length; j++) {
                const par = [claves[i], claves[j]].sort().join(' / ');
                if (JSON.stringify(st[claves[i]]) === JSON.stringify(st[claves[j]])) {
                    if (!juntos.has(par)) juntos.set(par, new Set());
                    juntos.get(par).add(juego);
                } else {
                    separados.add(`${juego}|${par}`);   // en ESTE juego, no lo son
                }
            }
        }
        if (st.is_game_over) break;
        const m = reglas.sugerencia?.(p)
            ?? (st.legal_moves ?? []).filter(x => x !== 'nueva' && x !== 'reset')[0];
        if (!m || !reglas.mover(p, m)) break;
    }
}
// En varios juegos, y en cada uno sin haberse separado jamás: ya no es casualidad.
const repetidos = [...juntos]
    .map(([par, js]) => [par, new Set([...js].filter(j => !separados.has(`${j}|${par}`)))])
    .filter(([, js]) => js.size >= 2);
console.log(`\n${repetidos.length} pares de campos son el mismo dato con dos nombres `
          + `(techo: ${TECHO_SINONIMOS})`);
for (const [par, js] of repetidos) console.log(`    ${par}  — en ${js.size} juegos`);
if (repetidos.length > TECHO_SINONIMOS) {
    mal(`SUBIÓ: ${repetidos.length} > ${TECHO_SINONIMOS}. Un juego nuevo publica `
      + 'dos nombres para el mismo dato. Quita el que sobre, no subas el techo.');
} else if (repetidos.length < TECHO_SINONIMOS) {
    console.log(`  ↓ bajó. Actualiza TECHO_SINONIMOS a ${repetidos.length}.`);
}

// 3. La deuda.
console.log(`\n${derivados}/${JUEGOS.length} juegos dependen del adaptador (techo: ${TECHO_DERIVADOS})`);
if (derivados > TECHO_DERIVADOS) {
    mal(`la deuda SUBIÓ: ${derivados} > ${TECHO_DERIVADOS}. `
      + 'Un juego nuevo sin `sustrato()` propio. Bájalo publicándolo, no subiendo el techo.');
} else if (derivados < TECHO_DERIVADOS) {
    console.log(`  ↓ la deuda bajó. Actualiza TECHO_DERIVADOS a ${derivados} para que no vuelva a subir.`);
}

console.log(fallos === 0
    ? `\n✓ los ${JUEGOS.length} tienen sustrato válido\n`
    : `\n✗ ${fallos} fallo(s) de sustrato\n`);
process.exit(fallos === 0 ? 0 : 1);
