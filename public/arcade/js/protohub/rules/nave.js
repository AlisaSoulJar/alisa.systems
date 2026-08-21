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
import { BSPSystem } from '../../../../js/alisa-engine/src/world/BSPSystem.js';
import { DIRS, suma, hayLinea, primerPaso } from '../rejilla.js';

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

const dentro = (x, y) => x >= 1 && y >= 1 && x < ANCHO - 1 && y < ALTO - 1;
const idx = (q) => q.y * ANCHO + q.x;
const punto = (i) => ({ x: i % ANCHO, y: Math.floor(i / ANCHO) });
const cerca = (a, b) => Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

/** Adaptador para `hayLinea`: los muros de este juego, como función. */
const esMuroDe = (p) => (x, y) => p.muros.has(y * ANCHO + x);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ HABLAR ES UNA JUGADA, Y ÉSA ES TODA LA IDEA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * La junta era un voto pelado, y por eso este juego medía tan poco: el banco dice
 * que en nave el azar recorre el **0,41** del camino entre el suelo y la casa
 * —casi ruido— mientras que en cabina, que sí metió el habla en las jugadas, el
 * azar se queda en **0,01**. Lo que un juego de deducción tiene que medir es la
 * deducción, y aquí no había ni una jugada para expresarla.
 *
 * ⚠️ POR QUÉ UN MENÚ Y NO TEXTO LIBRE (todavía).
 *
 * La competición AIWolf lleva una década con DOS divisiones separadas: la de
 * protocolo, donde los agentes hablan con un vocabulario fijo y compiten
 * programas; y la de lenguaje natural, que juzga un jurado humano. Y AmongAgents
 * —Among Us en texto para LLMs— hace lo mismo dentro de un solo juego: el espacio
 * de acciones es un MENÚ y el lenguaje natural vive sólo dentro de la acción de
 * hablar. Hay un motivo duro: los métodos que no son LLM —CFR, refuerzo—
 * necesitan un espacio de acciones definido y no funcionan con texto sin acotar.
 *
 * Así que el vocabulario va primero, porque es lo que abre el juego a las cinco
 * puertas. `decir:"…"` con carga libre viene después, y bajo su propia norma.
 *
 * ⚠️ Y SE HABLA A LA VEZ, COMO SE MUEVE.
 *
 * Nave ya resuelve todo por compromiso oculto: cada uno elige, nadie ve lo del
 * otro, y al final de la ronda se revela. El debate hereda eso tal cual. Se pierde
 * el «responder a quien me acaba de acusar» de un debate hablado —Werewolf Arena
 * lo resuelve con una puja por el turno de palabra— y se gana no inventar un
 * segundo mecanismo de turnos dentro de un juego que ya tiene el suyo. Con dos
 * rondas, la segunda ya responde a la primera.
 */
export const NORMAS = {
    // Cuántas rondas se habla antes de votar. Con 0, la junta es el voto pelado
    // de siempre: así la norma vieja sigue siendo jugable y comparable.
    rondasDeDebate: 2,
    /**
     * ⚠️ LAS DOS DIVISIONES, COMO EN AIWOLF, PERO EN EL MISMO JUEGO.
     *
     * Con `hablaLibre` en falso sólo existe el menú: es la división de protocolo,
     * donde una política programada compite en igualdad. Con `hablaLibre`, además
     * del menú se acepta `decir:<texto>` — la división de lenguaje natural.
     *
     * AIWolf las tiene separadas desde hace una década y con razón: no se miden
     * con la misma vara. Pero allí son dos competiciones distintas, y la de
     * lenguaje la juzga un jurado humano, así que no se puede repetir. Aquí son la
     * MISMA partida con otra norma, y el texto viaja en el recibo — de modo que
     * una junta hablada se puede volver a jugar letra por letra.
     *
     * Que sean dos tablas y no una sigue siendo obligatorio: comparar «gana más»
     * con «convence más» sería inventar un empate.
     */
    hablaLibre: false,
};

/** Tope de lo que cabe en una frase. No es censura: es que el recibo tiene que
 *  seguir siendo una lista de jugadas y no un correo. */
const LARGO_FRASE = 160;

const normasDe = (o = {}) => ({ ...NORMAS, ...o });

/**
 * Lo que se puede decir. Dos verbos y callar, que es lo mínimo con lo que se
 * puede mentir: señalar a alguien, respaldar a alguien, o no mojarse.
 *
 * ⚠️ SE CALCULA DE LO PÚBLICO, Y ESO NO ES ESTÉTICA.
 *
 * La lista sale de quién está vivo y de quién tiene el turno — las dos cosas las
 * sabe todo el mundo—. Es la misma ley que ya obligó a ofrecer `sabotear` a los
 * cuatro: el verificador re-simula desde la silla 0, así que si la lista dependiera
 * de lo que cada uno sabe, una partida honrada dejaría de reproducirse.
 */
function jugadasDeDebate(vivos, quienHabla) {
    const otros = vivos.filter((g) => g.silla !== quienHabla).map((g) => g.silla);
    return ['callar', ...otros.map((s) => `acuso:${s}`), ...otros.map((s) => `defiendo:${s}`)];
}

/** Cuántas acusaciones lleva cada uno, de todo lo dicho hasta ahora. */
function acusacionesPorSilla(dichos) {
    const c = {};
    for (const d of dichos) {
        if (!d.jugada.startsWith('acuso:')) continue;
        const a = d.jugada.slice(6);
        c[a] = (c[a] ?? 0) + 1;
    }
    return c;
}

/**
 * La fábrica, igual que en damas: las normas se guardan DENTRO de la partida, así
 * que `estado()` las publica y el recibo se las lleva puestas. Sin eso, volver a
 * jugar una partida hablada exigiría acordarse por fuera de con qué nació — y el
 * verificador, que compara las normas del recibo contra las de las reglas
 * cargadas, la rechazaría con razón.
 */
export function crearNave(opts = {}) {
    const n = normasDe(opts.normas ?? opts);
    return { ...nave, NORMAS: n, nuevaPartida: (o = {}) => nave.nuevaPartida({ ...o, normas: n }) };
}

export const nave = {
    OBJETIVO: 'Objetivo: según tu papel. Los tripulantes reparan la nave o echan al impostor por votación; el impostor los elimina de uno en uno sin que lo pillen. Se vota a la vez y el más votado sale por la esclusa, sea culpable o no.',
    // CUÁNTAS SILLAS TIENE LA MESA. Sale de `SILLAS`, no de un 4 a mano:
    // tres tripulantes y un impostor, cuatro sillas en total.
    ASIENTOS: SILLAS.length,
    nuevaPartida(opts = {}) {
        const semilla = (opts.semilla ?? opts.seed ?? (Math.random() * 2 ** 32)) >>> 0;
        const azar = mulberry32(semilla);

        /**
         * ⚠️ LA NAVE LA REPARTE `BSPSystem`, NO UN APAÑO MÍO.
         *
         * La primera versión echaba seis mamparas largas al azar con una puerta
         * cada una. Funcionaba, y era exactamente el tipo de cosa que este
         * proyecto lleva un día quitando: código propio haciendo peor lo que una
         * pieza del motor hace bien. La partición binaria da **salas de verdad
         * conectadas por pasillos**, que es la topología que pide el género —
         * cuartos donde te quedas solo sin darte cuenta, y corredores donde te
         * cruzas con alguien sin saber de dónde venía.
         *
         * Tercer juego que se apoya en el mismo sistema, después de cripta y
         * sigilo. Que se pueda reusar así es consecuencia directa de haberle
         * inyectado la semilla: sin eso no habría entrado en ninguno de los tres.
         */
        const bsp = new BSPSystem({ minLeafSize: 5, maxLeafSize: 8, rng: azar });
        const { rooms, halls } = bsp.generate(ANCHO, ALTO, 4);

        const muros = new Set(Array.from({ length: ANCHO * ALTO }, (_, i) => i));
        const cavar = (r) => {
            for (let y = r.y; y < r.y + Math.max(1, r.height); y++) {
                for (let x = r.x; x < r.x + Math.max(1, r.width); x++) {
                    if (dentro(x, y)) muros.delete(y * ANCHO + x);
                }
            }
        };
        rooms.forEach(cavar); halls.forEach(cavar);

        // Todo se coloca sobre lo alcanzable desde una sala: la lección de sokoban
        // y de cripta. Una tarea en un cuarto sellado no es difícil, es imposible,
        // y encima parecería que la tripulación juega mal.
        const centro = rooms[0]
            ? { x: Math.floor(rooms[0].x + rooms[0].width / 2), y: Math.floor(rooms[0].y + rooms[0].height / 2) }
            : { x: 1, y: 1 };
        muros.delete(idx(centro));
        const libres = [...alcanzables(muros, centro)];
        const sacar = () => libres.splice(Math.floor(azar() * libres.length), 1)[0];

        const tareas = Array.from({ length: TAREAS }, () => ({ i: sacar(), hecha: false }));
        const gente = SILLAS.map((s) => ({ silla: s, ...punto(sacar()), vivo: true }));
        const impostor = SILLAS[Math.floor(azar() * SILLAS.length)];

        return {
            semilla, azar, muros, tareas, gente, impostor,
            cadaveres: [], oculta: {}, junta: false, votos: {},
            turno: SILLAS[0], ronda: 0, tope: RONDAS,
            expulsado: null, historial: [],
            normas: normasDe(opts.normas),
            /**
             * La junta ya no es un voto pelado: primero se habla. `faseJunta` dice
             * en cuál de las dos partes estamos, y `dichos` guarda lo dicho —que es
             * PÚBLICO: son acusaciones a la cara, no información oculta—.
             */
            faseJunta: null, rondaDebate: 0, dichos: [],
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
            if (cerca(q, yo) <= VISTA && hayLinea(esMuroDe(p), yo, q)) sinVista[i] = 0;
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
            if (cerca(g, yo) <= VISTA && hayLinea(esMuroDe(p), yo, g)) {
                piezas.push({ x: g.x, y: g.y, t: `tripulante_${g.silla}`, de: 2 });
            }
        }
        piezas.push({ x: yo.x, y: yo.y, t: 'yo', de: 0 });

        return {
            rejilla: { ambiente: 'metal', ancho: ANCHO, alto: ALTO, celdas, sinVista },
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
             /**
              * ⚠️ EL DEBATE TIENE QUE ESTAR EN EL TEXTO, NO SÓLO EN EL ESTADO.
              *
              * Ésta es la puerta por la que juega un agente sin vista. Si lo dicho
              * viajara sólo como campo, el agente tendría que deducir de un debate
              * que no puede leer — y estaríamos midiéndolo en un juego distinto del
              * que juega una persona. Es la misma lección que costó que el objetivo
              * no llegara a las salas.
              */
             + (st.junta && st.fase_junta === 'debate'
                 ? `⚠ JUNTA — se habla (ronda ${p.rondaDebate + 1} de ${p.normas.rondasDeDebate}).`
                   + ` Acusa, respalda o calla; todos habláis A LA VEZ.\n`
                   + (st.dichos.length
                       ? `Dicho hasta ahora: ${st.dichos.map(d => `${d.quien} ${d.dijo.replace(':', ' a ')}`).join(' · ')}\n`
                       : 'Nadie ha hablado todavía.\n')
                 : st.junta
                 ? `⚠ JUNTA — se vota. El más votado sale por la esclusa.\n`
                   + (st.dichos.length
                       ? `Se dijo: ${st.dichos.map(d => `${d.quien} ${d.dijo.replace(':', ' a ')}`).join(' · ')}\n`
                       : '')
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
        else if (p.junta && p.faseJunta === 'debate') {
            legales = jugadasDeDebate(vivos, p.turno);
        }
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
            // La norma viaja en el estado porque viaja en el recibo: con
            // `rondasDeDebate` distinto, la misma lista de jugadas es legal o
            // ilegal, y `{juego, semilla, jugadas}` dejaría de bastar.
            normas: p.normas,
            fase_junta: p.faseJunta,
            /**
             * ⚠️ LA FORMA DE LO QUE NO SE PUEDE ENUMERAR.
             *
             * `legal_moves` lista lo que se puede elegir; esto declara lo que se
             * puede escribir. El verificador acepta una jugada que encaje aquí y
             * CUENTA cuántas pasaron por este camino, para que el recibo diga qué
             * parte se auditó contra una lista y qué parte contra una forma.
             *
             * Sólo durante el debate y sólo con la norma puesta: fuera de ahí, una
             * frase no es una jugada.
             */
            ...(p.junta && p.faseJunta === 'debate' && p.normas?.hablaLibre
                ? { legal_patterns: [`^decir:.{1,${LARGO_FRASE}}$`] } : {}),
            /**
             * Lo dicho es PÚBLICO y va entero: son acusaciones a la cara. Sin
             * esto, un agente sin vista tendría que deducir de un debate que no
             * puede leer, que es pedirle que juegue a otra cosa.
             */
            dichos: p.dichos.map(d => ({ ronda: d.ronda, quien: d.silla, dijo: d.jugada })),
            acusaciones: acusacionesPorSilla(p.dichos),
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
            legal_moves: legales,
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const orden = String(jugada);
        const st = this.estado(p, SILLAS.indexOf(p.turno));
        if (st.is_game_over) return false;
        /**
         * ⚠️ UNA JUGADA VALE SI ESTÁ EN LA LISTA **O** SI ENCAJA EN LA FORMA.
         *
         * Es la misma regla que aplica el verificador, y tiene que serlo: si aquí
         * se aceptara algo que allí se rechaza, se podrían jugar partidas que
         * después no se pueden demostrar. La forma sólo existe durante el debate y
         * sólo con `hablaLibre`, así que fuera de ahí esto no cambia nada.
         */
        const encaja = (st.legal_patterns ?? []).some(re => new RegExp(re).test(orden));
        if (!encaja && !st.legal_moves.includes(orden)) return false;

        // ⚠️ Se GUARDA, no se aplica: nadie ve lo que han elegido los demás hasta
        // que ya no se puede cambiar de idea. Es el mecanismo de `frentes`.
        p.oculta[p.turno] = orden;

        const vivos = p.gente.filter(g => g.vivo);
        const siguiente = vivos.find(g => !(g.silla in p.oculta));
        if (siguiente) { p.turno = siguiente.silla; return true; }

        if (!p.junta) this._resolverRonda(p);
        else if (p.faseJunta === 'debate') this._resolverDebate(p);
        else this._resolverJunta(p);
        p.oculta = {};
        p.ronda++;
        p.turno = p.gente.find(g => g.vivo).silla;
        return true;
    },

    /**
     * Se apunta lo dicho y se pasa a la ronda siguiente; agotadas, se vota.
     *
     * ⚠️ SE REVELA AL CERRAR LA RONDA, NO AL HABLAR. Es lo mismo que hace el resto
     * del juego con los movimientos: si lo dicho se viera al momento, el último en
     * hablar tendría toda la información y el primero ninguna, y el orden de las
     * sillas —que es fijo— repartiría ventaja.
     */
    _resolverDebate(p) {
        for (const [silla, jugada] of Object.entries(p.oculta)) {
            p.dichos.push({ ronda: p.rondaDebate, silla, jugada });
            if (jugada !== 'callar') p.historial.push(`${silla} ${jugada.replace(':', ' a ')}`);
        }
        p.rondaDebate++;
        if (p.rondaDebate >= (p.normas?.rondasDeDebate ?? 0)) p.faseJunta = 'voto';
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
            if (p.gente.some(g => g.vivo && cerca(punto(c.i), g) <= VISTA && hayLinea(esMuroDe(p), g, punto(c.i)))) {
                c.avisado = true; p.junta = true;
                // Cada junta empieza con su debate y con la pizarra limpia: lo que
                // se dijo en la junta anterior ya se resolvió con una expulsión, y
                // arrastrarlo haría que las acusaciones viejas siguieran contando.
                p.faseJunta = (p.normas?.rondasDeDebate ?? 0) > 0 ? 'debate' : 'voto';
                p.rondaDebate = 0; p.dichos = [];
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
        p.junta = false; p.faseJunta = null;
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

        const cadaver = sus.piezas.find(z => z.t === 'cadaver');
        const aLaVistaEnJunta = sus.piezas.filter(z => z.t.startsWith('tripulante_'));
        const masCercaDelCadaver = cadaver && aLaVistaEnJunta
            .slice().sort((a, b) => cerca(a, cadaver) - cerca(b, cadaver))[0];

        /**
         * ⚠️ LA CASA HABLA, Y SOBRE TODO VOTA HACIENDO CASO DE LO DICHO.
         *
         * Esto último es lo que convierte el debate en juego. Si la casa hablara y
         * luego votara ignorando el debate, acusar no serviría de nada: sería un
         * botón bonito que no mueve una sola partida, y el banco lo mediría como
         * ruido igual que antes.
         *
         * Sigue siendo un techo BLANDO a propósito, como el resto de esta casa: no
         * detecta contradicciones, no recuerda quién mintió en la junta anterior y
         * se cree la última acusación. Si dedujera bien, la tabla mediría a mi
         * heurística en vez de al agente.
         */
        if (p.junta && p.faseJunta === 'debate') {
            const acusados = acusacionesPorSilla(p.dichos);
            const mas = Object.entries(acusados).sort((a, b) => b[1] - a[1])[0];

            if (st.soy_impostor) {
                // Desviar: si ya hay alguien señalado y no soy yo, arrimarse al
                // linchamiento —es gratis y funciona—. Si no, señalar al que está
                // MÁS LEJOS del cadáver, que es el que menos papeletas tiene: una
                // acusación creíble no vale, porque acabaría cayendo el culpable.
                if (mas && `acuso:${mas[0]}` !== `acuso:${st.silla}` && legales.includes(`acuso:${mas[0]}`)) {
                    return `acuso:${mas[0]}`;
                }
                const lejos = cadaver && aLaVistaEnJunta
                    .slice().sort((a, b) => cerca(b, cadaver) - cerca(a, cadaver))[0];
                const tiro = lejos && `acuso:${lejos.t.slice(-1)}`;
                if (tiro && legales.includes(tiro)) return tiro;
                return 'callar';
            }
            // Tripulante: si vi a alguien junto al cadáver, lo digo. Si no vi nada
            // pero tengo a alguien delante AHORA, lo respaldo — es lo único que sé
            // de verdad, y una coartada es información igual que una acusación.
            const señalo = masCercaDelCadaver && `acuso:${masCercaDelCadaver.t.slice(-1)}`;
            if (señalo && legales.includes(señalo)) return señalo;
            if (aLaVistaEnJunta.length === 1) {
                const aval = `defiendo:${aLaVistaEnJunta[0].t.slice(-1)}`;
                if (legales.includes(aval)) return aval;
            }
            return 'callar';
        }

        if (p.junta) {
            // 1) Lo que vi con mis ojos manda sobre lo que me han contado.
            const voto = masCercaDelCadaver && `voto:${masCercaDelCadaver.t.slice(-1)}`;
            if (voto && legales.includes(voto)) return voto;
            // 2) Si no vi nada, me fío del debate: el más acusado, y nunca yo.
            const acusados = acusacionesPorSilla(p.dichos);
            const mas = Object.entries(acusados)
                .filter(([s]) => s !== st.silla)
                .sort((a, b) => b[1] - a[1])[0];
            if (mas && legales.includes(`voto:${mas[0]}`)) return `voto:${mas[0]}`;
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

/** Lo pisable desde un punto. Sin esto, una sala sellada arruina la partida. */
function alcanzables(muros, desde) {
    const visto = new Set([idx(desde)]);
    const cola = [desde];
    while (cola.length) {
        const n = cola.shift();
        for (const d of Object.values(DIRS)) {
            const q = suma(n, d);
            if (!dentro(q.x, q.y) || muros.has(idx(q)) || visto.has(idx(q))) continue;
            visto.add(idx(q)); cola.push(q);
        }
    }
    return visto;
}


