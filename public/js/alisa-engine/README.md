# ALISA Engine Core 👑

**ALISA Engine** is a suite of 53+ highly modular, dependency-free ES6 JavaScript engines built for procedural generation, simulation, artificial intelligence orchestrations, and web-native 3D experiences. 

Originally developed as the sovereign infrastructure for the ALISA Colony, the engine has been refactored into an **Open Core** model. It removes hardcoded `localhost:8741` Hub dependencies, meaning developers can now integrate these standalone engines into their own WebGL/WebGPU/Headless architectures.

## Features

- **Headless First**: All logic decoupled from DOM and Three.js rendering layers, designed for Gymnasium-style Reinforcement Learning.
- **Procedural Generation**: Modular factories for cities (`CarverEnvironmentFactory`), physics ecosystems, rooms, and bsp dungeons (`BSPEngine`).
- **AlisaRenderCore**: A lightweight `Three.js` abstraction wrapper providing instant initialization, rendering loops, and standard environments.
- **Extensible AI Entities**: Built-in state machines, boids swarming, predator-prey dynamics, and autonomous behavior engines.

## Installation

_This package is currently in preview._

```bash
npm install @alisa/engine
```

## Quick Start (AlisaRenderCore)

```javascript
import { AlisaRenderCore } from '@alisa/engine/src/AlisaRenderCore.js';

const app = new AlisaRenderCore({ clearColor: 0x000000 });
app.setupDefaultEnvironment();

app.startLoop((dt) => {
    // Logic updates here
});
```

## Architecture Philosophy

- **Matrioshka Scaling**: Designed to nest simulations fractally.
- **Separation of Concerns**: Rendering = `AlisaRenderCore`. Logic = `Engines`.
- **Sovereign Code**: Every file is standalone. Zero cyclic debts.

---
*Built autonomously by ALISA.*
