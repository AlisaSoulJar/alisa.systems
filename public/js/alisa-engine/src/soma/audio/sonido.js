/**
 * sonido.js — un sonido es una receta, y se puede oír de dos maneras
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     capasDe('explosion', lexico)        → las capas, como datos
 *     sintetizar(capas, { muestreo })     → las muestras, sin Web Audio
 *
 * Sin `AudioContext` y sin `THREE`: datos entran, números salen. Los adaptadores
 * están a los lados, igual que en `camara.js` con `rol → material` o en
 * `realizacion.js` con `compás → departamentos`.
 *
 * POR QUÉ EXISTE
 *
 * Había dos sistemas de sonido y parecían duplicados. Al mirarlos son **las dos
 * mitades de la misma cosa**:
 *
 *   · `public/js/sfx.js` — 41 KB, sesenta y tres sonidos sintetizados, seis temas
 *     y tres radios. Es el CATÁLOGO, y suena plano.
 *   · `soma/plugins/SpatialAudioPlugin.js` — es quien los COLOCA en el espacio, y
 *     ya expone `registrarSonido(nombre, fabricar)`, o sea que está construido
 *     para aceptar sonidos definidos fuera. Ahí estaba la costura.
 *
 * Lo que faltaba en medio era la receta. Y resulta que ya existía disfrazada de
 * código: cada sonido de `sfx.js` son capas de tres primitivas —`sweep`, `noise`,
 * `osc`—, así que **53 de los 63 se convirtieron en datos sin ambigüedad**. Están
 * en `public/data/sonidos.json`.
 *
 * ⚠️ Y LOS OTROS DIEZ NO ESTÁN AHÍ A PROPÓSITO.
 *
 * `powerup`, `victory`, `boss_enter` y compañía usan Web Audio a pelo, arpegios y
 * temporizadores. Inventarse un vocabulario para diez casos —secuencias, notas,
 * esperas— sería meter a martillazos en el formato lo que no encaja, que es
 * exactamente el error que cometí publicando las cajas de `mecha` con el código de
 * terreno del sokoban. Se quedan como código y el léxico los DECLARA en
 * `soloCodigo`, para que la ausencia sea un dato y no un olvido.
 *
 * ⚠️ EL SEGUNDO PREMIO: AHORA SE PUEDE PROBAR OYENDO, NO LEYENDO.
 *
 * `prueba_sonido.mjs` declara hoy su propio límite: «`sfx.js` no es un módulo —es
 * una IIFE que toca `document` y `AudioContext`— así que esto lo lee, no lo
 * ejecuta». Contaba cadenas de texto. Con las recetas en datos y la síntesis en
 * matemática pura, una prueba puede RENDERIZAR cada sonido en Node y mirar si
 * suena: si sale silencio, si satura, si dura lo que dice.
 */

const FORMAS = {
    sine:     (f) => Math.sin(2 * Math.PI * f),
    square:   (f) => (f % 1 < 0.5 ? 1 : -1),
    sawtooth: (f) => 2 * (f % 1) - 1,
    triangle: (f) => 4 * Math.abs((f % 1) - 0.5) - 1,
};

/** Las capas de un sonido, o null si no está — y avisando, que es la mitad del trabajo. */
export function capasDe(nombre, lexico) {
    const s = lexico?.sonidos?.[nombre];
    if (s) return s.capas;
    if (lexico?.soloCodigo?.includes(nombre)) return null;   // ausencia declarada: no es un fallo
    console.warn(`[sonido] «${nombre}» no está en el léxico ni declarado como código`);
    return null;
}

export const nombresDe = (lexico) => [
    ...Object.keys(lexico?.sonidos ?? {}),
    ...(lexico?.soloCodigo ?? []),
];

/**
 * Renderiza las capas a muestras. Suma, no mezcla ponderada: es lo que hace el
 * original al disparar tres primitivas a la vez sobre el mismo destino.
 *
 * ⚠️ ESTO NO SUENA EXACTAMENTE IGUAL QUE EL NAVEGADOR, Y HAY QUE DECIRLO.
 *
 * El filtro del ruido aquí es de un polo, y el `BiquadFilterNode` del navegador es
 * de dos: la pendiente es más suave y un `lowpass` a 600 Hz deja pasar algo más de
 * agudo. La envolvente es exponencial, como la del original.
 *
 * O sea que esto sirve para COLOCAR un sonido en el espacio y para COMPROBAR que
 * un sonido existe, dura y no satura. No sirve para afirmar que suena idéntico al
 * de `sfx.js`, y una prueba que compare muestra a muestra con el navegador estaría
 * midiendo la diferencia entre dos filtros, no un fallo.
 */
export function sintetizar(capas, { muestreo = 44100, rnd = Math.random } = {}) {
    if (!Array.isArray(capas) || !capas.length) return new Float32Array(0);

    const dur = Math.max(...capas.map((c) => Number(c.dur) || 0));
    if (!(dur > 0)) return new Float32Array(0);
    const n = Math.ceil(dur * muestreo);
    const salida = new Float32Array(n);

    for (const capa of capas) {
        const d = Number(capa.dur) || 0;
        const vol = capa.vol ?? 0.3;
        const hasta = Math.min(n, Math.ceil(d * muestreo));
        if (!(hasta > 0)) continue;

        if (capa.tipo === 'ruido') {
            // Ruido blanco filtrado con un polo. `filtro` decide de qué lado.
            const corte = Number(capa.hz) || 1000;
            const k = Math.exp((-2 * Math.PI * corte) / muestreo);
            let anterior = 0;
            for (let i = 0; i < hasta; i++) {
                const blanco = rnd() * 2 - 1;
                anterior = blanco * (1 - k) + anterior * k;    // paso bajo
                const v = capa.filtro === 'lowpass' ? anterior
                        : capa.filtro === 'highpass' ? blanco - anterior
                        : blanco - anterior * 0.5;             // bandpass, aproximado
                salida[i] += v * vol * Math.exp((-3 * i) / hasta);
            }
            continue;
        }

        const onda = FORMAS[capa.forma] ?? FORMAS.sine;
        const desde = capa.tipo === 'barrido' ? Number(capa.desde) : Number(capa.hz);
        const fin = capa.tipo === 'barrido' ? Number(capa.hasta) : desde;
        if (!Number.isFinite(desde) || !Number.isFinite(fin)) continue;

        let fase = 0;
        for (let i = 0; i < hasta; i++) {
            const avance = i / hasta;
            // El barrido del original es exponencial; con extremos positivos, esto
            // es la misma curva que oye el navegador.
            const f = desde > 0 && fin > 0 ? desde * Math.pow(fin / desde, avance)
                                           : desde + (fin - desde) * avance;
            fase += f / muestreo;
            salida[i] += onda(fase) * vol * Math.exp(-3 * avance);
        }
    }

    // Se recorta al final y no capa a capa: sumar tres capas puede pasarse de 1, y
    // bajarlas antes de tiempo cambiaría el equilibrio entre ellas.
    for (let i = 0; i < n; i++) salida[i] = Math.max(-1, Math.min(1, salida[i]));
    return salida;
}

/**
 * ¿Es utilizable este léxico? Lo mismo que `revisarPiel` y `revisarLexico`: un
 * fichero de datos que se edita a mano necesita quien le diga que no.
 */
export function revisarLexico(lexico) {
    const quejas = [];
    if (!lexico?.sonidos) return ['no hay sonidos'];
    const tipos = new Set(['barrido', 'ruido', 'onda']);

    for (const [nombre, s] of Object.entries(lexico.sonidos)) {
        if (!Array.isArray(s.capas) || !s.capas.length) { quejas.push(`«${nombre}» no tiene capas`); continue; }
        for (const [i, c] of s.capas.entries()) {
            if (!tipos.has(c.tipo)) quejas.push(`«${nombre}» capa ${i}: tipo desconocido «${c.tipo}»`);
            if (!(Number(c.dur) > 0)) quejas.push(`«${nombre}» capa ${i}: dura ${c.dur}`);
            if (c.vol !== undefined && !(c.vol > 0 && c.vol <= 1)) {
                quejas.push(`«${nombre}» capa ${i}: volumen ${c.vol} fuera de (0, 1]`);
            }
            if (c.forma && !FORMAS[c.forma]) quejas.push(`«${nombre}» capa ${i}: forma «${c.forma}» no existe`);
        }
    }
    // Un nombre no puede estar en los dos sitios: sería dos definiciones.
    for (const n of lexico.soloCodigo ?? []) {
        if (lexico.sonidos[n]) quejas.push(`«${n}» está a la vez en receta y en soloCodigo`);
    }
    return quejas;
}
