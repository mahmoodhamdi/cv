/* =============================================
   main.js — DOMContentLoaded init, scroll progress, scroll-to-top
   ============================================= */

window.CV = window.CV || {};
window.CV.lang = window.CV.lang || 'en';
window.CV.cFlag = window.CV.cFlag || {};

// page load fade-in
window.addEventListener('DOMContentLoaded', function() {
  document.body.classList.add('loaded');
});

// scroll progress bar + scroll-to-top + navbar visibility
(function() {
  var sp = document.getElementById('sp');
  var st = document.getElementById('sTop');
  var nb = document.getElementById('navbar');
  var t = 0;
  window.addEventListener('scroll', function() {
    if (!t) {
      requestAnimationFrame(function() {
        var y = window.scrollY;
        var h = document.documentElement.scrollHeight - window.innerHeight;
        if (sp) sp.style.width = (y / h * 100) + '%';
        if (st) st.classList.toggle('vis', y > 400);
        if (nb) nb.classList.toggle('vis', y > 300);
        if (window.updateNav) window.updateNav();
        t = 0;
      });
      t = 1;
    }
  }, { passive: true });
})();

// initialize on DOM ready
window.addEventListener('DOMContentLoaded', function() {
  if (window.initObs) window.initObs();
  if (window.initHeatmap) window.initHeatmap();
});
