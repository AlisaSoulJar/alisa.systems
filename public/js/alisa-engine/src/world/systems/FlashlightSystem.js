/**
 * FlashlightSystem.js — LA LINTERNA: UN CONO QUE SE APAGA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const linterna = new FlashlightSystem({ angulo: 0.5, alcance: 18 });
 *     linterna.alternar(energia);            // la F del teclado
 *     linterna.tick(dt, energia);            // una vez por fotograma
 *     if (linterna.alumbra(pos, mirando, puerta)) { … }
 *     sustrato.piezas.push(linterna.pieza({ x, y, alto }));
 *
 * Un cono que nace de donde estás, apunta a donde miras, gasta un recurso
 * mientras está encendido y se apaga solo cuando ese recurso llega a cero. Eso es
 * todo. No sabe si por fuera es una linterna, un faro de coche, el foco de un
 * submarino o el escáner de un satélite.
 *
 * ⚠️ POR QUÉ EXISTE: DIECISIETE FICHEROS SE LA ESCRIBÍAN.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Medido el 26-08-2026, contando `flashlight|linterna` en todo `public/`:
 *
 *     croupier_corporate_building.html      73     el juego de sigilo
 *     corporate_building_legacy.html        57     copia vieja
 *     corporate_building_horror_base.html   44     otra copia vieja
 *     CabinetEscapeGame.js                  43     ¡Esquiva!
 *     raccoon_floor_search.html             30     ¡Busca! 3
 *     ProceduralBuildingFactory.js          28
 *     …y once más — DIECISIETE en total, y CERO sistemas.
 *
 * Y no es una mecánica de adorno: `RechargeSystem.PIELES` lleva escrito desde que
 * se escribió que sin pila «la linterna se apaga y no se puede registrar a
 * oscuras». O sea que la linterna ES la condición de una regla, repetida
 * diecisiete veces a mano.
 *
 * ⚠️ Y ES HEADLESS: EL CONO ES MATEMÁTICA, NO UNA `SpotLight`.
 *
 * Aquí no se importa el motor de render. Lo que este sistema decide es **qué está
 * alumbrado** —una prueba de ángulo y distancia— porque eso es REGLA: cambia lo
 * que puedes hacer. El foco que se ve es ARTE, y lo pone quien dibuje.
 *
 * Es la misma frontera que ya aprendimos con las figuras: el núcleo dice dónde
 * está cada cosa y de qué tipo; la piel dice de qué color. Si el cono viviera en
 * una `SpotLight`, el banco no podría jugar a oscuras — y el banco corre sin
 * pantalla.
 */

export class FlashlightSystem {
    /**
     * @param {Object}  [cfg]
     * @param {number}  [cfg.angulo=0.5]     medio ángulo del cono, en radianes
     * @param {number}  [cfg.alcance=18]     hasta dónde llega
     * @param {boolean} [cfg.empiezaEncendida=true]
     * @param {string}  [cfg.piel='linterna'] cómo se llama en el sustrato
     */
    constructor(cfg = {}) {
        this.angulo = cfg.angulo ?? 0.5;
        this.alcance = cfg.alcance ?? 18;
        this.piel = cfg.piel ?? 'linterna';
        this.empiezaEncendida = cfg.empiezaEncendida !== false;
        this.encendida = this.empiezaEncendida;
        /** Se pone a `true` el fotograma en que se apaga sola. Sirve para avisar. */
        this.seAcabaDeApagar = false;
    }

    reset() {
        this.encendida = this.empiezaEncendida;
        this.seAcabaDeApagar = false;
    }

    /**
     * La tecla. Se niega a encenderse sin recurso — que es lo que hacía la página
     * del juego de sigilo con `if (hudEnergy <= 0 && !flashLightOn) return;`.
     *
     * @param {Object} [energia] `EnergyComponent` (o `{currentEnergy, isOn}`)
     * @returns {boolean} el estado en que queda
     */
    alternar(energia = null) {
        const sinRecurso = energia && (energia.currentEnergy ?? 0) <= 0;
        if (!this.encendida && sinRecurso) return false;
        this.encendida = !this.encendida;
        if (energia && 'isOn' in energia) energia.isOn = this.encendida;
        return this.encendida;
    }

    /**
     * Sincroniza con el recurso. Si se agota, se apaga sola — y lo DICE, porque
     * quedarse a oscuras de golpe sin aviso es lo que hace que una partida
     * parezca rota en vez de perdida.
     */
    tick(dt, energia = null) {
        this.seAcabaDeApagar = false;
        if (!energia) return this.encendida;
        if (this.encendida && (energia.currentEnergy ?? 0) <= 0) {
            this.encendida = false;
            this.seAcabaDeApagar = true;
            if ('isOn' in energia) energia.isOn = false;
        }
        // El gasto lo lleva `EnergySystem` mirando `isOn`: aquí sólo se dice si
        // está encendida. Dos sistemas que gasten el mismo recurso es cómo se
        // acaba drenando el doble — medido en ¡Busca! 7, 2,5/s cuando decía 1,5.
        if ('isOn' in energia) energia.isOn = this.encendida;
        return this.encendida;
    }

    /**
     * ¿Está iluminado un punto? Prueba de distancia y de ángulo, en 3D.
     *
     * @param {{x,y,z}} desde     dónde está quien alumbra
     * @param {{x,y,z}} mirando   vector de dirección (no hace falta normalizarlo)
     * @param {{x,y,z}} punto     lo que se quiere comprobar
     */
    alumbra(desde, mirando, punto) {
        if (!this.encendida) return false;
        const dx = punto.x - desde.x;
        const dy = (punto.y ?? 0) - (desde.y ?? 0);
        const dz = punto.z - desde.z;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d > this.alcance || d < 1e-6) return d <= this.alcance;

        const ml = Math.sqrt(
            mirando.x * mirando.x + (mirando.y ?? 0) * (mirando.y ?? 0) + mirando.z * mirando.z) || 1;
        const cos = (dx * mirando.x + dy * (mirando.y ?? 0) + dz * mirando.z) / (d * ml);
        return cos >= Math.cos(this.angulo);
    }

    /**
     * La linterna, para el sustrato. Sale como PIEZA porque es estado del juego
     * que se ve: quien dibuja pinta un cono, y quien lee sabe si hay luz.
     *
     * El `alcance` va en la pieza —igual que en los refugios del submarino y en
     * las pilas— para que el dibujante no tenga que saber los números del núcleo.
     */
    pieza({ x = 0, y = 0, alto = 0, de = 1, cajon = null } = {}) {
        return {
            t: this.piel, x, y, alto, de,
            cajon: cajon ?? this.piel,
            encendida: this.encendida,
            alcance: this.encendida ? this.alcance : 0,
            angulo: this.angulo,
        };
    }

    vocabulario() {
        return {
            leyenda: { [this.piel]: 'tu luz: sólo se registra lo que alumbra' },
            simbolos: { [this.piel]: '¡' },
        };
    }
}
