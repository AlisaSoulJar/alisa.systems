import { HubClient } from '../utils/HubClient.js';

export class HubCartographerSystem {
    constructor(currentDomain = 'ALISA') {
        this.currentDomain = currentDomain;
        this.availableDomains = [];
        this.onStateUpdate = null; // Callback assigned by Main Engine
        this.onError = null;
        this.targetEntityId = null;
    }

    async pollState() {
        const data = await HubClient.get(`/overworld/state?domain=${this.currentDomain}`);
        if (!data) {
            if (this.onError) this.onError(new Error('Hub unreachable'));
            return;
        }

        let state;
        if (data.domains) {
            // Legacy fallback
            state = data.domains[this.currentDomain];
            if (!state) {
                console.warn("[HubCartographerSystem] Domain not found in state:", this.currentDomain);
                return;
            }
        } else {
            state = data;
        }
        
        if (data.available_domains) {
            this.availableDomains = data.available_domains;
        }

        if (this.onStateUpdate) {
            this.onStateUpdate(state);
        }
    }

    changeDomain(newDomain) {
        if (!newDomain) return;
        this.currentDomain = newDomain;
        console.log(`[HubCartographerSystem] Navigating to domain: ${newDomain}`);
        this.pollState(); // Immediate fetch on change
    }
}
