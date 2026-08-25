/**
 * sagas.mjs — LAS ETAPAS DECLARADAS, EN UN SOLO SITIO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Qué sagas hay, qué etapas tiene cada una, en qué página se juega y con qué
 * entorno la mide el banco.
 *
 * ⚠️ POR QUÉ EXISTE ESTE FICHERO, Y ES UN FALLO MÍO DEL 25-08.
 *
 * Este mapa YA existía, dentro de `prueba_sagas.mjs`, como constantes locales
 * `EN_EL_BANCO` y `SIN_ENTORNO`. Y yo, para montar la puerta de los betas,
 * escribí `gen_sagas.mjs` **parseando el <title> de las páginas** — o sea, me
 * fabriqué una segunda lista de sagas teniendo la buena al lado.
 *
 * El resultado fue exactamente el que se merecía: mi lista sólo miraba
 * `public/games`, así que la saga ¡Sobrevive! ENTERA se quedó fuera de la puerta
 * —sus dos etapas viven en `labs/`— y Oscar lo vio antes que yo, preguntando por
 * qué faltaban sagas.
 *
 * Es la avería que llevo el día entero denunciando en el organismo: la fuente
 * canónica existe pero está enterrada dentro de un fichero que no la exporta, así
 * que el siguiente que la necesita se escribe la suya. Seis regex de la tripleta,
 * dos cascadas de intención, dos suelos ciegos. Y esto.
 *
 * Así que el mapa sale de la prueba y se pone aquí, donde lo puede importar
 * cualquiera: la prueba que vigila que las dos puertas compartan motor, el
 * generador que alimenta la antesala, y lo que venga.
 */

/**
 * Etapas que el banco MIDE: tienen entorno de gym, así que la nota de una persona
 * y la de un agente hablan del mismo juego.
 */
export const EN_EL_BANCO = [
    { saga: 'Busca', etapa: 1, nombre: 'Cabinet Escape',
      pagina: 'public/games/croupier_cabinet_escape.html',
      env: 'public/js/alisa-engine/src/gym/envs/CabinetEscapeEnv.js' },
    { saga: 'Busca', etapa: 3, nombre: 'Corp Building',
      pagina: 'public/games/croupier_corporate_building.html',
      env: 'public/js/alisa-engine/src/gym/envs/CorpBuildingEnv.js' },
    { saga: 'Busca', etapa: 4, nombre: 'City Sector',
      pagina: 'public/games/raccoon_city_sector.html',
      env: 'public/js/alisa-engine/src/gym/envs/RaccoonSpaceEnv.js' },
    { saga: 'Busca', etapa: 5, nombre: 'Planeta',
      pagina: 'public/games/raccoon_planet.html',
      env: 'public/js/alisa-engine/src/gym/envs/RaccoonSpaceEnv.js' },
    { saga: 'Busca', etapa: 6, nombre: 'Espacio',
      pagina: 'public/games/raccoon_space.html',
      env: 'public/js/alisa-engine/src/gym/envs/RaccoonSpaceEnv.js' },
    { saga: 'Sobrevive', etapa: 2, nombre: 'Acuario',
      pagina: 'public/labs/croupier_chopper_aquarium.html',
      env: 'public/js/alisa-engine/src/gym/envs/ChopperAquariumEnv.js' },
    /**
     * ¡Defiende! entró el 25-08 y no estaba en el mapa de `prueba_sagas.mjs`
     * porque ese fichero es anterior. Es justo el tipo de omisión que produce una
     * lista paralela: la nueva se escribe en otro sitio y las dos envejecen por
     * separado. Aquí ya no puede pasar — sólo hay una.
     */
    { saga: 'Defiende', etapa: 1, nombre: 'Sendero',
      pagina: 'public/games/defiende_sendero.html',
      env: 'public/js/alisa-engine/src/gym/envs/DefiendeEnv.js' },

    /**
     * ⚠️ MARABUNTA ENTRA EN ¡SOBREVIVE!, Y NO ES POR HUECO LIBRE.
     *
     * `docs/ESTADO_SAGAS.md` define la saga como «no ser lo que se comen», y dice
     * que «le faltan etapas por delante y por detrás». Una marabunta es
     * literalmente el enjambre que devora: eres la presa de una horda que se
     * cierra. Encaja en la definición que ya estaba escrita, no en una que yo
     * necesite para colocarla.
     *
     * Va de 3 porque es la más dura de las tres: las dos primeras son ecosistemas
     * donde se prototipa comer y ser comido; ésta tiene oleadas, jefes y mejoras.
     */
    { saga: 'Sobrevive', etapa: 3, nombre: 'Marabunta',
      pagina: 'public/labs/croupier_marabunta.html',
      env: 'public/js/alisa-engine/src/gym/envs/MarabuntaEnv.js' },

    /**
     * ⚠️ PEDRISCO IBA A ABRIR ¡ESQUIVA! Y NO ENTRA TODAVÍA. LO PARÓ LA PRUEBA.
     *
     * El nombre estaba bien elegido y no por sonoridad: sus propios verbos son
     * `esquivar_izquierda`, `esquivar_derecha`, `subir`, `bajar`, `centrar`,
     * `mantener`, `disparar`. El juego ya se había puesto el nombre. Y no es
     * ¡Sobrevive! porque ahí no te come nadie: cae granizo y te apartas.
     *
     * Pero al meterlo, `prueba_sagas.mjs` lo tumbó:
     *
     *     página  croupier_asteroids_survival.html  ->  AsteroidsEngine
     *     banco   AsteroidsEnv.js                   ->  AsteroidsSystem
     *
     * Dos motores. O sea: exactamente el caso que yo mismo había rechazado una
     * hora antes para Chopper —«sería poner a un beta delante de un juego que el
     * banco no mide»— y estaba a punto de colarlo por la puerta grande. Mi
     * evaluación previa fue superficial: comprobé que la página importaba UN
     * motor del engine, no que fuera EL MISMO.
     *
     * No se declara como deuda para que la prueba calle: declarar sería subir la
     * deuda, y el trinquete existe justo para que no suba. Entra el día que una
     * de las dos puertas se mueva a la otra.
     *
     * Se deja escrito porque la decisión importa más que el resultado: la puerta
     * de los betas no es un escaparate de lo que hay, es una promesa de que lo
     * que se juega es lo que se mide.
     */
];

/**
 * Etapas que una persona PUEDE JUGAR y el banco NO PUEDE MEDIR.
 *
 * No es lo mismo que tener dos motores, y mezclarlas escondería las dos: una
 * etapa sin entorno es una que todavía no se puede comparar; una con dos motores
 * es una que MIENTE al compararse. Se listan aparte a propósito.
 *
 * Van igualmente a la antesala de los betas —se pueden jugar, y jugar es lo que
 * les pedimos— pero marcadas, porque su opinión no se puede contrastar con una
 * nota.
 */
export const SIN_ENTORNO = [
    { saga: 'Busca', etapa: 2, nombre: 'Registro de Planta',
      pagina: 'public/games/raccoon_floor_search.html', motivo: 'sin entorno de gym' },
    { saga: 'Sobrevive', etapa: 1, nombre: 'Interaction Lab',
      pagina: 'public/labs/croupier_interaction_lab.html', motivo: 'sin entorno de gym' },
];

/** Todas, con `medida: true|false`, ordenadas por saga y etapa. */
export const TODAS = [
    ...EN_EL_BANCO.map(e => ({ ...e, medida: true })),
    ...SIN_ENTORNO.map(e => ({ ...e, medida: false })),
].sort((a, b) => a.saga.localeCompare(b.saga) || a.etapa - b.etapa);
