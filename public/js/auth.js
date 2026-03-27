/**
 * =============================================
 *  AUTH.JS - Shared Authentication Logic
 * =============================================
 * Used across all pages for login/logout state,
 * navbar user info, and redirects.
 */

// ── Initialize navbar based on auth state ────────────────────────────────────
function initAuth() {
  const token    = localStorage.getItem('token');
  const userData = localStorage.getItem('user');

  const authButtons = document.getElementById('authButtons');
  const userMenu    = document.getElementById('userMenu');
  const navAvatar   = document.getElementById('navAvatar');
  const navUserName = document.getElementById('navUserName');
  const adminLink   = document.getElementById('adminLink');

  if (token && userData) {
    const user = JSON.parse(userData);

    if (authButtons) authButtons.style.display = 'none';
    if (userMenu)    userMenu.style.display    = 'flex';

    if (navAvatar)   navAvatar.src  = user.avatar?.url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=c9a96e&color=000&size=64`;
    if (navUserName) navUserName.textContent = user.name.split(' ')[0];

    if (adminLink && user.role === 'admin') adminLink.style.display = 'flex';
  } else {
    if (authButtons) authButtons.style.display = 'flex';
    if (userMenu)    userMenu.style.display    = 'none';
  }
}

// ── Toggle dropdown menu ──────────────────────────────────────────────────────
function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) dropdown.classList.toggle('open');
}

// ── Mobile hamburger menu ─────────────────────────────────────────────────────
function toggleMobileMenu() {
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburger');
  if (navLinks) navLinks.classList.toggle('open');
  if (hamburger) hamburger.classList.toggle('open');
}

// ── Logout ───────────────────────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  showToast('Logged out successfully. See you soon!', 'info');
  setTimeout(() => { window.location.href = '/index.html'; }, 1000);
}

// ── Require login (redirect if not authenticated) ────────────────────────────
function requireAuth() {
  const token = localStorage.getItem('token');
  if (!token) {
    showToast('Please login to continue.', 'warning');
    setTimeout(() => {
      window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
    }, 1000);
    return false;
  }
  return true;
}

// ── Require Admin role ─────────────────────────────────────────────────────
function requireAdmin() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!user || user.role !== 'admin') {
    showToast('Admin access required.', 'error');
    setTimeout(() => { window.location.href = '/index.html'; }, 1200);
    return false;
  }
  return true;
}

// ── Get current user from localStorage ───────────────────────────────────────
function getCurrentUser() {
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

// ── Handle Login form submission ──────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const btn      = document.getElementById('loginBtn');

  btn.disabled    = true;
  btn.textContent = 'Signing in...';

  try {
    const data = await AuthAPI.login({ email, password });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));

    showToast(data.message || 'Login successful!', 'success');

    // Redirect: back to requested page, or dashboard, or admin
    const params   = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    setTimeout(() => {
      if (redirect) {
        window.location.href = redirect;
      } else if (data.user.role === 'admin') {
        window.location.href = '/admin.html';
      } else {
        window.location.href = '/dashboard.html';
      }
    }, 800);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
}

// ── Handle Register form submission ───────────────────────────────────────────
async function handleRegister(e) {
  e.preventDefault();
  const name            = document.getElementById('regName').value.trim();
  const email           = document.getElementById('regEmail').value.trim();
  const phone           = document.getElementById('regPhone')?.value.trim();
  const password        = document.getElementById('regPassword').value;
  const confirmPassword = document.getElementById('regConfirmPassword').value;
  const btn             = document.getElementById('registerBtn');

  if (password !== confirmPassword) {
    showToast('Passwords do not match!', 'error');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Creating account...';

  try {
    const data = await AuthAPI.register({ name, email, password, phone });

    localStorage.setItem('token', data.token);
    localStorage.setItem('user',  JSON.stringify(data.user));

    showToast('Account created! Welcome to Hotel Vapi!', 'success');
    setTimeout(() => { window.location.href = '/dashboard.html'; }, 1000);
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled    = false;
    btn.textContent = 'Create Account';
  }
}

// ── Run on every page load ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', initAuth);
