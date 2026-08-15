/**
 * encuadre.js — que el tablero QUEPA, se mire desde donde se mire.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ ESTO YA ESTABA RESUELTO, PERO SÓLO PARA QUINCE JUEGOS.
 *
 * `mesa_tablero.mjs` aprendió a apartar la cámara hasta que el tablero cabe en
 * vez de ponerla a una distancia fija. Funcionó, y no lo tocaba nada más:
 * los visualizadores propios —fagocito, mancala, go, xiangqi y compañía— siguen
 * con su `camera.position.set(0, 20, 15)` escrito a mano un día concreto, en una
 * ventana concreta.
 *
 * Aviso de betatester, escritorio de 1366x633:
 *
 *     «no se ve el tablero completo en fagocito»
 *
 * Y es exacto. En 1280x720 el laberinto de 28x28 cabe entero; con 633 px de alto
 * no. La cámara no estaba mal calculada: es que no estaba calculada, y el número
 * escrito a mano acierta en la ventana en la que se escribió y en ninguna otra.
 *
 * Así que el encuadre se saca de la mesa genérica y se pone donde lo pueda usar
 * cualquiera. Script clásico y global, como `gestos.js`, porque quien más lo
 * necesita son los visualizadores, que son clásicos y no pueden importar.
 *
 * ⚠️ NO SE CALCULA LA DISTANCIA: SE COMPRUEBA.
 *
 * Una ventana apaisada y otra estrecha no admiten la misma, y un sokoban de 5x3
 * no encuadra como un go de 19x19 aunque los dos se normalicen. Se proyectan las
 * ocho esquinas de la caja a la pantalla y, si alguna se sale, se aparta la
 * cámara y se vuelve a mirar. Es mirar el resultado en vez de fiarse de la
 * cuenta, que es lo único que ha funcionado en este proyecto.
 */
(function () {
    'use strict';

    /**
     * ⚠️ Se mide con las matrices de instancia A MANO, porque `Box3.setFromObject`
     * NO las mira en el three que servimos: devuelve la caja de la geometría base.
     * Eso escaló un ajedrez ocho veces de más. Copiado tal cual de la mesa, que es
     * donde se aprendió.
     */
    function cajaReal(raiz, saltar = null) {
        const c = new THREE.Box3(), m = new THREE.Matrix4(), b = new THREE.Box3();
        raiz.updateMatrixWorld(true);
        raiz.traverse((o) => {
            if (!o.isMesh || !o.geometry) return;
            if (saltar && saltar.has(o.name)) return;
            if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
            if (o.isInstancedMesh && o.instanceMatrix) {
                for (let i = 0; i < o.count; i++) {
                    o.getMatrixAt(i, m);
                    m.premultiply(o.matrixWorld);
                    c.union(b.copy(o.geometry.boundingBox).applyMatrix4(m));
                }
            } else {
                c.union(b.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld));
            }
        });
        return c;
    }

    /**
     * Aparta la cámara hasta que las ocho esquinas de `objeto` caben en pantalla.
     *
     *   camara       la cámara a mover
     *   objeto       lo que tiene que caber (un Group vale)
     *   controles    OrbitControls, opcional: se le pone el `target` y el tope
     *   inclinacion  radianes sobre el horizonte; por defecto una vista de mesa
     *   distancia    de dónde partir; si no, del tamaño de lo que hay que encajar
     *
     * Devuelve la distancia a la que se quedó, o `null` si no había nada que medir.
     *
     * ⚠️ `null` NO ES UN FALLO SILENCIOSO: un grupo sin tamaño no es pequeño, es
     * que todavía no está. Escalarlo daría una escala de 2550 y una mesa vacía con
     * las jugadas perfectamente listadas al lado — pasó con cripta, y no llamó la
     * atención porque una mesa vacía se ve igual que una mesa vacía.
     */
    function encajarCamara(cfg) {
        const {
            camara, objeto, controles = null,
            inclinacion = 0.95, margen = 0.92,
            intentos = 12, paso = 1.12, distancia = null,
            // Montones que no cuentan para encajar. Lo usa la niebla: en cripta,
            // apartarse hasta que quepa lo que NO sabes deja la partida en una
            // esquina de tres centímetros.
            saltar = null,
            // Cuánto de la parte de ARRIBA de la pantalla se come el panel, en
            // unidades de pantalla (0,25 = un cuarto). Por defecto 0: quien no lo
            // pase encuadra exactamente como siempre.
            arribaLibre = 0,
            // Lo mismo por el lado: en escritorio el panel es una columna a la
            // izquierda y se come un trozo del tablero. Por defecto 0, así que quien
            // no lo pase encuadra exactamente como siempre.
            izquierdaLibre = 0,
        } = cfg || {};
        if (!camara || !objeto) return null;

        const caja = cajaReal(objeto, saltar);
        const t = caja.getSize(new THREE.Vector3());
        const mayor = Math.max(t.x, t.y, t.z);
        if (!(mayor > 0.001)) return null;

        const c = caja.getCenter(new THREE.Vector3());
        if (controles) controles.target.copy(c);

        const esquinas = [];
        for (const x of [caja.min.x, caja.max.x])
            for (const y of [caja.min.y, caja.max.y])
                for (const z of [caja.min.z, caja.max.z]) esquinas.push(new THREE.Vector3(x, y, z));

        /**
         * ⚠️ EL SITIO LIBRE NO ES TODA LA PANTALLA: EL PANEL OCUPA UN TROZO.
         *
         * Medido el 15-08-2026 en los treinta y cinco, proyectando cada pieza y
         * mirando si su punto cae dentro del rectángulo del HUD: de treinta medidas
         * sólo UNA sale mal —xiangqi en móvil, once de treinta y dos piezas debajo
         * del panel—. Su tablero es 9x10, más alto que ancho, así que al encajarlo
         * por altura se sube hasta la franja del panel.
         *
         * Iba a mover el objetivo de cámara en las quince mesas por una corazonada.
         * El número dijo que no hacía falta, y esa media hora de medir vale más que
         * el arreglo: `arribaLibre` es 0 en veintinueve de los treinta casos, o sea
         * que esto no le toca un píxel a quien no lo necesita.
         *
         * `arribaLibre` va en unidades de pantalla (0 = nada tapado, 1 = todo). Se usa
         * dos veces y las dos hacen falta:
         *
         *   · para ENCOGER — el tablero tiene que caber en la altura que queda, no en
         *     la pantalla entera;
         *   · para BAJAR — y así centrarse en el hueco libre en vez de en la pantalla.
         *
         * Sólo lo primero deja el tablero pequeño y centrado, o sea con un hueco
         * muerto abajo y pegado al panel. Sólo lo segundo lo baja pero se sale por
         * abajo. Lo probé en ese orden y las dos veces se veía en la captura.
         */
        const libre = Math.max(0, Math.min(0.6, arribaLibre));
        const margenY = margen * (1 - libre);

        /**
         * ⚠️ Y LO MISMO EN HORIZONTAL, QUE ES LO QUE LE FALTABA A ESTO PARA SNAKE.
         * ═══════════════════════════════════════════════════════════════════════
         *
         * `margenY` ya encoge el hueco vertical para que el bucle de abajo ALEJE
         * la cámara cuando hace falta más aire arriba. `margenX` no existía: el
         * eje x se comprobaba siempre contra `margen` a secas, así que el bucle
         * nunca veía motivo para alejarse por `izquierdaLibre` — el tablero ya
         * cabía en la pantalla ENTERA, que es justo lo que había medido el
         * visualizador al elegir su distancia. Sin margen reservado, `cabe()` daba
         * `true` a la primera y el desplazamiento de más abajo corría la imagen
         * SIN haberle hecho sitio antes: por eso `apartarDelPanel` tenía que topar
         * el desplazamiento al hueco libre y en snake el hueco es cero, el tablero
         * llena el ancho.
         *
         * Con `margenX` reservando la misma fracción que luego se va a desplazar,
         * el bucle de abajo aleja la cámara HASTA que el tablero cabe en el ancho
         * que queda tras reservar `izquierdaLibre` — y sólo entonces entra en
         * juego el desplazamiento, que ahora sí tiene sitio adonde correr la
         * imagen. Un juego que no pide `izquierdaLibre` (0 por defecto) tiene
         * `margenX === margen`: encuadra exactamente como antes.
         */
        const libreX = Math.max(0, Math.min(0.6, izquierdaLibre));
        const margenX = margen * (1 - libreX);

        const cabe = () => {
            camara.updateMatrixWorld();
            camara.updateProjectionMatrix();
            return esquinas.every((e) => {
                const v = e.clone().project(camara);
                return Math.abs(v.x) < margenX && Math.abs(v.y) < margenY;
            });
        };

        let d = distancia ?? (mayor * 1.15);
        for (let i = 0; i < intentos; i++) {
            camara.position.set(c.x,
                                c.y + d * Math.sin(inclinacion),
                                c.z + d * Math.cos(inclinacion));
            camara.lookAt(c);
            if (cabe()) break;
            d *= paso;
        }

        /**
         * ⚠️ Y ADEMÁS SE BAJA, QUE SI NO SÓLO ENCOGE.
         *
         * Exigir más aire arriba aparta la cámara hasta que el tablero cabe bajo el
         * panel, pero el tablero sigue CENTRADO en la pantalla: queda pequeño y con
         * un hueco muerto abajo. Encoger de más es pagar dos veces por el mismo
         * problema.
         *
         * Subiendo la cámara por su propio eje vertical, la imagen baja. Se baja la
         * mitad de lo que ocupa el panel, que es lo que hace falta para centrar el
         * tablero en el sitio que QUEDA en vez de en la pantalla entera.
         *
         * `d * tanV` es la media altura visible a esa distancia: mover la cámara esa
         * cantidad desplaza la imagen una pantalla entera, así que la cuenta sale
         * directa.
         */
        /**
         * ⚠️ Y EL DESPLAZAMIENTO TIENE QUE IR TAMBIÉN AL `target` DE LOS CONTROLES.
         *
         * La primera versión movía la cámara y su punto de mira, y no pasaba NADA:
         * medido, la pieza más alta se quedaba en 333 px sin el arreglo y en 335 con
         * él. Dos píxeles.
         *
         * `OrbitControls.update()` —que se llama tres líneas más abajo para subir el
         * tope de alejarse— vuelve a apuntar la cámara a SU `target`, que sigue en el
         * centro del tablero. Deshacía el desplazamiento entero justo después de
         * hacerlo. El síntoma era el de siempre: «el arreglo no cambia la medida».
         */
        if (arribaLibre > 0.001) {
            const tanV = Math.tan((camara.fov * Math.PI) / 360);
            const arriba = new THREE.Vector3(0, 1, 0).applyQuaternion(camara.quaternion);
            const salto = arriba.multiplyScalar(arribaLibre * d * tanV);
            const mira = c.clone().add(salto);
            camara.position.add(salto);
            camara.lookAt(mira);
            if (controles) controles.target.copy(mira);
        }

        /**
         * ⚠️ Y LO MISMO POR EL LADO, QUE EN ESCRITORIO ES DONDE ESTÁ EL PANEL.
         * ═══════════════════════════════════════════════════════════════════
         *
         * `arribaLibre` nació de un caso de MÓVIL, donde el panel ocupa el ancho
         * entero y tapa por arriba. En escritorio el panel es una columna a la
         * izquierda, y ahí el que se come el tablero es el lado.
         *
         * El ajedrez perdía la columna «a» entera bajo el panel y al mancala se le
         * comía un granero. Y algo que sí cambió el arreglo: NO se salían de la
         * pantalla —que es lo que yo había dicho mirando las capturas— sino que
         * estaban TAPADOS. Son dos cosas distintas con arreglos opuestos: apartar la
         * cámara habría encogido el tablero sin destaparlo ni un píxel.
         *
         * Misma cuenta que arriba pero en horizontal, con `tanV * aspect` porque el
         * `fov` de three.js es vertical. Y el desplazamiento va también al `target`
         * de los controles, o `update()` lo deshace — eso ya costó una medida falsa
         * de dos píxeles cuando se escribió la versión vertical.
         */
        if (izquierdaLibre > 0.001) {
            const tanV = Math.tan((camara.fov * Math.PI) / 360);
            /**
             * ⚠️ LA CÁMARA VA A LA IZQUIERDA PARA QUE LA IMAGEN SE VAYA A LA DERECHA.
             *
             * El signo estaba al revés y el síntoma era peor que no hacer nada: pedía
             * destapar 183 px y el tablero acababa con 426 tapados. Cuanto más
             * «arreglaba», peor — que es la firma de un signo invertido.
             *
             * Es lo mismo que dice el bloque de arriba en vertical («subiendo la
             * cámara, la imagen baja») y aun así lo escribí mal aquí: leer que la
             * cámara y la imagen van al revés no es lo mismo que acordarse al
             * traducirlo al otro eje.
             */
            const derecha = new THREE.Vector3(1, 0, 0).applyQuaternion(camara.quaternion);
            const salto = derecha.multiplyScalar(-izquierdaLibre * d * tanV * (camara.aspect || 1));
            const mira = (controles?.target ?? c).clone().add(salto);
            camara.position.add(salto);
            camara.lookAt(mira);
            if (controles) controles.target.copy(mira);
        }

        // El tope de alejarse sube con la distancia que ha hecho falta: si no, los
        // controles devolverían la cámara adentro en cuanto alguien la tocara.
        if (controles) {
            controles.maxDistance = Math.max(controles.maxDistance ?? 0, d * 1.6);
            controles.update();
        }
        return d;
    }

    /**
     * ⚠️ Y AL CAMBIAR DE TAMAÑO LA VENTANA, OTRA VEZ.
     *
     * El aviso vino de una ventana baja, pero girar un móvil hace lo mismo y es
     * más común. Quien encaja una vez al arrancar deja de caber en cuanto alguien
     * toca el borde — y eso no lo ve nadie probando en su propia pantalla.
     *
     * Se pone un cortafuegos de 150 ms porque redimensionar dispara el evento
     * decenas de veces y cada encuadre proyecta ocho esquinas doce veces.
     */
    function encajarSiempre(cfg) {
        let t = null;
        const hazlo = () => encajarCamara(cfg);
        hazlo();
        window.addEventListener('resize', () => {
            clearTimeout(t);
            t = setTimeout(hazlo, 150);
        });
        return hazlo;
    }

    /**
     * ⚠️ Y CUANDO EL PANEL CAMBIA DE TAMAÑO, TAMBIÉN. ESTO ES LO QUE FALTABA.
     * ═══════════════════════════════════════════════════════════════════════
     *
     * El panel no mide siempre lo mismo: se pliega con su `▾`, se esconde entero con
     * el botón de los mandos, y arranca desplegado o plegado según el juego y el
     * ancho de la pantalla. Encuadrar UNA VEZ al arrancar es medir una foto de un
     * sitio que cambia.
     *
     * Lo destapó comprobar el despliegue: en local el ajedrez arrancó con el panel
     * plegado y se veía perfecto; en el dominio arranca DESPLEGADO —con sus
     * selectores, su minimapa y sus botones— y volvía a comerse las columnas «a» y
     * «b». Había comprobado la condición fácil sin darme cuenta.
     *
     * Y hace falta para lo contrario, que es lo que pidió Oscar: **esconder el panel
     * para jugar con la mesa entera**. Ese botón existe desde hace días y dejaba el
     * hueco sin usar — el tablero seguía encogido y desplazado como si el panel
     * siguiera ahí. Ganabas sitio y no se notaba.
     *
     * Un `ResizeObserver` sobre `.hud-panel` cubre los tres casos —plegar, esconder,
     * y que arranque de una forma u otra— sin tener que enterarse de cuál fue.
     */
    function reencuadrarConElPanel(hazlo, { ms = 120 } = {}) {
        const panel = document.querySelector('.hud-panel');
        if (!panel || typeof ResizeObserver === 'undefined') return null;
        let t = null, primera = true;
        const obs = new ResizeObserver(() => {
            // El observador dispara una vez nada más engancharse, con el tamaño
            // actual. Esa no cuenta: sería reencuadrar por no haber pasado nada.
            if (primera) { primera = false; return; }
            clearTimeout(t);
            t = setTimeout(hazlo, ms);
        });
        obs.observe(panel);
        return obs;
    }

    window.ALISA_ENCUADRE = { cajaReal, encajarCamara, encajarSiempre, reencuadrarConElPanel };
})();
