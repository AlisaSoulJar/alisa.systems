# Marabunta: Industrial Polish & Mechanics (Phase 5)

## 1. Aesthetic Evolution (13 Corp Building)
The visual identity of the Marabunta simulation was refactored to achieve a "Comic / Flat Industrial" aesthetic:
- **Lighting**: Replaced the multi-spotlight setup (which was blowing out the scene) with a clean `HemisphereLight` (global soft illumination) combined with a single `DirectionalLight` simulating isometric sunlight.
- **Material Polish**: All `.glb` imports (Janitor, Rats, Marabuntas) and procedural obstacles (Crates) are explicitly forced into absolute matte (`roughness = 1.0`, `metalness = 0.0`) by traversing the meshes on load. This removes the "plastic" sheen and grounds them into the industrial tile floor.

## 2. Biological Slime (Puddles & The Mop)
Integrated a physics-altering terrain hazard directly tied to the Janitor's class weapon (The Mop).
- **Spawn Logic**: Enemies have a 25% chance to drop a `Slime Puddle` upon death (`MarabuntaSystem._killEnemy`). Puddles persist for 12 seconds.
- **Physical Friction**: Any entity (Player or Enemy) stepping into a puddle's radius suffers a severe movement penalty (~50% speed reduction). This creates tactical bottlenecks between Crates.
- **Synergy**: The `mop` weapon automatically scans the puddle array on attack and instantly deletes (`cleans`) any slime within its AoE radius.

## 3. Boss Guard (Elite Shields)
Added a layer of mechanical complexity for Elite units (e.g. `boss` or `marabunta` classes).
- **Damage Nullification**: Elites spawn with `e.guard = true`. While active, they reduce all incoming standard damage to exactly `1`.
- **Slam Breaking**: The player's special `Slam` attack (Shift) explicitly breaks the guard (`e.guard = false`) when it connects.
- **Visual Feedback**: Factory renders an intense blue emissive shield over the mesh while guard is active, and emits a blue shatter particle burst the moment it drops, revealing the standard enemy colors.

## 4. Graceful Engine State Resets
Replaced the monolithic `location.reload()` DOM hack with a graceful state-purge function (`window.resetGame`).
- **Memory Purge**: Explicitly clears all internal engine arrays (`game.enemies`, `game.projectiles`, `game.obstacles`).
- **GPU Cleanup**: Iterates over `MarabuntaEnvironmentFactory`'s `Map` caches, calling `.dispose()` on all procedural materials and using `scene.remove()` to clean the WebGL state.
- **Seamless Loop**: Triggers `game.init()` instantly without dropping the HTML/Canvas context.

## Next Steps
- Implement active boss mechanics (Dash/Summon) to increase late-game intensity.
- Integrate the visual game loop directly into the Sovereign OS (avoiding standalone labs).
