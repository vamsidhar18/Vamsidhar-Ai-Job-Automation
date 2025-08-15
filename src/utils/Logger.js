// 📝 Advanced Logging System for Vamsi Job Automation Bot

const fs = require('fs').promises;
const path = require('path');

class Logger {
  constructor(module = 'VamsiBot') {
    this.module = module;
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDirectory();
  }

  async ensureLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  info(message, data = null) {
    console.log(`ℹ️  [${this.module}] ${message}`, data || '');
  }

  error(message, data = null) {
    console.error(`❌ [${this.module}] ${message}`, data || '');
  }

  warn(message, data = null) {
    console.warn(`⚠️  [${this.module}] ${message}`, data || '');
  }

  success(message, data = null) {
    console.log(`✅ [${this.module}] ${message}`, data || '');
  }

  debug(message, data = null) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 [${this.module}] ${message}`, data || '');
    }
  }
}

module.exports = Logger;