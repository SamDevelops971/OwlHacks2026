const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const verifyCsrf = require('../middleware/csrf');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// Stricter than the global rate limiter — websites are hit with
// automated login-guessing (credential stuffing) far more than
// mobile apps behind app-store distribution. 10 attempts/15 min/IP.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { data: null, error: { message: 'Too many login attempts, try again later.', status: 429 } },
});

router.post(
  '/signup',
  [
    body('username').trim().isLength({ min: 3, max: 20 }).withMessage('3-20 characters'),
    body('email').isEmail().withMessage('must be a valid email').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('at least 8 characters'),
  ],
  validate,
  authController.signup
);

router.post(
  '/login',
  loginLimiter,
  [
    body('email').isEmail().withMessage('must be a valid email').normalizeEmail(),
    body('password').notEmpty().withMessage('password is required'),
  ],
  validate,
  authController.login
);

// No CSRF check needed here even though POST — there's no auth cookie
// yet to be misused by a forged request. CSRF only matters once a
// session cookie exists (see routes/post.routes.js and user.routes.js).
router.post('/logout', authenticate, verifyCsrf, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
