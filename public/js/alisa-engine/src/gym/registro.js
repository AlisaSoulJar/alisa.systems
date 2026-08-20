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
    // ⚠️ El primero SIN azar y sin rival: pura planificación en una rejilla, con
    // movimientos que no se pueden deshacer. Cubre una estructura de decisión
    // que no tenía ninguno de los diecinueve anteriores.
    //
    // Y el primero que publica `sustrato(p)` nativo, así que su dibujo 2D, su
    // escena 3D y su texto salieron el mismo día que las reglas — sin escribir
    // un visualizador. No lleva `crear` porque su módulo exporta el objeto de
    // reglas directamente, sin fábrica: no necesita leer el catálogo de cartas.
    { juego: 'sokoban', titulo: 'Sokoban', nombre: 'sokoban' },
    // Cripta es el primer entorno del gym con OBSERVABILIDAD PARCIAL: la
    // observación no es el estado, es lo que el agente ha visto. Los veinte
    // anteriores entregan el tablero entero, así que un agente sin memoria no
    // pierde nada por no tenerla; aquí sí. Es el único que puntúa recordar.
    { juego: 'cripta', titulo: 'Cripta', nombre: 'cripta' },
    // Flota es el primer entorno con observación POR ASIENTO: dos agentes, dos
    // vistas distintas del mismo estado, y ninguno puede ver la del otro.
    { juego: 'flota', titulo: 'Flota', nombre: 'flota' },
    // Defensa es el primer entorno con economía: la recompensa de una acción no
    // llega en el paso siguiente sino varios después, cuando el oro que ahorraste
    // hace falta. Es el único que castiga de verdad la política miope.
    { juego: 'defensa', titulo: 'Defensa', nombre: 'defensa' },
    // Sigilo es el primer entorno ASIMETRICO: los dos asientos no hacen la misma
    // tarea ni cobran por lo mismo. Un agente puede ser bueno huyendo y malo
    // cazando, y hasta ahora no teniamos donde verlo.
    { juego: 'sigilo', titulo: 'Sigilo', nombre: 'sigilo' },
    // Frentes es el primer entorno SIMULTÁNEO: la observación no contiene la
    // jugada pendiente del rival porque todavía no existe. Un agente no puede
    // planear contra el estado, tiene que modelar a quien tiene enfrente.
    { juego: 'frentes', titulo: 'Frentes', nombre: 'frentes' },
    // Relevo es el primer entorno COOPERATIVO: la recompensa es compartida, así
    // que un agente no puede maximizar la suya a costa del otro. Mide entenderse
    // sin hablar, que es lo que ninguno de los veintiséis anteriores puntuaba.
    { juego: 'relevo', titulo: 'Relevo', nombre: 'relevo' },
    // Cabina es el primer entorno con CANAL: hay acciones cuyo único efecto es
    // cambiar lo que sabe el otro agente. Es la familia donde un modelo de
    // lenguaje puede demostrar algo que una FSM no puede ni intentar.
    { juego: 'cabina', titulo: 'Cabina', nombre: 'cabina' },
    // Rebaño es el primero cuya física la pone el MOTOR y no las reglas: envuelve
    // `BoidsSystem`. Mide conducir un sistema emergente que no obedece órdenes.
    { juego: 'rebano', titulo: 'Rebaño', nombre: 'rebano' },
    // Pradera mide abstenerse: el unico entorno donde la accion mas rentable
    // ahora es la que arruina la partida cuarenta turnos despues.
    { juego: 'pradera', titulo: 'Pradera', nombre: 'pradera' },
    // Nave es DEDUCCION SOCIAL: roles ocultos, compromiso simultaneo y votacion.
    // El unico entorno donde un agente puede enganar a otro, no solo superarlo.
    { juego: 'nave', titulo: 'Nave', nombre: 'nave' },
    // Remigio es el primero donde la información se revela AL ELEGIR ENTRE DOS
    // FUENTES. En el go fish revelas preguntando y en el póker apostando: actúas
    // y se sabe. Aquí las dos jugadas son legales, hacen lo mismo —te dan una
    // carta— y sólo se diferencian en lo que cuentan de ti. Coger del descarte
    // sirve casi siempre y declara qué juntas; del mazo no dice nada y casi nunca
    // vale. Es el primer entorno donde se puede medir cuánto paga un agente por
    // no ser leído.
    { juego: 'remigio', titulo: 'Remigio', crear: 'crearRemigio' },
    // Parchís es el primero con AZAR DENTRO DEL TURNO: no eliges la tirada,
    // eliges qué haces con ella. Los treinta y uno anteriores reparten al empezar
    // y a partir de ahí la suerte no vuelve a hablar; aquí habla cada turno, así
    // que un agente bueno no es el que planea mejor sino el que planea sabiendo
    // que va a salirle otra cosa. Es también el primero que usa las TRES
    // estructuras del sustrato —rejilla, piezas y zonas— y la prueba de que un
    // dado no necesitaba un motor propio.
    { juego: 'parchis', titulo: 'Parchís', crear: 'crearParchis' },
    { juego: 'generala', titulo: 'Generala', crear: 'crearGenerala' },
    { juego: 'oca', titulo: 'La Oca', crear: 'crearOca' },
    // Canadiense: el MISMO tablero que el parchis pero con mano de cartas en vez de
    // dado. Es el par controlado del banco — un agente medido en los dos se compara
    // consigo mismo con y sin informacion oculta, que es lo unico que cambia.
    { juego: 'canadiense', titulo: 'Parchis canadiense', crear: 'crearCanadiense' },
    // Domino: el primero donde DONDE puede ir una pieza depende de QUE es. Los otros
    // colocan en sitios libres —una casilla vacia, un hueco, un asiento— y aqui la
    // legalidad es un emparejamiento. Y con un espacio de acciones diminuto: la cadena
    // solo tiene dos puntas, tengas las fichas que tengas.
    { juego: 'domino', titulo: 'Domino', crear: 'crearDomino' },
    // Chinchon: el par controlado del remigio. Misma maquinaria, misma puerta de
    // texto y mismo espacio de acciones; lo unico que cambia es que aqui se cierra
    // cargando hasta cinco puntos en vez de con cero. Un agente medido en los dos se
    // compara consigo mismo con y sin margen para cerrar, que es la decision entera.
    { juego: 'chinchon', titulo: 'Chinchon', modulo: 'remigio', crear: 'crearChinchon' },
    // Alisapolis: el primero que usa los cuatro materiales -tablero, dados, cartas y
    // fichas- y el primero cuya decision central es VALORAR BAJO COMPETENCIA. No es
    // informacion oculta ni comunicacion ni simultaneidad: es que lo que vale una cosa
    // depende de quien mas la quiere, y eso cambia cada vez que alguien compra algo.
    { juego: 'alisapolis', titulo: 'Alisapolis', crear: 'crearAlisapolis' },
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
