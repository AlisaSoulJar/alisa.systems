import { GymEnv } from '../GymEnv.js';

/**
 * SearchInVolumeEnv.js — LA PUERTA DEL GIMNASIO PARA EL MUEBLE «BUSCAR EN VOLUMEN»
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     export class MiJuegoEnv extends SearchInVolumeEnv {
 *         static id = 'alisa/MiJuego-v0';
 *         static Core = MiJuegoCore;
 *         static meta = { ... };
 *     }
 *
 * `SearchInVolumeCore` es el mueble que JUEGA; esto es el mueble que lo EXPONE:
 * observación, recompensa, texto y verbos. Los dos son iguales para todos los
 * cartuchos de este género, así que un juego nuevo no escribe ni uno ni otro.
 *
 * ⚠️ LAS PALABRAS SALEN DE LA ROM, Y ESO NO ES COSMÉTICA.
 *
 * La puerta de texto es la que juega un modelo sin ojos. Si dijera «torre» y
 * «batería» en un juego que va de una estación y un enlace, el agente leería un
 * mundo que no es el suyo — y en un banco que compara personas con agentes, dar
 * mal las palabras es dar mal el problema. Van en `ROM.voz.texto`.
 */
export class SearchInVolumeEnv extends GymEnv {
    static observationSpace = { type: 'box', shape: [10], low: -1, high: 1 };

    /**
     * Seis intenciones. `escanear` es la única con consecuencia: acertar termina
     * la partida y fallar cuesta recurso. Las otras cinco mueven al jugador.
     */
    static actionSpace = { type: 'discrete', n: 6 };

    constructor(opts = {}) {
        super(opts);
        const Cartucho = new.target;
        this.Core = Cartucho.Core;
        this.opts = { ...Cartucho.ajustes, ...opts };
        this.nucleo = new this.Core(this.opts);
        this.texto = this.Core.ROM.voz.texto;
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.nucleo = new this.Core({ ...this.opts, seed: this.seed });
        this.steps = 0;
        this.done = false;
        return this.getObservation();
    }

    /**
     * ⚠️ ESCANEAR NO GASTA EL TICK, IGUAL QUE CONSTRUIR EN ¡DEFIENDE!
     * Mirar una planta es instantáneo: lo que cuesta es el recurso, no el tiempo.
     * Si consumiera el paso, un agente que escanea mucho avanzaría el reloj más
     * despacio que uno que no, y las dos partidas dejarían de durar lo mismo.
     */
    step(action, dt = 1 / 60) {
        const a = Number(action) | 0;
        const antes = this.nucleo.bateria;
        const escaneadasAntes = this.nucleo.busqueda.escaneadas.size;

        let resultado = null;
        if (a === 5) resultado = this.nucleo.escanear();

        this.nucleo.tick(dt, {
            subir: a === 1, bajar: a === 2,
            izquierda: a === 3, derecha: a === 4,
        });

        this.steps++;
        this.done = this.nucleo.terminado();

        /**
         * La recompensa dice lo que el juego quiere: encontrarlo, y no gastar.
         * Escanear en falso ya cuesta recurso, así que la penalización de aquí es
         * pequeña — cobrar dos veces por lo mismo enseña a no mirar, y no mirar es
         * perder.
         */
        let recompensa = -dt * 0.1;
        if (this.nucleo.bateria > antes) recompensa += 3;            // punto cogido
        if (this.nucleo.busqueda.escaneadas.size > escaneadasAntes) recompensa -= 0.5;
        if (this.done) recompensa += this.nucleo.estado.ganado ? 100 : -50;

        return {
            obs: this.getObservation(),
            reward: recompensa,
            done: this.done,
            info: { ...this.nucleo.info(), escaneo: resultado?.estado ?? null },
        };
    }

    getObservation() {
        const n = this.nucleo;
        const v = n.vehiculo;
        const cerca = n.recargas.disponibles()
            .map((p) => ({ p, d: Math.hypot(p.x - v.pos.x, p.y - v.pos.y, p.z - v.pos.z) }))
            .sort((a, b) => a.d - b.d)[0];
        const diag = Math.hypot(n.ancho, n.alto, n.largo);
        return [
            n.bateria / n.bateriaInicial,
            n.plantaCercana() / n.plantas,
            n.busqueda.escaneadas.size / n.plantas,
            v.pos.x / (n.ancho / 2), v.pos.y / n.alto, v.pos.z / (n.largo / 2),
            v.vel.x / v.velMax, v.vel.y / v.velMax, v.vel.z / v.velMax,
            cerca ? 1 - Math.min(1, cerca.d / diag) : 0,
        ];
    }

    /**
     * La puerta de texto. Dice lo que se sabe y NO dice dónde está lo escondido:
     * publicarlo pondría la solución en la descripción, y quien la lea —persona o
     * agente— la vería.
     */
    describe() {
        const n = this.nucleo;
        const T = this.texto;
        const vistas = [...n.busqueda.escaneadas].sort((a, b) => a - b);
        const pilas = n.recargas.disponibles().length;
        return `${T.Volumen} de ${n.plantas} ${T.plantas}. Estás a la altura de la ${T.planta} `
             + `${n.plantaCercana()}. ${T.Recurso} ${Math.round(n.bateria)} de `
             + `${n.bateriaInicial} (baja ${n.gastoPorSegundo} por segundo y `
             + `${n.cuestaFallar} por escaneo fallido). `
             + (vistas.length
                 ? `Ya has mirado ${vistas.length}: ${vistas.join(', ')}. `
                 : `No has mirado ninguna todavía. `)
             /**
             * ⚠️ SINGULAR Y PLURAL DE VERDAD, NO «(s)».
             *
             * Ponía `${punto}(s)`, que con «pila» cuela y con «punto de
             * sincronización» produce «2 punto de sincronización(s)». Es la puerta
             * por la que juega un modelo sin ojos: un enunciado mal escrito es un
             * problema mal dado, y encima enseña a la casa que el truco del «(s)»
             * vale — y sólo vale mientras todos los sustantivos sean cortos.
             */
             + `Quedan ${pilas} ${pilas === 1 ? T.punto : T.puntos} sin coger. `
             + (n.estado.terminado
                 ? (n.estado.ganado ? 'Lo encontraste.' : T.sinRecurso)
                 : `Sube o baja hasta una ${T.planta} sin mirar y escanea.`);
    }

    affordances() {
        if (this.nucleo.terminado()) return [];
        const T = this.texto;
        const p = this.nucleo.plantaCercana();
        const yaVista = this.nucleo.busqueda.escaneadas.has(p);
        return [
            { verb: 'esperar', args: {}, action: 0, metodo: 'esperar', params: [],
              desc: `Dejar correr el reloj — ${T.recursoBaja}` },
            /**
             * ⚠️ `#mover |subir`, NO `#subir`. Me lo corrigió `prueba_gramatica`.
             *
             * «Subir» y «bajar» son DIRECTIONS, no métodos: la ley AIO de esta casa
             * dice que la dirección va de parámetro para que un modelo aprenda
             * `#mover` UNA vez y lo aplique a las trece, en vez de trece fichas
             * sueltas que no se parecen entre sí.
             */
            { verb: 'subir', args: {}, action: 1, metodo: 'mover', params: ['subir'],
              desc: `Ganar altura hacia ${T.plantas} más altas` },
            { verb: 'bajar', args: {}, action: 2, metodo: 'mover', params: ['bajar'],
              desc: `Perder altura hacia ${T.plantas} más bajas` },
            { verb: 'girar_izquierda', args: {}, action: 3, metodo: 'girar', params: ['izquierda'],
              desc: `Rodear ${T.elVolumen} en un sentido` },
            { verb: 'girar_derecha', args: {}, action: 4, metodo: 'girar', params: ['derecha'],
              desc: `Rodear ${T.elVolumen} en el otro sentido` },
            { verb: 'escanear', args: { planta: p }, action: 5, metodo: 'escanear', params: [p],
              desc: yaVista
                  ? `Mirar la ${T.planta} ${p} otra vez — ya la miraste, no cuesta nada y no dice nada`
                  : `Mirar la ${T.planta} ${p} — si no está, cuesta ${this.nucleo.cuestaFallar} de ${T.recurso}` },
        ];
    }

    actFromVerb(verb) {
        const i = ['esperar', 'subir', 'bajar', 'girar_izquierda', 'girar_derecha', 'escanear']
            .indexOf(verb);
        return i < 0 ? null : i;
    }

    /**
     * La nota. Cero si no se encuentra: en ¡Busca! no hay premio de consolación.
     * Si se encuentra, cuenta la EFICACIA — cuántas plantas hubo que mirar. Una a
     * la primera es la nota máxima; mirarlas todas, la mínima que puntúa.
     *
     * ⚠️ DEVUELVE `{score, metrics}`, NO UN NÚMERO. SE ESCRIBIÓ MAL A LA PRIMERA:
     * `WorldFingerprint` lee `env.getScore?.().score ?? null`, así que un número
     * pelado se convertía en `nota null` — la etapa entraba en el banco SIN NOTA,
     * que es como no entrar, y sin dar ningún error.
     */
    getScore() {
        const n = this.nucleo;
        const miradas = n.busqueda.escaneadas.size;
        return {
            score: n.estado.ganado
                ? Math.round((n.plantas / Math.max(1, miradas)) * 1000) / 1000
                : 0,
            metrics: {
                ganada: n.estado.ganado,
                miradas,
                plantas: n.plantas,
                bateria: Math.round(n.bateria * 10) / 10,
                pilas: n.pilas - n.recargas.disponibles().length,
                segundos: Math.round(n.t * 10) / 10,
            },
        };
    }

    sustrato() { return this.nucleo.sustrato(); }
}
