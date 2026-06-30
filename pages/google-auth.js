// Replace with your actual Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';

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
  setTimeout(renderGoogleBtn, 100);
}

function closeAuthModal() {
  document.getElementById('auth-modal-overlay').style.display = 'none';
}

function closeAuthModalOutside(e) {
  if (e.target === document.getElementById('auth-modal-overlay')) closeAuthModal();
}

// Render the official Google Sign-In button inside your modal
function renderGoogleBtn() {
  const container = document.getElementById('google-btn-container');
  container.innerHTML = ''; // Clear any previous render
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