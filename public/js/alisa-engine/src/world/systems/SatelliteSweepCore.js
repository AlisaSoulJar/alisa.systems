/**
 * SatelliteSweepCore.js — ¡BUSCA! EN ÓRBITA: UNA ESTACIÓN A LA DERIVA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un satélite rodea una estación abandonada y barre sus cubiertas de una en una
 * buscando una baliza. Sin amenazas: lo que aprieta es el ENLACE, que se pierde
 * solo y se cae de golpe cuando barres una cubierta equivocada. Se recupera
 * pasando por los puntos de sincronización que quedan en órbita.
 *
 * ⚠️ ESTE JUEGO NO TIENE CÓDIGO. ES ESTA TABLA.
 *
 * Todo lo que hace lo hacen piezas que ya estaban en la consola:
 * `VolumeVehicleSystem`, `FloorScanSystem`, `EnergySystem` y `RechargeSystem`,
 * montadas por el mueble `SearchInVolumeCore`. Aquí no hay una sola línea de
 * física, de reglas ni de sustrato — hay números y nombres.
 *
 * Y no es un cambio de piel del dron: la estación tiene 26 cubiertas en vez de
 * 18, el enlace cae casi al doble de rápido, fallar cuesta 8 en vez de 5, y sólo
 * hay DOS puntos de sincronización aunque den más. Es más largo, más caro y menos
 * perdonable — otro juego con las mismas piezas.
 *
 * ⚠️ Y LA PIEL `enlace` NO ES UN NOMBRE BONITO: ESTABA ESPERANDO.
 *
 * `RechargeSystem.PIELES` declara tres pieles de la MISMA mecánica —pila,
 * combustible, enlace— y lleva escrito desde que se escribió: «un satélite que
 * PIERDE EL ENLACE y tiene que volver a sincronizar es la misma regla pero
 * contando algo que encaja con lo que se ve». La piel llevaba meses sin usarse.
 * Esto es lo que era.
 */
import { SearchInVolumeCore } from './SearchInVolumeCore.js';

/** Las intenciones, en el orden en que las numera el gimnasio. */
export const VERBS = ['nada', 'subir', 'bajar', 'girar_izquierda', 'girar_derecha', 'escanear'];

export class SatelliteSweepCore extends SearchInVolumeCore {
    static ROM = {
        id: 'alisa/SatelliteSweep-v0',
        familia: 'tiempo_real',
        verbos: VERBS,

        mundo: {
            plantas: 26, altoPlanta: 3.2, radioTorre: 22,
            ancho: 130, largo: 130, margenAlto: 40,
        },

        sistemas: [
            ['VolumeVehicleSystem', { velMax: 34 }],
            ['FloorScanSystem', { cuestaFallar: 8, margen: 2 }],
            ['EnergySystem', { bateria: 100, gasto: 2.2 }],
            ['RechargeSystem', { piel: 'enlace', da: 45, alcance: 7, cuantas: 2 }],
        ],

        voz: {
            jugador: 'satelite',
            volumen: 'estacion',
            leyendaVolumen: 'la estación: no se puede atravesar',
            texto: {
                Volumen: 'Estación', elVolumen: 'la estación',
                plantas: 'cubiertas', planta: 'cubierta',
                Recurso: 'Enlace', recurso: 'enlace', punto: 'punto de sincronización', puntos: 'puntos de sincronización',
                recursoBaja: 'el enlace se sigue perdiendo',
                sinRecurso: 'Perdiste el enlace y el escáner dejó de leer.',
            },
        },

        /** El mismo HUD que la torre, con las palabras de este cartucho. */
        hud: {
            titulo: '¡Busca!', subtitulo: 'Estación a la deriva', acento: '#9d7bff',
            mandos: 'W / S: altura · A / D: rodear la estación · ESPACIO: barrer esta cubierta',
            filas: [
                { etiqueta: 'Cubierta', campo: 'planta', de: 'plantas' },
                { etiqueta: 'Barridas', campo: 'escaneadas' },
                { etiqueta: 'Enlace', campo: 'bateria', barra: true, de: 'bateriaInicial', sufijo: '%' },
                { etiqueta: 'Sincronizaciones', campo: 'recargas' },
            ],
        },

        /**
         * Las dos cartelas. El primer párrafo es el mismo texto que el `summary`
         * del entorno: se escribe UNA vez, aquí, y lo leen la persona y el
         * catálogo del gimnasio.
         */
        cartel: {
            titulo: '¡Busca! — Estación a la deriva',
            parrafos: [
                'Un satélite rodea una estación abandonada. En una de sus cubiertas '
                + 'hay una baliza, y sólo se sabe barriendo cubierta a cubierta.',
                '<b>No hay amenazas.</b> Lo que aprieta es el <b>enlace</b>: se pierde '
                + 'solo, y barrer una cubierta equivocada lo tira de golpe. Hay puntos '
                + 'de sincronización repartidos por la órbita.',
            ],
            pie: 'Powered by ALISA <b>SatelliteSweepCore</b> — y este juego <b>no tiene '
               + 'código</b>: es una ROM. Las mismas cuatro piezas del motor que juegan '
               + 'la torre, con otros números y otros nombres.',
            ajustes: [
                { clave: 'seed', etiqueta: 'Semilla', valor: 42 },
                { clave: 'plantas', etiqueta: 'Cubiertas', valor: 26, min: 4, max: 40 },
            ],
            boton: '▶ SINCRONIZAR',
            final: {
                gana: '¡Baliza encontrada!',
                pierde: 'Enlace perdido',
                detalleGana: 'Estaba en la cubierta {solucion}. Barriste {escaneadas} de {plantas}.',
                detallePierde: 'Estaba en la cubierta {solucion} y te quedaste sin enlace. '
                             + 'Barriste {escaneadas} de {plantas}.',
            },
        },

        fases: ['intencion', 'movimiento', 'reglas', 'sustrato'],
    };
}
