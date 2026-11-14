/* SpaceEdu · 3D mission simulator (ES module, loaded by index.html on the Play page).
   Six missions, one per spacecraft, each built on what really happened: Sojourner's 12 m leash to its lander and the
   spectrometer on its back, Spirit's broken wheel and the winter it had to survive, Opportunity's battery, dusty panels
   and the 2018 storm, Perseverance's sample cores, Ingenuity and Sun glare, Voyager 1's flybys and fading power, and the
   Apollo 11 laser reflector. Real NASA 3D models are used where they exist; everything else is built here. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const PI = Math.PI, TAU = PI * 2;
const $ = s => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const LANG = window.LANG || 'en';
const L = (en, ru, uz) => LANG === 'ru' ? ru : LANG === 'uz' ? uz : en;
const Snd = window.SpaceSound;
const sfx = n => { try { Snd && Snd.game && Snd.game.sfx(n); } catch (e) {} };
const engine = v => { try { Snd && Snd.game && Snd.game.engine(v); } catch (e) {} };
const fmtTime = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

/* ---------- noise: terrain, rocks and planet surfaces ---------- */
function hash(x, y) { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, o = 5) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f, y * f); f *= 2.03; a *= .5; } return s / (1 - Math.pow(.5, o)); }
const lin = c => c.map(v => Math.pow(v, 2.2));                 // sRGB-ish design colours to the linear values WebGL lights with
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
function bake(w, h, fn) {                                       // a canvas texture painted pixel by pixel
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'), im = x.createImageData(w, h), d = im.data;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const col = fn(i / w, j / h), k = (j * w + i) * 4;
    d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = col[3] == null ? 255 : col[3];
  }
  x.putImageData(im, 0, 0); return c;
}
const seam = (f, u, v) => f(u, v) * (1 - u) + f(u - 1, v) * u; // wraps round a sphere without a join
function tex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }

/* ---------- the stage: one renderer, one composer, a fresh scene per mission ---------- */
const canvas = $('#sg-canvas');
const game = canvas && canvas.closest('.sg-game');
if (canvas && game) main();

function main() {
  const ui = { status: $('#sg-status'), msg: $('#sg-message'), name: $('#sg-mission-name'), obj: $('#sg-score'), time: $('#sg-speed'),
    start: $('#sg-start'), reset: $('#sg-reset'), pause: $('#sg-pause') };
  const mk = (tag, cls) => { const e = document.createElement(tag); e.className = cls; game.appendChild(e); return e; };
  const panel = mk('div', 'sg-panel'), mapCv = mk('canvas', 'sg-map'), toastEl = mk('div', 'sg-toast'), countEl = mk('div', 'sg-count'),
    glare = mk('div', 'sg-glare'), result = mk('div', 'sg-result');
  result.hidden = true; mapCv.width = mapCv.height = 320; result.setAttribute('role', 'dialog'); result.setAttribute('aria-live', 'polite');
  toastEl.setAttribute('aria-live', 'polite');
  const mapX = mapCv.getContext('2d');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (e) { message(L('3D NOT AVAILABLE', '3D НЕДОСТУПНО', '3D MAVJUD EMAS'), L('This browser cannot show 3D (WebGL is off).', 'Этот браузер не может показать 3D (WebGL выключен).', 'Bu brauzer 3D ko‘rsata olmaydi (WebGL o‘chiq).'), true); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .82;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const camera = new THREE.PerspectiveCamera(55, 1, .1, 6000);
  let scene = new THREE.Scene();
  const composer = new EffectComposer(renderer), rp = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .32, .4, .93);
  composer.addPass(rp); composer.addPass(bloom); composer.addPass(new OutputPass());
  const envTex = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), .04).texture;

  function resize() {
    const w = game.clientWidth, h = game.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); composer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(game);

  /* ---------- input: only while a mission is running on the Play page, so the rest of the site scrolls normally ---------- */
  const keys = {}, KEY = { arrowup: 'f', w: 'f', arrowdown: 'b', s: 'b', arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r', ' ': 'a', e: 'a', enter: 'a', shift: 'x' };
  const live = () => (state === 'play' || state === 'count') && document.documentElement.dataset.page === 'play';
  addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'p' && (state === 'play' || state === 'pause') && document.documentElement.dataset.page === 'play') { e.preventDefault(); e.stopPropagation(); togglePause(); return; }
    const m = KEY[k]; if (!m || !live()) return;
    keys[m] = true; e.preventDefault(); e.stopPropagation();   // the hero's arrow keys and the site's shortcuts stay out of the game
  }, true);
  addEventListener('keyup', e => { const m = KEY[e.key.toLowerCase()]; if (m) keys[m] = false; });
  addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
  document.querySelectorAll('.sg-touch [data-key]').forEach(b => {
    const m = KEY[b.dataset.key.toLowerCase()]; if (!m) return;
    const set = v => e => { keys[m] = v; e.preventDefault(); };
    b.addEventListener('pointerdown', set(true)); ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => b.addEventListener(t, set(false)));
  });
  const input = () => state === 'play' ? { thr: (keys.f ? 1 : 0) - (keys.b ? 1 : 0), steer: (keys.l ? 1 : 0) - (keys.r ? 1 : 0), act: !!keys.a, boost: !!keys.a } : { thr: 0, steer: 0, act: false, boost: false };
  /* drag to look around, wheel to zoom: the camera eases back behind the craft after a moment */
  let camYaw = 0, camPitch = 0, camZoom = 1, drag = null, dragIdle = 9;
  canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); canvas.focus({ preventScroll: true }); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return; camYaw -= (e.clientX - drag[0]) * .006; camPitch = clamp(camPitch + (e.clientY - drag[1]) * .004, -.35, .9); drag = [e.clientX, e.clientY]; dragIdle = 0;
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('wheel', e => { if (state !== 'play' && state !== 'idle') return; e.preventDefault(); camZoom = clamp(camZoom * (e.deltaY > 0 ? 1.08 : .93), .55, 1.8); }, { passive: false });

  /* ---------- the HUD: status, centre message, toasts, a panel of gauges and a minimap ---------- */
  function message(title, text, show) { ui.msg.innerHTML = '<b>' + title + '</b><span>' + text + '</span>'; ui.msg.style.display = show ? 'grid' : 'none'; }
  let toastT = 0;
  function toast(text, kind) { toastEl.textContent = text; toastEl.className = 'sg-toast on ' + (kind || ''); clearTimeout(toastT); toastT = setTimeout(() => { toastEl.className = 'sg-toast'; }, 3200); }
  let panelKey = '';
  function gauges(list) {                                         // [{k, v (0..1), t, warn}] and objectives [{o, done}]
    const key = list.map(g => g.o != null ? 'o' + g.o : 'g' + g.k).join('|');
    if (key !== panelKey) {
      panelKey = key;
      panel.innerHTML = list.map(g => g.o != null ? '<p class="sg-o"><i></i><span></span></p>' : '<div class="sg-g"><span class="sg-gk"></span><b></b><span class="sg-gb"><i></i></span></div>').join('');
    }
    list.forEach((g, i) => {
      const el = panel.children[i];
      if (g.o != null) { el.classList.toggle('done', !!g.done); el.querySelector('span').textContent = g.o; el.querySelector('i').textContent = g.done ? '✓' : '○'; return; }
      el.classList.toggle('warn', !!g.warn); el.querySelector('.sg-gk').textContent = g.k; el.querySelector('b').textContent = g.t == null ? '' : g.t;
      const bar = el.querySelector('.sg-gb'); bar.hidden = g.v == null; if (g.v != null) bar.firstChild.style.width = Math.round(clamp(g.v, 0, 1) * 100) + '%';
    });
  }
  const BEST_KEY = 'spaceedu.sim';
  const best = (() => { try { return JSON.parse(localStorage.getItem(BEST_KEY) || '{}') || {}; } catch (e) { return {}; } })();
  function showBest() {
    document.querySelectorAll('.sg-pick').forEach(b => {
      let s = b.querySelector('.sg-stars'); if (!s) { s = document.createElement('span'); s.className = 'sg-stars'; s.setAttribute('aria-hidden', 'true'); b.appendChild(s); }
      const n = best[b.dataset.mission] || 0; s.textContent = '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); s.classList.toggle('some', n > 0);
    });
  }
  showBest();

  /* ---------- the mission loop ---------- */
  let state = 'boot', current = null, ctl = null, W = null, token = 0, timer = 0, shakeK = 0, hudT = 0;
  const NAMES = {
    voyager: L('VOYAGER 1 · GRAND TOUR', 'VOYAGER 1 · БОЛЬШОЙ ТУР', 'VOYAGER 1 · KATTA SAYOHAT'),
    perseverance: L('PERSEVERANCE · SAMPLE RUN', 'PERSEVERANCE · СБОР ОБРАЗЦОВ', 'PERSEVERANCE · NAMUNA YIG‘ISH'),
    spirit: L('SPIRIT · BEFORE WINTER', 'SPIRIT · ДО ЗИМЫ', 'SPIRIT · QISHDAN OLDIN'),
    opportunity: L('OPPORTUNITY · MARATHON', 'OPPORTUNITY · МАРАФОН', 'OPPORTUNITY · MARAFON'),
    sojourner: L('SOJOURNER · FIRST ROVER', 'SOJOURNER · ПЕРВЫЙ РОВЕР', 'SOJOURNER · BIRINCHI ROVER'),
    apollo: L('APOLLO 11 · LASER RANGING', 'APOLLO 11 · ЛАЗЕРНАЯ ЛОКАЦИЯ', 'APOLLO 11 · LAZER O‘LCHASH')
  };
  function setStatus(t) { ui.status.textContent = t; }
  function disposeScene(sc) {
    sc.traverse(o => {
      if (o.userData.keep) return;
      if (o.geometry) o.geometry.dispose();
      (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => {
        Object.values(m).forEach(v => { if (v && v.isTexture && v !== envTex) v.dispose(); });
        if (m.uniforms) Object.values(m.uniforms).forEach(u => { if (u.value && u.value.isTexture) u.value.dispose(); });
        m.dispose();
      });
    });
  }
  async function select(id) {
    const my = ++token;
    if (ctl && ctl.stop) ctl.stop();
    ctl = null; current = id; state = 'loading'; timer = 0; camYaw = 0; camPitch = 0; camZoom = 1; engine(0);
    result.hidden = true; glare.style.opacity = 0; panel.innerHTML = ''; panelKey = ''; mapCv.hidden = false;
    document.querySelectorAll('.sg-pick').forEach(b => { b.classList.toggle('active', b.dataset.mission === id); b.setAttribute('aria-pressed', b.dataset.mission === id); });
    ui.name.textContent = NAMES[id]; ui.obj.textContent = '–'; ui.time.textContent = '0:00';
    ui.start.textContent = L('▶ START MISSION', '▶ НАЧАТЬ МИССИЮ', '▶ MISSIYANI BOSHLASH'); ui.pause.textContent = L('Ⅱ PAUSE', 'Ⅱ ПАУЗА', 'Ⅱ PAUZA');
    setStatus(L('LOADING', 'ЗАГРУЗКА', 'YUKLANMOQDA'));
    message(L('PREPARING THE MISSION', 'ПОДГОТОВКА МИССИИ', 'MISSIYA TAYYORLANMOQDA'), L('Building the world…', 'Строим мир…', 'Dunyo qurilmoqda…'), true);
    const old = scene; scene = new THREE.Scene(); scene.environment = envTex; rp.scene = scene; disposeScene(old); camera.fov = 55; camera.updateProjectionMatrix(); bloom.strength = .32; renderer.toneMappingExposure = .82;
    W = world(my);
    await new Promise(r => setTimeout(r, 30));                    // let the message paint before the heavy building
    try {
      const c = await MISSIONS[id](W);
      if (my !== token) { c && c.stop && c.stop(); return; }
      ctl = c; state = 'idle'; mapCv.hidden = !c.map; setStatus(L('READY TO LAUNCH', 'ГОТОВ К СТАРТУ', 'STARTGA TAYYOR'));
      message(c.brief[0], c.brief[1], true);
    } catch (err) {
      if (my !== token) return;
      console.error(err);
      state = 'error'; setStatus(L('OFFLINE', 'НЕТ СЕТИ', 'TARMOQ YO‘Q'));
      message(L('COULD NOT LOAD', 'НЕ УДАЛОСЬ ЗАГРУЗИТЬ', 'YUKLAB BO‘LMADI'), L('The NASA 3D model needs an internet connection. Check it and press RESET.', 'Для 3D-модели NASA нужен интернет. Проверьте подключение и нажмите СБРОС.', 'NASA 3D modeli uchun internet kerak. Ulanishni tekshirib, QAYTA tugmasini bosing.'), true);
    }
  }
  function start() {
    if (state === 'done') { select(current).then(() => start()); return; }
    if (state !== 'idle' || !ctl) return;
    state = 'count'; dragIdle = 9; message('', '', false); setStatus(L('COUNTDOWN', 'ОТСЧЁТ', 'SANOQ')); canvas.focus({ preventScroll: true });
    let n = 3; const tick = () => {
      if (state !== 'count') return;
      if (n > 0) { countEl.textContent = n; countEl.className = 'sg-count on'; sfx('tick'); n--; setTimeout(tick, 750); }
      else {
        countEl.textContent = ctl.go || L('GO!', 'ВПЕРЁД!', 'OLG‘A!'); countEl.className = 'sg-count on go'; sfx('go');
        setTimeout(() => { countEl.className = 'sg-count'; }, 700);
        state = 'play'; setStatus(L('MISSION ACTIVE', 'МИССИЯ ИДЁТ', 'MISSIYA DAVOM ETMOQDA')); ctl.begin && ctl.begin();
      }
    };
    tick();
  }
  function togglePause() {
    if (state === 'play') { state = 'pause'; engine(0); ui.pause.textContent = L('▶ RESUME', '▶ ПРОДОЛЖИТЬ', '▶ DAVOM'); setStatus(L('PAUSED', 'ПАУЗА', 'PAUZA')); message(L('PAUSED', 'ПАУЗА', 'PAUZA'), L('Press RESUME or P to continue.', 'Нажмите ПРОДОЛЖИТЬ или P.', 'DAVOM yoki P tugmasini bosing.'), true); }
    else if (state === 'pause') { state = 'play'; ui.pause.textContent = L('Ⅱ PAUSE', 'Ⅱ ПАУЗА', 'Ⅱ PAUZA'); setStatus(L('MISSION ACTIVE', 'МИССИЯ ИДЁТ', 'MISSIYA DAVOM ETMOQDA')); message('', '', false); canvas.focus({ preventScroll: true }); }
  }
  /* the end of a mission: stars, what you did, and what really happened */
  function finish(stars, title, stats, real) {
    if (state === 'done') return;
    state = 'done'; engine(0); glare.style.opacity = 0;
    const isNew = stars > (best[current] || 0);
    if (isNew) { best[current] = stars; try { localStorage.setItem(BEST_KEY, JSON.stringify(best)); } catch (e) {} showBest(); }
    sfx(stars >= 2 ? 'win' : stars === 1 ? 'ok' : 'fail');
    setStatus(stars ? L('MISSION COMPLETE', 'МИССИЯ ВЫПОЛНЕНА', 'MISSIYA BAJARILDI') : L('MISSION OVER', 'МИССИЯ ОКОНЧЕНА', 'MISSIYA TUGADI'));
    const order = ['voyager', 'perseverance', 'spirit', 'opportunity', 'sojourner', 'apollo'], next = order[(order.indexOf(current) + 1) % order.length];
    const OBJ = { voyager: 'voyager', perseverance: 'perseverance', spirit: 'spirit', opportunity: 'opportunity', sojourner: 'sojourner', apollo: 'apollo' };
    result.innerHTML = '<div class="sg-rcard"><p class="sg-rstars" aria-label="' + stars + ' / 3">' + [0, 1, 2].map(i => '<i class="' + (i < stars ? 'on' : '') + '" style="--d:' + (i * .18) + 's">★</i>').join('') + '</p>' +
      '<h3>' + title + '</h3><p class="sg-rstats">' + stats + ' · ' + L('time', 'время', 'vaqt') + ' ' + fmtTime(timer) + (isNew && stars ? ' · <b>' + L('new best!', 'новый рекорд!', 'yangi rekord!') + '</b>' : '') + '</p>' +
      '<div class="sg-real"><b>' + L('What really happened', 'Как было на самом деле', 'Aslida nima bo‘lgan') + '</b><p>' + real + '</p></div>' +
      '<div class="sg-racts"><button type="button" class="x-btn solid" data-sg="again">' + L('↻ Play again', '↻ Ещё раз', '↻ Yana o‘ynash') + '</button>' +
      '<button type="button" class="x-btn" data-sg="next" data-next="' + next + '">' + L('Next mission →', 'Следующая миссия →', 'Keyingi missiya →') + '</button>' +
      '<button type="button" class="x-btn" data-open="' + OBJ[current] + '">' + L('Read the full story', 'Вся история', 'To‘liq hikoya') + '</button></div></div>';
    result.hidden = false;
    const first = result.querySelector('[data-sg="again"]'); if (first) first.focus({ preventScroll: true });
  }
  result.addEventListener('click', e => {
    const b = e.target.closest('[data-sg]'); if (!b) return;
    if (b.dataset.sg === 'again') select(current).then(start);
    else select(b.dataset.next);
  });
  document.querySelectorAll('.sg-pick').forEach(b => b.addEventListener('click', () => select(b.dataset.mission)));
  ui.start.addEventListener('click', start);
  ui.reset.addEventListener('click', () => select(current));
  ui.pause.addEventListener('click', togglePause);
  document.addEventListener('spaceedu:page', e => { if (e.detail.page !== 'play' && state === 'play') togglePause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });

  /* render only while the game is on screen */
  let onScreen = true; new IntersectionObserver(es => { onScreen = es[0].isIntersecting; }).observe(game);
  const visible = () => onScreen && !document.hidden && document.documentElement.dataset.page === 'play';
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = clamp((now - last) / 1000, 0, .05); last = now;
    if (game.dataset.state !== state) game.dataset.state = state;   // the CSS hides the gauges while the briefing is up
    if (!visible()) { engine(0); return; }
    if (ctl) {
      const playing = state === 'play';
      if (playing) timer += dt;
      ctl.update(dt, playing, input(), state);
      if (shakeK > 0) { camera.position.x += (Math.random() - .5) * shakeK; camera.position.y += (Math.random() - .5) * shakeK; shakeK = Math.max(0, shakeK - dt * 2.5); }
      hudT += dt;
      if (hudT > .1) { hudT = 0; ui.time.textContent = fmtTime(timer); ctl.hud && ctl.hud(); if (ctl.map) drawMap(); }
    }
    composer.render(dt);
  }
  requestAnimationFrame(frame);
  function drawMap() {
    const g = mapX, S = 320; g.clearRect(0, 0, S, S);
    g.save(); g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 4, 0, TAU); g.clip();
    g.fillStyle = 'rgba(4,12,26,.82)'; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(121,220,232,.12)'; g.lineWidth = 2; for (let r = 40; r < S / 2; r += 40) { g.beginPath(); g.arc(S / 2, S / 2, r, 0, TAU); g.stroke(); }
    ctl.map(g, S);
    g.restore();
    g.strokeStyle = 'rgba(121,220,232,.5)'; g.lineWidth = 3; g.beginPath(); g.arc(S / 2, S / 2, S / 2 - 4, 0, TAU); g.stroke();
  }

  /* ---------- world helpers shared by the missions ---------- */
  function world(my) {
    const W = { scene, camera, renderer, keys, toast, gauges, finish: (...a) => { if (my === token) finish(...a); }, alive: () => my === token,
      shake: k => { shakeK = Math.max(shakeK, k); }, timer: () => timer, glare: v => { glare.style.opacity = v; }, setObj: t => { ui.obj.textContent = t; },
      add: o => { scene.add(o); return o; }, bloom, h: () => 0, message };
    /* a follow camera with a spring, drag-to-look and wheel zoom */
    const want = new THREE.Vector3(), look = new THREE.Vector3(); let camH = null;
    W.chase = (dt, pos, heading, o) => {
      /* the camera turns round the craft on an arc, so a sudden change of direction never swings it through the model */
      if (camH === null) camH = heading;
      camH += Math.atan2(Math.sin(heading - camH), Math.cos(heading - camH)) * (1 - Math.exp(-dt * 2.2)); heading = camH;
      camYaw = Math.atan2(Math.sin(camYaw), Math.cos(camYaw));   // keep the orbit angle short, so it always unwinds the near way
      dragIdle += dt; if (!drag && dragIdle > 1.6 && state !== 'idle' && state !== 'done') { camYaw *= Math.pow(.02, dt); camPitch *= Math.pow(.02, dt); }
      if (state === 'idle' || state === 'done') camYaw += dt * .12;
      const yaw = heading + PI + camYaw, d = o.dist * camZoom * (camera.aspect < 1 ? 1.5 : 1), up = o.height * camZoom + camPitch * d;   // portrait screens: step back
      want.set(pos.x + Math.sin(yaw) * d, pos.y + up, pos.z + Math.cos(yaw) * d);
      if (o.ground) want.y = Math.max(want.y, o.ground(want.x, want.z) + 1.4);
      camera.position.lerp(want, 1 - Math.exp(-dt * (o.k || 3.5)));
      look.set(pos.x, pos.y + (o.look || 1), pos.z); camera.lookAt(look);
    };
    return W;
  }

  /* ---------- MARS AND MOON: terrain, sky, mountains, rocks, dust, tracks, beacons ---------- */
  function sky(W, top, hor, sunDir, halo, stars) {
    const m = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(top) }, hor: { value: new THREE.Color(hor) }, halo: { value: new THREE.Color(halo) }, sun: { value: sunDir.clone().normalize() }, stars: { value: stars || 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `uniform vec3 top, hor, halo, sun; uniform float stars; varying vec3 vP;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
        void main(){ vec3 d = normalize(vP); float h = clamp(d.y, 0., 1.);
          vec3 c = mix(hor, top, pow(h, .55)); float s = max(dot(d, sun), 0.);
          c += halo * pow(s, 6.) * .4 + vec3(1., .96, .88) * pow(s, 900.) * 3. + vec3(1., .9, .75) * pow(s, 60.) * .15;
          if (stars > 0.) { vec3 q = floor(d * 380.); float st = step(.9975, h3(q)) * smoothstep(-.05, .2, d.y); c += st * stars * (.5 + .5 * h3(q + 3.)); }
          gl_FragColor = vec4(c, 1.); }`
    });
    const s = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 18), m); s.renderOrder = -10; W.add(s); return s;
  }
  function terrain(W, size, seg, hfn, colfn, detail) {
    const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-PI / 2);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, hfn(p.getX(i), p.getZ(i)));
    geo.computeVertexNormals();
    const n = geo.attributes.normal, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const c = lin(colfn(p.getX(i), p.getZ(i), p.getY(i), 1 - n.getY(i))); col.set(c, i * 3); }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dt = tex(bake(256, 256, (u, v) => { const k = 205 + fbm(u * 24, v * 24, 4) * 50 + (hash(Math.floor(u * 256), Math.floor(v * 256)) - .5) * 26; return [k, k, k]; }), false);
    dt.wrapS = dt.wrapT = THREE.RepeatWrapping; dt.repeat.set(size / (detail || 7), size / (detail || 7));
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, map: dt, roughness: 1, metalness: 0 }));
    mesh.receiveShadow = true; W.add(mesh); return mesh;
  }
  function mountains(W, radius, color, seed) {                     // a ring of distant hills, softened by the haze
    const c = document.createElement('canvas'); c.width = 2048; c.height = 256; const g = c.getContext('2d');
    [[.55, .9, 'rgba(255,255,255,.55)'], [.35, 1, 'rgba(255,255,255,1)']].forEach(([amp, sc, fs], layer) => {
      g.fillStyle = fs; g.beginPath(); g.moveTo(0, 256);
      for (let x = 0; x <= 2048; x += 8) { const u = x / 2048; g.lineTo(x, 256 - (seam((a) => fbm(a * 9 * sc + seed + layer * 7, layer * 3 + seed, 5), u, 0) * amp + .08) * 230); }
      g.lineTo(2048, 256); g.fill();
    });
    const t = tex(c); const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 150, 64, 1, true), new THREE.MeshBasicMaterial({ map: t, color, transparent: true, side: THREE.BackSide, depthWrite: false }));
    m.position.y = 50; W.add(m); return m;
  }
  function rockGeo(seed, detail = 2) {
    const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), s = .72 + fbm(x * 1.7 + seed, y * 1.7 + z * 1.3 + seed * 2, 3) * .6;
      p.setXYZ(i, x * s, y * s * .62, z * s);
    }
    g.computeVertexNormals(); return g;
  }
  /* many rocks in a few draw calls; the big ones become obstacles */
  function rocks(W, n, area, h, color, avoid, obs, seed) {
    const variants = [0, 1, 2].map(k => new THREE.InstancedMesh(rockGeo(seed + k * 13), new THREE.MeshStandardMaterial({ color, roughness: .95, flatShading: true }), Math.ceil(n / 3)));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), cnt = [0, 0, 0];
    let r = seed * 99 + 1; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n; i++) {
      const x = (rnd() - .5) * area, z = (rnd() - .5) * area, big = rnd() < .12, s = big ? 1.2 + rnd() * 1.6 : .15 + rnd() * rnd() * .9;
      if (avoid.some(a => Math.hypot(x - a.x, z - a.z) < (a.r || 6) + s)) continue;
      const k = i % 3; if (cnt[k] >= variants[k].count) continue;
      e.set(rnd() * .4, rnd() * TAU, rnd() * .4); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(x, h(x, z) + s * .12, z), q, new THREE.Vector3(s * (1 + rnd() * .5), s, s * (1 + rnd() * .5)));
      variants[k].setMatrixAt(cnt[k]++, m4);
      if (big && obs) obs.push({ x, z, r: s * 1.1 });
    }
    variants.forEach((v, k) => { v.count = cnt[k]; v.castShadow = v.receiveShadow = true; v.instanceMatrix.needsUpdate = true; W.add(v); });
  }
  function softDot() { return tex(bake(64, 64, (u, v) => { const d = Math.hypot(u - .5, v - .5) * 2; return [255, 255, 255, clamp(1 - d, 0, 1) ** 2 * 255]; }), false); }
  /* particles with their own fade and size: wheel dust, dust devils, solar wind */
  function particles(W, max, color, opts = {}) {
    const geo = new THREE.BufferGeometry(), pos = new Float32Array(max * 3), al = new Float32Array(max), sz = new Float32Array(max);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('alpha', new THREE.BufferAttribute(al, 1)); geo.setAttribute('size', new THREE.BufferAttribute(sz, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { color: { value: new THREE.Color(color) }, op: { value: opts.op || .6 } }, transparent: true, depthWrite: false, blending: opts.add ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: 'attribute float alpha; attribute float size; varying float vA; void main(){ vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = size * (340. / -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 color; uniform float op; varying float vA; void main(){ float d = length(gl_PointCoord - .5); float a = smoothstep(.5, .0, d) * vA * op; if (a < .004) discard; gl_FragColor = vec4(color, a); }'
    });
    const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; W.add(pts);
    const P = Array.from({ length: max }, () => ({ life: 0, max: 1, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, s: 1 })); let head = 0;
    return {
      mat,
      emit(x, y, z, vx, vy, vz, life, s) { const p = P[head]; head = (head + 1) % max; Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, s }); },
      update(dt, drag = .97, grav = 0) {
        for (let i = 0; i < max; i++) {
          const p = P[i];
          if (p.life > 0) { p.life -= dt; p.vx *= drag; p.vz *= drag; p.vy = p.vy * drag - grav * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; const k = p.life / p.max; al[i] = Math.min(1, k * (1 - k) * 4.5); sz[i] = p.s * (1.6 - k * .8); }
          else al[i] = 0;
          pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.alpha.needsUpdate = true; geo.attributes.size.needsUpdate = true;
      }
    };
  }
  function tracks(W, color, opacity, max = 900, width = .3) {      // wheel tracks pressed into the soil
    const g = new THREE.PlaneGeometry(width, .62); g.rotateX(-PI / 2);
    const m = new THREE.InstancedMesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), max);
    m.count = 0; m.frustumCulled = false; W.add(m);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3(); let i = 0;
    return { add(x, y, z, h) { q.setFromAxisAngle(up, h); m4.compose(v.set(x, y + .03, z), q, one); m.setMatrixAt(i, m4); i = (i + 1) % max; m.count = Math.max(m.count, i === 0 ? max : i); m.instanceMatrix.needsUpdate = true; } };
  }
  function label(text, color = '#e8fbff') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 96; const g = c.getContext('2d');
    g.font = '700 40px "Hanken Grotesk", system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = Math.min(500, g.measureText(text).width + 40);
    g.fillStyle = 'rgba(3,10,24,.72)'; g.beginPath(); if (g.roundRect) g.roundRect(256 - w / 2, 12, w, 72, 36); else g.rect(256 - w / 2, 12, w, 72); g.fill();
    g.fillStyle = color; g.fillText(text, 256, 49);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex(c), transparent: true, depthWrite: false, fog: false })); s.scale.set(8, 1.5, 1); return s;
  }
  /* a target: a ring on the ground, a beam of light, a turning crystal and a name tag */
  function beacon(W, x, z, y, color, name, hidden) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const col = new THREE.Color(color);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.6, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .9, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    ring.rotation.x = -PI / 2; ring.position.y = .15;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(.5, 1.1, 70, 24, 1, true), new THREE.ShaderMaterial({
      uniforms: { color: { value: col }, t: { value: 0 }, op: { value: .32 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: 'uniform vec3 color; uniform float t, op; varying vec2 vU; void main(){ float a = pow(1. - vU.y, 2.2) * op * (.75 + .25 * sin(vU.y * 40. - t * 4.)); gl_FragColor = vec4(color, a); }'
    }));
    beam.position.y = 35;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(.75), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.2, roughness: .2, metalness: .3 }));
    gem.position.y = 4.2;
    const tag = label(name); tag.position.y = 6.4;
    g.add(ring, beam, gem, tag); W.add(g);
    const b = { g, x, z, name, done: false, show: !hidden, fade: 1 };
    g.visible = b.show;
    b.update = (dt, t) => {
      beam.material.uniforms.t.value = t; gem.rotation.y += dt * 1.6; gem.position.y = 4.2 + Math.sin(t * 2 + x) * .3;
      const k = 1 + .12 * Math.sin(t * 4); ring.scale.set(k, k, 1);
      if (b.done) { b.fade = Math.max(0, b.fade - dt * 1.5); beam.material.uniforms.op.value = .32 * b.fade; ring.material.opacity = .9 * b.fade; gem.scale.setScalar(Math.max(.001, b.fade)); tag.material.opacity = b.fade; if (!b.fade) g.visible = false; }
    };
    b.complete = () => { b.done = true; };
    b.reveal = () => { b.show = true; g.visible = true; };
    return b;
  }
  function marsLight(W, sunDir, color = 0xffe2c4, k = 2.4) {
    const sun = new THREE.DirectionalLight(color, k); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 260 }); sun.shadow.bias = -.0004; sun.shadow.normalBias = .03;
    W.add(sun); W.add(sun.target);
    const hemi = new THREE.HemisphereLight(0xc8a488, 0x2c180f, .55); W.add(hemi);
    W.follow = (x, y, z) => { sun.position.set(x + sunDir.x * 120, y + sunDir.y * 120, z + sunDir.z * 120); sun.target.position.set(x, y, z); };
    return { sun, hemi };
  }
  /* a Martian valley: sky, haze, mountains, ground, rocks */
  function mars(W, o) {
    const sunDir = o.sun || new THREE.Vector3(.5, .55, .35).normalize();
    W.scene.fog = new THREE.FogExp2(o.fog || 0x9a7a60, o.density || .0042);
    W.sky = sky(W, o.top || 0x6e4632, o.hor || 0xb08466, sunDir, o.halo || 0x4f6f9e, 0);
    mountains(W, 620, o.hills || 0xb88a68, o.seed || 1);
    W.h = o.h;
    W.ground = terrain(W, o.size || 700, o.seg || 220, o.h, o.color, 7);
    W.light = marsLight(W, sunDir, o.sunColor, o.sunK);
    W.sunDir = sunDir;
    return W;
  }
  const marsColor = (seed, extra) => (x, z, y, slope) => {
    const n = fbm(x * .018 + seed, z * .018, 4), m = fbm(x * .11, z * .11 + seed, 3);
    let c = mix3([.36, .19, .12], [.7, .41, .25], smooth(.28, .72, n));
    c = mix3(c, [.82, .56, .37], smooth(.56, .82, m) * .45);
    c = c.map(v => v * (1 - Math.min(slope * 2.6, .5)));
    return extra ? extra(c, x, z, y, slope) : c;
  };
  const crater = (x, z, c) => {                                   // a bowl with a raised rim
    const d = Math.hypot(x - c.x, z - c.z) / c.r; if (d > 1.6) return 0;
    return (d < 1 ? -c.d * (1 - d * d) : 0) + c.d * .38 * Math.exp(-Math.pow((d - 1) / .2, 2));
  };

  /* ---------- the rovers and their gear ---------- */
  const cache = new Map();
  const URL = { mer: 'https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/gltf_files/24883_MER_static.glb',
    per: 'https://assets.science.nasa.gov/content/dam/science/psd/mars/resources/gltf_files/25042_Perseverance.glb',
    voy: 'https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/v/Voyager.glb' };
  function glb(W, key) {
    if (!cache.has(key)) cache.set(key, new Promise((ok, no) => new GLTFLoader().load(URL[key], g => {
      g.scene.traverse(o => { (Array.isArray(o.material) ? o.material : o.material ? [o.material] : []).forEach(m => { if (m.roughness != null) m.roughness = Math.max(m.roughness, .5); if (m.metalness != null) m.metalness = Math.min(m.metalness, .6); }); });   // no mirror glare under the Martian Sun
      ok(g.scene);
    }, e => {
      const total = e.total || ({ mer: 11910084, per: 11687880, voy: 3128204 })[key];
      if (W.alive()) W.message(L('DOWNLOADING THE NASA 3D MODEL', 'ЗАГРУЗКА 3D-МОДЕЛИ NASA', 'NASA 3D MODELI YUKLANMOQDA'), Math.round(Math.min(.99, e.loaded / total) * 100) + '%', true);
    }, no)).catch(err => { cache.delete(key); throw err; }));
    return cache.get(key);
  }
  /* scale a model to a length, put it on the ground and face it along +z (the way the game drives) */
  function fit(obj, len, turn) {
    obj.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(obj), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
    const outer = new THREE.Group(), inner = new THREE.Group(); inner.add(obj); obj.position.set(-c.x, -bb.min.y, -c.z); outer.add(inner);
    inner.scale.setScalar(len / Math.max(sz.x, sz.z)); inner.rotation.y = turn || 0;
    outer.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.frustumCulled = false; } });
    return outer;
  }
  async function nasaModel(W, key, len, turn) {
    const src = await glb(W, key); const m = src.clone(true); m.traverse(o => { o.userData.keep = true; });
    return fit(m, len, turn);
  }
  const MAT = () => ({
    alu: new THREE.MeshStandardMaterial({ color: 0xc8ccd3, metalness: .85, roughness: .32 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x8d929b, metalness: .8, roughness: .45 }),
    body: new THREE.MeshStandardMaterial({ color: 0xdcd8cd, metalness: .25, roughness: .55 }),
    black: new THREE.MeshStandardMaterial({ color: 0x15171c, metalness: .2, roughness: .6 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: .32 }),
    white: new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: .85 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xd8e8ff, metalness: 1, roughness: .04, clearcoat: 1 })
  });
  const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  function strut(a, b, t, m) { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), s = box(t, t, A.distanceTo(B), m); s.position.copy(A).add(B).multiplyScalar(.5); s.lookAt(B); return s; }
  function solarTex(cols = 8, rows = 12) {
    const c = document.createElement('canvas'); c.width = 256; c.height = 384; const x = c.getContext('2d'); x.fillStyle = '#9aa0a8'; x.fillRect(0, 0, 256, 384);
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) { x.fillStyle = (i + j) % 2 ? '#1c2b55' : '#1a274d'; x.fillRect(i * 32 + 2, j * 32 + 2, 28, 28); }
    return tex(c);
  }
  /* Sojourner, from NASA's dimensions: 65 x 48 x 30 cm, six 13 cm wheels on a rocker-bogie */
  function buildSojourner() {
    const M = MAT(), g = new THREE.Group(), wheels = [];
    const wheelGeo = new THREE.CylinderGeometry(.065, .065, .07, 28);
    [-.215, .215].forEach(x => [-.24, -.02, .22].forEach(z => {
      const w = new THREE.Group(), tire = new THREE.Mesh(wheelGeo, M.alu); tire.rotation.z = PI / 2; w.add(tire);
      for (let k = 0; k < 12; k++) { const cl = box(.074, .008, .012, M.dark), a = k / 12 * TAU; cl.position.set(0, Math.cos(a) * .066, Math.sin(a) * .066); cl.rotation.x = a; w.add(cl); }
      w.position.set(x, .065, z); g.add(w); wheels.push(w);
    }));
    [-1, 1].forEach(sd => { const x = .215 * sd, xi = .17 * sd;
      g.add(strut([x, .065, -.24], [xi, .17, -.04], .016, M.dark), strut([xi, .17, -.04], [xi, .12, .1], .016, M.dark), strut([xi, .12, .1], [x, .065, -.02], .014, M.dark), strut([xi, .12, .1], [x, .065, .22], .014, M.dark)); });
    const body = box(.3, .085, .42, M.body); body.position.set(0, .19, 0); g.add(body);
    const foil = box(.302, .02, .422, M.gold); foil.position.set(0, .145, 0); g.add(foil);
    const pm = new THREE.MeshStandardMaterial({ map: solarTex(), metalness: .25, roughness: .4 });
    const panel = new THREE.Mesh(new THREE.BoxGeometry(.36, .012, .55), [M.alu, M.alu, pm, M.alu, M.alu, M.alu]); panel.position.set(0, .245, -.01); g.add(panel);
    [[-.05, .2, .215], [.05, .2, .215]].forEach(p => { const c = box(.035, .03, .02, M.black); c.position.set(...p); g.add(c); });
    g.add(strut([.14, .25, -.24], [.14, .4, -.24], .007, M.alu));
    g.add(strut([0, .17, -.21], [0, .11, -.29], .014, M.dark));
    const apxs = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .05, 18), M.gold); apxs.position.set(0, .095, -.305); apxs.rotation.x = .5; g.add(apxs);
    g.userData.wheels = wheels;
    return g;
  }
  /* the Mars Pathfinder lander: petals of solar cells opened on the ground, airbags pulled in, the camera mast up */
  function buildPathfinder() {
    const M = MAT(), g = new THREE.Group(), pm = new THREE.MeshStandardMaterial({ map: solarTex(), metalness: .3, roughness: .4 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.25, .7, 3), M.dark); base.position.y = .45; g.add(base);
    for (let k = 0; k < 3; k++) {
      const a = k / 3 * TAU + PI / 6, petal = new THREE.Mesh(new THREE.BoxGeometry(2.2, .07, 1.8), [M.alu, M.alu, pm, M.alu, M.alu, M.alu]);
      petal.position.set(Math.cos(a) * 1.9, .18, Math.sin(a) * 1.9); petal.rotation.y = -a; g.add(petal);
      for (let j = 0; j < 3; j++) { const bag = new THREE.Mesh(new THREE.SphereGeometry(.42, 16, 10), M.white); bag.scale.set(1.2, .45, 1); bag.position.set(Math.cos(a + (j - 1) * .5) * 3.1, .12, Math.sin(a + (j - 1) * .5) * 3.1); g.add(bag); }
    }
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1.6, 10), M.alu); mast.position.y = 1.5; g.add(mast);
    const head = box(.42, .24, .26, M.body); head.position.y = 2.35; g.add(head);
    [-.1, .1].forEach(x => { const l = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .05, 14), M.black); l.rotation.x = PI / 2; l.position.set(x, 2.35, .14); g.add(l); });
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(.2, .02, .25, 16), M.alu); ant.position.set(.6, 1.1, .2); g.add(ant);
    [-.25, .25].forEach(x => g.add(strut([x + 1.2, .25, -1.6], [x + 1.6, .02, -2.8], .06, M.alu)));
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return g;
  }
  function buildIngenuity() {
    const M = MAT(), g = new THREE.Group();
    const body = box(.4, .3, .4, M.gold); body.position.y = .55; g.add(body);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([x, z]) => g.add(strut([x * .16, .45, z * .16], [x * .55, 0, z * .55], .03, M.alu)));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .9, 8), M.alu); mast.position.y = 1.1; g.add(mast);
    const rotors = [1.0, 1.25].map(y => { const r = new THREE.Group(); [0, PI / 2].forEach(a => { const b = box(2.4, .02, .14, M.dark); b.rotation.y = a; r.add(b); }); r.position.y = y; g.add(r); return r; });
    const pm = new THREE.MeshStandardMaterial({ map: solarTex(), metalness: .3, roughness: .4 }); const sp = box(.8, .03, .45, pm); sp.position.y = 1.58; g.add(sp);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    g.userData.rotors = rotors; return g;
  }
  /* driving: speed with momentum, slopes, skid-steering, rocks, terrain-following tilt, dust and tracks */
  function rover(W, model, o) {
    const s = { x: o.x || 0, z: o.z || 0, h: o.h || 0, v: 0, y: 0, pitch: 0, roll: 0, odo: 0, sink: 0, mark: 0, hitT: 0 };
    const half = o.len / 2, side = o.wid / 2, dust = particles(W, 380, o.dust || 0xc9946a, { op: .55 }), trk = tracks(W, o.track || 0x4a2a1a, .2, 1100, o.len * .11);
    const fwd = new THREE.Vector3(), left = new THREE.Vector3();
    s.dust = dust; s.tracks = trk;
    function place(dt) {
      fwd.set(Math.sin(s.h), 0, Math.cos(s.h)); left.set(Math.cos(s.h), 0, -Math.sin(s.h));
      const hf = W.h(s.x + fwd.x * half, s.z + fwd.z * half), hb = W.h(s.x - fwd.x * half, s.z - fwd.z * half);
      const hl = W.h(s.x + left.x * side, s.z + left.z * side), hr = W.h(s.x - left.x * side, s.z - left.z * side);
      const k = Math.min(1, dt * 8);
      s.y = lerp(s.y, (hf + hb + hl + hr) / 4, k); s.pitch = lerp(s.pitch, Math.atan2(hf - hb, o.len), k); s.roll = lerp(s.roll, Math.atan2(hl - hr, o.wid), k);
      model.position.set(s.x, s.y - s.sink, s.z); model.rotation.set(-s.pitch, s.h, s.roll, 'YXZ');
      return (hf - hb) / o.len;
    }
    s.snap = () => { s.y = W.h(s.x, s.z); place(1); };
    s.step = (dt, inp, mod = {}) => {
      const max = o.max * (mod.maxMul == null ? 1 : mod.maxMul);
      const thr = inp.thr < 0 ? inp.thr * (mod.rev == null ? .6 : mod.rev) : inp.thr;
      s.v += (thr * max - s.v) * Math.min(1, dt * (o.acc || 1.6));
      const grade = place(dt);
      if (thr) s.v -= grade * 5 * dt;                            // hills slow you while driving; with no throttle the brakes hold
      const dir = s.v >= -.05 || o.travelSteer ? 1 : -1;        // reversing steers like a car, unless the camera looks the way the rover travels
      s.h += inp.steer * o.turn * dt * Math.min(1, Math.abs(s.v) / 1.6 + .3) * dir + (mod.drift || 0) * dt;
      s.x += Math.sin(s.h) * s.v * dt; s.z += Math.cos(s.h) * s.v * dt;
      s.hitT -= dt;
      for (const b of (o.obs || [])) {
        const dx = s.x - b.x, dz = s.z - b.z, d = Math.hypot(dx, dz), m = b.r + o.rad;
        if (d < m && d > 0) { s.x = b.x + dx / d * m; s.z = b.z + dz / d * m; if (Math.abs(s.v) > 1 && s.hitT <= 0) { W.shake(.18); sfx('bump'); s.hitT = .6; } s.v *= -.2; }
      }
      const r = Math.hypot(s.x, s.z - (o.cz || 0)); if (o.bound && r > o.bound) { s.x *= o.bound / r; s.z = (o.cz || 0) + (s.z - (o.cz || 0)) * o.bound / r; s.v *= .3; }
      const moved = Math.abs(s.v) * dt; s.odo += moved; s.mark += moved;
      if (s.mark > .5) {
        s.mark = 0;
        [1, -1].forEach(sd => { const tx = s.x + left.x * side * .8 * sd, tz = s.z + left.z * side * .8 * sd; (mod.trackSet || trk).add(tx, W.h(tx, tz), tz, s.h); });
      }
      if (Math.abs(s.v) > .7) for (let i = 0; i < 2; i++) {
        const sd = i ? 1 : -1, bx = s.x - fwd.x * half * Math.sign(s.v) + left.x * side * sd, bz = s.z - fwd.z * half * Math.sign(s.v) + left.z * side * sd;
        if (Math.random() < Math.abs(s.v) * dt * 10) dust.emit(bx, W.h(bx, bz) + .2, bz, (Math.random() - .5) * .8 - fwd.x * s.v * .15, .4 + Math.random() * .7, (Math.random() - .5) * .8 - fwd.z * s.v * .15, 1.2 + Math.random(), (o.dustSize || 1) * (.8 + Math.random() * .8));
      }
      dust.update(dt, .985, -.05);
      if (model.userData.wheels) model.userData.wheels.forEach(w => { w.rotation.x += s.v * dt / .065 * (o.len / .65) * .05; });
      W.follow && W.follow(s.x, s.y, s.z);
      engine(clamp(Math.abs(s.v) / o.max, 0, 1));
    };
    W.R = s;                                                    // lets a test script read the rover
    s.dist = (x, z) => Math.hypot(x - s.x, z - s.z);
    s.toward = (x, z) => { let a = Math.atan2(x - s.x, z - s.z) - s.h; return Math.atan2(Math.sin(a), Math.cos(a)); };
    s.snap();
    return s;
  }
  /* minimap helpers: world coordinates to the round map, centred on the rover and turning with it */
  function mapper(S, rover, scale) {
    return (x, z) => {
      const dx = x - rover.x, dz = z - rover.z, c = Math.cos(-rover.h), s = Math.sin(-rover.h);
      const rx = dx * c + dz * s, rz = -dx * s + dz * c;
      return [S / 2 - rx * scale, S / 2 - rz * scale];
    };
  }
  function mapRover(g, S) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(S / 2, S / 2 - 14); g.lineTo(S / 2 + 9, S / 2 + 10); g.lineTo(S / 2, S / 2 + 5); g.lineTo(S / 2 - 9, S / 2 + 10); g.closePath(); g.fill(); }
  function mapTarget(g, p, done, color = '#79dce8', r = 9) {
    g.fillStyle = done ? '#6ee7a8' : color; g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill();
    if (!done) { g.strokeStyle = color; g.lineWidth = 2; g.globalAlpha = .5 + .5 * Math.sin(performance.now() / 200); g.beginPath(); g.arc(p[0], p[1], r + 7, 0, TAU); g.stroke(); g.globalAlpha = 1; }
  }
  const DRIVE = L('Drive: arrows or WASD · hold Space/E at a target · drag to look around, wheel to zoom', 'Езда: стрелки или WASD · удерживайте Пробел/E у цели · тяните мышью, чтобы осмотреться, колесо — зум', 'Haydash: strelkalar yoki WASD · nishonda Bo‘shliq/E ni bosib turing · atrofni ko‘rish uchun sudrang, g‘ildirak — zum');

  /* ======================================== THE SIX MISSIONS ======================================== */
  const MISSIONS = {
    /* ---------------- SOJOURNER: the first rover, on a 12 m leash to its lander ---------------- */
    async sojourner(W) {
      const LIMIT = 34, MPU = .35;                          // game units -> metres: the lander's radio reached about 12 m
      const targets = [
        { n: 'Barnacle Bill', x: -13, z: 17, r: 1.7, col: 0x86634e },
        { n: 'Yogi', x: 19, z: 13, r: 2.6, col: 0x7d5a44 },
        { n: 'Scooby-Doo', x: 6, z: -22, r: 1.9, col: 0xb79a80, flat: .4 }
      ];
      const h = (x, z) => fbm(x * .02 + 4, z * .02, 4) * 3.2 - 1.6 + fbm(x * .15, z * .15, 2) * .25 - Math.max(0, 1 - Math.hypot(x, z) / 5) * .3;
      mars(W, { seed: 3, h, color: marsColor(3), size: 520, seg: 200 });
      const ringPts = []; for (let a = 0; a <= 160; a++) { const x = Math.cos(a / 160 * TAU) * LIMIT, z = Math.sin(a / 160 * TAU) * LIMIT; ringPts.push(new THREE.Vector3(x, h(x, z) + .25, z)); }
      const leash = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), new THREE.LineDashedMaterial({ color: 0x79dce8, dashSize: 1.2, gapSize: .8, transparent: true, opacity: .8 }));
      leash.computeLineDistances(); W.add(leash);                // the edge of the lander's radio range
      const obs = [{ x: 0, z: 0, r: 3.4 }];
      const lander = buildPathfinder(); lander.position.y = h(0, 0) - .05; W.add(lander);
      targets.forEach((t, i) => {
        const m = new THREE.Mesh(rockGeo(20 + i * 7, 3), new THREE.MeshStandardMaterial({ color: t.col, roughness: .9, flatShading: true }));
        m.scale.set(t.r * 1.15, t.r * (t.flat || .85), t.r); m.position.set(t.x, h(t.x, t.z) + t.r * .25, t.z); m.castShadow = m.receiveShadow = true; W.add(m);
        obs.push({ x: t.x, z: t.z, r: t.r });
        t.b = beacon(W, t.x, t.z, h(t.x, t.z), 0x79dce8, t.n);
      });
      rocks(W, 900, 300, h, 0x7d5a46, [{ x: 0, z: 0, r: 7 }, ...targets.map(t => ({ x: t.x, z: t.z, r: t.r + 5 }))], obs, 3);
      const model = fit(buildSojourner(), 1.9, 0); model.traverse(o => { if (o.isMesh) o.castShadow = true; }); W.add(model);
      model.userData.wheels = model.children[0].children[0].userData.wheels;
      const R = rover(W, model, { x: 0, z: 6, h: 0, max: 4.2, turn: 1.8, len: 1.9, wid: 1.4, rad: .9, obs, dustSize: .7 });
      const link = particles(W, 60, 0x79dce8, { add: true, op: .9 });
      let done = 0, prog = 0, lost = 0, lostT = 0, t = 0;
      return {
        brief: [L('SOJOURNER · ARES VALLIS, 1997', 'SOJOURNER · ДОЛИНА АРЕСА, 1997', 'SOJOURNER · ARES VODIYSI, 1997'),
          L('Analyse three rocks with the APXS spectrometer. It sits on the rover’s <b>back</b>, so reverse up to each rock and hold Space. Stay within 12 m of the lander: it is your only radio link to Earth.',
            'Изучите три камня спектрометром APXS. Он стоит <b>сзади</b> ровера, поэтому подъезжайте к камню задом и удерживайте Пробел. Не отъезжайте от посадочного модуля дальше 12 м: только через него есть связь с Землёй.',
            'APXS spektrometri bilan uchta toshni o‘rganing. U roverning <b>orqasida</b>, shuning uchun toshga orqa bilan yaqinlashib, Bo‘shliqni bosib turing. Qo‘nish stansiyasidan 12 m dan uzoqlashmang: Yer bilan aloqa faqat u orqali.') + '<br><small>' + DRIVE + '</small>'],
        begin() { W.toast(L('Tip: the spectrometer is on the BACK of Sojourner', 'Подсказка: спектрометр стоит СЗАДИ Sojourner', 'Maslahat: spektrometr Sojourner ning ORQASIDA')); },
        update(dt, playing, inp) {
          t += dt; let i = inp;
          const dl = Math.hypot(R.x, R.z);
          if (lostT > 0) {                                      // link lost: the rover backs up toward the lander by itself
            lostT -= dt; const a = R.toward(0, 0); i = { thr: .7, steer: clamp(a * 2, -1, 1), act: false };
            if (dl < LIMIT - 6) lostT = 0;
          } else if (playing && dl > LIMIT) { lost++; lostT = 3; W.shake(.2); sfx('alarm'); W.toast(L('LINK LOST: too far from the lander. Returning…', 'СВЯЗЬ ПОТЕРЯНА: слишком далеко от модуля. Возвращаемся…', 'ALOQA UZILDI: stansiyadan juda uzoq. Qaytmoqda…'), 'bad'); }
          R.step(dt, playing || lostT > 0 ? i : { thr: 0, steer: 0 });
          targets.forEach(tg => tg.b.update(dt, t));
          const tg = targets.find(x => !x.b.done);
          let ready = false, behind = false;
          if (tg && playing) {
            const gap = R.dist(tg.x, tg.z) - tg.r - .95, ang = Math.abs(R.toward(tg.x, tg.z));
            behind = ang > PI - .9;                             // the rock must be behind the rover
            ready = gap < 1.6 && behind && Math.abs(R.v) < .5;
            if (ready && inp.act) { prog += dt / 2.5; if (Math.random() < dt * 20) link.emit(R.x - Math.sin(R.h) * 1.1, R.y + .4, R.z - Math.cos(R.h) * 1.1, (Math.random() - .5), Math.random() * .8, (Math.random() - .5), .6, .5); }
            else prog = Math.max(0, prog - dt);
            if (gap < 1.6 && !behind && inp.act && Math.random() < dt * 2) W.toast(L('Turn around: the APXS is on the back!', 'Развернитесь: APXS стоит сзади!', 'Burilib oling: APXS orqada!'));
            if (prog >= 1) { prog = 0; tg.b.complete(); done++; sfx('collect'); W.toast(tg.n + ' ✓ ' + L('analysed', 'изучен', 'o‘rganildi'), 'good'); }
          }
          link.update(dt, .95, 0);
          W.chase(dt, { x: R.x, y: R.y, z: R.z }, R.h, { dist: 5.2, height: 2.4, look: .8, ground: W.h });
          if (playing && done >= targets.length) {
            const stars = lost === 0 && W.timer() < 150 ? 3 : lost <= 1 && W.timer() < 260 ? 2 : 1;
            W.finish(stars, L('All three rocks analysed!', 'Все три камня изучены!', 'Uchala tosh o‘rganildi!'),
              L('Link lost ' + lost + ' time(s)', 'Связь терялась: ' + lost, 'Aloqa ' + lost + ' marta uzildi'),
              L('Sojourner landed on 4 July 1997 inside the Mars Pathfinder airbags and rolled down a ramp the next day. Its APXS spectrometer really was on its back, so the team reversed it up to rocks such as Barnacle Bill, Yogi and Scooby-Doo. It talked to Earth only through the lander, so it never went more than about 12 m away. Planned for 7 days, it worked 83; contact ended on 27 September 1997.',
                'Sojourner сел 4 июля 1997 года в подушках Mars Pathfinder и на следующий день съехал по трапу. Спектрометр APXS действительно стоял сзади, поэтому команда подводила ровер к камням Barnacle Bill, Yogi и Scooby-Doo задним ходом. Связь с Землёй шла только через посадочный модуль, поэтому он не уезжал дальше ~12 м. Рассчитанный на 7 дней, он проработал 83; связь прервалась 27 сентября 1997 года.',
                'Sojourner 1997-yil 4-iyulda Mars Pathfinder havo yostiqlarida qo‘ndi va ertasiga trapdan tushdi. APXS spektrometri haqiqatan ham orqada edi, shuning uchun jamoa uni Barnacle Bill, Yogi va Scooby-Doo kabi toshlarga orqa bilan olib bordi. Yer bilan aloqa faqat stansiya orqali bo‘lgani uchun u ~12 m dan uzoqlashmadi. 7 kunga mo‘ljallangan bo‘lsa-da, 83 kun ishladi; aloqa 1997-yil 27-sentabrda uzildi.'));
          }
          this.ready = ready; this.prog = prog; this.dl = dl;
        },
        hud() {
          const tg = targets.find(x => !x.b.done), sig = clamp(1 - this.dl / LIMIT, 0, 1);
          W.setObj(done + ' / 3');
          W.gauges([
            ...targets.map(x => ({ o: x.n, done: x.b.done })),
            { k: L('Radio link', 'Радиосвязь', 'Radio aloqa'), v: sig, t: (this.dl * MPU).toFixed(1) + ' / 12 m', warn: sig < .2 },
            { k: 'APXS', v: this.prog, t: tg ? (this.ready ? L('HOLD SPACE', 'ДЕРЖИТЕ ПРОБЕЛ', 'BO‘SHLIQNI BOSING') : (R.dist(tg.x, tg.z) * MPU).toFixed(1) + ' m') : '✓' }
          ]);
        },
        map(g, S) {
          const P = mapper(S, R, 3.2), c = P(0, 0);
          g.strokeStyle = 'rgba(121,220,232,.55)'; g.setLineDash([8, 8]); g.lineWidth = 3; g.beginPath(); g.arc(c[0], c[1], LIMIT * 3.2, 0, TAU); g.stroke(); g.setLineDash([]);
          g.fillStyle = '#c9ccd2'; g.beginPath(); g.arc(c[0], c[1], 9, 0, TAU); g.fill();
          targets.forEach(x => mapTarget(g, P(x.x, x.z), x.b.done)); mapRover(g, S);
        }
      };
    },

    /* ---------------- SPIRIT: a broken wheel, soft sand, silica, and a winter to survive ---------------- */
    async spirit(W) {
      const HP = { x: 0, z: 150, r: 20 }, SIL = { x: -16, z: 118, r: 7 }, SLOPE = { x: 34, z: 192, r: 13 };
      const sand = [{ x: -6, z: 40, r: 9 }, { x: 14, z: 72, r: 10 }, { x: -18, z: 92, r: 8 }, { x: 22, z: 120, r: 9 }, { x: 10, z: 176, r: 8 }, { x: -12, z: 160, r: 6 }];
      const inSand = (x, z) => sand.find(p => Math.hypot(x - p.x, z - p.z) < p.r * .92);   // the trap ends where the dark patch visibly ends
      const h = (x, z) => {
        let y = fbm(x * .015 + 9, z * .015, 4) * 6 - 3 + fbm(x * .12, z * .12 + 4, 2) * .3;
        const d = Math.hypot(x - HP.x, z - HP.z); y += smooth(HP.r + 3, HP.r - 2, d) * 1.8;               // Home Plate, a low layered plateau
        const ds = Math.hypot(x - SLOPE.x, z - SLOPE.z); y += smooth(SLOPE.r, 0, ds) * (3.2 - (z - SLOPE.z) * .22);   // a hillside that faces north (toward the winter Sun)
        sand.forEach(p => { const k = smooth(p.r, p.r * .5, Math.hypot(x - p.x, z - p.z)); y = lerp(y, y - .35 + Math.sin(x * 1.3 + z * .4) * .08, k); });
        return y;
      };
      const sunDir = new THREE.Vector3(.15, .32, 1).normalize();     // Gusev is south of the equator: the winter Sun is low in the north (+z)
      mars(W, { seed: 7, h, sun: sunDir, size: 560, seg: 230, color: marsColor(7, (c, x, z) => {
        const s = sand.find(p => Math.hypot(x - p.x, z - p.z) < p.r * 1.1); if (s) return mix3(c, [.42, .27, .18], smooth(s.r * 1.08, s.r * .82, Math.hypot(x - s.x, z - s.z)) * .9);
        const d = Math.hypot(x - HP.x, z - HP.z); if (d < HP.r + 1) return mix3(c, [.62, .5, .42], .55 + .15 * Math.sin(z * 2.5));
        if (Math.hypot(x - SLOPE.x, z - SLOPE.z) < SLOPE.r) return mix3(c, [.45, .62, .7], .22);
        return c;
      }) });
      const obs = [];
      rocks(W, 1100, 380, h, 0x6e4c3a, [...sand, HP, SLOPE, { x: 0, z: 0, r: 8 }], obs, 7);
      const model = await nasaModel(W, 'mer', 2.4, 0); if (!W.alive()) return null; W.add(model);
      const R = rover(W, model, { x: 0, z: 0, h: 0, max: 5.2, turn: 1.5, len: 2.4, wid: 2, rad: 1.3, obs, bound: 270, cz: 100, travelSteer: true });
      const silica = tracks(W, 0xf4f1ea, .85, 500, .27);
      const bHP = beacon(W, HP.x, HP.z, h(HP.x, HP.z), 0x79dce8, 'Home Plate'), bSI = beacon(W, SIL.x, SIL.z, h(SIL.x, SIL.z), 0xfff2c0, L('Bright soil', 'Светлый грунт', 'Yorqin tuproq')),
        bSL = beacon(W, SLOPE.x, SLOPE.z, h(SLOPE.x, SLOPE.z), 0x9fd0ff, L('North-facing slope', 'Склон к северу', 'Shimolga qaragan qiyalik'), true);
      let t = 0, power = 1, sink = 0, silicaM = 0, gotSI = false, gotHP = false, parkT = 0, wasSand = false, warned = false;
      const end = (stars, title, stats) => W.finish(stars, title, stats, L('In 2006 Spirit’s right-front wheel stopped turning, so the team drove it backwards, dragging the wheel. In 2007 the dragged wheel scraped up soil that was about 90% silica, a sign of ancient hot springs. To survive the winters, Spirit parked on north-facing slopes to tilt its solar panels toward the low Sun. On 1 May 2009 it broke through a crust into soft sand at “Troy” and never got out; its last contact was on 22 March 2010, and NASA ended the mission on 25 May 2011.',
        'В 2006 году у Spirit заклинило правое переднее колесо, и команда стала водить его задним ходом, волоча колесо. В 2007 году это колесо выскребло грунт, почти на 90% состоящий из кремнезёма, — след древних горячих источников. Чтобы пережить зимы, Spirit парковался на северных склонах, наклоняя панели к низкому Солнцу. 1 мая 2009 года он провалился сквозь корку в мягкий песок у «Трои» и так и не выбрался; последняя связь — 22 марта 2010 года, а 25 мая 2011 года NASA завершило миссию.',
        '2006-yilda Spirit ning o‘ng old g‘ildiragi aylanmay qoldi, shuning uchun jamoa uni g‘ildirakni sudrab, orqaga haydadi. 2007-yilda sudralgan g‘ildirak taxminan 90% kremnezyomdan iborat tuproqni ochdi: qadimgi issiq buloqlar belgisi. Qishdan omon qolish uchun Spirit quyosh panellarini past Quyoshga qaratib, shimolga qaragan qiyaliklarda turardi. 2009-yil 1-mayda u «Troya»da qobiqni yorib, yumshoq qumga botdi va chiqa olmadi; oxirgi aloqa 2010-yil 22-martda bo‘ldi, NASA missiyani 2011-yil 25-mayda yakunladi.'));
      return {
        brief: [L('SPIRIT · GUSEV CRATER, 2006', 'SPIRIT · КРАТЕР ГУСЕВ, 2006', 'SPIRIT · GUSEV KRATERI, 2006'),
          L('The right-front wheel is broken, so driving forward is slow. Drive <b>backwards</b> (↓/S) like the real team did. Drag the wheel over the bright soil to dig up silica, reach Home Plate, then park on a north-facing slope before winter drains the power. Avoid the dark soft sand!',
            'Правое переднее колесо сломано, поэтому вперёд ровер едет медленно. Езжайте <b>задним ходом</b> (↓/S), как настоящая команда. Протащите колесо по светлому грунту, чтобы найти кремнезём, доберитесь до Home Plate, затем припаркуйтесь на северном склоне, пока зима не съела энергию. Избегайте тёмного мягкого песка!',
            'O‘ng old g‘ildirak singan, shuning uchun oldinga sekin yuradi. Haqiqiy jamoa kabi <b>orqaga</b> (↓/S) haydang. Kremnezyom topish uchun g‘ildirakni yorqin tuproq ustidan sudrang, Home Plate ga yeting, so‘ng qish quvvatni tugatmasidan shimolga qaragan qiyalikda to‘xtang. Qorong‘i yumshoq qumdan saqlaning!') + '<br><small>' + DRIVE + '</small>'],
        begin() { W.toast(L('Tip: backwards (↓) is almost twice as fast', 'Подсказка: задним ходом (↓) почти вдвое быстрее', 'Maslahat: orqaga (↓) deyarli ikki baravar tez')); },
        update(dt, playing, inp) {
          t += dt;
          const sd = inSand(R.x, R.z);
          if (sd && !wasSand && playing) { W.toast(L('Soft sand! Reverse out before you sink', 'Мягкий песок! Выезжайте задним ходом, пока не увязли', 'Yumshoq qum! Botib qolmasdan orqaga chiqing'), 'bad'); sfx('alarm'); }
          wasSand = !!sd;
          if (sd && playing) sink += dt * (inp.thr > 0 ? .21 : inp.thr < 0 ? -.14 : .04); else sink = Math.max(0, sink - dt * .25);
          sink = clamp(sink, 0, 1); R.sink = sink * .55;
          const fwd = inp.thr > 0;
          R.step(dt, inp, { maxMul: (sd ? .35 : 1) * (fwd ? .55 : 1) * (power > .02 ? 1 : 0), rev: 1, trackSet: R.dist(SIL.x, SIL.z) < SIL.r && R.v < -.3 ? silica : null });
          if (playing) {
            power = Math.max(0, power - dt / 230 * (1 + Math.abs(R.v) / 5 * .6));
            if (!gotSI && R.dist(SIL.x, SIL.z) < SIL.r && R.v < -.3) { silicaM += Math.abs(R.v) * dt; if (silicaM > 9) { gotSI = true; bSI.complete(); sfx('collect'); W.toast(L('Silica! The dragged wheel exposed ~90% silica soil', 'Кремнезём! Волочащееся колесо вскрыло грунт с ~90% кремнезёма', 'Kremnezyom! Sudralgan g‘ildirak ~90% kremnezyomli tuproqni ochdi'), 'good'); } }
            if (!gotHP && R.dist(HP.x, HP.z) < HP.r) { gotHP = true; bHP.complete(); sfx('collect'); W.toast(L('Home Plate reached: layers from an ancient volcanic blast', 'Home Plate: слои древнего вулканического взрыва', 'Home Plate: qadimgi vulqon portlashi qatlamlari'), 'good'); }
            if ((power < .55 || (gotSI && gotHP)) && !bSL.show) { bSL.reveal(); W.toast(L('Winter is coming: find a north-facing slope!', 'Приближается зима: найдите склон к северу!', 'Qish yaqin: shimolga qaragan qiyalikni toping!')); }
            if (power < .2 && !warned) { warned = true; sfx('alarm'); W.toast(L('Power critical!', 'Энергия на исходе!', 'Quvvat tugamoqda!'), 'bad'); }
            const onSlope = R.dist(SLOPE.x, SLOPE.z) < SLOPE.r * .8 && bSL.show && Math.abs(R.v) < .4;
            parkT = onSlope ? parkT + dt : 0;
            if (parkT > 2.5) { bSL.complete(); const st = 1 + (gotSI ? 1 : 0) + (gotHP ? 1 : 0); return end(st, L('Parked for the winter!', 'Припаркован на зиму!', 'Qishga to‘xtatildi!'), L('Silica ' + (gotSI ? '✓' : '✗') + ' · Home Plate ' + (gotHP ? '✓' : '✗') + ' · power left ' + Math.round(power * 100) + '%', 'Кремнезём ' + (gotSI ? '✓' : '✗') + ' · Home Plate ' + (gotHP ? '✓' : '✗') + ' · энергии ' + Math.round(power * 100) + '%', 'Kremnezyom ' + (gotSI ? '✓' : '✗') + ' · Home Plate ' + (gotHP ? '✓' : '✗') + ' · quvvat ' + Math.round(power * 100) + '%')); }
            if (sink >= 1) return end(0, L('Stuck in the sand, like at Troy', 'Застрял в песке, как у «Трои»', 'Qumda qoldi, Troyadagidek'), L('The wheels dug in too deep', 'Колёса зарылись слишком глубоко', 'G‘ildiraklar juda chuqur botdi'));
            if (power <= 0) return end((gotSI ? 1 : 0) + (gotHP ? 1 : 0) > 0 ? 1 : 0, L('Winter came first', 'Зима наступила раньше', 'Qish erta keldi'), L('The power ran out before Spirit was parked', 'Энергия кончилась до парковки', 'Spirit to‘xtatilmasidan quvvat tugadi'));
          }
          [bHP, bSI, bSL].forEach(b => b.update(dt, t));
          W.light.sun.intensity = 2.4 * (.45 + .55 * power); W.light.hemi.intensity = .55 * (.5 + .5 * power);
          W.chase(dt, { x: R.x, y: R.y, z: R.z }, R.h + (R.v < -.3 ? PI : 0), { dist: 7.5, height: 3.4, look: 1.2, ground: W.h, k: 2.5 });
        },
        hud() {
          W.setObj(((gotSI ? 1 : 0) + (gotHP ? 1 : 0) + (bSL.done ? 1 : 0)) + ' / 3');
          W.gauges([
            { o: L('Dig up silica (reverse over the bright soil)', 'Найти кремнезём (задним ходом по светлому грунту)', 'Kremnezyom topish (yorqin tuproqda orqaga)'), done: gotSI },
            { o: L('Reach Home Plate', 'Добраться до Home Plate', 'Home Plate ga yetish'), done: gotHP },
            { o: L('Park on a north-facing slope', 'Встать на северный склон', 'Shimoliy qiyalikda to‘xtash'), done: bSL.done },
            { k: L('Winter power', 'Энергия зимой', 'Qishki quvvat'), v: power, t: Math.round(power * 100) + '%', warn: power < .25 },
            { k: L('Sinking', 'Погружение', 'Botish'), v: sink, t: sink > 0 ? Math.round(sink * 100) + '%' : '–', warn: sink > .4 },
            { k: L('Silica', 'Кремнезём', 'Kremnezyom'), v: gotSI ? 1 : silicaM / 9, t: gotSI ? '≈90%' : '' }
          ]);
        },
        map(g, S) {
          const P = mapper(S, R, 1.15);
          sand.forEach(p => { const c = P(p.x, p.z); g.fillStyle = 'rgba(150,90,50,.65)'; g.beginPath(); g.arc(c[0], c[1], p.r * 1.15, 0, TAU); g.fill(); });
          let c = P(HP.x, HP.z); g.fillStyle = 'rgba(200,180,160,.35)'; g.beginPath(); g.arc(c[0], c[1], HP.r * 1.15, 0, TAU); g.fill();
          mapTarget(g, P(SIL.x, SIL.z), gotSI, '#fff2c0'); mapTarget(g, P(HP.x, HP.z), gotHP);
          if (bSL.show) mapTarget(g, P(SLOPE.x, SLOPE.z), bSL.done, '#9fd0ff');
          mapRover(g, S);
        }
      };
    },

    /* ---------------- OPPORTUNITY: battery, dusty panels, dust devils, a marathon and the storm ---------------- */
    async opportunity(W) {
      const C = [{ n: 'Eagle', x: 0, z: 0, r: 10, d: 2.6 }, { n: 'Endurance', x: -40, z: 120, r: 20, d: 6 }, { n: 'Victoria', x: 38, z: 230, r: 26, d: 8 }, { n: 'Endeavour', x: 0, z: 400, r: 80, d: 10 }];
      const h = (x, z) => { let y = fbm(x * .01 + 2, z * .01, 3) * 2.2 - 1.1 + Math.sin(x * .6 + z * .18) * .05; C.forEach(c => { y += crater(x, z, c); }); return y; };
      const W0 = [{ n: L('Climb out of Eagle crater', 'Выбраться из кратера Eagle', 'Eagle kraterdan chiqish'), x: 0, z: 17 }, { n: L('Endurance crater rim', 'Край кратера Endurance', 'Endurance krateri cheti'), x: -40, z: 98 }, { n: L('Victoria crater rim', 'Край кратера Victoria', 'Victoria krateri cheti'), x: 38, z: 202 }, { n: L('Endeavour crater rim', 'Край кратера Endeavour', 'Endeavour krateri cheti'), x: 0, z: 318 }];
      mars(W, { seed: 11, h, size: 900, seg: 280, density: .0036, color: marsColor(11, (c, x, z, y) => mix3(c, [.42, .3, .26], smooth(-.5, -3, y) * .35)) });
      const obs = []; rocks(W, 900, 600, h, 0x6a4a3c, [{ x: 0, z: 0, r: 12 }], obs, 11);
      const berries = []; const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshStandardMaterial({ color: 0x5b6474, metalness: .4, roughness: .45 }), 360), m4 = new THREE.Matrix4();
      let bi = 0; for (let k = 0; k < 12; k++) { const cx = (hash(k, 1) - .5) * 90, cz = 30 + hash(k, 2) * 260; berries.push({ x: cx, z: cz, got: false }); for (let j = 0; j < 30; j++) { const x = cx + (hash(k, j + 3) - .5) * 4, z = cz + (hash(j, k + 7) - .5) * 4; bm.setMatrixAt(bi++, m4.makeTranslation(x, h(x, z) + .08, z)); } }
      bm.castShadow = true; W.add(bm);
      const model = await nasaModel(W, 'mer', 2.4, 0); if (!W.alive()) return null; W.add(model);
      const R = rover(W, model, { x: 0, z: -2, h: 0, max: 5.4, turn: 1.5, len: 2.4, wid: 2, rad: 1.3, obs, bound: 430, cz: 160 });
      const beacons = W0.map((w, i) => beacon(W, w.x, w.z, h(w.x, w.z), 0x79dce8, w.n, i > 0));
      const devils = [0, 1, 2].map(k => ({ x: (k - 1) * 50, z: 60 + k * 90, a: k * 2, p: particles(W, 160, 0xd8a77c, { op: .5 }) }));
      const storm = particles(W, 500, 0xb7794a, { op: .35 });
      let t = 0, i = 0, batt = 1, dust = .15, berry = 0, sky0 = W.sky.material.uniforms, top0 = sky0.top.value.clone(), hor0 = sky0.hor.value.clone(), fog0 = W.scene.fog.color.clone();
      const real = L('Opportunity landed on 25 January 2004 (UTC) right inside the small Eagle crater, a “hole in one”. It found hematite “blueberries” that formed in water, and wind gusts and dust devils sometimes cleaned its solar panels and gave it more power. Planned for 90 days and 1 km, it drove 45.16 km in almost 15 years, through Endurance and Victoria craters to Endeavour. A planet-wide dust storm cut its power in June 2018; the last contact was on 10 June 2018 and NASA ended the mission on 13 February 2019.',
        'Opportunity сел 25 января 2004 года (UTC) прямо в маленький кратер Eagle — «точно в лунку». Он нашёл гематитовые «черничины», образовавшиеся в воде, а порывы ветра и пылевые вихри иногда очищали его солнечные панели, добавляя энергии. Рассчитанный на 90 дней и 1 км, он проехал 45,16 км почти за 15 лет — через кратеры Endurance и Victoria к Endeavour. Глобальная пылевая буря лишила его энергии в июне 2018 года; последняя связь — 10 июня 2018 года, миссия завершена 13 февраля 2019 года.',
        'Opportunity 2004-yil 25-yanvarda (UTC) to‘ppa-to‘g‘ri kichik Eagle krateriga qo‘ndi. U suvda hosil bo‘lgan gematit «ko‘k mevalar»ni topdi, shamol va chang quyunlari ba’zan uning quyosh panellarini tozalab, quvvat qo‘shgan. 90 kun va 1 km ga mo‘ljallangan bo‘lsa-da, u deyarli 15 yilda Endurance va Victoria kraterlari orqali Endeavour gacha 45,16 km yurdi. 2018-yil iyunida butun sayyorani qoplagan chang bo‘roni quvvatni kesdi; oxirgi aloqa 2018-yil 10-iyunda, NASA missiyani 2019-yil 13-fevralda yakunladi.');
      return {
        brief: [L('OPPORTUNITY · MERIDIANI PLANUM, 2004–2018', 'OPPORTUNITY · ПЛАТО МЕРИДИАНИ, 2004–2018', 'OPPORTUNITY · MERIDIANI PLATOSI, 2004–2018'),
          L('You start inside Eagle crater. Drive crater to crater all the way to Endeavour. Driving drains the battery; <b>stop to recharge</b> in sunlight. Dust on the panels slows charging: drive into a <b>dust devil</b> to blow them clean. Late in the trip, the 2018 dust storm rolls in. Collect blueberries for bonus science!',
            'Вы начинаете внутри кратера Eagle. Двигайтесь от кратера к кратеру до самого Endeavour. Езда разряжает батарею; <b>остановитесь, чтобы зарядиться</b> на солнце. Пыль на панелях замедляет зарядку: въедьте в <b>пылевой вихрь</b>, и он сдует её. В конце пути приходит буря 2018 года. Собирайте «черничины» для бонусной науки!',
            'Siz Eagle krateri ichida boshlaysiz. Kraterdan kraterga Endeavour gacha yuring. Haydash batareyani sarflaydi; quyoshda <b>to‘xtab zaryadlang</b>. Paneldagi chang zaryadlashni sekinlashtiradi: uni tozalash uchun <b>chang quyuniga</b> kiring. Yo‘l oxirida 2018-yilgi chang bo‘roni keladi. Bonus fan uchun «ko‘k mevalar»ni yig‘ing!') + '<br><small>' + DRIVE + '</small>'],
        update(dt, playing, inp) {
          t += dt;
          const progress = clamp((R.z - 0) / 318, 0, 1), stormK = smooth(.55, 1, progress) * (i >= 3 ? 1 : .85);
          const light = 1 - stormK * .85;
          R.step(dt, inp, { maxMul: batt > 0 ? 1 : 0 });
          if (playing) {
            const mv = Math.abs(R.v) > .5;
            batt = clamp(batt - (mv ? .028 : .002) * dt + (mv ? 0 : .055 * light * (1 - dust)) * dt, 0, 1);
            dust = clamp(dust + dt * .0042 * (1 + stormK * 2), 0, .9);
            const w = W0[i];
            if (w && Math.hypot(R.x - w.x, R.z - w.z) < 7) { beacons[i].complete(); sfx('collect'); W.toast(w.n + ' ✓', 'good'); i++; if (beacons[i]) beacons[i].reveal(); }
            berries.forEach(b => { if (!b.got && R.dist(b.x, b.z) < 3) { b.got = true; berry++; sfx('spark'); W.toast(L('Hematite blueberries! Formed in water', 'Гематитовые «черничины»! Образовались в воде', 'Gematit «ko‘k mevalar»! Suvda hosil bo‘lgan')); } });
            if (i >= W0.length) return W.finish(batt > .3 ? 3 : 2, L('Endeavour reached!', 'Endeavour достигнут!', 'Endeavour ga yetildi!'), L('Battery ' + Math.round(batt * 100) + '% · blueberries ' + berry + ' · driven ' + (R.odo * .137).toFixed(1) + ' km', 'Батарея ' + Math.round(batt * 100) + '% · «черничины» ' + berry + ' · пройдено ' + (R.odo * .137).toFixed(1) + ' км', 'Batareya ' + Math.round(batt * 100) + '% · ko‘k mevalar ' + berry + ' · ' + (R.odo * .137).toFixed(1) + ' km yurildi'), real);
            if (batt <= 0 && light < .3) return W.finish(i >= 2 ? 1 : 0, L('The storm won', 'Буря победила', 'Bo‘ron yengdi'), L('The battery ran out in the dark of the storm', 'Батарея разрядилась во тьме бури', 'Bo‘ron qorong‘isida batareya tugadi'), real);
          }
          devils.forEach((d, k) => {
            d.a += dt * .25; d.x += Math.cos(d.a * .7 + k) * dt * 3; d.z += Math.sin(d.a * .5 + k * 2) * dt * 3;
            const y0 = h(d.x, d.z);
            for (let j = 0; j < 4; j++) { const a = Math.random() * TAU, rr = .5 + Math.random() * 2.5, yy = Math.random() * 14; d.p.emit(d.x + Math.cos(a) * rr * (1 + yy * .1), y0 + yy, d.z + Math.sin(a) * rr * (1 + yy * .1), -Math.sin(a) * 3, 1.5, Math.cos(a) * 3, 1.5, 2 + yy * .15); }
            d.p.update(dt, .98, 0);
            if (playing && R.dist(d.x, d.z) < 4 && dust > .2) { dust = .02; sfx('whoosh'); W.toast(L('A dust devil cleaned the panels! (this really happened)', 'Пылевой вихрь очистил панели! (так было на самом деле)', 'Chang quyuni panellarni tozaladi! (bu haqiqatan bo‘lgan)'), 'good'); }
          });
          if (stormK > .05) for (let j = 0; j < Math.round(stormK * 14); j++) storm.emit(R.x + (Math.random() - .5) * 60, R.y + Math.random() * 10, R.z + (Math.random() - .5) * 60, 6 + Math.random() * 4, 0, 2, 2.5, 4 + Math.random() * 6);
          storm.update(dt, 1, 0);
          sky0.top.value.copy(top0).lerp(new THREE.Color(0x3c2014), stormK); sky0.hor.value.copy(hor0).lerp(new THREE.Color(0x6a3a1e), stormK);
          W.scene.fog.color.copy(fog0).lerp(new THREE.Color(0x5a3018), stormK); W.scene.fog.density = .0036 + stormK * .02;
          W.light.sun.intensity = 2.4 * light; W.light.hemi.intensity = .55 * (.4 + .6 * light);
          beacons.forEach(b => b.update(dt, t));
          W.chase(dt, { x: R.x, y: R.y, z: R.z }, R.h, { dist: 7.5, height: 3.4, look: 1.2, ground: W.h });
          this.light = light; this.stormK = stormK;
        },
        hud() {
          W.setObj(i + ' / 4');
          W.gauges([
            ...W0.map((w, k) => ({ o: w.n, done: k < i })),
            { k: L('Battery', 'Батарея', 'Batareya'), v: batt, t: Math.round(batt * 100) + '%' + (Math.abs(R.v) < .5 && batt < 1 ? ' ⚡' : ''), warn: batt < .2 },
            { k: L('Dust on panels', 'Пыль на панелях', 'Paneldagi chang'), v: dust, t: Math.round(dust * 100) + '%', warn: dust > .6 },
            { k: L('Dust storm', 'Пылевая буря', 'Chang bo‘roni'), v: this.stormK || 0, t: '', warn: (this.stormK || 0) > .5 },
            { k: L('Blueberries', '«Черничины»', 'Ko‘k mevalar'), t: berry + ' / ' + berries.length }
          ]);
        },
        map(g, S) {
          const P = mapper(S, R, .55);
          C.forEach(c => { const p = P(c.x, c.z); g.strokeStyle = 'rgba(200,150,110,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(p[0], p[1], c.r * .55, 0, TAU); g.stroke(); });
          berries.forEach(b => { if (!b.got) { const p = P(b.x, b.z); g.fillStyle = '#9aa6bd'; g.fillRect(p[0] - 2, p[1] - 2, 4, 4); } });
          devils.forEach(d => { const p = P(d.x, d.z); g.strokeStyle = '#f0c49a'; g.lineWidth = 2; g.beginPath(); g.arc(p[0], p[1], 7, 0, 5); g.stroke(); });
          W0.forEach((w, k) => { if (k <= i) mapTarget(g, P(w.x, w.z), k < i); });
          mapRover(g, S);
        }
      };
    },

    /* ---------------- PERSEVERANCE: three cores, Ingenuity scouting ahead, and Sun glare ---------------- */
    async perseverance(W) {
      const T = [
        { n: L('Máaz crater floor', 'Дно кратера: Máaz', 'Krater tubi: Máaz'), x: 26, z: 52, col: 0x3f3d42, r: 1.9 },
        { n: 'Wildcat Ridge', x: -42, z: 118, col: 0xb6845a, r: 2.1, flat: .55 },
        { n: 'Cheyava Falls', x: 14, z: 196, col: 0xb5643f, r: 2.2, spots: true }
      ];
      const h = (x, z) => {
        let y = fbm(x * .013 + 5, z * .013, 4) * 4 - 2;
        y += smooth(85, 105, z) * 4.5 + Math.floor(smooth(85, 140, z) * 6) * .25;          // the delta front: stepped layers of old river sediment
        y -= Math.exp(-Math.pow((x - 14 + Math.sin(z * .05) * 6) / 7, 2)) * smooth(150, 175, z) * 2.4;   // Neretva Vallis, where water flowed in
        return y + fbm(x * .12, z * .12, 2) * .25;
      };
      const sunDir = new THREE.Vector3(-.35, .28, 1).normalize();
      mars(W, { seed: 21, h, sun: sunDir, size: 640, seg: 240, color: marsColor(21, (c, x, z, y, sl) => mix3(c, [.66, .48, .34], smooth(88, 110, z) * (.35 + .25 * Math.sin(y * 9)))) });
      const obs = [];
      T.forEach((tg, k) => {
        let mat;
        if (tg.spots) {                                             // the “leopard spots” of Cheyava Falls
          const c = bake(256, 256, (u, v) => { const n = fbm(u * 18, v * 18, 3); const s = n > .64 ? [30, 26, 24] : n > .6 ? [190, 170, 150] : [180 + n * 40, 92 + n * 30, 60]; return s; });
          mat = new THREE.MeshStandardMaterial({ map: tex(c), roughness: .85 });
        } else mat = new THREE.MeshStandardMaterial({ color: tg.col, roughness: .9, flatShading: true });
        const m = new THREE.Mesh(rockGeo(40 + k * 5, 3), mat); m.scale.set(tg.r * 1.3, tg.r * (tg.flat || .8), tg.r); m.position.set(tg.x, h(tg.x, tg.z) + tg.r * .2, tg.z); m.castShadow = m.receiveShadow = true; W.add(m);
        obs.push({ x: tg.x, z: tg.z, r: tg.r }); tg.b = beacon(W, tg.x, tg.z, h(tg.x, tg.z), 0x79dce8, tg.n, true);
      });
      rocks(W, 1000, 420, h, 0x6a4636, T.map(x => ({ x: x.x, z: x.z, r: 6 })).concat([{ x: 0, z: 0, r: 8 }]), obs, 21);
      const model = await nasaModel(W, 'per', 3, 0); if (!W.alive()) return null; W.add(model);
      const R = rover(W, model, { x: 0, z: -4, h: 0, max: 5, turn: 1.4, len: 3, wid: 2.7, rad: 1.6, obs, bound: 300, cz: 100 });
      const heli = buildIngenuity(); W.add(heli); heli.position.set(2, h(2, 2) + 4, 2);
      const rotorDust = particles(W, 200, 0xd2a07a, { op: .45 });
      let t = 0, got = 0, prog = 0, scout = 0, glareK = 0, flights = 0;
      const SOL = 260;
      const real = L('Perseverance landed in Jezero crater on 18 February 2021; the crater once held a lake and a river delta. Its sample from “Wildcat Ridge” (2022) is delta mudstone with organic molecules, and the “Sapphire Canyon” core from the Cheyava Falls rock (July 2024) holds potential biosignatures: clues, not proof of life. Ingenuity, the first aircraft on another planet, flew 72 times and scouted routes until January 2024. When Perseverance drives toward the Sun, glare blinds its navigation cameras. On 11 October 2026 it passed 45.22 km, beating Opportunity’s record.',
        'Perseverance сел в кратер Езеро 18 февраля 2021 года; когда-то в кратере было озеро и речная дельта. Образец «Wildcat Ridge» (2022) — дельтовый аргиллит с органическими молекулами, а керн «Sapphire Canyon» из камня Cheyava Falls (июль 2024) содержит потенциальные биосигнатуры: улики, а не доказательство жизни. Ingenuity — первый летательный аппарат на другой планете — совершил 72 полёта и разведывал маршруты до января 2024 года. Когда ровер едет к Солнцу, блики ослепляют навигационные камеры. 11 октября 2026 года он прошёл 45,22 км, побив рекорд Opportunity.',
        'Perseverance 2021-yil 18-fevralda Jezero krateriga qo‘ndi; kraterda bir paytlar ko‘l va daryo deltasi bo‘lgan. «Wildcat Ridge» namunasi (2022) organik molekulali delta loytoshi, Cheyava Falls toshidan olingan «Sapphire Canyon» namunasi (2024-yil iyul) esa potensial biosignaturalarga ega: bu hayot isboti emas, faqat ishora. Boshqa sayyoradagi birinchi uchuvchi apparat Ingenuity 72 marta uchdi va 2024-yil yanvarigacha yo‘llarni razvedka qildi. Rover Quyoshga qarab yurganda, nur navigatsiya kameralarini ko‘r qiladi. 2026-yil 11-oktabrda u 45,22 km yurib, Opportunity rekordini yangiladi.');
      return {
        brief: [L('PERSEVERANCE · JEZERO CRATER, 2021–2026', 'PERSEVERANCE · КРАТЕР ЕЗЕРО, 2021–2026', 'PERSEVERANCE · JEZERO KRATERI, 2021–2026'),
          L('Collect three rock cores before the sol ends. <b>Ingenuity</b> flies ahead and scouts each target: follow the helicopter. Stop facing a rock and hold Space to drill. Driving straight at the low Sun blinds the cameras and slows AutoNav.',
            'Соберите три керна до конца сола. <b>Ingenuity</b> летит впереди и разведывает цели: следуйте за вертолётом. Остановитесь лицом к камню и удерживайте Пробел, чтобы бурить. Езда прямо на низкое Солнце слепит камеры и замедляет автонавигацию.',
            'Sol tugashidan oldin uchta jins namunasini oling. <b>Ingenuity</b> oldinda uchib, nishonlarni razvedka qiladi: vertolyotga ergashing. Toshga qarab to‘xtang va burg‘ilash uchun Bo‘shliqni bosib turing. Past Quyoshga to‘g‘ri haydash kameralarni ko‘r qiladi va AutoNav ni sekinlashtiradi.') + '<br><small>' + DRIVE + '</small>'],
        begin() { W.toast(L('Ingenuity is taking off to scout ahead!', 'Ingenuity взлетает на разведку!', 'Ingenuity razvedkaga uchmoqda!')); sfx('whoosh'); },
        update(dt, playing, inp) {
          t += dt;
          const ang = Math.acos(clamp((Math.sin(R.h) * W.sunDir.x + Math.cos(R.h) * W.sunDir.z) / Math.hypot(W.sunDir.x, W.sunDir.z), -1, 1));   // angle between the drive direction and the Sun
          const blind = ang < .42 && inp.thr > 0;
          glareK = lerp(glareK, blind ? 1 : ang < .6 ? .35 : 0, Math.min(1, dt * 4)); W.glare(glareK * .85);
          R.step(dt, inp, { maxMul: blind ? .3 : 1 });
          const next = T.filter(x => !x.b.done).sort((a, b) => R.dist(a.x, a.z) - R.dist(b.x, b.z))[0];
          /* Ingenuity: hops to the next target, hovers there to scout it, then waits for the rover */
          const goal = next ? { x: next.x, z: next.z, y: h(next.x, next.z) + 7 } : { x: R.x + 4, z: R.z + 4, y: R.y + 5 };
          if (state === 'idle') { goal.x = R.x + 4; goal.z = R.z + 3; goal.y = R.y + 3.5; }
          const hp = heli.position, dx = goal.x - hp.x, dz = goal.z - hp.z, dd = Math.hypot(dx, dz), sp = Math.min(dd, dt * 9);
          if (dd > .1) { hp.x += dx / dd * sp; hp.z += dz / dd * sp; }
          hp.y = lerp(hp.y, goal.y + Math.sin(t * 1.7) * .3, Math.min(1, dt * 1.5));
          heli.rotation.y = Math.atan2(dx, dz); heli.rotation.x = dt > 0 ? clamp(sp / dt / 30, 0, .25) : 0;
          heli.userData.rotors.forEach((r, k) => { r.rotation.y += dt * 60 * (k ? -1 : 1); });
          if (Math.random() < dt * 12 && hp.y - h(hp.x, hp.z) < 9) { const a = Math.random() * TAU; rotorDust.emit(hp.x + Math.cos(a) * 1.5, h(hp.x, hp.z) + .2, hp.z + Math.sin(a) * 1.5, Math.cos(a) * 4, .3, Math.sin(a) * 4, 1.4, 1.6); }
          rotorDust.update(dt, .97, 0);
          if (next && !next.b.show && dd < 1.5 && playing) { scout += dt; if (scout > 1.2) { scout = 0; next.b.reveal(); flights++; sfx('spark'); W.toast(L('Ingenuity spotted', 'Ingenuity нашёл цель:', 'Ingenuity topdi:') + ' ' + next.n, 'good'); } }
          let ready = false;
          if (next && next.b.show && playing) {
            const gap = R.dist(next.x, next.z) - next.r - 1.5, a = Math.abs(R.toward(next.x, next.z));
            ready = gap < 1.8 && a < .7 && Math.abs(R.v) < .4;
            if (ready && inp.act) { prog += dt / 3; if (Math.random() < dt * 25) rotorDust.emit(next.x - Math.sin(R.h) * next.r, R.y + .6, next.z - Math.cos(R.h) * next.r, (Math.random() - .5) * 2, Math.random() * 2, (Math.random() - .5) * 2, .8, .5); W.shake(.03); if (Math.random() < dt * 6) sfx('drill'); }
            else prog = Math.max(0, prog - dt);
            if (prog >= 1) { prog = 0; next.b.complete(); got++; sfx('collect'); W.toast(L('Sample tube sealed:', 'Пробирка запечатана:', 'Namuna probirkasi muhrlandi:') + ' ' + next.n + ' ✓', 'good'); }
          }
          T.forEach(x => x.b.update(dt, t));
          if (playing && (got >= 3 || W.timer() > SOL)) {
            const left = 1 - W.timer() / SOL;
            return W.finish(got >= 3 ? (left > .3 ? 3 : 2) : got >= 2 ? 1 : 0, got >= 3 ? L('Three cores sealed!', 'Три керна запечатаны!', 'Uchta namuna muhrlandi!') : L('The sol is over', 'Сол закончился', 'Sol tugadi'),
              L(got + ' of 3 samples · Ingenuity scouted ' + flights + ' target(s)', got + ' из 3 образцов · Ingenuity нашёл целей: ' + flights, '3 tadan ' + got + ' namuna · Ingenuity ' + flights + ' nishon topdi'), real);
          }
          W.chase(dt, { x: R.x, y: R.y, z: R.z }, R.h, { dist: 8.5, height: 3.8, look: 1.5, ground: W.h });
          this.ready = ready; this.prog = prog; this.next = next; this.blind = blind;
        },
        hud() {
          W.setObj(got + ' / 3');
          const nx = this.next;
          W.gauges([
            ...T.map(x => ({ o: x.n, done: x.b.done })),
            { k: L('Sol time left', 'Осталось времени сола', 'Sol vaqti'), v: 1 - W.timer() / SOL, t: fmtTime(Math.max(0, SOL - W.timer())), warn: W.timer() > SOL * .8 },
            { k: L('Coring drill', 'Бур', 'Burg‘u'), v: this.prog, t: nx ? (nx.b.show ? (this.ready ? L('HOLD SPACE', 'ДЕРЖИТЕ ПРОБЕЛ', 'BO‘SHLIQNI BOSING') : R.dist(nx.x, nx.z).toFixed(0) + ' m') : L('scouting…', 'разведка…', 'razvedka…')) : '✓' },
            { k: L('Sun glare', 'Блики Солнца', 'Quyosh nuri'), t: this.blind ? L('CAMERAS BLIND', 'КАМЕРЫ ОСЛЕПЛЕНЫ', 'KAMERALAR KO‘R') : L('clear', 'чисто', 'toza'), warn: this.blind }
          ]);
        },
        map(g, S) {
          const P = mapper(S, R, .9);
          const hp = P(heli.position.x, heli.position.z); g.strokeStyle = '#ffd27a'; g.lineWidth = 3; g.beginPath(); g.moveTo(hp[0] - 8, hp[1] - 8); g.lineTo(hp[0] + 8, hp[1] + 8); g.moveTo(hp[0] + 8, hp[1] - 8); g.lineTo(hp[0] - 8, hp[1] + 8); g.stroke();
          T.forEach(x => { if (x.b.show) mapTarget(g, P(x.x, x.z), x.b.done); });
          const sd = P(R.x + W.sunDir.x * 200, R.z + W.sunDir.z * 200); g.fillStyle = '#ffe9a8'; g.beginPath(); g.arc(clamp(sd[0], 20, S - 20), clamp(sd[1], 20, S - 20), 8, 0, TAU); g.fill();
          mapRover(g, S);
        },
        stop() { W.glare(0); }
      };
    },

    /* ---------------- VOYAGER 1: asteroid belt, Jupiter, Io, Saturn, Titan, the heliopause ---------------- */
    async voyager(W) {
      W.scene.fog = null; W.bloom.strength = .38; W.scene.background = new THREE.Color(0x000004);
      const sc = W.scene;
      /* stars, the Milky Way and the far Sun */
      const sp = [], scol = []; for (let i = 0; i < 6000; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(2400); sp.push(v.x, v.y, v.z); const c = new THREE.Color().setHSL(.55 + Math.random() * .15, .4, .7 + Math.random() * .3); scol.push(c.r, c.g, c.b); }
      const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); sg.setAttribute('color', new THREE.Float32BufferAttribute(scol, 3));
      W.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.5, sizeAttenuation: false, vertexColors: true, depthWrite: false, transparent: true, opacity: .7 })));
      const mw = bake(512, 256, (u, v) => { const band = Math.exp(-Math.pow((v - .5 - Math.sin(u * TAU) * .12) / .09, 2)); const n = seam((a, b) => fbm(a * 8, b * 6, 5), u, v); const a = clamp(band * (n - .25) * 1.6, 0, 1); return [120 + n * 60, 110 + n * 50, 170, a * 70]; });
      W.add(new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 16), new THREE.MeshBasicMaterial({ map: tex(mw), side: THREE.BackSide, transparent: true, depthWrite: false })));
      const glowT = tex(bake(128, 128, (u, v) => { const d = Math.hypot(u - .5, v - .5) * 2; return [255, 240, 210, clamp(Math.pow(1 - d, 2.4), 0, 1) * 255]; }), false);
      const sunS = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffe2b0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .6 })); sunS.scale.setScalar(160); sunS.position.set(0, 30, 300); W.add(sunS);
      const sunL = new THREE.DirectionalLight(0xfff4e6, 1.7); sunL.position.set(-200, 120, 300); W.add(sunL); W.add(new THREE.AmbientLight(0x1a2640, .22));
      /* planets with surfaces baked from noise */
      const planetTex = {
        jupiter: bake(512, 256, (u, v) => { const t = seam((a, b) => fbm(a * 7, b * 14 + 3, 4), u, v), b = Math.sin((v * 15 + (t - .5) * 2.4) * PI); let c = b > 0 ? mix3([226, 204, 168], [246, 238, 222], b * .7) : mix3([226, 204, 168], [150, 98, 66], -b * .85); const du = (u - .32) / .05, dv = (v - .64) / .045, d = du * du + dv * dv; if (d < 1) c = mix3(c, [204, 96, 60], (1 - d) * .9); return c; }),
        io: bake(256, 128, (u, v) => { const n = seam((a, b) => fbm(a * 9 + 3, b * 9, 4), u, v); return n > .62 ? [168, 72, 28] : n < .34 ? [248, 244, 210] : mix3([214, 190, 80], [236, 214, 110], n); }),
        saturn: bake(512, 256, (u, v) => { const t = seam((a, b) => fbm(a * 5, b * 10 + 9, 3), u, v), b = Math.sin((v * 11 + (t - .5)) * PI); return b > 0 ? mix3([224, 202, 152], [240, 226, 188], b * .6) : mix3([224, 202, 152], [186, 152, 104], -b * .6); }),
        titan: bake(256, 128, (u, v) => { const n = seam((a, b) => fbm(a * 4, b * 4, 3), u, v); return mix3([200, 140, 60], [230, 170, 80], n); })
      };
      const planet = (k, r, x, y, z, tilt) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 40), new THREE.MeshStandardMaterial({ map: tex(planetTex[k]), roughness: 1 })); m.position.set(x, y, z); m.rotation.z = tilt || 0; W.add(m); return m; };
      const jup = planet('jupiter', 70, -110, -10, -560, .05), io = planet('io', 4, -40, 26, -650), sat = planet('saturn', 52, 125, -6, -1000, .45), titan = planet('titan', 6.5, 58, 26, -1085);
      const ringT = bake(512, 8, (u) => { const r = u; const a = (r < .08 ? 0 : r < .3 ? .35 : r < .62 ? .95 : r < .66 ? .05 : r < .9 ? .7 : r < .95 ? .2 : 0) * (.8 + .2 * Math.sin(u * 120)); return [230, 214, 176, a * 255]; });
      const rg = new THREE.RingGeometry(66, 128, 128, 1), rp2 = rg.attributes.position, ruv = rg.attributes.uv; for (let i = 0; i < rp2.count; i++) { const d = Math.hypot(rp2.getX(i), rp2.getY(i)); ruv.setXY(i, (d - 66) / 62, .5); }
      const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: tex(ringT), transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1 })); ring.position.copy(sat.position); ring.rotation.set(-PI / 2 + .22, 0, .45); W.add(ring);
      const tGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowT, color: 0xffa040, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .5 })); tGlow.scale.setScalar(22); tGlow.position.copy(titan.position); W.add(tGlow);
      /* the asteroid belt (the real one is mostly empty space; here it is crowded to make it a challenge) */
      const ast = new THREE.InstancedMesh(rockGeo(5, 1), new THREE.MeshStandardMaterial({ color: 0x4a443f, roughness: 1, flatShading: true }), 240), A = [], m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
      for (let i = 0; i < 240; i++) A.push({ x: (Math.random() - .5) * 110, y: (Math.random() - .5) * 70, z: -80 - Math.random() * 300, s: 1 + Math.random() * 3.5, rx: Math.random() * 2, ry: Math.random() * 2, a: Math.random() * 9 });
      W.add(ast);
      /* the heliopause: a shimmering wall where the Sun's wind meets interstellar space */
      const helio = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1000, 1, 1), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { t: { value: 0 } },
        vertexShader: 'varying vec2 vU; void main(){ vU = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
        fragmentShader: `uniform float t; varying vec2 vU; float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + 1.), f.x), f.y); }
          void main(){ vec2 p = vU * 9.; float v = n(p + t * .3) * .6 + n(p * 2.3 - t * .2) * .4; float edge = smoothstep(.0, .25, vU.x) * smoothstep(1., .75, vU.x) * smoothstep(0., .25, vU.y) * smoothstep(1., .75, vU.y);
            gl_FragColor = vec4(vec3(.5, .38, .95) * (.2 + v * .45), (.08 + v * .16) * edge); }` }));
      helio.position.set(0, 0, -1500); W.add(helio);
      const gates = [
        { n: L('Jupiter flyby · 5 March 1979', 'Пролёт Юпитера · 5 марта 1979', 'Yupiter yonidan · 1979-yil 5-mart'), x: -25, y: -4, z: -560 },
        { n: L('Io: active volcanoes!', 'Ио: действующие вулканы!', 'Io: faol vulqonlar!'), x: -30, y: 18, z: -650 },
        { n: L('Saturn flyby · 12 November 1980', 'Пролёт Сатурна · 12 ноября 1980', 'Saturn yonidan · 1980-yil 12-noyabr'), x: 45, y: -14, z: -1000 },
        { n: L('Titan: a thick orange haze', 'Титан: плотная оранжевая дымка', 'Titan: qalin to‘q sariq tuman'), x: 48, y: 22, z: -1085 }
      ].map(gd => {
        const r = new THREE.Mesh(new THREE.TorusGeometry(10, .45, 12, 72), new THREE.MeshStandardMaterial({ color: 0x79dce8, emissive: 0x79dce8, emissiveIntensity: 1.3 }));
        r.position.set(gd.x, gd.y, gd.z); W.add(r); const tg = label(gd.n); tg.position.set(gd.x, gd.y + 14, gd.z); tg.scale.set(16, 3, 1); W.add(tg);
        return Object.assign(gd, { r, tg, st: 0 });
      });
      const wind = particles(W, 700, 0xffd9a0, { add: true, op: .3 });
      const model = await nasaModel(W, 'voy', 6, 0); if (!W.alive()) return null; W.add(model);
      const p = { x: 0, y: 0, z: 40, vx: 0, vy: 0, sp: 44, boostT: 0 }; W.P = p;
      let next = 0, hits = 0, dmg = 0, hitCD = 0, power = 470, spent = 0, crossed = false, t = 0;
      const INST = ['ISS', 'IRIS', 'PPS', 'PRA', 'UVS', 'PLS', 'CRS', 'LECP', 'MAG', 'PWS'];
      const instOn = () => clamp(Math.round(2 + (power - 220) / 250 * 8), 2, 10);
      const AU = z => z > -560 ? lerp(1, 5.2, -z / 560) : z > -1000 ? lerp(5.2, 9.5, (-z - 560) / 440) : lerp(9.5, 121.6, clamp((-z - 1000) / 500, 0, 1));
      const real = L('Voyager 1 launched on 5 September 1977, passed Jupiter on 5 March 1979 (finding volcanoes on Io) and Saturn on 12 November 1980. Its close pass of Titan flung it up out of the planets’ plane, so it visited no more planets. On 14 February 1990 it took the “Pale Blue Dot”, and on 25 August 2012 it crossed the heliopause into interstellar space. Its plutonium generators lose about 4 W a year: NASA switched off LECP on 17 April 2026, and only MAG and PWS are still on.',
        'Voyager 1 стартовал 5 сентября 1977 года, пролетел Юпитер 5 марта 1979 года (и нашёл вулканы на Ио) и Сатурн 12 ноября 1980 года. Близкий пролёт Титана выбросил его вверх из плоскости планет, поэтому больше планет он не посетил. 14 февраля 1990 года он снял «Бледно-голубую точку», а 25 августа 2012 года пересёк гелиопаузу и вышел в межзвёздное пространство. Его плутониевые генераторы теряют около 4 Вт в год: 17 апреля 2026 года NASA выключило LECP, и работают только MAG и PWS.',
        'Voyager 1 1977-yil 5-sentabrda uchirildi, 1979-yil 5-martda Yupiter (Io da vulqonlarni topdi), 1980-yil 12-noyabrda Saturn yonidan o‘tdi. Titan yonidan yaqin o‘tish uni sayyoralar tekisligidan yuqoriga otib yubordi, shuning uchun boshqa sayyoralarga bormadi. 1990-yil 14-fevralda u «Xira-moviy nuqta»ni suratga oldi, 2012-yil 25-avgustda esa geliopauzani kesib, yulduzlararo fazoga chiqdi. Plutoniy generatorlari yiliga ~4 Vt yo‘qotadi: NASA 2026-yil 17-aprelda LECP ni o‘chirdi, faqat MAG va PWS ishlamoqda.');
      return {
        go: L('IGNITION!', 'ЗАЖИГАНИЕ!', 'START!'),
        brief: [L('VOYAGER 1 · THE GRAND TOUR, 1977–2012', 'VOYAGER 1 · БОЛЬШОЙ ТУР, 1977–2012', 'VOYAGER 1 · KATTA SAYOHAT, 1977–2012'),
          L('Steer with the arrows or WASD. Dodge the asteroid belt, then fly through the four flyby rings at Jupiter, Io, Saturn and Titan: each one is a <b>gravity assist</b> that speeds you up. Space is a boost, but it burns your plutonium power, and as power falls, instruments switch off. Cross the heliopause into interstellar space!',
            'Управляйте стрелками или WASD. Увернитесь от астероидов, затем пролетите через четыре кольца у Юпитера, Ио, Сатурна и Титана: каждое — это <b>гравитационный манёвр</b>, который ускоряет вас. Пробел — ускорение, но оно тратит плутониевую энергию, а при её падении приборы отключаются. Пересеките гелиопаузу и выйдите в межзвёздное пространство!',
            'Strelkalar yoki WASD bilan boshqaring. Asteroidlardan qoching, so‘ng Yupiter, Io, Saturn va Titan yonidagi to‘rtta halqadan o‘ting: har biri sizni tezlashtiradigan <b>gravitatsion manyovr</b>. Bo‘shliq — tezlashish, lekin u plutoniy quvvatini sarflaydi, quvvat kamaysa asboblar o‘chadi. Geliopauzani kesib, yulduzlararo fazoga chiqing!')],
        update(dt, playing, inp) {
          t += dt; helio.material.uniforms.t.value = t;
          jup.rotation.y += dt * .05; sat.rotation.y += dt * .04; io.rotation.y += dt * .1;
          A.forEach((a, i) => { q.setFromEuler(new THREE.Euler(a.rx * t * .3, a.ry * t * .3, 0)); m4.compose(new THREE.Vector3(a.x, a.y, a.z), q, new THREE.Vector3(a.s, a.s, a.s)); ast.setMatrixAt(i, m4); }); ast.instanceMatrix.needsUpdate = true;
          if (playing) {
            const boosting = inp.boost && power > 236;
            p.vx = (p.vx + (inp.steer * -1) * 70 * dt) * Math.pow(.25, dt); p.vy = (p.vy + inp.thr * 70 * dt) * Math.pow(.25, dt);
            [[jup, 70], [sat, 52]].forEach(([pl, r]) => { const dx = pl.position.x - p.x, dy = pl.position.y - p.y, dz = pl.position.z - p.z, d = Math.hypot(dx, dy, dz); if (d < 260) { const g = 1400 / (d * d) * r / 60; p.vx += dx / d * g * dt * 60; p.vy += dy / d * g * dt * 60; } });
            p.x = clamp(p.x + p.vx * dt, -70, 70); p.y = clamp(p.y + p.vy * dt, -45, 45);
            p.boostT = Math.max(0, p.boostT - dt);
            const target = 44 + (boosting ? 30 : 0) + p.boostT * 16; p.sp = lerp(p.sp, target, Math.min(1, dt * 2)); p.z -= p.sp * dt;
            if (boosting) spent += dt * 5;                         // boosting burns power the instruments need
            power = Math.max(220, 470 - 235 * clamp(-p.z / 1500, 0, 1) - spent);   // the RTGs fade as the years and the distance pass
            hitCD -= dt;
            for (const a of A) { if (Math.abs(a.z - p.z) < a.s + 3 && Math.hypot(a.x - p.x, a.y - p.y) < a.s + 2 && hitCD <= 0) { dmg++; hitCD = 1; W.shake(.8); sfx('bump'); W.toast(L('Asteroid hit! Antenna knocked off target', 'Удар астероида! Антенна сбилась', 'Asteroid urildi! Antenna yo‘nalishdan chiqdi'), 'bad'); } }
            const gd = gates[next];
            if (gd && p.z < gd.z) {
              const ok = Math.hypot(p.x - gd.x, p.y - gd.y) < 10.5; gd.st = ok ? 1 : -1; next++;
              gd.r.material.color.set(ok ? 0x6bffa8 : 0xff7b54); gd.r.material.emissive.set(ok ? 0x6bffa8 : 0xff7b54);
              if (ok) { hits++; p.boostT = 3; sfx('whoosh'); W.toast(gd.n + ' ✓ ' + L('gravity assist!', 'гравиманёвр!', 'gravitatsion manyovr!'), 'good'); } else { sfx('alarm'); W.toast(gd.n + ' ✗ ' + L('missed', 'промах', 'o‘tkazib yuborildi'), 'bad'); }
            }
            if (!crossed && p.z < -1500) { crossed = true; sfx('spark'); W.toast(L('Heliopause crossed: interstellar space! (25 Aug 2012)', 'Гелиопауза пройдена: межзвёздное пространство! (25 авг. 2012)', 'Geliopauza kesildi: yulduzlararo fazo! (2012-yil 25-avg.)'), 'good'); }
            if (p.z < -1600) return W.finish(hits >= 4 && dmg <= 1 ? 3 : hits >= 2 ? 2 : 1, L('Into interstellar space!', 'В межзвёздное пространство!', 'Yulduzlararo fazoga!'),
              L(hits + ' of 4 flybys · ' + dmg + ' asteroid hit(s) · ' + instOn() + ' of 10 instruments still on', 'Пролётов: ' + hits + ' из 4 · ударов: ' + dmg + ' · приборов включено: ' + instOn() + ' из 10', '4 tadan ' + hits + ' yaqin o‘tish · ' + dmg + ' urilish · 10 tadan ' + instOn() + ' asbob ishlayapti'), real);
          }
          gates.forEach(gd => { gd.r.rotation.z += dt * .4; if (gd.st) gd.r.scale.multiplyScalar(1 + dt * .4); });
          for (let i = 0; i < 10; i++) wind.emit(p.x + (Math.random() - .5) * 140, p.y + (Math.random() - .5) * 90, p.z - 20 - Math.random() * 160, 0, 0, crossed ? 70 : -40, 2.5, 1.4);
          wind.mat.uniforms.color.value.set(crossed ? 0xb9a2ff : 0xffd9a0);
          wind.update(dt, 1, 0);
          model.position.set(p.x, p.y, p.z); model.rotation.set(p.vy * .01, PI, -p.vx * .015);
          sunS.material.opacity = .6 * clamp(1 - (-p.z) / 900, .15, 1); sunS.scale.setScalar(lerp(160, 30, clamp(-p.z / 1500, 0, 1))); sunL.intensity = 1.7 * clamp(1 - (-p.z) / 2400, .35, 1);
          if (state === 'idle' || state === 'done') { W.chase(dt, { x: p.x, y: p.y, z: p.z }, PI, { dist: 18, height: 5, look: 0, k: 2 }); }
          else { camera.position.lerp(new THREE.Vector3(p.x * .85 + Math.sin(camYaw) * 20 * camZoom, p.y * .85 + 5 + camPitch * 20, p.z + Math.cos(camYaw) * 20 * camZoom), 1 - Math.exp(-dt * 4)); camera.lookAt(p.x, p.y, p.z - 30); }
          engine(playing ? clamp(p.sp / 100, .2, 1) : 0);
          this.p = p;
        },
        hud() {
          W.setObj(hits + ' / 4');
          const gd = gates[next];
          W.gauges([
            { k: L('Next', 'Далее', 'Keyingi'), t: gd ? gd.n.split(' · ')[0].split(':')[0] : crossed ? L('Interstellar space', 'Межзвёздное пространство', 'Yulduzlararo fazo') : L('Heliopause', 'Гелиопауза', 'Geliopauza') },
            { k: L('Distance from the Sun', 'Расстояние от Солнца', 'Quyoshdan masofa'), v: clamp(-p.z / 1600, 0, 1), t: AU(p.z).toFixed(1) + ' AU' },
            { k: L('Speed', 'Скорость', 'Tezlik'), t: (p.sp * .39).toFixed(1) + ' km/s' },
            { k: L('Power (RTG)', 'Энергия (РИТЭГ)', 'Quvvat (RTG)'), v: (power - 220) / 250, t: Math.round(power) + ' W', warn: power < 280 },
            { k: L('Instruments on', 'Приборов включено', 'Ishlayotgan asboblar'), t: instOn() + ' / 10' + (instOn() <= 4 ? ' · ' + INST.slice(10 - instOn()).join(' ') : '') },
            { k: L('Asteroid hits', 'Удары астероидов', 'Asteroid urilishlari'), t: String(dmg), warn: dmg > 1 }
          ]);
        },
        map(g, S) {                                                   // a strip map of the route instead of a top view
          const y = z => 22 + clamp(-z / 1620, 0, 1) * (S - 44), x0 = S / 2;
          g.strokeStyle = 'rgba(121,220,232,.35)'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0, 22); g.lineTo(x0, S - 22); g.stroke();
          g.fillStyle = 'rgba(140,130,120,.5)'; g.fillRect(x0 - 26, y(-80), 52, y(-380) - y(-80));
          [[jup, '#e0c08a', 13], [io, '#e8d070', 5], [sat, '#e6d39b', 11], [titan, '#e0a050', 5]].forEach(([pl, c, r]) => { g.fillStyle = c; g.beginPath(); g.arc(x0 + clamp(pl.position.x * .6, -60, 60), y(pl.position.z), r, 0, TAU); g.fill(); });
          g.strokeStyle = '#b9a2ff'; g.lineWidth = 3; g.beginPath(); g.moveTo(x0 - 70, y(-1500)); g.lineTo(x0 + 70, y(-1500)); g.stroke();
          gates.forEach(gd => mapTarget(g, [x0 + gd.x * .6, y(gd.z)], gd.st > 0, gd.st < 0 ? '#ff7b54' : '#79dce8', 6));
          g.fillStyle = '#fff'; g.beginPath(); g.arc(x0 + p.x * .6, y(p.z), 7, 0, TAU); g.fill();
        }
      };
    },

    /* ---------------- APOLLO 11: level and aim the reflector, then time the laser's echo ---------------- */
    async apollo(W) {
      const craters = Array.from({ length: 40 }, (_, i) => ({ x: (hash(i, 1) - .5) * 300, z: (hash(i, 2) - .5) * 300, r: 3 + hash(i, 3) * 18, d: .6 + hash(i, 4) * 2 })).filter(c => Math.hypot(c.x, c.z) > c.r + 14);
      const h = (x, z) => { let y = fbm(x * .02 + 30, z * .02, 4) * 2 - 1 + fbm(x * .2, z * .2, 2) * .15; craters.forEach(c => { y += crater(x, z, c); }); return y; };
      W.scene.background = new THREE.Color(0x000000);
      sky(W, 0x000000, 0x000000, new THREE.Vector3(-.6, .25, .4), 0x000000, 1.2);
      W.h = h;
      terrain(W, 420, 200, h, (x, z, y, sl) => { const n = fbm(x * .05, z * .05, 3); const k = .38 + n * .18 - sl * .4; return [k, k, k * 1.02]; }, 6);
      const sunDir = new THREE.Vector3(-.6, .25, .4).normalize();
      const sun = new THREE.DirectionalLight(0xffffff, 2.8); sun.position.copy(sunDir).multiplyScalar(80); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
      Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 200 }); W.add(sun); W.add(sun.target);
      W.add(new THREE.HemisphereLight(0x8090a8, 0x101012, .25));
      rocks(W, 500, 260, h, 0x8a8a8e, [{ x: 0, z: 0, r: 10 }], null, 31);
      /* the Lunar Module Eagle a short walk away, and the flag */
      const M = MAT(), lm = new THREE.Group();
      const ds = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.7, 8), M.gold); ds.position.y = 2.2; lm.add(ds);
      const as = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.8, 2, 7), new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: .6, roughness: .4 })); as.position.y = 4.1; lm.add(as);
      const win = box(.7, .5, .2, M.black); win.position.set(0, 4.4, 1.75); lm.add(win);
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([a, b]) => { lm.add(strut([a * 1.6, 1.8, b * 1.6], [a * 3, 0.1, b * 3], .12, M.gold)); const pad = new THREE.Mesh(new THREE.CylinderGeometry(.45, .5, .12, 16), M.alu); pad.position.set(a * 3, .1, b * 3); lm.add(pad); });
      lm.position.set(-12, h(-12, -14), -14); lm.rotation.y = .5; lm.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); W.add(lm);
      const fc = document.createElement('canvas'); fc.width = 190; fc.height = 100; const fx = fc.getContext('2d');
      for (let i = 0; i < 13; i++) { fx.fillStyle = i % 2 ? '#fff' : '#b22234'; fx.fillRect(0, i * 100 / 13, 190, 100 / 13 + 1); } fx.fillStyle = '#3c3b6e'; fx.fillRect(0, 0, 76, 54);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1), new THREE.MeshStandardMaterial({ map: tex(fc), side: THREE.DoubleSide, roughness: .8 })); flag.position.set(-5, h(-5, -9) + 2.4, -9); flag.rotation.y = .3; W.add(flag);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, 3, 8), M.alu); pole.position.set(-5.95, h(-5, -9) + 1.5, -9.3); W.add(pole);
      /* the reflector itself: 100 fused-silica corner cubes in a tilting aluminium panel */
      const g = new THREE.Group(), pallet = box(.62, .045, .56, M.dark); pallet.position.y = .0225; g.add(pallet);
      const tilt = new THREE.Group(); tilt.position.set(0, .12, .02); g.add(tilt);
      const panelM = box(.48, .04, .48, M.alu); tilt.add(panelM);
      const cubes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.0185, .0185, .012, 20), M.glass, 100), m4 = new THREE.Matrix4();
      for (let i = 0; i < 100; i++) cubes.setMatrixAt(i, m4.makeTranslation(((i % 10) - 4.5) * .044, .024, (Math.floor(i / 10) - 4.5) * .044)); tilt.add(cubes);
      [-.25, .25].forEach(x => { g.add(strut([x, .05, -.2], [x, .16, -.18], .02, M.dark)); g.add(strut([x, .05, .22], [x, .11, .2], .02, M.dark)); });
      g.scale.setScalar(7); g.position.y = h(0, 0); g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }); W.add(g);
      tilt.rotation.x = -.2; g.rotation.y = 2.3;
      /* Earth, high in the lunar sky */
      const az = .2 + Math.random() * .6, el = .78 + Math.random() * .2, E = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
      const et = bake(512, 256, (u, v) => { const l = seam((a, b) => fbm(a * 5 + 40, b * 5, 5), u, v), cl = seam((a, b) => fbm(a * 9 + 70, b * 9, 4), u, v), lat = Math.abs(v - .5) * 2; let c = l > .53 ? mix3([64, 108, 48], [160, 136, 88], clamp((l - .53) * 4, 0, 1)) : mix3([10, 34, 100], [30, 96, 176], clamp(l * 1.7, 0, 1)); if (lat > .8) c = mix3(c, [240, 246, 255], .92); if (cl > .55) c = mix3(c, [250, 252, 255], clamp((cl - .55) * 4.5, 0, .94)); return c; });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(5, 48, 32), new THREE.MeshStandardMaterial({ map: tex(et), roughness: .8, emissive: 0x0a1a33, emissiveIntensity: .3 })); earth.position.copy(E).multiplyScalar(110).add(new THREE.Vector3(0, h(0, 0), 0)); W.add(earth);
      const eg = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0x5aa0ff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .45 })); eg.scale.setScalar(16); eg.position.copy(earth.position); W.add(eg);
      /* the laser: a green beam down from Earth, a pulse running along it */
      const top = earth.position.clone(), bot = new THREE.Vector3(0, h(0, 0) + 1.2, 0);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.08, .45, 1, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0x46ff8a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      beam.position.copy(top).add(bot).multiplyScalar(.5); beam.scale.y = top.distanceTo(bot); beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize()); W.add(beam);
      const pulse = new THREE.Mesh(new THREE.SphereGeometry(.6, 16, 12), new THREE.MeshBasicMaterial({ color: 0xb6ffd0 })); pulse.visible = false; W.add(pulse);
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot(), color: 0x7dffb0, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); flash.position.copy(bot); flash.scale.setScalar(8); W.add(flash);
      const q = new THREE.Quaternion(), n = new THREE.Vector3();
      /* where the reflector is pointing: a faint guide line that turns green when it is on Earth */
      const aimGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 1, 0)]);
      const aimLine = new THREE.Line(aimGeo, new THREE.LineBasicMaterial({ color: 0x79dce8, transparent: true, opacity: .55 })); W.add(aimLine);
      /* the camera stands behind the reflector, facing Earth, so the target is always in the picture (drag still looks around) */
      const backYaw = Math.atan2(-E.x, -E.z), vWant = new THREE.Vector3(), vLook = new THREE.Vector3();
      camera.fov = 72; camera.updateProjectionMatrix();             // wide enough for the reflector and Earth high above it
      const view = (dt, k) => {
        const yaw = backYaw + camYaw, d = 10 * camZoom;
        vWant.set(bot.x + Math.sin(yaw) * d, bot.y + 3.2 + camPitch * 6, bot.z + Math.cos(yaw) * d);
        camera.position.lerp(vWant, 1 - Math.exp(-dt * 2.5));
        vLook.copy(bot).lerp(earth.position, k); camera.lookAt(vLook);
      };
      let phase = 'aim', err = 90, hold = 0, aimT = 0, shot = 0, shotT = -1, pressed = false, results = [], waitT = 0;
      const RT = 2.564, C = 299792.458;
      const real = L('Buzz Aldrin set up the reflector on 21 July 1969 (UTC), a short walk from the Lunar Module. It has no power and no moving parts: 100 fused-silica corner cubes send light straight back to where it came from. Observatories time the laser round trip, about 2.5 seconds, to measure the Earth–Moon distance to within a few millimetres. In good conditions only about one photon returns every few seconds. The Moon is drifting away by about 3.8 cm a year, and the reflector still works after more than 55 years.',
        'Базз Олдрин установил отражатель 21 июля 1969 года (UTC) в нескольких шагах от лунного модуля. У него нет питания и подвижных частей: 100 уголковых отражателей из кварцевого стекла отправляют свет точно туда, откуда он пришёл. Обсерватории замеряют время полёта лазерного импульса туда и обратно, около 2,5 секунды, и измеряют расстояние до Луны с точностью до нескольких миллиметров. В хороших условиях возвращается примерно один фотон за несколько секунд. Луна удаляется примерно на 3,8 см в год, а отражатель работает уже более 55 лет.',
        'Bazz Oldrin reflektorni 1969-yil 21-iyulda (UTC) Oy modulidan bir necha qadam narida o‘rnatdi. Unda quvvat ham, harakatlanuvchi qismlar ham yo‘q: kvars shishadan yasalgan 100 ta burchakli prizma yorug‘likni aynan kelgan joyiga qaytaradi. Observatoriyalar lazerning borib-kelish vaqtini (taxminan 2,5 soniya) o‘lchab, Oygacha masofani bir necha millimetr aniqlikda topadi. Yaxshi sharoitda bir necha soniyada atigi bitta foton qaytadi. Oy yiliga taxminan 3,8 sm uzoqlashmoqda, reflektor esa 55 yildan ortiq ishlamoqda.');
      return {
        brief: [L('APOLLO 11 · SEA OF TRANQUILITY, 1969', 'APOLLO 11 · МОРЕ СПОКОЙСТВИЯ, 1969', 'APOLLO 11 · OSOYISHTALIK DENGIZI, 1969'),
          L('First aim the reflector at Earth: ←/→ turn it, ↑/↓ tilt it, and hold within 2.5° to lock it. Then an observatory fires five laser pulses. Each one takes about 1.28 s to reach the Moon and 1.28 s back: press <b>Space</b> the moment it gets home. Your timing measures the distance to the Moon!',
            'Сначала наведите отражатель на Землю: ←/→ поворот, ↑/↓ наклон; удержите точность до 2,5°, чтобы зафиксировать. Затем обсерватория выпустит пять лазерных импульсов. Каждый летит до Луны около 1,28 с и столько же обратно: нажмите <b>Пробел</b>, когда он вернётся на Землю. По вашему времени вычислится расстояние до Луны!',
            'Avval reflektorni Yerga qarating: ←/→ burish, ↑/↓ engashtirish; qulflash uchun 2,5° ichida ushlab turing. Keyin observatoriya beshta lazer impulsini otadi. Har biri Oyga taxminan 1,28 s da yetadi va shuncha vaqtda qaytadi: u Yerga qaytgan lahzada <b>Bo‘shliq</b>ni bosing. Vaqtingiz Oygacha masofani o‘lchaydi!')],
        update(dt, playing, inp) {
          if (phase === 'aim') {
            if (playing) { aimT += dt; g.rotation.y += -inp.steer * .8 * dt; tilt.rotation.x = clamp(tilt.rotation.x - inp.thr * .55 * dt, -1.5, .3); }
            tilt.updateWorldMatrix(true, false); n.set(0, 1, 0).applyQuaternion(tilt.getWorldQuaternion(q));
            err = Math.acos(clamp(n.dot(E), -1, 1)) * 180 / PI;
            const ap = aimGeo.attributes.position; ap.setXYZ(0, bot.x, bot.y, bot.z); ap.setXYZ(1, bot.x + n.x * 130, bot.y + n.y * 130, bot.z + n.z * 130); ap.needsUpdate = true;
            aimLine.material.color.set(err < 2.5 ? 0x6ee7a8 : err < 10 ? 0xffd166 : 0x79dce8);
            hold = playing && err < 2.5 ? hold + dt : Math.max(0, hold - dt * 2);
            if (hold > 1.5) { phase = 'laser'; waitT = 1.2; aimLine.visible = false; sfx('collect'); W.toast(L('Locked on Earth! The observatory is about to fire', 'Наведено на Землю! Обсерватория готовится к выстрелу', 'Yerga qaratildi! Observatoriya otishga tayyor'), 'good'); }
            view(dt, .1);
          } else if (phase === 'laser') {
            view(dt, .12);
            if (!playing) return;
            if (shotT < 0) { waitT -= dt; if (waitT <= 0) { shotT = 0; pressed = false; sfx('laser'); } }
            else {
              shotT += dt;
              const k = shotT < RT / 2 ? shotT / (RT / 2) : 2 - shotT / (RT / 2);
              pulse.visible = shotT < RT + .3; pulse.position.copy(top).lerp(bot, clamp(k, 0, 1));
              beam.material.opacity = .22 * clamp(1 - Math.abs(shotT - RT / 2) / 2.5, .3, 1);
              if (shotT > RT / 2 && shotT < RT / 2 + .15) { flash.material.opacity = 1; } flash.material.opacity = Math.max(0, flash.material.opacity - dt * 2);
              if (inp.act && !pressed && shotT > .3) {
                pressed = true; const e2 = Math.abs(shotT - RT); results.push(e2);
                const km = Math.round(C * shotT / 2 / 100) * 100;
                sfx(e2 < .08 ? 'collect' : e2 < .25 ? 'ok' : 'alarm');
                W.toast(L('Echo at ', 'Эхо через ', 'Aks-sado ') + shotT.toFixed(2) + ' s → ' + km.toLocaleString(LANG === 'en' ? 'en-US' : 'ru-RU') + ' km' + (e2 < .08 ? ' ✓' : ''), e2 < .08 ? 'good' : e2 < .25 ? '' : 'bad');
                next();
              } else if (shotT > RT + 1) { pressed = true; results.push(2); W.toast(L('Missed the echo', 'Эхо пропущено', 'Aks-sado o‘tkazib yuborildi'), 'bad'); next(); }
            }
          }
          function next() {
            shot++; shotT = -1; waitT = 1.4; pulse.visible = false; beam.material.opacity = 0;
            if (shot >= 5) {
              const avg = results.reduce((a, b) => a + b, 0) / results.length, good = results.filter(e => e < .25).length;
              const stars = good === 0 ? 0 : avg < .1 && aimT < 40 ? 3 : avg < .25 ? 2 : 1;
              W.finish(stars, L('Laser ranging complete!', 'Лазерная локация завершена!', 'Lazer o‘lchash yakunlandi!'),
                L('Average timing error ' + avg.toFixed(2) + ' s · good echoes ' + good + ' / 5 · aiming ' + Math.round(aimT) + ' s', 'Средняя ошибка ' + avg.toFixed(2) + ' с · точных эхо ' + good + ' / 5 · наведение ' + Math.round(aimT) + ' с', 'O‘rtacha xato ' + avg.toFixed(2) + ' s · aniq aks-sado ' + good + ' / 5 · yo‘naltirish ' + Math.round(aimT) + ' s'), real);
            }
          }
        },
        hud() {
          W.setObj(phase === 'aim' ? L('AIM', 'НАВЕДЕНИЕ', 'YO‘NALTIRISH') : shot + ' / 5');
          if (phase === 'aim') W.gauges([
            { o: L('Aim the reflector at Earth', 'Навести отражатель на Землю', 'Reflektorni Yerga qaratish'), done: false },
            { o: L('Time five laser echoes', 'Поймать пять лазерных эхо', 'Beshta lazer aks-sadosini tutish'), done: false },
            { k: L('Angle to Earth', 'Угол до Земли', 'Yergacha burchak'), v: 1 - clamp(err / 60, 0, 1), t: err.toFixed(1) + '°', warn: err > 20 },
            { k: L('Lock', 'Фиксация', 'Qulflash'), v: hold / 1.5, t: err < 2.5 ? L('HOLD STEADY', 'ДЕРЖИТЕ', 'USHLAB TURING') : L('need < 2.5°', 'нужно < 2,5°', '< 2,5° kerak') }
          ]);
          else W.gauges([
            { o: L('Aim the reflector at Earth', 'Навести отражатель на Землю', 'Reflektorni Yerga qaratish'), done: true },
            { o: L('Time five laser echoes', 'Поймать пять лазерных эхо', 'Beshta lazer aks-sadosini tutish'), done: shot >= 5 },
            { k: L('Pulse timer', 'Таймер импульса', 'Impuls taymeri'), v: shotT < 0 ? 0 : shotT / (RT + .8), t: shotT < 0 ? L('get ready…', 'приготовьтесь…', 'tayyorlaning…') : shotT.toFixed(2) + ' s', warn: shotT > RT - .25 && shotT < RT + .25 },
            { k: L('Target', 'Цель', 'Nishon'), t: '≈ ' + RT.toFixed(2) + ' s ' + L('round trip', 'туда и обратно', 'borib-kelish') },
            { k: L('Echoes', 'Эхо', 'Aks-sado'), t: results.map(e => e < .08 ? '◆' : e < .25 ? '◇' : '·').join(' ') || '–' }
          ]);
        },
        map: null
      };
    }
  };

  /* start with Voyager, or the mission named in the address (#/play?m=spirit is not used; keep it simple) */
  select('voyager');
  window.SpaceSim = { select, start, togglePause, get world() { return W; }, get state() { return state; }, get renderer() { return renderer; }, get scene() { return scene; }, composer,
    tick(n, dt = 1 / 30) { for (let i = 0; i < n && ctl; i++) { if (state === 'play') timer += dt; ctl.update(dt, state === 'play', input(), state); } if (ctl && ctl.hud) ctl.hud(); }   // test hook: advance the game without waiting for frames
  };
}
