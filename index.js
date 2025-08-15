// 🚀 VAMSI JOB AUTOMATION BOT - MAIN ENTRY POINT
// AI-powered job application system for H1B Software Engineer
// Built for Software Engineers seeking H1B sponsorship

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

// Import core modules (to be created)
const UserProfile = require('./Config/user-profile');
const Logger = require('./src/utils/Logger');
const ErrorHandler = require('./src/utils/ErrorHandler');

// 🎯 MAIN APPLICATION CLASS
class VamsiJobAutomationBot {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.logger = new Logger('VamsiBot');
    this.errorHandler = new ErrorHandler();
    this.isRunning = false;
    
    this.setupExpress();
    this.setupErrorHandling();
  }

  setupExpress() {
    this.app.use(cors());
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        botName: 'Vamsi Job Automation Bot',
        owner: '[YOUR_NAME]',
        uptime: process.uptime(),
        isRunning: this.isRunning,
        timestamp: new Date().toISOString()
      });
    });
    
    // Bot status endpoint
    this.app.get('/status', (req, res) => {
      res.json({
              profile: UserProfile.personal.firstName + ' ' + UserProfile.personal.lastName,
      email: UserProfile.personal.email,
        targetRole: 'Software Engineer (H1B)',
        systemStatus: this.isRunning ? 'active' : 'stopped',
        applicationsToday: 0, // TODO: Get from database
        lastRun: new Date().toISOString()
      });
    });
  }

  setupErrorHandling() {
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught Exception:', error);
      this.errorHandler.handle(error);
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.errorHandler.handle(new Error(`Unhandled Rejection: ${reason}`));
    });
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing Vamsi Job Automation Bot...');
      
      // Validate environment variables
      this.validateEnvironment();
      
      // Test browser availability
      await this.testBrowserAvailability();
      
      this.isRunning = true;
      this.logger.success('✅ Bot initialization completed successfully');
      
    } catch (error) {
      this.logger.error('❌ Bot initialization failed:', error.message);
      throw error;
    }
  }

  validateEnvironment() {
    const required = [
      'OPENAI_API_KEY',
      'GMAIL_APP_PASSWORD'
    ];
    
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    this.logger.success('✅ Environment variables validated');
  }

  async testBrowserAvailability() {
    try {
      this.logger.info('🎭 Testing browser availability...');
      const browser = await chromium.launch({ headless: true });
      const page = await browser.newPage();
      await page.goto('https://www.google.com');
      await browser.close();
      this.logger.success('✅ Browser test completed successfully');
    } catch (error) {
      throw new Error(`Browser test failed: ${error.message}`);
    }
  }

  start() {
    this.app.listen(this.port, () => {
              this.logger.success(`🚀 Job Automation Bot running on port ${this.port}`);
          this.logger.info(`👤 Owner: ${UserProfile.personal.firstName} ${UserProfile.personal.lastName}`);
    this.logger.info(`📧 Email: ${UserProfile.personal.email}`);
      this.logger.info(`🎯 Target: Software Engineer with H1B sponsorship`);
      this.logger.info(`📊 Health Check: http://localhost:${this.port}/health`);
    });
  }
}

// 🚀 START THE BOT
async function main() {
  const bot = new VamsiJobAutomationBot();
  
  try {
    await bot.initialize();
    bot.start();
  } catch (error) {
    console.error('❌ Failed to start Vamsi Job Automation Bot:', error.message);
    process.exit(1);
  }
}

main();