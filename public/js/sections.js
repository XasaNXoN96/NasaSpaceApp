/* Sections: the idea, legend, photos, timeline, evidence lab, compare table, sources */
/* EXPLORE SECTIONS: everything below the hero, built from the same facts as the hero and detail window */
(function() {
    var S = window.SpaceEdu;
    if (!S) return;
    var O = S.OBJECTS,
        D = S.DETAILS,
        ORDER = S.ORDER,
        P = window.PHOTOS || {};
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || document.documentElement.classList.contains('calm');
    var $ = function(s) {
        return document.querySelector(s);
    };
    var esc = function(t) {
        return String(t).replace(/<[^>]+>/g, '');
    };
    var ext = ' target="_blank" rel="noopener"';

    var STATUS = S.STATUS, LABEL = S.LABEL, LABEL_TEXT = S.LABEL_TEXT;
    var COLOR = {
        ok: 'var(--ok)',
        pas: 'var(--pas)',
        lim: 'var(--lim)',
        off: 'var(--off)'
    };
    var DEST = {
        apollo: 'moon',
        voyager: 'deep',
        sojourner: 'mars',
        spirit: 'mars',
        opportunity: 'mars',
        perseverance: 'mars'
    };
    var WHEN = {
        apollo: 'Placed July 21, 1969',
        voyager: 'Launched Sept. 5, 1977',
        sojourner: 'Landed July 4, 1997',
        spirit: 'Landed Jan. 3, 2004',
        opportunity: 'Landed Jan. 24, 2004',
        perseverance: 'Landed Feb. 18, 2021'
    };
    var SHORT = {
        apollo: 'Apollo 11 reflector',
        voyager: 'Voyager 1',
        sojourner: 'Sojourner',
        spirit: 'Spirit',
        opportunity: 'Opportunity',
        perseverance: 'Perseverance'
    };
    var photo = function(id) {
        return S.layerFor(id).dataset.bg;
    };
    var toHero = function(id) {
        S.show(id);
        if (S.go) S.go('missions');                      // the 3D hero lives on the Missions page
        document.getElementById('top').scrollIntoView();
    };

    /* reveal on scroll */
    var rises = document.querySelectorAll('.xs .x-rise');
    if (!reduce && 'IntersectionObserver' in window) {
        document.documentElement.classList.add('reveal-on');
        var ro = new IntersectionObserver(function(es) {
            es.forEach(function(e) {
                if (e.isIntersecting) {
                    e.target.classList.add('in');
                    ro.unobserve(e.target);
                }
            });
        }, {
            threshold: .12
        });
        rises.forEach(function(el) {
            ro.observe(el);
        });
    }

    /* section nav: highlight the section in view */
    var navLinks = Array.prototype.slice.call(document.querySelectorAll('.xnav a'));
    if ('IntersectionObserver' in window) {
        var no = new IntersectionObserver(function(es) {
            es.forEach(function(e) {
                if (!e.isIntersecting) return;
                navLinks.forEach(function(a) {
                    var on = a.hash === '#' + e.target.id;
                    if (on) {
                        a.setAttribute('aria-current', 'true');
                        /* scroll only the bar sideways: scrollIntoView would also drag the whole page back to the bar */
                        var ul = a.closest('ul');
                        ul.scrollTo({
                            left: a.offsetLeft - (ul.clientWidth - a.offsetWidth) / 2,
                            behavior: reduce ? 'auto' : 'smooth'
                        });
                    } else a.removeAttribute('aria-current');
                });
            });
        }, {
            rootMargin: '-35% 0px -60% 0px'
        });
        navLinks.forEach(function(a) {
            var s = document.querySelector(a.hash);
            if (s) no.observe(s);
        });
    }

    /* 01 · stats: whole years since each event, counted up once on screen */
    var years = function(iso) {
        return Math.floor((Date.now() - Date.parse(iso)) / 31557600000);
    };
    var COUNT = {
        apollo: years('1969-07-21T02:56:00Z'),
        voyager: years('1977-09-05T12:56:00Z')
    };
    document.querySelectorAll('.x-stats b').forEach(function(b) {
        var to = b.dataset.count ? COUNT[b.dataset.count] : +b.dataset.to,
            pre = b.textContent.charAt(0) === '~' ? '~' : '';
        b.textContent = pre + to;
        if (reduce || !('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function(es) {
            if (!es[0].isIntersecting) return;
            io.disconnect();
            var t0 = performance.now();
            (function tick(now) {
                var k = Math.min(1, (now - t0) / 1200),
                    e = 1 - Math.pow(1 - k, 3);
                b.textContent = pre + Math.round(to * e);
                if (k < 1) requestAnimationFrame(tick);
            })(t0);
        }, {
            threshold: .6
        });
        io.observe(b);
    });

    /* 02 · status legend: explains the four colours before the cards use them */
    $('#lv-legend').innerHTML = '<p class="lv-legend-t">Exists or works?</p>' + ['ok', 'pas', 'lim', 'off'].map(function(k) {
        return '<p class="lv-legend-i" style="--c:' + COLOR[k] + '"><b>' + LABEL[k] + '</b><span>' + LABEL_TEXT[k] + '</span></p>';
    }).join('');

    /* 05 · gallery + lightbox */
    var REMOTE = 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/';
    var R1280 = '/jcr:content/renditions/cq5dam.web.1280.1280.jpeg';
    var GAL = [
        [photo('apollo'), 'Buzz Aldrin beside the laser reflector he had just set up, July 20, 1969. Proof it is there: observatories still bounce lasers off it today.', 'NASA · AS11-40-5948'],
        [P.lm, 'Eagle, the Lunar Module that carried the reflector to the Moon. Its lower half is still standing at Tranquility Base.', 'NASA'],
        [P.earthrise, 'Earth from lunar orbit. The Moon always keeps the same face towards us, so the reflector sees Earth in the same part of its sky.', 'NASA'],
        [P.lrv, 'Apollo 15, two years later, left a bigger reflector with 300 prisms. Observatories range to the Apollo arrays together.', 'NASA'],
        [REMOTE + 'pia23/pia23645/PIA23645.jpg' + R1280, 'The “Pale Blue Dot”, Feb. 14, 1990: Earth from about 6 billion km. Voyager 1’s cameras were switched off soon after to save power.', 'NASA/JPL-Caltech · PIA23645'],
        [photo('sojourner'), 'Sojourner pressing its spectrometer against the rock “Yogi”: the first chemical analysis of a rock by a rover on Mars.', 'NASA/JPL · PIA00766'],
        [P.pathfinder, 'The Pathfinder lander, Sojourner’s only radio link to Earth. When its battery gave out in 1997, the rover went silent too.', 'NASA'],
        [photo('spirit'), 'Spirit’s solar panels in 2005, dusty after two years. All its power came from sunlight on this deck, the weakness that ended it.', 'NASA/JPL-Caltech/Cornell · PIA03272'],
        [photo('opportunity'), 'Opportunity in 2014, after wind had cleaned its panels. Clean panels kept it going for years, until the 2018 dust storm.', 'NASA/JPL-Caltech/Cornell Univ./Arizona State Univ. · PIA18079'],
        [photo('perseverance'), 'Perseverance beside “Cheyava Falls”, July 2024: the rock whose potential biosignatures are now being studied.', 'NASA/JPL-Caltech/MSSS · PIA26344'],
        [P.jezero, 'Rocks in Jezero Crater beside a Perseverance wheel. The crater was once a lake, which is why the rover was sent here.', 'NASA'],
        [REMOTE + 'pia26/pia26726/PIA26726.jpg' + R1280, 'Perseverance seen from orbit by HiRISE, June 13, 2026: an independent check that it is where NASA says.', 'NASA/JPL-Caltech/University of Arizona · PIA26726']
    ].filter(function(g) {
        return g[0];
    });
    $('#x-gal').innerHTML = GAL.map(function(g, i) {
        return '<figure><button type="button" data-g="' + i + '" aria-label="Enlarge: ' + esc(g[1]) + '"><img src="' + g[0] + '" alt="' + esc(g[1]) + '" loading="lazy" decoding="async"></button>' +
            '<figcaption>' + g[1] + '<small>' + g[2] + '</small></figcaption></figure>';
    }).join('');
    var lb = $('#x-lightbox');
    $('#x-gal').addEventListener('click', function(e) {
        var b = e.target.closest('[data-g]');
        if (!b) return;
        var g = GAL[+b.dataset.g];
        $('#x-lbi').src = g[0];
        $('#x-lbi').alt = g[1];
        $('#x-lbp').innerHTML = g[1] + ' <span style="color:rgba(255,255,255,.55)">' + g[2] + '</span>';
        lb.showModal();
    });
    lb.querySelector('.d-close').addEventListener('click', function() {
        lb.close();
    });
    lb.addEventListener('click', function(e) {
        /* the backdrop counts as the dialog itself; test the box so a scrollbar click does not close it */
        var box = lb.getBoundingClientRect();
        if (e.target === lb && (e.clientX < box.left || e.clientX > box.right ||
                e.clientY < box.top || e.clientY > box.bottom)) lb.close();
    });

    /* 06 · timeline, built from every object's own timeline */
    var EXTRA = [
        ['voyager', 'Aug. 20, 1977', 'Voyager 2 launches, two weeks before Voyager 1.'],
        ['voyager', 'Mar. 8, 1979', 'Voyager 1 pictures reveal volcanoes erupting on Io, a moon of Jupiter.']
    ];
    var events = [];
    ORDER.forEach(function(id) {
        D[id].timeline.forEach(function(t) {
            events.push([id, t[0], t[1]]);
        });
    });
    EXTRA.forEach(function(x) {
        events.push(x);
    });
    var yearOf = function(s) {
        var m = s.match(/(19|20)\d\d/);
        return m ? +m[0] : 0;
    };
    var byYear = {};
    events.forEach(function(ev) {
        var y = yearOf(ev[1]);
        (byYear[y] = byYear[y] || []).push(ev);
    });
    var yearList = Object.keys(byYear).map(Number).sort(function(a, b) {
        return a - b;
    });
    /* within a year, events run in date order; a month without a day comes after that month's dated events,
       and a bare year after everything else in that year */
    var MON = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, June: 6, Jun: 6, July: 7, Jul: 7, Aug: 8, Sept: 9, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    var dayKey = function(s) {
        var m = s.match(/^([A-Z][a-z]+)\.?(?: (\d{1,2}),)? \d{4}$/);
        if (!m || !MON[m[1]]) return 13 * 32;
        return MON[m[1]] * 32 + (m[2] ? +m[2] : 31);
    };
    yearList.forEach(function(y) {
        byYear[y].sort(function(a, b) { return dayKey(a[1]) - dayKey(b[1]); });   // a stable sort keeps same-day events in order
    });
    /* every event, in order, grouped by year: read by scrolling, not by clicking */
    $('#x-tl').innerHTML = yearList.map(function(y) {
        return '<section class="tl-year"><h3>' + y + '</h3><ol>' + byYear[y].map(function(ev) {
            var src = D[ev[0]].sources[0];
            return '<li style="--c:' + COLOR[STATUS[ev[0]]] + '"><time>' + ev[1] + '</time><p>' + ev[2] + '</p><small><span class="pill ' + STATUS[ev[0]] + '">' + SHORT[ev[0]] + '</span> <a href="' + src[1] + '"' + ext + '>' + src[0] + '</a></small></li>';
        }).join('') + '</ol></section>';
    }).join('');

    /* 08 · evidence lab */
    /* claim types get their own colours and symbols, never the status colours */
    var CAT = {
        Established: 'var(--ev-fact)',
        Interpretation: 'var(--ev-idea)',
        Unresolved: 'var(--ev-open)'
    };
    var CAT_SIGN = { Established: '✓', Interpretation: '≈', Unresolved: '?' };
    var E = [
        ['apollo', 'Established', 'Laser ranging measures the Earth–Moon distance to within a few millimetres.', 'Laser pulses fired from observatories and timed on their round trip to the reflector arrays, for more than five decades.', 'The returns are extremely faint: in good conditions about one photon every few seconds.', 0],
        ['apollo', 'Established', 'The Moon is moving away from Earth by about 3.8 cm a year.', 'Decades of lunar laser ranging.', 'A long-term average; models keep refining it.', 0],
        ['apollo', 'Established', 'The Moon has a fluid core.', 'Lunar laser ranging data, which showed this about 20 years before 2019.', 'Indirect: worked out from how the Moon moves, not seen directly.', 0],
        ['voyager', 'Established', 'Io, a moon of Jupiter, has active volcanoes.', 'Voyager 1 pictures from March 1979 showing volcanic plumes.', 'A flyby snapshot: later missions are needed to follow how the eruptions change.', 0],
        ['voyager', 'Established', 'Voyager 1 left the heliosphere and entered interstellar space on Aug. 25, 2012.', 'Its instruments measured the change from the Sun’s particles to the interstellar medium.', 'Exactly where the boundary lies was debated at the time.', 0],
        ['sojourner', 'Established', 'A small wheeled rover can drive and do science on Mars.', 'Sojourner drove about 100 m and worked 83 days against a 7-day plan.', 'One small rover at one landing site, never more than about 12 m from its lander.', 0],
        ['sojourner', 'Interpretation', 'Running water once shaped the Ares Vallis landing site.', 'Rounded pebbles and rocks that look like conglomerates.', 'Based on pictures and a few chemical analyses at a single site.', 0],
        ['spirit', 'Interpretation', 'The silica-rich soil at Home Plate formed around hot springs or steam vents.', 'Spirit’s broken, dragging wheel exposed soil about 90% silica.', 'More than one hot-water setting fits the data; it is read by comparison with places on Earth.', 0],
        ['spirit', 'Established', 'Water at the “Comanche” outcrop was not acidic.', 'Carbonates about ten times more abundant than in any Martian rock studied before.', 'One outcrop; it does not tell how long the water lasted.', 2],
        ['opportunity', 'Established', 'Liquid water once soaked Meridiani Planum.', 'Hematite spherules (“blueberries”) and bright gypsum veins.', 'That early water was acidic, which is hard on life.', 1],
        ['perseverance', 'Established', 'Jezero Crater once held a lake and a river delta.', 'Delta layers imaged and sampled by the rover.', 'How long the lake lasted is still being worked out.', 0],
        ['perseverance', 'Unresolved', 'Was there ever microbial life on Mars?', 'The “Sapphire Canyon” sample holds potential biosignatures (Nature, Sept. 2025).', 'The same minerals can form without life. Confirming it needs labs on Earth, and sample return is not yet approved.', 2]
    ];
    $('#x-fo').innerHTML = '<option value="">All objects</option>' + ORDER.map(function(id) {
        return '<option value="' + id + '">' + SHORT[id] + '</option>';
    }).join('');

    function lab() {
        var a = $('#x-fo').value,
            c = $('#x-fc').value;
        var r = E.filter(function(e) {
            return (!a || e[0] === a) && (!c || e[1] === c);
        });
        $('#x-rc').textContent = r.length + (r.length === 1 ? ' record' : ' records');
        $('#x-recs').innerHTML = r.map(function(e) {
            var src = D[e[0]].sources[e[5]] || D[e[0]].sources[0];
            return '<details class="x-rec" style="--c:' + CAT[e[1]] + '"><summary><i class="ev-sign" aria-hidden="true">' + CAT_SIGN[e[1]] + '</i><span>' + e[2] + '</span><small>' + SHORT[e[0]] + ' · ' + e[1] + '</small></summary>' +
                '<div class="cq"><div><i>Evidence</i>' + e[3] + '</div><div><i>Limits</i>' + e[4] + '</div>' +
                '<div><i>Source</i><a href="' + src[1] + '"' + ext + '>' + src[0] + ' ↗</a></div></div></details>';
        }).join('');
    }
    S.EVIDENCE = E;
    $('#x-fo').addEventListener('change', lab);
    $('#x-fc').addEventListener('change', lab);
    lab();

    /* 09 · compare table, from the shared data (one status per object) */
    var STATE = { ok: 'active', pas: 'passive', lim: 'limited', off: 'ended' };
    $('#x-cmp tbody').innerHTML = ORDER.map(function(id) {
        var o = O[id], d = D[id], st = STATUS[id];
        return '<tr><th scope="row"><button type="button" class="cmp-open" data-open="' + id + '">' + SHORT[id] + '</button></th>' +
            '<td data-label="Launched">' + o.launched + '<br><span class="sub">' + WHEN[id] + '</span></td>' +
            '<td data-label="Where it is">' + o.where + '</td>' +
            '<td data-label="Status today"><span class="badge" data-state="' + STATE[st] + '">' + LABEL[st] + '</span> ' + d.status[0] + '</td>' +
            '<td data-label="Sources">' + d.sources.slice(0, 2).map(function(s) { return '<a href="' + s[1] + '"' + ext + '>' + s[0] + '</a>'; }).join('') + '</td></tr>';
    }).join('');

    /* 10 · source index */
    $('#x-idx').innerHTML = ORDER.map(function(id) {
        return '<div><h3>' + O[id].title + '</h3><ul>' + D[id].sources.map(function(s) {
            return '<li><a href="' + s[1] + '"' + ext + '>' + s[0] + '</a></li>';
        }).join('') + '</ul></div>';
    }).join('');

})();
