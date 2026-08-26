import { GymEnv } from '../GymEnv.js';
import { RaccoonSpaceCore, VERBS_SPACE, VERBS_DRONE, VERBS_ORBIT }
    from '../../world/systems/RaccoonSpaceCore.js';

/**
 * RaccoonSpaceEnv — etapa 7 de la matrioska
 * ═══════════════════════════════════════════════════════════════════════════
 * Busca al mapache por los planetas antes de quedarte sin combustible.
 *
 * 🤖 numérica : 22 números, acción discreta 0..7
 * 🧠 lenguaje : `describe()` cuenta lo que ve el piloto; `affordances()` solo
 *               ofrece `escanear` cuando hay un planeta al alcance
 * 🕹️ humana   : `games/raccoon_space.html` — W empuje, A/D timón, Q/E morro
 *
 * QUÉ MIDE QUE OTROS NO
 * Es un problema de BÚSQUEDA con presupuesto: el combustible se gasta aunque no
 * hagas nada, y escanear al vacío también cuesta. No basta con sobrevivir ni
 * con ir rápido — hay que decidir a qué planeta ir primero con información
 * incompleta. Los demás entornos premian reflejos; este premia el plan.
 *
 * A diferencia de Marabunta, aquí NO hacía falta `DeterministicScope`: el núcleo no
 * llama a `Math.random()` ni una vez. Toda su aleatoriedad sale de `mulberry32`
 * sembrado en `reset(semilla)`. Cuando el system está bien hecho, el enchufe del
 * gym es más pequeño — y esa es justo la señal de que está bien hecho.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export class RaccoonSpaceEnv extends GymEnv {
    static id = 'alisa/RaccoonSpace-v1';

    static observationSpace = {
        shape: [24],
        names: [
            'x', 'y', 'z', 'vx', 'vy', 'vz', 'guinada', 'cabeceo', 'combustible',
            'ast0_dx', 'ast0_dy', 'ast0_dz', 'ast1_dx', 'ast1_dy', 'ast1_dz',
            'pla0_dx', 'pla0_dy', 'pla0_dz', 'pla1_dx', 'pla1_dy', 'pla1_dz',
            'escaner_listo', 'cand0_coherencia', 'cand1_coherencia',
        ],
        low: -1, high: 1,
    };

    static actionSpace = { type: 'discrete', n: VERBS_SPACE.length, names: VERBS_SPACE };

    static meta = {
        title: '¡Busca! 6 — Espacio',
        summary: 'Encuentra el planeta donde se esconde el mapache antes de quedarte sin ' +
                 'combustible. Moverse cuesta, escanear en balde también, y el soporte ' +
                 'vital gasta aunque estés quieto.',
        horizon: 5400,
        tags: ['busqueda', 'presupuesto', 'exploracion', '3d', 'discreto'],
    };

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  ⚠️ ¡BUSCA! 4, 5 Y 6 SON EL MISMO JUEGO A TRES ESCALAS. MEDIDO.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Las tres páginas tienen el MISMO marcador —`fuel + (restantes) × bonus`— y
     * la misma mecánica: moverse con un presupuesto, escanear, encontrar. Sólo
     * cambia el tamaño del sitio, cuántos objetivos hay y cómo se llaman:
     *
     *     ciudad   RaccoonCitySystem   · 12 edificios · escanear -5  · bonus ×10
     *     planeta  RaccoonPlanetSystem ·  8 ciudades  · escanear -8  · bonus ×15
     *     espacio  RaccoonSpaceSystem  ·  6 planetas  ·              · bonus ×20
     *
     * Y `RaccoonCitySystem` pesa 3 KB y `RaccoonPlanetSystem` 1 KB: son cascarones
     * de dibujo, la lógica del juego vive en las páginas. Este núcleo, en cambio,
     * tiene el juego entero, es headless y va sembrado.
     *
     * Así que las dos etapas que faltaban en el banco NO son dos entornos nuevos:
     * son ESTE con otros números y otro sustantivo. Escribir dos copias de 138
     * líneas habría creado dos verdades más sobre el mismo juego, que es la avería
     * que este proyecto lleva toda la semana pagando.
     *
     * `ajustes` son los números de la escala; `objetivo` es cómo se llama lo que
     * buscas, que importa porque la puerta de lenguaje se lee en voz alta y
     * «escanea el planeta» en una ciudad es una descripción falsa.
     */
    /**
     * ⚠️ Y EL GÉNERO ESTÁ AQUÍ PORQUE LA PUERTA DE LENGUAJE SE LEE.
     *
     * La primera versión sólo tenía singular y plural, y el planeta salía con
     * «No hay **ningún ciudad** al alcance. **El ciudad** sin escanear más
     * cercano…». Un modelo leyendo eso está leyendo un texto mal escrito, y este
     * banco compara justamente lo que cada puerta entrega: si la de lenguaje
     * entrega castellano roto, la comparación tiene un sesgo que no es del juego.
     */
    static ajustes = {};
    static objetivo = { uno: 'planeta', varios: 'planetas', el: 'El', un: 'un', ningun: 'ningún' };

    constructor(opts = {}) {
        super(opts);
        this.opts = { ...new.target.ajustes, ...opts };
        this.sys = new RaccoonSpaceCore(this.opts);
    }

    reset(seed = 0) {
        this.seed = seed >>> 0;
        this.sys = new RaccoonSpaceCore({ ...this.opts, seed: this.seed });
        this.steps = 0;
        this.done = false;
        return this.getObservation();
    }

    step(action, dt = 1 / 60) {
        const r = this.sys.step(action, dt);
        this.steps++;
        this.done = r.done;
        return r;
    }

    getObservation() { return this.sys.observacion(); }

    describe() {
        const s = this.sys;
        const { uno, varios, el, un, ningun } = this.constructor.objetivo;
        const i = s.info();
        const pct = Math.round(100 * s.combustible / (s.combustibleInicial || 1));
        const partes = [
            `Combustible al ${pct}% (${Math.round(s.combustible)} de ${s.combustibleInicial}).`,
            `Has escaneado ${i.escaneados} de ${i.total} ${varios}.`,
        ];

        /**
         * ⚠️ LA DERIVA. Estaba en `observacion()` como vx/vy/vz y no en el texto.
         *
         * Este mundo tiene inercia: si vas lanzada, empujar te aleja más. El
         * piloto que lee números lo sabía y el que lee texto no — y la persona
         * tampoco lo lee, lo VE, porque el dron se inclina al desplazarse.
         *
         * Se dice la rapidez y hacia dónde, no los tres componentes: «vas a 12, a
         * babor» es lo que se decide, y darle las tres cifras sería pedirle al
         * modelo que haga trigonometría para saber si tiene que frenar.
         */
        const nv = s.nave;
        const rapidez = Math.hypot(nv.vx ?? 0, nv.vy ?? 0, nv.vz ?? 0);
        if (rapidez > 0.5) {
            const hacia = [];
            if (Math.abs(nv.vx) > 0.5) hacia.push(nv.vx > 0 ? 'a estribor' : 'a babor');
            if (Math.abs(nv.vy) > 0.5) hacia.push(nv.vy > 0 ? 'arriba' : 'abajo');
            if (Math.abs(nv.vz) > 0.5) hacia.push(nv.vz > 0 ? 'atrás' : 'adelante');
            partes.push(`Vas derivando a ${Math.round(rapidez)}`
                      + `${hacia.length ? ' ' + hacia.join(' y ') : ''}.`);
        }

        const p = s.planetaCerca();
        partes.push(p
            ? (p.escaneado
                ? `Tienes ${un} ${uno} al alcance, pero ya lo escaneaste.`
                : `Tienes ${un} ${uno} SIN ESCANEAR al alcance del escáner.`)
            : `No hay ${ningun} ${uno} al alcance.`);

        // Al piloto se le dice hacia dónde queda el más próximo, no dónde está
        // el mapache: la gracia del entorno es que esa parte no se sabe.
        const sinEscanear = s.planetas.filter(x => !x.escaneado);
        if (sinEscanear.length && !p) {
            const n = s.nave;
            const cerca = sinEscanear
                .map(o => ({ o, d: Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z) }))
                .sort((a, b) => a.d - b.d)[0];
            const dir = [];
            if (Math.abs(cerca.o.x - n.x) > 20) dir.push(cerca.o.x > n.x ? 'a estribor' : 'a babor');
            if (Math.abs(cerca.o.y - n.y) > 20) dir.push(cerca.o.y > n.y ? 'arriba' : 'abajo');
            /**
             * ⚠️ SIN ADJETIVO, PARA NO ARRASTRAR MÁS GRAMÁTICA.
             * Con «${el} ${uno} más cercano» salía «La ciudad más CERCANO»: el
             * artículo ya concordaba y el adjetivo no. Cada palabra que concuerde
             * es un campo más que mantener en tres sitios, así que la frase se
             * escribe de forma que no dependa del género. Un texto que un modelo
             * lee en voz alta tiene que estar bien escrito, y la manera barata de
             * conseguirlo es no escribir la parte difícil.
             */
            partes.push(`Lo más cerca que tienes sin escanear está a ${Math.round(cerca.d)} unidades`
                      + `${dir.length ? ', ' + dir.join(' y ') : ''}.`);
        }

        /**
         * ⚠️ EL RADAR. LA PERSONA LO VE ENTERO Y EL AGENTE VEÍA UNA FLECHA.
         * ═══════════════════════════════════════════════════════════════════
         *
         * Arriba se decía SÓLO dónde queda el más próximo. El comentario defendía
         * ocultar cuál tiene el mapache —y eso es correcto, es la gracia del
         * juego— pero de paso ocultaba dónde están los otros nueve, que no es
         * ningún secreto: **la página humana los enseña todos en su radar.** Está
         * en la captura del 25-08: un círculo con un punto por objetivo.
         *
         * O sea que la persona planificaba una ruta entre diez y el agente
         * recibía «a 63 unidades, abajo». Dos juegos con el mismo nombre, otra
         * vez, y en la misma familia donde ya lo arreglamos una vez con las
         * pistas del escáner.
         *
         * Se publica la POSICIÓN de los no escaneados, nunca cuál es el bueno.
         * Exactamente lo que se ve en el radar y ni un dato más.
         *
         * ⚠️ Y SE DAN RELATIVAS A LA NAVE, NO ABSOLUTAS.
         *
         * Un radar muestra «a tu derecha, lejos», no coordenadas del universo.
         * Además el número absoluto obligaría al modelo a restar para saber hacia
         * dónde girar, y eso es hacerle pagar un peaje aritmético que la persona
         * no paga — que es otra forma de que la nota mida la puerta.
         */
        if (sinEscanear.length) {
            const n = s.nave;
            const radar = sinEscanear
                .map(o => ({
                    i: s.planetas.indexOf(o),
                    dx: Math.round(o.x - n.x),
                    dy: Math.round(o.y - n.y),
                    dz: Math.round(o.z - n.z),
                    d: Math.round(Math.hypot(o.x - n.x, o.y - n.y, o.z - n.z)),
                }))
                .sort((a, b) => a.d - b.d);
            partes.push(`Radar, sin escanear (número: distancia, y desvío respecto a ti): `
                + radar.map(r => `${r.i}: ${r.d} (${r.dx > 0 ? '+' : ''}${r.dx}, `
                    + `${r.dy > 0 ? '+' : ''}${r.dy}, ${r.dz > 0 ? '+' : ''}${r.dz})`).join('; ') + '.');
        }

        /**
         * ⚠️ LAS PISTAS, QUE SON EL JUEGO Y NO LLEGABAN A ESTA PUERTA.
         *
         * La página le decía a la persona «🟢 HOT (37 LY away)» al descartar un
         * objetivo, y aquí no se contaba nada: el agente hacía un recorrido a
         * ciegas mientras la persona deducía. Dos juegos con el mismo nombre.
         *
         * Se dan en bandas y con el número del objetivo, que es exactamente lo
         * que ve una persona en su radar: qué descartaste y cómo de cerca estaba.
         */
        const pistas = s.pistas();
        if (pistas.length) {
            partes.push('Lo que ha dicho el escáner: '
                + pistas.map(p => `el ${p.i} estaba ${p.banda}`).join(', ') + '.');
        }

        const astCerca = s.asteroides
            .map(a => Math.hypot(a.x - s.nave.x, a.y - s.nave.y, a.z - s.nave.z))
            .filter(d => d < 40).length;
        if (astCerca) partes.push(`Tienes ${astCerca} asteroide(s) cerca.`);

        if (s.encontrado) partes.push('¡Has encontrado al mapache!');
        if (s.muerto) partes.push('Te has quedado sin combustible.');
        return partes.join(' ');
    }

    affordances() {
        const s = this.sys;
        if (s.terminado()) return [];

        /**
         * ═══════════════════════════════════════════════════════════════════
         *  ⚠️ EL MENÚ SALE DE LOS VERBOS DE ESTA ETAPA, NO DE UNA LISTA FIJA
         * ═══════════════════════════════════════════════════════════════════
         *
         * Esta lista estaba escrita a mano con los verbos de la NAVE, y las tres
         * etapas la heredaban. Medido el 24-08 en el navegador: a un modelo que
         * jugara al sector de ciudad se le ofrecían `empujar`, `girar_izq`,
         * `morro_arriba`… — los mandos de una nave espacial para pilotar un dron.
         * Seis de siete verbos que no existen en esa etapa.
         *
         * Y no era sólo un menú equivocado: el núcleo ACEPTABA `empujar` en el
         * dron —lo movía 6,31 unidades— porque el bloque de empuje no miraba el
         * mando. Así que la puerta de lenguaje tenía verbos que la numérica no,
         * las dos jugaban con mandos distintos, y ninguna prueba lo veía.
         *
         * Ahora el menú se deriva de `actionSpace.names`, que es la misma lista
         * que ve la puerta numérica. Si mañana se añade un mando, las dos puertas
         * se enteran a la vez o ninguna.
         */
        const DESC = {
            nada:         'Dejarse llevar por la inercia (solo gasta el soporte vital)',
            empujar:      'Acelerar hacia donde apunta el morro (gasta combustible)',
            frenar:       'Empujar hacia atrás (gasta igual)',
            girar_izq:    'Timón a babor',
            girar_der:    'Timón a estribor',
            morro_arriba: 'Levantar el morro',
            morro_abajo:  'Bajar el morro',
            adelante:     'Desplazar el dron hacia delante (gasta batería)',
            atras:        'Desplazar el dron hacia atrás',
            izquierda:    'Desplazar el dron a la izquierda',
            derecha:      'Desplazar el dron a la derecha',
            subir:        'Ganar altura',
            bajar:        'Perder altura',
            norte:        'Subir en latitud (hacia el polo norte)',
            sur:          'Bajar en latitud (hacia el polo sur)',
            este:         'Avanzar en longitud hacia el este',
            oeste:        'Avanzar en longitud hacia el oeste',
            bajar_orbita: 'Acercar el satélite a la superficie — es lo que pone las ciudades a tiro',
            subir_orbita: 'Alejar el satélite de la superficie',
        };
        const lista = this.constructor.actionSpace.names
            .filter(v => v !== 'escanear')
            .map(v => ({ verb: v, args: {}, action: v, desc: DESC[v] ?? v }));

        // `escanear` solo se ofrece si sirve de algo. Ofrecerlo siempre
        // enseñaría al agente a malgastar, y penalizarlo después sería tramposo.
        const p = s.planetaCerca();
        if (p && !p.escaneado) {
            lista.unshift({ verb: 'escanear', args: {}, action: 'escanear',
                            desc: `Escanear el ${this.constructor.objetivo.uno} que tienes al alcance` });
        }
        return lista;
    }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ¡BUSCA! 4 Y 5 — LAS DOS ETAPAS QUE SE JUGABAN Y NO SE MEDÍAN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Hasta el 24-08 la saga estaba medida a la mitad: de sus seis etapas, sólo tres
 * tenían entorno —Cabinet, Corp y Espacio—. Una persona podía jugar el sector de
 * ciudad y el planeta, y el banco no podía puntuar a nadie en ellos, así que la
 * escalera de dificultad era una afirmación y no una medida.
 *
 * ⚠️ Y LOS NÚMEROS SALEN DE UN BARRIDO, CON UN JUGADOR COMPETENTE.
 *
 * `calibrar_busca.mjs` mide lo único que define una escalera: cuántas veces gana
 * un piloto que sabe jugar. Antes de calibrar, la escalera BAJABA en el medio —el
 * planeta se ganaba más que la ciudad—, que es justo lo que `ESTADO_SAGAS.md`
 * sospechaba contando escondites. Con estos números, medido sobre 60 semillas:
 *
 *     ¡Busca! 4 ciudad     82% de victorias
 *     ¡Busca! 5 planeta    60%
 *     ¡Busca! 6 espacio    43%
 *
 * Y cero partidas que empiecen con un objetivo ya al alcance, que era el otro
 * fallo: en la escala pequeña, 22 de cada 40 se resolvían sin moverse.
 */
export class RaccoonCityEnv extends RaccoonSpaceEnv {
    static id = 'alisa/RaccoonCity-v1';
    static objetivo = { uno: 'edificio', varios: 'edificios', el: 'El', un: 'un', ningun: 'ningún' };
    /**
     * ⚠️ SIN ASTEROIDES, Y NO ES UN DESCUIDO.
     *
     * Cuando metí esta etapa al banco le puse ocho por inercia, copiando la
     * configuración del espacio. La página no dibuja ninguno: el dron vuela sobre
     * una ciudad. Ocho rocas invisibles empujando al agente y quitándole batería
     * son ocho cosas que el modelo sufre y la persona no — la misma grieta que
     * este trabajo existe para cerrar, sólo que del lado contrario.
     */
    /**
     * ⚠️ DOCE EDIFICIOS → DIEZ, Y NO ES POR HACERLO MÁS FÁCIL.
     *
     * Con doce, esta etapa y la del planeta se ganaban el 75% y el 67%: ocho
     * puntos de separación, que con 60 semillas está dentro del ruido. Dos
     * escalones que en realidad eran uno. El depósito no lo arreglaba —de 30 a 46
     * la etapa no se movía ni un punto, porque el dron nunca se queda sin
     * batería— así que el que manda es el número de edificios que descartar.
     * Medido en `calibrar_busca.mjs`.
     */
    static ajustes = { tankSize: 180, planets: 10, asteroids: 0, fuel: 30, tope: 3000,
                       forma: 'rejilla', mando: 'dron', scanCost: 0.05 };
    static actionSpace = { type: 'discrete', n: VERBS_DRONE.length, names: VERBS_DRONE };
    static meta = {
        title: '¡Busca! 4 — Sector de ciudad',
        summary: 'Encuentra el edificio donde se esconde el mapache antes de quedarte sin '
               + 'combustible. Doce edificios juntos: llegar es barato, pero hay muchos que mirar.',
        horizon: 3000,
        tags: ['busqueda', 'presupuesto', 'exploracion', '3d', 'discreto'],
    };
}

export class RaccoonPlanetEnv extends RaccoonSpaceEnv {
    static id = 'alisa/RaccoonPlanet-v1';
    static objetivo = { uno: 'ciudad', varios: 'ciudades', el: 'La', un: 'una', ningun: 'ninguna' };
    /** Sin asteroides por el mismo motivo que la ciudad: la página no los dibuja. */
    /**
     * ⚠️ 26 → 12, Y OTRA VEZ NO ES AFINAR: ES QUE CAMBIÓ EL JUEGO.
     *
     * Con 26 el satélite ganaba el 100% de las partidas. No porque el planeta sea
     * fácil, sino porque hasta hoy lo pilotaba como una nave —empuje cartesiano
     * sobre una esfera— y le sobraba de todo. Con mando de órbita y el coste de
     * escaneo que la página sí cobraba, 11 lo deja en el 72%: entre el 87% de la
     * ciudad y el 52% del espacio. Medido en `calibrar_busca.mjs`.
     */
    static ajustes = { tankSize: 260, planets: 8, asteroids: 0, fuel: 11, tope: 3600,
                       forma: 'esfera', mando: 'orbita', scanCost: 0.08 };
    static actionSpace = { type: 'discrete', n: VERBS_ORBIT.length, names: VERBS_ORBIT };
    static meta = {
        title: '¡Busca! 5 — Planeta',
        summary: 'Encuentra la ciudad donde se esconde el mapache antes de quedarte sin '
               + 'combustible. Menos sitios que mirar que en el sector, y mucho más lejos '
               + 'unos de otros: aquí lo que cuesta es llegar.',
        horizon: 3600,
        tags: ['busqueda', 'presupuesto', 'exploracion', '3d', 'discreto'],
    };
}

export default RaccoonSpaceEnv;
