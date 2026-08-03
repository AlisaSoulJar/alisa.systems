import { OrbitalKinematicsSystem } from '../alisa-engine/src/world/systems/OrbitalKinematicsSystem.js';

export async function runGymEpisode(ticks = 2000, WORKER_NAME = "LabRat") {
    console.log(`[${WORKER_NAME}] OrbitalKinematicsSystem → Cinemática Orbital Headless por ${ticks} ticks...`);

    const engine = new OrbitalKinematicsSystem({ arenaW: 120, arenaH: 60 });

    // Generar campo de asteroides
    let asteroids = Array.from({ length: 20 }, (_, i) => ({
        id: `ast_${i}`,
        x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 40, z: Math.random() * 150,
        vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 2, vz: 10 + Math.random() * 15,
        rx: 0, ry: 0, rz: 0,
        rvx: Math.random() * 2, rvy: Math.random() * 2, rvz: Math.random(),
        radius: 1.5 + Math.random() * 3,
        isMono: Math.random() > 0.85,
        isPiston: false,
        pingPongMinX: -50, pingPongMaxX: 50,
        gc: false
    }));

    // Generar enemigos de diferentes tipos
    const enemyTypes = ['LINER', 'POPCORN', 'SWOOPER', 'TRACKER', 'CHARGER', 'SNIPER', 'BOMBER', 'MIRROR'];
    let enemies = Array.from({ length: 10 }, (_, i) => ({
        id: `enemy_${i}`,
        t: enemyTypes[i % enemyTypes.length],
        x: (Math.random() - 0.5) * 80, y: (Math.random() - 0.5) * 30, z: 60 + Math.random() * 80,
        vx: 0, vy: 0,
        sp: 15 + Math.random() * 10,
        hp: 20 + Math.random() * 30,
        rx: 0, ry: 0, rz: 0,
        sinePhase: Math.random() * 6.28, sineAmp: 8 + Math.random() * 5,
        enterSide: Math.random() > 0.5 ? 1 : -1,
        fireRate: 2 + Math.random() * 3,
        fireT: Math.random() * 3,
        chargeState: 'approach', windupTimer: 0, tx: 0, ty: 0,
        mineTimer: 3, spawnCount: 0,
        gc: false
    }));

    let shipState = { x: 0, y: 0, z: 0, dead: false, inNebula: false, rz: 0, rx: 0 };

    let bullets = [];
    let globalZ = 0;
    const dt = 0.016;
    const t0 = performance.now();
    let gcAsteroids = 0, gcEnemies = 0;

    for (let t = 0; t < ticks; t++) {
        globalZ += 20 * dt;
        const statsTime = t * dt;

        engine.tickAsteroids(asteroids, dt, globalZ);
        engine.tickEnemies(enemies, dt, globalZ, statsTime, shipState, asteroids);
        engine.tickProjectiles(bullets, dt, globalZ);

        // GC
        const preA = asteroids.length;
        asteroids = asteroids.filter(a => !a.gc);
        gcAsteroids += preA - asteroids.length;

        const preE = enemies.length;
        enemies = enemies.filter(e => !e.gc);
        gcEnemies += preE - enemies.length;

        bullets = bullets.filter(b => !b.gc);

        // Respawn si todo fue recolectado
        if (asteroids.length < 5) {
            for (let i = 0; i < 8; i++) {
                asteroids.push({
                    id: `ast_r_${t}_${i}`, x: (Math.random() - 0.5) * 100, y: (Math.random() - 0.5) * 40,
                    z: globalZ + 80 + Math.random() * 60, vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 2, vz: 10 + Math.random() * 15,
                    rx: 0, ry: 0, rz: 0, rvx: Math.random(), rvy: Math.random(), rvz: Math.random(),
                    radius: 1.5 + Math.random() * 3, isMono: false, isPiston: false,
                    pingPongMinX: -50, pingPongMaxX: 50, gc: false
                });
            }
        }
    }

    const t1 = performance.now();
    console.log(`[${WORKER_NAME}] Simulación Orbital completada en ${Math.round(t1 - t0)}ms.`);

    return {
        method: "Orbital Kinematics (Asteroids, Enemies, Projectiles)",
        ticks,
        gc_asteroids: gcAsteroids,
        gc_enemies: gcEnemies,
        remaining_asteroids: asteroids.length,
        remaining_enemies: enemies.length,
        final_globalZ: globalZ,
        sim_time_ms: t1 - t0
    };
}
