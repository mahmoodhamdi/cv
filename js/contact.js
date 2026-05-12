(function () {
  'use strict';

  // Inject styles for spinner and result messages
  var css = document.createElement('style');
  css.textContent = '.ct-spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:ct-spin .6s linear infinite;vertical-align:middle;margin-inline-end:6px}@keyframes ct-spin{to{transform:rotate(360deg)}}.form-result{margin-top:16px;border-radius:10px;font-size:14px;animation:ct-fade .3s ease}.form-success{display:flex;align-items:center;gap:10px;color:#10b981;background:rgba(16,185,129,.1);padding:14px 18px;border-radius:10px;border:1px solid rgba(16,185,129,.2)}.form-error{display:flex;align-items:center;gap:10px;color:#ef4444;background:rgba(239,68,68,.1);padding:14px 18px;border-radius:10px;border:1px solid rgba(239,68,68,.2)}.result-icon{font-size:20px;font-weight:bold}@keyframes ct-fade{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}';
  document.head.appendChild(css);

  function initNewsletterForms() {
    document.querySelectorAll('.newsletter-form').forEach(function(form) {
      var btn = form.querySelector('[type="submit"]');
      if (!btn) return;
      var isAr = form.dataset.lang === 'ar';
      var btnText = btn.querySelector('.btn-text');
      var btnLoading = btn.querySelector('.btn-loading');
      var btnSuccess = btn.querySelector('.btn-success');
      var emailInput = form.querySelector('input[type="email"]');

      form.addEventListener('submit', function(e) {
        e.preventDefault();
        btn.disabled = true;
        if (btnText) btnText.style.display = 'none';
        if (btnLoading) btnLoading.style.display = 'inline';

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: new FormData(form)
        })
          .then(function(r) { return r.json(); })
          .then(function(d) {
            if (!d.success) throw new Error(d.message || 'Failed');
            if (btnLoading) btnLoading.style.display = 'none';
            if (btnSuccess) btnSuccess.style.display = 'inline';
            btn.style.background = '#10b981';
            if (emailInput) emailInput.value = '';
            if (typeof gtag === 'function') {
              gtag('event', 'newsletter_signup', { event_category: 'Newsletter', event_label: isAr ? 'ar' : 'en' });
            }
            setTimeout(function() {
              btn.disabled = false;
              btn.style.background = '';
              if (btnText) btnText.style.display = 'inline';
              if (btnSuccess) btnSuccess.style.display = 'none';
            }, 4000);
          })
          .catch(function() {
            if (btnLoading) btnLoading.style.display = 'none';
            if (btnText) btnText.style.display = 'inline';
            btn.style.background = '#ef4444';
            btn.textContent = isAr ? '✗ خطأ — جرب تاني' : '✗ Error — Try Again';
            setTimeout(function() {
              btn.disabled = false;
              btn.style.background = '';
              btn.innerHTML = '<span class="btn-text">' + (isAr ? 'اشترك' : 'Subscribe') + '</span><span class="btn-loading" style="display:none">' + (isAr ? 'جاري الاشتراك...' : 'Subscribing...') + '</span><span class="btn-success" style="display:none">' + (isAr ? 'تم الاشتراك!' : 'Subscribed!') + '</span>';
            }, 3000);
          });
      });
    });
  }

  function initContactForms() {
    var forms = document.querySelectorAll('.form-card');
    if (!forms.length) return;

    forms.forEach(function (form) {
      var btn = form.querySelector('[type="submit"]');
      if (!btn) return;
      var originalHTML = btn.innerHTML;
      var isAr = form.dataset.lang === 'ar';

      // Create result div if not present
      var resultDiv = form.querySelector('.form-result');
      if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.className = 'form-result';
        resultDiv.style.display = 'none';
        resultDiv.innerHTML = isAr
          ? '<div class="form-success" style="display:none"><span class="result-icon">✓</span><span>تم إرسال الرسالة بنجاح! هرد عليك خلال ٢٤ ساعة.</span></div><div class="form-error" style="display:none"><span class="result-icon">✗</span><span>حصل مشكلة. جرب تاني أو ابعتلي إيميل مباشرة.</span></div>'
          : '<div class="form-success" style="display:none"><span class="result-icon">✓</span><span>Message sent successfully! I\'ll get back to you within 24 hours.</span></div><div class="form-error" style="display:none"><span class="result-icon">✗</span><span>Something went wrong. Please try again or email me directly.</span></div>';
        form.appendChild(resultDiv);
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Loading state
        btn.disabled = true;
        btn.innerHTML = isAr
          ? '<span class="ct-spinner"></span> جاري الإرسال...'
          : '<span class="ct-spinner"></span> Sending...';

        resultDiv.style.display = 'none';

        var formData = new FormData(form);

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData
        })
          .then(function (res) { return res.json(); })
          .then(function (data) {
            if (!data.success) throw new Error(data.message || 'Failed');

            // Success
            btn.style.background = '#10b981';
            btn.innerHTML = isAr ? '✓ تم الإرسال بنجاح!' : '✓ Message Sent!';
            form.reset();

            resultDiv.style.display = 'block';
            resultDiv.querySelector('.form-success').style.display = 'flex';
            resultDiv.querySelector('.form-error').style.display = 'none';

            if (typeof gtag === 'function') {
              gtag('event', 'form_submit', {
                event_category: 'Contact',
                event_label: form.dataset.lang || 'en'
              });
            }

            setTimeout(function () {
              btn.style.background = '';
              btn.innerHTML = originalHTML;
              btn.disabled = false;
            }, 4000);
          })
          .catch(function () {
            // Error
            btn.style.background = '#ef4444';
            btn.innerHTML = isAr ? '✗ فشل — جرب تاني' : '✗ Failed — Try Again';

            resultDiv.style.display = 'block';
            resultDiv.querySelector('.form-success').style.display = 'none';
            resultDiv.querySelector('.form-error').style.display = 'flex';

            setTimeout(function () {
              btn.style.background = '';
              btn.innerHTML = originalHTML;
              btn.disabled = false;
            }, 3000);
          });
      });
    });
  }

  function initAll() {
    initContactForms();
    initNewsletterForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
})();
