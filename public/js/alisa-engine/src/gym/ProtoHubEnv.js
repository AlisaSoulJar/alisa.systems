/**
 * ProtoHubEnv — las reglas del arcade, convertidas en entorno de gym
 * ═══════════════════════════════════════════════════════════════════════════
 * La portada del sitio promete «mismas reglas para personas y para máquinas».
 * Hasta hoy eso era verdad a medias: cualquiera podía **verificar** una partida
 * ajena, pero una máquina no podía **jugar** las máquinas de la sala. Existían
 * 5 entornos con las tres puertas y ninguna de las 24 estaciones declaraba el
 * suyo. Una frase en la portada firmando un cheque que el código no pagaba.
 *
 * Esto lo paga, y no escribiendo once entornos a mano. Los dos contratos que ya
 * teníamos encajan casi sin tocarlos:
 *
 *     ProtoHub (reglas)              GymEnv (tres puertas)
 *     ─────────────────────────      ──────────────────────────────
 *     nuevaPartida({semilla})   →    reset(seed)
 *     mover(p, jugada)          →    step(action)
 *     estado(p).legal_moves     →    affordances()      ← el regalo
 *     estado(p).puntos          →    reward / getScore()
 *     estado(p).is_game_over    →    done
 *     sugerencia(p)             →    el rival, para que sea de UN agente
 *
 * `legal_moves` **ya es** la lista de affordances: el juego publica en cada
 * momento lo que se puede hacer. La puerta de lenguaje —la que sirve a un
 * agente LLM— sale gratis, y además sale EXACTA: un agente no puede alucinar
 * una jugada ilegal porque solo se le ofrecen las legales.
 *
 * LO QUE ESTO NO ES
 * -----------------
 * La observación numérica genérica es **pobre a propósito**: puntos, número de
 * jugadas legales, turno y fin. No sabe qué es un alfil. Un módulo de reglas
 * que quiera una puerta numérica de verdad implementa `observacion(p) → number[]`
 * y este adaptador la usa. Prefiero declarar la limitación a fingir que un
 * vector de cuatro números enseña ajedrez.
 *
 * LO QUE SÍ ES, Y ES LO IMPORTANTE
 * --------------------------------
 * El episodio de una máquina produce **el mismo recibo** que la partida de una
 * persona —`{juego, semilla, jugadas, puntos}`— así que lo verifica el mismo
 * `Verificador.js` y puntúa en la misma tabla. Ahí es donde la frase de la
 * portada deja de ser una frase.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { GymEnv } from './GymEnv.js';
// La normalización de puntos vive donde vive la verificación. Si el entorno y
// el verificador contaran los puntos de forma distinta, el recibo de una
// partida legítima no cuadraría — y eso pasó de verdad, ver `_puntosDe`.
import { puntuacionDe } from '../../../../arcade/js/protohub/Verificador.js';

/** Un tope para que la casa no pueda encadenar turnos hasta colgar la pestaña. */
const MAX_TURNOS_CASA = 64;

/**
 * Fabrica una clase de entorno a partir de un módulo de reglas del ProtoHub.
 *
 * @param {Object} cfg
 * @param {string} cfg.juego     identificador del juego ('poker', 'ajedrez'…)
 * @param {Object} cfg.reglas    módulo de reglas ya construido
 * @param {Object} [cfg.meta]    título, resumen, horizonte, etiquetas
 * @returns {typeof GymEnv}
 */
export function crearEnvDeProtoHub({ juego, reglas, meta = {} }) {
    return class extends GymEnv {
        static id = `alisa/${juego}-protohub-v0`;
        static observationSpace = {
            shape: [4],
            names: ['puntos', 'jugadas_legales', 'turno_es_mio', 'terminada'],
        };
        static actionSpace = { type: 'discrete', from: 'affordances()' };
        static meta = {
            title: meta.title ?? juego,
            summary: meta.summary ?? `Reglas locales de '${juego}' a través del ProtoHub.`,
            horizon: meta.horizon ?? 400,
            tags: ['protohub', 'verificable', ...(meta.tags ?? [])],
        };

        /** El juego, por si alguien quiere el recibo o las reglas crudas. */
        static juego = juego;
        static reglas = reglas;

        reset(seed = 0) {
            // Las reglas no se ponen de acuerdo en cómo llamar a la semilla, así
            // que se mandan las dos formas. Es el mismo cuidado que hubo que
            // tener en el verificador, donde `seed` vs `semilla` daba un verde
            // falso: la partida trucada salía «válida».
            this.p = reglas.nuevaPartida({ seed, semilla: seed });
            this.seed = seed;
            this.steps = 0;
            this.done = false;
            this.jugadas = [];
            this.ilegales = 0;
            const e = this._estado();
            // De quién es el turno al empezar: eso es "yo". Lo demás es la casa.
            this.turnoAgente = e.turn ?? null;
            this._puntos = this._puntosDe(e);
            return this.getObservation();
        }

        _estado() { return reglas.estado(this.p) ?? {}; }

        /**
         * La puntuación. La normalización **la hace el verificador**, no yo.
         *
         * ⚠️ AQUÍ METÍ LA PATA Y CASI NO SE VE. Escribí mi propia versión de
         * esto —`Number(e.puntos ?? e.score) || 0`— sin mirar que
         * `Verificador.js` ya tenía `puntuacionDe()`. Con `score: {black, white}`
         * mi versión hacía `Number(objeto)` → `NaN` → **0**, así que go, reversi
         * y mancala emitían recibos que decían «0 puntos» mientras el servidor,
         * al re-simular la misma partida, sacaba 219,5. Tres partidas legítimas
         * **rechazadas por el verificador**, que es el peor fallo imaginable en
         * un banco de pruebas cuyo argumento entero es que verifica bien.
         *
         * Lo grave no es el `NaN`: es haber reimplementado algo que ya existía,
         * justo el día que escribo que la fuerza de esto es tener un solo
         * fichero de reglas.
         *
         * Lo que sí es mío: si el juego no lleva marcador —el ajedrez no— se usa
         * el RESULTADO (`1-0`, `0-1`, `1/2-1/2`) como puntuación, que además es
         * comparable entre juegos. El agente siempre mueve primero, así que
         * `1-0` es su victoria.
         */
        _puntosDe(e) {
            const directo = puntuacionDe(e);
            if (directo !== 0) return directo;
            // `puntuacionDe` devuelve 0 tanto para «empate» como para «este juego
            // no lleva marcador». Sólo en el segundo caso miramos el resultado.
            if (typeof e.score === 'number' || typeof e.puntos === 'number'
                || (e.score && typeof e.score === 'object')) return 0;

            const res = e.result ?? e.resultado ?? null;
            if (res === '1-0') return 1;
            if (res === '0-1') return -1;
            if (res && String(res).startsWith('1/2')) return 0;

            const ganador = e.winner ?? e.ganador ?? null;
            if (ganador) {
                if (/draw|tabla|empate/i.test(String(ganador))) return 0;
                return String(ganador) === String(this.turnoAgente) ? 1 : -1;
            }
            return 0;
        }

        /** ¿Le toca a la casa? Solo tiene sentido si el juego declara turnos. */
        _tocaLaCasa(e) {
            return this.turnoAgente !== null && e.turn !== undefined
                && e.turn !== this.turnoAgente && !e.is_game_over;
        }

        step(action) {
            if (this.done) {
                return { obs: this.getObservation(), reward: 0, done: true,
                         info: { error: 'la partida ya terminó' } };
            }
            const antes = this._puntos;
            const jugada = (action && action.jugada !== undefined) ? action.jugada : action;

            if (!reglas.mover(this.p, jugada)) {
                // Una jugada ilegal CONSUME un paso y se cuenta. No se premia ni
                // se castiga: la política que dispara a ciegas se queda sin
                // horizonte, que ya es castigo suficiente y no inventa una escala
                // de penalizaciones que luego habría que justificar.
                this.steps++;
                this.ilegales++;
                return { obs: this.getObservation(), reward: 0, done: this.done,
                         info: { ilegal: String(jugada) } };
            }
            this.jugadas.push(jugada);
            this.steps++;

            // Que responda la casa, si el juego tiene turnos y trae rival. Sin
            // esto un agente jugaría al ajedrez contra sí mismo y la puntuación
            // no significaría nada.
            let turnosCasa = 0;
            let e = this._estado();
            while (reglas.sugerencia && this._tocaLaCasa(e) && turnosCasa < MAX_TURNOS_CASA) {
                const j = reglas.sugerencia(this.p);
                if (!j || !reglas.mover(this.p, j)) break;
                // La jugada de la casa TAMBIÉN entra en el recibo: si faltara, al
                // re-simular la partida saldría otro tablero.
                this.jugadas.push(j);
                turnosCasa++;
                e = this._estado();
            }

            const ahora = this._puntosDe(e);
            this._puntos = ahora;
            this.done = !!e.is_game_over;
            this._lastScore = ahora;
            return {
                obs: this.getObservation(),
                reward: ahora - antes,
                done: this.done,
                info: { turnosCasa, jugadas: this.jugadas.length },
            };
        }

        getObservation() {
            // Si las reglas saben describirse en números, mandan ellas.
            if (reglas.observacion) return reglas.observacion(this.p);
            const e = this._estado();
            return [
                this._puntosDe(e),
                (e.legal_moves ?? []).length,
                this.turnoAgente === null || e.turn === this.turnoAgente ? 1 : 0,
                e.is_game_over ? 1 : 0,
            ];
        }

        describe() {
            if (reglas.describir) return reglas.describir(this.p);
            const e = this._estado();
            const puedes = (e.legal_moves ?? []).slice(0, 12).join(', ');
            return `${ProtoHubEnvMeta(juego)}. Puntos: ${this._puntosDe(e)}.`
                 + ` Turno: ${e.turn ?? 'único'}.`
                 + (e.is_game_over ? ' La partida ha terminado.'
                                   : ` Puedes: ${puedes || '(nada)'}.`);
        }

        affordances() {
            const e = this._estado();
            // Aquí no hay traducción que hacer: lo que el juego declara legal es
            // exactamente lo que se puede pedir.
            return (e.legal_moves ?? []).map(j => ({
                verb: String(j),
                args: {},
                label: String(j),
                action: j,
            }));
        }

        getScore() {
            const e = this._estado();
            return {
                score: this._puntosDe(e),
                metrics: {
                    jugadas: this.jugadas.length,
                    ilegales: this.ilegales,
                    terminada: !!e.is_game_over,
                },
            };
        }

        /**
         * EL RECIBO. Misma forma que la partida de una persona, así que lo
         * verifica el mismo `Verificador.js` y puntúa en la misma tabla.
         *
         * Comprobado con partidas de máquina: blackjack, póker, ajedrez y damas
         * salen `valida: true`, y a las cuatro se les caza inflarse los puntos.
         *
         * ⚠️ MATIZ, porque «cazamos al que cambia la semilla» no es cierto en
         * todos: en **ajedrez y damas cambiar la semilla no invalida nada**, y
         * está bien que así sea — son deterministas, la semilla no interviene en
         * la partida. Ahí lo que autentica es la secuencia de jugadas, no la
         * semilla. En blackjack y póker sí, porque la semilla ES el mazo: con
         * otra, la décima jugada se vuelve ilegal y salta.
         */
        partida() {
            const e = this._estado();
            return {
                juego,
                semilla: this.seed,
                jugadas: [...this.jugadas],
                puntos: this._puntosDe(e),
                terminada: !!e.is_game_over,
                reproducible: true,
            };
        }
    };
}

/** Nombre legible sin depender de que el módulo lo declare. */
function ProtoHubEnvMeta(juego) {
    return juego.charAt(0).toUpperCase() + juego.slice(1);
}
