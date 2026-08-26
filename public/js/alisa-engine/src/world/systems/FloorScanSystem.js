/**
 * FloorScanSystem.js — BUSCAR ALGO ESCONDIDO, PLANTA A PLANTA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const busqueda = new FloorScanSystem({ plantas: 18, cuestaFallar: 5 });
 *     busqueda.reset(() => rng.next());
 *     busqueda.escanear(7, energia);      // energia = EnergyComponent
 *     sustrato.piezas.push(...busqueda.piezas());
 *
 * Un edificio de N plantas con UNA escondida, que se descubre mirando de una en
 * una y cuesta recurso equivocarse. Eso es todo. No sabe si por fuera es un
 * rascacielos, un acuario o una ciudad: eso lo pone quien lo use.
 *
 * ⚠️ POR QUÉ SE EXTRAE, Y ES EL MOTIVO POR EL QUE «CHOPPER AQUARIUM» CHIRRIABA.
 *
 * `ChopperAquariumEngine` son 413 líneas con DOS JUEGOS dentro, y medido están
 * casi al 50%:
 *
 *     37 referencias al edificio    (plantas, objetivo, escaneadas, activeFloor)
 *     30 referencias al ecosistema  (peces, cazadores, tiburones, plancton)
 *
 * Un helicóptero-pez escaneando un rascacielos dentro de una pecera no es una
 * ambientación rara: son dos juegos pegados. Uno es ¡Busca! —encontrar algo que
 * se esconde— y el otro es ¡Sobrevive! —no ser lo que se comen—. Y el propio
 * juego lo dice en su portada: «scanning a procedural skyscraper for a hidden
 * raccoon», que es la definición literal de la otra saga.
 *
 * ⚠️ Y SE EXTRAE ANTES DE PARTIR NADA, A PROPÓSITO.
 * Primero sacar la pieza y que el motor viejo la COMPONGA —sin cambiar una coma
 * de su comportamiento, comprobado con `prueba_huella`—, y sólo después montar
 * la etapa nueva encima. Partir primero y arreglar después es como se rompe una
 * etapa que el banco ya mide.
 */

export class FloorScanSystem {
    /**
     * @param {Object}  [cfg]
     * @param {number}  [cfg.plantas=18]      cuántas hay
     * @param {number}  [cfg.cuestaFallar=5]  recurso que se pierde al no acertar
     * @param {number}  [cfg.margen=1]        plantas de los extremos que nunca
     *                                        esconden nada (la calle y la azotea)
     */
    constructor(cfg = {}) {
        this.plantas = cfg.plantas ?? 18;
        this.cuestaFallar = cfg.cuestaFallar ?? 5;
        this.margen = cfg.margen ?? 1;
        this.objetivo = -1;
        this.escaneadas = new Set();
        this.ultima = -1;
        this.resuelto = false;
    }

    /**
     * Esconde el objetivo. Recibe la función de azar en vez de fabricarse una:
     * quien reparte el mundo es el núcleo, con su semilla, y una pieza que se
     * saca su propio generador es una pieza que juega otra partida.
     *
     * ⚠️ UNA SOLA TIRADA, Y EN ESTE ORDEN. `ChopperAquariumEngine` hacía
     * exactamente `Math.floor(rng() * (plantas - 2)) + 1` como PRIMERA llamada
     * tras sembrar. Cambiar el número de tiradas o su sitio movería todo el
     * mundo de esa etapa —peces incluidos— con la misma semilla.
     */
    reset(azar) {
        const r = typeof azar === 'function' ? azar : Math.random;
        this.objetivo = Math.floor(r() * (this.plantas - this.margen * 2)) + this.margen;
        this.escaneadas = new Set();
        this.ultima = -1;
        this.resuelto = false;
        return this.objetivo;
    }

    /** ¿Queda algo por mirar? */
    quedan() {
        return this.plantas - this.escaneadas.size;
    }

    /**
     * Mira una planta.
     *
     * @param {number} idx
     * @param {Object} [energia]  `EnergyComponent` (o `{currentEnergy}`)
     * @returns {{estado: 'repetida'|'acierto'|'fallo', sinRecurso: boolean}}
     */
    escanear(idx, energia = null) {
        if (this.resuelto || idx < 0 || idx >= this.plantas) {
            return { estado: 'repetida', sinRecurso: false };
        }
        if (this.escaneadas.has(idx)) return { estado: 'repetida', sinRecurso: false };

        this.escaneadas.add(idx);
        this.ultima = idx;

        if (idx === this.objetivo) {
            this.resuelto = true;
            return { estado: 'acierto', sinRecurso: false };
        }
        if (energia) {
            energia.currentEnergy = Math.max(0, (energia.currentEnergy ?? 0) - this.cuestaFallar);
            if (energia.currentEnergy <= 0 && 'isOn' in energia) energia.isOn = false;
        }
        return { estado: 'fallo', sinRecurso: !!energia && energia.currentEnergy <= 0 };
    }

    /**
     * Las plantas, para el sustrato.
     *
     * ⚠️ SÓLO SE DICE LO QUE QUIEN JUEGA SABE. Una planta sin mirar sale como
     * `sin_mirar`, y la escondida sólo aparece como `objetivo` DESPUÉS de
     * encontrarla. Publicar dónde está pondría la solución en el sustrato, y
     * quien lo lea —un dibujante o un agente— la vería. Misma regla que en
     * ¡Busca! 3.
     *
     * `y` es el número de planta: es el eje por el que se busca. `x` va a cero
     * porque una planta no tiene sitio a lo ancho — lo que se elige es la altura.
     *
     * ⚠️ Y `alto` VA APARTE, PORQUE UNA PLANTA SE LEE DE DOS MANERAS.
     *
     * Para el texto y el dibujo en 2D, la planta es un ÍNDICE: la fila séptima
     * de una lista. Para un mundo en 3D es una ALTURA: siete pisos por encima
     * del suelo. Las dos son verdad y el contrato tiene sitio para las dos.
     *
     * Sin esto se ve al ir a pintarlo: un pintor 3D pone todas las plantas a
     * ras de suelo repartidas hacia el fondo, y lo que era una torre sale como
     * una fila de losas. Quien conozca la altura de piso la pasa; quien no,
     * recibe el índice, que es lo que había.
     */
    piezas({ de = 0, x = 0, altoPlanta = null } = {}) {
        const fuera = [];
        for (let i = 0; i < this.plantas; i++) {
            const vista = this.escaneadas.has(i);
            const esLaBuena = vista && i === this.objetivo;
            const p = {
                /**
                 * ⚠️ CON ALTURA DE PISO, LA PLANTA NO SE MUEVE POR EL SUELO.
                 *
                 * `y` es el SEGUNDO EJE DEL SUELO en el contrato del sustrato, no
                 * un número de planta. Aquí ponía `y: i` siempre, y quien pasaba
                 * `altoPlanta` se llevaba las dos cosas a la vez: la planta 12
                 * subía a su altura Y se iba doce unidades hacia el fondo.
                 *
                 * Medido en ¡Busca! 7 con el edificio ya puesto detrás: la torre
                 * salía INCLINADA, dieciocho losas escapándose en diagonal por
                 * detrás del edificio. Llevaba así desde que se escribió, y no se
                 * veía porque sin edificio una torre torcida sigue pareciendo una
                 * torre.
                 *
                 * Quien no pasa altura de piso sigue recibiendo el índice: para
                 * una vista plana o de texto, la planta ES una fila.
                 */
                x, y: altoPlanta ? 0 : i, de,
                t: esLaBuena ? 'objetivo' : vista ? 'mirada' : 'sin_mirar',
                cajon: `planta_${i}`,
            };
            if (altoPlanta) p.alto = i * altoPlanta + altoPlanta / 2;
            fuera.push(p);
        }
        return fuera;
    }

    vocabulario() {
        return {
            leyenda: {
                sin_mirar: 'planta sin escanear', mirada: 'ya escaneada',
                objetivo: '¡aquí estaba!',
            },
            simbolos: { sin_mirar: '?', mirada: '.', objetivo: '*' },
        };
    }
}
