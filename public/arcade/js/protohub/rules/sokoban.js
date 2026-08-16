/**
 * sokoban.js — el primer género que NACE con sustrato propio
 * ═══════════════════════════════════════════════════════════════════════════
 * Empujar cajas hasta sus destinos. Sin azar, sin rival, sin información oculta:
 * pura planificación en una rejilla.
 *
 * ⚠️ POR QUÉ ESTE JUEGO Y NO OTRO MÁS VISTOSO
 * Porque demuestra una ESTRUCTURA DE DECISIÓN que no estaba cubierta —
 * planificación espacial con estados irreversibles— y porque cuesta doscientas
 * líneas y cero arte. Un género no se demuestra con gráficos: se demuestra con
 * la forma de sus decisiones. Ajedrez cubre información perfecta por turnos;
 * brisca, información oculta; go, territorio. Faltaba «piensa antes de mover,
 * porque hay movimientos que no se pueden deshacer».
 *
 * ⚠️ Y ES EL PRIMERO QUE PUBLICA `sustrato(p)` SIN ADAPTADOR
 * Los diecinueve anteriores publican su estado en cinco codificaciones distintas
 * —FEN, matriz, lista plana, listas de {x,y}, manos— y `sustrato.js` las traduce.
 * Éste no necesita traducción: dice directamente `{rejilla, piezas, zonas}`.
 *
 * Consecuencia inmediata y comprobable: el dibujo 2D, la escena 3D y el texto
 * que lee un modelo salen **el mismo día que las reglas**, sin escribir un
 * visualizador. Es la prueba con cronómetro de que el motor hace lo que promete.
 *
 * ⚠️ NIVELES FIJOS Y NO PROCEDURALES, A PROPÓSITO
 * Generar sokobans resolubles al azar es un problema difícil de verdad, y un
 * nivel irresoluble arruinaría la medida sin avisar: el agente parecería malo
 * cuando el que falló fue el generador. Ocho niveles clásicos, y la semilla
 * elige cuál. Determinista y siempre resoluble, que es lo que un banco de
 * pruebas necesita.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';

const MURO = '#', SUELO = ' ', CAJA = '$', DESTINO = '.', JUGADOR = '@',
      CAJA_OK = '*', JUGADOR_OK = '+';

/**
 * Ocho niveles, de fácil a difícil. Formato clásico de sokoban, el mismo que
 * usan las colecciones de toda la vida — así se pueden añadir más copiándolos
 * de cualquier sitio sin traducir nada.
 */
const NIVELES = [
    ['#####',
     '#@$.#',
     '#####'],

    ['######',
     '#    #',
     '# $. #',
     '# @  #',
     '######'],

    ['#######',
     '#  .  #',
     '# $$  #',
     '#  @  #',
     '#  .  #',
     '#######'],

    ['########',
     '#      #',
     '# .$@$.#',
     '#      #',
     '########'],

    ['#######',
     '#.    #',
     '# $#  #',
     '# @ $ #',
     '#    .#',
     '#######'],

    ['########',
     '##  .  #',
     '#  $#$ #',
     '# . @  #',
     '########'],

    ['#########',
     '#  .    #',
     '# $ $ . #',
     '#   @   #',
     '#  .  $ #',
     '#########'],

    ['########',
     '#..    #',
     '#$$ @  #',
     '#  #   #',
     '#      #',
     '########'],
];

const DIRS = {
    arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0],
};

/**
 * `sokoban` — el módulo de reglas.
 *
 * Mismo contrato que los otros diecinueve: `nuevaPartida`, `estado`, `mover`,
 * `sugerencia`. Y además `sustrato`, que es la novedad.
 */
export const sokoban = {
    /** A que se juega, para quien no ve el tablero. Lo publica ProtoHub.state. */
    OBJETIVO: 'Objetivo: empujar cada caja hasta un destino. Solo se empuja, nunca se tira.',

    // CUÁNTAS SILLAS TIENE LA MESA: una. Planificación en solitario, sin rival.
    ASIENTOS: 1,

    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        // La semilla elige nivel. Con pocas semillas se recorren todos, que es
        // lo que quiere el calibrador: medir sobre varios niveles, no sobre uno.
        const idx = Math.floor(mulberry32(semilla)() * NIVELES.length) % NIVELES.length;
        const plano = NIVELES[idx];

        const alto = plano.length;
        const ancho = Math.max(...plano.map(f => f.length));
        const muros = [], destinos = new Set(), cajas = [];
        let jugador = { x: 0, y: 0 };

        plano.forEach((fila, y) => {
            for (let x = 0; x < ancho; x++) {
                const ch = fila[x] ?? SUELO;
                if (ch === MURO) muros.push(y * ancho + x);
                if (ch === DESTINO || ch === CAJA_OK || ch === JUGADOR_OK) destinos.add(y * ancho + x);
                if (ch === CAJA || ch === CAJA_OK) cajas.push({ x, y });
                if (ch === JUGADOR || ch === JUGADOR_OK) jugador = { x, y };
            }
        });

        return { semilla, nivel: idx, ancho, alto,
                 muros: new Set(muros), destinos, cajas, jugador, pasos: 0, tope: 300 };
    },

    /** ⚠️ El sustrato NATIVO. Sin adaptador, sin traducción, sin FEN. */
    sustrato(p) {
        const celdas = new Array(p.ancho * p.alto).fill(0);
        for (const i of p.muros) celdas[i] = 1;          // 1 = muro
        for (const i of p.destinos) if (celdas[i] === 0) celdas[i] = 2;   // 2 = destino
        return {
            rejilla: { ancho: p.ancho, alto: p.alto, celdas },
            piezas: [
                ...p.cajas.map(c => ({
                    x: c.x, y: c.y,
                    t: p.destinos.has(c.y * p.ancho + c.x) ? 'caja_ok' : 'caja',
                    de: p.destinos.has(c.y * p.ancho + c.x) ? 2 : 1,
                })),
                { x: p.jugador.x, y: p.jugador.y, t: 'jugador', de: 0 },
            ],
            zonas: [],
            leyenda: { caja: 'caja', caja_ok: 'caja colocada', jugador: 'tú' },
            // ⚠️ La notación clásica del sokoban, la de toda la vida. Un modelo
            // la ha visto mil veces; una inventada por nosotros, ninguna. Igual
            // que el ajedrez se cuenta en FEN y el go en la rejilla del GTP.
            simbolos: { caja: '$', caja_ok: '*', jugador: '@' },
        };
    },

    /**
     * ⚠️ LA PUERTA DE LENGUAJE, GRATIS.
     * No se escribe una descripción a medida: se le da el sustrato al dibujante
     * compartido. Los diecinueve juegos anteriores necesitaron un caso especial
     * cada uno en `descripcion.js` porque cada uno publicaba su estado a su
     * manera. Éste no necesita ninguno — y ningún género futuro tampoco.
     */
    describir(p) {
        const st = this.estado(p);
        const puedes = st.legal_moves.filter(m => m !== 'nueva').join(', ');
        return `Sokoban, nivel ${p.nivel}. `
             + `${st.cajas_colocadas}/${st.cajas_totales} cajas colocadas, ${st.pasos} pasos.\n`
             + describirSustrato(this.sustrato(p))
             + (st.is_game_over ? '\nLa partida ha terminado.' : `\nPuedes: ${puedes}.`);
    },

    estado(p) {
        const puestas = p.cajas.filter(c => p.destinos.has(c.y * p.ancho + c.x)).length;
        const terminada = puestas === p.cajas.length || p.pasos >= p.tope;
        const legales = terminada ? ['nueva'] : Object.keys(DIRS).filter(d => sePuede(p, d));

        return {
            juego: 'sokoban',
            nivel: p.nivel,
            cajas_colocadas: puestas,
            cajas_totales: p.cajas.length,
            pasos: p.pasos,
            distancia_restante: lejania(p),
            /**
             * ⚠️ CRÉDITO PARCIAL, Y LO APRENDÍ SUSPENDIENDO.
             *
             * La primera métrica era `puestas * 100 - pasos`. El calibrador la
             * tumbó en la primera pasada: **«MÉTRICA CONSTANTE — no puntúa»**,
             * todas las políticas exactamente −300. El motivo: si nadie resuelve
             * el nivel, todo el mundo agota el tope de 300 pasos y toca el mismo
             * suelo. Una política que empuja una caja hasta rozar el destino
             * sacaba lo mismo que otra dando vueltas en una esquina.
             *
             * Un banco de pruebas donde el fracaso es indistinguible no ordena
             * nada — y este juego es difícil, así que el fracaso es el caso
             * normal, no la excepción.
             *
             * Se resta la LEJANÍA: cuánto le falta a cada caja suelta para llegar
             * a su destino más cercano. Eso da una pendiente: acercar una caja
             * puntúa aunque no se termine. Y sigue premiando resolver (100 por
             * caja) muy por encima de aproximarse.
             */
            puntos: puestas * 100 - p.pasos - lejania(p),
            resuelto: puestas === p.cajas.length,
            turn: 'player',
            semilla: p.semilla,
            legal_moves: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const dir = String(jugada);
        if (!DIRS[dir] || !sePuede(p, dir)) return false;
        const [dx, dy] = DIRS[dir];
        const destino = { x: p.jugador.x + dx, y: p.jugador.y + dy };
        const caja = p.cajas.find(c => c.x === destino.x && c.y === destino.y);
        if (caja) { caja.x += dx; caja.y += dy; }
        p.jugador = destino;
        p.pasos++;
        return true;
    },

    /**
     * El rival de la casa: elige el mejor empujón y CAMINA hasta él.
     *
     * ⚠️ LA PRIMERA VERSIÓN OSCILABA, Y LO CAZÓ EL CALIBRADOR.
     * Era avariciosa sin memoria: iba hacia la caja más cercana mirando sólo el
     * paso siguiente. En una rejilla eso hace ping-pong — medido, **tres estados
     * distintos en trescientos pasos**. Y como todas las políticas acababan en
     * el mismo bucle, el calibrador dijo «MÉTRICA CONSTANTE — no puntúa».
     *
     * Un rival que oscila no es un techo blando: es otro suelo. Y un entorno con
     * dos suelos no mide nada, por bien escritas que estén sus reglas.
     *
     * Ahora: se consideran todos los empujones posibles, se elige el que más
     * acerca alguna caja a un destino, y se BUSCA EL CAMINO hasta la casilla
     * desde la que hay que empujar. Sigue sin ser un solucionador —no ve
     * bloqueos ni planifica el orden de las cajas— así que sigue siendo un techo
     * blando. Pero uno que avanza.
     */
    sugerencia(p) {
        const st = this.estado(p);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;

        const ocupada = (x, y) =>
            esMuro(p, { x, y }) || p.cajas.some(c => c.x === x && c.y === y);

        let mejor = null, mejorGanancia = 0;
        for (const caja of p.cajas) {
            if (p.destinos.has(caja.y * p.ancho + caja.x)) continue;
            const antes = distACualquier(caja, p);
            for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
                const destino = { x: caja.x + dx, y: caja.y + dy };
                const desde = { x: caja.x - dx, y: caja.y - dy };
                if (ocupada(destino.x, destino.y) || ocupada(desde.x, desde.y)) continue;
                const ganancia = antes - distACualquier(destino, p);
                if (ganancia <= 0) continue;                 // no acercar es no avanzar
                const camino = caminoHasta(p, desde, ocupada);
                if (!camino) continue;                       // no se llega a empujar
                // Se prefiere ganar terreno, y entre iguales el empujón más cerca.
                const valor = ganancia * 100 - camino.length;
                if (valor > mejorGanancia) {
                    mejorGanancia = valor;
                    mejor = camino.length ? camino[0] : dir;  // ya estoy: empujo
                }
            }
        }
        if (mejor && legales.includes(mejor)) return mejor;

        // Sin empujón útil a la vista, no se queda quieta ni oscila: se mueve
        // por donde menos ha pasado. Es peor que planificar y mejor que temblar.
        p._visitas ??= new Map();
        const clave = (x, y) => `${x},${y}`;
        let elegido = legales[0], menos = Infinity;
        for (const m of legales) {
            const [dx, dy] = DIRS[m];
            const v = p._visitas.get(clave(p.jugador.x + dx, p.jugador.y + dy)) ?? 0;
            if (v < menos) { menos = v; elegido = m; }
        }
        const k = clave(p.jugador.x, p.jugador.y);
        p._visitas.set(k, (p._visitas.get(k) ?? 0) + 1);
        return elegido;
    },

    deshacer() { return false; },
};

const dist = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/**
 * Camino más corto del jugador a una casilla, esquivando muros y cajas.
 *
 * Una anchura primero de libro. Devuelve la lista de direcciones, o `null` si no
 * se llega. Es lo que le faltaba a la política vieja: sin camino sólo se puede
 * mirar el paso siguiente, y mirar sólo el paso siguiente en una rejilla es
 * oscilar.
 */
function caminoHasta(p, meta, ocupada) {
    if (p.jugador.x === meta.x && p.jugador.y === meta.y) return [];
    const visto = new Set([`${p.jugador.x},${p.jugador.y}`]);
    const cola = [{ x: p.jugador.x, y: p.jugador.y, ruta: [] }];
    while (cola.length) {
        const n = cola.shift();
        for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
            const x = n.x + dx, y = n.y + dy, k = `${x},${y}`;
            if (visto.has(k) || ocupada(x, y)) continue;
            const ruta = [...n.ruta, dir];
            if (x === meta.x && y === meta.y) return ruta;
            visto.add(k);
            cola.push({ x, y, ruta });
        }
    }
    return null;
}

/**
 * Cuánto le falta al tablero para estar resuelto: la suma de lo que cada caja
 * suelta dista de su destino libre más cercano.
 *
 * Es una cota inferior tosca —no tiene en cuenta muros ni el orden de empuje—
 * pero para puntuar sirve: **baja cuando el jugador acerca una caja y sube
 * cuando la aleja**, que es toda la información que hace falta para distinguir
 * a quien planifica de quien deambula.
 */
function lejania(p) {
    let total = 0;
    for (const c of p.cajas) {
        if (p.destinos.has(c.y * p.ancho + c.x)) continue;
        total += distACualquier(c, p);
    }
    return total;
}

/** Distancia de un punto al destino libre más cercano. */
function distACualquier(punto, p) {
    let mejor = Infinity;
    for (const i of p.destinos) {
        const d = dist(punto, { x: i % p.ancho, y: Math.floor(i / p.ancho) });
        if (d < mejor) mejor = d;
    }
    return mejor;
}

/**
 * ¿Se puede mover en esa dirección?
 *
 * ⚠️ `legal_moves` NO ofrece movimientos imposibles, y eso es la mitad del
 * proyecto: una persona no puede pulsar un botón que no está, y un modelo no
 * puede alucinar una jugada que no se le ofrece. Empujar contra un muro o contra
 * otra caja no es «un movimiento que falla»: es un movimiento que no existe.
 */
function sePuede(p, dir) {
    const [dx, dy] = DIRS[dir];
    const destino = { x: p.jugador.x + dx, y: p.jugador.y + dy };
    if (esMuro(p, destino)) return false;
    const caja = p.cajas.find(c => c.x === destino.x && c.y === destino.y);
    if (!caja) return true;
    const detras = { x: destino.x + dx, y: destino.y + dy };
    if (esMuro(p, detras)) return false;
    return !p.cajas.some(c => c.x === detras.x && c.y === detras.y);
}

const esMuro = (p, q) =>
    q.x < 0 || q.y < 0 || q.x >= p.ancho || q.y >= p.alto || p.muros.has(q.y * p.ancho + q.x);
