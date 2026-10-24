export default class AppError extends Error {
  constructor(statusCode, message, { expose = statusCode < 500 } = {}) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'AppError';
    this.expose = expose;
  }
}
