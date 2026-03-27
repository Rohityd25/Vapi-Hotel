/**
 * =============================================
 *  API UTILITY - api.js
 * =============================================
 * Central place for all backend API calls.
 * Every fetch goes through here for consistency.
 */

const API_BASE = '/api';

/**
 * Core request function - wraps fetch with auth, error handling
 */
async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (options.body instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  try {
    const res = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await res.json();

    if (!res.ok) {
      // Token expired → logout
      if (res.status === 401 && data.message?.includes('expired')) {
        localStorage.clear();
        window.location.href = '/login.html';
        return;
      }
      throw new Error(data.message || `Error ${res.status}`);
    }

    return data;
  } catch (err) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error('Cannot connect to server. Is it running?');
    }
    throw err;
  }
}

// ── AUTH ────────────────────────────────────────────────────────────────────────
const AuthAPI = {
  register: (data)     => apiRequest('/auth/register',  { method: 'POST', body: JSON.stringify(data) }),
  login:    (data)     => apiRequest('/auth/login',     { method: 'POST', body: JSON.stringify(data) }),
  getMe:    ()         => apiRequest('/auth/me'),
  updateProfile: (d)   => apiRequest('/auth/profile',   { method: 'PUT',  body: JSON.stringify(d) }),
  changePassword: (d)  => apiRequest('/auth/change-password', { method: 'PUT', body: JSON.stringify(d) }),
  forgotPassword: (d)  => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify(d) }),
};

// ── ROOMS ───────────────────────────────────────────────────────────────────────
const RoomsAPI = {
  getAll:    (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/rooms${qs ? '?' + qs : ''}`);
  },
  getById:      (id)       => apiRequest(`/rooms/${id}`),
  checkAvail:   (id, p)    => apiRequest(`/rooms/${id}/availability?${new URLSearchParams(p)}`),
  create:       (data)     => apiRequest('/rooms',      { method: 'POST', body: JSON.stringify(data) }),
  update:       (id, data) => apiRequest(`/rooms/${id}`, { method: 'PUT',  body: JSON.stringify(data) }),
  delete:       (id)       => apiRequest(`/rooms/${id}`, { method: 'DELETE' }),
  addReview:    (id, data) => apiRequest(`/rooms/${id}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
};

// ── BOOKINGS ─────────────────────────────────────────────────────────────────────
const BookingsAPI = {
  create:       (data)     => apiRequest('/bookings',              { method: 'POST', body: JSON.stringify(data) }),
  getMyAll:     ()         => apiRequest('/bookings/my-bookings'),
  getById:      (id)       => apiRequest(`/bookings/${id}`),
  cancel:       (id, data) => apiRequest(`/bookings/${id}/cancel`, { method: 'PUT',  body: JSON.stringify(data) }),
};

// ── PAYMENTS ─────────────────────────────────────────────────────────────────────
const PaymentsAPI = {
  createOrder:  (data)     => apiRequest('/payments/create-order', { method: 'POST', body: JSON.stringify(data) }),
  verify:       (data)     => apiRequest('/payments/verify',       { method: 'POST', body: JSON.stringify(data) }),
  mockPay:      (data)     => apiRequest('/payments/mock-pay',     { method: 'POST', body: JSON.stringify(data) }),
};

// ── ADMIN ─────────────────────────────────────────────────────────────────────────
const AdminAPI = {
  getDashboard:       ()         => apiRequest('/admin/dashboard'),
  getAllBookings:      (params)   => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest(`/admin/bookings${qs ? '?' + qs : ''}`);
  },
  updateBookingStatus: (id, s)   => apiRequest(`/admin/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status: s }) }),
  getAllUsers:         ()         => apiRequest('/admin/users'),
  toggleUserStatus:   (id)       => apiRequest(`/admin/users/${id}/toggle-status`, { method: 'PUT' }),
  deleteUser:         (id)       => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
};

// ── TOAST NOTIFICATION ───────────────────────────────────────────────────────────
function showToast(message, type = 'success', duration = 4000) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className   = `toast ${type} show`;

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.className = toast.className.replace(' show', '');
  }, duration);
}

// ── HELPERS ──────────────────────────────────────────────────────────────────────
function formatCurrency(amount) {
  return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function formatDateTime(date) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function togglePwd(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁️';
  }
}

function setLoading(btnId, loading, text = 'Loading...') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled    = loading;
  btn.textContent = loading ? text : btn.dataset.originalText || btn.textContent;
  if (!loading && btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
  if (loading && !btn.dataset.originalText) btn.dataset.originalText = btn.textContent;
}

// Click outside to close dropdown
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const wrap = document.querySelector('.user-avatar-wrap');
  if (dropdown && wrap && !wrap.contains(e.target)) {
    dropdown.classList.remove('open');
  }
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  if (window.scrollY > 50) navbar.classList.add('scrolled');
  else if (!navbar.classList.contains('scrolled-always')) navbar.classList.remove('scrolled');
});
