/* Pages, header, stars, live data and the map */
(function() {
    var S = window.SpaceEdu;
    if (!S) return;
    var root = document.documentElement;
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || root.classList.contains('calm');
    var $ = function(s, el) { return (el || document).querySelector(s); };
    var $$ = function(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
    var pad = function(n) { return String(n).padStart(2, '0'); };
    var fmt = function(n, d) { return n.toLocaleString('en-US', { maximumFractionDigits: d || 0, minimumFractionDigits: d || 0 }); };
    var C_KMS = 299792.458, AU = Astro.AU, DAY = 86400000;

    /* ============================== PAGES ============================== */
    var pages = $$('.page'), header = $('.site-header'), current = null;
    var PAGE_TITLES = { explore: 'Explore', learn: 'Learn', compare: 'Compare', glossary: 'Glossary', about: 'About', play: 'Play' };
    function pageOf(el) { var p = el && el.closest('.page'); return p ? p.dataset.page : null; }

    /* each page gets its own sticky index of the sections it contains */
    pages.forEach(function(page) {
        var secs = $$('section[id]', page);
        if (secs.length < 2) return;                         // a menu with one item is not a menu
        var nav = document.createElement('nav');
        nav.className = 'xnav';
        nav.setAttribute('aria-label', page.dataset.title + ': sections');
        nav.innerHTML = '<ul>' + secs.map(function(sec) {
            var k = $('.kicker', sec), label = k ? k.textContent.trim() : sec.id;
            return '<li><a href="#' + sec.id + '">' + label + '</a></li>';
        }).join('') + '</ul>';
        var after = $('.stage', page) || $('.page-head', page);
        after.insertAdjacentElement('afterend', nav);
        if ('IntersectionObserver' in window) {
            var links = $$('a', nav);
            var io = new IntersectionObserver(function(es) {
                es.forEach(function(e) {
                    if (!e.isIntersecting) return;
                    links.forEach(function(a) {
                        var on = a.hash === '#' + e.target.id;
                        if (on) {
                            a.setAttribute('aria-current', 'true');
                            var ul = a.closest('ul');   // only the bar scrolls sideways, never the page
                            ul.scrollTo({ left: a.offsetLeft - (ul.clientWidth - a.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
                        } else a.removeAttribute('aria-current');
                    });
                });
            }, { rootMargin: '-35% 0px -60% 0px' });
            secs.forEach(function(sec) { io.observe(sec); });
        }
    });

    function go(name, keepScroll) {
        if (!pages.some(function(p) { return p.dataset.page === name; })) name = 'missions';
        if (name !== current) {
            pages.forEach(function(p) { p.hidden = p.dataset.page !== name; });
            $$('[data-page-link]').forEach(function(a) {
                if (a.dataset.pageLink === name) a.setAttribute('aria-current', 'page');
                else a.removeAttribute('aria-current');
            });
            root.dataset.page = name;
            current = name;
            if (name !== 'missions') document.title = PAGE_TITLES[name] + ' — SpaceEdu';
            else document.title = S.OBJECTS[S.featured()].title + ' — SpaceEdu';
            if (!keepScroll) window.scrollTo(0, 0);
            window.dispatchEvent(new Event('resize'));           // canvases that were hidden measure themselves again
            document.dispatchEvent(new CustomEvent('spaceedu:page', { detail: { page: name } }));
        }
    }
    function route() {
        var h;
        try { h = decodeURIComponent(location.hash || ''); } catch (e) { go('missions'); return; }   // e.g. a broken "%E0%A4%A"
        if (!h || h === '#' || h === '#/' || h === '#top') { go('missions'); return; }
        if (h.indexOf('#/') === 0) { go(h.slice(2)); return; }
        var el = document.getElementById(h.slice(1));
        if (el) {
            go(pageOf(el) || 'missions', true);
            requestAnimationFrame(function() { el.scrollIntoView(); });
        }
    }
    S.go = function(name) {
        go(name);
        var want = name === 'missions' ? '#/' : '#/' + name;
        if (location.hash !== want) history.pushState(null, '', want);
    };
    window.addEventListener('hashchange', route);
    window.addEventListener('popstate', route);
    route();

    /* the header gains a backdrop once it no longer sits over the hero */
    function headerState() {
        var over = current === 'missions' && window.scrollY < innerHeight * .5;
        header.classList.toggle('solid', !over);
    }
    window.addEventListener('scroll', headerState, { passive: true });
    document.addEventListener('spaceedu:page', headerState);
    headerState();

    /* scroll progress line under the header */
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    header.appendChild(bar);
    function progress() {
        var max = document.documentElement.scrollHeight - innerHeight;
        bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0).toFixed(4) + ')';
    }
    window.addEventListener('scroll', progress, { passive: true });
    document.addEventListener('spaceedu:page', progress);

    /* ============================== START ==============================
       The page shows at once. 'spaceedu:boot-done' starts the entrance as soon as the fonts are ready,
       and within 1.5 s at most; the 3D model joins whenever it arrives. */
    var bootDone = false;
    function finishBoot() {
        if (bootDone) return;
        bootDone = true;
        root.classList.add('boot-done');
        document.dispatchEvent(new Event('spaceedu:boot-done'));
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(finishBoot);
    setTimeout(finishBoot, 1500);

    /* ============================== SKY: scroll-driven stars and shooting stars ============================== */
    var stage = $('.stage'), heroRatio = 1;
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(function(es) { heroRatio = es[0].intersectionRatio; }, { threshold: [0, .25, .5, .75, .98, 1] }).observe(stage);
    }
    var scrollV = 0, lastY = window.scrollY;
    window.addEventListener('scroll', function() {
        var y = window.scrollY, dy = y - lastY; lastY = y;
        if (Math.abs(dy) < 400) scrollV += dy;                    // a jump (page change, anchor link) is not a scroll
    }, { passive: true });

    function Sky(canvas, opts) {
        var ctx = canvas.getContext('2d'), W = 0, H = 0, layers = [], meteors = [], next = 0, last = 0, vel = 0;
        function size() {
            var r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
            W = r.width; H = r.height;
            if (!W || !H) return;
            canvas.width = Math.round(W * d); canvas.height = Math.round(H * d);
            ctx.setTransform(d, 0, 0, d, 0, 0);
            layers = opts.stars ? [.25, .55, 1].map(function(depth) {   // three depths for parallax
                var n = Math.round(W * H / (depth === 1 ? 26000 : 11000));
                return { depth: depth, stars: Array.from({ length: n }, function() {
                    return { x: Math.random() * W, y: Math.random() * H, r: (Math.random() * .8 + .3) * (.6 + depth * .7),
                        a: Math.random() * .45 + .15 + depth * .2, p: Math.random() * 6.28, s: Math.random() * .8 + .2 };
                }) };
            }) : [];
        }
        function spawn(now, x, y) {
            var big = Math.random() < .14, ang = (196 + Math.random() * 28) * Math.PI / 180, speed = 900 + Math.random() * 700;
            meteors.push({ x: x != null ? x : W * (.2 + Math.random() * .9), y: y != null ? y : H * (Math.random() * .4 - .06),
                vx: Math.cos(ang) * speed, vy: Math.abs(Math.sin(ang)) * speed,
                len: (big ? 280 : 150) + Math.random() * 120, life: .75 + Math.random() * .6, t0: now, w: big ? 2.3 : 1.4 });
            if (x == null) next = now + (opts.every[0] + Math.random() * (opts.every[1] - opts.every[0])) * 1000;
            var mx = (x != null ? x : meteors[meteors.length - 1].x) / (W || 1);    // the sound pans to where it crosses
            document.dispatchEvent(new CustomEvent('spaceedu:meteor', { detail: { x: mx, big: big } }));
        }
        function a(v) { return Math.max(0, Math.min(1, v)).toFixed(3); }  // never let a tiny float become "1e-17" in a colour
        function frame(now) {
            requestAnimationFrame(frame);
            if (document.hidden || !opts.active()) { last = now; return; }
            if (!W) { size(); if (!W) return; }
            var dt = Math.min((now - (last || now)) / 1000, .05); last = now;
            if (!next) next = now + 700;
            if (now >= next && !reduce) spawn(now);
            if (opts.stars) {
                vel += (scrollV - vel) * .2; scrollV *= .8;
            }
            ctx.clearRect(0, 0, W, H);
            layers.forEach(function(L) {
                var shift = vel * L.depth * .35;
                ctx.fillStyle = '#dce7f6'; ctx.strokeStyle = '#dce7f6';
                L.stars.forEach(function(s) {
                    s.y -= shift; if (s.y < -4) s.y += H + 8; else if (s.y > H + 4) s.y -= H + 8;
                    if (!reduce) s.p += dt * s.s;
                    ctx.globalAlpha = s.a * (.78 + .22 * Math.sin(s.p));
                    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
                });
            });
            ctx.globalAlpha = 1;
            meteors = meteors.filter(function(m) {
                var t = (now - m.t0) / 1000;
                if (t > m.life) return false;
                var k = Math.sin(Math.PI * t / m.life), hx = m.x + m.vx * t, hy = m.y + m.vy * t;
                var sp = Math.hypot(m.vx, m.vy), tail = Math.min(1, t / .18) * m.len;
                var tx = hx - m.vx / sp * tail, ty = hy - m.vy / sp * tail;
                if (tail > 1) {
                    var g = ctx.createLinearGradient(tx, ty, hx, hy);
                    g.addColorStop(0, 'rgba(160,220,255,0)');
                    g.addColorStop(.7, 'rgba(190,232,255,' + a(.35 * k) + ')');
                    g.addColorStop(1, 'rgba(255,255,255,' + a(.95 * k) + ')');
                    ctx.strokeStyle = g; ctx.lineWidth = m.w; ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
                }
                var glow = ctx.createRadialGradient(hx, hy, 0, hx, hy, m.w * 5);
                glow.addColorStop(0, 'rgba(255,255,255,' + a(.85 * k) + ')');
                glow.addColorStop(1, 'rgba(160,220,255,0)');
                ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(hx, hy, m.w * 5, 0, 6.283); ctx.fill();
                return true;
            });
        }
        window.addEventListener('resize', function() { W = 0; });
        requestAnimationFrame(frame);
        return { burst: function(x, y) { if (W) spawn(performance.now(), x, y); }, count: function() { return meteors.length; } };
    }
    var heroSky = Sky($('.meteor-hero'), { stars: false, every: [2.2, 5.5],
        active: function() { return current === 'missions' && heroRatio > 0; } });
    var pageSky = Sky($('.meteor-page'), { stars: true, every: [3, 7],
        active: function() { return current !== 'missions' || heroRatio < .98; } });
    /* clicking empty sky launches a shooting star from that spot */
    document.addEventListener('click', function(e) {
        if (reduce || e.target.closest('a, button, input, select, summary, label, dialog, .gl, canvas, .x-card, table')) return;
        var r = $('.meteor-page').getBoundingClientRect();
        pageSky.burst(e.clientX - r.left + 60, e.clientY - r.top - 40);
        document.dispatchEvent(new Event('spaceedu:launch'));
    });
    window.SpaceSky = { hero: heroSky, page: pageSky };

    /* ============================== LIVE DATA ============================== */
    /* Voyager 1: JPL Horizons table (every 5 days) interpolated to the second */
    var V1_LON = 256.78 * Math.PI / 180;                   // Voyager 1's heliocentric ecliptic longitude (JPL Horizons, Oct. 2026)
    var V1_LAT = 35 * Math.PI / 180;                       // and latitude: matches the table's Earth distances to 0.003 AU
    function voyager(ms) {
        var t = (ms - V1_EPHEM.epoch) / DAY, R = V1_EPHEM.rows, i = 0;
        while (i < R.length - 2 && R[i + 1][0] < t) i++;
        var a = R[i], b = R[i + 1], k = (t - a[0]) / (b[0] - a[0]);      // the Sun distance extrapolates gently past the ends
        var sun = a[1] + (b[1] - a[1]) * k, earth = a[2] + (b[2] - a[2]) * k;
        var dEarth = (b[2] - a[2]) * AU / ((b[0] - a[0]) * 86400);       // km/s, includes Earth's own motion
        if (t < R[0][0] || t > R[R.length - 1][0]) {         // the Earth distance swings with Earth's orbit: work it out from where Earth is
            var fromEarth = function(m, s) {
                var e = Astro.planet('earth', m), c = Math.cos(V1_LAT);
                return Math.hypot(s * c * Math.cos(V1_LON) - e.x, s * c * Math.sin(V1_LON) - e.y, s * Math.sin(V1_LAT) - e.z);
            };
            var hr = 3600000, sunRate = (b[1] - a[1]) / (b[0] - a[0]) / 24;   // AU per hour
            earth = fromEarth(ms, sun);
            dEarth = (fromEarth(ms + hr, sun + sunRate) - earth) * AU / 3600;
        }
        return { sunAU: sun, earthAU: earth, earthKm: earth * AU, sunKm: sun * AU, earthKms: dEarth, sunKms: (b[1] - a[1]) * AU / ((b[0] - a[0]) * 86400) };
    }
    function hms(sec) {
        sec = Math.max(0, Math.floor(sec));
        var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
        if (!h) return m + ' min ' + pad(sec % 60) + ' s';
        return h + ' h ' + pad(m) + ' min ' + pad(sec % 60) + ' s';
    }
    function since(fromMs, nowMs) {
        var s = Math.floor((nowMs - fromMs) / 1000), d = Math.floor(s / 86400);
        var y = Math.floor(d / 365.2425), rd = Math.floor(d - y * 365.2425);
        return { days: d, years: y, rest: rd, clock: pad(Math.floor(s % 86400 / 3600)) + ':' + pad(Math.floor(s % 3600 / 60)) + ':' + pad(s % 60) };
    }
    var EAGLE = Date.UTC(1969, 6, 20, 20, 17, 40), M20_LAND = Date.UTC(2021, 1, 18, 20, 43, 49);   // touchdown on Mars; Earth heard it 11 min later, at 20:55
    var SILENT = { sojourner: Date.UTC(1997, 8, 27), spirit: Date.UTC(2010, 2, 22), opportunity: Date.UTC(2018, 5, 10) };
    /* Mars sols since landing: landing was at about 15:53 local mean solar time in Jezero (0.66 of a sol) */
    var marsSol = function(ms) { return Math.floor(.662 + (ms - M20_LAND) / 88775244); };
    var lvGrid = $('#lv-grid');
    var cite = function(url, label) { return '<a class="cite" href="' + url + '" target="_blank" rel="noopener">' + label + '</a>'; };
    var HZ = 'https://ssd.jpl.nasa.gov/horizons/';
    /* the last field says where each number comes from: only Perseverance's is a live NASA feed */
    var CARDS = [
        ['apollo', 'pas', 'Earth–Moon distance now', 'lv-moon', [
            ['A laser pulse there and back takes', 'lv-rtt'], ['Since Eagle landed (July 20, 1969, 20:17 UTC)', 'lv-eagle']],
            cite('https://www.jpl.nasa.gov/news/the-apollo-experiment-that-keeps-on-giving/', 'JPL') + ' Moon distance computed with Meeus&rsquo; lunar theory, checked against ' + cite(HZ, 'JPL Horizons') + ' to within 20 km.', 'calc'],
        ['voyager', 'lim', 'Distance from Earth now', 'lv-v1', [
            ['From the Sun', 'lv-v1sun'], ['Its radio signal needs', 'lv-v1light'], ['Moving away from the Sun at', 'lv-v1speed']],
            'Interpolated from ' + cite(HZ, 'JPL Horizons') + ' every second. ' + cite('https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/', 'NASA'), 'calc'],
        ['sojourner', 'off', 'Silent for', 'lv-soj', [['That is about', 'lv-soj-y'], ['Last data from Mars', null, 'Sept. 27, 1997'], ['Worked', null, '83 days, against a plan of 7']],
            cite('https://www.nasa.gov/history/25-years-ago-mars-pathfinder-launches-to-mars-to-deploy-sojourner-the-first-planetary-rover-2/', 'NASA'), 'days'],
        ['spirit', 'off', 'Silent for', 'lv-spi', [['That is about', 'lv-spi-y'], ['Last contact', null, 'Mar. 22, 2010'], ['Drove', null, '7.73 km on a 90-day mission']],
            cite('https://science.nasa.gov/mission/mer-spirit/', 'NASA'), 'days'],
        ['opportunity', 'off', 'Silent for', 'lv-opp', [['That is about', 'lv-opp-y'], ['Last contact', null, 'June 10, 2018'], ['Drove', null, '45.16 km on a 90-day mission']],
            cite('https://science.nasa.gov/mission/mer-opportunity/', 'NASA'), 'days'],
        ['perseverance', 'ok', 'Driven on Mars', 'lv-m20', [
            ['Latest drive', 'lv-m20drive'], ['Where it is', 'lv-m20pos'], ['Mission day now (sol)', 'lv-m20sol']],
            'Live from NASA&rsquo;s ' + cite('https://science.nasa.gov/mission/mars-2020-perseverance/location-map/', 'mission map') + ' and ' + cite('https://mars.nasa.gov/mars2020/multimedia/raw-images/', 'raw images') + ' feeds.', 'live']
    ];
    var LABEL = S.LABEL;
    var KIND = { live: 'Live · NASA feed', calc: 'Calculated · JPL data', days: 'Counted from last contact' };
    lvGrid.innerHTML = CARDS.map(function(c) {
        var id = c[0], o = S.OBJECTS[id];
        return '<article class="lv-card" data-id="' + id + '">' +
            '<header><img src="' + ($('.pick[data-object="' + id + '"] img') || {}).src + '" alt="" class="lv-thumb" data-thumb="' + id + '">' +
            '<div><h3>' + o.title + '</h3><span class="pill ' + c[1] + '">' + LABEL[c[1]] + '</span></div></header>' +
            '<p class="lv-kind" data-kind="' + c[6] + '">' + KIND[c[6]] + '</p>' +
            '<p class="lv-k">' + c[2] + '</p><p class="lv-big" id="' + c[3] + '">–</p>' +
            '<dl>' + c[4].map(function(r) { return '<div><dt>' + r[0] + '</dt><dd' + (r[1] ? ' id="' + r[1] + '"' : '') + '>' + (r[2] || '–') + '</dd></div>'; }).join('') + '</dl>' +
            (id === 'perseverance' ? '<figure class="lv-raw" id="lv-raw" hidden><a target="_blank" rel="noopener"><img alt=""></a><figcaption></figcaption></figure>' : '') +
            '<p class="lv-src">' + c[5] + '</p>' +
            '<button class="x-btn" type="button" data-live-hero="' + id + '">See it in 3D</button></article>';
    }).join('');
    lvGrid.addEventListener('click', function(e) {
        var b = e.target.closest('[data-live-hero]');
        if (b) { S.show(b.dataset.liveHero); document.getElementById('top').scrollIntoView(); }
    });
    /* keep the card thumbnails in step with the 3D renders once those exist */
    new MutationObserver(function() {
        $$('[data-thumb]', lvGrid).forEach(function(img) {
            var src = ($('.pick[data-object="' + img.dataset.thumb + '"] img') || {}).src;
            if (src && img.src !== src) img.src = src;
        });
    }).observe($('.picks'), { subtree: true, attributes: true, attributeFilter: ['src'] });

    var set = function(id, v) { var el = document.getElementById(id); if (el && el.textContent !== v) el.textContent = v; };
    function tick() {
        var now = Date.now(), moon = Astro.moonKm(now), v = voyager(now);
        /* no more digits than the method can give: the Moon to 10 km, Voyager to 100,000 km, silence to the day */
        set('lv-moon', fmt(Math.round(moon / 10) * 10) + ' km');
        set('lv-rtt', (2 * moon / C_KMS).toFixed(2) + ' seconds');
        var e = since(EAGLE, now);
        set('lv-eagle', e.years + ' years, ' + e.rest + ' days');
        set('lv-v1', (v.earthKm / 1e9).toFixed(4) + ' billion km');
        set('lv-v1sun', (v.sunKm / 1e9).toFixed(3) + ' billion km · ' + v.sunAU.toFixed(2) + ' AU');
        set('lv-v1light', hms(v.earthKm / C_KMS).replace(/ \d+ s$/, '') + ' one way');
        set('lv-v1speed', v.sunKms.toFixed(1) + ' km/s (' + fmt(Math.round(v.sunKms * 36) * 100) + ' km/h)');
        ['sojourner', 'spirit', 'opportunity'].forEach(function(id) {
            var s = since(SILENT[id], now), months = Math.floor((s.days - s.years * 365.2425) / 30.44);
            set('lv-' + id.slice(0, 3), fmt(s.days) + ' days');
            set('lv-' + id.slice(0, 3) + '-y', s.years + ' years' + (months ? ', ' + months + ' months' : ''));
        });
        set('lv-m20sol', 'Sol ' + fmt(marsSol(now)) + ' (computed from the landing time)');
        set('lv-clock', new Date(now).toISOString().slice(0, 19).replace('T', ' ') + ' UTC');
    }
    tick();
    setInterval(tick, 1000);
    document.getElementById('lv-note').innerHTML = '<span id="lv-clock"></span> · Updated every second. Spirit, Opportunity and Sojourner count from their last contact, not from a known moment of failure.';

    /* Perseverance: NASA's own feeds, fetched when the Live section is first seen */
    var m20Fetched = false, refreshing = false;
    function fetchM20() {
        if (m20Fetched) return;
        m20Fetched = true;
        if (!refreshing) set('lv-m20', 'Loading…');      // a refresh keeps the old figures until new ones arrive
        var lastKnown = function(why) {
            set('lv-m20', '45.22 km');
            set('lv-m20drive', 'Sol 2009 (last known, ' + why + ')');
            set('lv-m20pos', '18.44° N, 77.23° E · western rim of Jezero Crater');
        };
        fetch('https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json').then(function(r) {
            if (!r.ok) throw new Error(r.status); return r.json();
        }).then(function(d) {
            /* mid-drive rows carry a total of 0: the total comes from the last row that has one, the place from the newest */
            var F = d.features, p = F[F.length - 1].properties, total = null;
            for (var j = F.length - 1; j >= 0 && !total; j--) if (F[j].properties.dist_km > 0) total = F[j].properties;
            if (!total) throw new Error('no total');
            set('lv-m20', fmt(total.dist_km, 2) + ' km');
            set('lv-m20drive', 'Sol ' + p.sol + (p.dist_m ? ' · ' + fmt(p.dist_m, 1) + ' m' : ''));
            set('lv-m20pos', Math.abs(p.lat).toFixed(2) + '° ' + (p.lat >= 0 ? 'N' : 'S') + ', ' + Math.abs(p.lon).toFixed(2) + '° ' + (p.lon >= 0 ? 'E' : 'W') + ' · Jezero Crater rim');
        }).catch(function() { if (!refreshing) lastKnown('offline'); });
        fetch('https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&num=1').then(function(r) {
            if (!r.ok) throw new Error(r.status); return r.json();
        }).then(function(d) {
            var im = d.images && d.images[0]; if (!im) return;
            var fig = $('#lv-raw'), a = $('a', fig), img = $('img', fig);
            if (/^https:\/\//.test(im.link)) a.href = im.link;    // feed text is data: only web links, and never markup
            img.src = im.image_files.medium || im.image_files.small;
            img.alt = 'Latest raw image from Perseverance: ' + (im.title || '');
            var cam = (im.camera && im.camera.instrument || '').replace(/_/g, ' ').toLowerCase();
            $('figcaption', fig).textContent = 'Latest picture from Mars · sol ' + im.sol + ' · ' +
                new Date(im.date_taken_utc + 'Z').toUTCString().slice(5, 22) + ' UTC · ' + cam + ' · ' + (im.credit || 'NASA/JPL-Caltech');
            fig.hidden = false;
        }).catch(function() { /* the card works without the picture */ });
    }
    if ('IntersectionObserver' in window) {
        var lio = new IntersectionObserver(function(es) { if (es[0].isIntersecting) { fetchM20(); lio.disconnect(); } }, { rootMargin: '200px' });
        lio.observe($('#live'));
    } else fetchM20();
    setTimeout(fetchM20, 6000);                            // in case the observer never reports (background tab, odd layouts)
    setInterval(function() {                               // NASA adds drives and pictures through the day: refresh every 10 minutes
        if (document.hidden || !m20Fetched) return;
        m20Fetched = false; refreshing = true; fetchM20();
    }, 600000);

    /* ============================== REAL MAP (log scale, true directions) ============================== */
    var PL = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    var T = window.T || function(x) { return x; };
    var PNAME = { mercury: T('Mercury'), venus: T('Venus'), earth: T('Earth'), mars: T('Mars'), jupiter: T('Jupiter'), saturn: T('Saturn'), uranus: T('Uranus'), neptune: T('Neptune') };
    var PCOL = { mercury: '#aeb7c5', venus: '#e8b777', earth: '#5aa0ff', mars: '#e27c60', jupiter: '#d8b18a', saturn: '#e6d39b', uranus: '#86d8e5', neptune: '#638bff' };
    /* the Moon's geocentric ecliptic longitude, main Meeus terms (good to a few tenths of a degree) */
    function moonLon(ms) {
        var t = (ms / DAY + 2440587.5 - 2451545) / 36525, r = Math.PI / 180;
        var Lp = 218.3164477 + 481267.88123421 * t, D = (297.8501921 + 445267.1114034 * t) * r,
            M = (357.5291092 + 35999.0502909 * t) * r, Mp = (134.9633964 + 477198.8675055 * t) * r, F = (93.2720950 + 483202.0175233 * t) * r;
        return (Lp + 6.289 * Math.sin(Mp) + 1.274 * Math.sin(2 * D - Mp) + .658 * Math.sin(2 * D) + .214 * Math.sin(2 * Mp) - .186 * Math.sin(M) - .114 * Math.sin(2 * F)) * r;
    }
    function timeControl(host, onChange) {
        var wrap = document.createElement('div');
        wrap.className = 'time-ctl';
        wrap.innerHTML = '<label><span>Time travel</span><input type="range" min="-730" max="730" step="1" value="0" aria-label="Days from today"></label>' +
            '<output>Today</output><button class="x-btn" type="button" data-today>Today</button><button class="x-btn" type="button" data-play aria-pressed="false">▶ Play</button>';
        host.insertAdjacentElement('afterend', wrap);
        var input = $('input', wrap), out = $('output', wrap), play = $('[data-play]', wrap), playing = false, raf = 0;
        function emit() {
            var days = +input.value, ms = Date.now() + days * DAY;
            out.textContent = days === 0 ? 'Today' : new Date(ms).toISOString().slice(0, 10) + ' (' + (days > 0 ? '+' : '') + days + ' days)';
            onChange(days);
            if (days) document.dispatchEvent(new Event('spaceedu:timetravel'));
        }
        input.addEventListener('input', emit);
        $('[data-today]', wrap).addEventListener('click', function() { input.value = 0; emit(); });
        play.addEventListener('click', function() {
            playing = !playing; play.setAttribute('aria-pressed', playing); play.textContent = playing ? 'Ⅱ Pause' : '▶ Play';
            cancelAnimationFrame(raf);
            (function step() {
                if (!playing) return;
                input.value = +input.value >= 730 ? -730 : +input.value + 2; emit();
                raf = requestAnimationFrame(step);
            })();
        });
        return wrap;
    }
    function canvasBox(cv) {
        var r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2), x = cv.getContext('2d');
        if (cv.width !== Math.round(r.width * d) || cv.height !== Math.round(r.height * d)) { cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
        x.setTransform(d, 0, 0, d, 0, 0);
        return { x: x, w: r.width, h: r.height };
    }
    var onScreen = function(el) {
        var st = { v: false };
        if ('IntersectionObserver' in window) new IntersectionObserver(function(es) { st.v = es[0].isIntersecting; }).observe(el);
        else st.v = true;
        return st;
    };

    /* ============================== PLANET FACTS (shown when a planet is clicked on the map) ============================== */
var FACTS = {
        mercury: ['Rocky planet · 1st from the Sun', '57.9 million km', '88 days', '4,879 km', '0', 'A small, rocky world with a heavily cratered surface. It has almost no atmosphere and swings between extreme heat and cold.', 'None of our six'],
        venus: ['Rocky planet · 2nd from the Sun', '108.2 million km', '224.7 days', '12,104 km', '0', 'A dense carbon-dioxide atmosphere and thick clouds trap heat, making it the hottest planet in the Solar System.', 'None of our six'],
        earth: ['Rocky planet · 3rd from the Sun', '149.6 million km', '365.25 days', '12,742 km', '1', 'Our home world has liquid water on its surface and a nitrogen-oxygen atmosphere. It is the only world known to support life.', 'All six started here. The Apollo 11 reflector sits on its Moon.'],
        mars: ['Rocky planet · 4th from the Sun', '227.9 million km', '687 days', '6,779 km', '2', 'A cold desert world with ancient river valleys, polar ice and the largest volcano known in the Solar System. Rovers study whether it was once habitable.', 'Sojourner, Spirit, Opportunity, Perseverance'],
        jupiter: ['Gas giant · 5th from the Sun', '778.6 million km', '11.86 Earth years', '139,820 km', '115', 'The largest planet, a gas giant with huge storms such as the Great Red Spot. Its moon Io is the most volcanic world known.', 'Voyager 1 flew past in March 1979'],
        saturn: ['Gas giant · 6th from the Sun', '1.43 billion km', '29.45 Earth years', '116,460 km', '293', 'Famous for bright rings made mostly of ice. Its moon Titan has a thick, mostly nitrogen atmosphere that hides its surface.', 'Voyager 1 flew past in November 1980'],
        uranus: ['Ice giant · 7th from the Sun', '2.87 billion km', '84 Earth years', '50,724 km', '29', 'An ice giant that spins on a strongly tilted axis. Methane in its atmosphere gives it a blue-green colour.', 'None of our six (Voyager 2 flew past in 1986)'],
        neptune: ['Ice giant · 8th from the Sun', '4.50 billion km', '164.8 Earth years', '49,244 km', '16', 'A distant ice giant with very fast winds and a deep blue colour.', 'None of our six (Voyager 2 flew past in 1989)']
    };
    function planetFacts(n, offset) {
        var f = FACTS[n], ms = Date.now() + (offset || 0) * DAY;
        set('x-pn', PNAME[n]); set('x-pt', f[0]); set('x-pd', f[5]);
        set('x-p1', f[1]); set('x-p2', f[2]); set('x-p3', f[3]); set('x-p4', f[4]); set('x-p5', f[6]);
        var d = n === 'earth' ? 0 : Astro.fromEarthAU(n, ms) * AU;
        set('x-p6', n === 'earth' ? 'You are here' : fmt(d / 1e6, 1) + ' million km · light ' + hms(d / C_KMS).replace(/ \d+ s$/, ''));
    }

    (function realMap() {
        var cv = $('#x-mapc'); if (!cv) return;
        var vis = onScreen(cv), offset = 0, hover = null, pins = [], tip = document.createElement('div');
        tip.className = 'map-tip'; tip.hidden = true; cv.parentNode.appendChild(tip);
        timeControl(cv.parentNode, function(d) { offset = d; if (chosen) planetFacts(chosen, offset); });
        $('#x-mapchips').innerHTML = S.ORDER.map(function(id) { return '<button class="x-btn" type="button" data-pin="' + id + '">' + S.OBJECTS[id].title + '</button>'; }).join('');
        $('#x-mapchips').addEventListener('click', function(e) { var b = e.target.closest('[data-pin]'); if (b) S.openDetail(b.dataset.pin); });
        var facts = $('#x-mapfacts'), chosen = null;
        $('.map-pclose', facts).addEventListener('click', function() { facts.hidden = true; chosen = null; });
        function showPlanet(n) {
            chosen = n; facts.hidden = false; planetFacts(n, offset);
            facts.scrollIntoView({ block: 'nearest' });
        }
        cv.addEventListener('pointermove', function(e) {
            var r = cv.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top, best = 22; hover = null;
            pins.forEach(function(p) { var d = Math.hypot(p.x - px, p.y - py); if (d < best) { best = d; hover = p; } });
            cv.style.cursor = hover ? 'pointer' : '';
            if (hover) { tip.hidden = false; tip.innerHTML = hover.html; tip.style.left = Math.min(px + 16, r.width - 250) + 'px'; tip.style.top = Math.max(py - 10, 8) + 'px'; }
            else tip.hidden = true;
        });
        cv.addEventListener('pointerleave', function() { hover = null; tip.hidden = true; });
        cv.addEventListener('click', function() {
            if (!hover) return;
            if (hover.planet) showPlanet(hover.planet);
            else if (hover.id) S.openDetail(hover.id);
        });
        function frame() {
            requestAnimationFrame(frame);
            if (!vis.v || current !== 'explore') return;
            var b = canvasBox(cv), x = b.x, W = b.w, H = b.h, X = W / 2, Y = H / 2, R = Math.min(W, H) / 2 - 34;
            if (!W) return;
            var ms = Date.now() + offset * DAY, rad = function(au) { return R * .8 * Math.pow(au / 30.07, .42); };   // planets only; Voyager sits past a break
            var pos = {}, earth = Astro.planet('earth', ms);
            pins = [];
            x.clearRect(0, 0, W, H);
            var sg = x.createRadialGradient(X, Y, 0, X, Y, 30);
            sg.addColorStop(0, '#fff6d8'); sg.addColorStop(.35, '#ffcf7a'); sg.addColorStop(1, 'rgba(255,170,60,0)');
            x.fillStyle = sg; x.beginPath(); x.arc(X, Y, 30, 0, 6.283); x.fill();
            x.font = '600 11px "Hanken Grotesk", sans-serif';
            PL.forEach(function(n) {
                var p = Astro.planet(n, ms), r = Math.hypot(p.x, p.y), ang = Math.atan2(p.y, p.x), rr = rad(r);
                x.strokeStyle = 'rgba(169,206,255,.13)'; x.lineWidth = 1; x.beginPath(); x.arc(X, Y, rad(p.a), 0, 6.283); x.stroke();
                var px = X + rr * Math.cos(ang), py = Y - rr * Math.sin(ang);       // ecliptic north up, longitude anticlockwise
                pos[n] = [px, py, p];
                x.fillStyle = PCOL[n]; x.shadowColor = PCOL[n]; x.shadowBlur = 10;
                x.beginPath(); x.arc(px, py, n === 'jupiter' || n === 'saturn' ? 5.5 : 3.6, 0, 6.283); x.fill(); x.shadowBlur = 0;
                x.fillStyle = 'rgba(214,228,255,.78)';
                if (n === 'earth' || n === 'mars') x.fillText(PNAME[n], px + 22, py + 4);   // clear of the pins around them
                else if (n === 'venus') x.fillText(PNAME[n], px - 8 - x.measureText(PNAME[n]).width, py - 7);   // keeps off Earth's label
                else x.fillText(PNAME[n], px + 8, py - 7);
                var dE = n === 'earth' ? 0 : Math.hypot(p.x - earth.x, p.y - earth.y, p.z - earth.z);
                pins.push({ x: px, y: py, planet: n, html: '<b>' + PNAME[n] + '</b>' + (n === 'earth' ? 'Our planet · home of all six missions' :
                    fmt(dE * AU / 1e6, 1) + ' million km from Earth · light takes ' + hms(dE * AU / C_KMS).replace(/ \d+ s$/, '')) + '<small>Click for its key facts</small>' });
                if (n === chosen) { x.strokeStyle = '#79dce8'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, py, 10, 0, 6.283); x.stroke(); }
            });
            var pin = function(px, py, id, html) {
                x.fillStyle = '#fff'; x.shadowColor = '#8abaff'; x.shadowBlur = 14;
                x.beginPath(); x.arc(px, py, hover && hover.id === id ? 5.5 : 3.6, 0, 6.283); x.fill(); x.shadowBlur = 0;
                var ph = (performance.now() / 1300 + S.ORDER.indexOf(id) * .3) % 1;
                x.strokeStyle = 'rgba(138,186,255,' + (.6 - .5 * ph).toFixed(3) + ')';
                x.beginPath(); x.arc(px, py, 5 + ph * 13, 0, 6.283); x.stroke();
                pins.push({ x: px, y: py, id: id, html: html });
            };
            var ml = moonLon(ms), e = pos.earth;
            pin(e[0] + 12 * Math.cos(ml), e[1] - 12 * Math.sin(ml), 'apollo', '<b>Apollo 11 reflector</b>On the Moon · ' + fmt(Astro.moonKm(ms)) + ' km from Earth · laser round trip ' + (2 * Astro.moonKm(ms) / C_KMS).toFixed(2) + ' s');
            var m = pos.mars, dM = Math.hypot(m[2].x - earth.x, m[2].y - earth.y, m[2].z - earth.z) * AU;
            ['sojourner', 'spirit', 'opportunity', 'perseverance'].forEach(function(id, k) {
                var a = k * 1.571 + .4;
                pin(m[0] + 12 * Math.cos(a), m[1] - 12 * Math.sin(a), id, '<b>' + S.OBJECTS[id].title + '</b>On Mars · ' + fmt(dM / 1e6, 1) + ' million km from Earth today' + (id === 'perseverance' ? ' · still driving' : ''));
            });
            var v = voyager(ms), vr = R, vx = X + vr * Math.cos(V1_LON), vy = Y - vr * Math.sin(V1_LON);
            var lg = x.createLinearGradient(X, Y, vx, vy);
            lg.addColorStop(0, 'rgba(138,186,255,0)'); lg.addColorStop(1, 'rgba(200,226,255,.9)');
            x.strokeStyle = lg; x.lineWidth = 2; x.setLineDash([2, 5]); x.beginPath(); x.moveTo(X, Y); x.lineTo(vx, vy); x.stroke(); x.setLineDash([]);
            var bk = R * .89, cs = Math.cos(V1_LON), sn = -Math.sin(V1_LON);      // two slashes: the scale breaks here
            x.strokeStyle = 'rgba(214,228,255,.7)'; x.lineWidth = 1.5;
            [-4, 4].forEach(function(o) { var bx = X + (bk + o) * cs, by = Y + (bk + o) * sn; x.beginPath(); x.moveTo(bx - 7 * sn - 3 * cs, by + 7 * cs - 3 * sn); x.lineTo(bx + 7 * sn + 3 * cs, by - 7 * cs + 3 * sn); x.stroke(); });
            x.fillStyle = 'rgba(214,228,255,.85)'; x.fillText(T('Voyager 1 · ' + Math.round(v.sunAU) + ' AU' + (W > 560 ? ' · 35° above the planets' : '')), vx + 14, vy + 4);
            pin(vx, vy, 'voyager', '<b>Voyager 1</b>' + fmt(v.earthKm / 1e9, 3) + ' billion km from Earth · ' + v.sunAU.toFixed(1) + ' AU from the Sun · signal ' + hms(v.earthKm / C_KMS).replace(/ \d+ s$/, ''));
            set('x-vgk', (v.earthKm / 1e9).toFixed(3) + ' billion km');
            set('x-vgl', v.earthAU.toFixed(2) + ' AU from Earth · its radio signal needs about ' + hms(v.earthKm / C_KMS) + ' to reach us');
        }
        requestAnimationFrame(frame);
    })();

    /* ============================== PARTS LIST in the detail window ============================== */
    var body = $('#detail-body');
    new MutationObserver(function() {
        var id = S.featured(), P = window.SPACE_PARTS && window.SPACE_PARTS[id];
        if (!P || !body.firstChild || $('.d-parts', body)) return;
        var sources = $('.d-sources', body); if (!sources) return;
        sources.insertAdjacentHTML('beforebegin', '<section class="d-parts"><h3>Parts you can point at</h3><p class="d-parts-hint">Move the mouse over the 3D model, or tap it, to see these on the spacecraft.' +
            (P.space === 'local' ? ' This model is a simplified SpaceEdu build from NASA dimensions.' : '') + '</p><ul>' +
            P.parts.map(function(p) { return '<li><b>' + p.t + '</b><span>' + (p.d[id] || p.d) + '</span></li>'; }).join('') + '</ul></section>');
    }).observe(body, { childList: true });
})();
