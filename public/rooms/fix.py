import os
import re

source = r'q:\alisa_project\alisa\World\Web\overworld\rooms\empty_lab.html'
dest = r'q:\alisa_project\alisa\World\Web\overworld\rooms\sandbox_lab.html'

with open(source, 'r', encoding='utf-8') as f:
    content = f.read()

# Change title
content = content.replace('<title>ALISA - Arcade Node</title>', '<title>ALISA - Retro Arcade Node</title>')

# Remove arcade_boards and chess_procedural scripts
content = content.replace('<script src="../js/arcade_boards.js"></script>', '')
content = content.replace('<script src="../js/chess_procedural.js"></script>', '')

# Remove the Arcade Game Selection UI Overlay
ui_start = content.find('<!-- ARCADE UI OVERLAY -->')
ui_end = content.find('<!-- HUD -->')
if ui_start != -1 and ui_end != -1:
    content = content[:ui_start] + content[ui_end:]

# Replace scene initialization logic related to games
scene_logic_start = content.find('// ==== PROCEDURAL GAME SET ====')
scene_logic_end = content.find('// Base room setup')
if scene_logic_start != -1 and scene_logic_end != -1:
    new_logic = '''
    // ==== ARCADE CABINET LAYER ====
    const cabinetGroup = new THREE.Group();
    scene.add(cabinetGroup);

    let cabinetMesh = null;

    // Load the Arcade Machine GLB
    const loader = new THREE.GLTFLoader();
    loader.load('../props/models/Arcade Machine.glb', function (gltf) {
        cabinetMesh = gltf.scene;
        // Scale and position nicely in the room
        cabinetMesh.scale.set(4, 4, 4);
        cabinetMesh.position.set(0, -globalTableY, 0); // Put on the floor
        
        // Add subtle rotation to face the camera a bit
        cabinetMesh.rotation.y = Math.PI / 4; 

        // Let it cast shadows
        cabinetMesh.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        cabinetGroup.add(cabinetMesh);
        console.log('Arcade Cabinet Loaded.');
    });
    
    // Ambient sound or light tweaks specific to the arcade cabinet can go here
'''
    content = content[:scene_logic_start] + new_logic + content[scene_logic_end:]

# Clean up interaction stuff (sitAtTable, rageQuit, physics loop)
content = re.sub(r'function sitAtTable\(\)\s*\{[\s\S]*?\}', '', content)
content = re.sub(r'function standUp\(\)\s*\{[\s\S]*?\}', '', content)
content = re.sub(r'window\.rageQuit = function\(\)\s*\{[\s\S]*?\}', '', content)
content = re.sub(r'function loadGame\(gameId\)\s*\{[\s\S]*?\}', '', content)

# Remove the physics block from the animate function using simpler split/replace
parts = content.split('// RAGE QUIT PHYSICS LOOP')
if len(parts) > 1:
    end_part = parts[1].split('// HUD Updates')[1]
    content = parts[0] + '// HUD Updates' + end_part
    
# Remove remaining physics logic references and ui calls
content = content.replace('if (physicsEnabled) {', 'if (false) {')

# write out
with open(dest, 'w', encoding='utf-8') as f:
    f.write(content)

print(f'Stripped and updated {dest}')
