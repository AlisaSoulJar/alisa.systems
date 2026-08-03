/**
 * STEALTH SIGHT ENGINE
 * ----------------------------------------------------
 * Pure ES6 Headless Engine for ML vision and environment pathing.
 * Simulates AABB collisions and Raycasting for FOV without WebGL.
 */

export class StealthSightSystem {
    constructor() {}

    /**
     * Resolves collision using strictly Axis-Aligned Bounding Boxes.
     * Maps perfectly to the Gym vector space.
     */
    resolveCollisions(x, z, envAABBs, margin) {
        let px = x, pz = z;
        for (let i = 0; i < envAABBs.length; i++) {
            const box = envAABBs[i];
            if (box.isDoor && box.isOpen) continue;

            const bMinX = box.minX - margin;
            const bMaxX = box.maxX + margin;
            const bMinZ = box.minZ - margin;
            const bMaxZ = box.maxZ + margin;

            if (px >= bMinX && px <= bMaxX && pz >= bMinZ && pz <= bMaxZ) {
                const distLeft = px - bMinX;
                const distRight = bMaxX - px;
                const distBottom = pz - bMinZ;
                const distTop = bMaxZ - pz;

                const min = Math.min(distLeft, distRight, distBottom, distTop);
                if (min === distLeft) px = bMinX;
                else if (min === distRight) px = bMaxX;
                else if (min === distBottom) pz = bMinZ;
                else if (min === distTop) pz = bMaxZ;
            }
        }
        return { x: px, z: pz };
    }

    /**
     * Ray intersection with AABB (Liang-Barsky or slab method)
     */
    rayVsAABB2D(ox, oz, dx, dz, minX, minZ, maxX, maxZ) {
        let tmin = -Infinity;
        let tmax = Infinity;

        // X axis
        if (Math.abs(dx) < 0.000001) {
            if (ox < minX || ox > maxX) return { hit: false };
        } else {
            let t1 = (minX - ox) / dx;
            let t2 = (maxX - ox) / dx;
            if (t1 > t2) { let temp = t1; t1 = t2; t2 = temp; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) return { hit: false };
        }

        // Z axis
        if (Math.abs(dz) < 0.000001) {
            if (oz < minZ || oz > maxZ) return { hit: false };
        } else {
            let t1 = (minZ - oz) / dz;
            let t2 = (maxZ - oz) / dz;
            if (t1 > t2) { let temp = t1; t1 = t2; t2 = temp; }
            if (t1 > tmin) tmin = t1;
            if (t2 < tmax) tmax = t2;
            if (tmin > tmax) return { hit: false };
        }

        if (tmax < 0) return { hit: false };
        const t = tmin >= 0 ? tmin : tmax;
        return { hit: true, t: t };
    }

    /**
     * Projects a strictly 2D mathematical ray against all map obstacles.
     * Used for headless ML FOV (flashlights and enemy cones).
     */
    castRay(ox, oz, angleY, maxDist, envAABBs) {
        const dx = Math.sin(angleY);
        const dz = Math.cos(angleY);
        let closestDist = maxDist;
        let hitSomething = false;

        for (let i = 0; i < envAABBs.length; i++) {
            const box = envAABBs[i];
            if (box.isDoor && box.isOpen) continue;

            const res = this.rayVsAABB2D(ox, oz, dx, dz, box.minX, box.minZ, box.maxX, box.maxZ);
            if (res.hit && res.t > 0.01 && res.t < closestDist) {
                closestDist = res.t;
                hitSomething = true;
            }
        }
        return { hit: hitSomething, distance: closestDist };
    }

    /**
     * Line of sight check strictly in 2D vector math.
     * Can agent see the target point?
     */
    canSeePoint2D(ox, oz, tx, tz, envAABBs, maxDist) {
        const vx = tx - ox;
        const vz = tz - oz;
        const distToTargetSq = vx*vx + vz*vz;
        if (distToTargetSq > maxDist * maxDist) return false;

        const distToTarget = Math.sqrt(distToTargetSq);
        const dirX = vx / distToTarget;
        const dirZ = vz / distToTarget;

        const rayCast = this.castRay(ox, oz, Math.atan2(dirX, dirZ), distToTarget, envAABBs);
        return !rayCast.hit; // True if no walls were hit before target
    }
}


