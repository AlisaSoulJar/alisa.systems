/**
 * mesa_mundo — LA MESA COMPARTIDA DE LOS MUNDOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Dibuja cualquier mundo del banco a partir de su `sustrato()`, sin saber a qué
 * se juega. Es el análogo de `mesa_tablero.mjs`, que lleva meses pintando 24
 * juegos de arcade porque todos hablan el mismo idioma.
 *
 * POR QUÉ NO EXISTÍA HASTA HOY
 * Los mundos tenían `montarMundo()` —la sala: escena, cámara, luces, pipeline—
 * pero no el CONTRATO DE ESTADO. Medido el 24-08: **24 reglas del arcade
 * publicaban sustrato y cero mundos**. Sin idioma común no hay dibujante común,
 * y cada página se escribía el suyo: las tres de ¡Busca! comparten seis piezas
 * casi idénticas que escribí tres veces en una mañana.
 *
 * Ahora los nueve lo publican, así que esto nace con nueve clientes en vez de
 * con uno — que era la condición para que mereciera la pena escribirlo.
 *
 * ⚠️ ESTO NO SABE NINGUNA REGLA, Y ES EL PUNTO.
 * No conoce torretas ni mapaches ni tiburones: recibe `{rejilla, piezas}` y
 * pinta. Si mañana aparece un mundo nuevo con sustrato, se dibuja solo. Y si
 * alguien mete aquí una regla, la habrá metido en el sitio donde el estado y el
 * dibujo pueden separarse — que es la avería que este proyecto lleva toda la
 * semana pagando.
 */
import * as THREE from 'three';

/** Colores por defecto de las celdas del terreno, por valor. */
const TERRENO = ['#101822', '#2b2417', '#1d4030', '#3a2020', '#14303c'];

/** Cómo se ve una pieza si su mundo no dice otra cosa. */
const POR_DEFECTO = { color: '#88aacc', alto: 0.5, radio: 0.3, forma: 'esfera' };

export class MesaMundo {
    /**
     * @param {THREE.Scene} escena
     * @param {Object} [estilo] por tipo de pieza: `{color, forma, radio, alto}`.
     *        Es lo ÚNICO que un mundo tiene que aportar, y es cosmética: sin
     *        estilo se dibuja igual, sólo más soso.
     * @param {number} [celda=1] cuánto mide una casilla en unidades de escena.
     */
    constructor(escena, estilo = {}, celda = 1) {
        this.escena = escena;
        this.estilo = estilo;
        this.celda = celda;
        this.grupo = new THREE.Group();
        escena.add(this.grupo);
        this.suelo = null;
        this._piezas = new Map();      // clave → malla, para no recrear cada tick
        this._geo = new Map();
        this._mat = new Map();
    }

    /**
     * ⚠️ LAS MALLAS SE REUSAN, NO SE RECREAN.
     *
     * Un mundo puede tener cien piezas y sesenta fotogramas por segundo. Crear y
     * destruir mallas a ese ritmo es la forma clásica de que un juego se ponga a
     * tirones sin que nadie sepa por qué — y la basura no se recoge donde se
     * genera, así que el tirón aparece lejos del culpable.
     */
    _malla(clave, tipo) {
        if (this._piezas.has(clave)) return this._piezas.get(clave);
        const e = { ...POR_DEFECTO, ...(this.estilo[tipo] ?? {}) };
        const claveGeo = `${e.forma}:${e.radio}:${e.alto}`;
        if (!this._geo.has(claveGeo)) {
            this._geo.set(claveGeo, e.forma === 'caja'
                ? new THREE.BoxGeometry(e.radio * 2, e.alto, e.radio * 2)
                : e.forma === 'cono'
                ? new THREE.ConeGeometry(e.radio, e.alto, 8)
                : new THREE.SphereGeometry(e.radio, 12, 10));
        }
        if (!this._mat.has(e.color)) {
            this._mat.set(e.color, new THREE.MeshStandardMaterial({ color: e.color, roughness: 0.8 }));
        }
        const m = new THREE.Mesh(this._geo.get(claveGeo), this._mat.get(e.color));
        this.grupo.add(m);
        this._piezas.set(clave, m);
        return m;
    }

    /** El terreno. Se dibuja UNA vez: la rejilla no cambia durante la partida. */
    pintarTerreno(sus) {
        if (this.suelo || !sus.rejilla) return;
        const { ancho, alto, celdas } = sus.rejilla;
        const c = this.celda;
        this.suelo = new THREE.Group();
        const geo = new THREE.BoxGeometry(c * 0.94, 0.2, c * 0.94);
        const mats = TERRENO.map(col => new THREE.MeshStandardMaterial({ color: col, roughness: 0.95 }));
        for (let z = 0; z < alto; z++) {
            for (let x = 0; x < ancho; x++) {
                const v = celdas[z * ancho + x] ?? 0;
                const m = new THREE.Mesh(geo, mats[v] ?? mats[0]);
                m.position.set((x - ancho / 2 + 0.5) * c, 0, (z - alto / 2 + 0.5) * c);
                this.suelo.add(m);
            }
        }
        this.grupo.add(this.suelo);
    }

    /**
     * Copia el sustrato a la escena. Se llama cada fotograma.
     *
     * ⚠️ LA CLAVE DE UNA PIEZA ES SU SITIO Y SU TIPO, NO SU ORDEN.
     *
     * El sustrato es una lista, y una lista cambia de orden cuando algo muere en
     * medio. Si la malla se atara al índice, al morir el bicho 3 todos los de
     * atrás saltarían un sitio de golpe — y en pantalla se vería como un
     * teletransporte colectivo que no ha pasado en el juego.
     */
    pintar(sus) {
        this.pintarTerreno(sus);
        const c = this.celda;
        const ancho = sus.rejilla?.ancho ?? 0, alto = sus.rejilla?.alto ?? 0;
        const vivas = new Set();

        for (let i = 0; i < (sus.piezas?.length ?? 0); i++) {
            const p = sus.piezas[i];
            const clave = `${p.t}#${p.cajon ?? i}`;
            vivas.add(clave);
            const m = this._malla(clave, p.t);
            const e = { ...POR_DEFECTO, ...(this.estilo[p.t] ?? {}) };
            m.position.set(
                (p.x - ancho / 2 + 0.5) * c,
                (p.alto ?? 0) * c + e.alto / 2 + 0.1,
                (p.y - alto / 2 + 0.5) * c,
            );
            // La vida se ve en el tamaño: sin eso, un bicho a punto de morir se
            // ve igual que uno recién llegado y no se puede decidir nada.
            const k = p.vida === undefined ? 1 : 0.45 + 0.55 * Math.max(0, Math.min(1, p.vida));
            m.scale.setScalar(k);
            m.visible = true;
        }

        // Lo que ya no está en el sustrato, se esconde. No se destruye: puede
        // volver —una pieza que reaparece— y recrearla costaría un tirón.
        for (const [clave, m] of this._piezas) if (!vivas.has(clave)) m.visible = false;
    }

    limpiar() {
        for (const m of this._piezas.values()) this.grupo.remove(m);
        this._piezas.clear();
        if (this.suelo) { this.grupo.remove(this.suelo); this.suelo = null; }
    }
}
