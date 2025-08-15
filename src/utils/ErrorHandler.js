// 🛡️ Advanced Error Handling for Vamsi Job Automation Bot

const Logger = require('./Logger');

class ErrorHandler {
  constructor() {
    this.logger = new Logger('ErrorHandler');
    this.errorCounts = new Map();
    this.maxRetries = 3;
  }

  handle(error, context = {}) {
    const errorKey = this.getErrorKey(error, context);
    const count = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, count + 1);

    this.logger.error('Error occurred:', {
      message: error.message,
      context,
      occurrence: count + 1
    });

    return { shouldRetry: count < this.maxRetries, waitTime: 1000 * Math.pow(2, count) };
  }

  getErrorKey(error, context) {
    return `${error.name}:${context.platform || 'unknown'}`;
  }
}

module.exports = ErrorHandler;