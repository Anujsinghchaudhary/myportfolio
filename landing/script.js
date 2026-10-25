(() => {
  'use strict';

  // ---- Config -------------------------------------------------------------
  const FRAME_COUNT = 21;
  const BG = '#12172B'; // must match --bg in styles.css and the frame edges
  const EASE = 0.12; // fraction of the remaining distance covered per 60fps frame
  const framePath = (i) => `frames/ezgif-frame-${String(i).padStart(3, '0')}.jpg`;

  // ---- Elements -----------------------------------------------------------
  const section = document.getElementById('sequence');
  const canvas = document.getElementById('sequence-canvas');
  const ctx = canvas.getContext('2d', { alpha: false });
  const nav = document.getElementById('nav');
  const loader = document.getElementById('loader');
  const loaderFill = document.getElementById('loader-fill');
  const beats = Array.from(section.querySelectorAll('[data-start]')).map((el) => ({
    el,
    start: parseFloat(el.dataset.start),
    end: parseFloat(el.dataset.end),
  }));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // ---- State --------------------------------------------------------------
  const frames = new Array(FRAME_COUNT).fill(null);
  let loadedCount = 0;
  let current = 0; // eased frame position (float)
  let target = 0; // frame position the scroll asks for (float)
  let dirty = true; // forces a redraw (resize, new frame loaded)
  let rafId = 0;
  let lastTime = 0;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  // ---- Preload ------------------------------------------------------------
  function preload() {
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = 'async';
      img.src = framePath(i + 1);
      const done = (ok) => {
        if (ok) frames[i] = img;
        loadedCount++;
        loaderFill.style.width = `${(loadedCount / FRAME_COUNT) * 100}%`;
        if (loadedCount === FRAME_COUNT) loader.classList.add('is-done');
        dirty = true;
        kick();
      };
      // decode() keeps the first drawImage of each frame from stalling the main thread.
      img.decode ? img.decode().then(() => done(true), () => done(img.complete && img.naturalWidth > 0))
                 : (img.onload = () => done(true), img.onerror = () => done(false));
    }
  }

  // Nearest loaded frame, so scrolling before preload finishes still shows something.
  function nearestFrame(i) {
    if (frames[i]) return frames[i];
    for (let d = 1; d < FRAME_COUNT; d++) {
      if (frames[i - d]) return frames[i - d];
      if (frames[i + d]) return frames[i + d];
    }
    return null;
  }

  // ---- Drawing ------------------------------------------------------------
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth: w, clientHeight: h } = canvas;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    dirty = true;
    updateTarget();
    kick();
  }

  // object-fit: cover
  function paint(img, alpha) {
    const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  function draw() {
    ctx.globalAlpha = 1;
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const base = Math.floor(current);
    const mix = current - base;
    const a = nearestFrame(base);
    if (a) paint(a, 1);
    // Crossfade into the next frame so 21 frames read as continuous motion.
    const b = frames[base + 1];
    if (b && mix > 0.001) paint(b, mix);
    ctx.globalAlpha = 1;
  }

  // Text beats fade in over the first quarter of their range and out over the last.
  function updateBeats(p) {
    for (const { el, start, end } of beats) {
      const fade = (end - start) * 0.25;
      let o = 0;
      if (p >= start && p <= end) {
        o = 1;
        if (start > 0) o = Math.min(o, (p - start) / fade);
        if (end < 1) o = Math.min(o, (end - p) / fade);
      }
      o = clamp(o, 0, 1);
      el.style.opacity = o.toFixed(3);
      el.style.transform = `translate3d(0, ${((1 - o) * 24).toFixed(1)}px, 0)`;
    }
  }

  // ---- Scroll -> frame ----------------------------------------------------
  function updateTarget() {
    const distance = section.offsetHeight - window.innerHeight;
    const progress = distance > 0 ? clamp(-section.getBoundingClientRect().top / distance, 0, 1) : 0;
    target = progress * (FRAME_COUNT - 1);
  }

  function tick(now) {
    const dt = Math.min(now - lastTime, 64);
    lastTime = now;

    // Frame-rate independent easing toward the target.
    const k = reduceMotion.matches ? 1 : 1 - Math.pow(1 - EASE, dt / 16.667);
    current += (target - current) * k;
    if (Math.abs(target - current) < 0.001) current = target;

    draw();
    updateBeats(current / (FRAME_COUNT - 1));
    dirty = false;

    rafId = current !== target ? requestAnimationFrame(tick) : 0;
  }

  // Run the loop only while there is something to animate.
  function kick() {
    if (rafId || (!dirty && current === target)) return;
    lastTime = performance.now();
    rafId = requestAnimationFrame(tick);
  }

  function onScroll() {
    nav.classList.toggle('is-scrolled', window.scrollY > 24);
    updateTarget();
    kick();
  }

  // ---- Init ---------------------------------------------------------------
  document.getElementById('year').textContent = new Date().getFullYear();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', resize);
  resize();
  onScroll();
  current = target; // start on the correct frame after a reload mid-page
  preload();
})();
