/**
 * registro.js — EL CATÁLOGO: qué se puede jugar, y por dónde
 * ═══════════════════════════════════════════════════════════════════════════
 * Una máquina no puede jugar a lo que no sabe que existe. Este fichero es la
 * lista, y es lo que convierte «mismas reglas para personas y para máquinas» de
 * frase a cosa comprobable: se enumera, se carga y se juega, sin abrir la sala.
 *
 * Dos familias, un solo contrato (`GymEnv`):
 *
 *   · **propios** — entornos escritos a mano, con su física y su observación
 *     de verdad (Asteroids, Cabinet Escape, Cucco Swarm, Raccoon Space…).
 *   · **protohub** — los juegos de mesa y cartas del arcade, adaptados por
 *     `ProtoHubEnv`. No hay once entornos escritos: hay once módulos de reglas
 *     que ya existían y un adaptador.
 *
 * Todo se carga con `import()` a demanda: el catálogo se puede leer entero sin
 * traerse un solo juego.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { crearEnvDeProtoHub } from './ProtoHubEnv.js';
// La FSM del motor, la misma que mueve al cazador de Rue del Percebe y a los
// bichos de `fsm_gym`. Aquí se usa para JUGAR, no para simular.
import { FSMSystem } from '../psyche/FSMSystem.js';

const RUTA_REGLAS = '../../../../arcade/js/protohub/rules';

/**
 * Juegos del arcade con reglas locales. `crear` para los que se construyen
 * leyendo la biblioteca de cartas; `nombre` para los que se exportan tal cual.
 */
const PROTOHUB = [
    { juego: 'ajedrez',   titulo: 'Ajedrez',   nombre: 'ajedrez' },
    { juego: 'go',        titulo: 'Go',        nombre: 'go' },
    { juego: 'reversi',   titulo: 'Reversi',   nombre: 'reversi' },
    { juego: 'damas',     titulo: 'Damas',     nombre: 'damas' },
    { juego: 'xiangqi',   titulo: 'Xiangqi',   nombre: 'xiangqi' },
    { juego: 'mancala',   titulo: 'Mancala',   nombre: 'mancala' },
    { juego: 'snake',     titulo: 'Snake',     nombre: 'snake' },
    { juego: 'fagocito',  titulo: 'Fagocito',  nombre: 'fagocito' },
    { juego: 'peaton',    titulo: 'Peatón',    nombre: 'peaton' },
    { juego: 'blackjack', titulo: 'Blackjack', crear: 'crearBlackjack' },
    { juego: 'poker',     titulo: 'Póker',     crear: 'crearPoker' },
    // La familia de BAZAS: cuatro juegos de una sola base, portados del motor
    // de Python que ya existía. Ver `rules/bazas.js`.
    { juego: 'brisca', titulo: 'Brisca', modulo: 'bazas', crear: 'crearBrisca' },
    { juego: 'tute',   titulo: 'Tute',   modulo: 'bazas', crear: 'crearTute' },
    { juego: 'hearts', titulo: 'Hearts', modulo: 'bazas', crear: 'crearHearts' },
    { juego: 'spades', titulo: 'Spades', modulo: 'bazas', crear: 'crearSpades' },
    // ⚠️ EL CONTROL DEL BANCO DE PRUEBAS. No tiene ni una decisión: todos los
    // agentes DEBEN empatar aquí. Si la tabla los separa, el que falla es el
    // banco, no el agente. Ver la cabecera de `rules/guerra.js`.
    { juego: 'guerra', titulo: 'Guerra (control)', crear: 'crearGuerra' },
    // El único de la suite que mide MEMORIA e información oculta, no cálculo:
    // el estado publica `preguntas` —quién pidió qué y si acertó— y ahí está
    // toda la ventaja. Medido: usarlo dobla los libros (2,15 → 4,25).
    { juego: 'gofish', titulo: 'Go Fish', crear: 'crearGoFish' },
    // Familia de DESCARTE: no se puntúa por baza, se trata de vaciar la mano, y
    // las especiales convierten el orden de juego en parte del problema. Ojo con
    // su métrica: la primera versión premiaba lo contrario de ganar. Está
    // contado en la cabecera de `rules/unit.js`, con los números.
    { juego: 'unit', titulo: 'Unit', crear: 'crearUnit' },
    // El único donde GANAR ES MINIMIZAR y además hay información oculta: las
    // cartas tapadas salen `null` en el estado, también las propias. Y la regla
    // de anular columnas hace que un rey pueda ser la mejor carta del mazo.
    { juego: 'entropy', titulo: 'Entropy', crear: 'crearEntropy' },
];

/** Entornos escritos a mano, cada uno con su propio módulo. */
const PROPIOS = [
    { id: 'alisa/Asteroids-v0',     titulo: 'Asteroids',      fichero: 'AsteroidsEnv.js' },
    { id: 'alisa/CabinetEscape-v0', titulo: 'Cabinet Escape', fichero: 'CabinetEscapeEnv.js' },
    { id: 'alisa/CuccoSwarm-v0',    titulo: 'Cucco Swarm',    fichero: 'CuccoSwarmEnv.js' },
    { id: 'alisa/RaccoonSpace-v0',  titulo: 'Interestelar',   fichero: 'RaccoonSpaceEnv.js' },
    { id: 'alisa/RueDelPercebe-v0', titulo: 'Rue del Percebe', fichero: 'RueDelPercebeEnv.js' },
    // El primero cuyo MUNDO sale de la semilla, no sólo el azar dentro del
    // mundo. Ver la cabecera de su fichero: es la casilla que no ocupa nadie.
    { id: 'alisa/ChopperAquarium-v0', titulo: 'Chopper Terrarium', fichero: 'ChopperAquariumEnv.js' },
];

/** El catálogo, sin cargar nada. `[{id, titulo, familia, cargar()}]` */
export const CATALOGO = [
    ...PROPIOS.map(e => ({
        id: e.id,
        titulo: e.titulo,
        familia: 'propio',
        async cargar() {
            const mod = await import(`./envs/${e.fichero}`);
            // Los entornos propios exportan una clase; su nombre no siempre
            // coincide con el fichero, así que se coge la primera que lo sea.
            return Object.values(mod).find(v => typeof v === 'function' && v.id);
        },
    })),
    ...PROTOHUB.map(g => ({
        id: `alisa/${g.juego}-protohub-v0`,
        titulo: g.titulo,
        familia: 'protohub',
        juego: g.juego,
        async cargar() {
            // `modulo` para las familias: cuatro juegos de baza viven en el
            // mismo fichero porque comparten motor.
            const mod = await import(`${RUTA_REGLAS}/${g.modulo ?? g.juego}.js`);
            const reglas = g.crear ? await mod[g.crear]() : mod[g.nombre];
            if (!reglas) throw new Error(`'${g.juego}' no exporta sus reglas`);
            return crearEnvDeProtoHub({ juego: g.juego, reglas,
                                        meta: { title: g.titulo } });
        },
    })),
];

/** Busca por id de entorno. */
export function buscar(id) { return CATALOGO.find(e => e.id === id) ?? null; }

/** Carga y devuelve la CLASE del entorno (no una instancia). */
export async function cargar(id) {
    const e = buscar(id);
    if (!e) throw new Error(`entorno desconocido: ${id}`);
    return e.cargar();
}

/**
 * Una política tonta, para calibrar. Elige siempre la primera opción.
 *
 * No es un detalle: un entorno solo está listo cuando **la tonta pierde**, una
 * razonable gana a veces, y queda techo. Sin una tonta con la que comparar, un
 * número no dice nada.
 */
export const politicaTonta = (obs, env) => {
    const a = env.affordances();
    return a.length ? a[0].action : null;
};

/**
 * EL TERCER JUGADOR: una máquina de estados de verdad.
 * ═══════════════════════════════════════════════════════════════════════════
 * Decimos que el mismo entorno lo juegan **personas, FSM y agentes LLM**. Las
 * personas ya juegan (la sala), los agentes LLM tienen su puerta
 * (`affordances()` — no pueden ni alucinar una jugada ilegal), y para las
 * políticas numéricas están `politicaTonta` y `politicaAzar`.
 *
 * Faltaba la FSM, que es raro porque el motor lleva `FSMSystem` desde hace
 * meses y hay un cazador FSM dentro de Rue del Percebe. Otra pieza construida
 * y sin enchufar.
 *
 * Esta no simula un bicho: **juega**. Tres estados sobre lo único que un
 * entorno cualquiera publica de forma comparable —cómo va el marcador—:
 *
 *     TANTEA    empieza sin saber nada: prueba
 *     APRIETA   el marcador sube: sigue por ahí (primera opción, la más directa)
 *     PROTEGE   el marcador baja: cambia de tercio (última opción, la más rara)
 *
 * ⚠️ Y es honesto sobre su alcance: es una FSM GENÉRICA. No sabe qué es un
 * alfil. Sirve para demostrar que la puerta funciona y para dar un suelo
 * comparable; una FSM buena para un juego concreto se escribe con las reglas
 * de ese juego delante.
 */
export function politicaFSM() {
    let fsm = null, anterior = null, sinCambio = 0;

    return (obs, env) => {
        const opciones = env.affordances();
        if (!opciones.length) return null;

        if (!fsm || env.steps === 0) {
            fsm = new FSMSystem(['TANTEA', 'APRIETA', 'PROTEGE'], 'TANTEA');
            const sube = (b) => b.delta > 0;
            const baja = (b) => b.delta < 0;
            const plano = (b) => b.delta === 0 && b.quieto > 6;
            for (const d of ['TANTEA', 'PROTEGE']) fsm.addTransition(d, 'APRIETA', sube);
            for (const d of ['TANTEA', 'APRIETA']) fsm.addTransition(d, 'PROTEGE', baja);
            fsm.addTransition('APRIETA', 'TANTEA', plano);
            fsm.addTransition('PROTEGE', 'TANTEA', plano);
            anterior = null; sinCambio = 0;
        }

        const marcador = env.getScore?.().score ?? 0;
        const delta = anterior === null ? 0 : marcador - anterior;
        anterior = marcador;
        sinCambio = delta === 0 ? sinCambio + 1 : 0;

        fsm.blackboard.delta = delta;
        fsm.blackboard.quieto = sinCambio;
        fsm.tick(1 / 60);

        switch (fsm.currentState) {
            case 'APRIETA': return opciones[0].action;
            case 'PROTEGE': return opciones[opciones.length - 1].action;
            default:        return opciones[Math.floor(opciones.length / 2)].action;
        }
    };
}

/**
 * Una política que elige al azar entre las legales, pero **sin estado**.
 *
 * ⚠️ La primera versión guardaba el contador del generador en un cierre, y con
 * eso `selfTest` decía «no reproducible» en 14 de 16 entornos. El fallo era
 * mío: `selfTest` corre el mismo episodio dos veces con la MISMA política, así
 * que la segunda arrancaba con el generador ya avanzado y salía otra partida.
 * El entorno era perfectamente determinista; el testigo no.
 *
 * Ya me había pasado exactamente esto antes. Por eso ahora la elección es una
 * función pura de (semilla, semilla del episodio, paso): sin memoria que
 * arrastrar entre partidas.
 */
export function politicaAzar(semilla = 1) {
    return (obs, env) => {
        const opciones = env.affordances();
        if (!opciones.length) return null;
        let x = (semilla ^ 0x9E3779B9) >>> 0;
        x = (Math.imul(x ^ (env.seed >>> 0), 0x85EBCA6B)) >>> 0;
        x = (Math.imul(x ^ (env.steps >>> 0), 0xC2B2AE35)) >>> 0;
        x = (x ^ (x >>> 15)) >>> 0;
        return opciones[x % opciones.length].action;
    };
}
