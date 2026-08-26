/**
 * SpawnWaveSystem.js — EL CALENDARIO DE LAS OLEADAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const olas = new SpawnWaveSystem({ oleadas: OLEADAS });
 *     olas.reset();
 *     olas.tick(dt, () => this.rng(), (tipo, ola) => this._soltar(tipo, ola));
 *
 * Una tabla dice qué manda cada oleada, cada cuánto y cuánto dura. Este sistema
 * lleva el reloj y elige el tipo; **qué se crea lo pone quien lo use**, en una
 * función. Por eso no sabe si lo que suelta son hormigas, asteroides, coches o
 * fantasmas — y por eso sirve para cualquier ROM de «aguanta oleadas».
 *
 * ⚠️ POR QUÉ SE EXTRAE: SIETE FICHEROS Y NINGÚN ÁTOMO.
 *
 * Medido el 26-08-2026 contando `spawnWave|oleada|waveTimer|spawnTimer` por toda
 * la casa: siete ficheros la escriben y no había ninguna pieza compartida. Los
 * tres que más:
 *
 *     DefiendeSystem      33 menciones
 *     BulletHeavenEngine   8
 *     DefiendeEnv          8
 *
 * Y los tres están dentro de núcleos con huella sellada, así que la mudanza se
 * puede comprobar bit a bit — que es la única forma honrada de mover reglas.
 *
 * ⚠️ EL ORDEN DE LAS OPERACIONES ES EL CONTRATO, NO UN DETALLE.
 *
 * Primero se acumula el tiempo, luego se sueltan TODOS los que quepan en este
 * paso, y sólo después se mira si la oleada terminó. Y la tirada de azar va UNA
 * por bicho, antes de elegir el tipo.
 *
 * Cambiar cualquiera de esas dos cosas mueve la partida entera con la misma
 * semilla y no da ningún error. Está copiado de `DefiendeSystem._sisOleadas` tal
 * cual, y la huella de ¡Defiende! lo vigila.
 */

export class SpawnWaveSystem {
    /**
     * @param {Object}   [cfg]
     * @param {Array}    [cfg.oleadas]  `[{ n, dura, cada, mezcla: {tipo: peso} }, …]`
     *        `dura` en segundos, `cada` el intervalo entre bichos, `mezcla` los
     *        pesos acumulativos por tipo (deben sumar 1).
     */
    constructor(cfg = {}) {
        this.oleadas = cfg.oleadas ?? [];
        this.reset();
    }

    reset() {
        this.oleada = 0;
        this.tOleada = 0;
        this.acumSpawn = 0;
        /** Eventos de este paso, para que el juego los cuente o los enseñe. */
        this.eventos = [];
    }

    /**
     * @param {number}   dt
     * @param {Function} azar    `() => [0,1)` — la del núcleo, con su semilla
     * @param {Function} soltar  `(tipo, oleada) => void` — lo que crea el juego
     * @returns {Array} los eventos de este paso
     */
    tick(dt, azar, soltar) {
        this.eventos = [];
        if (this.oleada >= this.oleadas.length) return this.eventos;

        const ola = this.oleadas[this.oleada];
        this.tOleada += dt;
        this.acumSpawn += dt;
        while (this.acumSpawn >= ola.cada) {
            this.acumSpawn -= ola.cada;
            soltar(this.tipoDe(ola, azar), ola);
        }
        if (this.tOleada >= ola.dura) {
            this.oleada++;
            this.tOleada = 0;
            this.eventos.push({ tipo: 'OLEADA', n: this.oleada + 1 });
        }
        return this.eventos;
    }

    /**
     * Qué tipo toca. Una tirada, y se recorre la mezcla acumulando hasta pasarse.
     * Si los pesos no suman 1, cae en el primero — que es el comportamiento que
     * tenía y que conviene no cambiar sin querer.
     */
    tipoDe(ola, azar) {
        const r = azar();
        let acc = 0;
        let tipo = Object.keys(ola.mezcla)[0];
        for (const [k, p] of Object.entries(ola.mezcla)) {
            acc += p;
            if (r <= acc) { tipo = k; break; }
        }
        return tipo;
    }

    /** ¿Se acabaron todas? Ojo: eso no es ganar — puede quedar gente en el mapa. */
    terminadas() {
        return this.oleada >= this.oleadas.length;
    }

    info() {
        return {
            oleada: Math.min(this.oleada + 1, this.oleadas.length),
            oleadas: this.oleadas.length,
            restaOleada: this.oleadas[this.oleada]
                ? Math.max(0, Math.round((this.oleadas[this.oleada].dura - this.tOleada) * 10) / 10)
                : 0,
        };
    }
}
