/* ========================================
   Anuj Singh — Portfolio JavaScript
   Matching ameen-abdullah.dev style
   With background music, improved animations
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {
  gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

  // ==========================================
  // 1. BACKGROUND MUSIC (Howler.js)
  // ==========================================
  const musicBtn = document.getElementById('music-toggle');
  const musicLabel = document.getElementById('music-label');
  let musicPlaying = false;
  let musicReady = false;

  // Ambient lo-fi track (royalty-free)
  const bgMusic = new Howl({
    src: [
      'https://cdn.pixabay.com/audio/2024/11/29/audio_d78e596568.mp3'
    ],
    loop: true,
    volume: 0,
    html5: true,
    preload: true,
    onload: () => {
      musicReady = true;
    },
    onloaderror: () => {
      // Fallback: try another track
      bgMusic._src = ['https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3'];
      bgMusic.load();
    }
  });

  function toggleMusic() {
    if (!musicReady) return;
    if (musicPlaying) {
      // Fade out
      bgMusic.fade(bgMusic.volume(), 0, 600);
      setTimeout(() => bgMusic.pause(), 600);
      musicBtn.classList.remove('playing');
      musicLabel.textContent = 'pLaY';
      musicPlaying = false;
    } else {
      // Play and fade in
      bgMusic.play();
      bgMusic.fade(0, 0.35, 1200);
      musicBtn.classList.add('playing');
      musicLabel.textContent = 'pAuSe';
      musicPlaying = true;
    }
  }

  musicBtn.addEventListener('click', toggleMusic);

  // Auto-start music after preloader (with user interaction requirement met by button click)
  function startMusicAfterPreloader() {
    // Show music button
    setTimeout(() => {
      musicBtn.classList.add('visible');
    }, 800);
  }

  // ==========================================
  // 1b. THEME TOGGLE (Morning/Evening)
  // ==========================================
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  let currentTheme = 'evening';

  function setTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'morning') {
      themeIcon.textContent = '\u2600'; // ☀
      themeLabel.textContent = 'mOrNiNg';
    } else {
      themeIcon.textContent = '\u263e'; // ☾
      themeLabel.textContent = 'eVeNiNg';
    }
  }

  themeToggle.addEventListener('click', () => {
    const newTheme = currentTheme === 'evening' ? 'morning' : 'evening';
    setTheme(newTheme);
    // Pulse animation
    gsap.fromTo(themeToggle, { scale: 0.9 }, { scale: 1, duration: 0.4, ease: 'elastic.out(1, 0.4)' });
  });

  function showThemeToggle() {
    setTimeout(() => {
      themeToggle.classList.add('visible');
    }, 1200);
  }

  // ==========================================
  // 2. SAKURA PETALS (Preloader Background)
  // ==========================================
  const sakuraCanvas = document.getElementById('sakura-canvas');
  const sCtx = sakuraCanvas.getContext('2d');

  function resizeSakura() {
    sakuraCanvas.width = window.innerWidth;
    sakuraCanvas.height = window.innerHeight;
  }
  resizeSakura();

  class Petal {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * sakuraCanvas.width;
      this.y = -20 - Math.random() * sakuraCanvas.height;
      this.size = Math.random() * 12 + 4;
      this.vy = Math.random() * 1.0 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.5;
      this.rot = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.03;
      this.alpha = Math.random() * 0.5 + 0.15;
      this.wobble = Math.random() * Math.PI * 2;
      this.wobbleSpeed = Math.random() * 0.02 + 0.008;
      // Varied petal colors
      const colors = ['#f0c6d5', '#f5d5e0', '#e8b5c5', '#fcd3e2', '#f7c4d8'];
      this.color = colors[Math.floor(Math.random() * colors.length)];
    }
    update() {
      this.y += this.vy;
      this.wobble += this.wobbleSpeed;
      this.x += this.vx + Math.sin(this.wobble) * 0.5;
      this.rot += this.rotSpeed;
      if (this.y > sakuraCanvas.height + 30) this.reset();
    }
    draw() {
      sCtx.save();
      sCtx.translate(this.x, this.y);
      sCtx.rotate(this.rot);
      sCtx.globalAlpha = this.alpha;
      sCtx.fillStyle = this.color;
      // Sakura petal shape (double bezier)
      sCtx.beginPath();
      sCtx.moveTo(0, 0);
      sCtx.bezierCurveTo(this.size * 0.5, -this.size * 0.5, this.size, -this.size * 0.25, this.size, 0);
      sCtx.bezierCurveTo(this.size, this.size * 0.25, this.size * 0.5, this.size * 0.5, 0, 0);
      sCtx.fill();
      // Second petal lobe
      sCtx.beginPath();
      sCtx.moveTo(0, 0);
      sCtx.bezierCurveTo(-this.size * 0.3, -this.size * 0.6, -this.size * 0.8, -this.size * 0.3, 0, 0);
      sCtx.fill();
      sCtx.restore();
    }
  }

  const petals = Array.from({ length: 55 }, () => new Petal());
  let sakuraActive = true;

  function drawSakura() {
    if (!sakuraActive) return;
    sCtx.clearRect(0, 0, sakuraCanvas.width, sakuraCanvas.height);
    petals.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(drawSakura);
  }
  drawSakura();

  // ==========================================
  // 3. PRELOADER FLOW
  // ==========================================
  const preloader = document.getElementById('preloader');
  const chooseUI = document.getElementById('preloader-choose');
  const loadingUI = document.getElementById('preloader-loading');
  const loadFill = document.getElementById('loading-fill');
  const loadText = document.getElementById('loading-text');
  const preloaderCenter = document.getElementById('preloader-center');

  // Entrance animation for preloader title
  gsap.from(preloaderCenter, {
    scale: 0.9, opacity: 0, filter: 'blur(10px)', duration: 1.2,
    ease: 'power3.out', delay: 0.3
  });

  // Show choice buttons after a moment
  setTimeout(() => {
    chooseUI.classList.add('visible');
  }, 1800);

  // Handle dark/light choice
  document.querySelectorAll('.choose-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const chosenMode = btn.dataset.mode;
      // Connect preloader choice to theme
      setTheme(chosenMode === 'light' ? 'morning' : 'evening');

      // Button click animation
      gsap.to(btn, { scale: 0.9, duration: 0.1, yoyo: true, repeat: 1 });

      setTimeout(() => {
        gsap.to(chooseUI, {
          opacity: 0, filter: 'blur(10px)', duration: 0.4, ease: 'power2.inOut',
          onComplete: () => {
            chooseUI.style.display = 'none';
            loadingUI.classList.add('visible');
            startLoading();
          }
        });
      }, 200);
    });
  });

  function startLoading() {
    let progress = 0;
    function tick() {
      const inc = progress < 40 ? Math.random() * 3 + 1.5 :
        progress < 80 ? Math.random() * 5 + 2 :
          Math.random() * 10 + 5;
      progress = Math.min(progress + inc, 100);
      loadFill.style.width = progress + '%';
      loadText.textContent = `lOaDiNg... ${Math.floor(progress)}%`;
      if (progress < 100) {
        requestAnimationFrame(() => setTimeout(tick, 30 + Math.random() * 50));
      } else {
        setTimeout(dismissPreloader, 500);
      }
    }
    tick();
  }

  function dismissPreloader() {
    sakuraActive = false;
    const tl = gsap.timeline();

    tl.to(preloaderCenter, {
      y: -60, opacity: 0, filter: 'blur(15px)', duration: 0.6, ease: 'power3.inOut'
    })
      .to(loadingUI, { opacity: 0, duration: 0.3 }, '-=0.3')
      .to('.preloader-vignette', { opacity: 0, duration: 0.4 }, '-=0.2')
      .to(preloader, {
        clipPath: 'inset(0 0 100% 0)',
        duration: 1.0,
        ease: 'power4.inOut',
        onComplete: () => {
          preloader.style.display = 'none';
          document.body.style.overflow = '';
          document.body.classList.remove('scroll-disabled');
          revealPage();
          startMusicAfterPreloader();
          showThemeToggle();
        }
      });
  }

  document.body.style.overflow = 'hidden';

  // ==========================================
  // 4. HERO PARTICLE CANVAS
  // ==========================================
  const heroCanvas = document.getElementById('hero-canvas');
  const hCtx = heroCanvas.getContext('2d');

  function resizeHero() {
    heroCanvas.width = window.innerWidth;
    heroCanvas.height = window.innerHeight;
  }
  resizeHero();

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;

  class HeroParticle {
    constructor() { this.reset(); }
    reset() {
      this.x = Math.random() * heroCanvas.width;
      this.y = Math.random() * heroCanvas.height;
      this.r = Math.random() * 2.5 + 0.3;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = (Math.random() - 0.5) * 0.2;
      this.alpha = Math.random() * 0.4 + 0.08;
      this.isAccent = Math.random() > 0.7;
      // Pulsing
      this.pulseSpeed = Math.random() * 0.02 + 0.005;
      this.pulsePhase = Math.random() * Math.PI * 2;
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.pulsePhase += this.pulseSpeed;

      // Mouse repel with smooth falloff
      const dx = this.x - mx, dy = this.y - my;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 150) {
        const f = (150 - d) / 150;
        this.x += (dx / d) * f * 2;
        this.y += (dy / d) * f * 2;
      }

      // Wrap
      if (this.x < -10) this.x = heroCanvas.width + 10;
      if (this.x > heroCanvas.width + 10) this.x = -10;
      if (this.y < -10) this.y = heroCanvas.height + 10;
      if (this.y > heroCanvas.height + 10) this.y = -10;
    }
    draw() {
      const pulse = Math.sin(this.pulsePhase) * 0.15 + 1;
      hCtx.beginPath();
      hCtx.arc(this.x, this.y, this.r * pulse, 0, Math.PI * 2);
      hCtx.fillStyle = this.isAccent ? '#f0c6d5' : '#ffffff';
      hCtx.globalAlpha = this.alpha * (0.7 + Math.sin(this.pulsePhase) * 0.3);
      hCtx.fill();
    }
  }

  const pCount = Math.min(150, Math.floor(window.innerWidth / 10));
  const hParticles = Array.from({ length: pCount }, () => new HeroParticle());

  function drawLines() {
    for (let i = 0; i < hParticles.length; i++) {
      for (let j = i + 1; j < hParticles.length; j++) {
        const dx = hParticles[i].x - hParticles[j].x;
        const dy = hParticles[i].y - hParticles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 100) {
          hCtx.beginPath();
          hCtx.strokeStyle = '#f0c6d5';
          hCtx.globalAlpha = 0.035 * (1 - d / 100);
          hCtx.lineWidth = 0.5;
          hCtx.moveTo(hParticles[i].x, hParticles[i].y);
          hCtx.lineTo(hParticles[j].x, hParticles[j].y);
          hCtx.stroke();
        }
      }
    }
  }

  function heroLoop() {
    hCtx.clearRect(0, 0, heroCanvas.width, heroCanvas.height);
    hParticles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    hCtx.globalAlpha = 1;
    requestAnimationFrame(heroLoop);
  }
  heroLoop();

  // ==========================================
  // 5. CUSTOM CURSOR
  // ==========================================
  const cursor = document.getElementById('custom-cursor');
  const cursorTextEl = document.getElementById('cursor-text');
  let cx = 0, cy = 0, tcx = 0, tcy = 0;

  document.addEventListener('mousemove', e => {
    tcx = e.clientX;
    tcy = e.clientY;
    mx = e.clientX;
    my = e.clientY;
  });

  function cursorLoop() {
    cx += (tcx - cx) * 0.12;
    cy += (tcy - cy) * 0.12;
    cursor.style.left = cx + 'px';
    cursor.style.top = cy + 'px';
    requestAnimationFrame(cursorLoop);
  }
  cursorLoop();

  // Cursor text on hover
  document.querySelectorAll('[data-cursor]').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorTextEl.textContent = el.dataset.cursor;
      cursor.classList.add('has-text');
    });
    el.addEventListener('mouseleave', () => {
      cursorTextEl.textContent = '';
      cursor.classList.remove('has-text');
    });
  });

  // ==========================================
  // 6. PAGE REVEAL & HERO ANIMATION
  // ==========================================
  function revealPage() {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.to('#nav', { opacity: 1, y: 0, duration: 0.8, delay: 0.2 })
      .to('.tag-pill', { opacity: 1, y: 0, duration: 0.8 }, '-=0.5')
      .to('.hero-line', {
        opacity: 1, y: 0, duration: 1.2, stagger: 0.18, ease: 'power4.out'
      }, '-=0.5')
      .to('.hero-desc', { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
      .to('.hero-bottom-bar', { opacity: 1, duration: 0.8 }, '-=0.4');

    initScrollAnimations();
  }

  // ==========================================
  // 7. SCROLL-TRIGGERED ANIMATIONS
  // ==========================================
  function initScrollAnimations() {
    // Section headers — slide in from left
    gsap.utils.toArray('.section-header').forEach(el => {
      gsap.from(el, {
        opacity: 0, x: -50, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' }
      });
    });

    // Work entries — staggered fade up
    gsap.utils.toArray('.work-entry').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, y: 50, duration: 0.7, delay: i * 0.08, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 87%' }
      });
    });

    // Tech intro text
    gsap.from('.tech-intro-text', {
      opacity: 0, y: 40, duration: 0.8, ease: 'power2.out',
      scrollTrigger: { trigger: '.tech-intro', start: 'top 85%' }
    });

    // Tech cards — staggered scale + fade
    gsap.utils.toArray('.tech-item').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, y: 60, scale: 0.92, duration: 0.7, delay: i * 0.12,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 87%' }
      });
    });

    // Gallery subtitle
    gsap.from('.gallery-subtitle', {
      opacity: 0, y: 25, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.gallery-subtitle', start: 'top 85%' }
    });

    // Gallery horizontal scroll with GSAP
    const galleryTrack = document.getElementById('gallery-track');
    if (galleryTrack && window.innerWidth > 768) {
      const totalScroll = galleryTrack.scrollWidth - window.innerWidth + 200;

      gsap.to(galleryTrack, {
        x: -totalScroll,
        ease: 'none',
        scrollTrigger: {
          trigger: '#gallery',
          start: 'top top',
          end: `+=${totalScroll}`,
          pin: true,
          scrub: 1.2,
          anticipatePin: 1,
        }
      });
    }

    // Gallery cards entrance
    gsap.utils.toArray('.gallery-card').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, x: 80, rotation: 6, duration: 0.8, delay: i * 0.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.gallery-track', start: 'top 85%' }
      });
    });

    // Social cards — staggered fade up
    gsap.utils.toArray('.social-card').forEach((el, i) => {
      gsap.from(el, {
        opacity: 0, y: 50, duration: 0.6, delay: i * 0.1,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 87%' }
      });
    });

    // Contact section — big text reveal
    gsap.from('.contact-line', {
      opacity: 0, y: 100, duration: 1.0, stagger: 0.15, ease: 'power3.out',
      scrollTrigger: { trigger: '.contact-big-text', start: 'top 80%' }
    });

    gsap.from('.contact-sub', {
      opacity: 0, y: 25, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact-sub', start: 'top 85%' }
    });

    gsap.from('.contact-cta', {
      opacity: 0, y: 25, scale: 0.95, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: '.contact-cta', start: 'top 90%' }
    });

    // Footer
    gsap.from('.footer-inner', {
      opacity: 0, y: 20, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.site-footer', start: 'top 95%' }
    });

    // --- New section animations ---

    // Quote section — text reveal
    gsap.from('.quote-number', {
      opacity: 0, y: 30, duration: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.quote-panel', start: 'top 80%' }
    });

    gsap.from('.quote-line', {
      opacity: 0, y: 80, duration: 1.0, stagger: 0.2, ease: 'power3.out',
      scrollTrigger: { trigger: '.quote-text', start: 'top 80%' }
    });

    gsap.from('.quote-author', {
      opacity: 0, y: 20, duration: 0.6, delay: 0.6, ease: 'power2.out',
      scrollTrigger: { trigger: '.quote-author', start: 'top 90%' }
    });

    // About section — staggered reveal
    gsap.from('.about-image-frame', {
      opacity: 0, x: -60, rotation: -3, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '.about-grid', start: 'top 80%' }
    });

    gsap.from('.about-intro', {
      opacity: 0, y: 40, duration: 0.7, ease: 'power2.out',
      scrollTrigger: { trigger: '.about-text-area', start: 'top 85%' }
    });

    gsap.from('.about-body', {
      opacity: 0, y: 30, duration: 0.7, delay: 0.15, ease: 'power2.out',
      scrollTrigger: { trigger: '.about-body', start: 'top 90%' }
    });

    gsap.from('.about-stat', {
      opacity: 0, y: 30, duration: 0.6, stagger: 0.1, ease: 'power2.out',
      scrollTrigger: { trigger: '.about-stats', start: 'top 90%' }
    });

    // Awards section header
    gsap.from('.awards-panel .section-header', {
      opacity: 0, x: -50, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '.awards-panel', start: 'top 85%' }
    });

    // Active nav link on scroll
    const sections = ['hero', 'works', 'quote', 'techstacks', 'about', 'awards', 'gallery', 'socials'];
    sections.forEach(id => {
      const section = document.getElementById(id);
      if (!section) return;
      ScrollTrigger.create({
        trigger: section,
        start: 'top center',
        end: 'bottom center',
        onEnter: () => setActiveNav(id),
        onEnterBack: () => setActiveNav(id)
      });
    });
  }

  function setActiveNav(id) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === id);
    });
  }

  // ==========================================
  // 8. NAVIGATION
  // ==========================================
  const hamburger = document.getElementById('nav-hamburger');
  const mobileOverlay = document.getElementById('mobile-overlay');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileOverlay.classList.toggle('open');
    document.body.style.overflow = mobileOverlay.classList.contains('open') ? 'hidden' : '';
  });

  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileOverlay.classList.remove('open');
      document.body.style.overflow = '';
    });
  });

  // Smooth scroll for all anchor links
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        gsap.to(window, {
          duration: 1.2,
          scrollTo: { y: target, offsetY: 0 },
          ease: 'power3.inOut'
        });
      }
    });
  });

  // Nav show/hide on scroll
  let lastY = 0;
  const nav = document.getElementById('nav');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    if (y > 100) {
      nav.style.transform = y > lastY ? 'translateY(-100%)' : 'translateY(0)';
    } else {
      nav.style.transform = 'translateY(0)';
    }
    lastY = y;
  }, { passive: true });

  // ==========================================
  // 9. GALLERY CARD WIGGLE ON HOVER
  // ==========================================
  document.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
      gsap.to(card, {
        rotation: gsap.utils.random(-4, 4),
        scale: 1.04,
        duration: 0.4,
        ease: 'power2.out'
      });
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotation: 0,
        scale: 1,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.5)'
      });
    });
  });

  // ==========================================
  // 10. HERO NAME HOVER GLOW
  // ==========================================
  document.querySelectorAll('.hero-line').forEach(line => {
    line.addEventListener('mouseenter', () => {
      gsap.to(line, { scale: 1.03, duration: 0.3, ease: 'power2.out' });
    });
    line.addEventListener('mouseleave', () => {
      gsap.to(line, { scale: 1, duration: 0.4, ease: 'power2.out' });
    });
  });

  // ==========================================
  // 11. TECH CARD 3D TILT
  // ==========================================
  document.querySelectorAll('.tech-item').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10;
      card.style.transform = `translateY(-6px) perspective(600px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ==========================================
  // 12. CONTACT CTA MAGNETIC EFFECT
  // ==========================================
  const cta = document.querySelector('.contact-cta');
  if (cta) {
    cta.addEventListener('mousemove', e => {
      const rect = cta.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      cta.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
    });
    cta.addEventListener('mouseleave', () => {
      gsap.to(cta, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1, 0.4)' });
      cta.style.transform = '';
    });
  }

  // ==========================================
  // 13. SOCIAL CARD TILT
  // ==========================================
  document.querySelectorAll('.social-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -6;
      card.style.transform = `translateY(-4px) perspective(500px) rotateX(${y}deg) rotateY(${x}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });

  // ==========================================
  // 14. RESIZE HANDLERS
  // ==========================================
  window.addEventListener('resize', () => {
    resizeHero();
    resizeSakura();
  });

  // ==========================================
  // 15. 3D CUBE IN TECH CARD (Mini wireframe)
  // ==========================================
  const cubeCanvas = document.querySelector('.tech-mini-canvas[data-shape="cube"]');
  if (cubeCanvas) {
    const cCtx = cubeCanvas.getContext('2d');
    cubeCanvas.width = 60;
    cubeCanvas.height = 60;

    let angle = 0;
    function drawCube() {
      cCtx.clearRect(0, 0, 60, 60);
      const cx = 30, cy = 30, s = 14;
      angle += 0.015;

      const cos = Math.cos(angle), sin = Math.sin(angle);
      const cos2 = Math.cos(angle * 0.7), sin2 = Math.sin(angle * 0.7);

      const verts = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ].map(([x, y, z]) => {
        let nx = x * cos - z * sin;
        let nz = x * sin + z * cos;
        let ny = y * cos2 - nz * sin2;
        nz = y * sin2 + nz * cos2;
        return [cx + nx * s, cy + ny * s];
      });

      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0],
        [4, 5], [5, 6], [6, 7], [7, 4],
        [0, 4], [1, 5], [2, 6], [3, 7]
      ];

      cCtx.strokeStyle = '#f0c6d5';
      cCtx.lineWidth = 1;
      cCtx.globalAlpha = 0.8;

      edges.forEach(([a, b]) => {
        cCtx.beginPath();
        cCtx.moveTo(verts[a][0], verts[a][1]);
        cCtx.lineTo(verts[b][0], verts[b][1]);
        cCtx.stroke();
      });

      requestAnimationFrame(drawCube);
    }
    drawCube();
  }

  // ==========================================
  // 16. PARALLAX EFFECT ON SCROLL
  // ==========================================
  window.addEventListener('scroll', () => {
    const sy = window.scrollY;
    const heroContent = document.querySelector('.hero-content');
    if (heroContent && sy < window.innerHeight) {
      heroContent.style.transform = `translateY(${sy * 0.3}px)`;
      heroContent.style.opacity = 1 - (sy / window.innerHeight) * 0.8;
    }
  }, { passive: true });
});
