/**
 * snake.js — Snake para el ProtoHub
 * ═══════════════════════════════════════════════════════════════════════════
 * Devuelve lo que ya documentaba el visualizador:
 *
 *     { snake: [{x,y}, …], food: {x,y}, score, direction }
 *
 * Rejilla 20×20. Jugadas: "arriba" · "abajo" · "izquierda" · "derecha".
 *
 * POR QUÉ NO ES UN JUEGO "DE TIEMPO REAL" AQUÍ
 * --------------------------------------------
 * Snake parece de reflejos, pero como entorno **es por pasos**: eliges dirección
 * y el mundo avanza un tick. Esa es exactamente la forma de un gym —
 * `step(acción) → estado`— y por eso Snake es un banco de pruebas clásico de RL.
 * Quien lo juega con las manos solo está llamando a `step` con un temporizador.
 *
 * Y es el juego que demuestra que el motor **no solo hace tablero**: es el mismo
 * contrato, el mismo ProtoHub y el mismo benchmark, con un juego de acción.
 *
 * DETALLE QUE CASI TODAS LAS IMPLEMENTACIONES SE COMEN
 * ----------------------------------------------------
 * No se puede girar 180°: si vas a la derecha y pides izquierda, te comerías el
 * cuello. La jugada se ignora en vez de matarte — que es lo que hace el juego
 * real, y evita que un agente se suicide por un error de tecleo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const N = 20;

const DIRS = {
    arriba:    { x: 0,  y: -1 },
    abajo:     { x: 0,  y: 1 },
    izquierda: { x: -1, y: 0 },
    derecha:   { x: 1,  y: 0 },
};
const OPUESTA = { arriba: 'abajo', abajo: 'arriba', izquierda: 'derecha', derecha: 'izquierda' };

const mismaCasilla = (a, b) => a.x === b.x && a.y === b.y;

/**
 * PRNG con semilla. Solo enteros de 32 bits ⇒ idéntico en cualquier máquina.
 *
 * ⚠️ ESTO FALTABA Y LO CAZÓ EL VERIFICADOR.
 * La primera versión colocaba la comida con `Math.random()`. La partida se
 * jugaba bien, pero **no se podía volver a jugar**: al re-simularla para
 * verificarla, la comida caía en otro sitio y la puntuación no cuadraba. Sin
 * semilla no hay benchmark — da igual lo correctas que sean las reglas si nadie
 * puede comprobar tu partida.
 */
import { mulberry32 } from './azar.js';

function nuevaComida(p) {
    // Solo casillas libres: si no, la comida puede aparecer dentro de la serpiente.
    const libres = [];
    for (let x = 0; x < N; x++)
        for (let y = 0; y < N; y++)
            if (!p.snake.some(s => s.x === x && s.y === y)) libres.push({ x, y });
    if (!libres.length) return null;                 // tablero lleno: victoria
    return libres[(p._rnd() * libres.length) | 0];
}

export const snake = {
    OBJETIVO: 'Objetivo: crecer comiendo sin chocar contigo mismo ni con la pared. Cada comida alarga la cola, así que cuanto mejor lo haces, menos sitio te queda.',
    // CUÁNTAS SILLAS TIENE LA MESA: una. Es un solitario contra el entorno,
    // no hay rival que se siente.
    ASIENTOS: 1,
    id: 'snake',
    nombre: 'Snake',

    nuevaPartida(opts = {}) {
        const seed = opts.seed ?? 1234;
        const p = {
            seed,
            _rnd: mulberry32(seed),
            snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
            direccion: 'derecha',
            score: 0,
            muerta: false,
            pasos: 0,
            historial: [],
        };
        p.food = nuevaComida(p);
        return p;
    },


    /**
     * ⚠️ EL TABLERO MIDE `N`, Y EL DERIVADO SE LO INVENTABA.
     *
     * `estado(p)` publica la serpiente y la comida y NO publica el tamano, asi
     * que `sustratoDe` cae en su rama de ultimo recurso: encajar una rejilla
     * alrededor de las cosas que ve. Al empezar eso da 11x11 en un tablero de
     * 20x20 — y con la cabeza en (10,10), o sea que el mapa dice que estas
     * pegado a la esquina cuando te queda medio tablero.
     *
     * Y crece segun juegas, asi que la pared se mueve. Un agente que lea ese
     * mapa gira para no chocar con un muro que no existe.
     *
     * No da error y se ve bien. Aqui el tamano se dice, que es lo unico que
     * hacia falta.
     */
    sustrato(p) {
        const piezas = p.snake.map((s, i) => ({
            x: s.x, y: s.y, t: i === 0 ? 'cabeza' : 'cuerpo', de: 0,
        }));
        if (p.food) piezas.push({ x: p.food.x, y: p.food.y, t: 'comida', de: null });
        return {
            rejilla: { ancho: N, alto: N, celdas: new Array(N * N).fill(0) },
            piezas,
            zonas: [],
            leyenda: { cabeza: 'tu cabeza', cuerpo: 'tu cuerpo, no lo choques',
                       comida: 'cómetela para crecer' },
            /**
             * ⚠️ SIN ESTO, LAS TRES SE DIBUJABAN CON LA MISMA LETRA.
             *
             * El mapa de texto usa `simbolos[t]` y, si no hay, la INICIAL del
             * tipo en mayúscula. Cabeza, cuerpo y comida empiezan las tres por
             * C: el mapa entero salía sembrado de `C` y no se distinguía por
             * dónde va la serpiente ni dónde está la comida. O sea, ninguna de
             * las dos cosas que hay que saber para jugar.
             *
             * Venía del adaptador, que tampoco declaraba símbolos, así que
             * llevaba así desde el principio sin dar un solo error.
             */
            simbolos: { cabeza: '@', cuerpo: 'o', comida: '*' },
            /**
             * ⚠️ Y EL SUELO TAMBIÉN, O LA LEYENDA SE CONTRADICE SOLA.
             *
             * Sin `terreno`, el mapa se rotula con la leyenda de toda la vida
             * —«# muro, o destino, . libre»— y debajo añade la del juego. En la
             * misma línea salía «o destino» y «o tu cuerpo»: el mismo carácter
             * explicado dos veces y de dos maneras distintas.
             *
             * Aquí no hay muros ni destinos: hay suelo, y las paredes son el
             * borde del tablero.
             */
            terreno: { 0: '.' },
            leyendaTerreno: { 0: 'suelo libre; las paredes son el borde' },
        };
    },

    estado(p) {
        return {
            snake: p.snake.map(s => ({ ...s })),
            food: p.food ? { ...p.food } : null,
            score: p.score,
            direction: p.direccion,
            turn: 'white',
            legal_moves: p.muerta ? [] : Object.keys(DIRS),
            is_check: false,
            is_game_over: p.muerta || !p.food,
            result: p.muerta ? 'black' : (!p.food ? 'white' : null),
            longitud: p.snake.length,
            pasos: p.pasos,
        };
    },

    mover(p, jugada) {
        if (p.muerta) return false;
        if (!DIRS[jugada]) return false;

        // Girar 180° se ignora: te comerías el cuello. Ignorar en vez de morir
        // es lo que hace el juego real y evita suicidios por un tecleo.
        if (jugada !== OPUESTA[p.direccion] || p.snake.length === 1) {
            p.direccion = jugada;
        }

        p.historial.push({
            snake: p.snake.map(s => ({ ...s })),
            food: p.food ? { ...p.food } : null,
            direccion: p.direccion, score: p.score, muerta: p.muerta, pasos: p.pasos,
        });

        const d = DIRS[p.direccion];
        const cabeza = { x: p.snake[0].x + d.x, y: p.snake[0].y + d.y };
        p.pasos++;

        // Muros
        if (cabeza.x < 0 || cabeza.x >= N || cabeza.y < 0 || cabeza.y >= N) {
            p.muerta = true;
            return true;
        }
        // La cola se mueve, así que la ÚLTIMA casilla queda libre este tick…
        // salvo que estemos comiendo (entonces la cola no avanza).
        const come = p.food && mismaCasilla(cabeza, p.food);
        const cuerpo = come ? p.snake : p.snake.slice(0, -1);
        if (cuerpo.some(s => mismaCasilla(s, cabeza))) {
            p.muerta = true;
            return true;
        }

        p.snake.unshift(cabeza);
        if (come) {
            p.score += 10;
            p.food = nuevaComida(p);
        } else {
            p.snake.pop();
        }
        return true;
    },

    deshacer(p) {
        const h = p.historial.pop();
        if (!h) return false;
        Object.assign(p, h, { snake: h.snake, food: h.food });
        return true;
    },

    /**
     * Rival de casa: va hacia la comida evitando morir. Deliberadamente simple
     * —sin buscar camino— para que un agente decente le gane.
     */
    sugerencia(p) {
        if (p.muerta || !p.food) return null;
        const cabeza = p.snake[0];

        const seguras = Object.entries(DIRS).filter(([nombre, d]) => {
            if (nombre === OPUESTA[p.direccion] && p.snake.length > 1) return false;
            const n = { x: cabeza.x + d.x, y: cabeza.y + d.y };
            if (n.x < 0 || n.x >= N || n.y < 0 || n.y >= N) return false;
            return !p.snake.slice(0, -1).some(s => mismaCasilla(s, n));
        });
        if (!seguras.length) return p.direccion;      // condenada: sigue recto

        // De las seguras, la que más acerca a la comida.
        let mejor = seguras[0][0], mejorD = Infinity;
        for (const [nombre, d] of seguras) {
            const n = { x: cabeza.x + d.x, y: cabeza.y + d.y };
            const dist = Math.abs(n.x - p.food.x) + Math.abs(n.y - p.food.y);
            if (dist < mejorD) { mejorD = dist; mejor = nombre; }
        }
        return mejor;
    },
};

export { N, DIRS, OPUESTA };
