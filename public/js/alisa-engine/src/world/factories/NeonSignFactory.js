import * as THREE from 'three';

/**
 * NeonSignFactory
 * Unified generator for procedural Neon and Hologram signs across the ALISA Engine.
 */
export class NeonSignFactory {
    
    static createNeonLineMat(hexColor) {
        return new THREE.LineBasicMaterial({
            color: hexColor,
            linewidth: 2,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
    }

    static get PALETTE() {
        return {
            CYAN: 0x00ffff,
            RED: 0xff0044,
            PURPLE: 0x8800ff,
            YELLOW: 0xffdd00,
            PINK: 0xff00ff,
            GREEN: 0x00ff44,
            ORANGE: 0xff8800,
            GREY: 0x444444
        };
    }

    /**
     * Creates a 3D boxy Neon Sign with flickering material support.
     * Returns { mesh: THREE.Group, flickerMat: THREE.Material }
     */
    static createNeonSign(w, h, colorHex) {
        const geo = new THREE.BoxGeometry(w, h, 0.2);
        const mat = new THREE.MeshStandardMaterial({
            color: 0x000000,
            emissive: new THREE.Color(colorHex),
            emissiveIntensity: 4.5
        });
        mat.userData = { flickerSeed: Math.random() * 100, flickerSpeed: 0.2 + Math.random() * 1.5 };
        
        const casingGeo = new THREE.BoxGeometry(w + 0.2, h + 0.2, 0.3);
        const casingMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0d });
        const casing = new THREE.Mesh(casingGeo, casingMat);
        
        const neon = new THREE.Mesh(geo, mat);
        neon.position.z = 0.15;
        
        const group = new THREE.Group();
        group.add(casing);
        group.add(neon);
        
        return { mesh: group, flickerMat: mat };
    }

    /**
     * Creates a scrolling 2D Holographic Sign.
     * Returns { mesh: THREE.Mesh, hologramMat: THREE.Material }
     */
    static createHologramSign(w, h, text, colorHex) {
        const hc = document.createElement('canvas'); 
        hc.width = 512; hc.height = 128; // Power of two for generic texture usage
        const hctx = hc.getContext('2d');
        
        // Black background (transparent in AdditiveBlending)
        hctx.fillStyle = '#000000'; 
        hctx.fillRect(0,0,512,128);
        
        // Stylized Cyberpunk frame
        hctx.strokeStyle = '#' + colorHex.toString(16).padStart(6, '0');
        hctx.lineWidth = 6;
        hctx.strokeRect(4, 4, 504, 120);
        
        // Animated Neon Text
        hctx.fillStyle = '#' + colorHex.toString(16).padStart(6, '0');
        hctx.font = 'bold 80px monospace';
        // Duplicate text to allow seamless horizontal scrolling
        hctx.fillText(text + "   " + text, 20, 95);
        
        const htex = new THREE.CanvasTexture(hc);
        htex.wrapS = THREE.RepeatWrapping; // Required for texture coordinate scrolling
        
        const hMat = new THREE.MeshStandardMaterial({
            map: htex, 
            emissiveMap: htex,
            emissive: new THREE.Color(colorHex),
            emissiveIntensity: 3.5, // Strong Bloom
            transparent: true,
            blending: THREE.AdditiveBlending, // Key to true hologram overlap
            depthWrite: false, // Prevents Z-buffer flickering
            side: THREE.DoubleSide
        });
        
        const geo = new THREE.PlaneGeometry(w, h);
        const mesh = new THREE.Mesh(geo, hMat);
        
        return { mesh, tex: htex, speed: 0.15 + Math.random() * 0.3 };
    }
}
