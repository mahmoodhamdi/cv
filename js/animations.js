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
    // easeOutExpo
    var v = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = Math.floor(v * target);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

// observe the .stats div directly (not .sec which has opacity:0)
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

// run immediately if DOM is ready, otherwise on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeCounters);
} else {
  observeCounters();
}

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
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', observeDots); } else { observeDots(); }

// lang bars observer
var lObs = new IntersectionObserver(function(en) {
  en.forEach(function(e) {
    if (!e.isIntersecting) return;
    e.target.querySelectorAll('.lang-fill').forEach(function(b) {
      b.style.width = b.style.getPropertyValue('--w');
    });
  });
}, { threshold: .3 });

function observeLangBars() {
  document.querySelectorAll('.lang-bar').forEach(function(b) {
    var sec = b.closest('.sec');
    if (sec) lObs.observe(sec);
  });
}
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', observeLangBars); } else { observeLangBars(); }

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
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', observeValProps); } else { observeValProps(); }

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
if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', observeTestimonials); } else { observeTestimonials(); }

// heatmap
function initHeatmap() {
  ['hm-en', 'hm-ar'].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = '';
    for (var i = 0; i < 60; i++) {
      var sq = document.createElement('span');
      sq.className = 'hm-sq hm-' + Math.floor(Math.random() * 5);
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

// parallax orbs
(function() {
  var o = document.querySelectorAll('.orb'), t = 0;
  window.addEventListener('scroll', function() {
    if (!t) {
      requestAnimationFrame(function() {
        var y = window.scrollY;
        if (o[0]) o[0].style.transform = 'translateY(' + y * .08 + 'px)';
        if (o[1]) o[1].style.transform = 'translateY(' + y * -.05 + 'px)';
        if (o[2]) o[2].style.transform = 'translateY(' + y * .12 + 'px)';
        t = 0;
      });
      t = 1;
    }
  }, { passive: true });
})();
