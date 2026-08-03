export class TelemetryBridge {
    constructor(apiBaseUrl, wsBaseUrl) {
        this.apiBaseUrl = apiBaseUrl;
        this.wsBaseUrl = wsBaseUrl;
        this.luaSource = null;
        this.scummSource = null;
        this.worldBridgeWs = null;

        // Callbacks
        this.onLuaEvent = null;
        this.onScummEvent = null;
    }

    connectLuaStream() {
        if (this.luaSource) this.luaSource.close();
        this.luaSource = new EventSource(`${this.apiBaseUrl}/lua/stream?surface=overworld`);
        
        this.luaSource.onopen = () => {
            console.log('[TelemetryBridge] Connected to LUA event stream.');
        };
        
        this.luaSource.onmessage = (event) => {
            if (this.onLuaEvent) {
                this.onLuaEvent(event.data);
            }
        };
        
        this.luaSource.onerror = (err) => {
            console.error('[TelemetryBridge] LUA stream error:', err);
            this.luaSource.close();
            setTimeout(() => this.connectLuaStream(), 5000);
        };
    }

    connectScummStream() {
        if (this.scummSource) this.scummSource.close();
        this.scummSource = new EventSource(`${this.apiBaseUrl}/scumm/stream`);
        
        this.scummSource.onopen = () => {
            console.log('[TelemetryBridge] Connected to SCUMM Drama stream.');
        };
        
        this.scummSource.onmessage = (event) => {
            if (this.onScummEvent) {
                try {
                    const data = JSON.parse(event.data);
                    this.onScummEvent(data);
                } catch (e) {
                    console.error('[TelemetryBridge] Failed to parse SCUMM Drama data:', e);
                }
            }
        };
        
        this.scummSource.onerror = (err) => {
            console.error('[TelemetryBridge] SCUMM stream error:', err);
            this.scummSource.close();
            setTimeout(() => this.connectScummStream(), 5000);
        };
    }

    connectWorldBridgeWs() {
        this.worldBridgeWs = new WebSocket(`ws://${this.wsBaseUrl}:8765`);
        this.worldBridgeWs.onopen = () => {
            console.log('[TelemetryBridge] Connected to WorldBridge WS.');
        };
        this.worldBridgeWs.onmessage = (evt) => {
            console.log("[TelemetryBridge WS] < ", evt.data);
            if (this.onLuaEvent) {
                this.onLuaEvent(`[WS] ${evt.data}`);
            }
        };
        this.worldBridgeWs.onclose = () => {
            console.warn('[TelemetryBridge] WorldBridge WS closed. Reconnecting in 5s...');
            setTimeout(() => this.connectWorldBridgeWs(), 5000);
        };
        this.worldBridgeWs.onerror = (err) => {
            console.error('[TelemetryBridge] WorldBridge WS error:', err);
            this.worldBridgeWs.close();
        };
    }

    connectAll() {
        this.connectLuaStream();
        this.connectScummStream();
        this.connectWorldBridgeWs();
    }
}
