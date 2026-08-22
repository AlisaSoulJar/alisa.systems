/**
 * matriz_generos.mjs — qué estructuras de decisión cubre el motor, MEDIDAS
 * ═══════════════════════════════════════════════════════════════════════════
 * «Con este motor se puede hacer cualquier género» es, hoy por hoy, una
 * afirmación mía. Con veintidós juegos ya conviene que sea una tabla, y una
 * tabla que se llene sola: aquí no se declara nada a mano ni se lee el código
 * buscando palabras — se JUEGAN los veintidós y se observa cómo se comportan.
 *
 * ⚠️ POR QUÉ NO CLASIFICAR POR GÉNERO
 * Porque «puzle», «rogue», «cartas» son etiquetas de tienda, no de ingeniería:
 * no dicen nada sobre qué hay que saber hacer para jugar bien. Ajedrez y go se
 * venden en estanterías distintas y plantean el mismo problema —información
 * perfecta, por turnos, adversario—, mientras que sokoban y cripta comparten
 * estantería y no se parecen en nada donde importa.
 *
 * Lo que se mide son ESTRUCTURAS DE DECISIÓN, que es lo que un banco de pruebas
 * puede puntuar y lo que un agente tiene que resolver.
 *
 * ⚠️ Y POR QUÉ MEDIR EN LUGAR DE DECLARAR
 * Porque una etiqueta escrita a mano envejece en silencio: se cambia una regla y
 * la tabla sigue diciendo lo de antes. En este proyecto eso ya ha pasado con
 * cosas más graves —go publicando el tablero en `board` mientras la puerta de
 * lenguaje lo buscaba en `tablero`, meses sin ver una piedra y sin un error—.
 * Todo lo de aquí sale de ejecutar; lo que no se puede observar sale `?`.
 *
 *   node matriz_generos.mjs            # tabla en consola
 *   node matriz_generos.mjs --md docs/matriz_generos.md
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { JUEGOS, cargarReglas } from './public/arcade/js/protohub/rules/index.js';
import { obtenerSustrato } from './public/arcade/js/protohub/sustrato.js';

const fetchReal = globalThis.fetch;
globalThis.fetch = async (e, i) => {
    const u = e instanceof URL ? e : new URL(String(e));
    if (u.protocol !== 'file:') return fetchReal(e, i);
    return new Response(await readFile(fileURLToPath(u), 'utf-8'), { status: 200 });
};

const TOPE = 30;          // jugadas por sondeo
const SEMILLAS = [3, 11, 29];
/** Las dos primeras sillas: lo mínimo para que exista «el otro». */
const BANDOS_SILLAS = [0, 1];

/**
 * Los cinco ejes. Cada uno responde a «¿qué tiene que saber hacer quien juega?»,
 * y cada uno se comprueba jugando.
 */
const EJES = {
    espacial:     'hay una rejilla: el problema tiene geometría',
    oculto:       'hay estado que el jugador NO ve',
    // ⚠️ Dice «decide alguien más», no «alguien en contra». Lo medido es que el
    // turno cambia de silla, y eso lo cumple igual un adversario que un
    // compañero. Llamarlo rival daba por supuesto lo que aún no se ha mirado —
    // de eso se ocupa `cooperativo`, y por eso son dos ejes y no uno.
    rival:        'decide alguien más (a favor o en contra: ver cooperativo)',
    autonomo:     'hay agentes que se mueven decidas lo que decidas',
    irreversible: 'hay jugadas que no se pueden deshacer',
    simultaneo:   'se decide a la vez: el segundo no ve lo que eligió el primero',
    cooperativo:  'los dos asientos ganan o pierden juntos',
    comunicacion: 'hay jugadas que sólo cambian lo que sabe el otro',
    busqueda:     'lo que no ves se destapa con lo que haces: encontrar ES el juego',
    presupuesto:  'hay un recurso que se gasta y no vuelve: encontrar ANTES de quedarte sin',
};

/** Huella del sustrato: dos estados iguales dan la misma cadena. */
const huella = (sus) => JSON.stringify([
    sus.rejilla ? [sus.rejilla.ancho, sus.rejilla.alto, sus.rejilla.celdas] : null,
    [...sus.piezas].map(p => `${p.t}@${p.x},${p.y}#${p.de}`).sort(),
    [...sus.zonas].map(z => `${z.id}:${z.items.length}+${z.ocultas}`).sort(),
]);

/**
 * Rejuega una partida desde cero y devuelve el estado tras `jugadas`.
 *
 * ⚠️ SE REJUEGA EN VEZ DE CLONAR, Y NO ES UN CAPRICHO. Clonar el estado exige
 * saber qué hay dentro —hay juegos que guardan barajas, mapas y conjuntos— y un
 * clon incompleto daría medidas falsas sin avisar. Rejugar sólo exige lo que el
 * motor ya promete: que la partida es una función de la semilla y las jugadas.
 * La misma propiedad que hace verificable un recibo sirve aquí de instrumento.
 */
async function rejugar(juego, semilla, jugadas) {
    const reglas = await cargarReglas(juego, {});
    const p = reglas.nuevaPartida({ semilla, seed: semilla });
    let hechas = 0;
    for (const m of jugadas) { if (!reglas.mover(p, m)) break; hechas++; }
    /**
     * ⚠️ `completa` NO ES UN ADORNO: SIN ELLA TRES EJES MENTÍAN.
     *
     * Si una jugada del prefijo no encaja, esto cortaba y devolvía el estado a
     * medias sin decirlo. Y como las ramas se construyen añadiendo una jugada AL
     * FINAL, un prefijo roto hace que **todas las ramas acaben en el mismo estado
     * roto** — o sea, idénticas. Las sondas leían esa igualdad como una
     * propiedad del juego: «el segundo no ve lo que eligió el primero», que es
     * literalmente la definición de simultáneo. Así salió **`unit` marcado como
     * simultáneo** sin serlo.
     *
     * Lo mismo envenenaba la irreversibilidad y la autonomía, que también
     * comparan ramas. Un instrumento que confunde «no pude medir» con «medí y no
     * hay diferencia» no falla en un caso: falla siempre hacia el mismo lado.
     */
    return { reglas, p, st: reglas.estado(p), completa: hechas === jugadas.length };
}

const jugables = (st) => (st.legal_moves ?? []).filter(m => m !== 'nueva' && m !== 'reset');

async function sondear(juego) {
    const eje = { espacial: false, oculto: false, rival: false, autonomo: false,
                  irreversible: null, simultaneo: null, cooperativo: null, comunicacion: null,
        busqueda: null, presupuesto: null };
    const puntos = [];
    let jugadas = [], turnos = new Set(), notas = [];
    // Para los dos ejes nuevos: cuánto había oculto como mucho, cuánto quedaba al
    // final, y qué números del estado no subieron nunca. Ver la nota de abajo.
    let ocultoMax = null, ocultoUltimo = null;
    const recursos = {};

    for (const semilla of SEMILLAS) {
        const reglas = await cargarReglas(juego, {});
        const p = reglas.nuevaPartida({ semilla, seed: semilla });
        const camino = [];

        for (let i = 0; i < TOPE; i++) {
            const st = reglas.estado(p);
            if (st.is_game_over) break;
            turnos.add(String(st.turn ?? '?'));

            const antes = obtenerSustrato(juego, reglas, p, st);
            if (antes.rejilla) eje.espacial = true;
            // Las dos ignorancias cuentan: no saber QUÉ hay (`niebla`) y no saber
            // QUIÉN hay (`sinVista`). Son campos distintos porque son cosas
            // distintas, pero las dos son estado que el jugador no ve.
            if (antes.rejilla?.niebla?.some(Boolean)) eje.oculto = true;
            if (antes.rejilla?.sinVista?.some(Boolean)) eje.oculto = true;
            if (antes.zonas?.some(z => z.ocultas > 0)) eje.oculto = true;

            /**
             * ⚠️ DOS EJES NUEVOS, Y NO SON UNA IDEA MÍA: ESTABAN CONSTRUIDOS.
             * ═══════════════════════════════════════════════════════════════
             *
             * La saga Raccoon Scape lleva seis etapas planteando el MISMO problema
             * a seis escalas: encontrar algo gastando poco. Sus propias cabeceras
             * lo dicen — el edificio «mide deducción bajo incertidumbre con
             * presupuesto limitado» y la etapa espacial dedica un párrafo a que
             * «el presupuesto es el número que decide si esto mide algo».
             *
             * Y esta matriz no podía verlo: sus ocho ejes hablan de geometría,
             * información y turnos, y ninguno de BUSCAR ni de GASTAR. Un
             * instrumento sólo enseña huecos que su vocabulario sabe nombrar, así
             * que el hueco no había que inventarlo — había que ponerle palabra.
             *
             * Se detectan JUGANDO, como los otros seis. Declararlos sería la
             * enésima lista paralela.
             */
            const cuentaOculto = (s) =>
                (s?.rejilla?.niebla ?? []).filter(Boolean).length
                + (s?.rejilla?.sinVista ?? []).filter(Boolean).length
                + (s?.zonas ?? []).reduce((n, z) => n + (Number(z.ocultas) || 0), 0);
            const ocultoAhora = cuentaOculto(antes);
            if (ocultoMax === null || ocultoAhora > ocultoMax) ocultoMax = ocultoAhora;
            ocultoUltimo = ocultoAhora;

            /**
             * PRESUPUESTO — un número del estado que sólo BAJA mientras juegas.
             *
             * No vale cualquier número que baje: `ronda` y `jugadas` suben, y un
             * marcador sube y baja. Lo que se busca es un recurso que se gasta —
             * combustible, energía, intentos, cartas del mazo— porque eso es lo
             * que convierte «encontrar» en «encontrar antes de quedarte sin».
             *
             * Se mira el estado entero y se apunta qué campos numéricos no han
             * subido NUNCA en toda la partida. Al final se descartan los que se
             * quedaron clavados: un número constante no es un presupuesto.
             */
            for (const [k, v] of Object.entries(st)) {
                if (typeof v !== 'number' || !Number.isFinite(v)) continue;
                if (/ronda|jugad|turno|semilla|paso|noche/i.test(k)) continue;
                if (!(k in recursos)) { recursos[k] = { primero: v, ultimo: v, subio: false }; continue; }
                if (v > recursos[k].ultimo) recursos[k].subio = true;
                recursos[k].ultimo = v;
            }

            const m = reglas.sugerencia?.(p) ?? jugables(st)[0];
            if (!m || !reglas.mover(p, m)) break;
            camino.push(m);

        }
        const fin = reglas.estado(p);
        if (Number.isFinite(fin.puntos)) puntos.push(fin.puntos);
        // ⚠️ Las jugadas que se guardan son las de la semilla que luego se
        // rejuega, y sólo ésas. Antes se guardaba la partida más larga de las
        // tres y se rejugaba siempre con la primera: un camino de otra semilla no
        // encaja, el rejugado se rompía y las sondas medían un estado a medias.
        if (semilla === SEMILLAS[0]) jugadas = camino;
    }

    eje.rival = turnos.size > 1;

    /**
     * ⚠️ BÚSQUEDA — no basta con que haya algo oculto: tiene que DESTAPARSE.
     *
     * `oculto` ya dice que hay estado que no ves. Buscar es otra cosa: es que lo
     * que no ves se vuelva conocido POR LO QUE HACES. En una mano de póker el
     * estado oculto sigue oculto hasta el final, y eso no es una búsqueda; en el
     * edificio de la saga cada puerta que abres reduce lo desconocido, y eso sí.
     *
     * Se mide como todo aquí, jugando: cuánto había oculto como mucho contra
     * cuánto quedaba al terminar. Si baja más de un tercio, se ha buscado.
     */
    /**
     * ⚠️ Y ESTE DETECTOR NO VALE. QUEDA `null` HASTA QUE VALGA.
     *
     * Escrito así —«bajó lo oculto más de un tercio»— marcó ocho juegos y los ocho
     * eran DE CARTAS: póker, brisca, tute, hearts, gofish, dominó, spades, guerra.
     * En una mano el estado oculto se reduce porque se juegan las cartas, no
     * porque nadie encuentre nada. Es un detector que confunde «se destapa» con
     * «se gasta».
     *
     * Y el motivo de fondo es peor que el fallo: construí el eje pensando en la
     * saga Raccoon Scape, cuyas etapas **no están en esta matriz** —son de familia
     * `propio`, fuera del catálogo del arcade—. O sea que no tenía ni un solo caso
     * positivo conocido contra el que calibrar, y lo publiqué igual. Es la regla 5
     * de `docs/COMO_MEDIR.md`, incumplida una hora después de escribirla.
     *
     * El orden correcto es al revés: meter la saga en el catálogo primero, y con
     * esos seis casos conocidos delante, escribir el detector y comprobar que los
     * caza a ellos y no a una mano de tute.
     *
     * Mientras tanto sale `?`, que en esta matriz significa «no se pudo observar»
     * — y es la verdad.
     */
    eje.busqueda = null;
    void ocultoMax; void ocultoUltimo;

    /**
     * ⚠️ PRESUPUESTO — un recurso que sólo baja y que además se GASTA.
     *
     * De los números del estado que no subieron nunca, se descartan los que se
     * quedaron clavados: una constante no es un presupuesto. Lo que queda es lo
     * que se consume mientras juegas, que es lo que convierte «encontrar» en
     * «encontrar antes de quedarte sin».
     */
    /**
     * ⚠️ Y ÉSTE TAMPOCO VALE, POR EL MISMO MOTIVO Y CON OTRA CARA.
     *
     * «Un número del estado que sólo baja» marcó dos juegos, y en los dos lo que
     * bajaba no era un presupuesto: sokoban «gasta» `nivel` y `cajas_totales`
     * —que son el número de nivel y un total— y alisápolis «gasta» `puntos` y
     * `score`, que es sencillamente el marcador cayendo.
     *
     * Un marcador que baja no es un recurso que se agota. Para distinguirlos hace
     * falta la otra mitad: que llegar a cero TERMINE o inutilice la partida. Eso
     * se puede medir, pero otra vez hay que calibrarlo contra un positivo conocido
     * —el combustible de la etapa espacial, la energía del dron— y esos no están
     * en esta matriz todavía.
     *
     * Se deja el cálculo hecho y la nota puesta, porque el trabajo sirve en cuanto
     * la saga entre. Lo que no se hace es publicar el eje.
     */
    const gastados = Object.entries(recursos)
        .filter(([, r]) => !r.subio && r.ultimo < r.primero)
        .map(([k]) => k);
    eje.presupuesto = null;
    if (gastados.length) notas.push(`baja: ${gastados.slice(0, 4).join(', ')}`);

    /**
     * ⚠️ IRREVERSIBILIDAD, POR REJUGADO.
     *
     * En un punto de la partida se pregunta: después de mover, ¿existe alguna
     * jugada legal que devuelva el tablero exactamente a como estaba? Si no la
     * hay, esa decisión era definitiva — y planificar antes de mover deja de ser
     * un consejo para ser la mecánica. Empujar una caja contra una pared, en
     * sokoban, no tiene vuelta; sacar un caballo y devolverlo, en ajedrez, sí.
     */
    // Varios instantes y bien repartidos: preguntar pronto es preguntar cuando la
    // respuesta todavía es no —los bichos de cripta duermen al empezar y los
    // drones del sigilo tardan en cruzarse—, y preguntar sólo una vez es fiarlo
    // todo a que ese instante fuera representativo.
    const puntosDeCorte = [2, 5, 9, 14, 20, 26].filter(k => k < jugadas.length - 1);
    if (puntosDeCorte.length) {
        try {
            eje.irreversible = false;
            for (const k of puntosDeCorte) {
                const base = await rejugar(juego, SEMILLAS[0], jugadas.slice(0, k));
                const tras = await rejugar(juego, SEMILLAS[0], jugadas.slice(0, k + 1));
                if (!base.completa || !tras.completa) continue;   // no medido ≠ medido
                const antes = huella(obtenerSustrato(juego, base.reglas, base.p, base.st));
                let vuelta = false;
                for (const m of jugables(tras.st)) {
                    const otra = await rejugar(juego, SEMILLAS[0], [...jugadas.slice(0, k + 1), m]);
                    if (!otra.completa) continue;
                    if (huella(obtenerSustrato(juego, otra.reglas, otra.p, otra.st)) === antes) { vuelta = true; break; }
                }
                // Basta UNA decisión sin retorno: el eje dice «las hay», no «todas».
                if (!vuelta) { eje.irreversible = true; break; }
            }
        } catch (e) { notas.push(`irreversible: ${e.message}`); }
    }

    /**
     * ⚠️ «EL MUNDO AVANZA SOLO» — POR COMPARACIÓN DE RAMAS, Y LA PRIMERA VERSIÓN
     * ESTABA MAL.
     *
     * Miraba si alguna pieza ajena aparecía en sitio nuevo tras tu jugada. Con
     * eso **sokoban salía marcado**: la caja no es tuya y se mueve. Pero se mueve
     * PORQUE la empujas — es tu jugada con otro nombre, no vida propia. Una
     * medida que confunde consecuencia con autonomía no mide nada.
     *
     * La pregunta correcta no es «¿se movió algo?» sino «¿se habría movido
     * igual si yo hubiera elegido otra cosa?». Así que se juega el mismo punto
     * DOS VECES con dos jugadas legales distintas: si algo ajeno se mueve en las
     * dos ramas, se mueve porque el mundo corre, no porque tú lo empujes. La
     * caja de sokoban sólo se mueve en la rama en que la empujas; los bichos de
     * la cripta y los coches del peatón se mueven en las dos.
     *
     * ⚠️ Y HAY UNA SEGUNDA CONFUSIÓN, QUE CAZÓ **DAMAS**.
     *
     * Salía marcado, y no tiene nada autónomo: es que el rival contesta DENTRO
     * de tu jugada, así que sus fichas se mueven en las dos ramas. Eso no es el
     * mundo corriendo, es un adversario decidiendo — el eje `rival`, disfrazado.
     *
     * De modo que cuando hay rival sólo cuentan las piezas de NADIE: las que no
     * pertenecen a ninguna silla. Los bichos de la cripta no son un jugador, son
     * el mundo; las damas del contrario sí lo son. Un eje que no distingue eso
     * acaba diciendo que el ajedrez es un juego de acción.
     */
    /**
     * ⚠️ Y SE MIRA EN VARIOS INSTANTES, NO EN UNO — LO PIDIÓ **CRIPTA**.
     * Sondeando sólo la jugada 2 salía sin agentes autónomos teniendo bichos:
     * a esa altura están dormidos, porque sólo persiguen de cerca. Un mundo que
     * reacciona no lo hace desde el primer paso, así que preguntar una vez y al
     * principio es preguntar cuando la respuesta todavía es no.
     */
    const deNadie = (z) => eje.rival ? !(z.de === 0 || z.de === 1) : z.de !== 0;
    const ajenas = (sus) => new Set(sus.piezas.filter(deNadie).map(z => `${z.t}@${z.x},${z.y}`));
    for (const k of puntosDeCorte) {
        if (eje.autonomo) break;
        try {
            const base = await rejugar(juego, SEMILLAS[0], jugadas.slice(0, k));
            const opciones = jugables(base.st).slice(0, 2);
            if (!base.completa || opciones.length < 2) continue;
            const quietas = ajenas(obtenerSustrato(juego, base.reglas, base.p, base.st));
            let enAmbas = true;
            for (const m of opciones) {
                const r = await rejugar(juego, SEMILLAS[0], [...jugadas.slice(0, k), m]);
                const despues = ajenas(obtenerSustrato(juego, r.reglas, r.p, r.st));
                if (!r.completa || ![...despues].some(s => !quietas.has(s))) { enAmbas = false; break; }
            }
            if (enAmbas) eje.autonomo = true;
        } catch (e) { notas.push(`autonomo: ${e.message}`); }
    }

    /**
     * ⚠️ SIMULTÁNEO — Y LA FIRMA ES EXACTA, NO UNA APROXIMACIÓN.
     *
     * Decidir a la vez no se puede leer del código ni del reparto de turnos: un
     * juego simultáneo implementado sobre turnos se parece a uno por turnos en
     * todo… menos en una cosa, y esa cosa es LA definición. **Si el segundo en
     * mover viera lo que eligió el primero, no sería simultáneo, sería tener
     * ventaja.**
     *
     * Así que se juega el mismo punto con dos jugadas distintas del primero y se
     * compara lo que ve el segundo. Si es idéntico, la elección está guardada y
     * no revelada: se decide a la vez. En la flota basta con disparar a otra
     * casilla para que el rival vea el impacto en su mar; en la brisca, la carta
     * cae en la mesa. Ahí la vista cambia, y por eso no lo son.
     */
    if (!eje.rival) eje.simultaneo = false;      // sin segundo, no hay a la vez
    else if (jugadas.length >= 4) {
        try {
            let idénticas = 0, comprobadas = 0;
            for (const k of puntosDeCorte.slice(0, 3)) {
                const base = await rejugar(juego, SEMILLAS[0], jugadas.slice(0, k));
                const opciones = jugables(base.st).slice(0, 3);
                if (!base.completa || opciones.length < 2) continue;
                const vistas = [];
                let rotas = false;
                for (const m of opciones) {
                    const r = await rejugar(juego, SEMILLAS[0], [...jugadas.slice(0, k), m]);
                    if (!r.completa) { rotas = true; break; }
                    /**
                     * ⚠️ SE COMPARA **TODO** LO QUE EL OTRO PUEDE VER, Y ANTES NO.
                     *
                     * La primera versión miraba sólo el sustrato y las jugadas
                     * legales, y marcó **poker como simultáneo**: subir o pasar no
                     * cambia las cartas de la mesa, así que los dos cuadros salían
                     * iguales aunque el bote no lo fuera. Comparar de menos es
                     * afirmar de más.
                     *
                     * El listón correcto es duro a propósito: si el segundo puede
                     * notar CUALQUIER diferencia —el bote, el marcador, un
                     * contador— entonces sabe algo de lo que eligió el primero, y
                     * eso ya no es decidir a la vez.
                     *
                     * ⚠️ Y SE MIRAN LOS DOS ASIENTOS, NO EL ASIENTO 1.
                     *
                     * La primera versión comparaba siempre la vista del asiento
                     * 1, y con eso **este propio banco declaró `frentes` no
                     * simultáneo** siendo el único que lo es. El motivo: en la
                     * mitad de los instantes el que mueve ES el asiento 1, y
                     * claro que ve su propia elección.
                     *
                     * No hace falta averiguar quién mueve —cada juego nombra sus
                     * sillas a su manera y adivinarlo sería otra lista escrita a
                     * mano—. Basta con la propiedad: en un juego por turnos
                     * NINGUNA de las dos vistas sobrevive intacta a que el
                     * primero cambie de jugada; en uno simultáneo, la del que no
                     * mueve sí. Así que se pregunta si ALGUNA queda igual.
                     */
                    vistas.push(BANDOS_SILLAS.map(i => {
                        const suyo = r.reglas.estado(r.p, i);
                        return JSON.stringify([obtenerSustrato(juego, r.reglas, r.p, suyo), suyo]);
                    }));
                }
                if (rotas) continue;
                comprobadas++;
                /**
                 * ⚠️ LAS DOS VISTAS, NO «ALGUNA» — Y LO PIDIÓ **SIGILO**.
                 *
                 * Con «alguna» salía marcado, y no es simultáneo: cuando el
                 * ladrón se mueve sin que el guardia lo vea, la vista del
                 * guardia no cambia. Eso es movimiento OCULTO, que ya tiene su
                 * eje, no decisión a la vez.
                 *
                 * Lo propio de decidir a la vez es que la elección se guarda y
                 * **no produce efecto en ninguna parte** hasta que los dos han
                 * elegido: ni el rival la nota ni el tablero se mueve para
                 * quien la hizo. El ladrón cambia de casilla al instante; el que
                 * elige un frente, no. Ésa es la línea, y es nítida.
                 */
                const todas = BANDOS_SILLAS.every(i => vistas.every(v => v[i] === vistas[0][i]));
                if (todas) idénticas++;
            }
            /**
             * ⚠️ BASTA CON QUE PASE UNA VEZ, Y NO ES RELAJAR EL LISTÓN.
             *
             * Exigirlo en TODOS los instantes es imposible por construcción, y
             * también lo aprendí suspendiendo a `frentes`: en las jugadas del
             * segundo, su elección CIERRA la ronda, así que ahí cambian las dos
             * vistas y ningún juego simultáneo lo cumpliría jamás.
             *
             * Lo que se busca es si el juego tiene el momento: uno en el que has
             * elegido y el otro no puede saberlo. En un juego por turnos eso no
             * pasa ni una sola vez —mover es informar—, y como se compara el
             * estado público ENTERO, colarse por casualidad exigiría que dos
             * jugadas distintas no dejaran ni un rastro diferente.
             */
            if (comprobadas) eje.simultaneo = idénticas > 0;
        } catch (e) { notas.push(`simultaneo: ${e.message}`); }
    }

    /**
     * ⚠️ COOPERATIVO — SE MIRA SI LOS DOS MARCADORES SE MUEVEN JUNTOS.
     *
     * No hace falta preguntarle al juego si es cooperativo: se juega y se mira a
     * dónde va el marcador de cada asiento. Si suben y bajan a la vez, los dos
     * reman en la misma dirección; si uno sube cuando el otro baja, están
     * enfrentados. Es la definición de suma cero, medida en vez de declarada.
     *
     * Sin rival no hay con quién cooperar, así que ahí el eje es `false` y no
     * `?`: no es que no se pueda observar, es que no aplica.
     */
    if (!eje.rival) eje.cooperativo = false;
    else if (jugadas.length >= 6) {
        try {
            const reglas = await cargarReglas(juego, {});
            const q = reglas.nuevaPartida({ semilla: SEMILLAS[0], seed: SEMILLAS[0] });
            let juntos = 0, contra = 0, previo = null, difieren = false;
            for (const m of jugadas) {
                if (!reglas.mover(q, m)) break;
                const st0 = reglas.estado(q, 0), st1 = reglas.estado(q, 1);
                const a = st0.puntos, b = st1.puntos;
                /**
                 * ⚠️ «¿HAY VISTA POR ASIENTO?» SE PREGUNTA AL ESTADO ENTERO, NO
                 * AL MARCADOR — Y ANTES NO, LO QUE HACÍA IMPOSIBLE DETECTAR UN
                 * COOPERATIVO.
                 *
                 * La comprobación miraba si los dos marcadores eran distintos
                 * para descartar los juegos que ignoran el asiento. Correcto para
                 * el ajedrez… y fatal para lo que viene: **en un juego
                 * cooperativo lo normal es que los dos compartan puntuación**,
                 * porque ganan o pierden juntos. Con la regla vieja, el primer
                 * cooperativo de verdad habría salido `?` — descartado por
                 * exhibir justo la propiedad que lo define.
                 *
                 * Lo que hay que saber es si el juego tiene vistas por asiento,
                 * y eso se mira en el estado completo: manos, niebla, posición.
                 * Que el marcador coincida es entonces un dato, no un descarte.
                 */
                if (JSON.stringify(st0) !== JSON.stringify(st1)) difieren = true;
                if (previo && Number.isFinite(a) && Number.isFinite(b)) {
                    const da = a - previo[0], db = b - previo[1];
                    if (da !== 0 || db !== 0) (Math.sign(da) === Math.sign(db) ? juntos++ : contra++);
                }
                previo = [a, b];
            }
            /**
             * ⚠️ Y SI LOS DOS MARCADORES SON EL MISMO NÚMERO, NO SE SABE.
             *
             * La primera versión marcó **el ajedrez como cooperativo**, y con go,
             * reversi, xiangqi y mancala detrás. El motivo no era el juego: es que
             * esos módulos ignoran el asiento en `estado`, así que devuelven el
             * mismo marcador a los dos y «se mueven juntos» por no moverse aparte.
             *
             * Eso no es cooperación, es una vista por asiento que no existe. Sale
             * `?` —no observable— y así el hueco queda a la vista en lugar de
             * disfrazado de virtud. Es la misma trampa que `Function.length`: una
             * comprobación que siempre da lo mismo parece que funciona.
             */
            if (!difieren) eje.cooperativo = null;
            else if (juntos + contra >= 3) eje.cooperativo = juntos / (juntos + contra) > 0.8;
        } catch (e) { notas.push(`cooperativo: ${e.message}`); }
    }

    /**
     * ⚠️ COMUNICACIÓN — Y ES LA COMPLEMENTARIA EXACTA DE LA SIMULTANEIDAD.
     *
     * Simultáneo: eliges y **no cambia nada en ninguna parte** hasta que el otro
     * también elige. Comunicación: eliges, **el mundo sigue igual** —nadie se ha
     * movido, no hay ficha nueva— **pero lo que sabe el otro ha cambiado**.
     *
     * Las dos se miden con las mismas dos ramas, y se distinguen en una sola
     * pregunta: ¿el otro nota algo? Si no nota nada, decidisteis a la vez. Si lo
     * nota sin que se haya movido nada, le has hablado.
     *
     * Que salga de ahí y no de buscar la palabra «mensaje» en el código importa:
     * un juego puede llamarlo pista, seña, apuesta o acusación, y esto lo
     * reconoce igual porque mira el efecto, no el nombre.
     */
    if (!eje.rival) eje.comunicacion = false;
    else if (jugadas.length >= 3) {
        try {
            // ⚠️ Se cuenta lo comprobado para poder decir «·» (medido y no hay) en
            // vez de «?» (no lo sé). La sonda sólo sabía afirmar, así que un juego
            // sin canal salía como no observable — confundir ausencia con
            // ignorancia es el error que esta tabla existe para no cometer.
            let miradas = 0;
            for (const k of puntosDeCorte) {
                if (eje.comunicacion) break;
                const base = await rejugar(juego, SEMILLAS[0], jugadas.slice(0, k));
                const opciones = jugables(base.st).slice(0, 2);
                if (!base.completa || opciones.length < 2) continue;
                /**
                 * ⚠️ EL MUNDO QUIETO SE COMPRUEBA DESDE LAS DOS SILLAS, Y ANTES
                 * NO — POR ESO **SIGILO** SALÍA MARCADO SIN TENER CANAL.
                 *
                 * Se miraba sólo el cuadro del asiento 0. Cuando el guardia se
                 * mueve sin que el ladrón lo vea, ese cuadro no cambia, así que
                 * parecía que nadie se había movido… y como el guardia sí sabía
                 * algo nuevo (dónde está él), la sonda cantaba «le ha hablado».
                 *
                 * Pero moverse a escondidas no es hablar: es moverse. La
                 * diferencia está en que quien habla **no se mueve**, y eso se ve
                 * mirando también su propio cuadro. Con las dos vistas quietas,
                 * lo único que puede haber cambiado es lo que alguien sabe.
                 */
                // ⚠️ Y se pide el sustrato POR SILLA. `obtenerSustrato` llama a
                // `reglas.sustrato(p)` sin asiento, así que devolvía el mismo
                // cuadro dos veces y la comprobación de arriba no comprobaba
                // nada: sigilo seguía saliendo marcado. Un adaptador que ignora
                // un parámetro en silencio se lleva por delante a quien confía.
                const quietud = (reglas, est) => BANDOS_SILLAS
                    .map(i => huella(reglas.sustrato
                        ? reglas.sustrato(est, i)
                        : obtenerSustrato(juego, reglas, est, reglas.estado(est, i)))).join('|');
                const mundoAntes = quietud(base.reglas, base.p);
                const ramas = [];
                for (const m of opciones) {
                    const r = await rejugar(juego, SEMILLAS[0], [...jugadas.slice(0, k), m]);
                    if (!r.completa) { ramas.length = 0; break; }
                    ramas.push({
                        mundo: quietud(r.reglas, r.p),
                        vistas: BANDOS_SILLAS.map(i => JSON.stringify(r.reglas.estado(r.p, i))),
                    });
                }
                if (ramas.length < 2) continue;
                miradas++;
                const mundoQuieto = ramas.every(x => x.mundo === mundoAntes);
                const alguienSeEntera = BANDOS_SILLAS.some(i => ramas[0].vistas[i] !== ramas[1].vistas[i]);
                if (mundoQuieto && alguienSeEntera) eje.comunicacion = true;
            }
            if (miradas && eje.comunicacion === null) eje.comunicacion = false;
        } catch (e) { notas.push(`comunicacion: ${e.message}`); }
    }

    const varia = puntos.length > 1 && new Set(puntos).size > 1;
    return { juego, eje, varia, puntos, notas };
}

// ── Correr ─────────────────────────────────────────────────────────────────
const filas = [];
for (const juego of JUEGOS) {
    try { filas.push(await sondear(juego)); }
    catch (e) { filas.push({ juego, eje: {}, varia: false, notas: [e.message] }); }
}

const marca = (v) => v === true ? '●' : v === false ? '·' : '?';
const clavesEje = Object.keys(EJES);

console.log('\nQué estructuras de decisión cubre el motor, medidas jugando\n');
console.log(`  ${'juego'.padEnd(11)}${clavesEje.map(k => k.slice(0, 4).padEnd(6)).join('')}resultado`);
for (const f of filas) {
    console.log(`  ${f.juego.padEnd(11)}`
        + clavesEje.map(k => marca(f.eje[k]).padEnd(6)).join('')
        + (f.varia ? 'depende de la semilla' : f.puntos?.length ? 'igual en toda semilla' : '—')
        + (f.notas?.length ? `  (${f.notas.join('; ')})` : ''));
}

console.log('\nCobertura por eje\n');
const cobertura = {};
/**
 * ⚠️ «0 DE 40» Y «SIN MEDIR» NO SON LO MISMO, Y AQUÍ SE DECÍAN IGUAL.
 *
 * Un eje que ningún juego cumple es un hueco del catálogo — información útil. Un
 * eje que no se ha sabido medir es un hueco del INSTRUMENTO, y contarlo como cero
 * dice «no hay ninguno» cuando la verdad es «no lo sé». Pasó en cuanto se
 * declararon `busqueda` y `presupuesto` sin un detector que funcionara: los dos
 * salían `0/40 ← VACÍO`, que es exactamente el default disfrazado de dato contra
 * el que avisa la regla 3 de `docs/COMO_MEDIR.md`.
 *
 * Se separan: `null` en todas las filas es «sin medir» y se dice con esa palabra.
 */
for (const k of clavesEje) {
    const medidos = filas.filter(f => f.eje[k] !== null && f.eje[k] !== undefined).length;
    const n = filas.filter(f => f.eje[k] === true).length;
    cobertura[k] = medidos ? n : null;
    if (!medidos) {
        console.log(`  ${k.padEnd(14)}  sin medir  ${EJES[k]}  ← declarado y sin detector que valga`);
        continue;
    }
    const aviso = n === 0 ? '  ← VACÍO' : n === 1 ? '  ← un solo juego lo sostiene' : '';
    console.log(`  ${k.padEnd(14)} ${String(n).padStart(2)}/${medidos}  ${EJES[k]}${aviso}`);
}

/**
 * ⚠️ LOS PERFILES SON LO QUE DE VERDAD DICE SI FALTA ALGO.
 *
 * Que cinco ejes salgan cubiertos no significa que estén cubiertas sus
 * COMBINACIONES, y las combinaciones son las que duelen. Tener juegos con rival
 * y juegos con información oculta no equivale a tener uno con las dos cosas a la
 * vez: el farol sólo existe en la intersección. Aquí se listan los perfiles que
 * el motor demuestra hoy, y un perfil con un solo juego es una pata coja.
 */
console.log('\nPerfiles demostrados (combinaciones de ejes que ya existen)\n');
const perfiles = new Map();
for (const f of filas) {
    const clave = clavesEje.filter(k => f.eje[k] === true).join('+') || '(ninguno)';
    perfiles.set(clave, [...(perfiles.get(clave) ?? []), f.juego]);
}
for (const [clave, js] of [...perfiles.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${String(js.length).padStart(2)}  ${clave.padEnd(46)} ${js.join(', ')}`);
}
console.log(`\n  ${perfiles.size} perfiles distintos sobre ${2 ** clavesEje.length} posibles`);

/**
 * ⚠️ Y LA MISMA MEDIDA, EN UNA PÁGINA.
 *
 * «Con este motor se puede hacer cualquier género» es la frase que sostiene el
 * proyecto entero, y hasta ahora vivía en un documento que sólo lee quien ya nos
 * cree. Aquí sale como tabla pública, con cada juego enlazado a su tablero: quien
 * dude de una fila la abre y juega.
 *
 * Se genera desde la misma pasada que la mide —nunca a mano y nunca aparte—
 * porque una página escrita a mano envejece callando. Esa lección ya la pagamos
 * con el escaparate y con el «los veinte juegos» de la página de jugar, que
 * seguía diciendo veinte con veintidós en la lista.
 */
const html = process.argv.indexOf('--html');
if (html > 0 && process.argv[html + 1]) {
    const ruta = process.argv[html + 1];
    const celda = (v) => v === true ? '<i class="si">●</i>'
                       : v === false ? '<i class="no">·</i>' : '<i class="nd">?</i>';
    const filasHtml = filas.map(f => `<tr><th><a href="/arcade/jugar.html?juego=${f.juego}">${f.juego}</a></th>`
        + clavesEje.map(k => `<td>${celda(f.eje[k])}</td>`).join('')
        + `<td class="var">${f.varia ? 'sí' : '—'}</td></tr>`).join('\n');
    const perfilesHtml = [...perfiles.entries()].sort((a, b) => b[1].length - a[1].length)
        .map(([c, js]) => `<li><code>${c}</code> <span>${js.join(', ')}</span></li>`).join('\n');

    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, `<!doctype html><html lang="es"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ALISA — matriz de géneros</title>
<meta name="alisa-escaparate" content="motor">
<style>
:root{color-scheme:light dark}
body{margin:0;padding:2.5rem 1.25rem;background:#f4f6f8;color:#1a2230;
     font:15px/1.6 ui-sans-serif,system-ui,sans-serif}
main{max-width:56rem;margin:0 auto}
h1{font:600 1.5rem/1.2 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase}
p.sub{color:#4a5866;max-width:44rem}
table{border-collapse:collapse;width:100%;margin:1.5rem 0;background:#fff;
      border:1px solid #d9e0e7;font-size:14px}
th,td{padding:.4rem .6rem;border-bottom:1px solid #eef2f5;text-align:center}
thead th{font:600 11px/1.4 ui-monospace,monospace;text-transform:uppercase;
         letter-spacing:.06em;color:#4a5866;text-align:center}
tbody th{text-align:left;font-weight:500}
tbody th a{color:#1a2230;text-decoration:none;border-bottom:1px solid #c9d3dd}
tbody th a:hover{border-bottom-color:#1a2230}
i{font-style:normal}.si{color:#1a2230}.no{color:#c2ccd6}.nd{color:#c0392b}
td.var{color:#4a5866;font-size:13px}
ul.ejes,ul.perf{list-style:none;padding:0}
ul.ejes li{margin:.3rem 0}ul.ejes code,ul.perf code{background:#e9eef3;padding:.1rem .35rem;border-radius:3px}
ul.perf li{margin:.35rem 0}ul.perf span{color:#4a5866}
footer{margin-top:2.5rem;color:#7f8c8d;font-size:13px}
@media(prefers-color-scheme:dark){
 body{background:#12171d;color:#e6ecf2}table{background:#1a2028;border-color:#2b3540}
 th,td{border-bottom-color:#232c36}tbody th a{color:#e6ecf2;border-bottom-color:#3a4550}
 .si{color:#e6ecf2}.no{color:#3d4854}ul.ejes code,ul.perf code{background:#232c36}
 p.sub,thead th,ul.perf span,td.var{color:#9aa8b5}}
</style></head><body><main>
<h1>Matriz de géneros</h1>
<p class="sub">Qué estructuras de decisión cubre el motor. <b>Nada de esta tabla está
escrito a mano</b>: se generó jugando los ${filas.length} juegos y observando cómo se
comportan. <i class="si">●</i> medido presente · <i class="no">·</i> medido ausente ·
<i class="nd">?</i> no observable. Cada juego enlaza a su tablero — si dudas de una
fila, ábrela y juega.</p>
<p class="sub">Se clasifica por estructura de decisión y no por género de tienda,
porque «puzle» o «cartas» no dicen qué hay que saber hacer para jugar bien: ajedrez
y go se venden en estanterías distintas y plantean el mismo problema, mientras que
sokoban y cripta comparten estantería y no se parecen en nada donde importa.</p>
<ul class="ejes">${Object.entries(EJES).map(([k, v]) =>
    `<li><code>${k}</code> — ${v}</li>`).join('')}</ul>
<table><thead><tr><th>juego</th>${clavesEje.map(k =>
    `<th>${k}</th>`).join('')}<th>depende de<br>quién juega</th></tr></thead>
<tbody>${filasHtml}</tbody></table>
<h2 style="font:600 1rem/1.2 ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase">
Perfiles demostrados</h2>
<p class="sub">Que los cinco ejes estén cubiertos no significa que lo estén sus
combinaciones, y son las combinaciones las que duelen: tener juegos con rival y
juegos con información oculta no equivale a tener uno con las dos cosas —el farol
sólo existe en la intersección. <b>${perfiles.size} de ${2 ** clavesEje.length}
posibles.</b></p>
<ul class="perf">${perfilesHtml}</ul>
<h2>De qué NO habla esta tabla</h2>
<p class="sub">Mide los ${filas.length} juegos por turnos del arcade y <b>no mira los seis
entornos nativos del gym</b> —Asteroids, Marabunta, Raccoon Space, Cabinet Escape, Rue
del Percebe y Chopper Terrarium—, que son justamente los de <b>tiempo real y acción</b>,
con física propia. Se dice aquí porque un instrumento que calla de qué no habla invita a
leer sus silencios como ausencias: de esta tabla sola se concluiría que el motor no hace
juegos de acción, y los hace.</p>
<footer>Generado por <code>matriz_generos.mjs</code> en cada empaquetado.
Si una fila miente, la prueba está en <code>/arcade/jugar.html</code>.</footer>
</main></body></html>
`, 'utf-8');
    console.log(`\n  → ${ruta}`);
}

/**
 * ⚠️ JSON PORQUE ESTA TABLA HAY QUE CRUZARLA, NO SÓLO LEERLA.
 *
 * Hasta ahora salía en markdown y en HTML: las dos para ojos humanos. Pero el
 * perfil de un JUGADOR se calcula cruzando qué ejes ejercita cada juego con cómo
 * le fue en cada juego, y para eso hace falta el dato, no su maquetación.
 *
 * La alternativa era parsear el markdown, que es exactamente el pecado que este
 * proyecto lleva quitando: derivar de una presentación en vez de del origen.
 */
const json = process.argv.indexOf('--json');
if (json > 0 && process.argv[json + 1]) {
    await mkdir(dirname(process.argv[json + 1]), { recursive: true });
    await writeFile(process.argv[json + 1], JSON.stringify({
        generado: new Date().toISOString(),
        ejes: EJES,
        juegos: Object.fromEntries(filas.map(f => [f.juego, f.eje])),
    }, null, 2) + '\n', 'utf-8');
    console.log(`\n  → ${process.argv[json + 1]}`);
}

const md = process.argv.indexOf('--md');
if (md > 0 && process.argv[md + 1]) {
    const ruta = process.argv[md + 1];
    const cab = `| juego | ${clavesEje.join(' | ')} | el resultado depende de quién juega |`;
    const sep = `|---|${clavesEje.map(() => '---').join('|')}|---|`;
    const cuerpo = filas.map(f => `| ${f.juego} | `
        + clavesEje.map(k => marca(f.eje[k])).join(' | ')
        + ` | ${f.varia ? 'sí' : 'no'} |`).join('\n');
    const texto = `# Matriz de géneros\n\n`
        + `> Generado por \`matriz_generos.mjs\` **jugando** los ${filas.length} juegos.\n`
        + `> No hay ninguna etiqueta escrita a mano: \`●\` medido presente, \`·\` medido ausente,\n`
        + `> \`?\` no observable. Se clasifica por estructura de decisión y no por género de\n`
        + `> tienda, porque «puzle» o «cartas» no dicen qué hay que saber hacer para jugar bien.\n\n`
        + Object.entries(EJES).map(([k, v]) => `- **${k}** — ${v}`).join('\n')
        + `\n\n${cab}\n${sep}\n${cuerpo}\n\n## Cobertura\n\n`
        + clavesEje.map(k => `- \`${k}\`: **${cobertura[k]}/${filas.length}**`).join('\n')
        + `\n\n## Perfiles demostrados\n\n`
        + [...perfiles.entries()].sort((a, b) => b[1].length - a[1].length)
            .map(([c, js]) => `- \`${c}\` — ${js.join(', ')}`).join('\n') + '\n';
    await mkdir(dirname(ruta), { recursive: true });
    await writeFile(ruta, texto, 'utf-8');
    console.log(`\n  → ${ruta}`);
}
