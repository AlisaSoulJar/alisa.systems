/**
 * atmosfera.js — CIELO, SUELO Y NIEBLA. LO QUE SEPARA UN TABLERO DE UN MUNDO
 * ═══════════════════════════════════════════════════════════════════════════
 *     const a = crearAtmosfera(THREE, escena, 'pradera', { lado: 20 });
 *     a.soltar();     // al cambiar de juego
 *
 * ⚠️ DE DÓNDE SALE ESTO: DE MIRAR LA HOJA DE CONTACTOS DE LOS 38.
 *
 * Diez juegos —cripta, flota, defensa, sigilo, frentes, relevo, cabina, rebaño,
 * pradera y nave— tienen EXACTAMENTE la misma cara: damero azul y blanco, cubitos
 * marrones alrededor, un cono amarillo por jugador. Pradera y rebaño son el mismo
 * dibujo con otras fichas, y sin embargo uno va de pastorear y el otro de no morirse
 * de hambre.
 *
 * No es un descuido: es la consecuencia directa de la tesis. `pintar3d` dibuja sin
 * saber a qué se juega, y por eso un juego nuevo se ve el mismo día que tiene reglas.
 * La fuerza y el techo son la misma línea.
 *
 * ⚠️ Y EL LISTÓN LO PUSO OSCAR: «fíjate en el cucco swarm».
 *
 * Se abrió y se miró. Lo que hace que ese prototipo se vea otra cosa NO es geometría
 * —siguen siendo cubos, igual que aquí—. Es:
 *
 *     · un CIELO con degradado, en vez de un fondo negro plano
 *     · un SUELO con textura, en vez de un damero de dos colores
 *     · NIEBLA de distancia, que da profundidad
 *     · un HALO en el horizonte, que encierra la escena en vez de dejarla flotando
 *
 * O sea: material y atmósfera. Nada de esto sabe a qué se juega, así que sirve para
 * los veinticuatro tableros a la vez — que es la única forma de que esto salga a
 * cuenta. Veinticuatro visualizadores a medida es lo que este proyecto lleva dos
 * meses NO haciendo, y con razón.
 *
 * ⚠️ EL AMBIENTE LO DECLARA EL JUEGO, NO SE ADIVINA POR EL NOMBRE.
 *
 * `sustrato().rejilla.ambiente = 'pradera'`. Adivinar por el id sería otra lista
 * paralela, y este repositorio lleva ocho arregladas. Quien no declare nada se queda
 * exactamente como está: ningún juego cambia sin pedirlo.
 *
 * ⚠️ Y THREE SE PASA, NO SE IMPORTA. Mismo trato que `tapete.js` y `mueble.js`: estas
 * páginas cargan tres versiones distintas de three (r128, r160, r170) y un import
 * fijo las obligaría a todas a la misma. Ya nos costó caro una vez con TWEEN.
 */

/**
 * Las paletas. Cada una son cuatro colores y una densidad de niebla, y con eso basta
 * para que dos juegos con el mismo damero dejen de parecer el mismo juego.
 *
 * Los nombres son de MUNDO y no de juego: `piedra` la puede pedir cripta y también el
 * que venga después. Si fueran nombres de juego, esto sería un mapa por juego, o sea
 * la lista paralela otra vez.
 */
export const AMBIENTES = {
    hierba: {
        cielo: [0x7fb2e5, 0xdfeeff], suelo: 0x3f6b34, grano: 0x2c4d24,
        niebla: 0xbcd8ee, densidad: 0.014, halo: 0xfff3c4,
    },
    piedra: {
        cielo: [0x14121c, 0x2b2440], suelo: 0x3a3a44, grano: 0x25252c,
        niebla: 0x1a1826, densidad: 0.040, halo: 0x8f7fd8,
    },
    metal: {
        cielo: [0x05070d, 0x16203a], suelo: 0x38414f, grano: 0x232a35,
        niebla: 0x0b1120, densidad: 0.026, halo: 0x6fd6ff,
    },
    arena: {
        cielo: [0xe8b06a, 0xfbe7c6], suelo: 0xbb9a5f, grano: 0x9a7c46,
        niebla: 0xf0d5a8, densidad: 0.018, halo: 0xfff0cf,
    },
    noche: {
        cielo: [0x070910, 0x1b2340], suelo: 0x232b3a, grano: 0x171d28,
        niebla: 0x0a0d18, densidad: 0.030, halo: 0x9fb6ff,
    },
};

/** El azar del grano, sembrado: dos jugadores tienen que ver el mismo suelo. */
function azarFijo() {
    let s = 0x9e3779b9;
    return () => {
        s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
        return ((s >>> 0) % 1000) / 1000;
    };
}

/**
 * El suelo, pintado en un lienzo. Con textura y no con un color plano por lo mismo
 * que el tapete: un plano de un solo color se lee como plástico a cualquier tamaño,
 * y basta con muy poco grano para que parezca un material.
 */
function texturaDeSuelo(THREE, a) {
    const L = 512;
    const c = document.createElement('canvas');
    c.width = c.height = L;
    const g = c.getContext('2d');
    g.fillStyle = `#${a.suelo.toString(16).padStart(6, '0')}`;
    g.fillRect(0, 0, L, L);

    const azar = azarFijo();
    const grano = `#${a.grano.toString(16).padStart(6, '0')}`;
    for (let i = 0; i < 9000; i++) {
        g.globalAlpha = 0.05 + azar() * 0.18;
        g.fillStyle = azar() > 0.5 ? grano : '#ffffff';
        const r = 1 + azar() * 3;
        g.fillRect(azar() * L, azar() * L, r, r);
    }
    // Manchas grandes y suaves: es lo que le quita el aire de ruido uniforme.
    g.globalAlpha = 0.10;
    g.fillStyle = grano;
    for (let i = 0; i < 40; i++) {
        const x = azar() * L, y = azar() * L, r = 20 + azar() * 70;
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.anisotropy = 4;
    return t;
}

/**
 * @param {object} THREE
 * @param {object} escena   la escena a la que se le pone el ambiente
 * @param {string} nombre   una clave de `AMBIENTES`; cualquier otra cosa no hace nada
 * @param {object} [opts]
 * @param {number} [opts.lado]  cuánto mide el mundo, para dimensionar suelo y cielo
 * @returns {{soltar: Function}}  para quitarlo al cambiar de juego
 */
export function crearAtmosfera(THREE, escena, nombre, opts = {}) {
    const a = AMBIENTES[nombre];
    // Sin ambiente declarado no se toca nada: los veintiocho juegos que no lo piden
    // se quedan exactamente como estaban.
    if (!a || !escena) return { soltar() {} };

    const lado = opts.lado ?? 20;
    const puestos = [];
    const nieblaAntes = escena.fog;
    const fondoAntes = escena.background;

    /**
     * ⚠️ EL CIELO ES UNA ESFERA POR DENTRO, NO UN `background` DE COLOR.
     *
     * Un `scene.background` plano no tiene degradado, y el degradado es justo lo que
     * hace que el horizonte exista. Se pinta en un lienzo de 2×N —dos píxeles de
     * ancho bastan, la textura se estira— y se mete en una esfera vista desde dentro.
     * Sin luz: es un fondo, no una superficie que deba responder al foco.
     */
    const lienzo = document.createElement('canvas');
    lienzo.width = 2; lienzo.height = 256;
    const gc = lienzo.getContext('2d');
    const grad = gc.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, `#${a.cielo[0].toString(16).padStart(6, '0')}`);
    grad.addColorStop(1, `#${a.cielo[1].toString(16).padStart(6, '0')}`);
    gc.fillStyle = grad;
    gc.fillRect(0, 0, 2, 256);
    const texCielo = new THREE.CanvasTexture(lienzo);

    const cielo = new THREE.Mesh(
        new THREE.SphereGeometry(lado * 6, 24, 16),
        new THREE.MeshBasicMaterial({ map: texCielo, side: THREE.BackSide, depthWrite: false }),
    );
    cielo.name = 'atmosfera-cielo';
    escena.add(cielo);
    puestos.push(cielo);

    // El suelo, bastante más ancho que el tablero: lo que se ve más allá del borde es
    // lo que hace que el tablero esté EN un sitio y no flotando.
    const suelo = new THREE.Mesh(
        new THREE.PlaneGeometry(lado * 5, lado * 5),
        new THREE.MeshStandardMaterial({ map: texturaDeSuelo(THREE, a), roughness: 0.95 }),
    );
    suelo.rotation.x = -Math.PI / 2;
    suelo.position.y = -0.09;      // justo debajo de las casillas
    suelo.receiveShadow = true;
    suelo.name = 'atmosfera-suelo';
    escena.add(suelo);
    puestos.push(suelo);

    /**
     * El halo del horizonte: un anillo tumbado que brilla al fondo. Es lo que en el
     * cucco cierra la escena — sin él, el suelo se pierde en la niebla y la mesa
     * parece infinita en vez de un sitio con bordes.
     */
    const halo = new THREE.Mesh(
        new THREE.RingGeometry(lado * 2.1, lado * 2.45, 64),
        new THREE.MeshBasicMaterial({
            color: a.halo, transparent: true, opacity: 0.5,
            side: THREE.DoubleSide, depthWrite: false,
        }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = -0.07;
    halo.name = 'atmosfera-halo';
    escena.add(halo);
    puestos.push(halo);

    // La niebla, del color del horizonte: si fuera de otro, el suelo se desvanecería
    // hacia un color que no está en el cielo y se vería el truco.
    escena.fog = new THREE.FogExp2(a.niebla, a.densidad / (lado / 20));

    return {
        soltar() {
            for (const o of puestos) {
                escena.remove(o);
                o.geometry?.dispose?.();
                o.material?.map?.dispose?.();
                o.material?.dispose?.();
            }
            escena.fog = nieblaAntes;
            escena.background = fondoAntes;
        },
    };
}
