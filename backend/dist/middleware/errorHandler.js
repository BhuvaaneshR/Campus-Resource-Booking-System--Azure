"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (error, req, res, next) => {
    let { statusCode = 500, message } = error;
    // Log error for debugging
    console.error('Error:', {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });
    // Handle specific error types
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation Error';
    }
    else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Invalid ID format';
    }
    else if (error.name === 'MongoError' && error.code === 11000) {
        statusCode = 409;
        message = 'Duplicate entry';
    }
    res.status(statusCode).json({
        error: {
            message,
            statusCode,
            timestamp: new Date().toISOString(),
            path: req.url
        }
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=errorHandler.js.map