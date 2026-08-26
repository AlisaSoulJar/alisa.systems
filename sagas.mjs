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

    /**
     * ⚠️ ¡BUSCA! 7 NO ES UNA ETAPA NUEVA: ES UNA MITAD QUE ESTABA EN OTRA SAGA.
     *
     * «Chopper Aquarium» —archivada en ¡Sobrevive! 2— tenía DOS juegos dentro, y
     * medido casi al 50%: 37 referencias al edificio y 30 al ecosistema. Su
     * propia portada lo decía: «scanning a procedural skyscraper for a hidden
     * raccoon», que es la definición literal de ESTA saga. Un helicóptero-pez
     * escaneando un rascacielos dentro de una pecera no era mala ambientación:
     * eran dos juegos pegados.
     *
     * Aquí queda la mitad que busca. La otra se queda de submarino en
     * ¡Sobrevive!, donde el ecosistema —plancton, peces, tiburones, arrecifes y
     * medusas— ya estaba escrito, sembrado y funcionando.
     *
     * Va de 7 y no entre las seis porque es ¡Busca! en VOLUMEN: donde el Corp
     * Building se recorre de lado, aquí se vuela alrededor y se elige altura. Y
     * es la primera etapa con la mecánica de recurso ENTERA — gasta, se recarga,
     * y las pilas salen en el sustrato, así que la persona y el agente ven las
     * mismas.
     */
    { saga: 'Busca', etapa: 7, nombre: 'Torre en volumen',
      pagina: 'public/games/dron_torre.html',
      env: 'public/js/alisa-engine/src/gym/envs/DroneTowerEnv.js' },
    /**
     * ⚠️ ERA «ACUARIO», Y SE SUSTITUYE. NO ES UN RETOQUE DE AMBIENTACIÓN.
     *
     * `ChopperAquariumEngine` tenía DOS juegos dentro, medido casi al 50%: 37
     * referencias al edificio y 30 al ecosistema. Su portada decía «scanning a
     * procedural skyscraper for a hidden raccoon» —la definición literal de
     * ¡Busca!— mientras la etapa vivía archivada aquí. Un helicóptero-pez
     * escaneando un rascacielos dentro de una pecera no era mala ambientación:
     * eran dos juegos pegados.
     *
     * La mitad que busca se fue a ¡Busca! 7. Ésta es la que de verdad pertenecía
     * a «no ser lo que se comen», y sus reglas ya estaban escritas en
     * `EcosystemSystem` —forrajeo, huida, banco, metabolismo, escondite en
     * medusas y arrecife, feromonas— sin que ninguna etapa las usara.
     *
     * ⚠️ Y AL MONTARLA SALIÓ QUE EL ECOSISTEMA VIEJO ESTABA MEDIO MUERTO.
     * El acuario dejaba `plankton`, `ecosystemCorals` y `ecosystemJellyfishes`
     * como arrays VACÍOS, y `tickPlankton` sólo mueve el plancton que ya existe.
     * Veinticinco peces sin nada que comer y sin dónde esconderse, nadando por
     * inercia desde siempre. Por eso parecía decorado: lo era.
     *
     * El id NO sube a `-v1`: se retira `alisa/ChopperAquarium-v0` y nace
     * `alisa/Submarine-v0`. Un `-v1` diría «el mismo juego, que cambió», e
     * invitaría a comparar notas entre buscar y sobrevivir. Medido antes: cero
     * referencias al acuario en `resultados/tabla.json` y `matriz.json`.
     *
     * La página vieja sigue viva en `labs/` — deja de ser etapa, no deja de
     * existir. Borrar algo que funciona es una decisión aparte.
     */
    { saga: 'Sobrevive', etapa: 2, nombre: 'Submarino',
      pagina: 'public/games/submarino.html',
      env: 'public/js/alisa-engine/src/gym/envs/SubmarineEnv.js' },
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
     * ⚠️ PEDRISCO ABRE ¡ESQUIVA!, Y EL CAMINO HASTA AQUÍ MERECE LEERSE.
     *
     * El nombre no lo elegí por sonoridad: sus propios verbos son
     * `esquivar_izquierda`, `esquivar_derecha`, `subir`, `bajar`, `centrar`,
     * `mantener`, `disparar`. El juego ya se había puesto el nombre. Y no es
     * ¡Sobrevive! porque ahí no te come nadie: cae granizo y te apartas.
     *
     * Al meterlo, `prueba_sagas.mjs` lo tumbó —«página y banco corren motores
     * distintos»— y yo me creí la acusación y lo dejé fuera. Estaba mal: el fallo
     * era del instrumento. `AsteroidsEngine.js:26` hace
     * `this.system = new AsteroidsSystem(...)`, o sea que envuelve al motor del
     * banco. La prueba SÍ sigue envoltorios, pero su filtro de rutas se saltaba
     * el último salto —`'./AsteroidsSystem.js'`, el hermano de al lado— y la
     * cadena se cortaba justo ahí.
     *
     * Lección, y van cuatro con la misma forma: creerse a un instrumento sin
     * mirar por qué acusa cuesta lo mismo que ignorarlo. Yo lo había escrito para
     * no fiarme de mi criterio, y acabé no fiándome de la evidencia.
     *
     * Entra con una etapa, igual que ¡Defiende!. Una saga de una no es un
     * problema: es una saga a la que le faltan las demás.
     */
    { saga: 'Esquiva', etapa: 1, nombre: 'Pedrisco',
      pagina: 'public/labs/croupier_asteroids_survival.html',
      env: 'public/js/alisa-engine/src/gym/envs/AsteroidsEnv.js' },
];

/**
 * ⚠️ NOTA HISTÓRICA — LO QUE CREÍ QUE PASABA Y NO PASABA. TRES VECES.
 *
 * En una sola noche juzgué tres veces mal la misma pregunta —«¿juegan la persona
 * y el banco al mismo juego?»— y las tres por mirar deprisa:
 *
 *   1. «Chopper no usa el motor». FALSO: importa `ChopperAquariumEngine` desde
 *      `@alisa-engine/world/systems/…`, y mi grep exigía `/src` en la ruta.
 *   2. «Pedrisco tiene dos motores». FALSO: `AsteroidsEngine` INSTANCIA
 *      `AsteroidsSystem` en su línea 26.
 *   3. Y cuando la prueba lo acusó, me creí la acusación sin mirar POR QUÉ
 *      acusaba. El fallo era suyo: su filtro de rutas no seguía el último salto
 *      de la cadena.
 *
 * Las tres veces la conclusión era «esto no puede entrar», y las tres estaba mal.
 * Un instrumento no sustituye al criterio ni al revés: hay que mirar por qué dice
 * lo que dice. Se deja escrito porque el próximo que dude entre creer al detector
 * o creerse a sí mismo tiene aquí las dos formas de equivocarse.
 */

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
