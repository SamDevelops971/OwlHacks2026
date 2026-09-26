const authService = require('../services/auth.service');
const { catchAsync } = require('../middleware/errorHandler');
const { generateCsrfToken } = require('../utils/csrf');

/**
 * Controllers are intentionally "thin": they pull data out of the
 * request, call a service function to do the real work, and shape
 * the HTTP response. No business logic (password hashing, checking
 * duplicates, etc.) lives here — that belongs in services/*.js.
 */

// CHANGE ME: cookie options should match your deployment setup.
// - httpOnly: true  -> JS can never read this cookie (blocks XSS token theft). Keep true for "token".
// - secure: true    -> cookie only sent over HTTPS. Should be true in production; browsers
//                       often reject `secure` cookies on plain http://localhost in dev.
// - sameSite: 'lax' -> good default if your frontend and API share the same top-level domain
//                       (app.yoursite.com + api.yoursite.com). If they're on completely
//                       different domains, you'll likely need 'none' (which REQUIRES secure: true).
// - maxAge          -> should match your JWT_EXPIRES_IN so the cookie doesn't outlive the token.
function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days — CHANGE ME to match JWT_EXPIRES_IN
  };
}

function setAuthCookies(res, token) {
  res.cookie('token', token, authCookieOptions());

  // The CSRF token cookie is deliberately NOT httpOnly — the frontend's
  // JavaScript needs to read it and echo it back in a header.
  res.cookie('csrfToken', generateCsrfToken(), {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

const signup = catchAsync(async (req, res) => {
  const { username, email, password } = req.body;
  const { user, token } = await authService.signup({ username, email, password });
  setAuthCookies(res, token);
  res.status(201).json({ data: { user }, error: null });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.login({ email, password });
  setAuthCookies(res, token);
  res.status(200).json({ data: { user }, error: null });
});

const logout = catchAsync(async (req, res) => {
  res.clearCookie('token', authCookieOptions());
  res.clearCookie('csrfToken');
  res.status(200).json({ data: { loggedOut: true }, error: null });
});

// Lets the frontend fetch the current logged-in user on page load
// (e.g. to decide whether to show "Log in" or the user's avatar),
// without needing to store anything itself — the cookie already proves identity.
const getCurrentUser = catchAsync(async (req, res) => {
  const user = userService.getUserById(req.user.id);
  res.status(200).json({ data: user, error: null });
});

module.exports = { signup, login, logout, getCurrentUser };
