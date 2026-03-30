(function () {
  'use strict';

  function initContactForms() {
    var forms = document.querySelectorAll('.form-card');

    forms.forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        var btn = form.querySelector('[type="submit"]');
        var btnText = btn.querySelector('.btn-text');
        var btnLoading = btn.querySelector('.btn-loading');
        var btnSuccess = btn.querySelector('.btn-success');

        // Show loading state
        btn.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = '';
        btnSuccess.style.display = 'none';

        var formData = new FormData(form);

        fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          body: formData,
        })
          .then(function (res) {
            return res.json();
          })
          .then(function (data) {
            if (data.success) {
              btnLoading.style.display = 'none';
              btnSuccess.style.display = '';
              form.reset();

              if (typeof gtag === 'function') {
                gtag('event', 'form_submit', {
                  event_category: 'Contact',
                  event_label: form.dataset.lang || 'unknown',
                });
              }

              setTimeout(function () {
                btnSuccess.style.display = 'none';
                btnText.style.display = '';
                btn.disabled = false;
              }, 3000);
            } else {
              throw new Error(data.message || 'Submission failed');
            }
          })
          .catch(function (err) {
            btnLoading.style.display = 'none';
            btnText.style.display = '';
            btnText.textContent = err.message || 'Error. Try again.';
            btn.disabled = false;

            setTimeout(function () {
              btnText.textContent = btn.dataset.defaultText || 'Send';
            }, 3000);
          });
      });

      // Cache the original button text for error recovery
      var btn = form.querySelector('[type="submit"]');
      if (btn) {
        var btnText = btn.querySelector('.btn-text');
        if (btnText) {
          btn.dataset.defaultText = btnText.textContent;
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContactForms);
  } else {
    initContactForms();
  }
})();
