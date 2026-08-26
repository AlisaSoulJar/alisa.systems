/**
 * InteractionLabSystem.js — EL NÚCLEO DE ¡SOBREVIVE! 1, SIN PANTALLA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Posee el mundo de la cadena trófica: quién hay, dónde está y qué ha pasado.
 * No pinta, no carga modelos y no sabe que existe un navegador. Cumple
 * `GameContract`: `sustrato()`, `reset()` y `tick(dt)` — familia de tiempo
 * real, porque aquí los bichos se mueven mientras piensas.
 *
 * ⚠️ POR QUÉ SE SEPARA DE `InteractionLabEngine`, Y LO BARATO QUE ERA.
 *
 * El motor ya tenía las reglas y el estado separados del dibujo: todas las
 * llamadas a la fábrica van detrás de `if (this.factory)`, así que sin escena
 * ya funcionaba. Lo único que lo ataba al navegador eran DOS IMPORTS de la
 * primera línea… y uno de ellos, `THREE`, no se usaba **ni una sola vez**.
 *
 * O sea que esta etapa no podía medirse en el banco por un import muerto.
 *
 * Es la misma forma que `RaccoonSpaceCore`, que ya sostiene tres etapas: un
 * núcleo headless con el mundo dentro, y encima las vistas que importan three.
 * Aquí `InteractionLabEngine` pasa a ser eso — la vista.
 *
 * ⚠️ Y NO REESCRIBE LAS REGLAS: LAS COMPONE.
 * `FoodChainSystem` ya es headless y ya sabe de hambre, miedo, olfato y manada.
 * Esto es el cableado que le da un mundo y le pasa el tiempo. Componer piezas
 * pequeñas que ya existen es lo que se pedía; escribir una séptima versión de
 * algo que ya estaba es lo que este proyecto lleva semanas midiéndose.
 */
import { FoodChainSystem } from './FoodChainSystem.js';
import { mulberry32 } from '../core/DeterministicScope.js';

export class InteractionLabSystem {
    /**
     * ⚠️ SIN SEMILLA JUEGA SIEMPRE LO MISMO, Y ESO ES A PROPÓSITO.
     * Misma receta que `AsteroidsSystem`: determinista por construcción, y quien
     * quiera variedad la aporta. Antes había ocho llamadas al azar del sistema
     * repartiendo cajas, queso, ratones y zorros, así que el reparto inicial
     * cambiaba en cada partida y la etapa no podía puntuar a nadie.
     */
    constructor(config = {}) {
        this.rng = config.rng || mulberry32((config.seed ?? 42) >>> 0);
        this.arenaSize = config.arenaSize ?? 18;
        this.reglas = new FoodChainSystem({ arenaSize: this.arenaSize, rng: this.rng });

        this.allPrey = [];
        this.allPredators = [];
        this.cheeses = [];
        this.crates = [];
        this.elapsedTime = 0;
        this.running = false;
    }

    /**
     * Reparte el mundo. Devuelve lo repartido para que una vista pueda construir
     * sus mallas SIN volver a tirar del azar — si lo hiciera, el dibujo y el
     * estado hablarían de dos partidas distintas.
     *
     * ⚠️ EL ORDEN DE LAS TIRADAS ES PARTE DEL CONTRATO.
     * cajas → queso → ratones → zorros → raptores. Cambiarlo no da error: da
     * OTRA partida con la misma semilla, y entonces un recibo viejo deja de
     * poder repetirse sin que nada lo delate.
     */
    reset(config = {}) {
        const numMice = config.mice || 6;
        const numFoxes = config.foxes || 3;
        const numRaptors = config.raptors || 1;
        const numCheese = config.cheese || 8;
        const numCrates = config.crates || 6;

        const S = this.arenaSize - 2;
        const suelta = (k) => ({ x: (this.rng() - 0.5) * S * k, z: (this.rng() - 0.5) * S * k });

        this.allPrey = [];
        this.allPredators = [];

        const cratePositions = Array.from({ length: numCrates }, () => suelta(2));
        this.crates = cratePositions.map((p, i) => ({ id: `crate_${i}`, position: p }));

        const cheesePositions = Array.from({ length: numCheese }, () => suelta(2));
        this.cheeses = cheesePositions.map((p, i) => ({ id: `cheese_${i}`, position: p }));

        for (let i = 0; i < numMice; i++) {
            this.allPrey.push(this.reglas.createPreyState(`mouse_${i}`, suelta(1.5)));
        }
        for (let i = 0; i < numFoxes; i++) {
            const pos = { x: (this.rng() - 0.5) * S, z: S * 0.8 };
            this.allPredators.push(this.reglas.createPredatorState(`fox_${i}`, 'mid', pos));
        }
        for (let i = 0; i < numRaptors; i++) {
            this.allPredators.push(this.reglas.createPredatorState(
                `raptor_${i}`, 'apex', { x: 0, z: -S * 0.8 },
                { sightRange: 5.0, sprintSpeed: 3.5, smellSpeed: 1.4 }));
        }

        this.elapsedTime = 0;
        this.running = true;
        return { cratePositions, cheesePositions, agentes: this.agentes() };
    }

    /** Todo lo que se mueve, en una lista, para quien tenga que dibujarlo. */
    agentes() {
        return [...this.allPrey, ...this.allPredators];
    }

    /** Avanza el mundo `dt` segundos. Familia de tiempo real. */
    tick(dt) {
        if (!this.running) return;
        this.elapsedTime += dt;

        const vivos = this.allPredators.filter((p) => p.alive);
        const zorros = vivos.filter((p) => p.tier === 'mid');
        const raptores = vivos.filter((p) => p.tier === 'apex');
        const quesoVivo = this.cheeses.filter((c) => !c._eaten);
        const escasez = 1.0 - (quesoVivo.length / Math.max(1, this.cheeses.length));

        for (const presa of this.allPrey) {
            this.reglas.tickPrey(presa, {
                predators: vivos, cheese: quesoVivo, crates: this.crates,
            }, dt);
            this._aplicar(presa, 'cheese_id:', (id) => {
                const ch = this.cheeses.find((c) => c.id === id);
                if (ch) ch._eaten = true;
            });
        }

        for (const zorro of zorros) {
            this.reglas.tickPredator(zorro, {
                prey: this.allPrey, apex: raptores, crates: this.crates,
                allies: zorros, resourceDepletion: escasez,
            }, dt);
            this._aplicar(zorro, 'kill_target:', (id) => {
                const v = this.allPrey.find((p) => p.id === id);
                if (v) v.alive = false;
            });
        }

        for (const raptor of raptores) {
            this.reglas.tickPredator(raptor, {
                prey: zorros, apex: [], crates: this.crates,
                allies: raptores, resourceDepletion: escasez,
            }, dt);
            this._aplicar(raptor, 'kill_target:', (id) => {
                const v = this.allPredators.find((p) => p.id === id);
                if (v) v.alive = false;
            });
        }
    }

    /** Los eventos que un bicho deja escritos, aplicados al mundo. */
    _aplicar(bicho, prefijo, hacer) {
        for (const evt of (bicho.events ?? [])) {
            if (evt.startsWith(prefijo)) hacer(evt.slice(prefijo.length));
        }
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL SUSTRATO — UNA ARENA NO TIENE CASILLAS
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Mismo contrato que el resto de la casa. Sin `rejilla`: la arena es un
     * cuadrado continuo acotado en `arenaSize - 0.5`, no un tablero. Publicar
     * una cuadrícula inventada sería peor que no publicar ninguna — quien la
     * viera jugaría creyendo en ella.
     *
     * `y` del sustrato es el segundo eje del suelo, aquí `z`, igual que en las
     * demás etapas.
     *
     * ⚠️ LOS MUERTOS NO ENTRAN, PERO EL QUESO COMIDO TAMPOCO.
     * El sustrato describe lo que HAY, no lo que hubo. Un ratón muerto y un
     * queso comido son lo mismo: dejaron de estar. Que el marcador recuerde a
     * los muertos es cosa del marcador.
     */
    sustrato() {
        const piezas = [];
        const mete = (lista, t, de, extra = () => ({})) => {
            for (const o of lista) {
                piezas.push({ x: o.position.x, y: o.position.z, t, de, ...extra(o) });
            }
        };

        mete(this.allPrey.filter((p) => p.alive), 'raton', 0, (p) => ({ vida: p.hunger ?? 1 }));
        mete(this.allPredators.filter((p) => p.alive && p.tier === 'mid'), 'zorro', 1);
        mete(this.allPredators.filter((p) => p.alive && p.tier === 'apex'), 'raptor', 2);
        mete(this.cheeses.filter((c) => !c._eaten), 'queso', 3);
        mete(this.crates, 'caja', 4);

        return {
            piezas,
            zonas: [],
            limite: { forma: 'cuadrado', lado: (this.arenaSize - 0.5) * 2 },
            leyenda: {
                raton: 'un ratón', zorro: 'un zorro', raptor: 'el raptor',
                queso: 'queso sin comer', caja: 'una caja donde esconderse',
            },
            simbolos: { raton: 'r', zorro: 'z', raptor: 'R', queso: '*', caja: '#' },
        };
    }

    /** Observación por agente, para el puente de RL. Otro contrato, a propósito. */
    getObservationVector() {
        if (!this.running) return { prey: [], predators: [] };
        return {
            prey: this.allPrey.map((p) => this.reglas.getPreyObservation(
                p, { predators: this.allPredators, cheese: this.cheeses })),
            predators: this.allPredators.map((p) => this.reglas.getPredatorObservation(
                p, { prey: this.allPrey })),
        };
    }
}
