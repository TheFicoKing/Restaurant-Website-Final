/* Restaurant ATA: language, consent and shared browser utilities.
   No analytics are installed. Reservations are NOT stored in cookies. */
(() => {
  'use strict';
  const dict = window.ATA_TRANSLATIONS || {};
  const sourceKeys = window.ATA_TEXT_KEYS || {};
  const scriptURL = document.currentScript?.src || new URL('assets/js/site.js', document.baseURI).href;
  const rootPath = new URL('../../', scriptURL).pathname;
  const sessionKey = 'ata_language_session:' + rootPath;
  const cookieNames = { consent: 'ata_consent', language: 'ata_language' };
  const maxAge = 180 * 24 * 60 * 60;
  let fallbackCart = [];
  function readCookie(name) {
    try {
      const part = document.cookie.split('; ').find(entry => entry.startsWith(name + '='));
      return part ? decodeURIComponent(part.slice(name.length + 1)) : null;
    } catch { return null; }
  }
  function writeCookie(name, value, age = maxAge) {
    try {
      document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${age}; Path=${rootPath}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
      return age === 0 || readCookie(name) === value;
    } catch { return false; }
  }
  function readConsent() {
    try {
      const parsed = JSON.parse(readCookie(cookieNames.consent));
      return parsed && parsed.version === 1 && typeof parsed.preferences === 'boolean' && typeof parsed.externalMedia === 'boolean'
        ? parsed : null;
    } catch { return null; }
  }
  let consent = readConsent();
  let sessionLanguage = null;
  try { sessionLanguage = sessionStorage.getItem(sessionKey); } catch {}
  let language = consent?.preferences ? readCookie(cookieNames.language) : sessionLanguage;
  if (!['en', 'mk'].includes(language)) language = ['en', 'mk'].includes(sessionLanguage) ? sessionLanguage : 'en';

  function t(key, values = {}) {
    const item = dict[key];
    let result = item?.[language] ?? item?.en ?? key;
    return String(result).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(values, name) ? String(values[name]) : match);
  }
  function sourceText(text) { return t(sourceKeys[text] || text); }
  function translate(root = document) {
    const elements = [...root.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-alt], [data-i18n-title], [data-i18n-aria-label]')];
    if (root instanceof Element && root.matches('[data-i18n]')) elements.unshift(root);
    for (const element of elements) {
      if (element.dataset.i18n) element.textContent = t(element.dataset.i18n);
      for (const attribute of ['placeholder', 'alt', 'title', 'aria-label']) {
        const key = element.getAttribute('data-i18n-' + attribute);
        if (key) element.setAttribute(attribute, t(key));
      }
    }
  }
  function notice(message) {
    const target = document.getElementById('ata-notice');
    target.textContent = message;
    target.hidden = false;
    window.clearTimeout(notice.timer);
    notice.timer = window.setTimeout(() => { target.hidden = true; }, 6500);
  }
  function setLanguage(next, explicit = true) {
    if (!['en', 'mk'].includes(next)) return;
    language = next;
    document.documentElement.lang = next;
    if (explicit) {
      try { sessionStorage.setItem(sessionKey, next); } catch {}
      if (consent?.preferences) writeCookie(cookieNames.language, next);
    }
    translate();
    document.querySelectorAll('[data-set-language]').forEach(button => {
      const active = button.dataset.setLanguage === language;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.dispatchEvent(new CustomEvent('ata:languagechange', { detail: { language } }));
  }
  function saveConsent(preferences, externalMedia) {
    consent = { version: 1, preferences: Boolean(preferences), externalMedia: Boolean(externalMedia) };
    const saved = writeCookie(cookieNames.consent, JSON.stringify(consent));
    if (consent.preferences) writeCookie(cookieNames.language, language);
    else writeCookie(cookieNames.language, '', 0);
    document.getElementById('ata-cookie-banner').hidden = true;
    syncConsentInputs();
    syncVideo();
    document.dispatchEvent(new CustomEvent('ata:consentchange', { detail: { ...consent } }));
    notice(t(saved ? 'cookieSaved' : 'storageBlocked'));
  }
  function syncConsentInputs() {
    document.getElementById('ata-preferences').checked = Boolean(consent?.preferences);
    document.getElementById('ata-external-media').checked = Boolean(consent?.externalMedia);
  }
  const ui = document.createElement('div');
  ui.id = 'ata-shared-ui';
  ui.innerHTML = `
    <section id="ata-cookie-banner" class="ata-cookie-banner" aria-labelledby="ata-cookie-title" hidden>
      <div class="ata-cookie-copy"><span class="ata-eyebrow" data-i18n="cookieEyebrow"></span>
        <h2 id="ata-cookie-title" data-i18n="cookieTitle"></h2><p data-i18n="cookieIntro"></p></div>
      <div class="ata-cookie-actions">
        <button type="button" class="ata-button ata-button-outline" data-consent-required data-i18n="onlyRequired"></button>
        <button type="button" class="ata-button ata-button-outline" data-consent-all data-i18n="acceptOptional"></button>
        <button type="button" class="ata-text-button" data-open-cookies data-i18n="cookieSettings"></button>
      </div>
    </section>
    <button type="button" id="ata-cookie-reopen" class="ata-cookie-reopen" data-open-cookies data-i18n="cookieSettings"></button>
    <dialog id="ata-cookie-dialog" class="ata-dialog" aria-labelledby="ata-preferences-title">
      <div class="ata-dialog-header"><div><span class="ata-eyebrow">RESTAURANT ATA</span><h2 id="ata-preferences-title" data-i18n="cookieSettings"></h2></div>
      <button type="button" class="ata-dialog-close" data-dialog-close data-i18n-aria-label="close">×</button></div>
      <p class="ata-dialog-intro" data-i18n="cookieIntro"></p>
      <div class="ata-consent-row"><div><h3 data-i18n="necessaryTitle"></h3><p data-i18n="necessaryText"></p></div><span class="ata-always-on" data-i18n="alwaysOn"></span></div>
      <label class="ata-consent-row" for="ata-preferences"><span><strong data-i18n="preferenceTitle"></strong><span class="ata-option-description" data-i18n="preferenceText"></span></span><input id="ata-preferences" type="checkbox" role="switch"></label>
      <label class="ata-consent-row" for="ata-external-media"><span><strong data-i18n="mediaTitle"></strong><span class="ata-option-description" data-i18n="mediaText"></span></span><input id="ata-external-media" type="checkbox" role="switch"></label>
      <p class="ata-small" data-i18n="noAnalytics"></p>
      <div class="ata-dialog-actions"><button type="button" class="ata-button ata-button-outline" data-consent-required data-i18n="onlyRequired"></button><button type="button" class="ata-button ata-button-accent" id="ata-save-consent" data-i18n="saveChoices"></button></div>
      <button type="button" class="ata-text-button ata-privacy-link" data-open-privacy data-i18n="privacyTitle"></button>
    </dialog>
    <dialog id="ata-privacy-dialog" class="ata-dialog" aria-labelledby="ata-privacy-title">
      <div class="ata-dialog-header"><h2 id="ata-privacy-title" data-i18n="privacyTitle"></h2><button type="button" class="ata-dialog-close" data-dialog-close data-i18n-aria-label="close">×</button></div>
      <p data-i18n="privacyIntro"></p><p data-i18n="privacyCookies"></p><p data-i18n="privacyStorage"></p><p data-i18n="privacyBooking"></p><p data-i18n="privacyMedia"></p><p data-i18n="privacyLibraries"></p><p data-i18n="privacyControl"></p>
      <button type="button" class="ata-button ata-button-accent" data-open-cookies data-i18n="cookieSettings"></button>
    </dialog>
    <dialog id="ata-terms-dialog" class="ata-dialog" aria-labelledby="ata-terms-title">
      <div class="ata-dialog-header"><h2 id="ata-terms-title" data-i18n="termsTitle"></h2><button type="button" class="ata-dialog-close" data-dialog-close data-i18n-aria-label="close">×</button></div><p data-i18n="termsText"></p>
    </dialog>
    <div id="ata-notice" class="ata-notice" role="status" aria-live="polite" hidden></div>`;
  document.body.append(ui);

  function openDialog(id) {
    document.querySelectorAll('.ata-dialog[open]').forEach(dialog => dialog.close());
    if (id === 'ata-cookie-dialog') syncConsentInputs();
    document.getElementById(id).showModal();
  }
  function closeDialogs() { document.querySelectorAll('.ata-dialog[open]').forEach(dialog => dialog.close()); }
  function scrollToTop() {
    // These footer controls only navigate: no subscription, request or notice.
    document.querySelector('.navbar-brand')?.focus({ preventScroll: true });
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }
  document.addEventListener('submit', event => {
    if (!(event.target instanceof HTMLFormElement) || !event.target.hasAttribute('data-scroll-top-form')) return;
    event.preventDefault();
    scrollToTop();
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button, a');
    if (!button) return;
    if (button.hasAttribute('data-set-language')) setLanguage(button.dataset.setLanguage);
    if (button.hasAttribute('data-open-cookies')) { event.preventDefault(); openDialog('ata-cookie-dialog'); }
    if (button.hasAttribute('data-open-privacy')) { event.preventDefault(); openDialog('ata-privacy-dialog'); }
    if (button.hasAttribute('data-open-terms')) { event.preventDefault(); openDialog('ata-terms-dialog'); }
    if (button.hasAttribute('data-dialog-close')) button.closest('dialog').close();
    if (button.hasAttribute('data-consent-required')) { saveConsent(false, false); closeDialogs(); }
    if (button.hasAttribute('data-consent-all')) { saveConsent(true, true); closeDialogs(); }
    if (button.id === 'ata-save-consent') {
      saveConsent(document.getElementById('ata-preferences').checked, document.getElementById('ata-external-media').checked);
      closeDialogs();
    }
    if (button.hasAttribute('data-allow-video')) saveConsent(Boolean(consent?.preferences), true);
    const socialPlaceholder = button.matches('a[href="#"]') && button.querySelector('.fab, .fa-brands');
    if (button.hasAttribute('data-scroll-top') || socialPlaceholder) {
      event.preventDefault();
      scrollToTop();
    }
  });
  document.querySelectorAll('.ata-dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      const box = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) dialog.close();
    });
  });

  const modal = document.getElementById('videoModal');
  const videoHost = document.getElementById('ata-video-host');
  function syncVideo() {
    if (!videoHost) return;
    const shouldLoad = Boolean(consent?.externalMedia) && modal.classList.contains('show');
    if (shouldLoad) {
      if (!videoHost.querySelector('iframe')) {
        videoHost.replaceChildren();
        const iframe = document.createElement('iframe');
        iframe.id = 'video';
        iframe.title = t('videoTitle');
        iframe.src = `https://www.youtube-nocookie.com/embed/${videoHost.dataset.videoId}?rel=0`;
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = 'strict-origin-when-cross-origin';
        videoHost.append(iframe);
      }
    } else {
      videoHost.innerHTML = `<div class="ata-video-placeholder"><div><h3 data-i18n="videoTitle"></h3><p data-i18n="videoBlocked"></p><button type="button" class="ata-button ata-button-accent" data-allow-video data-i18n="allowVideo"></button><button type="button" class="ata-text-button" data-open-cookies data-i18n="cookieSettings"></button></div></div>`;
      translate(videoHost);
    }
  }
  if (modal) {
    modal.addEventListener('shown.bs.modal', syncVideo);
    modal.addEventListener('hidden.bs.modal', syncVideo);
    // Removing the frame stops playback and unloads it even when consent remains.
    modal.addEventListener('hide.bs.modal', () => { if (videoHost) videoHost.replaceChildren(); });
  }
  function readCart() {
    try {
      const raw = JSON.parse(localStorage.getItem('restaurant_cart') || '[]');
      if (!Array.isArray(raw)) return [];
      fallbackCart = raw.filter(item => item && typeof item.name === 'string' && Number.isFinite(Number(item.price)) && Number(item.price) >= 0 && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0)
        .map(item => ({ name: item.name, price: Number(item.price), quantity: Number(item.quantity) }));
    } catch {}
    return fallbackCart.map(item => ({ ...item }));
  }
  function writeCart(cart) {
    fallbackCart = cart.map(item => ({ ...item }));
    try {
      if (cart.length) localStorage.setItem('restaurant_cart', JSON.stringify(cart));
      else localStorage.removeItem('restaurant_cart');
    } catch { notice(t('storageBlocked')); }
    document.dispatchEvent(new Event('ata:cartchange'));
  }
  function apiURL(path) {
    const base = window.ATA_CONFIG?.apiBaseUrl ?? 'https://restaurant-backend-kjtm.onrender.com';
    return base.replace(/\/$/, '') + path;
  }
  function element(tag, className = '', text = '') {
    const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
  }
  async function fetchAPI(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    try { return await fetch(apiURL(path), { ...options, signal: controller.signal }); }
    finally { clearTimeout(timeout); }
  }
  window.ATA = {
    t, sourceText, translate, setLanguage, notice, readCart, writeCart, apiURL, fetchAPI, element,
    get language() { return language; },
    get consent() { return consent ? { ...consent } : null; },
    money: amount => '$' + Number(amount).toFixed(2),
    cookiePath: rootPath
  };
  setLanguage(language, false);
  syncConsentInputs();
  syncVideo();
  document.getElementById('ata-cookie-banner').hidden = consent !== null;
})();
