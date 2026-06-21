const SEARCH_ICON = `
  <svg class="ai-search-bar__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
    <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/>
    <path d="M20 20l-3.5-3.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
  </svg>`;

const GLASS_FILTER = `
  <svg class="ai-search-bar__filter-def" aria-hidden="true">
    <defs>
      <filter id="container-glass" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="1" seed="1" result="turbulence"/>
        <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise"/>
        <feDisplacementMap in="SourceGraphic" in2="blurredNoise" scale="70" xChannelSelector="R" yChannelSelector="B" result="displaced"/>
        <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur"/>
        <feComposite in="finalBlur" in2="finalBlur" operator="over"/>
      </filter>
    </defs>
  </svg>`;

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function mountAiSearchBar(mountEl, options = {}) {
  const {
    placeholder = 'Design this room…',
    onSearch,
    getDisabled = () => false,
  } = options;

  if (!mountEl) return null;

  mountEl.innerHTML = `
    ${GLASS_FILTER}
    <form class="ai-search-bar" autocomplete="off">
      <div class="ai-search-bar__shell">
        <div class="ai-search-bar__glass-shadow" aria-hidden="true"></div>
        <div class="ai-search-bar__glass-backdrop" aria-hidden="true"></div>
        <div class="ai-search-bar__content">
          <div class="ai-search-bar__icon-wrap">${SEARCH_ICON}</div>
          <input
            type="text"
            class="ai-search-bar__input"
            placeholder="${escapeHtml(placeholder)}"
            autocomplete="off"
            spellcheck="false"
          />
          <button type="submit" class="ai-search-bar__submit" hidden>Design</button>
        </div>
      </div>
    </form>`;

  const form = mountEl.querySelector('.ai-search-bar');
  const shell = mountEl.querySelector('.ai-search-bar__shell');
  const backdrop = mountEl.querySelector('.ai-search-bar__glass-backdrop');
  const input = mountEl.querySelector('.ai-search-bar__input');
  const submitBtn = mountEl.querySelector('.ai-search-bar__submit');
  const iconWrap = mountEl.querySelector('.ai-search-bar__icon-wrap');

  if (backdrop) {
    backdrop.style.backdropFilter = 'blur(14px) saturate(1.35)';
    backdrop.style.webkitBackdropFilter = 'blur(14px) saturate(1.35)';
    try {
      backdrop.style.backdropFilter = 'url("#container-glass") blur(10px) saturate(1.25)';
    } catch {
      // Keep blur fallback above.
    }
  }

  let blurTimer = null;

  function setFocused(focused) {
    form.classList.toggle('is-focused', focused);
    shell.classList.toggle('is-focused', focused);
  }

  function setDisabled(disabled) {
    form.classList.toggle('is-disabled', disabled);
    input.disabled = disabled;
    submitBtn.disabled = disabled;
  }

  function submit(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed || getDisabled()) return;

    input.value = '';
    submitBtn.hidden = true;

    iconWrap.classList.add('is-animating');
    setTimeout(() => iconWrap.classList.remove('is-animating'), 700);

    onSearch?.(trimmed);
  }

  function syncDisabled() {
    setDisabled(getDisabled());
  }

  input.addEventListener('input', () => {
    submitBtn.hidden = !input.value.trim();
  });

  input.addEventListener('focus', () => {
    clearTimeout(blurTimer);
    setFocused(true);
  });

  input.addEventListener('blur', () => {
    blurTimer = setTimeout(() => setFocused(false), 180);
  });

  input.addEventListener('pointerdown', (e) => e.stopPropagation());
  shell.addEventListener('pointerdown', (e) => e.stopPropagation());

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    submit(input.value);
  });

  submitBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

  syncDisabled();

  return {
    focus() {
      input.focus();
    },
    clear() {
      input.value = '';
      submitBtn.hidden = true;
    },
    setPlaceholder(text) {
      input.placeholder = text;
    },
    refresh() {
      syncDisabled();
    },
    destroy() {
      clearTimeout(blurTimer);
      mountEl.innerHTML = '';
    },
  };
}
