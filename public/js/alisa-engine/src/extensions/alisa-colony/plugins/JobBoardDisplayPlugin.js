import * as THREE from 'three';

export class JobBoardDisplayPlugin {
    constructor(app, config = {}) {
        this.name = 'JobBoardDisplay';
        this.app = app;
        
        const w = config.width || 12;
        const h = config.height || 12;
        const pos = config.position || new THREE.Vector3(0, 0, 0);
        const rot = config.rotation || new THREE.Euler(0, 0, 0);
        
        this.jbCanvas = document.createElement('canvas');
        this.jbCanvas.width = 1024;
        this.jbCanvas.height = 1024;
        this.jCtx = this.jbCanvas.getContext('2d', { willReadFrequently: true });
        this.jbTex = new THREE.CanvasTexture(this.jbCanvas);
        
        const jbScreen = new THREE.Mesh(
            new THREE.PlaneGeometry(w, h),
            new THREE.MeshStandardMaterial({ map: this.jbTex, emissiveMap: this.jbTex, emissive: 0xffffff, emissiveIntensity: 0.1, roughness: 0.9 })
        );
        
        const jbFrame = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.4, h + 0.4, 0.2),
            new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.7 })
        );
        jbFrame.position.z = -0.11;
        
        this.jbGroup = new THREE.Group();
        this.jbGroup.add(jbScreen);
        this.jbGroup.add(jbFrame);
        
        this.jbGroup.position.copy(pos);
        this.jbGroup.rotation.copy(rot);
        this.app.scene.add(this.jbGroup);
        
        this.jobListData = [];
        this.interval = null;
    }
    
    onInit() {
        this.updateCanvas();
        this.startPolling();
    }
    
    updateCanvas() {
        const ctx = this.jCtx;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 1024, 1024);
        
        ctx.fillStyle = '#111111';
        ctx.font = 'bold 60px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📌 COLONIAL JOBBOARD', 512, 100);
        
        ctx.fillStyle = '#333333';
        ctx.font = '36px monospace';
        ctx.textAlign = 'left';
        let y = 200;
        
        if(this.jobListData.length === 0) {
            ctx.fillText('No open contracts yet.', 80, y);
        } else {
            this.jobListData.slice(0, 12).forEach(job => {
                let title = job.title || job.id || "Unknown Job";
                let reward = job.reward ? `${job.reward} NEURO` : "";
                let status = job.status ? `[${job.status.toUpperCase()}]` : "";
                ctx.fillText(`${status} ${title.substring(0,35)}${title.length > 35 ? '...':''} - ${reward}`, 60, y);
                y += 65;
            });
        }
        this.jbTex.needsUpdate = true;
    }
    
    startPolling() {
        this.interval = setInterval(async () => {
            try {
                const res = await fetch('http://127.0.0.1:8741/jobboard/list?status=open&limit=12');
                if (res.ok) {
                    const data = await res.json();
                    this.jobListData = Array.isArray(data) ? data : (data.jobs || Object.values(data));
                    this.updateCanvas();
                }
            } catch(e) {}
        }, 5000);
    }
}
