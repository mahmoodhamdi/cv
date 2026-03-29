/* =============================================
   navigation.js — Navbar visibility, scroll-spy, nav click handlers
   ============================================= */

function updateNav() {
  var CL = (window.CV && window.CV.lang) ? window.CV.lang : 'en';
  var n = document.getElementById('nav' + (CL === 'ar' ? '-ar' : '-en'));
  if (!n) return;
  var ls = n.querySelectorAll('.nav-a');
  var y = window.scrollY + 120;
  var active = null;
  ls.forEach(function(l) {
    var t = document.getElementById(l.getAttribute('data-t'));
    if (t && t.offsetTop <= y) active = l;
    l.classList.remove('on');
  });
  if (active) active.classList.add('on');
}
window.updateNav = updateNav;

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('.nav-a').forEach(function(l) {
    l.addEventListener('click', function() {
      var t = document.getElementById(this.getAttribute('data-t'));
      if (t) {
        var offset = t.getBoundingClientRect().top + window.scrollY - 60;
        window.scrollTo({ top: offset, behavior: 'smooth' });
      }
    });
  });
});
