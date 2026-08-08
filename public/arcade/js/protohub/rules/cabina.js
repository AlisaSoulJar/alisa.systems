/**
 * cabina.js — el octavo género propio: HABLAR ES LA JUGADA
 * ═══════════════════════════════════════════════════════════════════════════
 * Dos asientos con papeles opuestos. La **guía** ve el almacén entero y no puede
 * moverse. El **piloto** se mueve y no ve nada más que la casilla que pisa. Entre
 * los dos tienen que llegar a la salida sin caer en un pozo.
 *
 * Lo único que puede hacer la guía es decir cosas. Sus seis acciones no tocan el
 * mundo: cambian lo que el piloto sabe. Y no hay otra forma de ganar.
 *
 * ⚠️ POR QUÉ ESTE GÉNERO, Y POR QUÉ AHORA
 * El censo de géneros dejó cuatro huecos, y éste era el caro: en los veintiséis
 * juegos anteriores **una silla sólo puede decirle algo a otra jugando**. No hay
 * canal. Eso deja fuera la deducción social, la negociación y el cooperativo con
 * pistas — y es justo la familia donde un modelo de lenguaje debería lucir,
 * porque la habilidad es transmitir. Tener un banco de pruebas para modelos de
 * lenguaje sin una sola prueba de comunicación era la ironía más cara del
 * catálogo.
 *
 * ⚠️ EL CANAL ES ESTRECHO A PROPÓSITO
 * Seis mensajes, no texto libre. No es por miedo a lo abierto: es que con texto
 * libre no se sabría qué se está midiendo. Un modelo elocuente parecería mejor
 * comunicador aunque dijera cosas falsas, y la puntuación mediría labia. Con seis
 * símbolos, decir la verdad útil y decir ruido cuestan exactamente lo mismo —
 * así que la diferencia de marcador sólo puede venir de **haber elegido bien qué
 * decir**.
 *
 * ⚠️ Y ES ASIMÉTRICO EN LO QUE MIDE, NO SÓLO EN LO QUE HACE
 * La guía se mide por lo que dice; el piloto, por si actúa sobre lo que le dicen.
 * Un agente puede ser bueno en un papel y malo en el otro, y hasta hoy no
 * teníamos dónde verlo — sigilo separa oficios, pero los dos consisten en andar.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';
import { DIRS, suma, primerPaso } from '../rejilla.js';

const ANCHO = 15, ALTO = 11;
const SILLAS = ['guia', 'piloto'];
const VIDAS = 3;
/**
 * ⚠️ OCHO, Y NO CATORCE — EL CANAL TIENE QUE PODER SERVIR DE ALGO.
 *
 * Con catorce pozos en una rejilla de 15×11 casi nunca existe una ruta limpia,
 * así que la guía no tenía más remedio que mandar al piloto por encima de uno.
 * Medido: dos semillas de tres acababan con el piloto muerto en los pozos
 * habiendo obedecido perfectamente.
 *
 * Y eso no mide comunicar, mide aguantar. La gracia del aviso es que exista la
 * alternativa: si todos los caminos son malos, decir «peligro» es una
 * observación sin consecuencia y el juego deja de premiar al que guía bien.
 * Con ocho hay casi siempre rodeo, y entonces avisar o no avisar cambia el
 * resultado — que es la única forma de que la puntuación hable del canal.
 */
const POZOS = 8;
const TOPE = 160;

/**
 * El vocabulario entero. Cuatro rumbos, un alto y un aviso de peligro — que es
 * lo mínimo con lo que se puede guiar a alguien a ciegas, y ni una palabra más.
 */
const DECIRES = ['di:arriba', 'di:abajo', 'di:izquierda', 'di:derecha', 'di:alto', 'di:peligro'];

export const cabina = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        const muros = new Set();
        for (let y = 0; y < ALTO; y++) {
            for (let x = 0; x < ANCHO; x++) {
                if (x === 0 || y === 0 || x === ANCHO - 1 || y === ALTO - 1) muros.add(y * ANCHO + x);
            }
        }
        for (let k = 0; k < 22; k++) {
            const x = 2 + Math.floor(azar() * (ANCHO - 4));
            const y = 1 + Math.floor(azar() * (ALTO - 2));
            muros.add(y * ANCHO + x);
        }

        const piloto = { x: 1, y: 1 + Math.floor(azar() * (ALTO - 2)) };
        muros.delete(idx(piloto));
        const salida = { x: ANCHO - 2, y: 1 + Math.floor(azar() * (ALTO - 2)) };
        muros.delete(idx(salida));

        /**
         * ⚠️ SE COMPRUEBA QUE HAY CAMINO, Y SI NO LO HAY SE ABRE.
         * Un almacén sin ruta convierte una partida en una trampa y la medida en
         * ruido: la guía diría la verdad y el piloto no llegaría igual. Es la
         * lección de sokoban y de cripta, y aquí muerde más porque el fallo
         * parecería mala comunicación.
         */
        while (!hayRuta(muros, piloto, salida)) {
            const y = 1 + Math.floor(azar() * (ALTO - 2));
            for (let x = 1; x < ANCHO - 1; x++) muros.delete(y * ANCHO + x);
        }

        // Los pozos no bloquean: se pueden pisar, y por eso hay que avisarlos.
        const pozos = new Set();
        for (let k = 0; k < POZOS * 4 && pozos.size < POZOS; k++) {
            const i = (1 + Math.floor(azar() * (ALTO - 2))) * ANCHO
                    + 1 + Math.floor(azar() * (ANCHO - 2));
            if (!muros.has(i) && i !== idx(piloto) && i !== idx(salida)) pozos.add(i);
        }

        return { semilla, turno: SILLAS[0], muros, pozos, piloto, salida,
                 mensaje: null, dichos: 0, vidas: VIDAS, pasos: 0, tope: TOPE,
                 visto: new Set([idx(piloto)]), fuera: false };
    },

    /**
     * ⚠️ DOS CUADROS QUE NO SE PARECEN EN NADA, Y ÉSE ES EL JUEGO.
     *
     * La guía recibe el almacén completo: muros, pozos, salida y dónde está el
     * piloto. El piloto recibe **casi nada** — sólo por dónde ha pasado y lo
     * último que le han dicho. Ninguno de los dos puede jugar sin el otro, y no
     * porque lo diga una regla, sino porque le falta literalmente la mitad de la
     * información.
     */
    sustrato(p, asiento = 0) {
        const yo = SILLAS[asiento] ?? SILLAS[0];
        const n = ANCHO * ALTO;
        const celdas = new Array(n).fill(0);
        const piezas = [];

        if (yo === 'guia') {
            for (const i of p.muros) celdas[i] = 1;
            celdas[idx(p.salida)] = 2;
            for (const i of p.pozos) piezas.push({ ...punto(i), t: 'pozo', de: 1 });
            piezas.push({ x: p.piloto.x, y: p.piloto.y, t: 'piloto', de: 0 });
            return {
                rejilla: { ancho: ANCHO, alto: ALTO, celdas },
                piezas, zonas: [],
                leyenda: { pozo: 'pozo', piloto: 'el piloto' },
                simbolos: { pozo: 'o', piloto: '@' },
            };
        }

        // El piloto: niebla en todo salvo lo pisado.
        const niebla = new Array(n).fill(1);
        for (const i of p.visto) {
            niebla[i] = 0;
            celdas[i] = p.muros.has(i) ? 1 : 0;
        }
        if (p.visto.has(idx(p.salida))) celdas[idx(p.salida)] = 2;
        for (const i of p.pozos) if (p.visto.has(i)) piezas.push({ ...punto(i), t: 'pozo', de: 1 });
        piezas.push({ x: p.piloto.x, y: p.piloto.y, t: 'piloto', de: 0 });
        return {
            rejilla: { ancho: ANCHO, alto: ALTO, celdas, niebla },
            piezas, zonas: [],
            leyenda: { pozo: 'pozo en el que caíste', piloto: 'tú' },
            simbolos: { pozo: 'o', piloto: '@' },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const cabecera = st.silla === 'guia'
            ? `Cabina. Eres la GUÍA: ves el almacén entero y no puedes moverte. `
              + `Tu única jugada es decirle algo al piloto (o=pozo, 2=la salida).`
            : `Cabina. Eres el PILOTO: te mueves a ciegas. Sólo conoces por dónde `
              + `has pasado. Fíate de lo que te diga la guía.`;
        return `${cabecera}\n`
             + `Vidas ${st.vidas}/${VIDAS}. ${st.pasos} pasos. `
             + `Último mensaje: ${st.mensaje ?? '(ninguno todavía)'}\n`
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca: ${st.turn === st.silla ? 'sí' : 'no'}. `
                   + `Puedes: ${st.legal_moves.filter(m => m !== 'nueva').join(', ')}.`);
    },

    estado(p, asiento = 0) {
        const yo = SILLAS[asiento] ?? SILLAS[0];
        const terminada = p.fuera || p.vidas <= 0 || p.pasos >= p.tope;

        const legales = terminada ? ['nueva']
            : p.turno === 'guia' ? [...DECIRES]
            : Object.keys(DIRS).filter(d => {
                const q = suma(p.piloto, DIRS[d]);
                if (!dentro(q.x, q.y)) return false;
                // Con niebla: sólo se descarta el muro YA conocido. Chocar contra
                // uno que no habías visto gasta un paso y enseña dónde está.
                return !(p.visto.has(idx(q)) && p.muros.has(idx(q)));
            });

        return {
            juego: 'cabina',
            silla: yo, turn: p.turno,
            vidas: Math.max(0, p.vidas), pasos: p.pasos,
            /**
             * ⚠️ EL MENSAJE LO VEN LOS DOS, Y TIENE QUE SER ASÍ.
             * Lo dicho es público: la guía sabe lo que ha dicho y el piloto lo
             * oye. Lo que NO cruza es la vista — el piloto nunca recibe el mapa,
             * por mucho que la guía lo tenga delante. El canal es el único puente,
             * y es estrecho a propósito.
             */
            mensaje: p.mensaje,
            dichos: p.dichos,
            distancia_a_salida: distancia(p.piloto, p.salida),
            /**
             * Marcador COMPARTIDO: los dos cobran lo mismo, como en relevo. Aquí
             * además es lo único coherente — no hay forma de que a la guía le
             * vaya bien si el piloto se cae al pozo.
             *
             * Con pendiente desde el primer paso: acercarse puntúa aunque no se
             * llegue, porque si no todas las partidas fallidas valdrían igual y
             * la tabla no sabría distinguir a quien guió bien de quien no dijo
             * nada útil.
             */
            puntos: (p.fuera ? 300 : 0) + p.visto.size
                    - p.pasos - (VIDAS - p.vidas) * 40
                    - distancia(p.piloto, p.salida) * 3,
            fuera: p.fuera,
            desenlace: !terminada ? null
                : p.fuera ? 'El piloto ha salido'
                : p.vidas <= 0 ? 'El piloto se quedó en los pozos' : 'Se acabó el tiempo',
            semilla: p.semilla,
            legal_moves: legales, legal_actions: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const orden = String(jugada);
        const st = this.estado(p);
        if (st.is_game_over || !st.legal_moves.includes(orden)) return false;

        if (p.turno === 'guia') {
            /**
             * ⚠️ HABLAR NO MUEVE NADA DEL MUNDO, Y ESO ES LA DEFINICIÓN DEL EJE.
             * Estas seis acciones no cambian el almacén, ni la posición, ni las
             * vidas: sólo cambian lo que el OTRO sabe. Es exactamente lo que
             * `matriz_generos` busca para marcar `comunicacion` — una acción cuyo
             * único efecto observable está en la cabeza del compañero.
             */
            p.mensaje = orden.slice(3);
            p.dichos++;
            p.turno = 'piloto';
            p.pasos++;
            return true;
        }

        const q = suma(p.piloto, DIRS[orden]);
        p.pasos++;
        if (p.muros.has(idx(q))) {
            p.visto.add(idx(q));            // tabique aprendido a golpes
        } else {
            p.piloto = q;
            p.visto.add(idx(q));
            if (p.pozos.has(idx(q))) { p.vidas--; p.pozos.delete(idx(q)); }
            if (q.x === p.salida.x && q.y === p.salida.y) p.fuera = true;
        }
        p.turno = 'guia';
        return true;
    },

    /**
     * Los rivales de la casa: uno que habla y otro que obedece.
     *
     * La guía calcula el camino más corto **esquivando pozos** y dice el primer
     * rumbo; si el piloto tiene un pozo justo delante en la dirección que acaba
     * de oír, avisa. El piloto hace lo que le dicen, y si le dicen «alto» o
     * «peligro» prueba otro rumbo.
     *
     * ⚠️ Y LOS DOS LEEN SU PROPIO SUSTRATO. Es más importante aquí que en ningún
     * otro juego: si el piloto pudiera mirar el estado, no necesitaría que le
     * hablaran y el canal —o sea, el género entero— dejaría de medirse. El techo
     * de la casa tiene que sufrir la misma ceguera que un modelo.
     */
    sugerencia(p) {
        const asiento = SILLAS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p, asiento);
        // La ficha del piloto sale del sustrato en los dos papeles: para la guía
        // es a quien dirige, para el piloto es él mismo. Ninguno de los dos mira
        // el estado, que es lo que mantiene honesto el techo.
        const yo = sus.piezas.find(z => z.t === 'piloto');

        if (p.turno === 'guia') {
            const pozos = new Set(sus.piezas.filter(z => z.t === 'pozo').map(z => idx(z)));
            const meta = sus.rejilla.celdas.findIndex(v => v === 2);
            // `evitar` con nombre: la versión compartida acepta opciones, no un
            // cuarto argumento posicional que hubiera que recordar.
            const paso = primerPaso(sus, yo, i => i === meta, { evitar: pozos });
            if (!paso) return 'di:alto';
            const destino = suma(yo, DIRS[paso]);
            if (!pozos.has(idx(destino))) return `di:${paso}`;

            /**
             * ⚠️ AVISAR UNA VEZ, Y DESPUÉS MANDAR. UN AVISO QUE SE REPITE ES UN
             * BUCLE.
             *
             * `di:peligro` gasta un turno y **no dice qué hacer**. La primera
             * versión lo soltaba siempre que el paso bueno pisaba pozo, y como la
             * guía replanifica igual cada turno, se quedaba avisando para
             * siempre: medido, dos semillas de tres agotando el tope con la guía
             * repitiendo «peligro» ochenta veces mientras el piloto iba y venía
             * entre dos casillas.
             *
             * Y engañaba de la peor manera, porque parecía un fallo de
             * comunicación —hay canal, se usa, y no se llega— cuando el fallo era
             * de la guía: repetir no es informar. La segunda vez no aporta nada
             * que el otro no tenga ya.
             *
             * Así que se avisa una vez por casilla y luego se manda, aunque
             * duela: perder una vida es recuperable, un bucle hasta el tope no.
             */
            p._avisado ??= new Set();
            const donde = idx(yo);
            if (!p._avisado.has(donde)) { p._avisado.add(donde); return 'di:peligro'; }
            return `di:${paso}`;
        }

        /**
         * El piloto: obedece, y cuando no puede obedecer NO se queda tonto.
         *
         * ⚠️ La primera versión, ante un «peligro» o ante un rumbo que chocaba
         * con un muro ya conocido, cogía `legales[0]` — siempre el mismo. Medido:
         * resolvía **una semilla de tres** y las otras dos agotaban el tope
         * haciendo ping-pong entre dos casillas, con la guía repitiéndole el
         * mismo rumbo imposible ochenta veces.
         *
         * Es exactamente el fallo que ya me tumbó la política de sokoban:
         * elegir mirando sólo el paso siguiente, en una rejilla, es oscilar. Y
         * aquí engaña más, porque parece un fallo de comunicación —la guía habla
         * y el piloto no llega— cuando lo que falla es la memoria del que anda.
         *
         * Con contar por dónde ha pasado, desobedecer deja de ser dar tumbos y
         * pasa a ser explorar.
         */
        const dicho = st.mensaje;
        if (dicho && DIRS[dicho] && legales.includes(dicho)) return dicho;

        p._visitas ??= new Map();
        const clave = (q) => `${q.x},${q.y}`;
        let elegido = legales[0], menos = Infinity;
        for (const m of legales) {
            const v = p._visitas.get(clave(suma(yo, DIRS[m]))) ?? 0;
            if (v < menos) { menos = v; elegido = m; }
        }
        p._visitas.set(clave(yo), (p._visitas.get(clave(yo)) ?? 0) + 1);
        return elegido;
    },

    deshacer() { return false; },
};

const dentro = (x, y) => x >= 0 && y >= 0 && x < ANCHO && y < ALTO;
const idx = (q) => q.y * ANCHO + q.x;
const punto = (i) => ({ x: i % ANCHO, y: Math.floor(i / ANCHO) });
const distancia = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

function hayRuta(muros, desde, hasta) {
    const visto = new Set([idx(desde)]);
    const cola = [desde];
    while (cola.length) {
        const n = cola.shift();
        if (n.x === hasta.x && n.y === hasta.y) return true;
        for (const d of Object.values(DIRS)) {
            const q = suma(n, d);
            if (!dentro(q.x, q.y) || muros.has(idx(q)) || visto.has(idx(q))) continue;
            visto.add(idx(q)); cola.push(q);
        }
    }
    return false;
}

