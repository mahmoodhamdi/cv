/* =============================================
   language.js — Language switching (EN/AR)
   ============================================= */

window.CV = window.CV || {};
window.CV.lang = 'en';

function setLang(l) {
  window.CV.lang = l;
  var h = document.documentElement;
  var e = document.getElementById('en-cv');
  var a = document.getElementById('ar-cv');
  var b = document.querySelectorAll('.l-btn');
  var ne = document.getElementById('nav-en');
  var na = document.getElementById('nav-ar');

  if (l === 'ar') {
    h.dir = 'rtl';
    h.lang = 'ar';
    e.style.display = 'none';
    a.style.display = 'block';
    ne.style.display = 'none';
    na.style.display = 'flex';
    b[0].classList.remove('on');
    b[1].classList.add('on');
  } else {
    h.dir = 'ltr';
    h.lang = 'en';
    e.style.display = 'block';
    a.style.display = 'none';
    ne.style.display = 'flex';
    na.style.display = 'none';
    b[0].classList.add('on');
    b[1].classList.remove('on');
  }

  window.CV.cFlag = {};
  if (window.initObs) window.initObs();
  if (window.initHeatmap) window.initHeatmap();
  if (window.updateNav) window.updateNav();
}
window.setLang = setLang;
