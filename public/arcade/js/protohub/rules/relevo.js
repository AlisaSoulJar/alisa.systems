/**
 * relevo.js — el séptimo género propio: SE GANA O SE PIERDE JUNTOS
 * ═══════════════════════════════════════════════════════════════════════════
 * Dos autómatas en un almacén partido por un muro con una sola puerta. La puerta
 * está abierta **mientras alguien pisa una placa**, y hay una placa a cada lado.
 * De ahí sale la única forma de salir: uno sostiene la placa de acá para que
 * pase el otro, y el otro sostiene la de allá para que pase el primero. Después,
 * los dos a la salida. No hay marcador propio: o salen los dos o no sale ninguno.
 *
 * ⚠️ ES LA ÚLTIMA CASILLA VACÍA DE LA TABLA.
 * `matriz_generos.mjs` medía `cooperativo` en **0 de 25**. Y no por descuido: en
 * los veinticinco anteriores, cuando decide alguien más, decide en tu contra.
 * Toda la maquinaria del proyecto —el reparto de asientos, el arbitraje de la
 * mesa, la métrica— nació suponiendo que las dos sillas tiran en direcciones
 * opuestas.
 *
 * ⚠️ Y ESE SUPUESTO ESTABA METIDO EN EL PROPIO INSTRUMENTO.
 * Para no confundir cooperación con «este juego ignora el asiento», la sonda
 * descartaba los que dan el mismo marcador a los dos. En un cooperativo eso es
 * lo NORMAL —se gana junto—, así que el primer cooperativo de verdad habría
 * salido descartado por exhibir justo lo que lo define. Hubo que arreglar la
 * medida antes de poder medir. Que un banco de pruebas herede los prejuicios de
 * lo que ya tenía es el fallo más difícil de ver de todos: no da error, sólo
 * deja de encontrar.
 *
 * ⚠️ QUÉ MIDE QUE NO MIDIERA NINGUNO
 * Coordinarse sin hablar. Cada autómata ve sólo su alrededor, así que ninguno
 * sabe si el otro ya ha llegado a su placa; hay que deducirlo de lo único que se
 * observa —que la puerta esté abierta— y actuar en consecuencia. Un agente que
 * juegue esto bien no está optimizando: está modelando a otro que también lo
 * intenta. Y es la primera vez que el proyecto puede puntuar eso.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';
import { DIRS, suma, hayLinea, primerPaso } from '../rejilla.js';

const ANCHO = 19, ALTO = 13;
const MURO_X = 9;                    // la pared que parte el almacén
const SILLAS = ['uno', 'dos'];
const VISTA = 3;
const TOPE = 260;


/** Adaptador para `hayLinea`: los muros de este juego, como función. */
const esMuroDe = (p) => (x, y) => p.muros.has(y * ANCHO + x);

export const relevo = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        const muros = new Set();
        for (let y = 0; y < ALTO; y++) {
            for (let x = 0; x < ANCHO; x++) {
                if (x === 0 || y === 0 || x === ANCHO - 1 || y === ALTO - 1) muros.add(y * ANCHO + x);
                else if (x === MURO_X) muros.add(y * ANCHO + x);
            }
        }
        const puerta = { x: MURO_X, y: 1 + Math.floor(azar() * (ALTO - 2)) };
        muros.delete(idx(puerta));

        /**
         * ⚠️ LOS OBSTÁCULOS SE COMPRUEBAN, NO SE CONFÍAN.
         * Un tabique de más puede dejar una placa incomunicada, y entonces la
         * partida es imposible sin que nadie lo diga: el agente parecería malo
         * cuando el que falló fue el generador. Es la lección de sokoban y de
         * cripta, y aquí es más fácil de romper porque hay dos mitades.
         */
        for (let k = 0; k < 16; k++) {
            const x = 1 + Math.floor(azar() * (ANCHO - 2));
            const y = 1 + Math.floor(azar() * (ALTO - 2));
            if (x === MURO_X || (x === puerta.x && y === puerta.y)) continue;
            muros.add(y * ANCHO + x);
            if (!mitadEntera(muros, x < MURO_X)) muros.delete(y * ANCHO + x);
        }

        const librasIzq = celdasLibres(muros, true), librasDer = celdasLibres(muros, false);
        const saca = (lista, lejosDe) => {
            const ord = [...lista].sort((a, b) => distancia(punto(b), lejosDe) - distancia(punto(a), lejosDe));
            return punto(ord[Math.floor(azar() * Math.max(1, Math.floor(ord.length / 3)))]);
        };
        const inicio = punto(librasIzq[0]);
        const placas = [saca(librasIzq, puerta), saca(librasDer, puerta)];
        const salida = saca(librasDer.filter(i => i !== idx(placas[1])), placas[1]);

        const p = {
            semilla, turno: SILLAS[0], muros, puerta, placas, salida,
            uno: { ...inicio, visto: new Set() },
            dos: { ...inicio, visto: new Set() },
            pisadas: [false, false], pasos: 0, tope: TOPE, fuera: { uno: false, dos: false },
        };
        // El segundo arranca una casilla al lado para no salir superpuestos.
        const hueco = Object.values(DIRS).map(d => suma(inicio, d))
            .find(q => dentro(q.x, q.y) && !muros.has(idx(q)));
        if (hueco) { p.dos.x = hueco.x; p.dos.y = hueco.y; }
        mirar(p, 'uno'); mirar(p, 'dos');
        return p;
    },

    /**
     * ⚠️ CADA UNO VE SU TROZO, Y ESO ES LA MITAD DEL PROBLEMA.
     * Si los dos vieran el almacén entero, coordinarse sería repartirse tareas y
     * ya. Con niebla propia, ninguno sabe si el otro ha llegado a su placa: hay
     * que INFERIRLO de que la puerta esté franqueable, que es la única señal que
     * cruza el muro. Ahí está el juego.
     */
    sustrato(p, asiento = 0) {
        const yo = SILLAS[asiento] ?? SILLAS[0], el = otra(yo);
        const n = ANCHO * ALTO;
        const celdas = new Array(n).fill(0);
        const niebla = new Array(n).fill(1);
        const mio = p[yo];

        for (const i of mio.visto) { niebla[i] = 0; celdas[i] = p.muros.has(i) ? 1 : 0; }
        if (!niebla[idx(p.salida)]) celdas[idx(p.salida)] = 2;

        const aLaVista = campoVision(p, yo);
        const piezas = [];
        p.placas.forEach((pl, k) => {
            if (mio.visto.has(idx(pl))) {
                piezas.push({ x: pl.x, y: pl.y, t: p.pisadas[k] ? 'placa_ok' : 'placa', de: 2 });
            }
        });
        if (mio.visto.has(idx(p.puerta))) {
            piezas.push({ x: p.puerta.x, y: p.puerta.y,
                          t: abierta(p) ? 'puerta_abierta' : 'puerta', de: 2 });
        }
        if (aLaVista.has(idx(p[el]))) piezas.push({ x: p[el].x, y: p[el].y, t: 'companero', de: 1 });
        piezas.push({ x: mio.x, y: mio.y, t: 'yo', de: 0 });

        return {
            rejilla: { ancho: ANCHO, alto: ALTO, celdas, niebla },
            piezas, zonas: [],
            leyenda: { yo: 'tú', companero: 'tu compañero', placa: 'placa',
                       placa_ok: 'placa pisada', puerta: 'puerta cerrada',
                       puerta_abierta: 'puerta abierta' },
            simbolos: { yo: '@', companero: 'C', placa: 'p', placa_ok: 'P',
                        puerta: '+', puerta_abierta: '/' },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        return `Relevo (cooperativo). Eres el autómata ${st.silla}, con ${st.companero}. `
             + `${st.fuera_ambos ? 'Habéis salido' : `${st.salidos} de 2 fuera`}. ${st.pasos} pasos.\n`
             + `La puerta (+) está abierta MIENTRAS alguien pise una placa (p). Hay una a `
             + `cada lado del muro: sostén la tuya para que pase tu compañero y espera a que `
             + `él sostenga la suya.\n`
             + `Ahora mismo la puerta está ${st.puerta_abierta ? 'ABIERTA' : 'cerrada'}.\n`
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca: ${st.turn === st.silla ? 'sí' : 'no'}. `
                   + `Puedes: ${st.legal_moves.filter(m => m !== 'nueva').join(', ')}.`);
    },

    estado(p, asiento = 0) {
        const yo = SILLAS[asiento] ?? SILLAS[0];
        const salidos = Object.values(p.fuera).filter(Boolean).length;
        const ambos = salidos === 2;
        const terminada = ambos || p.pasos >= p.tope;

        /**
         * ⚠️ `esperar` NO ES UNA COMODIDAD: SIN ELLA EL JUEGO ES IMPOSIBLE.
         *
         * Lo descubrí midiendo, y el síntoma era mudo: la política de la casa
         * acababa las tres semillas con una placa de dos y nadie fuera. No jugaba
         * mal — es que no se podía ganar. Para salir hay que estar los dos a la
         * vez en la salida, y como el turno OBLIGA a moverse, el primero que
         * llega se baja justo cuando llega el segundo. Lo mismo con las placas:
         * sostener una se hacía saliendo y volviendo, así que la puerta estaba
         * franca la mitad del tiempo y nunca la mitad que hacía falta.
         *
         * En un juego de coordinación, **quedarse quieto es una jugada** — casi
         * la jugada. Que no existiera es la clase de error que sólo se ve
         * jugando: las reglas eran coherentes, el motor no se quejaba, y el
         * objetivo era inalcanzable por construcción.
         */
        const mueve = p[p.turno];
        const legales = terminada ? ['nueva'] : ['esperar', ...Object.keys(DIRS).filter(d => {
            const q = suma(mueve, DIRS[d]);
            if (!dentro(q.x, q.y)) return false;
            if (mueve.visto.has(idx(q)) && p.muros.has(idx(q))) return false;
            // La puerta cerrada sí se sabe: la has visto y sabes que no pasas.
            if (mueve.visto.has(idx(q)) && q.x === p.puerta.x && q.y === p.puerta.y && !abierta(p)) return false;
            return true;
        })];

        const vistoJuntos = new Set([...p.uno.visto, ...p.dos.visto]).size;
        /**
         * ⚠️ EL MISMO NÚMERO PARA LOS DOS, Y ES LA DEFINICIÓN, NO UN ATAJO.
         *
         * En los veinticinco anteriores el marcador de una silla sube cuando el
         * de la otra baja. Aquí sube y baja a la vez para las dos, y eso es
         * exactamente lo que `matriz_generos` mide para decidir si un juego es
         * cooperativo: no se declara, se observa que los dos marcadores caminan
         * juntos.
         *
         * Con pendiente desde el primer paso, por la lección de sokoban: pisar
         * una placa puntúa aunque nadie salga, y explorar puntúa aunque no se
         * encuentre nada, porque si no todas las derrotas valdrían igual.
         */
        const puntos = p.pisadas.filter(Boolean).length * 60 + salidos * 80
                     + (ambos ? 200 : 0) + vistoJuntos - p.pasos;

        return {
            juego: 'relevo',
            silla: yo, companero: otra(yo), turn: p.turno,
            salidos, fuera_ambos: ambos,
            placas_pisadas: p.pisadas.filter(Boolean).length,
            puerta_abierta: abierta(p),
            sobre_placa: p.placas.some(pl => pl.x === p[yo].x && pl.y === p[yo].y),
            explorado: p[yo].visto.size,
            pasos: p.pasos,
            puntos,
            desenlace: !terminada ? null
                : ambos ? 'Habéis salido los dos' : 'Se acabó el tiempo dentro',
            semilla: p.semilla,
            legal_moves: legales, legal_actions: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const dir = String(jugada);
        const st = this.estado(p);
        if (st.is_game_over || !st.legal_moves.includes(dir)) return false;

        const quien = p.turno, actor = p[quien];
        if (dir === 'esperar') {
            // Esperar cuesta un paso: si fuera gratis, la partida podría no
            // avanzar nunca y el tope dejaría de ser un límite para ser un muro.
            p.pasos++;
            p.turno = otra(quien);
            return true;
        }
        if (!DIRS[dir]) return false;
        const q = suma(actor, DIRS[dir]);
        p.pasos++;

        const esPuerta = q.x === p.puerta.x && q.y === p.puerta.y;
        if (p.muros.has(idx(q)) || (esPuerta && !abierta(p))) {
            actor.visto.add(idx(q));       // tabique o puerta cerrada: se aprende
        } else {
            actor.x = q.x; actor.y = q.y;
            p.placas.forEach((pl, k) => { if (pl.x === q.x && pl.y === q.y) p.pisadas[k] = true; });
            if (q.x === p.salida.x && q.y === p.salida.y) p.fuera[quien] = true;
            else p.fuera[quien] = false;   // salir es estar en la casilla, no haberla pisado
        }
        mirar(p, quien);
        p.turno = otra(quien);
        return true;
    },

    /**
     * El rival de la casa —aquí, el COMPAÑERO de la casa.
     *
     * Es el primero que no juega contra nadie, y eso cambia lo que significa un
     * techo: no marca «lo bueno que hay que ser para ganar» sino «lo bien que
     * hay que entenderse». La política es deliberadamente simple y sin trucos de
     * coordinación por debajo: si no piso placa y hay una conocida y libre de
     * compañero, voy; si estoy sobre ella, ME QUEDO —moverse rompería lo único
     * que el otro puede leer de mí—; y si la puerta está franca y ya hay placa
     * pisada, cruzo y busco la salida.
     *
     * ⚠️ Lee su sustrato, así que ninguno de los dos sabe dónde está el otro
     * salvo cuando lo tiene delante. Si mirara el estado se coordinarían por
     * telepatía y el techo mediría un equipo que no existe.
     */
    sugerencia(p) {
        const asiento = SILLAS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p, asiento);
        const yo = { x: p[p.turno].x, y: p[p.turno].y };
        const tipos = (t) => sus.piezas.filter(z => z.t === t);

        const salida = sus.rejilla.celdas.findIndex(v => v === 2);
        const puertaVista = [...tipos('puerta'), ...tipos('puerta_abierta')][0];
        const miLado = (q) => (yo.x < MURO_X) === (q.x < MURO_X);

        /**
         * ⚠️ EL ORDEN DE ESTAS TRES REGLAS ES TODA LA COORDINACIÓN.
         *
         * En la salida se espera —bajarse justo cuando llega el otro es
         * exactamente el fallo que hacía el juego imposible—. Sobre una placa se
         * espera mientras falte la otra, porque sostenerla es lo único que el
         * compañero puede leer de ti a través del muro. Y en cuanto las dos
         * están pisadas, se suelta: sostener de más es tan malo como soltar de
         * menos, porque entonces el que espera eres tú.
         */
        /**
         * ⚠️ Y ESPERAR EN LA SALIDA **SÓLO CUANDO YA NO QUEDA TRABAJO**, o el
         * remedio se convierte en abrazo mortal.
         *
         * Con `esperar` recién puesto, el primero en cruzar llegaba a la salida y
         * se quedaba allí para siempre — así que nunca iba a pisar la placa del
         * otro lado, y el segundo se quedaba sosteniendo la suya esperando una
         * señal que no iba a llegar nunca. Medido: placas 1 de 2, uno fuera, las
         * tres semillas al tope.
         *
         * Los dos se comportaban «bien» por separado. El bloqueo no estaba en
         * ninguno de los dos: estaba entre los dos, que es donde viven los fallos
         * de este género y por lo que hacía falta tenerlo.
         */
        const enSalida = p[p.turno].x === p.salida.x && p[p.turno].y === p.salida.y;
        if (enSalida && st.placas_pisadas === 2) return 'esperar';
        if (st.sobre_placa && st.placas_pisadas < 2) return 'esperar';

        /**
         * ⚠️ PAPELES REPARTIDOS POR EL NÚMERO DE SILLA — Y NO ES TELEPATÍA.
         *
         * Sin repartir, los dos autómatas iban a la MISMA placa —la que tenían
         * más cerca, que era la misma para ambos porque salen juntos— y nadie
         * cruzaba. Cada uno hacía lo razonable y el equipo no hacía nada.
         *
         * Qué silla ocupas es información pública, así que acordar de antemano
         * «el uno sostiene, el dos cruza» es exactamente cómo se coordinan dos
         * personas que no pueden hablar: una convención sobre lo que los dos ya
         * saben. No mira el estado del otro ni su sustrato; sólo su propio
         * número. Ahí está la diferencia entre convención y trampa.
         */
        const sostengo = st.silla === SILLAS[0];
        const placa = tipos('placa').filter(z => miLado(z))[0];
        if (placa && !st.sobre_placa && (sostengo || st.placas_pisadas === 1)) {
            const d = primerPaso(sus, yo, i => i === idx(placa));
            if (d && legales.includes(d)) return d;
        }
        // Con la puerta franca, cruzar y buscar la salida al otro lado.
        if (st.puerta_abierta && puertaVista && !miLado(p.salida)) {
            const d = primerPaso(sus, yo, i => i === idx(puertaVista));
            if (d && legales.includes(d)) return d;
        }
        if (salida >= 0 && miLado(punto(salida))) {
            const d = primerPaso(sus, yo, i => i === salida);
            if (d && legales.includes(d)) return d;
        }
        const d = primerPaso(sus, yo, i => sus.rejilla.niebla[i] === 1);
        return (d && legales.includes(d)) ? d : legales[0];
    },

    deshacer() { return false; },
};

// ── El almacén por dentro ──────────────────────────────────────────────────

const dentro = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
const idx = (q) => q.y * ANCHO + q.x;
const punto = (i) => ({ x: i % ANCHO, y: Math.floor(i / ANCHO) });
const distancia = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const otra = (s) => SILLAS[1 - SILLAS.indexOf(s)];

/**
 * La puerta está franca mientras alguien pise una placa — y **queda encajada
 * para siempre en cuanto se han pisado las dos**.
 *
 * ⚠️ EL PESTILLO NO ES UNA CONCESIÓN, ES LO QUE HACE JUGABLE EL RELEVO.
 * Sin él, sostener una placa había que hacerlo indefinidamente, y eso a ciegas
 * es un equilibrio imposible: el que sostiene no puede saber cuándo soltar y el
 * que cruza no puede saber si le van a soltar. Medido, se quedaban los dos
 * quietos esperando una señal que ninguno podía dar.
 *
 * Con pestillo, la coordinación sigue haciendo falta entera —hay que sostener
 * mientras el otro cruza y hay que ir a pisar la segunda— pero el logro se
 * CONSOLIDA. Un juego cooperativo donde un descuido borra media hora de trabajo
 * no mide coordinarse: mide aguantar.
 */
const abierta = (p) => (p.pisadas[0] && p.pisadas[1])
    || p.placas.some((pl, k) => p.pisadas[k]
        && ((p.uno.x === pl.x && p.uno.y === pl.y) || (p.dos.x === pl.x && p.dos.y === pl.y)));

const celdasLibres = (muros, izquierda) => {
    const salida = [];
    for (let y = 1; y < ALTO - 1; y++) {
        for (let x = 1; x < ANCHO - 1; x++) {
            if (x === MURO_X) continue;
            if ((x < MURO_X) !== izquierda) continue;
            if (!muros.has(y * ANCHO + x)) salida.push(y * ANCHO + x);
        }
    }
    return salida;
};

/** ¿Sigue siendo una sola pieza esa mitad del almacén? */
function mitadEntera(muros, izquierda) {
    const libres = celdasLibres(muros, izquierda);
    if (!libres.length) return false;
    const visto = new Set([libres[0]]);
    const cola = [punto(libres[0])];
    while (cola.length) {
        const n = cola.shift();
        for (const d of Object.values(DIRS)) {
            const q = suma(n, d);
            if (!dentro(q.x, q.y) || q.x === MURO_X || muros.has(idx(q)) || visto.has(idx(q))) continue;
            visto.add(idx(q)); cola.push(q);
        }
    }
    return visto.size === libres.length;
}

function campoVision(p, quien) {
    const o = p[quien], visto = new Set();
    for (let dy = -VISTA; dy <= VISTA; dy++) {
        for (let dx = -VISTA; dx <= VISTA; dx++) {
            const x = o.x + dx, y = o.y + dy;
            if (!dentro(x, y) || dx * dx + dy * dy > VISTA * VISTA + 1) continue;
            if (hayLinea(esMuroDe(p), o, { x, y })) visto.add(y * ANCHO + x);
        }
    }
    return visto;
}


const mirar = (p, quien) => { for (const i of campoVision(p, quien)) p[quien].visto.add(i); };

