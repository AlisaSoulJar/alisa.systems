/**
 * pintor_mundo — EL PINTOR COMPARTIDO DE LOS MUNDOS
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
 * ⚠️ POR QUÉ «PINTOR» Y NO «MESA», QUE ES COMO SE LLAMABA HASTA HOY.
 *
 * Porque son dos oficios y los tenía con el mismo prefijo. Medido:
 *
 *     mesa_tablero.mjs   1231 líneas   `montarMesa({juego})` — monta la mesa
 *     mesa_cartas.mjs    1936 líneas    ENTERA: escena, interacción, la regla
 *                                       de oro de `legal_moves`
 *     pintor_matriz.mjs   110 líneas   una clase con `pintar(sustrato)`
 *     pintor_mundo.mjs    208 líneas   ídem, en 3D
 *
 * **Una mesa se monta; un pintor pinta.** Y el nombre bueno ya existía en casa:
 * `arcade/js/protohub/render/pintar3d.js` exporta `crearPintor3d` desde hace
 * meses. O sea que la familia «esto pinta un sustrato» ya se llamaba pintor, y yo
 * les había puesto mesa a dos pintores.
 *
 * ⚠️ Y LA PREGUNTA INCÓMODA: ¿ES ESTO UN DUPLICADO DE `crearPintor3d`?
 *
 * Se miró antes de renombrar, y no lo es — pero el solape es real y conviene
 * tenerlo escrito, porque la próxima vez puede que sí:
 *
 *   · `crearPintor3d` es PLANO: la altura que usa es la de la FORMA (`ALTO` por
 *     tipo), nunca la de la pieza. No lee `p.alto`. Es un pintor de tableros.
 *   · dibuja INSTANCIADO — 561 piezas de fagocito en dos llamadas de dibujo—, y
 *     por eso mismo no puede aceptar la figura que trae una página: una instancia
 *     no es un objeto, y un planeta con textura y anillo no cabe ahí.
 *   · esto es el caso contrario: pocas piezas, altura libre, y cada una puede ser
 *     un objeto propio de la página (ver el enganche `malla`).
 *
 * Dos trabajos distintos. Si algún día un mundo necesita quinientas piezas
 * iguales, el sitio al que mirar es aquél, no éste.
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

export class PintorMundo {
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
    _malla(clave, tipo, pieza) {
        if (this._piezas.has(clave)) return this._piezas.get(clave);
        const e = { ...POR_DEFECTO, ...(this.estilo[tipo] ?? {}) };

        /**
         * ⚠️ SI EL MUNDO TRAE SU PROPIA FIGURA, MANDA LA SUYA.
         *
         * Sin esto, el pintor sólo sirve para mundos que se conformen con esferas y
         * cajas — y las tres etapas de ¡Busca! tienen planetas con textura hechos
         * por una factoría. La disyuntiva sería: o el sustrato o el arte. Con el
         * enganche no hay disyuntiva: la posición, la identidad y el «esto ya no
         * está» los sigue llevando el pintor desde el sustrato, y la página sólo
         * aporta cómo se ve. Que es exactamente lo único que le toca.
         *
         * Recibe el tipo y la pieza entera: el tipo porque una misma página tiene
         * varias figuras, y la pieza porque una página con arte ya tiene sus
         * mallas hechas y necesita saber CUÁL le están pidiendo —para eso el
         * mundo publica `cajon`—. Con sólo el tipo habría que llevar la cuenta por
         * fuera, y esa cuenta se descuadra la primera vez que algo muere.
         */
        if (typeof e.malla === 'function') {
            const propia = e.malla(tipo, pieza);
            propia.userData.mallaPropia = true;
            this.grupo.add(propia);
            this._piezas.set(clave, propia);
            return propia;
        }

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
        /**
         * ⚠️ UN MUNDO SIN CASILLAS NO SE CENTRA, Y ESTO ESTABA MAL.
         *
         * Con rejilla, la casilla (0,0) es la esquina y hay que correr la escena
         * media rejilla para que el tablero quede centrado en el origen. Sin
         * rejilla —¡Busca! en el cubo y en la esfera— las coordenadas del sustrato
         * YA son las del mundo, y la corrección sobra: dejaba todo desplazado
         * media casilla, con la nave en 0.5 cuando el motor la tenía en 0.
         *
         * No lo vio nadie porque hasta hoy ninguna página usaba este pintor: tenía
         * nueve mundos de clientes en las pruebas y cero en pantalla.
         */
        const ox = sus.rejilla ? sus.rejilla.ancho / 2 - 0.5 : 0;
        const oy = sus.rejilla ? sus.rejilla.alto / 2 - 0.5 : 0;
        const vivas = new Set();

        for (let i = 0; i < (sus.piezas?.length ?? 0); i++) {
            const p = sus.piezas[i];
            /**
             * ⚠️ SI EL MUNDO DA UN NOMBRE A LA PIEZA, ESE NOMBRE ES SU IDENTIDAD
             * — Y EL TIPO NO ENTRA EN ÉL.
             *
             * Con la clave anterior, `tipo#índice`, una pieza que CAMBIA DE TIPO
             * pasaba por pieza nueva. En ¡Busca! eso es la mecánica entera:
             * escanear un planeta lo pasa de `sin_escanear` a `caliente`. El pintor
             * fabricaba otra malla, escondía la de antes, y una página con arte
             * propio perdía el planeta que llevaba puesto.
             *
             * El sustrato ya tenía sitio para esto —`cajon`, que usa el mueble— y
             * lo que faltaba era usarlo aquí. Cuando el mundo lo publica, la
             * identidad es suya y el tipo se queda en lo que es: apariencia.
             * Cuando no, se sigue como antes.
             */
            const clave = p.cajon !== undefined ? `#${p.cajon}` : `${p.t}#${i}`;
            vivas.add(clave);
            const e = { ...POR_DEFECTO, ...(this.estilo[p.t] ?? {}) };

            let m = this._piezas.get(clave);
            /**
             * Una malla que hizo el pintor y cuya pieza ha cambiado de tipo hay que
             * rehacerla: su forma y su color venían del tipo viejo. Una figura que
             * puso la página NO se toca — su apariencia es cosa suya, y para eso
             * tiene `aplicar`, que se llama cada fotograma con la pieza.
             */
            if (m && m.userData.tipoDibujado !== p.t && !m.userData.mallaPropia) {
                this.grupo.remove(m);
                this._piezas.delete(clave);
                m = null;
            }
            if (!m) m = this._malla(clave, p.t, p);
            m.userData.tipoDibujado = p.t;
            m.position.set(
                (p.x - ox) * c,
                (p.alto ?? 0) * c + (sus.rejilla ? e.alto / 2 + 0.1 : 0),
                (p.y - oy) * c,
            );
            // La vida se ve en el tamaño: sin eso, un bicho a punto de morir se
            // ve igual que uno recién llegado y no se puede decidir nada.
            if (p.vida !== undefined) {
                m.scale.setScalar(0.45 + 0.55 * Math.max(0, Math.min(1, p.vida)));
            }
            m.visible = true;
            /**
             * El último retoque lo da el mundo, si quiere: una figura propia
             * puede tener que girar hacia donde va o cambiar de color según la
             * pieza. Es cosmética, va después de colocar, y sin ella se dibuja
             * igual — sólo más soso.
             */
            if (typeof e.aplicar === 'function') e.aplicar(m, p);
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
