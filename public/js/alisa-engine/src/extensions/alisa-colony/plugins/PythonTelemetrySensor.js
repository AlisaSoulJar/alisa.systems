/**
 * PythonTelemetrySensor.js
 * 
 * Instead of drawing graphics directly, this module acts as the "Senses" of the ES6 world.
 * It polls the Python Hub (Tokenomics, JobBoard, Akasha, Ouroboros) and exposes
 * raw numerical values.
 * 
 * These values can then be piped into existing math engines (Boids, Resonance, etc).
 * "Aprovechar los motores que ya tenemos."
 */

export class PythonTelemetrySensor {
    /**
     * @param {Object} options
     * @param {string} [options.hubUrl='http://127.0.0.1:8741'] - Base URL for the data API
     * @param {number} [options.pollInterval=3000] - Polling interval in ms
     */
    constructor(options = {}) {
        this.hubUrl = options.hubUrl || 'http://127.0.0.1:8741';
        this.economy = {
            treasuryBalance: 1000,
            heatPulse: 0.0 // Decays over time
        };
        
        this.jobboard = {
            openJobs: 0,
            activeWorkers: 0
        };

        this.lastTreasury = -1;
        this.pollInterval = options.pollInterval || 3000;
        this.active = false;
    }

    start() {
        this.active = true;
        this.poll();
    }

    stop() {
        this.active = false;
    }

    async poll() {
        if (!this.active) return;
        
        try {
            // 1. Poll Tokenomics (Economy & Entropy)
            const res = await fetch(`${this.hubUrl}/tokenomics/portfolio/treasury`);
            if (res.ok) {
                const data = await res.json();
                const newBalance = data.neuro_dust || 0;
                
                if (this.lastTreasury !== -1 && newBalance < this.lastTreasury) {
                    // Trigger heat pulse (decayed in tick loop)
                    const diff = this.lastTreasury - newBalance;
                    this.economy.heatPulse = Math.min(1.0, this.economy.heatPulse + (diff / 50.0));
                }
                
                this.economy.treasuryBalance = newBalance;
                this.lastTreasury = newBalance;
            }

            // 2. Poll JobBoard
            const jobRes = await fetch(`${this.hubUrl}/jobboard/list`);
            if (jobRes.ok) {
                const jobData = await jobRes.json();
                if (jobData.jobs) {
                    this.jobboard.openJobs = jobData.jobs.length;
                    // Mocking active workers based on assigned status.
                    this.jobboard.activeWorkers = jobData.jobs.filter(j => j.status === 'in_progress').length;
                }
            }
        } catch (e) {
            console.warn("[PythonTelemetrySensor] Python Hub unreachable:", e.message);
        }

        setTimeout(() => this.poll(), this.pollInterval);
    }

    /**
     * Call this in the main render loop
     */
    tick(deltaTime) {
        // Decay Heat (Thermodynamics)
        if (this.economy.heatPulse > 0) {
            this.economy.heatPulse -= deltaTime * 0.5; 
            if (this.economy.heatPulse < 0) this.economy.heatPulse = 0;
        }
    }
}
