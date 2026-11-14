/* The language layer */
/* ============================== LANGUAGES: English, Russian, Uzbek ==============================
   The page is written in English. In Russian or Uzbek every text node and label is looked up in
   I18N_STRINGS by its exact English text; numbers, dates and units are rewritten by the rules below.
   New content added later (windows, live numbers, quiz) is translated as it appears. */
(function() {
    var lang = 'en';
    try { lang = localStorage.getItem('spaceedu.lang') || 'en'; } catch (e) {}
    if (!/^(en|ru|uz)$/.test(lang)) lang = 'en';
    window.LANG = lang;
    document.documentElement.lang = lang;
    var DICT = lang === 'en' ? null : (window.I18N_STRINGS || {})[lang];
    if (!DICT) { window.T = function(s) { return s; }; return; }
    var RU = lang === 'ru';

    /* ---- numbers, plurals, dates ---- */
    function num(s) {                                         // 25,832.5 -> 25 832,5
        return String(s).replace(/(\d),(\d{3})/g, '$1 $2').replace(/(\d),(\d{3})/g, '$1 $2').replace(/(\d)\.(\d)/g, '$1,$2');
    }
    function plural(n, one, few, many) {
        n = Math.abs(parseInt(String(n).replace(/\D/g, ''), 10)) || 0;
        var m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return one;
        if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
        return many;
    }
    var unit = {
        year: function(n) { return RU ? plural(n, 'год', 'года', 'лет') : 'yil'; },
        day: function(n) { return RU ? plural(n, 'день', 'дня', 'дней') : 'kun'; },
        month: function(n) { return RU ? plural(n, 'месяц', 'месяца', 'месяцев') : 'oy'; },
        point: function(n) { return RU ? plural(n, 'балл', 'балла', 'баллов') : 'ball'; },
        record: function(n) { return RU ? plural(n, 'запись', 'записи', 'записей') : 'yozuv'; },
        term: function(n) { return RU ? plural(n, 'термина', 'терминов', 'терминов') : 'atama'; }
    };
    var MONTHS = { Jan: 0, January: 0, Feb: 1, February: 1, Mar: 2, March: 2, Apr: 3, April: 3, May: 4, June: 5, Jun: 5, July: 6, Jul: 6, Aug: 7, August: 7, Sept: 8, Sep: 8, September: 8, Oct: 9, October: 9, Nov: 10, November: 10, Dec: 11, December: 11 };
    var RU_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
    var RU_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
    var UZ_M = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
    var MON = '(Jan\\.?|January|Feb\\.?|February|Mar\\.?|March|Apr\\.?|April|May|June?|July?|Aug\\.?|August|Sept?\\.?|September|Oct\\.?|October|Nov\\.?|November|Dec\\.?|December)';
    var mi = function(m) { return MONTHS[m.replace('.', '')]; };
    function dayDate(m, d, y) { var k = mi(m); return RU ? d + ' ' + RU_GEN[k] + ' ' + y + ' г.' : y + '-yil ' + d + '-' + UZ_M[k]; }
    function monthDate(m, y) { var k = mi(m); return RU ? RU_NOM[k] + ' ' + y : y + '-yil ' + UZ_M[k]; }
    var reDay = new RegExp('^' + MON + ' (\\d{1,2}), (\\d{4})$'), reMonth = new RegExp('^' + MON + ' (\\d{4})$');
    var reGB = /^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec) (\d{4})$/;   // en-GB writes "Sept" in current browsers
    function date(s) {
        var m = s.match(reDay); if (m) return dayDate(m[1], m[2], m[3]);
        m = s.match(reMonth); if (m) return monthDate(m[1], m[2]);
        m = s.match(reGB); if (m) return dayDate(m[2], m[1], m[3]);
        return null;
    }
    var w = function(ru, uz) { return RU ? ru : uz; };

    /* ---- rules for text that contains changing numbers or names ---- */
    var RULES = [
        [/^(.+) — SpaceEdu$/, function(m) { return T(m[1]) + ' — SpaceEdu'; }],
        [/^Loading 3D model(?: · (\d+)%)?$/, function(m) { return w('Загрузка 3D-модели', '3D model yuklanmoqda') + (m[1] ? ' · ' + m[1] + '%' : ''); }],
        [/^(Placed|Launched|Landed) (.+)$/, function(m) { var d = date(m[2]); if (!d) return null; return ({ Placed: w('Установлен ', 'O‘rnatilgan: '), Launched: w('Запущен ', 'Uchirilgan: '), Landed: w('Посадка ', 'Qo‘ngan: ') })[m[1]] + d; }],
        [/^([\d,.]+) km$/, function(m) { return num(m[1]) + w(' км', ' km'); }],
        [/^([\d,.]+) m$/, function(m) { return num(m[1]) + w(' м', ' m'); }],
        [/^([\d.]+) seconds$/, function(m) { return num(m[1]) + w(' с', ' soniya'); }],
        [/^([\d.]+) billion km$/, function(m) { return num(m[1]) + w(' млрд км', ' mlrd km'); }],
        [/^([\d.]+) million km$/, function(m) { return num(m[1]) + w(' млн км', ' mln km'); }],
        [/^([\d.]+) billion km · ([\d.]+) AU$/, function(m) { return num(m[1]) + w(' млрд км · ', ' mlrd km · ') + num(m[2]) + w(' а. е.', ' a. b.'); }],
        [/^(\d+) h (\d+) min one way$/, function(m) { return m[1] + w(' ч ', ' soat ') + m[2] + w(' мин в одну сторону', ' daqiqa bir tomonga'); }],
        [/^≈ (\d+) h (\d+) min$/, function(m) { return '≈ ' + m[1] + w(' ч ', ' soat ') + m[2] + w(' мин', ' daqiqa'); }],
        [/^([\d.]+) km\/s \(([\d,]+) km\/h\)$/, function(m) { return num(m[1]) + w(' км/с (', ' km/s (') + num(m[2]) + w(' км/ч)', ' km/soat)'); }],
        [/^([\d,]+) days$/, function(m) { return num(m[1]) + ' ' + unit.day(m[1]); }],
        [/^([\d.]+) days$/, function(m) { return num(m[1]) + ' ' + unit.day(9); }],
        [/^([\d.]+) Earth years$/, function(m) { return num(m[1]) + w(' земных года', ' Yer yili'); }],
        [/^(\d+) years, (\d+) days$/, function(m) { return m[1] + ' ' + unit.year(m[1]) + ', ' + m[2] + ' ' + unit.day(m[2]); }],
        [/^(\d+) years(?:, (\d+) months)?$/, function(m) { return m[1] + ' ' + unit.year(m[1]) + (m[2] ? ', ' + m[2] + ' ' + unit.month(m[2]) : ''); }],
        [/^Sol ([\d,]+) \(computed from the landing time\)$/, function(m) { return w('Сол ', 'Sol ') + num(m[1]) + w(' (рассчитан от момента посадки)', ' (qo‘nish vaqtidan hisoblangan)'); }],
        [/^Sol (\d+) · ([\d.]+) m$/, function(m) { return w('Сол ', 'Sol ') + m[1] + ' · ' + num(m[2]) + w(' м', ' m'); }],
        [/^Sol (\d+) \(last known, offline\)$/, function(m) { return w('Сол ', 'Sol ') + m[1] + w(' (последнее известное, нет связи)', ' (oxirgi ma’lum, aloqa yo‘q)'); }],
        [/^([\d.]+)° ([NS]), ([\d.]+)° ([EW]) · (.+)$/, function(m) { return num(m[1]) + '° ' + (m[2] === 'N' ? w('с. ш.', 'sh. k.') : w('ю. ш.', 'j. k.')) + ', ' + num(m[3]) + '° ' + (m[4] === 'E' ? w('в. д.', 'sh. u.') : w('з. д.', 'g‘. u.')) + ' · ' + T(m[5]); }],
        [/^Latest picture from Mars · sol (\d+) · (.+)$/, function(m) { return w('Последний снимок с Марса · сол ', 'Marsdan oxirgi surat · sol ') + m[1] + ' · ' + m[2]; }],
        [/^Latest raw image from Perseverance: (.+)$/, function(m) { return w('Последний необработанный снимок Perseverance: ', 'Perseverance’ning oxirgi xom surati: ') + m[1]; }],
        [/^(\d+) of (\d+) unlocked$/, function(m) { return m[1] + w(' из ', ' / ') + m[2] + w(' открыто', ' ochilgan'); }],
        [/^Unlocked (.+)$/, function(m) { return w('Открыто ', 'Ochilgan: ') + (date(m[1]) || m[1]); }],
        [/^(\d+) records?$/, function(m) { return m[1] + ' ' + unit.record(m[1]); }],
        [/^(\d+) of (\d+) terms$/, function(m) { return m[1] + w(' из ', ' / ') + m[2] + ' ' + unit.term(m[2]); }],
        [/^(\d+) s · narrated · subtitles( ·)?$/, function(m) { return m[1] + w(' с · озвучка · субтитры', ' s · ovozli · subtitrli') + (m[2] || ''); }],
        [/^(\d+) s · sound$/, function(m) { return m[1] + w(' с · со звуком', ' s · ovozli'); }],
        [/^(\d+) points?$/, function(m) { return m[1] + ' ' + unit.point(m[1]); }],
        [/^Your best: (\d+) \/ (\d+)$/, function(m) { return w('Твой лучший результат: ', 'Eng yaxshi natijangiz: ') + m[1] + ' / ' + m[2]; }],
        [/^Best: (\d+) \/ (\d+)$/, function(m) { return w('Лучший: ', 'Eng yaxshisi: ') + m[1] + ' / ' + m[2]; }],
        [/^Next: (.+)$/, function(m) { return w('Далее: ', 'Keyingisi: ') + T(m[1]); }],
        [/^Which label fits (.+) today\?$/, function(m) { return w('Какой статус у аппарата «' + T(m[1]) + '» сегодня?', T(m[1]) + ' uchun bugun qaysi holat mos?'); }],
        [/^Which term means: “(.+)”\?$/, function(m) {
            var def = null; for (var k in DICT) { if (k.indexOf(m[1] + '.') === 0 || k === m[1]) { def = DICT[k]; break; } }
            if (!def) return null;
            var first = def.split(/\.\s/)[0].replace(/\.$/, '');
            return w('Какой термин означает: «' + first + '»?', 'Qaysi atama shuni anglatadi: “' + first + '”?');
        }],
        [/^(\d+)\. (.+)$/, function(m) { var t = T(m[2]); return t === m[2] ? null : m[1] + '. ' + t; }],
        [/^Not quite: (.+)\.$/, function(m) { return w('Не совсем: ', 'Unchalik emas: ') + T(m[1]) + '.'; }],
        [/^Read about (.+)$/, function(m) { return w('Подробнее: ', 'Batafsil: ') + T(m[1]); }],
        [/^Learn more about (.+)$/, function(m) { return w('Подробнее: ', 'Batafsil: ') + m[1]; }],
        [/^3D model of (?:the )?(.+)\. Drag, or use the arrow keys while focused, to turn it\.$/, function(m) {
            var n = T(m[1]), mid = n !== m[1] ? n.charAt(0).toLowerCase() + n.slice(1) : n;   // in Russian a translated name sits mid-sentence
            return w('3D-модель: ' + mid + '. Перетащите или нажимайте стрелки, чтобы повернуть её.', n + ' 3D modeli. Aylantirish uchun suring yoki strelka tugmalarini bosing.'); }],
        [/^Image: (.+)$/, function(m) { return w('Фото: ', 'Surat: ') + m[1]; }],
        [/^Illustration: (.+)$/, function(m) { return w('Иллюстрация: ', 'Illyustratsiya: ') + m[1]; }],
        [/^Enlarge: (.+)$/, function(m) { return w('Увеличить: ', 'Kattalashtirish: ') + T(m[1]); }],
        [/^Source: (NASA|JPL|ILRS) page \(opens in a new tab\)$/, function(m) { return w('Источник: страница ' + m[1] + ' (откроется в новой вкладке)', 'Manba: ' + m[1] + ' sahifasi (yangi oynada ochiladi)'); }],
        [/^Source: (.+)$/, function(m) { return w('Источник: ', 'Manba: ') + m[1]; }],
        [/^Source (\d+)$/, function(m) { return w('Источник ', 'Manba ') + m[1]; }],
        [/^Screen (\d+)$/, function(m) { return w('Экран ', 'Ekran ') + m[1]; }],
        [/^#(.+)$/, function(m) { var t = T(m[1]); return t === m[1] ? null : '#' + t; }],
        [/^(.+) · (Established|Interpretation|Unresolved)$/, function(m) { return T(m[1]) + ' · ' + T(m[2]); }],
        [/^Section · (.+)$/, function(m) { return w('Раздел · ', 'Bo‘lim · ') + T(m[1]); }],
        [/^(.+): sections$/, function(m) { return T(m[1]) + w(': разделы', ': bo‘limlar'); }],
        [/^Animated by SpaceEdu from (.+)\. Every frame is drawn live in your browser, with no video files or photos\. Narration uses your browser’s voice\.$/, function(m) {
            return w('Анимация SpaceEdu на основе ' + T(m[1]) + '. Каждый кадр рисуется прямо в вашем браузере, без видеофайлов и фотографий. Озвучка — голосом вашего браузера.',
                'SpaceEdu animatsiyasi, ' + T(m[1]) + ' asosida. Har bir kadr bevosita brauzeringizda chiziladi, video fayllar va suratlarsiz. Ovozlash — brauzeringiz ovozi bilan.'); }],
        [/^([\d,.]+) million km from Earth · light takes (.+)$/, function(m) { return num(m[1]) + w(' млн км от Земли · свет идёт ', ' mln km Yerdan · yorug‘lik ') + T(m[2]); }],
        [/^([\d,.]+) million km · light (.+)$/, function(m) { return num(m[1]) + w(' млн км · свет идёт ', ' mln km · yorug‘lik ') + T(m[2]); }],
        [/^(\d+) min$/, function(m) { return m[1] + w(' мин', ' daqiqa'); }],
        [/^(\d+) h (\d+) min$/, function(m) { return m[1] + w(' ч ', ' soat ') + m[2] + w(' мин', ' daqiqa'); }],
        [/^On the Moon · ([\d,]+) km from Earth · laser round trip ([\d.]+) s$/, function(m) { return w('На Луне · ', 'Oyda · ') + num(m[1]) + w(' км от Земли · лазер туда и обратно ', ' km Yerdan · lazer borib-kelishi ') + num(m[2]) + w(' с', ' s'); }],
        [/^On Mars · ([\d.]+) million km from Earth today( · still driving)?$/, function(m) { return w('На Марсе · сегодня ', 'Marsda · bugun Yerdan ') + num(m[1]) + w(' млн км от Земли', ' mln km') + (m[2] ? w(' · всё ещё ездит', ' · hali harakatlanmoqda') : ''); }],
        [/^([\d.]+) billion km from Earth · ([\d.]+) AU from the Sun · signal (.+)$/, function(m) { return num(m[1]) + w(' млрд км от Земли · ', ' mlrd km Yerdan · ') + num(m[2]) + w(' а. е. от Солнца · сигнал ', ' a. b. Quyoshdan · signal ') + T(m[3]); }],
        [/^([\d.]+) AU from Earth · its radio signal needs about (\d+) h (\d+) min (\d+) s to reach us$/, function(m) { return num(m[1]) + w(' а. е. от Земли · его радиосигнал идёт к нам около ', ' a. b. Yerdan · uning radiosignali bizga taxminan ') + m[2] + w(' ч ', ' soat ') + m[3] + w(' мин ', ' daqiqa ') + m[4] + w(' с', ' soniyada yetib keladi'); }],
        [/^(\d{4}-\d\d-\d\d) \(([+-]?\d+) days\)$/, function(m) { return m[1] + ' (' + m[2] + w(' дн.)', ' kun)'); }],
        [/^(\d+) of 10$/, function(m) { return m[1] + w(' из 10', ' / 10'); }],
        [/^Voyager 1 · (\d+) AU(?: · 35° above the planets)?$/, function(m) { return 'Voyager 1 · ' + m[1] + w(' а. е.', ' a. b.') + (m[0].indexOf('35°') > 0 ? ' · ' + T('35° above the planets') : ''); }],
        [/^(\d+) \/ (\d+) · (.+)$/, function(m) { return m[1] + ' / ' + m[2] + ' · ' + T(m[3]); }]
    ];
    function T(s) {
        if (s == null) return s;
        var k = String(s), t = k.replace(/\s+/g, ' ').trim();   // line breaks inside the HTML source do not matter
        if (!t) return s;
        var hit = DICT[t];
        if (hit == null) {
            var d = date(t); if (d) hit = d;
        }
        if (hit == null) {
            for (var i = 0; i < RULES.length; i++) {
                var m = t.match(RULES[i][0]);
                if (m) { var r = RULES[i][1](m); if (r != null) { hit = r; break; } }
            }
        }
        if (hit == null) return s;
        var lead = k.match(/^\s*/)[0], tail = k.match(/\s*$/)[0];
        return lead + hit + (tail.length && tail.length < k.length ? tail : '');
    }
    window.T = T;

    /* ---- translate the page, then everything that is added or changed later ---- */
    var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
    var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1 };
    function text(n) { var v = n.nodeValue, t = T(v); if (t !== v) n.nodeValue = t; }
    function attrs(el) { for (var i = 0; i < ATTRS.length; i++) { var v = el.getAttribute(ATTRS[i]); if (v) { var t = T(v); if (t !== v) el.setAttribute(ATTRS[i], t); } } }
    function walk(root) {
        if (root.nodeType === 3) { text(root); return; }
        if (root.nodeType !== 1 || SKIP[root.tagName]) return;
        attrs(root);
        var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, { acceptNode: function(n) { return n.nodeType === 1 && SKIP[n.tagName] ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } }), n;
        while ((n = tw.nextNode())) { if (n.nodeType === 3) text(n); else attrs(n); }
    }
    walk(document.body);
    document.title = T(document.title);
    new MutationObserver(function(ms) {
        for (var i = 0; i < ms.length; i++) {
            var m = ms[i];
            if (m.type === 'characterData') text(m.target);
            else if (m.type === 'attributes') { if (m.target.nodeType === 1) attrs(m.target); }
            else for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
        }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    var titleEl = document.querySelector('title');
    if (titleEl) new MutationObserver(function() { var t = T(document.title); if (t !== document.title) document.title = t; }).observe(titleEl, { childList: true, characterData: true, subtree: true });
})();
