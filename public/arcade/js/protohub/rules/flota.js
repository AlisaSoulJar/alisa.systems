/**
 * flota.js — el tercer género con sustrato propio: INFERENCIA CONTRA ALGUIEN
 * ═══════════════════════════════════════════════════════════════════════════
 * Dos mares, cuatro barcos cada uno, y un disparo por turno. Lo de siempre —
 * y lo de siempre está aquí por un motivo que se puede leer en una tabla.
 *
 * ⚠️ ESTE JUEGO LO ELIGIÓ `matriz_generos.mjs`, NO YO.
 *
 * La matriz mide, jugando, qué estructuras de decisión cubre el motor. Con
 * veintiún juegos decía dos cosas incómodas: que **catorce de los veintiuno
 * ocupaban sólo dos perfiles** —seis de tablero abierto, ocho de cartas—, y que
 * la casilla `espacial + oculto + rival` **estaba vacía**. Geometría, más
 * información que no ves, más alguien que decide en tu contra. Cada ingrediente
 * suelto lo teníamos; los tres juntos, en ninguno.
 *
 * Y esa intersección no es la suma de sus partes. Sokoban y cripta esconden el
 * mapa pero nadie te lo está escondiendo A PROPÓSITO: la mazmorra no coloca los
 * muros para engañarte. Brisca esconde cartas de un rival, pero no hay dónde:
 * no hay geometría sobre la que razonar. Aquí las dos cosas a la vez producen
 * algo que ninguno de los veintiuno pedía — **deducir dónde está algo que otro
 * ha escondido, mientras él deduce lo mismo de ti**. Eso es tanteo bayesiano en
 * un tablero, con reloj, y es exactamente lo que una tabla de resultados debería
 * saber puntuar.
 *
 * ⚠️ Y ES EL PRIMERO CON SUSTRATO PROPIO **Y DOS ASIENTOS**.
 * Sokoban y cripta son solitarios: un solo punto de vista, ningún riesgo. Aquí
 * `sustrato(p, asiento)` tiene que devolver dos cuadros distintos del mismo
 * estado, y equivocarse significa enseñarle a uno la flota del otro. Ya pasó
 * dos veces en este proyecto con cartas —una en las reglas y otra en la mesa—,
 * y ninguna dio un error: se vio abriendo dos pestañas y comparando.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';

const LADO = 8;
const BARCOS = [4, 3, 3, 2];          // 12 casillas de flota por bando
const CELDAS = LADO * LADO;
const BANDOS = ['azul', 'rojo'];
const TOPE = 160;

const letras = 'abcdefgh';
const nombre = (i) => `${letras[i % LADO]}${Math.floor(i / LADO) + 1}`;
const desdeNombre = (s) => {
    const m = /^([a-h])([1-8])$/.exec(String(s).toLowerCase().trim());
    return m ? (Number(m[2]) - 1) * LADO + letras.indexOf(m[1]) : -1;
};

export const flota = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);
        const flotas = {};
        for (const bando of BANDOS) flotas[bando] = { barcos: colocar(azar), recibidos: {} };
        return { semilla, turno: BANDOS[0], flotas, disparos: { azul: 0, rojo: 0 }, tiros: 0, tope: TOPE };
    },

    /**
     * ⚠️ EL SUSTRATO POR ASIENTO: DOS MARES, Y SÓLO UNO CON NIEBLA.
     *
     * Se publica una rejilla de 17×8 — ocho columnas del mar enemigo, una de
     * muro, ocho del propio— porque un tablero de la flota SON dos tableros y
     * fingir que es uno obligaría a quien pinta a saber que la mitad izquierda
     * significa otra cosa. El contrato del sustrato ya sabe decir «muro», así
     * que la separación se dice con el vocabulario que hay.
     *
     * A la izquierda, todo lo no disparado es NIEBLA. Es la mitad donde se
     * juega: cada disparo compra una casilla de información y la partida entera
     * consiste en comprarlas en buen orden. A la derecha no hay niebla ninguna:
     * tu flota la conoces. Ese contraste —el mismo cuadro, media verdad y media
     * deducción— es el género dibujado.
     */
    sustrato(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0];
        const el = BANDOS[1 - BANDOS.indexOf(yo)];
        const ancho = LADO * 2 + 1;
        const celdas = new Array(ancho * LADO).fill(0);
        const niebla = new Array(ancho * LADO).fill(0);
        const piezas = [];

        for (let i = 0; i < CELDAS; i++) {
            const x = i % LADO, y = Math.floor(i / LADO);
            const j = y * ancho + x;

            // ── Mar enemigo: sólo lo que has disparado ──
            const tiro = p.flotas[el].recibidos[i];
            if (tiro === undefined) niebla[j] = 1;
            else if (tiro === 'tocado') piezas.push({ x, y, t: 'impacto', de: 1 });

            // ── Mar propio: entero, que es tuyo ──
            const mio = p.flotas[yo].recibidos[i];
            const hayBarco = p.flotas[yo].barcos.some(b => b.celdas.includes(i));
            const X = LADO + 1 + x;
            if (mio === 'tocado') piezas.push({ x: X, y, t: 'tocado', de: 1 });
            else if (hayBarco) piezas.push({ x: X, y, t: 'barco', de: 0 });
            else if (mio === 'agua') piezas.push({ x: X, y, t: 'agua', de: 2 });
        }
        for (let y = 0; y < LADO; y++) celdas[y * ancho + LADO] = 1;   // la separación

        return {
            rejilla: { ancho, alto: LADO, celdas, niebla },
            piezas, zonas: [],
            leyenda: { impacto: 'tocado por ti', barco: 'tu barco',
                       tocado: 'te lo han tocado', agua: 'te fallaron' },
            // `~` y no `o` para el fallo encajado: `o` ya significa «destino» en
            // el vocabulario del terreno, y aunque la flota no tenga destinos, la
            // leyenda salía diciendo dos cosas con la misma letra. Un mapa que se
            // lee con la leyenda delante no puede permitirse un símbolo ambiguo.
            simbolos: { impacto: 'X', barco: 'B', tocado: 'x', agua: '~' },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const puedes = st.legal_moves.filter(m => m !== 'nueva');
        return `Flota. Juegas ${st.bando}. ${st.tocados}/${st.casillas_de_flota} tocados, `
             + `${st.hundidos}/${BARCOS.length} hundidos; te han tocado ${st.encajados}. `
             + `${st.disparos} disparos.\n`
             + `Izquierda: el mar enemigo (? sin disparar). Derecha: el tuyo.\n`
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                : `\nTe toca: ${st.turn === st.bando ? 'sí' : 'no'}. `
                  + `Puedes disparar a: ${puedes.slice(0, 12).join(', ')}`
                  + (puedes.length > 12 ? `… (${puedes.length} casillas libres)` : ''));
    },

    estado(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0];
        const el = BANDOS[1 - BANDOS.indexOf(yo)];
        const hundidos = (b) => p.flotas[b].barcos.filter(s => hundido(p, b, s)).length;
        const tocados = (b) => Object.values(p.flotas[b].recibidos).filter(v => v === 'tocado').length;

        const gane = hundidos(el) === BARCOS.length;
        const perdi = hundidos(yo) === BARCOS.length;
        const terminada = gane || perdi || p.tiros >= p.tope;

        /**
         * ⚠️ LAS JUGADAS LEGALES SON LAS CASILLAS QUE NO HAS DISPARADO, Y AQUÍ
         * ESO NO FILTRA NADA — al revés que en cripta, donde la lista tuvo que
         * llevar niebla porque decir «por aquí se puede pasar» era describir el
         * mapa. Dónde has disparado tú es información TUYA: ya la tenías. La
         * regla no es «esconder siempre», es «no decir nada que el jugador no
         * pueda saber ya», y por eso hay que pensarla juego a juego.
         */
        /**
         * ⚠️ Y SON LAS DE QUIEN MUEVE, NO LAS DE QUIEN MIRA. Lo destapó el
         * verificador rechazando la segunda jugada de toda partida: `estado(p)`
         * sin asiento devolvía siempre las casillas libres del asiento 0, así
         * que en el turno del rojo la lista describía el mar equivocado y la
         * re-simulación —que es como se comprueba un recibo— daba ilegal algo
         * que el juego había aceptado.
         *
         * La distinción es la del ajedrez: el tablero se ve desde tu lado, pero
         * las jugadas legales son las del que tiene el turno. Y aquí no filtra
         * nada: dónde ha disparado el rival ya lo sabes, porque los tiros caen
         * en tu propio mar y los estás viendo.
         */
        const objetivo = BANDOS[1 - BANDOS.indexOf(p.turno)];
        const libres = [];
        for (let i = 0; i < CELDAS; i++) {
            if (p.flotas[objetivo].recibidos[i] === undefined) libres.push(nombre(i));
        }
        const legales = terminada ? ['nueva'] : libres;

        return {
            juego: 'flota',
            bando: yo,
            turn: p.turno,
            tocados: tocados(el),
            hundidos: hundidos(el),
            encajados: tocados(yo),
            hundidos_propios: hundidos(yo),
            casillas_de_flota: BARCOS.reduce((a, b) => a + b, 0),
            disparos: p.disparos[yo],
            /**
             * Con pendiente desde el primer disparo, por la lección de sokoban:
             * tocar puntúa aunque no se hunda nada, hundir puntúa mucho más, y
             * cada disparo cuesta — así que acertar PRONTO vale más que acertar.
             * Que es justo lo que separa a quien deduce de quien barre el mar.
             */
            puntos: tocados(el) * 10 + hundidos(el) * 25 + (gane ? 200 : 0) - p.disparos[yo],
            gane, desenlace: !terminada ? null
                : gane ? 'Has hundido su flota' : perdi ? 'Te han hundido la flota' : 'Tablas por tiempo',
            semilla: p.semilla,
            legal_moves: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        if (this.estado(p).is_game_over) return false;
        const i = desdeNombre(jugada);
        if (i < 0) return false;
        const yo = p.turno;
        const el = BANDOS[1 - BANDOS.indexOf(yo)];
        if (p.flotas[el].recibidos[i] !== undefined) return false;   // ya disparada

        const acierto = p.flotas[el].barcos.some(b => b.celdas.includes(i));
        p.flotas[el].recibidos[i] = acierto ? 'tocado' : 'agua';
        p.disparos[yo]++;
        p.tiros++;
        p.turno = el;      // el turno pasa siempre, también al acertar
        return true;
    },

    /**
     * El rival de la casa: CAZA Y REMATE, el algoritmo clásico.
     *
     * Mientras no hay nada tocado dispara en damero —una de cada dos casillas—
     * porque el barco más corto ocupa dos y no puede esconderse entre ellas: la
     * mitad de los disparos cubren el tablero entero. En cuanto toca algo, deja
     * de buscar y remata alrededor.
     *
     * ⚠️ Y lee EL SUSTRATO DE SU ASIENTO, no el estado. Podría mirar
     * `p.flotas` y hundir la flota enemiga en doce disparos exactos; nadie se lo
     * impide desde dentro. Un techo tramposo deja a todo agente honrado por
     * debajo sin que la tabla explique por qué. Entrando por la misma puerta que
     * una persona o un modelo, la trampa no es cuestión de disciplina: es
     * imposible.
     */
    sugerencia(p) {
        const asiento = BANDOS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const libres = st.legal_moves.filter(m => m !== 'nueva');
        if (!libres.length) return null;
        const sus = this.sustrato(p, asiento);
        const sinDisparar = new Set(libres);

        // Remate: vecinas de un impacto que sigan sin disparar.
        const impactos = sus.piezas.filter(z => z.t === 'impacto' && z.x < LADO);
        const vecinas = [];
        for (const h of impactos) {
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const x = h.x + dx, y = h.y + dy;
                if (x < 0 || y < 0 || x >= LADO || y >= LADO) continue;
                const n = nombre(y * LADO + x);
                if (sinDisparar.has(n)) vecinas.push({ n, alineada: impactos.some(o => o !== h
                    && (dy === 0 ? o.y === h.y : o.x === h.x)) });
            }
        }
        // Se prefiere seguir la línea ya insinuada: dos tocados en fila cantan
        // la orientación del barco, y probar de lado es tirar un disparo.
        if (vecinas.length) return (vecinas.find(v => v.alineada) ?? vecinas[0]).n;

        // Caza: damero. Ninguna casilla del damero puede alojar un barco entero
        // sin tocar otra, así que basta la mitad del mar para encontrarlos todos.
        const damero = libres.filter(m => {
            const i = desdeNombre(m);
            return ((i % LADO) + Math.floor(i / LADO)) % 2 === 0;
        });
        return (damero.length ? damero : libres)[0];
    },

    deshacer() { return false; },
};

/** ¿Están tocadas todas las casillas de este barco? */
const hundido = (p, bando, barco) =>
    barco.celdas.every(i => p.flotas[bando].recibidos[i] === 'tocado');

/**
 * Coloca la flota. Determinista con la semilla, y con salida de emergencia:
 * si tras muchos intentos un barco no cabe, se busca hueco por barrido. Un
 * generador que puede quedarse colgado convierte una partida en un cuelgue, y
 * un banco de pruebas que a veces no arranca no mide nada.
 */
function colocar(azar) {
    const ocupadas = new Set();
    const barcos = [];
    for (const largo of BARCOS) {
        let puesto = null;
        for (let intento = 0; intento < 200 && !puesto; intento++) {
            const horizontal = azar() < 0.5;
            const x = Math.floor(azar() * (horizontal ? LADO - largo + 1 : LADO));
            const y = Math.floor(azar() * (horizontal ? LADO : LADO - largo + 1));
            const celdas = Array.from({ length: largo }, (_, k) =>
                (y + (horizontal ? 0 : k)) * LADO + x + (horizontal ? k : 0));
            if (celdas.every(i => !ocupadas.has(i))) puesto = celdas;
        }
        if (!puesto) {
            for (let i = 0; i < CELDAS - largo && !puesto; i++) {
                const celdas = Array.from({ length: largo }, (_, k) => i + k);
                if (Math.floor(i / LADO) === Math.floor((i + largo - 1) / LADO)
                    && celdas.every(c => !ocupadas.has(c))) puesto = celdas;
            }
        }
        puesto.forEach(i => ocupadas.add(i));
        barcos.push({ largo, celdas: puesto });
    }
    return barcos;
}
