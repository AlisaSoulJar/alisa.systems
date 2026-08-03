# Chopper Aquarium Engine (OpenCore)

El `ChopperAquariumEngine` es uno de los motores de simulación completos dentro del **OpenCore ALISA Engine**. Combina físicas de vuelo, inteligencia artificial mediante FSM (Finite State Machine), y un ecosistema submarino dinámico (boids), todo bajo el paradigma ECS (Entity Component System).

## 🏗️ Arquitectura (Headless Logic)

Siguiendo el patrón OpenCore, este motor es **100% headless** (sin dependencias de renderizado como Three.js). Se encarga exclusivamente de las matemáticas, la física y las reglas de juego.

### Sistemas (Systems) Internos Utilizados:
1. **`OverworldECS.js` (ECSWorld)**: El núcleo del motor. Maneja las entidades y los componentes.
2. **`EnergySystem.js`**: Gestiona el consumo de combustible/energía del helicóptero mediante el `EnergyComponent`.
3. **`EcosystemSystem.js`**: Controla la IA de cardúmenes (Boids), simulación de presas (fishes), cazadores (hunters) y depredadores ápice (sharks).
4. **`SeededRNG.js`**: Generador de números aleatorios determinista, vital para asegurar que la simulación es reproducible (crucial si se entrena por RL o corre en servidores remotos sin interfaz).

### Patrón de Estados (FSM) del Helicóptero:
El helicóptero es una IA autónoma con 3 estados base:
- `ROAM`: Órbita alrededor del rascacielos sumergido, evitando los bordes y el centro del tanque.
- `APPROACH`: Selecciona un piso no escaneado y vuela hacia él usando físicas vectoriales (empuje y amortiguación).
- `INSPECTING`: Se asoma al piso para escanear si el objetivo (Raccoon) está ahí, consumiendo energía en el proceso.

---

## 🚀 Patrón de Inicialización (Factory & Sync)

Para usar este motor en la web (Catedral Overworld), se acopla a una **Factory** (ej. `AquariumEnvironmentFactory.js`). 
La fábrica inicializa Three.js, carga los modelos (`GLTFModelPool`), y en cada frame sincroniza las mallas 3D con las variables matemáticas del Engine.

### Ejemplo Práctico de Inicialización:

```javascript
import { ChopperAquariumEngine } from './world/systems/ChopperAquariumEngine.js';
import { AquariumEnvironmentFactory } from './world/factories/AquariumEnvironmentFactory.js';
import * as THREE from 'three';

// 1. Setup Three.js (Renderer, Scene, Camera)
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth/innerHeight, 0.1, 1000);

// 2. Instanciar la Lógica (Headless)
const engine = new ChopperAquariumEngine();
engine.reset(42); // Inicializar con seed fija

// 3. Instanciar lo Visual (Factory)
const factory = new AquariumEnvironmentFactory(scene, camera, null, './assets/');
factory.buildAll({ totalFloors: 18 });

// 4. Conectar Eventos (Event-Driven)
engine.on('start_inspecting', (floorIdx) => factory.onStartInspecting(floorIdx));
engine.on('floor_checked', (data) => factory.onFloorChecked(data));
engine.on('reset_visuals', () => factory.resetFloorVisuals());

// 5. El Bucle de Juego (Tick)
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // A) Avanzar la lógica (matemáticas puras)
    engine.stepSimulation(0, dt, false); // manualThrust = false (Auto AI)

    // B) Sincronizar el estado del engine hacia Three.js
    const engineState = {
        chopper: engine.chopper,
        chopperVelocity: engine.chopperVelocity,
        gameState: { fuel: engine.ecs.getComponent(engine.chopperEntity, 'EnergyComponent').currentEnergy },
        fishes: engine.fishes,
        hunters: engine.hunters,
        sharks: engine.sharks
    };
    factory.syncToEngine(engineState, dt);

    // C) Renderizar
    renderer.render(scene, camera);
}
animate();
```

## 🧠 Bridge para Reinforcement Learning (RL)

El motor fue diseñado para poder entrenar redes neuronales sobre él. El método `stepSimulation(actionIdx, dt, isRLMode)` devuelve la tripla clásica de OpenAI Gym:
`{ obs, reward, done, info }`

Al llamar a `engine.getObservationVector()`, se expone un vector normalizado de 10 variables que incluyen altura, combustible, ángulos y densidad del ecosistema, permitiendo un entrenamiento desacoplado de la renderización.
