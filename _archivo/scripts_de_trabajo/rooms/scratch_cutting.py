import trimesh
import numpy as np
import scipy.sparse as sp
from scipy.sparse.csgraph import dijkstra
import os

def heuristic_seeds(mesh):
    """
    Finds index of the vertices matching typical quadruped extremities
    assuming Z is forward, Y is up, X is left/right.
    """
    pts = mesh.vertices
    
    # Utilities
    def get_extreme(score_func):
        scores = np.array([score_func(p) for p in pts])
        return np.argmax(scores)

    # 1. Torso (closest to centroid)
    centroid = np.mean(pts, axis=0)
    torso_idx = np.argmin(np.linalg.norm(pts - centroid, axis=1))

    # 2. Head (Max Z, Max Y)
    head_idx = get_extreme(lambda p: p[2] * 2.0 + p[1])
    
    # 3. Tail (Min Z)
    tail_idx = get_extreme(lambda p: -p[2])
    
    # 4. Front Left Leg (Max X, Max Z, Min Y)
    fl_idx = get_extreme(lambda p: p[0]*1.0 + p[2]*1.0 - p[1]*2.0)
    fr_idx = get_extreme(lambda p: -p[0]*1.0 + p[2]*1.0 - p[1]*2.0)
    
    # 5. Back Left Leg (Max X, Min Z, Min Y)
    bl_idx = get_extreme(lambda p: p[0]*1.0 - p[2]*1.0 - p[1]*2.0)
    br_idx = get_extreme(lambda p: -p[0]*1.0 - p[2]*1.0 - p[1]*2.0)
    
    return {
        'Torso': torso_idx,
        'Head': head_idx,
        'Tail': tail_idx,
        'LegFL': fl_idx,
        'LegFR': fr_idx,
        'LegBL': bl_idx,
        'LegBR': br_idx
    }

def main():
    root = r"q:\alisa_project\alisa\World\Web\overworld\props\ready"
    path = os.path.join(root, "Hyena.glb")
    print(f"Loading {path}...")
    scene = trimesh.load(path, force='scene')
    
    # Extract the main body mesh
    mesh = None
    for geom in scene.geometry.values():
        if isinstance(geom, trimesh.Trimesh) and len(geom.vertices) > 100:
            mesh = geom
            break
            
    if mesh is None:
        print("No suitable mesh found.")
        return

    print(f"Mesh found: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces.")
    
    seeds = heuristic_seeds(mesh)
    seed_names = list(seeds.keys())
    print("Seed indices identified:")
    for k, v in seeds.items():
        print(f"  {k}: {v} -> {mesh.vertices[v]}")
        
    # Get the actual 3D coordinates of the seeds
    seed_coords = np.array([mesh.vertices[seeds[name]] for name in seed_names])
    
    # We want the Torso to be slightly less greedy, so we can adjust its distance penalty.
    # Actually, Euclidean distance works brilliantly if we just scale the Torso down
    # (i.e. we require things to be very close to the Torso to belong to it).
    
    print("Assigning Vertices & Faces via 3D Euclidean Space...")
    distances = np.zeros((len(seed_names), len(mesh.vertices)))
    for i, name in enumerate(seed_names):
        diff = mesh.vertices - seed_coords[i]
        dist = np.linalg.norm(diff, axis=1)
        distances[i] = dist
        
    # Make extremities greedy! Divide their distances by 2 so they reach further up the leg.
    # Torso is index 0. Head is 1, Tail is 2. Legs are 3,4,5,6.
    distances[0] *= 1.5   # Penalize torso (must be very close to belly to be torso)
    distances[1] *= 0.8   # Make head greedy
    distances[2] *= 0.8   # Make tail greedy
    for i in range(3, 7):
        distances[i] *= 0.6  # Make legs very greedy so they consume the whole thigh!
    
    vert_assignments = np.argmin(distances, axis=0)
    
    # A face belongs to a region if at least 2 of its vertices belong to it.
    face_assignments = np.zeros(len(mesh.faces), dtype=int)
    for i, f in enumerate(mesh.faces):
        v_labels = vert_assignments[f]
        uniq, counts = np.unique(v_labels, return_counts=True)
        face_assignments[i] = uniq[np.argmax(counts)]
        
    # Build segmented scene
    out_scene = trimesh.Scene()
    colors = [
        [200, 200, 200, 255], # Torso (Greige)
        [255, 0, 0, 255],     # Head (Red)
        [0, 255, 0, 255],     # Tail (Green)
        [0, 0, 255, 255],     # FL (Blue)
        [0, 255, 255, 255],   # FR (Cyan)
        [255, 0, 255, 255],   # BL (Magenta)
        [255, 255, 0, 255]    # BR (Yellow)
    ]
    
    for i, name in enumerate(seed_names):
        mask = (face_assignments == i)
        if np.sum(mask) == 0:
            continue
            
        sub = mesh.copy()
        sub.update_faces(mask)
        sub.remove_unreferenced_vertices()
        
        # Colorize
        sub.visual.face_colors = colors[i]
        out_scene.add_geometry(sub, node_name=name)
        
    out_path = os.path.join(r"q:\alisa_project\alisa\World\Web\overworld\props\scratch", "Hyena_Segmented.glb")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out_scene.export(out_path)
    print(f"\nSaved mathematically segmented topology to {out_path}.")

if __name__ == "__main__":
    main()
