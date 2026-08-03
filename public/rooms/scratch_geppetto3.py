import re

path = "q:/alisa_project/alisa/World/Web/overworld/rooms/room_geppetto_choreography.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Completely remove the Pygmalion animate contents that crashed the script
pattern_animate_body = re.compile(r"(function animate\(\) \{.*?\n        \})\s*animate\(\);", re.DOTALL)

clean_animate = """function animate() {
            requestAnimationFrame(animate);
            const dt = clock.getDelta();
            const t = clock.getElapsedTime();

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
                // Pulse size changes
                const scale = 1 + Math.sin(imp.offset * Math.PI) * 0.5;
                imp.mesh.scale.setScalar(scale);
            });

            // Dummy asset mimics being pulled according to kinematics
            if(dummyAsset) {
                const bounce = Math.abs(Math.sin(t * kinematics.freq)) * kinematics.ampY;
                dummyAsset.position.y = 2.0 + bounce;
                dummyAsset.rotation.z = Math.sin(t * (kinematics.freq * 0.5)) * kinematics.wobbleZ;
                dummyAsset.rotation.x = Math.cos(t * (kinematics.freq * 0.5)) * kinematics.rollX;
            }

            const pos = dust.geometry.attributes.position.array;
            for (let i = 0; i < 200; i++) {
                pos[i*3 + 1] += Math.sin(t + i) * 0.001;
                if (pos[i*3 + 1] > 12) pos[i*3 + 1] = 0;
            }
            dust.geometry.attributes.position.needsUpdate = true;

            if (window.geppettoBrain) window.geppettoBrain.tick(dt, t);
        }
        animate();"""

html = pattern_animate_body.sub(clean_animate, html)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("animate loop repaired")
