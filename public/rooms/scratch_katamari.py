import trimesh
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patheffects as path_effects
from mpl_toolkits.mplot3d import Axes3D
from scipy.cluster.vq import kmeans2
import json
import os

def main():
    path = r"q:\alisa_project\alisa\World\Web\overworld\props\ready\Hyena.glb"
    scene = trimesh.load(path, force='scene')
    
    mesh = None
    for geom in scene.geometry.values():
        if isinstance(geom, trimesh.Trimesh) and len(geom.vertices) > 100:
            mesh = geom
            break
            
    if mesh is None: return

    pts = mesh.vertices
    K = 10
    
    # 1. Math Blind Clustering using K-Means on vertices
    centroids, labels = kmeans2(pts, K, minit='points')
    
    # 2. Extract Face Assignments (face gets label of majority of its vertices)
    face_assignments = np.zeros(len(mesh.faces), dtype=int)
    for i, f in enumerate(mesh.faces):
        v_labels = labels[f]
        u, c = np.unique(v_labels, return_counts=True)
        face_assignments[i] = u[np.argmax(c)]
        
    # 3. Calculate Metadata
    metadata = {}
    for k in range(K):
        mask = (face_assignments == k)
        if np.sum(mask) == 0: continue
        
        sub = mesh.copy()
        sub.update_faces(mask)
        sub.remove_unreferenced_vertices()
        
        b = sub.bounds
        vol = (b[1][0]-b[0][0]) * (b[1][1]-b[0][1]) * (b[1][2]-b[0][2])
        cm = np.mean(sub.vertices, axis=0) if len(sub.vertices)>0 else centroids[k]
        
        metadata[str(k)] = {
            "volume_approx": float(np.round(vol, 2)),
            "center": [float(np.round(c, 2)) for c in cm],
            "bounds_y": [float(np.round(b[0][1], 2)), float(np.round(b[1][1], 2))],
            "bounds_z": [float(np.round(b[0][2], 2)), float(np.round(b[1][2], 2))],
            "faces": int(np.sum(mask))
        }
    
    # Dump JSON
    import getpass
    out_dir = fr"C:\Users\{getpass.getuser()}\.gemini\antigravity\brain\1e235a25-c3b5-4e87-9e2f-3b81e04332c9"
    
    with open(os.path.join(out_dir, "katamari_meta.json"), "w") as f:
        json.dump(metadata, f, indent=4)
        
    # 4. Generate Visual "Grid" Radiography
    # We will plot 4 orthographic views
    fig = plt.figure(figsize=(10, 10))
    fig.patch.set_facecolor('black')
    
    # View 1: Side Profile (X vs Y/Z)
    ax1 = fig.add_subplot(221)
    ax1.scatter(pts[:, 2], pts[:, 1], c=labels, cmap='tab10', s=5)
    for k in range(K):
        c = metadata.get(str(k), {}).get("center", centroids[k])
        ax1.text(c[2], c[1], str(k), fontsize=20, color='white', weight='bold',
                 path_effects=[path_effects.withStroke(linewidth=3, foreground='black')])
    ax1.set_title("Side Profile (Z / Y)", color='white')
    ax1.set_facecolor('black')
    ax1.set_aspect('equal')
    
    # View 2: Front Profile
    ax2 = fig.add_subplot(222)
    ax2.scatter(pts[:, 0], pts[:, 1], c=labels, cmap='tab10', s=5)
    for k in range(K):
        c = metadata.get(str(k), {}).get("center", centroids[k])
        ax2.text(c[0], c[1], str(k), fontsize=20, color='white', weight='bold',
                 path_effects=[path_effects.withStroke(linewidth=3, foreground='black')])
    ax2.set_title("Front Profile (X / Y)", color='white')
    ax2.set_facecolor('black')
    ax2.set_aspect('equal')
    
    img_path = os.path.join(out_dir, "katamari_grid.png")
    plt.tight_layout()
    plt.savefig(img_path, facecolor=fig.get_facecolor())
    plt.close()
    
    print(f"Generated {img_path} and katamari_meta.json")

if __name__ == "__main__":
    main()
