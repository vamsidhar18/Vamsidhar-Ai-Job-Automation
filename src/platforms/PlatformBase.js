const { chromium } = require('playwright');
const Logger = require('../utils/Logger');
const ErrorHandler = require('../utils/ErrorHandler');

class PlatformBase {
  constructor() {
    this.logger = new Logger();
    this.errorHandler = new ErrorHandler();
    this.browser = null;
    this.mainPage = null;
    this.context = null;
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing platform...');
      
      // Connect to existing Chrome session
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = this.browser.contexts();
      
      if (contexts.length > 0) {
        this.context = contexts[0];
        this.mainPage = this.context.pages()[0] || await this.context.newPage();
      } else {
        this.context = await this.browser.newContext();
        this.mainPage = await this.context.newPage();
      }
      
      this.logger.success('✅ Platform initialized successfully');
      
    } catch (error) {
      this.logger.error(`❌ Error initializing platform: ${error.message}`);
      throw error;
    }
  }

  async navigateTo(url) {
    try {
      this.logger.info(`🌐 Navigating to: ${url}`);
      await this.mainPage.goto(url, { waitUntil: 'networkidle' });
      this.logger.success('✅ Navigation successful');
    } catch (error) {
      this.logger.error(`❌ Navigation failed: ${error.message}`);
      throw error;
    }
  }

  async waitForElement(selector, timeout = 10000) {
    try {
      await this.mainPage.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      this.logger.warn(`⚠️ Element not found: ${selector}`);
      return false;
    }
  }

  async clickElement(selector) {
    try {
      await this.mainPage.click(selector);
      this.logger.success(`✅ Clicked: ${selector}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Click failed: ${selector} - ${error.message}`);
      return false;
    }
  }

  async fillField(selector, value) {
    try {
      await this.mainPage.fill(selector, value);
      this.logger.success(`✅ Filled field: ${selector}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Fill failed: ${selector} - ${error.message}`);
      return false;
    }
  }

  async getElementText(selector) {
    try {
      const text = await this.mainPage.textContent(selector);
      return text;
    } catch (error) {
      this.logger.warn(`⚠️ Could not get text from: ${selector}`);
      return null;
    }
  }

  async isElementVisible(selector) {
    try {
      const element = await this.mainPage.$(selector);
      if (element) {
        const isVisible = await element.isVisible();
        return isVisible;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  async waitForTimeout(ms) {
    await this.mainPage.waitForTimeout(ms);
  }

  async takeScreenshot(name) {
    try {
      const timestamp = Date.now();
      const filename = `screenshots/${name}_${timestamp}.png`;
      await this.mainPage.screenshot({ path: filename });
      this.logger.info(`📸 Screenshot saved: ${filename}`);
    } catch (error) {
      this.logger.warn(`⚠️ Screenshot failed: ${error.message}`);
    }
  }

  async close() {
    try {
      if (this.mainPage) {
        await this.mainPage.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.success('✅ Platform closed successfully');
    } catch (error) {
      this.logger.error(`❌ Error closing platform: ${error.message}`);
    }
  }

  async handleError(error, context = {}) {
    this.errorHandler.handle(error, context);
  }
}

module.exports = PlatformBase;
