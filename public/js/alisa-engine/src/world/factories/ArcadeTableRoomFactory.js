import * as THREE from 'three';
import { AssetManager } from '../../soma/AssetManager.js';
// was '/colony/libs/tween.js/18.6.4/tween.umd.js' (pre-reorg absolute path → 404, killed the arcade lab).
// three ships tween in its addons; resolved via the labs' importmap. Same API (Tween/Easing/update).
import * as TWEEN from 'three/addons/libs/tween.module.js';

export class ArcadeTableRoomFactory {
    /**
     * EL PLANO DE LA SALA, QUE AHORA ES UN DATO.
     *
     * Dos mesas, la de tablero y la de cartas. Es exactamente lo que había —los
     * mismos ±2,5 y la baraja a 0,3 de su mesa— pero dicho una vez en vez de
     * seis, y en un sitio donde se puede cambiar sin tocar código.
     *
     * ⚠️ SE PASA POR `options.plano`, Y ESO ES TODA LA GRACIA.
     *
     * Un salón con tres mesas, con una, o con las mesas en otro sitio, deja de
     * ser una fábrica nueva y pasa a ser una lista distinta. Que es literalmente
     * lo que `protohub/habitacion.js` necesitaba y no podía pedir: su comentario
     * dice que no la reutiliza porque «pone DOS mesas fijas en x=±2.5».
     *
     * `id` no es decorativo: nombra la malla (`mesa:cartas`) y es lo que hace que
     * el clic pueda preguntar por ella en vez de repetir su coordenada.
     */
    static PLANO_DE_CASA = [
        { id: 'tablero', x: -2.5 },
        { id: 'cartas',  x:  2.5, baraja: 0.3 },
    ];

    constructor(scene, camera, controls, options = {}) {
        this.scene = scene;
        this.camera = camera;
        this.controls = controls;
        
        this.tableObj = null;
        this.tableCards = null;
        this.matMesh = null;
        this.deckGroup = null;

        this.isSitting = false;
        this.previousCameraState = { pos: new THREE.Vector3(), target: new THREE.Vector3() };
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.currentGameSet = null;
        
        // Hooks for UI syncing
        this.onSit = options.onSit || (() => {});
        this.onStand = options.onStand || (() => {});

        /**
         * ⚠️ `options` LLEGABA Y NO SE GUARDABA. Sólo se sacaban los dos ganchos
         * y el resto se perdía en el constructor.
         *
         * Se ve al añadir la primera opción nueva: puse `options.plano` y habría
         * sido `undefined` siempre. No habría reventado — la sala se habría
         * montado con el plano de casa y yo habría creído que el parámetro
         * funcionaba. Un ajuste que se ignora en silencio es peor que uno que no
         * existe, porque el que no existe se nota al escribirlo.
         */
        this.options = options;
    }

    async init() {
        // Setup essential room lighting
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        hemiLight.position.set(0, 20, 0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 10, 7);
        dirLight.castShadow = true;
        this.scene.add(dirLight);

        // Load procedural tables
        try {
            // loadModelAsync YA resuelve a gltf.scene (un THREE.Group). Hacer
            // `.scene` encima daba undefined y la sala se quedaba sin mesas.
            this.tableObj = await AssetManager.loadModelAsync('../props/models/Table.glb');
            
            // Re-scale to ensure standard realistic proportions (0.75m tall)
            const bbox = new THREE.Box3().setFromObject(this.tableObj);
            const size = bbox.getSize(new THREE.Vector3());
            const targetHeight = 0.75;
            const scaleF = targetHeight / (size.y || 1);
            
            this.tableObj.scale.set(scaleF, scaleF, scaleF);
            
            const adjustedBbox = new THREE.Box3().setFromObject(this.tableObj);
            this.tableObj.position.y = this.tableObj.position.y - adjustedBbox.min.y;

            this.tableObj.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });
            
            /**
             * ═══════════════════════════════════════════════════════════════
             *  ⚠️ EL PLANO DE LA SALA ERA UN NÚMERO REPETIDO EN SEIS SITIOS
             * ═══════════════════════════════════════════════════════════════
             *
             * `-2.5` y `2.5` estaban escritos a mano seis veces, y —esto es lo
             * grave— **en dos preocupaciones que no se hablan**:
             *
             *     construir      la mesa de tablero a −2,5, la de cartas a 2,5,
             *                    el tapete a 2,5, la baraja a 2,8
             *     el CLIC        cuatro `if` que devuelven ±2,5 según qué tocas
             *
             * Mover una mesa exigía cambiar seis números en dos sitios distintos.
             * Y si te dejabas uno, no reventaba: **el clic te sentaba donde ya no
             * hay mesa**, en silencio. Eso no es «los números están a fuego», es
             * un plano duplicado — y los planos duplicados se separan, que es la
             * avería que este proyecto lleva pagando toda la semana.
             *
             * Ahora el plano es DATOS y hay uno solo. `onClick` no repite las
             * coordenadas: pregunta a esta misma lista cuál de sus objetos has
             * tocado. Lo que hace imposible la discrepancia no es el cuidado: es
             * que ya no hay dos sitios donde escribirla.
             *
             * ⚠️ Y ESTO QUITA LA OBJECIÓN QUE YO MISMA ESCRIBÍ ANTEAYER.
             *
             * `protohub/habitacion.js` dice por qué no reutiliza esta fábrica:
             * «carga Table.glb y pone DOS mesas fijas en x=±2.5, porque su trabajo
             * es montar un salón entero. Aquí ya hay una mesa dibujada por el
             * juego». Era cierto. Con el plano en datos, la sala se pide con las
             * mesas que haga falta — o con ninguna.
             */
            this.plano = (this.options?.plano ?? ArcadeTableRoomFactory.PLANO_DE_CASA)
                .map(p => ({ ...p }));

            for (const sitio of this.plano) {
                const mesa = sitio.id === 'tablero' ? this.tableObj : this.tableObj.clone();
                mesa.position.x = sitio.x;
                mesa.name = `mesa:${sitio.id}`;
                this.scene.add(mesa);
                sitio.mesa = mesa;
                if (sitio.id === 'cartas') this.tableCards = mesa;   // el nombre viejo, para quien lo use
            }
            
            // Green Casino Mat
            const tSize = adjustedBbox.getSize(new THREE.Vector3());
            const aspect = tSize.x / tSize.z;
            this.tableCards.scale.z *= aspect;
            this.tableCards.scale.x *= 0.8;
            this.tableCards.scale.z *= 0.8;
            
            const scaledTx = tSize.x * 0.8;
            const cartas = this.plano.find(p => p.id === 'cartas');
            if (cartas) {
                // El tapete y la baraja van SOBRE su mesa, así que salen de la
                // misma `x`. Antes eran dos literales más que había que acordarse
                // de mover con ella; ahora no se pueden quedar atrás.
                this.matMesh = ArcadeTableRoomFactory.crearTapete(scaledTx * 0.96);
                this.matMesh.position.set(cartas.x, 0.75 + 0.0025, 0);
                this.matMesh.name = 'tapete:cartas';
                this.scene.add(this.matMesh);
                cartas.encima = [this.matMesh];

                this.deckGroup = ArcadeTableRoomFactory.crearBaraja();
                this.deckGroup.position.set(cartas.x + (cartas.baraja ?? 0.3), 0.75 + 0.02, 0);
                this.deckGroup.name = 'baraja:cartas';
                this.scene.add(this.deckGroup);
                cartas.encima.push(this.deckGroup);
            }

            // Bind click raycaster
            window.addEventListener('click', this.onClick.bind(this));
            
        } catch(e) {
            console.error("ArcadeTableRoomFactory failed to load table model:", e);
        }
    }

    /**
     * ── PUERTA COMÚN (contrato de BaseEnvironmentFactory) ────────────────────
     * Esta factory construye la sala en el CONSTRUCTOR, así que buildAll() solo
     * confirma el montaje y devuelve las referencias. Se expone para que un lab
     * pueda arrancar cualquier entorno con el mismo gesto.
     */
    buildAll(_c = {}) {
        return { room: this.room ?? this.group ?? null, tables: this.tables ?? [] };
    }

    /** Tick estándar: esta factory lo llama `tick`. */
    update(dt) { this.tick(dt); }

    setGameSet(group) {
        if (this.currentGameSet) this.scene.remove(this.currentGameSet);
        this.currentGameSet = group;
        if(this.currentGameSet) this.scene.add(this.currentGameSet);
    }

    onClick(event) {
        if (this.isSitting) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        /**
         * ⚠️ AQUÍ HABÍA CUATRO `if` CON LAS COORDENADAS OTRA VEZ.
         *
         * Cada uno decía a qué `x` sentarte según qué objeto tocabas, con los
         * ±2,5 escritos de nuevo. Dos listas del mismo plano, y la de aquí no
         * sabía nada de la de allí: mover una mesa y olvidar este bloque te
         * sentaba en el aire, sin error.
         *
         * Ahora se recorre el plano y se pregunta por sus objetos. Si mañana hay
         * tres mesas, este código no cambia — que es la diferencia entre un plano
         * y una copia del plano.
         */
        let targetX = null;
        for (const sitio of this.plano ?? []) {
            const suyos = [sitio.mesa, ...(sitio.encima ?? [])].filter(Boolean);
            if (sitio.id === 'tablero' && this.currentGameSet) suyos.push(this.currentGameSet);
            if (suyos.some(o => this.raycaster.intersectObject(o, true).length > 0)) targetX = sitio.x;
        }

        if (targetX !== null) {
            this.sitAtTable(targetX);
        }
    }

    sitAtTable(targetX) {
        if (this.isSitting) return;
        this.isSitting = true;

        this.previousCameraState.pos.copy(this.camera.position);
        if(this.controls) this.previousCameraState.target.copy(this.controls.target);

        this.onSit(targetX);

        // Compiz Zoom to "Hero" seat
        const targetPos = new THREE.Vector3(targetX, 1.8, 1.2);
        const lookAtPos = new THREE.Vector3(targetX, 0.75, -0.1);

        new TWEEN.Tween(this.camera.position)
            .to(targetPos, 1200)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();

        if (this.controls) {
            new TWEEN.Tween(this.controls.target)
                .to(lookAtPos, 1200)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();
        }
    }

    standUp() {
        if (!this.isSitting) return;
        
        new TWEEN.Tween(this.camera.position)
            .to(this.previousCameraState.pos, 1200)
            .easing(TWEEN.Easing.Cubic.InOut)
            .start();

        if (this.controls) {
            new TWEEN.Tween(this.controls.target)
                .to(this.previousCameraState.target, 1200)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onComplete(() => {
                    this.isSitting = false;
                    this.onStand();
                })
                .start();
        } else {
            setTimeout(() => {
                this.isSitting = false;
                this.onStand();
            }, 1200);
        }
    }

    tick(dt) {
        TWEEN.update();
    }

    // ── PIEZAS SUELTAS ──────────────────────────────────────────────────────
    // Lo de arriba monta una SALA: dos mesas en x=±2,5, sus luces, su click
    // global y una cámara de órbita. Sirve para el lab que la estrenó y para
    // nada más. Pero dentro había cosas reutilizables enterradas en el `init()`
    // —la baraja física y el tapete— que cualquier sala con mesas quiere y no
    // debería tener que copiar. Aquí salen a la puerta, y el `init()` las usa,
    // así que no hay dos versiones que se puedan desincronizar.

    /**
     * Una baraja física de verdad: 52 cartas apiladas, cada una con su grosor,
     * su canto claro y su dorso. No es una textura de baraja: son 52 objetos.
     */
    static crearBaraja({ n = 52, ancho = 0.088, largo = 0.123, grosor = 0.0015,
                         dorso = 0x882222, canto = 0xE8ECEF, desorden = 0.08 } = {}) {
        const grupo = new THREE.Group();
        const geo = new THREE.BoxGeometry(ancho, 0.001, largo);
        const matDorso = new THREE.MeshLambertMaterial({ color: dorso });
        const matCanto = new THREE.MeshLambertMaterial({ color: canto });
        // El orden importa: [+x, -x, +y, -y, +z, -z]. El dorso es la cara de
        // arriba (+y), que es la única que se ve en un mazo boca abajo.
        const caras = [matCanto, matCanto, matDorso, matCanto, matCanto, matCanto];
        for (let i = 0; i < n; i++) {
            const carta = new THREE.Mesh(geo, caras);
            carta.position.y = i * grosor;
            carta.rotation.y = (Math.random() - 0.5) * desorden;
            carta.castShadow = carta.receiveShadow = true;
            grupo.add(carta);
        }
        return grupo;
    }

    /** El tapete verde de casino. Un cuadrado con grosor, no un plano. */
    static crearTapete(lado, color = 0x005522) {
        const m = new THREE.Mesh(
            new THREE.BoxGeometry(lado, 0.005, lado),
            new THREE.MeshLambertMaterial({ color })
        );
        m.receiveShadow = m.castShadow = true;
        return m;
    }
}
