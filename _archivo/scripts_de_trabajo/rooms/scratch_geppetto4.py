import re
path = "q:/alisa_project/alisa/World/Web/overworld/rooms/room_geppetto_choreography.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Remove the GLaDOS arm
pattern_glados = re.compile(r"// ══════════════════════════════════════\s*//  PYGMALION \(Procedural.*?\n        \}\s*", re.DOTALL)
html = pattern_glados.sub("", html)

# Remove the RoboticArmFactory initialization entirely
pattern_robotic_arms = re.compile(r"// --- Robotic Arms via RoboticArmFactory \(reusable module\) ---.*?3\.8\s*\);\s*", re.DOTALL)
html = pattern_robotic_arms.sub("", html)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("done")
