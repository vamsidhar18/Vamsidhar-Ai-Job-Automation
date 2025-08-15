const PlatformBase = require('./PlatformBase');
const AIQuestionAnswerer = require('../ai/AIQuestionAnswerer');
const PDFParser = require('../utils/PDFParser');

class WorkdayAutomator extends PlatformBase {
  constructor() {
    super();
    this.platformName = 'Workday';
    this.aiAnswerer = new AIQuestionAnswerer();
    this.pdfParser = new PDFParser();
    this.prepData = null;
  }

  async initialize() {
    await super.initialize();
    // Load prep document data
    this.prepData = await this.pdfParser.extractKeySections();
  }

  async handleWorkdayApplication(job) {
    try {
      this.logger.info('⚙️ Starting Workday application process...');
      
      // Step 1: Apply Button Detection
      const applyResult = await this.detectAndClickApplyButton();
      if (!applyResult.success) {
        return { success: false, error: 'Could not find apply button', step: 1 };
      }

      // Step 2: Login/Account Detection
      const loginResult = await this.handleWorkdayLogin();
      if (!loginResult.success) {
        return { success: false, error: loginResult.error, step: 2 };
      }

      // Step 3: Application Form Detection
      const formResult = await this.detectApplicationForm();
      if (!formResult.success) {
        return { success: false, error: 'No application form found', step: 3 };
      }

      // Step 4: Fill Application Form
      const fillResult = await this.fillWorkdayApplicationForm(job);
      if (!fillResult.success) {
        return { success: false, error: fillResult.error, step: 4 };
      }

      // Step 5: Review and Submit
      const submitResult = await this.reviewAndSubmitApplication();
      if (!submitResult.success) {
        return { success: false, error: submitResult.error, step: 5 };
      }

      // Step 6: Post-Submission Handling
      const postResult = await this.handlePostSubmission();
      
      return {
        success: true,
        platform: 'workday',
        submitted: true,
        details: {
          jobTitle: job.title,
          company: job.company,
          applicationId: submitResult.applicationId,
          postSubmission: postResult
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error in Workday application: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async detectAndClickApplyButton() {
    try {
      this.logger.info('🎯 Step 1: Looking for Workday apply button...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
      const applyButton = await this.mainPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
        
        // Workday-specific apply button selectors
        const applySelectors = [
          'button[class*="apply"]',
          'button[class*="Apply"]',
          'a[class*="apply"]',
          'a[class*="Apply"]',
          'input[value*="Apply"]',
          'button[data-automation-id*="apply"]',
          'button[data-automation-id*="submit"]'
        ];
        
        for (const selector of applySelectors) {
          const button = document.querySelector(selector);
          if (button && button.offsetParent !== null) {
            return {
              found: true,
              text: button.textContent.trim(),
              selector: selector
            };
          }
        }
        
        // Fallback: look for any button with "apply" in text
        const applyButton = buttons.find(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('apply') &&
          btn.offsetParent !== null
        );
        
        if (applyButton) {
          return {
            found: true,
            text: applyButton.textContent.trim(),
            selector: 'fallback',
            element: applyButton
          };
        }
        
        return { found: false };
      });
      
      if (applyButton.found) {
        this.logger.info(`✅ Found apply button: "${applyButton.text}"`);
        
        // Try to click the apply button using Playwright's click method
        try {
          if (applyButton.selector === 'fallback') {
            // For fallback, we need to find the button again and click it
            await this.mainPage.evaluate(() => {
              const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
              const applyButton = buttons.find(btn => 
                btn.textContent && btn.textContent.toLowerCase().includes('apply') &&
                btn.offsetParent !== null
              );
              if (applyButton) {
                applyButton.click();
                return true;
              }
              return false;
            });
          } else {
            // Use the selector to click
            await this.mainPage.click(applyButton.selector);
          }
          
          this.logger.success('✅ Apply button clicked successfully');
          await this.mainPage.waitForTimeout(3000);
          
          // Handle the application modal that appears after clicking apply
          const modalResult = await this.handleWorkdayApplicationModal();
          if (modalResult.success) {
            return { success: true };
          } else {
            this.logger.warn(`⚠️ Modal handling failed: ${modalResult.error}`);
            return { success: false, error: modalResult.error };
          }
        } catch (error) {
          this.logger.error(`❌ Error clicking apply button: ${error.message}`);
          return { success: false, error: error.message };
        }
      }
      
      this.logger.warn('⚠️ No apply button found');
      return { success: false, error: 'No apply button found' };
      
    } catch (error) {
      this.logger.error(`❌ Error detecting apply button: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleWorkdayLogin() {
    try {
      this.logger.info('🔐 Step 2: Checking for Workday login...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
      // First, check if we're already logged in
      const loginCheck = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        const title = document.title;
        const bodyText = document.body.textContent.toLowerCase();
        
        // Check for login indicators
        const hasLoginForm = document.querySelector('input[type="email"], input[type="text"], input[name*="email"]');
        const hasPasswordField = document.querySelector('input[type="password"]');
        const hasSignInButton = Array.from(document.querySelectorAll('button')).some(btn => 
          btn.textContent.toLowerCase().includes('sign in') ||
          btn.textContent.toLowerCase().includes('login')
        );
        
        // Check for account creation
        const hasCreateAccount = bodyText.includes('create account') || 
                               bodyText.includes('register') ||
                               bodyText.includes('sign up');
        
        // Check if already logged in (no login forms visible)
        const hasUserMenu = document.querySelector('[data-automation-id*="user"], [class*="user"], [id*="user"]');
        const hasProgressBar = document.querySelector('[class*="progress"], [class*="step"]');
        
        return {
          needsLogin: hasLoginForm || hasPasswordField || hasSignInButton,
          needsAccountCreation: hasCreateAccount,
          alreadyLoggedIn: !!hasUserMenu || (hasProgressBar && !hasLoginForm),
          url: url,
          title: title
        };
      });
      
      if (loginCheck.alreadyLoggedIn) {
        this.logger.info('✅ Already logged in to Workday');
        return { success: true, loggedIn: true };
      }
      
      // Check for sign-in link in top right
      const signInResult = await this.findAndClickSignIn();
      if (signInResult.success) {
        this.logger.info('🔐 Found and clicked sign-in link');
        await this.mainPage.waitForTimeout(2000);
      }
      
      // Now try to login with credentials
      const loginResult = await this.loginToWorkday();
      if (loginResult.success) {
        return { success: true, loggedIn: true };
      }
      
      // If login failed, check if account doesn't exist
      if (loginResult.error && loginResult.error.includes('account')) {
        this.logger.info('📝 Account doesn\'t exist, creating new account...');
        return await this.createWorkdayAccount();
      }
      
      // If login failed due to incorrect password, try password reset
      if (loginResult.error && loginResult.error.includes('password')) {
        this.logger.info('🔑 Incorrect password, trying password reset...');
        return await this.resetWorkdayPassword();
      }
      
      return { success: false, error: 'Could not login to Workday' };
      
    } catch (error) {
      this.logger.error(`❌ Error handling Workday login: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async findAndClickSignIn() {
    try {
      this.logger.info('🔍 Looking for sign-in link in top right...');
      
      const signInFound = await this.mainPage.evaluate(() => {
        // Look for sign-in links in the header/top area
        const headerSelectors = [
          'header a',
          '.header a',
          '[class*="header"] a',
          '[class*="nav"] a',
          'nav a',
          'a[href*="signin"]',
          'a[href*="login"]'
        ];
        
        for (const selector of headerSelectors) {
          const links = document.querySelectorAll(selector);
          for (const link of links) {
            const text = link.textContent.toLowerCase();
            if (text.includes('sign in') || text.includes('login')) {
              link.click();
              return { success: true, text: link.textContent.trim() };
            }
          }
        }
        
        return { success: false };
      });
      
      if (signInFound.success) {
        this.logger.success(`✅ Found and clicked sign-in: "${signInFound.text}"`);
        return { success: true };
      }
      
      return { success: false };
      
    } catch (error) {
      this.logger.error(`❌ Error finding sign-in link: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async loginToWorkday() {
    try {
      this.logger.info('🔐 Logging in to Workday...');
      
      // Extract company name from URL
      const companyName = await this.extractCompanyName();
      
      // Try to load saved credentials
      const savedCredentials = await this.loadCompanyCredentials(companyName);
      
      const loginResult = await this.mainPage.evaluate((savedCredentials) => {
        // Fill login form
        const emailInput = document.querySelector('input[type="email"], input[name*="email"], input[placeholder*="email"]');
        const passwordInput = document.querySelector('input[type="password"]');
        
        if (emailInput) {
          emailInput.value = '[YOUR_EMAIL]@gmail.com';
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        if (passwordInput) {
          passwordInput.value = process.env.ALL_PASSWORDS || '[YOUR_PASSWORD]';
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
        
        // Click sign in button
        const buttons = Array.from(document.querySelectorAll('button'));
        const signInButton = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('sign in') ||
          btn.textContent.toLowerCase().includes('login') ||
          btn.textContent.toLowerCase().includes('submit')
        );
        
        if (signInButton) {
          signInButton.click();
          return { success: true };
        }
        
        return { success: false };
      }, savedCredentials);
      
      if (loginResult.success) {
        this.logger.success('✅ Login form submitted');
        await this.mainPage.waitForTimeout(5000);
        
        // Check if login was successful
        const loginStatus = await this.checkLoginStatus();
        if (loginStatus.success) {
          // Save credentials for future use
          await this.saveCompanyCredentials(companyName);
          return { success: true, loggedIn: true };
        } else {
          return { success: false, error: loginStatus.error };
        }
      }
      
      return { success: false, error: 'Could not submit login form' };
      
    } catch (error) {
      this.logger.error(`❌ Error logging in to Workday: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async checkLoginStatus() {
    try {
      const status = await this.mainPage.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        const url = window.location.href;
        
        // Check for error messages
        const hasError = bodyText.includes('incorrect') || 
                        bodyText.includes('invalid') || 
                        bodyText.includes('not found') ||
                        bodyText.includes('account doesn\'t exist');
        
        // Check for success indicators
        const hasProgressBar = document.querySelector('[class*="progress"], [class*="step"]');
        const hasUserMenu = document.querySelector('[data-automation-id*="user"], [class*="user"]');
        
        if (hasError) {
          if (bodyText.includes('password')) {
            return { success: false, error: 'incorrect_password' };
          } else if (bodyText.includes('account')) {
            return { success: false, error: 'account_not_found' };
          } else {
            return { success: false, error: 'login_failed' };
          }
        }
        
        if (hasProgressBar || hasUserMenu) {
          return { success: true };
        }
        
        return { success: false, error: 'unknown_status' };
      });
      
      return status;
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resetWorkdayPassword() {
    try {
      this.logger.info('🔑 Attempting password reset...');
      
      const resetResult = await this.mainPage.evaluate(() => {
        // Look for forgot password link
        const forgotPasswordLink = Array.from(document.querySelectorAll('a')).find(link => 
          link.textContent.toLowerCase().includes('forgot') ||
          link.textContent.toLowerCase().includes('reset')
        );
        
        if (forgotPasswordLink) {
          forgotPasswordLink.click();
          return { success: true };
        }
        
        return { success: false };
      });
      
      if (resetResult.success) {
        this.logger.success('✅ Clicked forgot password link');
        await this.mainPage.waitForTimeout(3000);
        
        // Fill email for password reset
        const emailFilled = await this.mainPage.evaluate(() => {
          const emailInput = document.querySelector('input[type="email"], input[name*="email"]');
          if (emailInput) {
            emailInput.value = '[YOUR_EMAIL]@gmail.com';
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            return true;
          }
          return false;
        });
        
        if (emailFilled) {
          this.logger.success('✅ Email filled for password reset');
          
          // Submit password reset
          const submitted = await this.mainPage.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const submitButton = buttons.find(btn => 
              btn.textContent.toLowerCase().includes('submit') ||
              btn.textContent.toLowerCase().includes('send')
            );
            
            if (submitButton) {
              submitButton.click();
              return true;
            }
            return false;
          });
          
          if (submitted) {
            this.logger.success('✅ Password reset submitted');
            this.logger.info('📧 Check email for reset link/code');
            return { success: true, requiresEmailCheck: true };
          }
        }
      }
      
      return { success: false, error: 'Could not reset password' };
      
    } catch (error) {
      this.logger.error(`❌ Error resetting password: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async createWorkdayAccount() {
    try {
      this.logger.info('📝 Creating new Workday account...');
      
      const accountCreated = await this.mainPage.evaluate(() => {
        // Fill account creation form
        const inputs = document.querySelectorAll('input');
        let filledCount = 0;
        
        inputs.forEach(input => {
          const type = input.type || '';
          const name = (input.name || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          
          if (type === 'email' || name.includes('email') || placeholder.includes('email')) {
            input.value = '[YOUR_EMAIL]@gmail.com';
            filledCount++;
          } else if (type === 'password' || name.includes('password')) {
            input.value = process.env.ALL_PASSWORDS || '[YOUR_PASSWORD]';
            filledCount++;
          } else if (name.includes('first') || placeholder.includes('first')) {
            input.value = '[YOUR_FIRST_NAME]';
            filledCount++;
          } else if (name.includes('last') || placeholder.includes('last')) {
            input.value = '[YOUR_LAST_NAME]';
            filledCount++;
          }
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        // Click create account button
        const buttons = Array.from(document.querySelectorAll('button'));
        const createButton = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('create') ||
          btn.textContent.toLowerCase().includes('register') ||
          btn.textContent.toLowerCase().includes('sign up')
        );
        
        if (createButton) {
          createButton.click();
          return { success: true, filledCount };
        }
        
        return { success: false, filledCount };
      });
      
      if (accountCreated.success) {
        this.logger.success(`✅ Account creation form filled (${accountCreated.filledCount} fields)`);
        await this.mainPage.waitForTimeout(5000);
        return { success: true, accountCreated: true };
      }
      
      return { success: false, error: 'Could not create account' };
      
    } catch (error) {
      this.logger.error(`❌ Error creating Workday account: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async detectApplicationForm() {
    try {
      this.logger.info('📋 Step 3: Detecting Workday application form...');
      
      await this.mainPage.waitForTimeout(3000);
      
      const formCheck = await this.mainPage.evaluate(() => {
        const forms = document.querySelectorAll('form');
        const inputs = document.querySelectorAll('input, textarea, select');
        const fileInputs = document.querySelectorAll('input[type="file"]');
        
        return {
          formCount: forms.length,
          inputCount: inputs.length,
          fileInputCount: fileInputs.length,
          hasApplicationForm: inputs.length > 0 || forms.length > 0
        };
      });
      
      if (formCheck.hasApplicationForm) {
        this.logger.info(`✅ Found application form: ${formCheck.inputCount} inputs, ${formCheck.fileInputCount} file inputs`);
        return { success: true, formInfo: formCheck };
      }
      
      return { success: false, error: 'No application form found' };
      
    } catch (error) {
      this.logger.error(`❌ Error detecting application form: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async fillWorkdayApplicationForm(job) {
    try {
      this.logger.info('📝 Step 4: Filling Workday application form...');
      
      // Fill basic information
      const basicResult = await this.fillBasicInformation(job);
      
      // Fill experience questions using AI
      const aiResult = await this.fillExperienceQuestions(job);
      
      // Upload resume
      const resumeResult = await this.uploadResume();
      
      // Generate and fill cover letter
      const coverResult = await this.fillCoverLetter(job);
      
      return {
        success: true,
        basicInfo: basicResult,
        aiQuestions: aiResult,
        resume: resumeResult,
        coverLetter: coverResult
      };
      
    } catch (error) {
      this.logger.error(`❌ Error filling Workday application form: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async fillBasicInformation(job) {
    try {
      this.logger.info('📋 Filling basic information...');
      
      const filled = await this.mainPage.evaluate(() => {
        let filledCount = 0;
        
        // Fill all text inputs
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        inputs.forEach(input => {
          const name = (input.name || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          const id = (input.id || '').toLowerCase();
          
          if (name.includes('first') || placeholder.includes('first') || id.includes('first')) {
            input.value = '[YOUR_FIRST_NAME]';
            filledCount++;
          } else if (name.includes('last') || placeholder.includes('last') || id.includes('last')) {
            input.value = '[YOUR_LAST_NAME]';
            filledCount++;
          } else if (name.includes('email') || placeholder.includes('email') || id.includes('email')) {
            input.value = '[YOUR_EMAIL]@gmail.com';
            filledCount++;
          } else if (name.includes('phone') || placeholder.includes('phone') || id.includes('phone')) {
            input.value = '[YOUR_PHONE]';
            filledCount++;
          } else if (name.includes('linkedin') || placeholder.includes('linkedin') || id.includes('linkedin')) {
            input.value = 'https://linkedin.com/in/[YOUR_LINKEDIN_ID]';
            filledCount++;
          } else if (name.includes('github') || placeholder.includes('github') || id.includes('github')) {
            input.value = 'https://github.com/[YOUR_GITHUB_ID]';
            filledCount++;
          }
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        return { filledCount, totalInputs: inputs.length };
      });
      
      this.logger.info(`✅ Filled ${filled.filledCount} out of ${filled.totalInputs} basic fields`);
      return filled;
      
    } catch (error) {
      this.logger.error(`❌ Error filling basic information: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async fillExperienceQuestions(job) {
    try {
      this.logger.info('🤖 Filling experience questions with AI...');
      
      // Get all textarea and select fields
      const questions = await this.mainPage.evaluate(() => {
        const textareas = document.querySelectorAll('textarea');
        const selects = document.querySelectorAll('select');
        
        return {
          textareas: Array.from(textareas).map((textarea, index) => ({
            index,
            placeholder: textarea.placeholder,
            name: textarea.name,
            id: textarea.id,
            value: textarea.value
          })),
          selects: Array.from(selects).map((select, index) => ({
            index,
            name: select.name,
            id: select.id,
            options: Array.from(select.options).map(option => option.text)
          }))
        };
      });
      
      let aiResponses = [];
      
      // Answer textarea questions
      for (const textarea of questions.textareas) {
        const question = textarea.placeholder || textarea.name || `Question ${textarea.index}`;
        
        // Check prep document first
        let answer = this.prepData?.findAnswer(question);
        
        // If not found, ask AI
        if (!answer) {
          answer = await this.aiAnswerer.generateResponse({
            question: question,
            jobContext: job,
            prepContent: this.prepData
          });
        }
        
        // Fill the textarea
        await this.mainPage.evaluate((index, answer) => {
          const textarea = document.querySelectorAll('textarea')[index];
          if (textarea) {
            textarea.value = answer;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, textarea.index, answer);
        
        aiResponses.push({ question, answer });
      }
      
      this.logger.info(`✅ Answered ${aiResponses.length} questions with AI`);
      return aiResponses;
      
    } catch (error) {
      this.logger.error(`❌ Error filling experience questions: ${error.message}`);
      return [];
    }
  }

  async uploadResume() {
    try {
      this.logger.info('📎 Uploading resume...');
      
      const fileInput = await this.mainPage.$('input[type="file"]');
      if (fileInput) {
        const path = require('path');
        const resumePath = path.join(__dirname, '../../demo apply/prep document.pdf');
        await fileInput.setInputFiles(resumePath);
        this.logger.success('✅ Resume uploaded');
        return { success: true };
      }
      
      this.logger.warn('⚠️ No file upload field found');
      return { success: false, error: 'No file upload field' };
      
    } catch (error) {
      this.logger.error(`❌ Error uploading resume: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async fillCoverLetter(job) {
    try {
      this.logger.info('📄 Generating and filling cover letter...');
      
      // Generate cover letter using AI
      const coverLetter = await this.aiAnswerer.generateResponse({
        question: 'Generate a cover letter for this job',
        jobContext: job,
        prepContent: this.prepData
      });
      
      // Find cover letter textarea
      const filled = await this.mainPage.evaluate((coverLetter) => {
        const textareas = document.querySelectorAll('textarea');
        let filledCount = 0;
        
        textareas.forEach(textarea => {
          const placeholder = (textarea.placeholder || '').toLowerCase();
          const name = (textarea.name || '').toLowerCase();
          
          if (placeholder.includes('cover') || 
              placeholder.includes('letter') || 
              name.includes('cover') || 
              name.includes('letter')) {
            textarea.value = coverLetter;
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
        });
        
        return { filledCount };
      }, coverLetter);
      
      if (filled.filledCount > 0) {
        this.logger.success('✅ Cover letter filled');
        return { success: true, coverLetter };
      }
      
      this.logger.warn('⚠️ No cover letter field found');
      return { success: false, error: 'No cover letter field' };
      
    } catch (error) {
      this.logger.error(`❌ Error filling cover letter: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async reviewAndSubmitApplication() {
    try {
      this.logger.info('📋 Step 5: Reviewing and submitting application...');
      
      // Review all filled information
      const review = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea, select');
        let filledCount = 0;
        let emptyCount = 0;
        
        inputs.forEach(input => {
          if (input.value && input.value.trim() !== '') {
            filledCount++;
          } else {
            emptyCount++;
          }
        });
        
        return { filledCount, emptyCount, totalFields: inputs.length };
      });
      
      this.logger.info(`📊 Review: ${review.filledCount} filled, ${review.emptyCount} empty out of ${review.totalFields} fields`);
      
      // Look for submit button
      const submitResult = await this.mainPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        
        // Debug: Log all buttons found
        console.log('🔍 All buttons found:', buttons.map(btn => btn.textContent.trim()));
        
        // First, check if we're on account creation page
        const bodyText = document.body.textContent.toLowerCase();
        const isAccountCreation = bodyText.includes('create account') || 
                                bodyText.includes('password requirements') ||
                                bodyText.includes('verify new password');
        
        if (isAccountCreation) {
          // Look for Create Account button
          const createAccountButton = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('create account') ||
            btn.textContent.toLowerCase().includes('create') ||
            btn.textContent.toLowerCase().includes('register')
          );
          
          if (createAccountButton) {
            createAccountButton.click();
            return { success: true, buttonText: createAccountButton.textContent.trim(), type: 'create_account' };
          }
        }
        
        // Check for regular submit buttons
        const submitButton = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('submit') ||
          btn.textContent.toLowerCase().includes('apply') ||
          btn.textContent.toLowerCase().includes('finish') ||
          btn.textContent.toLowerCase().includes('complete') ||
          btn.textContent.toLowerCase().includes('save') ||
          btn.textContent.toLowerCase().includes('next') ||
          btn.textContent.toLowerCase().includes('continue')
        );
        
        if (submitButton) {
          submitButton.click();
          return { success: true, buttonText: submitButton.textContent.trim(), type: 'submit' };
        }
        
        // If no submit button found, try to find any clickable element that might be a submit
        const allClickables = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
        const possibleSubmit = allClickables.find(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('submit') || text.includes('apply') || text.includes('finish');
        });
        
        if (possibleSubmit) {
          possibleSubmit.click();
          return { success: true, buttonText: possibleSubmit.textContent.trim(), type: 'fallback' };
        }
        
        return { 
          success: false, 
          allButtons: buttons.map(btn => btn.textContent.trim()),
          allClickables: allClickables.map(el => el.textContent.trim()),
          isAccountCreation: isAccountCreation
        };
      });
      
      if (submitResult.success) {
        this.logger.success(`✅ Application submitted: "${submitResult.buttonText}"`);
        await this.mainPage.waitForTimeout(5000);
        return { success: true, applicationId: this.generateApplicationId() };
      }
      
      this.logger.warn('⚠️ Could not find submit button');
      if (submitResult.allButtons) {
        this.logger.info(`📋 Available buttons: ${submitResult.allButtons.join(', ')}`);
      }
      if (submitResult.allClickables) {
        this.logger.info(`📋 All clickables: ${submitResult.allClickables.join(', ')}`);
      }
      return { success: false, error: 'Could not find submit button' };
      
    } catch (error) {
      this.logger.error(`❌ Error reviewing and submitting: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handlePostSubmission() {
    try {
      this.logger.info('📧 Step 6: Handling post-submission requirements...');
      
      // Check for employment questions
      const employmentQuestions = await this.mainPage.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasEmploymentQuestions = bodyText.includes('employment') || 
                                     bodyText.includes('work history') ||
                                     bodyText.includes('previous jobs');
        
        return { hasEmploymentQuestions };
      });
      
      if (employmentQuestions.hasEmploymentQuestions) {
        this.logger.info('📋 Found employment questions, answering...');
        await this.answerEmploymentQuestions();
      }
      
      // Check for email verification
      const emailVerification = await this.mainPage.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasEmailVerification = bodyText.includes('verification code') || 
                                   bodyText.includes('check your email') ||
                                   bodyText.includes('enter code');
        
        return { hasEmailVerification };
      });
      
      if (emailVerification.hasEmailVerification) {
        this.logger.info('📧 Found email verification, checking email...');
        await this.handleEmailVerification();
      }
      
      return { success: true };
      
    } catch (error) {
      this.logger.error(`❌ Error handling post-submission: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async answerEmploymentQuestions() {
    try {
      this.logger.info('📋 Answering employment questions...');
      
      // This would integrate with your employment history data
      const employmentHistory = [
        {
          company: '[YOUR_COMPANY]',
          position: 'Software Engineer',
          duration: '[YOUR_DURATION]',
          description: 'Developed and maintained backend systems using Java and Spring Boot'
        }
        // Add more employment history
      ];
      
      // Fill employment questions using AI
      const questions = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input, textarea');
        return Array.from(inputs).map((input, index) => ({
          index,
          placeholder: input.placeholder,
          name: input.name,
          type: input.type
        }));
      });
      
      for (const question of questions) {
        const answer = await this.aiAnswerer.generateResponse({
          question: question.placeholder || question.name,
          jobContext: { employmentHistory },
          prepContent: this.prepData
        });
        
        await this.mainPage.evaluate((index, answer) => {
          const input = document.querySelectorAll('input, textarea')[index];
          if (input) {
            input.value = answer;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, question.index, answer);
      }
      
      this.logger.success('✅ Employment questions answered');
      
    } catch (error) {
      this.logger.error(`❌ Error answering employment questions: ${error.message}`);
    }
  }

  async handleEmailVerification() {
    try {
      this.logger.info('📧 Handling email verification...');
      
      // This would integrate with email checking functionality
      // For now, we'll simulate finding a verification code
      const verificationCode = '123456'; // This would come from email checking
      
      // Find and fill verification code input
      const filled = await this.mainPage.evaluate((code) => {
        const inputs = document.querySelectorAll('input');
        let filledCount = 0;
        
        inputs.forEach(input => {
          const placeholder = (input.placeholder || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          
          if (placeholder.includes('code') || 
              placeholder.includes('verification') || 
              name.includes('code') || 
              name.includes('verification')) {
            input.value = code;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
        });
        
        return { filledCount };
      }, verificationCode);
      
      if (filled.filledCount > 0) {
        this.logger.success('✅ Verification code filled');
        
        // Submit verification
        const submitted = await this.mainPage.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const submitButton = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('submit') ||
            btn.textContent.toLowerCase().includes('verify')
          );
          
          if (submitButton) {
            submitButton.click();
            return true;
          }
          return false;
        });
        
        if (submitted) {
          this.logger.success('✅ Verification submitted');
        }
      }
      
    } catch (error) {
      this.logger.error(`❌ Error handling email verification: ${error.message}`);
    }
  }

  async handleWorkdayApplicationModal() {
    try {
      this.logger.info('📋 Handling Workday application modal...');
      
      // Wait for modal to appear
      await this.mainPage.waitForTimeout(3000);
      
      const modalResult = await this.mainPage.evaluate(() => {
        // Look for the "Start Your Application" modal - try multiple selectors
        const modalSelectors = [
          '[role="dialog"]',
          '.modal',
          '[class*="modal"]',
          '[class*="popup"]',
          '[class*="dialog"]',
          '[data-testid*="modal"]',
          '[data-testid*="dialog"]',
          '[id*="modal"]',
          '[id*="dialog"]'
        ];
        
        let modal = null;
        for (const selector of modalSelectors) {
          modal = document.querySelector(selector);
          if (modal) break;
        }
        
        if (!modal) {
          return { found: false };
        }
        
        // Check if it's the application modal
        const modalText = modal.textContent.toLowerCase();
        const isApplicationModal = modalText.includes('start your application') || 
                                 modalText.includes('apply') ||
                                 modalText.includes('autofill') ||
                                 modalText.includes('resume') ||
                                 modalText.includes('linkedin') ||
                                 modalText.includes('choose');
        
        if (!isApplicationModal) {
          return { found: false };
        }
        
        // Look for buttons with multiple selectors
        const buttonSelectors = [
          'button',
          'a[role="button"]',
          'input[type="submit"]',
          '[role="button"]',
          '[data-testid*="button"]',
          '[class*="btn"]',
          '[class*="button"]'
        ];
        
        let allButtons = [];
        for (const selector of buttonSelectors) {
          const buttons = Array.from(modal.querySelectorAll(selector));
          allButtons = allButtons.concat(buttons);
        }
        
        // Remove duplicates
        allButtons = allButtons.filter((button, index, self) => 
          self.findIndex(b => b === button) === index
        );
        
        let selectedButton = null;
        let buttonText = '';
        
        // Priority order: Autofill with Resume > Apply Manually > Apply With LinkedIn
        for (const button of allButtons) {
          const text = button.textContent.toLowerCase();
          
          if (text.includes('autofill') || text.includes('resume')) {
            selectedButton = button;
            buttonText = button.textContent.trim();
            break;
          } else if (text.includes('apply manually') || text.includes('manual')) {
            selectedButton = button;
            buttonText = button.textContent.trim();
            break;
          } else if (text.includes('linkedin')) {
            selectedButton = button;
            buttonText = button.textContent.trim();
            break;
          } else if (text.includes('use my last application')) {
            selectedButton = button;
            buttonText = button.textContent.trim();
            break;
          }
        }
        
        // If no specific button found, try any button that looks like an action
        if (!selectedButton) {
          for (const button of allButtons) {
            const text = button.textContent.toLowerCase();
            if (text.includes('apply') || text.includes('start') || text.includes('continue')) {
              selectedButton = button;
              buttonText = button.textContent.trim();
              break;
            }
          }
        }
        
        if (selectedButton) {
          selectedButton.click();
          return { 
            found: true, 
            clicked: true, 
            buttonText: buttonText,
            modalText: modal.textContent.substring(0, 100),
            allButtons: allButtons.map(btn => btn.textContent.trim())
          };
        }
        
        return { 
          found: true, 
          clicked: false,
          allButtons: allButtons.map(btn => btn.textContent.trim()),
          modalText: modal.textContent.substring(0, 200)
        };
      });
      
      if (modalResult.found && modalResult.clicked) {
        this.logger.success(`✅ Application modal handled: "${modalResult.buttonText}"`);
        await this.mainPage.waitForTimeout(3000);
        return { success: true };
      } else if (modalResult.found) {
        this.logger.warn('⚠️ Application modal found but no suitable button clicked');
        this.logger.info(`📋 Available buttons: ${modalResult.allButtons?.join(', ') || 'None'}`);
        return { success: false, error: 'No suitable button in modal' };
      } else {
        this.logger.info('ℹ️ No application modal found');
        return { success: true, noModal: true };
      }
      
    } catch (error) {
      this.logger.error(`❌ Error handling Workday application modal: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  generateApplicationId() {
    return `WD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async saveCompanyCredentials(companyName) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsFile = path.join(__dirname, '../../data/workday_credentials.json');
      
      // Load existing credentials
      let credentials = {};
      if (fs.existsSync(credentialsFile)) {
        credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
      }
      
      // Save credentials for this company
      credentials[companyName] = {
        email: '[YOUR_EMAIL]@gmail.com',
        password: process.env.ALL_PASSWORDS || '[YOUR_PASSWORD]',
        lastUsed: new Date().toISOString(),
        status: 'active'
      };
      
      // Save to file
      fs.writeFileSync(credentialsFile, JSON.stringify(credentials, null, 2));
      this.logger.success(`✅ Saved credentials for ${companyName}`);
      
    } catch (error) {
      this.logger.error(`❌ Error saving credentials: ${error.message}`);
    }
  }

  async loadCompanyCredentials(companyName) {
    try {
      const fs = require('fs');
      const path = require('path');
      const credentialsFile = path.join(__dirname, '../../data/workday_credentials.json');
      
      if (fs.existsSync(credentialsFile)) {
        const credentials = JSON.parse(fs.readFileSync(credentialsFile, 'utf8'));
        if (credentials[companyName]) {
          this.logger.info(`✅ Found saved credentials for ${companyName}`);
          return credentials[companyName];
        }
      }
      
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Error loading credentials: ${error.message}`);
      return null;
    }
  }

  async extractCompanyName() {
    try {
      const companyName = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        
        // Extract company name from URL
        if (url.includes('wd1.myworkdayjobs.com')) {
          const match = url.match(/https:\/\/([^.]+)\.wd1\.myworkdayjobs\.com/);
          if (match) {
            return match[1];
          }
        }
        
        // Try to extract from page title or content
        const title = document.title;
        if (title.includes('Careers')) {
          const match = title.match(/([A-Za-z]+)\s+Careers/);
          if (match) {
            return match[1];
          }
        }
        
        return 'unknown';
      });
      
      return companyName;
      
    } catch (error) {
      return 'unknown';
    }
  }
}

module.exports = WorkdayAutomator;
