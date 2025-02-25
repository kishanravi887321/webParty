class ApiError extends Error {
    constructor(statuscode, message) {
        super(message);
        this.statuscode = statuscode;
        this.isOperational = true; // Flag to identify expected errors
        Error.captureStackTrace(this, this.constructor);
    }
}

export default ApiError;
