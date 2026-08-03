/**
 * Turing.js — el benchmark que pregunta "¿sabes quién está jugando?"
 * ═══════════════════════════════════════════════════════════════════════════
 * Al enviar una partida se declara quién jugó, con TRES opciones:
 *
 *     humano · maquina · prefiero_no_decirlo
 *
 * LA TERCERA NO ES UN HUECO: ES EL PRODUCTO
 * ------------------------------------------
 * Lo instintivo sería obligar a elegir. Sería peor por dos motivos:
 *
 * 1. **No podemos verificarlo.** Nadie impide dejar a un programa jugar y decir
 *    "humano". Exigir la etiqueta no la hace verdad, solo la hace obligatoria.
 * 2. **Quien no la declara es el caso interesante.** Es exactamente donde un
 *    clasificador tiene que trabajar. Las declaradas son el conjunto de
 *    entrenamiento; las no declaradas, el examen.
 *
 * Así, en vez de un benchmark de "quién juega mejor" con una etiqueta poco
 * fiable, sale un **test de Turing con datos reales**: ¿puede un modelo
 * distinguir a una persona de una máquina mirando solo cómo juega?
 *
 * EL REGALO DEL DETERMINISMO
 * --------------------------
 * Misma semilla ⇒ misma posición. Así que las decisiones de un humano y de una
 * máquina **ante exactamente el mismo tablero** son directamente comparables.
 * Eso es un test de Turing **pareado**, y sale gratis: no hay que montar
 * ninguna infraestructura para conseguirlo, ya está en los datos.
 *
 * HONESTIDAD CON QUIEN JUEGA
 * --------------------------
 * La etiqueta se guarda como **declarada**, nunca como hecho. Y "prefiero no
 * decirlo" es una respuesta legítima con su propio valor, no un castigo.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { expandir, huellaDeJuego } from './Dataset.js';

export const DECLARACIONES = ['humano', 'maquina', 'prefiero_no_decirlo'];

/** Normaliza lo que llegue. Ante la duda, no se supone: sin declarar. */
export function normalizarDeclaracion(x) {
    const s = String(x ?? '').toLowerCase().trim();
    if (s === 'humano' || s === 'human' || s === 'persona') return 'humano';
    if (s === 'maquina' || s === 'máquina' || s === 'machine' ||
        s === 'bot' || s === 'ia' || s === 'ai' || s === 'llm' || s === 'fsm') return 'maquina';
    // Cualquier otra cosa —vacío, basura, o la opción elegida a propósito— cae
    // aquí. No se supone nada: si no lo dijo, no lo dijo.
    return 'prefiero_no_decirlo';
}

/**
 * Rasgos de una partida, para que un clasificador trabaje con ellos.
 *
 * Se eligen a propósito rasgos que NO dependen del juego concreto: así el mismo
 * clasificador sirve para ajedrez, snake o mancala. Si dependieran del juego,
 * habría que entrenar uno por juego y el conjunto de datos valdría mucho menos.
 */
export function rasgos(reglas, partida) {
    const traza = expandir(reglas, partida, { texto: false });
    const h = huellaDeJuego(traza);
    if (!h) return null;

    const pasos = traza.pasos;
    const posiciones = pasos.map(s => s.legales.indexOf(s.accion)).filter(i => i >= 0);

    // ¿Repite la misma posición de la lista una y otra vez?
    const repetidos = {};
    for (const i of posiciones) repetidos[i] = (repetidos[i] ?? 0) + 1;
    const masFrecuente = Math.max(0, ...Object.values(repetidos));

    // ¿Cambia de idea? Una persona alterna entre buenas y malas; un programa
    // codicioso hace siempre lo mismo.
    let cambios = 0;
    for (let i = 1; i < pasos.length; i++) {
        if (Math.sign(pasos[i].recompensa) !== Math.sign(pasos[i - 1].recompensa)) cambios++;
    }

    // ¿Elige lo óptimo inmediato siempre? Señal fuerte de política codiciosa.
    const optimas = pasos.filter(s => {
        const mejor = Math.max(...pasos.map(x => x.recompensa));
        return s.recompensa === mejor && mejor > 0;
    }).length;

    return {
        longitud: h.longitud,
        posicionMedia: h.posicionMedia,
        varianzaPosicion: h.varianzaPosicion,
        ratioJugadasMalas: h.ratioJugadasMalas,
        opcionesMedias: h.opcionesMedias,
        // Cuánto se concentra en una sola posición de la lista (0..1).
        concentracion: +(masFrecuente / (posiciones.length || 1)).toFixed(3),
        // Con qué frecuencia cambia el signo de la recompensa (0..1).
        volatilidad: +(cambios / Math.max(1, pasos.length - 1)).toFixed(3),
        ratioOptimas: +(optimas / (pasos.length || 1)).toFixed(3),
    };
}

/**
 * Prepara el conjunto: lo declarado entrena, lo no declarado examina.
 *
 * @param {Object} reglasPorJuego
 * @param {Array} partidas  cada una con `.declaracion`
 * @returns {{entrenamiento:Array, examen:Array, reparto:Object}}
 */
export function prepararConjunto(reglasPorJuego, partidas) {
    const entrenamiento = [], examen = [];
    const reparto = { humano: 0, maquina: 0, prefiero_no_decirlo: 0, descartadas: 0 };

    for (const partida of partidas) {
        const reglas = reglasPorJuego[partida.juego];
        if (!reglas) { reparto.descartadas++; continue; }

        const decl = normalizarDeclaracion(partida.declaracion);
        const r = rasgos(reglas, partida);
        if (!r) { reparto.descartadas++; continue; }

        reparto[decl]++;
        const fila = { juego: partida.juego, semilla: partida.semilla, rasgos: r };

        if (decl === 'prefiero_no_decirlo') examen.push(fila);
        else entrenamiento.push({ ...fila, etiqueta: decl });
    }
    return { entrenamiento, examen, reparto };
}

/**
 * Parejas: la MISMA posición jugada por un humano y por una máquina.
 *
 * Esto es lo que sale gratis por ser deterministas — misma semilla, mismo
 * tablero. Un par así es la unidad clásica de un test de Turing: dos respuestas
 * al mismo estímulo, y adivina cuál es cuál.
 *
 * @returns {Array<{juego, semilla, paso, estado, humano, maquina}>}
 */
export function parear(reglasPorJuego, partidas, opts = {}) {
    const maxPares = opts.maxPares ?? 500;
    const porClave = new Map();     // "juego|semilla" → { humano:[], maquina:[] }

    for (const p of partidas) {
        const decl = normalizarDeclaracion(p.declaracion);
        if (decl === 'prefiero_no_decirlo') continue;
        const clave = `${p.juego}|${p.semilla}`;
        if (!porClave.has(clave)) porClave.set(clave, { humano: [], maquina: [] });
        porClave.get(clave)[decl].push(p);
    }

    const pares = [];
    for (const [clave, grupos] of porClave) {
        if (!grupos.humano.length || !grupos.maquina.length) continue;
        const [juego, semilla] = clave.split('|');
        const reglas = reglasPorJuego[juego];
        if (!reglas) continue;

        const th = expandir(reglas, grupos.humano[0], { texto: true });
        const tm = expandir(reglas, grupos.maquina[0], { texto: true });

        // Se comparan solo mientras las dos partidas van por el MISMO camino:
        // en cuanto divergen, ya no es el mismo estímulo.
        for (let i = 0; i < Math.min(th.pasos.length, tm.pasos.length); i++) {
            const a = th.pasos[i], b = tm.pasos[i];
            if (a.texto !== b.texto) break;             // caminos distintos: se corta
            if (a.accion === b.accion) continue;        // coinciden: no distingue nada
            pares.push({
                juego, semilla: Number(semilla), paso: i,
                estado: a.texto,
                legales: a.legales,
                humano: a.accion,
                maquina: b.accion,
            });
            if (pares.length >= maxPares) return pares;
        }
    }
    return pares;
}

/**
 * Clasificador de referencia. A propósito **muy simple**: si un modelo de verdad
 * no le gana claramente, es que el conjunto de datos no tiene señal y el
 * problema es nuestro, no suyo.
 *
 * Regla: concentrarse siempre en la misma opción y no cambiar nunca de signo
 * huele a programa.
 */
export function clasificadorSimple(r) {
    let puntos = 0;
    if (r.varianzaPosicion === 0) puntos += 3;        // siempre la misma casilla
    if (r.concentracion > 0.8) puntos += 2;
    if (r.volatilidad < 0.05) puntos += 1;
    if (r.ratioJugadasMalas === 0 && r.longitud > 20) puntos += 1;
    return { prediccion: puntos >= 3 ? 'maquina' : 'humano', confianza: Math.min(1, puntos / 5) };
}

/** Evalúa el clasificador de referencia sobre lo declarado. */
export function evaluar(conjunto, clasificador = clasificadorSimple) {
    let aciertos = 0;
    const matriz = { humano: { humano: 0, maquina: 0 }, maquina: { humano: 0, maquina: 0 } };
    for (const fila of conjunto.entrenamiento) {
        const { prediccion } = clasificador(fila.rasgos);
        matriz[fila.etiqueta][prediccion]++;
        if (prediccion === fila.etiqueta) aciertos++;
    }
    const n = conjunto.entrenamiento.length || 1;
    return { aciertos, total: conjunto.entrenamiento.length, precision: +(aciertos / n).toFixed(3), matriz };
}
