import os
import re

source = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems/public/rooms/room_sala_del_huevo.html'
dest = 'Q:/alisa_project/alisa/World/Synthesis/Web/alisa-systems/public/rooms/room_sovereign_casino.html'

with open(source, 'r', encoding='utf-8') as f:
    html = f.read()

# 1. Title and Texts
html = html.replace('ALISA — La Sala del Huevo', 'ALISA — Sovereign Grand Casino')
html = html.replace('LA SALA DEL HUEVO', 'SOVEREIGN CASINO')
html = html.replace('un huevo en el centro', 'un obelisco de neón central')
html = html.replace('el huevo late más fuerte', 'el casino se enciende')

# 2. Colors: Make it dark/cyberpunk
html = html.replace('0xe6ebf0', '0x070b12') # Background
html = html.replace('0xffffff, 0xdfe6ec, 3.1', '0x1a2b4c, 0x070b12, 1.5') # Hemisphere light
html = html.replace('0xffffff, 1.5', '0x00e676, 0.8') # Cenital light (Neon green)
html = html.replace('0x9fb0c0, 0xd4dee6', '0x00ffc8, 0x070b12') # Grid colors

# 3. Add Entropy and action games
mesas_add = "  { n:'Entropy', u:'../arcade/entropy.html', cartas:true, env:'alisa/entropy-protohub-v0' },\n  { n:'Guerra', u:'../arcade/guerra.html', cartas:true, env:'alisa/guerra-protohub-v0' },\n"
html = re.sub(r"(const MESAS = \[\n)", r"\1" + mesas_add, html)

arcades_add = "  { n:'Fagocito', u:'../arcade/fagocito.html', env:'alisa/fagocito-protohub-v0' },\n  { n:'Snake', u:'../arcade/snake.html', env:'alisa/snake-protohub-v0' },\n"
html = re.sub(r"(const ARCADES = \[\n)", r"\1" + arcades_add, html)

# 4. Central Object: Obelisk instead of Egg
html = html.replace('const geoHuevo = new THREE.SphereGeometry(7, 72, 56);', 'const geoHuevo = new THREE.CylinderGeometry(2, 6, 25, 6);')
html = html.replace('geoHuevo.scale(1, 1.42, 1);', '// No scale needed for obelisk')
html = html.replace('emissive:0xbfd4e6', 'emissive:0x00ffc8') # Neon glow
html = html.replace('color:0xfff4dc', 'color:0x00ffc8')
html = html.replace('0xffe9c4', '0x00ffc8') # Lights
html = html.replace('0x4fd0ff', '0x00e676')

with open(dest, 'w', encoding='utf-8') as f:
    f.write(html)

print("Casino Room Created!")
