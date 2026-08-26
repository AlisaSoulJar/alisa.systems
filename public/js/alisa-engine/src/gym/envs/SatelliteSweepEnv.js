import { SearchInVolumeEnv } from './SearchInVolumeEnv.js';
import { SatelliteSweepCore } from '../../world/systems/SatelliteSweepCore.js';

/**
 * ¡BUSCA! EN ÓRBITA — UN SATÉLITE, UNA ESTACIÓN Y UN ENLACE QUE SE PIERDE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La etiqueta del cartucho, y nada más. Observación, recompensa, texto, verbos y
 * nota los pone `SearchInVolumeEnv`; las reglas y los números, la ROM del núcleo.
 *
 * ⚠️ ESTE ENTORNO SE ESCRIBIÓ SIN TOCAR EL MOTOR, Y ÉSA ES LA PRUEBA.
 *
 * Un juego entero —jugable por una persona, medible por un agente, con recibo y
 * huella— salió de dos tablas y cero líneas de física. Si la consola no tuviera
 * las ROMs en potencia, esto habría costado un fichero de cuatrocientas líneas
 * como costó el primero.
 */
export class SatelliteSweepEnv extends SearchInVolumeEnv {
    static id = 'alisa/SatelliteSweep-v0';
    static Core = SatelliteSweepCore;

    static ajustes = {
        plantas: 26, bateria: 100, gasto: 2.2, cuestaFallar: 8, pilas: 2,
    };

    static meta = {
        title: '¡Busca! — Estación a la deriva',
        summary: 'Un satélite rodea una estación abandonada y barre sus cubiertas de '
               + 'una en una buscando una baliza. Sin amenazas: lo que aprieta es el '
               + 'enlace, que se pierde solo y se cae de golpe al barrer una cubierta '
               + 'equivocada. Se recupera en los puntos de sincronización que quedan '
               + 'en órbita.',
        horizon: 20000,
        tags: ['busqueda', 'volumen', 'recurso', 'continuo', 'ecs'],
    };
}
