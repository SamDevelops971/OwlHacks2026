const AppError = require ('../utils/AppError');

function verifyCsrf (req, res, next)
{
    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
    if (safeMethods.include (req.method)) return next();

    const cookieToken = req.cookies?.csrfToken;
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || !headerToken || cookieToken !== headerToken)
    {
        return next(new AppError('Invalid or missing CSRF token', 403));
    }

    next();
}

module.exports = verifyCsrf;