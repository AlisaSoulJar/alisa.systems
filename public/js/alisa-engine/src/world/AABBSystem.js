// AABBSystem.js - Universal Headless Axis-Aligned Bounding Box Math

export class AABBSystem {
    
    /**
     * Checks if a point is inside a box bounded by min and max coords
     */
    static pointInBox(px, py, pz, bMinX, bMaxX, bMinY, bMaxY, bMinZ, bMaxZ) {
        return (px >= bMinX && px <= bMaxX && 
                py >= bMinY && py <= bMaxY && 
                pz >= bMinZ && pz <= bMaxZ);
    }

    /**
     * Standard 3D AABB Intersection
     */
    static intersects(boxA, boxB) {
        return (boxA.minX <= boxB.maxX && boxA.maxX >= boxB.minX) &&
               (boxA.minY <= boxB.maxY && boxA.maxY >= boxB.minY) &&
               (boxA.minZ <= boxB.maxZ && boxA.maxZ >= boxB.minZ);
    }

    /**
     * Resolves collision between a moving entity and a static box.
     * Returns modified velocity vector to slide/bounce against the wall.
     */
    static resolveWallDeflection(px, py, pz, vx, vy, vz, box, bounceRestitution = -1.0) {
        let nvx = vx;
        let nvy = vy;
        let nvz = vz;
        
        // Simple bounding box limit logic
        if (px < box.minX || px > box.maxX) nvx *= bounceRestitution;
        if (py < box.minY || py > box.maxY) nvy *= bounceRestitution;
        if (pz < box.minZ || pz > box.maxZ) nvz *= bounceRestitution;
        
        return { x: nvx, y: nvy, z: nvz };
    }
}
