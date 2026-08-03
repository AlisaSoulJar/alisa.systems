/**
 * HubClient.js
 * ═══════════════════════════════════════════════════════════════
 * Centralized HTTP client for the ALISA Sovereign Hub (port 8741).
 * Replaces scattered inline fetch() calls across systems with a
 * single, configurable, error-handling gateway.
 * ═══════════════════════════════════════════════════════════════
 */

export class HubClient {
    static BASE = 'http://127.0.0.1:8741';

    /**
     * GET request to a Hub endpoint.
     * @param {string} path - e.g. '/geppetto/catalog'
     * @param {Object} [options] - fetch options override
     * @returns {Promise<Object>} Parsed JSON response
     */
    static async get(path, options = {}) {
        try {
            const res = await fetch(`${HubClient.BASE}${path}`, {
                method: 'GET',
                ...options
            });
            if (!res.ok) throw new Error(`Hub GET ${path}: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`[HubClient] GET ${path} failed:`, e.message);
            return null;
        }
    }

    /**
     * POST request to a Hub endpoint.
     * @param {string} path - e.g. '/jobboard/post'
     * @param {Object} body - JSON-serializable payload
     * @param {Object} [options] - fetch options override
     * @returns {Promise<Object>} Parsed JSON response
     */
    static async post(path, body, options = {}) {
        try {
            const res = await fetch(`${HubClient.BASE}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                ...options
            });
            if (!res.ok) throw new Error(`Hub POST ${path}: ${res.status}`);
            return await res.json();
        } catch (e) {
            console.warn(`[HubClient] POST ${path} failed:`, e.message);
            return null;
        }
    }

    /**
     * Fire-and-forget POST (no await on response parsing).
     * Used for telemetry, metrics, and non-critical writes.
     * @param {string} path
     * @param {Object} body
     */
    static fire(path, body) {
        fetch(`${HubClient.BASE}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).catch(() => {}); // Silently swallow network errors
    }

    /**
     * Polling helper — calls GET at an interval until stopped.
     * @param {string} path
     * @param {number} intervalMs
     * @param {Function} callback - receives parsed JSON each tick
     * @returns {{ stop: Function }} Controller
     */
    static poll(path, intervalMs, callback) {
        let active = true;
        const loop = async () => {
            while (active) {
                const data = await HubClient.get(path);
                if (data && active) callback(data);
                await new Promise(r => setTimeout(r, intervalMs));
            }
        };
        loop();
        return { stop: () => { active = false; } };
    }
}
