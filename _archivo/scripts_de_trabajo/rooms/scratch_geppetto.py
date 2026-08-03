import re

path = "q:/alisa_project/alisa/World/Web/overworld/rooms/room_geppetto_choreography.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Remove RoboticArmSystem import
html = re.sub(r"import \{ RoboticArmFactory \} .*?;", "", html)

# Define the new Geppetto scene
geppetto_scene = """
        // ══════════════════════════════════════
        //  THE KINEMATIC TANK & SERVER RACK
        // ══════════════════════════════════════
        let dummyAsset = new THREE.Group();
        // 1. The Glass Tank
        const tankGroup = new THREE.Group();
        engine.scene.add(tankGroup);

        const tankBase = new THREE.Mesh(
            new THREE.CylinderGeometry(5.2, 5.5, 0.5, 32),
            new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.2 })
        );
        tankBase.position.y = 0.25;
        tankGroup.add(tankBase);

        const tankGlass = new THREE.Mesh(
            new THREE.CylinderGeometry(5, 5, 10, 32),
            new THREE.MeshPhysicalMaterial({
                color: 0x00ffcc, transmission: 0.9, opacity: 1, transparent: true,
                roughness: 0.1, ior: 1.5, thickness: 0.2
            })
        );
        tankGlass.position.y = 5.5;
        tankGroup.add(tankGlass);
        
        tankGroup.add(dummyAsset);

        // 2. Geppetto Server Rack (on the back wall)
        const rackGroup = new THREE.Group();
        rackGroup.position.set(0, 5, -12);
        engine.scene.add(rackGroup);

        const rackBody = new THREE.Mesh(
            new THREE.BoxGeometry(6, 10, 2),
            new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.9, roughness: 0.3 })
        );
        rackGroup.add(rackBody);

        // Create some blinking LEDs on the rack
        const leds = [];
        for(let i=0; i<8; i++) {
            const led = new THREE.Mesh(
                new THREE.BoxGeometry(0.3, 0.1, 0.1),
                new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 0 })
            );
            led.position.set(-2 + Math.random()*4, -4 + i*1.1, 1.05);
            rackGroup.add(led);
            leds.push(led);
        }

        // 3. Neuromotor Cables
        const cableMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.5, roughness: 0.5 });
        const impulseMat = new THREE.MeshBasicMaterial({ color: 0xff00ff }); // Magenta impulses
        const numCables = 5;
        const curves = [];
        const impulses = [];

        for(let i=0; i<numCables; i++) {
            const startPt = new THREE.Vector3(-2 + i*1.0, 1 + Math.random()*2, -10.9); // From rack
            const midPt = new THREE.Vector3(-3 + Math.random()*6, 0.5, -6);            // Floor rest
            const endPt = new THREE.Vector3(Math.cos(Math.PI*(i/numCables))*4.5, 0.3, Math.sin(Math.PI*(i/numCables))*4.5);   // Into tank base

            const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt]);
            curves.push(curve);

            const tubeGeo = new THREE.TubeGeometry(curve, 20, 0.15, 8, false);
            const tube = new THREE.Mesh(tubeGeo, cableMat);
            engine.scene.add(tube);
            
            // Add visual impulses traveling down the wires
            const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), impulseMat);
            engine.scene.add(pulse);
            impulses.push({ mesh: pulse, offset: Math.random() });
        }
        
        let kinematics = {
            gait: "arachnid_scuttle",
            freq: 6.0,
            ampY: 0.15,
            wobbleZ: 0.05,
            rollX: 0.08
        };
        
        loader.load('../props/models/Spider.glb', (gltf) => {
            const mesh = gltf.scene;
            mesh.traverse(c => {
                if (c.isMesh) {
                    c.material = new THREE.MeshStandardMaterial({
                        color: 0xaa5522, roughness: 0.4, metalness: 0.7,
                        emissive: 0x110022, emissiveIntensity: 0.5
                    });
                    c.castShadow = true;
                }
            });
            const box = new THREE.Box3().setFromObject(mesh);
            const maxDim = Math.max(box.getSize(new THREE.Vector3()).x, box.getSize(new THREE.Vector3()).y, box.getSize(new THREE.Vector3()).z);
            if(maxDim > 0) mesh.scale.setScalar(4 / maxDim);
            box.setFromObject(mesh);
            mesh.position.sub(box.getCenter(new THREE.Vector3()));
            dummyAsset.add(mesh);
            dummyAsset.position.y = box.getSize(new THREE.Vector3()).y / 2 + 1.1; // Base height
            setUI("PUPPET READY", "Spider.glb", "articulated", "18");
        });
        
"""

# Replace the Robotic Arms Setup with the Tank Setup
pattern = re.compile(r"// ══════════════════════════════════════\s*//  ROBOTIC ARMS.*//  ANIMATION LOOP", re.DOTALL)
html = pattern.sub(geppetto_scene + "\n        // ══════════════════════════════════════\n        //  ANIMATION LOOP", html)

# Clean up the animate loop contents related to arms 
pattern_animate = re.compile(r"// Solve kinematics.*?(?=\n\s*// Warning beacons pulse)", re.DOTALL)
html = pattern_animate.sub("", html)
html = re.sub(r"const isBusy.*?window\.GeppettoBrain && window\.GeppettoBrain\.busy;\s*beaconLeft.*?;\s*beaconRight.*?;\s*if \(armLeft.*?\s*if \(armRight.*?\s*", "", html)

animate_injection = """
            // Rack LEDs blinking
            leds.forEach((led, i) => {
                led.material.emissiveIntensity = Math.pow(Math.sin(t * 10 + i), 8) * 2;
            });

            // Impulses traveling down cables
            impulses.forEach((imp, i) => {
                imp.offset += 0.01 * kinematics.freq;
                if (imp.offset > 1) imp.offset = 0;
                const pos = curves[i].getPointAt(imp.offset);
                imp.mesh.position.copy(pos);
                const scale = 1 + Math.sin(imp.offset * Math.PI) * 0.5;
                imp.mesh.scale.setScalar(scale);
            });
            
            // Dummy asset mimics being pulled according to kinematics
            const bounce = Math.abs(Math.sin(t * kinematics.freq)) * kinematics.ampY;
            dummyAsset.position.y = 1.0 + bounce;
            dummyAsset.rotation.z = Math.sin(t * (kinematics.freq * 0.5)) * kinematics.wobbleZ;
            dummyAsset.rotation.x = Math.cos(t * (kinematics.freq * 0.5)) * kinematics.rollX;
"""

html = re.sub(r"(requestAnimationFrame\(animate\);\s*const t = clock\.getElapsedTime\(\);)", r"\1\n" + animate_injection, html)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("done")
