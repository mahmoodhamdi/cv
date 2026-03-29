/* =============================================
   theme.js — Theme toggle and localStorage restore
   ============================================= */

(function() {
  try {
    var sv = localStorage.getItem('cv-theme');
    if (sv) document.documentElement.setAttribute('data-theme', sv);
  } catch(e) {}
})();

function toggleTheme() {
  var h = document.documentElement;
  var c = h.getAttribute('data-theme');
  var n = c === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', n);
  try { localStorage.setItem('cv-theme', n); } catch(e) {}
}
window.toggleTheme = toggleTheme;
