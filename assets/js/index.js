/* Existing menu and reservation behaviour, with language-safe selectors. */
(() => {
  'use strict';
  const A = window.ATA;
  const form = document.getElementById('bookingForm');
  const submit = form.querySelector('button[type="submit"]');
  const feedback = document.getElementById('ata-booking-feedback');
  let sending = false;
  let resultKey = '';
  let resultValues = {};
  function showResult(key, values = {}, error = false) {
    resultKey = key; resultValues = values;
    feedback.textContent = A.t(key, values);
    feedback.dataset.error = String(error);
    feedback.hidden = false;
  }
  function render() {
    const cart = A.readCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    document.getElementById('cart-badge-count').textContent = count;
    document.getElementById('floating-cart').setAttribute('aria-label', A.t('cartLabel', { count }));
    document.getElementById('sidebar-cart-total').textContent = A.money(total);
    const container = document.getElementById('sidebar-cart-items');
    container.replaceChildren();
    if (!cart.length) container.append(A.element('p', 'text-center text-muted my-5', A.t('cartEmptyShort')));
    for (const item of cart) {
      const row = A.element('div', 'd-flex justify-content-between align-items-center bg-white p-3 mb-2 rounded shadow-sm');
      const description = A.element('div');
      description.append(A.element('h6', 'mb-0 fw-bold', A.sourceText(item.name)), A.element('small', 'text-muted', `${item.quantity} × ${A.money(item.price)}`));
      row.append(description, A.element('span', 'fw-bold text-primary ms-3', A.money(item.price * item.quantity)));
      container.append(row);
    }
    document.querySelectorAll('.menu-item-card').forEach(card => {
      card.setAttribute('aria-label', A.t('addDish', { name: A.sourceText(card.dataset.name) }));
    });
    submit.disabled = sending;
    submit.textContent = A.t(sending ? 'bookingSending' : 's143');
    if (resultKey) feedback.textContent = A.t(resultKey, resultValues);
  }
  function add(card) {
    const cart = A.readCart();
    const name = card.dataset.name;
    const price = Number(card.dataset.price);
    if (!name || !Number.isFinite(price)) return;
    const existing = cart.find(item => item.name === name);
    if (existing) existing.quantity++;
    else cart.push({ name, price, quantity: 1 });
    A.writeCart(cart);
    const floating = document.querySelector('#floating-cart > div');
    floating.style.transform = 'scale(1.2)';
    setTimeout(() => { floating.style.transform = 'scale(1)'; }, 180);
  }
  document.querySelectorAll('.menu-item-card').forEach(card => {
    card.setAttribute('tabindex', '0'); card.setAttribute('role', 'button');
    card.addEventListener('click', () => add(card));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); add(card); }
    });
  });
  const floating = document.getElementById('floating-cart');
  floating.setAttribute('role', 'button'); floating.setAttribute('tabindex', '0');
  floating.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); floating.click(); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending || !form.reportValidity()) return;
    // IDs and name attributes must not change when a label is translated.
    const data = {
      name: form.elements.namedItem('name').value.trim(),
      email: form.elements.namedItem('email').value.trim(),
      datetime: form.elements.namedItem('datetime').value,
      select_person: form.elements.namedItem('select_person').value,
      special_request: form.elements.namedItem('special_request').value.trim()
    };
    if (!data.name || !data.email || !data.datetime || !Number.isInteger(Number(data.select_person)) || Number(data.select_person) < 1) {
      showResult('bookingInvalid', {}, true); return;
    }
    sending = true; resultKey = ''; feedback.hidden = true; render();
    try {
      const response = await A.fetchAPI('/book-table', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
      });
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch {}
      // Handle both the existing Render JSON responses and the uploaded legacy
      // Express HTML responses. Never evaluate HTML or scripts from a response.
      const capacityError = /Нема доволно слободни места|not enough (?:available )?seats|capacity (?:exceeded|full)/i.test(text);
      if (capacityError) { showResult('capacityFailure', {}, true); return; }
      if (!response.ok || json?.success === false || json?.error) {
        showResult('bookingFailure', {}, true); return;
      }
      if (!json && !/Успешна резервација|reservation (?:successful|saved)|booking (?:successful|saved)/i.test(text)) {
        showResult('bookingFailure', {}, true); return;
      }
      showResult('bookingSuccess', { name: data.name });
      form.reset();
    } catch (error) {
      console.warn('Reservation request failed:', error.name);
      showResult('connectionError', {}, true);
    } finally { sending = false; render(); }
  });
  document.addEventListener('ata:languagechange', render);
  document.addEventListener('ata:cartchange', render);
  window.addEventListener('storage', render);
  // The old back-to-top markup is commented out. A missing button is harmless.
  window.addEventListener('scroll', () => {
    const button = document.querySelector('.back-to-top');
    if (button) button.style.display = window.scrollY > 300 ? 'flex' : 'none';
  }, { passive: true });
  render();
})();
