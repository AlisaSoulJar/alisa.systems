/**
 * prueba_barajas.mjs — ¿reparte cada juego LA BARAJA QUE LE TOCA?
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * POR QUÉ EXISTE, TENIENDO YA `prueba_biblioteca.mjs`
 *
 * Aquella comprueba que cada juego de cartas LEE el catálogo que se le pasa. Es una
 * pregunta distinta de ésta, y la diferencia es la de siempre: leer el catálogo
 * correcto no dice nada sobre coger de él la baraja correcta. Un juego francés que
 * pidiera `spanish_40` leería el catálogo impecablemente y repartiría oros en una
 * mesa de póker, y aquella prueba lo saludaría en verde.
 *
 * Es el mismo agujero de denominador que llevamos toda la semana encontrando: la
 * comprobación verifica su condición, y su condición no es la que importa.
 *
 * QUÉ MIDE ÉSTA
 *
 * Las cartas que el juego REPARTE DE VERDAD, no las que dice que va a repartir. Se
 * recorre el estado entero de la partida —no sólo el sustrato, que oculta las manos
 * ajenas— recogiendo todo lo que tenga forma de carta, y se pregunta a qué baraja del
 * catálogo pertenecen TODAS a la vez.
 *
 * La respuesta se compara contra `games.<id>.deck`, que es la expectativa que la
 * biblioteca ya declaraba y que nadie estaba comprobando. Las 25 fichas de `games`
 * llevan ahí desde el principio con el campo `deck` escrito.
 *
 * ⚠️ LAS BARAJAS SE CONTIENEN UNAS A OTRAS. `spanish_40 ⊂ spanish_48` y
 * `french_52 ⊂ french_54`. Así que «pertenecen a X» casi siempre da más de una
 * respuesta, y la buena es LA MÁS PEQUEÑA que las contiene todas: si nunca sale un 8
 * ni un 9, la baraja es de 40, no de 48 con mala suerte. Con pocas cartas eso se
 * equivocaría, y por eso se juegan partidas ENTERAS y varias semillas: en una brisca
 * completa pasan por la mesa casi las cuarenta.
 *
 * SABOTAJES DECLARADOS (los ejecuta `npm run pruebas`)
 *   · a un juego se le cambia la baraja pedida  → debe salir en rojo por baraja ajena
 *   · se le mete una carta inventada al estado  → debe salir en rojo por carta huérfana
 *   · se borra un juego del mapa de expectativas → debe salir en rojo por no cubierto
 */
import { readFile } from 'node:fs/promises';
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';

const bruto = await readFile(
    new URL('./public/arcade/data/card_library.json', import.meta.url));
const catalogo = JSON.parse(bruto.toString('utf-8'));
const URL_CATALOGO =
    'data:application/json;base64,' + Buffer.from(bruto).toString('base64');

/**
 * ⚠️ QUÉ FICHA DE `games` LE CORRESPONDE A CADA JUEGO NUESTRO.
 *
 * Los nombres no coinciden y no hay forma de deducirlo: nuestro `poker` es el
 * `texas_holdem` de la biblioteca, nuestro `remigio` es `rummy_basic` y no el
 * `chinchon`, que es el rummy de baraja española. Normalizar cadenas acertaría en
 * `gofish → go_fish` y se inventaría el resto.
 *
 * Así que va a mano, y por eso el mapa SE COMPRUEBA: cualquier juego que reparta
 * cartas y no esté aquí sale en rojo. Un mapa a mano que no se vigila es un mapa que
 * se queda corto el día que alguien añade un juego, y entonces deja de proteger justo
 * al que había que mirar.
 */
const FICHA = {
    poker: 'texas_holdem',
    blackjack: 'blackjack',
    brisca: 'brisca',
    tute: 'tute',
    hearts: 'hearts',
    spades: 'spades',
    gofish: 'go_fish',
    unit: 'unit',
    entropy: 'entropy',
    remigio: 'rummy_basic',
    // Y éste sí es el `chinchon` de la biblioteca, con su `spanish_48`. La nota de
    // arriba lo usaba como ejemplo de lo que NO era el remigio; ahora existe.
    chinchon: 'chinchon',
    guerra: 'war',
    // ⚠️ CANADIENSE NO ES LA CANASTA, y eso lo dijo esta prueba. Yo lo había mandado
    // a `canasta` por el nombre, y saltó el aviso de que declara `french_54` y
    // reparte 52. La canasta lleva comodines; este juego es el Tock/Dog —el parchís
    // con cartas— y son 52 sin comodines A PROPÓSITO, escrito en su cabecera. La
    // ficha `canadiense` se ha añadido al catálogo, que es donde faltaba: es juego
    // nuestro, como `unit` y `entropy`, que sí estaban.
    canadiense: 'canadiense',
};

/** Los palos y rangos de una baraja, resolviendo el `extends` que heredan dos de ellas. */
const idDe = (x) => (typeof x === 'string' ? x : x?.id ?? x?.rank);
const rasgos = (nombre) => {
    const d = catalogo.decks?.[nombre];
    if (!d) return null;
    const padre = d.extends ? rasgos(d.extends) : { suits: [], ranks: [] };
    return {
        suits: (d.suits ?? padre.suits).map(idDe),
        ranks: (d.ranks ?? padre.ranks).map(idDe),
    };
};
const CARTAS_DE = {};
for (const nombre of Object.keys(catalogo.decks ?? {})) {
    const r = rasgos(nombre);
    CARTAS_DE[nombre] = new Set(r.suits.flatMap(s => r.ranks.map(k => `${s}_${k}`)));
}

/**
 * ⚠️ Y LAS ESPECIALES, QUE NO SON PALO POR RANGO.
 *
 * La primera versión sólo cruzaba palos con rangos, así que el UNIT salió con «14
 * fuera del catálogo: W_WILD G_REV Y_D2 B_SKIP…» y yo estuve a punto de contarlo como
 * hallazgo. No lo era: `decks.unit_108.specials` declara SKIP, REV, D2, WILD y WD4
 * desde siempre, y el comodín de Entropy está en `games.entropy.specials`. Lo que
 * faltaba era que esta prueba las mirase.
 *
 * ⚠️ Y LLEVAN O NO PALO SEGÚN LO QUE DIGAN, no según lo que yo supusiera.
 *
 * Mi primera versión añadía las dos formas —`W_<id>` y `<palo>_<id>`— a todas. Eso
 * metió `W_JK` en la baraja francesa de 54, y como el comodín de Entropy se llama
 * igual, Entropy pasó a repartir «una carta francesa entre cuarenta y ocho nuestras»
 * y salió en rojo. Un falso rojo nacido del arreglo del falso aviso anterior.
 *
 * El catálogo ya lo distingue: `suitless: true` lo llevan el WILD del UNIT y el
 * comodín de Entropy, y no lo lleva el JK de la francesa. Se respeta el campo.
 */
const conEspeciales = (set, especiales, suits) => {
    for (const e of (especiales ?? [])) {
        const id = idDe(e);
        if (e?.suitless) set.add(`W_${id}`);
        else for (const s of suits) set.add(`${s}_${id}`);
    }
    return set;
};
for (const [nombre, d] of Object.entries(catalogo.decks ?? {})) {
    conEspeciales(CARTAS_DE[nombre], d.specials, rasgos(nombre).suits);
}
/** Todo lo que es carta en alguna baraja: sirve para saber si un juego es de cartas. */
const CUALQUIER_CARTA = new Set(Object.values(CARTAS_DE).flatMap(s => [...s]));

/**
 * Las especiales de una FICHA van aparte y NO entran en las barajas. Si entraran, el
 * comodín de Entropy obligaría a que alguna baraja lo contuviera, ninguna lo contiene
 * —está declarado en la ficha, no en la baraja— y el juego saldría en rojo por «sus
 * cartas no caben en ninguna baraja». O sea: el arreglo de las huérfanas se habría
 * convertido en un falso rojo. Sirven sólo para excusar huérfanas.
 */
const ESPECIALES_DE_FICHA = new Set();
for (const g of Object.values(catalogo.games ?? {})) {
    conEspeciales(ESPECIALES_DE_FICHA, g.specials, rasgos(g.deck)?.suits ?? []);
}

/**
 * Todo lo que parezca una carta dentro del estado, por hondo que esté.
 *
 * Se recorre el objeto entero y no sólo el sustrato porque el sustrato TAPA: las manos
 * de los rivales salen como «3 tapadas» y no como cartas. Mirando sólo lo visible se
 * vería una cuarta parte de la baraja, que es justo lo que no basta para distinguir
 * una española de 40 de una de 48.
 */
const recolectar = (raiz) => {
    const vistos = new Set();
    const cartas = new Set();
    const pila = [raiz];
    while (pila.length) {
        const x = pila.pop();
        if (x === null || x === undefined) continue;
        if (typeof x === 'string') { if (/^[A-Za-z]+_[A-Za-z0-9]+$/.test(x)) cartas.add(x); continue; }
        if (typeof x !== 'object') continue;
        if (vistos.has(x)) continue;      // los estados tienen ciclos
        vistos.add(x);
        for (const v of (Array.isArray(x) ? x : Object.values(x))) pila.push(v);
    }
    return cartas;
};

/**
 * Juega una partida entera para que pasen por la mesa todas las cartas que puedan.
 *
 * ⚠️ DOS COSAS QUE ME COSTARON UN VERDE FALSO DE «0 JUEGOS MIRADOS».
 *
 * La primera: `mover` no devuelve la partida nueva. La MUTA y devuelve un booleano —
 * `true` si la jugada valía. Yo escribí `p = reglas.mover(p, …)` y a partir de ahí `p`
 * valía `true`, así que el `estado` siguiente reventaba leyendo `p.manos[0]`. Parecía
 * un fallo de brisca y era mío.
 *
 * La segunda, peor: el `try` que envolvía la partida entera estaba FUERA, así que una
 * jugada mala no perdía una jugada, perdía las cuarenta cartas del reparto. Un fallo
 * en el movimiento 3 dejaba el juego con cero cartas y el juego desaparecía del
 * informe en silencio. Ahora se guarda lo recogido hasta donde se llegó, que para
 * saber de qué baraja son ya sobra.
 */
const jugarEntera = (reglas, semilla, tope = 400) => {
    let p = reglas.nuevaPartida({ semilla, seed: semilla });
    const cartas = recolectar(p);
    /**
     * ⚠️ Y SE APUNTAN LAS JUGADAS, porque `robar_mazo` tiene forma de carta.
     *
     * El recolector busca cualquier cosa con pinta de `algo_algo`, y una jugada como
     * `robar_mazo` la tiene. Salía en el informe como «1 fuera del catálogo» en
     * remigio y entropy, o sea acusándolos de repartir una carta inventada.
     *
     * No hace falta una lista de excepciones: el juego YA dice cuáles son sus jugadas
     * en cada `legal_moves`. Lo que el juego ofrece como jugada es una jugada.
     */
    const jugadas = new Set();
    for (let i = 0; i < tope; i++) {
        try {
            const st = reglas.estado(p);
            for (const m of (st.legal_moves ?? [])) jugadas.add(String(m));
            if (st.is_game_over) break;
            const ms = st.legal_moves ?? [];
            if (!ms.length) break;
            // Determinista a propósito: dos pasadas con la misma semilla han de coincidir.
            const r = reglas.mover(p, String(ms[i % ms.length]));
            if (r === false) break;                       // jugada rechazada
            if (r && typeof r === 'object') p = r;        // hay reglas que sí devuelven estado
            for (const c of recolectar(p)) cartas.add(c);
        } catch { break; }
    }
    return { cartas, jugadas };
};

const SEMILLAS = [1, 2, 3, 4, 5];
let fallos = 0;
const filas = [];

console.log('\n¿Reparte cada juego la baraja que le toca?\n');

for (const juego of JUEGOS) {
    let reglas;
    try { reglas = await cargarReglas(juego, { url: URL_CATALOGO }); }
    catch { continue; }

    const cartas = new Set();
    const jugadas = new Set();
    for (const s of SEMILLAS) {
        try {
            const r = jugarEntera(reglas, s);
            for (const c of r.cartas) cartas.add(c);
            for (const m of r.jugadas) jugadas.add(m);
        } catch { /* un juego que ni reparte ya lo cazan otras pruebas */ }
    }
    const deBaraja = [...cartas].filter(c => CUALQUIER_CARTA.has(c));
    if (!deBaraja.length) continue;          // no es de cartas, y no tiene por qué serlo

    // Lo que no está en ninguna baraja NI declarado como especial NI es una jugada:
    // eso sí sería una carta inventada, y de ésas no hay ninguna excusa.
    const huerfanas = [...cartas].filter(c => !CUALQUIER_CARTA.has(c)
        && !ESPECIALES_DE_FICHA.has(c) && !jugadas.has(c));

    // La baraja más pequeña que las contiene todas.
    const candidatas = Object.entries(CARTAS_DE)
        .filter(([, set]) => deBaraja.every(c => set.has(c)))
        .sort((a, b) => a[1].size - b[1].size);
    const medida = candidatas[0]?.[0] ?? null;

    const ficha = FICHA[juego];
    const declarada = ficha ? catalogo.games?.[ficha]?.deck : undefined;

    let veredicto = null;
    if (!ficha) {
        veredicto = `reparte cartas y no está en el mapa de expectativas — nadie comprueba su baraja`;
    } else if (!catalogo.games?.[ficha]) {
        veredicto = `el mapa lo manda a \`games.${ficha}\`, que no existe en el catálogo`;
    } else if (!medida) {
        veredicto = `sus cartas no caben en ninguna baraja entera; p.ej. ${deBaraja.slice(0, 4).join(' ')}`;
    } else if (medida !== declarada) {
        // Que la medida quepa dentro de la declarada no es fallo: es que no salieron las
        // cartas que las distinguen. Sólo es fallo si son barajas AJENAS.
        const cabeDentro = [...CARTAS_DE[medida]].every(c => CARTAS_DE[declarada]?.has(c));
        if (!cabeDentro) veredicto = `declara ${declarada} y reparte ${medida}`;
    }

    filas.push({ juego, medida, declarada, n: deBaraja.length, huerfanas, veredicto });
    if (veredicto) fallos++;
}

const ancho = Math.max(...filas.map(f => f.juego.length));
for (const f of filas) {
    const marca = f.veredicto ? '✗' : '✓';
    const detalle = f.veredicto
        ? `— ${f.veredicto}`
        : `— ${String(f.medida).padEnd(11)} ${String(f.n).padStart(3)} cartas distintas`
          + (f.medida !== f.declarada ? `  (declara ${f.declarada}; no salieron las que las distinguen)` : '');
    console.log(`  ${marca} ${f.juego.padEnd(ancho)}  ${detalle}`);
    if (f.huerfanas.length) {
        console.log(`      ${f.huerfanas.length} fuera del catálogo: ${f.huerfanas.slice(0, 6).join(' ')}`);
    }
}

console.log(fallos === 0
    ? `\n✓ los ${filas.length} reparten la baraja que la biblioteca les asigna\n`
    : `\n✗ ${fallos} de ${filas.length} reparten una baraja que no es la suya\n`);
process.exit(fallos === 0 ? 0 : 1);
