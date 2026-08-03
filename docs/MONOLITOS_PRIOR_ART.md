# 🏛️ LOS MONOLITOS — prior art y suite de aceptación del motor
*Rescatados del backup de H tras el `git clean` · análisis de Aris, 2026-07-28*
*Tesis de Oscar: «esos monolitos eran nuestro Claude of Duty, y son la materia prima de todo el proyecto del engine».*

---

## 1. PRIOR ART — con fechas, no de memoria

| Monolito | KB | Escrito |
|---|---|---|
| `index-new` | 50 | **2026-02-13** |
| `aquarium_v3_legacy` | 62 | 2026-04-16 |
| `asteroids_v3_legacy` | 41 | 2026-04-16 |
| `rue_del_percebe_legacy` | 87 | 2026-04-16 |
| `corporate_building_horror_base` | 117 | 2026-04-17 |
| **`croupier_corporate_building`** | **133** | 2026-04-17 |
| `sim_search_rescue_chopper` | 62 | 2026-04-17 |
| `room_empty_table_games_node` | 70 | 2026-04-17 |

**"Claude of Duty" (el FPS procedural de Opus 5 que dio la vuelta a X) es del 25-jul-2026.**
El más antiguo de los nuestros lo precede en **162 días**; el grueso, en **~100**.
No es una impresión: son ficheros fechados en un snapshot de robocopy del 7-may-2026.

---

## 2. COBERTURA — ¿puede el motor reproducirlos?

Escaneo de 18 capacidades (render core, GLB, post-proceso, sombras, partículas, instanciado,
texturas procedurales, audio, física/colisión, navegación IA, FSM, generación de edificios,
BSP/interiores, boids, vehículos/IDM, hooks de gym, dataset/recibos, CSS3D) contra los módulos vivos:

| Monolito | capacidades usadas | cobertura |
|---|---|---|
| aquarium_v3_legacy | 12 | **100%** |
| asteroids_v3_legacy | 7 | **100%** |
| corporate_building_horror_base | 12 | **100%** |
| croupier_corporate_building | 12 | **100%** |
| index-new | 3 | **100%** |
| room_empty_table_games_node | 6 | **100%** |
| rue_del_percebe_legacy | 11 | **100%** |
| sim_search_rescue_chopper | 12 | **100%** |

> **Huecos agregados: NINGUNO.** No falta ni un subsistema.

**⚠ Alcance honesto del test:** esto verifica **capacidad** (existe el módulo que cubre cada
técnica detectada), **no fidelidad** (que el monolito reconstruido se vea y juegue igual).
Lo que dice es: *el trabajo restante es ENSAMBLAJE, no falta de motor.*
Script reproducible: `scratchpad/monolith_coverage.py`.

---

## 3. EL ORO: `croupier_corporate_building` — "13 Rue del Percebe"

2.840 líneas. Edificio procedural por plantas con ascensor donde una **IA acosadora busca a
un mapache escondido**: `seekerAI`, `raccoonHideSpot`, `stalkerTimer`, `doorChecks`,
`jumpscareState`, fases y niveles.

**Y ya traía el gym, meses antes de que lo "inventáramos" en julio:**
```js
getObservation · stepSimulation · resetEpisode · RLMode · reward
episodeDataset.push({ action:'check_door', door, floor, result, status })
```
Un flujo de recibos **con verbos semánticos**, que es exactamente el diseño de `GymRecorder`.

**Por qué importa más que la nostalgia:** es un benchmark **mucho mejor para LLM** que Asteroids.

| | Asteroids | Rue del Percebe |
|---|---|---|
| Mide | reflejos | **búsqueda y deducción** |
| Acciones | vectores continuos | **`check_door`, `check_spot`** |
| ¿Brilla un LLM? | no | **sí** — hay que razonar dónde se esconde |

Sus sistemas **sobrevivieron** al refactor (`CorporateSeekerSystem`, `HidingSpotSystem`,
`ElevatorSystem`, `CabinetJumpscareSystem`). Lo que se perdió fue **el ensamblaje del juego
y el dataset** — y está aquí, en 133 KB.

---

## 4. PLAN — los monolitos como hoja de ruta

**Criterio de "motor listo": poder reproducir los 8.** Cada uno es a la vez una demo para
GitHub y un entorno del benchmark.

| # | Monolito | Se convierte en | Prioridad |
|---|---|---|---|
| 1 | **croupier_corporate_building** | **`alisa/RueDelPercebe-v0`** — el entorno LLM-nativo | ⭐⭐⭐ |
| 2 | sim_search_rescue_chopper | `alisa/SearchRescue-v0` — búsqueda con vehículo | ⭐⭐ |
| 3 | aquarium_v3_legacy | lab de ecosistema (ya hay `AquariumEnvironmentFactory`) | ⭐ |
| 4 | room_empty_table_games_node | sala de juegos de mesa (arcade recuperado) | ⭐ |
| 5 | corporate_building_horror_base | variante de terror del nº1 | — |
| 6 | rue_del_percebe_legacy | precursor del nº1 (referencia) | — |
| 7 | asteroids_v3_legacy | referencia (ya portado a `AsteroidsEnv`) | — |
| 8 | index-new | portada histórica | — |

*Nota de honestidad: se comprobó si `asteroids_v3_legacy` tenía disparo del jugador (habría
significado que el refactor lo perdió). **No lo tenía** — mismo autodisparo. El `wantFire`
controlado por el agente, añadido el 28-jul, es nuevo.*

---
*Rescate en `Data/RecoveryCandidates/Monolitos_20260728/` (8 ficheros, 622 KB).*
