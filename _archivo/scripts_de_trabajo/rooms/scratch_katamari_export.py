import trimesh
import numpy as np
from scipy.cluster.vq import kmeans2
import os

def main():
    path = r"q:\alisa_project\alisa\World\Web\overworld\props\ready\Hyena.glb"
    scene = trimesh.load(path, force='scene')
    
    mesh = None
    for geom in scene.geometry.values():
        if isinstance(geom, trimesh.Trimesh) and len(geom.vertices) > 100:
            mesh = geom
            break

    K = 10
    centroids, labels = kmeans2(mesh.vertices, K, minit='points')
    
    face_assignments = np.zeros(len(mesh.faces), dtype=int)
    for i, f in enumerate(mesh.faces):
        v_labels = labels[f]
        u, c = np.unique(v_labels, return_counts=True)
        face_assignments[i] = u[np.argmax(c)]
        
    # El LLM ha devuelto esta asignación de Puzzle
    # Basándome en la radiografía
    semantic_puzzle = {
        "Head": [8, 5],
        "Torso": [1, 2, 6],
        "LegFL": [9],
        "LegFR": [0],
        "LegBL": [7], 
        "LegBR": [3, 4],
        "Tail": [] # Como 7 es enorme, dejaremos la cola y pierna juntas como proxy rudo para la prueba
    }

    out_scene = trimesh.Scene()
    
    for body_part, clusters in semantic_puzzle.items():
        if not clusters: continue
        
        # Juntamos las máscaras de los clusters asignados a esta parte del cuerpo
        mask = np.zeros(len(mesh.faces), dtype=bool)
        for c in clusters:
            mask |= (face_assignments == c)
            
        if np.sum(mask) == 0: continue
            
        sub = mesh.copy()
        sub.update_faces(mask)
        sub.remove_unreferenced_vertices()
        
        out_scene.add_geometry(sub, node_name=body_part)
        
    out_path = r"q:\alisa_project\alisa\World\Web\overworld\props\scratch\Hyena_Katamari.glb"
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out_scene.export(out_path)
    print(f"Exportado el Frankestein Katamari a {out_path}")

if __name__ == "__main__":
    main()
