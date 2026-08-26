// ALISA Engine - Main Entry Point
export { AlisaRenderCore } from './soma/AlisaRenderCore.js';
export { AssetManager } from './soma/AssetManager.js';
// Dónde viven los assets. Llama a AssetResolver.setBase(url) si los sirves
// desde otro sitio (CDN, bucket, subcarpeta). Por defecto se deduce solo.
export { AssetResolver } from './soma/AssetResolver.js';
// Reproducibilidad: misma semilla ⇒ mismo mundo. Base del benchmark.
export { DeterministicScope, mulberry32, normalizeSeed } from './world/core/DeterministicScope.js';
// El puente: expone las TRES puertas del gym a Python/Playwright.
export { GymBridge } from './gym/GymBridge.js';
export { CabinetEscapeEnv } from './gym/envs/CabinetEscapeEnv.js';
// Render pipeline (2026-07-28): look de cine y sombras AAA, como plugins reutilizables
export { CinematicPipelinePlugin } from './soma/plugins/CinematicPipelinePlugin.js';
export { CascadedShadowPlugin } from './soma/plugins/CascadedShadowPlugin.js';
// ═══════════════════════════════════════════════════════════════════════════
//  GYM — el benchmark de las tres puertas (numérica / lenguaje / humana)
// ═══════════════════════════════════════════════════════════════════════════
export { GymEnv } from './gym/GymEnv.js';
export { GymIdentity } from './gym/GymIdentity.js';
export { GymRecorder } from './gym/GymRecorder.js';

// Los ENTORNOS. Tres de estos cinco estaban escritos, documentados y
// terminados, y NO los exportaba nadie — ni siquiera este barril. Un entorno de
// benchmark que no se puede importar no existe para quien se descargue el
// motor, por muy bien hecho que esté.
//
// `CorpBuildingEnv` es el caso más doloroso: 12,5 KB, el juego más trabajado
// que tenemos, y llevaba meses invisible.
export { AsteroidsEnv }      from './gym/envs/AsteroidsEnv.js';
export { MarabuntaEnv }     from './gym/envs/MarabuntaEnv.js';
export { RaccoonSpaceEnv }   from './gym/envs/RaccoonSpaceEnv.js';
export { CorpBuildingEnv }  from './gym/envs/CorpBuildingEnv.js';

/**
 * El catálogo de entornos, para que se puedan RECORRER y no solo importar por
 * nombre. Un banco de pruebas necesita poder decir "dame todos los entornos y
 * córrelos", y para eso hay que tener la lista en alguna parte.
 */
/**
 * ⚠️ ESTA LISTA SE ESCRIBÍA A MANO, Y POR ESO MENTÍA.
 * `check_gym_envs.mjs` la lee para comprobar los entornos nativos. Al añadir
 * `ChopperAquariumEnv` seguía diciendo «5 entornos en el catálogo»: el
 * comprobador estaba verificando una lista, no el catálogo.
 *
 * Dos fuentes de verdad siempre acaban separándose, y la que se separa en
 * silencio es la peor. Ahora sale del registro, que es donde de verdad se
 * declaran.
 */
import { CATALOGO } from './gym/registry.js';

export const GYM_ENVS = Object.fromEntries(
    CATALOGO.filter(e => e.familia === 'propio').map(e => [e.id, e.cargar]));
export { ProceduralRigging } from './soma/ProceduralRigging.js';
export { ArachneEngine } from './soma/ArachneEngine.js';
export { NavMeshExtractionEngine } from './world/systems/NavMeshExtractionEngine.js';
export { BoidsSystem } from './world/systems/BoidsSystem.js';
export { NavMeshAgentSystem, NavMeshAgentComponent } from './world/systems/NavMeshAgentSystem.js';
export { AsteroidsEngine, SHIP_GAUGES } from './world/systems/AsteroidsEngine.js';
export { ECSWorld, TransformComponent, VelocityComponent, RenderProxyComponent } from './world/OverworldECS.js';
