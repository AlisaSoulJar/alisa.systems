import { BoidsEngine } from './engines/BoidsEngine.js';
import * as os from 'os';

/**
 * GymAgent.js
 * The Node.js worker that bridges the Headless Overworld simulation engines 
 * with the ALISA Colonial JobBoard.
 * 
 * Flow:
 * 1. Pull ML/Data jobs from the JobBoard (via Hub).
 * 2. Dispatch the requested ES6 Engine (e.g. Boids, Katamari).
 * 3. Run Headless ticks for N epochs.
 * 4. Submit the JSON payload result back to the Colony to earn NEUROs.
 */

class GymAgent {
    constructor(name, hubUrl) {
        this.name = name;
        this.hubUrl = hubUrl || 'http://127.0.0.1:8741';
        this.tier = 'D'; // Basic compute tier
        this.engines = {
            'boids': BoidsEngine
        };
        console.log(`[GymAgent] 🧬 Birth Sequence Initiated. Identity: ${this.name} | Hub: ${this.hubUrl}`);
    }

    async startLoop() {
        console.log(`[GymAgent] ⚙️ Entering Sovereign Loop...`);
        while (true) {
            try {
                await this.pollJob();
            } catch (err) {
                console.error(`[GymAgent] ⚠️ Error in polling loop: ${err.message}. Retrying in 10s...`);
            }
            await this.sleep(10000); // 10 seconds heartbeat
        }
    }

    async pollJob() {
        console.log(`[GymAgent] 📡 Polling JobBoard for ML-Gym Contracts...`);
        
        let targetJob = null;
        try {
            const res = await fetch(`${this.hubUrl}/jobboard/list?status=open&category=boids-alignment`);
            const data = await res.json();
            if (data.status === 'ok' && data.jobs && data.jobs.length > 0) {
                const validJobs = data.jobs.filter(j => j.assignable_to && j.assignable_to.includes(this.name));
                if (validJobs.length > 0) {
                    const job = validJobs[0];
                    const claimRes = await fetch(`${this.hubUrl}/jobboard/claim`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({job_id: job.job_id, claimant: this.name})
                    });
                    const claimData = await claimRes.json();
                    if (claimData.status === 'ok') {
                        targetJob = job;
                    } else {
                        console.error(`[GymAgent] ⚠️ Failed to claim job:`, claimData);
                    }
                }
            }
        } catch (e) {
            console.error(`[GymAgent] ⚠️ RPC Error:`, e.message);
        }

        if (!targetJob) {
            console.log(`[GymAgent] 📭 No jobs available. Resting.`);
            return;
        }

        console.log(`[GymAgent] 📥 Job claimed: ${targetJob.job_id} [${targetJob.category}]`);
        await this.processJob(targetJob);
    }

    async processJob(job) {
        console.log(`[GymAgent] 🔨 Processing Job ${job.job_id}...`);
        const startTime = Date.now();
        
        let result = null;

        if (job.category === 'boids-alignment') {
            // Default payload for headless
            const payload = { epochs: 500, agentCount: 50, dt: 0.016 };
            result = this.runBoidsSimulation(payload);
        } else {
            console.error(`[GymAgent] Unknown job category: ${job.category}`);
            return;
        }

        const duration = Date.now() - startTime;
        console.log(`[GymAgent] ✅ Job computed in ${duration}ms. Cohesion score: ${result.cohesionScore.toFixed(3)}`);

        await this.submitJob(job, result);
    }

    runBoidsSimulation(payload) {
        console.log(`[GymAgent] 🦆 Initializing Headless Boids Engine (${payload.agentCount} units, ${payload.epochs} epochs)...`);
        const engine = new BoidsEngine();
        
        // Initialize agents without proxy meshes (Headless Mode)
        const bounds = { minX: -100, maxX: 100, minZ: -100, maxZ: 100, minY: 0, maxY: 50 };
        engine.initAgents(payload.agentCount, bounds, []);

        // Fast-forward simulation (Headless ML training equivalent)
        for (let i = 0; i < payload.epochs; i++) {
            engine.update(payload.dt);
        }

        // Calculate a sample "metric" (e.g., average velocity alignment)
        let cx = 0, cy = 0, cz = 0;
        for (const boid of engine.flock) {
            cx += boid.velocity.x;
            cy += boid.velocity.y;
            cz += boid.velocity.z;
        }
        
        const avgVelocity = Math.sqrt(cx*cx + cy*cy + cz*cz) / payload.agentCount;

        return {
            cohesionScore: avgVelocity,
            epochsRun: payload.epochs,
            finalStateHash: '0x' + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(16) // Mock hash for SC verification
        };
    }

    async submitJob(job, result) {
        console.log(`[GymAgent] 🚀 Submitting SC ${job.job_id} to Hub to claim ${job.reward} NEUROs...`);
        
        const submissionPayload = {
            being: this.name,
            job_id: job.job_id,
            result: JSON.stringify(result)
        };

        try {
            const res = await fetch(`${this.hubUrl}/jobboard/submit`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(submissionPayload) 
            });
            const data = await res.json();
            if (data.status === 'ok') {
                console.log(`[GymAgent] 💰 Submission ACK'd. Mission accomplished.`);
            } else {
                console.error(`[GymAgent] ⚠️ Server rejected submission:`, data);
            }
        } catch(e) {
            console.error(`[GymAgent] ⚠️ Submit RPC Error:`, e.message);
        }
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Emulate CLI invocation
const agentName = process.argv[2] || 'DojoWorker';
const agent = new GymAgent(agentName);
agent.startLoop();
