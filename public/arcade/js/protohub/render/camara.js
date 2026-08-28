/**
 * camara.js — dónde se pone la cámara, dicho en cine y no en coordenadas.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     (sujeto, plano) → { pos, look, fov, rollGrados, dist, movimiento }
 *
 * Sin `import THREE`. Datos entran, datos salen, adaptadores a los lados — la
 * misma forma que `aspecto.js` con `rol → material` y `huella.js` con
 * `reglas → navegador|servidor`. Se prueba sin navegador porque no hay nada que
 * dibujar: esto sólo dice a dónde mirar.
 *
 * ⚠️ POR QUÉ EXISTE, QUE ES LA PARTE INTERESANTE.
 *
 * El 28-08-2026 Oscar preguntó si en los HTML de `legacy/` habría sistemas
 * cableados que mereciera la pena abstraer. Los había, y el mejor no estaba
 * cableado: estaba **perdido**.
 *
 *   · `data/realizacion/camera_lexicon.json` — 4 KB de vocabulario bien pensado,
 *     encuadres y ángulos relativos al sujeto. Vivo, y sin un solo lector en el
 *     navegador.
 *   · `World/Synthesis/Engines/Camera.py` — el motor que ese fichero dice que lo
 *     lee. Abierto: `# [AUTO-RECOVERED BY ALISA FROM .PYC]`. Nueve métodos, nueve
 *     `pass`. Quedaron los docstrings; los cuerpos se perdieron en el lío de git.
 *   · `legacy/camera_slerp_director_studio.html` — la única implementación que
 *     sobrevive. Su línea 530 es literalmente el `resolve()` que faltaba:
 *
 *         const baseCamZ = (H / 2) / Math.tan(degToRad(FOV_BASE / 2));
 *
 * El propio JSON dice «tanto el motor de Python como las escenas del navegador
 * leen ESTE fichero — no cableéis planos por escena». Las dos mitades eran falsas
 * el día que lo comprobé. Ésta es la del navegador.
 *
 * ⚠️ EL LÉXICO ENTRA POR PARÁMETRO. NO HAY COPIA, ASÍ QUE NO PUEDE HABER DERIVA.
 *
 * `aspecto.js` lleva dentro una copia de la paleta con una prueba de deriva
 * vigilándola, y hace falta: allí el dato se necesita sincrónico, al cargar el
 * módulo. Aquí no. Un léxico es un argumento, el navegador lo trae con `fetch` y
 * las pruebas lo leen del disco. Sin copia no hay nada que vigilar.
 *
 * ⚠️ LA DIFERENCIA ENTRE LAS DOS VERSIONES DEL LÉXICO ES TODO EL VALOR.
 *
 * La página legacy dice `pos: [0, 150, 400]`. Es un plano que sólo sirve en su
 * escena, a su escala, con su edificio. El JSON dice `h_frame: 0.35, z_pad: 0.25`
 * y eso es una *proporción del sujeto*: el mismo primer plano encuadra igual a un
 * peón de ajedrez que a una torre corporativa. Por eso se puede compartir.
 */

/**
 * ⚠️ CUATRO DECISIONES QUE NO ESTÁN EN EL DATO. Si alguien lee el JSON y saca
 *    otros números que los de aquí, es que eligió distinto — no que se equivocó.
 *
 * 1. `centro` es el CENTRO VOLUMÉTRICO del sujeto, no sus pies. Lo dice el propio
 *    dato sin decirlo: el plano general tiene `y_target: 0.5` y se describe como
 *    «mid-body». Con los pies en el origen, 0.5 no sería el centro de nada.
 * 2. AZIMUT 0 = la cámara en +Z, delante del sujeto; positivo gira hacia +X.
 * 3. ELEVACIÓN NEGATIVA = cámara POR DEBAJO. `low: -26` se describe como
 *    contrapicado, «looks up at subject», así que el signo va con la descripción
 *    y no al revés.
 * 4. SE ENCUADRA POR ALTURA, NUNCA POR ANCHO. El `fov` de una cámara en
 *    perspectiva es el VERTICAL, y ése no cambia con la forma de la ventana. Un
 *    encuadre por altura sale igual en apaisado y en vertical; uno por ancho, no.
 *    Que el sujeto quepa de lado es otro problema y ya tiene dueño: `encuadre.js`,
 *    que no calcula la distancia sino que la comprueba proyectando las esquinas.
 */

const grados = (g) => (g * Math.PI) / 180;

/** Lo que se usa cuando el plano pedido no existe. Sale del propio léxico. */
function porDefecto(lexico) {
    return { encuadre: 'mcu', angulo: 'eye', movimiento: 'static', ...(lexico?.defaults ?? {}) };
}

/**
 * Un plano = encuadre × ángulo × movimiento. Se puede pedir por nombre de preset
 * o por sus tres piezas; lo explícito gana al preset, igual que en el motor que
 * se perdió.
 */
export function planoDe(plano, lexico) {
    const d = porDefecto(lexico);
    const p = typeof plano === 'string' ? { preset: plano } : (plano ?? {});
    const base = p.preset ? lexico?.presets?.[p.preset] : null;
    if (p.preset && !base) {
        console.warn(`[camara] preset desconocido: «${p.preset}». Se usa el de casa.`);
    }
    return {
        encuadre: p.encuadre ?? base?.framing ?? d.framing,
        angulo: p.angulo ?? base?.angle ?? d.angle,
        movimiento: p.movimiento ?? base?.move ?? d.move,
        preset: base ? p.preset : null,
    };
}

/**
 * Dónde va la cámara.
 *
 * @param sujeto  { centro: [x,y,z], altura: number }
 * @param plano   nombre de preset, o { encuadre, angulo, movimiento }
 * @param lexico  el `camera_lexicon.json` ya leído
 *
 * ⚠️ `fov` sale en GRADOS porque es lo que pide una cámara en perspectiva y es lo
 *    que dice el léxico. `rollGrados` lleva la unidad en el nombre a propósito:
 *    las rotaciones sí van en radianes, y mezclar las dos unidades en el mismo
 *    objeto sin avisar es una trampa que se paga una vez y se recuerda siempre.
 */
export function camaraDe(sujeto, plano, { lexico } = {}) {
    if (!lexico?.framings || !lexico?.angles) {
        throw new Error('[camara] hace falta el léxico: camaraDe(sujeto, plano, { lexico })');
    }
    const altura = Number(sujeto?.altura);
    if (!Number.isFinite(altura) || altura <= 0) {
        throw new Error(`[camara] el sujeto necesita una altura positiva, y llegó ${sujeto?.altura}`);
    }
    const centro = sujeto.centro ?? [0, 0, 0];

    const nombres = planoDe(plano, lexico);
    const enc = lexico.framings[nombres.encuadre];
    const ang = lexico.angles[nombres.angulo];
    const mov = lexico.moves?.[nombres.movimiento] ?? null;
    if (!enc) throw new Error(`[camara] encuadre desconocido: «${nombres.encuadre}»`);
    if (!ang) throw new Error(`[camara] ángulo desconocido: «${nombres.angulo}»`);
    if (nombres.movimiento && !mov) {
        console.warn(`[camara] movimiento desconocido: «${nombres.movimiento}». Se queda quieta.`);
    }

    // El fov del ángulo corrige al del encuadre: un contrapicado abre, un ojo de
    // pez abre mucho. Es un sesgo, no un reemplazo.
    const fov = enc.fov + (ang.fov_bias ?? 0);

    // ── La línea 530, que es de lo que iba todo esto ──────────────────────────
    // Encajar una altura visible dentro de un fov vertical. `h_frame` dice cuánto
    // del sujeto llena el cuadro: 1.70 enseña el sujeto y la habitación, 0.055
    // enseña los ojos.
    const altoVisible = enc.h_frame * altura;
    let dist = (altoVisible / 2) / Math.tan(grados(fov) / 2);
    dist *= 1 + (enc.z_pad ?? 0);   // un respiro entre el sujeto y el borde

    // A dónde mira: una fracción de la altura, contada desde los pies.
    const pies = centro[1] - altura / 2;
    const look = [centro[0], pies + (enc.y_target ?? 0.5) * altura, centro[2]];

    const el = grados(ang.elevation_deg ?? 0);
    const az = grados(ang.azimuth_deg ?? 0);
    const pos = [
        look[0] + dist * Math.sin(az) * Math.cos(el),
        look[1] + dist * Math.sin(el),
        look[2] + dist * Math.cos(az) * Math.cos(el),
    ];

    return {
        pos, look, fov,
        rollGrados: ang.roll_deg ?? 0,
        dist,
        /**
         * ⚠️ EL MOVIMIENTO SALE SIN TOCAR, Y ES DELIBERADO. El léxico dice que los
         *    movimientos son «hints the JS runtime animates»: esto resuelve el
         *    plano QUIETO y quien anima decide cómo llegar. Devolver `dist` es lo
         *    que le permite hacerlo — un `push_in` es interpolar hasta
         *    `dist * distance_factor` sin volver a preguntar nada.
         */
        movimiento: mov ? { nombre: nombres.movimiento, ...mov } : null,
        preset: nombres.preset,
    };
}

/** El vocabulario de un vistazo, para que un editor pueda ofrecerlo. */
export function nombresDe(lexico) {
    return {
        encuadres: Object.keys(lexico?.framings ?? {}),
        angulos: Object.keys(lexico?.angles ?? {}),
        movimientos: Object.keys(lexico?.moves ?? {}),
        presets: Object.keys(lexico?.presets ?? {}),
    };
}

/**
 * ¿Es utilizable este léxico? Lo mismo que `revisarPiel` en `aspecto.js`: un
 * fichero de datos que se puede editar a mano necesita quien le diga que no.
 */
export function revisarLexico(lexico) {
    const quejas = [];
    if (!lexico || typeof lexico !== 'object') return ['no es un objeto'];
    for (const parte of ['framings', 'angles']) {
        if (!lexico[parte] || !Object.keys(lexico[parte]).length) quejas.push(`falta «${parte}»`);
    }
    for (const [n, f] of Object.entries(lexico.framings ?? {})) {
        if (!(f.h_frame > 0)) quejas.push(`encuadre «${n}»: h_frame debe ser > 0`);
        if (!(f.fov > 0 && f.fov < 180)) quejas.push(`encuadre «${n}»: fov fuera de rango`);
    }
    for (const [n, p] of Object.entries(lexico.presets ?? {})) {
        if (p.framing && !lexico.framings?.[p.framing]) quejas.push(`preset «${n}» pide un encuadre que no existe: «${p.framing}»`);
        if (p.angle && !lexico.angles?.[p.angle]) quejas.push(`preset «${n}» pide un ángulo que no existe: «${p.angle}»`);
        if (p.move && !lexico.moves?.[p.move]) quejas.push(`preset «${n}» pide un movimiento que no existe: «${p.move}»`);
    }
    return quejas;
}

/** El atajo del navegador. En Node el léxico se lee del disco y se pasa a mano. */
export async function cargarLexico(url = '/data/realizacion/camera_lexicon.json') {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`[camara] no se pudo leer el léxico en ${url}: ${r.status}`);
    return r.json();
}
