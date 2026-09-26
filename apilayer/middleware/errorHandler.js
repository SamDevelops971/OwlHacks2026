function errorHandler (err, req, res, next)
{
    res.status (statusCode).json({
        data: null,
        error: 
        {
            message: isOperational ? err.message : 'Something went wrong on our end.',
            status: statusCode,
        },
    });
}

function catchAsync (fn)
{
    return(req, res, next) =>
    {
        Promise.resolve (fn(req, res, next)).catch(next);
    };
}

module.exports = {errorHandler, catchAsync};