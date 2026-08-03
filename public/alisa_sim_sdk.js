/**
 * ═══════════════════════════════════════════════════════════════
 *  ALISA SIMULATION SDK v1.0
 *  Universal Intelligence Stack for All Simulation Vertientes
 * ═══════════════════════════════════════════════════════════════
 *
 *  Include in any simulation HTML:
 *    <script src="alisa_sim_sdk.js"></script>
 *
 *  Then register your simulation's semantic adapter:
 *    ALISA_SDK.register({
 *        sim: "chopper_search",
 *        getSemanticState: () => ({...}),
 *        getAvailableActions: () => [...],
 *        executeAction: (intent) => ({...}),
 *        getScore: () => ({score, time, fuel, efficiency})
 *    });
 *
 *  The SDK automatically provides:
 *    - window.ALISA_LLM_API     (Semantic bridge for LLM agents)
 *    - window.ALISA_RECORDER    (Dataset recording to .jsonl)
 *    - window.ALISA_REPLAY      (Visual playback from .jsonl)
 *    - window.ALISA_LEADERBOARD (Cross-vertiente ranking)
 *    - RL Hook                  (Auto-record PPO/DQN episodes)
 *
 *  (c) ALISA Project 2026 — Soma/World/Web
 * ═══════════════════════════════════════════════════════════════
 */

(function() {
    'use strict';

    // ─── URL Parameters ───
    const params = new URLSearchParams(window.location.search);
    const REPLAY_FILE  = params.get('replay');
    const RL_MODE_URL  = params.get('rl') === 'true';
    const MODEL_NAME   = params.get('model') || 'unknown-agent';
    const PLAYER_NAME  = params.get('player') || null;
    const HUB_URL      = 'http://127.0.0.1:8741';

    // ─── Internal State ───
    let _registered = false;
    let _adapter = null;
    let _simName = 'unknown';
    let _startTime = 0;
    let _tickCount = 0;
    let _currentVertiente = 'human'; // human | auto | rl | llm
    let _lastAction = null;
    let _sessionId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    // ═══════════════════════════════════════════════════
    //  1. REGISTRATION
    // ═══════════════════════════════════════════════════

    function register(adapter) {
        if (!adapter.getSemanticState || !adapter.getAvailableActions || !adapter.executeAction) {
            console.error('[ALISA SDK] Adapter must implement: getSemanticState, getAvailableActions, executeAction');
            return;
        }
        _adapter = adapter;
        _simName = adapter.sim || 'unknown';
        _registered = true;
        _startTime = performance.now();

        // Wire up the public APIs
        _installLLMAPI();
        _installRLHook();
        _installRecorder();

        // If replay mode, start replaying
        if (REPLAY_FILE) {
            _startReplay(REPLAY_FILE);
        }

        console.log(`[ALISA SDK] ✅ Registered: ${_simName} | Session: ${_sessionId}`);
    }

    // ═══════════════════════════════════════════════════
    //  2. LLM SEMANTIC API (window.ALISA_LLM_API)
    // ═══════════════════════════════════════════════════

    function _installLLMAPI() {
        window.ALISA_LLM_API = {
            getSemanticState: () => {
                if (!_adapter) return JSON.stringify({error: 'SDK not registered'});
                const state = _adapter.getSemanticState();
                return typeof state === 'string' ? state : JSON.stringify(state);
            },
            getAvailableActions: () => {
                if (!_adapter) return JSON.stringify([]);
                const acts = _adapter.getAvailableActions();
                return typeof acts === 'string' ? acts : JSON.stringify(acts);
            },
            executeAction: (intentStr) => {
                if (!_adapter) return JSON.stringify({success: false, msg: 'SDK not registered'});
                _currentVertiente = 'llm';
                _lastAction = intentStr;
                ALISA_RECORDER.logAction(intentStr, 'llm');
                const result = _adapter.executeAction(intentStr);
                return typeof result === 'string' ? result : JSON.stringify(result);
            }
        };
    }

    // ═══════════════════════════════════════════════════
    //  3. RL HOOK (Auto-record PPO/DQN episodes)
    // ═══════════════════════════════════════════════════

    function _installRLHook() {
        // Only hook if stepSimulation exists (Gymnasium-compatible sim)
        if (typeof window.stepSimulation !== 'function') return;

        const originalStep = window.stepSimulation;
        window.stepSimulation = function(action, dt) {
            const result = originalStep(action, dt);
            _currentVertiente = 'rl';
            _lastAction = action;

            // Record every RL step
            ALISA_RECORDER.logAction(action, 'rl', {
                reward: result ? result.reward : 0,
                done: result ? result.done : false
            });

            // Auto-submit to leaderboard on episode end
            if (result && result.done) {
                ALISA_LEADERBOARD.submit('rl', MODEL_NAME);
            }

            return result;
        };

        // Also hook resetEpisode if it exists
        if (typeof window.resetEpisode === 'function') {
            const originalReset = window.resetEpisode;
            window.resetEpisode = function(seed) {
                _startTime = performance.now();
                _tickCount = 0;
                ALISA_RECORDER.startEpisode('rl', MODEL_NAME);
                return originalReset(seed);
            };
        }

        console.log('[ALISA SDK] 🧠 RL Hook installed on stepSimulation/resetEpisode');
    }

    // ═══════════════════════════════════════════════════
    //  4. RECORDER (Dataset Recording)
    // ═══════════════════════════════════════════════════

    const _recordBuffer = [];
    let _episodeVertiente = 'human';
    let _episodePlayer = 'anonymous';

    function _installRecorder() {
        // Auto-detect vertiente from URL or context
        if (RL_MODE_URL || window.RLMode) {
            _episodeVertiente = 'rl';
            _episodePlayer = MODEL_NAME;
        } else if (PLAYER_NAME) {
            _episodeVertiente = 'human';
            _episodePlayer = PLAYER_NAME;
        }
    }

    const ALISA_RECORDER = {
        startEpisode: function(vertiente, player) {
            _recordBuffer.length = 0;
            _tickCount = 0;
            _startTime = performance.now();
            _episodeVertiente = vertiente || _episodeVertiente;
            _episodePlayer = player || _episodePlayer;
        },

        logAction: function(action, vertiente, extra) {
            if (!_adapter) return;
            _tickCount++;
            const entry = {
                tick: _tickCount,
                t: +((performance.now() - _startTime) / 1000).toFixed(3),
                state: _adapter.getSemanticState(),
                action: action,
                vertiente: vertiente || _currentVertiente,
                sim: _simName,
                session: _sessionId
            };
            if (extra) Object.assign(entry, extra);
            _recordBuffer.push(entry);
        },

        // Called by human-mode simulations to record player actions
        logHumanAction: function(action) {
            _currentVertiente = 'human';
            _lastAction = action;
            this.logAction(action, 'human');
        },

        // Called by autonomous AI in the sim
        logAutoAction: function(action) {
            _currentVertiente = 'auto';
            _lastAction = action;
            this.logAction(action, 'auto');
        },

        getBuffer: function() { return _recordBuffer; },
        getBufferSize: function() { return _recordBuffer.length; },

        // Export as JSONL string
        toJSONL: function() {
            return _recordBuffer.map(e => JSON.stringify(e)).join('\n');
        },

        // Download as file
        download: function() {
            const blob = new Blob([this.toJSONL()], {type: 'application/jsonl'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${_simName}_${_episodeVertiente}_${_sessionId}.jsonl`;
            a.click();
            URL.revokeObjectURL(url);
            console.log(`[ALISA SDK] 📼 Downloaded ${_recordBuffer.length} entries`);
        },

        // POST to Hub for persistent storage
        saveToHub: async function() {
            try {
                const resp = await fetch(`${HUB_URL}/sim/save-replay`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        sim: _simName,
                        player: _episodePlayer,
                        vertiente: _episodeVertiente,
                        session: _sessionId,
                        data: _recordBuffer
                    })
                });
                const result = await resp.json();
                console.log(`[ALISA SDK] 📼 Saved to Hub:`, result);
                return result;
            } catch(e) {
                console.warn('[ALISA SDK] Hub unreachable for replay save:', e.message);
                return {success: false, error: e.message};
            }
        }
    };

    // ═══════════════════════════════════════════════════
    //  5. LEADERBOARD (Cross-Vertiente Ranking)
    // ═══════════════════════════════════════════════════

    const ALISA_LEADERBOARD = {
        submit: async function(vertiente, playerName) {
            if (!_adapter || !_adapter.getScore) {
                console.warn('[ALISA SDK] No getScore() in adapter, cannot submit to leaderboard');
                return;
            }

            const score = _adapter.getScore();
            const elapsed = (performance.now() - _startTime) / 1000;
            const entry = {
                sim: _simName,
                player: playerName || _episodePlayer || 'anonymous',
                type: vertiente || _currentVertiente,
                score: score.score || 0,
                time: +elapsed.toFixed(2),
                fuel: score.fuel != null ? score.fuel : null,
                efficiency: score.efficiency != null ? score.efficiency : null,
                seed: score.seed || null,
                ticks: _tickCount,
                session: _sessionId,
                timestamp: new Date().toISOString()
            };

            // Also save replay automatically
            ALISA_RECORDER.saveToHub();

            try {
                const resp = await fetch(`${HUB_URL}/sim/leaderboard`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(entry)
                });
                const result = await resp.json();
                console.log(`[ALISA SDK] 🏆 Leaderboard submitted:`, entry.player, entry.score);
                return result;
            } catch(e) {
                // Fallback: store locally
                const stored = JSON.parse(localStorage.getItem('alisa_leaderboard') || '[]');
                stored.push(entry);
                localStorage.setItem('alisa_leaderboard', JSON.stringify(stored));
                console.warn('[ALISA SDK] Hub unreachable, stored leaderboard entry locally');
                return {success: false, stored_locally: true};
            }
        },

        // Fetch leaderboard from Hub
        fetch: async function(sim) {
            try {
                const resp = await fetch(`${HUB_URL}/sim/leaderboard?sim=${sim || _simName}`);
                return await resp.json();
            } catch(e) {
                // Fallback: return local entries
                const stored = JSON.parse(localStorage.getItem('alisa_leaderboard') || '[]');
                return stored.filter(e => e.sim === (sim || _simName));
            }
        },

        // Show overlay UI with leaderboard
        showOverlay: async function() {
            const data = await this.fetch();
            if (!data || data.length === 0) return;

            // Sort by score descending
            const sorted = (Array.isArray(data) ? data : data.entries || [])
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 15);

            const typeEmoji = {human: '🎮', rl: '🧠', llm: '🤖', auto: '🐟'};

            let html = `
                <div style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;" id="alisa-lb-overlay" onclick="this.remove()">
                <div style="background:#0a0f1e;border:2px solid #1e88e5;border-radius:14px;padding:30px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;" onclick="event.stopPropagation()">
                    <h2 style="color:#42a5f5;text-align:center;margin-bottom:20px;font-size:20px;letter-spacing:2px;">🏆 ${_simName.toUpperCase()} LEADERBOARD</h2>
                    <table style="width:100%;border-collapse:collapse;font-size:12px;">
                        <tr style="color:#556;border-bottom:1px solid #1a2a44;">
                            <th style="padding:8px;text-align:left;">#</th>
                            <th style="padding:8px;text-align:left;">Player</th>
                            <th style="padding:8px;text-align:center;">Type</th>
                            <th style="padding:8px;text-align:right;">Score</th>
                            <th style="padding:8px;text-align:right;">Time</th>
                        </tr>
            `;

            sorted.forEach((e, i) => {
                const isMe = e.session === _sessionId;
                const rowColor = isMe ? 'color:#42a5f5;font-weight:bold;' : 'color:#8899bb;';
                html += `
                    <tr style="${rowColor}border-bottom:1px solid #111828;">
                        <td style="padding:6px 8px;">${i + 1}</td>
                        <td style="padding:6px 8px;">${e.player || 'anon'}</td>
                        <td style="padding:6px 8px;text-align:center;">${typeEmoji[e.type] || '❓'} ${e.type}</td>
                        <td style="padding:6px 8px;text-align:right;">${(e.score || 0).toFixed(1)}</td>
                        <td style="padding:6px 8px;text-align:right;">${(e.time || 0).toFixed(1)}s</td>
                    </tr>
                `;
            });

            html += `</table>
                    <p style="color:#445;font-size:10px;text-align:center;margin-top:15px;">Click outside to close · ALISA SDK v1.0</p>
                </div></div>`;

            document.body.insertAdjacentHTML('beforeend', html);
        }
    };

    // ═══════════════════════════════════════════════════
    //  6. REPLAY (Visual Playback)
    // ═══════════════════════════════════════════════════

    async function _startReplay(filename) {
        console.log(`[ALISA SDK] ▶️ Replay mode: ${filename}`);

        let entries;
        try {
            // Try loading from Hub first
            const resp = await fetch(`${HUB_URL}/sim/load-replay/${encodeURIComponent(filename)}`);
            if (resp.ok) {
                entries = await resp.json();
            }
        } catch(e) {}

        if (!entries) {
            // Try loading as direct file URL
            try {
                const resp = await fetch(filename);
                const text = await resp.text();
                entries = text.trim().split('\n').map(line => JSON.parse(line));
            } catch(e) {
                console.error('[ALISA SDK] Could not load replay file:', e);
                return;
            }
        }

        if (!entries || entries.length === 0) {
            console.warn('[ALISA SDK] Empty replay file');
            return;
        }

        // Build replay controls overlay
        _buildReplayUI(entries);
    }

    function _buildReplayUI(entries) {
        let idx = 0;
        let playing = true;
        let speed = 1;

        const overlay = document.createElement('div');
        overlay.id = 'alisa-replay-controls';
        overlay.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:9998;background:rgba(5,10,25,0.9);border:1px solid #1e88e5;border-radius:10px;padding:10px 20px;font-family:monospace;font-size:12px;color:#88bbff;display:flex;gap:12px;align-items:center;';
        overlay.innerHTML = `
            <span style="color:#42a5f5;font-weight:bold;">▶ REPLAY</span>
            <button id="rp-playpause" style="background:#1e88e5;color:#fff;border:none;padding:4px 10px;border-radius:6px;cursor:pointer;font-family:inherit;">⏸</button>
            <button id="rp-speed" style="background:#1a2a44;color:#88bbff;border:1px solid #1e88e5;padding:4px 10px;border-radius:6px;cursor:pointer;font-family:inherit;">1x</button>
            <span id="rp-progress" style="min-width:80px;">0 / ${entries.length}</span>
            <input type="range" id="rp-seek" min="0" max="${entries.length - 1}" value="0" style="width:150px;">
            <span id="rp-vertiente" style="font-size:10px;"></span>
        `;
        document.body.appendChild(overlay);

        const btnPlay = document.getElementById('rp-playpause');
        const btnSpeed = document.getElementById('rp-speed');
        const seekBar = document.getElementById('rp-seek');
        const progLabel = document.getElementById('rp-progress');
        const vertLabel = document.getElementById('rp-vertiente');
        const typeEmoji = {human: '🎮', rl: '🧠', llm: '🤖', auto: '🐟'};

        btnPlay.onclick = () => { playing = !playing; btnPlay.textContent = playing ? '⏸' : '▶'; };
        btnSpeed.onclick = () => { speed = speed >= 8 ? 1 : speed * 2; btnSpeed.textContent = speed + 'x'; };
        seekBar.oninput = () => { idx = parseInt(seekBar.value); };

        function replayTick() {
            if (!playing || idx >= entries.length) {
                if (idx >= entries.length) {
                    btnPlay.textContent = '✓';
                    playing = false;
                }
                requestAnimationFrame(replayTick);
                return;
            }

            const entry = entries[idx];
            if (_adapter && entry.action != null) {
                _adapter.executeAction(String(entry.action));
            }

            seekBar.value = idx;
            progLabel.textContent = `${idx + 1} / ${entries.length}`;
            vertLabel.textContent = `${typeEmoji[entry.vertiente] || '❓'} ${entry.vertiente || '?'}`;

            idx++;

            // Schedule next tick based on speed and time delta
            let delay = 33; // Default ~30fps
            if (idx < entries.length && entries[idx].t && entry.t) {
                delay = Math.max(5, ((entries[idx].t - entry.t) * 1000) / speed);
            }
            setTimeout(() => requestAnimationFrame(replayTick), delay);
        }

        // Start replay after a small delay to let the sim initialize
        setTimeout(replayTick, 500);
    }

    // ═══════════════════════════════════════════════════
    //  7. LIVE STREAM (Broadcast to Hub Observers)
    // ═══════════════════════════════════════════════════

    let _streamInterval = null;
    let _streamWs = null;

    const ALISA_STREAM = {
        /**
         * Start broadcasting simulation state to Hub observers.
         * Observers connect via WS /sim/stream/{sim_name}
         * @param {number} fps - Frames per second to push (default 10)
         */
        startBroadcast: function(fps) {
            fps = fps || 10;
            if (_streamInterval) this.stopBroadcast();
            if (!_adapter) { console.warn('[ALISA SDK] Cannot stream: no adapter registered'); return; }

            _streamInterval = setInterval(async () => {
                if (!_adapter) return;
                const state = _adapter.getSemanticState();
                try {
                    await fetch(`${HUB_URL}/sim/push-state/${_simName}`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(state)
                    });
                } catch(e) { /* Hub offline — silent */ }
            }, 1000 / fps);

            console.log(`[ALISA SDK] 📡 Broadcasting ${_simName} at ${fps} fps`);
        },

        stopBroadcast: function() {
            if (_streamInterval) {
                clearInterval(_streamInterval);
                _streamInterval = null;
                console.log('[ALISA SDK] 📡 Broadcast stopped');
            }
        },

        /**
         * Subscribe to another simulation's live stream (observer mode).
         * @param {string} simName - Simulation to observe
         * @param {function} onFrame - Callback for each state frame
         */
        observe: function(simName, onFrame) {
            const wsUrl = `ws://127.0.0.1:8741/sim/stream/${simName}`;
            _streamWs = new WebSocket(wsUrl);
            _streamWs.onmessage = (evt) => {
                try {
                    const frame = JSON.parse(evt.data);
                    if (frame.type === 'state' && onFrame) onFrame(frame.data);
                } catch(e) {}
            };
            _streamWs.onopen = () => console.log(`[ALISA SDK] 👁️ Observing ${simName}`);
            _streamWs.onclose = () => console.log(`[ALISA SDK] 👁️ Observer disconnected from ${simName}`);
            return _streamWs;
        },

        stopObserving: function() {
            if (_streamWs) { _streamWs.close(); _streamWs = null; }
        },

        isStreaming: function() { return !!_streamInterval; }
    };

    // ═══════════════════════════════════════════════════
    //  8. PUBLIC API
    // ═══════════════════════════════════════════════════

    window.ALISA_SDK = {
        register: register,
        recorder: ALISA_RECORDER,
        leaderboard: ALISA_LEADERBOARD,
        stream: ALISA_STREAM,
        getSimName: () => _simName,
        getSessionId: () => _sessionId,
        getVertiente: () => _currentVertiente,
        setVertiente: (v) => { _currentVertiente = v; },
        VERSION: '1.1.0'
    };

    // Also expose recorder, leaderboard and stream globally for convenience
    window.ALISA_RECORDER = ALISA_RECORDER;
    window.ALISA_LEADERBOARD = ALISA_LEADERBOARD;
    window.ALISA_STREAM = ALISA_STREAM;

    console.log('[ALISA SDK] 🐟 Loaded v1.1.0 — Waiting for ALISA_SDK.register()...');

})();
