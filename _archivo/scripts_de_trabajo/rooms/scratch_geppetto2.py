import re
import sys

path = "q:/alisa_project/alisa/World/Web/overworld/rooms/room_geppetto_choreography.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Erase everything from PIPELINE STATE & FSM BRAIN to the end of <script>
pattern = re.compile(r"// ══════════════════════════════════════\s*//  PIPELINE STATE & FSM BRAIN.*?(?=</script>)", re.DOTALL)

clean_fsm = """
        // ══════════════════════════════════════
        //  GEPPETTO STATE
        // ══════════════════════════════════════
        class GeppettoBrain {
            constructor() {
                this.state = 'CALIBRATING';
                this.busy = false;
                this.timer = 0;
                this.domStatus = document.getElementById('ui-fsm');
                this.logBrain('STATE: INJECTING KINEMATICS', '#ff00ff');
            }

            logBrain(msg, color='#ffaa00') {
                if(this.domStatus && this.domStatus.textContent !== msg) {
                    this.domStatus.textContent = msg;
                    this.domStatus.style.color = color;
                }
            }
            
            tick(dt, elapsed) {
                if (this.busy) return;
                // Idle pulse
            }
        }

        window.geppettoBrain = new GeppettoBrain();
        
        window.startFactory = async function() {
            log('BOOTING GEPPETTO...', true);
            setUI('SCANNING', 'Spider.glb', 'articulated', '18');
            setProgress(30);
            await new Promise(r => setTimeout(r, 1000));
            log('Injecting waveform: arachnid_scuttle...', true);
            setProgress(60);
            await new Promise(r => setTimeout(r, 1000));
            log('Kinematics locked.', true);
            setProgress(100);
            setUI('SIMULATING');
            window.geppettoBrain.logBrain('STATE: SIMULATION ACTIVE', '#00ffcc');
        };
        
"""

html = pattern.sub(clean_fsm, html)

# Also remove 'updatePygmalion' if it exists in animate
html = re.sub(r"if \(typeof updatePygmalion === 'function'\).*?;", "", html)
# Remove pygmalionBrain usages in tick
html = re.sub(r"if \(window\.pygmalionBrain\) window\.pygmalionBrain\.tick\(dt, t\);", "if (window.geppettoBrain) window.geppettoBrain.tick(dt, t);", html)
# Remove unused dust updates or keep them (they are harmless)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("Logic cleaned.")
