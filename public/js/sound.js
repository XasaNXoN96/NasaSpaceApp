/* Sound, synthesised in the browser */
/* ============================== SOUND: everything synthesised, so the site needs no audio files ============================== */
window.SpaceSound = (function() {
    var KEY = 'spaceedu.settings';
    var DEF = { sound: false, amb: .5, ui: .5, voice: true, quality: '3d', motion: 'full' };
    var cfg = (function() {
        var c = Object.assign({}, DEF);
        try { var saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if (saved && typeof saved === 'object') Object.assign(c, saved); } catch (e) {}
        ['amb', 'ui'].forEach(function(k) { var n = Number(c[k]); c[k] = isFinite(n) ? Math.max(0, Math.min(1, n)) : DEF[k]; });
        c.sound = c.sound === true; c.voice = c.voice !== false;
        if (c.quality !== '2d') c.quality = '3d';
        if (c.motion !== 'reduced') c.motion = 'full';
        return c;
    })();
    var held = {};                                         // values shown for this visit only: the saved value to keep instead
    function save() { try { localStorage.setItem(KEY, JSON.stringify(Object.assign({}, cfg, held))); } catch (e) {} }
    var AC = window.AudioContext || window.webkitAudioContext;
    var ctx = null, master, ambBus, uiBus, fxBus, filmBus, filmWet = null, noiseBuf, amb = null, lastMeteor = 0;

    function ensure() {                                    // browsers only allow audio after a click, so build it lazily
        if (!AC) return null;
        if (!ctx) {
            ctx = new AC();
            master = ctx.createGain(); master.connect(ctx.destination);
            ambBus = ctx.createGain(); uiBus = ctx.createGain(); fxBus = ctx.createGain(); filmBus = ctx.createGain();
            [ambBus, uiBus, fxBus].forEach(function(b) { b.connect(master); });
            filmBus.connect(ctx.destination);             // a film has its own sound switch, independent of the site's
            if (ctx.createConvolver) {                    // and a hall: a reverb built from decaying noise, no audio file needed
                var conv = ctx.createConvolver(), len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
                for (var ch = 0; ch < 2; ch++) { var dd = ir.getChannelData(ch); for (var j = 0; j < len; j++) dd[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / len, 3.2); }
                conv.buffer = ir; var wet = ctx.createGain(); wet.gain.value = .32; filmWet = wet;
                filmBus.connect(conv); conv.connect(wet); wet.connect(ctx.destination);
            }
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
            var d = noiseBuf.getChannelData(0), b0 = 0, b1 = 0, b2 = 0;
            for (var i = 0; i < d.length; i++) {           // soft "pink-ish" noise
                var w = Math.random() * 2 - 1;
                b0 = .99765 * b0 + w * .099; b1 = .963 * b1 + w * .2965; b2 = .57 * b2 + w * 1.0526;
                d[i] = (b0 + b1 + b2 + w * .1848) * .16;
            }
            levels();
        }
        if (ctx.state === 'suspended') ctx.resume();
        return ctx;
    }
    function levels() {
        if (!ctx) return;
        var t = ctx.currentTime;
        master.gain.setTargetAtTime(cfg.sound ? 1 : 0, t, .08);
        ambBus.gain.setTargetAtTime(cfg.amb * .9, t, .2);
        uiBus.gain.setTargetAtTime(cfg.ui * .5, t, .05);
        fxBus.gain.setTargetAtTime(cfg.amb * .55, t, .1);
    }
    function noise(dest, loop) {
        var s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = !!loop; s.connect(dest); return s;
    }
    function osc(type, f, dest) { var o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.connect(dest); return o; }
    function env(g, t, a, peak, rel) {
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + rel);
    }

    /* the space ambience: a slow, deep pad, a breath of "solar wind" and now and then a faint chime */
    function startAmbience() {
        if (amb || !ensure()) return;
        var t = ctx.currentTime, out = ctx.createGain(); out.gain.value = 0; out.connect(ambBus);
        out.gain.linearRampToValueAtTime(1, t + 4);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = .7; lp.connect(out);
        var nodes = [55, 82.4, 110.2, 164.8].map(function(f, i) {
            var g = ctx.createGain(); g.gain.value = [.22, .14, .08, .035][i]; g.connect(lp);
            var o = osc(i % 2 ? 'triangle' : 'sine', f, g); o.detune.value = (i - 1.5) * 6; o.start(t); return o;
        });
        var lfo = osc('sine', .045, ctx.createGain()); lfo.disconnect();
        var lfoAmt = ctx.createGain(); lfoAmt.gain.value = 180; lfo.connect(lfoAmt); lfoAmt.connect(lp.frequency); lfo.start(t);
        var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = .6;
        var wg = ctx.createGain(); wg.gain.value = .05; bp.connect(wg); wg.connect(out);
        var wind = noise(bp, true); wind.start(t);
        var lfo2 = osc('sine', .07, ctx.createGain()); lfo2.disconnect();
        var l2 = ctx.createGain(); l2.gain.value = 380; lfo2.connect(l2); l2.connect(bp.frequency); lfo2.start(t);
        var echo = ctx.createDelay(2); echo.delayTime.value = .62;
        var fb = ctx.createGain(); fb.gain.value = .42; echo.connect(fb); fb.connect(echo); echo.connect(out);
        var NOTES = [523.3, 587.3, 659.3, 784, 880, 1046.5];
        var timer = setInterval(function() {                // a distant chime every 6 to 14 s
            if (!cfg.sound || document.hidden || Math.random() < .45) return;
            var tt = ctx.currentTime, g = ctx.createGain(); g.connect(echo); g.connect(out);
            env(g, tt, .02, .025, 3.5);
            var o = osc('sine', NOTES[Math.floor(Math.random() * NOTES.length)], g); o.start(tt); o.stop(tt + 4);
        }, 6000);
        amb = { out: out, stop: function() {
            var tt = ctx.currentTime; out.gain.setTargetAtTime(0, tt, .6); clearInterval(timer);
            setTimeout(function() { nodes.concat([lfo, lfo2, wind]).forEach(function(n) { try { n.stop(); } catch (e) {} }); out.disconnect(); }, 3000);
        } };
    }
    function stopAmbience() { if (amb) { amb.stop(); amb = null; } }

    /* a shooting star: filtered noise swooping down in pitch, panned to where it crosses the screen */
    function meteor(x, big) {
        if (!cfg.sound || !ctx || document.hidden) return;
        var now = performance.now(); if (now - lastMeteor < 450) return; lastMeteor = now;
        var t = ctx.currentTime, g = ctx.createGain(), bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 3; bp.frequency.setValueAtTime(big ? 2600 : 3400, t); bp.frequency.exponentialRampToValueAtTime(320, t + (big ? 1.4 : .9));
        var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
        bp.connect(g);
        if (pan) { pan.pan.setValueAtTime(Math.max(-1, Math.min(1, x * 2 - 1)), t); pan.pan.linearRampToValueAtTime(Math.max(-1, x * 2 - 1.6), t + 1); g.connect(pan); pan.connect(fxBus); }
        else g.connect(fxBus);
        env(g, t, .08, big ? .5 : .3, big ? 1.4 : .9);
        var n = noise(bp); n.start(t); n.stop(t + 1.8);
        if (big) { var o = osc('sine', 1400, g); o.frequency.exponentialRampToValueAtTime(240, t + 1.2); var og = ctx.createGain(); og.gain.value = .05; o.disconnect(); o.connect(og); og.connect(g); o.start(t); o.stop(t + 1.4); }
    }
    /* small interface sounds */
    function click(kind) {
        if (!cfg.sound || !cfg.ui || !ensure()) return;
        var t = ctx.currentTime, g = ctx.createGain(); g.connect(uiBus);
        if (kind === 'chime') {                            // achievement unlocked: a rising arpeggio
            [659.3, 784, 987.8, 1318.5].forEach(function(f, i) {
                var gg = ctx.createGain(); gg.connect(uiBus); env(gg, t + i * .09, .01, .22, .9);
                var o = osc('triangle', f, gg); o.start(t + i * .09); o.stop(t + i * .09 + 1);
            });
            return;
        }
        var hi = kind === 'on' ? 1180 : kind === 'off' ? 520 : 900;
        env(g, t, .004, .16, .07);
        var o = osc('sine', hi, g); o.frequency.exponentialRampToValueAtTime(hi * .72, t + .07); o.start(t); o.stop(t + .1);
    }

    /* film soundtrack pieces. Each playthrough gets its own channel (film.sess): stopping cuts that channel at once,
       so nothing that was already playing (a long rumble, a melody note, the reverb tail) carries on after Pause, a seek or Close */
    var film = { drone: null, sess: null };
    function session() {
        if (!film.sess) {
            film.sess = ctx.createGain(); film.sess.connect(filmBus);
            if (filmWet) { filmWet.gain.cancelScheduledValues(ctx.currentTime); filmWet.gain.setValueAtTime(.32, ctx.currentTime); }
        }
        return film.sess;
    }
    function filmOn(on) { if (!ensure()) return; filmBus.gain.setTargetAtTime(on ? .9 : 0, ctx.currentTime, .1); }
    function filmDrone(mood) {
        if (!ensure()) return;
        filmStop();
        var t = ctx.currentTime, out = ctx.createGain(); out.gain.value = 0; out.connect(session()); out.gain.linearRampToValueAtTime(.5, t + 2);
        var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = mood === 'sad' ? 520 : 900; lp.connect(out);
        var chord = mood === 'sad' ? [65.4, 98, 155.6, 196] : [73.4, 110, 146.8, 220];
        var os = chord.map(function(f, i) { var g = ctx.createGain(); g.gain.value = .12 / (i + 1) + .02; g.connect(lp); var o = osc(i ? 'triangle' : 'sine', f, g); o.detune.value = i * 4 - 6; o.start(t); return o; });
        /* a slow, generated melody over the pad: soft bell notes from a pentatonic scale, never the same twice */
        var SCALE = mood === 'sad' ? [220, 261.6, 293.7, 329.6, 392, 440, 523.3] : [293.7, 329.6, 370, 440, 493.9, 587.3, 659.3];
        var step = 0, mel = setInterval(function() {
            if (document.hidden || !film.drone) return;
            step++; if (Math.random() < .3) return;
            var tt = ctx.currentTime, f = SCALE[Math.floor(Math.random() * SCALE.length)] * (step % 8 === 0 ? .5 : 1);
            if (!film.sess) return;
            var g = ctx.createGain(); g.connect(film.sess); env(g, tt, .03, .07, 2.8);
            var a = osc('sine', f, g), b = osc('triangle', f * 2.005, g); var bg = ctx.createGain(); bg.gain.value = .25; b.disconnect(); b.connect(bg); bg.connect(g);
            a.start(tt); b.start(tt); a.stop(tt + 3); b.stop(tt + 3);
        }, mood === 'sad' ? 1500 : 1150);
        film.drone = { out: out, os: os, mel: mel };
    }
    function filmStop() {
        if (!ctx) return;
        var t = ctx.currentTime, d = film.drone, s = film.sess;
        film.drone = null; film.sess = null;
        if (d) clearInterval(d.mel);
        if (s) { s.gain.cancelScheduledValues(t); s.gain.setValueAtTime(s.gain.value, t); s.gain.linearRampToValueAtTime(0, t + .04); }   // a 40 ms fade: silent, without a click
        if (filmWet) { filmWet.gain.cancelScheduledValues(t); filmWet.gain.setValueAtTime(filmWet.gain.value, t); filmWet.gain.linearRampToValueAtTime(0, t + .04); }   // and no reverb tail
        setTimeout(function() { if (d) d.os.forEach(function(o) { try { o.stop(); } catch (e) {} }); if (s) s.disconnect(); }, 80);
    }
    function sfx(name, bus) {
        if (!ctx) return;
        bus = bus || (film.sess || session());
        var t = ctx.currentTime, g = ctx.createGain(); g.connect(bus);
        if (name === 'beep') {                             // a radio "ping" from the spacecraft
            [0, .22].forEach(function(dt) { var gg = ctx.createGain(); gg.connect(bus); env(gg, t + dt, .005, .12, .16); var o = osc('square', 1320, gg); var f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; o.disconnect(); o.connect(f); f.connect(gg); o.start(t + dt); o.stop(t + dt + .2); });
        } else if (name === 'thud') {                      // landing on airbags, or a heavy touch-down
            env(g, t, .01, .9, .6);
            var o = osc('sine', 120, g); o.frequency.exponentialRampToValueAtTime(38, t + .5); o.start(t); o.stop(t + .7);
        } else if (name === 'rumble') {                    // rocket launch
            var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.connect(g);
            env(g, t, 1.2, .9, 4.5);
            var n = noise(lp); n.start(t); n.stop(t + 6);
        } else if (name === 'wind') {                      // a Martian dust storm
            var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = .5; bp.connect(g);
            bp.frequency.linearRampToValueAtTime(1100, t + 3); bp.frequency.linearRampToValueAtTime(380, t + 7);
            env(g, t, 2, .7, 6);
            var w = noise(bp); w.start(t); w.stop(t + 8.5);
        } else if (name === 'whir') {                      // a rover motor
            env(g, t, .15, .12, 1.4);
            var m = osc('sawtooth', 95, g); var f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 600; m.disconnect(); m.connect(f2); f2.connect(g);
            m.frequency.linearRampToValueAtTime(140, t + .6); m.frequency.linearRampToValueAtTime(110, t + 1.4); m.start(t); m.stop(t + 1.6);
        } else if (name === 'fade') {                      // the signal dies away
            env(g, t, .01, .14, 2.6);
            var s = osc('sine', 880, g); s.frequency.exponentialRampToValueAtTime(220, t + 2.4); s.start(t); s.stop(t + 2.7);
        } else if (name === 'bounce') {                    // an airbag hitting the ground again, softer each time
            env(g, t, .006, .45, .35);
            var bo = osc('sine', 90, g); bo.frequency.exponentialRampToValueAtTime(40, t + .3); bo.start(t); bo.stop(t + .45);
        } else if (name === 'whoosh') {                    // something rushing past: noise swept through a filter
            var wf = ctx.createBiquadFilter(); wf.type = 'bandpass'; wf.Q.value = 1.4; wf.connect(g);
            wf.frequency.setValueAtTime(300, t); wf.frequency.exponentialRampToValueAtTime(2600, t + 1.1); wf.frequency.exponentialRampToValueAtTime(400, t + 2.2);
            env(g, t, .9, .5, 1.4);
            var wn = noise(wf); wn.start(t); wn.stop(t + 2.6);
        } else if (name === 'spark') {                     // a discovery: a glittering run of high notes
            [1568, 2093, 2637, 3136, 2349].forEach(function(f, i) { var gg = ctx.createGain(); gg.connect(bus); env(gg, t + i * .07, .005, .06, .8); var o = osc('sine', f, gg); o.start(t + i * .07); o.stop(t + i * .07 + .9); });
        } else if (name === 'sand') {                      // wheels digging into soft sand
            var sf = ctx.createBiquadFilter(); sf.type = 'highpass'; sf.frequency.value = 1400; sf.connect(g);
            env(g, t, .05, .35, 1.1);
            var sn = noise(sf); sn.start(t); sn.stop(t + 1.3);
            var sm = osc('sawtooth', 70, g); var sl = ctx.createBiquadFilter(); sl.type = 'lowpass'; sl.frequency.value = 400; sm.disconnect(); sm.connect(sl); sl.connect(g); sm.start(t); sm.stop(t + 1.2);
        } else if (name === 'storm') {                     // a planet-wide storm building
            var tb = ctx.createBiquadFilter(); tb.type = 'lowpass'; tb.frequency.setValueAtTime(200, t); tb.frequency.linearRampToValueAtTime(900, t + 7); tb.connect(g);
            env(g, t, 4, .8, 6);
            var tn = noise(tb); tn.start(t); tn.stop(t + 10);
        } else if (name === 'swell') {                     // a hopeful swell for the last line
            [261.6, 329.6, 392, 523.3].forEach(function(f, i) { var gg = ctx.createGain(); gg.connect(bus); env(gg, t + i * .12, 1.2, .06, 3.5); var o = osc('sine', f, gg); o.start(t + i * .12); o.stop(t + 5); });
        }
    }


    /* the 3D games: short effects and an engine hum that follows the rover's speed, all on the site's own sound switch */
    var eng = null;
    function gameSfx(name) {
        if (!cfg.sound || !cfg.ui || !ensure()) return;
        var t = ctx.currentTime;
        var tone = function(f, at, len, type, vol, to) { var gg = ctx.createGain(); gg.connect(uiBus); env(gg, t + at, .01, vol, len); var o = osc(type || 'sine', f, gg); if (to) o.frequency.exponentialRampToValueAtTime(to, t + at + len); o.start(t + at); o.stop(t + at + len + .1); };
        if (name === 'tick') tone(880, 0, .12, 'sine', .25);
        else if (name === 'go') { tone(1320, 0, .5, 'triangle', .3); tone(660, 0, .5, 'sine', .2); }
        else if (name === 'collect') [784, 988, 1319].forEach(function(f, i) { tone(f, i * .08, .5, 'triangle', .25); });
        else if (name === 'win') [523.3, 659.3, 784, 1046.5, 1318.5].forEach(function(f, i) { tone(f, i * .11, .9, 'triangle', .24); });
        else if (name === 'ok') [523.3, 659.3, 784].forEach(function(f, i) { tone(f, i * .12, .7, 'triangle', .22); });
        else if (name === 'fail') [392, 330, 262].forEach(function(f, i) { tone(f, i * .18, .8, 'sine', .25); });
        else if (name === 'alarm') { tone(740, 0, .14, 'square', .08); tone(740, .2, .14, 'square', .08); }
        else if (name === 'laser') tone(2400, 0, .35, 'sawtooth', .07, 600);
        else if (name === 'drill') tone(180 + Math.random() * 40, 0, .12, 'sawtooth', .05);
        else sfx(name, uiBus);                             // bump, whoosh, spark ... shared with the films
    }
    function gameEngine(v) {
        if (!ctx || !cfg.sound) { if (eng) eng.g.gain.setTargetAtTime(0, ctx ? ctx.currentTime : 0, .1); return; }
        if (!eng) {
            var g = ctx.createGain(); g.gain.value = 0; g.connect(uiBus);
            var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300; lp.connect(g);
            var o = osc('sawtooth', 55, lp), n = noise(lp, true); o.start(); n.start();
            eng = { g: g, lp: lp, o: o };
        }
        var t = ctx.currentTime;
        eng.g.gain.setTargetAtTime(v * .16, t, .12); eng.o.frequency.setTargetAtTime(45 + v * 70, t, .15); eng.lp.frequency.setTargetAtTime(220 + v * 700, t, .15);
    }

    /* any click is a chance to unlock audio once the visitor has switched sound on */
    document.addEventListener('pointerdown', function() { if (cfg.sound) { ensure(); if (cfg.amb > 0) startAmbience(); } }, { passive: true });
    document.addEventListener('visibilitychange', function() {
        if (!ctx) return;
        if (document.hidden) ctx.suspend(); else if (cfg.sound || film.drone) ctx.resume();
    });
    document.addEventListener('spaceedu:meteor', function(e) { meteor(e.detail.x, e.detail.big); });

    return {
        cfg: cfg,
        set: function(k, v) {
            cfg[k] = v; delete held[k]; save();
            if (k === 'sound') { if (v) { ensure(); if (cfg.amb > 0) startAmbience(); } else stopAmbience(); }
            if (k === 'amb') { if (v > 0 && cfg.sound) startAmbience(); else if (!v) stopAmbience(); }
            levels();
            document.dispatchEvent(new CustomEvent('spaceedu:settings', { detail: { key: k, value: v } }));
        },
        hold: function(k, v) { if (!(k in held)) held[k] = cfg[k]; cfg[k] = v; },   // change for this visit, never saved
        click: click, ensure: ensure,
        film: { on: filmOn, drone: filmDrone, stop: filmStop, sfx: sfx },
        game: { sfx: gameSfx, engine: gameEngine },
        supported: !!AC
    };
})();
