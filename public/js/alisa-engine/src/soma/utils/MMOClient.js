export class MMOClient {
    static BASE_URL = 'https://alisa-mmo-worker.prime-6d5.workers.dev';

    static setBaseUrl(baseUrl) {
        if (typeof baseUrl === 'string' && baseUrl.trim()) {
            MMOClient.BASE_URL = baseUrl.replace(/\/+$/, '');
        }
        return MMOClient.BASE_URL;
    }

    /**
     * Sends telemetry data (score, metadata, trajectory) to the Cloudflare D1 backend.
     * @param {string} simName - Name of the gym simulation (e.g., 'asteroids', 'cabinet_escape')
     * @param {number} score - The final score of the agent or player
     * @param {Object} metadata - Contextual data (stage, heat, lives)
     * @param {Array} trajectory - Array of action history for LLM training
     */
    static submitTelemetry(simName, score, metadata = {}, trajectory = []) {
        if (typeof fetch !== 'function') {
            console.warn('[MMOClient] Telemetry skipped: fetch is unavailable in this runtime.');
            return Promise.resolve({ status: 'skipped', reason: 'fetch-unavailable' });
        }

        let player = 'Agent_' + Math.floor(Math.random() * 1000);
        if (typeof window !== 'undefined' && window.localStorage) {
            player = localStorage.getItem('alisa_nick') || player;
        } else if (typeof global !== 'undefined' && global.alisa_nick) {
            player = global.alisa_nick;
        }
        
        const payload = {
            sim_name: simName,
            player: player,
            score: score,
            metadata: metadata,
            trajectory: trajectory
        };

        // Submit to global Leaderboard
        const leaderboard = fetch(`${MMOClient.BASE_URL}/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(e => console.warn('[MMOClient] Leaderboard offline:', e.message));

        // Submit to global Dataset (for future LLM training)
        const dataset = fetch(`${MMOClient.BASE_URL}/dataset`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(e => console.warn('[MMOClient] Dataset offline:', e.message));

        return Promise.allSettled([leaderboard, dataset]);
    }
}
