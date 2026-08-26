import { GymEnv } from '../GymEnv.js';
import { DefiendeSystem, TORRETAS, TIPOS, CELDA, OLEADAS }
    from '../../world/systems/DefiendeSystem.js';

/**
 * ¡Defiende! 1 — Sendero
 * ═══════════════════════════════════════════════════════════════════════════
 * Protege el núcleo colocando torretas a lo largo del camino, con un
 * presupuesto que sólo crece matando.
 *
 * 🤖 numérica : LA MATRIZ, plana. Dos capas de lado×lado más cuatro escalares.
 * 🧠 lenguaje : `describe()` cuenta el terreno y `affordances()` ofrece
 *               exactamente las construcciones que caben AHORA.
 * 🕹️ humana   : `games/defiende_sendero.html` — clic en la celda.
 *
 * QUÉ MIDE QUE OTROS NO
 * El banco ya mide deducción con presupuesto (¡Busca!) y supervivencia con
 * construcción de build (Marabunta). Esto mide **colocación**: dónde gastas un
 * presupuesto limitado sobre una matriz, con información completa —el camino se
 * ve entero desde el principio— y sin poder rectificar, porque lo que construyes
 * se queda quieto. Es planificación espacial, y era el hueco.
 *
 * ⚠️ Y ES EL PRIMER ENTORNO DE LA CASA QUE NACE EN ECS.
 * Sirve de piloto: los otros cinco motores completos llevan su estado a mano.
 * Lo que se aprenda aquí decide si se migra el resto.
 */
export class DefiendeEnv extends GymEnv {
    static id = 'alisa/Defiende-v0';

    /** Los números del juego los pone el cartucho; aquí sólo se dice cuál. */
    static ajustes = DefiendeSystem.ROM.mundo;

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  LA OBSERVACIÓN ES LA MATRIZ, Y ESO ES LA TESIS DEL PROYECTO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Dos capas de lado×lado y cuatro números. La primera capa es el TERRENO
     * —qué hay en cada celda— y la segunda lo que se MUEVE encima. No es una
     * descripción del mundo: es el mundo, en la forma en que un modelo puede
     * operarlo directamente.
     *
     * Esto es lo contrario de la vía de la industria, donde un modelo de visión
     * mira una imagen y reconstruye la rejilla. Aquí traducir el mundo a matriz
     * es trabajo del motor, y lo que se mide es lo que el jugador hace CON la
     * matriz.
     *
     * Y tiene una ventaja práctica que hoy me ha costado dos fallos: **este
     * vector no se escribe a mano**. Se recorre el mundo ECS. En los motores de
     * estado propio cada entorno fabrica su vector a mano, y ahí es justo donde
     * `escaner_listo` acabó mintiéndole a la puerta numérica mientras la de
     * lenguaje decía la verdad.
     */
    static get observationSpace() {
        const L = this.ajustes.lado;
        return {
            shape: [L * L * 2 + 4],
            names: [`terreno[${L}×${L}]`, `atacantes[${L}×${L}]`,
                    'vidas', 'presupuesto', 'oleada', 'atacantes_vivos'],
            low: 0, high: 1,
        };
    }

    /**
     * ⚠️ EL ESPACIO DE ACCIÓN ES GRANDE A PROPÓSITO: 1 + 3×celdas.
     *
     * La decisión del juego es «qué torreta y en qué celda». Comprimirla —por
     * ejemplo a «pon la mejor donde convenga»— sería medir otro juego, uno donde
     * la colocación ya está resuelta. Con lado 12 salen 433 acciones, que para
     * una política discreta es mucho pero es EL problema.
     *
     * `esperar` es la acción 0, y es una jugada de verdad: ahorrar para una
     * pértiga en vez de gastar en dos guijarros es la decisión más fina que tiene
     * esta etapa.
     */
    static get actionSpace() {
        const L = this.ajustes.lado;
        return {
            type: 'discrete',
            n: 1 + TORRETAS.length * L * L,
            /**
             * ⚠️ `names` AQUÍ ES UNA LEYENDA, NO LA LISTA DE LAS 433 ACCIONES.
             *
             * En los demás entornos discretos hay un nombre por acción y coinciden
             * uno a uno. Aquí no cabe: enumerar «construir guijarro en (7,3)» 432
             * veces no ayuda a nadie. Así que `names.length !== n`, y quien
             * compruebe verbos contra esta lista tiene que saberlo — de hecho
             * `prueba_puertas_busca.mjs` me suspendió por esto, con razón.
             *
             * Los nombres usan el MISMO separador que los verbos de
             * `affordances()`: los tuve un rato con `:` aquí y `_` allí, que es la
             * clase de diferencia que sólo se ve cuando algo la compara.
             */
            names: DefiendeSystem.ROM.verbos,
            enumerada: false,
            decodifica: '0 = esperar · a>0 → torreta ⌊(a-1)/(lado²)⌋ en celda (a-1)%(lado²)',
        };
    }

    static meta = {
        title: '¡Defiende! 1 — Sendero',
        summary: 'Los bichos entran por un borde y caminan hasta tu núcleo. Coloca '
               + 'torretas junto al camino con lo que tengas: sólo ganas presupuesto '
               + 'matando, y lo que construyes se queda donde lo pusiste.',
        horizon: 7200,
        tags: ['colocacion', 'presupuesto', 'oleadas', 'matriz', 'discreto', 'ecs'],
    };

    constructor(opts = {}) {
        super(opts);
        this.opts = { ...new.target.ajustes, ...opts };
        this.sys = new DefiendeSystem(this.opts);
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.sys = new DefiendeSystem({ ...this.opts, seed: this.seed });
        this.steps = 0;
        this.done = false;
        return this.getObservation();
    }

    /**
     * ⚠️ CONSTRUIR NO GASTA EL TICK, Y NO ES UN REGALO.
     *
     * Poner una torreta es instantáneo en cualquier tower defense: lo que cuesta
     * es el presupuesto, no el tiempo. Si construir consumiera el paso, un agente
     * que construye mucho avanzaría el reloj más despacio que uno que no, y las
     * dos partidas dejarían de durar lo mismo. El presupuesto ya es el freno.
     */
    step(action, dt = 1 / 60) {
        const L = this.sys.lado;
        const a = Number(action) | 0;
        let intento = null;
        if (a > 0) {
            const idx = a - 1;
            const t = TORRETAS[Math.floor(idx / (L * L))];
            const celda = idx % (L * L);
            if (t) intento = this.sys.construir(t.id, celda % L, Math.floor(celda / L));
        }
        const r = this.sys.step(dt);
        this.steps++;
        this.done = r.done;
        this._lastScore = this.sys.puntos;
        if (intento && !intento.ok) r.info = { ...r.info, construir: intento.motivo };
        return r;
    }

    getObservation() {
        const o = this.sys.observacion();
        const L = o.lado;
        const terreno = new Array(L * L).fill(0);
        const moviles = new Array(L * L).fill(0);
        for (let z = 0; z < L; z++) {
            for (let x = 0; x < L; x++) terreno[z * L + x] = o.rejilla[z][x] / 4;
        }
        for (const e of o.entidades) {
            if (e.que !== 'atacante') continue;
            const i = Math.round(e.z) * L + Math.round(e.x);
            if (i >= 0 && i < moviles.length) {
                moviles[i] = Math.max(moviles[i], e.hp / e.hpMax);
            }
        }
        return [
            ...terreno, ...moviles,
            o.vidas / (this.opts.vidas || 10),
            Math.min(1, o.presupuesto / 200),
            o.oleada / o.oleadas,
            Math.min(1, o.entidades.filter(e => e.que === 'atacante').length / 20),
        ];
    }

    describe() {
        const o = this.sys.observacion();
        const i = this.sys.info();
        /**
         * ⚠️ EL CAMINO ENTERO, CELDA A CELDA. ANTES SÓLO DECÍA LOS EXTREMOS.
         *
         * Decía «entra por (0,0) y llega a (6,6) pasando por 27 celdas» — o sea
         * cuántas, no cuáles. Y esta etapa se apoya en un principio que yo mismo
         * escribí en la factoría: *«el jugador ve el camino entero desde el
         * principio; aquí no se mide adivinar por dónde vienen, se mide DÓNDE
         * PONES lo que tienes»*.
         *
         * La puerta numérica lo cumple —manda las 144 celdas del terreno— y la
         * humana también, porque el sendero está pintado. La de lenguaje no: le
         * daba los extremos y a callar. Con eso, un modelo no podía colocar bien
         * ni queriendo, y su mala nota habría hablado de la puerta, no de él.
         *
         * Lo encontré al enchufar el `PuenteDeGimnasio`: un Ser jugó 900 pasos y
         * puso dos torretas donde no pasaba nadie. Culpé al agente y era la
         * descripción.
         *
         * Son 27 pares de números y queda largo. Da igual: esto lo lee un modelo,
         * y la alternativa es esconderle la mitad del problema.
         */
        const ruta = o.camino.map(p => `(${p.x},${p.z})`).join(' → ');
        const partes = [
            `Matriz de ${o.lado}×${o.lado}. El camino entra por (${this.sys.entrada.x}, `
          + `${this.sys.entrada.z}) y llega a tu núcleo en (${o.nucleo.x}, ${o.nucleo.z}) `
          + `pasando por ${o.camino.length} celdas, en este orden: ${ruta}.`,
            `Te quedan ${o.vidas} vidas y ${o.presupuesto} de presupuesto.`,
            `Oleada ${o.oleada} de ${o.oleadas}.`,
        ];

        const vivos = o.entidades.filter(e => e.que === 'atacante');
        if (vivos.length) {
            const cerca = vivos.slice().sort((a, b) => b.paso - a.paso)[0];
            const quedan = cerca.pasos - cerca.paso;
            partes.push(`Hay ${vivos.length} bicho(s) en el camino. El más adelantado es `
                      + `${TIPOS[cerca.tipo].nombre} en (${Math.round(cerca.x)}, ${Math.round(cerca.z)}), `
                      + `a ${quedan} celdas del núcleo.`);
        } else {
            partes.push('Ahora mismo no hay nada en el camino.');
        }

        const torres = o.entidades.filter(e => e.que === 'torreta');
        partes.push(torres.length
            ? `Tienes ${torres.length} torreta(s) puestas.`
            : 'No has construido nada todavía.');

        /**
         * ⚠️ Y SE DICE QUÉ NO SE PUEDE PAGAR, NO SÓLO QUÉ SÍ.
         * Un menú que sólo enseña lo asequible esconde la decisión de AHORRAR, que
         * en esta etapa es la jugada fina. Si no sabes que existe la pértiga, no
         * puedes decidir esperar a tenerla.
         */
        const caras = TORRETAS.filter(t => t.coste > o.presupuesto);
        if (caras.length) {
            partes.push('No te llega para: '
                + caras.map(t => `${t.nombre} (${t.coste})`).join(', ') + '.');
        }
        return partes.join(' ');
    }

    /**
     * ⚠️ EL MENÚ OFRECE SÓLO LO QUE `step` ACEPTA. HOY ME HA MORDIDO DOS VECES.
     *
     * Por la mañana, ¡Busca! ofrecía los mandos de una nave para pilotar un dron.
     * Por la tarde, `SimonSaysSystem` ofrecía verbos que su propio `submitAction`
     * rechazaba — los cuatro, medido: 0 aciertos y 31 fallos jugando el menú.
     *
     * Así que aquí el menú se construye desde el estado real: las torretas que
     * caben en el presupuesto, y las celdas que de verdad están libres. Nada que
     * se ofrezca puede ser rechazado.
     */
    affordances() {
        if (this.sys.terminado()) return [];
        const lista = [{ verb: 'esperar', args: {}, action: 0,
                         desc: 'Dejar correr el reloj y ahorrar para algo mejor' }];

        const L = this.sys.lado;
        const libres = this.sys.celdasLibres();
        for (const t of TORRETAS) {
            if (t.coste > this.sys.presupuesto) continue;
            for (const c of libres) {
                const idx = TORRETAS.indexOf(t) * L * L + (c.z * L + c.x);
                lista.push({
                    verb: `construir_${t.id}`, args: { x: c.x, z: c.z }, action: idx + 1,
                    /**
                     * ⚠️ AQUÍ EL MUNDO SÍ SABE DÓNDE ACABA SU MÉTODO, Y LO DICE.
                     *
                     * `construir_guijarro` parece partible por el guión bajo, pero
                     * `ir_a_planta` —del edificio— es UN método entero. Nadie puede
                     * distinguirlos desde fuera, así que quien lo sabe lo declara y
                     * la gramática no adivina. Adivinar es lo que produjo las seis.
                     *
                     * Y con las tres partes separadas, un modelo aprende `#construir`
                     * UNA vez y lo aplica a las tres torretas, en vez de tres fichas
                     * sueltas que no se parecen entre sí.
                     */
                    metodo: 'construir', params: [t.id, c.x, c.z],
                    desc: `${t.nombre} en (${c.x}, ${c.z}) — cuesta ${t.coste}, `
                        + `alcance ${t.alcance}, ${t.dmg} de daño cada ${t.cadencia}s`,
                });
            }
        }
        return lista;
    }

    /**
     * Un verbo con coordenadas: `construir_pertiga` con `{x, z}`. Sin esto, la
     * puerta de lenguaje tendría que elegir entre cientos de entradas del menú
     * que sólo se diferencian en dos números.
     */
    actFromVerb(verb, args = {}) {
        if (verb === 'esperar') return 0;
        const m = /^construir_(\w+)$/.exec(verb);
        if (!m) return null;
        const i = TORRETAS.findIndex(t => t.id === m[1]);
        if (i < 0) return null;
        const L = this.sys.lado;
        const x = Number(args.x), z = Number(args.z);
        if (!Number.isInteger(x) || !Number.isInteger(z)) return null;
        return 1 + i * L * L + (z * L + x);
    }

    getScore() {
        const i = this.sys.info();
        return { score: i.puntos, metrics: { vidas: i.vidas, bajas: i.bajas,
                 coladas: i.coladas, torretas: i.torretas, ganada: i.ganada } };
    }
}
