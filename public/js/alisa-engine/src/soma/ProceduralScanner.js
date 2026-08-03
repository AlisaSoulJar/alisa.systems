/**
 * ═══════════════════════════════════════════════════════════════
 * ProceduralScanner.js — The Perfect Scalpel
 * ═══════════════════════════════════════════════════════════════
 * Topological mesh scanner that acts as an "X-Ray" for 3D models.
 * Calculates cross-sectional edge loops via density frequency (1D clustering)
 * and matches them against mathematically defined biological templates.
 */

export class ProceduralScanner {
    /**
     * Evaluates a mesh's topology along a single 1D axis, attempting to 
     * find "Rings" (edge loops) by detecting peaks in vertex density.
     * 
     * @param {THREE.BufferGeometry} geometry - Raw Voxel or GLTF geometry
     * @param {Object} bounds - { minX, maxX, minY, maxY, minZ, maxZ } filtering limits
     * @param {string} axis - 'x', 'y', or 'z' axis to project onto
     * @param {number} bins - Granularity of the histogram
     * @returns {Array<number>} Absolute coordinates of detected topological rings
     */
    static scanTopologicalRings(geometry, bounds, axis = 'y', bins = 100) {
        if (!geometry || !geometry.attributes || !geometry.attributes.position) return [];
        
        const vArray = geometry.attributes.position.array;
        let points = [];
        let axisMin = Infinity;
        let axisMax = -Infinity;

        // 1. Isolate target segment vertices (e.g., right arm only)
        for(let i = 0; i < vArray.length; i+=3) {
            let x = vArray[i], y = vArray[i+1], z = vArray[i+2];
            
            if (bounds) {
                if (bounds.minX !== undefined && x < bounds.minX) continue;
                if (bounds.maxX !== undefined && x > bounds.maxX) continue;
                if (bounds.minY !== undefined && y < bounds.minY) continue;
                if (bounds.maxY !== undefined && y > bounds.maxY) continue;
                if (bounds.minZ !== undefined && z < bounds.minZ) continue;
                if (bounds.maxZ !== undefined && z > bounds.maxZ) continue;
            }
            
            let val = axis === 'x' ? x : (axis === 'y' ? y : z);
            points.push(val);
            if (val < axisMin) axisMin = val;
            if (val > axisMax) axisMax = val;
        }

        if (points.length === 0) return [];
        if (axisMin === axisMax) return [axisMin];

        // 2. Build 1D Density Histogram
        let histogram = new Array(bins).fill(0);
        points.forEach(v => {
            let norm = (v - axisMin) / (axisMax - axisMin); // 0.0 to 1.0
            let bin = Math.floor(norm * (bins - 1));
            histogram[bin]++;
        });

        // 3. Peak Detection (Local Maxima)
        let peaks = [];
        const THRESHOLD = (points.length / bins) * 0.2; // Filter ultra-low noise

        for (let i = 1; i < bins - 1; i++) {
            if (histogram[i] > histogram[i-1] && 
                histogram[i] > histogram[i+1] && 
                histogram[i] > THRESHOLD) {
                peaks.push(i / (bins - 1)); // Normalized distance
            }
        }
        
        let peakValues = peaks.map(p => axisMin + p * (axisMax - axisMin));

        // 4. Ensure anchors (Shoulder/Base and Tip/Extremity always exist)
        if(peakValues.length === 0 || Math.abs(peakValues[0] - axisMin) > ((axisMax-axisMin)*0.1)) {
            peakValues.unshift(axisMin);
        }
        if(peakValues.length === 0 || Math.abs(peakValues[peakValues.length-1] - axisMax) > ((axisMax-axisMin)*0.1)) {
            peakValues.push(axisMax);
        }

        // Sort ascending
        return peakValues.sort((a,b) => a - b);
    }

    /**
     * Takes structural mesh rings and warps a biological template to fit them optimally.
     * Discards cosmetic geometry rings.
     * 
     * @param {Array<number>} rings - Absolute positions of detected topological nodes
     * @param {Array<number>} biologicalTemplate - Normalized target positions (e.g. [0.0, 0.4, 0.8, 1.0])
     * @param {number} axisMin - Base/Root absolute value
     * @param {number} axisMax - Tip absolute value
     * @returns {Array<number>} The absolute coordinates to cast the semantic cuts at
     */
    static snapToBiologicalTemplate(rings, biologicalTemplate, axisMin, axisMax) {
        if (!rings || rings.length === 0) return biologicalTemplate.map(t => axisMin + t * (axisMax - axisMin));
        
        let snappedCuts = [];
        
        for (let targetNorm of biologicalTemplate) {
            let targetAbsolute = axisMin + targetNorm * (axisMax - axisMin);
            
            // Greedy DTW (Best-Fit)
            let closestRing = rings[0];
            let minDistance = Math.abs(targetAbsolute - closestRing);
            
            for (let ring of rings) {
                let dist = Math.abs(targetAbsolute - ring);
                if (dist < minDistance) {
                    minDistance = dist;
                    closestRing = ring;
                }
            }
            snappedCuts.push(closestRing);
        }
        
        return snappedCuts;
    }
}
