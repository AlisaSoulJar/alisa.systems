/**
 * DroneTowerCore.js — ¡BUSCA! EN VOLUMEN: UNA TORRE Y UN DRON
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Un dron vuela alrededor de una torre y escanea sus plantas de una en una hasta
 * dar con lo que se esconde en una de ellas. Sin amenazas: lo que aprieta es la
 * batería, que baja sola y se pierde de golpe al escanear en falso.
 *
 * ⚠️ ESTE FICHERO ERA 438 LÍNEAS Y AHORA ES UNA TABLA. NO SE PERDIÓ NADA.
 *
 * Todo lo que hacía —dar vueltas, acercarse, inspeccionar, gastar, recargar,
 * publicar el sustrato— lo hace `SearchInVolumeCore`, que es el MUEBLE de este
 * género: buscar algo en un volumen dividido en plantas, con un vehículo con
 * inercia y un recurso que se agota.
 *
 * Lo que queda aquí es el CARTUCHO: qué piezas se meten, con qué números y con
 * qué nombres. Y la prueba de que no se perdió nada está medida, no prometida:
 * la huella siguió siendo **95f6631a** antes y después de la mudanza. Bit a bit
 * el mismo juego.
 *
 * ⚠️ DE DÓNDE SALE, QUE MERECE QUEDAR ESCRITO.
 *
 * `ChopperAquariumEngine` tenía DOS juegos dentro, medido casi al 50%: 37
 * referencias al edificio y 30 al ecosistema. Un helicóptero-pez escaneando un
 * rascacielos dentro de una pecera no era mala ambientación: eran dos juegos
 * pegados. Ésta es la mitad de ¡Busca!; la otra se quedó de submarino.
 */
import { SearchInVolumeCore } from './SearchInVolumeCore.js';

/** Las intenciones, en el orden en que las numera el gimnasio. */
export const VERBS = ['nada', 'subir', 'bajar', 'girar_izquierda', 'girar_derecha', 'escanear'];

export class DroneTowerCore extends SearchInVolumeCore {
    static ROM = {
        id: 'alisa/DroneTower-v0',
        familia: 'tiempo_real',
        verbos: VERBS,

        /** El mundo: la caja y la torre que hay dentro. */
        mundo: {
            plantas: 18, altoPlanta: 4.0, radioTorre: 28,
            ancho: 120, largo: 120, margenAlto: 40,
        },

        /** Las piezas del motor y los números con los que se las llama. */
        sistemas: [
            ['VolumeVehicleSystem', { velMax: 25 }],
            ['FloorScanSystem', { cuestaFallar: 5, margen: 1 }],
            ['EnergySystem', { bateria: 100, gasto: 1.5 }],
            // Piel `pila`: esto es un DRON, y para un dron «batería» es la palabra
            // correcta. La misma regla con otra piel es el combustible de una nave
            // o el enlace de un satélite — ver `RechargeSystem.PIELES`.
            ['RechargeSystem', { piel: 'pila', da: 30, alcance: 6, cuantas: 3 }],
        ],

        /**
         * Cómo se llama cada cosa en ESTE cartucho. `texto` es lo que lee un
         * modelo sin ojos por la puerta de lenguaje: no es decoración, es el
         * enunciado del problema.
         */
        voz: {
            jugador: 'dron',
            volumen: 'torre',
            leyendaVolumen: 'la torre: no se puede atravesar',
            texto: {
                Volumen: 'Torre', elVolumen: 'la torre',
                plantas: 'plantas', planta: 'planta',
                Recurso: 'Batería', recurso: 'batería', punto: 'pila', puntos: 'pilas',
                recursoBaja: 'la batería sigue bajando',
                sinRecurso: 'Te quedaste sin batería.',
            },
        },

        /**
         * El panel de estado, declarado. `campo` es una clave de `info()` y `de`
         * es de dónde sale el tope — o sea que esto no es texto suelto: es un
         * mapa entre el cartucho y la puerta que el núcleo ya publica. Lo pinta
         * `hud_mundo.mjs`; la página no escribe ni un `getElementById`.
         */
        hud: {
            titulo: '¡Busca!', subtitulo: 'Torre en volumen', acento: '#7fd1ff',
            mandos: 'W / S: altura · A / D: rodear la torre · ESPACIO: escanear esta planta',
            filas: [
                { etiqueta: 'Planta', campo: 'planta', de: 'plantas' },
                { etiqueta: 'Escaneadas', campo: 'escaneadas' },
                { etiqueta: 'Batería', campo: 'bateria', barra: true, de: 'bateriaInicial', sufijo: '%' },
                { etiqueta: 'Pilas', campo: 'recargas' },
            ],
        },

        /** Las dos cartelas, dichas una sola vez. */
        cartel: {
            titulo: '¡Busca! — Torre en volumen',
            parrafos: [
                'Un dron vuela alrededor de una torre. En una de sus plantas hay algo '
                + 'escondido, y sólo se sabe mirando planta a planta.',
                '<b>No hay amenazas.</b> Lo que aprieta es la batería: baja sola, y '
                + 'escanear una planta equivocada cuesta de golpe. Hay pilas repartidas '
                + 'por el anillo de vuelo.',
            ],
            pie: 'Powered by ALISA <b>DroneTowerCore</b> — el mismo núcleo que juega el '
               + 'banco. Compone cuatro piezas del motor: vehículo, escaneo, energía y '
               + 'recarga.',
            ajustes: [
                { clave: 'seed', etiqueta: 'Semilla', valor: 42 },
                { clave: 'plantas', etiqueta: 'Plantas', valor: 18, min: 4, max: 40 },
            ],
            boton: '▶ DESPEGAR',
            final: {
                gana: '¡Encontrado!',
                pierde: 'Sin batería',
                detalleGana: 'Estaba en la planta {solucion}. Miraste {escaneadas} de {plantas}.',
                detallePierde: 'Estaba en la planta {solucion} y no llegaste. '
                             + 'Miraste {escaneadas} de {plantas}.',
            },
        },

        /**
         * El orden en que debería correr un tick. Declarado, no aplicado: el
         * mueble todavía lo lleva escrito a mano. Es la deuda que se ve al
         * comparar con Flecs y DOTS, que sí planifican por fases.
         */
        fases: ['intencion', 'movimiento', 'reglas', 'sustrato'],
    };
}
