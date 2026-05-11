/* =============================================
   utils.js — Utility functions: toast, clipboard
   ============================================= */

function showToast(m) {
  var t = document.getElementById('toast');
  t.textContent = m;
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2000);
}
window.showToast = showToast;

function downloadCV() {
  var isAr = document.documentElement.lang === 'ar';
  showToast(isAr ? 'اختر "حفظ كـ PDF" من نافذة الطباعة' : 'Choose "Save as PDF" in the print dialog');
  if (typeof gtag === 'function') gtag('event', 'download_cv', { event_category: 'CV', event_label: isAr ? 'ar' : 'en' });
  setTimeout(function() { window.print(); }, 600);
}
window.downloadCV = downloadCV;

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('[data-copy]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      e.preventDefault();
      var CL = (window.CV && window.CV.lang) ? window.CV.lang : 'en';
      navigator.clipboard.writeText(this.getAttribute('data-copy')).then(function() {
        showToast(CL === 'ar' ? 'تم النسخ!' : 'Copied to clipboard!');
      });
    });
  });
});
