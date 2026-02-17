(function () {
  const TOAST_DURATION = 3200;
  const container = document.createElement('div');
  container.className = 'toast-stack';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      document.body.appendChild(container);
    });
  } else {
    document.body.appendChild(container);
  }

  function createToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast-icon"></div>
      <div class="toast-content">${message}</div>
      <button class="toast-close" aria-label="Fermer">&times;</button>
    `;
    container.appendChild(toast);

    const remove = () => {
      toast.classList.add('toast--hide');
      setTimeout(() => toast.remove(), 250);
    };
    const timeout = setTimeout(remove, TOAST_DURATION);
    toast.querySelector('.toast-close').addEventListener('click', () => {
      clearTimeout(timeout);
      remove();
    });
  }

  function showToast(message, variant = 'info') {
    if (!message) return;
    createToast(message, variant);
  }

  function createConfirm({ title = 'Confirmation', message, confirmText = 'Confirmer', cancelText = 'Annuler' }) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'confirm-overlay';
      overlay.innerHTML = `
        <div class="confirm-card">
          <h3>${title}</h3>
          <p>${message}</p>
          <div class="confirm-actions">
            <button class="btn btn-ghost btn-cancel">${cancelText}</button>
            <button class="btn btn-accent btn-confirm">${confirmText}</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = (result) => {
        overlay.classList.add('confirm-overlay--hide');
        setTimeout(() => overlay.remove(), 200);
        resolve(result);
      };

      overlay.querySelector('.btn-cancel').addEventListener('click', () => close(false));
      overlay.querySelector('.btn-confirm').addEventListener('click', () => close(true));
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close(false);
      });
    });
  }

  window.notify = {
    toast: showToast,
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info'),
    confirm: createConfirm,
  };
})();
