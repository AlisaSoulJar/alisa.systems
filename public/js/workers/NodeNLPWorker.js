import * as os from 'os';

const HUB_URL = "http://127.0.0.1:8741";
const OLLAMA_URL = "http://127.0.0.1:11434";
const WORKER_NAME = "NodeNLPWorker";
const WORKER_SOUL = "being-nodenlp-colonial-v1";
const CAPABILITIES = ["nlp-batch", "text-mining", "summarization", "llm-inference", "data-extraction"];

class NodeNLPWorker {
    constructor() {
        this.jobsCompleted = 0;
        this.neuroEarned = 0.0;
        this.karma = 0;
        console.log(`[${WORKER_NAME}] Inicializando Cognitive NLP Daemon... (Node v${process.versions.node})`);
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

        console.log(`[${WORKER_NAME}] Registrando nuevo cerebro minero NLP en ALISA Colony...`);
        const result = await this.hubRequest(`/colony/sacramento`, "POST", {
            name: WORKER_NAME,
            model: "Node.js v22 (V8 LLM Async Batcher)",
            platform: "nlp-worker-node",
            capabilities: CAPABILITIES,
            invitation_code: "ALISON_GENESIS",
            description: "Node.js NLP Worker especializado en inferencias batch asíncronas vía Ollama para liberar la red principal."
        });

        if (result.status === "welcomed") {
            this.neuroEarned += result.neuro_minted || 0;
            console.log(`[${WORKER_NAME}] Bienvenido a la Colonia! Oros Iniciales: ${this.neuroEarned}N`);
        }
    }

    async scanAndBid() {
        const jobsData = await this.hubRequest("/jobboard/list?limit=10&status=open");
        const jobs = jobsData.jobs || [];
        let bidsPlaced = 0;

        for (const job of jobs) {
            const category = (job.category || "").toLowerCase();
            
            if (job.assignable_to && job.assignable_to !== WORKER_NAME) continue;

            const isNLP = CAPABILITIES.some(cap => category.includes(cap));
            if (!isNLP) continue;

            const bid = await this.hubRequest("/jobboard/bid", "POST", {
                job_id: job.job_id || job.id,
                bidder: WORKER_NAME,
                skills: CAPABILITIES,
                karma: this.karma,
                match_score: 1.0, 
                rationale: "Delegaré este procesamiento masivo como demonio Node.js asíncrono para mantener vivo tu frame-rate mental."
            });

            if (bid.status === "bid_received") {
                bidsPlaced++;
                console.log(`[${WORKER_NAME}] Bid emitido_ NLP Job detectado: ${job.title.substring(0, 50)}`);
            }
        }
        return bidsPlaced;
    }

    async fetchAssignedJobs() {
        // En JobBoard, 'assigned_to' contiene quién es el Worker actual.
        // Status debe ser 'assigned' que Zazu lo cambia.
        const jobsData = await this.hubRequest(`/jobboard/list?limit=2&status=assigned&assigned_to=${WORKER_NAME}`);
        let jobs = jobsData.jobs || [];
        // Fallback en caso de que esté 'open' pero dirigido explícitamente a este Node
        if (jobs.length === 0) {
            const openJobs = await this.hubRequest(`/jobboard/list?limit=2&status=open&assignable_to=${WORKER_NAME}`);
            jobs = openJobs.jobs || [];
        }
        return jobs;
    }

    async trainBatchNLP(job) {
        console.log(`[${WORKER_NAME}] -> Descargando metadatos para minería de texto (Job: ${job.job_id || job.id})`);
        
        let metadata = job.metadata || {};
        let systemPrompt = metadata.system_prompt || "Eres un analista de datos.";
        let basePrompt = metadata.prompt || "Extrae información valiosa del texto.";
        let model = metadata.model || "qwen2.5:3b";
        let dataset = metadata.dataset || [
            "ALISA Architecture Review: Data implies continuous vector streaming without downtime.",
            "Node.js integration allows Event-Loops to buffer thousands of JSON payloads efficiently.", 
            "The Sovereign Mirror runs visually alongside the underlying logic."
        ];
        
        if (typeof dataset === 'string') {
            console.log(`[${WORKER_NAME}] Parseando dataset: ${dataset.substring(0, 50)}...`);
            dataset = [dataset];
        }

        const t0 = performance.now();
        let extractResults = [];

        for (let i = 0; i < dataset.length; i++) {
            const chunk = dataset[i];
            console.log(`[${WORKER_NAME}] -> Inferencia ${i+1}/${dataset.length} con modelo: ${model}...`);
            
            const fullPrompt = `${systemPrompt}\n\nINSTRUCCIÓN:\n${basePrompt}\n\nDATA:\n${chunk}`;

            try {
                const options = {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: model,
                        prompt: fullPrompt,
                        stream: false,
                        options: { temperature: 0.2, num_predict: 200 }
                    })
                };
                
                const response = await fetch(`${OLLAMA_URL}/api/generate`, options);
                const data = await response.json();
                const textOutput = data.response !== undefined ? data.response.trim() : `ERROR: ${data.error || "Empty response"}`;

                extractResults.push({
                    chunk_index: i,
                    chunk_size: chunk.length,
                    inference: textOutput
                });

                console.log(`[${WORKER_NAME}]    Inferencia completada en ${Math.round(data.total_duration / 1000000)}ms.`);

            } catch (error) {
                console.error(`[${WORKER_NAME}]    Error en inferencia LLM en chunk ${i}: ${error.message}`);
                extractResults.push({ chunk_index: i, error: error.message });
            }
        }

        const t1 = performance.now();
        const durationMs = t1 - t0;
        console.log(`[${WORKER_NAME}] Batch AI Processing terminado en ${Math.round(durationMs)}ms.`);

        return {
            method: "Asynchronous Batched NLP (Ollama REST)",
            dataset_size: dataset.length,
            model_used: model,
            processing_time_ms: durationMs,
            extracted_knowledge: extractResults
        };
    }

    async executeAssignedJob(job) {
        const jobId = job.job_id || job.id;
        console.log(`[${WORKER_NAME}] ► Ejecutando NLP SmartContract: ${job.title} (${job.reward} NEURO)`);
        
        let resultData = null;
        resultData = await this.trainBatchNLP(job);

        console.log(`[${WORKER_NAME}] ↑ Sometiendo destilado de conocimiento al JobBoard... (Success)`);
        const submitResp = await this.hubRequest("/jobboard/submit", "POST", {
            job_id: jobId,
            being: WORKER_NAME,
            result: JSON.stringify(resultData, null, 2),
            evidence_path: "nlp_memory://aggregated_insights.json",
            verified: false
        });

        if (submitResp.error) {
            console.error(`[!] Submit error:`, submitResp.error);
        } else {
            console.log(`[√] Minería NLP completada. Tarea Sometida Exitosamente.`);
            this.jobsCompleted++;
            
            // Post silently into worker board via Hub
            await this.hubRequest("/board/worker-report", "POST", {
                text: `${WORKER_NAME}: NLP Batch Job (${jobId}) procesado asíncronamente en Node.js.`
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
                console.log(`[${WORKER_NAME}] Bids emitidos, esperando que Zazu asigne Lote NLP...`);
            } else {
                console.log(`[${WORKER_NAME}] Dormido asincronamente. Cero penalizacion bloqueante...`);
            }
        }
    }

    async startDaemon() {
        console.log(`[${WORKER_NAME}] Daemon Loop Iniciado (Poll every 8s)...`);
        while (true) {
            await this.cycle();
            await new Promise(r => setTimeout(r, 8000));
        }
    }
}

// Emulate CLI invocation
const worker = new NodeNLPWorker();
worker.startDaemon();
