(function () {
  'use strict';

  /* ============================================================
     STATE
     ============================================================ */
  var currentSlide    = 0;
  var isTransitioning = false;
  var navHideTimer    = null;
  var sparkleTimer    = null;

  /* ============================================================
     DOM REFS
     ============================================================ */
  var slides        = [];
  var totalSlides   = 0;
  var dotsContainer = null;
  var dots          = [];
  var prevBtn       = null;
  var nextBtn       = null;
  var grainEl       = null;

  var chapterSlides = [1, 6, 11];

  /* ============================================================
     SLIDE NUMBERS  (編集用ラベル)
     ============================================================ */
  function addSlideNumbers() {
    slides.forEach(function (slide, i) {
      var num = document.createElement('span');
      num.className = 'slide-number';
      num.textContent = String(i).padStart(2, '0');
      slide.appendChild(num);
    });
  }

  /* ============================================================
     THEME MAP  slide index → body class
     ============================================================ */
  var themeMap = {
    0:  'theme-opening',
    1:  'theme-ch1',
    2:  'theme-ch1',  3:  'theme-ch1',  4:  'theme-ch1',  5:  'theme-ch2',
    6:  'theme-ch2',
    7:  'theme-ch2',  8:  'theme-ch2',  9:  'theme-ch2',  10: 'theme-ch2',
    11: 'theme-ch3',
    12: 'theme-ch3',  13: 'theme-ch3',  14: 'theme-ch3',  15: 'theme-ch3',
    16: 'theme-letter',
    17: 'theme-ending'
  };

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    slides        = Array.from(document.querySelectorAll('.slide'));
    totalSlides   = slides.length;
    dotsContainer = document.getElementById('progressDots');
    prevBtn       = document.getElementById('prevBtn');
    nextBtn       = document.getElementById('nextBtn');
    grainEl       = document.querySelector('.grain-overlay');

    buildDots();
    updateDots(0);
    updateArrows();
    checkAllPhotos();
    addSlideNumbers();
    addOrbsToSlide(slides[0]);
    bindEvents();
    startGrain();

    // Animate opening content after page-load fade-in
    setTimeout(function () { animateSlideContent(slides[0]); }, 900);
  }

  /* ============================================================
     THEME SWITCHING
     ============================================================ */
  var allThemes = ['theme-opening','theme-ch1','theme-ch2','theme-ch3','theme-letter','theme-ending'];

  function applyTheme(slideIndex) {
    var theme = themeMap[slideIndex] || 'theme-opening';
    allThemes.forEach(function (t) { document.body.classList.remove(t); });
    document.body.classList.add(theme);
  }

  /* ============================================================
     DOTS
     ============================================================ */
  function buildDots() {
    dotsContainer.innerHTML = '';
    dots = [];
    for (var i = 0; i < totalSlides; i++) {
      var btn = document.createElement('button');
      btn.className = 'dot';
      btn.setAttribute('aria-label', (i + 1) + '枚目');
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

  /* ============================================================
     ARROWS
     ============================================================ */
  function updateArrows() {
    prevBtn.disabled = (currentSlide === 0);
    nextBtn.disabled = (currentSlide === totalSlides - 1);
  }

  /* ============================================================
     NAV VISIBILITY
     ============================================================ */
  function showNav() {
    prevBtn.classList.add('is-visible');
    nextBtn.classList.add('is-visible');
    if (navHideTimer) clearTimeout(navHideTimer);
    navHideTimer = setTimeout(function () {
      prevBtn.classList.remove('is-visible');
      nextBtn.classList.remove('is-visible');
    }, 2200);
  }

  /* ============================================================
     ENTRANCE ANIMATION
     ============================================================ */
  function animateSlideContent(slideEl) {
    var els = slideEl.querySelectorAll('.anim-el');
    els.forEach(function (el) {
      el.classList.remove('is-animated');
      void el.offsetWidth; // force reflow
      var delay = parseFloat(el.dataset.delay || 0);
      el.style.animationDelay = (delay * 0.18 + 0.05) + 's';
      el.classList.add('is-animated');
    });

    // Start pulsing on reveal buttons (stops on first click)
    var revealBtns = slideEl.querySelectorAll('.memory__reveal-btn');
    revealBtns.forEach(function (btn) {
      if (btn.getAttribute('aria-expanded') === 'false') {
        setTimeout(function () { btn.classList.add('is-pulsing'); }, 1200);
      }
    });
  }

  function resetSlideContent(slideEl) {
    slideEl.querySelectorAll('.anim-el').forEach(function (el) {
      el.classList.remove('is-animated');
    });
  }

  /* ============================================================
     FLOATING ORBS  (dark slides only)
     ============================================================ */
  var darkThemes = ['theme-opening', 'theme-ch1', 'theme-ch2', 'theme-ch3', 'theme-letter', 'theme-ending'];
  var darkSlideIndices = [0, 1, 6, 11, 16, 17];

  function addOrbsToSlide(slideEl) {
    var idx = parseInt(slideEl.dataset.slide, 10);
    if (darkSlideIndices.indexOf(idx) === -1) return;
    if (slideEl.querySelector('.orb')) return;

    for (var i = 0; i < 5; i++) {
      var orb = document.createElement('div');
      orb.className = 'orb';
      var size = Math.random() * 220 + 100;
      orb.style.cssText = [
        'left:'   + (Math.random() * 85 + 5) + '%',
        'top:'    + (Math.random() * 75 + 10) + '%',
        'width:'  + size + 'px',
        'height:' + size + 'px',
        'animation-duration:'  + (Math.random() * 7 + 7) + 's',
        'animation-delay:'     + (Math.random() * 4) + 's'
      ].join(';');
      slideEl.appendChild(orb);
    }
  }

  /* ============================================================
     TRANSITION CORE
     ============================================================ */
  function goTo(targetIndex, direction) {
    if (isTransitioning) return;
    if (targetIndex < 0 || targetIndex >= totalSlides) return;
    if (targetIndex === currentSlide) return;

    isTransitioning = true;

    var fromEl = slides[currentSlide];
    var toEl   = slides[targetIndex];

    // Add orbs to dark destination slides
    addOrbsToSlide(toEl);

    if (direction === 'prev') toEl.classList.add('is-entering-prev');
    void toEl.offsetWidth;

    fromEl.classList.add(direction === 'prev' ? 'is-leaving-prev' : 'is-leaving');
    toEl.classList.add('is-active');
    toEl.classList.remove('is-entering-prev');

    // Apply theme immediately so colors shift with the slide
    applyTheme(targetIndex);

    setTimeout(function () {
      fromEl.classList.remove('is-active', 'is-leaving', 'is-leaving-prev');
      resetSlideContent(fromEl);
      closeRevealPanels(fromEl);

      currentSlide    = targetIndex;
      isTransitioning = false;
      updateDots(targetIndex);
      updateArrows();

      // Animate content of arriving slide
      animateSlideContent(toEl);

      // Special gimmick: confetti on ending slide
      if (targetIndex === totalSlides - 1) {
        setTimeout(launchConfetti, 600);
      }
    }, 760);
  }

  function next() { goTo(currentSlide + 1, 'next'); }
  function prev() { goTo(currentSlide - 1, 'prev'); }

  /* ============================================================
     REVEAL PANELS
     ============================================================ */
  function closeRevealPanels(slideEl) {
    slideEl.querySelectorAll('.memory__reveal-panel.is-revealed').forEach(function (panel) {
      panel.classList.remove('is-revealed');
      panel.setAttribute('aria-hidden', 'true');
      var btn = slideEl.querySelector('[aria-controls="' + panel.id + '"]');
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'あの時、実は…';
        btn.classList.add('is-pulsing');
      }
    });
  }

  function bindRevealButtons() {
    document.getElementById('slidesContainer').addEventListener('click', function (e) {
      var btn = e.target.closest('.memory__reveal-btn');
      if (!btn) return;
      var panelId = btn.getAttribute('aria-controls');
      var panel   = document.getElementById(panelId);
      if (!panel) return;

      var isOpen = panel.classList.contains('is-revealed');
      panel.classList.toggle('is-revealed', !isOpen);
      panel.setAttribute('aria-hidden', String(isOpen));
      btn.setAttribute('aria-expanded', String(!isOpen));
      btn.textContent = isOpen ? 'あの時、実は…' : '閉じる';

      // Stop pulsing once opened
      btn.classList.remove('is-pulsing');
    });
  }

  /* ============================================================
     PHOTO CHECK
     ============================================================ */
  function checkAllPhotos() {
    document.querySelectorAll('.memory__photo').forEach(function (el) {
      var placeholder = el.querySelector('.memory__photo-placeholder');
      if (!placeholder) return;
      var raw = getComputedStyle(el).getPropertyValue('--photo-src').trim()
                  .replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
      if (!raw) return;
      var img = new Image();
      img.onload  = function () { placeholder.style.display = 'none'; };
      img.src = raw;
    });
  }

  /* ============================================================
     FILM GRAIN ANIMATION
     ============================================================ */
  function startGrain() {
    if (!grainEl) return;
    (function step() {
      grainEl.style.backgroundPosition =
        Math.floor(Math.random() * 256) + 'px ' +
        Math.floor(Math.random() * 256) + 'px';
      requestAnimationFrame(step);
    })();
  }

  /* ============================================================
     CURSOR SPARKLE TRAIL
     ============================================================ */
  var sparkleColors = ['#b09ee0','#d4607a','#c47830','#3a9c78','#6a9fd8','#e8b4c8','#f0d080'];
  var lastSparkleTime = 0;

  function onMouseMove(e) {
    showNav();
    var now = Date.now();
    if (now - lastSparkleTime < 70) return; // throttle: 1 sparkle per 70ms
    lastSparkleTime = now;
    createSparkle(e.clientX, e.clientY);
  }

  function createSparkle(x, y) {
    var el = document.createElement('div');
    el.className = 'sparkle';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    el.style.background = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
    el.style.width  = (Math.random() * 5 + 4) + 'px';
    el.style.height = el.style.width;
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 900);
  }

  /* ============================================================
     CONFETTI
     ============================================================ */
  var confettiColors = ['#d4607a','#c47830','#3a9c78','#b09ee0','#6a9fd8','#f0d060','#e8a0b4','#90d0b8'];

  function launchConfetti() {
    for (var i = 0; i < 90; i++) {
      (function () {
        var el = document.createElement('div');
        el.className = 'confetti-piece';
        var size = Math.random() * 9 + 5;
        el.style.cssText = [
          'left:'               + (Math.random() * 100) + 'vw',
          'width:'              + size + 'px',
          'height:'             + size + 'px',
          'background:'         + confettiColors[Math.floor(Math.random() * confettiColors.length)],
          'border-radius:'      + (Math.random() > 0.5 ? '50%' : '2px'),
          'animation-duration:' + (Math.random() * 2.5 + 2) + 's',
          'animation-delay:'    + (Math.random() * 1.8) + 's'
        ].join(';');
        document.body.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 5500);
      })();
    }
  }

  /* ============================================================
     BGM  (Web Audio API — ファイル不要の合成音楽)
     ワルツ風ラブソング、Cメジャー、78BPM、3/4拍子
     ============================================================ */
  var bgmCtx      = null;
  var bgmGain     = null;
  var bgmPlaying  = false;
  var bgmLoopTmr  = null;

  var BGM_BPM   = 78;
  var BGM_BEAT  = 60 / BGM_BPM;          // ≈ 0.769 s/beat
  var BGM_BARS  = 16;
  var BGM_TOTAL = BGM_BARS * 3 * BGM_BEAT; // 16 bars × 3 beats ≈ 36.9 s

  // Melody: [hz, beats, velocity 0-1]
  var BGM_MEL = [
    // Phrase 1 — bars 1-4
    [659.25,2,.72],[587.33,1,.52],
    [523.25,2,.72],[659.25,1,.52],
    [783.99,2,.72],[659.25,1,.52],
    [880.00,3,.82],
    // Phrase 2 — bars 5-8
    [698.46,2,.72],[659.25,1,.52],
    [587.33,2,.72],[698.46,1,.52],
    [659.25,2,.72],[523.25,1,.52],
    [523.25,3,.78],
    // Phrase 3 — bars 9-12  (emotional peak)
    [659.25,1,.65],[698.46,1,.65],[659.25,1,.65],
    [587.33,2,.72],[523.25,1,.55],
    [493.88,2,.72],[440.00,1,.55],
    [392.00,3,.78],
    // Phrase 4 — bars 13-16 (resolution)
    [440.00,2,.72],[493.88,1,.55],
    [523.25,2,.72],[440.00,1,.55],
    [392.00,2,.72],[329.63,1,.55],
    [261.63,3,.85]
  ];

  // Bass: one note per bar (3 beats each)
  var BGM_BASS = [
    130.81,130.81,196.00,220.00,  // bars  1-4  : C C G Am
    174.61,196.00,130.81,130.81,  // bars  5-8  : F G C C
    130.81,130.81,246.94,196.00,  // bars  9-12 : C C B G
    220.00,130.81,196.00,130.81   // bars 13-16 : Am C G C
  ];

  // Counter-melody (high bell accent, every 4 bars on bar 4/8/12/16)
  var BGM_BELL = [
    {bar:3,  hz:1046.50, beats:3, vel:.45},  // C6 — bar 4
    {bar:7,  hz: 880.00, beats:3, vel:.40},  // A5 — bar 8
    {bar:11, hz:1046.50, beats:3, vel:.45},  // C6 — bar 12
    {bar:15, hz:1046.50, beats:3, vel:.50}   // C6 — bar 16
  ];

  function bgmNote(hz, durSec, t, type, vol, detuneCents) {
    var osc = bgmCtx.createOscillator();
    var env = bgmCtx.createGain();
    osc.type = type || 'triangle';
    osc.frequency.value = hz;
    if (detuneCents) osc.detune.value = detuneCents;
    osc.connect(env);
    env.connect(bgmGain);
    var atk = 0.028;
    var rel = Math.min(0.4, durSec * 0.42);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(vol, t + atk);
    env.gain.setValueAtTime(vol, t + durSec - rel);
    env.gain.linearRampToValueAtTime(0, t + durSec);
    osc.start(t);
    osc.stop(t + durSec + 0.05);
  }

  function bgmSchedule(startTime) {
    var t = startTime;

    // ── Melody (triangle + shimmer) ──
    BGM_MEL.forEach(function (n) {
      var dur = n[1] * BGM_BEAT;
      bgmNote(n[0], dur * 0.87, t, 'triangle', n[2] * 0.26);
      bgmNote(n[0], dur * 0.85, t + 0.012, 'sine', n[2] * 0.07, 6);
      t += dur;
    });

    // ── Bass (sine — warm low notes) ──
    t = startTime;
    BGM_BASS.forEach(function (hz) {
      var dur = 3 * BGM_BEAT;
      bgmNote(hz, dur * 0.72, t, 'sine', 0.20);
      t += dur;
    });

    // ── Bell accent (sine — sparkle highs) ──
    BGM_BELL.forEach(function (b) {
      var bt = startTime + b.bar * 3 * BGM_BEAT;
      bgmNote(b.hz, b.beats * BGM_BEAT * 0.9, bt, 'sine', b.vel * 0.22);
    });
  }

  function bgmLoop(audioTime) {
    if (!bgmPlaying) return;
    bgmSchedule(audioTime);
    var wallDelay = (audioTime - bgmCtx.currentTime + BGM_TOTAL - 0.4) * 1000;
    bgmLoopTmr = setTimeout(function () {
      if (bgmPlaying) bgmLoop(audioTime + BGM_TOTAL);
    }, Math.max(0, wallDelay));
  }

  function bgmStart() {
    if (!bgmCtx) {
      bgmCtx  = new (window.AudioContext || window.webkitAudioContext)();
      bgmGain = bgmCtx.createGain();
      bgmGain.gain.value = 0.52;
      bgmGain.connect(bgmCtx.destination);
    }
    if (bgmCtx.state === 'suspended') bgmCtx.resume();
    bgmPlaying = true;
    bgmLoop(bgmCtx.currentTime + 0.1);
  }

  function bgmStop() {
    bgmPlaying = false;
    if (bgmLoopTmr) clearTimeout(bgmLoopTmr);
    if (bgmGain) {
      bgmGain.gain.setTargetAtTime(0, bgmCtx.currentTime, 0.4);
      setTimeout(function () {
        bgmGain = bgmCtx.createGain();
        bgmGain.gain.value = 0.52;
        bgmGain.connect(bgmCtx.destination);
      }, 1200);
    }
  }

  function bindBgmBtn() {
    var btn = document.getElementById('bgmBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      if (bgmPlaying) {
        bgmStop();
        btn.textContent = '♪';
        btn.classList.remove('is-playing');
        btn.setAttribute('aria-label', 'BGMを再生');
      } else {
        bgmStart();
        btn.textContent = '♫';
        btn.classList.add('is-playing');
        btn.setAttribute('aria-label', 'BGMを停止');
      }
    });
  }

  /* ============================================================
     SWIPE
     ============================================================ */
  var touchStartX = 0;
  var touchStartY = 0;

  function onTouchStart(e) {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }

  function onTouchEnd(e) {
    var dx = e.changedTouches[0].clientX - touchStartX;
    var dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    dx < 0 ? next() : prev();
  }

  /* ============================================================
     EVENT BINDING
     ============================================================ */
  function bindEvents() {
    var startBtn  = document.getElementById('startBtn');
    var replayBtn = document.getElementById('replayBtn');
    if (startBtn)  startBtn.addEventListener('click', next);
    if (replayBtn) replayBtn.addEventListener('click', function () { goTo(0, 'prev'); });

    prevBtn.addEventListener('click', prev);
    nextBtn.addEventListener('click', next);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown')  { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
    });

    document.addEventListener('mousemove',  onMouseMove);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });

    bindRevealButtons();
    bindBgmBtn();
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
