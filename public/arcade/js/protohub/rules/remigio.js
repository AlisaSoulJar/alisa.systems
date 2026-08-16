/**
 * remigio.js — el rummy español: robar, combinar y cerrar
 * ═══════════════════════════════════════════════════════════════════════════
 * Tienes diez cartas. En tu turno robas una —del mazo, a ciegas, o la de encima
 * del descarte, que todos han visto— y tiras otra. Ganas cuando tus diez forman
 * combinaciones enteras:
 *
 *     TRÍO      tres o más del mismo número          7♠ 7♥ 7♦
 *     ESCALERA  tres o más seguidas del mismo palo   4♣ 5♣ 6♣
 *
 * POR QUÉ ESTE JUEGO ENTRA EN EL BANCO DE PRUEBAS
 *
 * Los treinta anteriores tienen información oculta de dos maneras: la que nadie
 * ve (la mano del rival en la brisca) y la que se revela al ACTUAR (preguntar en
 * el go fish, apostar en el póker). Aquí hay una tercera, y no la teníamos:
 * **información que revelas al ELEGIR entre dos fuentes**.
 *
 * Robar del descarte te da exactamente la carta que necesitas, y le dice al rival
 * exactamente qué estás juntando. Robar del mazo no dice nada y casi nunca sirve.
 * Cada turno hay que decidir cuánto vale el secreto, y no hay forma de jugar sin
 * pagar uno de los dos precios. Eso no lo mide ningún otro de la casa.
 *
 * La otra mitad es el descarte: cada carta que tiras es una que el rival puede
 * coger. Tirar el 7 que a ti te sobra puede ser el 7 que a él le cierra. Un
 * agente que sólo mire su propia mano juega la mitad del juego, y la otra mitad
 * es visible y medible — que es lo que hace que el entorno separe a alguien.
 *
 * ⚠️ EL AS VA POR LOS DOS LADOS, Y ESO SE DECLARA
 * `A 2 3` y `Q K A` valen; `K A 2` no. La biblioteca ordena los rangos con el as
 * al final, así que una escalera construida sobre ese orden a secas dejaría fuera
 * el `A 2 3`, que en un rummy es de las más comunes. Se resuelve poniendo el as
 * dos veces en el orden de escaleras —al principio y al final—, con lo que las
 * dos salen y la que da la vuelta no puede salir. Es una regla del juego, no un
 * detalle: quien compare resultados con otra implementación tiene que saberlo.
 *
 * ⚠️ SIN COMODINES, TAMBIÉN A PROPÓSITO
 * El remigio de mesa suele llevarlos. Aquí no, porque un comodín multiplica las
 * particiones posibles de una mano y convierte «¿esto está cerrado?» en un
 * problema bastante más caro — y esa pregunta se contesta en CADA jugada legal de
 * CADA turno. Prefiero un juego que corre rápido en el navegador y en el gym a
 * uno más rico que haga esperar. Si algún día hacen falta, el buscador de abajo
 * es donde entrarían.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { mulberry32, barajar } from './azar.js';
import { RUTA_BIBLIOTECA, palo, rango, cargarBaraja, cartasDe } from './baraja.js';

/**
 * Lo que vale una carta suelta al final. Las figuras cuestan diez: es lo que
 * hace que quedarse con un rey «por si acaso» sea una decisión y no un descuido.
 */
const VALOR_FIGURA = { J: 10, Q: 10, K: 10, A: 1 };
const valorDe = (c) => VALOR_FIGURA[rango(c)] ?? Number(rango(c)) ?? 0;

/** Índice del bit más bajo. `clz32` es exacto; `log2` no lo es para todo. */
const bitBajo = (m) => 31 - Math.clz32(m & -m);

/**
 * @param {Object} opts
 * @param {number} opts.jugadores  2 — con más, el descarte pasa por tantas manos
 *                                 que la señal que lo hace interesante se diluye
 * @param {number} opts.mano       10, el reparto habitual
 */
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  ⚠️ «¿REMIGIO NO IRÍA CON LA BARAJA ESPAÑOLA Y DOS BARAJAS?»
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Aviso de betatester, 14-08-2026. Lo dejo contestado aquí, que es donde vive la
 * decisión, en vez de en un hilo que se pierde.
 *
 * ⚠️ LO DE LA BARAJA ESPAÑOLA YA ESTÁ RESUELTO, Y NO AQUÍ.
 *
 * `card_library.json` distingue las dos familias por su nombre:
 *
 *     chinchon     spanish_48        ← el rummy de baraja española
 *     gin_rummy    french_52
 *     rummy_basic  french_52
 *
 * O sea que el rummy con española tiene su propio juego y sus propias reglas
 * —chinchón se corta a 7 puntos, cuenta cartas muertas, y el as vale distinto—.
 * Cambiarle la baraja a éste no daría chinchón: daría un remigio raro con cuarenta
 * y ocho cartas y las reglas de otro juego. Si hace falta chinchón, es un juego
 * nuevo apoyado en esta misma maquinaria, no una variante de éste.
 *
 * ⚠️ LO DE DOS BARAJAS SÍ ES UNA VARIANTE, Y CUESTA MÁS DE LO QUE PARECE.
 *
 * No es duplicar la lista. Todo este proyecto direcciona las cartas por su
 * identidad —`jugar:S_A` es una jugada legal y viaja al recibo—, y con dos barajas
 * hay DOS `S_A`. En cuanto existen dos, «juega el as de picas» deja de señalar una
 * carta, y eso rompe tres cosas a la vez: las jugadas legales dejan de ser únicas,
 * el verificador no puede re-simular un recibo, y el pintor no sabe cuál mover.
 *
 * Haría falta un sufijo de copia (`S_A#2`) y que lo entiendan `palo()`, `rango()`,
 * el `parseCardId` del render y el descriptor de texto. Y el chequeo de tríos, que
 * hoy se ahorra comparar palos porque con UNA baraja el mismo rango ya implica
 * palos distintos — está anotado abajo, en `combinaciones`.
 *
 * Es hacedero y es media tarde de trabajo con riesgo repartido por cuatro sitios.
 * No lo hago de madrugada sobre una pregunta: queda dicho el coste para que se
 * decida con el número delante.
 */
export async function crearRemigio({ url = RUTA_BIBLIOTECA, jugadores = 2, mano = 10 } = {}) {
    const baraja = await cargarBaraja('french_52', url);

    /**
     * El orden para ESCALERAS, con el as en las dos puntas. Ver la nota de
     * arriba. Se construye del orden de la biblioteca y no de una lista escrita
     * a mano: si un día la baraja cambia de rangos, esto la sigue.
     */
    const ORDEN = (() => {
        const r = [...baraja.ranks];
        const as = r.indexOf('A');
        if (as === -1) return r;                     // baraja sin as: tal cual
        return [r[as], ...r.filter((_, i) => i !== as), r[as]];
    })();

    /**
     * ⚠️ TODAS LAS COMBINACIONES POSIBLES DE UNA MANO, COMO MÁSCARAS DE BITS.
     *
     * Un trío no es «tres cartas del mismo número»: es CUALQUIER subconjunto de
     * tres o más del mismo número, y hay que generarlos todos porque cuál
     * conviene depende de qué escaleras se formen con las que sobren. Con `7♠ 7♥
     * 7♦ 8♦ 9♦` el trío entero deja `8♦ 9♦` muertas; el trío `7♠ 7♥` no existe
     * (hacen falta tres), pero `7♠ 7♥ 7♦` frente a la escalera `7♦ 8♦ 9♦` es una
     * elección real. Por eso no se puede ir carta a carta: hay que buscar.
     *
     * Máscaras de bits y no listas de cartas porque lo siguiente es un problema
     * de conjuntos disjuntos, y con enteros eso es un `&`.
     */
    function combinaciones(cartas) {
        const masks = [];

        // ── Tríos ────────────────────────────────────────────────────────
        // Con UNA baraja, mismo rango implica palos distintos, así que no hace
        // falta comprobarlo. Con dos, aquí es donde habría que mirarlo.
        const porRango = new Map();
        cartas.forEach((c, i) => {
            const r = rango(c);
            if (!porRango.has(r)) porRango.set(r, []);
            porRango.get(r).push(i);
        });
        for (const idx of porRango.values()) {
            const n = idx.length;
            if (n < 3) continue;
            for (let sub = 1; sub < (1 << n); sub++) {
                let cuenta = 0, bits = 0;
                for (let k = 0; k < n; k++) {
                    if (!(sub & (1 << k))) continue;
                    cuenta++;
                    bits |= 1 << idx[k];
                }
                if (cuenta >= 3) masks.push(bits);
            }
        }

        // ── Escaleras ────────────────────────────────────────────────────
        const porPalo = new Map();
        cartas.forEach((c, i) => {
            const s = palo(c);
            if (!porPalo.has(s)) porPalo.set(s, new Map());
            // El as ocupa dos posiciones del orden, así que su carta se apunta
            // en las dos: la misma carta puede servir de principio o de final.
            ORDEN.forEach((r, pos) => { if (r === rango(c)) porPalo.get(s).set(pos, i); });
        });
        for (const posiciones of porPalo.values()) {
            for (let ini = 0; ini < ORDEN.length; ini++) {
                if (!posiciones.has(ini)) continue;
                let bits = 1 << posiciones.get(ini);
                for (let fin = ini + 1; fin < ORDEN.length; fin++) {
                    if (!posiciones.has(fin)) break;      // se corta la seguidilla
                    bits |= 1 << posiciones.get(fin);
                    if (fin - ini + 1 >= 3) masks.push(bits);
                }
            }
        }
        return masks;
    }

    /**
     * ⚠️ LA MEJOR FORMA DE REPARTIR UNA MANO, Y POR QUÉ NO VALE LA AVARICIOSA.
     *
     * Lo obvio es ir cogiendo la combinación más larga y seguir con lo que
     * sobra. Está mal, y se ve con cinco cartas: `7♦ 8♦ 9♦` más `7♠ 7♥`. La
     * avaricia coge la escalera —tres cartas— y deja dos sueltas; la buena es el
     * trío `7♠ 7♥ 7♦`, que también son tres pero deja `8♦ 9♦`… que tampoco
     * cierra. En manos de diez estas cadenas se enredan de verdad.
     *
     * Así que se busca: para la carta más baja que queda suelta, o se queda
     * muerta o entra en alguna combinación que la contenga. Con memoria sobre el
     * conjunto restante, una mano de once son 2.048 estados como mucho — se
     * calcula entero muchas veces por segundo sin que se note.
     *
     * Coger SIEMPRE la carta más baja no es un atajo dudoso: es lo que hace que
     * cada reparto se cuente una vez en vez de una vez por cada orden en que se
     * podría haber montado.
     */
    function repartir(cartas) {
        const melds = combinaciones(cartas);
        const valores = cartas.map(valorDe);
        const memo = new Map();

        const buscar = (resto) => {
            if (!resto) return { muerto: 0, grupos: [] };
            const visto = memo.get(resto);
            if (visto) return visto;

            const bajo = resto & -resto;
            const i = bitBajo(resto);

            // Dejarla suelta.
            const sin = buscar(resto & ~bajo);
            let mejor = { muerto: sin.muerto + valores[i], grupos: sin.grupos };

            // O meterla en algo.
            for (const m of melds) {
                if (!(m & bajo) || (m & resto) !== m) continue;
                const sub = buscar(resto & ~m);
                if (sub.muerto < mejor.muerto) {
                    mejor = { muerto: sub.muerto, grupos: [m, ...sub.grupos] };
                }
            }
            memo.set(resto, mejor);
            return mejor;
        };

        const todo = cartas.length ? (1 << cartas.length) - 1 : 0;
        const r = buscar(todo);
        const enGrupos = r.grupos.reduce((a, m) => a | m, 0);
        return {
            muerto: r.muerto,
            grupos: r.grupos.map(m => cartas.filter((_, i) => m & (1 << i))),
            sueltas: cartas.filter((_, i) => !(enGrupos & (1 << i))),
        };
    }

    /**
     * El reparto de una mano se pide muchas veces por turno —una por cada
     * descarte posible, para saber cuáles cierran— y el estado se consulta cada
     * segundo mientras miras la mesa. Se guarda lo calculado y se tira cuando la
     * partida avanza, que es lo único que puede cambiarlo.
     */
    function repartoDe(p, cartas) {
        if (p._cacheEn !== p.jugadas.length) { p._cache = new Map(); p._cacheEn = p.jugadas.length; }
        const clave = cartas.join(',');
        let r = p._cache.get(clave);
        if (!r) { r = repartir(cartas); p._cache.set(clave, r); }
        return r;
    }

    /** Qué descartes dejarían la mano entera combinada. Ésos cierran la partida. */
    function cierres(p, cartas) {
        if (cartas.length !== mano + 1) return [];
        const out = [];
        for (let i = 0; i < cartas.length; i++) {
            const resto = cartas.filter((_, k) => k !== i);
            if (repartoDe(p, resto).muerto === 0) out.push(cartas[i]);
        }
        return out;
    }

    const cima = (p) => p.descarte[p.descarte.length - 1] ?? null;

    return {

        /** A que se juega, para quien no ve la mesa. Lo publica ProtoHub.state. */

        OBJETIVO: 'Objetivo: cerrar la mano ligando todas tus cartas en grupos y escaleras.',
        // CUÁNTAS SILLAS TIENE LA MESA. Sale de `jugadores` (por defecto 2,
        // ver la nota de cabecera sobre por qué no más). Se cruza contra
        // `manos_rivales` en `estado()`.
        ASIENTOS: jugadores,
        nombre: 'remigio',

        nuevaPartida(opts = {}) {
            const semilla = (opts.semilla ?? opts.seed ?? Date.now()) >>> 0;
            const cartas = barajar(cartasDe(baraja), mulberry32(semilla));

            const p = {
                semilla, jugadores, manos: [], mazo: [], descarte: [],
                turno: 0, fase: 'robar', jugadas: [], cerro: null,
                // De dónde robó cada uno la última vez: es información pública y
                // es la mitad del juego. Se guarda para poder publicarla.
                tomas: [], biblioteca: baraja.biblioteca,
                _cache: new Map(), _cacheEn: -1,
            };
            for (let i = 0; i < jugadores; i++) p.manos.push(cartas.splice(0, mano));
            // Se voltea una para empezar el descarte: sin ella el primer jugador
            // no tendría entre qué elegir, que es justo la decisión del juego.
            p.descarte.push(cartas.pop());
            p.mazo = cartas;
            return p;
        },

        /**
         * ⚠️ `asiento` NO ES `turno`. Ver la nota larga de `bazas.js`: en una mesa
         * compartida, publicar la mano del asiento 0 le enseña las cartas al
         * rival. Aquí además el descarte y de dónde robó cada uno son públicos, y
         * eso sí lo ve todo el mundo — la diferencia entre lo uno y lo otro es
         * exactamente lo que este juego mide.
         */
        estado(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;
            const pid = p.turno;
            const terminada = p.cerro !== null || p.mazo.length === 0;

            const miMano = [...p.manos[yo]];
            const mío = repartoDe(p, miMano);

            /**
             * ⚠️ LAS JUGADAS SON LAS DE QUIEN MUEVE, NO LAS DE QUIEN MIRA.
             *
             * Mi primera versión las devolvía vacías cuando no era tu turno,
             * razonando que ofrecerlas filtra la mano del rival. El razonamiento
             * no es tonto — pero la convención de la casa ya estaba decidida y
             * escrita en `bazas.js`: «legal_moves no depende del asiento sino del
             * TURNO». La fuga se tapa en el árbitro, que es quien sabe quién
             * está sentado dónde; aquí no se puede saber.
             *
             * Y lo cazó `prueba_reglas.mjs` en dos jugadas: con las listas vacías
             * el juego SE MUERE DE PIE —sin jugadas legales y sin terminar—, que
             * es un estado del que una partida no sale. Inventar una convención
             * distinta en un solo juego de treinta y uno es exactamente la
             * divergencia que este proyecto lleva media docena de veces pagando.
             */
            const enTurno = p.manos[pid];
            let legales = [];
            if (!terminada) {
                if (p.fase === 'robar') {
                    legales = ['robar_mazo', ...(cima(p) ? ['robar_descarte'] : [])];
                } else {
                    const puedenCerrar = new Set(cierres(p, enTurno));
                    legales = enTurno.flatMap(c =>
                        puedenCerrar.has(c) ? [`cerrar:${c}`, `descartar:${c}`] : [`descartar:${c}`]);
                }
            }

            /**
             * ⚠️ EL MARCADOR PUNTÚA LO CERCA QUE TE QUEDASTE, NO SÓLO SI GANASTE.
             *
             * La primera versión daba 100 al que cierra y 0 al resto. El aviso ya
             * está escrito en `sokoban.js` y vale igual aquí: si nadie cierra
             * —que entre agentes flojos es el caso NORMAL, no la excepción—, todo
             * el mundo empata a cero y la métrica no ordena nada. Uno que se quedó
             * con dos cartas muertas sacaría lo mismo que otro con veinte.
             *
             * Restar lo muerto ordena también los fracasos, que es donde va a
             * estar casi toda la tabla.
             */
            const rivales = p.manos.reduce(
                (s, m, i) => s + (i === yo ? 0 : repartoDe(p, m).muerto), 0);
            const puntos = p.cerro === yo ? 100 + rivales : -mío.muerto;
            // ⚠️ MISMA FÓRMULA, UNA POR ASIENTO. «rivales» es «lo muerto de los
            // DEMÁS visto desde `c`», así que no es `rivales` reutilizado —para
            // cada `c` los demás son otro conjunto— sino la misma suma rehecha
            // por cada silla. Como mucho un `c` cierra por partida, así que como
            // mucho uno cae en la rama de los 100. Patrón de `bazas.js`.
            const marcador = Array.from({ length: jugadores }, (_, c) => {
                if (p.cerro === c) {
                    const rivalesDeC = p.manos.reduce(
                        (s, m, i) => s + (i === c ? 0 : repartoDe(p, m).muerto), 0);
                    return 100 + rivalesDeC;
                }
                return -repartoDe(p, p.manos[c]).muerto;
            });

            return {
                juego: 'remigio',
                asiento: yo,
                mano: miMano,
                manos_rivales: p.manos.filter((_, i) => i !== yo).map(m => m.length),
                /**
                 * Cómo se reparte tu mano ahora mismo, y cuánto pesa lo que sobra.
                 *
                 * Es información DERIVADA —cualquiera puede calcularla de su
                 * propia mano— así que publicarla no filtra nada. Y no publicarla
                 * haría que el juego midiera sobre todo la paciencia para buscar
                 * particiones a mano, que no es lo que queremos medir. La decisión
                 * interesante es qué tirar y de dónde robar, no la aritmética.
                 */
                grupos: mío.grupos,
                sueltas: mío.sueltas,
                muerto: mío.muerto,
                // Lo público, que es la otra mitad del juego:
                descarte: cima(p),
                descarte_restante: p.descarte.length,
                // Todo lo que se ha tirado, en orden. En una mesa lo has visto
                // pasar; acordarse es cosa tuya, y para un agente eso es memoria.
                descartes: [...p.descarte],
                // Y de dónde robó cada uno: coger del descarte declara intención.
                tomas: p.tomas.slice(-24),
                mazo_restante: p.mazo.length,
                fase: p.fase,
                cerro: p.cerro,
                marcador,
                puntos,
                score: puntos,
                turn: pid === 0 ? 'player' : `cpu${pid}`,
                semilla: p.semilla,
                biblioteca: p.biblioteca,
                legal_moves: legales,
                is_game_over: terminada,
                // Sin mazo y sin cierre no gana nadie: se acaba y manda lo muerto.
                desenlace: p.cerro !== null
                    ? (p.cerro === yo ? 'cerraste' : `cerró ${p.cerro}`)
                    : (terminada ? 'se acabó el mazo' : null),
            };
        },

        mover(p, jugada) {
            const j = String(jugada ?? '');
            if (j === 'nueva' || j === 'reset') return false;
            if (p.cerro !== null || p.mazo.length === 0) return false;

            const pid = p.turno;
            const mi = p.manos[pid];

            if (p.fase === 'robar') {
                if (j === 'robar_mazo') {
                    mi.push(p.mazo.pop());
                    p.tomas.push({ de: pid, fuente: 'mazo', carta: null });
                } else if (j === 'robar_descarte') {
                    if (!p.descarte.length) return false;
                    const c = p.descarte.pop();
                    mi.push(c);
                    // La carta se dice: cogerla del descarte es público y esto es
                    // lo que el rival puede usar en tu contra.
                    p.tomas.push({ de: pid, fuente: 'descarte', carta: c });
                } else return false;
                p.fase = 'descartar';
                p.jugadas.push(j);
                return true;
            }

            const [verbo, carta] = [j.slice(0, j.indexOf(':')), j.slice(j.indexOf(':') + 1)];
            if (verbo !== 'descartar' && verbo !== 'cerrar') return false;
            const i = mi.indexOf(carta);
            if (i === -1) return false;

            if (verbo === 'cerrar') {
                // ⚠️ Se vuelve a comprobar aquí y no se confía en `legal_moves`.
                // Quien llama puede ser un agente por HTTP mandando lo que quiera,
                // y una jugada ilegal aceptada no da error: da una partida ganada
                // que luego no verifica.
                const resto = mi.filter((_, k) => k !== i);
                if (repartoDe(p, resto).muerto !== 0) return false;
                mi.splice(i, 1);
                p.descarte.push(carta);
                p.cerro = pid;
                p.jugadas.push(j);
                return true;
            }

            mi.splice(i, 1);
            p.descarte.push(carta);
            p.jugadas.push(j);
            p.fase = 'robar';
            p.turno = (p.turno + 1) % p.jugadores;
            return true;
        },

        /**
         * El rival de la casa.
         *
         * Juega lo evidente: coge del descarte si esa carta le baja lo muerto,
         * y tira la que más se lo baje. Con eso ya cierra partidas.
         *
         * ⚠️ Y DEJA TECHO A PROPÓSITO, que es lo que se le pide a un rival de
         * banco de pruebas. No mira `tomas` —o sea que no deduce lo que el otro
         * junta— ni evita tirar cartas que al rival le vendrían bien. Las dos
         * cosas son justo lo que separa a un agente bueno de uno correcto, así
         * que tienen que quedar libres: un rival de casa que juegue perfecto no
         * ordena a nadie porque todos pierden igual.
         */
        sugerencia(p) {
            const pid = p.turno;
            const mi = p.manos[pid];
            if (p.cerro !== null || !p.mazo.length) return null;

            if (p.fase === 'robar') {
                const c = cima(p);
                if (!c) return 'robar_mazo';
                const ahora = repartoDe(p, mi).muerto;
                // ¿Y si la cojo? Lo mejor que puedo dejar tirando otra cosa.
                const con = [...mi, c];
                let mejor = Infinity;
                for (let i = 0; i < con.length; i++) {
                    if (con[i] === c) continue;             // cogerla y tirarla no es robar
                    mejor = Math.min(mejor, repartoDe(p, con.filter((_, k) => k !== i)).muerto);
                }
                return mejor < ahora ? 'robar_descarte' : 'robar_mazo';
            }

            const cerrables = cierres(p, mi);
            if (cerrables.length) return `cerrar:${cerrables[0]}`;

            let elegida = mi[0], mejor = Infinity;
            for (let i = 0; i < mi.length; i++) {
                const r = repartoDe(p, mi.filter((_, k) => k !== i)).muerto;
                // A igualdad, suelta la más cara: es la que más duele si te pillan.
                if (r < mejor || (r === mejor && valorDe(mi[i]) > valorDe(elegida))) {
                    mejor = r; elegida = mi[i];
                }
            }
            return `descartar:${elegida}`;
        },

        /**
         * ⚠️ SUSTRATO NATIVO, QUE ES LO QUE PIDE EL TECHO.
         *
         * `prueba_sustrato.mjs` cuenta cuántos juegos siguen pasando por el
         * adaptador y ese número sólo puede bajar. Un juego nuevo que lo usara lo
         * subiría y la prueba fallaría — que es exactamente para lo que está.
         *
         * Y sale barato: este juego son montones y ninguna rejilla, así que el
         * sustrato ES el estado, sin traducir nada.
         */
        sustrato(p, asiento = 0) {
            const yo = Number.isInteger(asiento) && p.manos[asiento] ? asiento : 0;
            const zonas = [
                { id: 'mano', de: yo, items: [...p.manos[yo]], ocultas: 0 },
                ...p.manos
                    .map((m, i) => ({ i, n: m.length }))
                    .filter(x => x.i !== yo)
                    .map(x => ({ id: 'mano', de: x.i, items: [], ocultas: x.n })),
            ];
            // El descarte se dibuja como está en una mesa: la de encima a la
            // vista y las demás debajo, que no se pueden coger. `ocultas` no
            // significa aquí «nadie las ha visto» —todas se vieron al caer— sino
            // «no se leen desde arriba», que es lo que hay que pintar.
            if (p.descarte.length) {
                zonas.push({ id: 'descarte', de: null,
                             items: [p.descarte[p.descarte.length - 1]],
                             ocultas: p.descarte.length - 1 });
            }
            if (p.mazo.length) {
                zonas.push({ id: 'mazo', de: null, items: [], ocultas: p.mazo.length });
            }
            return { rejilla: null, piezas: [], zonas };
        },

        deshacer() { return false; },
    };
}
