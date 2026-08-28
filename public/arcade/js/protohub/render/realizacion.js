/**
 * realizacion.js — la batuta: un compás manda sobre los cinco departamentos.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     compasDe({ momento: 'revelacion', emocion: 'shock', duracion: 1200 })
 *         → { camara, luz, montaje, cara, gesto, huecos }
 *
 * Sin `import THREE`, como `camara.js` y `aspecto.js`. Aquí no se dibuja nada: se
 * decide QUÉ pide cada departamento. Dónde acaba poniéndose la cámara lo contesta
 * `camara.js`, que necesita un sujeto y esto no.
 *
 * ⚠️ ERAN DOS IDIOMAS, Y LA UNIFICACIÓN NO ES FUNDIRLOS.
 *
 * Medido el 28-08-2026 sobre los cinco léxicos de `data/realizacion/`:
 *
 *     cámara ∩ luz     →  3 nombres   (confesion_dramatica, duda, revelacion)
 *     cara   ∩ gesto   →  21 emociones (guilt, nervous, grief, shock…)
 *     cámara ∩ cara    →  NADA
 *
 * La primera reacción —y la mía— es «hay dos vocabularios, hay que unificarlos en
 * uno». Pero al mirar qué nombra cada uno, no son rivales: son **dos ejes**.
 *
 *     MOMENTO   lo que hace la ESCENA    → cámara + luz + montaje
 *     EMOCIÓN   lo que siente el ACTOR   → cara + gesto
 *
 * Y son independientes de verdad: una `revelacion` filmada sobre alguien que
 * siente `shock` y la misma sobre alguien que siente `relief` son dos planos
 * distintos, y los dos hacen falta. Fundir las listas en una sola daría
 * `revelacion_shock`, `revelacion_relief`… — 11 momentos × 27 emociones = 297
 * nombres para decir lo que dicen 38. Eso no es unificar, es multiplicar.
 *
 * Así que la unificación es **una gramática con dos huecos**, no una lista:
 *
 *     { momento, emocion, duracion, transicion }
 *
 * Un solo compás, cinco departamentos, y cada eje sigue teniendo su léxico.
 *
 * ⚠️ Y LOS HUECOS SE DICEN EN VOZ ALTA, NUNCA SE RELLENAN EN SILENCIO.
 *
 * Ocho de los once momentos de cámara no tienen ambiente de luz asignado. Eso es
 * una decisión que le toca a Oscar, no a este fichero. Lo que este fichero no
 * puede hacer es taparlo con un valor por defecto: un plano que sale con la luz
 * de otro y nadie se entera es exactamente la avería que llevo toda la semana
 * persiguiendo. Cada resolución trae su lista `huecos`, y `costuras()` los cuenta
 * todos de golpe para poder ponerles un techo.
 */

/**
 * ⚠️ UNA CORRECCIÓN A LO QUE YO MISMA DIJE HACE UNA HORA.
 *
 * Conté que los gestos necesitaban un esqueleto y por eso eran caros. Al abrir
 * `gesture_lexicon.json` resulta que no: un gesto es `{rot, pos, amp, freq, dur,
 * ease, loop}` — desplazamiento y giro del grupo entero, no huesos. `lean_in` es
 * inclinarse 0,14 rad y avanzar 0,12; eso se aplica a cualquier cosa que tenga
 * transformación, incluida una caja. Los gestos son casi gratis.
 *
 * Lo caro sigue siendo la cara, y por otro motivo distinto del que dije.
 */

const EJES = { momento: ['camara', 'luz', 'montaje'], emocion: ['cara', 'gesto'] };

/** Un compás resuelto, o dicho de otro modo: qué le toca a cada departamento. */
export function compasDe(compas, { lexicos } = {}) {
    if (!lexicos) throw new Error('[realizacion] hacen falta los léxicos: compasDe(compas, { lexicos })');
    const c = typeof compas === 'string' ? { momento: compas } : (compas ?? {});
    const huecos = [];

    const { camera, light, montaje, face, gesture } = atajos(lexicos);

    // ── eje MOMENTO ──────────────────────────────────────────────────────────
    let camara = null;
    if (c.momento) {
        const p = camera?.presets?.[c.momento];
        if (p) camara = { preset: c.momento, encuadre: p.framing, angulo: p.angle, movimiento: p.move };
        else huecos.push(`el momento «${c.momento}» no es un plano del léxico de cámara`);
    }

    let luz = null;
    if (c.momento) {
        const m = light?.moods?.[c.momento];
        if (m) luz = { mood: c.momento, ...m };
        else huecos.push(`el momento «${c.momento}» no tiene ambiente de luz asignado`);
    }

    // ── eje EMOCIÓN ──────────────────────────────────────────────────────────
    let cara = null, gesto = null;
    if (c.emocion) {
        const nombreCara = face?.emotion_map?.[c.emocion];
        const e = nombreCara ? face?.expressions?.[nombreCara] : null;
        if (e) cara = { expression: nombreCara, ...e };
        else huecos.push(`la emoción «${c.emocion}» no tiene expresión de cara`);

        const nombreGesto = gesture?.emotion_map?.[c.emocion];
        const g = nombreGesto ? gesture?.gestures?.[nombreGesto] : null;
        if (g) gesto = { gesture: nombreGesto, ...g };
        else huecos.push(`la emoción «${c.emocion}» no tiene gesto`);
    }

    // ── montaje: dónde cae este compás en el cuadro, y cómo se entra ─────────
    const nombreLayout = c.layout ?? montaje?.defaults?.layout;
    const lay = montaje?.layouts?.[nombreLayout];
    if (nombreLayout && !lay) huecos.push(`la disposición «${nombreLayout}» no existe en el léxico de montaje`);

    const nombreTrans = c.transicion ?? montaje?.defaults?.transition;
    const trans = montaje?.transitions?.[nombreTrans];
    if (nombreTrans && !trans) huecos.push(`la transición «${nombreTrans}» no existe`);

    /**
     * ⚠️ EL RITMO ES UN LÍMITE, NO UNA SUGERENCIA. El léxico de montaje dice
     *    `min_shot_ms: 500` y lo acompaña de una nota de dirección: «use silences
     *    and dry cuts; hard cuts are earned». Un plano por debajo de ese mínimo no
     *    se lee: pasa. Se avisa en vez de corregirlo, porque a lo mejor lo quieres.
     */
    const duracion = c.duracion ?? null;
    const minimo = montaje?.rhythm?.min_shot_ms;
    if (duracion != null && minimo != null && duracion < minimo) {
        huecos.push(`el compás dura ${duracion} ms y el mínimo del léxico son ${minimo} ms: no da tiempo a leerlo`);
    }

    return {
        momento: c.momento ?? null,
        emocion: c.emocion ?? null,
        duracion,
        camara, luz, cara, gesto,
        montaje: lay ? { layout: nombreLayout, celdas: lay.cells } : null,
        transicion: trans ? { nombre: nombreTrans, ...trans } : null,
        celda: c.celda ?? 0,
        huecos,
    };
}

/** Un guion entero, con sus quejas juntas y numeradas por compás. */
export function resolverGuion(guion, { lexicos } = {}) {
    const compases = (Array.isArray(guion) ? guion : guion?.compases) ?? [];
    const resueltos = compases.map((c) => compasDe(c, { lexicos }));
    const quejas = resueltos.flatMap((r, i) => r.huecos.map((h) => `compás ${i + 1}: ${h}`));
    const duracion = resueltos.reduce((t, r) => t + (r.duracion ?? 0), 0);
    return { compases: resueltos, quejas, duracion };
}

/**
 * LA COSTURA, CONTADA. Para poder ponerle un techo que baje en los dos sentidos,
 * como el de los enlaces rotos: si alguien asigna ambientes y no baja el número,
 * la prueba suspende y obliga a venir a mirarlo.
 */
export function costuras({ lexicos } = {}) {
    const { camera, light, face, gesture } = atajos(lexicos);
    const momentos = Object.keys(camera?.presets ?? {});
    const emociones = new Set([
        ...Object.keys(face?.emotion_map ?? {}),
        ...Object.keys(gesture?.emotion_map ?? {}),
    ]);
    return {
        momentos,
        emociones: [...emociones],
        sinLuz: momentos.filter((m) => !light?.moods?.[m]),
        sinCara: [...emociones].filter((e) => !face?.emotion_map?.[e]),
        sinGesto: [...emociones].filter((e) => !gesture?.emotion_map?.[e]),
        // Ambientes de luz que nadie puede pedir porque no hay plano con ese nombre.
        lucesHuerfanas: Object.keys(light?.moods ?? {}).filter((m) => !camera?.presets?.[m]),
    };
}

/** El vocabulario entero, para que un editor lo pueda ofrecer. */
export function vocabulario({ lexicos } = {}) {
    const { camera, light, montaje, face, gesture } = atajos(lexicos);
    return {
        momentos: Object.keys(camera?.presets ?? {}),
        emociones: [...new Set([...Object.keys(face?.emotion_map ?? {}),
                                ...Object.keys(gesture?.emotion_map ?? {})])],
        disposiciones: Object.keys(montaje?.layouts ?? {}),
        transiciones: Object.keys(montaje?.transitions ?? {}),
        ambientes: Object.keys(light?.moods ?? {}),
        gestos: Object.keys(gesture?.gestures ?? {}),
        expresiones: Object.keys(face?.expressions ?? {}),
    };
}

/**
 * Los léxicos se pueden pasar con su nombre de fichero o con un apodo corto. Se
 * aceptan los dos porque el navegador los trae por URL y las pruebas los leen del
 * disco, y obligar a renombrarlos en medio sólo añade un sitio donde equivocarse.
 */
function atajos(lex = {}) {
    const de = (...nombres) => nombres.map((n) => lex[n]).find(Boolean) ?? null;
    return {
        camera:  de('camera', 'camara', 'camera_lexicon'),
        light:   de('light', 'luz', 'light_lexicon'),
        montaje: de('montaje', 'montaje_lexicon'),
        face:    de('face', 'cara', 'face_lexicon'),
        gesture: de('gesture', 'gesto', 'gesture_lexicon'),
    };
}

/** El atajo del navegador: los cinco de una vez. En Node se leen del disco. */
export async function cargarLexicos(base = '/data/realizacion') {
    const nombres = ['camera', 'light', 'montaje', 'face', 'gesture'];
    const partes = await Promise.all(nombres.map(async (n) => {
        const r = await fetch(`${base}/${n}_lexicon.json`);
        if (!r.ok) throw new Error(`[realizacion] no se pudo leer ${n}_lexicon.json: ${r.status}`);
        return [n, await r.json()];
    }));
    return Object.fromEntries(partes);
}
