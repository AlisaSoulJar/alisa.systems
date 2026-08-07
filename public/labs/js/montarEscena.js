/**
 * montarEscena.js — UNA PÁGINA DE PIEZA ES SU CONFIGURACIÓN, NADA MÁS
 * ═══════════════════════════════════════════════════════════════════════════
 *     montarEscena({
 *       pieza: 'world/factories/DojoEnvironmentFactory.js',
 *       luz: 'estudio', bloom: true,
 *     });
 *
 * Es el mismo patrón que `arcade/js/montarMesa.js` hizo con los tableros: la
 * página deja de ser código y pasa a ser una ficha.
 *
 * ⚠️ POR QUÉ NO BASTABA CON `pieza.html?m=…`
 * Aquel lanzador genérico responde muy bien a **«¿esta pieza construye algo?»** y
 * fatal a **«¿qué aspecto tiene?»**. Medido: `DojoEnvironmentFactory` construye
 * 135 mallas sobre 369×327 y en un `AlisaRenderCore` pelado se lee como una
 * mancha — porque estas piezas están hechas contando con la iluminación y el
 * post-proceso de SU página. A 0,4 de su diagonal se pintaban 4.469 píxeles; a
 * 0,8, cero.
 *
 * O sea que el problema de esas piezas nunca fue ser feas: era **no tener
 * página**. Esto se la da.
 *
 * ⚠️ Y LO QUE DEMUESTRA, QUE ES EL ASUNTO
 * Cada página queda en cinco líneas: una pieza del motor, una luz, un poco de
 * post-proceso. Quien mire el fuente ve que **el motor se compone**, que es
 * exactamente lo que hay que enseñar — se puede armar un juego, un gimnasio
 * headless o un banco de pruebas con las mismas piezas.
 */
import * as THREE from 'three';
import { AlisaRenderCore } from '@alisa-engine/src/soma/AlisaRenderCore.js';

/**
 * Ambientes. No son gustos: son las tres situaciones que aparecen de verdad en
 * la biblioteca —interiores de neón, exteriores diurnos y estudios neutros— y
 * cada pieza dice cuál es la suya.
 */
const LUCES = {
    estudio: (escena) => {
        escena.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.0));
        const sol = new THREE.DirectionalLight(0xffffff, 1.5);
        sol.position.set(4, 8, 5);
        escena.add(sol);
    },
    dia: (escena) => {
        escena.add(new THREE.HemisphereLight(0xbfd4ff, 0x6b5a3e, 1.3));
        const sol = new THREE.DirectionalLight(0xfff3e0, 2.2);
        sol.position.set(6, 12, 4);
        escena.add(sol);
    },
    // Para las piezas de neón: luz ambiente baja para que el emisivo mande, pero
    // NO cero — si no, todo lo que no brilla desaparece y parece que falta.
    neon: (escena) => {
        escena.add(new THREE.HemisphereLight(0x223355, 0x110022, 0.45));
        const relleno = new THREE.DirectionalLight(0x88aaff, 0.5);
        relleno.position.set(-3, 6, 4);
        escena.add(relleno);
    },
};

/**
 * Coloca la cámara a partir de lo que se haya construido.
 *
 * ⚠️ La distancia es 0,45 de la diagonal, y ese número sale de MEDIR, no de
 * encajar la caja con trigonometría. La fórmula "correcta" ponía la cámara al
 * doble y la escena se fundía con el fondo: estas escenas son grandes y
 * dispersas, y a la distancia que las encaja enteras cada pieza ocupa menos de
 * un píxel. Se recorta algo a cambio de ver algo.
 */
function encuadrar(app, extra = 1) {
    const caja = new THREE.Box3();
    let hay = false;
    app.scene.traverse(o => { if (o.isMesh) { hay = true; caja.expandByObject(o); } });
    if (!hay || caja.isEmpty()) return null;

    const centro = caja.getCenter(new THREE.Vector3());
    const tam = caja.getSize(new THREE.Vector3());
    const dist = (tam.length() * 0.45 || 1) * extra;

    app.camera.position.set(centro.x + dist * 0.55, centro.y + dist * 0.45, centro.z + dist * 0.6);
    app.camera.near = Math.max(0.05, dist / 400);
    app.camera.far = dist * 20;
    app.camera.updateProjectionMatrix();
    app.camera.lookAt(centro);
    if (app.controls) { app.controls.target.copy(centro); app.controls.update(); }
    return { centro, tam };
}

/**
 * @param {object} cfg
 *   pieza     ruta bajo `alisa-engine/src/` — LA ÚNICA obligatoria
 *   arranque  métodos a llamar; por defecto se prueban los habituales
 *   luz       'estudio' | 'dia' | 'neon'
 *   bloom     añade `AlisaBloomEngine`
 *   distancia multiplicador del encuadre (1 = el medido)
 *   datos     función que devuelve el segundo argumento del constructor
 */
export async function montarEscena(cfg) {
    const { pieza, luz = 'estudio', bloom = false, distancia = 1, datos = null } = cfg;

    const app = new AlisaRenderCore();
    app.setupDefaultEnvironment?.();
    (LUCES[luz] ?? LUCES.estudio)(app.scene);

    const mod = await import(`@alisa-engine/src/${pieza}`);
    const pares = Object.entries(mod);
    const Clase = pares.map(([, v]) => v)
        .find(v => typeof v === 'function' && /^[A-Z]/.test(v.name ?? ''));
    const objeto = !Clase && pares.map(([, v]) => v)
        .find(v => v && typeof v === 'object' && Object.keys(v).some(k => typeof v[k] === 'function'));

    let inst = objeto;
    if (Clase) {
        const segundo = datos ? datos(Clase, THREE) : {};
        inst = Clase.length >= 2 ? new Clase(app.scene, segundo)
             : Clase.length === 1 ? new Clase(app.scene) : new Clase();
    }

    const arranque = cfg.arranque ?? ['buildAll', 'build', 'init', 'start'];
    for (const m of arranque) {
        if (typeof inst?.[m] !== 'function') continue;
        try { await inst[m](app.scene); } catch (e) { console.warn(`[escena] ${m}():`, e.message); }
    }

    const marco = encuadrar(app, distancia);

    let post = null;
    if (bloom) {
        try {
            const { AlisaBloomEngine } = await import('@alisa-engine/src/soma/plugins/AlisaBloomEngine.js');
            post = new AlisaBloomEngine(app);
        } catch (e) { console.warn('[escena] sin bloom:', e.message); }
    }

    /**
     * ⚠️ SE PINTA DIRECTO Y LUEGO EL POST, EN ESE ORDEN.
     * El compositor puede acabar en negro para escenas que no esperaba; si fuera
     * lo único, la página mentiría diciendo que no hay nada.
     */
    const pintar = () => {
        app.renderer.render(app.scene, app.camera);
        if (post?.render) { try { post.render(0.016); } catch { /* el directo ya está */ } }
    };
    // Un cuadro a mano: `requestAnimationFrame` no dispara si la pestaña no está
    // visible, y entonces la página se queda negra sin que nada falle.
    pintar();
    app.startLoop(() => { if (typeof inst?.update === 'function') { try { inst.update(0.016); } catch {} } },
                  () => pintar());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') pintar();
    });

    let mallas = 0;
    app.scene.traverse(o => { if (o.isMesh) mallas++; });
    window.__escena = { app, inst, Clase, marco, THREE, post };
    return { app, inst, mallas, marco };
}
