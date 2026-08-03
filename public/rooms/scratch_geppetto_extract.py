import re

html_path = r'q:\alisa_project\alisa\World\Web\overworld\rooms\room_art_direction.html'
js_out_path = r'q:\alisa_project\alisa\World\Web\overworld\js\alisa-engine\src\soma\ProceduralRiggingEngine.js'

with open(html_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Usar Regex robusto para la extracción
# 1. Build Skeleton: capturar desde `if (type === 'canine'...` hasta `// ======= DIBUJAR CÚMULOS ========`
match_build = re.search(r'(if\s*\(\s*type\s*===\s*[\'"]canine[\'"].*?)\s*// ======= DIBUJAR CÚMULOS ========', text, re.DOTALL)
if not match_build:
    print("No se encontró build logic")
    exit(1)
build_logic = match_build.group(1).strip()
build_logic = build_logic[:build_logic.rfind('}')+1]

# 2. Animate: capturar desde el interior de `function animateProceduralSkeletons() {` hasta `requestAnimationFrame(animateProceduralSkeletons);`
match_anim = re.search(r'function animateProceduralSkeletons\(\)\s*\{(.*?)\s*requestAnimationFrame\(animateProceduralSkeletons\);', text, re.DOTALL)
if not match_anim:
    print("No se encontró animate logic")
    exit(1)
anim_logic = match_anim.group(1)

# Preparar motor
engine_code = f"""import * as THREE from 'three';

/**
 * ProceduralRiggingEngine
 * Handles pure code-driven procedural rigging and inverse kinematics 
 * for ALISA's 22 phylogenetic archetypes.
 */
export class ProceduralRiggingEngine {{

    static getGaitCurve(tNorm, phase, dutyCycle = 0.5) {{
        const localT = (tNorm + phase) % 1.0;
        const normLocalT = localT < 0 ? localT + 1.0 : localT;
        if (normLocalT >= dutyCycle) {{
            let swingT = (normLocalT - dutyCycle) / (1.0 - dutyCycle);
            return -Math.sin(swingT * Math.PI);
        }} else {{
            let stanceT = normLocalT / dutyCycle;
            return Math.sin(stanceT * Math.PI) * 0.3;
        }}
    }}

    static buildArchetypeSkeleton(type, meshGroup, scale = 1.0, onBoneCreated = null) {{
        let bones = [];
        let rootBone = null;
        let skeletonGroup = new THREE.Group();
        skeletonGroup.name = 'skeletonGroup';
        meshGroup.add(skeletonGroup);

        function addBone(startPt, endPt) {{
            const p1 = new THREE.Vector3(...startPt).multiplyScalar(scale);
            const p2 = new THREE.Vector3(...endPt).multiplyScalar(scale);
            const dist = p1.distanceTo(p2);
            
            const boneGeo = new THREE.BoxGeometry(0.08 * scale, dist, 0.08 * scale);
            const boneMat = new THREE.MeshBasicMaterial({{ color: 0x00ffcc, wireframe: true }});
            if (type === 'hovering') boneMat.color.setHex(0xffaa00);
            if (type === 'wheeled') boneMat.color.setHex(0xaaaaaa);

            const boneMesh = new THREE.Mesh(boneGeo, boneMat);
            boneMesh.isBone = true;
            boneMesh.userData = {{ start: p1, end: p2, worldPos: p1 }};

            boneMesh.position.copy(p1);
            const up = new THREE.Vector3(0, 1, 0);
            const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
            const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);
            boneMesh.rotation.setFromQuaternion(quaternion);
            boneMesh.position.add(dir.multiplyScalar(dist / 2));

            const wrapper = new THREE.Group();
            wrapper.position.copy(p1);
            wrapper.isBone = true;
            wrapper.userData = {{ start: p1, end: p2, worldPos: p1.clone() }};
            
            boneMesh.position.set(0, dist/2, 0); 
            wrapper.add(boneMesh);

            if (bones.length === 0) {{
                rootBone = wrapper;
                skeletonGroup.add(wrapper);
            }} else {{
                let bestParent = null;
                let bestDist = Infinity;
                bones.forEach(potentialParent => {{
                    const pEnd = potentialParent.userData.end;
                    const d = p1.distanceTo(pEnd);
                    if (d < bestDist && d < 0.2 * scale) {{ 
                        bestDist = d;
                        bestParent = potentialParent;
                    }}
                }});
                
                if (bestParent) {{
                    wrapper.position.sub(bestParent.userData.start);
                    bestParent.add(wrapper);
                }} else {{
                    skeletonGroup.add(wrapper);
                }}
            }}
            bones.push(wrapper);
            if(onBoneCreated) onBoneCreated(wrapper);
        }}

        {build_logic}

        skeletonGroup.position.set(0, 0, 0);
        return bones;
    }}

    static tick(bones, t, mode, config = {{}}) {{
{anim_logic.replace('window.activeSkeletonType', 'config.activeSkeletonType').replace('window.geppettoData', 'config.geppettoData')}
    }}
}}
"""

with open(js_out_path, 'w', encoding='utf-8') as f:
    f.write(engine_code)

print("Extraction successful")
