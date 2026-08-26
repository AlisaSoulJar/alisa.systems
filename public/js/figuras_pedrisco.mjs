/**
 * figuras_pedrisco.mjs — EL ASPECTO DE ¡ESQUIVA! 1, PEDRISCO
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { figurasDePedrisco, encuadrarPedrisco } from '/js/figuras_pedrisco.mjs';
 *     const pintor = new PintorMundo(escena, figurasDePedrisco(THREE), 1);
 *
 * Un `estilo` para `PintorMundo`: qué forma tiene cada tipo de pieza del
 * sustrato. El pintor lleva la posición, la identidad y el «esto ya no está»;
 * esto sólo dice cómo se ve.
 *
 * ⚠️ DE DÓNDE SALE: EL ÚLTIMO MONOLITO VIVO DE LA CASA.
 *
 * `asteroid_gauntlet.html` eran 897 líneas que no importaban NADA: el juego
 * entero escrito dentro, con su bucle, su física y su arte. Y al lado,
 * `AsteroidsSystem` — 669 líneas, headless, con sustrato, que es lo que mide el
 * banco como `alisa/Pedrisco-v0`.
 *
 * Al compararlos rasgo a rasgo salió lo interesante: **son el mismo juego, con
 * los mismos números**. `BASIC hp 20`, `FAST 10`, `GOLD 50`, `MONO 999999`,
 * densidad 15, los mismos `SHIP_GAUGES`, el mismo `gaugeIndex = -1`. El núcleo se
 * hizo copiando la página y poniéndole `this.` delante.
 *
 * Eso lo distingue de los otros tres casos de la casa: no son dos juegos que se
 * separaron — es una COPIA FIEL que todavía no se ha separado. Y por eso este era
 * el mejor momento para juntarlos: no hay nada que reconciliar.
 *
 * ⚠️ Y LOS COLORES SALEN DE LA TABLA DEL NÚCLEO, NO DE AQUÍ.
 *
 * `AST_TYPES` vive en `AsteroidsSystem` con su `hp` y su `col` juntos. Copiarlos
 * aquí sería crear el quinto sitio donde este juego puede separarse de sí mismo,
 * que es exactamente la avería que se está cerrando. Se importan.
 */
import { AST_TYPES } from '@alisa-engine/src/world/systems/AsteroidsSystem.js';

/**
 * El encuadre. Va con las figuras porque es parte del aspecto, y porque
 * `paginas.mjs` cuenta «mueve objetos 3D» con un techo que sólo puede bajar.
 *
 * Esto es un TÚNEL, no una arena: se mira desde detrás y un poco por encima de la
 * nave, hacia donde se avanza. Lo dice el propio sustrato del núcleo — `y` es la
 * profundidad y `alto` la altura.
 */
export function encuadrarPedrisco(gfx, sustrato) {
    seguirPedrisco(gfx, sustrato);
}

/**
 * ⚠️ LA CÁMARA SIGUE A LA NAVE, Y ESO NO ES GUSTO: ES OBLIGATORIO.
 *
 * Medido en pantalla: la primera versión dejaba la cámara clavada en el origen y
 * la escena salía VACÍA aunque el pintor tuviera 89 mallas puestas. El motivo es
 * que este túnel avanza en profundidad ABSOLUTA —la nave iba por la 914 y las
 * rocas entre la 893 y la 1.043— así que mirar al origen es mirar a un sitio por
 * el que se pasó hace un minuto.
 *
 * Medido también hacia dónde: el túnel avanza hacia `+y` del sustrato y **37 de
 * 40 rocas están por delante de la nave**. Así que la cámara va DETRÁS y mira
 * hacia adelante; al revés se jugaría de espaldas y sólo se vería lo esquivado.
 *
 * Va aquí y no en la página porque `paginas.mjs` cuenta «mueve objetos 3D» con un
 * techo que sólo puede bajar — y porque desde dónde se mira un túnel es parte del
 * aspecto, igual que el color de las rocas.
 */
export function seguirPedrisco(gfx, sustrato) {
    const nave = (sustrato?.piezas ?? []).find((p) => p.t === 'nave' || p.t === 'nave_rota');
    if (!nave) return;
    const x = nave.x ?? 0, alto = nave.alto ?? 0, hondo = nave.y ?? 0;
    // Un tercio del desplazamiento lateral: la cámara acompaña sin marearse.
    gfx.camera.position.set(x * 0.35, alto + 8, hondo - 26);
    gfx.controls.target.set(x, alto + 2, hondo + 30);
    gfx.controls.update();
}

export function figurasDePedrisco(THREE) {
    /**
     * Una roca. El `tier` de la pieza dice de qué tamaño es —el núcleo las parte
     * en trozos más pequeños al golpearlas— y el radio viene en `r`, así que el
     * dibujo no se inventa ninguna medida.
     */
    const roca = (color) => (tipo, pieza) => {
        const r = pieza?.r ?? 2;
        const g = new THREE.Group();
        const m = new THREE.Mesh(
            // Pocos segmentos a propósito: un pedrusco facetado se lee mejor que
            // una esfera lisa, y son cientos en pantalla.
            new THREE.IcosahedronGeometry(r, 0),
            new THREE.MeshStandardMaterial({
                color, roughness: 0.9, metalness: 0.1,
                emissive: color, emissiveIntensity: 0.12,
            }));
        m.castShadow = true;
        g.add(m);
        return g;
    };

    /**
     * El monolito negro no se rompe —`hp: 999999`— y por eso NO se dibuja como
     * las demás: si pareciera una roca, quien lo vea intentará romperlo y perderá
     * la partida aprendiéndolo. Un cubo liso y brillante dice «esto es otra cosa»
     * antes de que te acerques.
     */
    const monolito = () => (tipo, pieza) => {
        const r = pieza?.r ?? 4;
        const g = new THREE.Group();
        g.add(new THREE.Mesh(
            new THREE.BoxGeometry(r * 1.2, r * 2.4, r * 1.2),
            new THREE.MeshStandardMaterial({
                color: 0x111111, roughness: 0.15, metalness: 0.9,
                emissive: 0x2a1a4a, emissiveIntensity: 0.5,
            })));
        return g;
    };

    const nave = (color, brillo) => () => {
        const g = new THREE.Group();
        const cuerpo = new THREE.Mesh(
            new THREE.ConeGeometry(0.8, 2.6, 8),
            new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: brillo,
                roughness: 0.35, metalness: 0.7,
            }));
        // De morro hacia donde se avanza: el cono nace apuntando a +Y.
        cuerpo.rotation.x = -Math.PI / 2;
        g.add(cuerpo);
        g.add(new THREE.PointLight(color, 4, 22, 2));
        return g;
    };

    return {
        nave: { malla: nave(0x7fd1ff, 0.9) },
        // Rota: sin luz y en rojo. Que se vea que eso ya no vuela.
        nave_rota: { malla: nave(0xff4d4d, 0.35) },

        // Las cuatro rocas, con el color que declara el núcleo.
        basic: { malla: roca(AST_TYPES.BASIC.col) },
        fast: { malla: roca(AST_TYPES.FAST.col) },
        gold: { malla: roca(AST_TYPES.GOLD.col) },
        mono: { malla: monolito() },
        // Respaldo: si el núcleo publicara un tipo nuevo, sale como piedra gris en
        // vez de desaparecer. Una pieza que existe y no se ve es peor que una fea.
        roca: { malla: roca(0x887766) },

        dron: {
            malla: () => {
                const g = new THREE.Group();
                g.add(new THREE.Mesh(
                    new THREE.OctahedronGeometry(1.1, 0),
                    new THREE.MeshStandardMaterial({
                        color: 0xff5a36, emissive: 0xff5a36,
                        emissiveIntensity: 0.8, metalness: 0.6,
                    })));
                g.add(new THREE.PointLight(0xff5a36, 2.5, 14, 2));
                return g;
            },
        },

        /**
         * Los ítems. El núcleo los publica por su clase en minúsculas, y aquí sólo
         * hay uno declarado —`suelo` es su respaldo— porque el resto los inventa
         * la partida. Todos comparten forma a propósito: lo que importa es «hay
         * algo que coger», no cuál.
         */
        suelo: { malla: item(THREE, 0x3ddc97) },
        power: { malla: item(THREE, 0xffe066) },
    };
}

function item(THREE, color) {
    return () => {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(
            new THREE.TorusGeometry(0.9, 0.3, 8, 16),
            new THREE.MeshStandardMaterial({
                color, emissive: color, emissiveIntensity: 1.1, roughness: 0.4,
            })));
        g.add(new THREE.PointLight(color, 3, 12, 2));
        return g;
    };
}
