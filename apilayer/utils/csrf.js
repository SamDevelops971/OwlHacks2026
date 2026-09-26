const crypto = require ('crypto');

function generateCsrfToken()
{
    return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateCsrfToken };