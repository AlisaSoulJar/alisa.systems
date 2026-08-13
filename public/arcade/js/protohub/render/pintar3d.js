/**
 * pintar3d.js — LA MISMA MATRIZ, CON ALTURA. El ledger visual.
 * ═══════════════════════════════════════════════════════════════════════════
 *     const pintor = crearPintor3d(escena, THREE, { croupier });
 *     pintor.pintar(sustrato);
 *
 * ⚠️ ES LA HERMANA DE `pintar2d.js`, NO SU SUSTITUTA.
 * Las dos reciben `{ rejilla, piezas, zonas }` y no preguntan nada más. Ninguna
 * sabe a qué se juega. Esa es la tesis del motor dicha en código: **el 3D es
 * sólo un ledger visual; el estado de verdad es una matriz plana.**
 *
 * Consecuencia práctica: un género nuevo se ve en 2D y en 3D **el mismo día que
 * tiene reglas**, sin escribir un visualizador. Hoy hay catorce visualizadores a
 * medida y cada uno trajo su bug.
 *
 * ⚠️ SE DIBUJA INSTANCIADO, Y NO ES UNA OPTIMIZACIÓN PREMATURA.
 * La primera versión creaba una malla por celda y otra por pieza. Con ajedrez
 * (64 + 32) iba de sobra; con **fagocito, que son 28×28 celdas y 561 piezas**,
 * son 1.345 llamadas de dibujo y el compositor del navegador dejaba de responder
 * — la página seguía viva (JavaScript contestaba en 5 ms) pero no se podía ni
 * capturar la pantalla.
 *
 * Un ledger visual que se cae con el tablero número diez no es un ledger visual.
 * Ahora es **una llamada por familia**: una para el suelo, una para los muros y
 * una por cada aspecto de pieza. Fagocito pasa de 1.345 a menos de diez.
 *
 * ⚠️ AQUÍ ES DONDE ENTRAN LAS FACTORÍAS Y LOS PLUGINS, Y NO ANTES.
 * `CroupierSystem` ya sabe **dónde va cada carta** en una mesa —en abanico, en
 * arco, tapadas, comunitarias— y es agnóstico al juego. Se le pasa por
 * `opciones` y coloca las zonas. No decide nada del juego: dice dónde poner las
 * cosas, que es exactamente lo que un espectador puede hacer.
 */

/** Alturas por tipo. Lo que no esté aquí sale como ficha baja. */
const ALTO = {
    muro: 1.0, cabeza: 0.6, cuerpo: 0.45, bolita: 0.12, comida: 0.3,
    jugador: 0.8, coche_der: 0.4, coche_izq: 0.4,
};
const COLOR_DE = { 0: 0x2a3550, 1: 0xc0392b, 2: 0x2e8b57, 3: 0xd68910, null: 0x7f8c8d };

export function crearPintor3d(escena, THREE, opciones = {}) {
    const { croupier = null, alturaCarta = 0.02 } = opciones;

    const raiz = new THREE.Group();
    raiz.name = '__sustrato';
    escena.add(raiz);

    const geo = {
        celda: new THREE.BoxGeometry(0.96, 0.08, 0.96),
        cubo: new THREE.BoxGeometry(0.7, 1, 0.7),
        disco: new THREE.CylinderGeometry(0.36, 0.36, 0.18, 16),
        punto: new THREE.SphereGeometry(0.13, 8, 6),
        carta: new THREE.BoxGeometry(0.62, 0.012, 0.9),
    };
    const material = (color, extra = {}) =>
        new THREE.MeshStandardMaterial({ color, roughness: 0.55, ...extra });
    const mat = {
        /**
         * ⚠️ EL DAMERO SE VE. ANTES ESTABA Y NO SE NOTABA.
         *
         * Este pintor lleva desde siempre alternando dos suelos —`(f + c) % 2`, más
         * abajo— pero eran `0xf2f4f7` y `0xd8dfe6`: dos blancos separados por un 7%
         * de luminosidad. Con la luz cenital de esta mesa el damero desaparecía y el
         * tablero salía como una sábana blanca con rayas.
         *
         * Se vio en la captura de las damas recién portadas a esta mesa: sesenta y
         * cuatro casillas blancas y las fichas flotando encima. Un tablero de damas
         * SIN damero, que es lo primero que se mira para orientarse.
         *
         * No sobraba ninguna de las dos: estaban demasiado juntas. El oscuro baja a
         * un gris azulado que contrasta con las fichas de los dos bandos —azul
         * marino y rojo— sin competir con ninguna.
         */
        sueloA: material(0xeceff4, { roughness: 0.9 }),
        sueloB: material(0x4a5a70, { roughness: 0.9 }),
        muro: material(0x39485c, { roughness: 0.85 }),
        carta: material(0xfdfdfd, { roughness: 0.45 }),
        oculta: material(0x8a5a9a, { roughness: 0.6 }),
        destino: material(0xc0392b, { roughness: 0.7 }),
        niebla: material(0xaeb8c4, { roughness: 1.0 }),
        de: Object.fromEntries(Object.entries(COLOR_DE)
            .map(([k, c]) => [k, material(c, { metalness: 0.1 })])),
    };

    /**
     * Un montón instanciado por familia. Se guarda por clave y se reaprovecha
     * entre cuadros: crear y tirar `InstancedMesh` a sesenta por segundo tendría
     * el mismo problema que crear mallas sueltas, sólo que más difícil de ver.
     */
    const montones = new Map();
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion();
    const POS = new THREE.Vector3(), ESC = new THREE.Vector3();

    function monton(clave, geometria, materialUsado, cuantas) {
        let m = montones.get(clave);
        if (!m || m.instanceMatrix.count < cuantas) {
            if (m) { raiz.remove(m); m.dispose(); }
            // Se pide algo de holgura para no rehacerlo en cuanto entre una
            // pieza más: un tablero gana y pierde fichas todo el rato.
            m = new THREE.InstancedMesh(geometria, materialUsado, Math.max(16, Math.ceil(cuantas * 1.4)));
            m.frustumCulled = false;
            raiz.add(m);
            montones.set(clave, m);
        }
        m.geometry = geometria;
        m.material = materialUsado;
        m.count = 0;
        m.visible = true;
        return m;
    }

    /**
     * La cara de un item de zona, dibujada. Se guarda por identidad: en una
     * partida se piden los mismos seis o siete una y otra vez, y generar un lienzo
     * por fotograma sería el mismo error que crear `InstancedMesh` a sesenta por
     * segundo, sólo que más caro.
     *
     * Se dibuja en vez de cargarse de un fichero por lo mismo que el tapete: no
     * hay recursos que versionar ni una petición más, y escala sin pixelarse.
     */
    const caras = new Map();
    function caraDe(id) {
        if (caras.has(id)) return caras.get(id);
        const L = 128;
        const c = document.createElement('canvas');
        c.width = c.height = L;
        const g = c.getContext('2d');
        g.fillStyle = '#fdfdfd';
        g.fillRect(0, 0, L, L);
        g.strokeStyle = '#c9ced6';
        g.lineWidth = 5;
        g.strokeRect(3, 3, L - 6, L - 6);
        // `d6_5` enseña el 5, `S_A` el as: lo que va detrás del palo, que es la
        // convención de carta que ya usa toda la casa (`baraja.js`).
        const s = String(id);
        const txt = (s.includes('_') ? s.split('_').slice(1).join('_') : s).slice(0, 4);
        g.fillStyle = '#1b232e';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = `bold ${txt.length > 2 ? 40 : 76}px Georgia, serif`;
        g.fillText(txt, L / 2, L / 2);
        const m = material(0xffffff, { map: new THREE.CanvasTexture(c), roughness: 0.45 });
        caras.set(id, m);
        return m;
    }

    const poner = (m, x, y, z, escY = 1, rotY = 0) => {
        POS.set(x, y, z); ESC.set(1, escY, 1);
        Q.setFromAxisAngle({ x: 0, y: 1, z: 0 }, rotY);
        M.compose(POS, Q, ESC);
        m.setMatrixAt(m.count++, M);
    };

    function pintar(sus) {
        if (!sus) return;
        const usados = new Set();

        // ── El terreno ──────────────────────────────────────────────────
        if (sus.rejilla) {
            const { ancho: cols, alto: filas, celdas, niebla } = sus.rejilla;
            const dx = -(cols - 1) / 2, dz = -(filas - 1) / 2;

            /**
             * ⚠️ AQUÍ FALTABAN DOS FAMILIAS, Y UNA LLEVABA TIEMPO FALTANDO.
             *
             * Esto agrupaba en tres montones: suelo claro, suelo oscuro y muro.
             * Todo lo que no era muro caía en «suelo» — así que **los destinos de
             * sokoban no se dibujaban en 3D**. El mismo estado contado por tres
             * proyecciones, y una de ellas callándose dónde hay que dejar la caja.
             *
             * Es exactamente el fallo que el sustrato existe para hacer visible: si
             * el dibujo se inventa cómo leer el terreno, tarde o temprano se deja
             * un valor sin mirar. La regla está escrita en `pintar2d.js` y aquí no
             * se cumplía: **0 vacío · 1 muro · 2 destino · >2 cuenta**.
             */
            const claras = [], oscuras = [], muros = [], destinos = [], nieblas = [];
            for (let f = 0; f < filas; f++) {
                for (let c = 0; c < cols; c++) {
                    const i = f * cols + c, punto = [c + dx, f + dz];
                    if (niebla?.[i]) { nieblas.push(punto); continue; }
                    const v = celdas?.[i] ?? 0;
                    if (v === 1) muros.push(punto);
                    else {
                        ((f + c) % 2 ? oscuras : claras).push(punto);
                        if (v === 2) destinos.push(punto);   // encima del suelo
                    }
                }
            }
            for (const [clave, lista, g, mt, alturaY, escY] of [
                ['sueloA', claras, geo.celda, mat.sueloA, 0, 1],
                ['sueloB', oscuras, geo.celda, mat.sueloB, 0, 1],
                ['muro', muros, geo.cubo, mat.muro, ALTO.muro / 2, ALTO.muro],
                ['destino', destinos, geo.celda, mat.destino, 0.02, 1],
                // La niebla es un bloque bajo: se ve que hay algo sin decir qué.
                ['niebla', nieblas, geo.cubo, mat.niebla, 0.18, 0.36],
            ]) {
                if (!lista.length) continue;
                const m = monton(clave, g, mt, lista.length);
                for (const [x, z] of lista) poner(m, x, alturaY, z, escY);
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }

            // ── Las piezas, agrupadas por aspecto ───────────────────────
            // La clave es (forma + dueño), que es lo que decide cómo se ve. Así
            // treinta y dos piezas de ajedrez son dos llamadas, no treinta y dos.
            const grupos = new Map();
            for (const p of (sus.piezas ?? [])) {
                const alto = ALTO[p.t] ?? 0.25;
                const forma = (p.t === 'bolita' || p.t === 'comida') ? 'punto'
                            : alto >= 0.4 ? 'cubo' : 'disco';
                const clave = `p:${forma}:${p.de}`;
                if (!grupos.has(clave)) grupos.set(clave, { forma, de: p.de, alto, items: [] });
                grupos.get(clave).items.push(p);
            }
            for (const [clave, g] of grupos) {
                const m = monton(clave, geo[g.forma], mat.de[g.de] ?? mat.de.null, g.items.length);
                for (const p of g.items) {
                    poner(m, p.x + dx, g.alto / 2 + 0.08, p.y + dz,
                          g.forma === 'cubo' ? g.alto : 1);
                }
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }
        }

        // ── Los montones ────────────────────────────────────────────────
        (sus.zonas ?? []).forEach((z, iz) => {
            const total = z.items.length + (z.ocultas ?? 0);
            if (!total) return;
            const sitios = colocar(z, iz, total);

            /**
             * ⚠️ ESTO DIBUJABA «HAY ALGO», NO «QUÉ HAY». Y EL QUÉ ES TODO EL DATO.
             *
             * El bucle de antes sólo usaba `z.items.length` y el índice: todas las
             * vistas salían con el mismo material blanco. Nunca se leyó el
             * CONTENIDO de `z.items`.
             *
             * Con los diez juegos de cartas no se notaba, porque ésos no pasan por
             * aquí: `montarMesa` les da la mesa de casino, que pinta cada carta. Y
             * ningún juego de tablero publicaba zonas… hasta que hizo falta un
             * dado. Un `d6_5` y un `d6_2` salían IDÉNTICOS, una lámina en blanco:
             * la mesa diría «hay un dado» y no cuál, que es lo único que importa.
             * Verde y mintiendo — el modo de fallo de la casa.
             *
             * Lo encontró Fable al revisar la arquitectura, y se comprobó leyendo
             * estas mismas líneas antes de tocarlas.
             *
             * Se agrupa por IDENTIDAD y sale un montón instanciado por cada una,
             * con su cara dibujada. Para un dado son seis como mucho. Si algún día
             * pasara por aquí una baraja entera serían cuarenta grupos, que sigue
             * siendo poco — y esa mesa tiene su propio motor precisamente por eso.
             */
            const porId = new Map();
            z.items.forEach((it, k) => {
                const id = String(it?.id ?? it ?? '·');
                if (!porId.has(id)) porId.set(id, []);
                porId.get(id).push(k);
            });

            let fam = 0;
            for (const [id, indices] of porId) {
                const clave = `z${iz}:v${fam++}`;
                const m = monton(clave, geo.carta, caraDe(id), indices.length);
                for (const k of indices) {
                    const s = sitios[k] ?? { x: 0, z: 0, rot: 0 };
                    poner(m, s.x, alturaCarta * (k + 1) + 0.1, s.z, 1, s.rot ?? 0);
                }
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }

            // Las tapadas siguen siendo todas iguales, que es lo que son.
            const ocultas = z.ocultas ?? 0;
            if (ocultas > 0) {
                const clave = `z${iz}:ocultas`;
                const m = monton(clave, geo.carta, mat.oculta, ocultas);
                for (let k = z.items.length; k < total; k++) {
                    const s = sitios[k] ?? { x: 0, z: 0, rot: 0 };
                    poner(m, s.x, alturaCarta * (k + 1) + 0.1, s.z, 1, s.rot ?? 0);
                }
                m.instanceMatrix.needsUpdate = true;
                usados.add(clave);
            }
        });

        // Lo que no se usó este cuadro se esconde, no se destruye: volverá.
        for (const [clave, m] of montones) if (!usados.has(clave)) m.visible = false;
    }

    /** Dónde va cada carta. Con `CroupierSystem` si lo hay; si no, en fila. */
    function colocar(z, iz, total) {
        if (croupier?.calculatePlayerHands) {
            try {
                const r = croupier.calculatePlayerHands(1, total, 'fan', (z.ocultas ?? 0) > 0);
                const puntos = r?.[0]?.cards ?? r?.hands?.[0] ?? r?.[0] ?? [];
                if (puntos.length >= total) {
                    return puntos.map(p => ({ x: p.x ?? 0, z: (p.z ?? 0) + iz * 1.2,
                                              rot: p.rotY ?? p.rot ?? 0 }));
                }
            } catch { /* si no encaja, la fila de abajo */ }
        }
        // Respaldo honesto: una fila. Fea pero correcta, y nunca falla.
        return Array.from({ length: total }, (_, k) => ({
            x: (k - (total - 1) / 2) * 0.7, z: 2.4 + iz * 1.2, rot: 0,
        }));
    }

    return {
        pintar,
        raiz,
        /** Cuántas llamadas de dibujo cuesta el cuadro. Para poder vigilarlo. */
        get llamadas() { return [...montones.values()].filter(m => m.visible).length; },
        soltar() {
            for (const m of montones.values()) { raiz.remove(m); m.dispose(); }
            montones.clear();
            Object.values(geo).forEach(g => g.dispose?.());
            escena.remove(raiz);
        },
    };
}
