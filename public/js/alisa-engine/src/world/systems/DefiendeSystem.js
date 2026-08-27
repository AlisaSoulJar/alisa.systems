import { ECSWorld } from '../OverworldECS.js';
import { SpawnWaveSystem } from './SpawnWaveSystem.js';
import { mulberry32 } from '../core/DeterministicScope.js';
import { DefiendeMapaFactory, CELDA } from '../factories/DefiendeMapaFactory.js';
import { Pathfinding } from './PathfindingSystem.js';

/**
 * ¡DEFIENDE! — TOWER DEFENSE SOBRE MATRIZ PLANA, EN ECS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Es el primer juego de la casa que NACE en ECS, y es a propósito: sirve de
 * piloto de la arquitectura antes de decidir si se migra el resto. Los cinco
 * motores completos que ya hay llevan su estado a mano; aquí el estado son
 * entidades y componentes, que es lo que defiende el proyecto:
 *
 *   **al modelo se le entrega el mundo YA en forma de matriz plana** — dónde
 *   está cada cosa y qué es — en vez de la vía de la industria, que es que un
 *   modelo de visión reconstruya la matriz a partir de una imagen. Traducir el
 *   mundo a matriz es trabajo del motor.
 *
 * ⚠️ Y NO ES UN MOTOR NUEVO: ES UN ENSAMBLAJE
 * Cada pieza ya existía suelta en el árbol, y ninguna tenía juego encima:
 *
 *   caminos sobre rejilla   `CarverEntitySystem`  — andar `grid[z][x]` por vecinos
 *   oleadas con tipos       `AsteroidsSystem`     — tabla declarativa de fases
 *   disparo e impactos      `TurretCombatSystem`  — torretas, balas, colisiones
 *   elegir mejora de tres   `BulletHeavenEngine`  — el patrón de la decisión cara
 *   presupuesto que se gasta `EnergySystem`       — lo único que ya era ECS
 *
 * `CarverEntitySystem` estaba clasificado como «ninguna decisión posible»: 2,8 KB
 * de ambientación autónoma, candidato a borrar. Resulta que era justo la capa de
 * caminos sobre matriz que pedía la tesis. El motor que parecía más muerto es el
 * que hace posible el juego más complejo.
 *
 * QUÉ MIDE QUE OTROS NO
 * ¡Busca! mide deducción con presupuesto de viaje. Marabunta, supervivencia y
 * construcción de build. Aquí se mide **colocación**: dónde gastas un presupuesto
 * limitado sobre una matriz, sabiendo por dónde va a venir el enemigo y que lo
 * que construyes se queda quieto. Es planificación espacial con información
 * completa — el eje que le falta al banco.
 */

/**
 * El alfabeto del mundo vive en la factoría, que es quien lo escribe. Se
 * re-exporta para que quien use el motor no tenga que saber de dónde sale — pero
 * hay UNA definición, no dos. Dos alfabetos que se creen el mismo es la forma
 * favorita que tiene este proyecto de separarse por la mitad sin dar un error.
 */
export { CELDA };

/**
 * Los tres tiers de torreta. La decisión de la partida es cuál pones y dónde,
 * y por eso los tres son buenos en cosas distintas y no uno mejor que otro:
 *
 *   guijarro  barata y corta — muchas, pegadas al camino
 *   pértiga   cara y larga   — pocas, cubren curvas enteras
 *   yunque    lenta y fuerte — mata lo gordo, deja pasar lo rápido
 */
export const TORRETAS = [
    { id: 'guijarro', nombre: '🪨 Guijarro', coste: 20, alcance: 2.5, dmg: 4,  cadencia: 0.6 },
    { id: 'pertiga',  nombre: '🎣 Pértiga',  coste: 45, alcance: 5.0, dmg: 5,  cadencia: 1.1 },
    { id: 'yunque',   nombre: '🔨 Yunque',   coste: 70, alcance: 2.0, dmg: 22, cadencia: 2.2 },
];

/**
 * Las oleadas, en tabla declarativa como las de `AsteroidsSystem`. Cada una dice
 * qué manda y cada cuánto; el motor no sabe nada más de ellas.
 *
 * `rapido` existe para que el yunque no sea la respuesta a todo: pega fuerte pero
 * dispara cada 2,2 s, así que un enjambre veloz se le cuela entre disparo y
 * disparo. Sin algo así, la elección de tier no sería una elección.
 */
/**
 * ⚠️ LOS PREMIOS SON BAJOS A PROPÓSITO, Y LOS BAJÉ MIDIENDO.
 *
 * Con los primeros (6/7/18) un jugador competente terminaba la partida con
 * **41 torretas** puestas: la economía daba para alfombrar el mapa, así que se
 * ganaba el 100% de las veces y la pregunta del juego pasaba de «¿dónde lo
 * pones?» a «¿tienes presupuesto?». Y abajo tampoco distinguía: una política
 * tonta y una al azar empataban (42% y 46%), que es la señal de que el entorno
 * no mide a nadie.
 *
 * Barrido de premios × presupuesto inicial, 24 semillas, tres políticas:
 *
 *     premio ×1,0 · 60   buena 100%  tonta 42%  azar 46%   41 torretas
 *     premio ×0,6 · 60   buena 100%  tonta 25%  azar  4%   26 torretas
 *     premio ×0,4 · 40   buena  75%  tonta 13%  azar  0%   17 torretas
 *     premio ×0,3 · 40   buena  71%  tonta  8%  azar  0%   13 torretas
 *
 * Con ×0,4 el presupuesto aprieta de verdad y las tres políticas se separan.
 */
export const TIPOS = {
    peon:   { hp: 18,  vel: 1.6, premio: 2, nombre: '🐜 Peón' },
    rapido: { hp: 10,  vel: 3.2, premio: 3, nombre: '🦗 Rápido' },
    gordo:  { hp: 70,  vel: 1.0, premio: 7, nombre: '🪲 Gordo' },
};

export const OLEADAS = [
    { n: 1, dura: 18, cada: 1.8, mezcla: { peon: 1.0 } },
    { n: 2, dura: 20, cada: 1.5, mezcla: { peon: 0.7, rapido: 0.3 } },
    { n: 3, dura: 22, cada: 1.3, mezcla: { peon: 0.5, rapido: 0.4, gordo: 0.1 } },
    { n: 4, dura: 24, cada: 1.0, mezcla: { peon: 0.4, rapido: 0.4, gordo: 0.2 } },
    { n: 5, dura: 26, cada: 0.8, mezcla: { peon: 0.3, rapido: 0.4, gordo: 0.3 } },
];

/**
 * ⚠️ EL ORDEN DE LOS SISTEMAS ES ESTADO, Y AQUÍ SE DECLARA.
 *
 * Es el riesgo propio de ECS y no lo tiene ningún motor de estado propio: allí
 * el orden está escrito dentro de un `step()` y se lee de un vistazo. Aquí lo
 * decide quien registra los sistemas, así que **cambiar el orden de registro
 * cambia la partida con la misma semilla** — y no daría ningún error.
 *
 * Ejemplo real de por qué importa: si `bajas` corriera antes que `balas`, un
 * atacante muerto este tick seguiría vivo para las balas de este tick y se
 * gastarían dos disparos en él. La partida seguiría "funcionando".
 *
 * Se declara aquí, en un sitio, y `prueba_defiende.mjs` comprueba que el mundo
 * los tiene registrados en este orden exacto.
 */
/**
 * ⚠️ EL MURO: LA PIEZA QUE SÓLO EXISTE EN EL LABERINTO, Y ESTÁ MEDIDA.
 *
 * No dispara —`alcance: 0`, `dmg: 0`— y sólo sirve para estorbar. Parece una
 * torreta inútil y es lo contrario: es la pieza con la que se juega.
 *
 * Medido antes de ponerla: un peine sobre una matriz de 12 **triplica** el
 * camino —de 22 celdas a 66, sin que la regla anti-sellado rechace ni una— y
 * cuesta 55 piezas. Con las torretas de ¡Defiende! eso son 1.100 de oro, y el
 * presupuesto de la partida son 70. O sea que la mecánica funcionaba y no había
 * con qué pagarla: doblar la carretera costaba dieciséis partidas enteras.
 *
 * A 5 el muro, el peine sale por 275 — caro pero alcanzable, y esa es justo la
 * tensión que se quiere: cada pared que pones es un disparo que no compras.
 */
export const MURO = {
    id: 'muro', nombre: '🧱 Muro', coste: 5, alcance: 0, dmg: 0, cadencia: 999,
};

/**
 * ⚠️ EL MORTERO: LA PIEZA QUE HACE QUE DOBLAR LA CARRETERA VALGA LA PENA.
 *
 * Golpea a TODO lo que tenga dentro del radio, no a uno. Y ésa es exactamente
 * la diferencia que el laberinto necesitaba: con una torreta normal el daño por
 * segundo está topado —una bala, un blanco— así que plegar el recorrido no le da
 * más disparos. Con área, tres carriles dentro del radio son tres veces el daño.
 *
 * Caro y lento a propósito: si fuera barato, alfombrar el mapa de morteros sería
 * la respuesta a todo y volveríamos a no medir nada.
 */
export const MORTERO = {
    id: 'mortero', nombre: '💥 Mortero', coste: 60, alcance: 2.6, dmg: 6,
    cadencia: 1.6, area: true,
};

export const ORDEN_SISTEMAS = ['oleadas', 'ruta', 'torretas', 'balas', 'bajas'];

export class DefiendeSystem {
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL CARTUCHO — ¡DEFIENDE! DICHO COMO TABLA
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Este juego ya era medio declarativo antes de que existiera la palabra ROM:
     * las torretas, los bichos y las oleadas llevaban meses siendo tablas, y el
     * motor no sabía de ellas más que lo que decían sus columnas. Lo que faltaba
     * era juntarlas y decir en voz alta que ESO es el juego.
     *
     * ⚠️ EL `orden` NO ES DOCUMENTACIÓN: ES UNA REGLA DEL JUEGO.
     *
     * En un ECS el orden de registro decide la partida —si `bajas` corriera antes
     * que `balas`, dos disparos irían al mismo muerto— y no da ningún error. Va
     * en el cartucho porque es tan parte del juego como el precio del yunque, y
     * `prueba_defiende.mjs` comprueba que el mundo se registra en este orden.
     *
     * ⚠️ SIN `hud` NI `cartel`, Y ES A PROPÓSITO.
     *
     * Los otros cartuchos los traen porque su página los LEE. Ésta todavía no se
     * ha convertido, y declarar aquí un HUD que nadie pinta sería exactamente el
     * adorno del que este fichero se ha pasado el día quejándose: una tabla que
     * no manda sobre nada se desincroniza el martes y nadie se entera.
     */
    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  DOS CARTUCHOS EN EL MISMO MUEBLE — LAS DOS FAMILIAS DEL GÉNERO
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Al mirar cómo se juega de verdad a esto —los mapas de defensa fueron la
     * categoría más jugada de Brood War, por encima de los DOTA— salió que bajo
     * los cincuenta nombres distintos hay **dos mecánicas** y no una:
     *
     *     sendero    los bichos van por un camino que trae el mapa, y tú pones
     *                torretas al lado. Es lo que este núcleo hacía.
     *     laberinto  el suelo está vacío y es todo construible: las torretas
     *                BLOQUEAN, la ruta se recalcula, y **no puedes cerrarla**.
     *
     * Y la segunda es la que sostiene el género. La guía de la comunidad lo dice
     * sin rodeos: *«tower placement can double your effective damage before you
     * have upgraded anything»*. Un bicho que cruzaría en dos segundos pasa doce
     * bajo las mismas torretas si le doblas la carretera.
     *
     * ⚠️ Y ES UN CARTUCHO, NO UN NÚCLEO NUEVO, PORQUE COMPARTEN TODO LO DEMÁS.
     *
     * Las mismas torretas, los mismos bichos, las mismas oleadas, el mismo ECS
     * con el mismo orden, la misma economía. Lo único que cambia es **quién
     * decide por dónde se anda**, y eso cabe en una bandera. Es el mismo caso
     * que los tres vehículos del mapache: un mueble, tres cartuchos.
     *
     * ⚠️ EL DE SENDERO NO SE TOCA. Su huella `77bef3c2` está sellada y sus
     * números no se mueven: la bandera nace en `sendero` y todo lo nuevo va
     * detrás de un `if` que en ese modo no entra.
     */
    static ROMS = {
        'alisa/Defiende-v0': {
            id: 'alisa/Defiende-v0',
            familia: 'tiempo_real',
            modo: 'sendero',
            verbos: ['esperar', ...TORRETAS.map((t) => `construir_${t.id}`)],
            mundo: { lado: 12, vidas: 10, presupuesto: 40, tope: 7200 },
            sistemas: [
                ['SpawnWaveSystem', { oleadas: OLEADAS }],
                ['DefiendeMapaFactory', { trazado: 'trazar' }],
            ],
            orden: ORDEN_SISTEMAS,
            /** Las dos tablas que SON el juego: qué compras, a qué te enfrentas. */
            torretas: TORRETAS,
            atacantes: TIPOS,
        },

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ ESTE CARTUCHO NO ESTÁ EN EL BANCO TODAVÍA, Y NO ES UN OLVIDO
         * ═══════════════════════════════════════════════════════════════════
         *
         * La máquina funciona y está medida: el suelo abierto, la ruta que se
         * recalcula, la ruta propia de cada bicho, y la regla anti-sellado
         * —incluida la parte fea, no dejar encerrado a uno que ya está dentro—.
         * Un peine sobre la matriz de 12 lleva el camino de 22 celdas a 66 y no
         * rechaza ni una colocación.
         *
         * Lo que NO funciona es que doblar la carretera PAGUE. Barrido de
         * presupuesto × renta, tres constructores, diez semillas:
         *
         *     presup renta   dobla y dispara   sólo dispara pegado
         *         90     2      0%  (44 celdas)      100%  (22)
         *        150     4     70%  (44)             100%  (22)
         *        220     8     70%  (44)             100%  (22)
         *
         * El que ignora el laberinto y pone armas junto al camino recto gana
         * SIEMPRE. Y el motivo no es la máquina: son las torretas. Su alcance
         * (2,5 a 5 celdas) y su daño están calibrados para un sendero de 22
         * celdas; en un recorrido doblado el mismo oro compra menos armas para
         * cubrir el doble de carretera, y el tiempo extra bajo fuego no lo
         * compensa porque la cadencia no cambia.
         *
         * ⚠️ Y AL FINAL EL CULPABLE NO ERA EL LABERINTO: ES LA TABLA DE TORRETAS.
         *
         * Cuatro hipótesis descartadas —vida de los bichos, presupuesto, renta,
         * fase de obra— y la quinta era una división que tenía que haber hecho el
         * primer día. Daño por segundo dividido por lo que cuesta:
         *
         *     🪨 guijarro   6,67 dps / 20  =  0,333   ← el triple que nadie
         *     🔨 yunque    10,00 dps / 70  =  0,143
         *     🎣 pértiga    4,55 dps / 45  =  0,101
         *     💥 mortero    3,75 dps / 60  =  0,063 por blanco
         *
         * **El guijarro domina.** Alfombrar de guijarros gana el 100% de las
         * partidas en cualquier configuración, y cada muro que pones es oro que
         * no se convierte en la torreta dominante. Ningún laberinto puede
         * competir con eso, y tampoco puede el mortero: necesitaría CINCO blancos
         * dentro del radio sólo para empatar.
         *
         * Y eso NO es un problema del laberinto: es que `TORRETAS` tiene una
         * opción dominante desde siempre. En el sendero se nota menos porque allí
         * la colocación pesa más que la eficiencia, pero está.
         *
         * Arreglarlo obliga a tocar la tabla que comparten los dos cartuchos, y
         * eso mueve la huella sellada del sendero —`77bef3c2`— y retira sus notas.
         * Eso es una decisión de quien diseña el banco, no de quien escribe el
         * código, así que aquí se deja medido y no se toca.
         *
         * Hasta entonces este cartucho no se registra en el gimnasio ni en las
         * sagas: publicar un juego cuyo mecanismo central no paga sería
         * exactamente el «entorno que no mide a nadie» que `prueba_senal` existe
         * para cazar, sólo que colado por la puerta de delante.
         */
        'alisa/DefiendeLaberinto-v0': {
            id: 'alisa/DefiendeLaberinto-v0',
            familia: 'tiempo_real',
            modo: 'laberinto',
            verbos: ['esperar', ...[MURO, ...TORRETAS, MORTERO].map((t) => `construir_${t.id}`)],
            /**
             * ⚠️ MÁS PRESUPUESTO Y MENOS VIDAS QUE EL SENDERO, Y ESTÁ MEDIDO.
             *
             * Aquí construir hace DOS trabajos —disparar y estorbar— y el peine
             * que triplica el camino cuesta 275 en muros. Con los 70 del sendero
             * no se puede doblar nada: la mecánica estaba y no había con qué
             * pagarla. Menos vidas porque el que dobla bien no las necesita.
             */
            /**
             * ⚠️ `renta` — Y ESTE NÚMERO NO EXISTÍA EN ¡DEFIENDE! HASTA HOY.
             *
             * El sendero gana presupuesto **sólo matando**, y eso funciona
             * porque desde el primer segundo tienes torretas disparando. En el
             * laberinto no: te gastas el dinero en muros, que no matan a nadie,
             * y entonces no hay bajas, y sin bajas no hay dinero, y sin dinero
             * no hay armas. Medido: el que dobla bien la carretera —51 celdas
             * contra 22— perdía el 100% de las partidas con CERO bajas.
             *
             * La renta por segundo rompe ese círculo, y es lo que hacen los dos
             * juegos de los que sale esta idea: en Legion TD gastar en una moneda
             * sube la renta de la otra, y en Plants vs Zombies el sol cae solo.
             * Invertir en carretera ahora para poder comprar armas luego ES el
             * juego; sin renta, invertir es suicidarse.
             */
            /**
             * ⚠️ EL TOPE TIENE QUE CABER LA OBRA **MÁS** LAS OLEADAS.
             *
             * Con 20 s de obra y 110 s de oleadas, el reloj de 7.200 pasos —120 s—
             * se paraba en la cuarta oleada **con las seis vidas intactas**, y las
             * dos estrategias salían perdiendo. Estuve un rato buscando eso en el
             * balance, y no era balance: era una cuenta.
             *
             * 9.000 pasos son 150 s: 20 de obra, 110 de oleadas y 20 de margen
             * para rematar lo que quede vivo.
             */
            mundo: {
                lado: 12, vidas: 6, presupuesto: 90, renta: 4.0,
                pausaInicial: 20, tope: 9000,
            },
            sistemas: [
                ['SpawnWaveSystem', { oleadas: OLEADAS }],
                ['DefiendeMapaFactory', { trazado: 'abierto' }],
                /**
                 * La pieza que hace posible este cartucho: A* sobre la matriz y
                 * la regla anti-sellado. Sin ella, poner una pared sería ganar.
                 */
                ['Pathfinding', { diagonales: false }],
            ],
            orden: ORDEN_SISTEMAS,
            /** El muro primero: es lo que más se pone y lo que más barato sale. */
            torretas: [MURO, ...TORRETAS, MORTERO],
            atacantes: TIPOS,
        },
    };

    /** El cartucho por defecto: el sendero, que es lo que este núcleo era. */
    static ROM = DefiendeSystem.ROMS['alisa/Defiende-v0'];

    /** Los números con los que un cartucho llama a una pieza. */
    static params(pieza, cartucho = DefiendeSystem.ROM) {
        return cartucho.sistemas.find(([n]) => n === pieza)?.[1] ?? {};
    }

    constructor(opts = {}) {
        /**
         * El calendario de oleadas, compuesto. La TABLA sigue siendo de este
         * juego —qué manda cada ola y cada cuánto—; el reloj que la recorre es un
         * átomo que ahora puede usar cualquier ROM de «aguanta oleadas».
         */
        const cartucho = DefiendeSystem.ROMS[opts.rom] ?? DefiendeSystem.ROM;
        this.cartucho = cartucho;
        this.modo = opts.modo ?? cartucho.modo;
        /**
         * La tabla de lo que se puede construir es DEL CARTUCHO, no del módulo.
         * El laberinto añade el muro y el sendero no lo tiene — y no es un
         * detalle: el tamaño de esta lista decide el espacio de acciones del
         * entorno, así que compartirla habría cambiado la puerta del sendero.
         */
        this.torretas = cartucho.torretas;
        /** Y los bichos, por el mismo motivo: el laberinto los quiere más duros. */
        this.atacantes = opts.atacantes ?? cartucho.atacantes;
        this.olas = new SpawnWaveSystem(DefiendeSystem.params('SpawnWaveSystem', cartucho));
        const a = { ...cartucho.mundo, ...opts };
        this.lado = a.lado;                       // matriz lado × lado
        this.vidasIniciales = a.vidas;
        // 40 y no 60: poder comprar el yunque de entrada resulta ser una TRAMPA.
        // Medido, con premios x0,4: con 60 de salida se gana el 63% y con 40 el 75%.
        this.presupuestoInicial = a.presupuesto;
        /** Oro por segundo. Cero en el sendero, que sólo cobra matando. */
        this.renta = a.renta ?? 0;
        /** Segundos de obra antes de la primera oleada. Cero en el sendero. */
        this.pausaInicial = a.pausaInicial ?? 0;
        this.tope = a.tope;                       // 120 s a 60 Hz

        /**
         * El terreno lo hace la factoría, no las reglas. Se puede cambiar por otra
         * —así será cada etapa de la saga: otro trazado, mismo juego— sin tocar
         * nada de esto.
         */
        this.fabrica = opts.fabrica ?? new DefiendeMapaFactory();

        /**
         * ⚠️ EL RESPALDO ES UNA LLAMADA, NO UNA REFERENCIA.
         * `config.rng || Math.random` captura la función global al construir, así
         * que un parche posterior no llega. Ese `||` ya cambió las notas
         * publicadas de Marabunta una vez; aquí se nace con la lección puesta.
         */
        this._semilla = (opts.seed ?? 42) >>> 0;
        this._rngPropio = mulberry32(this._semilla);
        this.rng = opts.rng ? (() => opts.rng()) : (() => this._rngPropio());

        this.reset(this._semilla);
    }

    reset(semilla = this._semilla) {
        this._semilla = semilla >>> 0;
        this._rngPropio = mulberry32(this._semilla);
        const rnd = this.rng;

        this.mundo = new ECSWorld();
        this.t = 0;
        this.terminada = false;
        this.ganada = false;
        this.vidas = this.vidasIniciales;
        this.presupuesto = this.presupuestoInicial;
        this.puntos = 0;
        this.bajas = 0;
        this.coladas = 0;
        this.oleada = 0;
        this.tOleada = 0;
        this.acumSpawn = 0;
        this.olas.reset();
        this.eventos = [];
        this._idBala = 0;

        /**
         * El trazado lo dice el cartucho: `trazar` dibuja una carretera y
         * `abierto` deja el suelo vacío para que la dibujes tú con las torretas.
         */
        const comoTrazar = DefiendeSystem.params('DefiendeMapaFactory', this.cartucho).trazado ?? 'trazar';
        const mapa = this.fabrica[comoTrazar](this.lado, rnd);
        this.rejilla = mapa.rejilla;
        this.camino = mapa.camino;
        this.entrada = mapa.entrada;
        this.nucleo = mapa.nucleo;
        if (this.modo === 'laberinto') this.camino = this._rutaDesde(this.entrada);
        this._registrarSistemas();
        return this.observacion();
    }

    /**
     * EL CAMINO SE TRAZA SOBRE LA MATRIZ, POR TRAMOS EN L ENTRE PUNTOS DE PASO.
     *
     * Dos reglas que no son estéticas:
     *
     *   1. **siempre hay camino**. Cada tramo es monótono hacia su punto de paso,
     *      así que nunca se atasca. Un laberinto sembrado puede quedar cerrado, y
     *      un tower defense sin ruta no es difícil: es imposible, y la partida no
     *      lo diría — los atacantes simplemente no llegarían nunca.
     *   2. **el jugador ve el camino entero desde el principio**. Aquí no se mide
     *      adivinar por dónde vienen: se mide DÓNDE PONES lo que tienes. Esconder
     *      la ruta convertiría el juego en otra cosa.
     */
    // ─── LA JUGADA ────────────────────────────────────────────────────────

    /**
     * Construir es la única decisión del juego. Devuelve por qué NO se pudo, en
     * vez de fallar en silencio: un clic que no hace nada y no explica por qué es
     * la clase de silencio que en este proyecto siempre acaba siendo un fallo
     * que nadie ve.
     */
    construir(idTorreta, x, z) {
        const t = this.torretas.find(t => t.id === idTorreta);
        if (!t) return { ok: false, motivo: `no existe la torreta "${idTorreta}"` };
        if (this.terminada) return { ok: false, motivo: 'la partida ha terminado' };
        if (x < 0 || x >= this.lado || z < 0 || z >= this.lado) {
            return { ok: false, motivo: 'esa celda está fuera de la matriz' };
        }
        const celda = this.rejilla[z][x];
        if (celda !== CELDA.LIBRE) {
            const nombre = { [CELDA.CAMINO]: 'el camino', [CELDA.NUCLEO]: 'el núcleo',
                             [CELDA.ENTRADA]: 'la entrada', [CELDA.TORRETA]: 'otra torreta' }[celda];
            return { ok: false, motivo: `ahí está ${nombre}` };
        }
        if (this.presupuesto < t.coste) {
            return { ok: false, motivo: `cuesta ${t.coste} y tienes ${Math.floor(this.presupuesto)}` };
        }
        /**
         * En el laberinto, además, no puede cerrar el paso. Se comprueba ANTES
         * de cobrar: que te quiten el dinero por una jugada que no se hace es la
         * clase de fallo que la gente recuerda más que el juego.
         */
        if (this.modo === 'laberinto' && this._sellaria(x, z)) {
            return { ok: false, motivo: 'ahí cerrarías el paso del todo' };
        }

        this.presupuesto -= t.coste;
        this.rejilla[z][x] = CELDA.TORRETA;
        const e = this.mundo.createEntity();
        this.mundo.addComponent(e, 'Celda', { x, z });
        this.mundo.addComponent(e, 'Torreta', { ...t, timer: 0 });
        if (this.modo === 'laberinto') {
            this.camino = this._rutaDesde(this.entrada);
            this._replantear();
        }
        this.eventos.push({ tipo: 'CONSTRUIDA', torreta: t.id, x, z });
        return { ok: true, entidad: e };
    }

    // ─── LO QUE SÓLO EXISTE EN EL LABERINTO ───────────────────────────────

    /** ¿Se puede andar por esta celda? Una torreta bloquea; lo demás, no. */
    _andable(x, z) {
        return this.rejilla[z][x] !== CELDA.TORRETA;
    }

    /**
     * El camino desde una celda hasta el núcleo, recalculado ahora mismo.
     *
     * ⚠️ SIN DIAGONALES, Y ES UNA REGLA DEL JUEGO.
     *
     * `Pathfinding` sabe andar en ocho direcciones, pero aquí se le pide cuatro:
     * con diagonales un bicho se cuela por la esquina entre dos torretas puestas
     * en diagonal, y entonces «bloquear» deja de significar nada. Es la
     * diferencia entre un laberinto y un adorno, y por eso el número está
     * declarado en el cartucho y no escondido aquí.
     */
    _rutaDesde(celda) {
        const p = DefiendeSystem.params('Pathfinding', this.cartucho);
        return Pathfinding.buscar({
            filas: this.lado, cols: this.lado,
            pasable: (r, c) => this._andable(c, r),
            desde: { r: celda.z, c: celda.x },
            hasta: { r: this.nucleo.z, c: this.nucleo.x },
            diagonales: p.diagonales ?? false,
        }).map(({ r, c }) => ({ x: c, z: r }));
    }

    /**
     * ⚠️ LA REGLA ANTI-SELLADO, Y NO BASTA CON MIRAR LA ENTRADA.
     *
     * Lo obvio es comprobar que sigue habiendo camino desde la entrada. Pero eso
     * deja un hueco que en los mapas de la comunidad tiene nombre —encerrar— y
     * es la jugada más sucia del género: pones la última pared **detrás** de los
     * bichos que ya están dentro y los dejas sin salida.
     *
     * Así que se comprueba la entrada Y cada bicho vivo. Si alguno se quedaría
     * encerrado, no se puede construir ahí.
     */
    _sellaria(x, z) {
        const antes = this.rejilla[z][x];
        this.rejilla[z][x] = CELDA.TORRETA;
        let sella = this._rutaDesde(this.entrada).length === 0;
        if (!sella) {
            for (const id of this.mundo.query(['Celda', 'Atacante'])) {
                const c = this.mundo.getComponent(id, 'Celda');
                const desde = { x: Math.round(c.x), z: Math.round(c.z) };
                if (!this._andable(desde.x, desde.z)) { sella = true; break; }
                if (this._rutaDesde(desde).length === 0) { sella = true; break; }
            }
        }
        this.rejilla[z][x] = antes;
        return sella;
    }

    /**
     * Al construir, todos los bichos tienen que volver a pensar por dónde iban.
     * No se les recalcula la ruta aquí: se les BORRA, y cada uno la rehace en su
     * siguiente paso. Recalcular ochenta rutas dentro de un clic es un tirón que
     * se nota; rehacerlas de una en una, no.
     */
    _replantear() {
        for (const id of this.mundo.query(['Ruta'])) {
            this.mundo.getComponent(id, 'Ruta').camino = null;
        }
    }

    /** Lo que se puede construir AHORA: cabe en el presupuesto y hay dónde. */
    construibles() {
        if (this.terminada) return [];
        return this.torretas.filter(t => t.coste <= this.presupuesto).map(t => t.id);
    }

    /** Las celdas donde cabe una torreta. Es la matriz, filtrada. */
    celdasLibres() {
        const out = [];
        for (let z = 0; z < this.lado; z++) {
            for (let x = 0; x < this.lado; x++) {
                if (this.rejilla[z][x] === CELDA.LIBRE) out.push({ x, z });
            }
        }
        return out;
    }

    // ─── LOS SISTEMAS, EN EL ORDEN DECLARADO ──────────────────────────────

    _registrarSistemas() {
        this._sistemas = {
            oleadas:  (w, _, dt) => this._sisOleadas(w, dt),
            ruta:     (w, es, dt) => this._sisRuta(w, es, dt),
            torretas: (w, es, dt) => this._sisTorretas(w, es, dt),
            balas:    (w, es, dt) => this._sisBalas(w, es, dt),
            bajas:    (w, es, dt) => this._sisBajas(w, es, dt),
        };
        const consultas = {
            oleadas: [], ruta: ['Celda', 'Ruta', 'Atacante'],
            torretas: ['Celda', 'Torreta'], balas: ['Punto', 'Bala'],
            bajas: ['Atacante'],
        };
        for (const nombre of ORDEN_SISTEMAS) {
            this.mundo.addSystem(this._sistemas[nombre], consultas[nombre]);
        }
    }

    /**
     * ⚠️ EL CALENDARIO YA NO VIVE AQUÍ.
     *
     * Eran quince líneas de reloj —acumular, soltar los que quepan, pasar de
     * oleada— más la tirada ponderada del tipo. Ahora es `SpawnWaveSystem`, que
     * no sabe qué suelta: eso sigue siendo de este juego y va en la función.
     *
     * Se movió con el MISMO orden de operaciones y la MISMA tirada por bicho, y
     * lo comprueba la huella de ¡Defiende!, que no se movió.
     *
     * `this.oleada` se mantiene como espejo porque lo leen la condición de
     * victoria y el HUD; la verdad está en el sistema.
     */
    _sisOleadas(w, dt) {
        /**
         * ⚠️ LA FASE DE OBRA, Y SIN ELLA EL LABERINTO NO PODÍA GANAR NUNCA.
         *
         * Medido: doblar la carretera cuesta 275 de oro EN MUROS, que no
         * disparan. El que dobla llega a la primera oleada sin una sola arma y
         * pierde vidas mientras construye; el que pone armas junto al camino
         * recto las tiene desde el segundo uno. O sea que no era un problema de
         * valor —doblar da más del doble de tiempo bajo fuego por torreta— sino
         * de TEMPO: paga a la larga y te mata a la corta.
         *
         * El género entero resuelve esto igual: Legion TD es por turnos y
         * construyes antes de que venga la ronda; Plants vs Zombies te regala una
         * primera oleada lenta. Aquí son unos segundos de obra.
         *
         * En el sendero vale 0 y esta línea no hace nada — por eso `77bef3c2`
         * sigue quieta.
         */
        if (this.t < this.pausaInicial) return;
        const eventos = this.olas.tick(dt, () => this.rng(), (tipo, ola) => this._soltarAtacante(tipo, ola));
        this.oleada = this.olas.oleada;
        this.tOleada = this.olas.tOleada;
        this.acumSpawn = this.olas.acumSpawn;
        for (const e of eventos) this.eventos.push(e);
    }

    _soltarAtacante(tipo, ola) {
        const t = this.atacantes[tipo];
        const e = this.mundo.createEntity();
        this.mundo.addComponent(e, 'Celda', { x: this.entrada.x, z: this.entrada.z });
        this.mundo.addComponent(e, 'Ruta', { paso: 0, avance: 0 });
        this.mundo.addComponent(e, 'Atacante', { tipo, hp: t.hp, hpMax: t.hp, vel: t.vel, premio: t.premio });
    }

    /** Andar la matriz: `avance` interpola entre celda y celda, como en Carver. */
    _sisRuta(w, entidades, dt) {
        for (const id of entidades) {
            const r = w.getComponent(id, 'Ruta');
            const a = w.getComponent(id, 'Atacante');
            const c = w.getComponent(id, 'Celda');

            /**
             * ⚠️ EN EL LABERINTO CADA BICHO LLEVA SU PROPIO CAMINO.
             *
             * En el sendero la ruta es del MAPA y todos comparten el mismo array
             * con un índice. Aquí no puede ser: al construir cambia el recorrido,
             * y un índice sobre una lista que acaba de cambiar apunta a otro
             * sitio. Así que cada uno guarda el suyo desde donde está, y al
             * construir se les borra para que lo rehagan.
             */
            let camino = this.camino;
            if (this.modo === 'laberinto') {
                if (!r.camino) {
                    r.camino = this._rutaDesde({ x: Math.round(c.x), z: Math.round(c.z) });
                    r.paso = -1;
                }
                camino = r.camino;
            }

            r.avance += a.vel * dt;
            while (r.avance >= 1) {
                r.avance -= 1;
                r.paso++;
                if (r.paso >= camino.length) {
                    // Ha llegado al núcleo: cuesta una vida y desaparece.
                    this.vidas--;
                    this.coladas++;
                    this.eventos.push({ tipo: 'COLADA', tipoAtacante: a.tipo, vidas: this.vidas });
                    w.destroyEntity(id);
                    if (this.vidas <= 0) { this.terminada = true; }
                    break;
                }
                const p = camino[r.paso];
                c.x = p.x; c.z = p.z;
            }
        }
    }

    _sisTorretas(w, entidades, dt) {
        const atacantes = w.query(['Celda', 'Atacante']);
        for (const id of entidades) {
            const t = w.getComponent(id, 'Torreta');
            const c = w.getComponent(id, 'Celda');
            t.timer -= dt;
            if (t.timer > 0) continue;

            // El más adelantado dentro del alcance: dejar pasar al que va a
            // llegar es peor que rematar al que acaba de entrar.
            let objetivo = null, mejorPaso = -1;
            for (const a of atacantes) {
                const ca = w.getComponent(a, 'Celda');
                const d = Math.hypot(ca.x - c.x, ca.z - c.z);
                if (d > t.alcance) continue;
                const paso = w.getComponent(a, 'Ruta').paso;
                if (paso > mejorPaso) { mejorPaso = paso; objetivo = a; }
            }
            /**
             * ⚠️ LAS DE ÁREA GOLPEAN A TODOS Y NO GASTAN BALA. Y ES LO QUE HACE
             *    QUE UN LABERINTO SIRVA PARA ALGO.
             *
             * Medido, y me costó cuatro hipótesis descartadas: una torreta normal
             * dispara UNA bala a UN objetivo por recarga, así que su daño por
             * segundo está topado. Junto a un camino recto ya tiene blanco el
             * 100% del tiempo — doblar la carretera no le da más disparos, sólo
             * reparte los mismos sobre el doble de recorrido. Por eso doblar
             * perdía siempre, y no era el balance: era la aritmética.
             *
             * Con daño de área, tres carriles dentro del radio son tres veces el
             * daño. Ahí sí paga plegar. Es la razón de que los tower defense de
             * laberinto estén llenos de torres de salpicadura, y no un adorno.
             */
            if (t.area) {
                let tocados = 0;
                for (const a of atacantes) {
                    const ca = w.getComponent(a, 'Celda');
                    if (Math.hypot(ca.x - c.x, ca.z - c.z) > t.alcance) continue;
                    const at = w.getComponent(a, 'Atacante');
                    if (at) { at.hp -= t.dmg; tocados++; }
                }
                if (!tocados) continue;
                t.timer = t.cadencia;
                this.eventos.push({ tipo: 'AREA', x: c.x, z: c.z, tocados });
                continue;
            }

            if (objetivo === null) continue;

            t.timer = t.cadencia;
            const b = w.createEntity();
            w.addComponent(b, 'Punto', { x: c.x, z: c.z });
            w.addComponent(b, 'Bala', { dmg: t.dmg, objetivo, vel: 12, vida: 2 });
            this.eventos.push({ tipo: 'DISPARO', x: c.x, z: c.z, torreta: t.id });
        }
    }

    _sisBalas(w, entidades, dt) {
        for (const id of entidades) {
            const b = w.getComponent(id, 'Bala');
            const p = w.getComponent(id, 'Punto');
            const co = w.getComponent(b.objetivo, 'Celda');
            b.vida -= dt;
            // Si el objetivo ya no está, la bala se pierde: no se reasigna sola.
            // Reasignar sería regalar puntería que la torreta no tiene.
            if (!co || b.vida <= 0) { w.destroyEntity(id); continue; }

            const dx = co.x - p.x, dz = co.z - p.z;
            const d = Math.hypot(dx, dz) || 1;
            const paso = b.vel * dt;
            if (paso >= d) {
                const a = w.getComponent(b.objetivo, 'Atacante');
                if (a) {
                    a.hp -= b.dmg;
                    this.eventos.push({ tipo: 'IMPACTO', objetivo: b.objetivo, dmg: b.dmg });
                }
                w.destroyEntity(id);
                continue;
            }
            p.x += (dx / d) * paso;
            p.z += (dz / d) * paso;
        }
    }

    _sisBajas(w, entidades) {
        for (const id of entidades) {
            const a = w.getComponent(id, 'Atacante');
            if (a.hp > 0) continue;
            this.presupuesto += a.premio;
            this.puntos += a.premio;
            this.bajas++;
            this.eventos.push({ tipo: 'BAJA', tipo_: a.tipo, premio: a.premio });
            w.destroyEntity(id);
        }
    }

    // ─── EL TICK ──────────────────────────────────────────────────────────

    step(dt = 1 / 60) {
        if (this.terminada) return { obs: this.observacion(), reward: 0, done: true, info: this.info() };
        this.eventos = [];
        const vidasAntes = this.vidas, puntosAntes = this.puntos;

        this.mundo.tick(dt);
        this.t += dt;
        /**
         * La renta. En el sendero vale 0 y esta línea no hace nada — por eso su
         * huella `77bef3c2` no se mueve. En el laberinto es lo que permite
         * invertir en carretera antes de tener con qué disparar.
         */
        if (this.renta) this.presupuesto += this.renta * dt;

        // Se gana sobreviviendo a todas las oleadas y limpiando lo que quede.
        if (this.oleada >= OLEADAS.length && this.mundo.query(['Atacante']).length === 0) {
            this.terminada = true;
            this.ganada = true;
            this.puntos += this.vidas * 25;
        }
        if (this.t * 60 >= this.tope) this.terminada = true;

        const reward = (this.puntos - puntosAntes) + (this.vidas - vidasAntes) * 30
                     + (this.ganada ? 200 : 0);
        return { obs: this.observacion(), reward, done: this.terminada, info: this.info() };
    }

    terminado() { return this.terminada; }

    info() {
        return {
            t: this.t, vidas: this.vidas, presupuesto: Math.floor(this.presupuesto),
            oleada: Math.min(this.oleada + 1, OLEADAS.length), oleadas: OLEADAS.length,
            bajas: this.bajas, coladas: this.coladas, puntos: this.puntos,
            atacantes: this.mundo.query(['Atacante']).length,
            torretas: this.mundo.query(['Torreta']).length,
            ganada: this.ganada,
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  EL SUSTRATO — LO QUE HAY, EN EL IDIOMA QUE HABLAN LOS DIBUJANTES
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Mismo contrato que publican los 24 juegos del arcade: `rejilla` (el
     * terreno), `piezas` (lo que se mueve encima) y `zonas` (montones fuera del
     * tablero, aquí ninguna). Con esto, cualquier dibujante que sepa leer un
     * sustrato puede pintar este juego **sin saber a qué se juega**.
     *
     * ⚠️ Y ES EL PRIMERO DE UN MUNDO QUE LO PUBLICA. MEDIDO: 24 A 0.
     *
     * En el arcade esto lleva meses funcionando: `mesa_tablero.mjs` pide
     * `hub.sustrato(juego)` y dibuja rejilla y piezas, y por eso 24 juegos
     * comparten una sola mesa. Los mundos tienen `montarMundo` —la sala: escena,
     * luces, pipeline— pero NO tenían el contrato de estado, así que cada página
     * se escribía su propio pintado.
     *
     * Lo pagué yo esta misma mañana: las tres páginas de ¡Busca! comparten
     * `verboDeLasTeclas`, `getObservationVector`, `stepSimulation`, `updateHUD`,
     * `BANDA_A_HUD` y `aviso` — casi idénticas, escritas tres veces. 741 líneas
     * en cuatro páginas, y la mayoría estructura repetida.
     *
     * Con el sustrato publicado, un estado y tres puertas: la mesa plana lo
     * dibuja en 2D, una mesa de mundo lo dibujará en 3D, y el agente lo lee como
     * números. Es la tesis del proyecto aplicada al DIBUJO, no sólo a las reglas.
     *
     * Y de propina: `prueba_sustrato.mjs` ya comprueba que lo dibujado cuadre con
     * lo que el juego dice que hay. Hoy vigila 24 juegos de arcade; en cuanto los
     * mundos publiquen sustrato, los vigila también.
     */
    sustrato() {
        const L = this.lado;
        const celdas = new Array(L * L);
        for (let z = 0; z < L; z++) {
            for (let x = 0; x < L; x++) celdas[z * L + x] = this.rejilla[z][x];
        }

        /**
         * ⚠️ EL SUSTRATO ES 2D Y USA `y`, NO `z`.
         *
         * Dentro del motor la matriz es (x, z) porque el suelo de un mundo 3D es
         * el plano XZ. El sustrato es una descripción PLANA —la misma que lee un
         * tablero de ajedrez— y allí el segundo eje se llama `y`. Traducirlo aquí
         * y no en cada dibujante es lo que permite que un mismo pintor sirva para
         * un tablero y para un mundo.
         */
        const piezas = [];
        const w = this.mundo;
        for (const id of w.query(['Celda', 'Torreta'])) {
            const c = w.getComponent(id, 'Celda'), t = w.getComponent(id, 'Torreta');
            /**
             * ⚠️ EL ALCANCE VIAJA EN EL SUSTRATO, PORQUE ES INFORMACIÓN DEL MUNDO.
             *
             * No es adorno: es con lo que se decide dónde va la siguiente torreta.
             * La página lo pintaba leyendo `observacion()` —un método propio de
             * este juego— y por eso su dibujante no servía para ningún otro. Si el
             * dato está en el sustrato, cualquier dibujante lo puede pintar sin
             * saber que existen las torretas.
             */
            piezas.push({ x: c.x, y: c.z, t: t.id, de: 0, alcance: t.alcance });
        }
        for (const id of w.query(['Celda', 'Atacante'])) {
            const c = w.getComponent(id, 'Celda'), a = w.getComponent(id, 'Atacante');
            piezas.push({ x: c.x, y: c.z, t: a.tipo, de: 1, vida: a.hp / a.hpMax });
        }

        return {
            rejilla: { ancho: L, alto: L, celdas },
            piezas,
            zonas: [],
            /**
             * ⚠️ QUÉ SIGNIFICA CADA VALOR DE CELDA. SIN ESTO, EL MAPA MIENTE.
             *
             * `describirSustrato` traía el vocabulario del arcade escrito a fuego
             * —`0` vacío, `1` muro, `2` destino— porque hasta ahora sólo lo usaban
             * juegos de tablero. Aquí `1` es el SENDERO y `2` el núcleo, así que
             * el mapa de texto salía diciendo que había muros por donde vienen los
             * bichos, y la entrada aparecía como un `3` suelto.
             *
             * No es un defecto de presentación: un modelo que lea ese mapa toma
             * decisiones contra un terreno que no existe.
             */
            terreno: { [CELDA.LIBRE]: '.', [CELDA.CAMINO]: '·', [CELDA.NUCLEO]: '#',
                       [CELDA.ENTRADA]: 'o', [CELDA.TORRETA]: 'T' },
            leyendaTerreno: { [CELDA.LIBRE]: 'libre, aquí se puede construir',
                              [CELDA.CAMINO]: 'el sendero por donde vienen',
                              [CELDA.NUCLEO]: 'tu núcleo', [CELDA.ENTRADA]: 'por donde entran',
                              [CELDA.TORRETA]: 'una torreta puesta' },
            /**
             * ⚠️ AQUÍ SÓLO VA LO QUE SE MUEVE O SE PONE ENCIMA, NO EL TERRENO.
             *
             * Tenía `camino`, `nucleo` y `entrada` también aquí, y el mapa de
             * texto salía con la leyenda repetida: primero como terreno y otra vez
             * como pieza. Un vocabulario que se dice dos veces invita a creer que
             * son dos cosas distintas.
             *
             * El terreno se declara en `terreno`/`leyendaTerreno`; `piezas` son las
             * torretas y los bichos, que es lo único que ocupa una celda encima.
             */
            leyenda: {
                guijarro: 'torreta corta', pertiga: 'torreta larga', yunque: 'torreta lenta y fuerte',
                peon: 'bicho normal', rapido: 'bicho veloz', gordo: 'bicho duro',
            },
            simbolos: {
                guijarro: 'g', pertiga: 'p', yunque: 'y',
                peon: 'a', rapido: 'r', gordo: 'G',
            },
        };
    }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  LA OBSERVACIÓN ES LA MATRIZ. NO UNA DESCRIPCIÓN DE ELLA.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Aquí es donde ECS paga. En los motores de estado propio, cada entorno se
     * fabrica su vector a mano —24 números en ¡Busca!, 64 en Marabunta— y ahí es
     * justo donde hoy encontré que `escaner_listo` le mentía a la puerta numérica
     * mientras la de lenguaje decía la verdad. Un vector escrito a mano es un
     * sitio donde el estado y su copia pueden separarse.
     *
     * Esto no se escribe a mano: se RECORRE el mundo. `rejilla` es el terreno y
     * `entidades` es lo que se mueve encima, sacado de las mismas consultas que
     * usan los sistemas. Si mañana aparece un componente nuevo, sale aquí sin que
     * nadie se acuerde de añadirlo.
     */
    observacion() {
        const w = this.mundo;
        const entidades = [];
        for (const id of w.query(['Celda', 'Atacante'])) {
            const c = w.getComponent(id, 'Celda'), a = w.getComponent(id, 'Atacante');
            const r = w.getComponent(id, 'Ruta');
            entidades.push({ que: 'atacante', tipo: a.tipo, x: c.x, z: c.z,
                             hp: a.hp, hpMax: a.hpMax, paso: r.paso, pasos: this.camino.length });
        }
        for (const id of w.query(['Celda', 'Torreta'])) {
            const c = w.getComponent(id, 'Celda'), t = w.getComponent(id, 'Torreta');
            entidades.push({ que: 'torreta', tipo: t.id, x: c.x, z: c.z, alcance: t.alcance });
        }
        return {
            lado: this.lado,
            rejilla: this.rejilla.map(f => f.slice()),
            camino: this.camino,
            nucleo: this.nucleo,
            entidades,
            vidas: this.vidas,
            presupuesto: Math.floor(this.presupuesto),
            oleada: Math.min(this.oleada + 1, OLEADAS.length),
            oleadas: OLEADAS.length,
            construibles: this.construibles(),
        };
    }
}
