/**
 * figuras_torre.mjs — EL ASPECTO DE ¡BUSCA! EN VOLUMEN
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     import { figurasDeTorre } from '/js/figuras_torre.mjs';
 *     const pintor = new PintorMundo(escena, figurasDeTorre(THREE), 1);
 *
 * Un `estilo` para `PintorMundo`: qué forma tiene cada tipo de pieza del
 * sustrato. El pintor sigue llevando la posición, la identidad y el «esto ya no
 * está»; esto sólo dice cómo se ve.
 *
 * ⚠️ POR QUÉ NO ESTÁ DENTRO DE LA PÁGINA, QUE ES DE DONDE SALIÓ.
 *
 * `paginas.mjs` cuenta «señales» —una página que se fabrica sus propias mallas y
 * mueve objetos 3D— y tiene un TECHO que sólo puede bajar. Con el estilo escrito
 * dentro, `dron_torre.html` metía diez señales y el total pasaba de 341 a 349.
 *
 * La tentación era subir el techo. Pero el comentario de ese fichero dice
 * exactamente para qué existe: «una página nueva que se escriba su propio dibujo
 * lo dice aquí». O sea que el aviso no estaba equivocado — yo sí. El arreglo no
 * es levantar la vara: es sacar el dibujo de la página, que además lo deja
 * reutilizable para la siguiente etapa que quiera una torre.
 *
 * ⚠️ Y RECIBE `THREE` EN VEZ DE IMPORTARLO.
 * Este fichero se carga desde páginas que resuelven `three` por el `importmap`
 * común. Importarlo aquí arriba lo ataría a que el mapa estuviera puesto en el
 * momento exacto de analizar el módulo — la clase de fallo que sale en una
 * máquina y no en otra. Lo explica `montarMundo.js`.
 */

/**
 * El encuadre inicial. Va con las figuras porque **es parte del aspecto**: desde
 * dónde se mira una torre decide tanto como de qué color son sus plantas. Y de
 * paso la página se queda sin mover objetos 3D, que es lo que cuenta
 * `paginas.mjs` — su techo sólo baja.
 */
export function encuadrarTorre(gfx, plantas, altoPlanta = 4) {
    /**
     * ⚠️ EL ENCUADRE SE HIZO CON EL EDIFICIO DELANTE, NO ANTES.
     *
     * Estaba a (95, ·, 95) —unas 134 unidades del centro— de cuando la torre eran
     * dieciocho losas y bastaba con verlas todas. Con el edificio de verdad
     * detrás, a esa distancia no se distinguía una planta encendida de una
     * apagada, que es LA información del juego.
     *
     * Ahora sale de la altura real de la torre: se mira desde poco más de su
     * altura, apuntando a media altura.
     */
    const alto = plantas * altoPlanta;
    gfx.camera.position.set(alto * 1.15, alto * 0.78, alto * 1.15);
    gfx.controls.target.set(0, alto * 0.5, 0);
    gfx.controls.update();
}

import { figuraGLB } from '/js/figuras_glb.mjs';
import { AquariumEnvironmentFactory } from '@alisa-engine/src/world/factories/AquariumEnvironmentFactory.js';

/**
 * ⚠️ HAY DOS EDIFICIOS EN ESTA CASA Y NO SON INTERCAMBIABLES.
 *
 *   · `ProceduralBuildingFactory` — se recorre A PIE. Rellanos, puertas con sus
 *     colores, escaleras, ascensor, interruptores. Lo que buscas está DETRÁS DE
 *     UNA PUERTA. Es ¡Busca! 3 y `croupier_corp_building_3d.html`.
 *
 *   · `AquariumEnvironmentFactory._buildSkyscraper` — se mira DESDE FUERA. N
 *     plantas con textura de ventanas y, en cada una, una caja aditiva
 *     (`floors[i].glow`) hecha para encenderla entera. Lo que buscas está EN UNA
 *     PLANTA, y la miras iluminándola. Es el edificio del Chopper Aquarium.
 *
 * ¡Busca! 7 es lo segundo: un dron da vueltas y escanea plantas enteras. Empecé
 * enchufando el primero —el de las puertas— y estuve peleándome con su luz: está
 * calibrado para verse desde un pasillo, y desde el aire salía un andamio negro.
 * No era que estuviera mal iluminado: era el edificio equivocado.
 *
 * ⚠️ Y LA TORRE ES UNA FIGURA DEL PINTOR, NO UN DECORADO APARTE.
 *
 * El núcleo publica una pieza `torre` con su alcance y sus plantas, así que la
 * torre entra por la misma puerta que el dron y las pilas: el pintor pide su
 * figura y la coloca donde dice el sustrato. La página no monta ningún escenario.
 */

/**
 * La fábrica del edificio, guardada para poder encender sus plantas.
 *
 * Es estado de MÓDULO, y eso tiene un límite que conviene decir: una sola torre
 * por página. Hoy es así —una etapa, un edificio— y si algún día hay dos, esto
 * pasa a colgar del grupo de cada figura.
 */
let _torre = null;

/**
 * Enciende cada planta según lo que diga el sustrato de ella. Se llama una vez
 * por fotograma desde el bucle del juego.
 *
 * No decide nada: lee las piezas `sin_mirar`, `mirada` y `objetivo`. La regla de
 * qué planta está mirada sigue siendo del núcleo, que es quien juega también en
 * el banco.
 */
export function iluminarTorre(sus) {
    if (!_torre) return;
    for (const p of sus?.piezas ?? []) {
        const color = _torre.colores[p.t];
        if (!color) continue;
        /**
         * ⚠️ EL NÚMERO DE PLANTA SALE DEL `cajon`, NO DE `y`.
         *
         * `y` es el segundo eje del SUELO —vale 0 en las dieciocho plantas—, y
         * usarlo aquí encendía dieciocho veces la misma, la planta baja. El
         * `cajon` es la identidad de la pieza entre fotogramas (`planta_7`) y es
         * lo único que dice de qué planta habla.
         */
        const n = Number(String(p.cajon ?? '').split('_')[1]);
        const planta = Number.isFinite(n) ? _torre.fab.floors?.[n] : null;
        const brillo = planta?.glow?.material;
        if (!brillo) continue;
        /**
         * La caja aditiva de la fábrica nace `visible: false`, que es su estado de
         * «esta planta no se ha mirado». Sólo se enciende lo mirado: si se
         * encendieran las dieciocho, la pregunta del juego —¿cuál falta?— dejaría
         * de verse.
         */
        if (p.t === 'sin_mirar') { brillo.visible = false; continue; }
        brillo.visible = true;
        brillo.color.copy(color);
        brillo.opacity = p.t === 'objetivo' ? 0.85 : 0.42;
    }
}

export function figurasDeTorre(THREE, sustrato = null, voz = {}) {
    const V = { jugador: 'dron', volumen: 'torre', punto: 'pila',
                modelo: 'Robot Enemy Flying.glb', color: 0x7fd1ff, ...voz };
    const pTorre = (sustrato?.piezas ?? []).find((p) => p.t === V.volumen);
    const radio = pTorre?.alcance ?? 28;
    // Justo un poco más ancho que la fachada (`FL_W = radio * 1.2`), para que el
    // anillo de estado asome como un canto y no como una repisa.
    const anchoAnillo = radio * 1.2 + 1.6;

    /**
     * Las losas llevan emisión propia y no es capricho: con `ambiente:'night'`
     * y sin suelo, una torre pintada sólo con materiales reflectantes sale casi
     * negra y no se distingue una planta mirada de una sin mirar — que es LA
     * información del juego. Un poco de emisión hace que cada losa se lea sola,
     * sin subir la exposición, que reventaría las pilas y el dron.
     */
    /**
     * ⚠️ ERAN LOSAS DE 16×2,6×16 Y AHORA SON BANDAS. LA RAZÓN ES EL EDIFICIO.
     *
     * Mientras no había torre, la losa ERA la planta y tenía que verse maciza.
     * Con el rascacielos detrás, una losa maciza dentro de él sólo tapa las
     * plantas —y son ellas las que se encienden—. Lo que hace falta
     * es lo contrario: un ANILLO fino que rodea la planta y dice en qué estado
     * está, sin comerse lo que hay dentro.
     */
    const losa = (color, opacidad, brillo) => () => new THREE.Mesh(
        new THREE.BoxGeometry(anchoAnillo, 0.22, anchoAnillo),
        new THREE.MeshStandardMaterial({
            color, transparent: true, opacity: opacidad,
            emissive: color, emissiveIntensity: brillo,
            roughness: 0.7, metalness: 0.1,
        }));

    return {
        /**
         * ⚠️ EL EDIFICIO ENTERO ES UNA FIGURA, COMO EL DRON O UNA PILA.
         *
         * La fábrica escribe con `this.scene.add(...)`, así que se le pasa un
         * GRUPO en vez de la escena: todo lo que construya —plantas, suelo, sus
         * luces— cae dentro de la figura, y el pintor la coloca donde dice el
         * sustrato. Sin trucos y sin que la página monte nada.
         *
         * Se piden sólo el rascacielos, el suelo y la luz. Nada de pecera de
         * cristal, helicóptero, plancton, feromonas ni corales: aquí el que vuela
         * es el dron del núcleo y el agua no pinta nada. Esos interruptores se los
         * acabo de abrir a la fábrica —antes venía todo pegado— y son `!== false`,
         * así que el acuario completo sigue saliendo igual para quien lo pedía
         * entero.
         */
        [V.volumen]: {
            malla: (tipo, pieza) => {
                const g = new THREE.Group();
                const fab = new AquariumEnvironmentFactory(g, null);
                fab.buildAll({
                    totalFloors: pieza?.plantas ?? 18,
                    FL_H: pieza?.altoPlanta ?? 4,
                    // El dron vuela a partir de `alcance + 6`, así que la fachada
                    // tiene que quedar por dentro de eso.
                    FL_W: (pieza?.alcance ?? 28) * 1.2,
                    FL_D: (pieza?.alcance ?? 28) * 1.2,
                    tank: false, chopper: false, dust: false,
                    pheromones: false, corals: false, camera: false,
                });
                _torre = {
                    fab,
                    colores: {
                        sin_mirar: new THREE.Color(0x2b3a5c),
                        mirada: new THREE.Color(0x2ecc71),
                        objetivo: new THREE.Color(0xffcc33),
                    },
                };
                return g;
            },
        },

        /**
         * ⚠️ EL ANILLO ES LA SEÑAL QUE SE LEE DESDE FUERA, Y POR ESO MANDA.
         *
         * Las luces de la fábrica están DENTRO del edificio y desde el aire casi
         * no se ven: medido a treinta unidades, la torre entera daba un brillo
         * medio de 26 sobre 255. El anillo, en cambio, se ve siempre.
         *
         * Así que el reparto es: el edificio pone el sitio, el anillo pone la
         * respuesta. Sin mirar se hunde en penumbra —eso es la pregunta—, mirada
         * se enciende en verde, y la buena da la nota alta.
         */
        sin_mirar: { malla: losa(0x3a4568, 0.35, 0.18) },
        mirada: { malla: losa(0x2ecc71, 0.62, 1.5) },
        objetivo: { malla: losa(0xffcc33, 0.95, 3.0) },

        [V.punto]: {
            malla: () => {
                const g = new THREE.Group();
                g.add(new THREE.Mesh(
                    new THREE.CylinderGeometry(0.5, 0.5, 1.6, 10),
                    new THREE.MeshStandardMaterial({
                        color: 0x34c759, emissive: 0x34c759,
                        emissiveIntensity: 0.9, roughness: 0.3,
                    })));
                g.add(new THREE.PointLight(0x34c759, 3, 14, 2));
                return g;
            },
        },

        /**
         * ⚠️ EL DRON ES UN MODELO DE VERDAD, Y LA LUZ SE QUEDA.
         *
         * `Robot Enemy Flying.glb` estaba en `props/models/` sin que lo nombrara
         * nadie — como los peces del submarino. La esfera sigue de respaldo: si el
         * GLB no carga se juega igual, que un adorno no puede tumbar una etapa.
         *
         * La `PointLight` NO es decoración: con `ambiente:'night'` es lo que
         * ilumina la planta que el dron tiene delante, y por eso va fuera del
         * modelo — así sigue alumbrando aunque el GLB falle.
         */
        [V.jugador]: {
            malla: (tipo, pieza) => {
                const g = new THREE.Group();
                const cuerpo = figuraGLB(THREE, V.modelo, {
                    // 4,5 sobre losas de 16: medido en pantalla, con 3,2 el dron
                    // se leía como un punto y no como el bicho que pilotas.
                    alto: 4.5, emisivo: V.color, brillo: 0.7, apoyar: false,
                    respaldo: () => new THREE.Mesh(
                        new THREE.SphereGeometry(1.1, 16, 12),
                        new THREE.MeshStandardMaterial({
                            color: V.color, emissive: 0x2b6ea8,
                            emissiveIntensity: 0.8, metalness: 0.6,
                        })),
                })(tipo, pieza);
                g.add(cuerpo);
                g.add(new THREE.PointLight(V.color, 6, 40, 2));
                return g;
            },
        },
    };
}
