/**
 * CrossSectionDrawTool.js
 * ═══════════════════════════════════════════════════════════════
 * Reusable tool for manually drawing cross-sections on 3D meshes.
 * Supports both single-click vertex picking and marquee (box) selection.
 * 
 * Extracted from the Art Direction Sandbox monolith into the
 * @alisa-engine tool library for reuse across simulation rooms.
 * ═══════════════════════════════════════════════════════════════
 */
import * as THREE from 'three';

export class CrossSectionDrawTool {
    /**
     * @param {THREE.Camera} camera
     * @param {THREE.WebGLRenderer} renderer
     * @param {THREE.Group} renderGroup - The group containing meshes to pick from
     * @param {Object} controls - OrbitControls instance (disabled during draw mode)
     * @param {Function} logCallback - Optional logger function
     */
    constructor(camera, renderer, renderGroup, controls, logCallback) {
        this.camera = camera;
        this.renderer = renderer;
        this.renderGroup = renderGroup;
        this.controls = controls;
        this.log = logCallback || (() => {});

        this.drawMode = false;
        this.selectedVerts = [];
        this.selectedMeshes = [];
        this.drawPolygonMesh = null;
        this.mouseDownPos = null;
        this.savedSections = [];
        this.currentModelFilename = null;

        // Internal helpers
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();

        // Marquee overlay
        this._marqueeDiv = document.createElement('div');
        this._marqueeDiv.style.cssText =
            'position:fixed;border:2px dashed #00ff88;background:rgba(0,255,136,0.1);display:none;pointer-events:none;z-index:999;';
        document.body.appendChild(this._marqueeDiv);

        // Bind events
        this._onPointerDown = this._handlePointerDown.bind(this);
        this._onPointerMove = this._handlePointerMove.bind(this);
        this._onPointerUp = this._handlePointerUp.bind(this);

        renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
        renderer.domElement.addEventListener('pointermove', this._onPointerMove);
        renderer.domElement.addEventListener('pointerup', this._onPointerUp);
    }

    /** Toggle draw mode on/off. Returns the new state. */
    toggleDrawMode() {
        this.drawMode = !this.drawMode;
        if (this.controls) this.controls.enabled = !this.drawMode;
        this.log(this.drawMode ? 'Modo dibujo ON — Click en vértices' : 'Modo dibujo OFF');
        return this.drawMode;
    }

    /** Set the filename context for saving to Hub */
    setModelFilename(filename) {
        this.currentModelFilename = filename;
        this.savedSections = [];
    }

    /** Undo last vertex selection */
    undoVertex() {
        if (this.selectedVerts.length === 0) return;
        this.selectedVerts.pop();
        const m = this.selectedMeshes.pop();
        if (m && m.parent) m.parent.remove(m);
        this._updateDrawPolygon();
    }

    /** Clear all selected vertices */
    clearSelection() {
        this.selectedVerts = [];
        this.selectedMeshes.forEach(m => { if (m.parent) m.parent.remove(m); });
        this.selectedMeshes = [];
        this._updateDrawPolygon();
        this.log('Selección limpiada');
    }

    /** Save current selection as a cross-section and post to Hub */
    saveSection() {
        if (this.selectedVerts.length < 3) {
            this.log('Mínimo 3 vértices para guardar');
            return null;
        }

        // Clone polygon as permanent visual
        if (this.drawPolygonMesh) {
            const permGeo = this.drawPolygonMesh.geometry.clone();
            const permMat = new THREE.MeshBasicMaterial({
                color: 0xaaff00, side: THREE.DoubleSide, opacity: 0.5, transparent: true
            });
            const permMesh = new THREE.Mesh(permGeo, permMat);
            this.renderGroup.add(permMesh);

            this.selectedVerts.forEach(v => {
                const node = new THREE.Mesh(
                    new THREE.BoxGeometry(0.1, 0.1, 0.1),
                    new THREE.MeshBasicMaterial({ color: 0xaaff00 })
                );
                node.position.copy(v);
                this.renderGroup.add(node);
            });
        }

        // Compute plane normal
        const v1 = this.selectedVerts[1].clone().sub(this.selectedVerts[0]);
        const v2 = this.selectedVerts[2].clone().sub(this.selectedVerts[0]);
        const normal = new THREE.Vector3().crossVectors(v1, v2).normalize();
        const centroid = new THREE.Vector3();
        this.selectedVerts.forEach(v => centroid.add(v));
        centroid.divideScalar(this.selectedVerts.length);

        const section = {
            type: 'manual',
            vertices: this.selectedVerts.map(v => [+v.x.toFixed(4), +v.y.toFixed(4), +v.z.toFixed(4)]),
            center: [+centroid.x.toFixed(4), +centroid.y.toFixed(4), +centroid.z.toFixed(4)],
            normal: [+normal.x.toFixed(4), +normal.y.toFixed(4), +normal.z.toFixed(4)],
            n_vertices: this.selectedVerts.length
        };
        this.savedSections.push(section);

        // Persist to Hub
        if (this.currentModelFilename) {
            fetch('/geppetto/cross-sections/' + encodeURIComponent(this.currentModelFilename), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cross_sections: this.savedSections })
            }).then(r => r.json()).then(() => {
                this.log(`💾 Saved to katamari (${this.savedSections.length} sections)`);
            }).catch(e => {
                this.log(`⚠️ Hub save failed: ${e.message}`);
            });
        }

        this.log(`💾 Section #${this.savedSections.length}: ${this.selectedVerts.length} verts`);

        // Clear selection
        const sectionCount = this.savedSections.length;
        this.selectedVerts = [];
        this.selectedMeshes.forEach(m => { if (m.parent) m.parent.remove(m); });
        this.selectedMeshes = [];
        this.drawPolygonMesh = null;

        return { section, sectionCount };
    }

    /** @returns {number} Current vertex count */
    getVertexCount() { return this.selectedVerts.length; }

    /** @returns {number} Saved section count */
    getSectionCount() { return this.savedSections.length; }

    // ─── INTERNAL ────────────────────────────────────────────────

    _addVertexToSelection(worldPos) {
        const isDupe = this.selectedVerts.some(v => v.distanceTo(worldPos) < 0.05);
        if (isDupe) return;
        this.selectedVerts.push(worldPos.clone());
        const highlight = new THREE.Mesh(
            new THREE.BoxGeometry(0.15, 0.15, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x00ff88, wireframe: true })
        );
        highlight.position.copy(worldPos);
        this.renderGroup.add(highlight);
        this.selectedMeshes.push(highlight);
    }

    _updateDrawPolygon() {
        if (this.drawPolygonMesh && this.drawPolygonMesh.parent) {
            this.drawPolygonMesh.parent.remove(this.drawPolygonMesh);
        }
        this.drawPolygonMesh = null;

        if (this.selectedVerts.length < 3) return;

        // Compute centroid & normal
        const c = new THREE.Vector3();
        this.selectedVerts.forEach(p => c.add(p));
        c.divideScalar(this.selectedVerts.length);

        const va = this.selectedVerts[1].clone().sub(this.selectedVerts[0]);
        const vb = this.selectedVerts[2].clone().sub(this.selectedVerts[0]);
        const n = new THREE.Vector3().crossVectors(va, vb).normalize();
        if (n.length() < 0.01) return;

        // Sort radially
        let u = new THREE.Vector3(0, 1, 0);
        if (Math.abs(n.dot(u)) > 0.99) u.set(1, 0, 0);
        const right = new THREE.Vector3().crossVectors(n, u).normalize();
        const up = new THREE.Vector3().crossVectors(right, n).normalize();

        const sorted = [...this.selectedVerts].sort((a, b) => {
            const da = a.clone().sub(c);
            const db = b.clone().sub(c);
            return Math.atan2(da.dot(up), da.dot(right)) - Math.atan2(db.dot(up), db.dot(right));
        });

        // Triangle fan
        const positions = [];
        for (let i = 0; i < sorted.length; i++) {
            const p1 = sorted[i];
            const p2 = sorted[(i + 1) % sorted.length];
            positions.push(c.x, c.y, c.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
        geo.computeVertexNormals();
        const mat = new THREE.MeshBasicMaterial({
            color: 0x00ff88, side: THREE.DoubleSide, opacity: 0.6, transparent: true
        });
        this.drawPolygonMesh = new THREE.Mesh(geo, mat);
        this.renderGroup.add(this.drawPolygonMesh);
    }

    _handlePointerDown(e) {
        this.mouseDownPos = { x: e.clientX, y: e.clientY };
        if (this.drawMode) {
            this._marqueeDiv.style.left = e.clientX + 'px';
            this._marqueeDiv.style.top = e.clientY + 'px';
            this._marqueeDiv.style.width = '0px';
            this._marqueeDiv.style.height = '0px';
        }
    }

    _handlePointerMove(e) {
        if (!this.drawMode || !this.mouseDownPos) return;
        const dx = e.clientX - this.mouseDownPos.x;
        const dy = e.clientY - this.mouseDownPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < 5) return;

        this._marqueeDiv.style.display = 'block';
        this._marqueeDiv.style.left = Math.min(e.clientX, this.mouseDownPos.x) + 'px';
        this._marqueeDiv.style.top = Math.min(e.clientY, this.mouseDownPos.y) + 'px';
        this._marqueeDiv.style.width = Math.abs(dx) + 'px';
        this._marqueeDiv.style.height = Math.abs(dy) + 'px';
    }

    _handlePointerUp(e) {
        if (!this.drawMode || !this.mouseDownPos) return;
        const dx = e.clientX - this.mouseDownPos.x;
        const dy = e.clientY - this.mouseDownPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this._marqueeDiv.style.display = 'none';

        if (dist < 5) {
            // Single click: raycast vertex pick
            this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            this._raycaster.setFromCamera(this._mouse, this.camera);

            const targets = [];
            this.renderGroup.traverse(c => {
                if (c.isMesh && c.geometry.type === 'BoxGeometry') targets.push(c);
            });

            const hits = this._raycaster.intersectObjects(targets, false);
            if (hits.length > 0) {
                const worldPos = new THREE.Vector3();
                hits[0].object.getWorldPosition(worldPos);
                this._addVertexToSelection(worldPos);
                this._updateDrawPolygon();
            }
        } else {
            // Marquee selection
            const x1 = Math.min(this.mouseDownPos.x, e.clientX);
            const y1 = Math.min(this.mouseDownPos.y, e.clientY);
            const x2 = Math.max(this.mouseDownPos.x, e.clientX);
            const y2 = Math.max(this.mouseDownPos.y, e.clientY);

            let count = 0;
            this.renderGroup.traverse(c => {
                if (!c.isMesh || c.geometry.type !== 'BoxGeometry') return;
                const params = c.geometry.parameters;
                if (params && params.width > 0.12) return;

                const worldPos = new THREE.Vector3();
                c.getWorldPosition(worldPos);

                const screenPos = worldPos.clone().project(this.camera);
                const sx = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
                const sy = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

                if (screenPos.z > 0 && screenPos.z < 1 && sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
                    this._addVertexToSelection(worldPos);
                    count++;
                }
            });

            if (count > 0) {
                this.log(`🔲 Marquesina: ${count} vértices seleccionados`);
                this._updateDrawPolygon();
            }
        }

        this.mouseDownPos = null;
    }

    /** Clean up event listeners and DOM elements */
    dispose() {
        this.renderer.domElement.removeEventListener('pointerdown', this._onPointerDown);
        this.renderer.domElement.removeEventListener('pointermove', this._onPointerMove);
        this.renderer.domElement.removeEventListener('pointerup', this._onPointerUp);
        if (this._marqueeDiv.parentNode) this._marqueeDiv.parentNode.removeChild(this._marqueeDiv);
    }
}
