// Desktop cat: animation, behaviour, care stats and input.
// Runs inside the Electron window (window.catApi from preload.js) or, without
// Electron, as a browser preview where the page itself plays the desktop.
(() => {
  'use strict';

  const S = window.CatSprites;

  // ---- Layout -------------------------------------------------------------
  const W = 220; // window / canvas size (must match main.js)
  const H = 170;
  const SCALE = 4;
  const CAT_W = S.WIDTH * SCALE;
  const CAT_H = S.HEIGHT * SCALE;
  const CAT_LEFT = Math.round((W - CAT_W) / 2);
  const CAT_TOP = H - CAT_H - 2;
  const HEAD_COL = 20.5; // head centre column when facing right

  // ---- Tuning -------------------------------------------------------------
  const WALK_SPEED = 40; // px per second
  const HUNGRY_WALK_SPEED = 20;
  const GRAVITY = 1800;
  const FULLNESS_DECAY_SEC = 60; // lose 1 fullness point every 60 s
  const MOOD_DECAY_SEC = 45;
  const OFFLINE_DECAY_FACTOR = 0.5; // decays slower while the app is closed

  const LINES = {
    hello: ['喵～', '我來了喵！'],
    pet: ['喵～', '喵喵！', '喵？', '呼嚕呼嚕…', '喵嗚～', '再摸一下喵'],
    wake: ['喵…？', '被吵醒了喵…'],
    feed: ['開動了喵～', '好吃喵！'],
    full: ['吃不下了喵…'],
    play: ['好好玩喵！', '再來再來！'],
    tired: ['沒力氣玩了喵…'],
    land: ['喵！', '嚇死喵了！'],
    hungry: ['肚子餓了喵…', '想吃罐罐…'],
    lonely: ['陪我玩嘛…', '好無聊喵…'],
    sleep: ['呼…', '晚安喵…'],
  };

  // ---- DOM ----------------------------------------------------------------
  const canvas = document.getElementById('cat');
  const ctx = canvas.getContext('2d');
  const bubble = document.getElementById('bubble');

  const api = window.catApi || createPreviewApi();

  // ---- Helpers ------------------------------------------------------------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // ---- Sprite cache -------------------------------------------------------
  const spriteCache = new Map();
  function spriteCanvas(rows, flip) {
    const key = rows.join('|') + (flip ? '<' : '>');
    let c = spriteCache.get(key);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = rows[0].length;
    c.height = rows.length;
    const g = c.getContext('2d');
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const ch = row[x];
        if (ch === '.') continue;
        g.fillStyle = S.PALETTE[ch];
        g.fillRect(flip ? row.length - 1 - x : x, y, 1, 1);
      }
    });
    spriteCache.set(key, c);
    return c;
  }

  // ---- State --------------------------------------------------------------
  const stats = { fullness: 80, mood: 80 };
  const cat = {
    state: 'idle',
    t: 0,
    dur: 3,
    dir: -1, // -1 = facing left, 1 = facing right
    animT: 0,
    yOff: 0,
    vy: 0,
    blinkIn: rand(2, 5),
    blinkT: 0,
    rows: S.build(),
  };
  const pos = { x: 0, y: 0 };
  let area = { x: 0, y: 0, width: 1280, height: 720 };
  let particles = [];
  let bubbleTimer = 0;
  let needsTimer = rand(25, 40);
  let saveTimer = 15;
  let lastPetAt = 0;

  const groundY = () => area.y + area.height - H;
  const minX = () => area.x;
  const maxX = () => area.x + area.width - W;

  function setState(state, dur) {
    cat.state = state;
    cat.t = 0;
    cat.dur = dur;
    cat.yOff = 0;
  }

  function chooseNext() {
    const low = stats.mood < 30 || stats.fullness < 20;
    const r = Math.random();
    if (r < (low ? 0.2 : 0.5)) {
      cat.dir = Math.random() < 0.5 ? -1 : 1;
      setState('walk', rand(3, 8));
    } else if (r < 0.82) {
      setState('idle', rand(3, 7));
    } else {
      setState('sleep', rand(20, 45));
    }
  }

  function moveWindow() {
    api.setPos(Math.round(pos.x), Math.round(pos.y));
  }

  // ---- Care actions -------------------------------------------------------
  function save() {
    api.saveState({
      fullness: Math.round(stats.fullness * 10) / 10,
      mood: Math.round(stats.mood * 10) / 10,
      savedAt: Date.now(),
    });
  }

  function pet() {
    if (cat.state === 'sleep') {
      setState('idle', 2);
      say(pick(LINES.wake));
      return;
    }
    const now = performance.now();
    if (now - lastPetAt > 1000) stats.mood = clamp(stats.mood + 4, 0, 100);
    lastPetAt = now;
    setState('happy', 1.4);
    say(pick(LINES.pet));
    addHeart();
    save();
  }

  function feed() {
    if (stats.fullness >= 90) {
      if (cat.state === 'sleep') setState('idle', 2);
      say(pick(LINES.full));
      return;
    }
    stats.fullness = clamp(stats.fullness + 35, 0, 100);
    stats.mood = clamp(stats.mood + 5, 0, 100);
    setState('eat', 2.6);
    say(pick(LINES.feed));
    save();
  }

  function play() {
    if (stats.fullness < 15) {
      if (cat.state === 'sleep') setState('idle', 2);
      say(pick(LINES.tired));
      return;
    }
    stats.mood = clamp(stats.mood + 25, 0, 100);
    stats.fullness = clamp(stats.fullness - 5, 0, 100);
    setState('play', 3);
    say(pick(LINES.play));
    save();
  }

  function sleep() {
    setState('sleep', rand(30, 60));
    say(pick(LINES.sleep));
  }

  function wake() {
    setState('idle', 2);
    say(pick(LINES.wake));
  }

  api.onMenuAction((action) => {
    const actions = { feed, play, sleep, wake };
    if (actions[action]) actions[action]();
  });

  api.onReset(async () => {
    const b = await api.getBounds();
    pos.x = b.x;
    pos.y = b.y;
    area = b.area;
    setState('idle', 2);
    say(pick(LINES.hello));
  });

  // ---- Speech bubble & particles -----------------------------------------
  function headX() {
    const col = cat.dir > 0 ? HEAD_COL : S.WIDTH - HEAD_COL;
    return CAT_LEFT + col * SCALE;
  }

  function headTopY() {
    const lyingOffset = cat.state === 'sleep' ? 3 * SCALE : 0;
    return CAT_TOP + cat.yOff + lyingOffset;
  }

  function say(text, ms = 2400) {
    bubble.textContent = text;
    bubble.hidden = false;
    // restart pop animation
    bubble.style.animation = 'none';
    void bubble.offsetWidth;
    bubble.style.animation = '';
    bubbleTimer = ms / 1000;
    placeBubble();
  }

  function placeBubble() {
    if (bubble.hidden) return;
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const hx = headX();
    const left = clamp(Math.round(hx - bw / 2), 2, W - bw - 2);
    const top = Math.max(2, Math.round(headTopY() - bh - 14));
    bubble.style.left = left + 'px';
    bubble.style.top = top + 'px';
    bubble.style.setProperty('--tail-x', clamp(hx - left, 10, bw - 10) + 'px');
  }

  function addHeart() {
    particles.push({ kind: 'heart', x: headX() + rand(-10, 10), y: headTopY() - 4, vy: -30, life: 1.4 });
  }

  function addZ() {
    const x = headX() + (cat.dir > 0 ? 14 : -22);
    particles.push({ kind: 'z', x, y: headTopY() + 4, vy: -14, vx: cat.dir * 6, life: 2.4 });
  }

  // ---- Update -------------------------------------------------------------
  function update(dt) {
    cat.t += dt;
    cat.animT += dt;

    // stats decay
    stats.fullness = clamp(stats.fullness - dt / FULLNESS_DECAY_SEC, 0, 100);
    stats.mood = clamp(stats.mood - dt / MOOD_DECAY_SEC, 0, 100);

    // blinking
    if (cat.blinkT > 0) cat.blinkT -= dt;
    else if ((cat.blinkIn -= dt) <= 0) {
      cat.blinkT = 0.15;
      cat.blinkIn = rand(2, 6);
    }

    switch (cat.state) {
      case 'walk': {
        const speed = stats.fullness < 30 ? HUNGRY_WALK_SPEED : WALK_SPEED;
        pos.x += cat.dir * speed * dt;
        if (pos.x <= minX()) { pos.x = minX(); cat.dir = 1; }
        if (pos.x >= maxX()) { pos.x = maxX(); cat.dir = -1; }
        moveWindow();
        break;
      }
      case 'fall': {
        cat.vy += GRAVITY * dt;
        pos.y += cat.vy * dt;
        if (pos.y >= groundY()) {
          pos.y = groundY();
          setState('idle', 2);
          say(pick(LINES.land));
        }
        moveWindow();
        break;
      }
      case 'happy':
        cat.yOff = -Math.round(Math.abs(Math.sin(cat.t * 9)) * 3) * SCALE / 2;
        break;
      case 'play': {
        const phase = (cat.t * 1.2) % 1;
        const prev = ((cat.t - dt) * 1.2) % 1;
        cat.yOff = -Math.round(Math.sin(phase * Math.PI) * 26);
        if (phase < prev) addHeart(); // landed
        break;
      }
      case 'eat':
        cat.yOff = (Math.floor(cat.t * 5) % 2) * 2;
        if (cat.t + dt >= cat.dur) addHeart();
        break;
      case 'sleep':
        if (Math.floor(cat.t / 1.3) !== Math.floor((cat.t - dt) / 1.3)) addZ();
        break;
      default:
        break;
    }

    if (cat.t >= cat.dur && cat.state !== 'drag' && cat.state !== 'fall') chooseNext();

    // the cat speaks up about its needs now and then
    if ((needsTimer -= dt) <= 0) {
      needsTimer = rand(40, 70);
      if (cat.state !== 'sleep' && cat.state !== 'drag') {
        if (stats.fullness < 30) say(pick(LINES.hungry));
        else if (stats.mood < 30) say(pick(LINES.lonely));
        else if (stats.mood > 80 && Math.random() < 0.4) addHeart();
      }
    }

    if (bubbleTimer > 0 && (bubbleTimer -= dt) <= 0) bubble.hidden = true;
    if ((saveTimer -= dt) <= 0) { saveTimer = 15; save(); }

    particles = particles.filter((p) => (p.life -= dt) > 0);
    for (const p of particles) {
      p.y += p.vy * dt;
      if (p.vx) p.x += p.vx * dt;
    }
  }

  // ---- Draw ---------------------------------------------------------------
  function currentRows() {
    const tail = Math.floor(cat.animT / 0.7) % 2;
    const blink = cat.blinkT > 0;
    switch (cat.state) {
      case 'walk':
        return S.build({ legs: Math.floor(cat.animT / 0.18) % 2 ? 'B' : 'A', eyes: blink ? 'closed' : 'open', tail });
      case 'happy':
      case 'play':
        return S.build({ eyes: 'happy', tail: Math.floor(cat.animT / 0.25) % 2 });
      case 'eat':
        return S.build({ eyes: 'closed', tail });
      case 'sleep':
        return S.build({ lying: true, eyes: 'closed', tail: Math.floor(cat.animT / 1.6) % 2 });
      case 'drag':
      case 'fall':
        return S.build({ legs: 'B', eyes: 'open', tail: 1 });
      default:
        return S.build({ eyes: blink ? 'closed' : 'open', tail });
    }
  }

  function drawSprite(rows, x, y, scale, flip) {
    const c = spriteCanvas(rows, flip);
    ctx.drawImage(c, Math.round(x), Math.round(y), c.width * scale, c.height * scale);
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingEnabled = false;

    cat.rows = currentRows();
    const flip = cat.dir < 0;
    drawSprite(cat.rows, CAT_LEFT, CAT_TOP + cat.yOff, SCALE, flip);

    if (cat.state === 'eat') {
      const bowlW = S.BOWL[0].length * 3;
      const bx = cat.dir > 0 ? CAT_LEFT + CAT_W - bowlW + 6 : CAT_LEFT - 6;
      drawSprite(S.BOWL, bx, H - S.BOWL.length * 3 - 2, 3, false);
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.min(1, p.life);
      if (p.kind === 'heart') drawSprite(S.HEART, p.x - 10, p.y - 18, 3, false);
      else drawSprite(S.ZZZ, p.x, p.y - 8, 2, false);
    }
    ctx.globalAlpha = 1;

    placeBubble();
  }

  // ---- Input --------------------------------------------------------------
  function localPoint(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  // True when (x, y) in canvas coordinates is on (or right next to) a cat pixel.
  function hitCat(x, y) {
    const flip = cat.dir < 0;
    const top = CAT_TOP + cat.yOff;
    const col0 = Math.floor((x - CAT_LEFT) / SCALE);
    const row0 = Math.floor((y - top) / SCALE);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const row = row0 + dy;
        let col = col0 + dx;
        if (row < 0 || row >= cat.rows.length || col < 0 || col >= S.WIDTH) continue;
        if (flip) col = S.WIDTH - 1 - col;
        if (cat.rows[row][col] !== '.') return true;
      }
    }
    return false;
  }

  function hitBubble(e) {
    if (bubble.hidden) return false;
    const r = bubble.getBoundingClientRect();
    return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
  }

  // Let clicks on transparent parts of the window fall through to the desktop.
  let ignoring = null;
  function setIgnore(v) {
    if (v === ignoring) return;
    ignoring = v;
    api.setIgnoreMouse(v);
  }

  let press = null;

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = localPoint(e);
    if (!hitCat(p.x, p.y)) return;
    press = { sx: e.screenX, sy: e.screenY, wx: pos.x, wy: pos.y, moved: false, prevState: cat.state };
    canvas.setPointerCapture(e.pointerId);
    setIgnore(false);
  });

  window.addEventListener('pointermove', (e) => {
    if (press) {
      const dx = e.screenX - press.sx;
      const dy = e.screenY - press.sy;
      if (!press.moved && Math.hypot(dx, dy) > 4) {
        press.moved = true;
        setState('drag', Infinity);
        bubble.hidden = true;
      }
      if (press.moved) {
        pos.x = press.wx + dx;
        pos.y = press.wy + dy;
        moveWindow();
      }
      return;
    }
    const p = localPoint(e);
    setIgnore(!(hitCat(p.x, p.y) || hitBubble(e)));
  });

  canvas.addEventListener('pointerup', async (e) => {
    if (!press) return;
    const p = press;
    press = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    if (!p.moved) {
      pet();
      return;
    }
    area = await api.areaAt(pos.x + W / 2, pos.y + H / 2);
    pos.x = clamp(pos.x, minX(), maxX());
    if (pos.y < groundY()) {
      cat.vy = 0;
      setState('fall', Infinity);
    } else {
      pos.y = groundY();
      setState('idle', 2);
    }
    moveWindow();
  });

  canvas.addEventListener('pointercancel', () => {
    if (press && press.moved) setState('fall', Infinity);
    press = null;
  });

  document.addEventListener('mouseleave', () => {
    if (!press) setIgnore(true);
  });

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const p = localPoint(e);
    if (!hitCat(p.x, p.y)) return;
    api.showMenu({
      fullness: Math.round(stats.fullness),
      mood: Math.round(stats.mood),
      sleeping: cat.state === 'sleep',
      x: e.clientX,
      y: e.clientY,
    });
  });

  // ---- Start --------------------------------------------------------------
  async function start() {
    const b = await api.getBounds();
    pos.x = b.x;
    pos.y = b.y;
    area = b.area;

    const saved = await api.loadState();
    if (saved && typeof saved.fullness === 'number' && typeof saved.mood === 'number') {
      const away = Math.max(0, (Date.now() - (saved.savedAt || Date.now())) / 1000) * OFFLINE_DECAY_FACTOR;
      stats.fullness = clamp(saved.fullness - away / FULLNESS_DECAY_SEC, 0, 100);
      stats.mood = clamp(saved.mood - away / MOOD_DECAY_SEC, 0, 100);
    }

    // stand on the ground
    pos.y = groundY();
    pos.x = clamp(pos.x, minX(), maxX());
    moveWindow();
    setIgnore(true);

    setTimeout(() => {
      if (stats.fullness < 30) say(pick(LINES.hungry));
      else say(pick(LINES.hello));
    }, 600);

    let last = performance.now();
    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    window.addEventListener('beforeunload', save);
  }

  start();

  // ---- Browser preview (no Electron) -------------------------------------
  // The page acts as the desktop: the cat window is a box moved around inside it.
  function createPreviewApi() {
    document.body.classList.add('preview');
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '預覽模式：點貓咪會喵喵叫，拖曳可以抓起來，右鍵打開選單。';
    document.body.appendChild(hint);

    const appEl = document.getElementById('app');
    const menu = document.getElementById('menu');
    let menuCb = () => {};
    let px = Math.max(0, window.innerWidth - W - 80);
    let py = window.innerHeight - H;
    const viewArea = () => ({ x: 0, y: 0, width: window.innerWidth, height: window.innerHeight });
    const place = () => { appEl.style.transform = `translate(${px}px, ${py}px)`; };
    place();

    function hideMenu() { menu.hidden = true; }
    document.addEventListener('pointerdown', (e) => { if (!menu.contains(e.target)) hideMenu(); });

    return {
      getBounds: async () => ({ x: px, y: py, width: W, height: H, area: viewArea() }),
      areaAt: async () => viewArea(),
      setPos: (x, y) => { px = x; py = y; place(); },
      setIgnoreMouse: () => {},
      loadState: async () => {
        try { return JSON.parse(localStorage.getItem('cat-state') || 'null'); } catch (_) { return null; }
      },
      saveState: (s) => {
        try { localStorage.setItem('cat-state', JSON.stringify(s)); } catch (_) { /* ignore */ }
      },
      showMenu: (info) => {
        const items = [
          { label: `飽足度 ${info.fullness}/100`, disabled: true },
          { label: `心情 ${info.mood}/100`, disabled: true },
          null,
          { label: '餵食', action: 'feed' },
          { label: '陪玩', action: 'play' },
          info.sleeping ? { label: '叫醒', action: 'wake' } : { label: '睡覺', action: 'sleep' },
        ];
        menu.innerHTML = '';
        for (const it of items) {
          if (!it) { menu.appendChild(document.createElement('hr')); continue; }
          const btn = document.createElement('button');
          btn.textContent = it.label;
          btn.disabled = !!it.disabled;
          if (it.action) btn.addEventListener('click', () => { hideMenu(); menuCb(it.action); });
          menu.appendChild(btn);
        }
        menu.hidden = false;
        menu.style.left = Math.min(info.x, window.innerWidth - menu.offsetWidth - 4) + 'px';
        menu.style.top = Math.min(info.y, window.innerHeight - menu.offsetHeight - 4) + 'px';
      },
      onMenuAction: (cb) => { menuCb = cb; },
      onReset: () => {},
    };
  }
})();
