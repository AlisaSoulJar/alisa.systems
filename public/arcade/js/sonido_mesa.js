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

        backend.move = async function (a) {
            const r = await original.apply(this, arguments);
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
