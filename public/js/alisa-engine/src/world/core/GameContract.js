/**
 * GameContract.js — QUÉ TIENE QUE SABER HACER EL NÚCLEO DE UN JUEGO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { NUCLEOS, revisar } from '@alisa-engine/src/world/core/GameContract.js';
 *
 * Un «núcleo» es la pieza que POSEE EL MUNDO de una etapa: dónde están las
 * cosas y qué ha pasado. No pinta, no lee el teclado y no sabe que existe una
 * pantalla. La página lo mira para dibujar y el banco lo mira para medir, y por
 * eso la persona y el agente juegan a lo mismo.
 *
 * ⚠️ ESTO NO ES UNA CLASE MADRE, Y NO ES PEREZA. ESTÁ MEDIDO.
 *
 * De 316 nombres de método en las 67 clases del motor, 280 —el 89%— existen en
 * UNA sola. No hay cuerpo común que factorizar: una jerarquía por encima de eso
 * no ahorraría una línea y añadiría un sitio más donde mirar.
 *
 * Y ya hay una base así, `BaseSimulationSystem`, que ningún juego usa: la usan
 * dos clases de la colonia. Tampoco podría usarla — importa THREE, recibe un
 * `AlisaRenderCore` y escribe en el DOM, así que no entra donde corre el banco.
 * Una base que no puede correr sin pantalla no sirve para un núcleo de juego.
 *
 * Lo que sí funciona en esta casa es el contrato ESTRECHO: los siete entornos
 * del gimnasio comparten `GymEnv` y aguanta. Así que esto es lo mismo para el
 * otro lado: pocos métodos, y quien los cumple entra. Sin herencia obligatoria.
 *
 * ⚠️ Y LOS MÉTODOS SALEN DEL CENSO, NO DE MI CABEZA.
 *
 * Medido el 2026-08-26 sobre los ocho núcleos que ya poseen un mundo:
 *
 *     sustrato   6/8      step   2/8      tick     1/8
 *     reset      5/8      act    1/8      update   1/8      start  1/8
 *
 * Iba a declarar `tick(dt)` como el verbo de avanzar. El censo dice que no hay
 * verbo común: se dice de cuatro maneras y tres núcleos no lo dicen de ninguna.
 * Declararlo habría sido inventarme una norma en vez de reconocer una.
 *
 * Lo que SÍ existe ya sin nombre es `sustrato()` y `reset()`. Eso es el contrato.
 */

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LO OBLIGATORIO — UNO SOLO, Y ES EL QUE YA TIENEN TODOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Medido: los seis núcleos declarados publican `sustrato()`. Seis de seis. No
 * es una aspiración, es una norma que ya se cumplía sin estar escrita, y por eso
 * se puede exigir hoy sin romper nada.
 */
export const OBLIGATORIO = {
    sustrato: 'describe el mundo en el idioma común: {piezas, zonas, leyenda, '
            + 'simbolos} y `rejilla` sólo si el juego TIENE casillas. Es lo que '
            + 'permite que el mismo estado se lea como texto, como números, en '
            + '2D, en 3D y por HTTP sin que ninguno sepa a qué se juega.',
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LO PEDIDO — CON SUELO, PORQUE HOY LO CUMPLEN DOS DE SEIS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ POR QUÉ ESTO NO ES OBLIGATORIO TODAVÍA, Y NO ES BLANDURA.
 *
 * Medido el 2026-08-26 sobre los seis núcleos declarados:
 *
 *     sustrato        6/6      ← por eso es obligatorio
 *     reset           4/6      faltan CabinetEscapeSystem y AsteroidsSystem
 *     verbo familia   3/6      ChopperAquariumEngine dice `stepSimulation`,
 *                              BulletHeavenEngine dice `update`
 *     contrato entero 2/6      sólo RaccoonSpaceCore y DefiendeSystem
 *
 * Dos de seis. Es el MISMO número que tenía el pipeline cinematográfico antes
 * de `montarMundo`, y por el mismo motivo: nadie lo quitó, nadie lo copió.
 *
 * Ponerlo obligatorio hoy obligaría a renombrar métodos en cuatro núcleos de
 * golpe —y `update` → `tick` en `BulletHeavenEngine` toca Marabunta, que es una
 * etapa que el banco mide—. Un cambio así se hace de uno en uno abriendo el
 * juego y mirándolo, no para que una prueba se calle. Así que va con suelo: el
 * número de hoy, y sólo puede subir.
 */
export const PEDIDO = {
    reset: 'devuelve el mundo a su estado inicial. Con la misma semilla, la '
         + 'misma partida: sin esto un recibo no se puede volver a jugar y una '
         + 'nota no significa nada.',
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CÓMO AVANZA EL MUNDO — DOS FAMILIAS, Y ES UNA DIFERENCIA DE VERDAD
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Cabinet Escape y las tres etapas del mapache van POR TURNOS: abres un cajón,
 * escaneas un planeta, y hasta que no decides no pasa nada. Ahí no existe `dt`
 * y pedirlo sería mentir sobre el juego.
 *
 * Pedrisco, Marabunta y el acuario van EN TIEMPO REAL: el mundo se mueve
 * mientras piensas.
 *
 * Así que el verbo se declara por familia en vez de unificarse a la fuerza. Un
 * núcleo dice a cuál pertenece y el contrato le pide el suyo.
 */
export const FAMILIAS = {
    turnos: {
        metodo: 'step',
        dice: 'step(accion) — el mundo no se mueve hasta que alguien decide',
    },
    tiempo_real: {
        metodo: 'tick',
        dice: 'tick(dt) — el mundo se mueve mientras piensas',
    },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  LOS NÚCLEOS DECLARADOS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ LA LISTA VIVE AQUÍ, EXPORTADA, Y HAY MOTIVO.
 *
 * El mapa de las sagas ya existía metido DENTRO de una prueba que no lo
 * exportaba, así que el siguiente que lo necesitó —yo— se escribió otro
 * parseando títulos de páginas, y una saga entera se quedó fuera de la puerta
 * de los betas. Es la sexta vez que este proyecto mide la misma avería: la
 * fuente canónica existe pero está donde no se puede importar.
 *
 * `cumple` NO es aspiración: es lo que se midió el 2026-08-26. Es el suelo, y
 * sólo puede subir.
 */
export const NUCLEOS = [
    { etapa: '¡Busca! 1',     clase: 'CabinetEscapeSystem',
      ruta: 'world/systems/CabinetEscapeSystem.js',   familia: 'turnos' },
    { etapa: '¡Busca! 4/5/6', clase: 'RaccoonSpaceCore',
      ruta: 'world/systems/RaccoonSpaceCore.js',      familia: 'turnos' },
    { etapa: '¡Sobrevive! 2', clase: 'ChopperAquariumEngine',
      ruta: 'world/systems/ChopperAquariumEngine.js', familia: 'tiempo_real' },
    { etapa: '¡Sobrevive! 3', clase: 'BulletHeavenEngine',
      ruta: 'world/systems/BulletHeavenEngine.js',    familia: 'tiempo_real' },
    { etapa: '¡Defiende! 1',  clase: 'DefiendeSystem',
      ruta: 'world/systems/DefiendeSystem.js',        familia: 'turnos' },
    { etapa: '¡Esquiva! 1',   clase: 'AsteroidsSystem',
      ruta: 'world/systems/AsteroidsSystem.js',       familia: 'tiempo_real' },
    /**
     * Entró el 2026-08-26, y fue el más barato de todos: `InteractionLabEngine`
     * ya tenía las reglas y el estado separados del dibujo —todas las llamadas a
     * la fábrica iban detrás de `if (this.factory)`— y lo único que lo ataba al
     * navegador eran dos imports de la primera línea. Uno de ellos, `THREE`, no
     * se usaba ni una vez. Esta etapa llevaba fuera del gimnasio por un import
     * muerto.
     */
    { etapa: '¡Sobrevive! 1', clase: 'InteractionLabSystem',
      ruta: 'world/systems/InteractionLabSystem.js',  familia: 'tiempo_real' },
    /**
     * Nació el 2026-08-26 cumpliendo el contrato entero, y nació de PARTIR otro:
     * `ChopperAquariumEngine` tenía dos juegos dentro —37 referencias al edificio
     * y 30 al ecosistema— y su portada decía «scanning a procedural skyscraper
     * for a hidden raccoon», que es ¡Busca! mientras la etapa vivía en
     * ¡Sobrevive!.
     *
     * No reescribe nada: compone `VolumeVehicleSystem` (extraído del motor
     * viejo y comprobado idéntico bit a bit), `FloorScanSystem`,
     * `EnergySystem` y `RechargeSystem`. Cuatro piezas headless con más de un
     * cliente cada una — que es lo que se pedía al preguntar si podíamos tener
     * sistemas pequeños que se compusieran.
     */
    { etapa: '¡Busca! torre',  clase: 'DroneTowerCore',
      ruta: 'world/systems/DroneTowerCore.js',      familia: 'tiempo_real' },
    /**
     * La OTRA mitad de «Chopper Aquarium», y la que le da sentido a la saga en la
     * que estaba archivada: un submarino del tamaño de un pez dentro de una
     * cadena trófica viva. No inventa reglas — se mete en la lista de peces que
     * cazadores y tiburones persiguen, que es literalmente «no ser lo que se
     * comen».
     *
     * ⚠️ Y AL MONTARLO SALIÓ QUE EL ECOSISTEMA DEL ACUARIO ESTABA MEDIO MUERTO.
     * `ChopperAquariumEngine.reset()` dejaba `plankton`, `ecosystemCorals` y
     * `ecosystemJellyfishes` como arrays VACÍOS, y `tickPlankton` sólo mueve el
     * plancton que ya existe. O sea: veinticinco peces sin nada que comer y sin
     * dónde esconderse, nadando por inercia desde siempre. Aquí se siembra.
     *
     * Pendiente de Oscar: si esto SUSTITUYE a ¡Sobrevive! 2 —y entonces esa
     * etapa sube a `-v1`— o si nace como etapa aparte. Es decisión de diseño.
     */
    { etapa: '¡Sobrevive! submarino', clase: 'SubmarineCore',
      ruta: 'world/systems/SubmarineCore.js',         familia: 'tiempo_real' },
];

/**
 * ⚠️ LAS TRES QUE NO TIENEN NÚCLEO, ESCRITAS AQUÍ A PROPÓSITO.
 *
 * No están «pendientes de documentar»: están medidas y dicen por qué. Una lista
 * de lo que falta, al lado de la de lo que hay, es lo que impide que dentro de
 * un mes alguien crea que el mapa está completo.
 */
export const SIN_NUCLEO = [
    { etapa: '¡Busca! 2',
      porque: 'el mundo vive en un objeto `E` dentro del HTML de la página. No '
            + 'hay segundo modelo del que divergir, pero tampoco hay nada que '
            + 'el banco pueda medir: por eso esta etapa no tiene nota.' },
    { etapa: '¡Busca! 3',
      porque: 'HAY DOS MODELOS. La página guarda el edificio en `floors[]` con '
            + 'sus mallas dentro; el banco lo guarda como entidades ECS con '
            + '`HidingSpotComponent`. Comparten `CorporateSeekerSystem`, que es '
            + 'el PERSEGUIDOR y no posee el mundo: un cerebro común sobre dos '
            + 'mundos distintos. Hasta el vocabulario diverge —el sistema dice '
            + 'HOT/WARM/COLD y el entorno caliente/fresco/helado, con la '
            + 'traducción a mano en CorpBuildingEnv.js— y las plantas ni '
            + 'siquiera se numeran igual.' },
];

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  REVISAR
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * @param {Function|Object} nucleo  la clase o una instancia
 * @param {string} [familia]        'turnos' | 'tiempo_real'
 * @returns {{cumple: boolean, tiene: string[], faltan: string[]}}
 */
export function revisar(nucleo, familia) {
    const proto = typeof nucleo === 'function' ? nucleo.prototype : nucleo;
    const hay = (m) => typeof proto?.[m] === 'function';

    const obligatorios = Object.keys(OBLIGATORIO);
    const pedidos = [...Object.keys(PEDIDO)];
    if (familia && FAMILIAS[familia]) pedidos.push(FAMILIAS[familia].metodo);

    const faltaObligatorio = obligatorios.filter((m) => !hay(m));
    const faltaPedido = pedidos.filter((m) => !hay(m));

    return {
        /** Lo mínimo, y hoy lo cumplen todos: sin esto la etapa no publica mundo. */
        publica: faltaObligatorio.length === 0,
        /** El contrato entero. Hoy 2 de 6 — va con suelo, no con exigencia. */
        cumple: faltaObligatorio.length === 0 && faltaPedido.length === 0,
        tiene: [...obligatorios, ...pedidos].filter(hay),
        faltan: [...faltaObligatorio, ...faltaPedido],
    };
}
