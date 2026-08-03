import * as THREE from 'three';
import { ProceduralRigging } from './ProceduralRigging.js';

/**
 * [Pygmalion Engine] 🗿🔪
 * The Sculptor and 7-Axis Mathematical Tomographer
 * 
 * Responsibilities:
 * 1. Takes the normalized Katamari-scale BaseMesh.
 * 2. Voxelizes it into unique point density clusters.
 * 3. Extracts morphological planar rings using Graham Scan Convex Hulls.
 * 4. Passes the topographic mapping to ProceduralRigging to inject the biological skeleton.
 */
export class PygmalionEngine {

    /**
     * Voxelizes the continuous mesh into density points for mathematical analysis.
     * @param {THREE.Group} baseMesh 
     * @returns {Object} { proceduralCopyGroup, uniquePoints, allPts }
     */
    static voxelize(baseMesh) {
        console.log(`[PygmalionEngine] 🧊 Voxelizing base mesh...`);
        const proceduralCopy = new THREE.Group();
        const boxGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
        const solidMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, roughness: 0.2 });
        const uniquePoints = {};

        baseMesh.updateWorldMatrix(true, true);
        
        baseMesh.traverse(c => {
            if (c.isMesh && c.geometry) {
                let geom = c.geometry.clone();
                geom.applyMatrix4(c.matrixWorld);

                const pos = geom.attributes.position.array;

                for (let i = 0; i < pos.length; i += 3) {
                    const px = Math.round(pos[i] * 1000) / 1000;
                    const py = Math.round(pos[i + 1] * 100) / 100; // Round Y to 2 decimals to group planes
                    const pz = Math.round(pos[i + 2] * 1000) / 1000;
                    const key = `${px}_${py}_${pz}`;

                    if (!uniquePoints[key]) {
                        const voxel = new THREE.Mesh(boxGeo, solidMat);
                        voxel.position.set(pos[i], pos[i + 1], pos[i + 2]);
                        proceduralCopy.add(voxel);
                        uniquePoints[key] = { x: pos[i], y: py, z: pos[i + 2], rawY: pos[i + 1] };
                    }
                }
            }
        });

        const allPts = Object.values(uniquePoints).map(p => ({
            vec: new THREE.Vector3(p.x, p.y, p.z),
            x: p.x, y: p.y, z: p.z
        }));
        
        console.log(`[PygmalionEngine] 🧊 ${Object.keys(uniquePoints).length} unique points → ${allPts.length} voxel entries`);
        return { proceduralCopy, uniquePoints, allPts };
    }

    /**
     * Generates convex polygon planar hulls around clusters of voxels.
     * Graham Scan Algorithm.
     */
    static _createConvexPolygonGeometry(points, center, normal) {
        if (points.length < 3) return new THREE.PlaneGeometry(0.1, 0.1);
        
        let uVec;
        if (Math.abs(normal.x) > 0.5) {
            uVec = new THREE.Vector3(0, 1, 0).cross(normal).normalize();
        } else {
            uVec = new THREE.Vector3(1, 0, 0).cross(normal).normalize();
        }
        const vVec = normal.clone().cross(uVec).normalize();

        const projected = points.map(p => {
            const d = p.clone().sub(center);
            return { p: p, u: d.dot(uVec), v: d.dot(vVec) };
        });

        let pivot = projected[0];
        for (let i = 1; i < projected.length; i++) {
            if (projected[i].v < pivot.v || (projected[i].v === pivot.v && projected[i].u < pivot.u)) {
                pivot = projected[i];
            }
        }

        projected.sort((a, b) => {
            if (a === pivot) return -1;
            if (b === pivot) return 1;
            const t1 = Math.atan2(a.v - pivot.v, a.u - pivot.u);
            const t2 = Math.atan2(b.v - pivot.v, b.u - pivot.u);
            if (t1 !== t2) return t1 - t2;
            const d1 = (a.u - pivot.u)**2 + (a.v - pivot.v)**2;
            const d2 = (b.u - pivot.u)**2 + (b.v - pivot.v)**2;
            return d1 - d2;
        });

        const hull = [];
        for (let i = 0; i < projected.length; i++) {
            const pt = projected[i];
            while (hull.length >= 2) {
                const last = hull[hull.length - 1];
                const prev = hull[hull.length - 2];
                const cross = (last.u - prev.u) * (pt.v - prev.v) - (last.v - prev.v) * (pt.u - prev.u);
                if (cross <= 0) { 
                    hull.pop();
                } else {
                    break;
                }
            }
            hull.push(pt);
        }

        const vertices = [];
        const indices = [];

        hull.forEach(item => { vertices.push(item.p.x, item.p.y, item.p.z); });

        const N = hull.length;
        if (N < 3) return new THREE.PlaneGeometry(0.1, 0.1);

        for (let i = 1; i < N - 1; i++) {
            indices.push(0, i, i + 1);
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geo.setIndex(indices);
        geo.computeVertexNormals();
        return geo;
    }

    /**
     * Executes the direct mathematically deterministic Ring Extractor on a specific axis.
     */
    static _createRingSlices(points, axisNormal, color, group, axisName, targetSize, detectedSlicesOut) {
        axisNormal.normalize();
        const bins = {};
        const tol = targetSize * 0.05; 
        points.forEach(p => {
            const val = p.vec.dot(axisNormal);
            const bin = Math.round(val / tol) * tol;
            const key = bin.toFixed(3);
            if (!bins[key]) bins[key] = [];
            bins[key].push(p);
        });

        Object.values(bins).forEach(binPts => {
            if (binPts.length >= 1) { 
                const clusters = [];
                const visited = new Set();
                const maxDistSq = (targetSize * 0.1) ** 2; 

                for (let i = 0; i < binPts.length; i++) {
                    if (visited.has(i)) continue;
                    const cluster = [];
                    const queue = [i];
                    visited.add(i);
                    
                    while(queue.length > 0) {
                        const currIdx = queue.shift();
                        cluster.push(binPts[currIdx]);
                        
                        for (let j = 0; j < binPts.length; j++) {
                            if (visited.has(j)) continue;
                            if (binPts[currIdx].vec.distanceToSquared(binPts[j].vec) <= maxDistSq) {
                                visited.add(j);
                                queue.push(j);
                            }
                        }
                    }
                    if (cluster.length >= 1) clusters.push(cluster);
                }
                
                clusters.forEach(clusterPts => {
                    let centroid = new THREE.Vector3();
                    clusterPts.forEach(p => centroid.add(p.vec));
                    centroid.divideScalar(clusterPts.length);
                    
                    let maxDistSqToCentroid = 0;
                    clusterPts.forEach(p => {
                        const dsq = p.vec.distanceToSquared(centroid);
                        if (dsq > maxDistSqToCentroid) maxDistSqToCentroid = dsq;
                    });
                    const spread = Math.sqrt(maxDistSqToCentroid) * 2;
                    
                    if (spread >= 0) {
                        const ptsVecs = clusterPts.map(pt => pt.vec);
                        const planeGeo = this._createConvexPolygonGeometry(ptsVecs, centroid, axisNormal);
                        const planeMat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
                        const plane = new THREE.Mesh(planeGeo, planeMat);
                        group.add(plane);
                        
                        const sliceDef = {
                            center: centroid,
                            axis: axisName,
                            normal: axisNormal.clone(),
                            spread: spread,
                            meshRef: plane,
                            baseColor: color,
                            neons: []
                        };
                        detectedSlicesOut.push(sliceDef);

                        clusterPts.forEach(p => {
                            const highlight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0xccff00, depthTest: false }));
                            highlight.position.copy(p.vec);
                            group.add(highlight);
                            sliceDef.neons.push(highlight);
                        });
                    }
                });
            }
        });
    }

    /**
     * Executes the full 7-Axis Mathematical Tomography to map morphological sections.
     */
    static performTomography(allPts, targetSize, renderGroup) {
        console.log(`[PygmalionEngine] 🔪 Performing 7-Axis Mathematical Tomography...`);
        const detectedSlices = [];
        
        const visGroupY = new THREE.Group();
        const visGroupZ = new THREE.Group();
        const visGroupRing = new THREE.Group();
        const visGroupSpine = new THREE.Group();
        
        renderGroup.add(visGroupY);
        renderGroup.add(visGroupZ);
        renderGroup.add(visGroupRing);
        renderGroup.add(visGroupSpine);

        this._createRingSlices(allPts, new THREE.Vector3(0,1,0), 0xff00bb, visGroupY, 'y', targetSize, detectedSlices);
        this._createRingSlices(allPts, new THREE.Vector3(0,0,1), 0x00ffaa, visGroupZ, 'z', targetSize, detectedSlices);
        this._createRingSlices(allPts, new THREE.Vector3(1,0,0), 0x00ddff, visGroupRing, 'x', targetSize, detectedSlices);
        
        this._createRingSlices(allPts, new THREE.Vector3(0, 1, 1), 0xffaa00, visGroupSpine, 'Inclined', targetSize, detectedSlices);
        this._createRingSlices(allPts, new THREE.Vector3(0, 1, -1), 0xffaa00, visGroupSpine, 'Inclined', targetSize, detectedSlices);
        this._createRingSlices(allPts, new THREE.Vector3(1, 1, 0), 0xddaa00, visGroupSpine, 'Inclined', targetSize, detectedSlices);
        this._createRingSlices(allPts, new THREE.Vector3(1, -1, 0), 0xddaa00, visGroupSpine, 'Inclined', targetSize, detectedSlices);

        console.log(`[PygmalionEngine] 🔪 Captured ${detectedSlices.length} total morphological rings.`);
        return { 
            detectedSlices, 
            groups: { visGroupY, visGroupZ, visGroupRing, visGroupSpine } 
        };
    }

    /**
     * Extracts the topological Minimum Spanning Tree (MST) from raw slices.
     * This filters out cosmetic noise and generates structural 'essential' slices.
     */
    static generateMST(slices) {
        let treeEdges = []; 
        if (slices.length > 1) {
            const unvisited = new Set(slices);
            const current = unvisited.values().next().value;
            unvisited.delete(current);
            const visitedNodes = [current];

            while (unvisited.size > 0) {
                let bestDist = Infinity;
                let bestPair = null;
                
                visitedNodes.forEach(v => {
                    unvisited.forEach(u => {
                        const dist = v.center.distanceTo(u.center);
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestPair = { v, u };
                        }
                    });
                });
                
                treeEdges.push(bestPair);
                unvisited.delete(bestPair.u);
                visitedNodes.push(bestPair.u);
            }
        }

        const essentialSet = new Set();
        treeEdges.forEach(e => {
            if (e.u) essentialSet.add(e.u);
            if (e.v) essentialSet.add(e.v);
        });
        
        return {
            edges: treeEdges,
            essentialSlices: Array.from(essentialSet)
        };
    }

    /**
     * Orchestrates the final skeleton assembly using ProceduralRigging.
     */
    static sculptSkeleton(detectedSlices, activeSkeletonType, meshSize) {
        console.log(`[PygmalionEngine] 🗿 Sculpting skeleton type "${activeSkeletonType}" over ${detectedSlices.length} slices...`);
        let generatedBonesMap = {};
        
        if (ProceduralRigging.buildArchetypeSkeleton) {
            generatedBonesMap = ProceduralRigging.buildArchetypeSkeleton(detectedSlices, activeSkeletonType, meshSize);
        } else {
            console.error("[PygmalionEngine] ProceduralRigging missing buildArchetypeSkeleton!");
        }

        return generatedBonesMap;
    }
}
