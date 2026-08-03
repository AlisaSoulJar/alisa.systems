import struct
import json
import os

filepath = r'q:\alisa_project\alisa\World\Web\overworld\props\models\Arcade Machine.glb'

with open(filepath, 'rb') as f:
    magic, version, length = struct.unpack('<4sII', f.read(12))
    chunk0_len, chunk0_type = struct.unpack('<II', f.read(8))
    
    if chunk0_type == b'JSON':
        json_data = f.read(chunk0_len)
        data = json.loads(json_data.decode('utf-8'))
        
        print('=== MESHES ===')
        for i, mesh in enumerate(data.get('meshes', [])):
            print(f"Mesh {i}: {mesh.get('name', 'Unnamed')}")
            
        print('\n=== MATERIALS ===')
        for i, mat in enumerate(data.get('materials', [])):
            print(f"Material {i}: {mat.get('name', 'Unnamed')}")

        print('\n=== NODES ===')
        for i, node in enumerate(data.get('nodes', [])):
            mesh_idx = node.get('mesh')
            name = node.get('name', 'Unnamed')
            if mesh_idx is not None:
                print(f"Node {i} ({name}) -> Mesh {mesh_idx}")
            else:
                print(f"Node {i} ({name})")
