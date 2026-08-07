/**
 * sigilo.js — el género que cierra la tabla: LOS CINCO EJES A LA VEZ
 * ═══════════════════════════════════════════════════════════════════════════
 * Un ladrón entra a robar y un guardia lo busca. Ninguno de los dos ve el
 * edificio entero, ninguno de los dos ve al otro salvo cuando lo tiene delante,
 * y por los pasillos van drones que no obedecen a nadie.
 *
 * ⚠️ POR QUÉ ESTE Y POR QUÉ AHORA
 * `matriz_generos.mjs` dejaba dos casillas vacías después de la defensa:
 * `oculto + autonomo + rival`, y **ningún juego de los veintitrés juntaba los
 * cinco ejes**. Éste hace las dos cosas de una vez, y no por acumular
 * ingredientes: es que el sigilo ES esa intersección. Quítale la niebla y es un
 * pillapilla resuelto; quítale el rival y es cripta; quítale los drones y es un
 * duelo limpio de dos. Los tres juntos producen lo único que ninguno de los
 * veintitrés pedía — **decidir sabiendo que el otro también está decidiendo
 * sobre ti, y sin verlo**.
 *
 * ⚠️ Y ES EL PRIMERO CON NIEBLA POR LOS DOS LADOS.
 * En la flota cada uno esconde su flota, pero el tablero es fijo y está a la
 * vista. En cripta hay niebla, pero sólo una persona mira. Aquí hay dos memorias
 * distintas del mismo edificio, cada una incompleta a su manera, y ninguna puede
 * asomarse a la otra. Que es donde este proyecto ya se ha equivocado dos veces
 * con las cartas — y las dos sin dar un error.
 *
 * ⚠️ ASIMÉTRICO A PROPÓSITO. El ladrón gana llevándose el botín y saliendo; el
 * guardia, tocándolo. No hacen la misma tarea ni puntúan igual, y eso obliga al
 * banco de pruebas a medir DOS papeles con el mismo entorno. Un agente puede ser
 * bueno huyendo y malo cazando: hasta hoy no teníamos dónde verlo.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';
import { BSPSystem } from '../../../../js/alisa-engine/src/world/BSPSystem.js';

const ANCHO = 21, ALTO = 15;
const BANDOS = ['ladron', 'guardia'];
const VISTA = { ladron: 3, guardia: 4 };   // el guardia ve más: conoce la casa
const BOTINES = 2;
/**
 * ⚠️ CUATRO, Y LO PIDIÓ LA MATRIZ DE GÉNEROS.
 *
 * Con dos drones en un edificio de 21×15, `matriz_generos` marcaba este juego
 * **sin agentes autónomos** — y no porque no los hubiera, sino porque no se
 * veían nunca. La sonda mira lo que el SUSTRATO enseña, o sea lo que el jugador
 * puede saber, y ahí estaba la respuesta incómoda: un peligro que no te
 * encuentras no es un peligro, es decorado. No entra en ninguna decisión y por
 * tanto no debe contar como estructura.
 *
 * Es la primera vez que la tabla no señala un hueco del catálogo sino uno DENTRO
 * de un juego. Vale para lo mismo: mide lo que el jugador ve, no lo que yo sé
 * que programé.
 */
const PATRULLAS = 4;
const TOPE = 200;

const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };

export const sigilo = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        // Segundo juego que se apoya en `BSPSystem`. Sirve porque se le puede dar
        // la semilla — el arreglo que hizo falta para cripta lo hereda éste
        // gratis, que es la diferencia entre un motor y una carpeta de ficheros.
        const bsp = new BSPSystem({ minLeafSize: 5, maxLeafSize: 8, rng: azar });
        const { rooms, halls } = bsp.generate(ANCHO, ALTO, 4);

        const muros = new Set(Array.from({ length: ANCHO * ALTO }, (_, i) => i));
        const cavar = (r) => {
            for (let y = r.y; y < r.y + Math.max(1, r.height); y++)
                for (let x = r.x; x < r.x + Math.max(1, r.width); x++)
                    if (dentro(x, y)) muros.delete(y * ANCHO + x);
        };
        rooms.forEach(cavar); halls.forEach(cavar);

        const centro = (r) => ({ x: Math.floor(r.x + r.width / 2), y: Math.floor(r.y + r.height / 2) });
        const entrada = centro(rooms[0]);
        muros.delete(idx(entrada));

        // Todo sobre lo alcanzable, por la lección de cripta: un plano donde el
        // botín cae en una sala aislada no mide al ladrón, mide al generador.
        const alcanzables = inundar(muros, entrada);
        const porLejania = [...alcanzables.entries()].sort((a, b) => b[1] - a[1]);
        const libres = porLejania.map(([i]) => i).filter(i => i !== idx(entrada));

        const botines = repartir(libres, BOTINES, azar).map(i => ({ ...punto(i), tomado: false }));
        // El guardia empieza lejos de la entrada: si naciera encima, la partida
        // se acabaría antes de que el ladrón decidiera nada.
        const guardia = punto(porLejania[Math.floor(porLejania.length * 0.15)][0]);
        const patrullas = repartir(libres.filter(i => distancia(punto(i), entrada) > 5), PATRULLAS, azar)
            .map((i, k) => ({ ...punto(i), d: k % 2 ? [1, 0] : [0, 1] }));

        const p = {
            semilla, turno: BANDOS[0],
            muros, salida: entrada,
            ladron: { ...entrada, visto: new Set(), botin: 0 },
            guardia: { ...guardia, visto: new Set() },
            botines, patrullas,
            pasos: 0, tope: TOPE, atrapado: false, escapado: false,
        };
        mirar(p, 'ladron'); mirar(p, 'guardia');
        return p;
    },

    /**
     * ⚠️ DOS MEMORIAS DEL MISMO EDIFICIO, Y NINGUNA PUEDE MIRAR A LA OTRA.
     *
     * Se publica lo que ESE asiento ha visto: su terreno recordado, el botín que
     * haya encontrado, y al otro sólo si ahora mismo lo tiene a la vista. La
     * regla es la de cripta —el terreno se recuerda, lo que se mueve no— y aquí
     * importa el doble: dibujar al rival donde estaba hace tres turnos no sería
     * memoria, sería decirle dónde está cuando ya no lo sabe.
     *
     * Y una cosa que sí se cuenta a los dos: la ALARMA. Si el guardia ve al
     * ladrón, el ladrón se entera de que lo han visto. Esconder eso haría el
     * juego injusto de una forma que además no es realista — a uno lo persiguen
     * y lo nota.
     */
    sustrato(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0];
        const el = otro(yo);
        const n = ANCHO * ALTO;
        const celdas = new Array(n).fill(0);
        const niebla = new Array(n).fill(1);
        const mio = p[yo];

        for (const i of mio.visto) { niebla[i] = 0; celdas[i] = p.muros.has(i) ? 1 : 0; }
        // La salida sólo la marca el ladrón: es su meta, no la del guardia.
        if (yo === 'ladron' && !niebla[idx(p.salida)]) celdas[idx(p.salida)] = 2;

        const aLaVista = campoVision(p, yo);
        const piezas = [
            ...p.botines.filter(b => !b.tomado && mio.visto.has(idx(b)))
                .map(b => ({ x: b.x, y: b.y, t: 'botin', de: 2 })),
            ...p.patrullas.filter(d => aLaVista.has(idx(d)))
                .map(d => ({ x: d.x, y: d.y, t: 'dron', de: 2 })),
            { x: mio.x, y: mio.y, t: yo, de: 0 },
        ];
        if (aLaVista.has(idx(p[el]))) piezas.push({ x: p[el].x, y: p[el].y, t: el, de: 1 });

        return {
            rejilla: { ancho: ANCHO, alto: ALTO, celdas, niebla },
            piezas, zonas: [],
            leyenda: { ladron: 'ladrón', guardia: 'guardia', dron: 'dron de patrulla', botin: 'botín' },
            simbolos: { ladron: '@', guardia: 'G', dron: 'd', botin: '$' },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const puedes = st.legal_moves.filter(m => m !== 'nueva').join(', ');
        return `Sigilo. Eres el ${st.bando}. `
             + (st.bando === 'ladron'
                 ? `Llevas ${st.botin}/${BOTINES} del botín; sales por la (o).`
                 : `El ladrón lleva ${st.botin}/${BOTINES}; atrápalo tocándolo.`)
             + ` ${st.pasos} pasos.\n`
             + (st.te_ven ? '⚠ Te tienen a la vista.\n' : '')
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca: ${st.turn === st.bando ? 'sí' : 'no'}. Puedes: ${puedes}.`);
    },

    estado(p, asiento = 0) {
        const yo = BANDOS[asiento] ?? BANDOS[0];
        const terminada = p.atrapado || p.escapado || p.pasos >= p.tope;

        // Las de quien mueve, y con niebla: ofrecer sólo lo despejado sería
        // publicar el plano. La lección de cripta, con dos jugadores.
        const mueve = p[p.turno];
        const legales = terminada ? ['nueva'] : Object.keys(DIRS).filter(d => {
            const q = suma(mueve, DIRS[d]);
            if (!dentro(q.x, q.y)) return false;
            return !(p[p.turno].visto.has(idx(q)) && p.muros.has(idx(q)));
        });

        const gana = yo === 'ladron' ? p.escapado : p.atrapado;
        const pierde = yo === 'ladron' ? p.atrapado : p.escapado;

        return {
            juego: 'sigilo',
            bando: yo, turn: p.turno,
            botin: p.ladron.botin, botin_total: BOTINES,
            pasos: p.pasos,
            explorado: p[yo].visto.size,
            te_ven: campoVision(p, otro(yo)).has(idx(p[yo])),
            /**
             * Asimétrico, y con pendiente para los dos papeles desde el paso uno.
             *
             * El ladrón cobra por lo que recoge y por salir; el guardia, por
             * acorralar — y como «acorralar» no es un suceso sino una tendencia,
             * se le paga por estar CERCA. Sin ese término, un guardia que persigue
             * bien pero no llega a tocar puntuaría igual que uno que se sienta en
             * una esquina, y el entorno no sabría cuál de los dos juega. Es la
             * misma corrección que hubo que hacerle a sokoban, con otro disfraz:
             * si el fracaso es indistinguible, el banco de pruebas no ordena.
             */
            puntos: yo === 'ladron'
                ? p.ladron.botin * 100 + (p.escapado ? 200 : 0) + p[yo].visto.size
                  - p.pasos - (p.atrapado ? 300 : 0)
                : (p.atrapado ? 300 : 0) - p.ladron.botin * 100 - (p.escapado ? 200 : 0)
                  + Math.max(0, 60 - distancia(p.guardia, p.ladron) * 4),
            gana, pierde,
            desenlace: !terminada ? null
                : p.escapado ? 'El ladrón ha salido con el botín'
                : p.atrapado ? 'El guardia ha atrapado al ladrón'
                : 'Se acabó el turno de noche',
            semilla: p.semilla,
            legal_moves: legales, legal_actions: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const dir = String(jugada);
        const st = this.estado(p);
        if (st.is_game_over || !DIRS[dir] || !st.legal_moves.includes(dir)) return false;

        const quien = p.turno, actor = p[quien];
        const q = suma(actor, DIRS[dir]);
        p.pasos++;

        if (p.muros.has(idx(q))) {
            actor.visto.add(idx(q));      // pared que no habías visto: se aprende
        } else {
            actor.x = q.x; actor.y = q.y;
            if (quien === 'ladron') {
                const b = p.botines.find(z => !z.tomado && z.x === q.x && z.y === q.y);
                if (b) b.tomado = true, p.ladron.botin++;
                /**
                 * ⚠️ NO SE SALE CON LAS MANOS VACÍAS. Si pisar la entrada bastara
                 * para ganar, la jugada óptima del ladrón sería quedarse quieto en
                 * la casilla de salida desde el turno uno, y el juego entero
                 * dejaría de existir. Hay que llevarse algo.
                 */
                if (p.ladron.botin > 0 && q.x === p.salida.x && q.y === p.salida.y) p.escapado = true;
            }
        }
        mirar(p, quien);
        comprobarCaptura(p);

        p.turno = otro(quien);
        // Los drones se mueven una vez por ronda, no una por jugada: si corrieran
        // tras cada acción, el que mueve segundo jugaría contra un mundo el doble
        // de rápido. Una ventaja invisible convierte la tabla en un ranking de
        // quién empieza.
        if (p.turno === BANDOS[0] && !p.atrapado && !p.escapado) {
            moverPatrullas(p);
            comprobarCaptura(p);
        }
        return true;
    },

    /**
     * Los rivales de la casa: dos oficios distintos con el mismo sustrato.
     *
     * El ladrón hace exploración por frontera como en cripta, pero **huyendo**:
     * si tiene al guardia o a un dron a la vista, se aleja antes de seguir con lo
     * suyo. El guardia persigue lo que ve, y cuando no ve nada peina el mapa.
     *
     * Los dos leen `sustrato(p, asiento)`, no el estado. Aquí eso no es higiene
     * sino la única forma de que el techo signifique algo: un guardia que mirase
     * `p.ladron` lo atraparía siempre en línea recta y dejaría a todo agente
     * honrado por debajo, sin que la tabla explicara por qué.
     */
    sugerencia(p) {
        const asiento = BANDOS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p, asiento);
        const yo = { x: p[p.turno].x, y: p[p.turno].y };
        const dondeEstan = (t) => sus.piezas.filter(z => z.t === t);

        if (p.turno === 'guardia') {
            const visto = dondeEstan('ladron');
            if (visto.length) {
                const d = primerPaso(sus, yo, i => i === idx(visto[0]));
                if (d && legales.includes(d)) return d;
            }
            // Sin nadie a la vista, se peina: la frontera más cercana.
            const d = primerPaso(sus, yo, i => sus.rejilla.niebla[i] === 1);
            return (d && legales.includes(d)) ? d : legales[0];
        }

        // Ladrón: primero salvar el pellejo.
        const peligros = [...dondeEstan('guardia'), ...dondeEstan('dron')];
        const cerca = peligros.filter(z => distancia(z, yo) <= 3);
        if (cerca.length) {
            const lejos = legales
                .map(m => ({ m, d: Math.min(...cerca.map(z => distancia(z, suma(yo, DIRS[m])))) }))
                .sort((a, b) => b.d - a.d);
            if (lejos[0].d > Math.min(...cerca.map(z => distancia(z, yo)))) return lejos[0].m;
        }
        // Con el botín completo, a la puerta. Si no, a por lo que falte.
        const salida = sus.rejilla.celdas.findIndex(v => v === 2);
        if (p.ladron.botin >= BOTINES && salida >= 0) {
            const d = primerPaso(sus, yo, i => i === salida);
            if (d && legales.includes(d)) return d;
        }
        const botines = new Set(dondeEstan('botin').map(z => idx(z)));
        if (botines.size) {
            const d = primerPaso(sus, yo, i => botines.has(i));
            if (d && legales.includes(d)) return d;
        }
        const d = primerPaso(sus, yo, i => sus.rejilla.niebla[i] === 1);
        if (d && legales.includes(d)) return d;
        if (p.ladron.botin > 0 && salida >= 0) {
            const s = primerPaso(sus, yo, i => i === salida);
            if (s && legales.includes(s)) return s;
        }
        return legales[0];
    },

    deshacer() { return false; },
};

// ── El edificio por dentro (nada de esto sale al sustrato) ──────────────────

const dentro = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
const idx = (q) => q.y * ANCHO + q.x;
const punto = (i) => ({ x: i % ANCHO, y: Math.floor(i / ANCHO) });
const suma = (q, [dx, dy]) => ({ x: q.x + dx, y: q.y + dy });
const distancia = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const otro = (b) => BANDOS[1 - BANDOS.indexOf(b)];

/** Atrapado si el guardia o un dron comparten casilla con el ladrón. */
function comprobarCaptura(p) {
    if (p.escapado) return;
    const l = p.ladron;
    if ((p.guardia.x === l.x && p.guardia.y === l.y)
        || p.patrullas.some(d => d.x === l.x && d.y === l.y)) p.atrapado = true;
}

/** Los drones van en línea y rebotan. Sin azar: la ronda es repetible. */
function moverPatrullas(p) {
    for (const d of p.patrullas) {
        const q = suma(d, d.d);
        if (!dentro(q.x, q.y) || p.muros.has(idx(q))) { d.d = [-d.d[0], -d.d[1]]; continue; }
        d.x = q.x; d.y = q.y;
    }
}

function inundar(muros, desde) {
    const dist = new Map([[idx(desde), 0]]);
    const cola = [desde];
    while (cola.length) {
        const n = cola.shift();
        for (const dir of Object.values(DIRS)) {
            const q = suma(n, dir);
            if (!dentro(q.x, q.y) || muros.has(idx(q)) || dist.has(idx(q))) continue;
            dist.set(idx(q), dist.get(idx(n)) + 1);
            cola.push(q);
        }
    }
    return dist;
}

function repartir(lista, cuantos, azar) {
    if (!lista.length) return [];
    const paso = Math.max(1, Math.floor(lista.length / cuantos));
    const salida = [];
    for (let k = 0; k < cuantos; k++) {
        const i = lista[(k * paso + Math.floor(azar() * paso)) % lista.length];
        if (!salida.includes(i)) salida.push(i);
    }
    return salida;
}

function campoVision(p, quien) {
    const r = VISTA[quien], o = p[quien], visto = new Set();
    for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
            const x = o.x + dx, y = o.y + dy;
            if (!dentro(x, y) || dx * dx + dy * dy > r * r + 1) continue;
            if (hayLinea(p, o, { x, y })) visto.add(y * ANCHO + x);
        }
    }
    return visto;
}

/** Bresenham: el muro del final se ve, lo de detrás no. Las esquinas esconden. */
function hayLinea(p, a, b) {
    let x = a.x, y = a.y;
    const dx = Math.abs(b.x - x), dy = Math.abs(b.y - y);
    const sx = x < b.x ? 1 : -1, sy = y < b.y ? 1 : -1;
    let err = dx - dy;
    for (;;) {
        if (x === b.x && y === b.y) return true;
        if (!(x === a.x && y === a.y) && p.muros.has(y * ANCHO + x)) return false;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x += sx; }
        if (e2 < dx) { err += dx; y += sy; }
    }
}

const mirar = (p, quien) => { for (const i of campoVision(p, quien)) p[quien].visto.add(i); };

/** Frontera: se entra en la niebla y ahí se para. No se planifica a ciegas. */
function primerPaso(sus, desde, esMeta) {
    const { ancho, celdas, niebla } = sus.rejilla;
    const inicio = desde.y * ancho + desde.x;
    if (esMeta(inicio)) return null;
    const visto = new Set([inicio]);
    const cola = [{ q: desde, primera: null }];
    while (cola.length) {
        const n = cola.shift();
        for (const [dir, d] of Object.entries(DIRS)) {
            const q = suma(n.q, d);
            if (!dentro(q.x, q.y)) continue;
            const i = q.y * ancho + q.x;
            if (visto.has(i)) continue;
            visto.add(i);
            const primera = n.primera ?? dir;
            if (esMeta(i)) return primera;
            if (niebla[i] === 1 || celdas[i] === 1) continue;
            cola.push({ q, primera });
        }
    }
    return null;
}
