/**
 * Centralized error handler. Express recognizes this as an error
 * middleware because it takes FOUR arguments (err, req, res, next).
 * It must be registered LAST, after all routes, in server.js.
 *
 * Every controller can just `next(err)` or throw inside an async
 * handler wrapped by catchAsync, and it all lands here — one place
 * that decides the response shape and logs unexpected failures.
 */
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  // Log real bugs (non-operational, i.e. unexpected) loudly for devs
  if (!isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }

  res.status(statusCode).json({
    data: null,
    error: {
      message: isOperational ? err.message : 'Something went wrong on our end.',
      status: statusCode,
    },
  });
}

/**
 * catchAsync wraps async route handlers so that any rejected Promise
 * (e.g. a thrown error inside `await someService()`) is automatically
 * forwarded to next(err) -> errorHandler, instead of crashing the
 * process or requiring a try/catch in every single controller.
 */
function catchAsync(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { errorHandler, catchAsync };
