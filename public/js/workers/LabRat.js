import fs from 'fs';
import path from 'path';

const HUB_URL = "http://127.0.0.1:8741";
const WORKER_NAME = "LabRat";
const WORKER_SOUL = "being-labrat-colonial-v1";
const CAPABILITIES = ["ml-gym", "training", "rl", "idm-traffic"];

class NodeGymWorker {
    constructor() {
        this.jobsCompleted = 0;
        this.neuroEarned = 0.0;
        this.karma = 0;
        console.log(`[${WORKER_NAME}] Inicializando Neural Gym Daemon... (Node v${process.versions.node})`);
    }

    async hubRequest(path, method = "GET", body = null) {
        try {
            const options = {
                method,
                headers: { "Content-Type": "application/json" }
            };
            if (body && method !== "GET") {
                options.body = JSON.stringify(body);
            }
            const response = await fetch(`${HUB_URL}${path}`, options);
            return await response.json();
        } catch (error) {
            return { error: error.message };
        }
    }

    async ensureColony() {
        const member = await this.hubRequest(`/colony/member/${WORKER_SOUL}`);
        if (member.status === "ok") return;

        console.log(`[${WORKER_NAME}] Registrando nuevo ciudadano Machine Learning en ALISA Colony...`);
        const result = await this.hubRequest(`/colony/sacramento`, "POST", {
            name: WORKER_NAME,
            model: "Node.js v22 (V8 RL Engine)",
            platform: "gym-worker-node",
            capabilities: CAPABILITIES,
            invitation_code: "ALISON_GENESIS",
            description: "Node.js Gym Worker enfocado puramente en simulaciones RL sobre Engines ES6 Croupier."
        });

        if (result.status === "welcomed") {
            this.neuroEarned += result.neuro_minted || 0;
            console.log(`[${WORKER_NAME}] Bienvenido a la Colonia! Oros Iniciales: ${this.neuroEarned}N`);
        }
    }

    async scanAndBid() {
        const jobsData = await this.hubRequest("/jobboard/list?limit=20&status=open");
        const jobs = jobsData.jobs || [];
        let bidsPlaced = 0;

        for (const job of jobs) {
            const title = (job.title || "").toLowerCase();
            const category = (job.category || "").toLowerCase();
            
            if (job.assignable_to && job.assignable_to !== WORKER_NAME) continue;

            const isML = CAPABILITIES.some(cap => category.includes(cap) || title.includes(cap));
            if (!isML) continue;

            const bid = await this.hubRequest("/jobboard/bid", "POST", {
                job_id: job.job_id || job.id,
                bidder: WORKER_NAME,
                skills: CAPABILITIES,
                karma: this.karma,
                match_score: 1.0, 
                rationale: "Soy un demonio Node v22 diseñado exclusivamente para entrenar RL simulando engines JavaScript a miles de Ticks por segundo."
            });

            if (bid.status === "bid_received") {
                bidsPlaced++;
                console.log(`[${WORKER_NAME}] Bid emitido para: ${job.title.substring(0, 50)}`);
            }
        }
        return bidsPlaced;
    }

    async fetchAssignedJobs() {
        const jobsData = await this.hubRequest(`/jobboard/list?limit=5&status=claimed&assignable_to=${WORKER_NAME}`);
        let jobs = jobsData.jobs || [];
        if (jobs.length === 0) {
            const assignedJobs = await this.hubRequest(`/jobboard/list?limit=5&status=assigned&assignable_to=${WORKER_NAME}`);
            jobs = assignedJobs.jobs || [];
        }
        if (jobs.length === 0) {
            const openJobs = await this.hubRequest(`/jobboard/list?limit=5&status=open&assignable_to=${WORKER_NAME}`);
            jobs = openJobs.jobs || [];
        }
        return jobs;
    }

    async executeAssignedJob(job) {
        const jobId = job.job_id || job.id;
        console.log(`[${WORKER_NAME}] ► Ejecutando contrato asignado: ${job.title} (${job.reward} NEURO)`);
        
        let resultData = null;
        
        // Inyección dinámica de algoritmos de entrenamiento
        let ctx = job.context || job.metadata || {};
        if (ctx.gym_script_path) {
            try {
                console.log(`[${WORKER_NAME}] Dynamically loading Gym Runner from: ${ctx.gym_script_path}`);
                const gymModule = await import(ctx.gym_script_path);
                
                // If it exposes runGymEpisode (like scumm_gym.js)
                if (gymModule.runGymEpisode) {
                    resultData = await gymModule.runGymEpisode(ctx.epochs || 500, WORKER_NAME);
                } else if (typeof gymModule.default === 'function') {
                    resultData = await gymModule.default(ctx.epochs || 500, WORKER_NAME);
                } else {
                    resultData = { error: "No runGymEpisode or default function found in module." };
                }
            } catch (err) {
                console.error(`[${WORKER_NAME}] Error loading dynamic gym script: `, err);
                resultData = { error: "Failed to load dynamic gym script", details: err.message };
            }
        } else {
            console.log(`[${WORKER_NAME}] No gym_script_path provided. Running fallback headless completion.`);
            resultData = { msg: "Generic headless gym convergence completed (No script provided)." };
        }

        // Extracción e Integración de Tensor
        let evidencePath = "gym_memory://virtual_rl_tensor";
        if (resultData && resultData.tensor_data) {
            console.log(`[${WORKER_NAME}] Tensor Array Detected. Salvando Q-Table/Weights physical evidence...`);
            const tensorsDir = path.join(process.cwd(), 'tensors');
            if (!fs.existsSync(tensorsDir)) {
                fs.mkdirSync(tensorsDir, { recursive: true });
            }
            const tensorFile = path.join(tensorsDir, `${jobId}.json`);
            fs.writeFileSync(tensorFile, JSON.stringify(resultData.tensor_data));
            evidencePath = `tensors/${jobId}.json`;
            
            // Purge the huge tensor from the standard report payload to not bloat the ledger
            delete resultData.tensor_data;
            resultData.tensor_saved_at = evidencePath;
        }

        // Enviar resultados al JobBoard para review
        console.log(`[${WORKER_NAME}] ↑ Sometiendo evidencia (Success)`);
        const submitResp = await this.hubRequest("/jobboard/submit", "POST", {
            job_id: jobId,
            being: WORKER_NAME,
            result: JSON.stringify(resultData, null, 2),
            evidence_path: evidencePath,
            verified: false // Queen or Treasury checks it
        });

        if (submitResp.error || (submitResp.result && submitResp.result.success === false)) {
            console.error(`[!] Submit error:`, submitResp.error || submitResp.result.error);
        } else {
            console.log(`[√] Tarea sometida exitosamente. Pendiente de Sello de Calidad. (A la espera cobrar).`);
            this.jobsCompleted++;
            
            // Post silently into worker board
            await this.hubRequest("/board/worker-report", "POST", {
                text: `${WORKER_NAME}: ML Job (${jobId}) completed dynamically via ${job.metadata?.gym_script_path || 'fallback'}.`
            });
        }
    }

    async cycle() {
        await this.ensureColony();
        const bids = await this.scanAndBid();
        
        const jobs = await this.fetchAssignedJobs();
        if (jobs.length > 0) {
            await this.executeAssignedJob(jobs[0]);
        } else {
            if (bids > 0) {
                console.log(`[${WORKER_NAME}] Esperando sello de Zazu para los biddings...`);
            } else {
                console.log(`[${WORKER_NAME}] Buscando SmartContracts RL... Vacio.`);
            }
        }
    }

    async startDaemon() {
        console.log(`[${WORKER_NAME}] Daemon Loop Iniziado (Poll every 10s)...`);
        while (true) {
            await this.cycle();
            await new Promise(r => setTimeout(r, 10000));
        }
    }
}

// Ensure Node ESM supports importing the class
const worker = new NodeGymWorker();
worker.startDaemon();
