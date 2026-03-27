/**
 * =============================================
 *  DASHBOARD.JS - User Dashboard
 * =============================================
 */

let allBookings      = [];
let bookingToCancel  = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAuth()) return;

  const user = getCurrentUser();
  if (!user) return;

  // Fill sidebar & welcome
  document.getElementById('sidebarName').textContent    = user.name;
  document.getElementById('sidebarRole').textContent    = user.role === 'admin' ? '👑 Admin' : '🏨 Guest';
  document.getElementById('welcomeName').textContent    = user.name.split(' ')[0];
  document.getElementById('profileName').value          = user.name;
  document.getElementById('profileEmail').value         = user.email;
  document.getElementById('profilePhone').value         = user.phone || '';

  const avatarUrl = user.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c9a96e&color=000&size=128`;
  document.getElementById('sidebarAvatar').src = avatarUrl;

  // Load bookings
  await loadAllBookings();

  // Check URL tab param
  const tab = new URLSearchParams(window.location.search).get('tab');
  if (tab) switchTab(tab);
});

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));

  const tab = document.getElementById(`tab-${tabName}`);
  if (tab) tab.style.display = 'block';

  const link = document.querySelector(`[data-tab="${tabName}"]`);
  if (link) link.classList.add('active');
}

// ── Load all bookings ─────────────────────────────────────────────────────────
async function loadAllBookings() {
  try {
    const data  = await BookingsAPI.getMyAll();
    allBookings = data.bookings || [];

    updateStats(allBookings);
    renderRecentBookings(allBookings.slice(0, 3));
    renderAllBookings(allBookings);
  } catch (err) {
    showToast('Could not load bookings.', 'error');
  }
}

function updateStats(bookings) {
  const confirmed = bookings.filter(b => b.bookingStatus === 'confirmed').length;
  const upcoming  = bookings.filter(b => ['pending','confirmed'].includes(b.bookingStatus) && new Date(b.checkIn) > new Date()).length;
  const spent     = bookings.filter(b => b.payment?.status === 'paid').reduce((s, b) => s + (b.priceBreakdown?.totalAmount || 0), 0);

  document.getElementById('totalBookings').textContent     = bookings.length;
  document.getElementById('confirmedBookings').textContent = confirmed;
  document.getElementById('upcomingBookings').textContent  = upcoming;
  document.getElementById('totalSpent').textContent        = formatCurrency(spent);
}

function renderRecentBookings(bookings) {
  const list = document.getElementById('recentBookingsList');
  if (!bookings.length) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">
      <p>No bookings yet. <a href="/rooms.html">Browse rooms →</a></p>
    </div>`;
    return;
  }
  list.innerHTML = bookings.map(b => buildBookingCard(b)).join('');
}

function renderAllBookings(bookings, filterStatus = 'all') {
  const list = document.getElementById('allBookingsList');
  const filtered = filterStatus === 'all' ? bookings : bookings.filter(b => b.bookingStatus === filterStatus);

  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted);">
      <p>No bookings found for this filter.</p>
    </div>`;
    return;
  }
  list.innerHTML = filtered.map(b => buildBookingCard(b, true)).join('');
}

function buildBookingCard(b, showCancel = false) {
  const img      = b.room?.images?.[0]?.url || 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=200';
  const statusCls = `status-${b.bookingStatus}`;
  const canCancel = showCancel && ['pending','confirmed'].includes(b.bookingStatus);

  return `
    <div class="booking-item">
      <img class="booking-item-img" src="${img}" alt="${b.room?.name}" />
      <div class="booking-item-info">
        <h4>${b.room?.name || 'Room'} — #${b.confirmationNumber}</h4>
        <p>📅 ${formatDate(b.checkIn)} → ${formatDate(b.checkOut)} &nbsp;|&nbsp; 🌙 ${b.numOfNights} nights</p>
        <p>💰 ${formatCurrency(b.priceBreakdown?.totalAmount || 0)} &nbsp;|&nbsp; Payment: ${b.payment?.status || 'pending'}</p>
      </div>
      <div class="booking-item-action">
        <span class="booking-status ${statusCls}">${b.bookingStatus}</span>
        ${canCancel ? `<button class="btn btn-danger" style="font-size:.8rem;padding:.4rem .9rem;" onclick="openCancelModal('${b._id}', ${b.priceBreakdown?.totalAmount})">Cancel</button>` : ''}
      </div>
    </div>
  `;
}

function filterBookings(status, btn) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderAllBookings(allBookings, status);
}

// ── Update Profile ────────────────────────────────────────────────────────────
async function updateProfile(e) {
  e.preventDefault();
  const name  = document.getElementById('profileName').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();

  try {
    const data = await AuthAPI.updateProfile({ name, phone });
    localStorage.setItem('user', JSON.stringify(data.user));
    showToast('Profile updated successfully!', 'success');
    document.getElementById('sidebarName').textContent = data.user.name;
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Change Password ───────────────────────────────────────────────────────────
async function changePassword(e) {
  e.preventDefault();
  const currentPassword  = document.getElementById('currentPassword').value;
  const newPassword      = document.getElementById('newPassword').value;
  const confirmNew       = document.getElementById('confirmNewPassword').value;

  if (newPassword !== confirmNew) {
    showToast('New passwords do not match!', 'error');
    return;
  }

  try {
    await AuthAPI.changePassword({ currentPassword, newPassword });
    showToast('Password changed successfully!', 'success');
    e.target.reset();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Cancel Booking ─────────────────────────────────────────────────────────────
function openCancelModal(bookingId, totalAmount) {
  bookingToCancel = bookingId;
  const hoursUntil = 48; // simplified; in real app calc from check-in
  const refund     = totalAmount; // simplified
  document.getElementById('cancelRefundInfo').textContent =
    `If cancelled now, you may receive a refund of up to ${formatCurrency(refund)} (subject to policy).`;
  document.getElementById('cancelModal').style.display = 'flex';
}

async function confirmCancel() {
  if (!bookingToCancel) return;
  const reason = document.getElementById('cancelReason').value;
  const btn    = document.getElementById('confirmCancelBtn');
  btn.disabled = true; btn.textContent = 'Cancelling...';

  try {
    await BookingsAPI.cancel(bookingToCancel, { reason });
    closeModal('cancelModal');
    showToast('Booking cancelled. Refund will be processed in 5-7 days.', 'success');
    await loadAllBookings();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Yes, Cancel';
    bookingToCancel = null;
  }
}

function viewAllLink() { switchTab('bookings'); }
