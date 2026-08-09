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
const TECHO_DERIVADOS = 19;

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
const SUELO_MESA_CARTAS = 10;
const conMesa = [];
const ambiguos = [];
for (const juego of JUEGOS) {
    const reglas = await cargarReglas(juego, {});
    // Igual que `montarMesa`: una partida de muestra, sin jugar.
    const q = reglas.nuevaPartida({ semilla: 1, seed: 1 });
    const sus = reglas.sustrato ? reglas.sustrato(q, 0)
                                : obtenerSustrato(juego, reglas, q, reglas.estado(q));
    if (!sus?.zonas?.length) continue;
    if (sus.rejilla) ambiguos.push(juego); else conMesa.push(juego);
}
if (ambiguos.length) {
    mal(`${ambiguos.join(', ')}: reparte cartas Y publica rejilla, así que `
      + '`montarMesa` elegiría el motor de tablero y la mesa saldría mal en silencio.');
}
if (conMesa.length < SUELO_MESA_CARTAS) {
    mal(`la mesa compartida sirve a ${conMesa.length} juegos y servía a ${SUELO_MESA_CARTAS}. `
      + `Faltan: se han desconectado de \`mesa_cartas.mjs\`.`);
} else {
    console.log(`  ✓ mesa      ${conMesa.length} juegos de cartas usan la mesa compartida `
              + `(suelo: ${SUELO_MESA_CARTAS})`);
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
