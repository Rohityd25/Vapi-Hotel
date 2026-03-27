/**
 * =============================================
 *  ADMIN.JS - Admin Panel Logic
 * =============================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;
  if (!requireAdmin()) return;

  loadDashboard();
});

// ── Tab Navigation ─────────────────────────────────────────────────────────────
function adminTab(tabName) {
  document.querySelectorAll('.admin-tab').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));

  const tab  = document.getElementById(`atab-${tabName}`);
  const link = document.querySelector(`[data-tab="${tabName}"]`);
  if (tab)  tab.style.display  = 'block';
  if (link) link.classList.add('active');

  // Lazy-load tab data
  if (tabName === 'dashboard') loadDashboard();
  if (tabName === 'rooms')     loadAdminRooms();
  if (tabName === 'bookings')  loadAdminBookings();
  if (tabName === 'users')     loadAdminUsers();
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function loadDashboard() {
  try {
    const data = await AdminAPI.getDashboard();
    const s    = data.stats;

    document.getElementById('aTotalUsers').textContent    = s.totalUsers;
    document.getElementById('aTotalRooms').textContent    = s.totalRooms;
    document.getElementById('aTotalBookings').textContent = s.totalBookings;
    document.getElementById('aTotalRevenue').textContent  = formatCurrency(s.totalRevenue);

    renderRecentBookingsTable(data.recentBookings || []);
    renderRoomTypeStats(data.roomTypeStats || []);
  } catch (err) {
    showToast('Failed to load dashboard.', 'error');
  }
}

function renderRecentBookingsTable(bookings) {
  const el = document.getElementById('adminRecentBookings');
  if (!bookings.length) { el.innerHTML = '<p style="color:var(--text-muted)">No bookings yet.</p>'; return; }

  el.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Booking #</th><th>Guest</th><th>Room</th><th>Dates</th><th>Amount</th><th>Status</th>
      </tr></thead>
      <tbody>
        ${bookings.map(b => `
          <tr>
            <td><strong>${b.confirmationNumber}</strong></td>
            <td>${b.user?.name || '—'}</td>
            <td>${b.room?.name || '—'}</td>
            <td>${formatDate(b.checkIn)} → ${formatDate(b.checkOut)}</td>
            <td>${formatCurrency(b.priceBreakdown?.totalAmount || 0)}</td>
            <td><span class="booking-status status-${b.bookingStatus}">${b.bookingStatus}</span></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderRoomTypeStats(stats) {
  const el  = document.getElementById('roomTypeStats');
  const max = Math.max(...stats.map(s => s.count), 1);
  el.innerHTML = stats.map(s => `
    <div class="rt-stat">
      <span class="rt-label">${s._id}</span>
      <div class="rt-bar-wrap">
        <div class="rt-bar" style="width:${(s.count/max)*100}%"></div>
      </div>
      <span class="rt-count">${s.count}</span>
    </div>
  `).join('') || '<p style="color:var(--text-muted)">No data.</p>';
}

// ── ROOMS ─────────────────────────────────────────────────────────────────────
async function loadAdminRooms() {
  const grid = document.getElementById('adminRoomsList');
  grid.innerHTML = '<div class="loading-shimmer"></div>'.repeat(3);

  try {
    const data = await RoomsAPI.getAll({ limit: 50, sort: '-createdAt' });
    if (!data.rooms?.length) {
      grid.innerHTML = '<p style="color:var(--text-muted);grid-column:1/-1">No rooms added yet.</p>'; return;
    }
    grid.innerHTML = data.rooms.map(r => buildAdminRoomCard(r)).join('');
  } catch { grid.innerHTML = '<p style="color:var(--error)">Failed to load rooms.</p>'; }
}

function buildAdminRoomCard(room) {
  const img = room.images?.[0]?.url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400';
  return `
    <div class="admin-room-card">
      <div class="admin-room-img">
        <img src="${img}" alt="${room.name}" loading="lazy"/>
        <div style="position:absolute;top:.5rem;left:.5rem;">
          <span class="booking-status status-${room.isAvailable ? 'confirmed' : 'cancelled'}">${room.isAvailable ? 'Active' : 'Hidden'}</span>
        </div>
      </div>
      <div class="admin-room-body">
        <div class="admin-room-name">${room.name}</div>
        <div class="admin-room-meta">Room ${room.roomNumber} &bull; ${room.roomType} &bull; ₹${Number(room.pricePerNight).toLocaleString('en-IN')}/night &bull; 👥 ${room.capacity}</div>
        <div class="admin-room-actions">
          <button class="btn btn-outline" style="font-size:.8rem;padding:.4rem .9rem;" onclick="editRoom('${room._id}')">✏️ Edit</button>
          <button class="btn btn-danger"  style="font-size:.8rem;padding:.4rem .9rem;" onclick="deleteRoom('${room._id}', '${room.name}')">🗑️ Delete</button>
          <a href="/room-detail.html?id=${room._id}" class="btn btn-outline" style="font-size:.8rem;padding:.4rem .9rem;" target="_blank">👁️ View</a>
        </div>
      </div>
    </div>
  `;
}

// ── BOOKINGS ──────────────────────────────────────────────────────────────────
async function loadAdminBookings() {
  const el     = document.getElementById('adminBookingsTable');
  const status = document.getElementById('adminBookingFilter')?.value;
  el.innerHTML = '<div class="loading-shimmer"></div>'.repeat(3);

  try {
    const params = status ? { status } : {};
    const data   = await AdminAPI.getAllBookings(params);

    if (!data.bookings?.length) {
      el.innerHTML = '<p style="color:var(--text-muted)">No bookings found.</p>'; return;
    }
    el.innerHTML = `
      <table class="admin-table">
        <thead><tr>
          <th>Conf #</th><th>Guest</th><th>Room</th><th>Dates</th><th>Nights</th><th>Amount</th><th>Payment</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>
          ${data.bookings.map(b => `
            <tr>
              <td><strong>${b.confirmationNumber}</strong></td>
              <td>
                <strong>${b.user?.name || '—'}</strong><br/>
                <span style="font-size:.75rem;color:var(--text-muted)">${b.user?.email || ''}</span>
              </td>
              <td>${b.room?.name || '—'}<br/><span style="font-size:.75rem;color:var(--text-muted)">${b.room?.roomNumber || ''}</span></td>
              <td>${formatDate(b.checkIn)}<br/>${formatDate(b.checkOut)}</td>
              <td>${b.numOfNights}</td>
              <td>${formatCurrency(b.priceBreakdown?.totalAmount || 0)}</td>
              <td><span class="booking-status status-${b.payment?.status === 'paid' ? 'confirmed' : 'pending'}">${b.payment?.status || 'pending'}</span></td>
              <td><span class="booking-status status-${b.bookingStatus}">${b.bookingStatus}</span></td>
              <td>
                <select class="form-control" style="font-size:.78rem;padding:.3rem;" onchange="updateStatus('${b._id}', this.value, this)">
                  <option value="">Change...</option>
                  <option value="confirmed">Confirm</option>
                  <option value="checked-in">Check In</option>
                  <option value="checked-out">Check Out</option>
                  <option value="cancelled">Cancel</option>
                </select>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch { el.innerHTML = '<p style="color:var(--error)">Failed to load bookings.</p>'; }
}

async function updateStatus(bookingId, status, selectEl) {
  if (!status) return;
  try {
    await AdminAPI.updateBookingStatus(bookingId, status);
    showToast(`Booking status updated to "${status}"`, 'success');
    loadAdminBookings();
  } catch (err) {
    showToast(err.message, 'error');
    selectEl.value = '';
  }
}

// ── USERS ─────────────────────────────────────────────────────────────────────
async function loadAdminUsers() {
  const el = document.getElementById('adminUsersTable');
  el.innerHTML = '<div class="loading-shimmer"></div>'.repeat(3);

  try {
    const data = await AdminAPI.getAllUsers();
    if (!data.users?.length) { el.innerHTML = '<p style="color:var(--text-muted)">No users found.</p>'; return; }

    el.innerHTML = `
      <table class="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Registered</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          ${data.users.map(u => `
            <tr>
              <td><strong>${u.name}</strong></td>
              <td>${u.email}</td>
              <td>${u.phone || '—'}</td>
              <td><span style="color:${u.role === 'admin' ? 'var(--gold)' : 'var(--text-secondary)'}">${u.role === 'admin' ? '👑 Admin' : '👤 User'}</span></td>
              <td>${formatDate(u.createdAt)}</td>
              <td><span class="${u.isActive ? 'status-active' : 'status-inactive'}">${u.isActive ? '✅ Active' : '❌ Inactive'}</span></td>
              <td class="table-actions">
                <button class="btn-icon" title="${u.isActive ? 'Deactivate' : 'Activate'}" onclick="toggleUser('${u._id}')">
                  ${u.isActive ? '🚫' : '✅'}
                </button>
                ${u.role !== 'admin' ? `<button class="btn-icon danger" title="Delete user" onclick="deleteUserAdmin('${u._id}','${u.name}')">🗑️</button>` : ''}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch { el.innerHTML = '<p style="color:var(--error)">Failed to load users.</p>'; }
}

async function toggleUser(userId) {
  try {
    const data = await AdminAPI.toggleUserStatus(userId);
    showToast(data.message, 'success');
    loadAdminUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

async function deleteUserAdmin(userId, name) {
  if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
  try {
    await AdminAPI.deleteUser(userId);
    showToast('User deleted.', 'success');
    loadAdminUsers();
  } catch (err) { showToast(err.message, 'error'); }
}

// ── ROOM MODAL ────────────────────────────────────────────────────────────────
function openRoomModal(room = null) {
  document.getElementById('roomModalTitle').textContent = room ? 'Edit Room' : 'Add New Room';
  document.getElementById('editRoomId').value = room?._id || '';

  document.getElementById('rName').value        = room?.name || '';
  document.getElementById('rNumber').value      = room?.roomNumber || '';
  document.getElementById('rType').value        = room?.roomType || '';
  document.getElementById('rPrice').value       = room?.pricePerNight || '';
  document.getElementById('rCapacity').value    = room?.capacity || '';
  document.getElementById('rFloor').value       = room?.floor || '';
  document.getElementById('rDescription').value = room?.description || '';
  document.getElementById('rImageUrl').value    = room?.images?.[0]?.url || '';

  const a = room?.amenities || {};
  document.getElementById('aWifi').checked     = a.wifi     ?? true;
  document.getElementById('aAc').checked       = a.ac       ?? true;
  document.getElementById('aTv').checked       = a.tv       ?? true;
  document.getElementById('aMinibar').checked  = a.minibar  ?? false;
  document.getElementById('aBalcony').checked  = a.balcony  ?? false;
  document.getElementById('aJacuzzi').checked  = a.jacuzzi  ?? false;
  document.getElementById('aBreakfast').checked= a.breakfast?? false;
  document.getElementById('aParking').checked  = a.parking  ?? false;
  document.getElementById('aGym').checked      = a.gym      ?? false;
  document.getElementById('aPool').checked     = a.swimmingPool ?? false;

  document.getElementById('roomModal').style.display = 'flex';
}

async function editRoom(roomId) {
  try {
    const data = await RoomsAPI.getById(roomId);
    openRoomModal(data.room);
  } catch (err) { showToast('Could not load room data.', 'error'); }
}

async function saveRoom(e) {
  e.preventDefault();
  const id  = document.getElementById('editRoomId').value;
  const btn = document.getElementById('saveRoomBtn');
  btn.disabled = true; btn.textContent = 'Saving...';

  const imgUrl = document.getElementById('rImageUrl').value;
  const roomData = {
    name:          document.getElementById('rName').value,
    roomNumber:    document.getElementById('rNumber').value,
    roomType:      document.getElementById('rType').value,
    pricePerNight: Number(document.getElementById('rPrice').value),
    capacity:      Number(document.getElementById('rCapacity').value),
    floor:         Number(document.getElementById('rFloor').value) || 1,
    description:   document.getElementById('rDescription').value,
    images:        imgUrl ? [{ public_id: 'user_set', url: imgUrl }] : [],
    amenities: {
      wifi:         document.getElementById('aWifi').checked,
      ac:           document.getElementById('aAc').checked,
      tv:           document.getElementById('aTv').checked,
      minibar:      document.getElementById('aMinibar').checked,
      balcony:      document.getElementById('aBalcony').checked,
      jacuzzi:      document.getElementById('aJacuzzi').checked,
      breakfast:    document.getElementById('aBreakfast').checked,
      parking:      document.getElementById('aParking').checked,
      gym:          document.getElementById('aGym').checked,
      swimmingPool: document.getElementById('aPool').checked,
    },
  };

  try {
    if (id) {
      await RoomsAPI.update(id, roomData);
      showToast('Room updated successfully!', 'success');
    } else {
      await RoomsAPI.create(roomData);
      showToast('Room created successfully!', 'success');
    }
    closeModal('roomModal');
    loadAdminRooms();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Save Room';
  }
}

async function deleteRoom(roomId, roomName) {
  if (!confirm(`Delete room "${roomName}"? This cannot be undone.`)) return;
  try {
    await RoomsAPI.delete(roomId);
    showToast('Room deleted.', 'success');
    loadAdminRooms();
  } catch (err) { showToast(err.message, 'error'); }
}
