/**
 * ChopperAquariumEnv — el primer entorno PROCEDURAL y VERIFICABLE
 * ═══════════════════════════════════════════════════════════════════════════
 * Los bancos de pruebas de agentes tienen todos el mismo talón de Aquiles: el
 * catálogo de juegos es fijo, así que en cuanto un modelo los ve durante su
 * entrenamiento la medida deja de medir. ARC-AGI-3 lo dice sin rodeos —su valor
 * es la novedad— pero fabrica sus entornos a mano, que es caro y finito.
 *
 * Aquí el mundo **sale de la semilla**:
 *
 *     reset(48291)  →  el mapache se esconde en una planta concreta,
 *                      y los 25 peces, 4 cazadores y 2 tiburones nacen
 *                      donde diga esa semilla, en cualquier máquina
 *
 * Eso da las tres propiedades a la vez, que es la casilla que no ocupa nadie:
 *
 *   · **infinito**       — 4 bytes de semilla, mundos distintos sin límite
 *   · **no memorizable** — no hay un catálogo que aprenderse
 *   · **verificable**    — el mundo Y la partida son funciones puras de la
 *                          semilla, así que se re-simulan jugada a jugada
 *
 * POR QUÉ ESTE MOTOR Y NO LA PÁGINA
 * ---------------------------------
 * El juego original (`games/chopper_terrarium.html`) ya traía sus ganchos de
 * gym —`resetEpisode(seed)`, `getObservationVector()`, un selector Humano/Agente
 * en el menú— pero atados al DOM. `ChopperAquariumEngine` es la misma
 * simulación **sin pantalla**: está escrita a propósito sin depender de three.js
 * ("Math utilities to avoid THREE.js dependency"). Se envuelve ésa.
 *
 * ⚠️ EL MOTOR NO PUNTÚA. Su `stepSimulation` devuelve `reward: 0` siempre, con
 * un comentario que dice «dummy RL reward, to be hooked manually». Así que la
 * puntuación se define AQUÍ, y se define con el objetivo del propio juego —
 * escanear plantas hasta dar con el mapache— no con un número inventado.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { GymEnv } from '../GymEnv.js';
import { ChopperAquariumEngine } from '../../world/systems/ChopperAquariumEngine.js';

/** Las nueve acciones del motor, con nombre para la puerta de lenguaje. */
const ACCIONES = [
    { i: 0, verb: 'esperar',    label: 'no tocar los mandos' },
    { i: 1, verb: 'avanzar',    label: 'empujar hacia delante' },
    { i: 2, verb: 'retroceder', label: 'empujar hacia atrás' },
    { i: 3, verb: 'izquierda',  label: 'desplazarse a la izquierda' },
    { i: 4, verb: 'derecha',    label: 'desplazarse a la derecha' },
    { i: 5, verb: 'subir',      label: 'ganar altura' },
    { i: 6, verb: 'bajar',      label: 'perder altura' },
    { i: 7, verb: 'girar_izq',  label: 'girar el morro a la izquierda' },
    { i: 8, verb: 'girar_der',  label: 'girar el morro a la derecha' },
];

const PREMIO_ENCONTRAR = 100;   // dar con el mapache
const PREMIO_PLANTA = 5;        // cada planta nueva escaneada

export class ChopperAquariumEnv extends GymEnv {
    static id = 'alisa/ChopperAquarium-v0';
    /** El nucleo, expuesto: es por donde se llega a la `familia` del cartucho. */
    static Core = ChopperAquariumEngine;
    static observationSpace = { shape: [0], names: ['combustible', 'x', 'y', 'z', '…'] };
    static actionSpace = { type: 'discrete', n: 9, names: ACCIONES.map(a => a.verb) };
    static meta = {
        title: 'Chopper Terrarium',
        summary: 'Un rascacielos dentro de un acuario. Un mapache se esconde en una '
               + 'planta que decide la semilla; el helicóptero tiene que encontrarlo '
               + 'antes de quedarse sin combustible.',
        horizon: 3000,
        tags: ['procedural', 'verificable', 'busqueda', 'ecosistema'],
    };

    constructor(opts = {}) {
        super(opts);
        this.motor = new ChopperAquariumEngine();
        this.dt = opts.dt ?? 1 / 60;
    }

    reset(seed = 0) {
        this.motor.reset(seed);
        this.seed = seed;
        this.steps = 0;
        this.done = false;
        this.jugadas = [];
        this._plantas = 0;
        this._encontrado = false;
        this._lastScore = 0;
        return this.getObservation();
    }

    /** Las plantas ya escaneadas: es el progreso real de la misión. */
    _escaneadas() {
        const s = this.motor.chopperState?.scannedFloors;
        return s ? s.size : 0;
    }

    step(action) {
        const idx = typeof action === 'number' ? action
                  : (ACCIONES.find(a => a.verb === action)?.i ?? 0);

        const antesPlantas = this._escaneadas();
        const r = this.motor.stepSimulation(idx, this.dt, true);
        this.steps++;
        this.jugadas.push(idx);

        // ⚠️ La recompensa la pone el entorno, no el motor: `stepSimulation`
        // devuelve 0 siempre. Se premia el PROGRESO de la misión —plantas
        // nuevas— y se premia mucho encontrar al mapache. Sin esto el episodio
        // no distingue a nadie: todo el mundo saca cero.
        const nuevas = this._escaneadas() - antesPlantas;
        let recompensa = nuevas * PREMIO_PLANTA;

        const objetivo = this.motor.targetFloorInfo?.index;
        if (!this._encontrado && objetivo !== undefined
            && this.motor.chopperState?.scannedFloors?.has(objetivo)) {
            this._encontrado = true;
            recompensa += PREMIO_ENCONTRAR;
        }

        this._plantas = this._escaneadas();
        this._lastScore = this._plantas * PREMIO_PLANTA
                        + (this._encontrado ? PREMIO_ENCONTRAR : 0);
        this.done = !!r.done || this._encontrado;

        return { obs: r.obs?.obs ?? r.obs, reward: recompensa, done: this.done,
                 info: { plantas: this._plantas, encontrado: this._encontrado } };
    }

    getObservation() {
        const o = this.motor.getObservationVector();
        return o?.obs ?? o ?? [];
    }

    describe() {
        const c = this.motor.chopper ?? { x: 0, y: 0, z: 0 };
        const total = this.motor.totalFloors ?? '?';
        return `Un mapache se esconde en una de las ${total} plantas del `
             + `rascacielos, dentro del acuario. Llevas ${this._plantas} `
             + `escaneadas${this._encontrado ? ' y YA LO HAS ENCONTRADO' : ''}. `
             + `El helicóptero está en (${c.x.toFixed(1)}, ${c.y.toFixed(1)}, `
             + `${c.z.toFixed(1)}).`;
    }

    affordances() {
        // Las nueve están siempre disponibles: es un helicóptero, no un turno.
        return ACCIONES.map(a => ({ verb: a.verb, args: {}, label: a.label, action: a.i }));
    }

    getScore() {
        return {
            score: this._lastScore,
            metrics: { plantas: this._plantas, encontrado: this._encontrado,
                       objetivo: this.motor.targetFloorInfo?.index ?? null },
        };
    }

    /**
     * EL RECIBO. Mismo formato que una partida de persona, y aquí con un matiz
     * que lo hace más fuerte: **la semilla no sólo baraja, construye el mundo**.
     * Re-simular esta partida reconstruye el rascacielos entero, la planta donde
     * estaba el mapache y hasta dónde nadaba cada pez.
     */
    partida() {
        return {
            juego: 'chopper_aquarium',
            semilla: this.seed,
            jugadas: [...this.jugadas],
            puntos: this._lastScore,
            terminada: this.done,
            reproducible: true,
        };
    }
}
