import re

path = "q:/alisa_project/alisa/World/Web/overworld/rooms/room_geppetto_choreography.html"
with open(path, "r", encoding="utf-8") as f:
    html = f.read()

# Strip any stray buildPygmalion() or updatePygmalion() definitions and calls
html = re.sub(r"buildPygmalion\(\);", "", html)
html = re.sub(r"let pygLookTarget.*?;", "", html)
html = re.sub(r"function updatePygmalion\(.*?\).*?\}\n", "", html, flags=re.DOTALL)

# Let's remove any floating empty space
html = re.sub(r"\n\s*\n\s*\n", "\n\n", html)

with open(path, "w", encoding="utf-8") as f:
    f.write(html)
print("done")
