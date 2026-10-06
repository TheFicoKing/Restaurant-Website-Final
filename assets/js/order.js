/* Frontend-only delivery demonstration. No order/payment is sent to a server. */
(() => {
  'use strict';
  const A = window.ATA;
  const form = document.getElementById('order-form');
  const submit = form.querySelector('button[type="submit"]');
  let inProgress = false;
  let statusKey = 's172';
  let timer = null;
  const steps = ['preparing', 'onTheWay', 'nearby', 'delivered'];
  function displayCart() {
    const cart = A.readCart();
    const body = document.getElementById('cart-items-body');
    body.replaceChildren();
    let total = 0;
    if (!cart.length) {
      const row = A.element('tr');
      const cell = A.element('td', 'text-center text-muted py-4', A.t('cartEmpty'));
      cell.colSpan = 5; row.append(cell); body.append(row);
    }
    for (const item of cart) {
      total += item.price * item.quantity;
      const row = A.element('tr');
      row.append(A.element('td', 'fw-bold', A.sourceText(item.name)), A.element('td', '', A.money(item.price)), A.element('td', 'text-center', item.quantity), A.element('td', 'text-primary fw-bold', A.money(item.price * item.quantity)));
      const cell = A.element('td');
      const remove = A.element('button', 'btn btn-sm btn-danger rounded-circle', '×');
      remove.type = 'button'; remove.disabled = inProgress;
      remove.setAttribute('aria-label', A.t('removeDish', { name: A.sourceText(item.name) }));
      remove.addEventListener('click', () => {
        const current = A.readCart();
        const target = current.find(entry => entry.name === item.name);
        if (target) target.quantity--;
        A.writeCart(current.filter(entry => entry.quantity > 0));
      });
      cell.append(remove); row.append(cell); body.append(row);
    }
    document.getElementById('cart-total-price').textContent = A.money(total);
    document.getElementById('tracking-status').textContent = A.t(statusKey);
    submit.textContent = A.t(inProgress ? 'orderProgress' : 's170');
    submit.disabled = inProgress;
  }
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (inProgress || !form.reportValidity()) return;
    const ordered = A.readCart();
    if (!ordered.length) { A.notice(A.t('orderEmpty')); return; }
    inProgress = true; statusKey = 's172';
    document.getElementById('tracking-box').classList.remove('d-none');
    document.getElementById('status-icon').className = 'fa fa-spinner fa-spin me-2';
    document.getElementById('tracking-title').className = 'text-warning fw-bold';
    displayCart();
    let step = 0;
    timer = setInterval(() => {
      statusKey = steps[step++];
      if (statusKey === 'delivered') {
        clearInterval(timer); inProgress = false;
        document.getElementById('status-icon').className = 'fa fa-check-circle me-2';
        document.getElementById('tracking-title').className = 'text-success fw-bold';
        // Only remove the quantities in this demo order. Items added in another
        // tab while the simulation runs are not silently lost.
        const current = A.readCart().map(item => ({ ...item, quantity: item.quantity - (ordered.find(entry => entry.name === item.name)?.quantity || 0) }));
        A.writeCart(current.filter(item => item.quantity > 0));
      }
      displayCart();
    }, 5000);
  });
  document.addEventListener('ata:languagechange', displayCart);
  document.addEventListener('ata:cartchange', displayCart);
  window.addEventListener('storage', displayCart);
  displayCart();
})();
