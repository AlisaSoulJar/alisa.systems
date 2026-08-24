import { mulberry32 } from '../core/DeterministicScope.js';

/**
 * RaccoonSpaceCore — la etapa 6 de ¡Busca!, SIN PANTALLA
 * ═══════════════════════════════════════════════════════════════════════════
 * Pilotas una nave por un campo de asteroides buscando el planeta donde se
 * escondió el mapache, antes de quedarte sin combustible.
 *
 * POR QUÉ EXISTE ESTE FICHERO
 * `RaccoonSpaceSystem.js` se presenta en su cabecera como *"Headless ECS
 * engine"*, pero **no lo es**: su `init()` recibe `shipObj`, `shipGlow` y una
 * lista de asteroides que son objetos de THREE, y los muta directamente. Sin
 * una escena montada no se puede dar ni un tick, así que no se puede medir, ni
 * volver a simular una partida, ni correrlo en un worker para verificar la
 * puntuación de nadie.
 *
 * Esto es el mismo juego con el estado en números normales. La regla del patrón
 * dorado, dicha del derecho: **si para saber qué pasa hay que renderizar, no es
 * un benchmark — es una demo.**
 *
 * El `RaccoonSpaceSystem` original se queda como está y sigue moviendo la
 * escena en la página. No se toca lo que funciona.
 *
 * ORIENTACIÓN — por qué ángulos y no cuaterniones
 * Los controles solo hacen `rotateY` (guiñada) y `rotateX` (cabeceo): dos
 * ángulos bastan y son reproducibles bit a bit. Un cuaternión aquí sería
 * precisión que nadie usa y una fuente más de deriva entre máquinas.
 *
 * ⚠️ LÍMITE HONESTO: `Math.sin/cos` NO están fijados bit a bit por IEEE-754 y
 * pueden diferir en el último bit entre navegadores o CPUs. Para validar una
 * partida ajena se auditan las ACCIONES (que son enteros) y se compara la
 * puntuación con tolerancia, no el estado final exacto.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Los verbos, en el orden que espera `step(accion)`. */
export const VERBOS_ESPACIO = [
    'nada', 'empujar', 'frenar',
    'girar_izq', 'girar_der',
    'morro_arriba', 'morro_abajo',
    'escanear',
];

export class RaccoonSpaceCore {
    constructor(opts = {}) {
        this.tanque      = opts.tankSize   ?? 400;   // lado del cubo jugable
        this.velMax      = opts.maxSpeed   ?? 100;
        this.aceleracion = opts.accel      ?? 60;
        this.rozamiento  = opts.drag       ?? 0.98;
        this.velGiro     = opts.turnSpeed  ?? 2.0;
        this.nAsteroides = opts.asteroids  ?? 30;
        this.nPlanetas   = opts.planets    ?? 6;
        this.tope        = opts.tope       ?? 5400;  // 90 s a 60 Hz

        /**
         * EL PRESUPUESTO — el número que decide si esto mide algo
         *
         * Con 100 de combustible un piloto que simplemente va al planeta sin
         * escanear MÁS CERCANO gana el 100% de las partidas y le sobra
         * combustible. Un entorno que se resuelve con la primera idea que se te
         * ocurre no sirve de benchmark: no deja sitio por encima.
         *
         * Barrido sobre 20 semillas, midiendo cuánto gana ese piloto simple:
         *
         *     combustible   gana   planetas escaneados
         *            100    100%          3,5
         *             70     95%          3,5
         *             55     80%          3,3
         *             45     70%          3,0
         *          →  32     55%          2,5
         *             26     45%          2,1
         *             20     35%          1,9
         *
         * Con 32 solo alcanzas a escanear 2,5 de 6, así que **el orden en que
         * los visitas decide la partida** — que es el problema interesante. Y
         * al ganar el simple solo la mitad de las veces, una política mejor
         * tiene dónde destacar.
         *
         * Súbelo para practicar, bájalo para apretar. Para PUNTUAR, 32.
         */
        this.combustibleInicial = opts.fuel ?? 32;

        this.reset(opts.seed ?? 42);
    }

    reset(semilla = 42) {
        const rnd = mulberry32(semilla);
        this.semilla = semilla;
        this.t = 0;

        this.nave = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, guinada: 0, cabeceo: 0 };
        this.combustible = this.combustibleInicial;
        this.puntos = 0;
        this.muerto = false;
        this.encontrado = false;

        const b = this.tanque / 2;
        const enRango = () => (rnd() * 2 - 1) * b;

        this.asteroides = Array.from({ length: this.nAsteroides }, () => ({
            x: enRango(), y: enRango(), z: enRango(),
            vx: (rnd() - 0.5) * 8, vy: (rnd() - 0.5) * 8, vz: (rnd() - 0.5) * 8,
            r: 3 + rnd() * 4,
        }));

        this.planetas = Array.from({ length: this.nPlanetas }, () => ({
            x: enRango(), y: enRango(), z: enRango(),
            r: 10 + rnd() * 8, escaneado: false,
        }));

        // El mapache está en uno, y solo lo sabe el mundo.
        this.planetaDelMapache = Math.floor(rnd() * this.nPlanetas);

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ NINGUNA PARTIDA EMPIEZA RESUELTA. Y MUCHAS EMPEZABAN ASÍ.
         * ═══════════════════════════════════════════════════════════════════
         *
         * La nave arrancaba SIEMPRE en el (0,0,0) y los objetivos se reparten al
         * azar por el cubo. En un sitio pequeño eso significa que a menudo hay uno
         * ya dentro del alcance del escáner —`r + 25`— antes de tocar nada: el
         * primer `escanear` sale gratis y la etapa se juega sin moverse.
         *
         * Medido el 24-08 al calibrar la escalera de ¡Busca!, con 40 semillas:
         *
         *     ciudad  (tanque 160)   22 de 40 partidas empezaban con uno a tiro
         *     planeta (tanque 260)    3 de 40
         *     espacio (tanque 400)    0 de 40
         *
         * O sea que la etapa más pequeña regalaba la primera jugada en más de la
         * mitad de sus instancias. Es exactamente la trampa de sokoban con otra
         * ropa: allí la semilla del banco caía en el nivel tutorial de una jugada,
         * y aquí el tamaño del sitio hace que el tutorial salga solo.
         *
         * Se arregla moviendo la NAVE, no los objetivos: mover objetivos cambiaría
         * el reparto del mundo y con él la dificultad. Se prueban sitios de salida
         * hasta encontrar uno despejado, con el mismo `rnd()` sembrado, así que la
         * partida sigue siendo la misma para la misma semilla.
         *
         * ⚠️ Y SI NO ENCUENTRA SITIO, SE QUEDA DONDE ESTÉ Y NO MIENTE. Un mundo
         * tan lleno que no tenga un hueco despejado es un mundo mal configurado, y
         * es mejor que se note jugando que taparlo con un bucle infinito.
         */
        for (let intento = 0; intento < 40 && this.planetaCerca(); intento++) {
            this.nave.x = enRango();
            this.nave.y = enRango();
            this.nave.z = enRango();
        }

        return this.observacion();
    }

    /** Una acción, un tick. Devuelve `{obs, reward, done, info}`. */
    step(accion = 0, dt = 1 / 60) {
        if (this.terminado()) {
            return { obs: this.observacion(), reward: 0, done: true, info: this.info() };
        }

        const verbo = typeof accion === 'string'
            ? accion
            : VERBOS_ESPACIO[Number(accion) | 0] ?? 'nada';

        let recompensa = 0;
        const n = this.nave;

        // ── Orientación ──────────────────────────────────────────
        if (verbo === 'girar_izq')     n.guinada += this.velGiro * dt;
        if (verbo === 'girar_der')     n.guinada -= this.velGiro * dt;
        if (verbo === 'morro_arriba')  n.cabeceo += this.velGiro * dt;
        if (verbo === 'morro_abajo')   n.cabeceo -= this.velGiro * dt;
        // El cabeceo se limita: sin esto la nave se pone del revés y los
        // controles se invierten sin avisar.
        const LIM = Math.PI / 2 - 0.05;
        n.cabeceo = Math.max(-LIM, Math.min(LIM, n.cabeceo));

        // ── Empuje ───────────────────────────────────────────────
        if (verbo === 'empujar' || verbo === 'frenar') {
            const signo = verbo === 'empujar' ? 1 : -1;
            const cp = Math.cos(n.cabeceo);
            const fx = -Math.sin(n.guinada) * cp;
            const fy =  Math.sin(n.cabeceo);
            const fz = -Math.cos(n.guinada) * cp;
            n.vx += fx * this.aceleracion * dt * signo;
            n.vy += fy * this.aceleracion * dt * signo;
            n.vz += fz * this.aceleracion * dt * signo;
            this.combustible -= dt * 2;
        }

        // ── Rozamiento y tope de velocidad ───────────────────────
        n.vx *= this.rozamiento; n.vy *= this.rozamiento; n.vz *= this.rozamiento;
        const v = Math.hypot(n.vx, n.vy, n.vz);
        if (v > this.velMax) {
            const k = this.velMax / v;
            n.vx *= k; n.vy *= k; n.vz *= k;
        }
        n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;

        // ── Rebote contra la pared del tanque ────────────────────
        const b = this.tanque / 2 - 5;
        for (const [p, vv] of [['x', 'vx'], ['y', 'vy'], ['z', 'vz']]) {
            if (n[p] >  b) { n[p] =  b; n[vv] *= -0.5; }
            if (n[p] < -b) { n[p] = -b; n[vv] *= -0.5; }
        }

        // ── Asteroides ───────────────────────────────────────────
        for (const a of this.asteroides) {
            a.x += a.vx * dt; a.y += a.vy * dt; a.z += a.vz * dt;
            for (const p of ['x', 'y', 'z']) {          // dan la vuelta por el borde
                if (a[p] >  b + 20) a[p] = -b;
                if (a[p] < -b - 20) a[p] =  b;
            }
            const d = Math.hypot(a.x - n.x, a.y - n.y, a.z - n.z);
            if (d < a.r + 2) {
                const k = d || 1;
                const px = (n.x - a.x) / k, py = (n.y - a.y) / k, pz = (n.z - a.z) / k;
                n.vx += px * 50; n.vy += py * 50; n.vz += pz * 50;
                a.vx -= px * 10; a.vy -= py * 10; a.vz -= pz * 10;
                this.combustible -= 5;
                recompensa -= 5;
            }
        }

        // ── Escanear ─────────────────────────────────────────────
        if (verbo === 'escanear') {
            const p = this.planetaCerca();
            if (p && !p.escaneado) {
                p.escaneado = true;
                if (this.planetas.indexOf(p) === this.planetaDelMapache) {
                    this.encontrado = true;
                    this.puntos += 500;
                    recompensa += 500;
                } else {
                    this.puntos += 20;      // descartar también informa
                    recompensa += 20;
                }
            } else {
                recompensa -= 1;            // escanear al vacío cuesta
            }
        }

        this.combustible -= dt * 0.5;       // el soporte vital siempre gasta
        this.t += dt;
        if (this.combustible <= 0) { this.combustible = 0; this.muerto = true; recompensa -= 100; }

        return { obs: this.observacion(), reward: recompensa, done: this.terminado(), info: this.info() };
    }

    /** El planeta al alcance del escáner, si hay alguno. */
    planetaCerca() {
        const n = this.nave;
        for (const p of this.planetas) {
            if (Math.hypot(p.x - n.x, p.y - n.y, p.z - n.z) < p.r + 25) return p;
        }
        return null;
    }

    terminado() {
        return this.muerto || this.encontrado || this.t * 60 >= this.tope;
    }

    info() {
        return {
            combustible: Math.round(this.combustible * 10) / 10,
            puntos: this.puntos,
            escaneados: this.planetas.filter(p => p.escaneado).length,
            total: this.planetas.length,
            encontrado: this.encontrado,
        };
    }

    /**
     * 22 números, todos normalizados a [-1, 1].
     *   0- 2  posición de la nave
     *   3- 5  velocidad
     *   6- 7  guiñada y cabeceo
     *   8     combustible
     *   9-14  los 2 asteroides más cercanos (dx, dy, dz)
     *  15-20  los 2 planetas sin escanear más cercanos (dx, dy, dz)
     *  21     hay un planeta al alcance del escáner
     */
    observacion() {
        const n = this.nave;
        const R = this.tanque / 2;
        const cerca = (lista) => lista
            .map(o => ({ o, d: Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z) }))
            .sort((a, b) => a.d - b.d);

        const obs = [
            n.x / R, n.y / R, n.z / R,
            n.vx / this.velMax, n.vy / this.velMax, n.vz / this.velMax,
            n.guinada / Math.PI, n.cabeceo / Math.PI,
            // Contra el depósito INICIAL, no contra 100: si no, al bajar el
            // presupuesto el agente vería siempre "casi vacío" y no podría
            // aprender a administrarlo.
            this.combustible / (this.combustibleInicial || 1),
        ];

        for (const { o } of cerca(this.asteroides).slice(0, 2)) {
            obs.push((o.x - n.x) / R, (o.y - n.y) / R, (o.z - n.z) / R);
        }
        while (obs.length < 15) obs.push(0);

        for (const { o } of cerca(this.planetas.filter(p => !p.escaneado)).slice(0, 2)) {
            obs.push((o.x - n.x) / R, (o.y - n.y) / R, (o.z - n.z) / R);
        }
        while (obs.length < 21) obs.push(0);

        obs.push(this.planetaCerca() ? 1 : 0);
        return obs;
    }
}

export default RaccoonSpaceCore;
