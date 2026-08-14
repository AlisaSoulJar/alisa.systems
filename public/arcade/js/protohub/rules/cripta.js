/**
 * cripta.js — el segundo género con sustrato propio: OBSERVABILIDAD PARCIAL
 * ═══════════════════════════════════════════════════════════════════════════
 * Una mazmorra que no se ve entera. Se explora, se recuerda, se decide cuándo
 * salir. Tesoros que suman, bichos que restan vida, y una salida que termina la
 * partida en el momento en que se pisa — con lo que lleves encima.
 *
 * ⚠️ POR QUÉ ESTE GÉNERO, Y NO OTRO
 * Porque es la estructura de decisión que más falta hacía y la única que
 * ninguno de los veintiuno anteriores tenía: **no ves el estado**. Ajedrez y go
 * son información perfecta; brisca esconde cartas pero el tablero está a la
 * vista; sokoban enseña el nivel entero desde el primer paso. Aquí lo que no
 * sabes es el MAPA, y sólo se aprende yendo.
 *
 * Y es la que mejor separa a un agente con memoria de uno sin ella. Un jugador
 * sin memoria vuelve a entrar en la sala que acaba de vaciar; uno con memoria
 * cierra el mapa y sale. Eso es medible con un número —pasos por casilla nueva—
 * y no se puede fingir. Un banco de pruebas donde todos empatan no ordena nada:
 * éste ordena.
 *
 * ⚠️ LA REGLA QUE GOBIERNA TODO EL FICHERO
 * El sustrato publica SÓLO lo que el jugador ha visto. Ni una casilla más.
 * Es la misma disciplina que las cartas ocultas —que ya se fugaron dos veces en
 * este proyecto— aplicada al espacio, y aquí es más fácil de romper porque el
 * mapa completo está a un `p.muros` de distancia.
 *
 * De ahí sale la decisión menos obvia del diseño, la de `legal_moves` (ver
 * abajo): la lista de acciones también tiene que respetar la niebla, o la lista
 * misma se convierte en un oráculo del mapa.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';
import { BSPSystem } from '../../../../js/alisa-engine/src/world/BSPSystem.js';
import { DIRS, suma, hayLinea, primerPaso } from '../rejilla.js';

const ANCHO = 24, ALTO = 18;
const VISTA = 4;            // radio de visión, en casillas
const DESPIERTA = 6;        // a esta distancia un bicho empieza a perseguir
/**
 * ⚠️ CINCO Y NO TRES, Y EL NÚMERO LO ELIGIÓ UNA MEDIDA.
 *
 * Con tres, la política de la casa moría en las tres primeras semillas. La
 * cuenta explica por qué: un bicho aguanta dos golpes y pega uno por turno, así
 * que cada pelea cuesta una vida — de tres. Con cuatro bichos por mazmorra,
 * pelear era siempre ruinoso y huir siempre correcto. Eso no es una decisión,
 * es una trampa con una única salida.
 *
 * Con cinco hay PRESUPUESTO: se pueden pagar dos o tres peleas, y entonces
 * «¿me abro paso o rodeo?» pasa a depender de cuánta vida queda y de lo lejos
 * que esté el tesoro. Que es justo lo que se quiere medir.
 */
const VIDA_INICIAL = 5;
const TESOROS = 3;
const BICHOS = 4;
const TOPE = 400;


/** Adaptador para `hayLinea`: los muros de este juego, como función. */
const esMuroDe = (p) => (x, y) => p.muros.has(y * ANCHO + x);

export const cripta = {
    OBJETIVO: 'Objetivo: salir de la mazmorra vivo y con el mayor botín. El mapa no se ve, se descubre andando, y pisar la salida termina la partida con lo que lleves encima: decidir CUÁNDO salir es la jugada.',
    /**
     * ⚠️ LA MAZMORRA LA GENERA UNA PIEZA DEL MOTOR, NO ESTE FICHERO.
     *
     * `BSPSystem` llevaba tiempo en `src/world/` particionando espacio y
     * cavando pasillos, y no se usaba en ningún juego. No hacía falta escribir
     * un generador: hacía falta poder SEMBRARLO. Llamaba a `Math.random()` en
     * once sitios, y eso lo dejaba fuera de cualquier cosa que tenga que
     * repetirse —una tirada de banco de pruebas, un informe de fallo, un recibo
     * de partida—. Misma semilla, otra mazmorra: `{juego, semilla, jugadas}`
     * dejaba de reproducir la partida.
     *
     * No era un defecto de diseño, era un parámetro que faltaba. Ahora acepta
     * `rng` y sigue funcionando igual para quien no se lo pase. Ésa es la
     * diferencia entre tener un motor y tener una carpeta con ficheros: la
     * pieza mejora una vez y la hereda el que venga detrás.
     */
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        const bsp = new BSPSystem({ minLeafSize: 5, maxLeafSize: 9, rng: azar });
        const { rooms, halls } = bsp.generate(ANCHO, ALTO, 4);

        // Todo es roca; las salas y los pasillos son lo que se excava.
        const muros = new Set(Array.from({ length: ANCHO * ALTO }, (_, i) => i));
        const cavar = (r) => {
            for (let y = r.y; y < r.y + Math.max(1, r.height); y++)
                for (let x = r.x; x < r.x + Math.max(1, r.width); x++)
                    if (dentro(x, y)) muros.delete(y * ANCHO + x);
        };
        rooms.forEach(cavar);
        halls.forEach(cavar);

        const centro = (r) => ({ x: Math.floor(r.x + r.width / 2), y: Math.floor(r.y + r.height / 2) });
        const heroe = centro(rooms[0]);
        muros.delete(idx(heroe));

        /**
         * ⚠️ TODO SE COLOCA SOBRE LO ALCANZABLE, Y ESO NO ES UN DETALLE.
         *
         * Lo aprendí con sokoban: un nivel irresoluble arruina la medida sin
         * avisar —el agente parece malo cuando el que falló fue el generador—.
         * Un BSP conecta las salas hermanas, pero «casi siempre conectado» no
         * sirve: basta una partición de cada cincuenta con una sala suelta para
         * meter ruido en la tabla y no saber de dónde viene.
         *
         * Así que primero se inunda desde el héroe y después se reparte SÓLO
         * sobre lo que se puede pisar. La partida es ganable por construcción,
         * no por suerte.
         */
        const alcanzables = inundar(muros, heroe);
        const porDistancia = [...alcanzables.entries()].sort((a, b) => b[1] - a[1]);
        const salida = punto(porDistancia[0][0]);   // lo más lejos que se puede llegar

        // Los tesoros, repartidos por el resto: ni todos juntos ni todos al fondo.
        const libres = porDistancia
            .filter(([i]) => i !== idx(heroe) && i !== idx(salida))
            .map(([i]) => i);
        const tesoros = repartir(libres, TESOROS, azar).map(i => ({ ...punto(i), tomado: false }));

        // Los bichos, lejos del héroe: nadie empieza acorralado.
        const lejos = libres.filter(i => distancia(punto(i), heroe) > DESPIERTA);
        const bichos = repartir(lejos.length >= BICHOS ? lejos : libres, BICHOS, azar)
            .map(i => ({ ...punto(i), vida: 2 }));

        const p = {
            semilla, ancho: ANCHO, alto: ALTO, muros,
            heroe, salida, tesoros, bichos,
            visto: new Set(), vida: VIDA_INICIAL, pasos: 0, tope: TOPE,
            salio: false, golpes: 0,
        };
        mirar(p);
        return p;
    },

    /**
     * ⚠️ EL SUSTRATO, CENSURADO — Y LA CENSURA ES EL JUEGO.
     *
     * `p` tiene el mapa entero. Lo que sale de aquí no. Se publica la memoria
     * del jugador, no la verdad del mundo, y la diferencia entre las dos es
     * exactamente lo que hay que ir a buscar caminando.
     *
     * Nótese qué se recuerda y qué no: **el terreno y los tesoros se recuerdan;
     * los bichos, no**. Una pared no se mueve, así que haberla visto es saber
     * dónde está. Un bicho sí, así que dibujarlo donde estaba hace un rato no
     * sería memoria: sería una afirmación falsa sobre el presente. El sustrato
     * puede decir «no lo sé» —para eso está `niebla`— pero no puede mentir.
     */
    sustrato(p) {
        const n = p.ancho * p.alto;
        const celdas = new Array(n).fill(0);
        const niebla = new Array(n).fill(1);
        for (const i of p.visto) {
            niebla[i] = 0;
            celdas[i] = p.muros.has(i) ? 1 : 0;
        }
        const iSalida = idx(p.salida);
        if (!niebla[iSalida]) celdas[iSalida] = 2;      // 2 = destino, el contrato

        const aLaVista = campoVision(p);
        return {
            rejilla: { ancho: p.ancho, alto: p.alto, celdas, niebla },
            piezas: [
                ...p.tesoros
                    .filter(t => !t.tomado && p.visto.has(idx(t)))
                    .map(t => ({ x: t.x, y: t.y, t: 'tesoro', de: 2 })),
                ...p.bichos
                    .filter(b => aLaVista.has(idx(b)))
                    .map(b => ({ x: b.x, y: b.y, t: 'bicho', de: 1 })),
                { x: p.heroe.x, y: p.heroe.y, t: 'heroe', de: 0 },
            ],
            zonas: [],
            leyenda: { heroe: 'tú', bicho: 'bicho', tesoro: 'tesoro' },
            simbolos: { heroe: '@', bicho: 'b', tesoro: '$' },
        };
    },

    /** La puerta de lenguaje, otra vez gratis: el mismo sustrato, en letras. */
    describir(p) {
        const st = this.estado(p);
        const puedes = st.legal_moves.filter(m => m !== 'nueva').join(', ');
        return `Cripta. Vida ${st.vida}/${VIDA_INICIAL}, `
             + `${st.tesoros}/${TESOROS} tesoros, ${st.pasos} pasos, `
             + `${st.explorado} casillas exploradas.\n`
             + (st.salida_conocida ? 'Sabes dónde está la salida (o).\n'
                                   : 'Aún no has encontrado la salida.\n')
             + describirSustrato(this.sustrato(p))
             + (st.is_game_over ? `\n${st.desenlace}.` : `\nPuedes: ${puedes}.`);
    },

    estado(p) {
        const tomados = p.tesoros.filter(t => t.tomado).length;
        const muerto = p.vida <= 0;
        const terminada = p.salio || muerto || p.pasos >= p.tope;

        /**
         * ⚠️ LA DECISIÓN MENOS OBVIA DEL FICHERO: `legal_moves` TAMBIÉN TIENE
         * NIEBLA.
         *
         * En sokoban esta lista es exacta —empujar contra un muro no es un
         * movimiento que falla, es un movimiento que no existe—. Aquí no puede
         * serlo, y por un motivo que tardé en ver: si sólo ofreciera las
         * direcciones que de verdad están despejadas, **la propia lista sería un
         * mapa**. Bastaría con leer las acciones legales en cada casilla para
         * reconstruir la mazmorra sin explorarla, y la exploración —que es el
         * juego entero— quedaría resuelta por el menú.
         *
         * Así que la lista dice lo que se puede INTENTAR, no lo que va a salir
         * bien: se ofrece toda dirección que no sea un muro YA CONOCIDO. Chocar
         * contra roca que no habías visto gasta un paso y te enseña que está
         * ahí. Eso no es un fallo del contrato: es el precio de la información,
         * y en un juego de exploración ese precio es la mecánica.
         */
        const legales = terminada ? ['nueva'] : Object.keys(DIRS).filter(d => {
            const q = suma(p.heroe, DIRS[d]);
            if (!dentro(q.x, q.y)) return false;              // el borde sí se sabe
            return !(p.visto.has(idx(q)) && p.muros.has(idx(q)));
        });

        const desenlace = p.salio ? 'Has salido de la cripta'
                        : muerto  ? 'Has caído en la cripta'
                        : 'Se te ha acabado el tiempo';

        return {
            juego: 'cripta',
            vida: Math.max(0, p.vida),
            tesoros: tomados,
            tesoros_totales: TESOROS,
            pasos: p.pasos,
            explorado: p.visto.size,
            salida_conocida: p.visto.has(idx(p.salida)),
            salio: p.salio,
            /**
             * ⚠️ CON PENDIENTE DESDE EL PRIMER PASO, QUE ES LA LECCIÓN DE SOKOBAN.
             *
             * Allí la métrica era `cajas * 100 - pasos` y el calibrador la tumbó:
             * **métrica constante**, todo el mundo el mismo suelo, porque el
             * fracaso era el caso normal y todos los fracasos valían igual. Un
             * entorno donde perder de mil formas puntúa lo mismo no ordena a
             * nadie.
             *
             * Aquí el término que da la pendiente es `explorado`: mirar sitios
             * nuevos suma desde el paso uno, aunque no se encuentre nada. Y como
             * cada paso resta, deambular por lo ya visto puntúa negativo — que es
             * justo la diferencia entre tener memoria y no tenerla.
             */
            puntos: tomados * 150 + (p.salio ? 300 : 0) + p.visto.size
                    - p.pasos - (muerto ? 200 : 0),
            desenlace: terminada ? desenlace : null,
            turn: 'player',
            semilla: p.semilla,
            legal_moves: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const dir = String(jugada);
        if (!DIRS[dir]) return false;
        const st = this.estado(p);
        if (st.is_game_over || !st.legal_moves.includes(dir)) return false;

        const q = suma(p.heroe, DIRS[dir]);
        p.pasos++;

        const bicho = p.bichos.find(b => b.x === q.x && b.y === q.y);
        if (bicho) {
            // Andar contra un bicho es atacarlo. No hay botón de atacar: el
            // movimiento ya lo dice, y una acción menos es una acción menos que
            // explicar a quien juega leyendo.
            if (--bicho.vida <= 0) p.bichos = p.bichos.filter(b => b !== bicho);
        } else if (p.muros.has(idx(q))) {
            // Roca que no habías visto. El paso se gasta y el mapa crece.
            p.visto.add(idx(q));
        } else {
            p.heroe = q;
            const tesoro = p.tesoros.find(t => !t.tomado && t.x === q.x && t.y === q.y);
            if (tesoro) tesoro.tomado = true;
            /**
             * ⚠️ LA SALIDA NO EXIGE HABERLO COGIDO TODO, Y ES A PROPÓSITO.
             * Salir con dos tesoros vale 600; volver a por el tercero vale 150
             * más y arriesga los 300 de la salida. Eso convierte el final de la
             * partida en una DECISIÓN en lugar de en un trámite, y las decisiones
             * son lo que se está midiendo.
             */
            if (q.x === p.salida.x && q.y === p.salida.y) p.salio = true;
        }

        mirar(p);
        if (!p.salio) moverBichos(p);
        return true;
    },

    /**
     * El rival de la casa: EXPLORACIÓN POR FRONTERA.
     *
     * ⚠️ Y JUEGA LEYENDO EL SUSTRATO, NO EL ESTADO. Esa línea de más arriba
     * —`const sus = this.sustrato(p)`— es media prueba de honradez del género.
     * Podría mirar `p.muros` y salir en línea recta; es la política de la casa,
     * nadie se lo impide. Si lo hiciera, el techo que marca sería el de un
     * tramposo, y todo agente honrado quedaría por debajo sin que la tabla
     * dijera por qué.
     *
     * Pasando por el sustrato la trampa deja de ser una cuestión de disciplina y
     * pasa a ser IMPOSIBLE: entra por la misma puerta que un modelo o una
     * persona, y ve exactamente lo mismo. Es el mismo principio que hace
     * verificable un recibo — no confiar, sino no poder.
     *
     * El algoritmo es el clásico: ir a la casilla conocida más cercana que dé a
     * lo desconocido. No es un solucionador —no razona sobre los bichos ni
     * decide cuándo cortar por lo sano— así que sigue siendo un techo blando.
     * Pero uno que cierra el mapa.
     */
    sugerencia(p) {
        const st = this.estado(p);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p);
        const yo = { x: p.heroe.x, y: p.heroe.y };

        /**
         * 1. Bicho al lado: se pega si hay vida de sobra, y si no se abre.
         *
         * ⚠️ La primera versión pegaba siempre, y **moría en las tres semillas
         * que probé**. Un techo que se suicida no es un techo: si el rival de la
         * casa acaba siempre en el suelo, cualquier agente que se limite a no
         * morir ya lo supera, y la tabla premia la cobardía en vez de la
         * exploración. Saber retirarse es parte del oficio.
         */
        const bichoAlLado = Object.entries(DIRS).find(([dir, d]) => {
            const q = suma(yo, d);
            return legales.includes(dir)
                && sus.piezas.some(z => z.t === 'bicho' && z.x === q.x && z.y === q.y);
        });
        if (bichoAlLado) {
            if (p.vida > 2) return bichoAlLado[0];
            const huida = legales
                .filter(m => !sus.piezas.some(z => z.t === 'bicho'
                    && z.x === suma(yo, DIRS[m]).x && z.y === suma(yo, DIRS[m]).y))
                .sort((a, b) => lejosDeBichos(sus, suma(yo, DIRS[b])) - lejosDeBichos(sus, suma(yo, DIRS[a])));
            if (huida.length) return huida[0];
        }

        const metas = (filtro) => new Set(sus.piezas.filter(filtro).map(z => idx(z)));

        // 2. Tesoro visto y no cogido.
        const tesoros = metas(z => z.t === 'tesoro');
        if (tesoros.size) {
            const d = primerPaso(sus, yo, i => tesoros.has(i));
            if (d && legales.includes(d)) return d;
        }

        // 3. Todo cogido y salida conocida: fuera.
        const iSalida = sus.rejilla.celdas.findIndex(v => v === 2);
        const quedan = TESOROS - p.tesoros.filter(t => t.tomado).length;
        if (iSalida >= 0 && quedan === 0) {
            const d = primerPaso(sus, yo, i => i === iSalida);
            if (d && legales.includes(d)) return d;
        }

        // 4. Explorar: la frontera más cercana.
        const d = primerPaso(sus, yo, i => sus.rejilla.niebla[i] === 1);
        if (d && legales.includes(d)) return d;

        // 5. Mapa cerrado y aún faltan tesoros: se sale con lo que haya.
        if (iSalida >= 0) {
            const s = primerPaso(sus, yo, i => i === iSalida);
            if (s && legales.includes(s)) return s;
        }
        return legales[0];
    },

    deshacer() { return false; },
};

// ── El mundo por dentro (nada de esto sale al sustrato) ─────────────────────

const dentro = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
const idx = (q) => q.y * ANCHO + q.x;
const punto = (i) => ({ x: i % ANCHO, y: Math.floor(i / ANCHO) });
const distancia = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Distancia al bicho visible más cercano. Sólo mira el sustrato, como todo. */
function lejosDeBichos(sus, q) {
    const bichos = sus.piezas.filter(z => z.t === 'bicho');
    if (!bichos.length) return Infinity;
    return Math.min(...bichos.map(b => distancia(b, q)));
}

/** Inundación desde el héroe. Devuelve `Map<índice, distancia>` de lo pisable. */
function inundar(muros, desde) {
    const d = new Map([[idx(desde), 0]]);
    const cola = [desde];
    while (cola.length) {
        const n = cola.shift();
        for (const dir of Object.values(DIRS)) {
            const q = suma(n, dir);
            if (!dentro(q.x, q.y) || muros.has(idx(q)) || d.has(idx(q))) continue;
            d.set(idx(q), d.get(idx(n)) + 1);
            cola.push(q);
        }
    }
    return d;
}

/** Reparte `cuantos` índices por la lista, separados y de forma determinista. */
function repartir(lista, cuantos, azar) {
    if (!lista.length) return [];
    const paso = Math.max(1, Math.floor(lista.length / cuantos));
    const salida = [];
    for (let k = 0; k < cuantos; k++) {
        const base = k * paso;
        const i = lista[(base + Math.floor(azar() * paso)) % lista.length];
        if (!salida.includes(i)) salida.push(i);
    }
    return salida;
}

/**
 * Qué se ve AHORA: radio `VISTA` y línea de visión.
 *
 * ⚠️ CON LÍNEA DE VISIÓN, NO SÓLO RADIO. Un círculo pelado deja ver a través de
 * la roca, y entonces las esquinas no esconden nada: la mazmorra se lee de un
 * vistazo desde el centro de una sala y la exploración se acaba antes de
 * empezar. Es el muro el que crea la decisión de asomarse.
 */
function campoVision(p) {
    const visto = new Set();
    for (let dy = -VISTA; dy <= VISTA; dy++) {
        for (let dx = -VISTA; dx <= VISTA; dx++) {
            const x = p.heroe.x + dx, y = p.heroe.y + dy;
            if (!dentro(x, y) || dx * dx + dy * dy > VISTA * VISTA + 1) continue;
            if (hayLinea(esMuroDe(p), p.heroe, { x, y })) visto.add(y * ANCHO + x);
        }
    }
    return visto;
}

/** Bresenham. El muro del final se ve; lo que hay detrás, no. */

/** Lo que se ve ahora pasa a lo que se sabe. La memoria del jugador. */
function mirar(p) {
    for (const i of campoVision(p)) p.visto.add(i);
}

/**
 * Los bichos. Persiguen si te tienen cerca y a la vista; si no, duermen.
 *
 * Sin azar a propósito: la mazmorra se sortea una vez con la semilla y a partir
 * de ahí la partida es una función de las jugadas. Así `{juego, semilla,
 * jugadas}` se vuelve a jugar y da lo mismo, que es lo que hace verificable un
 * recibo sin creerse a nadie.
 */
function moverBichos(p) {
    for (const b of p.bichos) {
        if (distancia(b, p.heroe) > DESPIERTA || !hayLinea(esMuroDe(p), b, p.heroe)) continue;
        if (distancia(b, p.heroe) === 1) { p.vida--; p.golpes++; continue; }

        const dx = Math.sign(p.heroe.x - b.x), dy = Math.sign(p.heroe.y - b.y);
        // Primero el eje que más lo acerca; si está tapado, el otro.
        const intentos = Math.abs(p.heroe.x - b.x) >= Math.abs(p.heroe.y - b.y)
            ? [[dx, 0], [0, dy]] : [[0, dy], [dx, 0]];
        for (const [ux, uy] of intentos) {
            if (!ux && !uy) continue;
            const q = { x: b.x + ux, y: b.y + uy };
            if (!dentro(q.x, q.y) || p.muros.has(idx(q))) continue;
            if (p.bichos.some(o => o !== b && o.x === q.x && o.y === q.y)) continue;
            b.x = q.x; b.y = q.y;
            break;
        }
    }
}

