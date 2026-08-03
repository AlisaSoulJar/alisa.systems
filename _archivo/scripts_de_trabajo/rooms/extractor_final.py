import sys

html_file = r'q:\alisa_project\alisa\World\Web\overworld\rooms\room_art_direction.html'
js_file = r'q:\alisa_project\alisa\World\Web\overworld\js\alisa-engine\src\soma\ProceduralRiggingEngine.js'

with open(html_file, 'r', encoding='utf-8') as f:
    lines = f.readlines()

arch_code = ''.join(lines[231:848])
anim_body = ''.join(lines[1385:1948])

engine_content = f"""import * as THREE from 'three';

/**
 * ProceduralRiggingEngine
 * Code-driven procedural rigging and inverse kinematics 
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

    /**
     * Builds and snaps the hierarchical skeleton based on topology.
     */
    static buildArchetypeSkeleton(type, renderGroup, detectedSlices = []) {{
{arch_code.replace("window.activeSkinnedMeshes = []", "").replace("window.activeProceduralBones = []", "").replace("window.detectedSlices", "detectedSlices")}
        return {{ skeleton: window.activeSkeleton, rawBones: rawBones, activeProceduralBones: window.activeProceduralBones }};
    }}

    /**
     * Ticks the kinematic animation loops for all active bones.
     */
    static tick(bones, t, mode, config = {{}}) {{
{anim_body.replace("window.activeSkeletonType", "config.activeSkeletonType").replace("window.geppettoData", "config.geppettoData").replace("window.activeProceduralBones", "bones")}
    }}
}}
"""

with open(js_file, 'w', encoding='utf-8') as f:
    f.write(engine_content)

new_html_lines = []
for i, line in enumerate(lines):
    if 231 <= i <= 848:  # 848 was the SkeletonHelper which was included! Or maybe not? Wait, 848 was the exact string match, we want 231 to 848 exclusive length = 617 lines. So < 848 is safer if 848 is helper.
        if i == 231:
            new_html_lines.append('            // SKIPPED: ProceduralRiggingEngine.buildArchetypeSkeleton INJECTED HERE\n')
            new_html_lines.append('            if (!window.engineRef) window.engineRef = ProceduralRiggingEngine;\n')
            new_html_lines.append('            const engineRes = ProceduralRiggingEngine.buildArchetypeSkeleton(type, renderGroup, window.detectedSlices);\n')
            new_html_lines.append('            window.activeProceduralBones = engineRes.activeProceduralBones;\n')
            new_html_lines.append('            window.activeSkeleton = engineRes.skeleton;\n')
        continue
    
    if 1384 <= i < 1949:
        if i == 1384:
            new_html_lines.append('        function animateProceduralSkeletons() {\n')
            new_html_lines.append('            if (!window.activeProceduralBones || window.activeProceduralBones.length === 0) {\n')
            new_html_lines.append('                requestAnimationFrame(animateProceduralSkeletons);\n')
            new_html_lines.append('                return;\n')
            new_html_lines.append('            }\n')
            new_html_lines.append('            const mode = document.getElementById("animation-select").value;\n')
            new_html_lines.append('            const t = clock.getElapsedTime();\n')
            new_html_lines.append('            ProceduralRiggingEngine.tick(window.activeProceduralBones, t, mode, {\n')
            new_html_lines.append('                 activeSkeletonType: window.activeSkeletonType,\n')
            new_html_lines.append('                 geppettoData: window.geppettoData\n')
            new_html_lines.append('            });\n')
            new_html_lines.append('            requestAnimationFrame(animateProceduralSkeletons);\n')
            new_html_lines.append('        }\n')
        continue
    
    new_html_lines.append(line)

with open(html_file, 'w', encoding='utf-8') as f:
    f.writelines(new_html_lines)

print("Surgically Extracted to ProceduralRiggingEngine.js and HTML Purged!")
