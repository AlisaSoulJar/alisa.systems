/**
 * sitio.js — MONTAR UN SITIO DESDE UNA LISTA DE PIEZAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { montarSitio } from './render/sitio.js';
 *     const sala = montarSitio(THREE, escena, manifiesto, { render });
 *     …
 *     sala.quitar();
 *
 * QUÉ ES
 *
 * La tercera tabla de las tres que vimos que hacían falta:
 *
 *     aspecto.js     CÓMO SE VE      un rol → color, rugosidad, metal, sinLuz
 *     medidas        CUÁNTO OCUPA    con suelos medidos: hay números que no son gusto
 *     sitio.js       QUÉ VA CON QUÉ  ← esto: la composición
 *
 * Un manifiesto es una lista de piezas, y cada pieza dice qué es y cuánto mide.
 * El color no lo dice: lo pide por ROL, así que la misma sala vestida con otra
 * piel es el mismo manifiesto.
 *
 * ⚠️ ESTO NO ES MAQUINARIA NUEVA. ES DARLE DATOS A LA QUE YA HABÍA.
 *
 * `world/systems/WorldBuilderSystem.js` lleva escrito desde hace tiempo un
 * ensamblador de escenas por manifiesto — `build(manifest)` con `atmosphere`,
 * `terrain`, `structures`, `props`, `agents`. Y `docs/ESTADO_SAGAS.md` ya avisaba:
 * «el juego entero podría ser un manifiesto JSON». Comprobado: **manifiestos
 * escritos en todo el repo, CERO.** Lo mismo con `AssetManager.spawnBuilding()`,
 * que compone edificio → plantas → salas → props desde cuatro JSON y no lo llama
 * nadie.
 *
 * Esto es deliberadamente MÁS PEQUEÑO que aquello: cuatro clases de pieza, las
 * que hacen falta para la mesa de cartas. Porque lo que falta no es alcance —
 * aquello tiene de sobra— sino un manifiesto que exista y una sala que se monte
 * con él y salga idéntica. Un ensamblador sin datos no ha demostrado nada, y a
 * eso ya llegamos una vez.
 *
 * ⚠️ Y THREE ENTRA POR PARÁMETRO, COMO EN `tapete.js`.
 *
 * El arcade corre three r128 global y las salas three 0.160 en módulos. Recibirlo
 * en vez de importarlo es lo que permite que este fichero sirva a los dos — y
 * evita un segundo three en memoria, que ya costó caro con TWEEN.
 */

import { aspectoDe } from './aspecto.js';
import { materialDe } from './material.js';

/**
 * La geometría de una pieza del catálogo.
 *
 * ⚠️ LAS CUATRO FORMAS, Y LA CUARTA NO LA DIBUJA NADIE HOY.
 *
 * Contadas en las 754 piezas: `box` 406, `cylinder` 225, **`wedge` 63** y
 * `sphere` 60. El único lector del catálogo —`gen_semantic_props.html`— maneja
 * las tres primeras y **no la cuña**: su cadena de `if` no la contempla, así que
 * la malla se queda sin geometría y desaparece sin decir nada.
 *
 * No es un detalle: **50 de los 234 props llevan alguna cuña**, uno de cada
 * cinco. Son los parabrisas de los coches, las solapas de las cajas, las rampas.
 * Se dibujan a medias desde siempre y nadie lo ha visto porque falta en silencio.
 *
 * ⚠️ Y HACIA DÓNDE CAE LA PENDIENTE NO ESTÁ EN LOS DATOS. ES UNA DECISIÓN.
 *
 * Una cuña trae `size: [ancho, alto, fondo]` como una caja, y nada más. Ni el
 * dato ni el lector actual dicen por qué cara baja. Así que se elige —una rampa
 * que arranca a la altura completa en −z y muere en el suelo en +z— y se dice
 * aquí, en vez de que parezca deducido. `rot` la gira, que para eso lo traen
 * ciento cincuenta y siete piezas.
 */
export function geometriaDe(THREE, parte) {
    const s = parte.size ?? [];
    switch (parte.shape) {
        case 'box':      return new THREE.BoxGeometry(...s);
        case 'cylinder': return new THREE.CylinderGeometry(...s);
        case 'sphere':   return new THREE.SphereGeometry(...s);
        case 'wedge':    return cuña(THREE, s[0] ?? 1, s[1] ?? 1, s[2] ?? 1);
        default:         return null;
    }
}

/** Un prisma triangular: la caja con una cara caída. Centrado, como las demás. */
function cuña(THREE, ancho, alto, fondo) {
    const x = ancho / 2, y = alto / 2, z = fondo / 2;
    // Seis vértices: la cara alta en −z y la arista baja en +z.
    const v = new Float32Array([
        -x, -y, -z,   x, -y, -z,   x,  y, -z,  -x,  y, -z,   // cara trasera, completa
        -x, -y,  z,   x, -y,  z,                              // arista delantera, a ras
    ]);
    const cara = [
        0, 1, 2,  0, 2, 3,      // trasera
        4, 5, 1,  4, 1, 0,      // suelo
        0, 3, 4,  3, 5, 4,      // laterales — se cierran contra la arista
        1, 5, 2,  2, 5, 3,      // la pendiente
    ];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setIndex(cara);
    g.computeVertexNormals();
    return g;
}

/**
 * LOS CONSTRUCTORES DE PIEZA.
 *
 * Cada uno recibe `(THREE, pieza, ctx)` y devuelve lo que haya que añadir a la
 * escena, o `null` si la pieza no pone mallas (la niebla y la luz no ponen).
 * `ctx` lleva `{ escena, piel, render, añadir, luz, guardar }`.
 *
 * Añadir una clase de pieza es añadir una entrada aquí. Eso es lo que hace que un
 * ambiente nuevo cueste un fichero: si sus piezas ya existen, no se toca código.
 */
export const PIEZAS = {

    /** El suelo. `radio` en unidades de esta escena. */
    suelo(THREE, p, ctx) {
        const a = aspectoDe('suelo', { piel: ctx.piel });
        const m = new THREE.Mesh(
            new THREE.CircleGeometry(p.radio, p.lados ?? 96),
            new THREE.MeshStandardMaterial({
                color: a.color, roughness: a.rugosidad, metalness: a.metal,
            }));
        m.rotation.x = -Math.PI / 2;
        m.position.y = p.y ?? 0;
        ctx.añadir(m);
    },

    /**
     * La rejilla.
     *
     * ⚠️ SE DECLARA LA CASILLA, NO EL NÚMERO DE DIVISIONES. Y LO DESCUBRÍ AL
     *    PONERLO EN DATOS.
     *
     * `GridHelper` pide `(lado, divisiones)`, así que eso es lo que había escrito
     * en las tres salas. Puestos uno al lado de otro en una lista, el número que
     * importa —cuánto mide una baldosa— salió mintiendo:
     *
     *     Sala del Huevo     GridHelper(320, 160)  →  2,00 m
     *     sala de bolsillo   GridHelper(110,  55)  →  2,00 m
     *     mesa de cartas     GridHelper(672,  42)  →  1,60 m   ← la puse yo
     *
     * Un 20 % más pequeña, con un comentario mío al lado diciendo que era la misma
     * proporción. Dentro de una función nadie lo ve; en una lista comparable, salta
     * solo. Es el argumento entero de esta refactorización, encontrado por ella.
     *
     * Así que la medida con significado es `casilla` y `divisiones` se deriva. El
     * lado se ajusta al múltiplo más cercano para que la última baldosa no salga
     * cortada — mejor una sala un pelo más grande que una baldosa que miente.
     */
    rejilla(THREE, p, ctx) {
        const a = aspectoDe('rejilla', { piel: ctx.piel });
        const divisiones = p.casilla ? Math.max(1, Math.round(p.lado / p.casilla)) : p.divisiones;
        const lado = p.casilla ? divisiones * p.casilla : p.lado;
        const g = new THREE.GridHelper(lado, divisiones, a.color, a.secundario ?? a.color);
        g.material.transparent = true;
        g.material.opacity = a.opacidad ?? 0.5;
        g.position.y = p.y ?? 0;
        ctx.añadir(g);
    },

    /**
     * La niebla, y el fondo con ella.
     *
     * El fondo importa tanto como la niebla: sin él, por encima del horizonte se
     * ve el vacío del motor —negro— y la sala parece flotar. El hall pinta los dos
     * del mismo color justo para que no haya línea.
     */
    niebla(THREE, p, ctx) {
        const a = aspectoDe('niebla', { piel: ctx.piel });
        ctx.guardar('fog', ctx.escena.fog);
        ctx.guardar('background', ctx.escena.background);
        ctx.escena.fog = p.densidad !== undefined
            ? new THREE.FogExp2(a.color, p.densidad)
            : new THREE.Fog(a.color, p.cerca, p.lejos);
        ctx.escena.background = new THREE.Color(a.color);
    },

    /**
     * La luz de la sala: hemisférico + cenital que proyecta.
     *
     * Los números no se convierten con la escala —la intensidad de una luz no
     * depende de en qué unidades midas la escena— pero las POSICIONES sí, y por
     * eso vienen en el manifiesto.
     */
    'luz-sala'(THREE, p, ctx) {
        const hemi = new THREE.HemisphereLight(
            p.cielo ?? 0xffffff, p.suelo ?? 0xdfe6ec, p.ambiente ?? 2.4);
        ctx.luz(hemi);

        const cenital = new THREE.DirectionalLight(0xffffff, p.cenital ?? 2.2);
        cenital.position.set(...(p.desde ?? [0, 60, 8]));
        if (p.sombra !== false) {
            cenital.castShadow = true;
            cenital.shadow.mapSize.set(2048, 2048);
            const c = p.caja ?? 40;
            Object.assign(cenital.shadow.camera,
                { left: -c, right: c, top: c, bottom: -c, near: 0.5, far: p.lejos ?? c * 4 });
            cenital.shadow.camera.updateProjectionMatrix();
            cenital.shadow.bias = -0.0008;
        }
        ctx.luz(cenital);
    },

    /**
     * ═══════════════════════════════════════════════════════════════════
     *  UN PROP DEL CATÁLOGO
     * ═══════════════════════════════════════════════════════════════════
     *
     *     { pieza: 'prop', catalogo: 'urban', nombre: 'bench_park',
     *       en: [x, y, z], gira: [0, 1.57, 0], escala: 1 }
     *
     * ⚠️ LOS 87 KB QUE YA ESTABAN ESCRITOS Y NO LEÍA NADIE.
     *
     * `public/props/*.json` son dieciséis catálogos con **234 props y 754
     * piezas**, cada una con su forma, su tamaño en METROS, su posición y su
     * material declarado POR NOMBRE. Contado, no estimado.
     *
     * Los lee una sola página —`generators/gen_semantic_props.html`— y ningún
     * juego, ninguna sala y ninguna de las 26 fábricas del motor. Son un
     * mobiliario completo esperando a que alguien lo pida.
     *
     * ⚠️ EL CATÁLOGO ENTRA POR PARÁMETRO. Este fichero no lee disco ni red, que
     * es lo que lo mantiene puro y probable en Node sin navegador. Cargarlo es
     * del que llama, igual que THREE.
     */
    prop(THREE, p, ctx) {
        const cat = ctx.catalogos?.[p.catalogo];
        if (!cat) {
            console.warn(`[sitio] no tengo el catálogo «${p.catalogo}»: el prop «${p.nombre}» no se monta. ` +
                         `Pásalo en { catalogos: { ${p.catalogo}: … } }.`);
            return;
        }
        const receta = cat[p.nombre];
        if (!receta) {
            console.warn(`[sitio] «${p.nombre}» no está en el catálogo «${p.catalogo}».`);
            return;
        }
        const partes = Array.isArray(receta) ? receta : (receta.partes ?? receta.parts ?? []);
        if (!partes.length) {
            // Cinco props del catálogo no son una lista sino una RECETA
            // (`generator: bsp_shelf` / `grid_lockers`), y esas las construye
            // `BspPropSystem`, que vive en el motor nuevo. Se dice en vez de
            // devolver un hueco silencioso.
            console.warn(`[sitio] «${p.nombre}» no es una lista de piezas` +
                         `${receta.generator ? ` sino una receta «${receta.generator}»` : ''}: no se monta.`);
            return;
        }

        const grupo = new THREE.Group();
        for (const parte of partes) {
            const g = geometriaDe(THREE, parte);
            if (!g) {
                console.warn(`[sitio] forma desconocida «${parte.shape}» en «${p.nombre}»: esa pieza falta.`);
                continue;
            }
            const m = new THREE.Mesh(g, materialDe(THREE, `prop:${parte.type ?? 'base'}`, { piel: ctx.piel }));
            if (parte.pos) m.position.set(...parte.pos);
            if (parte.rot) m.rotation.set(...parte.rot);
            if (parte.scale) m.scale.setScalar(parte.scale);
            m.castShadow = m.receiveShadow = true;
            grupo.add(m);
        }
        if (p.en) grupo.position.set(...p.en);
        if (p.gira) grupo.rotation.set(...p.gira);
        if (p.escala) grupo.scale.setScalar(p.escala);
        ctx.añadir(grupo);
    },

    /**
     * El revelado: mapeo de tono y entorno reflejado.
     *
     * ⚠️ NO ES UN ADORNO NI UN DETALLE TÉCNICO, Y ES PIEZA DEL SITIO A PROPÓSITO.
     *
     * Sin el `environment`, una superficie blanca sobre otra blanca es el MISMO
     * píxel — medido con `canto.mjs`: 246,246,246 a los dos lados del canto de la
     * mesa, nueve bordes de once. El degradado es lo que le da relieve: la cara de
     * arriba refleja el polo claro y un canto vertical la parte baja, más oscura.
     *
     * Y sin `ACESFilmic`, el hemisférico a 2,4 quema la escena entera. La luz y el
     * revelado van juntos o no va ninguno — por eso son piezas del mismo sitio y
     * no ajustes sueltos de quien monta la página.
     *
     * Sin renderizador se monta el resto y se avisa: una sala no puede negarse a
     * existir porque quien la pide no le pase un objeto, pero tampoco puede
     * callarse que le falta lo que más se nota.
     */
    revelado(THREE, p, ctx) {
        if (!ctx.render) {
            console.warn('[sitio] «revelado» sin renderizador: el sitio va sin ACES ni entorno ' +
                         'reflejado, así que su luz NO es la de la Sala del Huevo.');
            return;
        }
        const r = ctx.render;
        ctx.guardar('toneMapping', r.toneMapping);
        ctx.guardar('toneMappingExposure', r.toneMappingExposure);
        ctx.guardar('environment', ctx.escena.environment);

        r.toneMapping = THREE.ACESFilmicToneMapping;
        r.toneMappingExposure = p.exposicion ?? 1.02;

        const c = document.createElement('canvas');
        c.width = 16; c.height = 256;
        const g = c.getContext('2d');
        const grad = g.createLinearGradient(0, 0, 0, 256);
        for (const [donde, color] of (p.degradado ?? [
            [0.00, '#ffffff'], [0.45, '#eef3f8'], [0.55, '#dde5ee'], [1.00, '#c3ced9'],
        ])) grad.addColorStop(donde, color);
        g.fillStyle = grad; g.fillRect(0, 0, 16, 256);

        const tex = new THREE.CanvasTexture(c);
        tex.mapping = THREE.EquirectangularReflectionMapping;
        if (THREE.sRGBEncoding !== undefined) tex.encoding = THREE.sRGBEncoding;

        const pmrem = new THREE.PMREMGenerator(r);
        pmrem.compileEquirectangularShader();
        ctx.escena.environment = pmrem.fromEquirectangular(tex).texture;
        tex.dispose(); pmrem.dispose();
    },
};

/**
 * Monta un sitio.
 *
 * @param {object} THREE       el three de quien llama
 * @param {object} escena
 * @param {object} manifiesto  `{ sitio, piezas: [{pieza, …}] }`
 * @param {object} [opts]      `{ piel, render }`
 * @returns {{piezas, quitar}}
 *
 * ⚠️ UNA PIEZA DESCONOCIDA SE DICE Y SE SALTA. No revienta: un manifiesto con una
 * pieza que este motor no sabe montar tiene que dar el resto del sitio, porque si
 * no, un editor donde alguien escribe mal una palabra le devuelve una pantalla
 * negra en vez de una sala a la que le falta algo.
 */
export function montarSitio(THREE, escena, manifiesto, { piel, render = null } = {}) {
    const mallas = [], luces = [], previo = {};
    const ctx = {
        escena, piel, render,
        añadir: (m) => { escena.add(m); mallas.push(m); return m; },
        luz: (l) => { escena.add(l); luces.push(l); return l; },
        guardar: (k, v) => { if (!(k in previo)) previo[k] = v; },
    };

    for (const p of manifiesto?.piezas ?? []) {
        const construir = PIEZAS[p.pieza];
        if (!construir) {
            console.warn(`[sitio] pieza desconocida: «${p.pieza}». Se salta; el resto del sitio se monta.`);
            continue;
        }
        construir(THREE, p, ctx);
    }

    return {
        piezas: mallas,
        luces,
        quitar() {
            for (const m of mallas) {
                escena.remove(m);
                m.geometry?.dispose?.();
                m.material?.dispose?.();
            }
            for (const l of luces) escena.remove(l);
            mallas.length = 0; luces.length = 0;
            if ('fog' in previo) escena.fog = previo.fog;
            if ('background' in previo) escena.background = previo.background;
            if ('environment' in previo) {
                escena.environment?.dispose?.();
                escena.environment = previo.environment;
            }
            if (render && 'toneMapping' in previo) {
                render.toneMapping = previo.toneMapping;
                render.toneMappingExposure = previo.toneMappingExposure;
            }
        },
    };
}
