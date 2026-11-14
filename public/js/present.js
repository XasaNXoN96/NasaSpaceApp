/* Presentation mode */
/* ============================== PRESENTATION MODE: six big screens for the defence, arrows to move ============================== */
(function() {
    var S = window.SpaceEdu, dlg = document.getElementById('present');
    if (!S || !dlg) return;
    var $ = function(s, el) { return (el || document).querySelector(s); };
    var T = window.T || function(x) { return x; };
    var stage = $('.pr-stage', dlg), dots = $('.pr-dots', dlg), count = $('.pr-count', dlg), i = 0, timer = 0;
    var thumb = function(id) { var im = $('.pick[data-object="' + id + '"] img'); return im ? im.src : ''; };
    var live = function(id) { var el = document.getElementById(id); return el ? el.textContent : '–'; };
    var STATE = { ok: 'active', pas: 'passive', lim: 'limited', off: 'ended' };
    function slides() {
        var O = S.OBJECTS, ev = S.EVIDENCE || [];
        var pickEv = function(cat) { return ev.filter(function(e) { return e[1] === cat; })[0]; };
        return [
            { k: T('The idea'), html: '<h2 class="pr-big">' + T('The mission may end. The evidence remains.') + '</h2><p class="pr-sub">' + T('Six NASA explorers: what they left behind, and whether it still works.') + '</p>' +
                '<ul class="pr-row">' + S.ORDER.map(function(id) { return '<li><img src="' + thumb(id) + '" alt=""><span>' + O[id].title + '</span></li>'; }).join('') + '</ul>' },
            { k: T('Six objects'), html: '<h2>' + T('Exists or works?') + '</h2><ul class="pr-grid">' + S.ORDER.map(function(id) {
                var st = S.STATUS[id];
                return '<li><img src="' + thumb(id) + '" alt=""><div><b>' + O[id].title + '</b><span class="badge" data-state="' + STATE[st] + '">' + S.LABEL[st] + '</span><small>' + O[id].where + '</small></div></li>';
            }).join('') + '</ul>' },
            { k: T('Live now'), live: true, html: '<h2>' + T('Where they are, this second') + '</h2><div class="pr-nums">' +
                '<div><small>' + T('Earth–Moon distance now') + '</small><b data-live="lv-moon"></b><span>' + T('Calculated · JPL data') + '</span></div>' +
                '<div><small>' + T('Voyager 1 from Earth') + '</small><b data-live="lv-v1"></b><span>' + T('Calculated · JPL data') + '</span></div>' +
                '<div><small>' + T('Perseverance has driven') + '</small><b data-live="lv-m20"></b><span>' + T('Live · NASA feed') + '</span></div></div>' },
            { k: T('Film'), html: '<h2>' + T('Why they went quiet') + '</h2><button type="button" class="pr-film" data-film="opportunity"><img src="' + window.SpaceFilms.FILMS.opportunity.poster + '" alt=""><span><i aria-hidden="true">▶</i>' +
                window.SpaceFilms.FILMS.opportunity.title + '<small>' + window.SpaceFilms.FILMS.opportunity.cause + '</small></span></button>' },
            { k: T('Evidence lab'), html: '<h2>' + T('Claim, evidence, limits') + '</h2><div class="pr-ev">' + ['Established', 'Interpretation', 'Unresolved'].map(function(cat) {
                var e = pickEv(cat); if (!e) return '';
                return '<article data-cat="' + cat + '"><small>' + { Established: '✓ ', Interpretation: '≈ ', Unresolved: '? ' }[cat] + T(cat) + '</small><b>' + e[2] + '</b><p><i>' + T('Evidence') + '</i>' + e[3] + '</p><p><i>' + T('Limits') + '</i>' + e[4] + '</p></article>';
            }).join('') + '</div>' },
            { k: T('Sources'), html: '<h2>' + T('Every claim has a source') + '</h2><p class="pr-sub">' + T('NASA and JPL mission pages, NASA 3D models and photographs, the JPL Horizons ephemeris and NASA’s live Perseverance feeds.') + '</p>' +
                '<ul class="pr-src">' + S.ORDER.map(function(id) { return '<li><b>' + O[id].title + '</b>' + S.DETAILS[id].sources.slice(0, 2).map(function(x) { return '<span>' + x[0] + '</span>'; }).join('') + '</li>'; }).join('') + '</ul>' +
                '<p class="pr-team">' + T('Team SpaceEdu') + ' · ' + T('Team lead: Muzayana') + ' · ' + T('Analyst') + ' · ' + T('Engineer') + ' · ' + T('Programmer') + '</p>' }
        ];
    }
    var list = [];
    function show(n) {
        i = Math.max(0, Math.min(list.length - 1, n));
        var sl = list[i];
        stage.innerHTML = '<p class="pr-k">' + (i + 1) + ' / ' + list.length + ' · ' + sl.k + '</p>' + sl.html;
        dots.innerHTML = list.map(function(_, k) { return '<button type="button" data-go="' + k + '" aria-label="' + T('Screen') + ' ' + (k + 1) + '"' + (k === i ? ' aria-current="true"' : '') + '></button>'; }).join('');
        count.textContent = (i + 1) + ' / ' + list.length;
        var prev = $('.pr-prev', dlg), next = $('.pr-next', dlg), had = document.activeElement;
        prev.disabled = i === 0; next.disabled = i === list.length - 1;
        if ((had === next || had === prev) && had.disabled) (had === next ? prev : next).focus();   // a disabled button drops focus, and the arrow keys with it
        clearInterval(timer);
        if (sl.live) { var tick = function() { stage.querySelectorAll('[data-live]').forEach(function(b) { b.textContent = live(b.dataset.live); }); }; tick(); timer = setInterval(tick, 1000); }
    }
    function open() {
        list = slides();
        if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
        document.documentElement.classList.add('has-dialog');
        show(0);
        if (dlg.requestFullscreen && !document.fullscreenElement) dlg.requestFullscreen().catch(function() {});
        $('.pr-next', dlg).focus();
    }
    function close() {
        clearInterval(timer);
        if (document.fullscreenElement) document.exitFullscreen().catch(function() {});
        if (dlg.open) dlg.close();
        if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('has-dialog');
    }
    $('.pr-prev', dlg).addEventListener('click', function() { show(i - 1); });
    $('.pr-next', dlg).addEventListener('click', function() { show(i + 1); });
    $('.d-close', dlg).addEventListener('click', close);
    dlg.addEventListener('close', function() { clearInterval(timer); if (!document.querySelector('dialog[open]')) document.documentElement.classList.remove('has-dialog'); });
    dots.addEventListener('click', function(e) { var b = e.target.closest('[data-go]'); if (b) show(+b.dataset.go); });
    dlg.addEventListener('keydown', function(e) {
        if (document.getElementById('film').open) return;
        if (e.key === 'ArrowRight' || e.key === 'PageDown' || (e.key === ' ' && e.target === dlg)) { e.preventDefault(); show(i + 1); }
        else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); show(i - 1); }
        else if (e.key === 'Home') show(0);
        else if (e.key === 'End') show(list.length - 1);
    });
    document.addEventListener('click', function(e) { if (e.target.closest('[data-present]')) { e.preventDefault(); open(); } });
    document.addEventListener('keydown', function(e) {                      // P opens it from anywhere
        if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) && !document.querySelector('dialog[open]')) open();
    });
    S.present = open;
})();
