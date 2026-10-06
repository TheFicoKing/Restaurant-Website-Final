/* Administrative demo UI. Authentication must be enforced by the backend
   before real customer information is used; hiding this page is not security. */
(() => {
  'use strict';
  const A = window.ATA;
  let state = null;
  let stateKey = 's017';
  let loading = false;
  function render() {
    const body = document.getElementById('reservations-table-body');
    body.replaceChildren();
    const rows = state?.allReservations;
    const key = stateKey || (!rows?.length ? 'noReservations' : '');
    if (state) {
      document.getElementById('stat-total').textContent = state.totalReservations ?? 0;
      document.getElementById('stat-seats').textContent = `${state.bookedSeats ?? 0} / ${state.maxCapacity ?? 50}`;
      // Preserve zero. `0 || 50` incorrectly reports a full restaurant as empty.
      document.getElementById('stat-available').textContent = state.availableSeats ?? 0;
    }
    if (key) {
      const row = A.element('tr');
      const cell = A.element('td', 'text-center py-4 ' + (key === 'adminError' ? 'text-danger' : 'text-muted'), A.t(key));
      cell.colSpan = 7; row.append(cell); body.append(row);
    } else for (const reservation of rows) {
      const row = A.element('tr');
      // Use textContent for visitor-supplied values, never innerHTML.
      row.append(A.element('td', '', '#' + reservation.id), A.element('td', 'fw-bold text-dark', reservation.name ?? ''), A.element('td', '', reservation.email ?? ''));
      const date = A.element('td');
      date.append(A.element('span', 'badge bg-secondary py-2 px-3', reservation.datetime ?? reservation.date ?? ''));
      row.append(date, A.element('td', 'text-center fw-bold', reservation.select_person ?? reservation.people ?? ''));
      let special = reservation.special_request || reservation.request;
      if (!special || special === 'Нема' || special === 'None') special = A.t('none');
      const request = A.element('td', 'text-muted', special);
      request.style.maxWidth = '200px'; request.style.overflowWrap = 'anywhere'; row.append(request);
      const action = A.element('td', 'text-center');
      const button = A.element('button', 'btn btn-danger btn-sm px-3 rounded-pill', A.t('delete'));
      button.type = 'button';
      button.addEventListener('click', () => deleteReservation(reservation.id, button));
      action.append(button); row.append(action); body.append(row);
    }
    document.getElementById('ata-admin-refresh').disabled = loading;
  }
  async function loadDashboardData() {
    if (loading) return;
    loading = true; stateKey = 's017'; render();
    try {
      const response = await A.fetchAPI('/api/status');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      const data = await response.json();
      if (!Array.isArray(data.allReservations)) throw new Error('Invalid reservation response');
      state = data; stateKey = '';
    } catch (error) {
      state = null; stateKey = 'adminError';
      console.warn('Dashboard request failed:', error.name);
    } finally { loading = false; render(); }
  }
  async function deleteReservation(id, button) {
    if (!confirm(A.t('deleteConfirm', { id }))) return;
    button.disabled = true;
    try {
      const response = await A.fetchAPI('/api/reservations/' + encodeURIComponent(String(id)), { method: 'DELETE' });
      const text = await response.text();
      let result = {};
      try { result = text ? JSON.parse(text) : {}; } catch { throw new Error('Invalid response'); }
      if (!response.ok || result.success === false) throw new Error('Delete failed');
      A.notice(A.t('deleteSuccess', { id }));
      await loadDashboardData();
    } catch {
      A.notice(A.t('deleteError')); button.disabled = false;
    }
  }
  document.getElementById('ata-admin-refresh').addEventListener('click', loadDashboardData);
  document.addEventListener('ata:languagechange', render);
  loadDashboardData();
})();
