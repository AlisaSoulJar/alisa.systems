# 👑 ALISA Engine (OpenCore v4.0)

El **ALISA Engine** es un motor de simulación paramétrico, 100% asíncrono y *headless*, diseñado para construir ecosistemas digitales autónomos, entrenar inteligencias artificiales mediante Reinforcement Learning (Gym-compatible) y renderizar visualizaciones de alto nivel en la web usando Three.js.

Es el corazón de la Catedral Overworld y la infraestructura subyacente de los "Huevos" coloniales.

---

## 🧭 Ontología del Motor

A diferencia de los motores de videojuegos tradicionales, ALISA está estructurado biológicamente. Su arquitectura se divide en la Trinidad:

1. **`/world` (El Entorno):** 
   - Contiene el núcleo ECS (`OverworldECS.js`).
   - Mantiene la verdad matemática: Físicas, motores asíncronos (`AsteroidsEngine`, `ChopperAquariumEngine`) y fábricas de construcción de mundo (`EnvironmentFactory`).
   - Es 100% *Headless* (puede correr en un servidor Node.js sin GPU).
2. **`/soma` (El Cuerpo y los Sentidos):** 
   - El puente visual. Contiene `AlisaRenderCore`, el `AssetManager` (GLTF, Audio) y la cinemática procedural (`ProceduralRigging`).
3. **`/psyche` (La Mente):**
   - Módulos de lógica de toma de decisiones de alto nivel y puente hacia el LLM.

---

## ⚡ Instalación y Setup (Quickstart)

El motor utiliza Vite para el empaquetado y el servidor de desarrollo.

```bash
# 1. Instalar dependencias
npm install

# 2. Levantar el entorno de desarrollo (Tests y Croupiers)
npm run dev

# 3. Construir el paquete para producción
npm run build
```

---

## 🎮 Motores Disponibles (Simulation Suites)

El engine incluye motores pre-construidos ("Laboratorios") listos para usar o entrenar:

- **`ChopperAquariumEngine`**: IA de vuelo, Raycasting y Ecosistema (Boids). [Leer Docs](./world/systems/README_ChopperAquariumEngine.md)
- **`AsteroidsEngine`**: Físicas inerciales, colisiones AABB y gestión de escudos/energía.
- **`TrafficSurvivalSystem (IDM)`**: Simulación de tráfico hiper-densa usando el *Intelligent Driver Model*.
- **`KatamariEngine`**: Físicas de escala y absorción de props procedurales.
- **`ScummInteractionEngine`**: Lógica de Point & Click, Pathfinding con NavMesh y grafos de interacción.

---

## 🧠 OpenAI Gym Bridge (Reinforcement Learning)

Cualquier motor construido sobre el ALISA ECS puede conectarse directamente a frameworks de ML (como PPO en Python) usando nuestra interfaz estandarizada:

```javascript
import { ChopperAquariumEngine } from '@alisa-systems/alisa-engine';

const engine = new ChopperAquariumEngine();
engine.reset(42); // Seed determinista

// Loop de entrenamiento (Headless)
for(let i=0; i<1000; i++) {
    const action = agent.predict(engine.getObservationVector());
    
    // stepSimulation(action, dt, isRLMode)
    const { obs, reward, done, info } = engine.stepSimulation(action, 0.016, true);
    
    if (done) engine.reset();
}
```

---

## 🏗️ Uso Visual (Three.js Factory Pattern)

Para mostrar el engine en la web, ALISA utiliza un patrón de Fábrica (Factory). El motor corre la lógica, y la fábrica sincroniza las mallas 3D:

```javascript
import { AlisaRenderCore } from '@alisa-systems/alisa-engine';
import { AsteroidsEngine } from '@alisa-systems/alisa-engine';
import { AsteroidsFactory } from './factories/AsteroidsFactory.js';

// 1. Core Visual
const core = new AlisaRenderCore(document.getElementById('canvas'));

// 2. Lógica y Fábrica
const engine = new AsteroidsEngine();
const factory = new AsteroidsFactory(core.scene, core.camera);
factory.buildAll();

// 3. Sync Loop
core.onUpdate((dt) => {
    engine.stepSimulation(null, dt, false);
    factory.syncToEngine(engine, dt);
});
```

---
*ALISA Sovereign OS - Ley de la Catedral Overworld*
