/**
 * AssetResolver.js
 * ═══════════════════════════════════════════════════════════════════════════
 * DÓNDE ESTÁN LOS ASSETS. Un solo sitio.
 *
 * EL PROBLEMA QUE RESUELVE
 * ------------------------
 * Las factories piden sus modelos con rutas relativas: `props/models/X.glb`.
 * Una ruta relativa en un `fetch` se resuelve contra la PÁGINA, no contra el
 * módulo que la escribió. Así que el mismo código funcionaba desde
 * `/index.html` y daba 404 desde `/labs/loquesea.html`:
 *
 *     /labs/demo.html  →  props/models/X.glb  →  /labs/props/models/X.glb  ❌
 *     /index.html      →  props/models/X.glb  →  /props/models/X.glb       ✅
 *
 * Y para un motor que la gente se descarga y monta en una subcarpeta
 * cualquiera (`/mi-juego/engine/`), las rutas absolutas tampoco valen.
 *
 * LA SOLUCIÓN
 * -----------
 * Por defecto las rutas se resuelven contra la raíz del sitio deducida de la
 * posición de ESTE módulo, no de la página. Así funciona desde cualquier
 * profundidad de URL sin configurar nada.
 *
 * Si montas los assets en otro sitio (CDN, bucket, otra carpeta), lo dices
 * una vez al arrancar:
 *
 *     import { AssetResolver } from '@alisa-engine/src/soma/AssetResolver.js';
 *     AssetResolver.setBase('https://assets.midominio.com/');
 *
 * Se respetan tal cual: URLs absolutas (`http…`), rutas de raíz (`/…`) y
 * `data:`/`blob:`.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export class AssetResolver {
    /** @type {string|null} base explícita fijada por la app (null = deducida) */
    static _base = null;

    /**
     * Raíz deducida: este archivo vive en
     *   <raiz>/js/alisa-engine/src/soma/AssetResolver.js
     * así que subimos cinco niveles (soma → src → alisa-engine → js → raiz).
     * Si mueves el motor de sitio, ajusta esto o llama a setBase().
     */
    static get base() {
        if (AssetResolver._base) return AssetResolver._base;
        return new URL('../../../../', import.meta.url).href;
    }

    /**
     * Fija la base de assets. Acepta absoluta o relativa a la página.
     * @param {string} url
     */
    static setBase(url) {
        AssetResolver._base = url.endsWith('/') ? url : url + '/';
    }

    /** Vuelve a la base deducida. */
    static resetBase() { AssetResolver._base = null; }

    /**
     * Resuelve una ruta de asset a URL absoluta.
     * @param {string} path
     * @returns {string}
     */
    static resolve(path) {
        if (typeof path !== 'string' || !path) return path;
        // Ya resueltas: no las toques.
        if (/^([a-z][a-z0-9+.-]*:)?\/\//i.test(path)) return path;  // http://, https://, //cdn
        if (/^(data|blob):/i.test(path)) return path;
        if (path.startsWith('/')) return path;                       // raíz del sitio, decisión del que llama

        // `../props/x.glb` y `props/x.glb` apuntan a lo mismo: la carpeta de
        // assets del motor. El `../` venía de cuando los labs estaban un nivel
        // más abajo; lo toleramos para no romper el código heredado.
        const clean = path.replace(/^(\.\.\/)+/, '').replace(/^\.\//, '');
        return new URL(clean, AssetResolver.base).href;
    }
}
