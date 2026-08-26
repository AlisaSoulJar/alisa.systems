/**
 * RechargeSystem.js — LA OTRA MITAD DE LA PILA: DÓNDE SE RECARGA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const recargas = new RechargeSystem({ piel: 'pila', da: 25, alcance: 1.0 });
 *     recargas.sembrar([{ x, y, z }, …]);
 *     recargas.tick(posicionDelJugador, energia);   // energia = EnergyComponent
 *     sustrato.piezas.push(...recargas.piezas());
 *
 * ⚠️ POR QUÉ EXISTE, Y ESTÁ MEDIDO ETAPA POR ETAPA EL 2026-08-26.
 *
 * `EnergySystem` ya sabe GASTAR: drena `currentEnergy` a `drainRate` y apaga el
 * aparato al llegar a cero. Lo que no existía en NINGUNA parte del motor es lo
 * contrario — volver a llenar—, y por eso la mecánica estaba coja en cuatro de
 * las cinco etapas que la usan:
 *
 *     ¡Busca! 1  Cabinet     linterna sí · gasta sí · pilas SÍ · se recogen SÍ
 *     ¡Busca! 2  Registro    linterna sí · gasta sí · pilas NO
 *     ¡Busca! 3  Corp        linterna rota · gasta doble · pilas escritas y MUERTAS
 *     ¡Busca! 4/5/6 mapache  sin linterna · combustible sí · recargas NO
 *     ¡Sobrevive! 2 Chopper  sin linterna · drainRate 0 · recargas NO
 *
 * Cabinet Escape era la única entera, y su recogida está escrita a mano dentro
 * de la página. El resto tenía la barra bajando y ninguna forma de subirla, que
 * no es un juego de recurso: es una cuenta atrás.
 *
 * ⚠️ Y ES UNA SOLA MECÁNICA CON TRES PIELES, NO TRES MECÁNICAS.
 *
 * Sin luz te come el fantasma; sin combustible te estrellas; sin enlace te
 * quedas ciego. Cambian los parámetros y el nombre, no la regla. Declararlo así
 * es lo que impide que dentro de un mes haya tres implementaciones distintas de
 * «coger una cosa del suelo que sube una barra» — que es exactamente lo que
 * este proyecto lleva semanas midiéndose.
 *
 * ⚠️ Y LOS PUNTOS SE PUBLICAN EN EL SUSTRATO. ESA ES LA MITAD QUE FALTABA.
 *
 * Hoy la persona ve una barra en el HUD y el agente no ve NADA: ninguna etapa
 * publica la energía ni las recargas en su `sustrato()`. Si la linterna va a ser
 * un recurso de verdad, los dos tienen que poder verlo, o el banco compara a dos
 * que juegan a cosas distintas.
 */

/**
 * Las pieles. Misma regla, distinto nombre y distinta consecuencia.
 *
 * `sinEl` no es decoración: es lo que el juego DEBE hacer al llegar a cero, y
 * está escrito para que quien monte una etapa nueva no se lo invente.
 */
export const PIELES = {
    pila: {
        recurso: 'bateria', punto: 'pila',
        sinEl: 'la linterna se apaga y no se puede registrar a oscuras',
    },
    combustible: {
        recurso: 'combustible', punto: 'bidon',
        sinEl: 'la nave deja de sostenerse',
    },
    /**
     * ⚠️ EL SATÉLITE NO LLEVA GASOLINA, Y ESA ERA LA PISTA.
     * En las etapas del mapache el HUD pone `BATTERY: 100%` y lo que baja es el
     * combustible de la nave: una etiqueta que nombra una mecánica que no está.
     * Un satélite que PIERDE EL ENLACE y tiene que volver a sincronizar es la
     * misma regla —un recurso que se agota y se recupera en puntos del mundo—
     * pero contando algo que encaja con lo que se ve.
     */
    enlace: {
        recurso: 'enlace', punto: 'sincronizacion',
        sinEl: 'se pierde la señal y el escáner deja de leer',
    },
};

export class RechargeSystem {
    /**
     * @param {Object}  [cfg]
     * @param {string}  [cfg.piel='pila']   clave de `PIELES`
     * @param {number}  [cfg.da=25]         cuánto devuelve cada punto
     * @param {number}  [cfg.alcance=1.0]   a qué distancia se recoge
     * @param {boolean} [cfg.reaparece=false] si el punto vuelve tras un rato
     * @param {number}  [cfg.espera=20]     segundos hasta reaparecer
     */
    constructor(cfg = {}) {
        this.piel = PIELES[cfg.piel] ? cfg.piel : 'pila';
        this.da = cfg.da ?? 25;
        this.alcance = cfg.alcance ?? 1.0;
        this.reaparece = cfg.reaparece ?? false;
        this.espera = cfg.espera ?? 20;
        this.puntos = [];
        this.recogidos = 0;
    }

    /**
     * Coloca los puntos. Las posiciones VIENEN DADAS, no se sortean aquí.
     *
     * ⚠️ A propósito: si esto tirara del azar por su cuenta, el mundo dibujado y
     * el que el juego cree tener serían dos partidas distintas. Quien reparte el
     * mundo es el núcleo, con su semilla; esto sólo lleva la cuenta.
     */
    sembrar(posiciones = []) {
        this.puntos = posiciones.map((p, i) => ({
            id: `${PIELES[this.piel].punto}_${i}`,
            x: p.x ?? 0, y: p.y ?? 0, z: p.z ?? 0,
            tomado: false, vuelveEn: 0,
        }));
        this.recogidos = 0;
        return this.puntos;
    }

    /** Los que siguen ahí para cogerse. */
    disponibles() {
        return this.puntos.filter((p) => !p.tomado);
    }

    /**
     * Avanza el mundo de las recargas: mira si alguien pisa un punto y, si toca,
     * devuelve los que reaparecen.
     *
     * @param {{x,y,z}} donde        posición de quien recoge
     * @param {Object}  energia      un `EnergyComponent` (o cualquier objeto con
     *                               `currentEnergy` y `maxEnergy`)
     * @param {number}  [dt=0]       para la reaparición
     * @returns {Object|null}        el punto recogido, o null
     */
    tick(donde, energia, dt = 0) {
        if (this.reaparece) {
            for (const p of this.puntos) {
                if (!p.tomado) continue;
                p.vuelveEn -= dt;
                if (p.vuelveEn <= 0) p.tomado = false;
            }
        }
        if (!donde || !energia) return null;

        for (const p of this.puntos) {
            if (p.tomado) continue;
            const dx = p.x - (donde.x ?? 0);
            const dy = p.y - (donde.y ?? 0);
            const dz = p.z - (donde.z ?? 0);
            if (dx * dx + dy * dy + dz * dz > this.alcance * this.alcance) continue;

            p.tomado = true;
            p.vuelveEn = this.espera;
            this.recogidos++;
            const tope = energia.maxEnergy ?? 100;
            energia.currentEnergy = Math.min(tope, (energia.currentEnergy ?? 0) + this.da);
            // Recargar vuelve a encender: quedarse a oscuras con la pila puesta
            // sería el mismo fallo que tener pilas que no se pueden coger.
            if (energia.currentEnergy > 0 && 'isOn' in energia) energia.isOn = true;
            return p;
        }
        return null;
    }

    /**
     * Las piezas para el `sustrato()` del núcleo que la use.
     *
     * `alcance` va dentro a propósito: sin él, quien lea el sustrato sabe DÓNDE
     * está la pila pero no a qué distancia se coge, y eso es la mitad de la
     * información. El contrato ya tiene ese campo.
     *
     * ⚠️ Y `cajon` TAMBIÉN, QUE SE ME OLVIDÓ Y LO CAZÓ `prueba_pintor_mundo`.
     *
     * `cajon` es la IDENTIDAD de la pieza entre fotogramas: es por donde el
     * dibujante reconoce que este punto de sincronización es el mismo de antes.
     * Sin él la prueba dijo «3 de 40 figuras no están donde dice el sustrato»
     * —las tres eran las mías— porque no podía emparejarlas con ninguna malla; y
     * en un juego de verdad habría rehecho la figura en cada fotograma, que es
     * el fallo contra el que existe esa prueba.
     */
    piezas({ de = 9 } = {}) {
        const t = PIELES[this.piel].punto;
        return this.disponibles().map((p) => ({
            x: p.x, y: p.z, alto: p.y, t, de, alcance: this.alcance, cajon: p.id,
        }));
    }

    /** Lo que hay que añadir a `leyenda` y `simbolos` para que se entienda. */
    vocabulario() {
        const { punto, recurso } = PIELES[this.piel];
        // Redondeado: `da` suele ser una fracción del depósito, y una leyenda que
        // pone «+3.8499999999999996» la lee una persona y la lee un agente.
        const cuanto = Math.round(this.da * 10) / 10;
        return {
            leyenda: { [punto]: `recarga ${recurso} (+${cuanto})` },
            simbolos: { [punto]: '+' },
        };
    }
}
