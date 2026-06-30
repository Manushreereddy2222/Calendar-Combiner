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

// Open the auth modal
function openAuthModal() {
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

// Default post-login behavior — each page can override this
function onLoginSuccess(user) {
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