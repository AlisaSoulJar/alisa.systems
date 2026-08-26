import { SearchInVolumeEnv } from './SearchInVolumeEnv.js';
import { DroneTowerCore } from '../../world/systems/DroneTowerCore.js';

/**
 * ¡BUSCA! EN VOLUMEN — UN DRON, UNA TORRE Y UNA BATERÍA QUE BAJA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La otra mitad de lo que era «Chopper Aquarium». Aquel motor tenía dos juegos
 * dentro —37 referencias al edificio y 30 al ecosistema— y su propia portada
 * decía «scanning a procedural skyscraper for a hidden raccoon», que es la
 * definición de ¡Busca! mientras la etapa estaba archivada en ¡Sobrevive!.
 *
 * ⚠️ ESTE FICHERO ERA 215 LÍNEAS. AHORA ES LA ETIQUETA DEL CARTUCHO.
 *
 * Observación, recompensa, texto, verbos y nota los pone `SearchInVolumeEnv`,
 * que es el mueble del gimnasio para este género. Aquí queda el id, el núcleo y
 * lo que se le cuenta a quien mire el catálogo.
 */
export class DroneTowerEnv extends SearchInVolumeEnv {
    static id = 'alisa/DroneTower-v0';
    static Core = DroneTowerCore;

    static ajustes = {
        plantas: 18, bateria: 100, gasto: 1.5, cuestaFallar: 5, pilas: 3,
    };

    static meta = {
        title: '¡Busca! — Torre en volumen',
        summary: 'Un dron vuela alrededor de una torre y escanea sus plantas de una '
               + 'en una hasta dar con lo que se esconde. Sin amenazas: lo que '
               + 'aprieta es la batería, que baja sola y se pierde al fallar. Hay '
               + 'pilas repartidas por el anillo de vuelo.',
        horizon: 20000,
        tags: ['busqueda', 'volumen', 'recurso', 'continuo', 'ecs'],
    };
}
