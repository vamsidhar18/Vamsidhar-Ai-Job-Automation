const { chromium } = require('playwright');
const Logger = require('../utils/Logger');

class JobRightAutomator {
  constructor() {
    this.browser = null;
    this.context = null;
    this.mainPage = null;
    this.isLoggedIn = false;
    this.logger = new Logger('JobRightAutomator');
    
    // Configuration
    this.jobRightConfig = {
      email: process.env.JOBRIGHT_EMAIL || '[YOUR_EMAIL]@gmail.com',
      password: process.env.JOBRIGHT_PASSWORD
    };
  }

  async initializePersistentSession() {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        this.logger.info(`🚀 Initializing persistent browser session (attempt ${attempt}/${maxRetries})...`);
        
        this.browser = await chromium.launch({ 
        headless: false,
          channel: 'msedge', // Use Microsoft Edge
        args: [
          '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding'
          ]
        });
        
        this.context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        
        this.mainPage = await this.context.newPage();
        
        // Navigate to JobRight with retry logic
        await this.mainPage.goto('https://jobright.ai', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        this.logger.success('✅ Browser session initialized');
        
        // Perform login
      await this.performPersistentLogin();
      
        // If we reach here, everything worked
        break;
      
    } catch (error) {
        this.logger.error(`❌ Attempt ${attempt} failed: ${error.message}`);
        
        // Clean up on failure
        if (this.browser) {
          try {
            await this.browser.close();
          } catch (closeError) {
            // Ignore close errors
          }
        }
        
        if (attempt === maxRetries) {
          this.logger.error(`❌ All ${maxRetries} attempts failed. Giving up.`);
          throw error;
        } else {
          this.logger.info(`🔄 Retrying in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
  }

  async performPersistentLogin() {
    try {
      this.logger.info('🔐 Starting persistent login process...');
      
      // First, click the SIGN IN button to open the modal
      this.logger.info('🔍 Looking for SIGN IN button to open modal...');
      
      const headerSignInButton = await this.findSignInButton();
      if (headerSignInButton) {
        this.logger.info('✅ Found SIGN IN button, clicking to open modal...');
        await headerSignInButton.click();
        await this.mainPage.waitForTimeout(3000);
        
        // Now look for the login form in the modal
        const directLoginForm = await this.findDirectLoginForm();
        if (directLoginForm) {
          this.logger.info('✅ Found login form in modal, proceeding with credentials');
          await this.fillDirectLoginForm();
          
          // Wait and check if login actually worked
      await this.mainPage.waitForTimeout(5000);
      
          // Check if we're still on the sign-in page
          const currentUrl = this.mainPage.url();
          
          // More accurate login verification
          if (currentUrl.includes('/jobs/') || currentUrl.includes('/recommend')) {
            this.logger.success('🎉 Sign-in successful! Redirected to jobs page');
            
            // Skip popup handling for now - focus on job discovery
            this.logger.info('ℹ️ Skipping popup handling - proceeding to job discovery');
            
            this.isLoggedIn = true;
            return;
          } else {
            // Check for login form only if we're not on jobs page
            const hasSignInForm = await this.mainPage.$('input[type="password"]');
            const hasSignInButton = await this.mainPage.$('button:has-text("SIGN IN")');
            
            if (hasSignInForm || hasSignInButton || currentUrl.includes('signin')) {
              this.logger.error('❌ Sign-in failed - still on sign-in page');
              throw new Error('Sign-in form submission did not succeed');
            } else {
              this.logger.success('🎉 Sign-in successful!');
              
              // Handle popups that appear after successful login
              await this.handlePostLoginPopups();
              
              this.isLoggedIn = true;
              return;
            }
          }
        }
      }
      
      this.logger.error('❌ Could not complete login process');
      throw new Error('Login process failed');

  } catch (error) {
      this.logger.error(`❌ Login failed: ${error.message}`);
      throw error;
    }
  }

  async findSignInButton() {
    try {
      this.logger.info('🔍 Searching for SIGN IN button in header...');
      
      // Look for SIGN IN button in header
      const signInSelectors = [
        'text="SIGN IN"',
        'button:has-text("SIGN IN")',
        'a:has-text("SIGN IN")',
        '[data-testid*="signin"]',
        'button[class*="signin"]',
        'a[class*="signin"]'
      ];
      
      for (const selector of signInSelectors) {
        try {
          const button = await this.mainPage.waitForSelector(selector, { timeout: 3000 });
          if (button && await button.isVisible()) {
            // Skip Google sign-in buttons
            const text = await button.textContent();
            if (text && !text.toLowerCase().includes('google')) {
              this.logger.info(`✅ Found SIGN IN button: ${selector}`);
              return button;
            }
          }
        } catch (error) {
        continue;
      }
    }

      this.logger.warn('❌ No SIGN IN button found in header');
      return null;
    } catch (error) {
      this.logger.error(`❌ Error finding SIGN IN button: ${error.message}`);
      return null;
    }
  }

  async findDirectLoginForm() {
    try {
      this.logger.info('🔍 Looking for direct login form fields...');
      
      // Wait for modal to appear
      await this.mainPage.waitForTimeout(2000);
      
      // Look for email field in modal - avoid sign-up fields
      const emailSelectors = [
        '.modal input[placeholder="Email"]',
        '[role="dialog"] input[placeholder="Email"]',
        'input[placeholder="Email"]:not([id*="sign-up"])',
        'input[placeholder="Email"]:not([id*="register"])',
        '.modal input[type="email"]',
        '[role="dialog"] input[type="email"]'
      ];
      
      let emailField = null;
      for (const selector of emailSelectors) {
        try {
          emailField = await this.mainPage.waitForSelector(selector, { timeout: 3000 });
          if (emailField && await emailField.isVisible()) {
            this.logger.info(`✅ Found email field: ${selector}`);
            break;
          }
        } catch (error) {
            continue;
          }
        }
      
      // Look for password field in modal - avoid sign-up fields
      const passwordSelectors = [
        '.modal input[type="password"]',
        '[role="dialog"] input[type="password"]',
        'input[type="password"]:not([id*="sign-up"])',
        'input[type="password"]:not([id*="register"])'
      ];
      
      let passwordField = null;
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.mainPage.waitForSelector(selector, { timeout: 3000 });
          if (passwordField && await passwordField.isVisible()) {
            // Double-check it's not a sign-up field
            const id = await passwordField.getAttribute('id');
            if (id && !id.includes('sign-up') && !id.includes('register')) {
              this.logger.info(`✅ Found password field: ${selector}`);
              break;
            }
    }
  } catch (error) {
          continue;
        }
      }
      
      if (emailField && passwordField) {
        this.logger.success('✅ Found both email and password fields');
        return { emailField, passwordField };
        } else {
        this.logger.error('❌ Could not find login form fields');
        return null;
      }
      
    } catch (error) {
      this.logger.error(`❌ Error finding login form: ${error.message}`);
      return null;
    }
  }

  async fillDirectLoginForm() {
    try {
      this.logger.info('📝 Filling login form with credentials...');
      
      // Take screenshot before filling
      await this.mainPage.screenshot({ path: `before-filling-form-${Date.now()}.png`, fullPage: true });
      
      // Find form fields
      const form = await this.findDirectLoginForm();
      if (!form) {
        throw new Error('Login form not found');
      }
      
      const { emailField, passwordField } = form;
      
      // Fill email field
      this.logger.info(`📧 Filling email: ${this.jobRightConfig.email}`);
      try {
        // Clear the field first
        await emailField.click({ clickCount: 3 });
        await emailField.fill('');
        await this.mainPage.waitForTimeout(500);
        
        // Fill with email
        await emailField.type(this.jobRightConfig.email, { delay: 100 });
        this.logger.info('✅ Email/username filled using type method');
      } catch (fillError) {
        this.logger.warn('⚠️ Direct fill failed, trying JavaScript approach');
        // Fallback to JavaScript if direct fill fails
        await emailField.evaluate((el, email) => {
          el.focus();
          el.value = '';
          el.value = email;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, this.jobRightConfig.email);
        this.logger.info('✅ Email/username filled using JavaScript fallback');
      }
      
      // Fill password field
      this.logger.info(`🔒 Filling password (length: ${this.jobRightConfig.password.length})`);
      try {
        // Clear the field first
        await passwordField.click({ clickCount: 3 });
        await passwordField.fill('');
        await this.mainPage.waitForTimeout(500);
        
        // Fill with password
        await passwordField.type(this.jobRightConfig.password, { delay: 100 });
        this.logger.info('✅ Password filled using type method');
      } catch (fillError) {
        this.logger.warn('⚠️ Direct fill failed, trying JavaScript approach');
        // Fallback to JavaScript if direct fill fails
        await passwordField.evaluate((el, password) => {
          el.focus();
          el.value = '';
          el.value = password;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, this.jobRightConfig.password);
        this.logger.info('✅ Password filled using JavaScript fallback');
      }
      
      // Verify that fields are actually filled
      const emailValue = await emailField.inputValue();
      const passwordValue = await passwordField.inputValue();
      
      this.logger.info(`🔍 Field verification - Email: ${emailValue ? 'filled' : 'empty'}, Password: ${passwordValue ? 'filled' : 'empty'}`);
      
      if (!emailValue || !passwordValue) {
        this.logger.error('❌ Fields are not filled properly');
        throw new Error('Login fields are empty after filling');
      }
      
      // Submit the form
      await this.submitDirectLoginForm(passwordField);

    } catch (error) {
      this.logger.error(`❌ Error filling login form: ${error.message}`);
      throw error;
    }
  }

  async submitDirectLoginForm(passwordField) {
    try {
      this.logger.info('🚀 Submitting login form...');
      
      // Submit by pressing Enter on password field
      await passwordField.press('Enter');
      
      // Enhanced login verification with detailed error detection
      await this.mainPage.waitForTimeout(3000);
      
      // Check for error messages and form state
      const errorCheck = await this.mainPage.evaluate(() => {
        const errorTexts = document.body.textContent.toLowerCase();
        const pageText = document.body.textContent;
        
        // Find SIGN IN buttons properly
        const signInButtons = Array.from(document.querySelectorAll('button')).filter(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('sign in')
        );
        
        return {
          hasError: errorTexts.includes('error') || errorTexts.includes('invalid') || errorTexts.includes('incorrect'),
          hasLoginForm: document.querySelectorAll('input[type="password"]').length > 0,
          hasSignInButton: signInButtons.length > 0,
          currentUrl: window.location.href,
          pageText: pageText.substring(0, 500) // First 500 chars for debugging
        };
      });
      
      this.logger.info(`📍 Post-submission URL: ${errorCheck.currentUrl}`);
      this.logger.info(`🔍 Page text preview: ${errorCheck.pageText.substring(0, 200)}...`);
      
      if (errorCheck.hasError) {
        this.logger.error('❌ Login error detected on page');
        throw new Error('Login failed - error message found');
      }
      
      // Check if we're on the jobs page (successful login)
      const currentUrl = this.mainPage.url();
      if (currentUrl.includes('/jobs/') || currentUrl.includes('/recommend')) {
        this.logger.success('✅ Login successful - redirected to jobs page');
      } else if (errorCheck.hasLoginForm || errorCheck.hasSignInButton) {
        this.logger.warn('⚠️ Login form still present after submission');
        this.logger.info('💡 This could mean:');
        this.logger.info('   1. Invalid credentials');
        this.logger.info('   2. Form submission failed');
        this.logger.info('   3. Page requires additional verification');
        throw new Error('Login form still present - submission may have failed');
      }
      
      this.logger.success('✅ Login form submitted successfully');

    } catch (error) {
      this.logger.error(`❌ Error submitting login form: ${error.message}`);
      throw error;
    }
  }

  async handlePostLoginPopups() {
    try {
      this.logger.info('🔍 Checking for post-login popups to close...');
      
      // Wait for popups to fully load
      await this.mainPage.waitForTimeout(3000);
      
      // Find and close all popups using a more robust approach
      const popupCloseResult = await this.mainPage.evaluate(() => {
        const closeButtons = [];
        
        // Look for various types of close buttons
        const selectors = [
          'button[aria-label="Close"]',
          'button[aria-label="close"]',
          '.close',
          '.modal-close',
          '.popup-close',
          '[data-testid="close"]',
          '[data-testid="Close"]',
          'svg[data-testid="CloseIcon"]',
          'button:has(svg)',
          'button:has-text("×")',
          'button:has-text("X")',
          'button:has-text("Close")'
        ];
        
        selectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el.offsetParent !== null) { // Check if visible
                const text = el.textContent || el.innerText || '';
                const ariaLabel = el.getAttribute('aria-label') || '';
                const className = el.className || '';
                
                // Only include actual close buttons, NOT "ASK ORION" buttons
                if ((text.includes('×') || text.includes('X') || 
                     ariaLabel.toLowerCase().includes('close') || 
                     className.includes('ant-modal-close') ||
                     className.includes('close')) &&
                    !text.includes('ASK ORION') && 
                    !text.includes('ORION') &&
                    !className.includes('ask-orion')) {
                  closeButtons.push({
                    selector: selector,
                    text: text,
                    tagName: el.tagName,
                    className: className,
                    ariaLabel: ariaLabel
                  });
                }
              }
            });
          } catch (e) {
            // Ignore invalid selectors
          }
        });
        
        return closeButtons;
      });
      
      this.logger.info(`🔍 Found ${popupCloseResult.length} potential close buttons:`, popupCloseResult);
      
      // Try to click each close button
      for (const buttonInfo of popupCloseResult) {
        try {
          this.logger.info(`🎯 Trying to close popup with: ${buttonInfo.selector} (${buttonInfo.text})`);
          await this.mainPage.click(buttonInfo.selector);
          this.logger.info('✅ Clicked close button');
          await this.mainPage.waitForTimeout(1000);
    } catch (error) {
          this.logger.warn(`⚠️ Failed to click: ${buttonInfo.selector}`);
        }
      }
      
      // Additional approach: Look for X buttons in modals
      try {
        const modalXButtons = await this.mainPage.$$('button svg, .modal button, .popup button');
        this.logger.info(`🔍 Found ${modalXButtons.length} potential modal buttons`);
        
        for (const button of modalXButtons) {
          try {
            const text = await button.textContent();
            const isVisible = await button.isVisible();
            
            if (isVisible && 
                (text.includes('×') || text.includes('X') || text.includes('Close')) &&
                !text.includes('ASK ORION') && 
                !text.includes('ORION')) {
              this.logger.info(`🎯 Clicking modal close button: ${text}`);
              await button.click();
              await this.mainPage.waitForTimeout(1000);
          }
        } catch (error) {
            // Continue to next button
        }
      }
    } catch (error) {
        this.logger.info('ℹ️ No additional modal buttons found');
      }
      
      this.logger.success('🎉 Popups handled, ready to proceed with job automation!');
      
    } catch (error) {
      this.logger.warn(`⚠️ Error handling popups: ${error.message}`);
    }
  }

  async discoverJobs() {
    try {
      this.logger.info('🔍 Starting job discovery...');
      
      // Navigate to jobs section if not already there
      const currentUrl = this.mainPage.url();
      if (!currentUrl.includes('/jobs/')) {
        this.logger.info('🧭 Navigating to jobs section...');
        await this.mainPage.goto('https://jobright.ai/jobs/recommend', { waitUntil: 'networkidle' });
      } else {
        this.logger.info('ℹ️ Already on jobs page or manual navigation needed');
      }
      
      // Apply H1B-friendly filters
      this.logger.info('🎯 Applying H1B-friendly filters...');
      
      // Wait for jobs to load
      await this.mainPage.waitForTimeout(3000);
      
      // Discover jobs with enhanced selectors
      this.logger.info('📋 Discovering jobs with enhanced selectors...');
      
      // Wait for jobs to load
      await this.mainPage.waitForTimeout(5000);
      
      const jobs = await this.mainPage.evaluate(() => {
        const jobs = [];
        
        // Try multiple selectors for job cards
        const jobCardSelectors = [
          '[data-testid="job-card"]',
          '.job-card',
          '[class*="job"]',
          '[class*="Job"]',
          '[class*="listing"]',
          '[class*="card"]',
          'div[class*="job"]',
          'div[class*="listing"]'
        ];
        
        let jobCards = [];
        for (const selector of jobCardSelectors) {
          try {
            const cards = document.querySelectorAll(selector);
            if (cards.length > 0) {
              jobCards = Array.from(cards);
              break;
            }
          } catch (e) {
          continue;
        }
      }

        // If no specific job cards found, look for any divs that might contain job info
        if (jobCards.length === 0) {
          const allDivs = document.querySelectorAll('div');
          jobCards = Array.from(allDivs).filter(div => {
            const text = div.textContent || '';
            // Look for divs that contain job-related text
            return text.includes('Software') || text.includes('Engineer') || text.includes('Developer') || 
                   text.includes('Full-time') || text.includes('Hybrid') || text.includes('Remote');
          });
        }
        
        jobCards.forEach((card, index) => {
          try {
            // Extract job information with more flexible selectors
            const titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', '[class*="title"]', '[class*="Title"]', 'strong', 'b'];
            const companySelectors = ['[class*="company"]', '[class*="Company"]', '[class*="employer"]', '[class*="org"]'];
            const locationSelectors = ['[class*="location"]', '[class*="Location"]', '[class*="city"]', '[class*="place"]'];
            
            let title = '';
            let company = '';
            let location = '';
            
            // Find title
            for (const selector of titleSelectors) {
              const element = card.querySelector(selector);
              if (element && element.textContent) {
                title = element.textContent.trim();
            break;
              }
            }
            
            // Find company
            for (const selector of companySelectors) {
              const element = card.querySelector(selector);
              if (element && element.textContent) {
                company = element.textContent.trim();
            break;
              }
            }
            
            // Find location
            for (const selector of locationSelectors) {
              const element = card.querySelector(selector);
              if (element && element.textContent) {
                location = element.textContent.trim();
            break;
              }
            }
            
            // If no structured data found, try to extract from text content
            if (!title || !company) {
              const cardText = card.textContent || '';
              const lines = cardText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
              
              if (lines.length > 0) {
                title = title || lines[0];
                company = company || lines[1] || 'Company Name';
                location = location || lines[2] || 'Location';
              }
            }
            
            // Look for apply button
            const applyButton = card.querySelector('button:has-text("Apply"), button:has-text("APPLY"), a:has-text("Apply"), a:has-text("APPLY"), button:has-text("Apply Now")');
            
            if (title && title.length > 3) { // Basic validation
              jobs.push({
                id: index,
                title: title,
                company: company || 'Company Name',
                location: location || 'Location',
                hasApplyButton: !!applyButton,
                score: 0 // Will be calculated later
              });
            }
          } catch (error) {
            // Skip invalid cards
          }
        });
      
      return jobs;
      });
      
      this.logger.info(`📊 Found ${jobs.length} jobs`);
      
      // Score jobs for H1B sponsorship likelihood
      this.logger.info('🎯 Scoring jobs for H1B sponsorship likelihood...');

      const scoredJobs = jobs.map(job => {
        let score = 50; // Base score
        
        // H1B sponsorship indicators
        const h1bKeywords = ['h1b', 'sponsorship', 'sponsor', 'visa', 'immigration', 'work authorization'];
        const techKeywords = ['software', 'engineer', 'developer', 'programmer', 'full stack', 'backend', 'frontend', 'python', 'java', 'javascript', 'react', 'node'];
        
        const jobText = `${job.title} ${job.company} ${job.location}`.toLowerCase();
        
        // Check for H1B sponsorship mentions
        h1bKeywords.forEach(keyword => {
          if (jobText.includes(keyword)) {
            score += 25;
          }
        });
        
        // Check for tech roles (more likely to sponsor)
        techKeywords.forEach(keyword => {
          if (jobText.includes(keyword)) {
            score += 15;
          }
        });
        
        // Bonus for specific tech companies
        const techCompanies = ['google', 'microsoft', 'amazon', 'meta', 'apple', 'netflix', 'uber', 'lyft', 'airbnb', 'stripe', 'square', 'palantir'];
        techCompanies.forEach(company => {
          if (job.company.toLowerCase().includes(company)) {
            score += 20;
          }
        });
        
        // Bonus for remote/hybrid roles
        if (job.location.toLowerCase().includes('remote') || job.location.toLowerCase().includes('hybrid')) {
          score += 10;
        }
        
        // Cap score at 100
        score = Math.min(score, 100);

    return {
          ...job,
          score: score
        };
      });
      
      // Sort by score (highest first)
      scoredJobs.sort((a, b) => b.score - a.score);
      
      this.logger.success(`✅ Job discovery completed. Found ${scoredJobs.length} jobs with scores ranging from ${scoredJobs[scoredJobs.length - 1]?.score || 0} to ${scoredJobs[0]?.score || 0}`);
      
      return scoredJobs;

    } catch (error) {
      this.logger.error(`❌ Job discovery failed: ${error.message}`);
      throw error;
    }
  }

  async runBatchApplications(maxApplications = 5) {
    try {
      this.logger.info(`🚀 Starting batch application process (max: ${maxApplications})`);
      
      const jobs = await this.discoverJobs();
      const highScoringJobs = jobs.filter(job => job.score >= 60).slice(0, maxApplications);
      
      this.logger.info(`📊 Found ${highScoringJobs.length} high-scoring jobs to apply to`);
      
      const results = {
        total: highScoringJobs.length,
        successful: 0,
        failed: 0,
        details: []
      };
      
      for (const job of highScoringJobs) {
        try {
          this.logger.info(`📝 Applying to: ${job.title} at ${job.company} (Score: ${job.score})`);
          
          // Find and click apply button for this job
          const applyResult = await this.applyToJob(job);
          
          if (applyResult.success) {
            results.successful++;
            results.details.push({
              job: job.title,
              company: job.company,
              status: 'success',
              message: applyResult.message
            });
          } else {
            results.failed++;
            results.details.push({
              job: job.title,
              company: job.company,
              status: 'failed',
              message: applyResult.message
            });
          }
          
          // Wait between applications
          await this.mainPage.waitForTimeout(2000);
          
        } catch (error) {
          results.failed++;
          results.details.push({
            job: job.title,
            company: job.company,
            status: 'error',
            message: error.message
          });
          this.logger.error(`❌ Error applying to ${job.title}: ${error.message}`);
        }
      }
      
      this.logger.success(`✅ Batch application completed: ${results.successful} successful, ${results.failed} failed`);
      return results;
      
        } catch (error) {
      this.logger.error(`❌ Batch application failed: ${error.message}`);
      throw error;
    }
  }

  async applyToJob(job) {
    try {
      this.logger.info(`🎯 Attempting to apply to: ${job.title}`);
      
      // Find the job card and apply button
      const applyButton = await this.mainPage.$(`text="${job.title}" >> xpath=.. >> button:has-text("Apply"), text="${job.title}" >> xpath=.. >> button:has-text("APPLY")`);
      
      if (!applyButton) {
        return { success: false, message: 'Apply button not found' };
      }
      
      // Click apply button
      await applyButton.click();
      this.logger.info('✅ Clicked apply button');
      
      // Wait for application form to load
      await this.mainPage.waitForTimeout(3000);
      
      // Check if application was successful
      const successIndicators = await this.mainPage.$$('text="Application submitted", text="Success", text="Thank you"');
      
      if (successIndicators.length > 0) {
        this.logger.success('✅ Application submitted successfully');
        return { success: true, message: 'Application submitted' };
        } else {
        this.logger.warn('⚠️ Application status unclear');
        return { success: false, message: 'Application status unclear' };
      }

    } catch (error) {
      this.logger.error(`❌ Error applying to job: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  async cleanup() {
    try {
      this.logger.info('🧹 Cleaning up resources...');
      
      if (this.browser) {
        await this.browser.close();
        this.logger.success('✅ Browser closed');
      }
      
    } catch (error) {
      this.logger.error(`❌ Cleanup failed: ${error.message}`);
    }
  }
}

module.exports = JobRightAutomator;