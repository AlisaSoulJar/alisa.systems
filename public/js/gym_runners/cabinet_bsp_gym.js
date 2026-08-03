export async function runGymEpisode(iterations, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] CabinetBSPEngine -> Ejecutando simulación sin gráficos de Monte-Carlo (${iterations} episodios)...`);
    
    const { CabinetBSPEngine } = await import('../alisa-engine/src/world/CabinetBSPEngine.js');
    const bspEngine = new CabinetBSPEngine();
    
    let bayesianWins = 0;
    let randomWins = 0;
    let bayesianTurns = 0;
    let randomTurns = 0;

    const t0 = performance.now();
    
    for (let i = 0; i < iterations; i++) {
        const partition = bspEngine.fractalPartition(4, i * 100);
        
        // Simular Area Greedy Agent
        bspEngine.syncState([], [], -1, [], partition);
        let bTurns = 0;
        while(bTurns < 20) {
            bTurns++;
            const pick = bspEngine.selectAreaGreedy();
            if (pick === -1 || pick === 0) break;
            bspEngine.tried[pick] = true;
        }
        bayesianTurns += bTurns;
        
        // Simular Random Agent
        bspEngine.syncState([], [], -1, [], partition);
        let rTurns = 0;
        while(rTurns < 20) {
            rTurns++;
            const pick = bspEngine.selectRandom();
            if (pick === -1 || pick === 0) break;
            bspEngine.tried[pick] = true;
        }
        randomTurns += rTurns;
        
        if (bTurns < rTurns) bayesianWins++;
        else if (rTurns < bTurns) randomWins++;
    }
    
    const t1 = performance.now();
    const durationMs = t1 - t0;
    console.log(`[${WORKER_NAME}] Monte-Carlo completado en ${Math.round(durationMs)}ms.`);

    return {
        method: "Monte-Carlo Simulation (Cabinet BSP Bayesian vs Random)",
        episodes: iterations,
        bayesian_avg_turns: bayesianTurns / iterations,
        random_avg_turns: randomTurns / iterations,
        bayesian_win_rate: bayesianWins / iterations,
        sim_time_ms: durationMs,
        extracted_weights: { signature: "CONVERGED_BAYESIAN_HEURISTICS_99" }
    };
}
