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

import { sustratoDe } from './sustrato.js';

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
            /**
             * Quién hizo cada una. Va DESPUÉS de `jugadas` y en su propio campo para
             * que quede claro que no forma parte de lo que se verifica: el recibo se
             * re-simula con `{juego, semilla, jugadas}` y nada más. Esto es para
             * poder CONTAR la partida, no para probarla.
             */
            autores: [...(g.autores ?? [])],
            /**
             * ⚠️ LAS NORMAS, SI EL JUEGO TIENE NORMAS VARIABLES.
             *
             * Damas es el primero: `damaVuela` y `peonComeAtras`. Con una variable
             * de por medio, `{juego, semilla, jugadas}` deja de identificar una
             * partida — la misma lista es legal con unas normas e ilegal con otras.
             * Medido: sin esto, tres de cada cuatro partidas cruzadas se validaban
             * con normas ajenas, y el verificador daba por buena una partida que
             * nunca ocurrió así.
             *
             * Va aquí y no en el llamador: el recibo tiene que bastarse solo, que es
             * toda su gracia. Los juegos que no publican `normas` no llevan el campo
             * y nada cambia para ellos.
             */
            ...(estado.normas ? { normas: estado.normas } : {}),
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

    /**
     * La matriz plana de la partida en curso — nativa si el juego la publica,
     * derivada del estado si no.
     *
     * ⚠️ POR QUÉ ESTO VIVE AQUÍ Y NO EN CADA PÁGINA.
     *
     * Elegir entre las dos vías parece trivial y ya se ha fallado dos veces en un
     * mismo día:
     *
     *   · la mesa de cartas llamaba a `reglas.sustrato(p)` pasándole lo que
     *     devuelve `partida()` — que NO es la partida, es el recibo
     *     `{juego, semilla, jugadas}`. No rompía nada sólo porque ninguno de los
     *     diez juegos de cartas publica sustrato nativo;
     *   · y la sala nueva usaba `sustratoDe(juego, estado)` para los treinta, que
     *     sólo DERIVA: los once juegos con sustrato propio salían vacíos. Cripta
     *     apareció como una mesa sin nada encima, con sus jugadas legales
     *     perfectamente listadas al lado.
     *
     * Los dos fallos son el mismo: el que dibuja no tiene por qué saber cuál de
     * las dos vías toca, y si tiene que saberlo, se equivocará. Aquí sí se sabe,
     * porque aquí están la partida viva y las reglas.
     *
     * @param {string} juegoId
     * @param {number} [asiento] desde qué silla se mira. En los juegos de
     *        información oculta decide QUÉ se ve, así que no es cosmético.
     */
    sustrato(juegoId, asiento = 0) {
        const reglas = this.reglas.get(juegoId);
        if (!reglas) return null;
        if (!this.partidas.has(juegoId)) this.reset(juegoId);
        const partida = this.partidas.get(juegoId);
        /**
         * ⚠️ AQUÍ SE LEE `reglas.estado()` EN CRUDO, NO `this.state()`.
         *
         * Y por eso el `patron` que mezcla `state()` NO llegaba: porté el go, dejé
         * la línea puesta, y el tablero seguía saliendo con damero. El dato estaba
         * bien declarado en las reglas, bien copiado en `state()`, y este camino
         * —que es el que usa el pintor— sencillamente no pasa por ahí.
         *
         * Se pasa a mano y no se cambia la llamada a `this.state()`, que añade
         * `fuente` y `conexion` y ensuciaría el sustrato con datos de conexión.
         */
        /**
         * ⚠️ Y LO DECLARADO SE AÑADE POR LOS DOS CAMINOS, NO SÓLO POR UNO.
         *
         * Un juego con `sustrato()` propio se saltaba la inyección de abajo. Medido
         * en reversi: declaró `COLORES: {0:'negro', 1:'blanco'}` y el sustrato salía
         * con `colores: null` — el dato bien puesto en las reglas y sin llegar al
         * pintor. Xiangqi, que deriva, sí funcionaba.
         *
         * Es la tercera vez hoy con la misma forma: un dato nuevo que viaja bien por
         * el camino que probé y no por el otro. Pasó con `patron` (`state()` sí,
         * `sustrato()` no) y con el objetivo (mesa local sí, sala compartida no).
         * Por eso se pone una sola vez, aquí arriba, y se aplica a los dos retornos.
         *
         * El sustrato propio manda si ya lo trae: quien se molesta en escribirlo sabe
         * más que esto.
         */
        const declarado = {
            ...(reglas.PATRON ? { patron: reglas.PATRON } : {}),
            ...(reglas.COLORES ? { colores: reglas.COLORES } : {}),
        };

        /**
         * ⚠️ CUARTA VEZ CON LA MISMA FORMA, Y ESTA VEZ EL AVISO ESTABA AQUÍ ARRIBA.
         *
         * `dichos` —lo que un jugador DICE: apuestas, órdenes, acusaciones— se
         * engancha en `obtenerSustrato()`, que es lo que usan las pruebas y el
         * veredicto. Este método no llama a `obtenerSustrato`: tiene su propia copia
         * de la misma bifurcación, así que por el camino de la MESA no llegaba nada.
         * Los cuatro juegos que hablan se habrían visto en las pruebas y no en la
         * pantalla, que es el modo de fallo favorito de esta casa.
         *
         * Se aplica a los dos retornos, por lo mismo que `patron` y `colores`. Y sí:
         * lo suyo sería que este método y `obtenerSustrato` fueran uno. Mientras
         * sean dos, cada dato nuevo hay que ponerlo dos veces, y alguien se olvidará.
         */
        const dichos = typeof reglas.dichos === 'function'
            ? (reglas.dichos(partida, asiento) ?? []) : [];

        if (typeof reglas.sustrato === 'function') {
            const propio = reglas.sustrato(partida, asiento);
            if (propio?.rejilla && declarado.patron && !propio.rejilla.patron) {
                propio.rejilla.patron = declarado.patron;
            }
            if (dichos.length) return { colores: declarado.colores, ...propio, dichos, derivado: false };
            return { colores: declarado.colores, ...propio, derivado: false };
        }
        const st = reglas.estado(partida, asiento);
        const derivado = sustratoDe(juegoId, { ...st, ...declarado });
        return dichos.length ? { ...derivado, dichos } : derivado;
    }

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
        /**
         * ⚠️ EL OBJETIVO DEL JUEGO VIAJA CON EL ESTADO, SI EL JUEGO LO DECLARA.
         *
         * Lo encontré jugando yo misma por la puerta de texto: nada me decía si
         * convenía puntuar alto o bajo. Lo DEDUJE viendo moverse el número después
         * de una jugada que ya creía buena — pero un agente que juega una sola
         * jugada, o uno más débil, no puede. En un banco de pruebas, no decir el
         * objetivo mide la capacidad de adivinarlo, que no es lo que queremos medir.
         *
         * Una persona abre la página, ve un tablero de damas y sabe a qué juega. Un
         * agente recibe una lista de jugadas legales y un número sin dirección.
         *
         * Va aquí, en el hub, y no dentro del `estado()` de cada juego: así el juego
         * sólo declara una frase —`OBJETIVO` en sus reglas— y no tiene que acordarse
         * de meterla en el estado cada vez. Un dato constante que hay que recordar
         * copiar es un dato que se queda viejo.
         */
        const objetivo = reglas.OBJETIVO ? { objetivo: reglas.OBJETIVO } : {};

        /**
         * ⚠️ Y LA FORMA DEL TABLERO, POR EL MISMO CAMINO Y POR LA MISMA RAZÓN.
         *
         * `PATRON` dice si el juego se juega en las CASILLAS o en las
         * INTERSECCIONES. Lo declara el juego una vez y viaja solo, igual que el
         * objetivo: un dato constante que hay que acordarse de copiar en cada
         * vuelta es un dato que se queda viejo.
         *
         * Lo necesita el pintor, que hasta ahora sólo sabía dibujar dameros —el
         * go le salía como un tablero de damas de 19x19— y no puede adivinarlo:
         * un go y un reversi publican la misma matriz de números.
         */
        const patron = reglas.PATRON ? { patron: reglas.PATRON } : {};

        // Y de qué color son las piezas, cuando el juego lo dice. En el go los
        // colores no son aspecto: son el nombre de los bandos.
        const colores = reglas.COLORES ? { colores: reglas.COLORES } : {};

        // La marca deja claro en el HUD que juegas en local, sin engañar a nadie.
        return { ...estado, ...objetivo, ...patron, ...colores,
                 fuente: 'protohub', conexion: 'LOCAL' };
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
            const quien = this._deQuienEsElTurno(reglas, partida);
            const ok = reglas.mover(partida, j);
            // La jugada de la casa TAMBIÉN se graba: la partida es la traza
            // completa, no solo lo que hizo el jugador. Si faltara, al
            // re-simularla saldría otro tablero.
            if (ok && grabacion) { grabacion.jugadas.push(j); grabacion.autores.push(quien); }
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
        const quien = this._deQuienEsElTurno(reglas, partida);
        const ok = reglas.mover(partida, jugada);
        if (ok && grabacion) { grabacion.jugadas.push(jugada); grabacion.autores.push(quien); }
        return ok ? { ok: true } : { ok: false, error: `jugada ilegal: ${jugada}` };
    }

    /**
     * ⚠️ QUIÉN HIZO CADA JUGADA. SE PREGUNTA ANTES DE MOVER, QUE ES LO ÚNICO QUE VALE.
     *
     * El recibo `{juego, semilla, jugadas}` es la traza completa y sirve para
     * re-simular, pero es MUDO: dice qué pasó y no quién lo hizo. Y eso importa por
     * un motivo concreto y documentado — en los sitios de cartas más usados hay
     * hilos enteros de gente convencida de que el reparto está amañado. Sin un
     * registro visible, perder se lee como trampa.
     *
     * Nosotros tenemos la respuesta buena —la partida se puede volver a jugar— pero
     * hasta ahora vivía en el recibo y no se veía por ningún sitio.
     *
     * El autor NO se puede deducir después: `turn` ya ha cambiado. Hay que
     * preguntarlo antes de aplicar la jugada, que es lo que hace esto.
     *
     * Va aparte de `jugadas` a propósito: el verificador re-simula desde `{juego,
     * semilla, jugadas}` y no debe depender de esto. Un dato de presentación que se
     * cuela en la prueba de validez es un dato que un día invalida un recibo bueno.
     */
    _deQuienEsElTurno(reglas, partida) {
        try { return reglas.estado(partida)?.turn ?? null; } catch { return null; }
    }

    /** Empieza de cero. Y empieza también la grabación. */
    reset(juegoId, opts = {}) {
        const reglas = this.reglas.get(juegoId);
        if (!reglas) return null;

        /**
         * ⚠️ SI NADIE TRAE SEMILLA, SE PONE UNA. NO SE DEJA EN `null`.
         *
         * Antes se anotaba `null` y la partida quedaba marcada «no reproducible»,
         * con el razonamiento de que mentir envenenaría el banco de pruebas. El
         * razonamiento es bueno y la conclusión estaba mal: no hay que elegir entre
         * mentir y perder la partida — se puede SEMBRARLA, que es honesto y además
         * la salva.
         *
         * Lo destapó un aviso de Oscar el 13-08-2026 desde `/arcade/checkers` sin
         * `?semilla=` en la dirección:
         *
         *     partida  semilla null · 30 jugadas · no se repite
         *
         * Treinta jugadas de una queja concreta, tiradas. Y así es como abre una
         * página CUALQUIER betatester: nadie escribe `?semilla=` a mano. O sea que
         * el recibo —que es la idea entera del buzón— sólo funcionaba para los
         * juegos que resulta que echan su semilla al estado, y en los demás
         * recogíamos la frase y perdíamos la partida.
         *
         * Se siembra ANTES de crear la partida y con eso se llama, así que lo
         * grabado es lo que de verdad se jugó, venga el juego de donde venga.
         */
        const semilla = opts.semilla ?? opts.seed
            ?? Math.floor(Math.random() * 0xffffffff);
        // Las reglas no se ponen de acuerdo en cómo se llama, así que las dos
        // formas — el mismo cuidado que hay en el verificador y en el gym.
        const p = reglas.nuevaPartida({ ...opts, semilla, seed: semilla });
        this.partidas.set(juegoId, p);
        this.grabaciones.set(juegoId, {
            // Si la partida declara la suya, manda ella: hay juegos que la
            // transforman por dentro y el recibo tiene que llevar la que vale.
            semilla: p?.semilla ?? semilla,
            jugadas: [],
            // Quién hizo cada una, en paralelo. No entra en el recibo que se
            // verifica: es para poder CONTAR la partida, no para probarla.
            autores: [],
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
    /**
     * ⚠️ EL HUB SE PIDE, NO SE SUPONE. ESTE DEFECTO ESTABA AL REVÉS.
     *
     * Antes, sin decir nada, esto sondeaba `http://127.0.0.1:8741` — el hub de la
     * colonia, que es OTRO proyecto. Consecuencias para cualquiera que no fuéramos
     * nosotros: un error 404 en la consola en cada carga de página, apuntando a
     * una dirección privada nuestra que en su máquina no existe y que además
     * sugiere que al motor le falta algo. No le falta nada: las reglas están en
     * el navegador y la partida se juega entera aquí.
     *
     * Y desde una página https el navegador ni siquiera deja llamar a http://, así
     * que en el sitio publicado ese sondeo NUNCA podía funcionar. Era coste y
     * ruido sin ninguna posibilidad de servir para algo.
     *
     * Ahora hay que pedirlo: `opts.hubUrl` o `window.ALISA_HUB_URL`. Conectar con
     * ALISA es una mejora —partidas compartidas, ledger, $NEURO—, no un requisito,
     * y el defecto tiene que decir eso.
     */
    const hubUrl = opts.hubUrl !== undefined
        ? opts.hubUrl
        : (typeof window !== 'undefined' ? (window.ALISA_HUB_URL ?? null) : null);
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
