const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

/**
 * authenticate: verifies the JWT stored in the HttpOnly "token" cookie.
 * The browser attaches this cookie automatically on every request to
 * your API's domain — there's no manual header to set on the frontend,
 * and JavaScript can never read this cookie's value (HttpOnly), which
 * is what makes it safe from a script-injection (XSS) attack stealing it.
 *
 * This REPLACES the old "Authorization: Bearer <token>" header check,
 * which only made sense when the client was a mobile app managing its
 * own token storage.
 */
function authenticate(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    return next(new AppError('You must be logged in', 401));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired session', 401));
  }
}

/**
 * optionalAuth: same idea, but doesn't reject the request if the
 * cookie is missing or invalid — just proceeds as "anonymous."
 */
function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, username: payload.username };
  } catch (err) {
    // invalid/expired cookie on an optional route -> just treat as anonymous
  }
  next();
}

module.exports = { authenticate, optionalAuth };
