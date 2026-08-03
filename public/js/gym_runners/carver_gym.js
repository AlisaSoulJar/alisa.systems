import { CarverSystem } from '../alisa-engine/src/world/systems/CarverSystem.js';

export async function runGymEpisode(iterations = 50, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] CarverSystem → Procedural City Generation Benchmark por ${iterations} seeds...`);

    const t0 = performance.now();
    let totalBuildings = 0;
    let totalRoadCells = 0;
    let totalSlumMazeCells = 0;
    const seedResults = [];

    for (let i = 0; i < iterations; i++) {
        // Se llamaba `CarverEngine` antes del renombrado a `…System`. El import
        // sí se actualizó; esta línea no. Como nadie ejecutaba el arnés, el
        // fallo llevaba ahí desde entonces sin que nada lo delatara.
        const engine = new CarverSystem(64, 64);
        engine.generate(i * 31337);

        let roads = 0, buildings = 0, solid = 0;
        for (let y = 0; y < 64; y++) {
            for (let x = 0; x < 64; x++) {
                const cell = engine.grid[y][x];
                if (cell === 0) roads++;
                else if (cell >= 10) buildings++;
                else solid++;
            }
        }

        totalBuildings += engine.buildings.length;
        totalRoadCells += roads;

        seedResults.push({
            seed: i * 31337,
            buildings: engine.buildings.length,
            road_cells: roads,
            building_cells: buildings,
            solid_cells: solid,
            elevation_max: Math.max(...engine.elevationGrid.flat())
        });
    }

    const t1 = performance.now();
    console.log(`[${WORKER_NAME}] Benchmark Carver completado en ${Math.round(t1 - t0)}ms.`);

    return {
        method: "Procedural City Generation (Voronoi + BSP + Braid Maze)",
        iterations,
        avg_buildings: (totalBuildings / iterations).toFixed(1),
        avg_road_cells: (totalRoadCells / iterations).toFixed(1),
        sample_seed: seedResults[0],
        sim_time_ms: t1 - t0
    };
}
