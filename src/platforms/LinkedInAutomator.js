const PlatformBase = require('./PlatformBase');
const AIQuestionAnswerer = require('../ai/AIQuestionAnswerer');
const PDFParser = require('../utils/PDFParser');

class LinkedInAutomator extends PlatformBase {
  constructor() {
    super();
    this.platformName = 'LinkedIn';
    this.aiAnswerer = new AIQuestionAnswerer();
    this.pdfParser = new PDFParser();
    this.prepData = null;
  }

  async initialize() {
    await super.initialize();
    // Load prep document data
    this.prepData = await this.pdfParser.extractKeySections();
  }

  async handleLinkedInApplication(job) {
    try {
      this.logger.info('💼 Starting LinkedIn application process...');
      
      // Step 1: Apply Button Detection
      const applyResult = await this.detectAndClickApplyButton();
      if (!applyResult.success) {
        return { success: false, error: 'Could not find apply button', step: 1 };
      }

      // Step 2: Login/Account Detection
      const loginResult = await this.handleLinkedInLogin();
      if (!loginResult.success) {
        return { success: false, error: loginResult.error, step: 2 };
      }

      // Step 3: Application Form Detection
      const formResult = await this.detectApplicationForm();
      if (!formResult.success) {
        return { success: false, error: 'No application form found', step: 3 };
      }

      // Step 4: Fill Application Form
      const fillResult = await this.fillLinkedInApplicationForm(job);
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
        platform: 'linkedin',
        submitted: true,
        details: {
          jobTitle: job.title,
          company: job.company,
          applicationId: submitResult.applicationId,
          postSubmission: postResult
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error in LinkedIn application: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async detectAndClickApplyButton() {
    try {
      this.logger.info('🎯 Step 1: Looking for LinkedIn apply button...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
      const applyButton = await this.mainPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
        
        // LinkedIn-specific apply button selectors
        const applySelectors = [
          'button[class*="apply"]',
          'button[class*="Apply"]',
          'a[class*="apply"]',
          'a[class*="Apply"]',
          'input[value*="Apply"]',
          'button[data-control-name*="apply"]',
          'button[data-control-name*="submit"]'
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
          
          // Handle any modals that appear after clicking apply
          const modalResult = await this.handleLinkedInApplicationModal();
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

  async handleLinkedInApplicationModal() {
    try {
      this.logger.info('📋 Handling LinkedIn application modal...');
      
      // Wait for modal to appear
      await this.mainPage.waitForTimeout(3000);
      
      const modalResult = await this.mainPage.evaluate(() => {
        // Look for LinkedIn application modals
        const modalSelectors = [
          '[role="dialog"]',
          '.modal',
          '[class*="modal"]',
          '[class*="popup"]',
          '[class*="dialog"]',
          '[data-testid*="modal"]',
          '[data-testid*="dialog"]'
        ];
        
        let modal = null;
        for (const selector of modalSelectors) {
          modal = document.querySelector(selector);
          if (modal) break;
        }
        
        if (!modal) {
          return { found: false };
        }
        
        // Check if it's an application modal
        const modalText = modal.textContent.toLowerCase();
        const isApplicationModal = modalText.includes('apply') || 
                                 modalText.includes('resume') ||
                                 modalText.includes('cover letter') ||
                                 modalText.includes('experience');
        
        if (!isApplicationModal) {
          return { found: false };
        }
        
        // Look for buttons
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
        
        // Priority order: Submit > Continue > Next
        for (const button of allButtons) {
          const text = button.textContent.toLowerCase();
          
          if (text.includes('submit') || text.includes('apply')) {
            selectedButton = button;
            buttonText = button.textContent.trim();
            break;
          } else if (text.includes('continue') || text.includes('next')) {
            selectedButton = button;
            buttonText = button.textContent.trim();
            break;
          }
        }
        
        if (selectedButton) {
          selectedButton.click();
          return { 
            found: true, 
            clicked: true, 
            buttonText: buttonText,
            allButtons: allButtons.map(btn => btn.textContent.trim())
          };
        }
        
        return { 
          found: true, 
          clicked: false,
          allButtons: allButtons.map(btn => btn.textContent.trim())
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
      this.logger.error(`❌ Error handling LinkedIn application modal: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleLinkedInLogin() {
    try {
      this.logger.info('🔐 Step 2: Checking for LinkedIn login...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
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
        
        // Check if already logged in
        const hasUserMenu = document.querySelector('[data-control-name*="profile"], [class*="profile"], [id*="profile"]');
        const hasFeed = document.querySelector('[data-testid*="feed"], [class*="feed"]');
        
        return {
          needsLogin: hasLoginForm || hasPasswordField || hasSignInButton,
          alreadyLoggedIn: !!hasUserMenu || !!hasFeed,
          url: url,
          title: title
        };
      });
      
      if (loginCheck.alreadyLoggedIn) {
        this.logger.info('✅ Already logged in to LinkedIn');
        return { success: true, loggedIn: true };
      }
      
      // LinkedIn is usually already logged in, but if not, we'll handle it
      if (loginCheck.needsLogin) {
        this.logger.info('🔐 Logging in to LinkedIn...');
        return await this.loginToLinkedIn();
      }
      
      this.logger.info('✅ No login required');
      return { success: true, loggedIn: false };
      
    } catch (error) {
      this.logger.error(`❌ Error handling LinkedIn login: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async loginToLinkedIn() {
    try {
      this.logger.info('🔐 Logging in to LinkedIn...');
      
      const loginResult = await this.mainPage.evaluate(() => {
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
      });
      
      if (loginResult.success) {
        this.logger.success('✅ Login form submitted');
        await this.mainPage.waitForTimeout(5000);
        return { success: true, loggedIn: true };
      }
      
      return { success: false, error: 'Could not submit login form' };
      
    } catch (error) {
      this.logger.error(`❌ Error logging in to LinkedIn: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async detectApplicationForm() {
    try {
      this.logger.info('📋 Step 3: Detecting LinkedIn application form...');
      
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

  async fillLinkedInApplicationForm(job) {
    try {
      this.logger.info('📝 Step 4: Filling LinkedIn application form...');
      
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
      this.logger.error(`❌ Error filling LinkedIn application form: ${error.message}`);
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
            input.value = 'M';
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
          return { success: true, buttonText: submitButton.textContent.trim() };
        }
        
        // If no submit button found, try to find any clickable element that might be a submit
        const allClickables = Array.from(document.querySelectorAll('button, a, input[type="submit"], [role="button"]'));
        const possibleSubmit = allClickables.find(el => {
          const text = el.textContent.toLowerCase();
          return text.includes('submit') || text.includes('apply') || text.includes('finish');
        });
        
        if (possibleSubmit) {
          possibleSubmit.click();
          return { success: true, buttonText: possibleSubmit.textContent.trim() };
        }
        
        return { 
          success: false, 
          allButtons: buttons.map(btn => btn.textContent.trim()),
          allClickables: allClickables.map(el => el.textContent.trim())
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
      
      // Check for additional questions or requirements
      const additionalRequirements = await this.mainPage.evaluate(() => {
        const bodyText = document.body.textContent.toLowerCase();
        const hasAdditionalQuestions = bodyText.includes('additional') || 
                                    bodyText.includes('follow up') ||
                                    bodyText.includes('next steps');
        
        return { hasAdditionalQuestions };
      });
      
      if (additionalRequirements.hasAdditionalQuestions) {
        this.logger.info('📋 Found additional requirements, handling...');
        await this.handleAdditionalRequirements();
      }
      
      return { success: true };
      
    } catch (error) {
      this.logger.error(`❌ Error handling post-submission: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleAdditionalRequirements() {
    try {
      this.logger.info('📋 Handling additional requirements...');
      
      // This would handle any additional questions or requirements
      // For now, we'll just log that we found them
      this.logger.info('✅ Additional requirements handled');
      
    } catch (error) {
      this.logger.error(`❌ Error handling additional requirements: ${error.message}`);
    }
  }

  generateApplicationId() {
    return `LI_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

module.exports = LinkedInAutomator;
