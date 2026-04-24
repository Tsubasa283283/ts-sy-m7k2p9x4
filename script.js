(function () {
  'use strict';

  /* ============================================================
     CONFIG / STATE
     ============================================================ */
  var TWEAKS = Object.assign({
    anniversaryDate: "2024-05-03",
    particles: "auto",
    cursor: "hearts",
    typing: "on",
    fireworks: "on",
    bgm: "manual"
  }, window.__TWEAKS__ || {});

  // Load persisted tweaks
  try {
    var saved = JSON.parse(localStorage.getItem('anniv-tweaks') || '{}');
    TWEAKS = Object.assign(TWEAKS, saved);
  } catch(e) {}
  function saveTweaks() {
    try { localStorage.setItem('anniv-tweaks', JSON.stringify(TWEAKS)); } catch(e) {}
  }

  var currentSlide = 0;
  var isTransitioning = false;
  var navHideTimer = null;

  var slides = [];
  var totalSlides = 0;
  var dotsContainer, dots = [], prevBtn, nextBtn, grainEl;

  var chapterSlides = [3, 7, 13];

  var themeMap = {
    0:'theme-opening', 1:'theme-counter', 2:'theme-prologue',
    3:'theme-ch1', 4:'theme-ch1', 5:'theme-ch1', 6:'theme-ch1',
    7:'theme-ch2', 8:'theme-ch2', 9:'theme-ch2', 10:'theme-ch2', 11:'theme-ch2', 12:'theme-ch2-sakura',
    13:'theme-ch3', 14:'theme-ch3', 15:'theme-ch3-lights', 16:'theme-ch3-snow', 17:'theme-ch3-sakura',
    18:'theme-letter', 19:'theme-finale'
  };
  var allThemes = ['theme-opening','theme-counter','theme-prologue','theme-ch1','theme-ch2','theme-ch2-sakura','theme-ch3','theme-ch3-lights','theme-ch3-snow','theme-ch3-sakura','theme-letter','theme-finale'];

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    slides = Array.from(document.querySelectorAll('.slide'));
    totalSlides = slides.length;
    dotsContainer = document.getElementById('progressDots');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');

    document.getElementById('slideTotal').textContent = String(totalSlides).padStart(2,'0');

    buildDots();
    updateDots(0);
    updateArrows();
    updateCount(0);
    checkAllPhotos();
    initMaps();

    // Particles + cursor + fx
    initParticles();
    initCursor();
    initFX();

    bindEvents();
    bindEnvelope();
    bindTweaks();

    // Post slide index to parent (for speaker notes / labels)
    postSlideIndex(0);

    // Opening hint bobbing handled by CSS
    window.postMessage({slideIndexChanged: 0}, '*');
  }

  /* ============================================================
     DOTS / ARROWS / COUNT
     ============================================================ */
  function buildDots() {
    dotsContainer.innerHTML = '';
    dots = [];
    for (var i = 0; i < totalSlides; i++) {
      var btn = document.createElement('button');
      btn.className = 'dot';
      btn.setAttribute('aria-label', (i + 1));
      if (chapterSlides.indexOf(i) !== -1) btn.classList.add('is-chapter');
      (function (idx) {
        btn.addEventListener('click', function () {
          goTo(idx, idx > currentSlide ? 'next' : 'prev');
        });
      })(i);
      dotsContainer.appendChild(btn);
      dots.push(btn);
    }
  }
  function updateDots(index) {
    dots.forEach(function (d, i) { d.classList.toggle('is-active', i === index); });
  }
  function updateArrows() {
    prevBtn.disabled = (currentSlide === 0);
    nextBtn.disabled = (currentSlide === totalSlides - 1);
  }
  function updateCount(idx) {
    document.getElementById('slideNow').textContent = String(idx + 1).padStart(2,'0');
  }

  function showNav() {
    prevBtn.classList.add('is-visible');
    nextBtn.classList.add('is-visible');
    if (navHideTimer) clearTimeout(navHideTimer);
    navHideTimer = setTimeout(function () {
      prevBtn.classList.remove('is-visible');
      nextBtn.classList.remove('is-visible');
    }, 2400);
  }

  /* ============================================================
     THEME
     ============================================================ */
  function applyTheme(idx) {
    var t = themeMap[idx] || 'theme-opening';
    allThemes.forEach(function (x) { document.body.classList.remove(x); });
    document.body.classList.add(t);
  }

  /* ============================================================
     SLIDE CONTENT ANIMATION
     ============================================================ */
  function animateSlideContent(el) {
    el.querySelectorAll('.anim-el').forEach(function (x) {
      x.classList.remove('is-animated');
      void x.offsetWidth;
      var d = parseFloat(x.dataset.delay || 0);
      x.style.animationDelay = (d * 0.18 + 0.08) + 's';
      x.classList.add('is-animated');
    });
    // reveal btn pulse
    el.querySelectorAll('.memory__reveal-btn').forEach(function (btn) {
      if (btn.getAttribute('aria-expanded') === 'false') {
        setTimeout(function () { btn.classList.add('is-pulsing'); }, 1400);
      }
    });
  }
  function resetSlideContent(el) {
    el.querySelectorAll('.anim-el').forEach(function (x) { x.classList.remove('is-animated'); });
  }

  /* ============================================================
     TRANSITIONS
     ============================================================ */
  function goTo(target, dir) {
    if (isTransitioning) return;
    if (target < 0 || target >= totalSlides || target === currentSlide) return;

    isTransitioning = true;
    var fromEl = slides[currentSlide];
    var toEl   = slides[target];

    if (dir === 'prev') toEl.classList.add('is-entering-prev');
    void toEl.offsetWidth;

    fromEl.classList.add(dir === 'prev' ? 'is-leaving-prev' : 'is-leaving');
    toEl.classList.add('is-active');
    toEl.classList.remove('is-entering-prev');

    applyTheme(target);
    updateParticles(target);

    setTimeout(function () {
      fromEl.classList.remove('is-active','is-leaving','is-leaving-prev');
      resetSlideContent(fromEl);
      closeRevealPanels(fromEl);

      currentSlide = target;
      isTransitioning = false;
      updateDots(target);
      updateArrows();
      updateCount(target);
      postSlideIndex(target);

      animateSlideContent(toEl);

      // Slide-specific triggers
      if (target === 1) startCounter();
      if (target === 18) startLetterTyping();
      if (target === 19) {
        if (TWEAKS.fireworks !== 'off') setTimeout(launchFireworks, 700);
      }
      // Map reveal on memory slides
      var mapEl = toEl.querySelector('.memory__map');
      if (mapEl) setTimeout(function(){ mapEl.classList.add('is-active'); }, 400);
    }, 780);
  }
  function next() { goTo(currentSlide + 1, 'next'); }
  function prev() { goTo(currentSlide - 1, 'prev'); }

  function postSlideIndex(idx) {
    try { window.parent.postMessage({slideIndexChanged: idx}, '*'); } catch(e) {}
  }

  /* ============================================================
     REVEAL PANELS
     ============================================================ */
  function closeRevealPanels(el) {
    el.querySelectorAll('.memory__reveal-panel.is-revealed').forEach(function (p) {
      p.classList.remove('is-revealed');
      p.setAttribute('aria-hidden','true');
      var btn = el.querySelector('[aria-controls="' + p.id + '"]');
      if (btn) {
        btn.setAttribute('aria-expanded','false');
        btn.querySelector('span').textContent = 'あの時、実は…';
        btn.classList.add('is-pulsing');
      }
    });
  }
  function bindRevealButtons() {
    document.getElementById('slidesContainer').addEventListener('click', function (e) {
      var btn = e.target.closest('.memory__reveal-btn');
      if (!btn) return;
      var id = btn.getAttribute('aria-controls');
      var panel = document.getElementById(id);
      if (!panel) return;
      var isOpen = panel.classList.contains('is-revealed');
      panel.classList.toggle('is-revealed', !isOpen);
      panel.setAttribute('aria-hidden', String(isOpen));
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.querySelector('span').textContent = isOpen ? 'あの時、実は…' : '閉じる';
      btn.classList.remove('is-pulsing');
    });
  }

  /* ============================================================
     PHOTO CHECK (hide placeholder when loaded)
     ============================================================ */
  function checkAllPhotos() {
    document.querySelectorAll('.memory__photo').forEach(function (el) {
      var ph = el.querySelector('.memory__photo-placeholder');
      if (!ph) return;
      var raw = getComputedStyle(el).getPropertyValue('--photo-src').trim()
                 .replace(/^url\(["']?/,'').replace(/["']?\)$/,'');
      if (!raw) return;
      var img = new Image();
      img.onload = function () { ph.style.display = 'none'; };
      img.src = raw;
    });
  }

  /* ============================================================
     MINI JAPAN MAP
     ============================================================ */
  var JAPAN_PATHS = [
    // Hokkaido
    'M305 38 Q325 30 345 38 Q360 50 352 70 Q342 85 322 88 Q302 92 293 76 Q288 60 295 48 Z',
    // Honshu
    'M115 152 Q132 128 165 122 Q195 118 222 133 Q248 144 272 148 Q292 150 308 158 Q320 168 320 180 Q312 190 295 186 Q275 182 255 178 Q232 174 208 172 Q182 170 160 176 Q138 180 122 174 Q110 166 115 152 Z',
    // Shikoku
    'M210 198 Q228 194 240 204 Q242 215 228 218 Q212 218 205 210 Q203 202 210 198 Z',
    // Kyushu
    'M155 200 Q175 194 186 210 Q190 230 176 240 Q158 246 148 232 Q142 215 155 200 Z'
  ];

  var PIN_COORDS = {
    yamanashi: { x: 255, y: 162 },
    chiba:     { x: 294, y: 155 },
    kanagawa:  { x: 278, y: 168 },
    tokyo:     { x: 276, y: 154 },
    saitama:   { x: 272, y: 146 }
  };

  function initMaps() {
    var maps = document.querySelectorAll('.memory__map');
    maps.forEach(function(m){
      var svg = m.querySelector('.memory__map-svg');
      if (!svg) return;
      JAPAN_PATHS.forEach(function(d){
        var p = document.createElementNS('http://www.w3.org/2000/svg','path');
        p.setAttribute('d', d);
        p.setAttribute('class','memory__map-island');
        svg.appendChild(p);
      });
      var pref = m.getAttribute('data-pref');
      var coords = PIN_COORDS[pref];
      if (coords) {
        var halo = document.createElementNS('http://www.w3.org/2000/svg','circle');
        halo.setAttribute('cx', coords.x);
        halo.setAttribute('cy', coords.y);
        halo.setAttribute('r', 9);
        halo.setAttribute('class','memory__map-halo');
        svg.appendChild(halo);
        var pin = m.querySelector('.memory__map-pin');
        if (pin) {
          pin.style.left = (coords.x / 400 * 100) + '%';
          pin.style.top  = (coords.y / 280 * 100) + '%';
        }
        var label = m.querySelector('.memory__map-label');
        if (label) {
          label.style.left = (coords.x / 400 * 100) + '%';
          label.style.top  = (coords.y / 280 * 100) + '%';
        }
      }
    });
  }

  /* ============================================================
     ENVELOPE (Opening)
     ============================================================ */
  function bindEnvelope() {
    var env = document.getElementById('envelope');
    var stage = document.querySelector('.opening__stage');
    var reveal = document.getElementById('openingReveal');
    var opened = false;
    function open() {
      if (opened) return;
      opened = true;
      env.classList.add('is-open');
      // Burst of hearts around envelope
      burstHearts();
      setTimeout(function () {
        stage.classList.add('is-hidden');
        reveal.classList.add('is-visible');
      }, 1100);
      if (TWEAKS.bgm === 'auto') {
        setTimeout(function(){ bgmStart(true); }, 900);
      }
    }
    env.addEventListener('click', open);
  }

  function burstHearts() {
    var env = document.getElementById('envelope');
    var rect = env.getBoundingClientRect();
    var cx = rect.left + rect.width/2;
    var cy = rect.top + rect.height/2;
    for (var i = 0; i < 18; i++) {
      spawnFlyingHeart(cx, cy);
    }
  }
  function spawnFlyingHeart(x, y) {
    var h = document.createElement('div');
    h.textContent = '♥';
    h.style.cssText = [
      'position:fixed',
      'left:' + x + 'px',
      'top:' + y + 'px',
      'font-size:' + (Math.random()*14+14) + 'px',
      'color:hsl(' + (340 + Math.random()*20) + ',70%,' + (55 + Math.random()*15) + '%)',
      'pointer-events:none',
      'z-index:350',
      'transform:translate(-50%,-50%)',
      'opacity:0.95',
      'transition:transform 1.6s cubic-bezier(.2,.6,.3,1),opacity 1.6s ease'
    ].join(';');
    document.body.appendChild(h);
    var ang = Math.random() * Math.PI * 2;
    var dist = 80 + Math.random()*160;
    var tx = Math.cos(ang) * dist;
    var ty = Math.sin(ang) * dist - 60;
    requestAnimationFrame(function() {
      h.style.transform = 'translate(calc(-50% + ' + tx + 'px), calc(-50% + ' + ty + 'px)) scale(' + (0.4 + Math.random()*0.8) + ') rotate(' + (Math.random()*60-30) + 'deg)';
      h.style.opacity = '0';
    });
    setTimeout(function(){ if (h.parentNode) h.remove(); }, 1800);
  }

  /* ============================================================
     COUNTER
     ============================================================ */
  var counterStarted = false;
  function startCounter() {
    var start = new Date(TWEAKS.anniversaryDate || '2024-05-03');
    var now = new Date();
    var msDiff = now - start;
    var days = Math.floor(msDiff / (1000*60*60*24));
    var hours = Math.floor(msDiff / (1000*60*60));
    var minutes = Math.floor(msDiff / (1000*60));

    animateNum(document.getElementById('daysCount'), 0, days, 1800);
    animateNum(document.getElementById('hoursCount'), 0, hours, 1800);
    animateNum(document.getElementById('minutesCount'), 0, minutes, 1800);
    counterStarted = true;
  }
  function animateNum(el, from, to, dur) {
    var start = performance.now();
    function tick(t) {
      var p = Math.min(1, (t - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      var v = Math.floor(from + (to - from) * eased);
      el.textContent = v.toLocaleString();
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ============================================================
     LETTER TYPING
     ============================================================ */
  var letterTyped = false;
  function startLetterTyping() {
    if (letterTyped) return;
    letterTyped = true;

    var body = document.getElementById('letterBody');
    var lines = Array.from(body.querySelectorAll('p[data-line]'));
    var future = document.querySelector('.letter__future');
    var sign   = document.querySelector('.letter__sign');
    var skipBtn = document.getElementById('letterSkip');

    var mode = TWEAKS.typing;
    var charDelay = mode === 'fast' ? 32 : 60;

    if (mode === 'off') {
      revealAllInstant();
      return;
    }

    // reset
    lines.forEach(function(p){ p.dataset.final = p.innerHTML; p.innerHTML = ''; p.classList.remove('is-typed','is-revealed'); });
    future.classList.remove('is-revealed');
    sign.classList.remove('is-revealed');

    var cancelled = false;
    skipBtn.classList.remove('is-hidden');
    skipBtn.onclick = function(){ cancelled = true; revealAllInstant(); };

    function revealAllInstant() {
      cancelled = true;
      lines.forEach(function(p){ p.innerHTML = p.dataset.final || p.innerHTML; p.classList.add('is-revealed'); });
      future.classList.add('is-revealed');
      sign.classList.add('is-revealed');
      skipBtn.classList.add('is-hidden');
    }

    function typeLine(i) {
      if (cancelled || i >= lines.length) {
        if (!cancelled) {
          setTimeout(function(){
            future.classList.add('is-revealed');
            setTimeout(function(){
              sign.classList.add('is-revealed');
              skipBtn.classList.add('is-hidden');
            }, 900);
          }, 400);
        }
        return;
      }
      var p = lines[i];
      var text = (p.dataset.final || '').replace(/&nbsp;/g, '\u00A0');
      // If blank
      if (!text.trim() || text === '\u00A0') {
        p.innerHTML = '&nbsp;';
        p.classList.add('is-revealed');
        setTimeout(function(){ typeLine(i+1); }, 120);
        return;
      }
      p.classList.add('is-typed');
      var ci = 0;
      function typeChar() {
        if (cancelled) return;
        p.innerHTML = text.slice(0, ci) + '<span class="caret"></span>';
        ci++;
        if (ci > text.length) {
          p.innerHTML = text;
          setTimeout(function(){ typeLine(i+1); }, 340);
          return;
        }
        setTimeout(typeChar, charDelay + (Math.random()*30 - 15));
      }
      typeChar();
    }
    typeLine(0);
  }

  /* ============================================================
     PARTICLES CANVAS (hearts / petals / snow / lights)
     ============================================================ */
  var pcv, pctx, particles = [], pmode = 'hearts', pRAF = null;
  var W = 0, H = 0;

  function initParticles() {
    pcv = document.getElementById('particles');
    pctx = pcv.getContext('2d');
    resizeParticles();
    window.addEventListener('resize', resizeParticles);
    updateParticles(0);
    particleLoop();
  }
  function resizeParticles() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    pcv.width = W * dpr; pcv.height = H * dpr;
    pcv.style.width = W + 'px'; pcv.style.height = H + 'px';
    pctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function modeForSlide(idx) {
    if (TWEAKS.particles !== 'auto') return TWEAKS.particles;
    // auto: based on theme
    var t = themeMap[idx];
    if (t === 'theme-ch1') return 'hearts';
    if (t === 'theme-ch2') return 'hearts';
    if (t === 'theme-ch2-sakura' || t === 'theme-ch3-sakura') return 'petals';
    if (t === 'theme-ch3') return 'hearts';
    if (t === 'theme-ch3-lights') return 'lights';
    if (t === 'theme-ch3-snow') return 'snow';
    if (t === 'theme-letter') return 'hearts';
    if (t === 'theme-finale') return 'lights';
    if (t === 'theme-opening') return 'hearts';
    if (t === 'theme-counter') return 'hearts';
    return 'hearts';
  }

  function updateParticles(idx) {
    pmode = modeForSlide(idx);
    if (pmode === 'off') { particles = []; return; }
    // Keep existing, new ones will be of new type on spawn
    // But to refresh quickly, shed some:
    if (particles.length > 40) particles = particles.slice(-30);
  }

  function spawnParticle() {
    if (pmode === 'off') return;
    var p = { x: Math.random()*W, y: -10, mode: pmode };
    if (pmode === 'petals') {
      p.y = -20;
      p.size = 8 + Math.random()*10;
      p.vx = -0.4 + Math.random()*0.8;
      p.vy = 0.5 + Math.random()*0.8;
      p.rot = Math.random()*Math.PI*2;
      p.vr = -0.02 + Math.random()*0.04;
      p.hue = 340 + Math.random()*20;
      p.sway = Math.random()*Math.PI*2;
    } else if (pmode === 'snow') {
      p.size = 1.5 + Math.random()*2.5;
      p.vx = -0.3 + Math.random()*0.6;
      p.vy = 0.4 + Math.random()*0.7;
      p.alpha = 0.5 + Math.random()*0.4;
      p.sway = Math.random()*Math.PI*2;
    } else if (pmode === 'lights') {
      p.x = Math.random()*W;
      p.y = Math.random()*H;
      p.size = 1 + Math.random()*2.5;
      p.vx = (Math.random()-0.5)*0.15;
      p.vy = (Math.random()-0.5)*0.15;
      p.pulse = Math.random()*Math.PI*2;
      p.pulseSpd = 0.02 + Math.random()*0.04;
      p.hue = Math.random() < 0.5 ? 40 + Math.random()*20 : 340 + Math.random()*20;
      p.life = 1;
    } else { // hearts
      p.size = 6 + Math.random()*10;
      p.vx = -0.3 + Math.random()*0.6;
      p.vy = 0.25 + Math.random()*0.55;
      p.rot = -0.2 + Math.random()*0.4;
      p.hue = 340 + Math.random()*25;
      p.alpha = 0.35 + Math.random()*0.4;
      p.sway = Math.random()*Math.PI*2;
    }
    particles.push(p);
  }

  function drawHeart(ctx, x, y, size) {
    // simple heart path
    ctx.beginPath();
    var s = size/16;
    ctx.moveTo(x, y + 4*s);
    ctx.bezierCurveTo(x, y, x - 8*s, y, x - 8*s, y + 4*s);
    ctx.bezierCurveTo(x - 8*s, y + 8*s, x, y + 12*s, x, y + 14*s);
    ctx.bezierCurveTo(x, y + 12*s, x + 8*s, y + 8*s, x + 8*s, y + 4*s);
    ctx.bezierCurveTo(x + 8*s, y, x, y, x, y + 4*s);
    ctx.closePath();
    ctx.fill();
  }
  function drawPetal(ctx, x, y, size, rot, hue) {
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rot);
    var grad = ctx.createRadialGradient(0,0,0,0,0,size);
    grad.addColorStop(0, 'hsla(' + hue + ',80%,88%,0.95)');
    grad.addColorStop(1, 'hsla(' + hue + ',70%,75%,0.4)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size*0.5, size, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  }

  function particleLoop() {
    pctx.clearRect(0, 0, W, H);

    // spawn rate by mode
    var spawnRate = 0;
    if (pmode === 'hearts') spawnRate = 0.06;
    else if (pmode === 'petals') spawnRate = 0.18;
    else if (pmode === 'snow') spawnRate = 0.35;
    else if (pmode === 'lights') spawnRate = particles.length < 45 ? 0.5 : 0;
    if (Math.random() < spawnRate) spawnParticle();

    for (var i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      if (p.mode === 'petals') {
        p.sway += 0.03;
        p.x += p.vx + Math.sin(p.sway)*0.4;
        p.y += p.vy;
        p.rot += p.vr;
        drawPetal(pctx, p.x, p.y, p.size, p.rot, p.hue);
        if (p.y > H + 40) particles.splice(i,1);
      } else if (p.mode === 'snow') {
        p.sway += 0.02;
        p.x += p.vx + Math.sin(p.sway)*0.3;
        p.y += p.vy;
        pctx.fillStyle = 'rgba(251,244,230,' + p.alpha + ')';
        pctx.beginPath(); pctx.arc(p.x,p.y,p.size,0,Math.PI*2); pctx.fill();
        if (p.y > H + 10) particles.splice(i,1);
      } else if (p.mode === 'lights') {
        p.pulse += p.pulseSpd;
        var a = (Math.sin(p.pulse) + 1) * 0.5;
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > W) p.vx *= -1;
        if (p.y < 0 || p.y > H) p.vy *= -1;
        var r = p.size * (1 + a*0.5);
        var g = pctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*6);
        g.addColorStop(0, 'hsla(' + p.hue + ',90%,75%,' + (0.7 * a) + ')');
        g.addColorStop(0.3, 'hsla(' + p.hue + ',85%,65%,' + (0.2 * a) + ')');
        g.addColorStop(1, 'hsla(' + p.hue + ',80%,60%,0)');
        pctx.fillStyle = g;
        pctx.beginPath(); pctx.arc(p.x,p.y,r*6,0,Math.PI*2); pctx.fill();
        pctx.fillStyle = 'hsla(' + p.hue + ',95%,88%,' + (0.6 + a*0.4) + ')';
        pctx.beginPath(); pctx.arc(p.x,p.y,r,0,Math.PI*2); pctx.fill();
        p.life -= 0.001;
        if (p.life <= 0) particles.splice(i,1);
      } else { // hearts
        p.sway += 0.02;
        p.x += p.vx + Math.sin(p.sway)*0.5;
        p.y += p.vy;
        pctx.save();
        pctx.translate(p.x, p.y);
        pctx.rotate(p.rot);
        pctx.fillStyle = 'hsla(' + p.hue + ',70%,65%,' + p.alpha + ')';
        drawHeart(pctx, 0, 0, p.size);
        pctx.restore();
        if (p.y > H + 20) particles.splice(i,1);
      }
    }
    pRAF = requestAnimationFrame(particleLoop);
  }

  /* ============================================================
     CURSOR TRAIL
     ============================================================ */
  var lastCursor = 0;
  function initCursor() {
    document.addEventListener('mousemove', function(e){
      showNav();
      var now = Date.now();
      if (now - lastCursor < 90) return;
      lastCursor = now;
      if (TWEAKS.cursor === 'off') return;
      spawnCursorTrail(e.clientX, e.clientY);
    });
  }
  function spawnCursorTrail(x, y) {
    var el = document.createElement('div');
    if (TWEAKS.cursor === 'hearts') {
      el.textContent = '♥';
      el.style.color = 'hsl(' + (340 + Math.random()*20) + ',75%,70%)';
      el.style.fontSize = (Math.random()*6 + 10) + 'px';
    } else {
      el.style.width = el.style.height = (Math.random()*5 + 4) + 'px';
      el.style.borderRadius = '50%';
      el.style.background = 'hsl(' + (340 + Math.random()*40) + ',70%,75%)';
    }
    el.style.cssText += ';position:fixed;left:' + x + 'px;top:' + y + 'px;pointer-events:none;z-index:200;transform:translate(-50%,-50%);opacity:0.9;transition:transform 1s ease,opacity 1s ease;line-height:1;';
    document.body.appendChild(el);
    requestAnimationFrame(function(){
      el.style.transform = 'translate(-50%,-' + (70 + Math.random()*20) + '%) scale(0.3)';
      el.style.opacity = '0';
    });
    setTimeout(function(){ if (el.parentNode) el.remove(); }, 1050);
  }

  /* ============================================================
     FIREWORKS (finale)
     ============================================================ */
  var fxCv, fxCtx, fxW, fxH, fxParticles = [], fxRAF = null, fxActive = false;
  function initFX() {
    fxCv = document.getElementById('fxCanvas');
    fxCtx = fxCv.getContext('2d');
    resizeFX();
    window.addEventListener('resize', resizeFX);
  }
  function resizeFX() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    fxW = window.innerWidth; fxH = window.innerHeight;
    fxCv.width = fxW * dpr; fxCv.height = fxH * dpr;
    fxCv.style.width = fxW + 'px'; fxCv.style.height = fxH + 'px';
    fxCtx.setTransform(dpr,0,0,dpr,0,0);
  }
  function launchFireworks() {
    if (fxActive) return;
    fxActive = true;
    var hues = [345, 10, 30, 340, 350, 355];
    var count = 0;
    function burst() {
      if (count > 8 || currentSlide !== 19) { endFireworks(); return; }
      var x = 0.2*fxW + Math.random()*0.6*fxW;
      var y = 0.15*fxH + Math.random()*0.35*fxH;
      fireworkAt(x, y, hues[count % hues.length]);
      count++;
      setTimeout(burst, 500 + Math.random()*500);
    }
    burst();
    if (!fxRAF) fxLoop();
  }
  function endFireworks() {
    setTimeout(function(){
      fxActive = false;
    }, 3000);
  }
  function fireworkAt(x, y, hue) {
    var n = 50;
    for (var i = 0; i < n; i++) {
      var ang = (i/n) * Math.PI*2 + Math.random()*0.1;
      var sp  = 2 + Math.random()*4;
      fxParticles.push({
        x: x, y: y,
        vx: Math.cos(ang)*sp,
        vy: Math.sin(ang)*sp,
        life: 1,
        decay: 0.012 + Math.random()*0.015,
        hue: hue + Math.random()*20 - 10,
        size: 2 + Math.random()*1.5
      });
    }
    // heart-shape secondary burst
    for (var j = 0; j < 30; j++) {
      var t = j/30 * Math.PI*2;
      var hx = 16 * Math.pow(Math.sin(t),3);
      var hy = -(13*Math.cos(t) - 5*Math.cos(2*t) - 2*Math.cos(3*t) - Math.cos(4*t));
      fxParticles.push({
        x: x, y: y,
        vx: hx * 0.15,
        vy: hy * 0.15,
        life: 1,
        decay: 0.01,
        hue: hue,
        size: 2.5
      });
    }
  }
  function fxLoop() {
    fxCtx.clearRect(0,0,fxW,fxH);

    for (var i = fxParticles.length - 1; i >= 0; i--) {
      var p = fxParticles[i];
      p.vy += 0.05;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { fxParticles.splice(i,1); continue; }
      fxCtx.fillStyle = 'hsla(' + p.hue + ',85%,' + (55 + p.life*25) + '%,' + p.life + ')';
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.size*p.life, 0, Math.PI*2);
      fxCtx.fill();
    }
    if (fxParticles.length || fxActive) {
      fxRAF = requestAnimationFrame(fxLoop);
    } else {
      fxCtx.clearRect(0,0,fxW,fxH);
      fxRAF = null;
    }
  }

  /* ============================================================
     BGM — synthesized
     ============================================================ */
  var bgmCtx=null, bgmGain=null, bgmPlaying=false, bgmLoopTmr=null;
  var BGM_BPM=72, BGM_BEAT=60/72, BGM_BARS=16, BGM_TOTAL;
  BGM_TOTAL = BGM_BARS * 3 * BGM_BEAT;
  var BGM_MEL = [
    [659.25,2,.72],[587.33,1,.52],
    [523.25,2,.72],[659.25,1,.52],
    [783.99,2,.72],[659.25,1,.52],
    [880.00,3,.82],
    [698.46,2,.72],[659.25,1,.52],
    [587.33,2,.72],[698.46,1,.52],
    [659.25,2,.72],[523.25,1,.52],
    [523.25,3,.78],
    [659.25,1,.65],[698.46,1,.65],[659.25,1,.65],
    [587.33,2,.72],[523.25,1,.55],
    [493.88,2,.72],[440.00,1,.55],
    [392.00,3,.78],
    [440.00,2,.72],[493.88,1,.55],
    [523.25,2,.72],[440.00,1,.55],
    [392.00,2,.72],[329.63,1,.55],
    [261.63,3,.85]
  ];
  var BGM_BASS = [130.81,130.81,196.00,220.00,174.61,196.00,130.81,130.81,130.81,130.81,246.94,196.00,220.00,130.81,196.00,130.81];
  var BGM_BELL = [
    {bar:3,hz:1046.50,beats:3,vel:.45},
    {bar:7,hz:880.00,beats:3,vel:.40},
    {bar:11,hz:1046.50,beats:3,vel:.45},
    {bar:15,hz:1046.50,beats:3,vel:.50}
  ];
  function bgmNote(hz,dur,t,type,vol,det) {
    var osc=bgmCtx.createOscillator(),env=bgmCtx.createGain();
    osc.type=type||'triangle'; osc.frequency.value=hz;
    if (det) osc.detune.value=det;
    osc.connect(env); env.connect(bgmGain);
    var atk=0.03, rel=Math.min(0.4, dur*0.42);
    env.gain.setValueAtTime(0,t);
    env.gain.linearRampToValueAtTime(vol,t+atk);
    env.gain.setValueAtTime(vol,t+dur-rel);
    env.gain.linearRampToValueAtTime(0,t+dur);
    osc.start(t); osc.stop(t+dur+0.05);
  }
  function bgmSchedule(st) {
    var t = st;
    BGM_MEL.forEach(function(n){
      var d = n[1]*BGM_BEAT;
      bgmNote(n[0],d*0.87,t,'triangle',n[2]*0.26);
      bgmNote(n[0],d*0.85,t+0.012,'sine',n[2]*0.07,6);
      t += d;
    });
    t = st;
    BGM_BASS.forEach(function(hz){
      var d = 3*BGM_BEAT;
      bgmNote(hz,d*0.72,t,'sine',0.20);
      t += d;
    });
    BGM_BELL.forEach(function(b){
      var bt = st + b.bar*3*BGM_BEAT;
      bgmNote(b.hz,b.beats*BGM_BEAT*0.9,bt,'sine',b.vel*0.22);
    });
  }
  function bgmLoop(at) {
    if (!bgmPlaying) return;
    bgmSchedule(at);
    var wd = (at - bgmCtx.currentTime + BGM_TOTAL - 0.4)*1000;
    bgmLoopTmr = setTimeout(function(){
      if (bgmPlaying) bgmLoop(at + BGM_TOTAL);
    }, Math.max(0, wd));
  }
  function bgmStart(silent) {
    if (!bgmCtx) {
      try {
        bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
        bgmGain = bgmCtx.createGain();
        bgmGain.gain.value = 0.45;
        bgmGain.connect(bgmCtx.destination);
      } catch(e) { return; }
    }
    if (bgmCtx.state === 'suspended') bgmCtx.resume();
    bgmPlaying = true;
    bgmLoop(bgmCtx.currentTime + 0.1);
    var btn = document.getElementById('bgmBtn');
    if (btn) {
      btn.classList.add('is-playing');
      btn.querySelector('.bgm-btn__icon').textContent = '♫';
      btn.setAttribute('aria-label','BGMを停止');
    }
  }
  function bgmStop() {
    bgmPlaying = false;
    if (bgmLoopTmr) clearTimeout(bgmLoopTmr);
    if (bgmGain && bgmCtx) {
      bgmGain.gain.setTargetAtTime(0, bgmCtx.currentTime, 0.4);
      setTimeout(function(){
        bgmGain = bgmCtx.createGain();
        bgmGain.gain.value = 0.45;
        bgmGain.connect(bgmCtx.destination);
      }, 1200);
    }
    var btn = document.getElementById('bgmBtn');
    if (btn) {
      btn.classList.remove('is-playing');
      btn.querySelector('.bgm-btn__icon').textContent = '♪';
      btn.setAttribute('aria-label','BGMを再生');
    }
  }

  /* ============================================================
     TWEAKS panel
     ============================================================ */
  function bindTweaks() {
    var panel = document.getElementById('tweaksPanel');
    document.getElementById('tweaksOpen').addEventListener('click', function(){
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden','false');
    });
    document.getElementById('tweaksClose').addEventListener('click', function(){
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
    });

    var map = {
      'tw-particles': 'particles',
      'tw-cursor': 'cursor',
      'tw-typing': 'typing',
      'tw-fireworks': 'fireworks',
      'tw-bgm': 'bgm'
    };
    Object.keys(map).forEach(function(id){
      var el = document.getElementById(id);
      if (!el) return;
      el.value = TWEAKS[map[id]] || el.value;
      el.addEventListener('change', function(){
        TWEAKS[map[id]] = el.value;
        saveTweaks();
        // Apply live changes
        if (map[id] === 'particles') updateParticles(currentSlide);
      });
    });
  }

  /* ============================================================
     EVENTS
     ============================================================ */
  function bindEvents() {
    var startBtn = document.getElementById('startBtn');
    var replayBtn = document.getElementById('replayBtn');
    if (startBtn) startBtn.addEventListener('click', next);
    if (replayBtn) replayBtn.addEventListener('click', function(){
      letterTyped = false;
      counterStarted = false;
      goTo(0, 'prev');
    });

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    document.addEventListener('keydown', function(e){
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
    });

    // Swipe
    var tx=0, ty=0;
    document.addEventListener('touchstart', function(e){
      tx = e.changedTouches[0].clientX;
      ty = e.changedTouches[0].clientY;
    }, {passive:true});
    document.addEventListener('touchend', function(e){
      var dx = e.changedTouches[0].clientX - tx;
      var dy = e.changedTouches[0].clientY - ty;
      // Require a clearly horizontal, substantial swipe (avoid accidental scroll taps)
      if (Math.abs(dx) < 80) return;
      if (Math.abs(dx) < Math.abs(dy) * 1.8) return;
      // Ignore swipes that originated inside scrollable content (letter, memory, tweaks)
      var tgt = e.target;
      while (tgt && tgt !== document.body) {
        if (tgt.classList && (tgt.classList.contains('letter__paper') || tgt.classList.contains('tweaks-panel'))) {
          return;
        }
        tgt = tgt.parentNode;
      }
      dx < 0 ? next() : prev();
    }, {passive:true});

    bindRevealButtons();
    document.getElementById('bgmBtn').addEventListener('click', function(){
      if (bgmPlaying) bgmStop();
      else bgmStart();
    });
  }

  /* ============================================================
     BOOT
     ============================================================ */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
