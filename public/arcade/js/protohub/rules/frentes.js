/**
 * frentes.js — el sexto género propio: SE DECIDE A LA VEZ
 * ═══════════════════════════════════════════════════════════════════════════
 * Cinco frentes y ocho rondas. Cada ronda los dos eligen un frente **sin ver
 * lo que ha elegido el otro**. Si eligen distinto, cada uno refuerza el suyo; si
 * coinciden, chocan y no avanza ninguno. Al final gana quien domine más frentes.
 *
 * ⚠️ LO QUE ROMPE ESTE JUEGO, Y POR ESO EXISTE
 * Los veinticuatro anteriores comparten un supuesto tan de fondo que no se ve:
 * **que cuando te toca, el pasado ya está decidido**. Miras el tablero, y lo que
 * hay en él es un hecho. Aquí no: cuando eliges, la mitad de la ronda —lo que
 * hace el otro— todavía no existe, y tu jugada tiene que ser buena contra lo que
 * él vaya a hacer, no contra lo que hizo.
 *
 * Eso cambia la clase de razonamiento, no su dificultad. Deja de haber una
 * jugada mejor que se pueda calcular mirando: la buena depende de que él no la
 * prevea. Es la diferencia entre el ajedrez y el penalti.
 *
 * ⚠️ Y ES MEDIBLE, QUE ES LO QUE LO HACE ÚTIL AQUÍ.
 * `matriz_generos.mjs` no pregunta si un juego «es simultáneo»: juega el mismo
 * punto con dos jugadas distintas del primero y mira si el segundo nota algo. Si
 * lo nota, no es simultáneo: es tener ventaja. Este fichero está escrito para
 * pasar esa prueba de verdad y no de boquilla — la elección se guarda en
 * `p.oculta` y no sale por `estado()` hasta que los dos han elegido.
 *
 * ⚠️ EL PASADO SÍ ES PÚBLICO, A PROPÓSITO. Una vez resuelta la ronda, quién fue
 * a dónde lo saben los dos (`historial`). Sin eso el juego sería puro azar y
 * mediría suerte; con eso, quien detecta un patrón lo explota. Ahí está la
 * habilidad, y por eso el pasado se cuenta y el presente no.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';

const FRENTES = 5, RONDAS = 8;
const BANDOS = ['azul', 'rojo'];
const letras = 'abcde';
const otro = (b) => BANDOS[1 - BANDOS.indexOf(b)];

export const frentes = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);
        // Un frente empieza con ventaja para uno y otro para el contrario: sin
        // eso las ocho rondas parten de una simetría perfecta y la partida es
        // siempre la misma. La lección de defensa, que calibró a ±0.0 por jugar
        // ciento veinte veces la misma posición.
        const tropas = { azul: new Array(FRENTES).fill(0), rojo: new Array(FRENTES).fill(0) };
        /**
         * ⚠️ TRES TROPAS DE SALIDA POR BANDO, REPARTIDAS POR LA SEMILLA.
         *
         * Con una sola de ventaja el calibrador volvió a decir `±0.0` sobre
         * **200 semillas**: separaba las políticas y jugaba doscientas veces la
         * misma partida. El motivo es estructural y vale la pena nombrarlo: este
         * juego es simétrico, y en un juego simétrico dos políticas iguales
         * empatan siempre — el resultado no lo decide la semilla sino la simetría.
         *
         * Repartir tres tropas por bando rompe la simetría desde la primera
         * ronda: hay frentes que ya están perdidos, otros en el filo y otros
         * regalados, y cuáles son cambia con cada semilla. Ahí es donde vive la
         * decisión — a cuál merece la pena ir— y sin eso no había ninguna.
         */
        for (const b of BANDOS) {
            for (let k = 0; k < 3; k++) tropas[b][Math.floor(azar() * FRENTES)]++;
        }

        return { semilla, turno: BANDOS[0], tropas,
                 oculta: { azul: null, rojo: null }, historial: [],
                 ronda: 0, choques: 0 };
    },

    /**
     * ⚠️ EL SUSTRATO NO SABE LO QUE ESTÁ ELEGIDO Y SIN RESOLVER.
     *
     * Dos ejércitos frente a frente: los tuyos crecen hacia arriba desde abajo,
     * los suyos hacia abajo desde arriba, y en medio la línea. Lo que hay en el
     * cuadro son hechos consumados; la elección de esta ronda no está ahí, ni la
     * tuya ni la suya. Si asomara, el segundo en mover jugaría otro juego.
     */
    sustrato(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0], el = otro(yo);
        const alto = RONDAS * 2 + 1, medio = RONDAS;
        const celdas = new Array(FRENTES * alto).fill(0);
        for (let x = 0; x < FRENTES; x++) celdas[medio * FRENTES + x] = 1;   // la línea

        const piezas = [];
        for (let x = 0; x < FRENTES; x++) {
            for (let k = 0; k < Math.min(RONDAS, p.tropas[yo][x]); k++) {
                piezas.push({ x, y: medio + 1 + k, t: 'mia', de: 0 });
            }
            for (let k = 0; k < Math.min(RONDAS, p.tropas[el][x]); k++) {
                piezas.push({ x, y: medio - 1 - k, t: 'suya', de: 1 });
            }
        }
        return {
            rejilla: { ancho: FRENTES, alto, celdas },
            piezas, zonas: [],
            leyenda: { mia: 'tropa tuya', suya: 'tropa suya' },
            simbolos: { mia: 'x', suya: 'o' },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const marcador = Array.from({ length: FRENTES }, (_, x) =>
            `${letras[x]}:${st.mias[x]}-${st.suyas[x]}`).join('  ');
        const previo = p.historial.slice(-3).map(h =>
            `${h.ronda}: tú ${letras[h[st.bando]]}, él ${letras[h[otro(st.bando)]]}`
            + (h.choque ? ' (choque)' : '')).join(' · ');
        return `Frentes. Eres ${st.bando}. Ronda ${st.ronda + 1} de ${RONDAS}. `
             + `Dominas ${st.frentes_tuyos}, él ${st.frentes_suyos}.\n`
             + `Marcador por frente (tuyas-suyas): ${marcador}\n`
             + `⚠ Los dos elegís A LA VEZ: no sabes lo que va a hacer él esta ronda. `
             + `Si coincidís, chocáis y no avanza ninguno.\n`
             + (previo ? `Rondas anteriores — ${previo}\n` : '')
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca elegir: ${st.legal_moves.filter(m => m !== 'nueva').join(', ')}.`);
    },

    estado(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0], el = otro(yo);
        const gano = (x) => p.tropas[yo][x] > p.tropas[el][x];
        const pierdo = (x) => p.tropas[yo][x] < p.tropas[el][x];
        const mios = [...Array(FRENTES).keys()].filter(gano).length;
        const suyos = [...Array(FRENTES).keys()].filter(pierdo).length;
        const terminada = p.ronda >= RONDAS;
        const gana = terminada && mios > suyos;

        const legales = terminada ? ['nueva'] : [...letras.slice(0, FRENTES)];

        return {
            juego: 'frentes',
            bando: yo, turn: p.turno,
            ronda: p.ronda, rondas: RONDAS,
            mias: [...p.tropas[yo]], suyas: [...p.tropas[el]],
            frentes_tuyos: mios, frentes_suyos: suyos,
            choques: p.choques,
            /**
             * ⚠️ AQUÍ NO SALE `oculta`. Es la línea que hace verdadero todo lo
             * que dice la cabecera: el estado publica el pasado y el presente
             * consumado, nunca la elección pendiente. Publicarla «sólo para el
             * dueño» tampoco valdría — el arnés pide el estado por asiento y un
             * despiste bastaría para que el segundo lo leyera. Lo que no se
             * publica no se puede filtrar.
             */
            historial: p.historial.map(h => ({ ronda: h.ronda, azul: h.azul, rojo: h.rojo, choque: h.choque })),
            // Crédito parcial: dominar frentes puntúa aunque no se gane la
            // partida, así que acercarse cuenta. Sin eso, todas las derrotas
            // valdrían igual y el banco no ordenaría a los que casi ganan.
            puntos: (mios - suyos) * 30 + (gana ? 100 : 0),
            gana,
            desenlace: !terminada ? null
                : mios > suyos ? 'Dominas más frentes'
                : mios < suyos ? 'Domina más frentes él' : 'Empate en frentes',
            semilla: p.semilla,
            legal_moves: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        if (this.estado(p).is_game_over) return false;
        const x = letras.indexOf(String(jugada).toLowerCase().trim());
        if (x < 0 || x >= FRENTES) return false;

        const quien = p.turno;
        p.oculta[quien] = x;
        p.turno = otro(quien);

        // Cuando los dos han elegido, se resuelve y ahí —y sólo ahí— se hace
        // público lo que eligió cada uno.
        if (p.oculta.azul !== null && p.oculta.rojo !== null) {
            const a = p.oculta.azul, r = p.oculta.rojo;
            const choque = a === r;
            if (choque) p.choques++;
            else { p.tropas.azul[a]++; p.tropas.rojo[r]++; }
            p.historial.push({ ronda: p.ronda + 1, azul: a, rojo: r, choque });
            p.oculta = { azul: null, rojo: null };
            p.ronda++;
            p.turno = BANDOS[0];
        }
        return true;
    },

    /**
     * El rival de la casa: ir donde más rinde y esquivar la costumbre del otro.
     *
     * Dos ideas, las dos honestas con lo que se puede saber. Primera: vale más
     * un frente que está en el filo —empatado o perdido por uno— que uno ya
     * ganado de sobra, porque ahí un refuerzo cambia el marcador. Segunda:
     * evitar el frente al que el contrario va más a menudo, porque coincidir es
     * tirar la ronda.
     *
     * ⚠️ Y USA SÓLO `historial`, que es público. Podría mirar `p.oculta` y saber
     * lo que el otro acaba de elegir: sería un techo imbatible y absurdo, porque
     * el juego consiste exactamente en no saber eso. Un rival de la casa que mira
     * la carta tapada no marca un techo, rompe el experimento.
     */
    sugerencia(p) {
        const asiento = BANDOS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;

        const suyo = st.bando === 'azul' ? 'rojo' : 'azul';
        const costumbre = new Array(FRENTES).fill(0);
        for (const h of st.historial) costumbre[h[suyo]]++;

        const valorados = legales.map(m => {
            const x = letras.indexOf(m);
            const dif = st.mias[x] - st.suyas[x];
            // Un frente perdido por uno se recupera reforzándolo; uno perdido por
            // cuatro, con ocho rondas, está fuera de alcance y es oro tirado.
            const rinde = dif === -1 ? 3 : dif === 0 ? 2 : dif === 1 ? 1 : 0;
            return { m, valor: rinde * 10 - costumbre[x] * 3 };
        }).sort((a, b) => b.valor - a.valor);

        /**
         * ⚠️ AQUÍ HAY QUE MEZCLAR, Y NO ES UN CAPRICHO: ES TEORÍA DE JUEGOS.
         *
         * La primera versión cogía el mejor frente y ya. Contra una copia de sí
         * misma eso es catastrófico y se midió: las dos políticas valoran igual,
         * eligen igual, **chocan las ocho rondas de ocho** y la partida acaba 0-0
         * sin que se mueva una tropa. Tres semillas, tres empates a cero.
         *
         * No es un defecto de la política: en un juego simultáneo **toda
         * estrategia determinista es explotable**, y contra sí misma, degenerada.
         * El penalti tirado siempre al mismo lado lo para hasta el portero malo.
         * Quien juegue bien aquí tendrá que mezclar, y el techo de la casa tiene
         * que mezclar también o no será un techo.
         *
         * Se mezcla con la SEMILLA, no con `Math.random`: la elección sigue
         * saliendo de `{juego, semilla, jugadas}` y la partida se puede volver a
         * jugar entera. Impredecible para el rival, reproducible para el
         * verificador — que son cosas distintas y aquí hacen falta las dos.
         */
        const dado = mulberry32(
            (p.semilla ^ (p.ronda * 2654435761) ^ (st.bando === 'azul' ? 0x9e37 : 0x85eb)) >>> 0)();
        const buenos = valorados.filter(v => v.valor >= valorados[0].valor - 3);
        return buenos[Math.floor(dado * buenos.length) % buenos.length].m;
    },

    deshacer() { return false; },
};
