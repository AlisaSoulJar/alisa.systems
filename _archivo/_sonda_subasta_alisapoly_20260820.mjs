/**
 * ¿SEPARA LA SUBASTA? — LA PRUEBA QUE VA ANTES DEL TABLERO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Propuesta a Oscar y ésta es su ejecución: antes de construir el alisapoly entero
 * —tablero, dados, cartas, fichas, diez distritos— se mide si su mecanismo central
 * DISTINGUE a un jugador bueno de uno malo. Porque un monopoly sin subastas es un
 * segundo `guerra`: tiras, caes, pagas el precio de la lista, cero decisiones. Y este
 * banco ya descarta lo que no separa —oca se cayó con hueco 44 contra ruido ±109—,
 * así que el alisapoly puede acabar igual y sería un juego bonito que no mide nada.
 *
 * Media tarde aquí ahorra el juego entero si sale que no.
 *
 * ⚠️ POR QUÉ LA SUBASTA Y NO OTRA COSA
 *
 * Los ejes que la matriz mide sobre los 37: espacial 23, oculto 19, rival 29,
 * autónomo 8, simultáneo 2, cooperativo 2, comunicación 2. No hay columna para lo que
 * pide una subasta — VALORAR BAJO COMPETENCIA: cuánto vale esto para mí sabiendo lo
 * que vale para el otro. No es información oculta (el tablero está a la vista), ni
 * comunicación, ni simultaneidad. El póker se acerca y no es lo mismo: allí apuestas
 * sobre una mano que no ves; aquí el valor DEPENDE de quién más lo quiere.
 *
 * Y no necesita el motor de chat que Oscar aparcó. Negociar («te doy Soma y 200 por
 * Psyche») es espacio de acciones abierto. Pujar es `pujar` o `pasar`: cabe en
 * `legal_moves` tal cual y lo juegan las cinco puertas sin tocar nada.
 *
 * ⚠️ EL MODELO, A PROPÓSITO SIN AZAR OCULTO
 *
 * Doce fincas en cuatro distritos de tres. Se subastan en orden, a la vista. Cada una
 * vale 100 sueltas; completar un distrito vale 400 más. Se empieza con 1500 y el
 * marcador final es el patrimonio: caja + fincas + distritos completos.
 *
 * Todo es PÚBLICO. Es deliberado: así lo único que se mide es valorar y administrar
 * el presupuesto, sin que la deducción o la suerte del reparto contaminen el número.
 * Si separa siendo todo visible, separa por la decisión.
 */

const DISTRITOS = ['Data', 'World', 'Soma', 'Psyche'];
const POR_DISTRITO = 3;
const BASE = 100;
const BONO = 400;
const CAJA = 1500;
const PASO = 10;

/** El azar sembrado del proyecto, para que una semilla dé siempre la misma tanda. */
function mulberry32(a) {
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const fincas = () => DISTRITOS.flatMap(d =>
    Array.from({ length: POR_DISTRITO }, (_, i) => ({ distrito: d, id: `${d}-${i + 1}` })));

/** El patrimonio de un jugador: lo que se compara al final. */
function patrimonio(j) {
    let v = j.caja + j.fincas.length * BASE;
    for (const d of DISTRITOS) {
        if (j.fincas.filter(f => f.distrito === d).length === POR_DISTRITO) v += BONO;
    }
    return v;
}

/**
 * Lo que ESTA finca vale de más para ESTE jugador. Es la cuenta que un jugador bueno
 * hace y uno malo no: la tercera de un distrito vale el bono entero, la segunda vale
 * la promesa de poder completarlo, y una de un distrito que ya no puedes completar
 * —porque otro tiene dos— vale su base y nada más.
 */
function valorMarginal(j, finca, todos) {
    const mias = j.fincas.filter(f => f.distrito === finca.distrito).length;
    const quedan = POR_DISTRITO - mias - 1;
    // ¿Puede alguien más completarlo antes? Si otro ya tiene alguna, mi promesa vale menos.
    const ajenas = todos.filter(o => o !== j)
        .reduce((m, o) => Math.max(m, o.fincas.filter(f => f.distrito === finca.distrito).length), 0);
    if (mias + 1 + (POR_DISTRITO - mias - 1) > POR_DISTRITO) { /* no puede pasar */ }
    if (quedan === 0) return BASE + BONO;                    // la completa: vale todo
    if (ajenas + mias + 1 > POR_DISTRITO) return BASE;       // ya no cabe
    // Promesa: el bono repartido entre las que faltan, descontado porque puede no salir.
    return BASE + (BONO / (quedan + 1)) * 0.6;
}

/**
 * UNA SUBASTA. Ascendente y por turnos, que es lo que cabe en `legal_moves`: en tu
 * turno subes el precio o te retiras. Gana el último que queda, y paga su puja.
 */
function subastar(finca, jugadores, politicas, rnd, abre = 0) {
    let precio = 0;
    /**
     * ⚠️ QUIÉN ABRE ROTA, Y NO ES UN DETALLE: LO DESTAPÓ EL CONTROL.
     *
     * Con todos abriendo siempre el jugador 0, la misma política contra sí misma daba
     * 1660 contra 1274 —y con la tonta, 3690 contra 100—. La causa es que a igualdad
     * de valoración gana quien puja ANTES: el segundo se retira en cuanto el precio
     * pasa de lo que la finca le vale, y el primero se la lleva a ese precio. O sea
     * que la subasta premiaba el turno y no la decisión, que es justo lo contrario de
     * lo que este juego tendría que medir.
     *
     * En una mesa de verdad la subasta la abre otro cada vez —el de la izquierda del
     * que no compró—, así que se rota con el número de finca. Encontrado ANTES de
     * escribir el tablero, que era exactamente para lo que servía medir primero.
     */
    let vivos = jugadores.map((_, i) => (abre + i) % jugadores.length);
    let lider = null;
    let vueltas = 0;
    while (vivos.length > 1 && vueltas < 400) {
        for (const i of [...vivos]) {
            if (vivos.length === 1) break;
            vueltas++;
            const j = jugadores[i];
            const siguiente = precio + PASO;
            // No se puede pujar lo que no se tiene. Es la única regla dura.
            const puede = siguiente <= j.caja;
            const decide = politicas[i];
            const sube = puede && decide(j, finca, jugadores, siguiente, rnd);
            if (sube) { precio = siguiente; lider = i; }
            else { vivos = vivos.filter(k => k !== i); }
        }
    }
    const ganador = vivos.length === 1 ? vivos[0] : lider;
    if (ganador === null || ganador === undefined) return null;
    jugadores[ganador].caja -= precio;
    jugadores[ganador].fincas.push(finca);
    return { ganador, precio };
}

// ── Las políticas ──────────────────────────────────────────────────────────

/** SUELO: siempre la primera jugada legal, que aquí es `pujar`. Puja hasta arruinarse. */
const primera = () => true;

/** AZAR sembrado: cara o cruz en cada puja. */
const azar = (_j, _f, _t, _p, rnd) => rnd() < 0.5;

/** CASA: puja mientras el precio no pase de lo que la finca le vale a ella. */
const casa = (j, finca, todos, siguiente) => siguiente <= valorMarginal(j, finca, todos);

const POLITICAS = { primera, azar, casa };

// ── Una partida ────────────────────────────────────────────────────────────

function partida(semilla, nombres) {
    const rnd = mulberry32(semilla >>> 0);
    const jugadores = nombres.map(() => ({ caja: CAJA, fincas: [] }));
    const politicas = nombres.map(n => POLITICAS[n]);
    const lote = fincas();
    // Se barajan las fincas con la semilla: el orden importa y no debe ser fijo.
    for (let i = lote.length - 1; i > 0; i--) {
        const k = Math.floor(rnd() * (i + 1));
        [lote[i], lote[k]] = [lote[k], lote[i]];
    }
    lote.forEach((f, i) => subastar(f, jugadores, politicas, rnd, i % jugadores.length));
    return jugadores.map(patrimonio);
}

// ── La medida ──────────────────────────────────────────────────────────────

const media = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const ic95 = (xs) => {
    const m = media(xs);
    const v = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
    return 1.96 * Math.sqrt(v / xs.length);
};

/**
 * ⚠️ CADA SEMILLA EN TODAS LAS SILLAS, que es la lección de esta misma tarde: en
 * remigio la silla valía −55 contra +135 y esa varianza se comía el hueco entero.
 * Aquí el orden de puja es una ventaja igual de real, así que se promedia.
 */
function medir(quien, contra, N = 400) {
    const dif = [];
    for (let s = 1; s <= N; s++) {
        let mio = 0, suyo = 0;
        for (let silla = 0; silla < 2; silla++) {
            const nombres = silla === 0 ? [quien, contra] : [contra, quien];
            const r = partida(s, nombres);
            mio += r[silla === 0 ? 0 : 1];
            suyo += r[silla === 0 ? 1 : 0];
        }
        dif.push((mio - suyo) / 2);
    }
    return { hueco: media(dif), ruido: ic95(dif) };
}

console.log('\n  LA SUBASTA SOLA — sin tablero, sin dados, sin cartas');
console.log(`  ${DISTRITOS.length} distritos × ${POR_DISTRITO} fincas · base ${BASE} · bono ${BONO} · caja ${CAJA}\n`);

for (const [a, b, et] of [
    ['casa', 'primera', 'casa contra la tonta'],
    ['casa', 'azar', 'casa contra el azar'],
    ['azar', 'primera', 'azar contra la tonta'],
]) {
    const { hueco, ruido } = medir(a, b);
    console.log(`  ${et.padEnd(22)} hueco ${hueco.toFixed(1).padStart(9)} ± ${ruido.toFixed(1).padStart(7)}`
              + `   ${Math.abs(hueco) > ruido ? '✓ separa' : '✗ no separa'}`
              + `   (señal/ruido ${(Math.abs(hueco) / (ruido || 1e-9)).toFixed(1)})`);
}

/**
 * ⚠️ EL CONTROL, RESCRITO PORQUE EL PRIMERO NO PODÍA FALLAR.
 *
 * Puse «la misma política contra sí misma tiene que dar cero» y dio 0,0 ± 0,0 en las
 * tres. Exacto. Y no probaba nada: `medir` PROMEDIA las dos sillas, así que un sesgo
 * de silla se cancela por construcción y el control lo daría por bueno siempre. Un
 * control que no puede salir mal es decorado.
 *
 * Así que se mira cada silla POR SEPARADO. Si pujar primero es una ventaja, aquí sale
 * — y hace falta saberlo antes de construir nada encima: en el remigio ese mismo
 * sesgo valía −55 contra +135 y se comía la señal entera.
 */
console.log('');
for (const p of ['casa', 'primera', 'azar']) {
    let s0 = 0, s1 = 0;
    const N = 400;
    for (let s = 1; s <= N; s++) {
        const r = partida(s, [p, p]);
        s0 += r[0]; s1 += r[1];
    }
    const a = s0 / N, b = s1 / N;
    const sesgo = a - b;
    console.log(`  CONTROL ${p.padEnd(9)} el que puja primero: ${a.toFixed(1).padStart(8)}`
              + ` · el segundo: ${b.toFixed(1).padStart(8)}`
              + `   ventaja de salir ${sesgo >= 0 ? '+' : ''}${sesgo.toFixed(1)}`
              + `   ${Math.abs(sesgo) < 50 ? '✓ pequeña' : '⚠️ GRANDE — hay que promediar sillas'}`);
}
