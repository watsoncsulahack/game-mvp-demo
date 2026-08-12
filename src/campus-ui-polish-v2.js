(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  let frame = 0;
  let pendingFilterScroll = null;

  function emailText(value) {
    return String(value || 'student@university.edu').trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);
  }

  function session() {
    return window.CampusUnifiedApps?.getSession?.() || null;
  }

  function makeStaticBrand(scope, brandSelector, markSelector, menuAttribute, pressed) {
    let brand = $(brandSelector, scope);
    if (!brand) return null;

    if (brand.tagName === 'BUTTON') {
      const replacement = document.createElement('div');
      replacement.className = brand.className;
      replacement.innerHTML = brand.innerHTML;
      replacement.dataset.campusStaticBrand = 'true';
      brand.replaceWith(replacement);
      brand = replacement;
    }

    [...brand.attributes].forEach(attribute => {
      if (attribute.name.startsWith('data-wallet-') || attribute.name.startsWith('data-cf-') || attribute.name === 'aria-label' || attribute.name === 'aria-expanded') {
        brand.removeAttribute(attribute.name);
      }
    });
    brand.classList.add('campus-static-brand');

    const mark = $(markSelector, brand);
    if (!mark) return null;
    mark.setAttribute(menuAttribute, '');
    mark.setAttribute('role', 'button');
    mark.setAttribute('tabindex', '0');
    mark.setAttribute('aria-expanded', String(Boolean(pressed)));
    mark.setAttribute('aria-pressed', String(Boolean(pressed)));
    mark.classList.toggle('is-pressed', Boolean(pressed));
    return mark;
  }

  function receiveDetailMarkup(value, qrMarkup) {
    const email = emailText(value?.email);
    return `<div class="cw-receive-layout">
      <section class="cw-receive-qr-panel" aria-label="Student email QR code">
        <span class="cw-metric-label">Student email QR</span>
        <div class="cw-qr-wrap compact">${qrMarkup}</div>
        <p>Scanning this QR returns the student email address only.</p>
      </section>
      <section class="cw-receive-details">
        <span class="cw-metric-label">Receive by email</span>
        <div class="cw-address-box cw-email-box">
          <code>${escapeHtml(email)}</code>
          <button type="button" data-wallet-copy-email aria-label="Copy student email">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg><span>Copy</span>
          </button>
        </div>
        <dl class="cw-detail-list">
          <div><dt>Student email</dt><dd>${escapeHtml(email)}</dd></div>
          <div><dt>Network</dt><dd>Demo Network</dd></div>
        </dl>
      </section>
    </div>
    <div class="cw-button-row"><button class="cw-button secondary" type="button" data-wallet-route="overview">Done</button></div>`;
  }

  function polishWallet(scope, value) {
    if (!scope || !value) return;
    const sidebar = $('.cw-sidebar', scope);
    const open = Boolean(sidebar?.classList.contains('open'));
    scope.classList.toggle('campus-push-drawer-open', open);

    makeStaticBrand(scope, '.cw-wordmark', '.cw-wallet-mark', 'data-wallet-menu', open);
    $('.cw-mobile-menu', scope)?.remove();
    $('.cw-scrim', scope)?.setAttribute('aria-hidden', 'true');

    const identity = $('.cw-identity-button', scope);
    if (identity) {
      identity.querySelector('small')?.remove();
      identity.setAttribute('title', emailText(value.email));
    }

    const receive = $('[data-wallet-view="receive"]', scope);
    const detail = receive?.querySelector('.cw-detail-card');
    if (detail && detail.dataset.receiveLayoutV2 !== emailText(value.email)) {
      const qr = detail.querySelector('.cw-email-qr')?.outerHTML;
      if (qr) {
        detail.dataset.receiveLayoutV2 = emailText(value.email);
        detail.innerHTML = receiveDetailMarkup(value, qr);
        const heading = receive.querySelector('.cw-page-heading p');
        if (heading) heading.textContent = 'Share your student email using the QR code or copy it directly.';
      }
    }
  }

  function polishFaucet(scope, value) {
    if (!scope || !value) return;
    const drawer = $('.cf-drawer', scope);
    const open = Boolean(drawer?.classList.contains('open'));
    scope.classList.toggle('campus-push-drawer-open', open);

    $('.cf-menu-button', scope)?.remove();
    $('.cf-drawer-heading', scope)?.remove();
    $('.cf-drawer-scrim', scope)?.setAttribute('aria-hidden', 'true');
    makeStaticBrand(scope, '.cf-brand', '.cf-brand-mark', 'data-cf-menu', open);

    const account = $('.cf-account-button', scope);
    if (account) {
      account.setAttribute('title', emailText(value.email));
      account.setAttribute('aria-label', `Student account ${emailText(value.email)}`);
    }
  }

  function restoreFilterScroll(scope) {
    if (pendingFilterScroll === null) return;
    const panel = $('.cb-filters-panel', scope);
    if (!panel) return;
    const target = pendingFilterScroll;
    pendingFilterScroll = null;
    panel.scrollTop = target;
    requestAnimationFrame(() => { panel.scrollTop = target; });
  }

  function polishBookstore(scope) {
    if (!scope) return;
    scope.querySelectorAll('.cb-collectible-badge').forEach(badge => {
      if (badge.textContent) badge.textContent = '';
      badge.setAttribute('aria-label', 'Collectible eligible');
      badge.setAttribute('title', 'Collectible eligible');
    });
    restoreFilterScroll(scope);
  }

  function currentView() {
    const title = $('#campusAppsTitle')?.textContent || '';
    if (title.includes('wallet')) return 'wallet';
    if (title.includes('faucet')) return 'faucet';
    if (title.includes('bookstore')) return 'bookstore';
    return 'other';
  }

  function sync() {
    frame = 0;
    const shell = $('#campusAppsShell');
    const content = $('#campusAppsContent');
    if (!shell || shell.hidden || !content) return;
    const view = currentView();
    const value = session();
    if (view === 'wallet') polishWallet(content, value);
    if (view === 'faucet') polishFaucet(content, value);
    if (view === 'bookstore') polishBookstore(content.querySelector('[data-bookstore-ui-v1]'));
  }

  function queue() {
    if (!frame) frame = requestAnimationFrame(sync);
  }

  document.addEventListener('change', event => {
    const panel = event.target.closest?.('.cb-filters-panel');
    if (!panel) return;
    if (event.target.matches('[data-cb-filter-category],[data-cb-filter-brand],[data-cb-filter-size],[data-cb-filter-price],[data-cb-filter-stock],[data-cb-filter-collectible]')) {
      pendingFilterScroll = panel.scrollTop;
    }
  }, true);

  document.addEventListener('click', async event => {
    const copy = event.target.closest?.('[data-wallet-copy-email]');
    if (!copy) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const value = session();
    const email = emailText(value?.email);
    try {
      await navigator.clipboard.writeText(email);
      const toast = $('#toast');
      if (toast) {
        toast.textContent = 'Student email copied.';
        toast.hidden = false;
        clearTimeout(copy._toastTimer);
        copy._toastTimer = setTimeout(() => { toast.hidden = true; }, 1800);
      }
    } catch {}
  }, true);

  document.addEventListener('keydown', event => {
    const trigger = event.target.closest?.('.cw-wallet-mark[role="button"],.cf-brand-mark[role="button"]');
    if (!trigger || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    trigger.click();
  });

  function start() {
    const shell = $('#campusAppsShell');
    if (!shell) return;
    new MutationObserver(queue).observe(shell, { childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class'] });
    window.addEventListener('campus-session-changed', queue);
    queue();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
