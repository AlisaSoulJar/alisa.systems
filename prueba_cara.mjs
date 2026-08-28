/**
 * prueba_cara.mjs — ¿la cara procedural pinta lo que dice pintar?
 * ═══════════════════════════════════════════════════════════════════════════
 *     node prueba_cara.mjs
 *         → 0 bien · 1 la cara falla · 2 la prueba no vale
 *
 * `AvatarCalibrationTool.setFaceAnchor()` y `.setExpression()` los llaman
 * `croupier_avatar_face_lab.html` y `croupier_confessional.html` desde hace
 * tiempo — 0 definiciones, 2 llamadas cada uno — y por eso el face_lab se
 * queda en «booting…» para siempre y el confesionario cae a «face init failed»
 * en silencio. Esto NO abre un navegador: monta three.js de verdad (el mismo
 * vendor que carga el navegador, vía resolver_three.mjs) y un `document` de
 * mentira cuyo único trabajo es un <canvas> 64×64 que SÍ rasteriza — sin eso
 * «comprobar expresiones» sería comparar nombres de string, y el aviso del
 * encargo es explícito: si dos caras salen idénticas y la prueba no se entera
 * leyendo el canvas, no vale nada.
 *
 * ⚠️ NO SE COPIA LA LÓGICA DE DIBUJO. El mock de canvas rasteriza fillRect,
 * arc, quadraticCurveTo, etc. de forma genérica (muestreando el trazo); no
 * sabe nada de ojos, bocas ni símbolos. Si `drawFaceFrame` se rompe, este
 * mock no lo va a arreglar por parecido — sólo pinta lo que le mandan.
 */
import { readFile } from 'node:fs/promises';

// El hook de módulos tiene que registrarse ANTES de importar nada que pida
// 'three' o 'three/addons/...' — por eso el import es dinámico y no estático:
// un `import` de arriba del fichero se resolvería antes de que este código corra.
await import('./resolver_three.mjs');
const THREE = await import('three');
const { AvatarCalibrationTool } = await import('./public/js/tools/AvatarCalibrationTool.js');

const verde = (s) => `\x1b[32m${s}\x1b[0m`;
const rojo = (s) => `\x1b[31m${s}\x1b[0m`;
const gris = (s) => `\x1b[90m${s}\x1b[0m`;

const fallos = [];
const mal = (m) => fallos.push(m);
let comprobaciones = 0;

// ══════════════════════════════════════════════════════════════════════════
// 🖌️  UN <canvas> DE MENTIRA QUE SÍ RASTERIZA
// ══════════════════════════════════════════════════════════════════════════
/**
 * Sólo implementa lo que `drawFaceFrame`/`_dibujarSimbolo` usan de verdad:
 * clearRect, fillRect, el trío de trazo (beginPath/moveTo/lineTo/
 * quadraticCurveTo/arc/ellipse) con stroke()/fill(), y save/restore. Las
 * curvas se rasterizan MUESTREANDO el trazo paramétrico en N puntos y
 * pintando un disco de `lineWidth` de radio en cada uno — no es un rasterizer
 * de verdad (no rellena el interior de un polígono), pero para el propósito
 * de esta prueba —¿dos expresiones dejan píxeles distintos, en sitios
 * distintos, con colores distintos?— es fiel: cada trazo pinta exactamente
 * por donde pasa.
 */
class ContextoFalso {
    constructor(ancho, alto) {
        this.ancho = ancho;
        this.alto = alto;
        this.pixeles = new Uint8ClampedArray(ancho * alto * 4);
        this.fillStyle = '#000000';
        this.strokeStyle = '#000000';
        this.lineWidth = 1;
        this.shadowBlur = 0;
        this.shadowColor = '#000000';
        this._path = [];
        this._pila = [];
    }

    _rgba(str) {
        if (typeof str === 'string' && str[0] === '#') {
            const hex = str.length === 4
                ? str.slice(1).split('').map((c) => c + c).join('')
                : str.slice(1);
            const n = parseInt(hex, 16);
            return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
        }
        return [255, 255, 255, 255]; // no se usa ningún otro formato en este fichero
    }

    _set(x, y, rgba) {
        x = Math.round(x); y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.ancho || y >= this.alto) return;
        const i = (y * this.ancho + x) * 4;
        this.pixeles[i] = rgba[0]; this.pixeles[i + 1] = rgba[1];
        this.pixeles[i + 2] = rgba[2]; this.pixeles[i + 3] = rgba[3];
    }

    _disco(x, y, rgba, radio) {
        const r = Math.max(0, Math.round(radio));
        for (let dy = -r; dy <= r; dy++) {
            for (let dx = -r; dx <= r; dx++) {
                if (dx * dx + dy * dy <= r * r + 0.5) this._set(x + dx, y + dy, rgba);
            }
        }
    }

    clearRect(x, y, w, h) {
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this._set(i, j, [0, 0, 0, 0]);
    }

    fillRect(x, y, w, h) {
        const c = this._rgba(this.fillStyle);
        for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this._set(i, j, c);
    }

    beginPath() { this._path = []; }
    moveTo(x, y) { this._path.push(['M', x, y]); }
    lineTo(x, y) { this._path.push(['L', x, y]); }
    quadraticCurveTo(cx, cy, x, y) { this._path.push(['Q', cx, cy, x, y]); }
    arc(cx, cy, r, a0, a1) { this._path.push(['A', cx, cy, r, a0, a1]); }
    ellipse(cx, cy, rx, ry, rot, a0, a1) { this._path.push(['E', cx, cy, rx, ry, rot, a0, a1]); }
    closePath() { this._path.push(['Z']); }
    save() { this._pila.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth }); }
    restore() { const s = this._pila.pop(); if (s) Object.assign(this, s); }

    _puntos() {
        const N = 32;
        const pts = [];
        let actual = [0, 0];
        for (const seg of this._path) {
            if (seg[0] === 'M') { actual = [seg[1], seg[2]]; pts.push(actual); }
            else if (seg[0] === 'L') {
                const [x0, y0] = actual, [x1, y1] = [seg[1], seg[2]];
                for (let i = 0; i <= N; i++) { const t = i / N; pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]); }
                actual = [x1, y1];
            } else if (seg[0] === 'Q') {
                const [x0, y0] = actual, [cx, cy] = [seg[1], seg[2]], [x1, y1] = [seg[3], seg[4]];
                for (let i = 0; i <= N; i++) {
                    const t = i / N, mt = 1 - t;
                    pts.push([mt * mt * x0 + 2 * mt * t * cx + t * t * x1, mt * mt * y0 + 2 * mt * t * cy + t * t * y1]);
                }
                actual = [x1, y1];
            } else if (seg[0] === 'A') {
                const [, cx, cy, r, a0, a1] = seg;
                for (let i = 0; i <= N; i++) { const t = a0 + (a1 - a0) * (i / N); pts.push([cx + r * Math.cos(t), cy + r * Math.sin(t)]); }
                actual = pts[pts.length - 1];
            } else if (seg[0] === 'E') {
                const [, cx, cy, rx, ry, rot, a0, a1] = seg;
                for (let i = 0; i <= N; i++) {
                    const t = a0 + (a1 - a0) * (i / N);
                    const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
                    pts.push([cx + ex * Math.cos(rot) - ey * Math.sin(rot), cy + ex * Math.sin(rot) + ey * Math.cos(rot)]);
                }
                actual = pts[pts.length - 1];
            }
        }
        return pts;
    }

    stroke() {
        const c = this._rgba(this.strokeStyle);
        for (const [x, y] of this._puntos()) this._disco(x, y, c, this.lineWidth / 2);
    }

    fill() {
        // No rellena el interior real (no hace falta para esta prueba): pinta el
        // contorno grueso, que ya basta para distinguir forma, sitio y color.
        const c = this._rgba(this.fillStyle);
        for (const [x, y] of this._puntos()) this._disco(x, y, c, 1.5);
    }

    getImageData(x, y, w, h) {
        if (x === 0 && y === 0 && w === this.ancho && h === this.alto) {
            return { data: this.pixeles, width: w, height: h };
        }
        const out = new Uint8ClampedArray(w * h * 4);
        for (let j = 0; j < h; j++) {
            for (let i = 0; i < w; i++) {
                const src = ((y + j) * this.ancho + (x + i)) * 4;
                const dst = (j * w + i) * 4;
                out.set(this.pixeles.subarray(src, src + 4), dst);
            }
        }
        return { data: out, width: w, height: h };
    }
}

class CanvasFalso {
    constructor() { this.width = 0; this.height = 0; this._ctx = null; }
    getContext(tipo) {
        if (tipo !== '2d') return null;
        if (!this._ctx) this._ctx = new ContextoFalso(this.width || 64, this.height || 64);
        return this._ctx;
    }
}

function documentoFalso() {
    return {
        createElement(tag) {
            if (tag === 'canvas') return new CanvasFalso();
            return { style: {}, appendChild() {}, removeChild() {} }; // no lo usa attachStripeFace/drawFaceFrame
        },
        getElementById() { return null; },
        body: { appendChild() {}, removeChild() {} },
    };
}

/** Un grupo three.js real con una caja de altura exacta, pies en y=0 — como dejan los labs tras cargar el GLB. */
function grupoDeAltura(alto) {
    const grupo = new THREE.Group();
    const geo = new THREE.BoxGeometry(alto * 0.4, alto, alto * 0.3);
    const malla = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
    malla.position.y = alto / 2;
    grupo.add(malla);
    grupo.updateMatrixWorld(true);
    return { grupo, malla };
}

function herramienta() {
    const escena = new THREE.Scene();
    return new AvatarCalibrationTool(escena, { document: documentoFalso() });
}

/** Compara dos snapshots de canvas byte a byte. */
function pixelesIguales(a, b) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
}

function snapshot(tool) {
    return new Uint8ClampedArray(tool.faceCtx.getImageData(0, 0, 64, 64).data);
}

// ══════════════════════════════════════════════════════════════════════════
// ⚠️ CONTROL POSITIVO — antes de fiarse de `pixelesIguales`, que demuestre
// que sabe suspender. Si aprobara dos canvases idénticos, todo lo de abajo
// sería decorado: «expresiones distintas» aprobaría con el canvas en blanco.
// ══════════════════════════════════════════════════════════════════════════
{
    const t = herramienta();
    const { grupo } = grupoDeAltura(2);
    t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
    t.attachStripeFace(grupo, 'hologram');
    t.faceCtx.clearRect(0, 0, 64, 64); // deliberadamente igual las dos veces: dos canvases en blanco
    const enBlanco1 = snapshot(t);
    t.faceCtx.clearRect(0, 0, 64, 64);
    const enBlanco2 = snapshot(t);
    comprobaciones++;
    if (!pixelesIguales(enBlanco1, enBlanco2)) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: dos canvases en blanco no salen iguales — el propio mock de canvas está roto.\n'));
        process.exit(2);
    }
    // Y la comprobación inversa: el comparador SÍ tiene que quejarse cuando las
    // meto a propósito distintas.
    const distinto = new Uint8ClampedArray(enBlanco1); distinto[0] = 255;
    comprobaciones++;
    if (pixelesIguales(enBlanco1, distinto)) {
        console.log(rojo('\nCONTROL POSITIVO FALLIDO: pixelesIguales() dice que iguales dos buffers que difieren en un byte.\n'));
        process.exit(2);
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 1. Las 8 expresiones del léxico se pueden pedir y ninguna revienta
// ══════════════════════════════════════════════════════════════════════════
const LEXICO = JSON.parse(await readFile('./public/data/realizacion/face_lexicon.json', 'utf8'));
const NOMBRES_LEXICO = Object.keys(LEXICO.expressions);
comprobaciones++;
if (NOMBRES_LEXICO.length !== 8) mal(`el léxico en disco no tiene 8 expresiones, tiene ${NOMBRES_LEXICO.length}`);

// Deriva: la tabla que dibuja de verdad (AvatarCalibrationTool.EXPRESIONES) tiene
// que conocer exactamente los mismos nombres que el léxico narrativo — si no,
// la cara podría "aprobar" una expresión que el léxico ya no pide, o al revés.
const NOMBRES_DIBUJO = Object.keys(AvatarCalibrationTool.EXPRESIONES).sort();
comprobaciones++;
if (JSON.stringify(NOMBRES_DIBUJO) !== JSON.stringify([...NOMBRES_LEXICO].sort())) {
    mal(`la tabla de dibujo y face_lexicon.json no coinciden en nombres: `
        + `dibujo=[${NOMBRES_DIBUJO}] léxico=[${NOMBRES_LEXICO.sort()}]`);
}

const snapshots = {};
{
    const t = herramienta();
    const { grupo } = grupoDeAltura(2);
    t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
    t.attachStripeFace(grupo, 'hologram');
    for (const nombre of NOMBRES_LEXICO) {
        comprobaciones++;
        try {
            t.setExpression(nombre);
            if (t.currentExpression !== nombre) mal(`setExpression('${nombre}') no dejó currentExpression en '${nombre}' sino '${t.currentExpression}'`);
            snapshots[nombre] = snapshot(t);
        } catch (e) {
            mal(`setExpression('${nombre}') reventó: ${e.stack || e}`);
        }
    }
}

// ══════════════════════════════════════════════════════════════════════════
// 2. Expresiones distintas ⇒ píxeles distintos (comparando el canvas, no el nombre)
// ══════════════════════════════════════════════════════════════════════════
const pares = [];
for (let i = 0; i < NOMBRES_LEXICO.length; i++) {
    for (let j = i + 1; j < NOMBRES_LEXICO.length; j++) pares.push([NOMBRES_LEXICO[i], NOMBRES_LEXICO[j]]);
}
for (const [a, b] of pares) {
    comprobaciones++;
    if (!snapshots[a] || !snapshots[b]) continue; // ya se quejó arriba si reventó
    if (pixelesIguales(snapshots[a], snapshots[b])) {
        mal(`'${a}' y '${b}' pintan exactamente los mismos píxeles — el sistema no distingue expresiones`);
    }
}
console.log(gris(`  ${pares.length} pares de expresiones comparados byte a byte sobre un canvas 64×64`));

// Y el mismo nombre, dos veces, tiene que dar el MISMO resultado (determinismo).
{
    const t = herramienta();
    const { grupo } = grupoDeAltura(2);
    t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
    t.attachStripeFace(grupo, 'hologram');
    t.setExpression('happy'); const s1 = snapshot(t);
    t.setExpression('sad');   // de por medio, para que no sea sólo "no ha cambiado nada"
    t.setExpression('happy'); const s2 = snapshot(t);
    comprobaciones++;
    if (!pixelesIguales(s1, s2)) mal(`pedir 'happy' dos veces (con 'sad' de por medio) da dos caras distintas — no es determinista`);
}

// ══════════════════════════════════════════════════════════════════════════
// 3. Nombre inventado ⇒ avisa (console.warn) y NO revienta la escena
// ══════════════════════════════════════════════════════════════════════════
{
    const t = herramienta();
    const { grupo } = grupoDeAltura(2);
    t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
    t.attachStripeFace(grupo, 'hologram');
    t.setExpression('neutral');
    const neutral = snapshot(t);

    let avisos = 0;
    const original = console.warn;
    console.warn = (...args) => { avisos++; original('  ' + gris('(aviso capturado) ' + args.join(' '))); };
    let reventó = null;
    try { t.setExpression('esta_expresion_no_existe_en_ningun_lexico'); }
    catch (e) { reventó = e; }
    console.warn = original;

    comprobaciones++;
    if (reventó) mal(`un nombre de expresión inventado reventó la escena: ${reventó.stack || reventó}`);
    comprobaciones++;
    if (avisos < 1) mal('un nombre de expresión inventado no avisó por console.warn');
    comprobaciones++;
    if (t.currentExpression !== 'neutral') mal(`tras un nombre inventado, currentExpression debería caer a 'neutral' y quedó en '${t.currentExpression}'`);
    comprobaciones++;
    if (!pixelesIguales(snapshot(t), neutral)) mal('un nombre inventado no cayó a la MISMA cara que neutral');
}

// ══════════════════════════════════════════════════════════════════════════
// 4. setFaceAnchor escala al tamaño real del modelo — mismo ancla, alturas
//    distintas, posiciones distintas y PROPORCIONALES.
// ══════════════════════════════════════════════════════════════════════════
{
    const ANCLA = [0.3, 3.75, 1.0];
    const TAMANO = 1.1;
    const CANON = 5.0;
    const alturas = [2, 8, 0.5];
    const anclas = {};

    for (const alto of alturas) {
        const t = herramienta();
        const { grupo } = grupoDeAltura(alto);
        t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
        const a = t.setFaceAnchor(ANCLA, TAMANO, CANON);
        anclas[alto] = a;
        comprobaciones++;
        if (!a || !Array.isArray(a.pos) || a.pos.length !== 3) { mal(`setFaceAnchor(altura=${alto}) no devolvió un ancla con pos [x,y,z]`); continue; }
        const factorEsperado = alto / CANON;
        for (let i = 0; i < 3; i++) {
            comprobaciones++;
            const esperado = ANCLA[i] * factorEsperado;
            if (Math.abs(a.pos[i] - esperado) > 1e-9) {
                mal(`setFaceAnchor(altura=${alto}).pos[${i}] = ${a.pos[i]}, esperaba ${esperado} (factor ${factorEsperado})`);
            }
        }
        comprobaciones++;
        const sizeEsperado = TAMANO * factorEsperado;
        if (Math.abs(a.size - sizeEsperado) > 1e-9) mal(`setFaceAnchor(altura=${alto}).size = ${a.size}, esperaba ${sizeEsperado}`);
    }

    // Proporcionalidad cruzada: doblar la altura tiene que doblar exactamente el ancla.
    comprobaciones++;
    const razonAlturas = alturas[1] / alturas[0]; // 8/2 = 4
    const razonAnclaY = anclas[alturas[1]].pos[1] / anclas[alturas[0]].pos[1];
    if (Math.abs(razonAlturas - razonAnclaY) > 1e-9) {
        mal(`el ancla no escala proporcionalmente: alturas en razón ${razonAlturas}, ancla.pos[1] en razón ${razonAnclaY}`);
    }

    // Y distintas de verdad, no por casualidad de redondeo.
    comprobaciones++;
    if (anclas[alturas[0]].pos[1] === anclas[alturas[1]].pos[1]) {
        mal('el mismo ancla sobre modelos de altura distinta dio la MISMA posición');
    }

    // ⚠️ CONTROL POSITIVO DEL PROPIO CÁLCULO — si canon no importara, la prueba
    // de arriba podría aprobar por casualidad si alguien lo hardcodeara a 5.0.
    // Se repite con canon distinto y la misma altura: el resultado tiene que moverse.
    {
        const t = herramienta();
        const { grupo } = grupoDeAltura(4);
        t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
        const conCanon5 = t.setFaceAnchor(ANCLA, TAMANO, 5.0);
        const conCanon10 = t.setFaceAnchor(ANCLA, TAMANO, 10.0);
        comprobaciones++;
        if (Math.abs(conCanon5.pos[1] - conCanon10.pos[1]) < 1e-6) {
            mal('cambiar canon (5.0 → 10.0) con la misma altura real no cambió el ancla escalada');
        }
    }

    // Integración: attachStripeFace() usa el ancla guardada para colocar el plano.
    {
        const posicionesPlano = [];
        for (const alto of [2, 8]) {
            const t = herramienta();
            const { grupo } = grupoDeAltura(alto);
            t.currentGroup = grupo; t.currentModelLoaded = grupo.children[0];
            t.setFaceAnchor(ANCLA, TAMANO, CANON);
            t.attachStripeFace(grupo, 'hologram');
            comprobaciones++;
            if (!t.facePlane) { mal(`attachStripeFace(altura=${alto}) no creó facePlane`); continue; }
            posicionesPlano.push(t.facePlane.position.y);
        }
        comprobaciones++;
        if (posicionesPlano.length === 2 && posicionesPlano[0] === posicionesPlano[1]) {
            mal('attachStripeFace coloca la cara en la misma Y de mundo para modelos de altura muy distinta — el ancla no está entrando en la posición real');
        }
    }
}

// ── veredicto ────────────────────────────────────────────────────────────────
const MINIMO = 60;
console.log(`\n¿La cara procedural pinta lo que dice pintar?\n`);
console.log(gris(`  ${NOMBRES_LEXICO.length} expresiones · ${pares.length} pares comparados · ${comprobaciones} comprobaciones`));

if (comprobaciones < MINIMO) {
    console.log(rojo(`\nCONTROL POSITIVO FALLIDO: sólo ${comprobaciones} comprobaciones, por debajo del mínimo de ${MINIMO}. Una prueba vacía aprueba sola.\n`));
    process.exit(2);
}
if (fallos.length) {
    for (const f of fallos.slice(0, 20)) console.log(rojo(`  ✗ ${f}`));
    if (fallos.length > 20) console.log(gris(`  … y ${fallos.length - 20} más`));
    console.log(rojo(`\n✗ ${fallos.length} fallos\n`));
    process.exit(1);
}
console.log(verde('✓ 8 expresiones, todas distintas en píxeles, el ancla escala proporcional al modelo real, y un nombre inventado avisa sin reventar\n'));
