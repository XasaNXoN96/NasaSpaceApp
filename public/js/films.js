/* The four films */
/* ============================== FILMS: four short animated films, drawn frame by frame in the browser ==============================
   There is no video file and no photograph here. Every frame (the planets, the landscapes, the rovers, the dust, the light) is
   computed on a canvas from code, so the films weigh almost nothing, stay sharp at any size and can be paused or scrubbed
   to any moment. Each scene is a function of time only, so a paused frame is always the same frame. */
window.SpaceFilms = (function() {
    var W = 960, H = 540, TAU = Math.PI * 2;
    var clamp = function(v, a, b) { return Math.max(a, Math.min(b, v)); };
    var ease = function(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); };
    var easeOut = function(p) { p = clamp(p, 0, 1); return 1 - Math.pow(1 - p, 3); };
    var lerp = function(a, b, p) { return a + (b - a) * p; };
    var span = function(a, b, x) { return ease((x - a) / (b - a)); };        // 0 before a, 1 after b, smooth between
    var mixc = function(a, b, p) { return [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)]; };
    var rgb = function(c, a) { return (a == null ? 'rgb(' : 'rgba(') + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + (a == null ? ')' : ',' + clamp(a, 0, 1).toFixed(3) + ')'); };
    function seeded(seed) { return function() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
    var rnd = seeded(7);

    /* ---- value noise: the raw material of every planet, hill and cloud ---- */
    function hash(x, y) { var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
    function vnoise(x, y) {
        var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
        var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function fbm(x, y, oct) { var s = 0, a = .5, f = 1; for (var i = 0; i < (oct || 5); i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, oct || 5)); }

    /* ---- textures, baked once into small canvases the first time a film opens ---- */
    function bake(w, h, fn) {
        var c = document.createElement('canvas'); c.width = w; c.height = h;
        var x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
        for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
            var col = fn(i / w, j / h), k = (j * w + i) * 4;
            d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = col[3] == null ? 255 : col[3];
        }
        x.putImageData(im, 0, 0); return c;
    }
    function twice(c) { var d = document.createElement('canvas'); d.width = c.width * 2; d.height = c.height; var x = d.getContext('2d'); x.drawImage(c, 0, 0); x.drawImage(c, c.width, 0); return d; }
    var seam = function(f, u, v) { return f(u, v) * (1 - u) + f(u - 1, v) * u; };   // wraps around the planet without a join
    var TX = null;
    function textures() {
        if (TX) return TX;
        TX = {
            mars: twice(bake(256, 128, function(u, v) {
                var n = seam(function(a, b) { return fbm(a * 6 + 11, b * 3, 5); }, u, v), m = seam(function(a, b) { return fbm(a * 16, b * 8 + 5, 3); }, u, v);
                var c = mixc([78, 38, 26], [198, 112, 66], clamp((n - .3) * 2.3, 0, 1));
                c = mixc(c, [230, 162, 112], clamp((m - .55) * 2, 0, 1) * .5);
                var lat = Math.abs(v - .5) * 2; c = mixc(c, [240, 232, 226], clamp((lat - .9 - (m - .5) * .08) / .07, 0, 1) * .8);   // soft polar caps
                return c;
            })),
            jupiter: twice(bake(256, 128, function(u, v) {
                var t = seam(function(a, b) { return fbm(a * 7, b * 14 + 3, 4); }, u, v), b = Math.sin((v * 15 + (t - .5) * 2.4) * Math.PI);
                var c = b > 0 ? mixc([226, 204, 168], [246, 238, 222], b * .7) : mixc([226, 204, 168], [150, 98, 66], -b * .85);
                var du = (u - .32) / .075, dv = (v - .64) / .048, d = du * du + dv * dv;
                if (d < 1) c = mixc(c, [204, 96, 60], (1 - d) * .92);                    // the Great Red Spot
                var pol = Math.abs(v - .5) * 2; if (pol > .78) c = mixc(c, [140, 124, 116], (pol - .78) * 3);
                return c;
            })),
            saturn: twice(bake(256, 128, function(u, v) {
                var t = seam(function(a, b) { return fbm(a * 5, b * 10 + 9, 3); }, u, v), b = Math.sin((v * 11 + (t - .5)) * Math.PI);
                return b > 0 ? mixc([224, 202, 152], [240, 226, 188], b * .6) : mixc([224, 202, 152], [186, 152, 104], -b * .6);
            })),
            earth: twice(bake(256, 128, function(u, v) {
                var l = seam(function(a, b) { return fbm(a * 5 + 40, b * 5, 5); }, u, v), cl = seam(function(a, b) { return fbm(a * 9 + 70, b * 9, 4); }, u, v);
                var lat = Math.abs(v - .5) * 2;
                var c = l > .53 ? mixc([64, 108, 48], [160, 136, 88], clamp((l - .53) * 4, 0, 1)) : mixc([10, 34, 100], [30, 96, 176], clamp(l * 1.7, 0, 1));
                if (lat > .8) c = mixc(c, [240, 246, 255], .92);
                if (cl > .55) c = mixc(c, [250, 252, 255], clamp((cl - .55) * 4.5, 0, .94));
                return c;
            })),
            io: twice(bake(128, 64, function(u, v) {
                var n = seam(function(a, b) { return fbm(a * 9 + 3, b * 9, 4); }, u, v);
                return n > .62 ? [168, 72, 28] : n < .34 ? [248, 244, 210] : mixc([214, 190, 80], [236, 214, 110], n);
            })),
            storm: twice(bake(256, 128, function(u, v) {
                var n = seam(function(a, b) { return fbm(a * 5 + 21, b * 4, 5); }, u, v);
                return [204, 148, 98, clamp((n - .42) * 5, 0, 1) * 255];
            })),
            nebWarm: bake(240, 135, function(u, v) {
                var n = fbm(u * 3 + 2, v * 2.2, 5), m = fbm(u * 6, v * 5 + 8, 3);
                return [lerp(90, 200, m), lerp(40, 90, n), lerp(80, 120, m), clamp((n - .45) * 2.2, 0, 1) * 150];
            }),
            nebCool: bake(240, 135, function(u, v) {
                var n = fbm(u * 3 + 30, v * 2.2, 5), m = fbm(u * 6 + 4, v * 5, 3);
                return [lerp(40, 140, m), lerp(70, 110, n), lerp(140, 240, n), clamp((n - .44) * 2.2, 0, 1) * 160];
            }),
            soil: bake(256, 256, function(u, v) {
                var n = fbm(u * 10, v * 10, 5), s = hash(Math.floor(u * 256), Math.floor(v * 256));
                var c = mixc([96, 52, 32], [176, 104, 66], n);
                return s > .985 ? mixc(c, [230, 190, 150], .6) : s < .02 ? mixc(c, [40, 20, 14], .6) : c;
            }),
            grain: bake(128, 128, function() { var k = Math.random() * 255; return [k, k, k, 255]; })
        };
        return TX;
    }

    /* ---- the sky, the light and the ground ---- */
    var STARS = Array.from({ length: 260 }, function() { return { x: rnd() * W, y: rnd() * H, r: rnd() * 1.3 + .25, ph: rnd() * 9, d: rnd() }; });
    var ROCKS = Array.from({ length: 70 }, function() { return { x: rnd() * 1800, d: rnd(), r: 4 + rnd() * rnd() * 22, k: rnd() }; });
    var PUFF = Array.from({ length: 18 }, function() { return { a: Math.PI + rnd() * Math.PI, v: 30 + rnd() * 90, r: 6 + rnd() * 14 }; });
    var DUST = Array.from({ length: 180 }, function() { return [rnd() * W, rnd() * H, rnd() * 2 + .5, rnd() * .6 + .4]; });
    function fill(g, a, b, c) {
        var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, a); if (c) { gr.addColorStop(.6, b); gr.addColorStop(1, c); } else gr.addColorStop(1, b);
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    function stars(g, s, alpha, drift) {
        if (alpha <= 0) return;
        g.fillStyle = '#fff';
        STARS.forEach(function(st) {
            var x = ((st.x - (drift || 0) * s * (.2 + st.d)) % W + W) % W;
            g.globalAlpha = alpha * (.35 + .65 * Math.abs(Math.sin(s * .7 + st.ph))) * (.4 + st.d * .6);
            g.beginPath(); g.arc(x, st.y, st.r * (.6 + st.d * .5), 0, TAU); g.fill();
        });
        g.globalAlpha = 1;
    }
    function nebula(g, cool, alpha, shift) {
        var t = textures(); g.globalAlpha = alpha; g.imageSmoothingEnabled = true;
        g.drawImage(cool ? t.nebCool : t.nebWarm, -40 - (shift || 0), -20, W + 120, H + 60); g.globalAlpha = 1;
    }
    function space(g, s, o) {
        o = o || {};
        fill(g, '#02040b', '#050d1f', '#08152c');
        nebula(g, o.cool !== false, o.neb == null ? .55 : o.neb, s * 2);
        stars(g, s, o.stars == null ? 1 : o.stars, o.drift || 3);
    }
    function glow(g, x, y, r, col, a) {
        if (a <= 0) return;
        var gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col + a + ')'); gr.addColorStop(1, col + '0)');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    function sun(g, x, y, r, a) {
        glow(g, x, y, r * 9, 'rgba(255,214,150,', .35 * a);
        glow(g, x, y, r * 3, 'rgba(255,240,210,', .8 * a);
        g.fillStyle = 'rgba(255,253,244,' + a + ')'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    function flare(g, x, y, a) {                             // lens ghosts along the line through the centre of the frame
        if (a <= 0) return;
        var dx = W / 2 - x, dy = H / 2 - y;
        [[.35, 18, 'rgba(120,200,255,'], [.6, 34, 'rgba(255,190,120,'], [1.25, 52, 'rgba(140,255,210,'], [1.6, 12, 'rgba(255,255,255,']].forEach(function(f) {
            glow(g, x + dx * f[0] * 2, y + dy * f[0] * 2, f[1], f[2], .16 * a);
        });
    }
    /* a sphere with a texture that turns: the texture is cut into vertical strips whose widths follow the curve of the globe */
    function globe(g, tex, x, y, r, rot, o) {
        o = o || {};
        var tw = tex.width / 2, th = tex.height, n = clamp(Math.round(r / 3), 24, 110);
        g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
        for (var i = 0; i < n; i++) {
            var a0 = -1 + 2 * i / n, a1 = -1 + 2 * (i + 1) / n, l0 = Math.asin(a0), l1 = Math.asin(a1);
            var u0 = ((l0 / TAU + rot) % 1 + 1) % 1 * tw, sw = Math.max((l1 - l0) / TAU * tw, .4);
            g.drawImage(tex, u0, 0, sw * 1.04, th, x + a0 * r - .4, y - r, (a1 - a0) * r + 1.6, 2 * r);   // strips overlap so no seam shows
        }
        var lx = o.lx == null ? -.7 : o.lx, ly = o.ly == null ? -.35 : o.ly, ln = Math.hypot(lx, ly) || 1, ph = o.phase == null ? .58 : o.phase;
        lx /= ln; ly /= ln;
        var sh = g.createLinearGradient(x + lx * r, y + ly * r, x - lx * r, y - ly * r);
        sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(clamp(ph - .16, 0, 1), 'rgba(0,0,0,.04)');
        sh.addColorStop(clamp(ph, 0, 1), 'rgba(0,0,0,.62)'); sh.addColorStop(clamp(ph + .16, 0, 1), 'rgba(0,0,0,.95)'); sh.addColorStop(1, 'rgba(0,0,0,.97)');
        if (o.overlay) o.overlay(x, y, r);
        g.fillStyle = sh; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        var limb = g.createRadialGradient(x + lx * r * .3, y + ly * r * .3, r * .3, x, y, r);
        limb.addColorStop(0, 'rgba(255,255,255,.07)'); limb.addColorStop(.75, 'rgba(0,0,0,0)'); limb.addColorStop(1, 'rgba(0,0,0,.4)');
        g.fillStyle = limb; g.fillRect(x - r, y - r, 2 * r, 2 * r);
        g.restore();
        if (o.atm) {
            var a = g.createRadialGradient(x, y, 0, x, y, r * 1.12);          // a thin bright rim only: inside the disc the glow is transparent
            a.addColorStop(0, o.atm + '0)'); a.addColorStop(.8, o.atm + '0)'); a.addColorStop(.97 / 1.12, o.atm + '.45)'); a.addColorStop(1, o.atm + '0)');
            g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = a; g.beginPath(); g.arc(x, y, r * 1.12, 0, TAU); g.fill(); g.restore();
        }
    }
    function rings(g, x, y, r, tilt, back) {
        g.save(); g.translate(x, y); g.rotate(tilt); g.scale(1, .24);
        [[1.24, 1.5, 'rgba(190,170,136,.3)'], [1.52, 1.93, 'rgba(232,212,170,.85)'], [2.0, 2.27, 'rgba(206,188,150,.6)'], [2.3, 2.34, 'rgba(206,188,150,.25)']].forEach(function(b) {
            g.strokeStyle = b[2]; g.lineWidth = (b[1] - b[0]) * r; g.beginPath(); g.arc(0, 0, (b[0] + b[1]) / 2 * r, back ? Math.PI : 0, back ? TAU : Math.PI); g.stroke();
        });
        g.restore();
    }
    /* a line of hills: one-dimensional noise, so the same hills come back when the camera returns */
    function ridge(g, y0, amp, scale, seed, off, col) {
        g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
        for (var x = 0; x <= W + 8; x += 8) g.lineTo(x, y0 - amp * fbm((x + off) / scale, seed, 4));
        g.lineTo(W, H); g.closePath(); g.fill();
    }
    function rock(g, x, y, r, k, light) {
        g.fillStyle = 'rgba(0,0,0,.32)'; g.beginPath(); g.ellipse(x + r * .5, y + 1, r * 1.1, r * .22, 0, 0, TAU); g.fill();
        var gr = g.createLinearGradient(x - r, y - r, x + r, y);
        gr.addColorStop(0, rgb(mixc([196, 128, 86], [228, 170, 128], k), light)); gr.addColorStop(1, rgb([64, 32, 22], light));
        g.fillStyle = gr; g.beginPath(); g.ellipse(x, y - r * .34, r, r * (.45 + k * .2), (k - .5) * .3, 0, TAU); g.fill();
    }
    /* a Martian landscape seen from the side. o: cam (pan in px), night 0..1, storm 0..1, sun [x, y], blue (sunset halo) */
    function marsScape(g, s, o) {
        o = o || {};
        var cam = o.cam || 0, night = o.night || 0, storm = o.storm || 0, gy = o.gy || 352;
        var top = mixc(mixc([170, 122, 94], [10, 8, 20], night), [96, 52, 26], storm), hor = mixc(mixc([228, 186, 146], [44, 26, 36], night), [160, 90, 44], storm);
        var gr = g.createLinearGradient(0, 0, 0, gy); gr.addColorStop(0, rgb(top)); gr.addColorStop(1, rgb(hor));
        g.fillStyle = gr; g.fillRect(0, 0, W, gy + 4);
        if (night > .25) { stars(g, s, (night - .25) / .75 * (1 - storm), 0); if (o.milky) nebula(g, true, (night - .4) * .5, 0); }
        if (o.sun) {
            glow(g, o.sun[0], o.sun[1], 170, 'rgba(110,165,235,', .6 * (o.blue || 0) * (1 - storm));   // Martian sunsets are blue
            sun(g, o.sun[0], o.sun[1], 6, (1 - storm * .92) * (1 - night * .6));
        }
        if (o.earth) { glow(g, o.earth[0], o.earth[1], 10, 'rgba(140,190,255,', .9 * night); g.fillStyle = 'rgba(190,220,255,' + night + ')'; g.beginPath(); g.arc(o.earth[0], o.earth[1], 1.8, 0, TAU); g.fill(); }
        var lit = 1 - night * .82;
        if (o.sun && night < .6 && !storm) {                   // soft shafts of light from the Sun through the dusty air
            g.save(); g.globalCompositeOperation = 'lighter';
            for (var ri = 0; ri < 5; ri++) {
                var ang = .5 + ri * .32 + Math.sin(s * .15 + ri) * .03, len = 700;
                var rg = g.createLinearGradient(o.sun[0], o.sun[1], o.sun[0] + Math.cos(ang) * len, o.sun[1] + Math.sin(ang) * len);
                rg.addColorStop(0, 'rgba(255,220,170,' + (.035 * (1 - night)).toFixed(3) + ')'); rg.addColorStop(.6, 'rgba(255,220,170,' + (.012 * (1 - night)).toFixed(3) + ')'); rg.addColorStop(1, 'rgba(255,220,170,0)');
                g.fillStyle = rg; g.beginPath(); g.moveTo(o.sun[0], o.sun[1]);
                g.lineTo(o.sun[0] + Math.cos(ang - .09) * len, o.sun[1] + Math.sin(ang - .09) * len); g.lineTo(o.sun[0] + Math.cos(ang + .09) * len, o.sun[1] + Math.sin(ang + .09) * len); g.fill();
            }
            g.restore();
        }
        ridge(g, gy - 34, 74, 300, 1.3, cam * .12, rgb(mixc(mixc([186, 132, 104], [36, 24, 30], night), [150, 92, 54], storm * .7)));
        ridge(g, gy - 8, 42, 150, 7.7, cam * .35, rgb(mixc(mixc([152, 92, 62], [26, 16, 20], night), [126, 70, 40], storm * .6)));
        var gg = g.createLinearGradient(0, gy - 10, 0, H);
        gg.addColorStop(0, rgb(mixc(mixc([170, 100, 64], [28, 17, 18], night), [140, 78, 42], storm * .5)));
        gg.addColorStop(1, rgb(mixc([92, 46, 28], [10, 6, 8], night)));
        g.fillStyle = gg; g.beginPath(); g.moveTo(0, H);
        for (var x = 0; x <= W + 12; x += 12) g.lineTo(x, gy - 7 * fbm((x + cam * .7) / 90, 3.1, 3));
        g.lineTo(W, H); g.fill();
        var hz = g.createLinearGradient(0, gy - 70, 0, gy + 30);           // dust haze lying over the horizon
        hz.addColorStop(0, rgb(hor, 0)); hz.addColorStop(.6, rgb(hor, .38 * (1 - night * .6))); hz.addColorStop(1, rgb(hor, 0));
        g.fillStyle = hz; g.fillRect(0, gy - 70, W, 100);
        if (o.crater) {                                      // a small crater bowl the camera passes
            var cx = o.crater[0] - cam * .9, cy = gy + 128, cr = o.crater[1];
            var cg = g.createRadialGradient(cx - cr * .3, cy - 8, 4, cx, cy, cr);
            cg.addColorStop(0, rgb([60, 30, 20], lit)); cg.addColorStop(.85, rgb([120, 66, 40], lit)); cg.addColorStop(1, rgb([196, 128, 86], lit));
            g.fillStyle = cg; g.beginPath(); g.ellipse(cx, cy, cr, cr * .22, 0, 0, TAU); g.fill();
        }
        if (o.rocks !== false) ROCKS.forEach(function(r) {
            var par = .4 + r.d * 1.3, y = gy + 10 + r.d * r.d * (H - gy - 12), sp = W + 420;
            var x = ((r.x - cam * par) % sp + sp) % sp - 210;
            rock(g, x, y, r.r * (.35 + r.d * 1.3), r.k, lit);
        });
        if (o.fg !== false) {                                // two big rocks right in front of the lens frame the shot
            [[-60, 1.0, 150], [W + 40, 1.0, 120]].forEach(function(f, i) {
                var fx = f[0] - ((cam * 1.8) % (W + 400)) * 0, fy = H + 30, fr = f[2];
                var fg = g.createRadialGradient(fx + (i ? -fr * .3 : fr * .3), fy - fr * .7, fr * .1, fx, fy, fr * 1.2);
                fg.addColorStop(0, rgb([96, 52, 34], lit)); fg.addColorStop(1, rgb([24, 12, 8], lit));
                g.fillStyle = fg; g.beginPath(); g.ellipse(fx, fy, fr * 1.3, fr * .75, i ? .25 : -.25, 0, TAU); g.fill();
            });
            var bt = g.createLinearGradient(0, H - 90, 0, H); bt.addColorStop(0, 'rgba(0,0,0,0)'); bt.addColorStop(1, 'rgba(0,0,0,.35)');
            g.fillStyle = bt; g.fillRect(0, H - 90, W, 90);
        }
        if (o.frost) {                                       // frost glinting in starlight
            for (var i = 0; i < 90; i++) { var fx = hash(i, 4) * W, fy = gy + 8 + hash(i, 9) * (H - gy); g.fillStyle = 'rgba(220,235,255,' + (o.frost * (.25 + .75 * Math.abs(Math.sin(s * 2 + i)))).toFixed(3) + ')'; g.fillRect(fx, fy, 1.6, 1.6); }
        }
        return gy;
    }
    function dustStorm(g, k, s) {                             // blowing dust and an orange veil
        if (k <= 0) return;
        g.fillStyle = 'rgba(150,82,40,' + (k * .66).toFixed(3) + ')'; g.fillRect(0, 0, W, H);
        g.strokeStyle = 'rgba(236,176,120,' + (k * .5).toFixed(3) + ')';
        DUST.forEach(function(d) {
            var x = (d[0] + s * 300 * d[3]) % (W + 60) - 30, y = d[1] + Math.sin(s * 2 + d[0]) * 6;
            g.lineWidth = d[2]; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 30 * d[3], y + 3); g.stroke();
        });
    }
    function puff(g, x, y, age, scale) {                    // dust kicked up by an impact
        if (age < 0 || age > 1.8) return;
        var k = 1 - age / 1.8;
        PUFF.forEach(function(p) {
            var d = easeOut(age / 1.4) * p.v * scale, px = x + Math.cos(p.a) * d, py = y + Math.sin(p.a) * d * .45 - age * 10;
            g.fillStyle = 'rgba(196,132,90,' + (k * .4).toFixed(3) + ')'; g.beginPath(); g.arc(px, py, p.r * scale * (.5 + age), 0, TAU); g.fill();
        });
    }

    /* ---- the spacecraft ---- */
    function wheel(g, x, y, r, rot) {
        g.fillStyle = '#16181d'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
        g.strokeStyle = '#3a3f48'; g.lineWidth = r * .22; g.beginPath(); g.arc(x, y, r * .86, 0, TAU); g.stroke();
        g.strokeStyle = '#a7aeb8'; g.lineWidth = Math.max(1, r * .1);
        for (var i = 0; i < 6; i++) { var a = rot + i * TAU / 6; g.beginPath(); g.moveTo(x + Math.cos(a) * r * .25, y + Math.sin(a) * r * .25); g.lineTo(x + Math.cos(a) * r * .74, y + Math.sin(a) * r * .74); g.stroke(); }
        g.fillStyle = '#c9ced6'; g.beginPath(); g.arc(x, y, r * .24, 0, TAU); g.fill();
    }
    /* Spirit / Opportunity, facing right. o: rot (wheels), stuck (index of a wheel that will not turn), dust 0..1, sink px */
    function mer(g, x, y, s, o) {
        o = o || {};
        var rot = o.rot || 0;
        g.save(); g.translate(x, y + (o.sink || 0)); g.scale(s, s);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(-6, 2, 84, 8, 0, 0, TAU); g.fill();
        g.strokeStyle = '#8c939d'; g.lineWidth = 3.4; g.lineJoin = 'round';
        g.beginPath(); g.moveTo(-52, -12); g.lineTo(-24, -36); g.lineTo(-2, -24); g.lineTo(-6, -12); g.moveTo(-2, -24); g.lineTo(38, -12); g.stroke();
        [-52, -6, 38].forEach(function(wx, i) { wheel(g, wx, -12 + (o.sink || 0) * .0, 12.5, i === o.stuck ? .4 : rot); });
        var bg = g.createLinearGradient(0, -54, 0, -30); bg.addColorStop(0, '#f1f2f4'); bg.addColorStop(1, '#a9adb5');
        g.fillStyle = bg; g.beginPath(); g.moveTo(-40, -52); g.lineTo(32, -52); g.lineTo(28, -32); g.lineTo(-36, -32); g.closePath(); g.fill();
        g.fillStyle = '#c99a3e'; g.fillRect(-36, -36, 64, 4);                          // gold foil
        var pg = g.createLinearGradient(-68, -60, 56, -54); pg.addColorStop(0, '#17264c'); pg.addColorStop(.5, '#2d4b8e'); pg.addColorStop(1, '#17264c');
        g.fillStyle = pg; g.beginPath(); g.moveTo(-70, -55); g.lineTo(58, -55); g.lineTo(52, -61); g.lineTo(-62, -61); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(170,200,255,.25)'; g.lineWidth = .6;
        for (var c = -60; c < 54; c += 8) { g.beginPath(); g.moveTo(c, -61); g.lineTo(c - 2, -55); g.stroke(); }
        if (o.dust) { g.fillStyle = 'rgba(184,108,62,' + clamp(o.dust, 0, .92) + ')'; g.beginPath(); g.moveTo(-70, -55); g.lineTo(58, -55); g.lineTo(52, -61); g.lineTo(-62, -61); g.closePath(); g.fill(); }
        g.fillStyle = '#d9dde3'; g.fillRect(20, -104, 4.5, 44);                         // mast
        g.fillStyle = '#e8eaee'; g.fillRect(9, -114, 28, 11);                          // Pancam head
        g.fillStyle = '#1d232c'; g.beginPath(); g.arc(31, -108.5, 2.8, 0, TAU); g.arc(15, -108.5, 2.8, 0, TAU); g.fill();
        g.fillStyle = 'rgba(140,220,255,.7)'; g.fillRect(30, -110, 1.4, 1.4); g.fillRect(14, -110, 1.4, 1.4);
        g.strokeStyle = '#cfd3da'; g.lineWidth = 2; g.beginPath(); g.moveTo(-26, -60); g.lineTo(-26, -72); g.stroke();   // high-gain dish
        g.fillStyle = '#e4e6ea'; g.beginPath(); g.ellipse(-26, -76, 11, 3.5, -.25, 0, TAU); g.fill();
        g.beginPath(); g.moveTo(-44, -60); g.lineTo(-44, -90); g.stroke();             // low-gain antenna
        g.strokeStyle = '#9aa1ab'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(32, -36); g.lineTo(46, -28); g.lineTo(44, -18); g.stroke();   // stowed arm
        g.restore();
    }
    function sojo(g, x, y, s, rot) {                         // Sojourner, facing right
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(0, 1.5, 36, 4, 0, 0, TAU); g.fill();
        g.strokeStyle = '#a2a9b3'; g.lineWidth = 2; g.beginPath(); g.moveTo(-24, -7); g.lineTo(-10, -19); g.lineTo(2, -11); g.moveTo(-10, -19); g.lineTo(24, -7); g.stroke();
        [-24, 0, 24].forEach(function(wx) { wheel(g, wx, -7, 7, rot || 0); });
        var bg = g.createLinearGradient(0, -28, 0, -16); bg.addColorStop(0, '#eef0f2'); bg.addColorStop(1, '#a8acb4');
        g.fillStyle = bg; g.fillRect(-19, -27, 38, 11);
        g.fillStyle = '#c99a3e'; g.fillRect(-19, -18, 38, 2);
        var pg = g.createLinearGradient(-26, 0, 26, 0); pg.addColorStop(0, '#1a2a52'); pg.addColorStop(.5, '#34548f'); pg.addColorStop(1, '#1a2a52');
        g.fillStyle = pg; g.fillRect(-26, -31, 52, 4);
        g.fillStyle = '#1d232c'; g.fillRect(17, -25, 4, 3);
        g.strokeStyle = '#d9dde3'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-14, -31); g.lineTo(-14, -48); g.stroke();
        g.fillStyle = '#e8eaee'; g.beginPath(); g.arc(-14, -49, 1.8, 0, TAU); g.fill();
        g.restore();
    }
    function airbags(g, x, y, r, rot) {                      // the airbag cluster around a lander
        g.save(); g.translate(x, y); g.rotate(rot);
        for (var i = 0; i < 7; i++) {
            var a = i / 7 * TAU, lx = Math.cos(a) * r * .62, ly = Math.sin(a) * r * .55, lr = r * .52;
            var gr = g.createRadialGradient(lx - lr * .4, ly - lr * .4, lr * .1, lx, ly, lr);
            gr.addColorStop(0, '#fbf6ea'); gr.addColorStop(1, '#a89f8e'); g.fillStyle = gr;
            g.beginPath(); g.arc(lx, ly, lr, 0, TAU); g.fill();
            g.strokeStyle = 'rgba(120,110,96,.5)'; g.lineWidth = 1; g.beginPath(); g.arc(lx, ly, lr * .7, a - 1, a + 1); g.stroke();
        }
        var c = g.createRadialGradient(-r * .2, -r * .2, 2, 0, 0, r * .6); c.addColorStop(0, '#fffaf0'); c.addColorStop(1, '#b8ae9c');
        g.fillStyle = c; g.beginPath(); g.arc(0, 0, r * .58, 0, TAU); g.fill();
        g.restore();
    }
    function petal(g, hx, dir, open, len) {                  // one solar petal of a lander, hinged at its base
        g.save(); g.translate(hx, 0); g.rotate(dir * (1 - open) * 1.15);
        g.fillStyle = '#c9ccd2'; g.fillRect(dir < 0 ? -len : 0, -4, len, 4);
        var pg = g.createLinearGradient(dir * len, 0, 0, 0); pg.addColorStop(0, '#203466'); pg.addColorStop(1, '#3b5ea6');
        g.fillStyle = pg; g.fillRect(dir < 0 ? -len + 3 : 3, -7, len - 6, 3);
        g.restore();
    }
    function pathfinder(g, x, y, s, open) {
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(0, 1, 30 + 44 * open, 5, 0, 0, TAU); g.fill();
        if (open > .5) {                                       // the deflated airbags, pulled in under the petals
            g.fillStyle = 'rgba(214,206,190,' + ((open - .5) * 2 * .9).toFixed(3) + ')';
            [[-44, 7], [-26, 9], [-8, 8], [12, 9], [32, 8], [50, 6]].forEach(function(b, i) { g.beginPath(); g.ellipse(b[0], -2, b[1] + 3, 4 + (i % 2), 0, Math.PI, TAU); g.fill(); });
        }
        g.fillStyle = '#9da3ad'; g.beginPath(); g.moveTo(-18, 0); g.lineTo(18, 0); g.lineTo(12, -10); g.lineTo(-12, -10); g.closePath(); g.fill();
        petal(g, -18, -1, open, 46); petal(g, 18, 1, open, 46);
        var m = 18 + 30 * open;                                // the camera mast rises once the petals are open
        g.strokeStyle = '#d4d7dd'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -10); g.lineTo(0, -m); g.stroke();
        g.fillStyle = '#e1e4e9'; g.fillRect(-6, -m - 6, 12, 6); g.fillStyle = '#1d232c'; g.fillRect(-4, -m - 4.5, 3, 3); g.fillRect(1, -m - 4.5, 3, 3);
        if (open > .85) { g.strokeStyle = 'rgba(210,214,220,' + ((open - .85) / .15).toFixed(3) + ')'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(64, -3); g.lineTo(84, 0); g.moveTo(64, -7); g.lineTo(84, -4); g.stroke(); }
        g.restore();
    }
    /* the hop of a lander wrapped in airbags: n bounces, each lower and shorter than the last */
    function hops(d0, n) { var t = 0, out = []; for (var k = 0; k < n; k++) { out.push(t); t += d0 * Math.pow(.7, k); } out.push(t); return out; }
    function hop(t, d0, h0, n) {
        var ts = hops(d0, n);
        for (var k = 0; k < n; k++) if (t < ts[k + 1]) { var u = (t - ts[k]) / (ts[k + 1] - ts[k]); return { y: 4 * h0 * Math.pow(.5, k) * u * (1 - u), f: t / ts[n] }; }
        return { y: 0, f: 1 };
    }
    function voyagerCraft(g, x, y, s, ang, o) {
        o = o || {};
        g.save(); g.translate(x, y); g.rotate(ang || 0); g.scale(s, s);
        g.strokeStyle = 'rgba(190,198,210,.85)'; g.lineWidth = 1.2;                       // magnetometer boom
        g.beginPath(); g.moveTo(-6, 0); g.lineTo(-150, -96); g.stroke();
        for (var i = 1; i < 12; i++) { var bx = -6 - i * 12, by = -i * 8; g.beginPath(); g.moveTo(bx - 2, by + 3); g.lineTo(bx + 2, by - 3); g.stroke(); }
        g.fillStyle = '#d7dbe2'; g.fillRect(-154, -100, 7, 5); g.fillRect(-90, -60, 5, 4);
        g.strokeStyle = '#9aa4b2'; g.lineWidth = 2.4;
        g.beginPath(); g.moveTo(0, 10); g.lineTo(76, 44); g.stroke();                       // RTG boom
        [0, 1, 2].forEach(function(i) {
            var rx = 38 + i * 14, ry = 27 + i * 6.2;
            if (o.rtg) glow(g, rx + 4, ry + 5, 16, 'rgba(255,140,60,', .35 * o.rtg);
            g.fillStyle = '#3c424c'; g.fillRect(rx, ry, 9, 11);
            g.strokeStyle = '#59616d'; g.lineWidth = 1; for (var f = 0; f < 3; f++) { g.beginPath(); g.moveTo(rx - 2, ry + 2 + f * 3.5); g.lineTo(rx + 11, ry + 2 + f * 3.5); g.stroke(); }
        });
        g.strokeStyle = '#9aa4b2'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(0, 10); g.lineTo(-58, 44); g.stroke();   // science boom
        g.fillStyle = '#c7ccd4'; g.fillRect(-72, 40, 18, 12); g.fillStyle = '#2a3038'; g.beginPath(); g.arc(-58, 54, 4, 0, TAU); g.fill();
        g.fillStyle = '#6f7682'; g.beginPath();                                                // ten-sided bus
        for (var k = 0; k < 10; k++) { var a = k / 10 * TAU; g.lineTo(Math.cos(a) * 17, 8 + Math.sin(a) * 9); } g.closePath(); g.fill();
        g.fillStyle = '#c99a3e'; g.fillRect(-14, 6, 28, 4);
        g.fillStyle = '#e4b54e'; g.beginPath(); g.arc(9, 11, 3.2, 0, TAU); g.fill();         // the Golden Record
        var dg = g.createLinearGradient(-48, -16, 48, -2); dg.addColorStop(0, '#ffffff'); dg.addColorStop(.6, '#d8dce3'); dg.addColorStop(1, '#9aa0aa');
        g.fillStyle = dg; g.beginPath(); g.ellipse(0, -8, 48, 13, 0, Math.PI, TAU); g.lineTo(48, -8); g.ellipse(0, -8, 48, 5, 0, 0, Math.PI); g.fill();
        g.strokeStyle = 'rgba(120,128,140,.6)'; g.lineWidth = 1; g.beginPath(); g.ellipse(0, -8, 48, 5, 0, 0, TAU); g.stroke();
        g.beginPath(); g.moveTo(-30, -9); g.lineTo(0, -34); g.lineTo(30, -9); g.stroke();
        g.fillStyle = '#e8ebef'; g.fillRect(-4, -38, 8, 5);
        g.restore();
    }
    function rocket(g, x, y, s, flame, t) {                  // Titan IIIE-Centaur: a core stage between two solid boosters
        g.save(); g.translate(x, y); g.scale(s, s);
        if (flame > 0) {
            [-17, 0, 17].forEach(function(fx, i) {
                var len = (i === 1 ? 120 : 150) * flame * (.9 + .1 * Math.sin(t * 40 + i));
                var fg = g.createLinearGradient(0, 0, 0, len); fg.addColorStop(0, 'rgba(255,250,230,1)'); fg.addColorStop(.25, 'rgba(255,200,110,.95)'); fg.addColorStop(1, 'rgba(255,90,20,0)');
                g.fillStyle = fg; g.beginPath(); g.moveTo(fx - 6, 0); g.quadraticCurveTo(fx, len * 1.15, fx + 6, 0); g.fill();
            });
            glow(g, 0, 20, 90 * flame, 'rgba(255,190,110,', .5 * flame);
        }
        var cg = g.createLinearGradient(-8, 0, 8, 0); cg.addColorStop(0, '#8a6a3c'); cg.addColorStop(.5, '#d0a868'); cg.addColorStop(1, '#7a5a30');
        g.fillStyle = cg; g.fillRect(-8, -150, 16, 150);
        var wg = g.createLinearGradient(-8, 0, 8, 0); wg.addColorStop(0, '#9da3ad'); wg.addColorStop(.5, '#ffffff'); wg.addColorStop(1, '#8d939d');
        g.fillStyle = wg; g.fillRect(-8, -196, 16, 46);                                       // Centaur and fairing
        g.beginPath(); g.moveTo(-8, -196); g.quadraticCurveTo(0, -224, 8, -196); g.fill();
        [-17, 17].forEach(function(bx) {
            g.fillStyle = wg; g.fillRect(bx - 6, -112, 12, 112);
            g.fillStyle = '#2a2d33'; for (var k = 0; k < 5; k++) g.fillRect(bx - 6, -100 + k * 20, 12, 3);
            g.fillStyle = '#d9dde3'; g.beginPath(); g.moveTo(bx - 6, -112); g.lineTo(bx, -128); g.lineTo(bx + 6, -112); g.fill();
        });
        g.restore();
    }
    function dish(g, x, y, s, aim) {                         // a Deep Space Network antenna
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = '#1a222c'; g.beginPath(); g.moveTo(-26, 0); g.lineTo(26, 0); g.lineTo(14, -44); g.lineTo(-14, -44); g.closePath(); g.fill();
        g.translate(0, -52); g.rotate(aim);
        var dg = g.createLinearGradient(-60, 0, 60, 0); dg.addColorStop(0, '#c9d0da'); dg.addColorStop(.5, '#f3f5f8'); dg.addColorStop(1, '#8e97a4');
        g.fillStyle = dg; g.beginPath(); g.ellipse(0, 0, 62, 16, 0, Math.PI, TAU); g.quadraticCurveTo(0, 22, -62, 0); g.fill();
        g.strokeStyle = '#c9d0da'; g.lineWidth = 2; g.beginPath(); g.moveTo(-40, -6); g.lineTo(0, -46); g.lineTo(40, -6); g.moveTo(0, 4); g.lineTo(0, -46); g.stroke();
        g.fillStyle = '#e8ecf1'; g.beginPath(); g.arc(0, -48, 4, 0, TAU); g.fill();
        g.restore();
    }
    /* radio pulses travelling from a to b; `alive` fades the link out */
    function link(g, ax, ay, bx, by, t, alive) {
        if (alive <= 0) return;
        g.save(); g.globalAlpha = alive;
        g.strokeStyle = 'rgba(121,220,232,.32)'; g.setLineDash([3, 7]); g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke(); g.setLineDash([]);
        for (var i = 0; i < 4; i++) { var p = (t * .55 + i / 4) % 1; glow(g, lerp(ax, bx, p), lerp(ay, by, p), 9, 'rgba(200,250,255,', .95); }
        g.restore();
    }
    function waves(g, x, y, t, alive, dir) {                 // rings spreading from an antenna
        for (var i = 0; i < 3; i++) {
            var p = (t * .6 + i / 3) % 1;
            g.strokeStyle = 'rgba(121,220,232,' + ((1 - p) * .7 * alive).toFixed(3) + ')'; g.lineWidth = 2;
            g.beginPath(); g.arc(x, y, 8 + p * 50, (dir || -.7) - .7, (dir || -.7) + .7); g.stroke();
        }
    }

    /* ---- type, overlays and finishing ---- */
    var T = window.T || function(x) { return x; };
    var SERIF = 'Prata, Georgia, serif', SANS = '"Hanken Grotesk", system-ui, sans-serif';
    function spaced(g, px) { if ('letterSpacing' in g) g.letterSpacing = px + 'px'; }
    function shade(g) { var gr = g.createLinearGradient(0, 0, 0, 180); gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, 180); }
    function hud(g, label, value, x, y, col, a) {
        g.globalAlpha = a == null ? 1 : a;
        g.font = '600 12px ' + SANS; spaced(g, 2.5); g.fillStyle = 'rgba(169,206,255,.9)'; g.fillText(T(label).toUpperCase(), x, y);
        spaced(g, 0); g.font = '26px ' + SERIF; g.fillStyle = col || '#fff'; g.fillText(T(value), x, y + 30);
        g.globalAlpha = 1;
    }
    function bar(g, label, frac, x, y, col) {
        g.font = '600 12px ' + SANS; spaced(g, 2.5); g.fillStyle = 'rgba(169,206,255,.9)'; g.fillText(T(label).toUpperCase(), x, y); spaced(g, 0);
        g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(x, y + 9, 200, 6);
        var c = col || (frac > .4 ? '#6ee7a8' : frac > .15 ? '#ffc061' : '#ff6b5e');
        g.fillStyle = c; g.shadowColor = c; g.shadowBlur = 10; g.fillRect(x, y + 9, 200 * clamp(frac, 0, 1), 6); g.shadowBlur = 0;
    }
    /* the opening card: the title rises letter by letter over a planet's rim, then the frame clears */
    function titleCard(g, s, p, title, sub, planet) {
        space(g, s, { cool: planet === 'deep', neb: .7 });
        var t = textures(), out = 1 - span(.78, 1, p);
        if (planet === 'deep') { sun(g, 820, 120, 4, .9); flare(g, 820, 120, .6); }
        else globe(g, t[planet || 'mars'], W / 2, H + 470, 600, s * .006, { lx: .35, ly: -1, phase: .34, atm: 'rgba(255,150,100,' });
        title = T(title);
        g.font = '64px ' + SERIF; g.textAlign = 'left';
        var w = g.measureText(title).width, x0 = W / 2 - w / 2, x = x0;
        for (var i = 0; i < title.length; i++) {
            var ch = title[i], k = easeOut((s - .25 - i * .055) / .7), cw = g.measureText(ch).width;
            g.globalAlpha = k * out; g.fillStyle = '#fff'; g.fillText(ch, x, H / 2 - 6 + (1 - k) * 22); x += cw;
        }
        var lw = easeOut((s - .7) / 1.1) * 220 * out;
        g.globalAlpha = out; g.fillStyle = '#79dce8'; g.fillRect(W / 2 - lw / 2, H / 2 + 14, lw, 2);
        g.globalAlpha = easeOut((s - 1.1) / .8) * out; g.font = '600 14px ' + SANS; spaced(g, 5);
        g.textAlign = 'center'; g.fillStyle = '#79dce8'; g.fillText(T(sub).toUpperCase(), W / 2, H / 2 + 46);
        spaced(g, 0); g.textAlign = 'left'; g.globalAlpha = 1;
    }
    function endCard(g, s, p, big, sub, planet) {
        space(g, s, { cool: planet === 'deep', neb: .6, drift: 6 });
        var t = textures();
        if (planet === 'deep') { voyagerCraft(g, 760 - s * 6, 150, .55, -.3); }
        else globe(g, t.mars, 780, 170, 90, s * .01, { lx: -1, ly: .2, atm: 'rgba(255,170,120,' });
        var k = easeOut(s / 1.2);
        g.save(); g.translate(W / 2, H / 2); g.scale(.9 + .1 * k, .9 + .1 * k);
        g.globalAlpha = k; g.textAlign = 'center'; g.font = '86px ' + SERIF; g.fillStyle = '#fff';
        g.shadowColor = 'rgba(121,220,232,.6)'; g.shadowBlur = 30; g.fillText(T(big), 0, 0); g.shadowBlur = 0;
        g.globalAlpha = easeOut((s - .6) / .9); g.font = '600 15px ' + SANS; spaced(g, 5); g.fillStyle = '#79dce8'; g.fillText(T(sub).toUpperCase(), 0, 48); spaced(g, 0);
        g.restore(); g.globalAlpha = 1; g.textAlign = 'left';
    }
    function vignette(g) {
        var gr = g.createRadialGradient(W / 2, H / 2, H * .4, W / 2, H / 2, H * .98); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    var grainPat = null;
    function grain(g, s) {
        if (!grainPat) grainPat = g.createPattern(textures().grain, 'repeat');
        g.save(); g.globalAlpha = .045; g.globalCompositeOperation = 'overlay';
        g.translate(-(Math.floor(s * 24) * 37 % 128), -(Math.floor(s * 24) * 61 % 128));
        g.fillStyle = grainPat; g.fillRect(0, 0, W + 128, H + 128); g.restore();
    }
    function shake(g, k, s) { if (k > 0) g.translate((vnoise(s * 30, 1) - .5) * k, (vnoise(s * 30, 7) - .5) * k); }
    function night(g, k) { if (k > 0) { g.fillStyle = 'rgba(6,8,22,' + clamp(k, 0, 1).toFixed(3) + ')'; g.fillRect(0, 0, W, H); } }

    /* ============================== THE FOUR STORIES ==============================
       Lines are narrated and subtitled; facts come from the NASA pages linked on this site. `cues` are sounds at seconds into a scene. */
    var landHops = hops(.62, 6);
    var FILMS = {
        sojourner: { title: 'Sojourner: the rover that could not call home', mood: 'sad', cause: 'Its lander’s battery failed', src: 'NASA Mars Pathfinder mission pages', posterAt: [3, .55], scenes: [
            { d: 4.2, line: '', draw: function(g, p, s) { titleCard(g, s, p, 'Sojourner', 'Why it went silent', 'mars'); } },
            { d: 7, cues: [[0, 'whoosh']].concat(landHops.slice(0, 6).map(function(x) { return [3 + x, x ? 'bounce' : 'thud']; })), line: 'July 4, 1997. Mars Pathfinder lands in Ares Vallis, bouncing across the ground on giant airbags.', draw: function(g, p, s) {
                var gy = 352, fire = clamp(s / 1.7, 0, 1), cam = 0;
                marsScape(g, s, { sun: [190, 120], gy: gy, cam: cam });
                if (s < 1.9) {                                            // entry: a fireball streaks down through the thin air
                    var fx = lerp(980, 520, fire), fy = lerp(-20, 150, fire);
                    var tr = g.createLinearGradient(fx, fy, fx + 260, fy - 110); tr.addColorStop(0, 'rgba(255,240,200,.9)'); tr.addColorStop(1, 'rgba(255,150,60,0)');
                    g.strokeStyle = tr; g.lineWidth = 6; g.lineCap = 'round'; g.beginPath(); g.moveTo(fx, fy); g.lineTo(fx + 260, fy - 110); g.stroke();
                    glow(g, fx, fy, 40, 'rgba(255,210,140,', .9); hud(g, 'Entry, descent and landing', 'July 4, 1997', 40, 50, null, 1 - span(1.4, 1.9, s));
                } else if (s < 3) {                                       // parachute, then the airbags inflate and drop
                    var k = (s - 1.9) / 1.1, cx = 520 - k * 60, cy = lerp(150, 250, k);
                    g.strokeStyle = 'rgba(240,240,240,.7)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx - 30, cy - 70); g.lineTo(cx, cy); g.lineTo(cx + 30, cy - 70); g.stroke();
                    g.fillStyle = '#f4f1ea'; g.beginPath(); g.ellipse(cx, cy - 78, 36, 14, 0, Math.PI, TAU); g.fill(); g.fillStyle = '#c8562e'; g.fillRect(cx - 4, cy - 92, 8, 14);
                    airbags(g, cx, cy, 16 + k * 22, 0);
                    hud(g, 'Mars Pathfinder', 'July 4, 1997', 40, 50);
                } else {
                    var h = hop(s - 3, .62, 150, 6), bx = lerp(330, 600, easeOut(h.f));
                    landHops.slice(0, 6).forEach(function(ti, i) { var hx = lerp(330, 600, easeOut(hop(ti + .001, .62, 150, 6).f)); puff(g, hx, gy + 122, s - 3 - ti, 1.5 - i * .18); });
                    airbags(g, bx, gy + 76 - h.y, 42, (bx - 330) / 42);
                    hud(g, 'Airbags: bouncing to a stop', 'Ares Vallis', 40, 50);
                }
            } },
            { d: 7, cues: [[3.3, 'whir']], line: 'The petals open, and Sojourner, a rover the size of a microwave oven, rolls down a ramp onto Mars.', draw: function(g, p, s) {
                var gy = marsScape(g, s, { sun: [190, 120], cam: 0 });
                var open = span(.3, 2.6, s), roll = span(3.2, 6.6, s), lx = 330, ly = gy + 122;
                pathfinder(g, lx, ly, 2.4, open);
                if (open > .85) { var rx = lerp(lx + 70, lx + 400, roll), ry = ly - 10 * (1 - span(.25, .5, roll)); sojo(g, rx, ry, 2.3, roll * 22); }
                hud(g, 'Ares Vallis', 'Sojourner rolls off the ramp', 40, 50);
            } },
            { d: 8, cues: [[.5, 'beep'], [3.5, 'beep']], line: 'But Sojourner had no radio strong enough to reach Earth. Every message went through the lander.', draw: function(g, p, s) {
                var z = lerp(1.15, 1, ease(p));
                g.save(); g.translate(W / 2, H * .7); g.scale(z, z); g.translate(-W / 2, -H * .7);
                var gy = marsScape(g, s, { sun: [150, 140], cam: 40, night: .15 });
                g.restore();
                var ex = 860, ey = 78; glow(g, ex, ey, 26, 'rgba(120,180,255,', .6); globe(g, textures().earth, ex, ey, 9, s * .02, { lx: -1, ly: 0 });
                g.fillStyle = 'rgba(214,228,255,.85)'; g.font = '600 11px ' + SANS; g.fillText(T('Earth'), ex - 50, ey + 4);
                var lx = 320, ly = gy + 118, rx = 660, ry = gy + 132;
                pathfinder(g, lx, ly, 2.1, 1); sojo(g, rx, ry, 2.1, 0);
                link(g, rx - 30, ry - 100, lx, ly - 120, s, 1); link(g, lx, ly - 120, ex, ey, s * .8, 1);
                waves(g, rx - 30, ry - 100, s, 1, -2.8);
                hud(g, 'The only link home', 'rover → lander → Earth', 40, 50);
            } },
            { d: 8, cues: [[2.2, 'spark'], [4.5, 'whir']], line: 'It studied rocks the team named Yogi and Barnacle Bill. Planned for seven days, it worked for eighty-three.', draw: function(g, p, s) {
                var gy = marsScape(g, s, { sun: [210, 110], cam: 200, rocks: true });
                var rk = 640, rr = 110; gy += 90;                         // "Yogi", a big rock, and the rover nosing up to it
                g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(rk + 30, gy + 92, rr * 1.4, 10, 0, 0, TAU); g.fill();
                var yg = g.createRadialGradient(rk - 30, gy + 20, 10, rk, gy + 60, rr * 1.3); yg.addColorStop(0, '#d79a6a'); yg.addColorStop(1, '#5a2e1e');
                g.fillStyle = yg; g.beginPath(); g.moveTo(rk - rr, gy + 92); g.quadraticCurveTo(rk - rr * .9, gy + 10, rk - 10, gy + 6); g.quadraticCurveTo(rk + rr, gy + 2, rk + rr * 1.2, gy + 92); g.closePath(); g.fill();
                g.fillStyle = 'rgba(255,255,255,.8)'; g.font = 'italic 20px ' + SERIF; g.fillText('Yogi', rk - 10, gy - 6);
                var approach = span(0, .5, p);
                sojo(g, lerp(150, rk - rr - 70, approach), gy + 96, 2.4, approach * 16);
                if (p > .5) { var sx = rk - rr + 12, sy = gy + 50; for (var i = 0; i < 5; i++) glow(g, sx + Math.sin(s * 3 + i) * 6, sy + Math.cos(s * 2.3 + i * 2) * 10, 8, 'rgba(140,255,220,', .5 * span(.5, .6, p)); }
                hud(g, 'Days working', String(Math.round(lerp(7, 83, span(.15, .95, p)))), 40, 50); hud(g, 'Planned', '7', 240, 50, 'rgba(255,255,255,.7)');
            } },
            { d: 9, cues: [[1, 'fade']], line: 'On September 27, 1997, the lander fell silent. Its battery had worn out, and without it the lander could not survive the freezing nights.', draw: function(g, p, s) {
                var nk = span(.1, .85, p), sy = lerp(150, 380, span(0, .6, p));
                var gy = marsScape(g, s, { sun: [300, sy], blue: span(.1, .5, p) * (1 - span(.55, .7, p)), night: nk, cam: 60, frost: span(.7, 1, p) });
                g.filter = 'brightness(' + (1 - nk * .75).toFixed(3) + ')';
                pathfinder(g, 330, gy + 118, 2.1, 1); sojo(g, 660, gy + 132, 2.1, 0);
                g.filter = 'none';
                var ex = 860, ey = 78; globe(g, textures().earth, ex, ey, 9, s * .02, { lx: -1, ly: 0 });
                link(g, 330, gy + 2, ex, ey, s * .8, 1 - span(.25, .55, p));
                shade(g); bar(g, 'Lander battery', 1 - span(.05, .6, p), 40, 50);
                hud(g, 'Last data', 'Sept. 27, 1997', 40, 104, '#ff8a7a', span(.55, .7, p));
            } },
            { d: 8, line: 'Without the lander, Sojourner had no way to call home. It is still there in Ares Vallis, close to the lander that carried it.', draw: function(g, p, s) {
                var z = lerp(1, 1.22, ease(p));
                g.save(); g.translate(560, 420); g.scale(z, z); g.translate(-560, -420);
                var gy = marsScape(g, s, { night: 1, milky: true, cam: 60, earth: [760, 110], frost: .6 });
                g.filter = 'brightness(.42)'; pathfinder(g, 330, gy + 118, 2.1, 1); sojo(g, 660, gy + 132, 2.1, 0); g.filter = 'none';
                g.strokeStyle = 'rgba(170,200,255,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(612, gy + 66); g.lineTo(712, gy + 66); g.stroke();   // starlight catching the solar panel
                g.restore();
                hud(g, 'Still in Ares Vallis', 'Mars Pathfinder', 40, 50, null, 1 - span(.7, .95, p));
                night(g, span(.7, 1, p));
            } },
            { d: 4.5, sfx: 'swell', line: 'Its idea lives on: every Mars rover since has six wheels on the same kind of suspension.', draw: function(g, p, s) { endCard(g, s, p, '83 days', 'Planned: 7', 'mars'); } }
        ] },
        spirit: { title: 'Spirit: stuck before winter', mood: 'sad', cause: 'Stuck in sand before winter', src: 'NASA Mars Exploration Rover mission pages', posterAt: [4, .5], scenes: [
            { d: 4.2, line: '', draw: function(g, p, s) { titleCard(g, s, p, 'Spirit', 'Why it went silent', 'mars'); } },
            { d: 7, cues: landHops.slice(0, 6).map(function(x) { return [1.2 + x, x ? 'bounce' : 'thud']; }).concat([[5.4, 'whir']]), line: 'January 2004. Spirit lands in Gusev Crater, built for a mission of ninety days.', draw: function(g, p, s) {
                var gy = marsScape(g, s, { sun: [760, 110], cam: 500 });
                if (s < 1.2) { var k = s / 1.2; airbags(g, lerp(160, 260, k), lerp(-60, gy + 76, k * k), 42, 0); }
                else if (s < 5.2) {
                    var h = hop(s - 1.2, .62, 150, 6), bx = lerp(260, 520, easeOut(h.f));
                    landHops.slice(0, 6).forEach(function(ti, i) { var hx = lerp(260, 520, easeOut(hop(ti + .001, .62, 150, 6).f)); puff(g, hx, gy + 122, s - 1.2 - ti, 1.5 - i * .18); });
                    airbags(g, bx, gy + 76 - h.y, 42, (bx - 260) / 42);
                } else { mer(g, lerp(420, 560, span(5.4, 7.5, s)), gy + 132, 2, { rot: s * 2 }); }
                hud(g, 'Gusev Crater', 'January 2004', 40, 50);
            } },
            { d: 8, cues: [[.2, 'whir'], [3.4, 'whir']], line: 'In 2006 its right front wheel stopped turning. Spirit learned to drive backwards, dragging the broken wheel.', draw: function(g, p, s) {
                var cam = 900 - s * 26, gy = marsScape(g, s, { sun: [200, 120], cam: cam });
                var rx = 460, ry = gy + 134;
                g.strokeStyle = 'rgba(70,34,22,.6)'; g.lineWidth = 14; g.beginPath(); g.moveTo(rx + 80, ry); g.lineTo(W + 20, ry); g.stroke();       // the drag trench
                g.strokeStyle = 'rgba(244,236,222,' + (.3 + .3 * p).toFixed(3) + ')'; g.lineWidth = 3; g.beginPath(); g.moveTo(rx + 80, ry); g.lineTo(W + 20, ry); g.stroke();
                mer(g, rx, ry, 2.2, { rot: -s * 2.2, stuck: 2 });
                hud(g, '2006', 'One wheel stuck: the drag marks', 40, 50);
            } },
            { d: 8, cues: [[1.2, 'spark']], line: 'The dragged wheel scraped up almost pure silica, a sign that hot springs once bubbled here.', draw: function(g, p, s) {
                var t = textures(), z = lerp(1, 1.18, ease(p));
                g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
                g.drawImage(t.soil, 0, 0, 256, 256, 0, 0, W, H);
                var tg = g.createLinearGradient(0, 230, 0, 330); tg.addColorStop(0, '#4a2416'); tg.addColorStop(.5, '#2a140c'); tg.addColorStop(1, '#4a2416');
                g.fillStyle = tg; g.beginPath(); g.moveTo(0, 240); for (var x = 0; x <= W; x += 20) g.lineTo(x, 236 + 8 * fbm(x / 80, 2, 3)); for (x = W; x >= 0; x -= 20) g.lineTo(x, 316 + 8 * fbm(x / 80, 5, 3)); g.fill();
                var reveal = span(.1, .7, p);                       // the white soil shows along the trench
                for (var i = 0; i < 220; i++) { var px = hash(i, 1) * W * reveal, py = 256 + hash(i, 2) * 48; g.fillStyle = 'rgba(248,246,240,' + (.5 + .5 * hash(i, 3)).toFixed(3) + ')'; g.beginPath(); g.arc(px, py, 2 + hash(i, 4) * 5, 0, TAU); g.fill(); }
                glow(g, W * reveal, 280, 80, 'rgba(255,255,240,', .35 * reveal * (1 - p * .5));
                wheel(g, W * reveal - 150, 250, 190, -s * .9);         // Spirit's own wheel, dragged along the trench, fills the left of the frame
                g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(W * reveal - 150, 440, 200, 22, 0, 0, TAU); g.fill();
                for (i = 0; i < 6; i++) glow(g, hash(i, 8) * W * reveal, 262 + hash(i, 9) * 36, 6 + 4 * Math.abs(Math.sin(s * 3 + i)), 'rgba(255,255,255,', .8);
                g.restore();
                shade(g); hud(g, 'Nearly pure silica', 'The bright soil, 2007', 40, 50);
                hud(g, 'Silica', Math.round(90 * span(.3, .9, p)) + '%', 760, 50);
            } },
            { d: 8, cues: [[.4, 'sand'], [2.6, 'sand'], [4.8, 'sand']], line: 'In May 2009, at a place called Troy, its wheels broke through a crust into soft sand. Spirit was stuck.', draw: function(g, p, s) {
                var gy = marsScape(g, s, { sun: [240, 140], cam: 1400 });
                var sink = span(.05, .5, p) * 22, rx = 470 + Math.sin(s * 9) * 1.5, ry = gy + 136;
                mer(g, rx, ry, 2.2, { rot: s * 9, sink: sink, stuck: 2 });
                for (var i = 0; i < 40; i++) {                       // sand flung back by the spinning wheels
                    var age = (s * 1.3 + i / 40) % 1, wx = [-52, -6][i % 2] * 2.2 + rx;
                    g.fillStyle = 'rgba(214,160,112,' + ((1 - age) * .8).toFixed(3) + ')'; g.beginPath(); g.arc(wx - age * 110, ry - 16 + sink - Math.sin(age * Math.PI) * 40, 3, 0, TAU); g.fill();
                }
                var sg = g.createLinearGradient(0, ry - 30, 0, ry + 16); sg.addColorStop(0, '#c7895c'); sg.addColorStop(1, 'rgba(120,66,42,0)');
                g.fillStyle = sg; g.beginPath(); g.moveTo(rx - 230, ry + 16);
                for (var sx = -230; sx <= 190; sx += 8) { var env = Math.exp(-Math.pow((sx + 20) / 130, 2)); g.lineTo(rx + sx, ry + 16 - (24 + sink * .6) * env - 5 * env * fbm(sx / 26, 8, 2)); }
                g.lineTo(rx + 190, ry + 16); g.closePath(); g.fill();
                hud(g, 'Troy', 'Soil churned by escape attempts', 40, 50);
            } },
            { d: 9, cues: [[1, 'whir']], line: 'Engineers practised escape drives with a test rover in a sandbox on Earth. But winter was coming, and Spirit could not tilt its panels toward the low Sun.', draw: function(g, p, s) {
                g.save(); g.beginPath(); g.rect(0, 0, W / 2, H); g.clip();                // left: the lab on Earth
                fill(g, '#2a2f38', '#3a414c', '#1e2229');
                g.fillStyle = 'rgba(255,255,255,.06)'; for (var i = 0; i < 6; i++) g.fillRect(40 + i * 75, 0, 30, 140);
                g.fillStyle = '#c9b48e'; g.fillRect(30, 330, W / 2 - 60, 160); g.fillStyle = '#8a7a5c'; g.fillRect(30, 324, W / 2 - 60, 8);
                mer(g, 240 + Math.sin(s * 1.4) * 14, 420, 1.6, { rot: s * 3, sink: 6 });
                g.restore();
                g.save(); g.beginPath(); g.rect(W / 2, 0, W / 2, H); g.clip();            // right: Mars, the Sun sinking lower each day
                g.translate(W / 4, 0);
                var gy = marsScape(g, s, { sun: [560, lerp(140, 300, ease(p))], blue: span(.4, 1, p) * .7, night: span(.4, 1, p) * .45, cam: 1400 });
                mer(g, 480, gy + 128, 1.6, { sink: 20, stuck: 2, dust: .35 + p * .3 });
                g.restore();
                g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(W / 2 - 1, 0, 2, H);
                shade(g);
                g.font = '600 12px ' + SANS; spaced(g, 2.5); g.fillStyle = 'rgba(169,206,255,.9)';
                g.fillText(T('Earth: test rover in a sandbox').toUpperCase(), 32, H - 30); g.fillText(T('Mars: winter is coming').toUpperCase(), W / 2 + 32, H - 30); spaced(g, 0);
                bar(g, 'Spirit’s power', lerp(.7, .08, ease(p)), W / 2 + 32, 50);
            } },
            { d: 8, cues: [[.6, 'fade']], line: 'Too cold and too weak to stay awake, Spirit went silent. Its last message arrived on March 22, 2010.', draw: function(g, p, s) {
                var z = lerp(1, 1.15, ease(p));
                g.save(); g.translate(500, 420); g.scale(z, z); g.translate(-500, -420);
                var gy = marsScape(g, s, { night: lerp(.65, 1, p), milky: true, cam: 1400, frost: span(.2, .9, p), earth: [820, 96] });
                g.filter = 'brightness(' + lerp(.6, .35, p).toFixed(3) + ')'; mer(g, 470, gy + 134, 2, { sink: 20, stuck: 2, dust: .6 }); g.filter = 'none';
                link(g, 418, gy - 18, 820, 96, s, 1 - span(.15, .55, p));
                g.restore();
                hud(g, 'Last contact', 'March 22, 2010', 40, 50);
                night(g, span(.8, 1, p) * .6);
            } },
            { d: 6, sfx: 'swell', line: 'NASA listened for more than a year before ending the mission in May 2011. Ninety days had become six years.', draw: function(g, p, s) { endCard(g, s, p, '6 years', 'Planned: 90 days', 'mars'); } }
        ] },
        opportunity: { title: 'Opportunity: the storm that hid the Sun', mood: 'sad', cause: 'A dust storm hid the Sun', src: 'NASA Mars Exploration Rover mission pages', posterAt: [5, .45], scenes: [
            { d: 4.2, line: '', draw: function(g, p, s) { titleCard(g, s, p, 'Opportunity', 'Why it went silent', 'mars'); } },
            { d: 7, cues: landHops.slice(0, 6).map(function(x) { return [1 + x, x ? 'bounce' : 'thud']; }), line: 'January 2004. Three weeks after its twin Spirit, Opportunity lands on Meridiani Planum.', draw: function(g, p, s) {
                var gy = marsScape(g, s, { sun: [780, 120], cam: 2600, crater: [2600 * .9 + 660, 170], rocks: false });
                if (s < 1) { var k = s; airbags(g, lerp(120, 220, k), lerp(-60, gy + 76, k * k), 40, 0); }
                else {
                    var h = hop(s - 1, .62, 140, 6), bx = lerp(220, 640, easeOut(h.f)), drop = span(.82, 1, h.f) * 34;   // and rolls into a small crater
                    landHops.slice(0, 6).forEach(function(ti, i) { var hx = lerp(220, 640, easeOut(hop(ti + .001, .62, 140, 6).f)); puff(g, hx, gy + 116, s - 1 - ti, 1.4 - i * .18); });
                    airbags(g, bx, gy + 74 - h.y + drop, 40, (bx - 220) / 40);
                }
                hud(g, 'Meridiani Planum', 'January 2004', 40, 50);
                hud(g, 'Eagle crater: a hole in one', '', 40, 112, null, span(4.5, 5.5, s));
            } },
            { d: 8, cues: [[1.5, 'spark']], line: 'It found tiny grey spheres of hematite, nicknamed blueberries, that formed in water long ago.', draw: function(g, p, s) {
                var t = textures(), z = lerp(1, 1.35, ease(p)), cx = W / 2, cy = H / 2 + 10, R = 230;
                fill(g, '#05070c', '#0b1018');
                g.save(); g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.clip();                     // the microscope's round view
                g.translate(cx, cy); g.scale(z, z); g.translate(-cx, -cy);
                g.drawImage(t.soil, 0, 0, 256, 256, cx - R, cy - R, 2 * R, 2 * R);
                for (var i = 0; i < 26; i++) {
                    var bx = cx - R + hash(i, 11) * 2 * R, by = cy - R + hash(i, 12) * 2 * R, br = 9 + hash(i, 13) * 11;
                    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(bx + br * .3, by + br * .5, br, br * .5, 0, 0, TAU); g.fill();
                    var bg = g.createRadialGradient(bx - br * .35, by - br * .35, 1, bx, by, br); bg.addColorStop(0, '#d6dce6'); bg.addColorStop(.35, '#7c8496'); bg.addColorStop(1, '#2c303a');
                    g.fillStyle = bg; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
                }
                g.restore();
                g.strokeStyle = 'rgba(121,220,232,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
                g.fillStyle = '#fff'; g.fillRect(cx + R - 130, cy + R - 30, 80 * z, 3); g.font = '600 12px ' + SANS; g.fillText('5 mm', cx + R - 130, cy + R - 38);
                hud(g, 'Hematite “blueberries”', 'Microscope view, a few millimetres each', 40, 50);
            } },
            { d: 7, cues: [[.2, 'whir'], [3.5, 'whir']], line: 'Over fourteen years it drove forty-five kilometres, a marathon on another world.', draw: function(g, p, s) {
                var day = .5 + .5 * Math.cos(p * TAU * 3);           // days and nights flicker past
                var gy = marsScape(g, s, { cam: s * 520, sun: [lerp(100, 860, (p * 3) % 1), 140 + 60 * Math.abs(Math.sin(p * 3 * Math.PI))], night: (1 - day) * .8, blue: .3 });
                g.filter = 'brightness(' + (1 - (1 - day) * .6).toFixed(3) + ')'; mer(g, 470, gy + 134, 2.1, { rot: s * 6, dust: .2 + p * .3 }); g.filter = 'none';
                shade(g);
                hud(g, 'Distance driven', lerp(0, 45.16, ease(p)).toFixed(2) + ' km', 40, 50);
                hud(g, 'Year', String(2004 + Math.floor(ease(p) * 14)), 300, 50);
            } },
            { d: 9, cues: [[0, 'storm']], line: 'June 2018. A dust storm grows until it wraps the whole planet. Day turns into night.', draw: function(g, p, s) {
                var t = textures();
                space(g, s, { cool: true, neb: .4 });
                sun(g, 60, 80, 6, 1); flare(g, 60, 80, .4);
                globe(g, t.mars, 560, 290, 210, .2 + s * .01, { lx: -.8, ly: -.5, phase: .62, atm: 'rgba(255,170,120,', overlay: function(x, y, r) {
                    g.globalAlpha = span(0, .55, p); var tw = t.storm.width / 2, n = 60;
                    for (var i = 0; i < n; i++) { var a0 = -1 + 2 * i / n, a1 = -1 + 2 * (i + 1) / n, l0 = Math.asin(a0), l1 = Math.asin(a1); g.drawImage(t.storm, (((l0 / TAU + .2 + s * .012) % 1) + 1) % 1 * tw, 0, Math.max((l1 - l0) / TAU * tw, .4) * 1.04, t.storm.height, x + a0 * r - .4, y - r, (a1 - a0) * r + 1.6, 2 * r); }
                    g.globalAlpha = span(.4, 1, p) * .82; g.fillStyle = '#c48a5a'; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.globalAlpha = 1;
                } });
                hud(g, 'June 6, 2018', 'The storm seen from orbit', 40, 50);
            } },
            { d: 8, cues: [[0, 'wind']], line: 'With almost no sunlight reaching its solar panels, Opportunity could not make enough power to keep talking.', draw: function(g, p, s) {
                var st = span(0, .7, p);
                var gy = marsScape(g, s, { sun: [700, 130], storm: st, cam: 3400 });
                g.filter = 'brightness(' + (1 - st * .3).toFixed(3) + ')'; mer(g, 470, gy + 134, 2.2, { dust: .3 + st * .6 }); g.filter = 'none';
                dustStorm(g, st * .8, s);
                shade(g); bar(g, 'Sunlight', lerp(.9, .01, ease(p)), 40, 50); bar(g, 'Power', lerp(.6, 0, ease(p)), 40, 96);
            } },
            { d: 9, cues: [[.5, 'beep'], [3, 'beep'], [5.5, 'beep'], [7.5, 'fade']], line: 'Its last message came on June 10, 2018. Engineers sent more than a thousand commands, but no answer came back.', draw: function(g, p, s) {
                space(g, s, { cool: true, neb: .45, drift: 2 });
                var ex = 150, ey = 300; globe(g, textures().earth, ex, ey, 70, s * .01, { lx: 1, ly: -.3, atm: 'rgba(120,180,255,' });
                globe(g, textures().mars, 830, 250, 40, s * .01, { lx: -1, ly: -.2, atm: 'rgba(255,170,120,', overlay: function(x, y, r) { g.fillStyle = 'rgba(196,138,90,.75)'; g.fillRect(x - r, y - r, 2 * r, 2 * r); } });
                for (var i = 0; i < 6; i++) {                       // commands fly out; nothing comes back
                    var q = (s * .35 + i / 6) % 1, px = lerp(ex + 70, 790, q), py = lerp(ey - 10, 250, q);
                    glow(g, px, py, 10, 'rgba(200,250,255,', .9 * (1 - span(.8, 1, q)));
                }
                hud(g, 'Commands sent', String(Math.round(lerp(0, 1000, ease(p)))) + (p > .95 ? '+' : ''), 40, 50);
                hud(g, 'Replies', '0', 40, 116, '#ff8a7a');
            } },
            { d: 6, sfx: 'swell', line: 'NASA ended the mission on February 13, 2019. It had been planned for ninety days. It lasted almost fifteen years.', draw: function(g, p, s) { endCard(g, s, p, '45.16 km', 'Planned: 90 days', 'mars'); } }
        ] },
        voyager: { title: 'Voyager 1: running out of power, still talking', mood: 'calm', cause: 'Its power is running out', src: 'NASA and JPL Voyager mission pages', posterAt: [2, .3], scenes: [
            { d: 4.2, line: '', draw: function(g, p, s) { titleCard(g, s, p, 'Voyager 1', 'Why it is limited', 'deep'); } },
            { d: 7, cues: [[.9, 'rumble']], line: 'September 5, 1977. Voyager 1 lifts off from Florida on a Titan rocket.', draw: function(g, p, s) {
                var ign = 1, up = Math.max(0, s - ign), alt = up * up * 28, camY = Math.max(0, alt - 170);
                g.save(); shake(g, up > 0 ? 5 * (1 - span(2, 6, s)) : 0, s);
                fill(g, '#0d1c3a', '#3d4f7a', '#e8a070');
                stars(g, s, .5, 0);
                g.translate(0, camY);
                var sea = g.createLinearGradient(0, 400, 0, H); sea.addColorStop(0, '#2a3550'); sea.addColorStop(1, '#0e1424');
                g.fillStyle = sea; g.fillRect(0, 400, W, 200); g.fillStyle = 'rgba(255,200,140,.25)'; g.fillRect(0, 400, W, 2);
                g.fillStyle = '#111520'; g.fillRect(0, 440, W, 200);
                g.fillStyle = '#1d2230'; g.fillRect(410, 236, 18, 204);                        // the launch tower
                g.strokeStyle = '#2c3346'; g.lineWidth = 1; for (var i = 0; i < 12; i++) { g.beginPath(); g.moveTo(410, 240 + i * 17); g.lineTo(428, 257 + i * 17); g.stroke(); }
                for (i = 0; i < Math.floor(up / .05); i++) {          // smoke billowing at the pad
                    var age = up - i * .05; if (age > 5) continue;
                    var dir = hash(i, 3) < .5 ? -1 : 1, px = 480 + dir * age * (40 + hash(i, 4) * 70), py = 440 - age * 8 - hash(i, 5) * 20, pr = 14 + age * 26;
                    g.fillStyle = 'rgba(' + Math.round(lerp(255, 180, span(0, 1.5, age))) + ',' + Math.round(lerp(190, 176, span(0, 1.5, age))) + ',' + Math.round(lerp(140, 176, span(0, 1.5, age))) + ',' + (.5 * (1 - age / 5)).toFixed(3) + ')';
                    g.beginPath(); g.arc(px, py, pr, 0, TAU); g.fill();
                }
                rocket(g, 480, 440 - alt, .9, up > 0 ? 1 : span(.4, 1, s) * .25, s);
                g.restore();
                hud(g, 'Cape Canaveral', 'Sept. 5, 1977', 40, 50);
            } },
            { d: 8, cues: [[.3, 'whoosh'], [4, 'whoosh']], line: 'It flies past Jupiter in 1979 and Saturn in 1980, using their gravity to speed on.', draw: function(g, p, s) {
                var t = textures(), sw = span(.45, .58, p);
                space(g, s, { cool: true, neb: .5, drift: 8 });
                if (sw < 1) {
                    g.globalAlpha = 1 - sw;
                    globe(g, t.jupiter, 420, 270, 230, .1 + s * .03, { lx: -.9, ly: -.2, phase: .6 });
                    var ia = s * .5 + 1, ix = 420 + Math.cos(ia) * 320, iy = 270 + Math.sin(ia) * 60;    // Io and its volcanic plume
                    globe(g, t.io, ix, iy, 16, s * .05, { lx: -.9, ly: -.2 });
                    g.strokeStyle = 'rgba(180,220,255,.5)'; g.lineWidth = 1.5; g.beginPath(); g.arc(ix, iy - 16, 7, Math.PI * 1.1, Math.PI * 1.9); g.stroke();
                    var k = span(0, .45, p), vx = lerp(1000, 640, k), vy = lerp(80, 360, k) + Math.sin(k * Math.PI) * -40;
                    voyagerCraft(g, vx, vy, .28, -.4); g.globalAlpha = 1;
                }
                if (sw > 0) {
                    g.globalAlpha = sw;
                    rings(g, 470, 280, 120, -.32, true); globe(g, t.saturn, 470, 280, 120, s * .02, { lx: -.9, ly: -.3, phase: .62 }); rings(g, 470, 280, 120, -.32, false);
                    var k2 = span(.55, 1, p); voyagerCraft(g, lerp(920, 180, k2), lerp(140, 110, k2) + Math.sin(k2 * Math.PI) * 50, .28, .2); g.globalAlpha = 1;
                }
                hud(g, p < .5 ? 'Jupiter' : 'Saturn', p < .5 ? 'January 1979' : 'November 1980', 40, 50);
                if (p < .45) hud(g, 'Io: volcanoes erupting', '', 40, 112, null, span(.12, .2, p));
                else hud(g, 'Gravity assist', '', 40, 112, null, span(.6, .7, p));
            } },
            { d: 8, line: 'In 1990, from six billion kilometres, it looks back and takes the Pale Blue Dot: Earth, smaller than a pixel.', draw: function(g, p, s) {
                var z = lerp(1, 1.6, ease(p)), dx = 610, dy = 300;
                fill(g, '#010104', '#03040a');
                g.save(); g.translate(dx, dy); g.scale(z, z); g.translate(-dx, -dy);
                stars(g, s, .5, 0);
                [[120, 'rgba(160,120,90,'], [300, 'rgba(120,150,190,'], [560, 'rgba(170,130,110,'], [760, 'rgba(110,140,170,']].forEach(function(b, i) {   // scattered sunlight in the camera
                    var gx = b[0] + Math.sin(s * .2 + i) * 10, gr = g.createLinearGradient(gx - 40, 0, gx + 40, 0);
                    gr.addColorStop(0, b[1] + '0)'); gr.addColorStop(.5, b[1] + '.22)'); gr.addColorStop(1, b[1] + '0)');
                    g.save(); g.translate(gx, H / 2); g.rotate(-.18); g.translate(-gx, -H / 2); g.fillStyle = gr; g.fillRect(gx - 40, -100, 80, H + 200); g.restore();
                });
                glow(g, dx, dy, 6, 'rgba(150,200,255,', .9); g.fillStyle = '#cfe6ff'; g.fillRect(dx - .8, dy - .8, 1.6, 1.6);
                g.restore();
                var rk = span(.4, .6, p); g.strokeStyle = 'rgba(121,220,232,' + (rk * .8).toFixed(3) + ')'; g.lineWidth = 1.2;
                g.beginPath(); g.arc(dx, dy, 16 + 6 * Math.sin(s * 2), 0, TAU); g.stroke();
                g.globalAlpha = rk; g.font = '600 12px ' + SANS; g.fillStyle = '#cfe6ff'; g.fillText(T('Earth: 0.12 pixel'), dx + 26, dy + 4); g.globalAlpha = 1;
                hud(g, 'Feb. 14, 1990', 'Pale Blue Dot', 40, 50);
            } },
            { d: 8, cues: [[3.6, 'spark']], line: 'In 2012 it leaves the heliosphere, the bubble of the solar wind, and becomes the first craft in interstellar space.', draw: function(g, p, s) {
                space(g, s, { cool: true, neb: .5, drift: 1 });
                var sx = 90, sy = 270, bx = 640;
                g.save(); g.beginPath(); g.ellipse(sx - 200, sy, bx - sx + 200, 330, 0, 0, TAU); g.clip();          // inside the bubble the Sun's wind blows outward
                g.fillStyle = 'rgba(255,190,110,.06)'; g.fillRect(0, 0, W, H);
                for (var i = 0; i < 140; i++) {
                    var a = (hash(i, 1) - .5) * 2.6, r = ((hash(i, 2) * 600 + s * 120) % 620);
                    var px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r * .9;
                    g.fillStyle = 'rgba(255,214,150,' + (.6 * (1 - r / 620)).toFixed(3) + ')'; g.fillRect(px, py, 2.2, 1.2);
                }
                g.restore();
                for (i = 0; i < 90; i++) {                           // outside, the interstellar medium flows past
                    var qx = W - ((hash(i, 6) * 400 + s * 60) % 400), qy = hash(i, 7) * H;
                    g.fillStyle = 'rgba(170,150,255,.5)'; g.fillRect(qx, qy, 1.6, 1.6);
                }
                g.strokeStyle = 'rgba(200,170,255,' + (.45 + .15 * Math.sin(s * 2)).toFixed(3) + ')'; g.lineWidth = 2.5;
                g.beginPath(); g.ellipse(sx - 200, sy, bx - sx + 200, 330, 0, -1.2, 1.2); g.stroke();
                g.font = '600 12px ' + SANS; g.fillStyle = 'rgba(214,200,255,.85)'; g.fillText(T('Heliopause'), bx + 8, 96);
                sun(g, sx, sy, 10, 1); flare(g, sx, sy, .3);
                var vx = lerp(470, 820, ease(p)), crossed = vx > bx + 4;
                if (crossed) { var age = s - 3.6; if (age > 0 && age < 1.5) { g.strokeStyle = 'rgba(200,170,255,' + (1 - age / 1.5).toFixed(3) + ')'; g.beginPath(); g.arc(bx, sy, age * 80, 0, TAU); g.stroke(); } }
                voyagerCraft(g, vx, sy, .3, 0);
                hud(g, 'Aug. 25, 2012', crossed ? 'Interstellar space' : 'Inside the heliosphere', 40, 50, crossed ? '#c9b8ff' : '#fff');
                g.font = '600 11px ' + SANS; g.fillStyle = 'rgba(255,214,150,.75)'; g.fillText(T('Solar wind'), 200, 200);
            } },
            { d: 9, line: 'Out here sunlight is too weak for solar panels. Its power comes from plutonium generators, and they lose about four watts every year.', draw: function(g, p, s) {
                space(g, s, { cool: true, neb: .55, drift: 4 });
                sun(g, 70, 90, 1.6, .7);
                voyagerCraft(g, 560, 290, 2.5, -.12 + Math.sin(s * .3) * .03, { rtg: lerp(1, .45, ease(p)) });
                var y = 1977 + Math.round(ease(p) * 49);
                shade(g); hud(g, 'Year', String(y), 40, 50); bar(g, 'Electrical power', lerp(.95, .45, ease(p)), 40, 112);
            } },
            { d: 9, cues: [[1, 'beep'], [4, 'beep'], [7, 'beep']], line: 'To save power, engineers switch its instruments off one by one. Today only two of its ten are still on.', draw: function(g, p, s) {
                space(g, s, { cool: true, neb: .4, drift: 4 });
                voyagerCraft(g, 230, 300, 1.5, -.12);
                var ORDER = [['PLS', '1980'], ['PPS', '1980s'], ['ISS', '1990'], ['IRIS', '1998'], ['PRA', '2007'], ['UVS', '2016'], ['CRS', '2025'], ['LECP', '2026'], ['MAG', ''], ['PWS', '']];
                var off = Math.round(ease(p) * 8);
                ORDER.forEach(function(ins, i) {
                    var x = 520 + (i % 5) * 84, y = 230 + Math.floor(i / 5) * 110, lit = i >= off, just = i === off - 1;
                    if (lit) glow(g, x, y, 34, 'rgba(121,220,232,', .35 + .1 * Math.sin(s * 3 + i));
                    g.fillStyle = lit ? '#79dce8' : just ? 'rgba(255,138,122,.5)' : 'rgba(255,255,255,.1)'; g.beginPath(); g.arc(x, y, 18, 0, TAU); g.fill();
                    g.font = '600 11px ' + SANS; g.textAlign = 'center'; g.fillStyle = lit ? '#04101f' : 'rgba(255,255,255,.55)'; g.fillText(ins[0], x, y + 4);
                    if (!lit && ins[1]) { g.fillStyle = 'rgba(255,255,255,.45)'; g.fillText(ins[1], x, y + 36); }
                    g.textAlign = 'left';
                });
                hud(g, 'Instruments on', (10 - off) + ' of 10', 520, 120);
            } },
            { d: 8, cues: [[2, 'beep']], line: 'Its signal now takes almost a day to reach us. Giant dishes like these in Madrid still listen for it.', draw: function(g, p, s) {
                fill(g, '#02040c', '#0a1430', '#1a2440');
                stars(g, s, .9, 0); nebula(g, true, .35, 0);
                ridge(g, 440, 60, 200, 4.4, 0, '#0b0f1a');
                var aim = -.55;
                dish(g, 330, 470, 1.8, aim); dish(g, 640, 470, 1.1, aim); dish(g, 800, 470, .8, aim);
                g.fillStyle = '#05070d'; g.fillRect(0, 470, W, 80);
                var bxs = 330 + Math.sin(aim) * -60, bys = 470 - 52 * 1.8 - 60;
                g.strokeStyle = 'rgba(121,220,232,.18)'; g.lineWidth = 1; g.beginPath(); g.moveTo(bxs, bys); g.lineTo(W, -60); g.stroke();
                var q = (s * .18) % 1; glow(g, lerp(W, bxs, q), lerp(-60, bys, q), 12, 'rgba(200,250,255,', .9);   // a faint pulse arrives
                hud(g, 'One-way light time', '≈ 23 h 56 min', 40, 50); hud(g, 'Madrid Deep Space Complex', '', 40, 112, null, .9);
            } },
            { d: 5, sfx: 'swell', line: '', draw: function(g, p, s) { endCard(g, s, p, '2 of 10', 'instruments still on · still sending data', 'deep'); } }
        ] }
    };
    /* a scene lasts at least as long as its narration needs (about 2.6 words a second) */
    Object.keys(FILMS).forEach(function(id) {
        var t = 0;
        FILMS[id].scenes.forEach(function(sc) { sc.d = Math.max(sc.d, sc.line ? sc.line.split(/\s+/).length / 2.6 + 1.2 : 0); sc.t0 = t; t += sc.d; });
        FILMS[id].length = t;
    });

    /* one frame of a film at time x, onto any 2D context of any size */
    function sceneAt(f, x) { var i = f.scenes.length - 1; while (i > 0 && f.scenes[i].t0 > x) i--; return i; }
    function paint(g, f, x, w, h, fades) {
        var i = sceneAt(f, x), sc = f.scenes[i], s = x - sc.t0, p = clamp(s / sc.d, 0, 1);
        g.setTransform(w / W, 0, 0, h / H, 0, 0);
        g.clearRect(0, 0, W, H);
        g.save(); sc.draw(g, p, s); g.restore();
        g.filter = 'none'; g.globalAlpha = 1; g.textAlign = 'left'; spaced(g, 0);
        vignette(g); grain(g, x);
        g.font = '600 10px ' + SANS; spaced(g, 3); g.fillStyle = 'rgba(255,255,255,.35)'; g.textAlign = 'right'; g.fillText('SPACEEDU · ANIMATION', W - 18, H - 14); g.textAlign = 'left'; spaced(g, 0);
        if (fades) { var a = Math.min(ease(s / .5), ease((sc.d - s) / .5)); if (a < 1) { g.fillStyle = 'rgba(0,0,0,' + (1 - a).toFixed(3) + ')'; g.fillRect(0, 0, W, H); } }
        return i;
    }
    /* posters are frames of the films themselves, rendered once on demand */
    Object.keys(FILMS).forEach(function(id) {
        var f = FILMS[id], url = null;
        Object.defineProperty(f, 'poster', { get: function() {
            if (url) return url;
            try {
                var c = document.createElement('canvas'); c.width = 640; c.height = 360;
                var sc = f.scenes[f.posterAt[0]]; paint(c.getContext('2d'), f, sc.t0 + sc.d * f.posterAt[1], 640, 360, false);
                url = c.toDataURL('image/jpeg', .86);
            } catch (e) { url = ''; }
            return url;
        } });
    });

    /* ---- the player ---- */
    var dlg = document.getElementById('film'), cv = document.getElementById('film-cv'), g = cv && cv.getContext('2d');
    if (!dlg || !g) return { FILMS: FILMS, open: function() {} };
    var sub = document.getElementById('film-sub'), big = document.getElementById('film-big'), playBtn = document.getElementById('film-play'),
        seek = document.getElementById('film-seek'), timeEl = document.getElementById('film-time'), sndBtn = document.getElementById('film-snd'),
        voiceBtn = document.getElementById('film-voice'), titleEl = document.getElementById('film-title'), srcEl = document.getElementById('film-src');
    var Snd = window.SpaceSound, film = null, filmId = null, t = 0, playing = false, last = 0, scene = -1, raf = 0, soundOn = true, voiceOn = Snd.cfg.voice !== false, watched = false;
    var synth = window.speechSynthesis, voice = null;
    /* the narrator: a studio recording when the site has one for this line (audio/films/<lang>/<film>-<scene>.mp3, listed in
       window.FILM_NARRATION), otherwise the most natural voice this device offers. Voices are ranked, not taken first-come:
       neural "Natural"/online voices first, then Google's, then a calm local voice; the old robotic ones only as a last resort. */
    var REC = window.FILM_NARRATION || {}, rec = null;
    var CALM = { en: /Ryan|Guy|Christopher|Andrew|Brian|Eric|Thomas|Daniel|Arthur|George|Oliver|UK English Male|US English/i,
        ru: /Dmitry|Svetlana|Dariya|Pavel|Google|русский/i, uz: /Sardor|Madina|Google/i };
    function rank(v) {
        var code = window.LANG || 'en', s = 0;
        if (/Natural|Neural|Online|Premium|Enhanced/i.test(v.name)) s += 100;   // Edge, Windows 11, macOS neural voices
        if (/^Google/i.test(v.name)) s += 60;
        if (!v.localService) s += 20;
        if (CALM[code] && CALM[code].test(v.name)) s += 25;
        if (/Zira|David|Mark|Hazel|Irina|Microsoft Pavel|eSpeak|Fred|Albert|Bad News|Bells|Boing|Bubbles|Cellos|Whisper|Zarvox|Trinoids|Junior/i.test(v.name) && !/Natural|Online/i.test(v.name)) s -= 40;   // robotic or novelty voices
        return s;
    }
    /* every language gets a narrator: when a device has no Uzbek voice (most have none), a closely related Turkic voice reads
       the Uzbek text, respelled so it sounds right, instead of leaving the film silent */
    var KIN = { en: ['en'], ru: ['ru'], uz: ['uz', 'tr', 'kk', 'az'] }, voiceLang = null;
    function pickVoice() {
        if (!synth) return;
        var all = synth.getVoices(), chain = KIN[window.LANG || 'en'] || ['en'];
        voice = null; voiceLang = null;
        for (var i = 0; i < chain.length && !voice; i++) {
            var vs = all.filter(function(v) { return new RegExp('^' + chain[i] + '(-|_|$)', 'i').test(v.lang); });
            voice = vs.sort(function(a, b) { return rank(b) - rank(a); })[0] || null;
            if (voice) voiceLang = chain[i];
        }
        showNarrator();
    }
    function forVoice(text, en) {                             // Uzbek Latin respelled for a Turkish voice: sh→ş, ch→ç, x→h, q→k, j→c, o‘→o, g‘→g
        if (window.LANG !== 'uz' || voiceLang === 'uz' || !voiceLang) return text;
        var keep = {}; String(en || '').split(/[^A-Za-z]+/).forEach(function(w) { if (w) keep[w] = 1; });   // names such as Sojourner stay as written
        return text.split(/(\s+)/).map(function(w) { var bare = w.replace(/[^A-Za-z]/g, ''); return keep[bare] ? w : respell(w); }).join('');
    }
    function respell(text) {
        return text.replace(/([OoGg])[‘’ʻ'`]/g, '$1').replace(/[ʼ’‘]/g, '').replace(/Sh/g, 'Ş').replace(/sh/g, 'ş').replace(/Ch/g, 'Ç').replace(/ch/g, 'ç')
            .replace(/X/g, 'H').replace(/x/g, 'h').replace(/Q/g, 'K').replace(/q/g, 'k').replace(/J/g, 'C').replace(/j/g, 'c');
    }
    var narrEl = document.createElement('p'); narrEl.className = 'film-narr'; srcEl.insertAdjacentElement('afterend', narrEl);
    function showNarrator() {
        var l = window.LANG || 'en', W = { en: 'Narrator', ru: 'Диктор', uz: 'Diktor' }[l] || 'Narrator';
        if (REC[l] && REC[l].length) { narrEl.textContent = W + ': ' + { en: 'studio recording', ru: 'студийная запись', uz: 'studiya yozuvi' }[l]; return; }
        if (!voice) { narrEl.textContent = W + ': ' + { en: 'no voice on this device, subtitles only', ru: 'на этом устройстве нет голоса, только субтитры', uz: 'bu qurilmada ovoz yo‘q, faqat subtitrlar' }[l]; return; }
        var name = voice.name.replace(/^(Microsoft|Google)\s+/, '').replace(/\s*[-–(].*$/, '');
        narrEl.textContent = W + ': ' + name + (l === 'uz' && voiceLang !== 'uz' ? ' (turkiy ovoz: bu qurilmada o‘zbek ovozi yo‘q)' : '');
    }
    if (synth) { pickVoice(); synth.onvoiceschanged = pickVoice; } else showNarrator();
    voiceBtn.hidden = !synth && !Object.keys(REC).length;
    function hush() {                                         // stop whatever is speaking, recording or synthesised
        if (synth) synth.cancel();
        if (rec) { rec.pause(); rec = null; }
    }
    function say(text, key) {
        hush();
        if (!text || !voiceOn || !soundOn) return;
        var lang = window.LANG || 'en';
        if (REC[lang] && REC[lang].indexOf(key) >= 0) {
            rec = new Audio('audio/films/' + lang + '/' + key + '.mp3'); rec.volume = .95;
            var mine = rec; rec.play().catch(function() { if (rec === mine) { rec = null; speak(text); } });   // a missing file falls back to the browser voice
            return;
        }
        speak(text);
    }
    function speak(text) {
        if (!synth) return;
        if (!voice && (window.LANG || 'en') !== 'en') return;      // no voice for this language: subtitles only
        var u = new SpeechSynthesisUtterance(forVoice(T(text), text)); u.rate = .93; u.pitch = .96; u.lang = { en: 'en-GB', ru: 'ru-RU', uz: 'uz-UZ' }[window.LANG || 'en']; if (voice) { u.voice = voice; u.lang = voice.lang; }
        synth.speak(u);
    }
    function fmtT(x) { x = Math.max(0, Math.floor(x)); return Math.floor(x / 60) + ':' + String(x % 60).padStart(2, '0'); }
    function size() {
        var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
        if (!r.width) return;
        cv.width = Math.round(r.width * d); cv.height = Math.round(r.width * 9 / 16 * d);
    }
    function render() {
        var i = paint(g, film, t, cv.width, cv.height, playing), sc = film.scenes[i];
        if (i !== scene) {
            scene = i; sub.textContent = T(sc.line); sub.hidden = !sc.line;
            if (playing) { say(sc.line, filmId + '-' + i); if (sc.sfx && soundOn) Snd.film.sfx(sc.sfx); }
        }
        seek.value = Math.round(t / film.length * 1000);
        var total = Math.round(film.length);
        timeEl.textContent = fmtT(t >= film.length - .01 ? total : t) + ' / ' + fmtT(total);   // rounded like the "61 s" on the film cards
    }
    function cues(from, to) {                                 // sounds timed inside a scene (bounces, beeps, gusts)
        if (!soundOn || to <= from) return;
        film.scenes.forEach(function(sc) {
            (sc.cues || []).forEach(function(c) { var at = sc.t0 + c[0]; if (at > from && at <= to) Snd.film.sfx(c[1]); });
        });
    }
    var dirty = true;                                         // a paused film is painted again only when something changed
    function loop(now) {
        raf = requestAnimationFrame(loop);
        if (playing) {
            var was = t;
            t += Math.min((now - last) / 1000, .1);
            cues(was, t);
            if (t >= film.length) { t = film.length - .001; setPlaying(false); end(); }
        }
        last = now;
        if (playing || dirty) { dirty = false; render(); }
    }
    function end() {
        if (!watched) { watched = true; document.dispatchEvent(new CustomEvent('spaceedu:film-done', { detail: { id: filmId } })); }
        big.hidden = false; big.textContent = '↻'; big.setAttribute('aria-label', 'Watch again');
    }
    function setPlaying(on) {
        playing = on; dirty = true;
        playBtn.textContent = on ? 'Ⅱ Pause' : '▶ Play';
        big.hidden = on;
        if (on) {
            big.textContent = '▶'; big.setAttribute('aria-label', 'Play film');   // a replay is no longer "watch again" once it runs
            Snd.ensure(); Snd.film.on(soundOn); Snd.film.drone(film.mood);
            if (t >= film.length - .01) { t = 0; }
            scene = -1;                                          // re-announce the current scene
            cues(t - .001, t);
        } else { Snd.film.stop(); hush(); }
    }
    function open(id) {
        film = FILMS[id]; if (!film) return;
        filmId = id; t = 0; scene = -1; watched = false;
        voiceOn = Snd.cfg.voice !== false; showVoice();        // Settings may have changed it since the page loaded
        textures();
        titleEl.textContent = film.title;
        srcEl.textContent = 'Animated by Singularity’s from ' + film.src + '. Every frame is drawn live in your browser, with no video files or photos. Narration uses your browser’s voice.';
        big.hidden = false; big.textContent = '▶'; big.setAttribute('aria-label', 'Play film');
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        document.documentElement.classList.add('has-dialog');
        size(); last = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(loop);
        setPlaying(false);
        big.focus();
    }
    function close() {
        resumeAfterSeek = false; setPlaying(false); cancelAnimationFrame(raf);
        if (dlg.open) dlg.close();
        if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('has-dialog');
    }
    big.addEventListener('click', function() { setPlaying(true); });
    playBtn.addEventListener('click', function() { setPlaying(!playing); });
    /* scrubbing: the sound stops the moment you grab the timeline and starts again, from the new scene, when you let go */
    var resumeAfterSeek = false;
    function seekStart() { if (playing) { resumeAfterSeek = true; setPlaying(false); big.hidden = true; } }
    function seekEnd() { if (resumeAfterSeek) { resumeAfterSeek = false; setPlaying(true); } }
    seek.addEventListener('pointerdown', seekStart);
    seek.addEventListener('input', function() { seekStart(); t = seek.value / 1000 * film.length; scene = -1; dirty = true; hush(); });
    seek.addEventListener('change', seekEnd);
    seek.addEventListener('pointerup', seekEnd);
    sndBtn.addEventListener('click', function() {
        soundOn = !soundOn; sndBtn.setAttribute('aria-pressed', soundOn); sndBtn.textContent = soundOn ? 'Sound on' : 'Sound off';
        Snd.film.on(soundOn); if (!soundOn) hush();
    });
    function showVoice() { voiceBtn.setAttribute('aria-pressed', voiceOn); voiceBtn.textContent = voiceOn ? 'Narration on' : 'Narration off'; }
    voiceBtn.addEventListener('click', function() {
        voiceOn = !voiceOn; showVoice();
        Snd.set('voice', voiceOn); if (!voiceOn) hush();
    });
    showVoice();
    cv.addEventListener('click', function() { setPlaying(!playing); });
    dlg.querySelector('.d-close').addEventListener('click', close);
    dlg.addEventListener('cancel', function(e) { e.preventDefault(); close(); });
    dlg.addEventListener('close', function() { if (playing) setPlaying(false); cancelAnimationFrame(raf); if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('has-dialog'); });
    dlg.addEventListener('click', function(e) { if (e.target === dlg) close(); });
    dlg.addEventListener('keydown', function(e) { if (e.key === ' ' && e.target === dlg) { e.preventDefault(); setPlaying(!playing); } });
    window.addEventListener('resize', function() { if (dlg.open) { size(); dirty = true; } });
    return { FILMS: FILMS, open: open };
})();
