/**
 * ProtoHub.js — el hub, dentro del navegador
 * ═══════════════════════════════════════════════════════════════════════════
 * Implementa EL MISMO CONTRATO que el hub de la colonia, sin red:
 *
 *     GET  /arcade/{juego}/state   →  protoHub.state(juego)
 *     POST /arcade/{juego}/move    →  protoHub.move(juego, accion)
 *
 * POR QUÉ EXISTE
 * --------------
 * El arcade era cliente-servidor: cada página sondeaba
 * `http://127.0.0.1:8741/arcade/{juego}/state` cada segundo. Sin ese hub —o
 * sea, para cualquiera que no sea nosotros— la partida de ajedrez se veía
 * PRECIOSA Y VACÍA: tablero 3D impecable, cero piezas, "DISCONNECTED" en rojo y
 * 28 errores por segundo en la consola con una IP privada a la vista.
 *
 * La solución NO es un "modo local" como caso especial: es implementar el mismo
 * contrato en local. Así:
 *   · los visualizadores no cambian ni una línea — hablan el mismo idioma
 *   · conectarse a ALISA es una MEJORA, no un requisito: cambias el endpoint
 *   · quien se descargue el motor juega desde el primer segundo
 *
 * CÓMO SE ELIGE
 * -------------
 * `SovereignBoardEngine` sondea el hub UNA vez. Si responde, usa el remoto
 * (partidas compartidas, ledger, $NEURO). Si no, se queda con el ProtoHub para
 * siempre y no vuelve a molestar a la red.
 *
 * AÑADIR UN JUEGO
 * ---------------
 * Registra un módulo de reglas con esta forma:
 *     { nuevaPartida(opts) → estado,
 *       estado(p) → {fen|board, turn, legal_moves, is_check, is_game_over, …},
 *       mover(p, jugada) → bool,
 *       deshacer(p) → bool }
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class ProtoHub {
    constructor() {
        /** @type {Map<string, Object>} juego → módulo de reglas */
        this.reglas = new Map();
        /** @type {Map<string, Object>} juego → partida en curso */
        this.partidas = new Map();
        /**
         * juego → { semilla, jugadas[] } — LA GRABACIÓN.
         *
         * ⚠️ Esta es la pieza que faltaba, y faltaba en el sitio menos obvio.
         * Ya teníamos `Verificador.js` (re-simula la partida de otro y caza seis
         * trampas en 0,58 ms), `Dataset.js` (355 bytes se expanden en la
         * trayectoria entera estado-acción) y `Turing.js` (humano / máquina /
         * prefiero-no-decirlo). Los tres piden lo mismo de entrada:
         *
         *     { juego, semilla, jugadas: [...], puntos }
         *
         * Y NADIE lo producía. El ProtoHub tenía la instancia y veía pasar todas
         * las jugadas, pero no guardaba ninguna: el verificador no tenía qué
         * verificar y el dataset no tenía de qué salir. Tres piezas excelentes
         * sin la costura de diez líneas que las une.
         */
        this.grabaciones = new Map();
    }

    /**
     * La partida en formato de envío. Esto es lo que se verifica, lo que se
     * publica como dataset y lo que puntúa. NO es una puntuación: es la semilla
     * y las jugadas — la puntuación se RECALCULA al re-simularla.
     *
     * `semilla: null` significa que ese juego no la declara todavía; se dice en
     * vez de inventarse una, porque una partida sin semilla no se puede repetir
     * y por tanto no debería puntuar.
     */
    partida(juegoId) {
        const g = this.grabaciones.get(juegoId);
        if (!g) return null;
        const reglas = this.reglas.get(juegoId);
        const estado = this.partidas.has(juegoId)
            ? reglas.estado(this.partidas.get(juegoId)) : {};
        return {
            juego: juegoId,
            semilla: g.semilla,
            jugadas: [...g.jugadas],
            puntos: estado.puntos ?? estado.score ?? null,
            terminada: !!estado.is_game_over,
            reproducible: g.semilla !== null && g.semilla !== undefined,
        };
    }

    /** Registra las reglas de un juego. */
    registrar(juegoId, modulo) {
        this.reglas.set(juegoId, modulo);
        return this;
    }

    /** ¿Sabemos jugar a esto sin hub? */
    soporta(juegoId) { return this.reglas.has(juegoId); }

    /** Equivalente a GET /arcade/{juego}/state */
    state(juegoId) {
        const reglas = this.reglas.get(juegoId);
        if (!reglas) {
            return {
                error: `ProtoHub no tiene reglas para '${juegoId}'`,
                soportados: [...this.reglas.keys()],
                is_game_over: true,
                legal_moves: []
            };
        }
        if (!this.partidas.has(juegoId)) this.reset(juegoId);
        const estado = reglas.estado(this.partidas.get(juegoId));
        // La marca deja claro en el HUD que juegas en local, sin engañar a nadie.
        return { ...estado, fuente: 'protohub', conexion: 'LOCAL' };
    }

    /** Equivalente a POST /arcade/{juego}/move */
    move(juegoId, accion = {}) {
        const reglas = this.reglas.get(juegoId);
        if (!reglas) return { ok: false, error: `sin reglas para '${juegoId}'` };
        if (!this.partidas.has(juegoId)) this.reset(juegoId);
        const partida = this.partidas.get(juegoId);

        const grabacion = this.grabaciones.get(juegoId);
        const tipo = accion.action ?? 'move';
        if (tipo === 'reset') { this.reset(juegoId); return { ok: true }; }
        // Deshacer NO se graba como jugada: borra la última. Una partida con un
        // `undo` dentro no se podría re-simular, y entonces no puntúa.
        if (tipo === 'undo')  {
            const ok = !!reglas.deshacer?.(partida);
            if (ok && grabacion) grabacion.jugadas.pop();
            return { ok };
        }

        // `ai_move` = que juegue la casa. El rival local es sencillo a
        // propósito: la gracia del benchmark es que quede sitio por encima.
        if (tipo === 'ai_move' || tipo === 'llm_move') {
            if (!reglas.sugerencia) {
                return { ok: false, error: `'${juegoId}' no trae rival local` };
            }
            const j = reglas.sugerencia(partida);
            if (!j) return { ok: false, error: 'no hay jugada posible' };
            const ok = reglas.mover(partida, j);
            // La jugada de la casa TAMBIÉN se graba: la partida es la traza
            // completa, no solo lo que hizo el jugador. Si faltara, al
            // re-simularla saldría otro tablero.
            if (ok && grabacion) grabacion.jugadas.push(j);
            return { ok, jugada: j };
        }

        // ⚠️ `params.action` es el hueco por el que hablan los juegos de CARTAS:
        // `SovereignCardEngine.sendMove(m)` envía `{action:'move', params:{action:m}}`,
        // mientras los de tablero mandan `params.uci`. Sin esta línea, el
        // ProtoHub recibía la jugada y contestaba "falta la jugada" — el motor
        // de cartas no podía jugar en local ni teniendo las reglas delante.
        const jugada = accion.params?.uci ?? accion.params?.action
                    ?? accion.uci ?? accion.move;
        if (!jugada) return { ok: false, error: 'falta la jugada' };

        // `nueva` no es una jugada: es el final de una partida y el principio de
        // otra. Si se grabara como jugada, la partida anterior se quedaría con
        // una acción imposible al final y no se podría re-simular. Los juegos la
        // ofrecen en `legal_moves` cuando su episodio ha terminado, para que el
        // HUD tenga un botón sin saber nada del ProtoHub.
        if (jugada === 'nueva' || jugada === 'reset') {
            this.reset(juegoId);
            return { ok: true, nueva: true };
        }
        const ok = reglas.mover(partida, jugada);
        if (ok && grabacion) grabacion.jugadas.push(jugada);
        return ok ? { ok: true } : { ok: false, error: `jugada ilegal: ${jugada}` };
    }

    /** Empieza de cero. Y empieza también la grabación. */
    reset(juegoId, opts = {}) {
        const reglas = this.reglas.get(juegoId);
        if (!reglas) return null;
        const p = reglas.nuevaPartida(opts);
        this.partidas.set(juegoId, p);
        // La semilla la declara la partida (blackjack la lleva dentro) o quien
        // llama. Si ninguna la trae, se anota `null` y la partida quedará
        // marcada como no reproducible — mentir aquí envenenaría el benchmark.
        this.grabaciones.set(juegoId, {
            semilla: p?.semilla ?? opts.semilla ?? null,
            jugadas: [],
        });
        return p;
    }
}

/**
 * Decide con quién hablar: el hub de la colonia si está, el ProtoHub si no.
 *
 * Sondea UNA sola vez. Antes se sondeaba cada segundo para siempre, así que sin
 * hub la consola se llenaba de errores hasta el infinito.
 *
 * @param {ProtoHub} protoHub
 * @param {string} juegoId
 * @param {Object} [opts]
 * @param {string|null} [opts.hubUrl] endpoint remoto; null = ni intentarlo
 * @param {number} [opts.timeoutMs=1200]
 * @returns {Promise<{tipo:'remoto'|'local', state:Function, move:Function}>}
 */
export async function elegirBackend(protoHub, juegoId, opts = {}) {
    const hubUrl = opts.hubUrl === undefined ? 'http://127.0.0.1:8741' : opts.hubUrl;
    const local = {
        tipo: 'local',
        state: async () => protoHub.state(juegoId),
        move: async (accion) => protoHub.move(juegoId, accion),
    };

    if (!hubUrl) return local;

    try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 1200);
        const res = await fetch(`${hubUrl}/arcade/${juegoId}/state`, { signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(String(res.status));
        console.log(`[ProtoHub] hub encontrado en ${hubUrl} — partida conectada.`);
        return {
            tipo: 'remoto',
            state: async () => (await fetch(`${hubUrl}/arcade/${juegoId}/state`)).json(),
            move: async (accion) => (await fetch(`${hubUrl}/arcade/${juegoId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(accion)
            })).json(),
        };
    } catch {
        if (protoHub.soporta(juegoId)) {
            console.log(`[ProtoHub] sin hub — '${juegoId}' se juega en local. Todo tuyo.`);
        } else {
            console.warn(`[ProtoHub] sin hub y sin reglas locales para '${juegoId}'.`);
        }
        return local;
    }
}
