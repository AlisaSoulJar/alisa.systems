/**
 * enfrentamiento.mjs — LA SEGUNDA TABLA: unos contra otros, no contra la casa
 * ═══════════════════════════════════════════════════════════════════════════
 *   node enfrentamiento.mjs
 *   node enfrentamiento.mjs --juegos yokai,nave --semillas 40
 *   node enfrentamiento.mjs --md docs/enfrentamiento.md
 *
 * POR QUÉ HACE FALTA UNA SEGUNDA, HABIENDO UNA
 * ───────────────────────────────────────────────────────────────────────────
 * `tabla.mjs` mide contra la casa: el participante ocupa UNA silla, la casa juega
 * las demás, y la nota es cuánto del hueco entre no pensar y la heurística se ha
 * comido. Eso funciona mientras «jugar mejor» quiera decir sacar más puntos de un
 * entorno que no cambia de opinión.
 *
 * En un juego de deducción social no quiere decir eso. Lo que hay que medir es si
 * convences a los demás, y los demás son los otros participantes. Contra una casa
 * fija, el yokai que engaña bien y el que engaña mal sacan lo mismo — la casa cae
 * igual en los dos. Por eso la tabla lo descartaba con «la casa no supera al
 * suelo»: no es que el juego no distinga, es que ese metro no puede distinguirlo.
 *
 *     tabla.mjs          una silla tuya, el resto casa    →  nota absoluta 0..1
 *     enfrentamiento     TODAS las sillas de participantes →  puntuación relativa
 *
 * CÓMO SE PUNTÚA: BRADLEY–TERRY, NO ELO
 * ───────────────────────────────────────────────────────────────────────────
 * Elo actualiza partida a partida, así que **el resultado depende del orden** en
 * que se jueguen: las mismas partidas barajadas de otra forma dan otra tabla. Aquí
 * las partidas se juegan todas antes de puntuar, y para ese caso existe la versión
 * de máxima verosimilitud del mismo modelo —Bradley–Terry— que se ajusta sobre el
 * conjunto entero y **no depende del orden**. Mismas partidas, misma tabla, para
 * siempre. En una casa donde todo lleva recibo, un número que cambia según el
 * orden de lectura no vale.
 *
 * La escala final se imprime en puntos tipo Elo (400·log10) porque se leen solos,
 * pero el ajuste no es Elo.
 *
 * ⚠️ SUS DOS LÍMITES, DICHOS AQUÍ
 * ───────────────────────────────────────────────────────────────────────────
 * 1. Si alguien gana TODO, Bradley–Terry se va a infinito: no hay dato que diga
 *    cuánto mejor es, sólo que no perdió. Se regulariza con media victoria y media
 *    derrota contra un rival medio, y se avisa en la fila con `∞?`.
 * 2. Una puntuación relativa no dice si el juego es bueno: dice quién gana a
 *    quién. Si los tres participantes empatan siempre, todos salen a 1000 y eso
 *    NO significa que el juego esté equilibrado — significa que no separa. Por eso
 *    se publica también cuántas partidas acabaron en tablas.
 *
 * Y TODA PARTIDA LLEVA RECIBO, igual que en la primera tabla: se re-simula contra
 * el mismo fichero de reglas antes de contarse. Lo que no verifica, no puntúa.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const impo = (rel) => import(pathToFileURL(path.join(AQUI, rel)).href);

const { cargarReglas, JUEGOS } = await impo('public/arcade/js/protohub/rules/index.js');
const { verificar } = await impo('public/arcade/js/protohub/Verificador.js');
const { POLITICAS, semillaDe } = await impo('public/arcade/js/agentes/politicas.js');
// Las tres cuentas de las que depende el resultado viven sueltas para poder
// probarlas sin jugar cuarenta juegos. Ver la cabecera de `enfrentar.mjs`.
const { repartoDe, contarSillas, bradleyTerry, aElo } = await impo('enfrentar.mjs');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

// Acepta las dos formas —`--juegos=a,b` y `--juegos a,b`— porque `tabla.mjs` se
// invoca con la segunda y dos guiones que se escriben igual tienen que hacer lo
// mismo. Con sólo la primera, `--juegos yokai` deja `juegos: true` y el guion se
// pone a buscar un juego llamado «true», que es lo que pasó al estrenarlo.
const args = {};
{
    const av = process.argv.slice(2);
    for (let i = 0; i < av.length; i++) {
        const m = av[i].match(/^--([\w-]+)(?:=(.*))?$/);
        if (!m) continue;
        if (m[2] !== undefined) args[m[1]] = m[2];
        else if (av[i + 1] && !av[i + 1].startsWith('--')) args[m[1]] = av[++i];
        else args[m[1]] = true;
    }
}
const SEMILLAS = Number(args.semillas ?? 30);
const TOPE = Number(args.tope ?? 400);
const pedidos = args.juegos ? String(args.juegos).split(',').map((s) => s.trim()) : null;

const PARTICIPANTES = [
    { nombre: 'primera', politica: POLITICAS.primera() },
    { nombre: 'azar',    politica: POLITICAS.azar() },
    { nombre: 'casa',    politica: POLITICAS.casa() },
];

/**
 * UNA PARTIDA CON UN PARTICIPANTE POR SILLA.
 *
 * `reparto[k]` es el índice del participante que ocupa la silla k. En cada turno
 * se mira QUIÉN tiene el turno y decide su política, no la de la silla 0 — que es
 * justo lo que la primera tabla no puede hacer.
 *
 * ⚠️ La jugada se pide con `estado(p)` sin asiento, igual que hace el verificador
 * al reproducir. `legal_moves` describe lo que puede hacer QUIEN MUEVE, no lo que
 * ve una silla concreta; el asiento sólo cambia el punto de vista de la
 * puntuación. Si algún juego hiciera depender sus jugadas legales del asiento, su
 * recibo dejaría de reproducir — y eso lo caza el `verificar` de abajo.
 */
function partida(reglas, semilla, reparto, sillas, orden, decidenPorSilla = null) {
    const p = reglas.nuevaPartida({ semilla });
    const jugadas = [];
    for (let i = 0; i < TOPE; i++) {
        const st = reglas.estado(p);
        if (st.is_game_over) break;
        const legales = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
        if (!legales.length) break;

        // De quién es el turno. `turno` es un nombre suelto y distinto en cada
        // juego, así que la silla se localiza por su posición en la lista de
        // turnos que el propio juego publique; si no publica ninguna, se cae al
        // orden de juego, que es lo que hacen los de dos. `orden` es DEL JUEGO y
        // lo comparten todas sus partidas: ver la nota de `sillaDelTurno`.
        const silla = sillaDelTurno(orden, st, sillas, i);
        const quien = PARTICIPANTES[reparto[silla]];
        // Se apunta si esta silla ha tenido algo que ELEGIR. Una silla a la que
        // sólo se le ofrece una jugada no juega: ejecuta.
        if (decidenPorSilla) {
            decidenPorSilla[silla] = (decidenPorSilla[silla] ?? 0) + (legales.length > 1 ? 1 : 0);
        }

        const opciones = legales.map((v) => ({ verb: v }));
        const idx = quien.politica({ p }, opciones, { reglas });
        const j = opciones[Number.isInteger(idx) && idx >= 0 && idx < opciones.length ? idx : 0].verb;

        if (!reglas.mover(p, j)) break;
        jugadas.push(j);
    }
    const puntos = [];
    for (let k = 0; k < sillas; k++) puntos.push(Number(reglas.estado(p, k)?.puntos) || 0);
    return { p, jugadas, puntos };
}

/**
 * En qué silla está quien mueve.
 *
 * Ningún juego publica su lista de asientos —medido: los 40 usan nombres sueltos
 * (`player`, `azul`, `ladron`, `a`)— así que no hay forma uniforme de preguntarlo.
 * Lo que sí hay es el orden: los turnos van en rueda. Se mantiene una lista de los
 * nombres vistos y la silla es la posición en esa lista, que para un juego que
 * reparte turnos en orden es exactamente la silla.
 *
 * ⚠️ Y EL ORDEN ES DEL JUEGO, NO DE LA PARTIDA. ESTO ESTUVO MAL.
 *
 * La primera versión guardaba la lista de nombres por partida (un `WeakMap` sobre
 * `p`), así que la silla 0 era «el primero que movió EN ESTA PARTIDA». Y hay
 * juegos donde eso cambia: blackjack publica `turn: jugando ? 'player' : 'dealer'`
 * —«dealer» no es una silla, es la FASE de mano resuelta— y según cómo arrancara
 * la partida, la silla 0 salía unas veces 'player' y otras 'dealer'.
 *
 * Con la numeración bailando, «la silla 1» dejaba de querer decir lo mismo entre
 * partidas, y las decisiones de un jugador se apuntaban a las dos sillas: la
 * cuenta daba 2450 y 208 donde la verdad era 2658 y 0. Un juego de UNO se
 * presentaba como enfrentamiento.
 *
 * Ahora la lista la lleva el juego y se pasa a todas sus partidas, así que la
 * silla k es la misma silla siempre.
 */
function sillaDelTurno(orden, st, sillas, i) {
    if (sillas <= 1) return 0;
    const nombre = String(st.turn ?? st.turno ?? '');
    if (!nombre) return i % sillas;           // sin nombre, la rueda a secas
    let k = orden.indexOf(nombre);
    if (k < 0) { orden.push(nombre); k = orden.length - 1; }
    return k % sillas;
}

console.log('\n  LA SEGUNDA TABLA — unos contra otros\n');

// `JUEGOS` YA es la lista de nombres, no un objeto indexado por nombre. Con
// `Object.keys` salían los índices —«0», «1», «2»— y los cuarenta juegos se
// descartaban con «sin nuevaPartida», que es un motivo verdadero sobre un juego
// que no existe: el peor tipo de mensaje, correcto y completamente inútil.
const nombres = pedidos ?? [...(JUEGOS ?? [])];
const filas = [];
const fuera = [];

for (const juego of nombres) {
    let reglas;
    try { reglas = await cargarReglas(juego, {}); } catch { fuera.push([juego, 'no cargan sus reglas']); continue; }
    if (typeof reglas?.nuevaPartida !== 'function') { fuera.push([juego, 'sin nuevaPartida']); continue; }

    /**
     * ⚠️ LAS SILLAS SE CUENTAN JUGANDO, NO MIRANDO LA SALIDA.
     *
     * Preguntarle al estado inicial parece lo natural y da mal en los juegos que
     * más falta hacen aquí: yokai, nave y entropy publican `marcador` sólo cuando
     * la partida acaba, así que al empezar no hay nada que contar y salían con
     * «1 silla — es de un jugador». Un juego de OCHO dado por solitario, y sin un
     * solo error: exactamente la clase de fallo que se lee como resultado.
     *
     * Así que se juega una partida tonta entera y se coge el máximo visto. Cuesta
     * una partida por juego y no puede quedarse corto por asomo.
     */
    let sillas, nombresDeTurno, vistaPorAsiento = false;
    try {
        const p0 = reglas.nuevaPartida({ semilla: 1 });
        sillas = contarSillas(reglas.estado(p0, 0));
        nombresDeTurno = [];
        for (let i = 0; i < TOPE; i++) {
            const st = reglas.estado(p0);
            if (st.is_game_over) break;
            const nom = String(st.turn ?? st.turno ?? '');
            if (nom && !nombresDeTurno.includes(nom)) nombresDeTurno.push(nom);
            const leg = (st.legal_moves ?? []).filter((x) => x !== 'nueva' && x !== 'reset');
            if (!leg.length || !reglas.mover(p0, leg[0])) break;
            sillas = Math.max(sillas, contarSillas(reglas.estado(p0, 0)));
        }
        sillas = Math.max(sillas, contarSillas(reglas.estado(p0, 0)), nombresDeTurno.length);

        /**
         * ⚠️ DOS MOTIVOS DISTINTOS PARA QUEDARSE FUERA, Y CONFUNDIRLOS ES CARO.
         *
         * Al estrenar esto, ajedrez, go, reversi, damas, xiangqi, mancala,
         * blackjack y póker salieron con «1 silla — es de un jugador». Es falso, y
         * de la peor manera: son juegos DE DOS, y el mensaje daba por cerrado un
         * caso que estaba abierto. Lo que les pasa es otra cosa:
         *
         *     ajedrez   turnos = ["white","black"]   puntos s0/s1 = [18, 18]
         *     poker     turnos = ["jugador","casa"]  puntos s0/s1 = [−17, −17]
         *
         * Dos sillas, y `estado(p, asiento)` devuelve LO MISMO se pida la que se
         * pida: el juego publica un solo punto de vista. Sin puntuación por silla
         * no hay nada que comparar entre sillas, así que esta tabla no puede
         * puntuarlos — pero el arreglo es de una línea en cada juego, no un juego
         * nuevo. Es exactamente el trabajo que `tabla.mjs` documenta como hecho en
         * dieciséis de los cuarenta: los dieciséis son justo los que entran aquí.
         */
        /**
         * ⚠️ ¿TIENE ESTE JUEGO VISTA POR ASIENTO? SE LE PREGUNTA AL ESTADO ENTERO.
         *
         * Y no al marcador, que es lo que yo hacía. `matriz_generos.mjs` ya se dio
         * de bruces con esto y lo dejó escrito en `relevo.js`: descartar a los que
         * dan el mismo marcador a las dos sillas es correcto para el ajedrez y
         * FATAL para un cooperativo, donde compartir puntuación es lo que lo
         * define. El primer cooperativo de verdad saldría descartado por exhibir
         * justo su propiedad.
         *
         * Lo que hay que saber es si el juego sabe de asientos, y eso se ve en el
         * estado completo —manos, niebla, posición—. Que el marcador coincida es
         * entonces un dato, no un descarte.
         *
         * Lo escribí mal aunque el aviso llevaba meses puesto en el fichero: un
         * banco que hereda los prejuicios de lo que ya tenía no da error, sólo
         * deja de encontrar.
         */
        vistaPorAsiento = JSON.stringify(reglas.estado(p0, 0)) !== JSON.stringify(reglas.estado(p0, 1));

        // ⚠️ Y LO OTRO SE DECIDE CON LAS PARTIDAS DE VERDAD, NO CON ESTA SONDA.
        //
        // Lo primero que hice fue mirarlo aquí, en la partida tonta de contar
        // sillas, y se llevó por delante a `nave` —que separa 1138 contra 1000—
        // porque en ESA partida concreta los cuatro acabaron a cero. Una sonda de
        // una semilla no puede decidir si un juego publica bien: se apunta la
        // pregunta y se contesta abajo, cuando ya hay decenas de partidas.
        if (sillas < 2) {
            // Un solitario no tiene contra quién enfrentarse. No es un fallo: es
            // que esta tabla no le aplica, y la primera sí.
            fuera.push([juego, `${sillas} silla — es de un jugador`]); continue;
        }
    } catch (err) { fuera.push([juego, `revienta al empezar: ${err.message}`]); continue; }

    const P = PARTICIPANTES.length;
    const n = Array.from({ length: P }, () => new Array(P).fill(0));
    const w = new Array(P).fill(0);
    let partidas = 0, tablas = 0, sinVerificar = 0, sigueAlAsiento = false;
    // Cuántas veces ha tenido cada silla más de una jugada donde elegir.
    const decidenPorSilla = new Array(sillas).fill(0);
    /**
     * La numeración de sillas del juego, compartida por TODAS sus partidas.
     *
     * Se estrena con los nombres que vio la sonda de contar sillas, así que la
     * silla 0 es la que abre en la semilla 1 y no «la que abriera esta partida».
     * Ver la nota de `sillaDelTurno`: cuando esto era por partida, blackjack
     * numeraba al revés según cómo arrancara y las decisiones de un jugador se
     * repartían entre dos sillas.
     */
    const ordenDeTurnos = [...nombresDeTurno];
    // Cuántas veces se sienta cada participante en cada silla: tiene que salir
    // igual para todos, y se imprime si no.
    const asientos = Array.from({ length: P }, () => new Array(sillas).fill(0));

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  SE COMPARA LA MISMA SILLA DE LA MISMA SEMILLA. COMO EN EL BRIDGE.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * Lo primero que escribí fue comparar las sillas ENTRE SÍ dentro de una
     * partida: si la silla 2 saca más que la 5, gana quien ocupara la 2. Y eso en
     * yokai no mide nada, porque las sillas no son intercambiables — la semilla
     * reparte los roles:
     *
     *     yokai  puntos por silla  [0, −15, 260, 260, −150, −150, −150, −150]
     *                                        ↑    ↑
     *                                  los dos yokai, que ganaron esa partida
     *
     * Un aldeano «pierde» contra un yokai por ser aldeano. Comparar eso es medir
     * el reparto de papeles y llamarlo habilidad.
     *
     * El bridge de competición resolvió esto hace un siglo con las manos
     * duplicadas: la misma reparto se juega en varias mesas y se compara lo que
     * SACÓ CADA UNO CON LAS MISMAS CARTAS. Aquí sale gratis, porque el reparto
     * `silla k ← participante (k + r) mod P` con r dando la vuelta entera hace que
     * por cada semilla y cada silla pasen LOS TRES participantes, exactamente una
     * vez cada uno. Así que cada (semilla, silla) es una mano duplicada:
     *
     *     semilla 7, silla 3:  primera −150 · azar −150 · casa 260
     *                          ↑ los tres con el mismo papel y la misma partida
     *
     * Con eso desaparecen de la comparación el papel, el reparto de cartas y la
     * ventaja de salir primero: lo único que queda entre los tres números es lo
     * que hizo cada uno.
     */
    const celdas = new Map();     // `${semilla}:${silla}` → { participante → puntos }

    for (let s = 1; s <= SEMILLAS; s++) {
        for (let r = 0; r < P; r++) {
            /**
             * ⚠️ EL REPARTO QUE REPARTE DE VERDAD.
             *
             * `silla k ← participante (k + r) mod P`, con r dando la vuelta entera.
             * Así el participante p ocupa la silla k exactamente cuando r ≡ p − k,
             * o sea UNA vez por vuelta, PARA CADA SILLA. Es la propiedad que hace
             * honesta la comparación —canadiense premia a quien empieza, y esa
             * ventaja tiene que tocarles a todos por igual— y se comprueba abajo
             * contando, no confiando.
             */
            const reparto = repartoDe(sillas, r, P);
            for (let k = 0; k < sillas; k++) asientos[reparto[k]][k]++;

            for (const q of PARTICIPANTES) q.politica?.sembrar?.(semillaDe(juego, s * 100 + r));

            let res;
            try { res = partida(reglas, s, reparto, sillas, ordenDeTurnos, decidenPorSilla); }
            catch { continue; }
            if (!res.jugadas.length) continue;

            // El recibo, antes de contar nada.
            const v = verificar(reglas, { juego, semilla: s, jugadas: res.jugadas });
            if (!v.valida) { sinVerificar++; continue; }
            partidas++;

            // ¿Ha dado esta partida números distintos en sillas distintas? Es la
            // pregunta que se dejó pendiente arriba, y aquí se contesta con datos.
            if (new Set(res.puntos.map((x) => String(x))).size > 1) sigueAlAsiento = true;

            // Se guarda qué sacó cada uno en cada silla. Comparar viene después,
            // cuando la mano la hayan jugado los tres.
            for (let k = 0; k < sillas; k++) {
                const clave = `${s}:${k}`;
                if (!celdas.has(clave)) celdas.set(clave, {});
                celdas.get(clave)[reparto[k]] = res.puntos[k];
            }
        }
    }

    // Ahora sí: dentro de cada mano duplicada, todos contra todos.
    for (const marca of celdas.values()) {
        const quienes = Object.keys(marca).map(Number);
        for (let a = 0; a < quienes.length; a++) {
            for (let b = a + 1; b < quienes.length; b++) {
                const ia = quienes[a], ib = quienes[b];
                n[ia][ib]++; n[ib][ia]++;
                if (marca[ia] > marca[ib]) w[ia]++;
                else if (marca[ib] > marca[ia]) w[ib]++;
                else { w[ia] += 0.5; w[ib] += 0.5; tablas++; }
            }
        }
    }

    const comparaciones = n.reduce((s, fila) => s + fila.reduce((t, x) => t + x, 0), 0) / 2;
    if (!comparaciones) { fuera.push([juego, 'ninguna partida llegó a comparar dos sillas']); continue; }

    /**
     * ═══════════════════════════════════════════════════════════════════════
     *  TRES MOTIVOS DISTINTOS PARA NO PUNTUAR, Y CONFUNDIRLOS COSTÓ UNA TARDE
     * ═══════════════════════════════════════════════════════════════════════
     *
     * La primera versión metía a once juegos en el mismo saco —«le falta publicar
     * la puntuación por silla»— y de once, sólo siete lo tenían. Los otros cuatro
     * no tienen nada que arreglar:
     *
     *   ·  UNA SILLA QUE NO DECIDE no es un jugador. En blackjack la banca tiene
     *      306 turnos y CERO con más de una jugada: sólo pulsa `deal`. En póker,
     *      90 turnos y sólo `siguiente`. Sentar ahí a un participante lo puntúa
     *      por lo que hizo su rival, con el signo cambiado — o sea al revés.
     *
     *   ·  UN JUEGO COOPERATIVO comparte marcador a propósito. `cabina` es guía y
     *      piloto, `relevo` son dos que se turnan: las dos sillas deciden el 100%
     *      del tiempo y ganan o pierden juntas. Que las dos den el mismo número no
     *      es un descuido, es el juego.
     *
     *   ·  Y SÓLO EL TERCERO ES UN DEFECTO: dos sillas que compiten y un `estado`
     *      que devuelve el mismo punto de vista se pida el asiento que se pida.
     *
     * Acusar a los cuatro primeros de lo del tercero no es un mensaje inexacto: es
     * una lista de tareas con cuatro tareas que no hay que hacer.
     */
    const sillasQueDeciden = decidenPorSilla.filter((x) => x > 0).length;
    if (args.detalle === juego || args.detalle === true) {
        console.log(gris(`      decisiones por silla: ${JSON.stringify(decidenPorSilla)}`
            + `  ·  sillas que deciden: ${sillasQueDeciden}`));
    }
    if (sillasQueDeciden < 2) {
        const mudas = decidenPorSilla.map((x, k) => x === 0 ? k : -1).filter((k) => k >= 0);
        fuera.push([juego, `la silla ${mudas.join(' y ')} no decide nunca —siempre una sola jugada—`
            + `: es un jugador contra una casa fija, no un enfrentamiento`]);
        continue;
    }
    if (!sigueAlAsiento) {
        fuera.push([juego, vistaPorAsiento
            // Sabe de asientos —el estado cambia según cuál se pida— y aun así el
            // marcador es uno solo: eso es cooperar, y es el juego, no un fallo.
            // No entra porque aquí se puntúa quién gana a quién, y aquí se gana o
            // se pierde junto. Le hace falta otra tabla, no un arreglo.
            ? `cooperativo: las ${sillas} sillas deciden y comparten marcador a propósito`
              + ` — se gana o se pierde junto, así que no hay a quién ganar`
            // No sabe de asientos en absoluto: el mismo estado se pida el que se
            // pida. Eso sí es una línea que falta.
            : `${sillas} sillas que deciden y ${partidas} partidas, y \`estado(p, asiento)\` devolvió`
              + ` el MISMO estado entero para todas — le falta la vista por asiento`]);
        continue;
    }

    /**
     * REGULARIZACIÓN: media victoria y media derrota de regalo a cada uno.
     * Sin esto, quien no pierde ni una vez se va a infinito y la fila deja de
     * poder imprimirse. Con esto la fila sale, y se marca `∞?` para que nadie la
     * lea como un número medido.
     */
    const invicto = PARTICIPANTES.map((_, i) => {
        const jugadas_i = n[i].reduce((t, x) => t + x, 0);
        return jugadas_i > 0 && (w[i] === 0 || w[i] === jugadas_i);
    });
    const nReg = n.map((fila) => fila.slice());
    const wReg = w.slice();
    for (let i = 0; i < PARTICIPANTES.length; i++) {
        for (let j = 0; j < PARTICIPANTES.length; j++) {
            if (i === j) continue;
            nReg[i][j] += 1; wReg[i] += 0.5;
        }
    }

    const f = bradleyTerry(nReg, wReg);
    // Anclado en `primera` = 1000: el suelo es el mismo que en la primera tabla,
    // así que las dos se leen con el mismo cero mental.
    const elo = aElo(f, 0);

    // ¿Reparte bien las sillas? Tiene que ser el mismo número en toda la matriz.
    const cuentas = asientos.flat();
    const repartoJusto = cuentas.every((x) => x === cuentas[0]);

    filas.push({ juego, sillas, partidas, tablas, comparaciones, sinVerificar, elo, invicto, repartoJusto });

    // `--detalle gofish` enseña las cuentas de las que sale la puntuación. Sin
    // esto, una fila rara sólo se puede investigar con un guion de usar y tirar,
    // y el de usar y tirar no vuelve a pasar por aquí cuando algo cambia.
    if (args.detalle === juego || args.detalle === true) {
        console.log(gris(`      celdas ${celdas.size} · comparaciones ${comparaciones}`));
        for (let i = 0; i < P; i++) {
            const jug = n[i].reduce((t, x) => t + x, 0);
            console.log(gris(`      ${PARTICIPANTES[i].nombre.padEnd(9)}`
                + ` gana ${String(w[i]).padStart(6)} de ${String(jug).padStart(4)}`
                + `   vs ${PARTICIPANTES.map((q, j) => i === j ? '' : `${q.nombre}:${n[i][j]}`).filter(Boolean).join(' ')}`));
        }
    }

    /**
     * Con UN decimal, no redondeado a entero. Gofish da 1000,0 / 1000,0 / 1000,0
     * a tres políticas que eligen distinto en el 99% de los turnos: el juego es
     * suerte y la elección no cambia el resultado, que es un hallazgo correcto.
     * Pero impreso como tres «1000» clavados se lee como una cuenta rota, y una
     * medida que parece un fallo acaba tratada como un fallo.
     */
    const pinta = PARTICIPANTES.map((q, i) =>
        `${q.nombre} ${elo[i].toFixed(1)}${invicto[i] ? '∞?' : ''}`).join('  ');
    console.log(`  ${verde('✓')} ${juego.padEnd(14)} ${String(sillas)} sillas · ${String(partidas).padStart(4)} partidas`
        + gris(` · tablas ${Math.round(100 * tablas / Math.max(1, comparaciones))}%`)
        + `   ${pinta}`
        + (repartoJusto ? '' : rojo('  ⚠ sillas mal repartidas'))
        + (sinVerificar ? rojo(`  ⚠ ${sinVerificar} sin recibo`) : ''));
}

console.log(`\n  ${filas.length} juegos con dos o más sillas · ${fuera.length} fuera\n`);

/**
 * LA SEÑAL: ¿este juego separa a los participantes, o los deja igual?
 *
 * Es la pregunta que la primera tabla contesta con «la casa no supera al suelo».
 * Aquí es el rango de puntuaciones: si los tres caen dentro de 30 puntos, este
 * juego no distingue entre no pensar y la heurística de la casa, y decirlo es más
 * útil que publicar tres mil y pico que sólo son ruido.
 */
const UMBRAL = 30;
const separa = filas.filter((f) => Math.max(...f.elo) - Math.min(...f.elo) >= UMBRAL);
console.log(`  ${separa.length} de ${filas.length} separan de verdad (rango ≥ ${UMBRAL} puntos)\n`);
// Sin cortar. Una lista de descartes truncada esconde justo el descarte que no
// esperabas —aquí escondió a `gofish`— y el que no sale se da por bueno.
for (const f of fuera) console.log(gris(`    ${f[0].padEnd(16)} ${f[1]}`));

if (args.md) {
    const cab = `| juego | sillas | partidas | tablas | ${PARTICIPANTES.map((q) => q.nombre).join(' | ')} | separa |`;
    const sep = `|---|---:|---:|---:|${PARTICIPANTES.map(() => '---:').join('|')}|---|`;
    const cuerpo = filas
        .sort((a, b) => (Math.max(...b.elo) - Math.min(...b.elo)) - (Math.max(...a.elo) - Math.min(...a.elo)))
        .map((f) => `| ${f.juego} | ${f.sillas} | ${f.partidas} | ${Math.round(100 * f.tablas / Math.max(1, f.comparaciones))}% | `
            + PARTICIPANTES.map((_, i) => `${Math.round(f.elo[i])}${f.invicto[i] ? ' ∞?' : ''}`).join(' | ')
            + ` | ${Math.max(...f.elo) - Math.min(...f.elo) >= UMBRAL ? '✅' : '—'} |`)
        .join('\n');
    const md = `# La segunda tabla — unos contra otros\n\n`
        + `> Generada por \`node enfrentamiento.mjs --semillas ${SEMILLAS}\`.\n`
        + `> Puntuación relativa por **Bradley–Terry**, anclada en \`primera\` = 1000.\n`
        + `> \`∞?\` = no perdió ninguna: la puntuación está regularizada, no medida.\n\n`
        + `La primera tabla (\`tabla.mjs\`) mide contra la casa con una silla ocupada.\n`
        + `Ésta ocupa **todas** las sillas con participantes y mide quién gana a quién.\n`
        + `Cada participante se sienta en cada silla el mismo número de veces, y toda\n`
        + `partida se re-simula antes de contarse.\n\n`
        + `${cab}\n${sep}\n${cuerpo}\n\n`
        + `**${separa.length} de ${filas.length}** separan de verdad (rango ≥ ${UMBRAL} puntos).\n\n`
        /**
         * Los descartes van EN el documento, no sólo por consola.
         *
         * La mitad de ellos no son «este juego no vale»: son juegos de dos a los
         * que les falta una línea —publicar la puntuación por silla— y que
         * entrarían mañana. Un documento que enseña sólo a los veinte que entran
         * hace pensar que los otros veinte no pueden, y son la lista de tareas.
         */
        + `## Los que no entran, y por qué\n\n`
        + `| juego | motivo |\n|---|---|\n`
        + fuera.map(([j, m]) => `| ${j} | ${m} |`).join('\n') + '\n\n'
        + `Los que dicen «le falta publicar la puntuación por silla» **son juegos de dos\n`
        + `o más**: su \`estado(p, asiento)\` ignora el asiento y devuelve un único punto\n`
        + `de vista, así que no hay nada que comparar entre sillas. Es un arreglo de una\n`
        + `línea por juego, y son los que faltan para completar esta tabla.\n`;
    await mkdir(path.dirname(path.join(AQUI, String(args.md))), { recursive: true });
    await writeFile(path.join(AQUI, String(args.md)), md, 'utf-8');
    console.log(`\n  escrito ${args.md}\n`);
}
