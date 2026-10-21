class ApiErrorBase extends Error {
  constructor(code, statusCode = 500, message = '', details = undefined) {
    super(message || code);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    if (details !== undefined) {
      this.details = details;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

export const ApiError = new Proxy(ApiErrorBase, {
  apply(target, thisArg, argumentsList) {
    return new target(...argumentsList);
  },
});

export default ApiError;
