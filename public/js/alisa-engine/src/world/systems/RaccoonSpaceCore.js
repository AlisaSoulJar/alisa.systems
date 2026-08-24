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

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ TRES MANDOS PARA UN MISMO JUEGO, PORQUE HAY TRES VEHÍCULOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La saga es siempre lo mismo —moverse, escanear, deducir con las pistas,
 * encontrar al mapache antes de quedarte sin batería— pero lo que pilotas
 * cambia en cada escalón, y con ello cambia lo que se puede pedir:
 *
 *     etapa 4 · sector de ciudad   un DRON            se desplaza en los ejes
 *     etapa 5 · planeta            un SATÉLITE        gira en órbita
 *     etapa 6 · espacio profundo   una NAVE           apunta y empuja
 *
 * Un dron no cabecea el morro y un satélite no frena: darles los verbos de la
 * nave sería medirlos en un mando que no tienen. Y darle a la nave los del dron
 * le quitaría lo único difícil de la etapa 6, que es que empujas HACIA DONDE
 * MIRAS y no hacia donde quieres ir.
 *
 * Lo que NO cambia: el mundo, la batería, el alcance del escáner, la pista y el
 * marcador. Eso vive todo aquí, así que las tres etapas siguen siendo el mismo
 * juego y sus notas se pueden poner en la misma tabla.
 */
export const VERBOS_DRON = [
    'nada', 'adelante', 'atras',
    'izquierda', 'derecha',
    'subir', 'bajar',
    'escanear',
];

export const VERBOS_ORBITA = [
    'nada', 'norte', 'sur',
    'este', 'oeste',
    'bajar_orbita', 'subir_orbita',
    'escanear',
];

export const VERBOS_POR_MANDO = {
    nave: VERBOS_ESPACIO,
    dron: VERBOS_DRON,
    orbita: VERBOS_ORBITA,
};

export class RaccoonSpaceCore {
    constructor(opts = {}) {
        this.tanque      = opts.tankSize   ?? 400;   // lado del cubo jugable
        /**
         * La FORMA del mundo: `cubo` (espacio) · `rejilla` (sector de ciudad) ·
         * `esfera` (planeta). Ver `_colocar`, que explica por qué esto no es
         * decoración sino parte del problema.
         */
        this.forma       = opts.forma      ?? 'cubo';
        /** Qué se pilota: `nave` · `dron` · `orbita`. Ver `VERBOS_POR_MANDO`. */
        this.mando       = opts.mando      ?? 'nave';
        this.verbos      = VERBOS_POR_MANDO[this.mando] ?? VERBOS_ESPACIO;
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
         * Con poco combustible solo alcanzas a escanear 2 de 6, así que **el
         * orden en que los visitas decide la partida** — que es el problema
         * interesante. Y al ganar el piloto simple solo la mitad de las veces,
         * una política mejor tiene dónde destacar.
         *
         * ⚠️ ERA 32 Y AHORA ES 24, Y EL MOTIVO NO ES AFINAR: ES QUE CAMBIÓ EL
         * JUEGO. Al meter la PISTA en este núcleo —la que la persona tenía en la
         * página y el agente no— la etapa pasó de ganarse el 43% a ganarse el
         * 71% con el mismo 32. No es la misma dificultad con otro número: antes
         * se estaba midiendo otro juego. Con 24 vuelve al 52%.
         *
         * ⚠️ Y LA TABLA DE ARRIBA ES DE ANTES DE LA PISTA. Se deja porque explica
         * la FORMA de la relación —más combustible, más victorias— que sigue
         * siendo cierta; sus números concretos, no. Los de hoy están medidos en
         * `calibrar_busca.mjs` con un piloto que sí usa las pistas.
         *
         * Súbelo para practicar, bájalo para apretar. Para PUNTUAR, 24.
         */
        this.combustibleInicial = opts.fuel ?? 24;
        /**
         * Lo que cuesta un escaneo fallido, en FRACCIÓN del depósito. Las páginas
         * cobraban 5% (ciudad) y 8% (planeta); el espacio no cobraba, y se queda
         * así para no cambiar una etapa ya calibrada. Ver el comentario en `step`.
         */
        this.costeEscaneo = (opts.scanCost ?? 0) * this.combustibleInicial;
        /**
         * Hasta dónde llega el escáner, en unidades del mundo y sumado al radio
         * del objetivo. Estaba escrito a fuego (`p.r + 25`); es un parámetro
         * porque la etapa lo puede querer distinto y porque un número mágico
         * repartido por el código es la manera de que dos puertas se separen.
         *
         * ⚠️ Y NO ES UNA PALANCA PARA ARREGLAR LA SEÑAL. Lo probé: la etapa 5 no
         * distingue a las políticas ciegas, subí el alcance a 70 para darles algo
         * que pillar, y no cambió nada — siguen muriendo sin escanear. Se revirtió
         * a 25. Lo dejo escrito porque la tentación de subirlo va a volver: el
         * problema de esa etapa no es el alcance, es que la recompensa está detrás
         * de navegar. Ver la declaración en `prueba_senal.mjs`.
         */
        this.alcance = opts.scanRange ?? 25;

        this.reset(opts.seed ?? 42);
    }

    reset(semilla = 42) {
        const rnd = mulberry32(semilla);
        this.semilla = semilla;
        this.t = 0;

        this.nave = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, guinada: 0, cabeceo: 0 };
        /**
         * El satélite empieza sobre el ecuador y a media altura. `lat`/`lon`/`alt`
         * sólo los usa el mando `orbita`; para los otros dos sobran y no estorban.
         */
        this.altMin = this.tanque * 0.04;
        this.altMax = this.tanque * 0.35;
        this.nave.lat = 0;
        this.nave.lon = 0;
        /**
         * ⚠️ Y LA SALIDA TAMBIÉN VA SEMBRADA, PORQUE SI NO LA SEMILLA NO SE NOTA.
         *
         * El satélite salía siempre sobre el ecuador, en la longitud cero y a media
         * altura. Como la esfera reparte los asentamientos con una espiral fija, las
         * primeras observaciones de dos partidas con semillas distintas salían
         * IDÉNTICAS: lo único que cambiaba era dónde estaba escondido el mapache, y
         * eso el agente no lo ve. `prueba_semillas` lo cazó y tenía razón — desde
         * fuera, las dos partidas empezaban siendo la misma.
         *
         * Con la salida sembrada, cada semilla arranca en un sitio distinto del
         * planeta, que además es mejor juego: no hay una apertura mecánica que
         * valga siempre.
         */
        /**
         * ⚠️ Y SÓLO SE GASTA AZAR EN EL MANDO QUE TOCA.
         *
         * Sacar un `rnd()` fuera de estos dos `if` costaría un número del generador
         * también en el modo nave, y eso correría la secuencia entera: los seis
         * planetas de ¡Busca! 6 caerían en otros sitios y su calibración —52%, medida
         * con sesenta semillas— dejaría de valer sin que nada avisara.
         */
        this.nave.alt = (this.altMin + this.altMax) / 2;
        if (this.mando === 'orbita') {
            this.nave.lat = (rnd() - 0.5) * Math.PI * 0.9;
            this.nave.lon = rnd() * Math.PI * 2;
            this.nave.alt = this.altMin + rnd() * (this.altMax - this.altMin);
            this._pilotarOrbita('nada', 0);
        }
        if (this.mando === 'dron') this.nave.y = this.tanque * (0.15 + rnd() * 0.2);
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

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ LA FORMA DEL MUNDO ES PARTE DEL JUEGO, Y EL BANCO LA IGNORABA
         * ═══════════════════════════════════════════════════════════════════
         *
         * Al meter ¡Busca! 4 y 5 en el banco esta tarde les di este núcleo con
         * otros números —doce objetivos en vez de seis, otro tanque— y di por
         * hecho que con eso ya era «el mismo juego a otra escala».
         *
         * No lo era. Medido al ir a unir sus páginas: la ciudad coloca sus
         * edificios en una **rejilla** (`cols × filas` con separación fija) y el
         * planeta pone sus ciudades sobre una **esfera**. Sólo el espacio es un
         * cubo de puntos al azar.
         *
         * Y eso no es decoración: cambia el problema. En una rejilla las
         * distancias son regulares y la pista se cruza con geometría fija; en una
         * esfera todo está a la misma distancia del centro y lo que importa es el
         * arco. **El banco estaba midiendo un cubo disfrazado de ciudad.**
         *
         * Así que la forma entra en el núcleo, que es donde vive el estado. Sin
         * ella, unir las páginas habría significado convertir la ciudad en un
         * cubo de edificios flotantes: unificar rompiendo el juego.
         */
        this.forma = this.forma ?? 'cubo';
        this.planetas = this._colocar(this.nPlanetas, rnd, enRango, b);

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
        /**
         * ⚠️ EL SATÉLITE SE MUEVE POR SUS ÁNGULOS, NO POR SUS COORDENADAS.
         *
         * Escribirle `x/y/z` aquí lo dejaría en un sitio que `lat/lon/alt` no
         * describen, y el primer `step` lo teletransportaría de vuelta a la órbita
         * inicial. Es el mismo error que evita el guardia de la integración, y aquí
         * no daría ni un error: sólo una salida que no es la que se sorteó.
         */
        for (let intento = 0; intento < 40 && this.planetaCerca(); intento++) {
            if (this.mando === 'orbita') {
                this.nave.lat = (rnd() - 0.5) * Math.PI * 0.9;
                this.nave.lon = rnd() * Math.PI * 2;
                this.nave.alt = this.altMin + rnd() * (this.altMax - this.altMin);
                this._pilotarOrbita('nada', 0);
            } else {
                this.nave.x = enRango();
                this.nave.y = enRango();
                this.nave.z = enRango();
                // El dron sale volando, no enterrado. Ver el suelo en `step`.
                if (this.mando === 'dron') this.nave.y = 5 + Math.abs(this.nave.y) * 0.5;
            }
        }

        return this.observacion();
    }

    /**
     * Coloca los objetivos según la forma del mundo. Las tres formas existen
     * porque las tres páginas de ¡Busca! ya las dibujaban así:
     *
     *     cubo     puntos al azar en el volumen        — el espacio
     *     rejilla  filas y columnas sobre el suelo     — el sector de ciudad
     *     esfera   repartidos por una superficie       — el planeta
     *
     * El radio sale igual en las tres para que el alcance del escáner —`r + 25`—
     * signifique lo mismo, que es lo que hace comparables las tres etapas.
     */
    _colocar(n, rnd, enRango, b) {
        const radio = () => 10 + rnd() * 8;
        if (this.forma === 'rejilla') {
            const cols = Math.ceil(Math.sqrt(n));
            const paso = (b * 2) / (cols + 1);
            return Array.from({ length: n }, (_, i) => ({
                x: -b + paso * (1 + (i % cols)),
                // Sobre el suelo, con una variación pequeña: una ciudad no es plana
                // del todo y un plano exacto haría trivial la deducción en altura.
                y: (rnd() - 0.5) * paso * 0.2,
                z: -b + paso * (1 + Math.floor(i / cols)),
                r: radio(), escaneado: false,
            }));
        }
        if (this.forma === 'esfera') {
            /**
             * Espiral de Fibonacci: reparte n puntos por una esfera sin que se
             * amontonen en los polos, que es lo que pasa al sortear latitud y
             * longitud por separado. Con pocos objetivos el amontonamiento se
             * nota y regalaría partidas.
             */
            const phi = Math.PI * (3 - Math.sqrt(5));
            return Array.from({ length: n }, (_, i) => {
                const y = 1 - (i / Math.max(1, n - 1)) * 2;
                const rad = Math.sqrt(Math.max(0, 1 - y * y));
                const th = phi * i;
                return {
                    x: Math.cos(th) * rad * b, y: y * b, z: Math.sin(th) * rad * b,
                    r: radio(), escaneado: false,
                };
            });
        }
        return Array.from({ length: n }, () => ({
            x: enRango(), y: enRango(), z: enRango(),
            r: radio(), escaneado: false,
        }));
    }

    /** Una acción, un tick. Devuelve `{obs, reward, done, info}`. */
    step(accion = 0, dt = 1 / 60) {
        if (this.terminado()) {
            return { obs: this.observacion(), reward: 0, done: true, info: this.info() };
        }

        const verbo = typeof accion === 'string'
            ? accion
            : this.verbos[Number(accion) | 0] ?? 'nada';

        let recompensa = 0;
        const n = this.nave;

        if (this.mando === 'dron')   this._pilotarDron(verbo, dt);
        if (this.mando === 'orbita') this._pilotarOrbita(verbo, dt);

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

        /**
         * ⚠️ EL SATÉLITE NO SE INTEGRA NI REBOTA.
         *
         * En órbita la posición NO sale de una velocidad: sale de dos ángulos y
         * una altura, que es lo que `_pilotarOrbita` acaba de mover. Si además se
         * integrase aquí habría dos cosas escribiendo la misma posición, y ganaría
         * la última — el mando dejaría de mandar sin dar un solo error.
         *
         * Y el rebote tampoco vale: los asentamientos están a distancia `b` del
         * centro y el satélite vuela POR ENCIMA, así que la pared del tanque le
         * caería justo donde tiene que estar.
         */
        if (this.mando !== 'orbita') {
            // ── Rozamiento y tope de velocidad ───────────────────────
            n.vx *= this.rozamiento; n.vy *= this.rozamiento; n.vz *= this.rozamiento;
            const v = Math.hypot(n.vx, n.vy, n.vz);
            if (v > this.velMax) {
                const k = this.velMax / v;
                n.vx *= k; n.vy *= k; n.vz *= k;
            }
            n.x += n.vx * dt; n.y += n.vy * dt; n.z += n.vz * dt;

            // ── Rebote contra la pared del tanque ────────────────────
            const bb = this.tanque / 2 - 5;
            for (const [p, vv] of [['x', 'vx'], ['y', 'vy'], ['z', 'vz']]) {
                if (n[p] >  bb) { n[p] =  bb; n[vv] *= -0.5; }
                if (n[p] < -bb) { n[p] = -bb; n[vv] *= -0.5; }
            }
            /**
             * ⚠️ EL DRON TIENE SUELO. LA NAVE NO.
             *
             * `RaccoonCitySystem` ya hacía `y = max(5, y)` y lo llamaba «floor
             * collision»: la ciudad tiene suelo y el dron vuela por encima. Sin
             * esta línea el núcleo dejaría al dron a y = -80, o sea ochenta metros
             * bajo el asfalto, y la página lo dibujaría ahí — enterrado y sin un
             * solo error, que es la peor clase de fallo que hay aquí.
             */
            if (this.mando === 'dron') {
                if (n.y < 5) { n.y = 5; n.vy = Math.max(0, n.vy); }
            }
        }
        const b = this.tanque / 2 - 5;

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
                    /**
                     * ═══════════════════════════════════════════════════════
                     *  ⚠️ LA PISTA. LA PERSONA LA TENÍA Y EL AGENTE NO.
                     * ═══════════════════════════════════════════════════════
                     *
                     * `games/raccoon_space.html` daba caliente/frío al escanear
                     * un objetivo equivocado —«🟢 HOT (37 LY away)»— y este
                     * núcleo no. Medido el 24-08 al ir a unir las dos puertas:
                     * eran dos juegos distintos con el mismo nombre.
                     *
                     * Y no es un adorno del HUD: **la pista ES la estrategia**.
                     * Con ella el juego es una deducción —escaneas dos, cruzas
                     * las distancias y sabes por dónde ir—; sin ella es un
                     * recorrido a ciegas. Que la persona jugara al primero y el
                     * agente al segundo hace que sus notas no se puedan comparar,
                     * y comparar es lo único que hace este banco.
                     *
                     * Se guarda la distancia REAL desde el objetivo descartado
                     * hasta el que esconde al mapache. Cada puerta la presenta a
                     * su manera —la persona en colores, el modelo en texto, la
                     * política en un número— pero el dato es uno.
                     */
                    const objetivo = this.planetas[this.planetaDelMapache];
                    p.pista = Math.hypot(objetivo.x - p.x, objetivo.y - p.y, objetivo.z - p.z);
                    /**
                     * ⚠️ Y ESCANEAR EN FALSO CUESTA BATERÍA. OTRA REGLA QUE LA
                     * PERSONA TENÍA Y EL AGENTE NO.
                     *
                     * `raccoon_city_sector.html` cobraba 5 de 100 por cada escaneo
                     * fallido y `raccoon_planet.html` cobraba 8. Este núcleo cobraba
                     * cero, y no es un detalle de puntuación: sin coste, escanear
                     * todo lo que pillas es gratis y la pista sobra. Con coste, cada
                     * escaneo es una APUESTA, que es lo que hace de esto una
                     * deducción y no un barrido.
                     *
                     * Se guarda en fracción del depósito, no en puntos absolutos,
                     * porque las páginas contaban sobre 100 y aquí el depósito son
                     * veintitantos. Cinco de cien y 1,5 de treinta son el mismo
                     * juego; cinco de treinta, no.
                     */
                    this.combustible -= this.costeEscaneo;
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

    /**
     * EL DRON — se desplaza en los ejes del mundo, sin apuntar.
     *
     * Un dron de reconocimiento se mueve hacia donde le dices, no hacia donde
     * mira: es un mando más fácil que el de la nave, y por eso la ciudad es la
     * etapa 4 y no la 6. La guiñada se mantiene sólo para que la página sepa
     * hacia dónde inclinarlo al dibujarlo.
     */
    _pilotarDron(verbo, dt) {
        const n = this.nave;
        const a = this.aceleracion * dt;
        let usa = true;
        if      (verbo === 'adelante')  n.vz -= a;
        else if (verbo === 'atras')     n.vz += a;
        else if (verbo === 'izquierda') n.vx -= a;
        else if (verbo === 'derecha')   n.vx += a;
        else if (verbo === 'subir')     n.vy += a;
        else if (verbo === 'bajar')     n.vy -= a;
        else usa = false;
        if (usa) {
            this.combustible -= dt * 2;
            n.guinada = Math.atan2(-n.vx, -n.vz);
        }
    }

    /**
     * EL SATÉLITE — dos ángulos y una altura, no una velocidad.
     *
     * Sobre una esfera, «ir al este» no es sumar a `x`: es sumar a la longitud,
     * y cuánto avanzas en metros depende de la latitud en la que estés. Modelarlo
     * con empuje cartesiano daría un satélite que se sale de la órbita en cuanto
     * pasa por un polo.
     *
     * ⚠️ Y EL AVANCE SE DIVIDE POR EL COSENO DE LA LATITUD. Sin eso, cerca del
     * polo un paso «al este» recorre casi nada de superficie y el satélite se
     * queda pegado allí: el jugador pulsa, ve el número cambiar y no llega nunca.
     */
    _pilotarOrbita(verbo, dt) {
        const n = this.nave;
        const paso = this.velGiro * dt * 0.6;
        let usa = true;
        if      (verbo === 'norte') n.lat += paso;
        else if (verbo === 'sur')   n.lat -= paso;
        else if (verbo === 'este')  n.lon += paso / Math.max(0.25, Math.cos(n.lat));
        else if (verbo === 'oeste') n.lon -= paso / Math.max(0.25, Math.cos(n.lat));
        else if (verbo === 'bajar_orbita') n.alt = Math.max(this.altMin, n.alt - this.velMax * dt * 0.4);
        else if (verbo === 'subir_orbita') n.alt = Math.min(this.altMax, n.alt + this.velMax * dt * 0.4);
        else usa = false;
        if (usa) this.combustible -= dt * 2;

        const LIM = Math.PI / 2 - 0.02;
        n.lat = Math.max(-LIM, Math.min(LIM, n.lat));
        const radio = this.tanque / 2 + n.alt;
        n.x = radio * Math.cos(n.lat) * Math.cos(n.lon);
        n.y = radio * Math.sin(n.lat);
        n.z = radio * Math.cos(n.lat) * Math.sin(n.lon);
        n.vx = 0; n.vy = 0; n.vz = 0;
        n.guinada = n.lon;
        n.cabeceo = n.lat;
    }

    /**
     * COLOCA EL VEHÍCULO AL LADO DE UN OBJETIVO, HABLANDO SU IDIOMA.
     *
     * ⚠️ Existe porque escribir `nave.x/y/z` a pelo NO FUNCIONA en órbita, y no
     * avisa. `_pilotarOrbita` recalcula la posición a partir de latitud, longitud
     * y altura al principio de cada `step`, así que un teletransporte cartesiano
     * se deshace solo en el tick siguiente. Una prueba de esta misma casa lo hacía
     * y acusaba al planeta de no dar pistas: el instrumento estaba sentando al
     * satélite en un sitio que sus coordenadas no describían.
     *
     * Es para pruebas y para arranques concretos, no para jugar: mueve gratis.
     */
    colocarJunto(p) {
        const n = this.nave;
        if (this.mando === 'orbita') {
            n.lat = Math.atan2(p.y, Math.hypot(p.x, p.z));
            n.lon = Math.atan2(p.z, p.x);
            n.alt = this.altMin;
            this._pilotarOrbita('nada', 0);
            return;
        }
        n.x = p.x; n.y = p.y; n.z = p.z;
        n.vx = 0; n.vy = 0; n.vz = 0;
        if (this.mando === 'dron' && n.y < 5) n.y = 5;
    }

    /** El planeta al alcance del escáner, si hay alguno. */
    planetaCerca() {
        const n = this.nave;
        for (const p of this.planetas) {
            if (Math.hypot(p.x - n.x, p.y - n.y, p.z - n.z) < p.r + this.alcance) return p;
        }
        return null;
    }

    terminado() {
        return this.muerto || this.encontrado || this.t * 60 >= this.tope;
    }

    /**
     * Los cinco escalones de la pista. Se dan en BANDAS y no en el número crudo
     * porque un número exacto convertiría el juego en trigonometría: con tres
     * distancias exactas se triangula el punto y se acabó. Las bandas dejan la
     * deducción donde estaba, que es lo que hace interesante a esta saga.
     *
     * ⚠️ Y LOS UMBRALES SON LOS QUINTILES MEDIDOS, NO LOS DE LA PÁGINA.
     *
     * `raccoon_space.html` usaba 0,15 / 0,30 / 0,50 / 0,70 sobre `dist/400`.
     * Medido el 24-08 con 9.200 distancias reales de las tres escalas, ese
     * reparto daba:
     *
     *     helado 42-46%  ·  frío 27-30%  ·  fresco 20-22%
     *     templado 7%    ·  caliente 1%
     *
     * O sea que casi la mitad de los escaneos decían lo mismo y «caliente» no
     * salía casi nunca. Una pista que repite la misma palabra no informa: la
     * persona la ha estado recibiendo así todo este tiempo, creyendo que le
     * decía algo.
     *
     * Dos puntos al azar en un cubo están típicamente a media diagonal, así que
     * la distribución se amontona arriba. Los quintiles reales son 0,424 /
     * 0,583 / 0,720 / 0,872 — con ellos cada banda sale ~20% y cada escaneo
     * reparte la misma cantidad de información, que es el máximo que puede dar.
     */
    static BANDAS = [
        [0.424, 'caliente'], [0.583, 'templado'], [0.720, 'fresco'],
        [0.872, 'frío'], [Infinity, 'helado'],
    ];

    /** La banda de un objetivo ya descartado, o `null` si no se ha escaneado. */
    bandaDe(p) {
        if (p.pista === undefined) return null;
        const norm = p.pista / this.tanque;
        return RaccoonSpaceCore.BANDAS.find(([tope]) => norm < tope)[1];
    }

    /** Lo dicho por el escáner hasta ahora: qué se descartó y cómo de cerca estaba. */
    pistas() {
        return this.planetas
            .map((p, i) => ({ i, banda: this.bandaDe(p) }))
            .filter(x => x.banda !== null);
    }

    info() {
        return {
            combustible: Math.round(this.combustible * 10) / 10,
            puntos: this.puntos,
            escaneados: this.planetas.filter(p => p.escaneado).length,
            total: this.planetas.length,
            encontrado: this.encontrado,
            pistas: this.pistas(),
        };
    }

    /**
     * Lo bien que un candidato encaja con TODO lo que ha dicho el escáner.
     *
     * Cada banda tiene un centro —la distancia típica que representa— y la
     * coherencia es cuánto se aleja el candidato de esos centros. Se devuelve en
     * [0,1], donde 1 es «encaja perfectamente con todas las pistas».
     *
     * Esto es lo que convierte el juego en deducción: si el 3 salió «caliente»,
     * un candidato lejos del 3 no puede ser. La persona lo hace a ojo mirando
     * los colores del radar; aquí se le da el mismo dato a una política numérica,
     * porque si no la puerta de números juega a otra cosa.
     */
    static CENTROS = { caliente: 0.30, templado: 0.50, fresco: 0.65, 'frío': 0.79, helado: 0.94 };

    coherencia(c) {
        const pistas = this.pistas();
        if (!pistas.length) return 0;
        let error = 0;
        for (const { i, banda } of pistas) {
            const p = this.planetas[i];
            const d = Math.hypot(c.x - p.x, c.y - p.y, c.z - p.z) / this.tanque;
            error += Math.abs(d - (RaccoonSpaceCore.CENTROS[banda] ?? 0.7));
        }
        return Math.max(0, 1 - error / pistas.length);
    }

    /**
     * 24 números, todos normalizados a [-1, 1].
     *   0- 2  posición de la nave
     *   3- 5  velocidad
     *   6- 7  guiñada y cabeceo
     *   8     combustible
     *   9-14  los 2 asteroides más cercanos (dx, dy, dz)
     *  15-20  los 2 planetas sin escanear más cercanos (dx, dy, dz)
     *  21     hay un planeta al alcance del escáner
     *  22-23  ⚠️ NUEVO — lo bien que encaja cada uno de esos 2 candidatos con
     *         las pistas dadas hasta ahora
     *
     * ⚠️ ERAN 22 Y AHORA SON 24, Y NO ES UN CAPRICHO.
     *
     * La página le daba a la persona una pista al descartar un objetivo —«🟢 HOT
     * (37 LY away)»— y ni el texto ni los números se la daban al agente. Con eso,
     * la persona jugaba a una deducción y el agente a un recorrido a ciegas: dos
     * juegos con el mismo nombre, y sus notas no se podían comparar.
     *
     * Las pistas son una lista de largo variable —una por objetivo descartado— y
     * la observación tiene forma fija, así que no caben tal cual. Lo que sí cabe
     * es la CONSECUENCIA: para los dos candidatos que el agente ya está mirando,
     * cuánto encajan con lo que se ha averiguado. Eso es exactamente la decisión
     * que hay que tomar, y es lo que la persona lee de un vistazo en su radar.
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

        const candidatos = cerca(this.planetas.filter(p => !p.escaneado)).slice(0, 2);
        for (const { o } of candidatos) {
            obs.push((o.x - n.x) / R, (o.y - n.y) / R, (o.z - n.z) / R);
        }
        while (obs.length < 21) obs.push(0);

        obs.push(this.planetaCerca() ? 1 : 0);

        // La coherencia de esos mismos dos candidatos con las pistas dadas.
        for (const { o } of candidatos) obs.push(this.coherencia(o));
        while (obs.length < 24) obs.push(0);
        return obs;
    }
}

export default RaccoonSpaceCore;
