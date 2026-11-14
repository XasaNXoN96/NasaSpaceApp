/* Achievements, settings, glossary page, search, test yourself */
(function() {
    var S = window.SpaceEdu, Snd = window.SpaceSound, Films = window.SpaceFilms;
    if (!S || !Snd) return;
    var root = document.documentElement;
    var $ = function(s, el) { return (el || document).querySelector(s); };
    var $$ = function(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
    var esc = function(s) { return String(s).replace(/[&<>"]/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
    var strip = function(h) { var d = document.createElement('div'); d.innerHTML = h; return d.textContent; };
    var store = {
        get: function(k, def) {                            // a damaged or foreign value falls back to the default
            try {
                var v = JSON.parse(localStorage.getItem('spaceedu.' + k));
                if (v === null || typeof v !== typeof def || Array.isArray(v) !== Array.isArray(def)) return def;
                return v;
            } catch (e) { return def; }
        },
        set: function(k, v) { try { localStorage.setItem('spaceedu.' + k, JSON.stringify(v)); } catch (e) {} }
    };
    var TERM = {}; GLOSSARY.forEach(function(t) { TERM[t.id] = t; });
    var FILMED = ['sojourner', 'spirit', 'opportunity', 'voyager'];
    function openDialog(d) { if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', ''); root.classList.add('has-dialog'); }
    function closeDialog(d) { if (d.open) d.close(); if (!document.querySelector('dialog[open]')) root.classList.remove('has-dialog'); }
    /* the page behind stays locked exactly while some window is open, whichever way it was closed (button, Esc, script) */
    new MutationObserver(function() { root.classList.toggle('has-dialog', !!document.querySelector('dialog[open]')); })
        .observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    $$('dialog.v3').forEach(function(d) {
        $$('.d-close', d).forEach(function(b) { b.addEventListener('click', function() { closeDialog(d); }); });
        d.addEventListener('close', function() { if (!document.querySelector('dialog[open]')) root.classList.remove('has-dialog'); });
        d.addEventListener('click', function(e) { if (e.target === d) closeDialog(d); });
    });

    /* ============================== ACHIEVEMENTS ============================== */
    var ICON = {
        star: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z',
        planet: 'M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM2 15c3-1 17-6 20-8',
        rover: 'M4 15h16M6 15v-5h12v5M9 10V6h3M7 18a2 2 0 1 0 0-.1M17 18a2 2 0 1 0 0-.1M12 18a2 2 0 1 0 0-.1',
        book: 'M4 5c3-1 5 0 8 2 3-2 5-3 8-2v14c-3-1-5 0-8 2-3-2-5-3-8-2zM12 7v14',
        clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3',
        film: 'M3 5h18v14H3zM7 5v14M17 5v14M3 9h4M3 15h4M17 9h4M17 15h4',
        search: 'M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14.5 14.5L20 20',
        target: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 11.5v1',
        comet: 'M20 4L9 15M14 4l-6 6M20 10l-6 6M8 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
        check: 'M4 12l5 5L20 6',
        moon: 'M15 3a9 9 0 1 0 6 13A7 7 0 0 1 15 3z'
    };
    var BADGES = [
        ['grand-tour', 'Grand tour', 'Open the details of all six objects.', 'planet'],
        ['status-perfect', 'Working or existing?', 'Score 6 out of 6 in the status round.', 'check'],
        ['specialist', 'Mission specialist', 'Score 9 or 10 in the missions round.', 'target'],
        ['word-wizard', 'Word wizard', 'Score 8 out of 8 in the glossary round.', 'book'],
        ['lexicon', 'Dictionary diver', 'Open 10 different glossary terms.', 'book'],
        ['film-buff', 'Film buff', 'Watch all four films to the end.', 'film']
    ];
    var got = store.get('ach', {}), tally = store.get('tally', {});
    function count(key, item) {                             // remembers distinct items (terms, parts, objects...)
        var list = Array.isArray(tally[key]) ? tally[key] : (tally[key] = []);
        if (item != null && list.indexOf(item) < 0) { list.push(item); store.set('tally', tally); }
        return list.length;
    }
    function award(id) {
        if (got[id]) return;
        var b = BADGES.find(function(x) { return x[0] === id; }); if (!b) return;
        got[id] = Date.now(); store.set('ach', got);
        Snd.click('chime');
        toast('<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICON[b[3]] + '"/></svg><span><small>Achievement unlocked</small><b>' + b[1] + '</b></span>');
        renderBadges();
    }
    /* toasts and the term pop-up live in the browser's top layer (popover), or an open dialog would cover them */
    var topLayer = typeof HTMLElement.prototype.showPopover === 'function';
    function raise(el) { if (!topLayer) return; try { if (el.matches(':popover-open')) el.hidePopover(); el.showPopover(); } catch (e) {} }
    function lower(el) { if (!topLayer) return; try { if (el.matches(':popover-open')) el.hidePopover(); } catch (e) {} }
    var toasts = document.createElement('div'); toasts.className = 'toasts'; toasts.setAttribute('aria-live', 'polite');
    if (topLayer) toasts.setAttribute('popover', 'manual');
    document.body.appendChild(toasts);
    function toast(html, ms) {
        var t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; toasts.appendChild(t); raise(toasts);
        requestAnimationFrame(function() { t.classList.add('in'); });
        setTimeout(function() { t.classList.remove('in'); setTimeout(function() { t.remove(); if (!toasts.children.length) lower(toasts); }, 400); }, ms || 4200);
        return t;
    }
    function renderBadges() {
        var grid = $('#badge-grid'); if (!grid) return;
        var n = BADGES.filter(function(b) { return got[b[0]]; }).length;
        $('#badge-count').textContent = n + ' of ' + BADGES.length + ' unlocked';
        $('#badge-meter').style.setProperty('--p', (n / BADGES.length).toFixed(3));
        grid.innerHTML = BADGES.map(function(b) {
            var when = got[b[0]];
            return '<article class="badge-card' + (when ? ' is-on' : '') + '"><i aria-hidden="true"><svg viewBox="0 0 24 24"><path d="' + ICON[b[3]] + '"/></svg></i>' +
                '<h3>' + b[1] + '</h3><p>' + b[2] + '</p><small>' + (when ? 'Unlocked ' + new Date(when).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Locked') + '</small></article>';
        }).join('');
    }
    renderBadges();
    document.addEventListener('spaceedu:film-done', function(e) {
        if (count('films', e.detail.id) >= FILMED.length) award('film-buff');
        renderFilms();
    });


    /* ============================== SETTINGS ============================== */
    var setDlg = $('#settings'), cfg = Snd.cfg;
    function syncSettings() {
        $('#st-sound').checked = !!cfg.sound;
        $('#st-amb').value = Math.round(cfg.amb * 100); $('#st-ui').value = Math.round(cfg.ui * 100);
        $('#st-amb-v').textContent = Math.round(cfg.amb * 100) + '%'; $('#st-ui-v').textContent = Math.round(cfg.ui * 100) + '%';
        $('#st-voice').checked = cfg.voice !== false;
        $$('input[name="st-q"]').forEach(function(r) { r.checked = r.value === cfg.quality; });
        $$('input[name="st-m"]').forEach(function(r) { r.checked = r.value === cfg.motion; });
        $$('.st-vol').forEach(function(el) { el.classList.toggle('is-off', !cfg.sound); });
        var sb = $('#tool-sound');
        sb.setAttribute('aria-pressed', cfg.sound ? 'true' : 'false');
        sb.setAttribute('aria-label', cfg.sound ? 'Turn sound off' : 'Turn sound on');
        sb.title = cfg.sound ? 'Sound on' : 'Sound off';
    }
    $('#tool-settings').addEventListener('click', function() { syncSettings(); openDialog(setDlg); });
    $('#tool-sound').addEventListener('click', function() {
        Snd.set('sound', !cfg.sound); syncSettings(); Snd.click(cfg.sound ? 'on' : 'off');
        if (cfg.sound && !store.get('soundHint', 0)) { store.set('soundHint', 1); toast('<span><small>Sound on</small><b>Space ambience and shooting stars. Adjust it in Settings.</b></span>'); }
    });
    $('#st-sound').addEventListener('change', function() { Snd.set('sound', this.checked); syncSettings(); Snd.click('on'); });
    [['#st-amb', 'amb'], ['#st-ui', 'ui']].forEach(function(p) {
        $(p[0]).addEventListener('input', function() { Snd.set(p[1], this.value / 100); syncSettings(); });
        $(p[0]).addEventListener('change', function() { Snd.click(); });
    });
    $('#st-voice').addEventListener('change', function() { Snd.set('voice', this.checked); });
    var needReload = false;
    function pending() { $('#st-apply').hidden = !needReload; }
    $$('input[name="st-q"], input[name="st-m"]').forEach(function(r) {
        r.addEventListener('change', function() {
            Snd.set(r.name === 'st-q' ? 'quality' : 'motion', r.value);
            needReload = (cfg.quality === '2d') !== root.classList.contains('flat') || (cfg.motion === 'reduced') !== root.classList.contains('calm');
            if (r.name === 'st-q') root.removeAttribute('data-autoflat');   // the visitor has now chosen
            pending();
        });
    });
    $('#st-apply').addEventListener('click', function() { location.reload(); });

    /* language: saved in this browser, applied by reloading the page */
    var LANG_NAME = { en: 'EN', ru: 'RU', uz: 'UZ' }, lang = window.LANG || 'en';
    function setLang(l) { if (l === lang) return; try { localStorage.setItem('spaceedu.lang', l); } catch (e) {} location.reload(); }
    var langBtn = $('#tool-lang'), langMenu = $('#lang-menu');
    langBtn.textContent = LANG_NAME[lang];
    langBtn.addEventListener('click', function(e) { e.stopPropagation(); var open = langMenu.hidden; langMenu.hidden = !open; langBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); });
    langMenu.addEventListener('click', function(e) { var b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); });
    $$('[data-lang]', langMenu).forEach(function(b) { b.setAttribute('aria-current', b.dataset.lang === lang ? 'true' : 'false'); });
    document.addEventListener('click', function(e) { if (!langMenu.hidden && !e.target.closest('.lang-wrap')) { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && !langMenu.hidden) { langMenu.hidden = true; langBtn.setAttribute('aria-expanded', 'false'); langBtn.focus(); } });
    $$('input[name="st-l"]').forEach(function(r) { r.checked = r.value === lang; r.addEventListener('change', function() { setLang(r.value); }); });
    $('#st-reset').addEventListener('click', function() {
        if (!confirm(TT('Reset all achievements and progress on this device?'))) return;   // a dialog is not on the page, so translate it here
        got = {}; tally = {}; store.set('ach', got); store.set('tally', tally); renderBadges(); renderFilms();
        toast('<span><small>Progress reset</small><b>Your achievements start again.</b></span>');
    });
    /* photos were chosen automatically to save mobile data: say so once per visit, with a way to get 3D */
    if (root.dataset.autoflat) {
        Snd.hold('quality', '2d');                            // in memory only, so Settings shows what is on screen
        document.addEventListener('spaceedu:boot-done', function() {
            setTimeout(function() {
                var t = toast('<span><small>Saving mobile data</small><b>Showing NASA photos instead of the 3D models (about 12 MB each).</b><span class="toast-acts"><button type="button" data-3d="1">Load 3D</button><button type="button" data-3d="0">Keep photos</button></span></span>', 15000);
                t.addEventListener('click', function(e) {
                    var b = e.target.closest('[data-3d]'); if (!b) return;
                    Snd.set('quality', b.dataset['3d'] === '1' ? '3d' : '2d');
                    if (b.dataset['3d'] === '1') location.reload(); else t.remove();
                });
            }, 1500);
        }, { once: true });
    }
    syncSettings();
    /* a light device gets one gentle suggestion to switch to the 2D photos */
    var weak = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2);
    if (weak && cfg.quality === '3d' && !root.dataset.autoflat && !store.get('liteAsked', 0)) {
        document.addEventListener('spaceedu:boot-done', function() {
            setTimeout(function() {
                store.set('liteAsked', 1);
                var t = toast('<span><small>Lighter device detected</small><b>Use 2D photos instead of 3D models for smoother scrolling?</b><span class="toast-acts"><button type="button" data-lite="1">Use 2D</button><button type="button" data-lite="0">Keep 3D</button></span></span>', 14000);
                t.addEventListener('click', function(e) {
                    var b = e.target.closest('[data-lite]'); if (!b) return;
                    if (b.dataset.lite === '1') { Snd.set('quality', '2d'); location.reload(); } else t.remove();
                });
            }, 2500);
        }, { once: true });
    }

    /* ============================== GLOSSARY PAGE ============================== */
    var TT = window.T || function(x) { return x; };          // sort and index by the title in the chosen language
    var title = function(t) { return TT(t.t).replace(/^[“«"'(]+/, ''); };   // quotes do not count for the A–Z index
    var sorted = GLOSSARY.slice().sort(function(a, b) { return title(a).localeCompare(title(b), window.LANG || 'en'); });
    var glGrid = $('#gl-grid'), glQ = $('#gl-q');
    function objBtn(id) { return '<button type="button" class="tag" data-open="' + id + '">' + S.OBJECTS[id].title + '</button>'; }
    glGrid.innerHTML = sorted.map(function(t) {
        return '<article class="gl-card" id="g-' + t.id + '" data-term="' + t.id + '" data-letter="' + title(t)[0].toUpperCase() + '"><h3>' + esc(t.t) + '</h3><p>' + esc(t.d) + '</p>' +
            (t.rel ? '<p class="gl-rel"><span>On SpaceEdu:</span> ' + t.rel.map(objBtn).join('') + '</p>' : '') + '</article>';
    }).join('');
    var letters = sorted.map(function(t) { return title(t)[0].toUpperCase(); }).filter(function(l, i, a) { return a.indexOf(l) === i; });
    $('#gl-letters').innerHTML = letters.map(function(l) { return '<a href="#g-' + sorted.find(function(t) { return title(t)[0].toUpperCase() === l; }).id + '">' + l + '</a>'; }).join('');
    var flat = function(s) { return s.toLowerCase().replace(/[’‘ʻʼ]/g, "'"); };   // Uzbek o‘ matches a typed o'
    function filterGl() {
        var q = flat(glQ.value.trim()), n = 0;
        $$('.gl-card', glGrid).forEach(function(c) { var on = !q || flat(c.textContent).indexOf(q) >= 0; c.hidden = !on; if (on) n++; });
        $('#gl-count').textContent = n + ' of ' + GLOSSARY.length + ' terms';
    }
    glQ.addEventListener('input', filterGl); filterGl();
    glGrid.addEventListener('click', function(e) { var c = e.target.closest('.gl-card'); if (c && !e.target.closest('button')) { if (count('terms', c.dataset.term) >= 10) award('lexicon'); } });
    function showTerm(id) {
        S.go('glossary'); glQ.value = ''; filterGl();
        var c = $('#g-' + id); if (!c) return;
        requestAnimationFrame(function() { c.scrollIntoView({ block: 'center' }); c.classList.remove('is-hit'); void c.offsetWidth; c.classList.add('is-hit'); });
    }
    /* buttons that open a spacecraft from anywhere (glossary cards, search, tags) */
    function openObject(id) { closeAll(); S.go('missions'); setTimeout(function() { S.openDetail(id); }, 60); }
    function closeAll() { $$('dialog[open]').forEach(closeDialog); }
    document.addEventListener('click', function(e) {
        var b = e.target.closest('[data-open]'); if (b && S.OBJECTS[b.dataset.open]) { e.preventDefault(); openObject(b.dataset.open); return; }
        var tg = e.target.closest('[data-tag]'); if (tg) { e.preventDefault(); openSearch('#' + tg.dataset.tag); return; }
        var f = e.target.closest('[data-film]'); if (f) { e.preventDefault(); Films.open(f.dataset.film); }
    });

    /* ============================== TERMS IN THE TEXT: underlined, with a pop-up explanation ============================== */
    var SKIP = '.stage, [data-field], .d-kind, .d-time time, summary, h1, h2, h3, h4, a, button, label, select, option, input, textarea, script, style, canvas, svg, nav, .cite, .term, .kicker, .site-header, .x-opts, .pill, dialog.v3, .page[data-page="glossary"], [aria-hidden="true"], .boot, time, small.lv-src, figcaption';
    var BLOCK = '.page, .d-body';                         // each term is underlined at its first use on a page
    function linkTerms(scope, once) {                     // once: link each term a single time in the whole scope
        if ((window.LANG || 'en') !== 'en') return;          // the term patterns are English; translated text stays whole
        var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
            acceptNode: function(n) {
                var p = n.parentElement;
                if (!p || n.nodeValue.trim().length < 3 || p.closest(SKIP) || p.id) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        });
        var nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
        var used = new Map();                                // block element -> terms already linked in it
        for (var ni = 0; ni < nodes.length; ni++) {
            var node = nodes[ni];
            var block = once ? scope : node.parentElement.closest(BLOCK) || scope, done = used.get(block) || new Set();
            used.set(block, done);
            var text = node.nodeValue, best = null;
            GLOSSARY.forEach(function(t) {
                if (done.has(t.id)) return;
                var m = t.m.exec(text);
                if (m && (!best || m.index < best.i)) best = { i: m.index, len: m[0].length, t: t };
            });
            if (!best) continue;
            done.add(best.t.id);
            var after = node.splitText(best.i); after.splitText(best.len);
            var b = document.createElement('button'); b.type = 'button'; b.className = 'term'; b.dataset.term = best.t.id;
            b.textContent = after.nodeValue; after.parentNode.replaceChild(b, after);
            if (b.nextSibling && b.nextSibling.nodeType === 3) nodes.splice(ni + 1, 0, b.nextSibling);   // a second term may follow in the same text
        }
    }
    $$('.page').forEach(function(p) { linkTerms(p); });
    ['#x-recs', '#x-tl'].forEach(function(sel) {          // these lists are redrawn by their filters
        var el = $(sel); if (!el) return;
        new MutationObserver(function() { linkTerms(el); }).observe(el, { childList: true });
    });
    /* the detail window is rebuilt for every object: link its terms, add the film and the keyword tags */
    var detailBody = $('#detail-body');
    new MutationObserver(function() {
        var id = S.featured();
        if (!detailBody.firstChild || $('.d-tags', detailBody)) return;
        var content = $('.d-content', detailBody); if (!content) return;
        var lede = $('.d-lede', content);
        var html = '<div class="d-tags" aria-label="Keywords">' + TAGS[id].slice(0, 4).map(function(t) { return '<button type="button" class="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('') + '</div>';
        if (FILMED.indexOf(id) >= 0) html += '<button type="button" class="d-film" data-film="' + id + '"><span aria-hidden="true">▶</span> Watch: ' + (id === 'voyager' ? 'why it is limited' : 'why it went silent') + ' <small>' + Math.round(Films.FILMS[id].length) + ' s · sound</small></button>';
        lede.insertAdjacentHTML('afterend', html);
        linkTerms(content, true);
        if (count('opened', id) >= 6) award('grand-tour');
    }).observe(detailBody, { childList: true });

    var pop = document.createElement('div'); pop.className = 'term-pop'; pop.setAttribute('role', 'dialog');
    if (topLayer) pop.setAttribute('popover', 'manual'); else pop.hidden = true;
    document.body.appendChild(pop);
    var popFor = null, popOpen = false, hideT = 0, showT = 0;
    function showPop(btn) {
        var t = TERM[btn.dataset.term]; if (!t) return;
        clearTimeout(hideT);
        if (popFor === btn && popOpen) return;
        popFor = btn;
        pop.setAttribute('aria-label', t.t);
        pop.innerHTML = '<b>' + esc(t.t) + '</b><p>' + esc(t.d) + '</p><button type="button" data-goterm="' + t.id + '">Open in the glossary →</button>';
        if (topLayer) raise(pop); else pop.hidden = false;
        popOpen = true;
        var r = btn.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
        var x = Math.max(12, Math.min(r.left + r.width / 2 - pw / 2, innerWidth - pw - 12)), y = r.bottom + 10;
        if (y + ph > innerHeight - 12) y = r.top - ph - 10;
        pop.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(Math.max(12, y)) + 'px)';
        if (count('terms', t.id) >= 10) award('lexicon');
    }
    function hidePop() { if (topLayer) lower(pop); else pop.hidden = true; popFor = null; popOpen = false; }
    var finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
    document.addEventListener('mouseover', function(e) {
        if (!finePointer) return;
        var b = e.target.closest('.term');
        if (b) { clearTimeout(hideT); clearTimeout(showT); showT = setTimeout(function() { showPop(b); }, 160); }
        else if (!e.target.closest('.term-pop')) { clearTimeout(showT); clearTimeout(hideT); hideT = setTimeout(hidePop, 260); }
    });
    document.addEventListener('click', function(e) {
        var go = e.target.closest('[data-goterm]'); if (go) { hidePop(); closeAll(); showTerm(go.dataset.goterm); return; }
        var b = e.target.closest('.term');
        if (b) { e.preventDefault(); if (popFor === b && popOpen) hidePop(); else showPop(b); Snd.click(); return; }
        if (!e.target.closest('.term-pop')) hidePop();
    });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && popOpen) hidePop(); });
    window.addEventListener('scroll', function() { if (popOpen) hidePop(); }, { passive: true });
    document.addEventListener('scroll', function(e) { if (popOpen && e.target !== document && e.target.contains && e.target.contains(popFor)) hidePop(); }, { passive: true, capture: true });

    /* ============================== SEARCH ============================== */
    var sDlg = $('#search'), sQ = $('#sd-q'), sRes = $('#sd-res'), index = null, sel = 0, results = [];
    var norm = function(s) { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'"); };
    function buildIndex() {
        index = [];
        var T = window.T || function(x) { return x; };
        S.ORDER.forEach(function(id) {
            var o = S.OBJECTS[id], d = S.DETAILS[id];
            index.push({ type: 'Spacecraft', title: o.title, text: strip(o.lede), tags: TAGS[id], obj: id, act: function() { openObject(id); } });
            (d.found || []).concat(d.status || []).forEach(function(f) { index.push({ type: 'Fact', title: o.title, text: strip(f), tags: TAGS[id], obj: id, act: function() { openObject(id); } }); });
            (d.timeline || []).forEach(function(ev) { index.push({ type: 'Timeline', title: T(ev[0]) + ' · ' + T(o.title), text: strip(ev[1]), tags: TAGS[id], obj: id, act: function() { openObject(id); } }); });
        });
        $$('.page section[id]').forEach(function(sec) {
            var k = $('.kicker', sec), h = $('h2', sec), l = $('.lead', sec), page = sec.closest('.page');
            if (!h) return;
            index.push({ type: 'Section · ' + page.dataset.title, title: h.textContent.trim(), text: (k ? k.textContent + ' · ' : '') + (l ? l.textContent : ''), tags: [], act: function() { closeAll(); goHash(sec.id); } });
        });
        GLOSSARY.forEach(function(t) { index.push({ type: 'Glossary', title: t.t, text: t.d, tags: (t.rel || []).reduce(function(a, id) { return a.concat(TAGS[id]); }, []), act: function() { closeAll(); showTerm(t.id); } }); });
        QUESTIONS.forEach(function(q) { index.push({ type: 'Quiz', title: q[0], text: q[2], tags: TAGS[q[3]], act: function() { closeAll(); goHash('challenge'); } }); });
        index.forEach(function(it) {
            it.kind = it.type;                                // the English type, for ranking in any language
            it.title = T(it.title); it.text = T(it.text); it.type = T(it.type);   // shown and searched in the chosen language
            it.nt = norm(it.title); it.nx = norm(it.text); it.ng = it.tags.map(norm).concat(it.tags.map(function(g) { return norm(T(g)); }));
        });
    }
    /* the site is in English; common Russian and Uzbek words still find things */
    var ALIAS = { 'марс': 'mars', 'луна': 'moon', 'луны': 'moon', 'oy': 'moon', 'земля': 'earth', 'солнце': 'sun', 'quyosh': 'sun',
        'марсоход': 'rover', 'ровер': 'rover', 'вояджер': 'voyager', 'voyajer': 'voyager', 'аполлон': 'apollo', 'apollon': 'apollo',
        'спирит': 'spirit', 'оппортьюнити': 'opportunity', 'персеверанс': 'perseverance', 'соджорнер': 'sojourner',
        'буря': 'storm', 'пыль': 'dust', 'chang': 'dust', 'энергия': 'power', 'батарея': 'battery', 'солнечные': 'solar',
        'лазер': 'laser', 'юпитер': 'jupiter', 'yupiter': 'jupiter', 'сатурн': 'saturn', 'кратер': 'crater', 'вода': 'water', 'suv': 'water',
        'жизнь': 'life', 'hayot': 'life', 'антенна': 'antenna', 'сигнал': 'signal', 'камень': 'rock', 'tosh': 'rock' };
    function goHash(id) {                                  // the same hash twice fires no hashchange, so scroll by hand
        if (location.hash === '#' + id) { var el = document.getElementById(id); if (el) el.scrollIntoView(); }
        else location.hash = '#' + id;
    }
    function search(q) {
        q = norm(q.trim());
        if (!q) return [];
        if (q[0] === '#') {                                   // a keyword: everything carrying that tag
            var tag = q.slice(1).trim();
            if (!tag) return [];
            var tagT = norm((window.T || String)(tag));        // the chips are English; the glossary text may be translated
            return index.filter(function(it) {                     // the spacecraft with that tag, then the words that mention it
                return (it.kind === 'Spacecraft' && it.ng.indexOf(tag) >= 0) || (it.kind === 'Glossary' && [tag, tagT].some(function(g) { return it.nt.indexOf(g) >= 0 || it.nx.indexOf(g) >= 0; }));
            });
        }
        /* each word, plus its English alias: the index is in the chosen language, the tags stay English */
        var words = q.split(/\s+/).filter(Boolean).map(function(w) { return ALIAS[w] ? [w, ALIAS[w]] : [w]; });
        function wordScore(it, w) {
            var s = 0;
            if (it.nt.indexOf(w) >= 0) s += it.nt.indexOf(w) === 0 || it.nt.indexOf(' ' + w) >= 0 ? 8 : 5;
            if (it.ng.some(function(g) { return g.indexOf(w) === 0; })) s += 4;
            if (it.nx.indexOf(w) >= 0) s += 1;
            return s;
        }
        /* a word found nowhere (a typo, an emoji) is ignored instead of emptying the results */
        var known = words.filter(function(alts) { return alts.some(function(w) { return index.some(function(it) { return wordScore(it, w) > 0; }); }); });
        if (known.length) words = known;
        return index.map(function(it) {
            var score = 0;
            for (var i = 0; i < words.length; i++) {
                var s = Math.max.apply(null, words[i].map(function(w) { return wordScore(it, w); }));
                if (!s) return null;
                score += s;
            }
            if (it.kind === 'Spacecraft') score += 3; else if (it.kind === 'Glossary') score += 2; else if (it.kind === 'Quiz') score -= 6;   // a quiz question never outranks the thing it asks about
            return { it: it, score: score };
        }).filter(Boolean).sort(function(a, b) { return b.score - a.score; }).slice(0, 14).map(function(r) { return r.it; });
    }
    function mark(text, q) {                              // one pass over the plain text, so a word never lands inside a tag or entity
        var ws = norm(q).replace(/^#/, '').split(/\s+/).filter(function(w) { return w.length > 1; })
            .sort(function(a, b) { return b.length - a.length; }).map(function(w) { return w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); });
        if (!ws.length) return esc(text);
        var re = new RegExp(ws.join('|'), 'ig'), out = '', last = 0, m;
        while ((m = re.exec(text))) { out += esc(text.slice(last, m.index)) + '<mark>' + esc(m[0]) + '</mark>'; last = re.lastIndex; }
        return out + esc(text.slice(last));
    }
    function snippet(text, q) {
        var w = norm(q).replace(/^#/, '').split(/\s+/)[0], i = w ? norm(text).indexOf(w) : -1;
        if (text.length < 140 || i < 60) return text.slice(0, 140) + (text.length > 140 ? '…' : '');
        return '…' + text.slice(i - 50, i + 90) + '…';
    }
    function renderResults() {
        var q = sQ.value;
        results = search(q); sel = 0;
        if (!q.trim()) { sRes.innerHTML = ''; $('#sd-empty').hidden = true; $('#sd-tags').hidden = false; return; }
        $('#sd-tags').hidden = true;
        $('#sd-empty').hidden = results.length > 0;
        sRes.innerHTML = results.map(function(it, i) {
            return '<li role="option" id="sd-o' + i + '" aria-selected="' + (i === sel) + '" data-i="' + i + '"><span class="sd-type">' + esc(it.type) + '</span><b>' + mark(it.title, q) + '</b><span class="sd-text">' + mark(snippet(it.text, q), q) + '</span></li>';
        }).join('');
        sQ.setAttribute('aria-activedescendant', results.length ? 'sd-o0' : '');
    }
    function move(d) {
        if (!results.length) return;
        sel = (sel + d + results.length) % results.length;
        $$('li', sRes).forEach(function(li, i) { li.setAttribute('aria-selected', i === sel ? 'true' : 'false'); });
        var li = $('#sd-o' + sel); li.scrollIntoView({ block: 'nearest' }); sQ.setAttribute('aria-activedescendant', li.id);
    }
    function choose(i) { var it = results[i]; if (!it) return; Snd.click(); it.act(); }
    function openSearch(q) {
        if (!index) buildIndex();
        if (!sDlg.open) openDialog(sDlg);
        sQ.value = q || ''; renderResults(); sQ.focus();
    }
    var allTags = []; Object.keys(TAGS).forEach(function(id) { TAGS[id].forEach(function(t) { if (allTags.indexOf(t) < 0) allTags.push(t); }); });
    $('#sd-tags').innerHTML = '<span>Keywords</span>' + allTags.map(function(t) { return '<button type="button" class="tag" data-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join('');
    sQ.addEventListener('input', renderResults);
    sQ.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    });
    sRes.addEventListener('click', function(e) { var li = e.target.closest('[data-i]'); if (li) choose(+li.dataset.i); });
    $('#tool-search').addEventListener('click', function() { openSearch(''); });
    document.addEventListener('keydown', function(e) {
        var typing = /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
        if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing && !document.querySelector('dialog[open]'))) { e.preventDefault(); openSearch(''); }
    });

    /* ============================== TEST YOURSELF: missions and glossary rounds ============================== */
    var ch = $('#x-challenge'), round = null;
    function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
    var STATUS_WHY = {
        apollo: 'It has no power at all, yet observatories still bounce lasers off it today.',
        voyager: 'It still sends data from interstellar space, but only 2 of its 10 instruments are on.',
        sojourner: 'It is still on Mars, but contact ended on Sept. 27, 1997.',
        spirit: 'It is still on Mars, stuck beside Home Plate; its last contact was in March 2010.',
        opportunity: 'It is still on Mars; it went silent in a planet-wide dust storm in June 2018.',
        perseverance: 'It is driving and collecting samples in Jezero Crater, on a mission extended to about 2028.'
    };
    function startRound(kind) {
        var qs;
        if (kind === 'status') qs = shuffle(S.ORDER).map(function(id) {
            return { q: 'Which label fits ' + S.OBJECTS[id].title + ' today?', right: S.LABEL[S.STATUS[id]], opts: ['ok', 'pas', 'lim', 'off'].map(function(k) { return S.LABEL[k]; }), why: STATUS_WHY[id], obj: id };
        });
        else if (kind === 'missions') qs = shuffle(QUESTIONS).slice(0, 10).map(function(q) { return { q: q[0], right: q[1][0], opts: shuffle(q[1]), why: q[2], obj: q[3] }; });
        else qs = shuffle(GLOSSARY).slice(0, 8).map(function(t) {
            var wrong = shuffle(GLOSSARY.filter(function(x) { return x.id !== t.id; })).slice(0, 3).map(function(x) { return x.t; });
            return { q: 'Which term means: “' + t.d.split(/\.\s+(?=[A-Z])/)[0].replace(/\.$/, '') + '”?', right: t.t, opts: shuffle([t.t].concat(wrong)), why: t.d, term: t.id };
        });
        round = { kind: kind, qs: qs, i: 0, score: 0, mars: { asked: 0, right: 0 } };
        askQ();
    }
    var ROUND_NAME = { status: 'Working or existing?', missions: 'Missions round', glossary: 'Glossary round' };
    var NEXT_ROUND = { status: 'missions', missions: 'glossary', glossary: 'status' };
    function head() {
        return '<div class="ch-head"><span>' + ROUND_NAME[round.kind] + '</span><span class="ch-prog" aria-hidden="true">' +
            round.qs.map(function(_, i) { return '<i class="' + (i < round.i ? 'done' : i === round.i ? 'now' : '') + '"></i>'; }).join('') + '</span><span>' + round.score + ' points</span></div>';
    }
    function askQ() {
        var q = round.qs[round.i];
        if (!q) return finish();
        ch.innerHTML = head() + '<h3 class="ch-q">' + (round.i + 1) + '. ' + esc(q.q) + '</h3><div class="ch-opts">' +
            q.opts.map(function(o, i) { return '<button type="button" data-o="' + i + '"><b>' + 'ABCD'[i] + '</b>' + esc(o) + '</button>'; }).join('') + '</div><div class="ch-fb" aria-live="polite"></div>';
        $('.ch-opts button', ch).focus({ preventScroll: true });
    }
    function finish() {
        var n = round.qs.length, s = round.score, k = round.kind;
        if (k === 'missions' && s >= 9) award('specialist');
        if (k === 'glossary' && s === n) award('word-wizard');
        if (k === 'status' && s === n) award('status-perfect');
        var best = store.get('best', {}); if (!best[k] || s > best[k]) { best[k] = s; store.set('best', best); }
        var msg = s === n ? 'Perfect score. Mission control is impressed.' : s >= n * .7 ? 'Great work. A few more and you are an expert.' : 'Good start. Read the glossary and the mission windows, then try again.';
        ch.innerHTML = head() + '<div class="ch-end"><p class="ch-big">' + s + ' / ' + n + '</p><p>' + msg + '</p><p class="ch-best">Your best: ' + best[k] + ' / ' + n + '</p>' +
            '<div class="ch-modes"><button class="x-btn solid" type="button" data-round="' + k + '">Play again</button><button class="x-btn" type="button" data-round="' + NEXT_ROUND[k] + '">Next: ' + ROUND_NAME[NEXT_ROUND[k]] + '</button></div></div>';
    }
    function intro() {
        var best = store.get('best', {});
        ch.innerHTML = '<div class="ch-intro"><p>Three rounds. Every answer comes with the reason, and good scores unlock achievements.</p><div class="ch-modes">' +
            '<button class="ch-mode" type="button" data-round="status"><b>Working or existing?</b><span>6 questions: which status label fits each object today</span><small>' + (best.status != null ? 'Best: ' + best.status + ' / 6' : 'Not played yet') + '</small></button>' +
            '<button class="ch-mode" type="button" data-round="missions"><b>Missions round</b><span>10 questions about the six objects</span><small>' + (best.missions != null ? 'Best: ' + best.missions + ' / 10' : 'Not played yet') + '</small></button>' +
            '<button class="ch-mode" type="button" data-round="glossary"><b>Glossary round</b><span>8 questions: match the word to its meaning</span><small>' + (best.glossary != null ? 'Best: ' + best.glossary + ' / 8' : 'Not played yet') + '</small></button></div></div>';
    }
    ch.addEventListener('click', function(e) {
        var r = e.target.closest('[data-round]'); if (r) { Snd.click(); startRound(r.dataset.round); return; }
        if (e.target.closest('[data-nextq]')) { round.i++; askQ(); return; }
        var b = e.target.closest('[data-o]'); if (!b || b.disabled) return;
        var q = round.qs[round.i], pick = q.opts[+b.dataset.o], ok = pick === q.right;
        if (ok) round.score++;
        if (q.obj && ['sojourner', 'spirit', 'opportunity', 'perseverance'].indexOf(q.obj) >= 0) { round.mars.asked++; if (ok) round.mars.right++; }
        Snd.click(ok ? 'on' : 'off');
        $$('[data-o]', ch).forEach(function(x) { x.disabled = true; if (q.opts[+x.dataset.o] === q.right) x.classList.add('right'); });
        if (!ok) b.classList.add('wrong');
        var more = q.obj ? '<button type="button" class="tag" data-open="' + q.obj + '">Read about ' + S.OBJECTS[q.obj].title + '</button>' : '<button type="button" class="tag" data-goterm="' + q.term + '">Open in the glossary</button>';
        $('.ch-fb', ch).innerHTML = '<p><b>' + (ok ? 'Correct.' : 'Not quite: ' + esc(q.right) + '.') + '</b> ' + esc(q.why) + '</p><div class="ch-acts">' + more +
            '<button class="x-btn solid" type="button" data-nextq>' + (round.i + 1 < round.qs.length ? 'Next question' : 'See your score') + '</button></div>';
        $('[data-nextq]', ch).focus({ preventScroll: true });
    });
    intro();

    /* ============================== FILMS SECTION ============================== */
    function renderFilms() {
        var grid = $('#film-grid'); if (!grid) return;
        var seen = Array.isArray(tally.films) ? tally.films : [];
        grid.innerHTML = FILMED.map(function(id) {
            var f = Films.FILMS[id];
            return '<button type="button" class="film-card" data-film="' + id + '"><span class="film-poster"><img alt="" src="' + f.poster + '" loading="lazy"><em class="film-cause">' + esc(f.cause) + '</em><i aria-hidden="true">▶</i></span>' +
                '<b>' + esc(f.title) + '</b><small>' + Math.round(f.length) + ' s · narrated · subtitles' + (seen.indexOf(id) >= 0 ? ' · <em class="seen">watched</em>' : '') + '</small></button>';
        }).join('');
    }
    renderFilms();

    /* sound for interface buttons (only when sound is on) */
    document.addEventListener('click', function(e) {
        if (e.target.closest('.links a, .pick, .more, .x-btn, .tool, .xnav a, .d-nav button')) Snd.click();
    });
})();
