const ICONS = {
  exit: `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 4v16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  danger: `<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

let dialogEl = null;
let backdropEl = null;
let panelEl = null;
let iconEl = null;
let titleEl = null;
let messageEl = null;
let cancelBtn = null;
let confirmBtn = null;
let resolvePending = null;
let closeTimer = null;
let lastFocus = null;

function ensureDialog() {
  if (dialogEl) return;

  dialogEl = document.getElementById('confirm-dialog');
  if (!dialogEl) return;

  backdropEl = dialogEl.querySelector('.confirm-dialog__backdrop');
  panelEl = dialogEl.querySelector('.confirm-dialog__panel');
  iconEl = dialogEl.querySelector('.confirm-dialog__icon');
  titleEl = dialogEl.querySelector('.confirm-dialog__title');
  messageEl = dialogEl.querySelector('.confirm-dialog__message');
  cancelBtn = dialogEl.querySelector('.confirm-dialog__btn--cancel');
  confirmBtn = dialogEl.querySelector('.confirm-dialog__btn--confirm');

  backdropEl?.addEventListener('click', () => finish(false));
  cancelBtn?.addEventListener('click', () => finish(false));
  confirmBtn?.addEventListener('click', () => finish(true));

  document.addEventListener('keydown', (e) => {
    if (!dialogEl?.classList.contains('confirm-dialog--visible')) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
}

function finish(confirmed) {
  if (!dialogEl || !resolvePending) return;

  dialogEl.classList.add('confirm-dialog--closing');
  dialogEl.classList.remove('confirm-dialog--visible');
  document.body.classList.remove('confirm-dialog-open');

  const resolve = resolvePending;
  resolvePending = null;

  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    dialogEl.classList.remove('confirm-dialog--closing', `confirm-dialog--${dialogEl.dataset.variant || 'default'}`);
    dialogEl.setAttribute('aria-hidden', 'true');
    lastFocus?.focus?.();
    lastFocus = null;
    resolve(confirmed);
  }, 220);
}

/**
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, variant?: 'exit'|'danger' }} options
 * @returns {Promise<boolean>}
 */
export function showConfirm(options) {
  ensureDialog();
  if (!dialogEl) return Promise.resolve(false);
  if (resolvePending) return Promise.resolve(false);

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default'
  } = options;

  lastFocus = document.activeElement;
  resolvePending = null;

  dialogEl.dataset.variant = variant;
  dialogEl.classList.remove('confirm-dialog--closing', 'confirm-dialog--exit', 'confirm-dialog--danger');
  if (variant === 'exit' || variant === 'danger') {
    dialogEl.classList.add(`confirm-dialog--${variant}`);
  }

  if (iconEl) iconEl.innerHTML = ICONS[variant] || ICONS.danger;
  if (titleEl) titleEl.textContent = title;
  if (messageEl) messageEl.textContent = message;
  if (cancelBtn) cancelBtn.textContent = cancelLabel;
  if (confirmBtn) confirmBtn.textContent = confirmLabel;

  dialogEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('confirm-dialog-open');

  requestAnimationFrame(() => {
    dialogEl.classList.add('confirm-dialog--visible');
    cancelBtn?.focus();
  });

  return new Promise(resolve => {
    resolvePending = resolve;
  });
}
