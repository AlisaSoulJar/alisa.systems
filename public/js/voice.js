/* AlisaVoice — shared avatar-voice layer for the overworld.
 * Foundations at full scale (see memory: plan-for-the-largest-version):
 *   - being-keyed, format-agnostic manifest (data/voice/manifest.json)
 *   - cached Opus pads play instantly (real passport voice)
 *   - speechSynthesis fallback covers any un-baked line
 * Live XTTS path (arbitrary text on demand) is a future Hub endpoint; the
 * manifest indirection means adding it won't touch callers.
 */
(function () {
  var MANIFEST_URL = 'data/voice/manifest.json';
  var manifest = {}, ready = false;
  var readyP = fetch(MANIFEST_URL)
    .then(function (r) { return r.ok ? r.json() : {}; })
    .then(function (m) { manifest = m || {}; ready = true; })
    .catch(function () { ready = true; });

  function norm(t) { return (t == null ? '' : ('' + t)).trim(); }

  function fallbackSpeak(text, opt) {
    try {
      if (!('speechSynthesis' in window) || !text) return;
      var u = new SpeechSynthesisUtterance(text);
      u.lang = (opt && opt.lang) || 'es-ES';
      u.pitch = (opt && opt.pitch != null) ? opt.pitch : 0.4;
      u.rate = (opt && opt.rate) || 0.92;
      var vs = speechSynthesis.getVoices();
      var v = vs.find(function (x) { return /es/i.test(x.lang) && /male|hombre|jorge|pablo|diego|enrique/i.test(x.name); })
           || vs.find(function (x) { return /es/i.test(x.lang); });
      if (v) u.voice = v;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) {}
  }

  // speak(being, text[, opt]) -> resolves {mode:'pad'|'tts'|'none', src?, audio?}
  function speak(being, text, opt) {
    opt = opt || {};
    var t = norm(text);
    if (!t) return Promise.resolve({ mode: 'none' });
    var go = function () {
      var byBeing = manifest[being] || {};
      var pad = byBeing[t];
      if (pad) {
        try {
          var a = new Audio(pad);
          var p = a.play();
          if (p && p.catch) p.catch(function () { fallbackSpeak(t, opt); });
          return { mode: 'pad', src: pad, audio: a };
        } catch (e) {}
      }
      fallbackSpeak(t, opt);
      return { mode: 'tts' };
    };
    return ready ? Promise.resolve(go()) : readyP.then(go);
  }

  window.AlisaVoice = { speak: speak, ready: function () { return readyP; }, manifest: function () { return manifest; } };
})();
