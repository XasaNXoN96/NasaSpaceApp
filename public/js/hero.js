/* Hero: the six objects, the picker and the detail window */
(function() {
    var root = document.documentElement;
    var reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || root.classList.contains('calm');

    /* Entrance driver */
    if (root.classList.contains('anim')) {
        var started = false;
        var start = function() {
            if (started) return;
            started = true;
            requestAnimationFrame(function() {
                requestAnimationFrame(function() {
                    root.classList.add('play');
                    setTimeout(function() {
                        root.classList.remove('anim', 'play');
                    }, 2150);
                });
            });
        };
        /* the entrance starts with the page (js/site.js sends 'spaceedu:boot-done' once the fonts are ready) */
        document.addEventListener('spaceedu:boot-done', start);
        setTimeout(start, 1600);
    }

    /* Object data: facts come from the team's NASA table (NASA_объекты_таблица.xlsx) */
    var ORDER = window.SPACE_DATA.order;
    var OBJECTS = window.SPACE_DATA.objects;           // the facts live in js/data.js

    /* ONE status per object; every section reads it from here */
    var STATUS = window.SPACE_DATA.status, STATUS_LABEL = window.SPACE_DATA.statusLabel, STATUS_TEXT = window.SPACE_DATA.statusText;
    var STATE = { ok: 'active', pas: 'passive', lim: 'limited', off: 'ended' };   // the hero's coloured dot
    ORDER.forEach(function(id) { OBJECTS[id].state = STATE[STATUS[id]]; });

    var layers = Array.prototype.slice.call(document.querySelectorAll('.sky .layer'));
    var field = function(name) {
        return document.querySelector('[data-field="' + name + '"]');
    };
    var f = {
        kind: field('kind'),
        name: field('name'),
        lede: field('lede'),
        launched: field('launched'),
        where: field('where'),
        status: field('status'),
        link: field('link'),
        creditType: field('creditType'),
        credit: field('credit'),
        creditLink: field('creditLink')
    };
    var h1 = document.querySelector('h1.title');
    var announcer = document.getElementById('object-status');
    var picks = Array.prototype.slice.call(document.querySelectorAll('.pick'));
    var changing = [f.kind, f.name, f.lede, document.querySelector('.facts')];
    var featured = 'perseverance';
    root.dataset.featured = featured;

    function layerFor(id) {
        for (var i = 0; i < layers.length; i++)
            if (layers[i].dataset.object === id) return layers[i];
        return null;
    }

    function warm(id) {
        var layer = layerFor(id);
        if (layer && !layer.style.backgroundImage && layer.dataset.bg) {
            layer.style.backgroundImage = 'url("' + layer.dataset.bg + '")';
        }
    }

    function step(delta) {
        var n = ORDER.length;
        return ORDER[(ORDER.indexOf(featured) + delta + n) % n];
    }

    function show(next, announce) {
        var o = OBJECTS[next];
        if (!o || next === featured) return;
        featured = next;
        root.dataset.featured = next;

        warm(next);
        layers.forEach(function(layer) {
            layer.classList.toggle('is-active', layer.dataset.object === next);
        });

        f.kind.textContent = o.kind;
        f.name.textContent = o.name;
        h1.style.setProperty('--chars', o.name.length);
        f.lede.innerHTML = o.lede;
        f.launched.textContent = o.launched;
        f.where.textContent = o.where;
        f.status.textContent = o.status;
        f.status.dataset.state = o.state;
        f.link.setAttribute('aria-label', 'Learn more about ' + o.name);
        f.creditType.textContent = o.creditType;
        f.credit.textContent = o.credit;
        f.creditLink.textContent = o.pia;
        f.creditLink.href = o.creditLink;
        if (!root.dataset.page || root.dataset.page === 'missions') document.title = o.title + ' — SpaceEdu';   // other pages keep their own title
        picks.forEach(function(p) {
            p.setAttribute('aria-pressed', p.dataset.object === next ? 'true' : 'false');
        });

        /* the 3D viewer (module script below) listens for this */
        document.dispatchEvent(new CustomEvent('spaceedu:show', {
            detail: {
                id: next
            }
        }));

        if (!reduce && !root.classList.contains('anim') && changing[0].animate) {
            changing.forEach(function(el) {
                el.animate([{
                    opacity: 0,
                    transform: 'translateY(6px)'
                }, {
                    opacity: 1,
                    transform: 'none'
                }], {
                    duration: 360,
                    easing: 'cubic-bezier(.22,1,.36,1)'
                });
            });
        }
        if (announce) announcer.textContent = o.title + ': ' + o.status;
    }

    picks.forEach(function(btn) {
        btn.addEventListener('click', function() {
            show(this.dataset.object, true);
        });
        btn.addEventListener('pointerenter', function() {
            warm(this.dataset.object);
            /* the 3D viewer starts fetching this model on intent, before the click */
            document.dispatchEvent(new CustomEvent('spaceedu:warm', { detail: { id: this.dataset.object } }));
        });
        btn.addEventListener('focus', function() {
            warm(this.dataset.object);
            document.dispatchEvent(new CustomEvent('spaceedu:warm', { detail: { id: this.dataset.object } }));
        });
    });

    /* [ and ] (or ← → outside the 3D canvas) step through the spacecraft while the hero is on screen */
    document.addEventListener('keydown', function(e) {
        if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
        if (window.scrollY > window.innerHeight / 2) return;
        if (root.dataset.page && root.dataset.page !== 'missions') return;   // the hero is hidden on the other pages
        if (document.querySelector('.navrow').dataset.open === 'true') return;
        if (document.querySelector('dialog[open]')) return;
        if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
        if (document.activeElement && document.activeElement.classList.contains('gl')) return; // arrows turn the model there
        if (e.key === 'ArrowLeft' || e.key === '[') show(step(-1), true);
        else if (e.key === 'ArrowRight' || e.key === ']') show(step(1), true);
    });

    /* pull the remaining photo backdrops after first paint, but not on Save-Data or 2G */
    var conn = navigator.connection;
    var lite = !!(conn && (conn.saveData || /(^|-)2g$/.test(conn.effectiveType || '')));
    root.dataset.lite = lite ? 'true' : 'false';
    window.addEventListener('load', function() {
        if (lite) return;
        var warmAll = function() {
            ORDER.forEach(warm);
        };
        requestAnimationFrame(function() {
            if ('requestIdleCallback' in window) requestIdleCallback(warmAll, {
                timeout: 4000
            });
            else setTimeout(warmAll, 2500);
        });
    });

    /* Detail window: extra facts per object, all from the team's NASA table */
    var DETAILS = window.SPACE_DATA.details;

    var dialog = document.getElementById('detail');
    var dialogBody = document.getElementById('detail-body');
    var ext = ' target="_blank" rel="noopener"';

    function list(items) {
        return items.map(function(t) {
            return '<li>' + t + '</li>';
        }).join('');
    }

    ORDER.forEach(function(id) { DETAILS[id].badge = STATUS_LABEL[STATUS[id]]; });

    function renderDetail(id) {
        var o = OBJECTS[id],
            d = DETAILS[id];
        var i = ORDER.indexOf(id),
            n = ORDER.length;
        var prev = ORDER[(i - 1 + n) % n],
            next = ORDER[(i + 1) % n];
        var figSrc = d.figure ? ((window.PHOTOS && window.PHOTOS[d.figure.src]) || d.figure.src) : '';
        var fig = d.figure ? (
            '<figure class="d-fig"><img src="' + figSrc + '" alt="' + d.figure.alt + '" loading="lazy" decoding="async">' +
            '<figcaption>' + d.figure.caption + ' <span class="cr">Image: ' + d.figure.credit +
            ' · <a href="' + d.figure.link + '"' + ext + '>' + d.figure.pia + '</a></span></figcaption></figure>'
        ) : '';
        dialogBody.innerHTML =
            '<figure class="d-banner"><img src="' + layerFor(id).dataset.bg + '" alt="' + d.bannerAlt + '">' +
            '<figcaption>' + o.creditType + ': ' + o.credit + ' · <a href="' + o.creditLink + '"' + ext + '>' + o.pia + '</a></figcaption></figure>' +
            '<div class="d-content">' +
            '<p class="d-kind">' + o.kind + '</p>' +
            '<h2 id="detail-title">' + o.title + '</h2>' +
            '<p class="d-lede">' + o.lede + '</p>' +
            '<ul class="d-stats">' + d.stats.map(function(s) {
                return '<li><strong>' + s[0] + '</strong><span>' + s[1] + '</span></li>';
            }).join('') + '</ul>' +
            '<div class="d-grid">' +
            '<section><h3>Built to</h3><p>' + d.built + '</p>' +
            '<h3>What it found</h3><ul class="d-list">' + list(d.found) + '</ul>' +
            '<h3>Status today</h3><p class="badge" data-state="' + o.state + '">' + d.badge + '</p>' +
            '<ul class="d-list">' + list(d.status) + '</ul></section>' +
            '<section><h3>Timeline</h3><ol class="d-time">' + d.timeline.map(function(t) {
                return '<li><time>' + t[0] + '</time><span>' + t[1] + '</span></li>';
            }).join('') + '</ol></section>' +
            '</div>' + fig +
            '<section class="d-sources"><h3>Sources</h3><ul>' + d.sources.map(function(s) {
                return '<li><a href="' + s[1] + '"' + ext + '>' + s[0] + ' ↗</a></li>';
            }).join('') + '</ul></section>' +
            '<nav class="d-nav" aria-label="Other spacecraft">' +
            '<button type="button" data-go="' + prev + '">← ' + OBJECTS[prev].name + '</button>' +
            '<button type="button" data-go="' + next + '">' + OBJECTS[next].name + ' →</button>' +
            '</nav>' +
            '</div>';
        dialog.scrollTop = 0;
    }

    function openDetail() {
        renderDetail(featured);
        if (typeof dialog.showModal === 'function') dialog.showModal();
        else dialog.setAttribute('open', '');
        root.classList.add('has-dialog');
    }

    /* Unlocking the page must not depend on the 'close' event alone: browsers deliver it as a separate
       task, so the scroll lock is released directly here as well. Both paths are safe to run twice. */
    function afterClose() {
        if (!root.classList.contains('has-dialog') || dialog.open) return;   // reopened before the close event arrived
        root.classList.remove('has-dialog');
        f.link.focus({
            preventScroll: true
        }); // Safari does not reliably restore focus on its own
    }

    function closeDetail() {
        if (dialog.open) dialog.close();
        afterClose();
    }

    f.link.addEventListener('click', openDetail);
    dialog.querySelector('.d-close').addEventListener('click', closeDetail);
    dialog.addEventListener('close', afterClose);
    dialog.addEventListener('cancel', function() { // Esc
        setTimeout(afterClose, 0);
    });
    dialog.addEventListener('click', function(e) {
        /* the backdrop counts as the dialog itself; test the box so a scrollbar click does not close it */
        var box = dialog.getBoundingClientRect();
        if (e.target === dialog && (e.clientX < box.left || e.clientX > box.right ||
                e.clientY < box.top || e.clientY > box.bottom)) {
            closeDetail();
            return;
        }
        var go = e.target.closest('[data-go]');
        if (go) { // prev / next also moves the hero
            var side = go.parentNode.firstElementChild === go ? 0 : 1;
            show(go.dataset.go, true);
            renderDetail(go.dataset.go);
            dialog.querySelectorAll('.d-nav button')[side].focus({
                preventScroll: true
            }); // same side, but read from the top
            dialog.scrollTop = 0;
        }
    });

    /* shared with the explore sections further down the page */
    window.SpaceEdu = {
        ORDER: ORDER,
        OBJECTS: OBJECTS,
        DETAILS: DETAILS,
        STATUS: STATUS,
        LABEL: STATUS_LABEL,
        LABEL_TEXT: STATUS_TEXT,
        layerFor: layerFor,
        show: function(id) {
            show(id, true);
        },
        openDetail: function(id) {
            show(id, true);
            openDetail();
        },
        featured: function() {
            return featured;
        }
    };

    /* Scroll control: jumps to the first section under the hero (html scroll-behavior handles smoothness) */
    document.querySelector('.scroll').addEventListener('click', function() {
        document.getElementById('leave-behind').scrollIntoView();
    });

    /* Burger menu */
    var navrow = document.querySelector('.navrow');
    var burger = document.querySelector('.burger');
    var menu = document.getElementById('site-nav');

    function set(open) {
        navrow.dataset.open = open ? 'true' : 'false';
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        burger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    }
    set(false);

    burger.addEventListener('click', function(e) {
        e.stopPropagation();
        set(navrow.dataset.open !== 'true');
    });
    document.addEventListener('click', function(e) {
        if (navrow.dataset.open !== 'true') return;
        if (menu.contains(e.target) || burger.contains(e.target)) return;
        set(false);
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && navrow.dataset.open === 'true') {
            set(false);
            burger.focus();
        }
    });
    menu.addEventListener('click', function(e) {
        if (e.target.closest('a')) set(false);
    });
})();
