import * as THREE from 'three';

export class ProceduralItem {
    constructor() {
        this.matBase = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.75, roughness: 0.8 });
        this.matDark = new THREE.MeshStandardMaterial({ color: 0x000000, transparent: true, opacity: 0.85, roughness: 0.6 });
        this.matGlass = new THREE.MeshPhysicalMaterial({ color: 0x222222, transmission: 0.6, opacity: 0.3, transparent: true, roughness: 0.1 });
        this.matCyanNeo = new THREE.MeshStandardMaterial({ color: 0x00aaaa, transparent: true, opacity: 0.5 });
        this.matRedNeo = new THREE.MeshStandardMaterial({ color: 0xaa0000, transparent: true, opacity: 0.5 });
        this.matL3Screen = new THREE.MeshBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.8, wireframe: true });
    }

    buildItemMesh(recipe) {
        const group = new THREE.Group();
        let partCount = 0;

        for (const part of recipe) {
            let geo;
            if (part.shape === 'box') geo = new THREE.BoxGeometry(...part.size);
            else if (part.shape === 'cylinder') geo = new THREE.CylinderGeometry(...part.size);
            else if (part.shape === 'sphere') geo = new THREE.SphereGeometry(...part.size);
            else if (part.shape === 'wedge') {
                const topR = part.size[0] * 0.7071;
                const botR = part.size[1] * 0.7071;
                geo = new THREE.CylinderGeometry(topR, botR, part.size[2], 4);
                geo.rotateY(Math.PI / 4);
            }
            if (!geo) { console.warn('Unknown shape:', part.shape); continue; }

            let mat = this.matBase;
            if (part.type === 'dark') mat = this.matDark;
            else if (part.type === 'glass') mat = this.matGlass;
            else if (part.type === 'cyan_neo') mat = this.matCyanNeo;
            else if (part.type === 'red_neo') mat = this.matRedNeo;
            else if (part.type === 'l3_screen') mat = this.matL3Screen;

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(...part.pos);
            if (part.rot) mesh.rotation.set(...part.rot);
            mesh.castShadow = true;

            // Edge outlines
            const edges = new THREE.EdgesGeometry(geo);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({
                color: 0x000000, transparent: true, opacity: 0.3
            }));
            line.position.copy(mesh.position);
            line.rotation.copy(mesh.rotation);

            group.add(mesh);
            group.add(line);
            partCount++;
        }
        return { group, partCount };
    }
}
