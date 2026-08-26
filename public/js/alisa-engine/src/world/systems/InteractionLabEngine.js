/**
 * InteractionLabEngine.js — LA VISTA DE ¡SOBREVIVE! 1
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * El mundo ya no vive aquí: vive en `InteractionLabSystem`, que es headless.
 * Esto es lo que lo pinta — carga los GLB, construye la arena y sincroniza las
 * mallas con el estado. Misma forma que las tres etapas del mapache, donde
 * `RaccoonSpaceCore` posee el mundo y `RaccoonCitySystem` y compañía lo dibujan.
 *
 * ⚠️ POR QUÉ SE PARTIÓ, Y LO BARATO QUE RESULTÓ SER.
 *
 * Este fichero importaba `three` y `three/addons`, así que el banco no podía
 * cargarlo y ¡Sobrevive! 1 no podía medirse. Al mirarlo de cerca:
 *
 *   · `THREE` aparecía importado y NO SE USABA NI UNA VEZ;
 *   · todas las llamadas a la fábrica ya iban detrás de `if (this.factory)`.
 *
 * O sea que las reglas y el estado ya estaban limpios y esta etapa se quedaba
 * fuera del gimnasio por un import muerto. La separación no fue un rediseño:
 * fue mover a un fichero lo que ya funcionaba sin pantalla.
 *
 * Se mantienen `allPrey`, `allPredators`, `cheeses`, `elapsedTime` y `running`
 * como accesores que delegan, porque la página los lee por su nombre para el
 * HUD. Un núcleo nuevo no debería obligar a reescribir una página que estaba
 * bien.
 */
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { InteractionLabFactory } from '../factories/InteractionLabFactory.js';
import { InteractionLabSystem } from './InteractionLabSystem.js';

export class InteractionLabEngine {
    constructor(engineCore = {}, basePath = '../', config = {}) { // default was '/colony/overworld/' (pre-reorg absolute path → 404 on every asset)
        this.engineCore = engineCore;
        this.scene = engineCore.scene;
        this.camera = engineCore.camera;
        this.basePath = basePath;

        this.nucleo = new InteractionLabSystem(config);

        this.gltfLoader = this.scene ? new GLTFLoader() : null;
        if (this.scene) {
            this.factory = new InteractionLabFactory(
                this.scene, this.camera, this.gltfLoader, this.basePath);
        }
    }

    // ── Lo que la página lee por su nombre ──────────────────────────────────
    get allPrey() { return this.nucleo.allPrey; }
    get allPredators() { return this.nucleo.allPredators; }
    get cheeses() { return this.nucleo.cheeses; }
    get crates() { return this.nucleo.crates; }
    get elapsedTime() { return this.nucleo.elapsedTime; }
    get running() { return this.nucleo.running; }
    /** `system` era `FoodChainSystem`. Sigue siéndolo, ahora dentro del núcleo. */
    get system() { return this.nucleo.reglas; }

    /**
     * Reparte el mundo y construye lo que se ve.
     *
     * ⚠️ LAS POSICIONES LAS DA EL NÚCLEO, NO SE VUELVEN A SORTEAR.
     * Si la vista tirara del azar por su cuenta, la arena dibujada y la que el
     * juego cree tener serían dos partidas distintas — y el aviso de un beta
     * mostraría un mundo que nunca existió.
     */
    boot(config) {
        if (this.nucleo.running && this.factory) this.factory.dispose();

        const { cratePositions, cheesePositions, agentes } = this.nucleo.reset(config);

        if (this.factory) {
            this.factory.buildAll({
                arenaSize: this.nucleo.arenaSize,
                crateCount: cratePositions.length,
                cheeseCount: cheesePositions.length,
                cratePositions,
                cheesePositions,
            });
            for (const a of agentes) this.factory.spawnEntity(a);
        }
    }

    /** El segundo argumento se ignora: el tiempo lo lleva el núcleo. */
    tick(dt) {
        if (!this.nucleo.running) return;
        this.nucleo.tick(dt);
        if (this.factory) {
            this.factory.syncAgents(this.nucleo.agentes(), dt, this.nucleo.elapsedTime);
        }
    }

    /** El mundo, en el idioma común. Lo publica la página para el botón de avisar. */
    sustrato() { return this.nucleo.sustrato(); }

    // For RL Bridge
    getObservationVector() { return this.nucleo.getObservationVector(); }
}
