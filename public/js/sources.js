/* Sources: tags on the hero, footnotes in the detail window */
/* SOURCES NEXT TO CLAIMS: every fact carries a small tag linking to the NASA page that backs it.
         Same pages as the team's table; one entry per claim, in the order the claims appear. */
(function() {
    var S = window.SpaceEdu;
    if (!S) return;
    var U = {
        A11: 'https://www.nasa.gov/mission/apollo-11/',
        J19: 'https://www.jpl.nasa.gov/news/the-apollo-experiment-that-keeps-on-giving/',
        J04: 'https://www.jpl.nasa.gov/news/apollo-11-experiment-still-going-strong-after-35-years/',
        ILRS: 'https://ilrs.gsfc.nasa.gov/missions/satellite_missions/current_missions/ap11_general.html',
        V1: 'https://science.nasa.gov/mission/voyager/voyager-1/',
        VOFF: 'https://www.jpl.nasa.gov/news/nasa-shuts-off-instrument-on-voyager-1-to-keep-spacecraft-operating/',
        VBLOG: 'https://science.nasa.gov/blogs/voyager/2026/04/17/nasa-shuts-off-instrument-on-voyager-1-to-keep-spacecraft-operating/',
        VNOW: 'https://science.nasa.gov/mission/voyager/where-are-voyager-1-and-voyager-2-now/',
        IO: 'https://science.nasa.gov/jupiter/jupiter-moons/io/exploration/',
        PBD: 'https://science.nasa.gov/photojournal/pale-blue-dot-revisited/',
        MPF: 'https://science.nasa.gov/mission/mars-pathfinder/',
        H25: 'https://www.nasa.gov/history/25-years-ago-mars-pathfinder-launches-to-mars-to-deploy-sojourner-the-first-planetary-rover-2/',
        J4: 'https://www.nasa.gov/image-article/july-4-1997-sojourner-arrives-red-planet/',
        YOGI: 'https://www.jpl.nasa.gov/images/pia00766-sojourner-yogi/',
        SP: 'https://science.nasa.gov/mission/mer-spirit/',
        MERH: 'https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/science-highlights/',
        COM: 'https://www.jpl.nasa.gov/news/nasa-rover-finds-clue-to-mars-past-and-environment-for-life/',
        OP: 'https://science.nasa.gov/mission/mer-opportunity/',
        OPEND: 'https://www.jpl.nasa.gov/news/nasas-opportunity-rover-mission-on-mars-comes-to-end/',
        M20: 'https://science.nasa.gov/mission/mars-2020-perseverance/',
        PREC: 'https://science.nasa.gov/blogs/perseverance-mars-rover/2026/10/12/nasas-perseverance-sets-off-world-record-for-total-distance-driven/',
        BIO: 'https://www.nasa.gov/news-release/nasa-says-mars-rover-discovered-potential-biosignature-last-year/',
        HIR: 'https://science.nasa.gov/photojournal/nasas-hirise-captures-perseverance-marking-a-milestone-on-mars/'
    };
    var CITE = {
        apollo: { launched: 'A11', where: 'ILRS', status: 'J19', lede: 'J19', built: 'J04',
            stats: ['J04', 'J19', 'J04', 'J19'], found: ['J19', 'J19', 'J19', 'J19'],
            status_: ['J04', 'J19', 'J04', 'J04'], timeline: ['A11', 'A11', 'J04', 'ILRS', 'J04', 'J19'] },
        voyager: { launched: 'V1', where: 'V1', status: 'VNOW', lede: 'V1', built: 'V1',
            stats: ['V1', 'VBLOG', 'VBLOG', 'VNOW'], found: ['V1', 'IO', 'V1', 'V1', 'V1', 'PBD'],
            status_: ['VNOW', 'VOFF', 'VBLOG', 'PBD', 'VNOW'], timeline: ['V1', 'V1', 'V1', 'PBD', 'V1', 'VOFF', 'VNOW'] },
        sojourner: { launched: 'MPF', where: 'MPF', status: 'H25', lede: 'J4', built: 'MPF',
            stats: ['MPF', 'J4', 'H25', 'MPF'], found: ['H25', 'MPF', 'MPF', 'MPF', 'J4'],
            status_: ['H25', 'H25', 'J4', 'MPF'], timeline: ['MPF', 'MPF', 'MPF', 'YOGI', 'H25'] },
        spirit: { launched: 'SP', where: 'SP', status: 'SP', lede: 'SP', built: 'SP',
            stats: ['SP', 'SP', 'SP', 'SP'], found: ['SP', 'MERH', 'MERH', 'COM', 'SP'],
            status_: ['SP', 'SP', 'SP', 'SP'], timeline: ['SP', 'SP', 'SP', 'SP', 'SP', 'SP', 'SP'] },
        opportunity: { launched: 'OP', where: 'OP', status: 'OPEND', lede: 'OP', built: 'OP',
            stats: ['OP', 'OPEND', 'OP', 'OP'], found: ['MERH', 'MERH', 'MERH', 'OP'],
            status_: ['OP', 'OP', 'OPEND', 'PREC', 'OP'], timeline: ['OP', 'OP', 'OP', 'OP', 'OP', 'OPEND', 'OPEND'] },
        perseverance: { launched: 'M20', where: 'PREC', status: 'PREC', lede: 'BIO', built: 'M20',
            stats: ['PREC', 'PREC', 'M20', 'PREC'], found: ['M20', 'M20', 'BIO', 'M20', 'M20'],
            status_: ['PREC', 'PREC', 'PREC', 'PREC'], timeline: ['M20', 'M20', 'BIO', 'BIO', 'HIR', 'PREC', 'PREC'] }
    };
    var LABEL = function(url) { return /jpl\.nasa\.gov/.test(url) ? 'JPL' : /ilrs\./.test(url) ? 'ILRS' : 'NASA'; };

    /* key -> tag; a missing key falls back to the object's main source rather than to nothing */
    function tag(id, key) {
        var url = U[key] || (S.DETAILS[id].sources[0] || [])[1];
        if (!url) return '';
        return '<a class="cite" href="' + url + '" target="_blank" rel="noopener" title="Source: ' + url.replace(/^https?:\/\//, '') +
            '" aria-label="Source: ' + LABEL(url) + ' page (opens in a new tab)">' + LABEL(url) + '</a>';
    }
    function append(el, html) {
        if (!el || !html || el.querySelector(':scope > .cite')) return;
        el.insertAdjacentHTML('beforeend', ' ' + html);
    }
    var pick = function(list, i) { return list && list[i]; };

    /* hero: the three facts and the lede, re-tagged every time the object changes */
    function hero(id) {
        var c = CITE[id]; if (!c) return;
        ['launched', 'where', 'status'].forEach(function(f) {
            append(document.querySelector('[data-field="' + f + '"]'), tag(id, c[f]));
        });
        append(document.querySelector('[data-field="lede"]'), tag(id, c.lede));
    }
    document.addEventListener('spaceedu:show', function(e) { hero(e.detail.id); });
    hero(S.featured());

    /* detail window: numbered footnotes [1] [2] after the claims, and one numbered source list at the bottom */
    var NAME = {
        A11: 'NASA: Apollo 11 mission page', J19: 'JPL: the Apollo experiment that keeps on giving, 2019', J04: 'JPL: still going strong after 35 years, 2004',
        ILRS: 'NASA ILRS: Apollo 11 reflector', V1: 'NASA: Voyager 1 mission page', VOFF: 'JPL: instrument shut off, Apr. 2026',
        VBLOG: 'NASA Voyager blog, Apr. 2026', VNOW: 'NASA: where are the Voyagers now', IO: 'NASA: exploring Io', PBD: 'NASA: Pale Blue Dot revisited',
        MPF: 'NASA: Mars Pathfinder mission page', H25: 'NASA history: 25 years since Pathfinder, 2021', J4: 'NASA: July 4, 1997, Sojourner arrives',
        YOGI: 'JPL: Sojourner at Yogi', SP: 'NASA: Spirit mission page', MERH: 'NASA: Spirit and Opportunity science highlights',
        COM: 'JPL: carbonates in Comanche, 2010', OP: 'NASA: Opportunity mission page', OPEND: 'JPL: mission comes to an end, 2019',
        M20: 'NASA: Perseverance mission page', PREC: 'NASA blog: driving record, Oct. 2026', BIO: 'NASA: potential biosignature, 2025',
        HIR: 'NASA: HiRISE sees Perseverance, 2026'
    };
    var body = document.getElementById('detail-body');
    function detail() {
        var id = S.featured(), c = CITE[id]; if (!c || !body.firstChild || body.querySelector('.fn')) return;
        var list = [], num = {};
        S.DETAILS[id].sources.forEach(function(src) { if (num[src[1]] == null) { list.push([src[0], src[1]]); num[src[1]] = list.length; } });
        function note(el, key) {
            var url = U[key] || (S.DETAILS[id].sources[0] || [])[1];
            if (!el || !url) return;
            if (num[url] == null) { list.push([NAME[key] || url.replace(/^https?:\/\//, ''), url]); num[url] = list.length; }
            el.insertAdjacentHTML('beforeend', '<sup class="fn"><a href="#dsrc-' + num[url] + '" aria-label="Source ' + num[url] + '">[' + num[url] + ']</a></sup>');
        }
        note(body.querySelector('.d-lede'), c.lede);
        body.querySelectorAll('.d-stats li').forEach(function(li, i) { note(li.querySelector('span'), pick(c.stats, i)); });
        note(body.querySelector('.d-grid section > p'), c.built);
        var lists = body.querySelectorAll('.d-grid .d-list');
        if (lists[0]) lists[0].querySelectorAll('li').forEach(function(li, i) { note(li, pick(c.found, i)); });
        if (lists[1]) lists[1].querySelectorAll('li').forEach(function(li, i) { note(li, pick(c.status_, i)); });
        body.querySelectorAll('.d-time li').forEach(function(li, i) { note(li.querySelector('span'), pick(c.timeline, i)); });
        var srcList = body.querySelector('.d-sources ul');
        if (srcList) srcList.outerHTML = '<ol class="d-fnlist">' + list.map(function(x, i) {
            return '<li id="dsrc-' + (i + 1) + '"><a href="' + x[1] + '" target="_blank" rel="noopener">' + x[0] + ' ↗</a></li>';
        }).join('') + '</ol>';
    }
    body.addEventListener('click', function(e) {             // a footnote scrolls to its source inside the window
        var a = e.target.closest('.fn a'); if (!a) return;
        e.preventDefault();
        var li = body.querySelector(a.getAttribute('href')); if (li) { li.scrollIntoView({ block: 'center' }); li.classList.remove('is-hit'); void li.offsetWidth; li.classList.add('is-hit'); }
    });
    new MutationObserver(detail).observe(body, { childList: true });

    /* the six big numbers of the idea section */
    var statSrc = [['apollo', 'J04'], ['voyager', 'V1'], ['sojourner', 'J4'], ['spirit', 'SP'], ['opportunity', 'OPEND'], ['perseverance', 'PREC']];
    document.querySelectorAll('.x-stats > div').forEach(function(div, i) {
        if (statSrc[i]) append(div.querySelector('span'), tag(statSrc[i][0], statSrc[i][1]));
    });
})();
