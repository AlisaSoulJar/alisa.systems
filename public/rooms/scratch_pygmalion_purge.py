import re

path = "q:/alisa_project/alisa/World/Web/overworld/rooms/room_geppetto_choreography.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Remove Overhead surgical ring
html = re.sub(r"// Overhead surgical ring.*?engine\.scene\.add\(sp\.target\);\n        \}\);", "", html, flags=re.DOTALL)

# Remove Greenish accent lights
html = re.sub(r"// Greenish accent lights along the belt.*?\n        \}\);", "", html, flags=re.DOTALL)

# Remove Scanner spot and Overhead table spotlight
html = re.sub(r"// Overhead table spotlight.*?engine\.scene\.add\(scannerSpot\.target\);", "", html, flags=re.DOTALL)

# Remove Hazard Zone Floor Markings
html = re.sub(r"// --- Hazard Zone Floor Markings ---.*?\}\s*\}", "", html, flags=re.DOTALL)

# Remove Ceiling tube
html = re.sub(r"// --- Ceiling tube.*?engine\.scene\.add\(rimTop\);", "", html, flags=re.DOTALL)

# Remove Warning Beacon Lights
html = re.sub(r"// --- Warning Beacon Lights.*?engine\.scene\.add\(beaconRight\);", "", html, flags=re.DOTALL)

# Remove Conveyor Belt
html = re.sub(r"// --- Conveyor Belt ---.*?engine\.scene\.add\(beltGroup\);", "", html, flags=re.DOTALL)

# Remove EXIT TUNNEL
html = re.sub(r"// --- EXIT TUNNEL.*?engine\.scene\.add\(tunnelGroup\);", "", html, flags=re.DOTALL)

# Remove Spark Particle System
html = re.sub(r"// --- Spark Particle System \(Welding\) ---.*?const sparks = new SparkSystem\(engine\.scene\);", "", html, flags=re.DOTALL)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("Purged Pygmalion architectural leftovers.")
