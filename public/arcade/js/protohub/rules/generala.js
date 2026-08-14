/**
 * generala.js — el rincón OPUESTO del parchís en el contrato del sustrato
 * ═══════════════════════════════════════════════════════════════════════════
 * Cinco dados. Tiras, apartas los que te sirven, vuelves a tirar hasta dos veces
 * más, y anotas en una de las once casillas de la hoja. Cada casilla se anota UNA
 * vez, y cuando no entra nada se tacha con cero. Gana quien más suma al llenarla.
 *
 * ⚠️ POR QUÉ ESTE JUEGO, Y QUÉ VINO A PROBAR
 *
 * `parchis.js` demostró que un dado cabe en el contrato usando las TRES
 * estructuras a la vez: rejilla, piezas y zonas. La pregunta que dejaba abierta es
 * la contraria — **¿aguanta el contrato un juego que no tenga tablero en absoluto?**
 * La generala es exactamente eso: no hay rejilla, no hay piezas, y todo el estado
 * visible son DOS MONTONES sobre la mesa (los dados sueltos y los apartados) más
 * una hoja de papel. Si el parchís entra por un extremo y la generala por el otro
 * sin tocar una línea de `sustrato.js`, el contrato aguanta los dos extremos.
 *
 *     rejilla  null        no hay terreno: la mesa es la mesa
 *     piezas   []          nada se mueve por ninguna casilla
 *     zonas    dados · guardados · hoja de cada jugador
 *
 * Y la distinción entre `dados` y `guardados` no es decoración: **es el juego**.
 * Toda la decisión de un turno es qué pasa de un montón al otro.
 *
 * ⚠️ EL AZAR SÓLO SE GASTA EN JUGADAS ACEPTADAS
 *
 * Una partida se verifica VOLVIÉNDOLA A JUGAR con `{juego, semilla, jugadas}`, y la
 * re-simulación repite sólo las jugadas ACEPTADAS. Si `mover()` tirara los dados
 * antes de rechazar una jugada ilegal, la partida viva habría consumido azar que la
 * re-simulación no consume: los dos hilos se desfasan y **el verificador rechazaría
 * partidas legítimas**. Aquí sólo hay UN sitio en todo el fichero donde se llama a
 * `p._rnd()`, y está detrás de la comprobación contra `legales(p)`. Misma disciplina
 * que `parchis.js` y `remigio.js`.
 *
 * Y ni `estado()` ni `sugerencia()` lo tocan. `estado()` lo llama la mesa CADA
 * SEGUNDO para repintar: si consumiera azar, la partida cambiaría por mirarla y dos
 * personas viendo la misma mesa verían partidas distintas. Para desempatar,
 * `sugerencia()` usa el hash sin estado `revuelto(semilla ^ nº de jugadas)`.
 *
 * ⚠️ UN DADO APARTADO SE QUEDA APARTADO. NO HAY `soltar`, Y ES A PROPÓSITO.
 *
 * En la generala de mesa puedes recoger un dado que ya habías apartado. Aquí no, y
 * la razón es de terminación, no de pereza: con `guardar` y `soltar` el turno es un
 * grafo CON CICLOS —guardar:3, soltar:3, guardar:3…— y una partida puede no acabar
 * nunca sin que nada falle ni avise. Un agente en bucle no da error: da una mesa
 * que parece pensando. Sin `soltar`, cada turno es monótono y tiene un techo
 * demostrable —a lo sumo 3 tiradas + 5 apartados + 1 anotación = 9 jugadas—, así
 * que la partida entera cabe en `11 × jugadores × 9` y la terminación es una
 * propiedad de las reglas, no de la buena voluntad de quien juegue. Se paga con un
 * poco de fidelidad y se dice aquí para que nadie compare marcadores creyendo que
 * son la misma generala.
 *
 * ⚠️ SIMPLIFICACIONES, DECLARADAS
 * · La generala servida NO gana la partida en el acto (regla de casa habitual).
 *   Vale 55 y se sigue jugando. Con muerte súbita la mitad de las partidas acaban
 *   con nueve casillas vacías y el marcador deja de ordenar nada, que es justo lo
 *   que este entorno tiene que hacer.
 * · El full exige 3+2 exactos: cinco iguales NO valen de full. El póker sí acepta
 *   la generala (4 o 5 iguales), que es la regla corriente.
 * · No hay premio por la fila de arriba: eso es del Yahtzee, no de la generala.
 */

import { mulberry32, revuelto } from './azar.js';

/** Cinco dados de seis caras y tres tiradas. Todo lo demás se deriva de esto. */
const DADOS = 5;
const CARAS = 6;
const TIRADAS = 3;
/** Lo que suma una combinación SERVIDA, o sea hecha en la primera tirada. */
const SERVIDA = 5;

/** `conteo[c]` = cuántos dados muestran la cara `c`. El índice 0 no se usa. */
function contar(caras) {
    const c = new Array(CARAS + 1).fill(0);
    for (const d of caras) c[d]++;
    return c;
}

/**
 * ⚠️ LA ESCALERA DEL RÍO DE LA PLATA TIENE UNA EXCEPCIÓN, Y NO SE ESCRIBE A MANO.
 *
 * Son corridas de cinco caras distintas: 1-2-3-4-5 y 2-3-4-5-6. Y además
 * 3-4-5-6-1, donde el 1 hace de 7 — es la única que da la vuelta, y aquí se
 * calcula como «las DADOS-1 caras más altas, más el 1» en vez de teclearla. En un
 * juego de otro tamaño seguiría saliendo bien, y sobre todo no hay una lista que
 * pueda separarse en silencio de `DADOS` y `CARAS` el día que alguien los cambie.
 */
const ALTAS = Array.from({ length: DADOS - 1 }, (_, i) => CARAS - i).reverse();
function esEscalera(caras) {
    const u = [...new Set(caras)].sort((a, b) => a - b);
    if (u.length !== DADOS) return false;
    if (u[DADOS - 1] - u[0] === DADOS - 1) return true;      // corrida normal
    return u[0] === 1 && u.slice(1).join() === ALTAS.join(); // la que da la vuelta
}

/**
 * LAS ONCE CASILLAS DE LA HOJA.
 *
 * Las seis de números se DERIVAN de `CARAS` — escribirlas a mano sería una lista
 * paralela más, y este repositorio ya ha pagado seis veces por una de ésas.
 *
 * `potencial` es lo máximo que puede dar la casilla. No es adorno: es lo que usa el
 * rival de la casa para decidir CUÁL tachar cuando no entra nada, sin que haya que
 * mantener un orden de preferencia escrito aparte que se separe de los puntos.
 */
const NUMEROS = Array.from({ length: CARAS }, (_, i) => i + 1).map(n => ({
    id: String(n),
    especial: false,
    potencial: DADOS * n,
    // Los números suman las caras que salieron, no cuentan combinaciones.
    valor: (conteo) => conteo[n] * n,
}));

const ESPECIALES = [
    { id: 'escalera', base: 20, vale: (c, caras) => esEscalera(caras) },
    // 3+2 exactos: dos caras distintas y ninguna con cinco.
    { id: 'full', base: 30, vale: (c) => {
        const grupos = c.filter(Boolean).sort((a, b) => a - b);
        return grupos.length === 2 && grupos[0] === 2 && grupos[1] === 3;
    } },
    // Cuatro iguales o más: una generala también vale de póker.
    { id: 'poker', base: 40, vale: (c) => c.some(n => n >= DADOS - 1) },
    { id: 'generala', base: 50, vale: (c) => c.some(n => n === DADOS) },
    /**
     * La generala doble sólo se puede anotar si YA tienes la generala hecha; si no,
     * la casilla se tacha con cero. Es la regla de la hoja de verdad, y además es lo
     * que impide que valga 100 puntos gratis en la primera generala de la partida.
     */
    { id: 'doble', base: 100, vale: (c, caras, hoja) =>
        c.some(n => n === DADOS) && hoja.generala > 0 },
].map(e => ({
    id: e.id,
    especial: true,
    potencial: e.base + SERVIDA,
    valor: (conteo, caras, hoja) => (e.vale(conteo, caras, hoja) ? e.base : 0),
}));

const CATEGORIAS = [...NUMEROS, ...ESPECIALES];
const POR_ID = Object.fromEntries(CATEGORIAS.map(c => [c.id, c]));

/**
 * Lo que vale anotar `cat` con estos dados. `tiradas` entra porque el premio de la
 * servida NO es una propiedad de los dados sino de CUÁNDO salieron: los mismos
 * cinco valen 30 en la tercera tirada y 35 en la primera.
 */
function puntuar(cat, caras, hoja, tiradas) {
    if (caras.length !== DADOS) return 0;
    const base = cat.valor(contar(caras), caras, hoja);
    return base > 0 && cat.especial && tiradas === 1 ? base + SERVIDA : base;
}

const total = (hoja) => CATEGORIAS.reduce((s, c) => s + (hoja[c.id] ?? 0), 0);
const llena = (hoja) => CATEGORIAS.every(c => hoja[c.id] !== null);

export function crearGenerala({ jugadores = 2 } = {}) {
    /** Los cinco dados del turno: los apartados más los que siguen sueltos. */
    const mano = (p) => [...p.guardados, ...p.dados];

    /**
     * Las jugadas legales de quien tiene el turno.
     *
     * ⚠️ EL ORDEN NO ES INDIFERENTE, Y NO ES ESTÉTICA.
     *
     * `tirar` y `anotar` van ANTES que `guardar` a propósito. Una política ingenua
     * —«la primera legal», que es el control con el que se calibra este entorno— se
     * queda enganchada en lo primero que le ofrezcas: si `guardar` fuera lo primero,
     * apartaría los cinco dados y luego no tendría nada que hacer, y con un `soltar`
     * en la lista giraría para siempre. Poniendo `tirar` delante, cualquier política
     * que lea de arriba abajo TERMINA. Es la misma decisión que toma `parchis.js`.
     */
    function legales(p) {
        if (p.fin) return [];
        const out = [];
        // Se puede tirar mientras queden tiradas y haya algún dado suelto que tirar.
        // El `tiradas === 0` es el arranque del turno, cuando aún no hay dados.
        if (p.tiradas < TIRADAS && (p.tiradas === 0 || p.dados.length > 0)) out.push('tirar');
        if (p.tiradas === 0) return out;

        const hoja = p.hojas[p.turno];
        for (const c of CATEGORIAS) if (hoja[c.id] === null) out.push(`anotar:${c.id}`);

        // Apartar sólo tiene sentido si va a quedar otra tirada. Ofrecerlo en la
        // tercera sería una jugada que no cambia nada, y una jugada que no cambia
        // nada es ruido en `legal_moves` para quien juegue leyendo texto.
        if (p.tiradas < TIRADAS) {
            for (const cara of [...new Set(p.dados)].sort((a, b) => a - b)) {
                out.push(`guardar:${cara}`);
            }
        }
        return out;
    }

    /** Cierra el turno: pasa la mano y limpia la mesa. */
    function siguienteTurno(p) {
        p.turno = (p.turno + 1) % jugadores;
        p.tiradas = 0;
        p.dados = [];
        p.guardados = [];
        if (p.hojas.every(llena)) {
            p.fin = true;
            const totales = p.hojas.map(total);
            p.ganador = totales.indexOf(Math.max(...totales));
        }
    }

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: sumar la mayor puntuacion posible combinando tiradas de dados.',
        nombre: 'generala',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            return {
                semilla, jugadores,
                turno: 0, tiradas: 0,
                dados: [], guardados: [],
                hojas: Array.from({ length: jugadores },
                                  () => Object.fromEntries(CATEGORIAS.map(c => [c.id, null]))),
                jugadas: [], fin: false, ganador: null,
                // El azar vive DENTRO de la partida y se siembra de la semilla: es
                // lo que hace que `{juego, semilla, jugadas}` se pueda re-jugar.
                _rnd: mulberry32(semilla),
            };
        },

        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < jugadores ? asiento : 0;
            const caras = mano(p);
            const hoja = p.hojas[p.turno];

            /**
             * ⚠️ EL MARCADOR PUNTÚA LO ANOTADO, NO SÓLO SI GANASTE.
             *
             * Si sólo contara ganar, dos agentes flojos empatarían a cero y la tabla
             * no ordenaría nada — el aviso está escrito en `sokoban.js` y en
             * `parchis.js`, y aquí muerde el doble porque en la generala se pierde
             * por diferencias de veinte puntos. Lo anotado hasta ahora ya es crédito
             * parcial y ordena desde la primera casilla; ganar añade una prima.
             */
            const puntos = total(p.hojas[yo]) + (p.fin && p.ganador === yo ? 50 : 0);

            return {
                juego: 'generala',
                asiento: yo,
                // Los dados se publican como valores Y como zonas: los números para
                // quien juega sin ver, las zonas para la mesa. Es el mismo dato.
                dados: [...p.dados],
                guardados: [...p.guardados],
                tiradas: p.tiradas,
                tiradas_restantes: TIRADAS - p.tiradas,
                fase: p.tiradas === 0 ? 'tirar' : (p.tiradas < TIRADAS ? 'apartar' : 'anotar'),
                // La hoja de anotación de TODOS, legible: `null` es casilla libre y
                // `0` es casilla tachada, que no son lo mismo y deciden el final.
                hojas: p.hojas.map(h => ({ ...h })),
                mi_hoja: { ...p.hojas[yo] },
                // Lo que valdría anotar ahora mismo en cada casilla libre. Es
                // información derivada de los dados, que están a la vista: no
                // filtra nada, y sin ella un agente de texto tiene que reimplementar
                // el reglamento para jugar — que es justo la segunda fuente de
                // verdad que este proyecto persigue.
                valores: p.tiradas === 0 ? {} : Object.fromEntries(
                    CATEGORIAS.filter(c => hoja[c.id] === null)
                              .map(c => [c.id, puntuar(c, caras, hoja, p.tiradas)])),
                totales: p.hojas.map(total),
                puntos,
                score: puntos,
                turn: p.turno === 0 ? 'player' : `cpu${p.turno}`,
                semilla: p.semilla,
                legal_moves: legales(p),
                is_game_over: p.fin,
                desenlace: p.fin ? `ganó ${p.ganador}` : null,
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset' || p.fin) return false;
            // ⚠️ Se comprueba contra la lista legal ANTES de tocar nada. Ver la nota
            // de la cabecera: gastar azar en una jugada que luego se rechaza
            // desincroniza la re-simulación y convierte a un jugador honesto en un
            // tramposo a ojos del verificador.
            if (!legales(p).includes(j)) return false;

            if (j === 'tirar') {
                // Se tiran sólo los sueltos; los apartados no se vuelven a tirar.
                // Ordenados porque un dado no tiene identidad: sólo importa la cara,
                // así que dos mesas equivalentes se escriben igual y el texto que lee
                // un modelo no cambia por el orden en que cayeron.
                const n = DADOS - p.guardados.length;
                p.dados = Array.from({ length: n }, () => 1 + Math.floor(p._rnd() * CARAS))
                               .sort((a, b) => a - b);
                p.tiradas++;
                p.jugadas.push(j);
                return true;
            }

            if (j.startsWith('guardar:')) {
                const cara = Number(j.slice(8));
                p.dados.splice(p.dados.indexOf(cara), 1);
                p.guardados.push(cara);
                p.guardados.sort((a, b) => a - b);
                p.jugadas.push(j);
                return true;
            }

            // anotar:<categoría>
            const cat = POR_ID[j.slice(7)];
            const hoja = p.hojas[p.turno];
            hoja[cat.id] = puntuar(cat, mano(p), hoja, p.tiradas);
            p.jugadas.push(j);
            siguienteTurno(p);
            return true;
        },

        /**
         * El rival de la casa. Aparta los dados de la cara más repetida, vuelve a
         * tirar, y cuando tiene algo que valga la pena lo anota; si no le entra nada,
         * tacha la casilla más barata que le quede.
         *
         * Deja techo a propósito: va siempre a por iguales, así que **nunca persigue
         * una escalera** —si le sale servida la cobra, pero no la busca— y no mira lo
         * que le queda libre en la hoja al decidir qué apartar, que es donde está el
         * juego de verdad.
         *
         * ⚠️ NO CONSUME `p._rnd`. Ver la cabecera: el azar de la partida es sagrado y
         * esto se llama fuera de la secuencia de jugadas. Para desempatar usa el hash
         * sin estado de la semilla y el número de jugada, como `parchis.js`.
         */
        sugerencia(p) {
            const ops = legales(p);
            if (!ops.length) return null;
            if (ops.length === 1) return ops[0];

            const hoja = p.hojas[p.turno];
            const caras = mano(p);
            const mezcla = revuelto(p.semilla ^ p.jugadas.length);

            // La mejor anotación disponible ahora mismo. A igualdad de puntos —y el
            // caso que importa es el de anotar CERO— se gasta la casilla de menor
            // potencial, que es la que menos duele perder. Se lee de `potencial`, no
            // de un orden de preferencia escrito aparte.
            const mejor = ops
                .filter(m => m.startsWith('anotar:'))
                .map(m => ({ m, c: POR_ID[m.slice(7)] }))
                .map(x => ({ ...x, pts: puntuar(x.c, caras, hoja, p.tiradas) }))
                .sort((a, b) => b.pts - a.pts
                             || a.c.potencial - b.c.potencial
                             || ((mezcla % 2) ? 1 : -1))[0];

            // Sin tiradas por delante no hay nada que pensar: hay que anotar.
            if (!ops.includes('tirar') && !ops.some(m => m.startsWith('guardar:'))) return mejor.m;
            // Una combinación hecha se cobra y no se arriesga. El umbral es el de la
            // escalera: por debajo de eso lo que hay es un montón de números sueltos
            // y conviene seguir tirando.
            if (mejor && mejor.pts >= 20) return mejor.m;
            if (p.tiradas >= TIRADAS) return mejor.m;

            // Construir: apartar todos los dados de la cara más repetida. A igualdad
            // de repeticiones se queda la cara ALTA, que no es un desempate sino una
            // preferencia — cuatro seises valen más que cuatro doses.
            const conteo = contar(caras);
            let objetivo = 1;
            for (let c = 1; c <= CARAS; c++) if (conteo[c] >= conteo[objetivo]) objetivo = c;
            const g = `guardar:${objetivo}`;
            if (ops.includes(g)) return g;
            // Ya están apartados todos los de esa cara: a tirar el resto.
            if (ops.includes('tirar')) return 'tirar';
            return mejor.m;
        },

        /**
         * ⚠️ SUSTRATO NATIVO SIN REJILLA Y SIN PIEZAS. Es lo que este juego vino a
         * demostrar: que el contrato aguanta también el extremo contrario al del
         * parchís. Aquí no hay terreno ni nada que se mueva por él — todo el estado
         * visible son montones sobre la mesa.
         *
         * ⚠️ Y POR ESO ESTA PÁGINA DECLARA `visualizador: 'mesa_tablero.mjs'`.
         * `montarMesa` elige la mesa de casino para «zonas y ninguna rejilla», que es
         * exactamente esta forma; pero `mesa_cartas.mjs` leía `sustratoDe(juego,
         * estado)` —el adaptador—, que sólo conoce manos, mazos y descartes: con
         * generala no habría encontrado ninguna zona y la mesa habría dicho «este
         * juego no reparte cartas» sobre un fieltro vacío, sin un error en consola.
         *
         * Eso YA ESTÁ ARREGLADO: la mesa de cartas pregunta ahora a
         * `ProtoHub.sustrato()`, que elige entre nativo y derivado donde se puede
         * elegir. La declaración se conserva igualmente porque la mesa de tablero
         * sigue siendo la buena para unos dados: la de casino dibuja naipes.
         */
        sustrato(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && asiento < jugadores ? asiento : 0;
            /**
             * ⚠️ ANTES DE LA PRIMERA TIRADA NO HAY NADA SOBRE LA MESA, Y ESO SE LEE
             * COMO UN FALLO.
             *
             * `p.dados` está vacío hasta que alguien tira, así que el sustrato no
             * traía ni un item y la pantalla salía NEGRA con un botón `tirar` en la
             * esquina. No era mentira —no hay dados tirados— pero es exactamente la
             * imagen de las mesas rotas de esta mañana, y el laboratorio la marcó:
             * 0,3% de pantalla pintada.
             *
             * En una mesa de verdad los cinco dados están ahí, en el cubilete,
             * esperando. Eso es `ocultas`: existen y no se sabe qué cara traen.
             */
            const tirados = p.dados.length + p.guardados.length;
            const zonas = [
                // Los sueltos: de nadie, están sobre la mesa y se van a volver a tirar.
                { id: 'dados', de: null, items: p.dados.map(d => `d6_${d}`),
                  ocultas: tirados ? 0 : DADOS },
                // Los apartados: de quien tiene el turno. La diferencia entre estos
                // dos montones ES la decisión del juego, por eso son dos zonas y no
                // una con una marca.
                { id: 'guardados', de: p.turno, items: p.guardados.map(d => `d6_${d}`), ocultas: 0 },
            ];
            // Y la hoja de cada uno, que es información pública: cuántas casillas le
            // quedan libres a cada jugador decide a qué puede aspirar todavía.
            p.hojas.forEach((h, c) => {
                const anotadas = CATEGORIAS.filter(k => h[k.id] !== null).map(k => `hoja_${k.id}`);
                if (anotadas.length) zonas.push({ id: 'hoja', de: c, items: anotadas, ocultas: 0 });
            });
            return {
                rejilla: null,
                piezas: [],
                zonas,
                leyenda: { dados: 'dados sueltos', guardados: 'dados apartados',
                           hoja: 'casillas anotadas', asiento: yo },
            };
        },

        deshacer() { return false; },
    };
}
