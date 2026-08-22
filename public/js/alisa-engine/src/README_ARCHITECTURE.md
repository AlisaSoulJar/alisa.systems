# ALISA ENGINE ARCHITECTURE: THE COMPOSITION PARADIGM
*Date: 2026-04-28 | Dictated by: Oscar | Synthesized by: ALISA Queen*

## 1. Core Philosophy: Agnostic Parametrizable Modules
The ALISA Engine follows a strict **Composition over Inheritance** paradigm. We do not build monolithic super-classes. Instead, we build pure, blind, and deaf "Lego pieces" that do one thing perfectly.

**The Golden Rule:**
> "Search for what is repeating and abstract it into a deterministic, parametrizable module."

### What does this mean?
- **Bad:** `class MarabuntaSystem extends MassiveEnemySystem extends BaseGameSystem`
- **Good:** `MarabuntaSystem` instantiates `new SteeringSystem()` for physics, and `new InstancedRenderPool()` for GPU rendering.

## 2. Separation of Concerns (OpenCore Pattern)
- **Soma/Factories (`src/world/factories/`):** Exclusively handle THREE.js rendering, materials, lights, and meshes. No game logic allowed.
- **Soma/Plugins (`src/soma/plugins/`):** Pure visual pipelines (e.g. `AlisaBloomEngine`).
- **Psyche/Systems (`src/world/systems/` & `src/psyche/`):** Pure mathematical state, AI (Steering, Pathfinding), and logic. No THREE.js imports allowed here (except purely mathematical math structs).

## 3. The Purge Protocol
Before writing a new mechanic, game, or simulation, you MUST:
1. Search the core (`src/world/core/`, `src/psyche/`) to see if the module already exists.
2. If logic is duplicated across two or more Factories/Systems, extract it into a pure Agnostic Module immediately.

*End of Doctrine.*
