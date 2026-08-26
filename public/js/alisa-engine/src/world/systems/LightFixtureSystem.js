/**
 * LightFixtureSystem.js — LAS LUCES FIJAS DEL MUNDO, QUE TAMBIÉN SON ZONAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const luces = new LightFixtureSystem({ radio: 7, minutero: 13 });
 *     luces.sembrar([{ x: 0, y: 5, z: 0, seguro: true }, …]);
 *     luces.pulsar(3);                       // el interruptor del rellano
 *     luces.tick(dt);
 *     if (luces.zonaSegura(pos)) { … }       // aquí no te alcanzan
 *     sustrato.piezas.push(...luces.piezas());
 *
 * Bombillas de rellano, la luz del ascensor, una farola, el fluorescente de un
 * pasillo. Cada una tiene sitio, radio, un interruptor y —si se le pone— un
 * minutero que la apaga sola.
 *
 * ⚠️ LA IDEA QUE HACE FALTA ENTENDER: LA LUZ ES UNA ZONA, NO UN ADORNO.
 *
 * En un juego de esconderse, una bombilla encendida no es decoración: es un
 * SITIO DONDE NO TE PILLAN. Y esa es la mecánica —igual que las medusas y el
 * arrecife del submarino son escondites, o que la planta iluminada de la torre
 * es la que ya has mirado.
 *
 * Por eso `seguro` es un parámetro POR LUZ y no una propiedad del sistema: una
 * farola de calle alumbra y no protege de nada; la bombilla de un rellano
 * protege. Misma pieza, otro número. Si «luz» y «refugio» fueran dos sistemas,
 * el día que un juego quiera las dos cosas tendría que sincronizarlas a mano —
 * y ahí es donde se separan.
 *
 * ⚠️ Y ES HEADLESS, COMO LA LINTERNA.
 *
 * Lo que decide es QUÉ ESTÁ ALUMBRADO —una prueba de distancia— porque eso
 * cambia lo que puedes hacer. La bombilla que se ve es arte, y la pone quien
 * dibuje leyendo estas piezas del sustrato.
 *
 * ⚠️ EL MINUTERO NO SE REIMPLEMENTA: ES `TimedRelaySystem`.
 *
 * Ese sistema ya existe —27 líneas, con su `maxTime` de 13 segundos, que es el
 * minutero del edificio de ¡Busca! 3—. Aquí se usa su misma forma: `pulsar()`
 * arranca la cuenta y `tick()` la baja. Se lleva dentro en vez de por ECS porque
 * estas luces son un CONJUNTO —se siembran, se preguntan y se publican juntas—,
 * igual que `RechargeSystem` lleva sus puntos.
 */

export class LightFixtureSystem {
    /**
     * @param {Object}  [cfg]
     * @param {number}  [cfg.radio=7]        alcance por defecto de cada luz
     * @param {number}  [cfg.minutero=0]     segundos hasta apagarse sola; 0 = nunca
     * @param {boolean} [cfg.empiezanEncendidas=false]
     * @param {string}  [cfg.piel='bombilla']  cómo se llama en el sustrato
     * @param {boolean} [cfg.seguro=true]    si por defecto protegen
     */
    constructor(cfg = {}) {
        this.radio = cfg.radio ?? 7;
        this.minutero = cfg.minutero ?? 0;
        this.empiezanEncendidas = cfg.empiezanEncendidas ?? false;
        this.piel = cfg.piel ?? 'bombilla';
        this.seguroPorDefecto = cfg.seguro !== false;
        this.luces = [];
    }

    /** Coloca las luces. Cada una puede pisar el radio, el minutero y `seguro`. */
    sembrar(sitios = []) {
        this.luces = sitios.map((s, i) => ({
            i,
            x: s.x ?? 0, y: s.y ?? 0, z: s.z ?? 0,
            radio: s.radio ?? this.radio,
            seguro: s.seguro ?? this.seguroPorDefecto,
            encendida: s.encendida ?? this.empiezanEncendidas,
            minutero: s.minutero ?? this.minutero,
            queda: (s.encendida ?? this.empiezanEncendidas) ? (s.minutero ?? this.minutero) : 0,
            /** Se pone a `true` el fotograma en que se apaga sola. */
            seAcabaDeApagar: false,
        }));
        return this.luces.length;
    }

    /**
     * El interruptor. Enciende y arranca la cuenta atrás; volver a pulsarla la
     * apaga. Sin minutero, se queda encendida.
     */
    pulsar(i) {
        const l = this.luces[i];
        if (!l) return false;
        l.encendida = !l.encendida;
        l.queda = l.encendida ? l.minutero : 0;
        return l.encendida;
    }

    /** Enciende sin alternar — para el arranque de una partida o un guion. */
    encender(i) {
        const l = this.luces[i];
        if (!l) return false;
        l.encendida = true;
        l.queda = l.minutero;
        return true;
    }

    /**
     * Baja los minuteros. Devuelve las que se han apagado en este paso, porque
     * quedarse a oscuras de golpe sin aviso es lo que hace que una partida
     * parezca rota en vez de perdida — la misma razón que en `FlashlightSystem`.
     */
    tick(dt) {
        const apagadas = [];
        for (const l of this.luces) {
            l.seAcabaDeApagar = false;
            if (!l.encendida || !l.minutero) continue;
            l.queda -= dt;
            if (l.queda <= 0) {
                l.queda = 0;
                l.encendida = false;
                l.seAcabaDeApagar = true;
                apagadas.push(l.i);
            }
        }
        return apagadas;
    }

    /** ¿Llega luz a este punto? */
    alumbrado(punto) {
        return this.luces.some((l) => l.encendida && this._dentro(l, punto));
    }

    /**
     * ¿Está a salvo? Alumbrado **y** por una luz que protege. Son dos preguntas
     * distintas a propósito: hay juegos donde ver no es estar a salvo.
     */
    zonaSegura(punto) {
        return this.luces.some((l) => l.encendida && l.seguro && this._dentro(l, punto));
    }

    /** La luz encendida más cercana — para que un piloto pueda correr hacia ella. */
    refugioMasCercano(punto) {
        let mejor = null;
        for (const l of this.luces) {
            if (!l.encendida || !l.seguro) continue;
            const d = this._distanciaSq(l, punto);
            if (!mejor || d < mejor.d) mejor = { l, d };
        }
        return mejor?.l ?? null;
    }

    /** Las apagadas, que es a donde hay que ir a dar al interruptor. */
    apagadas() {
        return this.luces.filter((l) => !l.encendida);
    }

    _distanciaSq(l, p) {
        const dx = l.x - p.x, dy = (l.y ?? 0) - (p.y ?? 0), dz = l.z - p.z;
        return dx * dx + dy * dy + dz * dz;
    }

    _dentro(l, p) {
        return this._distanciaSq(l, p) <= l.radio * l.radio;
    }

    /**
     * Las luces, para el sustrato. Sale el `alcance` —cero si está apagada— para
     * que el dibujante pinte el charco de luz sin saber los números del núcleo, y
     * para que un agente vea dónde puede ponerse a salvo.
     */
    piezas({ de = 0 } = {}) {
        return this.luces.map((l) => ({
            t: this.piel,
            x: l.x, y: l.y, alto: l.y, z: l.z, de,
            cajon: `${this.piel}_${l.i}`,
            encendida: l.encendida,
            alcance: l.encendida ? l.radio : 0,
            seguro: l.seguro,
            queda: Math.round(l.queda * 10) / 10,
        }));
    }

    vocabulario() {
        return {
            leyenda: {
                [this.piel]: this.seguroPorDefecto
                    ? 'luz encendida: aquí no te alcanzan'
                    : 'luz encendida',
            },
            simbolos: { [this.piel]: 'o' },
        };
    }
}
