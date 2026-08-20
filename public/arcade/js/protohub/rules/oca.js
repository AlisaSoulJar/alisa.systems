/**
 * oca.js — 63 casillas, un dado, y un tablero donde CADA CASILLA HACE ALGO
 * ═══════════════════════════════════════════════════════════════════════════
 * De la salida a la 63. Tiras un dado y avanzas. Si caes en una oca saltas a la
 * siguiente oca y vuelves a tirar; los puentes te mandan al otro puente; los
 * dados, al otro dado; la posada te para un turno; la cárcel dos; el pozo te
 * deja ahí hasta que otra ficha caiga y te releve; el laberinto te devuelve a la
 * 30; y la muerte te devuelve a la salida. Gana quien cae JUSTO en la 63 — si te
 * pasas, retrocedes lo que sobre.
 *
 * ⚠️ POR QUÉ ESTE JUEGO, Y CONTRA QUÉ VINO A PROBAR EL MOTOR
 *
 * El parchís —el otro juego de dado— sólo distingue dos clases de casilla:
 * normal y seguro. Su rejilla usa `0` y `2` y con eso lo dice todo. La oca es el
 * primer juego que necesita que el TERRENO tenga vocabulario: ocho tipos de
 * casilla, cada uno con un efecto distinto, y hay que poder ver cuál es cuál
 * **sin leer el código**.
 *
 * Ese vocabulario ya existía y está escrito en `pintar2d.js`, repetido en
 * `pintar3d.js`:
 *
 *     0 vacío  ·  1 muro  ·  2 destino  ·  más de 2, se dibuja como CUENTA
 *
 * ⚠️ Y NO ME LO INVENTO PORQUE INVENTÁRSELO YA COSTÓ UN TABLERO. La semana
 * pasada el recorrido del parchís se marcó con `1` — «aquí se pisa»— y `1` es
 * MURO: el tablero salió como un macizo de cubos oscuros. Los números decían 68
 * casillas y las 68 estaban; sólo lo vio una captura de pantalla. Aquí el
 * recorrido va con `0` (casilla llana), lo de fuera con `1` (por ahí no se
 * pasa), la meta con `2` (que es literalmente el destino) y **cada tipo de
 * casilla especial con un número mayor que 2**, que el pintor escribe encima. El
 * tablero se lee: se ve dónde está la muerte antes de caer en ella.
 *
 * ⚠️ DOS FICHAS POR JUGADOR, Y NO ES UN ADORNO: ES LA ÚNICA DECISIÓN.
 *
 * La oca clásica no tiene ni una decisión — tiras y obedeces— y un entorno donde
 * el agente no decide nada NO MIDE NADA. En este catálogo ya hay un juego así,
 * `guerra`, y está declarado CONTROL DE LABORATORIO precisamente por eso: allí
 * empatar es el resultado correcto. Un segundo control no aporta una casilla
 * nueva a la matriz de géneros; aporta una segunda forma de no medir.
 *
 * Así que aquí cada jugador lleva DOS fichas y la tirada es común: el dado dice
 * cuánto, y tú dices CUÁL. Eso convierte el tablero en el problema — con un 4 en
 * la mano, ¿mandas la ficha de cabeza a la 58 (la muerte) o quemas la tirada con
 * la rezagada? La ficha atrasada es un amortiguador, y saber cuándo gastarlo es
 * el juego. Se comprobó con números, no de palabra: la política de la casa y la
 * de «primera jugada legal» separan (ver el informe de `calibrar.mjs`).
 *
 * ⚠️ EL TOPE DE JUGADAS, Y POR QUÉ HACE FALTA UNO
 *
 * Pozo y cárcel encierran fichas, y un juego que encierra puede quedarse
 * parado para siempre sin dar un solo error — el modo de fallo de la casa: verde
 * y mintiendo. Aquí no puede pasar, y se razona: en el pozo cabe UNA ficha (la
 * que llega releva a la que estaba), y posada y cárcel son cuentas atrás. O sea
 * que cada jugador conserva siempre alguna ficha movible. Aun así hay `TOPE`:
 * el razonamiento vale hoy, y el tope vale también el día que alguien añada una
 * casilla nueva. Se publica en `estado()` como `tope_jugadas` para que no sea un
 * número escondido, y al agotarse la partida termina SIN ganador.
 *
 * ⚠️ EL AZAR SÓLO SE GASTA EN JUGADAS ACEPTADAS (la lección de `parchis.js`)
 *
 * Una partida se verifica volviéndola a jugar con `{juego, semilla, jugadas}`, y
 * la re-simulación repite sólo las jugadas ACEPTADAS. Si `mover()` tirara el
 * dado antes de rechazar algo ilegal, la partida viva consumiría un número que
 * la re-simulación no consume, los dos hilos de azar se desfasarían y el
 * verificador acabaría **rechazando partidas legítimas**. Por eso `mover()`
 * valida contra la lista legal antes de tocar nada.
 *
 * Y por lo mismo ni `estado()` ni `sugerencia()` tocan `p._rnd`. `estado()` lo
 * llama la mesa cada segundo: si consumiera azar, la partida cambiaría por
 * mirarla. `sugerencia()` mira el futuro sobre una COPIA de la partida usando la
 * misma función que juega de verdad —no una segunda implementación de las
 * reglas, que es una divergencia esperando su turno— y desempata con
 * `revuelto()`, un hash sin estado.
 *
 * ⚠️ SIMPLIFICACIONES, DECLARADAS
 *   · No está la tirada de salida privilegiada (5+4 y 6+3 al pozo de dados).
 *   · Al repetir tirada se puede mover CUALQUIERA de tus fichas, no
 *     obligatoriamente la que provocó la repetición. Con una ficha por jugador
 *     —el juego de verdad— la distinción no existe; con dos, obligar sería
 *     quitar la única decisión que tiene el juego justo en el turno más jugoso.
 *   · Una casilla especial se resuelve UNA VEZ por caída: el puente 6 te lleva
 *     al 12 y ahí se para. Encadenar sería un bucle infinito (6→12→6→…), y eso
 *     no es una simplificación sino la regla de verdad.
 *   · Gana la PRIMERA ficha que cae en la 63, no las dos. Mantiene la carrera
 *     clásica y deja la segunda ficha como recurso táctico y no como deber.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, revuelto } from './azar.js';

/** La meta. 63 es la del tablero de verdad. */
const META = 63;
/** Antes de la primera tirada la ficha no está en ninguna casilla. */
const SALIDA = 0;
/**
 * Tope de jugadas de una partida. Ver la cabecera: no debería alcanzarse nunca
 * —el pozo admite una sola ficha y las esperas son cuentas atrás— pero un juego
 * que encierra fichas no se deja sin techo. Una partida normal ronda las 80.
 */
const TOPE_JUGADAS = 500;

/**
 * Las ocas. NO se escriben a mano: van de cuatro en cuatro y de cinco en cinco
 * alternando desde la 5, que es exactamente como están repartidas en el tablero
 * impreso. Escribirlas a mano son trece números que nadie vuelve a comprobar; y
 * este proyecto ya ha arreglado seis veces el mismo fallo —una lista a mano que
 * se separa en silencio de la realidad—. La última, la 59, manda a la meta.
 */
const OCAS = (() => {
    const out = [];
    for (let c = 5, i = 0; c < META; i++) { out.push(c); c += (i % 2 ? 5 : 4); }
    return out;
})();   // → 5 9 14 18 23 27 32 36 41 45 50 54 59

/**
 * ⚠️ LA ÚNICA DECLARACIÓN DE LAS CASILLAS ESPECIALES.
 *
 * Aquí sí es legítima una lista escrita a mano: las casillas de la oca SON el
 * juego, no un dato derivable. Lo que no es legítimo es repetirla. De este
 * objeto salen las cuatro cosas que hacen falta —qué tipo hay en cada casilla,
 * qué número pinta el tablero, qué efecto tiene y qué se le cuenta a un agente
 * que no ve el tablero— y ninguna se vuelve a escribir en otro sitio.
 *
 * `codigo` NO está aquí: se deriva del orden (3, 4, 5…) porque 0, 1 y 2 ya
 * significan vacío, muro y destino en la rejilla. Poner los códigos a mano sería
 * la misma lista paralela una línea más abajo.
 */
const ESPECIALES = {
    oca:       { casillas: OCAS,     repite: true,
                 nota: 'de oca a oca: saltas a la siguiente y tiras otra vez' },
    puente:    { casillas: [6, 12],  repite: true, pareja: true,
                 nota: 'de puente a puente: vas al otro y tiras otra vez' },
    dados:     { casillas: [26, 53], repite: true, pareja: true,
                 nota: 'de dado a dado: vas al otro y tiras otra vez' },
    posada:    { casillas: [19],     espera: 1,
                 nota: 'te paras a cenar: esa ficha pierde un turno' },
    pozo:      { casillas: [31],     pozo: true,
                 nota: 'te quedas ahí hasta que otra ficha caiga y te releve' },
    laberinto: { casillas: [42],     vuelvesA: 30,
                 nota: 'te pierdes: retrocedes a la 30' },
    carcel:    { casillas: [52],     espera: 2,
                 nota: 'a la cárcel: esa ficha pierde dos turnos' },
    muerte:    { casillas: [58],     vuelvesA: SALIDA,
                 nota: 'la muerte: vuelves al principio' },
};

const TIPOS = Object.keys(ESPECIALES);
/** casilla → nombre del tipo. Derivado, no escrito. */
const TIPO_DE = new Map(TIPOS.flatMap(t => ESPECIALES[t].casillas.map(c => [c, t])));
/** nombre → número que se pinta en la rejilla. 0,1,2 están cogidos: se empieza en 3. */
const CODIGO = Object.fromEntries(TIPOS.map((t, i) => [t, i + 3]));

/**
 * El recorrido en ESPIRAL sobre 9×9, que es la forma del tablero de verdad.
 * 81 celdas: las 63 primeras son el recorrido y las 18 de dentro quedan fuera de
 * juego. Se genera dando vueltas hacia adentro en vez de escribir 63 pares de
 * coordenadas — mismo motivo que las ocas.
 */
const LADO = 9;
const CAMINO = (() => {
    const out = [];
    let x0 = 0, y0 = 0, x1 = LADO - 1, y1 = LADO - 1;
    while (x0 <= x1 && y0 <= y1) {
        for (let x = x0; x <= x1; x++) out.push([x, y0]);
        for (let y = y0 + 1; y <= y1; y++) out.push([x1, y]);
        if (y0 < y1) for (let x = x1 - 1; x >= x0; x--) out.push([x, y1]);
        if (x0 < x1) for (let y = y1 - 1; y > y0; y--) out.push([x0, y]);
        x0++; y0++; x1--; y1--;
    }
    return out;
})();

/** La leyenda de la rejilla, sacada del mismo sitio que los códigos. */
const LEYENDA = {
    0: 'casilla', 1: 'fuera del recorrido', 2: 'meta (63)',
    ...Object.fromEntries(TIPOS.map(t => [CODIGO[t], t])),
};

export function crearOca({ jugadores = 2, fichas = 2 } = {}) {

    /** Una ficha parada no se puede mover: en el pozo, en la posada o presa. */
    const parada = (f) => f.pozo || f.espera > 0;

    /** Índices de las fichas del jugador `c` que hoy pueden moverse. */
    const movibles = (p, c) => p.fichas
        .map((f, i) => ({ f, i }))
        .filter(x => x.f.color === c && !parada(x.f))
        .map(x => x.i);

    function legales(p) {
        if (p.fin) return [];
        const libres = movibles(p, p.turno);
        // Sin nada que mover ni siquiera se tira: gastar una tirada que no puede
        // usarse enturbiaría el hilo de azar sin necesidad, y además hay que
        // DECIR que se pasa — un juego que se queda sin jugadas legales y sin
        // terminar «se muere de pie», y eso lo caza `prueba_reglas.mjs`.
        if (!libres.length) return ['pasar'];
        if (p.dado === null) return ['tirar'];
        return libres.map(i => `mover:${i}`);
    }

    /**
     * Resuelve la casilla en la que ACABA de caer una ficha. Una sola vez —ver
     * la cabecera: encadenar puentes es un bucle infinito—.
     * @returns {boolean} si el jugador vuelve a tirar
     */
    function resolverCasilla(p, f) {
        const tipo = TIPO_DE.get(f.casilla);
        if (!tipo) return false;
        const e = ESPECIALES[tipo];

        if (tipo === 'oca') {
            const k = OCAS.indexOf(f.casilla);
            // La última oca (59) no tiene siguiente: manda a la meta, y eso gana
            // la partida. Es la regla del tablero impreso, no un atajo.
            f.casilla = k + 1 < OCAS.length ? OCAS[k + 1] : META;
            return true;
        }
        if (e.pareja) {
            const [a, b] = e.casillas;
            f.casilla = f.casilla === a ? b : a;
            return true;
        }
        if (e.pozo) {
            // La que llega RELEVA a la que estaba, que se queda libre en la 31.
            // Así en el pozo hay como mucho una ficha, que es lo que garantiza
            // que nadie se quede encerrado para siempre.
            for (const otra of p.fichas) otra.pozo = false;
            f.pozo = true;
            return false;
        }
        if (Number.isFinite(e.vuelvesA)) { f.casilla = e.vuelvesA; return false; }
        if (Number.isFinite(e.espera))   { f.espera = e.espera;    return false; }
        return false;
    }

    /**
     * Mueve la ficha `i` con el dado YA tirado y resuelve dónde cae.
     *
     * ⚠️ NO CONSUME AZAR, y eso es lo que hace que `sugerencia()` pueda mirar el
     * futuro llamando a esta misma función sobre una copia de la partida. La
     * alternativa —un evaluador que reimplementa «dónde caería»— es una segunda
     * copia de las reglas, y las copias de las reglas se separan: es el fallo
     * que este repositorio ha arreglado seis veces en un día con otras listas.
     */
    function aplicarTirada(p, i) {
        const f = p.fichas[i];
        let destino = f.casilla + p.dado;
        // Si te pasas de la 63, retrocedes lo que sobre. 63+3 → 60.
        if (destino > META) destino = META * 2 - destino;
        f.casilla = destino;

        if (destino === META) return { repite: false, gana: true };
        const repite = resolverCasilla(p, f);
        // La oca de la 59 deja la ficha en la meta: eso también gana.
        return { repite, gana: f.casilla === META };
    }

    /**
     * Cierra el turno y pasa el dado.
     *
     * ⚠️ LA FICHA QUE ACABA DE CAER NO DESCUENTA HOY. Sin esta excepción, caer
     * en la posada con `espera = 1` se descontaba en el mismo turno de la caída
     * y la ficha salía libre a la siguiente: «pierdes un turno» que no hacía
     * perder ninguno. Un castigo que existe en el estado y no en la partida.
     */
    function finDeTurno(p, movida) {
        for (const f of p.fichas) {
            if (f.color !== p.turno || f === movida) continue;
            if (f.espera > 0) f.espera--;
        }
        p.dado = null;
        p.turno = (p.turno + 1) % jugadores;
    }

    /** Copia jugable de la partida, sin azar y sin historial. Para mirar sin tocar. */
    const copiar = (p) => ({ ...p, fichas: p.fichas.map(f => ({ ...f })),
                             jugadas: [], _rnd: null });

    /** Lo más lejos que ha llegado un color, y cuánto arrastra el resto. */
    const avance = (p, c) => {
        const cs = p.fichas.filter(f => f.color === c)
                           .map(f => f.casilla).sort((a, b) => b - a);
        // La cabeza manda —la carrera la gana una ficha— pero la rezagada cuenta
        // algo: dos partidas que acaban con la cabeza en la 40 no son iguales si
        // una tiene la otra ficha en la 38 y la otra en la salida.
        return cs[0] * 10 + cs.slice(1).reduce((a, b) => a + b, 0) * 2;
    };

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: llegar el primero a la casilla final; algunas casillas te adelantan y otras te frenan.',
        // CUÁNTAS SILLAS TIENE LA MESA. Sale de `jugadores` (por defecto 2).
        // Se cruza contra `marcador` en `estado()`.
        ASIENTOS: jugadores,
        nombre: 'oca',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const p = {
                semilla, jugadores, fichas: [],
                turno: 0, dado: null, jugadas: [], fin: false,
                ganador: null, motivo: null, tiradas: 0,
                // El azar vive DENTRO de la partida y se siembra de la semilla:
                // es lo que hace que `{juego, semilla, jugadas}` se pueda re-jugar.
                _rnd: mulberry32(semilla),
            };
            for (let c = 0; c < jugadores; c++) {
                for (let k = 0; k < fichas; k++) {
                    p.fichas.push({ color: c, n: k, casilla: SALIDA, espera: 0, pozo: false });
                }
            }
            return p;
        },

        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < jugadores ? asiento : 0;

            /**
             * ⚠️ CRÉDITO PARCIAL: SE PUNTÚA LO LEJOS QUE HAS LLEGADO, no sólo si
             * ganaste. Si sólo contara ganar, dos agentes flojos empatarían a
             * cero y la tabla no ordenaría nada — el aviso está escrito en
             * `sokoban.js` y en `parchis.js`, y aquí muerde más todavía porque en
             * una oca a dos se pierde la mitad de las veces por definición.
             */
            const puntos = p.fin && p.ganador === yo
                ? 800 + avance(p, yo)
                : avance(p, yo);
            // ⚠️ MISMA FÓRMULA, UNA POR ASIENTO. Como mucho un color gana —o
            // ninguno, si se agota `tope_jugadas`—, así que como mucho un `c`
            // cae en la rama de los 800. Patrón de `bazas.js`.
            const marcador = Array.from({ length: jugadores }, (_, c) =>
                p.fin && p.ganador === c ? 800 + avance(p, c) : avance(p, c));

            const foto = (f) => ({
                de: f.color, ficha: f.n, casilla: f.casilla,
                tipo: TIPO_DE.get(f.casilla) ?? (f.casilla === META ? 'meta' : null),
                espera: f.espera, pozo: f.pozo,
            });

            return {
                juego: 'oca',
                asiento: yo,
                // El dado se publica como valor Y como zona del sustrato: el
                // número para quien juega sin ver, la zona para la mesa.
                dado: p.dado,
                fase: p.dado === null ? 'tirar' : 'mover',
                fichas: p.fichas.map(foto),
                mis_fichas: p.fichas.filter(f => f.color === yo).map(foto),
                avance: Array.from({ length: jugadores }, (_, c) => avance(p, c)),
                // El tablero contado con palabras, para quien juega sin verlo.
                // Sale de `ESPECIALES`, o sea del mismo sitio que las reglas.
                casillas_especiales: Object.fromEntries(
                    TIPOS.map(t => [t, ESPECIALES[t].casillas])),
                reglas_casillas: Object.fromEntries(
                    TIPOS.map(t => [t, ESPECIALES[t].nota])),
                meta: META,
                tiradas: p.tiradas,
                // El techo, dicho en voz alta. Ver la cabecera.
                jugadas_hechas: p.jugadas.length,
                tope_jugadas: TOPE_JUGADAS,
                marcador,
                puntos,
                score: puntos,
                turn: p.turno === yo ? 'player' : `cpu${p.turno}`,
                semilla: p.semilla,
                legal_moves: legales(p),
                is_game_over: p.fin,
                desenlace: !p.fin ? null
                    : p.ganador === null ? `tablas (${p.motivo})` : `ganó ${p.ganador}`,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset' || p.fin) return false;
            // ⚠️ Contra la lista legal ANTES de tocar nada. Ver la cabecera:
            // gastar azar en una jugada que luego se rechaza desincroniza la
            // re-simulación y convierte a un jugador honesto en tramposo a ojos
            // del verificador.
            if (!legales(p).includes(j)) return false;

            if (j === 'tirar') {
                p.dado = 1 + Math.floor(p._rnd() * 6);
                p.tiradas++;
            } else if (j === 'pasar') {
                finDeTurno(p, null);
            } else {
                const i = Number(j.split(':')[1]);
                const f = p.fichas[i];
                const { repite, gana } = aplicarTirada(p, i);
                if (gana) { p.fin = true; p.ganador = f.color; p.motivo = 'meta'; }
                // «Y tiro porque me toca»: se conserva el turno y hay que volver
                // a tirar. Las esperas de mis otras fichas no descuentan, porque
                // el turno no ha terminado.
                else if (repite) p.dado = null;
                else finDeTurno(p, f);
            }

            p.jugadas.push(j);
            if (!p.fin && p.jugadas.length >= TOPE_JUGADAS) {
                p.fin = true; p.ganador = null; p.motivo = 'tope de jugadas';
            }
            return true;
        },

        /**
         * El rival de la casa. Mira a dónde iría cada ficha JUGÁNDOLO de verdad
         * sobre una copia, y prefiere ganar, encadenar ocas y no morirse.
         *
         * Deja techo a propósito: no cuenta lo que la tirada deja a tiro del
         * rival ni reparte el riesgo entre las dos fichas mirando más de un
         * turno, que es donde de verdad está el juego.
         *
         * ⚠️ NO CONSUME `p._rnd`: `aplicarTirada` no gasta azar y además corre
         * sobre `copiar(p)`. Para desempatar, un hash sin estado de la semilla y
         * el número de jugada, como `frentes.js` y `parchis.js`.
         */
        sugerencia(p) {
            const opciones = legales(p);
            if (!opciones.length) return null;
            if (opciones.length === 1) return opciones[0];

            const valor = (m) => {
                const i = Number(m.split(':')[1]);
                const q = copiar(p);
                const { repite, gana } = aplicarTirada(q, i);
                if (gana) return 1e6;
                const f = q.fichas[i];
                const tipo = TIPO_DE.get(f.casilla);
                // Avanzar vale; volver a tirar vale más que la casilla que te dé;
                // y quedarse parado se paga en turnos, que es lo único que hay.
                return f.casilla
                     + (repite ? 40 : 0)
                     + (tipo === 'pozo' ? -260 : 0)
                     + (tipo === 'carcel' ? -70 : 0)
                     + (tipo === 'posada' ? -30 : 0)
                     // La muerte y el laberinto ya se han pagado en `f.casilla`
                     // (te ha devuelto a la salida o a la 30): restar otra vez
                     // sería cobrar dos veces el mismo castigo. Lo que sí cuenta
                     // es lo que se ha PERDIDO, y eso lo dice la casilla de la
                     // que venía.
                     - Math.max(0, p.fichas[i].casilla - f.casilla) * 0.5;
            };
            const mezcla = revuelto(p.semilla ^ p.jugadas.length);
            return [...opciones]
                .sort((a, b) => valor(b) - valor(a) || ((mezcla % 2) ? 1 : -1))[0];
        },

        /**
         * ⚠️ SUSTRATO NATIVO, Y AQUÍ ESTÁ LO QUE ESTE JUEGO VINO A PROBAR: LA
         * REJILLA CON VOCABULARIO.
         *
         * El parchís sólo tenía que distinguir pista de seguro y le bastaron el
         * `0` y el `2`. Aquí hay ocho tipos de casilla y el tablero tiene que
         * decir cuál es cuál, así que se usa el tramo `>2` del contrato —«se
         * dibuja como CUENTA»— y cada especial sale con su número escrito
         * encima. La correspondencia número↔tipo va en `leyenda`, sacada del
         * mismo objeto `ESPECIALES` que gobierna las reglas: si mañana entra una
         * casilla nueva, el tablero la pinta sin tocar esta función.
         */
        sustrato(p) {
            // El asiento no entra en la firma a propósito: en la oca no hay
            // información oculta —el tablero, las fichas y el dado los ve todo el
            // mundo— así que las cuatro sillas verían exactamente lo mismo.
            // Aceptar un `asiento` que no cambia nada invitaría a creer que sí.

            // Todo muro, y luego se abre el recorrido. Lo de dentro de la
            // espiral no es «suelo sin usar»: por ahí no se pasa, y decirlo con
            // `1` es exactamente lo que `1` significa.
            const celdas = new Array(LADO * LADO).fill(1);
            for (let n = 1; n <= META; n++) {
                const [x, y] = CAMINO[n - 1];
                const tipo = TIPO_DE.get(n);
                celdas[y * LADO + x] = n === META ? 2 : (tipo ? CODIGO[tipo] : 0);
            }

            const piezas = [];
            const enSalida = [];
            const parados = [];
            p.fichas.forEach((f) => {
                if (f.casilla === SALIDA) { enSalida.push(f); return; }
                const [x, y] = CAMINO[f.casilla - 1];
                // `f1`/`f2` en vez de `ficha`: `pintar2d.js` escribe la inicial
                // encima del disco cuando el nombre cabe en dos letras, y con dos
                // fichas por color hay que poder decir CUÁL es cuál — que es la
                // única decisión del juego.
                piezas.push({ x, y, t: `f${f.n + 1}`, de: f.color });
                if (parada(f)) parados.push(f);
            });

            const zonas = [];
            if (p.dado !== null) {
                zonas.push({ id: 'dado', de: null, items: [`d6_${p.dado}`], ocultas: 0 });
            }
            /**
             * ⚠️ LAS FICHAS QUE AÚN NO HAN ENTRADO, QUE SI NO NO SE VEN.
             *
             * Es la lección literal de `parchis.js`: al empezar están todas
             * fuera, así que `piezas` salía VACÍO y el tablero arrancaba sin
             * nada encima — la partida parecía no haber repartido. Una ficha en
             * la salida no está en ninguna casilla, luego no es una PIEZA del
             * tablero: es un montón al lado, que es lo que son las zonas.
             */
            for (let c = 0; c < jugadores; c++) {
                const fuera = enSalida.filter(f => f.color === c);
                if (fuera.length) {
                    zonas.push({ id: 'salida', de: c, ocultas: 0,
                                 items: fuera.map(f => `f${f.n + 1}`) });
                }
            }
            /**
             * Y las fichas paradas, con el motivo. Es información pública que
             * decide la jugada —si tu rezagada está en el pozo, la tirada va sí
             * o sí a la de cabeza— y en el tablero no se distingue: una ficha
             * presa en la 52 se dibuja igual que una de paso.
             */
            for (let c = 0; c < jugadores; c++) {
                const míos = parados.filter(f => f.color === c);
                if (míos.length) {
                    zonas.push({ id: 'parada', de: c, ocultas: 0,
                                 items: míos.map(f => `f${f.n + 1}_${TIPO_DE.get(f.casilla) ?? 'espera'}`) });
                }
            }

            return {
                rejilla: { ancho: LADO, alto: LADO, celdas },
                piezas, zonas,
                // La leyenda es un diccionario de NOMBRES, no un trozo de estado:
                // los nombres de ficha salen de cuántas hay, no de un `f1`/`f2`
                // escrito aquí que se quedaría corto con tres.
                leyenda: { ...LEYENDA, ...Object.fromEntries(
                    Array.from({ length: fichas }, (_, k) => [`f${k + 1}`, `ficha ${k + 1}`])) },
            };
        },

        deshacer() { return false; },
    };
}
