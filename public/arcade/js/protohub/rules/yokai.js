/**
 * yokai.js — EL JUEGO DONDE HABLAR NO ES UNA AYUDA: ES TODO EL JUEGO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Seis vecinos de una aldea. Dos no son vecinos: son yokai con forma humana. De
 * noche los yokai se llevan a alguien y el oráculo lee el alma de uno. De día se
 * habla y se expulsa a uno por votación, sea quien sea.
 *
 * ⚠️ POR QUÉ ESTE JUEGO, Y POR QUÉ AHORA.
 *
 * En nave le dimos voz a la junta y el banco no se movió: 0.41 → 0.38, dentro del
 * ruido. La causa se vio midiendo, no discutiendo — con dos rondas y cuatro bocas,
 * un jugador aporta 2 de 8 intervenciones y su voz se diluye entre tres voces
 * competentes de la casa. Nave sirvió para probar el mecanismo: el debate como
 * jugada, el habla libre auditada, las dos divisiones. Lo que nave no puede ser es
 * el juego donde ese mecanismo DECIDE.
 *
 * Aquí no hay nada más que hacer. No hay tablero que recorrer ni tareas que
 * completar: un aldeano sólo señala de noche —y no le sirve de nada—, habla de día
 * y vota. El cien por cien de sus decisiones son palabra. Quien habla mal no es un
 * jugador flojo en una faceta: es un jugador flojo, punto.
 *
 * ⚠️ Y NO ES UNA COPIA DE NADA CONCRETO.
 *
 * La deducción social es folclore —se juega en campamentos desde hace décadas— y
 * de eso hay muchas versiones con dueño. Ésta usa la mecánica de siempre con su
 * propia piel, como nave hizo con la suya: aquí no hay lobos ni aldeas europeas,
 * hay yokai tomando forma humana y un oráculo que les lee el alma.
 *
 * ⚠️ LO QUE ESTE JUEGO HEREDA, Y ES CASI TODO.
 *
 * No inventa un solo mecanismo. El compromiso oculto —todos eligen a la vez y
 * nadie ve lo del otro hasta que se resuelve— viene de `frentes` y pasó por nave.
 * El debate como jugada, con su menú y su norma de habla libre, es de nave tal
 * cual. La información por asiento es de `cabina` y `flota`. Lo único nuevo es que
 * aquí no queda nada debajo cuando quitas la conversación.
 *
 * ⚠️ LAS AFIRMACIONES LAS PUEDE HACER CUALQUIERA. ESO ES EL JUEGO ENTERO.
 *
 * `afirmo_yokai:X` significa «he visto que X es un yokai». Lo puede decir el
 * oráculo, y entonces es verdad. Lo puede decir un yokai, y entonces es mentira.
 * Nadie puede comprobarlo. Si la lista de jugadas sólo se la ofreciera al oráculo,
 * el juego se acabaría: bastaría mirar quién PUEDE afirmar. Es la misma ley que
 * en nave obliga a ofrecer `sabotear` a los cuatro, y aquí no es una precaución
 * técnica — es la partida.
 */

/**
 * ⚠️ OCHO SILLAS, Y EL NÚMERO LO ELIGIÓ UNA MEDIDA CON DOS VARAS.
 *
 * Esto nació con seis, y seis funcionaba. Pero un juego de esta casa tiene que ser
 * jugable para una persona **y** servir de medida, y esas dos cosas piden lo
 * contrario a ratos. Así que se midieron juntas, sobre ochenta semillas y con el
 * hueco emparejado silla a silla:
 *
 *                equilibrio   días   decisiones   hueco casa−suelo
 *     6 sillas     35–45       2,7      4,9       27,9 ± 3,8  (señal 7,3×)
 *     7 sillas     22–58       2,5      5,3       12,1 ± 2,2  (señal 5,6×)
 *     8 sillas     42–38       3,6      7,3       19,5 ± 2,9  (señal 6,7×)
 *
 * Ocho gana en las tres varas humanas —equilibrio casi par, partidas más largas,
 * más que decidir— y no cuesta nada en la del banco: 6,7 veces su propio error
 * contra 7,3, cuando por debajo de 2 es donde un hueco deja de distinguirse de
 * cero. Las dos separan de sobra.
 *
 * ⚠️ Y LAS DECISIONES SON EL MOTIVO DE FONDO. La tabla dio un azar de 2,15 en
 * yokai —un número sin sentido— y la causa no era el juego: con seis sillas y la
 * casa jugando cinco, al agente le tocaban CINCO decisiones por partida. Con
 * ±45 por voto y ±200 por ganar, cinco decisiones no separan nada. Ocho sillas
 * dan 7,3, un cincuenta por ciento más.
 *
 * Siete es el peor de los tres en todo, y también eso lo dijo la medida: 22–58 de
 * equilibrio y la mitad de hueco. No hay una intuición que lo hubiera adivinado.
 */
const SILLAS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const YOKAIS = 2;
const NOCHES = 12;

export const OBJETIVO = 'Objetivo: si eres humano, expulsar a los dos yokai antes de que'
                      + ' os igualen; si eres yokai, sobrevivir hasta ser tantos como ellos.';

/**
 * Las normas, con la misma forma que en nave y por el mismo motivo: cambian QUÉ ES
 * LEGAL, así que viajan en el recibo o `{juego, semilla, jugadas}` deja de bastar.
 */
export const NORMAS = {
    // Cuántas rondas se habla antes de votar. Con 0 se vota a ciegas, que es el
    // control: sirve para medir cuánto aporta hablar.
    rondasDeDebate: 2,
    // Falso: sólo el menú — la división de protocolo, donde compite una política
    // programada. Cierto: además `decir:<texto>`, la división de lenguaje natural.
    hablaLibre: false,
};

const normasDe = (o = {}) => ({ ...NORMAS, ...o });
const LARGO_FRASE = 160;

/** Aleatorio con semilla: la misma semilla tiene que dar el mismo reparto. */
function azarDe(semilla) {
    let s = (semilla | 0) || 1;
    return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
}

const vivosDe = (p) => p.gente.filter((g) => g.vivo);
const esYokai = (p, silla) => p.yokai.includes(silla);

/**
 * Lo que se puede decir, y a quién. Sale SÓLO de quién está vivo y de quién habla
 * —las dos cosas públicas—, nunca del papel: ver la nota de la cabecera.
 */
function jugadasDeDebate(vivos, quienHabla) {
    const otros = vivos.filter((g) => g.silla !== quienHabla).map((g) => g.silla);
    return [
        'callar',
        ...otros.map((s) => `acuso:${s}`),
        ...otros.map((s) => `defiendo:${s}`),
        ...otros.map((s) => `afirmo_yokai:${s}`),
        ...otros.map((s) => `afirmo_humano:${s}`),
    ];
}

/** Cuántas acusaciones lleva encima cada silla, de todo lo dicho hoy. */
function pesoDeLoDicho(dichos) {
    const contra = {}, favor = {}, señalados = {}, limpiados = {};
    for (const d of dichos) {
        const [verbo, a] = d.jugada.split(':');
        if (!a) continue;
        if (verbo === 'acuso') contra[a] = (contra[a] ?? 0) + 1;
        if (verbo === 'defiendo') favor[a] = (favor[a] ?? 0) + 1;
        if (verbo === 'afirmo_yokai') señalados[a] = (señalados[a] ?? 0) + 1;
        if (verbo === 'afirmo_humano') limpiados[a] = (limpiados[a] ?? 0) + 1;
    }
    return { contra, favor, señalados, limpiados };
}

/**
 * El más votado de una cuenta.
 *
 * ⚠️ CON `desempatar`, UN EMPATE NO ES «NO SÉ»: ES «ELIGE IGUAL QUE YO».
 *
 * Sin esto, la casa se abstenía en cuanto había dos candidatos igualados — y
 * medido, eso regalaba la partida: los votos empatados no expulsan a nadie, así
 * que la aldea pasaba las noches perdiendo gente sin haber sacado a uno solo. Los
 * yokai ganaban 75 de 80.
 *
 * Para DECIDIR A QUIÉN CREER, un empate sí es no saber y se devuelve null. Para
 * VOTAR, abstenerse es la peor jugada posible, así que se desempata por letra: no
 * es sabio, pero es una decisión, y todos los aldeanos de la casa desempatan igual
 * — que es lo que hace falta para que un linchamiento salga adelante.
 */
function elMasDe(cuenta, excluir = null, desempatar = false) {
    const orden = Object.entries(cuenta)
        .filter(([s]) => s !== excluir)
        .sort((x, y) => (y[1] - x[1]) || (x[0] < y[0] ? -1 : 1));
    if (!orden.length) return null;
    if (!desempatar && orden.length > 1 && orden[0][1] === orden[1][1]) return null;
    return orden[0][0];
}

export function crearYokai(opts = {}) {
    const n = normasDe(opts.normas ?? opts);
    return { ...yokai, NORMAS: n, nuevaPartida: (o = {}) => yokai.nuevaPartida({ ...o, normas: n }) };
}

export const yokai = {
    OBJETIVO,
    NORMAS,
    ASIENTOS: SILLAS.length,
    /** Quién es quién, para pintar. No dice papeles: eso es la partida. */
    COLORES: Object.fromEntries(SILLAS.map((s, i) => [s, ['#e0e0ec', '#a78bfa', '#7dd3a0',
                                                          '#ffcf8b', '#ff8ba7', '#8bd3ff'][i]])),

    nuevaPartida(opts = {}) {
        const semilla = Number(opts.semilla ?? opts.seed ?? 1) || 1;
        const azar = azarDe(semilla);

        /**
         * El reparto. Se baraja con la semilla y se cortan los dos primeros: así la
         * misma semilla da siempre el mismo reparto, que es lo que permite comparar
         * dos políticas sobre la MISMA partida.
         */
        const baraja = SILLAS.slice();
        for (let i = baraja.length - 1; i > 0; i--) {
            const j = Math.floor(azar() * (i + 1));
            [baraja[i], baraja[j]] = [baraja[j], baraja[i]];
        }
        const yokaiSillas = baraja.slice(0, YOKAIS);
        const oraculo = baraja[YOKAIS];

        return {
            semilla, normas: normasDe(opts.normas),
            gente: SILLAS.map((s) => ({ silla: s, vivo: true })),
            yokai: yokaiSillas, oraculo,
            /** Lo que el oráculo ha leído: silla → 'yokai' | 'humano'. Privado. */
            visiones: {},
            fase: 'noche', noche: 1, rondaDebate: 0,
            dichos: [], historial: [],
            oculta: {}, turno: SILLAS[0],
            /** A quién se llevaron / expulsaron, para contarlo. */
            ultimaVictima: null, ultimoExpulsado: null,
            /**
             * ⚠️ LO QUE CADA UNO ACIERTA POR SU CUENTA. Ver la nota de `puntos`.
             * Se cuenta al resolver cada voto y no se recalcula: la partida es la
             * fuente, así que el verificador saca los mismos números re-jugándola.
             */
            aciertos: Object.fromEntries(SILLAS.map((s) => [s, 0])),
        };
    },

    /**
     * ⚠️ EL SUSTRATO NO TIENE REJILLA, Y ESO NO ES UNA CARENCIA.
     *
     * Aquí no hay sitio. Lo único que hay son personas y lo que han dicho de cada
     * una, así que el sustrato son ZONAS: una por vecino, con lo que se sabe de él.
     * Un juego de deducción social dibujado como un tablero sería dibujar lo que no
     * importa.
     *
     * Y va POR ASIENTO: el oráculo ve sus lecturas, los yokai se ven entre ellos, y
     * un aldeano no ve nada que no se haya dicho en voz alta.
     */
    sustrato(p, asiento = 0) {
        const yo = p.gente[asiento] ?? p.gente[0];
        const soyYokai = esYokai(p, yo.silla);
        const soyOraculo = yo.silla === p.oraculo;
        const peso = pesoDeLoDicho(p.dichos);

        const zonas = p.gente.map((g) => {
            const etiquetas = [];
            if (!g.vivo) etiquetas.push('fuera');
            if (g.silla === yo.silla) etiquetas.push('tú');
            // Lo que YO sé de él, que no tiene por qué saberlo nadie más.
            if (soyYokai && esYokai(p, g.silla) && g.silla !== yo.silla) etiquetas.push('yokai');
            if (soyOraculo && p.visiones[g.silla]) etiquetas.push(`leído: ${p.visiones[g.silla]}`);
            // Y lo que se ha dicho en voz alta, que lo sabe todo el mundo.
            if (peso.contra[g.silla]) etiquetas.push(`acusado ×${peso.contra[g.silla]}`);
            if (peso.señalados[g.silla]) etiquetas.push(`señalado yokai ×${peso.señalados[g.silla]}`);
            if (peso.limpiados[g.silla]) etiquetas.push(`avalado ×${peso.limpiados[g.silla]}`);
            return { id: g.silla, items: etiquetas, ocultas: 0 };
        });

        return {
            zonas, piezas: [],
            leyenda: Object.fromEntries(SILLAS.map((s) => [s, `vecino ${s}`])),
            colores: this.COLORES,
        };
    },

    describir(p, asiento = 0) {
        const st = this.estado(p, asiento);
        const yo = p.gente[asiento] ?? p.gente[0];
        const papel = st.soy_yokai
            ? `Eres YOKAI. Tu igual es ${p.yokai.filter(s => s !== yo.silla).join(', ') || 'nadie ya'}.`
              + ' De noche os lleváis a uno; de día, disimula.'
            : yo.silla === p.oraculo
                ? 'Eres el ORÁCULO. Cada noche lees el alma de uno. Nadie sabe que lo eres,'
                  + ' y decirlo te pone en la lista de los yokai.'
                : 'Eres ALDEANO. No tienes poderes: sólo lo que oyes y a quién crees.';

        const vivos = vivosDe(p).map(g => g.silla).join(', ');
        const dicho = st.dichos.length
            ? st.dichos.map(d => `${d.quien} ${d.dijo.replace(/_/g, ' ').replace(':', ' a ')}`).join(' · ')
            : 'nadie ha hablado';

        let escena;
        if (st.fase === 'noche') {
            escena = `NOCHE ${p.noche}. Señala a alguien. Si eres yokai, es a quien os lleváis;`
                   + ` si eres el oráculo, a quien lees; si no, no pasa nada.\n`;
        } else if (st.fase === 'debate') {
            escena = `DÍA ${p.noche} — se habla (ronda ${p.rondaDebate + 1} de ${p.normas.rondasDeDebate}).`
                   + ` Todos habláis A LA VEZ.\nDicho hoy: ${dicho}\n`;
        } else {
            escena = `DÍA ${p.noche} — se vota. El más votado se va; si hay empate, no se va nadie.\n`
                   + `Se dijo hoy: ${dicho}\n`;
        }

        const lecturas = yo.silla === p.oraculo && Object.keys(p.visiones).length
            ? `Has leído: ${Object.entries(p.visiones).map(([s, v]) => `${s}=${v}`).join(', ')}\n`
            : '';

        return `Yokai. Eres ${yo.silla}. ${papel}\n`
             + `${OBJETIVO}\n`
             + `Vivos: ${vivos} (${st.vivos} de ${SILLAS.length}).`
             + (p.ultimaVictima ? ` Anoche se llevaron a ${p.ultimaVictima}.` : '')
             + (p.ultimoExpulsado ? ` Ayer se expulsó a ${p.ultimoExpulsado}.` : '') + '\n'
             + escena + lecturas
             + (st.is_game_over ? `\n${st.desenlace}.`
                 : `\nTe toca: ${st.turn === yo.silla ? 'sí' : 'no'}.`
                   + ` Puedes: ${st.legal_moves.join(', ')}.`);
    },

    estado(p, asiento = 0) {
        const yo = p.gente[asiento] ?? p.gente[0];
        const vivos = vivosDe(p);
        const yokaisVivos = vivos.filter((g) => esYokai(p, g.silla)).length;
        const humanosVivos = vivos.length - yokaisVivos;

        const gananHumanos = yokaisVivos === 0;
        const gananYokai = !gananHumanos && yokaisVivos >= humanosVivos;
        const terminada = gananHumanos || gananYokai || p.noche > NOCHES;

        const soyYokai = esYokai(p, yo.silla);

        let legales;
        if (terminada) legales = ['nueva'];
        else if (p.fase === 'noche') {
            /**
             * ⚠️ TODO EL MUNDO SEÑALA, Y SÓLO SURTE EFECTO A QUIEN LE TOCA.
             *
             * Un yokai señala a su presa, el oráculo a quien va a leer, y un aldeano
             * a nadie que le sirva. Si la lista distinguiera, la propia lista diría
             * el papel — y en un juego cuyo objeto es no saber los papeles, eso lo
             * resolvería sin jugarlo. Es la ley que ya aprendió `sabotear` en nave,
             * y aquí no es higiene: es la regla.
             */
            legales = vivos.filter((g) => g.silla !== p.turno).map((g) => `senalar:${g.silla}`);
        } else if (p.fase === 'debate') {
            legales = jugadasDeDebate(vivos, p.turno);
        } else {
            legales = ['voto:nadie', ...vivos.map((g) => `voto:${g.silla}`)];
        }

        return {
            juego: 'yokai',
            silla: yo.silla, turn: p.turno,
            objetivo: OBJETIVO,
            normas: p.normas,
            fase: p.fase, noche: p.noche,
            vivo: yo.vivo, vivos: vivos.length,
            /** Tu papel es tuyo: cada asiento ve el suyo y ninguno más. */
            soy_yokai: soyYokai,
            soy_oraculo: yo.silla === p.oraculo,
            /** Los yokai se conocen. Un aldeano recibe la lista vacía. */
            mis_iguales: soyYokai ? p.yokai.filter((s) => s !== yo.silla) : [],
            /** Y el oráculo, sus lecturas. Nadie más las ve. */
            mis_lecturas: yo.silla === p.oraculo ? { ...p.visiones } : {},
            /** Lo dicho es público: son afirmaciones a la cara. */
            dichos: p.dichos.map((d) => ({ ronda: d.ronda, quien: d.silla, dijo: d.jugada })),
            ultima_victima: p.ultimaVictima,
            ultimo_expulsado: p.ultimoExpulsado,
            /**
             * ⚠️ LA MITAD DE LA PUNTUACIÓN ES TUYA, Y ESO NO ES UN ADORNO.
             *
             * La primera versión puntuaba sólo el resultado del EQUIPO —ganar,
             * cuántos yokai cayeron, si sobrevives—. Medido con la metodología del
             * banco, eso no separaba nada: la casa sacaba 177,7 y la política tonta
             * 170,9. Seis puntos de hueco sobre ciento setenta y cinco, o sea ruido.
             *
             * El motivo es propio de este género y conviene tenerlo escrito: en una
             * mesa de seis, cinco sillas las juega otro. Tu marcador lo decide sobre
             * todo QUÉ PAPEL TE TOCÓ y qué hizo el equipo, y tu decisión se ahoga en
             * eso. Es la misma razón por la que un paper de Werewolf necesita cientos
             * de partidas para decir algo.
             *
             * Así que se puntúa además lo que decides TÚ: cada voto tuyo contra un
             * yokai suma y cada voto contra un vecino resta —al revés si eres yokai—.
             * Se juzga la decisión con lo que había, no si salió bien: puedes votar
             * al yokai correcto y que la aldea no te haga caso, y eso sigue siendo
             * jugar bien.
             *
             * Sigue habiendo pendiente de equipo, porque ganar tiene que valer más
             * que acertar votos sueltos — si no, el mejor jugador sería el que acierta
             * y pierde.
             */
            puntos: (soyYokai
                ? (gananYokai ? 200 : 0) + (SILLAS.length - vivos.length) * 20 + (yo.vivo ? 40 : 0)
                : (gananHumanos ? 200 : 0) + (YOKAIS - yokaisVivos) * 60 + (yo.vivo ? 30 : 0))
                + (p.aciertos[yo.silla] ?? 0) * 45,
            gana: soyYokai ? gananYokai : gananHumanos,
            desenlace: !terminada ? null
                : gananHumanos ? 'La aldea expulsó a los dos yokai'
                : gananYokai ? `Los yokai igualaron a la aldea (${p.yokai.join(' y ')})`
                : 'Amaneció y nadie resolvió nada',
            semilla: p.semilla,
            legal_moves: legales,
            // La forma de lo que no se puede enumerar. Sólo en debate y sólo con la
            // norma: fuera de ahí, una frase no es una jugada. El verificador la
            // audita y CUENTA cuántas pasaron por aquí — ver `Verificador.js`.
            ...(p.fase === 'debate' && p.normas?.hablaLibre
                ? { legal_patterns: [`^decir:.{1,${LARGO_FRASE}}$`] } : {}),
            is_game_over: terminada,
        };
    },

    mover(p, jugada) {
        const orden = String(jugada);
        const st = this.estado(p, SILLAS.indexOf(p.turno));
        if (st.is_game_over) return false;
        const encaja = (st.legal_patterns ?? []).some((re) => new RegExp(re).test(orden));
        if (!encaja && !st.legal_moves.includes(orden)) return false;

        // Se GUARDA, no se aplica: nadie ve lo que eligieron los demás hasta que ya
        // no se puede cambiar de idea. Heredado de `frentes` vía nave.
        p.oculta[p.turno] = orden;

        const vivos = vivosDe(p);
        const siguiente = vivos.find((g) => !(g.silla in p.oculta));
        if (siguiente) { p.turno = siguiente.silla; return true; }

        if (p.fase === 'noche') this._resolverNoche(p);
        else if (p.fase === 'debate') this._resolverDebate(p);
        else this._resolverVoto(p);

        p.oculta = {};
        const sigue = vivosDe(p)[0];
        p.turno = sigue ? sigue.silla : SILLAS[0];
        return true;
    },

    _resolverNoche(p) {
        // El oráculo lee: aprende el papel de a quien señaló, y sólo él.
        const eleccionOraculo = p.oculta[p.oraculo];
        if (eleccionOraculo?.startsWith('senalar:')) {
            const a = eleccionOraculo.slice(8);
            p.visiones[a] = esYokai(p, a) ? 'yokai' : 'humano';
        }
        /**
         * Los yokai se llevan a uno. Si señalan a dos distintos no se llevan a
         * nadie: cazar exige ponerse de acuerdo, y no tienen forma de hablar de
         * noche — que es exactamente la desventaja que compensa saber quién es quién.
         */
        const tiros = p.yokai
            .filter((s) => p.gente.find((g) => g.silla === s)?.vivo)
            .map((s) => p.oculta[s])
            .filter((o) => o?.startsWith('senalar:'))
            .map((o) => o.slice(8))
            .filter((a) => !esYokai(p, a));
        const acuerdo = tiros.length && tiros.every((t) => t === tiros[0]) ? tiros[0] : null;

        p.ultimaVictima = null;
        if (acuerdo) {
            const v = p.gente.find((g) => g.silla === acuerdo && g.vivo);
            if (v) { v.vivo = false; p.ultimaVictima = v.silla; p.historial.push(`noche ${p.noche}: se llevaron a ${v.silla}`); }
        } else p.historial.push(`noche ${p.noche}: los yokai no se pusieron de acuerdo`);

        p.fase = (p.normas?.rondasDeDebate ?? 0) > 0 ? 'debate' : 'voto';
        p.rondaDebate = 0; p.dichos = [];
    },

    _resolverDebate(p) {
        for (const [silla, jugada] of Object.entries(p.oculta)) {
            p.dichos.push({ ronda: p.rondaDebate, silla, jugada });
        }
        p.rondaDebate++;
        if (p.rondaDebate >= (p.normas?.rondasDeDebate ?? 0)) p.fase = 'voto';
    },

    _resolverVoto(p) {
        const cuenta = {};
        for (const [silla, orden] of Object.entries(p.oculta)) {
            const a = orden.slice(5);
            if (a && a !== 'nadie') cuenta[a] = (cuenta[a] ?? 0) + 1;
            p.historial.push(`${silla} votó ${a}`);
            /**
             * ⚠️ SE APUNTA SI TU VOTO ERA BUENO, VOTO A VOTO.
             *
             * Un humano acierta cuando vota a un yokai y se equivoca cuando vota a
             * un vecino; a un yokai le vale lo contrario. No depende de que salga
             * expulsado: se juzga TU decisión con lo que había, no el resultado
             * colectivo. Abstenerse no suma ni resta — es cobarde, no incorrecto.
             */
            /**
             * ⚠️ ABSTENERSE NO ES GRATIS, Y LO ERA. TERCERA VEZ CON EL SILENCIO.
             *
             * Aquí ponía `continue`: no votar no sumaba ni restaba. Parecía justo
             * —no te juzgo por lo que no hiciste— y convirtió al juego en
             * inmedible. La política tonta elige la PRIMERA jugada legal, y la
             * primera es `callar` en el debate y `voto:nadie` en la votación. O
             * sea que jugaba a no hacer nada, y sacaba 130,0 contra los 133,8 de
             * la casa. La tabla lo descartó con el motivo exacto: «la casa no
             * supera al suelo».
             *
             * Y no es sólo un problema de medida: en este juego **el silencio es
             * una jugada, y beneficia a los yokai**. Si nadie vota no sale nadie,
             * y esa noche se llevan a otro. Ya lo aprendí con el debate —callar
             * hacía ganar a los yokai 75 de 80— y lo dejé sin arreglar en el voto.
             *
             * Así que la abstención cuenta un TERCIO de lo que cuenta equivocarse,
             * y con signo opuesto según a quién le convenga que no pase nada: al
             * humano le resta, al yokai le suma. No es tan malo como votar mal
             * —dudar es legítimo— pero deja de ser la jugada cómoda que gana sin
             * jugar.
             */
            if (!a || a === 'nadie') {
                p.aciertos[silla] += esYokai(p, silla) ? 1 / 3 : -1 / 3;
                continue;
            }
            // Un humano acierta votando a un yokai; un yokai acierta votando a un
            // humano —y se equivoca votando a su igual—. Escrito así y no con una
            // fórmula: la primera versión era un acertijo de tres negaciones.
            const acierta = esYokai(p, silla) ? !esYokai(p, a) : esYokai(p, a);
            p.aciertos[silla] += acierta ? 1 : -1;
        }
        // ⚠️ El empate NO expulsa, igual que en nave: si expulsara, la aldea ganaría
        // por azar y el juego dejaría de medir deducción para medir suerte.
        const fuera = elMasDe(cuenta);
        p.ultimoExpulsado = null;
        if (fuera) {
            const g = p.gente.find((x) => x.silla === fuera);
            if (g) { g.vivo = false; p.ultimoExpulsado = fuera; p.historial.push(`expulsado ${fuera} (${esYokai(p, fuera) ? 'yokai' : 'humano'})`); }
        } else p.historial.push('empate: no sale nadie');

        p.fase = 'noche'; p.noche++; p.dichos = []; p.rondaDebate = 0;
    },

    /**
     * El rival de la casa, uno por papel. Techo BLANDO a propósito: no recuerda
     * quién mintió ayer, no cruza contradicciones y se cree la última afirmación
     * que oye. Si dedujera bien, la tabla mediría a mi heurística y no al agente.
     *
     * ⚠️ Y JUEGA CIEGO: sólo mira lo que `estado(p, asiento)` le entrega a ESA
     * silla. Un yokai que mirase `p.oraculo` mataría al oráculo la primera noche y
     * el juego se acabaría; un aldeano que mirase `p.yokai` votaría perfecto.
     */
    sugerencia(p) {
        const asiento = SILLAS.indexOf(p.turno);
        const st = this.estado(p, asiento);
        const legales = st.legal_moves.filter((m) => m !== 'nueva');
        if (!legales.length) return null;
        const yo = st.silla;
        const peso = pesoDeLoDicho(p.dichos);
        const elige = (m) => (legales.includes(m) ? m : null);

        if (st.fase === 'noche') {
            if (st.soy_yokai) {
                /**
                 * Los dos yokai tienen que coincidir sin hablar, así que necesitan
                 * una regla que los dos calculen igual con lo que ven los dos.
                 *
                 * ⚠️ ERA «EL DE LETRA MÁS BAJA», Y ESO MATABA SIEMPRE A LA SILLA `a`.
                 *
                 * Parecía la regla más tonta y honesta posible. Lo que hacía era
                 * asesinar a la primera silla la primera noche, todas las partidas —
                 * y la primera silla es donde el banco sienta al agente.
                 *
                 * Consecuencia, y tardé en verla: el arnés del gym devuelve el
                 * control cuando vuelve a tocarle al agente, y a un muerto no le
                 * toca nunca. Así que la casa jugaba la partida entera de un tirón y
                 * el episodio duraba **un paso**. `check_gym_envs` lo llevaba
                 * imprimiendo desde el principio —`pasos= 1`— y yo lo leí por encima
                 * tres veces, buscando el fallo en el número de sillas.
                 *
                 * Ahora la presa rota con la noche. Sigue siendo una regla tonta que
                 * los dos calculan igual sin hablarse —que es lo único que hace
                 * falta— pero no señala siempre al mismo, así que ni el agente ni
                 * nadie tiene una diana pintada por vivir en la silla `a`.
                 */
                const presas = vivosDe(p).map((g) => g.silla)
                    .filter((s) => !st.mis_iguales.includes(s) && s !== yo)
                    .sort();
                /**
                 * ⚠️ Y LA ROTACIÓN LLEVA LA SEMILLA, QUE SIN ELLA NO ROTABA NADA.
                 *
                 * Mi primer arreglo fue `(noche − 1) % n`, y la primera noche eso da
                 * el índice 0 — la silla `a` otra vez, en todas las partidas. El
                 * fallo entero seguía ahí y la sonda seguía diciendo `pasos= 1`.
                 * Rotar sobre algo que siempre empieza en el mismo sitio no rota.
                 *
                 * Con la semilla dentro, cada partida empieza por una silla distinta
                 * y ninguna tiene una diana pintada. Los dos yokai la calculan igual
                 * porque la semilla es pública en el estado.
                 */
                const presa = presas[(p.semilla + p.noche) % (presas.length || 1)];
                return elige(`senalar:${presa}`) ?? legales[0];
            }
            if (st.soy_oraculo) {
                // Leer a quien no se ha leído: repetir lectura no aporta nada.
                const sinLeer = vivosDe(p).map((g) => g.silla)
                    .filter((s) => s !== yo && !st.mis_lecturas[s]).sort()[0];
                return elige(`senalar:${sinLeer}`) ?? legales[0];
            }
            return legales[0];      // un aldeano señala y no pasa nada
        }

        if (st.fase === 'debate') {
            if (st.soy_oraculo) {
                /**
                 * El oráculo dice lo que ha leído. Es la jugada fuerte y también la
                 * que lo mata: en cuanto habla, los yokai saben a quién llevarse.
                 * Ese dilema es el corazón del juego y la casa lo resuelve de la
                 * forma más simple —cantar en cuanto tiene algo—, que deja sitio
                 * de sobra para que un agente lo haga mejor.
                 */
                const malo = Object.entries(st.mis_lecturas).find(([s, v]) => v === 'yokai'
                    && vivosDe(p).some((g) => g.silla === s));
                if (malo) return elige(`afirmo_yokai:${malo[0]}`) ?? 'callar';
                const bueno = Object.entries(st.mis_lecturas).find(([s, v]) => v === 'humano'
                    && vivosDe(p).some((g) => g.silla === s));
                if (bueno) return elige(`afirmo_humano:${bueno[0]}`) ?? 'callar';
                return 'callar';
            }
            if (st.soy_yokai) {
                /**
                 * ⚠️ EL CONTRA-CANTO, QUE ES LA JUGADA CLÁSICA DE ESTE JUEGO.
                 *
                 * Si alguien ha afirmado que un yokai lo es, ese alguien es el
                 * oráculo o alguien que acierta: en los dos casos hay que quitarlo
                 * de en medio, y de día sólo se quita hablando. Así que se le
                 * devuelve la acusación — dos versiones contrarias y la aldea
                 * tiene que elegir a quién cree, que es exactamente el juego.
                 */
                const meSeñala = p.dichos.find((d) => d.jugada === `afirmo_yokai:${yo}`
                    || (st.mis_iguales.includes(d.jugada.split(':')[1]) && d.jugada.startsWith('afirmo_yokai:')));
                if (meSeñala) return elige(`afirmo_yokai:${meSeñala.silla}`) ?? elige(`acuso:${meSeñala.silla}`) ?? 'callar';
                // Si no, arrimarse al linchamiento que ya existe, y nunca al propio.
                const mas = elMasDe(peso.contra, yo);
                if (mas && !st.mis_iguales.includes(mas)) return elige(`acuso:${mas}`) ?? 'callar';
                return 'callar';
            }
            // Aldeano: repetir lo que ha oído. Es poco, y es el suelo del que un
            // agente tiene que despegarse.
            const señalado = elMasDe(peso.señalados, yo);
            if (señalado) return elige(`acuso:${señalado}`) ?? 'callar';
            const acusado = elMasDe(peso.contra, yo);
            if (acusado) return elige(`acuso:${acusado}`) ?? 'callar';
            /**
             * ⚠️ SIN NADA QUE DECIR, DECIR ALGO IGUAL. Y ESTO LO ENSEÑÓ UNA PARTIDA.
             *
             * Aquí ponía `callar`, y parecía lo honrado: si no sé nada, no acuso a
             * nadie. Mirando una partida entera se vio lo que costaba: día 1 el
             * oráculo canta y la aldea lincha a un yokai de verdad; esa noche los
             * yokai matan al oráculo; día 2 los tres que quedan no saben nada, se
             * callan los tres, no hay a quién votar, empate, y no sale nadie. A
             * partir de ahí es una noche detrás de otra hasta la paridad.
             *
             * En este juego el silencio no es neutral: **es una jugada a favor de
             * los yokai**, porque son los únicos que ganan con que no pase nada. Es
             * la misma lección que la junta de nave, que empataba 113 de 128 veces.
             *
             * Así que sin información se sospecha del primero por orden. Es tosco a
             * propósito —todos los aldeanos de la casa sospechan del mismo, así que
             * el linchamiento sale adelante— y es exactamente el suelo del que un
             * agente tiene que despegarse: sospechar mejor que por orden alfabético
             * no es un listón alto.
             */
            const porOrden = vivosDe(p).map((g) => g.silla).filter((s) => s !== yo).sort()[0];
            return elige(`acuso:${porOrden}`) ?? 'callar';
        }

        // Voto. Lo que YO sé manda; después, lo que se ha dicho.
        if (st.soy_oraculo) {
            const malo = Object.entries(st.mis_lecturas).find(([s, v]) => v === 'yokai'
                && vivosDe(p).some((g) => g.silla === s));
            if (malo) return elige(`voto:${malo[0]}`) ?? 'voto:nadie';
        }
        if (st.soy_yokai) {
            // Nunca al propio, y preferentemente a quien nos señaló.
            const contra = p.dichos.filter((d) => d.jugada === `afirmo_yokai:${yo}`).map((d) => d.silla)[0];
            if (contra) return elige(`voto:${contra}`) ?? 'voto:nadie';
            const mas = elMasDe(peso.contra, yo);
            if (mas && !st.mis_iguales.includes(mas)) return elige(`voto:${mas}`) ?? 'voto:nadie';
            return 'voto:nadie';
        }
        // Un aldeano vota SIEMPRE que tenga a quien: ver la nota de `elMasDe`.
        const señalado = elMasDe(peso.señalados, yo, true);
        if (señalado) return elige(`voto:${señalado}`) ?? 'voto:nadie';
        const acusado = elMasDe(peso.contra, yo, true);
        if (acusado) return elige(`voto:${acusado}`) ?? 'voto:nadie';
        return 'voto:nadie';
    },

    deshacer() { return false; },
};
