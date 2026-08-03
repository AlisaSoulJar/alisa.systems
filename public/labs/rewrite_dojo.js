const fs = require('fs');

let html = fs.readFileSync('procedural_animator_dojo_lab.html', 'utf8');

// 1) Isolate custom head swap logic
const headSwapRegex = /if \(headBone\) \{[\s\S]*?if \(window\.customHeads\) \{[\s\S]*?\}\s*\}/;
html = html.replace(headSwapRegex, `ProceduralRigging.applyHeadSwap(headBone, window.currentHead, window.customHeads, window.currentProceduralPose === 'headless');`);


// 2) Isolate procedural pose
const poseOverrideRegex = /const setRelBone = \([\s\S]*?if \(window\.currentProceduralPose === 'naruto'\) \{[\s\S]*?\}\s*\}/;

html = html.replace(poseOverrideRegex, `const poseBones = { rightArm, leftArm, neckBone };
ProceduralRigging.applyPose(poseBones, window.currentProceduralPose, zTargetingActive);
`);


// 3) Isolate sine wave locomotion
const katamariAnimRegex = /if \(window\.proceduralRigBones && !acrobatActive && !procTransformActive\) \{[\s\S]*?\/\/ --- End of Update Loop ---/;

html = html.replace(katamariAnimRegex, `if (window.proceduralRigBones && !acrobatActive && !procTransformActive) {
    let isWalking = moveVelocity.length() > 0.1 || currentActionName.includes('walk') || currentActionName.includes('run');
    ProceduralRigging.applyLocomotionWaves(
        window.proceduralRigBones, 
        isWalking, 
        dt, 
        window.currentAvatarScale, 
        seekerGroup
    );
}
// --- End of Update Loop ---`);

fs.writeFileSync('procedural_animator_dojo_lab.html', html, 'utf8');
console.log('Dojo HTML rewritten to use ProceduralRigging calls.');
