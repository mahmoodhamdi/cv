/* =============================================
   animations.js — Scroll reveal, counters, skill dots, lang bars,
                   value props, testimonials, heatmap, parallax orbs
   ============================================= */

window.CV = window.CV || {};
window.CV.cFlag = {};

var rObs;

function initObs() {
  if (rObs) rObs.disconnect();
  rObs = new IntersectionObserver(function(en) {
    en.forEach(function(e) {
      if (e.isIntersecting) e.target.classList.add('rev');
    });
  }, { threshold: .06, rootMargin: '0px 0px -30px 0px' });
  document.querySelectorAll('.sec').forEach(function(s) {
    s.classList.remove('rev');
    rObs.observe(s);
  });
}
window.initObs = initObs;

// counter — animate numbers from 0 to data-count
function animateCounter(el) {
  var key = (el.closest('.sec') ? el.closest('.sec').id : 'x') + '-' + el.getAttribute('data-count');
  if (window.CV.cFlag[key]) return;
  window.CV.cFlag[key] = 1;
  var target = parseInt(el.getAttribute('data-count'), 10);
  if (isNaN(target) || target <= 0) { el.textContent = target; return; }
  var start = null;
  var duration = 2000;
  function step(ts) {
    if (!start) start = ts;
    var p = Math.min((ts - start) / duration, 1);
    var v = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = Math.floor(v * target);
    if (p < 1) requestAnimationFrame(step);
    else {
      el.textContent = target;
      el.classList.add('counter-done');
      var parent = el.closest('.st-it') || el.parentElement;
      if (parent) {
        parent.style.position = 'relative';
        for (var pi = 0; pi < 4; pi++) {
          var particle = document.createElement('span');
          particle.className = 'counter-particle';
          var angle = (pi / 4) * Math.PI * 2 + Math.random() * 0.5;
          var dist = 20 + Math.random() * 15;
          particle.style.setProperty('--px', Math.cos(angle) * dist + 'px');
          particle.style.setProperty('--py', Math.sin(angle) * dist + 'px');
          particle.style.left = '50%';
          particle.style.top = '50%';
          particle.style.animation = 'particleBurst 0.6s ease-out forwards';
          parent.appendChild(particle);
          (function(p) { setTimeout(function() { p.remove(); }, 700); })(particle);
        }
      }
    }
  }
  requestAnimationFrame(step);
}

var cntObs = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (!entry.isIntersecting) return;
    entry.target.querySelectorAll('[data-count]').forEach(animateCounter);
  });
}, { threshold: 0.2 });

function observeCounters() {
  document.querySelectorAll('.stats').forEach(function(el) {
    cntObs.observe(el);
  });
}
window.observeCounters = observeCounters;

// skill dots observer
var dObs = new IntersectionObserver(function(en) {
  en.forEach(function(e) {
    if (!e.isIntersecting) return;
    var dots = e.target.querySelectorAll('.sk-dot[data-d]');
    dots.forEach(function(d, i) {
      setTimeout(function() { d.classList.add('on'); }, i * 40);
    });
  });
}, { threshold: .2 });

function observeDots() {
  document.querySelectorAll('.sk-g').forEach(function(g) {
    var sec = g.closest('.sec');
    if (sec) dObs.observe(sec);
  });
}

// lang bars observer
var lObs = new IntersectionObserver(function(en) {
  en.forEach(function(e) {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.lang-fill').forEach(function(b) {
      var w = b.style.getPropertyValue('--w');
      var pct = parseFloat(w) / 100;
      b.style.transform = 'scaleX(' + pct + ')';
    });
  });
}, { threshold: .3 });

function observeLangBars() {
  document.querySelectorAll('.lang-bar').forEach(function(b) {
    var sec = b.closest('.sec');
    if (sec) lObs.observe(sec);
  });
}

// value props observer
var vObs = new IntersectionObserver(function(en) {
  en.forEach(function(e) {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.val-c').forEach(function(c, i) {
      setTimeout(function() { c.classList.add('anim'); }, i * 120);
    });
  });
}, { threshold: .2 });

function observeValProps() {
  document.querySelectorAll('.val-g').forEach(function(g) {
    var sec = g.closest('.sec');
    if (sec) vObs.observe(sec);
  });
}

// testimonials observer
var tObs = new IntersectionObserver(function(en) {
  en.forEach(function(e) {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.test-c').forEach(function(c, i) {
      setTimeout(function() { c.classList.add('anim'); }, i * 200);
    });
  });
}, { threshold: .15 });

function observeTestimonials() {
  document.querySelectorAll('.test-g').forEach(function(g) {
    var sec = g.closest('.sec');
    if (sec) tObs.observe(sec);
  });
}

// heatmap — deterministic per-day so the pattern is stable across refreshes
// but rotates one cell every day, mimicking real contribution activity.
function initHeatmap() {
  var now = new Date();
  var dayKey = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  function intensity(i) {
    // Two-wave deterministic noise — looks like clustered commit activity
    var s = Math.sin(i * 0.73 + dayKey * 0.21) + Math.sin(i * 1.91 + dayKey * 0.05) + Math.sin(i * 0.31);
    var t = (s + 3) / 6; // normalize to ~0..1
    if (t < 0) t = 0; if (t > 1) t = 1;
    // Bias toward 1-3 intensity (active dev pattern, few zero-days)
    var level = Math.round(t * 4 * 0.85 + 0.4);
    if (level < 0) level = 0; if (level > 4) level = 4;
    return level;
  }
  ['hm-en', 'hm-ar'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    for (var i = 0; i < 60; i++) {
      var sq = document.createElement('span');
      sq.className = 'hm-sq hm-' + intensity(i);
      el.appendChild(sq);
    }
  });
  var hmObs = new IntersectionObserver(function(en) {
    en.forEach(function(e) {
      if (!e.isIntersecting) return;
      e.target.querySelectorAll('.hm-sq').forEach(function(s, i) {
        setTimeout(function() { s.classList.add('vis'); }, i * 30);
      });
    });
  }, { threshold: .3 });
  document.querySelectorAll('.heatmap').forEach(function(h) {
    hmObs.observe(h);
  });
}
window.initHeatmap = initHeatmap;

// re-observe all animated sections (called after language switch)
function reobserveAll() {
  observeCounters();
  observeDots();
  observeLangBars();
  observeValProps();
  observeTestimonials();
}
window.reobserveAll = reobserveAll;

// Defer all observer setup to idle time to avoid long tasks on mobile
function initAllObservers() {
  observeCounters();
  observeDots();
  observeLangBars();
  observeValProps();
  observeTestimonials();
}

function scheduleInit(fn) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(fn);
  } else {
    setTimeout(fn, 80);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    scheduleInit(initAllObservers);
  });
} else {
  scheduleInit(initAllObservers);
}

// parallax orbs — use translate3d for GPU compositing
(function() {
  var o = document.querySelectorAll('.orb'), t = 0;
  window.addEventListener('scroll', function() {
    if (!t) {
      requestAnimationFrame(function() {
        var y = window.scrollY;
        if (o[0]) o[0].style.transform = 'translate3d(0,' + y * .08 + 'px,0)';
        if (o[1]) o[1].style.transform = 'translate3d(0,' + y * -.05 + 'px,0)';
        if (o[2]) o[2].style.transform = 'translate3d(0,' + y * .12 + 'px,0)';
        t = 0;
      });
      t = 1;
    }
  }, { passive: true });
})();

// Auto-detect color scheme preference on first visit
(function() {
  try {
    if (localStorage.getItem('cv-theme')) return;
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch(e) {}
})();

// Loading screen - first visit only (instant dismiss)
(function() {
  if (sessionStorage.getItem('cv-loaded')) return;
  sessionStorage.setItem('cv-loaded', '1');
  var screen = document.createElement('div');
  screen.className = 'loading-screen';
  var isAr = document.documentElement.lang === 'ar';
  screen.innerHTML = '<div class="loading-avatar"><svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" width="50" height="50"><path d="M30 82L45 38L60 65L75 38L90 82" stroke="url(#lg)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><line x1="38" y1="68" x2="82" y2="68" stroke="rgba(56,189,248,0.5)" stroke-width="1.5"/><defs><linearGradient id="lg" x1="30" y1="38" x2="90" y2="82"><stop offset="0%" stop-color="#38bdf8"/><stop offset="100%" stop-color="#818cf8"/></linearGradient></defs></svg></div>';
  document.body.appendChild(screen);
  requestAnimationFrame(function() {
    screen.classList.add('fade-out');
    setTimeout(function() { screen.remove(); }, 400);
  });
})();

// Cursor trail - desktop only
(function() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  var trail = document.createElement('div');
  trail.className = 'cursor-trail';
  trail.style.display = 'none';
  document.body.appendChild(trail);
  var mx = 0, my = 0, tx = 0, ty = 0;
  document.addEventListener('mousemove', function(e) {
    mx = e.clientX; my = e.clientY;
    trail.style.display = 'block';
  });
  function animate() {
    tx += (mx - tx) * 0.15;
    ty += (my - ty) * 0.15;
    trail.style.transform = 'translate3d(' + (tx - 4) + 'px,' + (ty - 4) + 'px,0)';
    requestAnimationFrame(animate);
  }
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) animate();
})();

// Typing effect on job title
(function() {
  if (sessionStorage.getItem('cv-typed')) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function typeTitle(el, text) {
    el.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    el.appendChild(cursor);
    var i = 0;
    setTimeout(function() {
      var interval = setInterval(function() {
        if (i < text.length) {
          el.insertBefore(document.createTextNode(text[i]), cursor);
          i++;
        } else {
          clearInterval(interval);
          setTimeout(function() {
            cursor.classList.add('done');
            setTimeout(function() { cursor.remove(); }, 2100);
          }, 500);
        }
      }, 50);
    }, 500);
  }

  function init() {
    var enTitle = document.querySelector('#en-cv .ttl');
    var arTitle = document.querySelector('#ar-cv .ttl');
    if (enTitle) {
      var enText = enTitle.textContent;
      var arText = arTitle ? arTitle.textContent : '';
      var lang = (window.CV && window.CV.lang) || 'en';
      if (lang === 'ar' && arTitle) {
        typeTitle(arTitle, arText);
      } else {
        typeTitle(enTitle, enText);
      }
    }
    sessionStorage.setItem('cv-typed', '1');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

// Magnetic buttons - CTA buttons (desktop only)
(function() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initMagnetic() {
    document.querySelectorAll('.btn-p, .btn-o').forEach(function(btn) {
      btn.classList.add('btn-magnetic');
      btn.addEventListener('mousemove', function(e) {
        var rect = btn.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          var pull = (100 - dist) / 100;
          btn.style.transform = 'translate(' + (dx * pull * 0.08) + 'px,' + (dy * pull * 0.08) + 'px)';
        }
      });
      btn.addEventListener('mouseleave', function() {
        btn.style.transform = '';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMagnetic);
  } else {
    initMagnetic();
  }
})();

// Card tilt effect (desktop only)
(function() {
  if (!window.matchMedia('(hover: hover)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initTilt() {
    document.querySelectorAll('.svc-c, .tl-it').forEach(function(card) {
      card.classList.add('tilt-card');
      var shine = document.createElement('div');
      shine.className = 'tilt-shine';
      card.appendChild(shine);
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width;
        var y = (e.clientY - rect.top) / rect.height;
        var rotX = (0.5 - y) * 5;
        var rotY = (x - 0.5) * 5;
        card.style.transform = 'perspective(800px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
        shine.style.background = 'radial-gradient(circle at ' + (x * 100) + '% ' + (y * 100) + '%, rgba(255,255,255,0.15), transparent 60%)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
        card.style.transition = 'transform 0.5s ease';
        setTimeout(function() { card.style.transition = ''; }, 500);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTilt);
  } else {
    initTilt();
  }
})();

// Skill category reveal
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function initSkillReveal() {
    var skObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (!entry.isIntersecting) return;
        var cards = entry.target.querySelectorAll('.sk-cat');
        cards.forEach(function(card, i) {
          setTimeout(function() { card.classList.add('revealed'); }, i * 100);
        });
        skObs.unobserve(entry.target);
      });
    }, { threshold: 0.15 });

    document.querySelectorAll('.sk-g').forEach(function(grid) {
      var sec = grid.closest('.sec');
      if (sec) skObs.observe(sec);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSkillReveal);
  } else {
    initSkillReveal();
  }
})();

// Floating particles (desktop only, deferred)
(function() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  function createParticles() {
    for (var i = 0; i < 4; i++) {
      var p = document.createElement('div');
      p.className = 'bg-particle';
      p.setAttribute('aria-hidden', 'true');
      var size = 2 + Math.random() * 2;
      p.style.width = size + 'px';
      p.style.height = size + 'px';
      p.style.opacity = (0.1 + Math.random() * 0.05).toFixed(2);
      p.style.left = Math.random() * 100 + 'vw';
      p.style.top = Math.random() * 100 + 'vh';
      p.style.animation = 'particleDrift ' + (15 + Math.random() * 25) + 's ease-in-out infinite';
      p.style.animationDelay = -(Math.random() * 20) + 's';
      document.body.appendChild(p);
    }
  }

  // Defer particle creation to avoid blocking
  if ('requestIdleCallback' in window) {
    requestIdleCallback(createParticles);
  } else {
    setTimeout(createParticles, 200);
  }
})();
