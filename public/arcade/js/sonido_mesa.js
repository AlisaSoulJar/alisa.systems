/**
 * sonido_mesa.js — que las cuarenta mesas suenen, desde un solo sitio
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * `public/js/sfx.js` son 37 KB de motor de sonido procedural —sesenta sonidos,
 * cuatro temas musicales, radio— escritos hace meses y usados por DOS páginas de
 * ciento once. No estaba roto ni perdido: estaba desenchufado.
 *
 * Esto lo enchufa envolviendo el `backend` que ya tienen los dos motores del
 * arcade. Por ahí pasa TODA jugada de los cuarenta juegos, en las dos formas de
 * jugar —mesa compartida y local—, así que es un punto y no cuarenta.
 *
 * ⚠️ ENVUELVE, NO TOCA AL ÁRBITRO.
 * La tentación era meter un `SFX.play` dentro de `ProtoHub.jugar`, que también es
 * un punto único. Pero el ProtoHub es el árbitro: es lo que decide si una jugada
 * vale y lo que sostiene el recibo. Este proyecto ya tiene escrito por qué no se
 * mezcla presentación con validez —«un dato de presentación que se cuela en la
 * prueba de validez es un dato que un día invalida un recibo bueno»— y un sonido
 * es presentación de la más pura.
 *
 * ⚠️ Y NO HAY LISTA DE QUÉ SUENA EN CADA JUEGO.
 * El motor de cartas pone `carta` y el de tablero `ficha`. Quién es cada uno ya
 * lo decide el sustrato —zonas sin rejilla es de cartas— y esa decisión está
 * tomada en `montarMesa.js`. Una lista paralela de cuarenta entradas es el fallo
 * que esta casa ha arreglado seis veces: se separa el día que alguien añade un
 * juego y no la toca.
 *
 * ⚠️ EL NAVEGADOR NO DEJA SONAR ANTES DE QUE TOQUEN LA PÁGINA.
 * `AudioContext` nace suspendido hasta el primer gesto del usuario, y arrancarlo
 * antes no da error: deja el contexto muerto y todo lo demás calla para siempre.
 * Por eso `init` va colgado del primer click y no de la carga.
 */
(function () {
    'use strict';

    /** Arranca el audio en el primer gesto, y sólo una vez. */
    function despertar() {
        if (despertar.hecho) return;
        despertar.hecho = true;
        try {
            window.SFX?.init?.();
            window.SFX?.autoWireUI?.();
        } catch { /* sin audio se juega igual: es adorno, no mecánica */ }
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('pointerdown', despertar, { once: true, capture: true });
        document.addEventListener('keydown', despertar, { once: true, capture: true });
    }

    /**
     * Envuelve un backend para que suene. Devuelve el mismo objeto si no hay
     * nada que envolver — una página sin `sfx.js` cargado tiene que seguir
     * funcionando exactamente igual.
     */
    window.conSonidoDeMesa = function conSonidoDeMesa(backend, sonidoDeJugada) {
        if (!backend || typeof backend.move !== 'function') return backend;

        const suena = (nombre) => { try { window.SFX?.play?.(nombre); } catch { /* nada */ } };

        // `is_game_over` pasa de false a true UNA vez, y hay que avisar UNA vez.
        // Sin este cerrojo el estado se repregunta en cada refresco y la fanfarria
        // sonaría en bucle mientras el jugador mira el tablero terminado.
        let yaSono = false;

        const original = backend.move;
        const verEstado = backend.state;

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  EL MAPA DE SONIDO DEL JUEGO — IDEA DE OSCAR
         * ═══════════════════════════════════════════════════════════════════
         *
         * Hasta hoy sonaba UN nombre para todas las jugadas: `ficha` en tablero y
         * `carta` en cartas, escritos a mano en los dos motores. O sea que se oía
         * «ocurrió una jugada», nunca QUÉ jugada. En un juego donde poner una
         * bomba y dar un paso son decisiones opuestas, eso es perder la mitad de
         * lo que el sonido podría contar.
         *
         * Ahora el juego lo puede declarar en su sustrato, igual que ya declara
         * `simbolos`, `alturas` y `leyenda`:
         *
         *     sonidos: { jugada: { bomba: 'tick', arriba: 'footstep', esperar: null } }
         *
         * ⚠️ ADITIVO: QUIEN NO DECLARA NADA SUENA EXACTAMENTE IGUAL QUE ANTES.
         *    Cuarenta juegos no tienen mapa y no tienen que enterarse de esto.
         *
         * ⚠️ Y `null` SIGNIFICA SILENCIO A PROPÓSITO, que no es lo mismo que no
         *    estar en el mapa. Esperar un turno no debería sonar a nada, y sin esa
         *    distinción la única forma de callarlo sería no declararlo — y
         *    entonces caería al genérico y sonaría igual que moverse.
         *
         * ⚠️ LO QUE ESTO TODAVÍA NO HACE, DICHO: los sonidos que causa el MUNDO al
         *    avanzar —una bomba que estalla tres turnos después— no salen de aquí,
         *    porque este envoltorio ve la jugada y no el sustrato. Para eso habría
         *    que comparar las piezas antes y después y sonar por lo que aparece.
         *    Es el siguiente paso y es más caro; esto es el barato y ya sirve.
         */
        const mapa = (typeof window !== 'undefined' ? window.SONIDOS_DEL_JUEGO : null) || null;
        const porJugada = mapa && mapa.jugada ? mapa.jugada : null;

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  EL VERBO DE LA JUGADA — POR QUÉ NO HACEN FALTA CUARENTA MAPAS
         * ═══════════════════════════════════════════════════════════════════
         *
         * Medido jugando los 41 juegos 120 plies cada uno: 17 tienen un alfabeto
         * de jugadas corto y con nombre —`arriba`, `bomba`, `nueva`— y el resto
         * parecían coordenadas. No lo eran. `descartar:H_Q` no es una coordenada:
         * es el verbo `descartar` con un complemento pegado detrás. Contando por
         * verbo salen 48 en total, y 36 de los 41 tienen al menos uno.
         *
         * Y los comparten: `nueva` lo tienen 15 juegos, las cuatro direcciones 13,
         * `jugar` 7. Así que la tabla es UNA, vive en `sonidos.json` al lado de las
         * recetas, y no hay que tocar cuarenta ficheros para que un paso suene a
         * paso.
         *
         * ⚠️ ORDEN DE PREFERENCIA, DE MÁS ESPECÍFICO A MENOS:
         *      1. el nombre exacto, si el juego lo declara     (`bomba` en mecha)
         *      2. el verbo, si el juego lo declara             (`descartar:H_Q`)
         *      3. el nombre exacto en la tabla compartida
         *      4. el verbo en la tabla compartida
         *      5. el genérico del motor — `ficha` o `carta`, como toda la vida
         *
         * ⚠️ LOS CINCO QUE NO TIENEN VERBO —ajedrez, damas, reversi, xiangqi y
         *    mancala— juegan con coordenadas puras y se quedan en el genérico. Es
         *    correcto: en el ajedrez todas las jugadas SON la misma clase de acto,
         *    y darle un sonido distinto a `e2e4` que a `d2d4` no diría nada.
         */
        const verboDe = (nombre) => {
            const i = nombre.indexOf(':');
            if (i > 0) return nombre.slice(0, i);
            const j = nombre.indexOf(' ');          // «enviar a», en defensa
            return j > 0 ? nombre.slice(0, j) : nombre;
        };

        /**
         * Devuelve `{ s }` con el sonido —que puede ser `null`, o sea silencio
         * pedido— o `undefined` si esa tabla no dice nada de esta jugada. Envolver
         * es lo que distingue «suena a nada» de «no lo sé», y sin esa distinción
         * un `null` en la tabla caería al genérico y sonaría.
         */
        const busca = (tabla, clave) =>
            (tabla && Object.hasOwn(tabla, clave)) ? { s: tabla[clave] } : undefined;

        backend.move = async function (a) {
            const r = await original.apply(this, arguments);
            const nombre = typeof a === 'string' ? a : (a && a.jugada);
            if (nombre !== undefined && nombre !== null) {
                const n = String(nombre);
                const v = verboDe(n);
                const comun = (window.SFX && window.SFX.jugadas) || null;
                const elegido = busca(porJugada, n) ?? busca(porJugada, v)
                    ?? busca(comun, n) ?? busca(comun, v);
                if (elegido) {
                    if (elegido.s) suena(elegido.s);
                    return r;
                }
            }
            suena(sonidoDeJugada);
            return r;
        };

        if (typeof verEstado === 'function') {
            backend.state = async function () {
                const st = await verEstado.apply(this, arguments);
                if (st && st.is_game_over && !yaSono) {
                    yaSono = true;
                    /**
                     * Ganar y perder no suenan igual, y saber cuál fue es más
                     * sutil de lo que parece: `result` dice el color que ganó
                     * —«black», «white», «draw»— y no si ganaste TÚ. La respuesta
                     * está en `puntos`, que desde hoy sigue al asiento en los
                     * treinta y tres juegos que lo publican. Si no hay dato, suena
                     * el neutro: mejor un final sin color que un «¡victoria!» a
                     * quien acaba de perder.
                     */
                    const p = Number(st.puntos);
                    suena(Number.isFinite(p) ? (p > 0 ? 'victory' : p < 0 ? 'game_over' : 'bell_cycle')
                        : 'bell_cycle');
                } else if (st && !st.is_game_over) {
                    yaSono = false;      // partida nueva: vuelve a poder sonar
                }
                return st;
            };
        }
        return backend;
    };
})();
