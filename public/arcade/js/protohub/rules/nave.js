/**
 * nave.js — DEDUCCIÓN SOCIAL: cuatro sillas, una miente
 * ═══════════════════════════════════════════════════════════════════════════
 * Tres tripulantes reparan la nave; un impostor los elimina de uno en uno. Nadie
 * sabe quién es quién. Cuando aparece un cadáver se convoca junta y **todos
 * votan a la vez**; el más votado sale por la esclusa, sea culpable o no.
 *
 * ⚠️ ESTE JUEGO NO INVENTA NINGÚN MECANISMO: JUNTA CUATRO QUE YA ESTABAN.
 *
 *   · de `pradera` y `rebano` — el mundo tiene reloj propio y avanza decidas lo
 *     que decidas, con `dt` fijo para que la partida se pueda volver a jugar;
 *   · de `relevo` — `esperar`, o sea poder dejar pasar el tiempo sin actuar,
 *     que aquí no es pasividad sino coartada;
 *   · de `frentes` — todos comprometen su jugada **sin ver la de los demás**, y
 *     se resuelve cuando ya no se puede cambiar de idea;
 *   · de `cabina` y `flota` — vista por asiento, así que nadie recibe más
 *     información de la que su personaje puede tener.
 *
 * Que salga de piezas existentes es el argumento entero: no hicieron falta
 * treinta géneros para llegar aquí, hicieron falta las estructuras correctas.
 *
 * ⚠️ Y ES LA PRIMERA VEZ QUE HAY ALGO QUE MENTIR.
 * En los veintinueve anteriores un agente podía jugar mal, nunca ENGAÑAR. El
 * impostor tiene que producir un comportamiento que parezca otro comportamiento,
 * y los tripulantes tienen que leer intenciones a partir de trayectorias
 * incompletas. Es lo único de todo el catálogo que una FSM no puede ni intentar,
 * y por eso es la prueba que más dice de un modelo de lenguaje.
 */
import { mulberry32 } from './azar.js';
import { describirSustrato } from '../descripcion.js';

/**
 * ⚠️ LA NAVE ES GRANDE Y TIENE MAMPARAS PORQUE EL GÉNERO NECESITA INTIMIDAD.
 *
 * La primera versión era 15×11 con visión de radio 3 y sin línea de visión.
 * Medido: el impostor **pudo matar 69 veces de 90 turnos y mató cero**, porque
 * veía a dos o más tripulantes en 75 de esos 90. Con cuatro personas en un
 * espacio pequeño y paredes que no tapan, no existe el momento a solas — y sin
 * momento a solas no hay crimen, sin crimen no hay junta, y sin junta no hay
 * nada que deducir.
 *
 * No era la política: era el escenario. La privacidad en este género no la da la
 * distancia, la dan los tabiques.
 */
const ANCHO = 19, ALTO = 13;
const SILLAS = ['a', 'b', 'c', 'd'];
const VISTA = 4;
const TAREAS = 6, TAREAS_PARA_GANAR = 6;
const RONDAS = 90;

const DIRS = { arriba: [0, -1], abajo: [0, 1], izquierda: [-1, 0], derecha: [1, 0] };
const dentro = (x, y) => x >= 1 && y >= 1 && x < ANCHO - 1 && y < ALTO - 1;
const idx = (q) => q.y * ANCHO + q.x;
const punto = (i) => ({ x: i % ANCHO, y: Math.floor(i / ANCHO) });
const suma = (q, [dx, dy]) => ({ x: q.x + dx, y: q.y + dy });
const cerca = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

export const nave = {
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        const muros = new Set();
        for (let y = 0; y < ALTO; y++) {
            for (let x = 0; x < ANCHO; x++) {
                if (x === 0 || y === 0 || x === ANCHO - 1 || y === ALTO - 1) muros.add(y * ANCHO + x);
            }
        }
        /**
         * Mamparas LARGAS, no manchas sueltas. Un tabique de una casilla no tapa
         * nada: hacen falta paredes que corten la vista y creen salas con puerta,
         * que es donde uno se queda solo sin darse cuenta.
         */
        for (let k = 0; k < 6; k++) {
            const horizontal = azar() < 0.5;
            const largo = 4 + Math.floor(azar() * 5);
            let x = 2 + Math.floor(azar() * (ANCHO - 5));
            let y = 2 + Math.floor(azar() * (ALTO - 5));
            const puerta = Math.floor(azar() * largo);      // toda mampara tiene paso
            for (let i = 0; i < largo; i++) {
                if (i === puerta) continue;
                const q = horizontal ? { x: x + i, y } : { x, y: y + i };
                if (dentro(q.x, q.y)) muros.add(q.y * ANCHO + q.x);
            }
        }

        const libres = [];
        for (let y = 1; y < ALTO - 1; y++) {
            for (let x = 1; x < ANCHO - 1; x++) if (!muros.has(y * ANCHO + x)) libres.push(y * ANCHO + x);
        }
        const sacar = () => libres.splice(Math.floor(azar() * libres.length), 1)[0];

        const tareas = Array.from({ length: TAREAS }, () => ({ i: sacar(), hecha: false }));
        const gente = SILLAS.map((s) => ({ silla: s, ...punto(sacar()), vivo: true }));
        const impostor = SILLAS[Math.floor(azar() * SILLAS.length)];

        return {
            semilla, azar, muros, tareas, gente, impostor,
            cadaveres: [], oculta: {}, junta: false, votos: {},
            turno: SILLAS[0], ronda: 0, tope: RONDAS,
            expulsado: null, historial: [],
        };
    },

    /**
     * ⚠️ EL SUSTRATO NO DICE QUIÉN ES EL IMPOSTOR — NI SIQUIERA AL IMPOSTOR SE LO
     * DICE DE LOS DEMÁS.
     *
     * Cada silla ve la nave a su alrededor, a los que tenga a la vista y los
     * cadáveres que haya encontrado. Nada más. Lo que un tripulante sabe es
     * exactamente lo que ha podido ver, y de ahí sale toda la deducción: «estaba
     * conmigo cuando pasó» sólo vale si de verdad estabas mirando.
     */
    sustrato(p, asiento = 0) {
        const yo = p.gente[asiento] ?? p.gente[0];
        const n = ANCHO * ALTO;
        const celdas = new Array(n).fill(0);
        /**
         * ⚠️ `sinVista`, NO `niebla` — Y LA DIFERENCIA NO ES DE NOMBRE.
         *
         * `niebla` significa «no sé qué hay aquí»: terreno incluido, como en
         * cripta. Aquí el plano es público y lo que falta es **quién** anda por
         * cada sala. Usé `niebla` por comodidad y la prueba me pilló al vuelo —
         * *«nave: filtra terreno bajo la niebla»*—, con razón: estaba publicando
         * muros en casillas que decía no conocer.
         *
         * Podría haber escondido el plano para que cuadrara. Habría sido mentir
         * al revés: hacer el juego peor para que el instrumento no se queje. Un
         * campo nuevo cuesta lo mismo y deja las dos ignorancias contadas por
         * separado, que es lo que son.
         */
        const sinVista = new Array(n).fill(1);

        /**
         * ⚠️ EL PLANO ES PÚBLICO; LA NIEBLA ES SOBRE LA GENTE.
         *
         * `celdas` trae la nave entera —un tripulante conoce su propio barco— y
         * `niebla` marca sólo dónde no alcanzas a ver AHORA, o sea de qué salas
         * no puedes decir quién hay dentro.
         *
         * Costó dos intentos. Primero escondí el plano: la tripulación no
         * encontraba las tareas y hacía **1 de 6 en noventa rondas**. Luego
         * enseñé las tareas dejando el camino tapado, y fue peor —**0 de 6**—,
         * porque veían la meta y no podían trazar ruta hasta ella: la niebla
         * corta la búsqueda de camino.
         *
         * La lección es que la niebla no es una sola cosa. Aquí hay dos
         * incertidumbres distintas —dónde están las cosas y dónde está la gente—
         * y sólo la segunda es este juego. Esconder la primera no lo hacía más
         * difícil: lo hacía otro juego, y encima uno que ya tenemos en cripta.
         */
        for (let i = 0; i < n; i++) {
            const q = punto(i);
            celdas[i] = p.muros.has(i) ? 1 : 0;
            if (cerca(q, yo) <= VISTA && hayLinea(p, yo, q)) sinVista[i] = 0;
        }
        /**
         * ⚠️ LAS TAREAS SE VEN SIEMPRE, TAMBIÉN EN LA NIEBLA.
         *
         * Un tripulante conoce su propia nave: sabe dónde está el reactor aunque
         * no lo tenga delante. Escondérselo convertía el juego en una búsqueda a
         * ciegas — medido, **1 tarea de 6 en noventa rondas** — y desviaba la
         * dificultad hacia explorar, que ya lo mide cripta.
         *
         * Lo que esconde la niebla aquí es **la gente**: dónde está cada cual y
         * quién pudo hacer qué. Ésa es la información que hay que deducir, y la
         * única que debe faltar.
         */
        for (const t of p.tareas) if (!t.hecha) celdas[t.i] = 2;

        const piezas = [];
        for (const c of p.cadaveres) if (!sinVista[c.i]) piezas.push({ ...punto(c.i), t: 'cadaver', de: 1 });
        for (const g of p.gente) {
            if (!g.vivo || g.silla === yo.silla) continue;
            if (cerca(g, yo) <= VISTA && hayLinea(p, yo, g)) {
                piezas.push({ x: g.x, y: g.y, t: `tripulante_${g.silla}`, de: 2 });
            }
        }
        piezas.push({ x: yo.x, y: yo.y, t: 'yo', de: 0 });

        return {
            rejilla: { ancho: ANCHO, alto: ALTO, celdas, sinVista },
            piezas, zonas: [],
            leyenda: { yo: 'tú', cadaver: 'cadáver',
                       ...Object.fromEntries(SILLAS.map(s => [`tripulante_${s}`, `tripulante ${s}`])) },
            simbolos: { yo: '@', cadaver: 'X',
                        ...Object.fromEntries(SILLAS.map(s => [`tripulante_${s}`, s.toUpperCase()])) },
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const papel = st.soy_impostor
            ? 'Eres el IMPOSTOR. Elimina tripulantes sin testigos y no te dejes votar.'
            : 'Eres TRIPULANTE. Repara las seis tareas (o) o descubre al impostor.';
        const vistos = this.sustrato(p, asiento).piezas
            .filter(z => z.t.startsWith('tripulante_')).map(z => z.t.slice(-1)).join(', ');
        return `Nave. Eres ${st.silla}. ${papel}\n`
             + `${st.tareas_hechas}/${TAREAS} tareas · ${st.vivos} vivos · ronda ${st.ronda}/${RONDAS}\n`
             + (st.junta
                 ? `⚠ JUNTA: hay un cadáver. Votad a la vez; el más votado sale por la esclusa.\n`
                 : `A la vista: ${vistos || 'nadie'}. Todos decidís A LA VEZ.\n`)
             + (p.historial.length ? `Antes: ${p.historial.slice(-2).join(' · ')}\n` : '')
             + describirSustrato(this.sustrato(p, asiento))
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca: ${st.turn === st.silla ? 'sí' : 'no'}. Puedes: ${st.legal_moves.join(', ')}.`);
    },

    estado(p, asiento = 0) {
        const yo = p.gente[asiento] ?? p.gente[0];
        const vivos = p.gente.filter(g => g.vivo);
        const tripulantesVivos = vivos.filter(g => g.silla !== p.impostor).length;
        const hechas = p.tareas.filter(t => t.hecha).length;

        const impostorFuera = !p.gente.find(g => g.silla === p.impostor).vivo;
        const ganaTripulacion = hechas >= TAREAS_PARA_GANAR || impostorFuera;
        const ganaImpostor = !ganaTripulacion && tripulantesVivos <= 1;
        const terminada = ganaTripulacion || ganaImpostor || p.ronda >= p.tope;

        const soyImpostor = yo.silla === p.impostor;
        const mueve = p.gente.find(g => g.silla === p.turno);

        let legales;
        if (terminada) legales = ['nueva'];
        else if (p.junta) {
            // En junta se vota, y se puede no votar a nadie: abstenerse también
            // dice algo, y quitarlo obligaría a acusar sin motivo.
            legales = ['voto:nadie', ...vivos.map(g => `voto:${g.silla}`)];
        } else {
            legales = ['esperar', ...Object.keys(DIRS).filter(d => {
                const q = suma(mueve, DIRS[d]);
                return dentro(q.x, q.y) && !p.muros.has(idx(q));
            })];
            if (p.tareas.some(t => !t.hecha && t.i === idx(mueve))) legales.push('tarea');
            /**
             * ⚠️ `sabotear` SE LE OFRECE A TODO EL MUNDO, Y NO ES UN DESCUIDO.
             *
             * La primera versión sólo se lo ofrecía al impostor. Parecía lo
             * correcto —cada uno ve sus jugadas— y lo tumbó el verificador:
             * *«jugada 32 ilegal: sabotear»*. Al re-simular desde el asiento 0,
             * la lista no contenía la acción que el juego había aceptado, así que
             * la partida dejaba de reproducirse y el recibo no valía.
             *
             * Arreglarlo enseñando la lista del impostor a los demás habría sido
             * peor que el fallo: resolvería la partida sin jugarla.
             *
             * La salida es que la acción exista para todos y **sólo surta efecto
             * en manos del impostor**. Un tripulante que lo intenta pierde el
             * turno y no se entera de nada. Además arregla algo que ni había
             * notado: si la opción sólo le saliera a uno, la propia lista de
             * jugadas sería un chivato para cualquiera que mirase un registro.
             *
             * Depende sólo de la geometría —hay alguien pegado a ti—, que es
             * pública y simétrica, así que todos los asientos calculan lo mismo.
             */
            if (vivos.some(g => g.silla !== mueve.silla && cerca(g, mueve) <= 1)) {
                legales.push('sabotear');
            }
        }

        return {
            juego: 'nave',
            silla: yo.silla, turn: p.turno,
            soy_impostor: soyImpostor,
            vivo: yo.vivo,
            vivos: vivos.length,
            tareas_hechas: hechas, tareas_totales: TAREAS,
            junta: p.junta, ronda: p.ronda,
            expulsado: p.expulsado,
            /**
             * Asimétrico y de suma opuesta: la tripulación cobra por reparar y
             * por acertar el voto; el impostor, por sobrevivir contando bocas.
             * Con pendiente desde la primera ronda —cada tarea suma aunque no se
             * gane— porque si no, todas las derrotas valdrían igual y la tabla no
             * distinguiría a quien casi lo consigue.
             */
            puntos: soyImpostor
                ? (ganaImpostor ? 200 : 0) + (4 - vivos.length) * 50 - hechas * 20
                : (ganaTripulacion ? 200 : 0) + hechas * 30 - (4 - vivos.length) * 40,
            gana: soyImpostor ? ganaImpostor : ganaTripulacion,
            desenlace: !terminada ? null
                : impostorFuera ? `La tripulación expulsó al impostor (${p.impostor})`
                : ganaTripulacion ? 'La tripulación reparó la nave'
                : ganaImpostor ? `El impostor (${p.impostor}) se quedó solo`
                : 'Se acabó el turno de guardia',
            semilla: p.semilla,
            legal_moves: legales, legal_actions: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const orden = String(jugada);
        const st = this.estado(p, SILLAS.indexOf(p.turno));
        if (st.is_game_over || !st.legal_moves.includes(orden)) return false;

        // ⚠️ Se GUARDA, no se aplica: nadie ve lo que han elegido los demás hasta
        // que ya no se puede cambiar de idea. Es el mecanismo de `frentes`.
        p.oculta[p.turno] = orden;

        const vivos = p.gente.filter(g => g.vivo);
        const siguiente = vivos.find(g => !(g.silla in p.oculta));
        if (siguiente) { p.turno = siguiente.silla; return true; }

        p.junta ? this._resolverJunta(p) : this._resolverRonda(p);
        p.oculta = {};
        p.ronda++;
        p.turno = p.gente.find(g => g.vivo).silla;
        return true;
    },

    /** Todo el mundo actúa a la vez. El orden de las sillas no da ventaja. */
    _resolverRonda(p) {
        const gente = Object.fromEntries(p.gente.map(g => [g.silla, g]));
        for (const [silla, orden] of Object.entries(p.oculta)) {
            const g = gente[silla];
            if (!g?.vivo) continue;
            if (DIRS[orden]) { const q = suma(g, DIRS[orden]); g.x = q.x; g.y = q.y; }
            else if (orden === 'tarea') {
                const t = p.tareas.find(t => !t.hecha && t.i === idx(g));
                if (t) t.hecha = true;
            } else if (orden === 'sabotear') {
                // Sólo mata el impostor. Para cualquier otro es un turno perdido
                // — y nadie se entera de que lo ha intentado.
                if (silla !== p.impostor) continue;
                const victima = p.gente.find(v => v.vivo && v.silla !== p.impostor && cerca(v, g) <= 1);
                if (victima) { victima.vivo = false; p.cadaveres.push({ i: idx(victima), silla: victima.silla }); }
            }
        }
        // La junta se convoca sola en cuanto alguien vivo ve un cadáver.
        for (const c of p.cadaveres) {
            if (c.avisado) continue;
            if (p.gente.some(g => g.vivo && cerca(punto(c.i), g) <= VISTA && hayLinea(p, g, punto(c.i)))) {
                c.avisado = true; p.junta = true;
                p.historial.push(`ronda ${p.ronda}: cadáver de ${c.silla}`);
            }
        }
    },

    _resolverJunta(p) {
        const cuenta = {};
        for (const [silla, orden] of Object.entries(p.oculta)) {
            const a = orden.slice(5);
            if (a && a !== 'nadie') cuenta[a] = (cuenta[a] ?? 0) + 1;
            p.historial.push(`${silla} votó ${a}`);
        }
        const ordenados = Object.entries(cuenta).sort((x, y) => y[1] - x[1]);
        // ⚠️ El empate NO expulsa. Si expulsara, la tripulación ganaría por azar
        // y el juego dejaría de medir deducción para medir suerte.
        if (ordenados.length && (ordenados.length === 1 || ordenados[0][1] > ordenados[1][1])) {
            const fuera = p.gente.find(g => g.silla === ordenados[0][0]);
            if (fuera) { fuera.vivo = false; p.expulsado = fuera.silla; }
            p.historial.push(`expulsado ${ordenados[0][0]}`);
        } else p.historial.push('empate: nadie sale');
        p.junta = false;
    },

    /**
     * Los rivales de la casa, uno por papel.
     *
     * **Tripulante**: va a la tarea conocida más cercana; en junta vota a quien
     * estuviera cerca del cadáver la última vez que miró, y si no vio nada se
     * abstiene. Es poco, y es a propósito: si la casa dedujera bien, el techo
     * mediría a mi heurística y no al agente.
     *
     * **Impostor**: mata cuando puede hacerlo sin testigos a la vista y el resto
     * del tiempo se comporta como un tripulante — se acerca a las tareas. Ésa es
     * toda su coartada, y aun así basta para batir al azar.
     *
     * ⚠️ Los dos leen su sustrato, no el estado. Aquí no es higiene: un impostor
     * que mirase `p.gente` sabría siempre si hay alguien mirando, y un tripulante
     * que mirase `p.impostor` votaría perfecto. El techo tiene que ser ciego
     * igual que el jugador, o no es un techo.
     */
    sugerencia(p) {
        const asiento = SILLAS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter(m => m !== 'nueva');
        if (!legales.length) return null;
        const sus = this.sustrato(p, asiento);
        const yo = sus.piezas.find(z => z.t === 'yo');

        if (p.junta) {
            const cadaver = sus.piezas.find(z => z.t === 'cadaver');
            if (cadaver) {
                const sospechoso = sus.piezas
                    .filter(z => z.t.startsWith('tripulante_'))
                    .sort((a, b) => cerca(a, cadaver) - cerca(b, cadaver))[0];
                const voto = sospechoso && `voto:${sospechoso.t.slice(-1)}`;
                if (voto && legales.includes(voto)) return voto;
            }
            return 'voto:nadie';
        }

        const aLaVista = sus.piezas.filter(z => z.t.startsWith('tripulante_'));
        if (legales.includes('sabotear')) {
            // Sólo si no hay un tercero mirando: matar delante de alguien es
            // perder la partida en la junta siguiente.
            if (aLaVista.length <= 1) return 'sabotear';
        }
        /**
         * ⚠️ EL IMPOSTOR TIENE QUE CAZAR, Y LA PRIMERA VERSIÓN NO LO HACÍA.
         *
         * Le di la misma conducta que a un tripulante —ir a las tareas— pensando
         * que eso era su coartada. Medido: **cero muertes en tres semillas de
         * cuatro**, partidas que se acababan por agotarse el turno de guardia. Un
         * impostor que nunca se acerca a nadie no es discreto, es decorativo, y
         * un juego de deducción donde no muere nadie no tiene nada que deducir.
         *
         * Ahora se acerca cuando ve a UNO solo —que es cuando podría matar sin
         * testigos— y disimula con las tareas el resto del tiempo. Sigue siendo
         * un techo blando: no planifica emboscadas ni construye coartadas. Pero
         * ya hay cadáveres, y sin cadáveres no hay juntas.
         */
        if (st.soy_impostor && aLaVista.length === 1) {
            const presa = aLaVista[0];
            const d = primerPaso(sus, yo, i => i === presa.y * sus.rejilla.ancho + presa.x);
            if (d && legales.includes(d)) return d;
        }
        if (legales.includes('tarea') && !st.soy_impostor) return 'tarea';

        const meta = sus.rejilla.celdas.findIndex(v => v === 2);
        if (meta >= 0) {
            const d = primerPaso(sus, yo, i => i === meta);
            if (d && legales.includes(d)) return d;
        }
        // Sin tareas a la vista, se patrulla hacia donde no se ve a nadie: es
        // donde puede estar pasando algo.
        const d = primerPaso(sus, yo, i => sus.rejilla.sinVista[i] === 1);
        return (d && legales.includes(d)) ? d : legales[0];
    },

    deshacer() { return false; },
};

/**
 * Bresenham: la mampara del final se ve, lo de detrás no.
 * Las esquinas esconden — y esconderse es la mitad de este juego.
 */
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

function primerPaso(sus, desde, esMeta) {
    const { ancho, celdas } = sus.rejilla;
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
            // ⚠️ Aquí SÍ se cruza la niebla: el plano de la nave es público, así
            // que se puede planificar por salas que ahora mismo no ves. Lo que no
            // sabes es quién hay dentro — y eso no impide caminar.
            if (celdas[i] === 1) continue;
            cola.push({ q, primera });
        }
    }
    return null;
}
