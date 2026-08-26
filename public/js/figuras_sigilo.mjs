/**
 * figuras_sigilo.mjs — EL ASPECTO DEL EDIFICIO A OSCURAS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *     const pintor = new PintorMundo(escena, figurasDeSigilo(THREE), 1);
 *
 * Un `estilo` para `PintorMundo`: qué forma tiene cada tipo de pieza que publica
 * `CorpStealthCore`. El pintor sigue llevando la posición, la identidad entre
 * fotogramas y el «esto ya no está»; esto sólo dice cómo se ve.
 *
 * ⚠️ POR QUÉ EL DIBUJO NO ESTÁ EN LA PÁGINA, QUE ES DE DONDE SALDRÍA SOLO.
 *
 * `paginas.mjs` cuenta las «señales» de una página que se fabrica sus mallas y
 * mueve objetos 3D, y su techo SÓLO BAJA. Con el estilo dentro, una etapa nueva
 * mete diez señales de golpe y hay que elegir entre subir la vara o sacar el
 * dibujo. Ya se eligió dos veces —la torre y el submarino— y las dos veces la
 * respuesta fue sacarlo. Aquí se nace con la lección puesta.
 *
 * ⚠️ Y RECIBE `THREE` EN VEZ DE IMPORTARLO, por lo mismo que `figuras_torre`:
 * este módulo lo cargan páginas que resuelven `three` por el importmap común, y
 * importarlo arriba lo ataría al momento exacto de analizar el módulo.
 *
 * ⚠️ ESTE EDIFICIO SE MIRA DE PERFIL, Y ESO DECIDE TODO LO DEMÁS.
 *
 * El sustrato pone `y: 0` en todo y la planta en `alto`: nueve pisos apilados en
 * un solo plano. Así que aquí no hay fachada ni volumen — hay un corte, como en
 * un juego de plataformas, y lo que tiene que leerse de un vistazo es DÓNDE HAY
 * LUZ. Todo lo demás es decorado.
 */

/**
 * El encuadre. Va con las figuras porque **es parte del aspecto**: un edificio
 * de perfil se mira de frente y desde lejos, y mirarlo en diagonal —que es lo
 * que hace la cámara por defecto— lo convierte en un montón de cajas.
 */
export function encuadrarSigilo(gfx, plantas = 9, altoPlanta = 5, largo = 28) {
    const alto = plantas * altoPlanta;
    gfx.camera.position.set(0, alto * 0.5, Math.max(largo, alto) * 1.35);
    gfx.controls.target.set(0, alto * 0.5, 0);
    gfx.controls.update();
}

/**
 * La carcasa del edificio: suelos, paredes y el hueco del ascensor. No es una
 * pieza del sustrato —el núcleo no la publica, porque no es estado de juego—
 * así que la monta la figura `escalera`, que sí sale y trae las medidas dentro.
 *
 * Se cuelga de ESA figura y no de la escena por el mismo motivo que la torre:
 * así el pintor la coloca, la reemplaza y la quita, y la página no monta nada.
 */
function carcasa(THREE, pieza) {
    const g = new THREE.Group();
    const plantas = pieza?.plantas ?? 9;
    const altoPlanta = pieza?.altoPlanta ?? 5;
    const largo = pieza?.largo ?? 28;
    /** La figura la coloca el pintor en `escaleraX`, así que se compensa. */
    g.position.x = 0;
    const centro = -(pieza?.x ?? 0);

    const matSuelo = new THREE.MeshStandardMaterial({
        color: 0x2a2a35, roughness: 0.95, metalness: 0.05,
    });
    const matPared = new THREE.MeshStandardMaterial({
        color: 0x1b1b24, roughness: 1.0, metalness: 0.0,
    });

    for (let f = 0; f < plantas; f++) {
        const losa = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.35, 4), matSuelo);
        losa.position.set(centro, f * altoPlanta - 0.6, 0);
        g.add(losa);
    }
    // El techo del último piso, para que el edificio no quede abierto por arriba.
    const techo = new THREE.Mesh(new THREE.BoxGeometry(largo, 0.35, 4), matSuelo);
    techo.position.set(centro, (plantas - 1) * altoPlanta + altoPlanta - 0.6, 0);
    g.add(techo);

    for (const lado of [-1, 1]) {
        const pared = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, plantas * altoPlanta + 0.6, 4), matPared);
        pared.position.set(centro + lado * largo / 2, (plantas * altoPlanta) / 2 - 0.6, 0);
        g.add(pared);
    }

    // La escalera propiamente dicha: una columna clara en su sitio (x = 0 local).
    const col = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, plantas * altoPlanta, 1.6),
        new THREE.MeshStandardMaterial({
            color: 0x4a5a44, roughness: 0.85, emissive: 0x0d1a0d, emissiveIntensity: 0.6,
        }));
    col.position.set(0, (plantas * altoPlanta) / 2 - 0.6, 0);
    g.add(col);

    return g;
}

/**
 * Actualiza lo que no es forma sino ESTADO VISIBLE: cuánto alumbra cada
 * bombilla, si la linterna está dada y hacia dónde apunta.
 *
 * Se llama una vez por fotograma desde la página. No decide nada: lee las
 * piezas del sustrato, igual que `iluminarTorre`. La regla de qué está
 * encendido sigue siendo del núcleo, que es quien juega también en el banco.
 */
export function alumbrarSigilo(pintor, sus) {
    for (const p of sus?.piezas ?? []) {
        const m = pintor?.malla?.(p.cajon);
        if (!m) continue;

        if (p.t === 'bombilla') {
            const charco = m.getObjectByName('charco');
            const luz = m.getObjectByName('luz');
            const encendida = !!p.encendida;
            /**
             * ⚠️ EL CHARCO SE APLASTA, Y NO ES CAPRICHO.
             *
             * Una esfera del radio real sale como un sol: la del ascensor, con
             * alcance 3, se comía la planta baja entera y no se distinguía la
             * cabina. Pero encogerla sería MENTIR — el radio es la regla del
             * juego, es hasta dónde estás a salvo.
             *
             * Así que se conserva el ancho, que es el que decide si llegas, y se
             * baja el alto, que en un edificio de perfil no decide nada: entre
             * dos plantas hay cinco de separación y ninguna bombilla llega.
             */
            if (charco) {
                charco.visible = encendida;
                const r = Math.max(0.001, p.alcance || 0.001);
                charco.scale.set(r, r * 0.42, r);
            }
            if (luz) luz.intensity = encendida ? 14 : 0;
            const bombilla = m.getObjectByName('bombilla');
            if (bombilla) bombilla.material.emissiveIntensity = encendida ? 2.4 : 0.05;
        }

        if (p.t === 'linterna') {
            const cono = m.getObjectByName('cono');
            const luz = m.getObjectByName('luz');
            if (cono) {
                cono.visible = !!p.encendida;
                const alcance = p.alcance || 0.001;
                cono.scale.set(1, alcance, 1);
                cono.position.x = alcance / 2;
            }
            if (luz) luz.intensity = p.encendida ? 20 : 0;
            /**
             * El cono apunta a donde mira quien lo lleva. `mirando` no viene en
             * la pieza de la linterna sino en la del jugador, así que se busca —
             * las dos van en el mismo sustrato y en el mismo fotograma.
             */
            const yo = (sus.piezas ?? []).find((q) => q.t === 'tu');
            m.rotation.y = (yo?.mirando ?? 1) < 0 ? Math.PI : 0;
        }

        if (p.t === 'tu') m.rotation.y = (p.mirando ?? 1) < 0 ? Math.PI : 0;
    }
}

export function figurasDeSigilo(THREE) {
    /**
     * Un mueble. Los tres estados —sin registrar, registrado y con el mapache
     * dentro— son la MISMA caja con distinto color a propósito: si cambiaran de
     * forma, la partida se leería por la silueta y no por la luz, que es de lo
     * que va el juego.
     */
    const mueble = (color, emision) => () => {
        const g = new THREE.Group();
        const caja = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 1.6, 1.1),
            new THREE.MeshStandardMaterial({
                color, roughness: 0.8, metalness: 0.05,
                emissive: color, emissiveIntensity: emision,
            }));
        caja.position.y = 0.8;
        g.add(caja);
        return g;
    };

    return {
        mueble: { malla: mueble(0x6b4a2f, 0.05) },
        mirado: { malla: mueble(0x33383f, 0.02) },
        mapache: { malla: mueble(0x34c759, 1.2) },

        pila: {
            malla: () => {
                const g = new THREE.Group();
                const c = new THREE.Mesh(
                    new THREE.CylinderGeometry(0.22, 0.22, 0.6, 10),
                    new THREE.MeshStandardMaterial({
                        color: 0x9be07a, emissive: 0x4a8f2f, emissiveIntensity: 1.6,
                        roughness: 0.5,
                    }));
                c.position.y = 0.4;
                g.add(c);
                return g;
            },
        },

        /**
         * La bombilla de rellano: el foco, su charco de luz y una luz de verdad.
         * El charco se escala con `alcance` —que el núcleo pone a cero cuando
         * está apagada— así que quien mira ve EXACTAMENTE hasta dónde protege.
         * Es la información que decide la partida, y por eso se dibuja y no se
         * insinúa.
         */
        bombilla: {
            malla: () => {
                const g = new THREE.Group();
                const foco = new THREE.Mesh(
                    new THREE.SphereGeometry(0.28, 12, 10),
                    new THREE.MeshStandardMaterial({
                        color: 0xfff2c4, emissive: 0xffd166, emissiveIntensity: 0.05,
                        roughness: 0.3,
                    }));
                foco.name = 'bombilla';
                foco.position.y = 3.4;
                g.add(foco);

                const charco = new THREE.Mesh(
                    new THREE.SphereGeometry(1, 16, 12),
                    new THREE.MeshBasicMaterial({
                        color: 0xffd166, transparent: true, opacity: 0.10,
                        depthWrite: false,
                    }));
                charco.name = 'charco';
                charco.position.y = 1.6;
                charco.visible = false;
                g.add(charco);

                const luz = new THREE.PointLight(0xffd9a0, 0, 14, 2);
                luz.name = 'luz';
                luz.position.y = 3.2;
                g.add(luz);
                return g;
            },
        },

        /**
         * La linterna: un cono que se estira con su alcance y una luz que va con
         * él. Nace tumbado sobre +X porque este edificio se recorre en X, y
         * `alumbrarSigilo` lo gira según hacia dónde mires.
         */
        linterna: {
            malla: () => {
                const g = new THREE.Group();
                const cono = new THREE.Mesh(
                    new THREE.ConeGeometry(0.55, 1, 16, 1, true),
                    new THREE.MeshBasicMaterial({
                        color: 0xfff0c0, transparent: true, opacity: 0.13,
                        depthWrite: false, side: THREE.DoubleSide,
                    }));
                cono.name = 'cono';
                cono.rotation.z = -Math.PI / 2;   // la punta al origen, mirando a +X
                cono.position.y = 1.2;
                cono.visible = false;
                g.add(cono);

                const luz = new THREE.PointLight(0xfff0c0, 0, 10, 2);
                luz.name = 'luz';
                luz.position.set(1.2, 1.2, 0);
                g.add(luz);
                return g;
            },
        },

        tu: {
            malla: () => {
                const g = new THREE.Group();
                const cuerpo = new THREE.Mesh(
                    new THREE.CapsuleGeometry(0.35, 1.0, 4, 10),
                    new THREE.MeshStandardMaterial({
                        color: 0xdfe6ee, roughness: 0.6,
                        emissive: 0x223040, emissiveIntensity: 0.8,
                    }));
                cuerpo.position.y = 1.0;
                g.add(cuerpo);
                /** Una nariz, para que se vea hacia dónde miras sin leer el HUD. */
                const morro = new THREE.Mesh(
                    new THREE.BoxGeometry(0.5, 0.18, 0.18),
                    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x8a6a20 }));
                morro.position.set(0.4, 1.35, 0);
                g.add(morro);
                return g;
            },
        },

        escalera: { malla: (_t, pieza) => carcasa(THREE, pieza) },

        ascensor: {
            malla: () => {
                const g = new THREE.Group();
                const cabina = new THREE.Mesh(
                    new THREE.BoxGeometry(2.2, 3.6, 2.2),
                    new THREE.MeshStandardMaterial({
                        color: 0x8fa2b8, roughness: 0.4, metalness: 0.5,
                        transparent: true, opacity: 0.55,
                    }));
                cabina.position.y = 1.2;
                g.add(cabina);
                return g;
            },
        },
    };
}
