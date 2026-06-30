// Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = '173423991996-hscvt3rdm6dspp4rvspo8rl2ss5pu8ca.apps.googleusercontent.com';

// Load the Google Identity Services script
function loadGoogleScript() {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}
loadGoogleScript();

// Tracks why the auth modal was opened, so onLoginSuccess can behave
// differently depending on what the user was actually trying to do
// (generic site login vs. connecting a calendar mid-session).
let authIntent = 'login';

// Open the auth modal
function openAuthModal(intent) {
  authIntent = intent || 'login';
  document.getElementById('auth-modal-overlay').style.display = 'flex';
  // Small delay so the Google button renders after the modal is visible
  setTimeout(() => renderGoogleBtn('google-btn-container'), 100);
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').style.display = 'none';
}

function closeAuthModalOutside(e) {
  if (e.target === document.getElementById('auth-modal-overlay')) closeAuthModal();
}

// Sign up modal
function openSignupModal() {
  document.getElementById('signup-modal-overlay').style.display = 'flex';
  setTimeout(() => renderGoogleBtn('google-btn-container-signup'), 100);
}

function closeSignupModal() {
  document.getElementById('signup-modal-overlay').style.display = 'none';
}

function closeSignupModalOutside(e) {
  if (e.target === document.getElementById('signup-modal-overlay')) closeSignupModal();
}

// Switching between the two modals
function switchToSignup(e) {
  e.preventDefault();
  closeAuthModal();
  openSignupModal();
}

function switchToLogin(e) {
  e.preventDefault();
  closeSignupModal();
  openAuthModal();
}

// Render the official Google Sign-In button inside a given container
function renderGoogleBtn(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = ''; // Clear any previous render

  // Guard against the placeholder client ID — Google's SDK throws a vague
  // error if this isn't a real, registered client ID.
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith('YOUR_CLIENT_ID')) {
    container.innerHTML = `
      <div style="font-size:13px;color:#b0828f;text-align:center;padding:10px;">
        Google sign-in isn't configured yet — add a real Client ID in google-auth.js.
      </div>`;
    return;
  }

  if (typeof google === 'undefined' || !google.accounts) {
    // The GSI script hasn't finished loading yet — retry shortly.
    setTimeout(() => renderGoogleBtn(containerId), 200);
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse, // fires when user completes login
    auto_select: false,
  });
  google.accounts.id.renderButton(container, {
    theme: 'outline',
    size: 'large',
    width: 300,
    text: 'signin_with',
  });
}

// This runs after Google returns the ID token
function handleCredentialResponse(response) {
  // response.credential is a JWT — decode it to get user info
  const payload = JSON.parse(atob(response.credential.split('.')[1]));

  // payload contains: email, name, picture, sub (Google user ID)
  console.log('Logged in as:', payload.email);

  // Save login state to localStorage for now
  // Later: send response.credential to Django to verify server-side
  localStorage.setItem('cc_logged_in', 'true');
  localStorage.setItem('cc_user_name', payload.name);
  localStorage.setItem('cc_user_email', payload.email);
  localStorage.setItem('cc_user_picture', payload.picture);

  closeAuthModal();
  onLoginSuccess(payload); // hook for each page to respond differently
}

// Default post-login behavior — checks intent first, falls back to
// dashboard redirect for generic site login. Pages can define
// window.onCalendarConnected to handle the 'calendar' intent instead
// of being redirected away mid-flow.
function onLoginSuccess(user) {
  if (authIntent === 'calendar' && typeof window.onCalendarConnected === 'function') {
    window.onCalendarConnected(user);
    return;
  }
  window.location.href = 'dashboard.html';
}

// ───────────────────────────────────────────────────────────────
// Email/password auth — FRONTEND-ONLY PLACEHOLDER.
// Storing plaintext passwords in localStorage is NOT secure and must
// be replaced once the Django backend exists (real password hashing,
// server-side session/JWT auth). This only exists so the login/signup
// UI is testable before the backend is wired up.
// ───────────────────────────────────────────────────────────────

function getStoredUsers() {
  return JSON.parse(localStorage.getItem('cc_users') || '{}');
}

function showAuthError(elementId, message) {
  const el = document.getElementById(elementId);
  el.textContent = message;
  el.style.display = 'block';
}

function hideAuthError(elementId) {
  document.getElementById(elementId).style.display = 'none';
}

function handleEmailLogin(e) {
  e.preventDefault();
  hideAuthError('login-error');

  const email = document.getElementById('login-email').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  const users = getStoredUsers();
  const user = users[email];

  if (!user || user.password !== password) {
    showAuthError('login-error', 'Incorrect email or password.');
    return;
  }

  localStorage.setItem('cc_logged_in', 'true');
  localStorage.setItem('cc_user_name', user.name);
  localStorage.setItem('cc_user_email', email);
  localStorage.removeItem('cc_user_picture');

  closeAuthModal();
  onLoginSuccess({ name: user.name, email });
}

function handleEmailSignup(e) {
  e.preventDefault();
  hideAuthError('signup-error');

  const name = document.getElementById('signup-name').value.trim();
  const email = document.getElementById('signup-email').value.trim().toLowerCase();
  const password = document.getElementById('signup-password').value;
  const users = getStoredUsers();

  if (users[email]) {
    showAuthError('signup-error', 'An account with this email already exists.');
    return;
  }
  if (password.length < 6) {
    showAuthError('signup-error', 'Password must be at least 6 characters.');
    return;
  }

  users[email] = { name, password };
  localStorage.setItem('cc_users', JSON.stringify(users));

  localStorage.setItem('cc_logged_in', 'true');
  localStorage.setItem('cc_user_name', name);
  localStorage.setItem('cc_user_email', email);
  localStorage.removeItem('cc_user_picture');

  closeSignupModal();
  onLoginSuccess({ name, email });
}

// ───────────────────────────────────────────────────────────────
// Header login/logout state — keeps the "Log in" button in sync
// with actual login state on every page that includes this script.
// ───────────────────────────────────────────────────────────────

function performLogout() {
  localStorage.removeItem('cc_logged_in');
  localStorage.removeItem('cc_user_name');
  localStorage.removeItem('cc_user_email');
  localStorage.removeItem('cc_user_picture');
  window.location.href = 'homepage.html';
}

// Built dynamically (rather than duplicated in every page's HTML) so
// logout confirmation works consistently from any page, including
// dashboard.html which has its own custom logout button.
function logoutUser() {
  if (document.getElementById('logout-confirm-overlay')) return; // already open

  const overlay = document.createElement('div');
  overlay.id = 'logout-confirm-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(0,0,0,0.15);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
  `;

  const box = document.createElement('div');
  box.style.cssText = `
    background: white; border-radius: 14px; padding: 32px 28px;
    width: 90%; max-width: 360px; text-align: center;
    box-shadow: 0 16px 48px rgba(93,46,70,0.18);
    font-family: -apple-system, "Segoe UI", Roboto, sans-serif;
  `;
  box.innerHTML = `
    <h2 style="font-family: Georgia, serif; font-size: 19px; color:#5D2E46; margin:0 0 8px 0;">Log out?</h2>
    <p style="font-size: 13.5px; color:#888; margin:0 0 22px 0; line-height:1.5;">
      You'll need to sign in again to access your dashboard and sessions.
    </p>
    <div style="display:flex; gap:10px; justify-content:center;">
      <button id="logout-cancel-btn" style="background:white; border:1px solid #e0d0d8; color:#888; border-radius:6px; padding:10px 20px; font-size:14px; cursor:pointer;">Cancel</button>
      <button id="logout-confirm-btn" style="background:#5D2E46; color:white; border:none; border-radius:6px; padding:10px 22px; font-size:14px; font-weight:500; cursor:pointer;">Log out</button>
    </div>
  `;

  overlay.appendChild(box);
  document.body.appendChild(overlay);

  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.getElementById('logout-cancel-btn').onclick = () => overlay.remove();
  document.getElementById('logout-confirm-btn').onclick = performLogout;
}

function syncHeaderAuthUI() {
  const btn = document.getElementById('header-auth-btn');
  const nameSpan = document.getElementById('header-user-name');
  if (!btn) return; // page doesn't have this header pattern (e.g. dashboard manages its own)

  if (localStorage.getItem('cc_logged_in') === 'true') {
    const name = localStorage.getItem('cc_user_name') || 'Account';
    if (nameSpan) {
      nameSpan.textContent = 'Hi, ' + name;
      nameSpan.style.display = 'inline';
    }
    btn.textContent = 'Log out';
    btn.onclick = logoutUser;
  } else {
    if (nameSpan) nameSpan.style.display = 'none';
    btn.textContent = 'Log in';
    btn.onclick = () => openAuthModal('login');
  }
}

document.addEventListener('DOMContentLoaded', syncHeaderAuthUI);