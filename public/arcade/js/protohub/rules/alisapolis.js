/**
 * alisapolis.js — comprar, subastar y cobrar en los diez distritos de la casa
 * ═══════════════════════════════════════════════════════════════════════════
 * Tiras dos dados, avanzas por el anillo y caes en un distrito. Si no tiene dueño,
 * SALE A SUBASTA y pujáis todos. Si tiene dueño, pagas. Gana el patrimonio más alto.
 *
 * ⚠️ NO SE COMPRA AL PRECIO DE LISTA, Y ES LA DECISIÓN DE DISEÑO MÁS IMPORTANTE.
 *
 * En la mesa de verdad compras al precio de la caja y sólo hay subasta si renuncias.
 * Lo escribí así y midiéndolo resultó que MATABA EL JUEGO: el patrimonio cuenta las
 * fincas por su precio, así que comprar al precio de lista es neutro y encima renta —
 * o sea que comprar es siempre correcto, nadie renuncia nunca, y la subasta no se
 * dispara jamás. Se comprobó aislando las partes de la heurística: quitarle la
 * disciplina de puja no cambiaba NADA (el mismo hueco al decimal), que es la firma de
 * un mecanismo que no llega a ejecutarse.
 *
 * Con todo a subasta, el precio lo pone la mesa y no la caja, que es donde vive lo que
 * este juego quiere medir. Va dicho en la ficha, en `diferencias`.
 *
 * ⚠️ POR QUÉ EXISTE, Y NO ES «PORQUE FALTABA EL MONOPOLY».
 *
 * La matriz de géneros mide ocho ejes sobre los 37 juegos: espacial 23, oculto 19,
 * rival 29, autónomo 8, simultáneo 2, cooperativo 2, comunicación 2. **Ninguna
 * columna cubre lo que pide una subasta**: VALORAR BAJO COMPETENCIA — cuánto vale
 * esto para mí sabiendo lo que vale para el otro. No es información oculta (todo está
 * a la vista), ni comunicación, ni simultaneidad. El póker se acerca y no es lo mismo:
 * allí apuestas sobre una mano que no ves; aquí el valor DEPENDE de quién más lo
 * quiere, y eso cambia cada vez que alguien compra algo.
 *
 * ⚠️ Y SIN SUBASTA ESTO SERÍA UN SEGUNDO `guerra`.
 *
 * Un monopoly donde caes y pagas el precio de la lista no tiene decisiones: tiras,
 * caes, pagas. `guerra` ya ocupa ese sitio en el banco, y está ahí a propósito como
 * CONTROL —lo que no separa a nadie—. Así que la subasta no es un adorno del diseño:
 * es el diseño.
 *
 * ⚠️ Y ESO SE MIDIÓ ANTES DE ESCRIBIR ESTE FICHERO.
 *
 * `_archivo/_sonda_subasta_alisapoly_20260820.mjs` implementa la subasta sola —sin
 * tablero, sin dados, sin cartas— y pregunta si separa. Sale hueco 606 ± 20, o sea
 * señal/ruido 30: separa con holgura. Y de paso destapó un fallo de diseño que aquí
 * ya viene corregido: **a igualdad de valoración ganaba quien puja antes**, porque el
 * segundo se retira en cuanto el precio pasa de lo que la finca le vale. La misma
 * política contra sí misma daba 1660 contra 1274. Se arregla rotando quién abre, como
 * en una mesa de verdad. Encontrarlo con el juego ya construido habría costado mucho
 * más que encontrarlo con cuarenta líneas.
 *
 * ⚠️ LOS CUATRO MATERIALES A LA VEZ, QUE ERA EL PUNTO DE OSCAR.
 *
 * Es el único de la casa que usa los cuatro: TABLERO (el anillo, como parchís y oca),
 * DADOS (los mismos objetos de la generala y el dominó), CARTAS (el mazo de decretos,
 * boca abajo sobre el tablero) y FICHAS (los peones). No hay motor nuevo: el contrato
 * de siempre —`rejilla`, `piezas`, `zonas`— ya lo expresa todo.
 *
 * ⚠️ LO QUE NO ESTÁ, Y SE DICE.
 *
 *   · NEGOCIAR entre jugadores («te doy Soma y 200 por Psyche»). Es espacio de
 *     acciones abierto y pide un canal de conversación que este banco no tiene. Pujar
 *     sí cabe: es `pujar` o `pasar`, vocabulario cerrado, y lo juegan las cinco
 *     puertas sin tocar nada. Ésa es la línea, y por eso este juego empieza por aquí.
 *   · HIPOTECAS. Añaden una palanca financiera real y también el cuarenta por ciento
 *     de las reglas. Segunda ronda.
 *   · Quedarse en el Sandbox al final para no caer en casa ajena. Pide modelar el
 *     tablero como grafo de riesgo; hoy sales en cuanto sacas dobles o pagas.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32 } from './azar.js';

/** Los diez distritos de la casa, del más barato al más caro. */
export const DISTRITOS = [
    'Data', 'World', 'Soma', 'Psyche', 'Genesis',
    'Scripts', 'Docs', 'Laboratory', 'IrealWorld', 'Heritage',
];

/** 9×9 tiene exactamente 32 celdas de perímetro (4·9−4), así que el anillo cae
 *  redondo sin inventarse un tamaño. Es el mismo truco que usa el parchís con 18. */
const LADO = 9;
const CASILLAS = LADO * 4 - 4;      // 32

/**
 * ⚠️ LAS MAGNITUDES SON EL JUEGO, Y LAS PRIMERAS QUE PUSE NO LO ERAN.
 *
 * Con caja 1500 y alquileres de precio/10 —de 6 a 24— no dolía nada: nadie quebraba
 * en 300 partidas y el hueco entre la casa y la política tonta salía 3,1 ± 34,4, o
 * sea ruido. Un juego donde las decisiones no cambian el resultado no mide a nadie,
 * por bonito que sea el tablero.
 *
 * La subasta desnuda sí separaba —señal/ruido 30— y la diferencia estaba aquí: allí
 * completar un distrito valía 400 sobre una base de 100, un salto de cuatro veces.
 * Aquí «el alquiler se dobla» era calderilla. Así que:
 *
 *     alquiler base    precio/5   en vez de precio/10
 *     distrito entero  ×3         en vez de ×2
 *     cada casa        +2 bases   en vez de +1
 *     caja inicial     1000       en vez de 1500
 *
 * No es afinar hasta que gane mi heurística: es que el juego tenga consecuencias.
 * Se comprueba contra DOS suelos —la tonta y el azar— justo para no acabar afinando
 * contra uno solo, que sería medir mi rival contra su espejo.
 */
const CAJA_INICIAL = 1000;
const AL_PASAR = 200;               // lo que se cobra al pasar por Salida
const IMPUESTO = 100;
const MAX_CASAS = 3;

/**
 * ⚠️ EL TABLERO SE DECLARA, NO SE GENERA.
 *
 * Veinte fincas —dos por distrito—, cuatro esquinas, cuatro de mazo, dos de impuesto
 * y dos de servicio. Escrito a mano y no calculado a propósito: el orden de las
 * casillas ES el juego —qué distritos caen juntos, dónde están las cartas— y una
 * fórmula que lo generase escondería esa decisión detrás de aritmética.
 */
const TABLERO = (() => {
    const c = [];
    const finca = (d, n) => ({ tipo: 'finca', distrito: d, nombre: `${d}-${n}` });
    c[0]  = { tipo: 'salida', nombre: 'Salida' };
    c[1]  = finca('Data', 1);
    c[2]  = finca('Data', 2);
    c[3]  = { tipo: 'mazo', nombre: 'Decreto' };
    c[4]  = finca('World', 1);
    c[5]  = finca('World', 2);
    c[6]  = { tipo: 'impuesto', nombre: 'Deuda técnica' };
    c[7]  = finca('Soma', 1);
    c[8]  = { tipo: 'sandbox', nombre: 'Sandbox' };
    c[9]  = finca('Soma', 2);
    c[10] = finca('Psyche', 1);
    c[11] = { tipo: 'mazo', nombre: 'Incidencia' };
    c[12] = finca('Psyche', 2);
    c[13] = { tipo: 'servicio', nombre: 'El Hub' };
    c[14] = finca('Genesis', 1);
    c[15] = finca('Genesis', 2);
    c[16] = { tipo: 'cache', nombre: 'Caché' };
    c[17] = finca('Scripts', 1);
    c[18] = finca('Scripts', 2);
    c[19] = { tipo: 'mazo', nombre: 'Decreto' };
    c[20] = finca('Docs', 1);
    c[21] = finca('Docs', 2);
    c[22] = { tipo: 'impuesto', nombre: 'Refactor' };
    c[23] = finca('Laboratory', 1);
    c[24] = { tipo: 'alSandbox', nombre: 'Al Sandbox' };
    c[25] = finca('Laboratory', 2);
    c[26] = finca('IrealWorld', 1);
    c[27] = { tipo: 'mazo', nombre: 'Incidencia' };
    c[28] = finca('IrealWorld', 2);
    c[29] = { tipo: 'servicio', nombre: 'Akasha' };
    c[30] = finca('Heritage', 1);
    c[31] = finca('Heritage', 2);
    return c;
})();

/** El precio sube con el distrito. Barato al principio del anillo, caro al final. */
const precioDe = (i) => {
    const c = TABLERO[i];
    if (c.tipo === 'servicio') return 150;
    if (c.tipo !== 'finca') return 0;
    return 60 + 20 * DISTRITOS.indexOf(c.distrito);
};
/** El alquiler base es la décima parte del precio: la vuelta al tablero se paga. */
const alquilerBase = (i) => Math.round(precioDe(i) / 5);

/**
 * Las cartas del mazo. Efectos secos y sin decisión: sacar carta no es una jugada,
 * es lo que te pasa. Se barajan con la semilla, así que la partida se re-simula.
 */
const CARTAS = [
    { txt: 'La Reina aprueba tu decreto: +150',            caja: 150 },
    { txt: 'Se cae el Hub y lo levantas tú: +100',         caja: 100 },
    { txt: 'Te toca guardia de fin de semana: +50',        caja: 50 },
    { txt: 'Bug en producción, pagas la vela: −120',       caja: -120 },
    { txt: 'Migración a medias, hay que rehacerla: −80',   caja: -80 },
    { txt: 'Refactor que nadie pidió: −60',                caja: -60 },
    { txt: 'Dividendo de $NEURO: +80',                     caja: 80 },
    { txt: 'Vuelves a Salida y cobras',                    ir: 0 },
    { txt: 'Al Sandbox, sin cobrar al pasar',              ir: 8, sandbox: true },
    { txt: 'Avanzas al Hub',                               ir: 13 },
    { txt: 'Multa por dejar `console.log`: −40',           caja: -40 },
    { txt: 'Auditoría a tu favor: +200',                   caja: 200 },
];

const barajarCon = (xs, rnd) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
        const k = Math.floor(rnd() * (i + 1));
        [a[i], a[k]] = [a[k], a[i]];
    }
    return a;
};

/**
 * @param {Object} opts
 * @param {number} opts.jugadores  2 por defecto, como el resto de la casa
 * @param {number} opts.vueltas    cuántas vueltas al tablero dura la partida
 */
export async function crearAlisapolis({ jugadores = 2, vueltas = 12 } = {}) {

    const esMia = (p, i, quien) => p.duenos[i] === quien;

    /** Cuántas fincas de ese distrito tiene alguien. */
    const cuantasDe = (p, quien, distrito) =>
        TABLERO.reduce((n, c, i) =>
            n + (c.tipo === 'finca' && c.distrito === distrito && p.duenos[i] === quien ? 1 : 0), 0);

    const totalDe = (distrito) =>
        TABLERO.filter(c => c.tipo === 'finca' && c.distrito === distrito).length;

    const distritoCompleto = (p, quien, distrito) =>
        cuantasDe(p, quien, distrito) === totalDe(distrito);

    /**
     * ⚠️ EL ALQUILER ES DONDE EL DISTRITO COMPLETO SE PAGA, Y ES LO QUE HACE QUE LA
     * SUBASTA IMPORTE. Una finca suelta cobra su base; el distrito entero cobra el
     * doble; y cada casa suma otra base. Sin esa escalera, comprar la segunda finca
     * de un distrito valdría lo mismo que comprar cualquier otra y no habría nada
     * que valorar.
     */
    function alquilerDe(p, i) {
        const c = TABLERO[i];
        if (c.tipo === 'servicio') return 25 * (1 + p.duenos.filter((d, k) =>
            d === p.duenos[i] && TABLERO[k].tipo === 'servicio').length - 1);
        if (c.tipo !== 'finca') return 0;
        const base = alquilerBase(i);
        const dueno = p.duenos[i];
        const casas = p.casas[c.distrito] ?? 0;
        const completo = distritoCompleto(p, dueno, c.distrito);
        return base * (completo ? 3 : 1) + base * 2 * casas;
    }

    const patrimonio = (p, quien) => {
        if (p.quebrados.includes(quien)) return 0;
        let v = p.caja[quien];
        TABLERO.forEach((c, i) => {
            if (p.duenos[i] !== quien) return;
            v += precioDe(i);
            if (c.tipo === 'finca') v += (p.casas[c.distrito] ?? 0) * Math.round(precioDe(i) / 2);
        });
        return v;
    };

    /**
     * ⚠️ QUÉ VALE ESTA FINCA PARA ESTE JUGADOR. Es la cuenta que separa a un jugador
     * bueno de uno correcto, y es literalmente lo que se midió en la sonda: la que
     * completa un distrito vale el bono entero, la segunda vale la promesa, y una de
     * un distrito que ya no puedes completar vale su precio y nada más.
     */
    function valorPara(p, quien, i) {
        const c = TABLERO[i];
        const precio = precioDe(i);
        /**
         * ⚠️ EL SUELO DE LO QUE VALE UNA FINCA ES SU PRECIO, Y ESO CAMBIA TODO.
         *
         * El patrimonio cuenta las fincas por su precio, así que comprar al precio de
         * lista es NEUTRO: cambias caja por un activo que vale lo mismo. Y encima
         * cobra alquiler. O sea que comprar es siempre bueno, y lo único que se
         * decide de verdad es cuánto pujar por encima.
         *
         * Mi primera versión no lo veía: valoraba una finca «bloqueada» —de un
         * distrito donde el otro ya tiene la suya— por debajo del precio, así que la
         * casa la mandaba a subasta y se la REGALABA al rival, que en la subasta puja
         * siempre. Medido: la casa perdía por 282 puntos contra la política tonta.
         * Separaba, sí, pero al revés, que es la peor forma de separar.
         */
        const quedan = Math.max(1, p.vueltas - p.vuelta + 1);
        // Lo que va a rentar mientras dure la partida. Se cae en una casilla concreta
        // aproximadamente una vez cada dos vueltas de la mesa, así que medio alquiler
        // por vuelta que quede. Es una estimación grosera A PROPÓSITO: un rival de
        // casa que calcule la renta exacta no deja hueco a nadie por encima.
        const renta = alquilerBase(i) * quedan * 0.5;
        if (c.tipo !== 'finca') return precio + renta;

        const mias = cuantasDe(p, quien, c.distrito);
        const total = totalDe(c.distrito);
        const ajenas = TABLERO.reduce((n, cc, k) =>
            n + (cc.tipo === 'finca' && cc.distrito === c.distrito
                 && p.duenos[k] !== null && p.duenos[k] !== quien ? 1 : 0), 0);

        // ⚠️ Con una sola ajena el distrito ya NO se puede completar —son dos fincas—
        // y esa finca vale su precio y su renta, ni un duro más. La condición de antes
        // (`ajenas + mias + 1 > total`) daba 2 > 2, o sea falso, y seguía pagando la
        // promesa de un distrito imposible.
        if (ajenas > 0) return precio + renta;
        if (mias + 1 === total) return precio + renta * 3;   // lo completa: dobla y deja casas
        return precio + renta * 1.5;                         // promesa de completarlo
    }

    /** El azar NO se toca en `estado()`: se cuenta cuántas veces se ha tirado y se
     *  deriva de la semilla. Así una partida vista mil veces sigue siendo la misma. */
    const azar = (p) => mulberry32((p.semilla ^ (p._n * 2654435761)) >>> 0)();
    const tirarDado = (p) => {
        p._n++; const a = 1 + Math.floor(azar(p) * 6);
        p._n++; const b = 1 + Math.floor(azar(p) * 6);
        return [a, b];
    };

    /** Mueve a `quien` a la casilla `destino`, cobrando el paso por Salida. */
    function llevarA(p, quien, destino, cobrar = true) {
        if (cobrar && destino < p.pos[quien]) p.caja[quien] += AL_PASAR;
        p.pos[quien] = destino;
    }

    /** Los que siguen en pie. Con uno solo, se acabó. */
    const vivos = (p) => Array.from({ length: p.jugadores }, (_, i) => i)
        .filter(i => !p.quebrados.includes(i));

    function quebrar(p, quien) {
        p.quebrados.push(quien);
        p.duenos = p.duenos.map(d => (d === quien ? null : d));
        p.historial.push(`quiebra:${quien}`);
    }

    /** Cobra `cuanto` a `quien`; si no puede, quiebra. Devuelve lo que se pagó. */
    function cobrar(p, quien, cuanto, a = null) {
        if (p.caja[quien] >= cuanto) {
            p.caja[quien] -= cuanto;
            if (a !== null) p.caja[a] += cuanto;
            return cuanto;
        }
        const resto = p.caja[quien];
        p.caja[quien] = 0;
        if (a !== null) p.caja[a] += resto;
        quebrar(p, quien);
        return resto;
    }

    function siguienteTurno(p) {
        const v = vivos(p);
        if (v.length <= 1) { p.fin = true; return; }
        let n = p.turno;
        do { n = (n + 1) % p.jugadores; } while (p.quebrados.includes(n));
        if (n <= p.turno) p.vuelta++;          // se ha dado la vuelta a la mesa
        p.turno = n;
        p.dado = null;
        p.fase = 'tirar';
        if (p.vuelta > p.vueltas) p.fin = true;
    }

    /** Lo que pasa al caer en una casilla. Devuelve `true` si hay que decidir algo. */
    function aterrizar(p, quien) {
        const i = p.pos[quien];
        const c = TABLERO[i];

        if (c.tipo === 'impuesto') { cobrar(p, quien, IMPUESTO); return false; }
        if (c.tipo === 'alSandbox') { p.pos[quien] = 8; p.enSandbox[quien] = 2; return false; }
        if (c.tipo === 'salida' || c.tipo === 'cache' || c.tipo === 'sandbox') return false;

        if (c.tipo === 'mazo') {
            if (!p.mazo.length) p.mazo = barajarCon(CARTAS.map((_, k) => k), () => azar(p));
            const k = p.mazo.shift();
            const carta = CARTAS[k];
            p.ultimaCarta = carta.txt;
            p.historial.push(`carta:${k}`);
            if (typeof carta.caja === 'number') {
                if (carta.caja >= 0) p.caja[quien] += carta.caja;
                else cobrar(p, quien, -carta.caja);
            }
            if (typeof carta.ir === 'number') {
                if (carta.sandbox) { p.pos[quien] = carta.ir; p.enSandbox[quien] = 2; return false; }
                llevarA(p, quien, carta.ir, true);
                return aterrizar(p, quien);
            }
            return false;
        }

        // Finca o servicio.
        if (p.duenos[i] === null) return true;             // hay que decidir
        if (p.duenos[i] !== quien) cobrar(p, quien, alquilerDe(p, i), p.duenos[i]);
        return false;
    }

    /** Abre la subasta de la casilla `i`. Quien abre ROTA: ver la nota de cabecera. */
    function abrirSubasta(p, i) {
        const v = vivos(p);
        p.subasta = {
            finca: i,
            precio: 0,
            lider: null,
            // El orden de puja empieza en el que abre, y el que abre rota con el
            // número de subastas ya celebradas. Sin esto, a igualdad de valoración
            // gana siempre el mismo y la subasta mide el turno y no la decisión.
            vivos: v.map((_, k) => v[(p.subastas + k) % v.length]),
            enTurno: 0,
        };
        p.subastas++;
        p.fase = 'subasta';
    }

    function cerrarSubasta(p) {
        const s = p.subasta;
        if (s.lider !== null) {
            p.caja[s.lider] -= s.precio;
            p.duenos[s.finca] = s.lider;
            p.historial.push(`adjudicada:${s.finca}:${s.lider}:${s.precio}`);
        } else {
            p.historial.push(`desierta:${s.finca}`);
        }
        p.subasta = null;
        siguienteTurno(p);
    }

    function legales(p) {
        if (p.fin) return ['nueva'];

        if (p.fase === 'subasta') {
            const s = p.subasta;
            const quien = s.vivos[s.enTurno];
            const out = ['pasar'];
            // Sólo se puede pujar lo que se tiene. Es la única regla dura de la puja.
            if (p.caja[quien] >= s.precio + 10) out.unshift('pujar');
            return out;
        }
        if (p.fase === 'tirar') {
            const out = ['tirar'];
            // Construir sólo con el distrito entero, y sólo si se puede pagar. Va
            // antes de tirar porque después ya has caído donde has caído.
            for (const d of DISTRITOS) {
                if (!distritoCompleto(p, p.turno, d)) continue;
                if ((p.casas[d] ?? 0) >= MAX_CASAS) continue;
                const coste = 50 + 20 * DISTRITOS.indexOf(d);
                if (p.caja[p.turno] >= coste) out.push(`construir:${d}`);
            }
            return out;
        }
        return ['tirar'];
    }

    /** De quién es el turno AHORA, que en la subasta no es `p.turno`. */
    const quienDecide = (p) =>
        p.fase === 'subasta' ? p.subasta.vivos[p.subasta.enTurno] : p.turno;

    return {

        OBJETIVO: 'Objetivo: acabar con el patrimonio más alto. Caes en un distrito libre y '
                + 'lo compras al precio de lista o lo mandas a subasta, donde pujáis todos. '
                + 'Completar un distrito dobla el alquiler y deja construir.',
        ASIENTOS: jugadores,
        nombre: 'alisapolis',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const p = {
                semilla, jugadores, _n: 0,
                caja: Array(jugadores).fill(CAJA_INICIAL),
                pos: Array(jugadores).fill(0),
                enSandbox: Array(jugadores).fill(0),
                duenos: Array(CASILLAS).fill(null),
                casas: {},
                turno: 0, dado: null, fase: 'tirar',
                subasta: null, subastas: 0,
                vuelta: 1, vueltas,
                quebrados: [], fin: false,
                mazo: [], ultimaCarta: null,
                historial: [],
            };
            p.mazo = barajarCon(CARTAS.map((_, k) => k), () => azar(p));
            return p;
        },

        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < p.jugadores ? asiento : 0;
            const marcador = Array.from({ length: p.jugadores }, (_, i) => patrimonio(p, i));
            const decide = quienDecide(p);

            const mias = TABLERO.map((c, i) => (p.duenos[i] === yo ? c.nombre : null)).filter(Boolean);
            const suyas = TABLERO.map((c, i) =>
                (p.duenos[i] !== null && p.duenos[i] !== yo ? c.nombre : null)).filter(Boolean);

            const i = p.pos[p.turno];
            let pista = null;
            if (p.fin) pista = null;
            else if (p.fase === 'subasta') {
                pista = `Subasta de ${TABLERO[p.subasta.finca].nombre}: van ${p.subasta.precio}. `
                      + `Puja 10 más o retírate.`;
            } else {
                pista = `Estás en ${TABLERO[p.pos[yo]].nombre}. Tira los dados.`;
            }

            return {
                juego: 'alisapolis',
                asiento: yo,
                casilla: p.pos[yo],
                donde: TABLERO[p.pos[yo]].nombre,
                caja: p.caja[yo],
                cajas: [...p.caja],
                mis_fincas: mias,
                fincas_ajenas: suyas,
                casas: { ...p.casas },
                dado: p.dado,
                fase: p.fase,
                subasta: p.subasta
                    ? { finca: TABLERO[p.subasta.finca].nombre, precio: p.subasta.precio,
                        puja: p.subasta.lider, decide }
                    : null,
                ultima_carta: p.ultimaCarta,
                vuelta: p.vuelta, vueltas: p.vueltas,
                quebrados: [...p.quebrados],
                marcador,
                puntos: marcador[yo],
                score: marcador[yo],
                historial: p.historial,
                semilla: p.semilla,
                turn: decide === yo ? 'player' : `cpu${decide}`,
                pista,
                legal_moves: legales(p),
                is_game_over: !!p.fin,
                desenlace: p.fin
                    ? (marcador[yo] === Math.max(...marcador)
                        ? (marcador.filter(m => m === marcador[yo]).length > 1 ? 'empate' : 'ganas')
                        : 'pierdes')
                    : null,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset') return false;
            if (p.fin) return false;
            if (!legales(p).includes(j)) return false;

            // ── La subasta ───────────────────────────────────────────────
            if (p.fase === 'subasta') {
                const s = p.subasta;
                const quien = s.vivos[s.enTurno];
                if (j === 'pujar') {
                    s.precio += 10;
                    s.lider = quien;
                    p.historial.push(`pujar:${quien}:${s.precio}`);
                    s.enTurno = (s.enTurno + 1) % s.vivos.length;
                } else {
                    p.historial.push(`pasar:${quien}`);
                    s.vivos = s.vivos.filter(k => k !== quien);
                    if (s.enTurno >= s.vivos.length) s.enTurno = 0;
                }
                // Se cierra cuando sólo queda uno pujando, o cuando no queda nadie.
                if (s.vivos.length <= 1) {
                    if (s.vivos.length === 1 && s.lider === null) {
                        // Nadie ha pujado todavía: el que queda se la lleva por 10.
                        s.precio = 10; s.lider = s.vivos[0];
                    }
                    cerrarSubasta(p);
                }
                return true;
            }

            // ── Construir ────────────────────────────────────────────────
            if (j.startsWith('construir:')) {
                const d = j.slice('construir:'.length);
                p.caja[p.turno] -= 50 + 20 * DISTRITOS.indexOf(d);
                p.casas[d] = (p.casas[d] ?? 0) + 1;
                p.historial.push(j);
                return true;                        // construir NO gasta el turno
            }

            // ── Tirar ────────────────────────────────────────────────────
            if (j === 'tirar') {
                const quien = p.turno;
                const [a, b] = tirarDado(p);
                p.dado = [a, b];
                p.historial.push(`tirar:${a}-${b}`);

                if (p.enSandbox[quien] > 0) {
                    // Dobles te sacan; si no, esperas y pagas al tercer intento.
                    if (a === b) p.enSandbox[quien] = 0;
                    else {
                        p.enSandbox[quien]--;
                        if (p.enSandbox[quien] === 0) cobrar(p, quien, 50);
                        siguienteTurno(p);
                        return true;
                    }
                }

                const destino = (p.pos[quien] + a + b) % CASILLAS;
                llevarA(p, quien, destino, true);
                const libre = aterrizar(p, quien);
                if (p.quebrados.includes(quien)) { siguienteTurno(p); return true; }
                // Caer en algo libre abre la SUBASTA. No hay «comprar»: ver la nota
                // de cabecera sobre por qué esa decisión desactivaba el juego entero.
                if (libre) abrirSubasta(p, p.pos[quien]);
                else siguienteTurno(p);
                return true;
            }

            return false;
        },

        /**
         * ⚠️ EL RIVAL DE LA CASA. Su única idea buena es la de la sonda: no pagar por
         * una finca más de lo que esa finca le vale A ÉL, contando el distrito.
         *
         * Deja techo a propósito, como `gofish.js` y el dominó: no sube el precio para
         * arruinar al otro sabiendo que no la quiere —que es la jugada de un buen
         * jugador de monopoly— ni guarda caja para la subasta que viene. Un rival de
         * casa que juegue perfecto no ordena a nadie.
         */
        sugerencia(p) {
            const ls = legales(p);
            if (!ls.length || p.fin) return null;

            if (p.fase === 'subasta') {
                const s = p.subasta;
                const quien = s.vivos[s.enTurno];
                const tope = valorPara(p, quien, s.finca);
                return (ls.includes('pujar') && s.precio + 10 <= tope) ? 'pujar' : 'pasar';
            }
            /**
             * ⚠️ LA CASA NO CONSTRUYE, Y ESO ESTÁ MEDIDO, NO ELEGIDO.
             *
             * Aislando las tres partes de esta heurística contra el mismo suelo y sobre
             * las mismas semillas —200 × 2 sillas, 20 vueltas:
             *
             *     completa   +671 ± 113   ✓
             *     sin_obra   +794 ± 105   ✓   ← MEJOR sin construir
             *     sin_puja    −47 ± 149   ruido
             *     solo_obra   −47 ± 149   ruido
             *
             * Dos cosas se leen ahí. La primera: TODA la habilidad está en la subasta.
             * Quitarle la disciplina de puja deja a la casa indistinguible de la tonta,
             * que es justo lo que este juego se propuso medir. La segunda: construir,
             * tal y como está tarifado, CUESTA ciento veintitrés puntos — le puse
             * reserva para no quebrar y aun así resta.
             *
             * Así que la casa no construye. Y `construir` se queda como jugada legal a
             * propósito: es una palanca que hoy no sé usar bien, y un agente que
             * encuentre cuándo sí paga le ganará a la casa por ahí. Un rival de banco
             * que ya lo sepa todo no deja hueco a nadie — es lo que dice `gofish.js` y
             * vale igual aquí.
             */
            return 'tirar';
        },

        /**
         * ⚠️ EL SUSTRATO: LOS CUATRO MATERIALES CON EL CONTRATO DE SIEMPRE.
         *
         *   rejilla  el anillo de 32 casillas sobre 9×9; dentro es muro
         *   piezas   un peón por jugador, en su casilla
         *   zonas    los dados, el mazo de decretos boca abajo, y las fincas de cada uno
         *
         * Las casillas que son TUYAS salen marcadas con `2`, que en esta rejilla
         * significa «destino» — aquí quiere decir «esto ya es tuyo», que es la
         * información que necesitas de un vistazo para saber dónde no te van a cobrar.
         */
        sustrato(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < p.jugadores ? asiento : 0;

            const anillo = (i) => {
                if (i < LADO) return { x: i, y: 0 };
                if (i < LADO * 2 - 1) return { x: LADO - 1, y: i - LADO + 1 };
                if (i < LADO * 3 - 2) return { x: LADO * 3 - 3 - i, y: LADO - 1 };
                return { x: 0, y: LADO * 4 - 4 - i };
            };

            const celdas = new Array(LADO * LADO).fill(1);      // 1 = muro
            const nombres = new Array(LADO * LADO).fill(null);
            for (let c = 0; c < CASILLAS; c++) {
                const { x, y } = anillo(c);
                const k = y * LADO + x;
                celdas[k] = p.duenos[c] === yo ? 2 : 0;
                nombres[k] = TABLERO[c].nombre;
            }

            const piezas = [];
            for (let i = 0; i < p.jugadores; i++) {
                if (p.quebrados.includes(i)) continue;
                const { x, y } = anillo(p.pos[i]);
                /**
                 * ⚠️ ESTO DECÍA `dueno` Y `tipo`, Y EL PINTOR LEE `de` Y `t`.
                 * ═══════════════════════════════════════════════════════════
                 *
                 * Alisapolis necesitó identificar sus peones —cuatro fichas que
                 * dan vueltas al mismo tablero— cuando el vocabulario no tenía
                 * `id`, y de paso escribió los otros dos campos en castellano
                 * largo. El resultado, medido en el sustrato vivo:
                 *
                 *     {"id":"peon0","x":4,"y":0,"dueno":0,"tipo":"peon"}
                 *     lo que el pintor leía:  t=undefined  de=undefined
                 *
                 * O sea que los cuatro peones salían como DISCOS GRISES
                 * IDÉNTICOS. Y eso explica un aviso del buzón que yo había
                 * clasificado como «no se ve jugar a la casa»:
                 *
                 *     «parece que juego yo solo»   — aviso de alisapolis
                 *
                 * No era de los turnos. Es que no puedes distinguir tu peón del
                 * de nadie. El dialecto, el fallo de dibujo y la queja eran la
                 * misma cosa con tres caras.
                 *
                 * `id` se queda —es lo que hacía falta y ahora está en el
                 * contrato, igual que lo estaba ya para las zonas— y los otros
                 * dos vuelven a los nombres de la casa.
                 */
                piezas.push({ id: `peon${i}`, x, y, t: 'peon', de: i });
            }

            const zonas = [
                {
                    id: 'dados', de: null,
                    items: p.dado ? p.dado.map(v => `d6_${v}`) : [],
                    ocultas: 0,
                },
                // El mazo boca abajo, que es el cuarto material sobre el tablero.
                { id: 'decretos', de: null, items: [], ocultas: p.mazo.length, apilada: true },
            ];
            for (let i = 0; i < p.jugadores; i++) {
                zonas.push({
                    id: 'fincas', de: i, ocultas: 0,
                    items: TABLERO.map((c, k) => (p.duenos[k] === i ? c.nombre : null)).filter(Boolean),
                });
            }

            return {
                // tiquetas para que el pintor ESCRIBA los nombres en las casillas.
                // Sin eso se ve el anillo y los peones y no distingues Data de
                // Heritage — que en un monopoly es no ver el juego. Lo pide la rejilla
                // y no lo adivina el pintor: flota tambien publica nombres (1..j10)
                // y llenarle el tablero de cien rotulos seria arreglarle esto a otro.
                rejilla: { ancho: LADO, alto: LADO, celdas, nombres, etiquetas: true },
                piezas,
                zonas,
                leyenda: {
                    0: 'casilla del anillo',
                    1: 'fuera del tablero',
                    2: 'tuya: aquí no pagas',
                    peon: 'tu peón y el de los demás',
                    dados: 'lo que has sacado',
                    decretos: 'el mazo, boca abajo',
                    fincas: 'lo que tiene cada uno',
                },
            };
        },

        deshacer() { return false; },
    };
}
