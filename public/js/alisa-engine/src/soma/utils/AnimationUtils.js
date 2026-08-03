export class AnimationUtils {
    /**
     * Animates an object falling to a target position using quadratic easing.
     */
    static animateFall(obj, target, dur) {
        return new Promise(res => {
            const s = obj.position.clone(); 
            const t0 = Date.now();
            const iv = setInterval(() => {
                const t = Math.min((Date.now() - t0) / (dur * 1000), 1);
                obj.position.lerpVectors(s, target, t * t); // Quadratic ease-in
                obj.rotation.y += 0.08;
                if (t >= 1) { clearInterval(iv); res(); }
            }, 16);
        });
    }

    /**
     * Animates an object descending linearly.
     */
    static animateDescend(obj, startY, endY, dur) {
        return new Promise(res => {
            const t0 = Date.now();
            const iv = setInterval(() => {
                const t = Math.min((Date.now() - t0) / (dur * 1000), 1);
                obj.position.y = startY + (endY - startY) * t;
                obj.rotation.y += 0.03;
                if (t >= 1) { clearInterval(iv); res(); }
            }, 16);
        });
    }

    /**
     * Rotates an object on all axes.
     */
    static animateSpin(obj, duration, speed) {
        return new Promise(res => {
            const t0 = Date.now();
            const iv = setInterval(() => {
                const t = (Date.now() - t0) / 1000;
                obj.rotation.x += speed * 0.05;
                obj.rotation.y += speed * 0.08;
                obj.rotation.z += speed * 0.03;
                if (t >= duration) { clearInterval(iv); res(); }
            }, 16);
        });
    }

    /**
     * Waits for an object to reach a certain distance from a target.
     */
    static waitClose(obj, tgt, th, to) {
        return new Promise(res => {
            const t0 = Date.now();
            const iv = setInterval(() => {
                if (!obj || obj.position.distanceTo(tgt) < th || Date.now() - t0 > to) {
                    clearInterval(iv); res();
                }
            }, 50);
        });
    }
}
