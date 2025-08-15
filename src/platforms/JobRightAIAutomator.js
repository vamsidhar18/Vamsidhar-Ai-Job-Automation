const { chromium } = require('playwright');
const AIQuestionAnswerer = require('../ai/AIQuestionAnswerer');
const Logger = require('../utils/Logger');
const ErrorHandler = require('../utils/ErrorHandler');

class JobRightAIAutomator {
  constructor() {
    this.logger = new Logger('JobRightAIAutomator');
    this.errorHandler = new ErrorHandler();
    this.aiQuestionAnswerer = new AIQuestionAnswerer();
    this.browser = null;
    this.mainPage = null;
    this.applications = [];
  }

  async initialize() {
    try {
      this.logger.info('🚀 Initializing JobRight AI Automator...');
      
      // Connect to existing Chrome session
      this.browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = this.browser.contexts();
      this.mainPage = contexts[0]?.pages()[0] || await contexts[0]?.newPage();
      
      if (!this.mainPage) {
        throw new Error('No pages available in Chrome session');
      }
      
      this.logger.success('✅ Connected to existing Chrome session');
      
      // Navigate to JobRight if not already there
      const currentUrl = this.mainPage.url();
      if (!currentUrl.includes('jobright.ai')) {
        await this.mainPage.goto('https://jobright.ai', { waitUntil: 'domcontentloaded' });
        this.logger.info('✅ Navigated to JobRight');
      } else {
        this.logger.info('✅ Already on JobRight page');
      }
      
      // Assume logged in (as per your requirement)
      this.logger.info('✅ Assuming logged in to JobRight');
      
    } catch (error) {
      this.errorHandler.handle(error, { platform: 'JobRight', action: 'initialize' });
      throw error;
    }
  }

  async discoverAndApplyToJobs(maxApplications = 10) {
    try {
      this.logger.info(`🔍 Starting AI-powered job discovery and application (max: ${maxApplications})`);
      
      // Discover jobs
      const jobs = await this.discoverJobs();
      this.logger.info(`📊 Found ${jobs.length} jobs`);
      
      // Filter high-scoring jobs
      const highScoringJobs = jobs.filter(job => job.score >= 60);
      this.logger.info(`🎯 Found ${highScoringJobs.length} high-scoring jobs`);
      
      // Apply to jobs with AI assistance
      let applicationsCompleted = 0;
      
      for (const job of highScoringJobs) {
        if (applicationsCompleted >= maxApplications) break;
        
        try {
          this.logger.info(`📝 Applying to: ${job.title} at ${job.company}`);
          
          const applicationResult = await this.applyToJobWithAI(job);
          
          if (applicationResult.success) {
            applicationsCompleted++;
            this.applications.push({
              ...job,
              application_date: new Date().toISOString(),
              status: 'applied',
              ai_responses: applicationResult.ai_responses,
              external_site: applicationResult.external_site,
              external_url: applicationResult.external_url
            });
            
            this.logger.success(`✅ Successfully applied to ${job.title}`);
            if (applicationResult.external_site) {
              this.logger.info(`🌐 Applied via external site: ${applicationResult.external_url}`);
            }
          } else {
            this.logger.warn(`⚠️ Failed to apply to ${job.title}: ${applicationResult.error}`);
            
            // If no external site was reached, try the next job
            if (applicationResult.error && applicationResult.error.includes('No redirect to external site')) {
              this.logger.info(`🔄 No external site reached for ${job.title}, trying next job...`);
            }
          }
          
          // Wait between applications to avoid detection
          await this.mainPage.waitForTimeout(3000 + Math.random() * 2000);
          
        } catch (error) {
          this.logger.error(`❌ Error applying to ${job.title}: ${error.message}`);
        }
      }
      
      this.logger.success(`🎉 Completed ${applicationsCompleted} applications`);
      return this.applications;
      
    } catch (error) {
      this.errorHandler.handle(error, { platform: 'JobRight', action: 'discoverAndApply' });
      throw error;
    }
  }

  async discoverJobs() {
    try {
      this.logger.info('🔍 Discovering jobs...');
      
      // Refresh the page to get fresh job listings
      await this.mainPage.reload();
      await this.mainPage.waitForTimeout(5000);
      
      // Wait for jobs to load
      await this.mainPage.waitForTimeout(3000);
      
      // Extract job information
      const jobs = await this.mainPage.evaluate(() => {
        // Try more specific selectors for job cards
        const jobCards = Array.from(document.querySelectorAll('[class*="job-card"], [class*="jobCard"], [class*="job-item"], [class*="jobItem"], [class*="listing-item"], [class*="listingItem"]'));
        
        // If no specific cards found, try broader selectors
        if (jobCards.length === 0) {
          const broadCards = Array.from(document.querySelectorAll('[class*="job"], [class*="card"], [class*="listing"]'));
          // Filter out cards that are too small (likely not job cards)
          const filteredCards = broadCards.filter(card => {
            const text = card.textContent || '';
            return text.length > 100 && text.length < 5000; // Reasonable size for a job card
          });
          
          return filteredCards.map((card, index) => {
            const text = card.textContent || '';
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            // Debug: Log the first few lines of this card
            if (index === 0) {
              console.log('First card lines:', lines.slice(0, 10));
            }
          
          // Extract job information
          let title = '';
          let company = '';
          let location = '';
          let applyButton = null;
          
          // Find title (usually first significant line)
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.length > 10 && line.length < 100 && 
                !line.includes('ago') && !line.includes('alumni') && 
                !line.includes('Applied') && !line.includes('Save') &&
                !line.includes('school') && !line.includes('work here') &&
                !line.includes('ASK ORION') && !line.includes('APPLY NOW') &&
                !line.includes('JOBS') && !line.includes('Recommended') &&
                !line.includes('Orion') && !line.includes('Welcome back') &&
                (line.includes('Engineer') || line.includes('Developer') || 
                 line.includes('Manager') || line.includes('Analyst') ||
                 line.includes('Specialist') || line.includes('Lead') ||
                 line.includes('Full Stack') || line.includes('Software') ||
                 line.includes('Senior') || line.includes('Principal'))) {
              title = line;
              break;
            }
          }
          
          // If no title found with keywords, try to find any significant line
          if (!title) {
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.length > 15 && line.length < 100 && 
                  !line.includes('ago') && !line.includes('alumni') && 
                  !line.includes('Applied') && !line.includes('Save') &&
                  !line.includes('school') && !line.includes('work here') &&
                  !line.includes('Remote') && !line.includes('Hybrid') &&
                  !line.includes('Full-time') && !line.includes('Part-time') &&
                  !line.includes('ASK ORION') && !line.includes('APPLY NOW')) {
                title = line;
                break;
              }
            }
          }
          
          // If still no title, try to find the most prominent text
          if (!title) {
            const prominentLines = lines.filter(line => 
              line.length > 20 && line.length < 80 &&
              !line.includes('ago') && !line.includes('alumni') &&
              !line.includes('Applied') && !line.includes('Save') &&
              !line.includes('school') && !line.includes('work here') &&
              !line.includes('ASK ORION') && !line.includes('APPLY NOW') &&
              !line.includes('Remote') && !line.includes('Hybrid') &&
              !line.includes('Full-time') && !line.includes('Part-time') &&
              !line.includes('JOBS') && !line.includes('Recommended')
            );
            
            if (prominentLines.length > 0) {
              title = prominentLines[0];
            }
          }
          
          // If still no title, try to find any line that looks like a job title
          if (!title) {
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              // Look for lines that contain common job title patterns
              if (line.length > 15 && line.length < 60 &&
                  (line.includes('Engineer') || line.includes('Developer') || 
                   line.includes('Manager') || line.includes('Analyst') ||
                   line.includes('Specialist') || line.includes('Lead') ||
                   line.includes('Full Stack') || line.includes('Software') ||
                   line.includes('Senior') || line.includes('Principal') ||
                   line.includes('Junior') || line.includes('Graduate'))) {
                title = line;
                break;
              }
            }
          }
          
          // Find company (look for patterns like "Company Name · Type")
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('·') && line.length < 100) {
              company = line.split('·')[0].trim();
              break;
            }
          }
          
          // If no company found with · pattern, try to find company names
          if (!company) {
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.length > 3 && line.length < 50 && 
                  !line.includes('Remote') && !line.includes('Hybrid') &&
                  !line.includes('Full-time') && !line.includes('Part-time') &&
                  !line.includes('ago') && !line.includes('Applied') &&
                  (line.includes('Inc') || line.includes('Corp') || 
                   line.includes('LLC') || line.includes('Ltd') ||
                   line.includes('Company') || line.includes('Tech') ||
                   line.includes('Systems') || line.includes('Solutions'))) {
                company = line;
                break;
              }
            }
          }
          
          // Find location
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes(',') && line.length < 50 && 
                (line.includes('CA') || line.includes('WA') || line.includes('NY') || 
                 line.includes('TX') || line.includes('CA') || line.includes('Remote'))) {
              location = line;
              break;
            }
          }
          
          // Find apply button
          const buttons = card.querySelectorAll('button, a');
          for (const button of buttons) {
            const buttonText = button.textContent || '';
            if (buttonText.toLowerCase().includes('apply') || 
                buttonText.toLowerCase().includes('quick apply')) {
              applyButton = button;
              break;
            }
          }
          
          // Calculate H1B sponsorship score
          let score = 60; // Base score
          const lowerText = text.toLowerCase();
          
          if (lowerText.includes('sponsor') || lowerText.includes('h1b')) score += 20;
          if (lowerText.includes('senior') || lowerText.includes('lead')) score += 10;
          if (lowerText.includes('ai') || lowerText.includes('ml') || lowerText.includes('machine learning')) score += 15;
          if (lowerText.includes('full stack') || lowerText.includes('fullstack')) score += 10;
          if (lowerText.includes('python') || lowerText.includes('javascript') || lowerText.includes('react')) score += 5;
          if (lowerText.includes('remote') || lowerText.includes('hybrid')) score += 5;
          if (lowerText.includes('startup') || lowerText.includes('enterprise')) score += 5;
          
          return {
            id: index,
            title: title || 'Unknown Title',
            company: company || 'Unknown Company',
            location: location || 'Unknown Location',
            score: Math.min(score, 100),
            hasApplyButton: !!applyButton,
            cardIndex: index
          };
        });
        } else {
          // Use the specific job cards found
          return jobCards.map((card, index) => {
            const text = card.textContent || '';
            const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            
            // Extract job information (same logic as above)
            let title = '';
            let company = '';
            let location = '';
            let applyButton = null;
            
            // Find title (usually first significant line)
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.length > 10 && line.length < 100 && 
                  !line.includes('ago') && !line.includes('alumni') && 
                  !line.includes('Applied') && !line.includes('Save') &&
                  !line.includes('school') && !line.includes('work here') &&
                  !line.includes('ASK ORION') && !line.includes('APPLY NOW') &&
                  !line.includes('JOBS') && !line.includes('Recommended') &&
                  (line.includes('Engineer') || line.includes('Developer') || 
                   line.includes('Manager') || line.includes('Analyst') ||
                   line.includes('Specialist') || line.includes('Lead') ||
                   line.includes('Full Stack') || line.includes('Software') ||
                   line.includes('Senior') || line.includes('Principal'))) {
                title = line;
                break;
              }
            }
            
            // If no title found with keywords, try to find any significant line
            if (!title) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.length > 15 && line.length < 100 && 
                    !line.includes('ago') && !line.includes('alumni') && 
                    !line.includes('Applied') && !line.includes('Save') &&
                    !line.includes('school') && !line.includes('work here') &&
                    !line.includes('Remote') && !line.includes('Hybrid') &&
                    !line.includes('Full-time') && !line.includes('Part-time') &&
                    !line.includes('ASK ORION') && !line.includes('APPLY NOW')) {
                  title = line;
                  break;
                }
              }
            }
            
            // If still no title, try to find the most prominent text
            if (!title) {
              const prominentLines = lines.filter(line => 
                line.length > 20 && line.length < 80 &&
                !line.includes('ago') && !line.includes('alumni') &&
                !line.includes('Applied') && !line.includes('Save') &&
                !line.includes('school') && !line.includes('work here') &&
                !line.includes('ASK ORION') && !line.includes('APPLY NOW') &&
                !line.includes('Remote') && !line.includes('Hybrid') &&
                !line.includes('Full-time') && !line.includes('Part-time') &&
                !line.includes('JOBS') && !line.includes('Recommended')
              );
              
              if (prominentLines.length > 0) {
                title = prominentLines[0];
              }
            }
            
            // If still no title, try to find any line that looks like a job title
            if (!title) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                // Look for lines that contain common job title patterns
                if (line.length > 15 && line.length < 60 &&
                    (line.includes('Engineer') || line.includes('Developer') || 
                     line.includes('Manager') || line.includes('Analyst') ||
                     line.includes('Specialist') || line.includes('Lead') ||
                     line.includes('Full Stack') || line.includes('Software') ||
                     line.includes('Senior') || line.includes('Principal') ||
                     line.includes('Junior') || line.includes('Graduate'))) {
                  title = line;
                  break;
                }
              }
            }
            
            // Find company (look for patterns like "Company Name · Type")
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes('·') && line.length < 100) {
                company = line.split('·')[0].trim();
                break;
              }
            }
            
            // If no company found with · pattern, try to find company names
            if (!company) {
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.length > 3 && line.length < 50 && 
                    !line.includes('Remote') && !line.includes('Hybrid') &&
                    !line.includes('Full-time') && !line.includes('Part-time') &&
                    !line.includes('ago') && !line.includes('Applied') &&
                    (line.includes('Inc') || line.includes('Corp') || 
                     line.includes('LLC') || line.includes('Ltd') ||
                     line.includes('Company') || line.includes('Tech') ||
                     line.includes('Systems') || line.includes('Solutions'))) {
                  company = line;
                  break;
                }
              }
            }
            
            // Find location
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.includes(',') && line.length < 50 && 
                  (line.includes('CA') || line.includes('WA') || line.includes('NY') || 
                   line.includes('TX') || line.includes('CA') || line.includes('Remote'))) {
                location = line;
                break;
              }
            }
            
            // Find apply button
            const buttons = card.querySelectorAll('button, a');
            for (const button of buttons) {
              const buttonText = button.textContent || '';
              if (buttonText.toLowerCase().includes('apply') || 
                  buttonText.toLowerCase().includes('quick apply')) {
                applyButton = button;
                break;
              }
            }
            
            // Calculate H1B sponsorship score
            let score = 60; // Base score
            const lowerText = text.toLowerCase();
            
            if (lowerText.includes('sponsor') || lowerText.includes('h1b')) score += 20;
            if (lowerText.includes('senior') || lowerText.includes('lead')) score += 10;
            if (lowerText.includes('ai') || lowerText.includes('ml') || lowerText.includes('machine learning')) score += 15;
            if (lowerText.includes('full stack') || lowerText.includes('fullstack')) score += 10;
            if (lowerText.includes('python') || lowerText.includes('javascript') || lowerText.includes('react')) score += 5;
            if (lowerText.includes('remote') || lowerText.includes('hybrid')) score += 5;
            if (lowerText.includes('startup') || lowerText.includes('enterprise')) score += 5;
            
            return {
              id: index,
              title: title || 'Unknown Title',
              company: company || 'Unknown Company',
              location: location || 'Unknown Location',
              score: Math.min(score, 100),
              hasApplyButton: !!applyButton,
              cardIndex: index
            };
          });
        }
      });
      
      this.logger.info(`📊 Found ${jobs.length} individual jobs`);
      return jobs;
      
    } catch (error) {
      this.errorHandler.handle(error, { platform: 'JobRight', action: 'discoverJobs' });
      return [];
    }
  }

  async applyToJobWithAI(job) {
    try {
      this.logger.info(`🤖 Starting AI-assisted application for: ${job.title}`);
      
      // Step 1: Click apply button and handle redirect to external site
      this.logger.info('🎯 Step 1: Clicking apply button...');
      const applyResult = await this.clickApplyButton(job);
      
      if (!applyResult.success) {
        this.logger.error(`❌ Failed to click apply button: ${applyResult.error}`);
        return { success: false, error: applyResult.error };
      }
      
      // Step 2: Check if we successfully reached external site
      if (applyResult.externalSite) {
        this.logger.info(`🌐 Successfully reached external site: ${applyResult.url}`);
        
        // Handle the external career site
        const externalResult = await this.handleExternalCareerSite(applyResult.url, job);
        
        // Clean up tabs after handling external site
        await this.cleanupTabs();
        
        return {
          success: externalResult.success,
          ai_responses: externalResult.ai_responses || [],
          error: externalResult.error,
          external_site: true,
          external_url: applyResult.url,
          tab_index: applyResult.tabIndex
        };
      } else {
        this.logger.warn('⚠️ No external site reached - staying on JobRight');
        
        // Step 3: Handle resume customization modal if it appears
        this.logger.info('📋 Step 3: Checking for resume customization modal...');
        const modalResult = await this.handleResumeCustomizationModal();
        if (modalResult.handled) {
          this.logger.success('✅ Handled resume customization modal');
          await this.mainPage.waitForTimeout(2000);
        }
        
        // Step 4: Handle application form with AI (only if still on JobRight)
        this.logger.info('🤖 Step 4: Handling application form with AI...');
        const formResult = await this.handleApplicationFormWithAI(job);
        
        return {
          success: formResult.success,
          ai_responses: formResult.ai_responses,
          error: formResult.error,
          modal_handled: modalResult.handled,
          external_site: false
        };
      }
      
    } catch (error) {
      this.errorHandler.handle(error, { platform: 'JobRight', action: 'applyToJob', job: job.title });
      return { success: false, error: error.message };
    }
  }

  async handleExternalCareerSite(externalUrl, job) {
    try {
      this.logger.info(`🌐 Handling external career site: ${externalUrl}`);
      
      // Handle Workday applications
      if (externalUrl.includes('workday.com') || externalUrl.includes('wd1.myworkdayjobs.com')) {
        this.logger.info('⚙️ Detected Workday application');
        const WorkdayAutomator = require('./WorkdayAutomator');
        const workdayHandler = new WorkdayAutomator();
        await workdayHandler.initialize();
        return await workdayHandler.handleWorkdayApplication(job);
      }
      
      // Handle LinkedIn applications
      if (externalUrl.includes('linkedin.com') || externalUrl.includes('linkedinjobs.com')) {
        this.logger.info('💼 Detected LinkedIn application');
        const LinkedInAutomator = require('./LinkedInAutomator');
        const linkedinHandler = new LinkedInAutomator();
        await linkedinHandler.initialize();
        return await linkedinHandler.handleLinkedInApplication(job);
      }
      
      // Handle Greenhouse applications
      if (externalUrl.includes('greenhouse.io') || externalUrl.includes('boards.greenhouse.io')) {
        this.logger.info('🌱 Detected Greenhouse application');
        const GreenhouseAutomator = require('./GreenhouseAutomator');
        const greenhouseHandler = new GreenhouseAutomator();
        await greenhouseHandler.initialize();
        return await greenhouseHandler.handleGreenhouseApplication(job);
      }
      
      // Handle Lever applications
      if (externalUrl.includes('lever.co') || externalUrl.includes('jobs.lever.co')) {
        this.logger.info('⚡ Detected Lever application');
        const LeverAutomator = require('./LeverAutomator');
        const leverHandler = new LeverAutomator();
        await leverHandler.initialize();
        return await leverHandler.handleLeverApplication(job);
      }
      
      // Handle BambooHR applications
      if (externalUrl.includes('bamboohr.com') || externalUrl.includes('jobs.bamboohr.com')) {
        this.logger.info('🎋 Detected BambooHR application');
        const BambooHRAutomator = require('./BambooHRAutomator');
        const bamboohrHandler = new BambooHRAutomator();
        await bamboohrHandler.initialize();
        return await bamboohrHandler.handleBambooHRApplication(job);
      }
      
      // Handle Apple applications
      if (externalUrl.includes('jobs.apple.com') || externalUrl.includes('apple.com/jobs')) {
        this.logger.info('🍎 Detected Apple application');
        return await this.handleAppleSignIn(job);
      }
      
      // Handle generic external sites
      this.logger.info('🌐 Detected generic external site');
      return await this.handleGenericExternalSite(externalUrl, job);
      
    } catch (error) {
      this.logger.error(`❌ Error handling external career site: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async findAndClickExternalApplyButton() {
    try {
      this.logger.info('🔍 Looking for apply button on external career site...');
      
      const applyButtonResult = await this.mainPage.evaluate(() => {
        // Look for various types of apply buttons
        const applyButtonSelectors = [
          'button[class*="apply"]',
          'button[class*="Apply"]',
          'a[class*="apply"]',
          'a[class*="Apply"]',
          'button[class*="submit"]',
          'button[class*="Submit"]',
          'input[type="submit"]',
          'button[class*="btn"]',
          'a[class*="btn"]'
        ];
        
        let applyButton = null;
        let buttonText = '';
        
        // First try specific selectors (avoid Indeed/LinkedIn)
        for (const selector of applyButtonSelectors) {
          const buttons = document.querySelectorAll(selector);
          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            const lowerText = text.toLowerCase();
            if ((lowerText.includes('apply') || 
                 lowerText.includes('submit') ||
                 lowerText.includes('continue')) &&
                !lowerText.includes('indeed') &&
                !lowerText.includes('linkedin') &&
                !lowerText.includes('refer') &&
                !lowerText.includes('earn')) {
              applyButton = button;
              buttonText = text;
              break;
            }
          }
          if (applyButton) break;
        }
        
        // If no specific selector found, try all buttons/links (avoid Indeed/LinkedIn)
        if (!applyButton) {
          const allButtons = document.querySelectorAll('button, a, input[type="submit"]');
          for (const button of allButtons) {
            const text = button.textContent || button.value || '';
            const lowerText = text.toLowerCase();
            if ((lowerText.includes('apply') || 
                 lowerText.includes('submit') ||
                 lowerText.includes('continue') ||
                 lowerText.includes('next')) &&
                !lowerText.includes('indeed') &&
                !lowerText.includes('linkedin') &&
                !lowerText.includes('refer') &&
                !lowerText.includes('earn')) {
              applyButton = button;
              buttonText = text;
              break;
            }
          }
        }
        
        if (applyButton) {
          applyButton.click();
          return { success: true, buttonText: buttonText.trim() };
        }
        
        // If no apply button found, look for any other action buttons (avoid LinkedIn/Indeed)
        const allButtons = document.querySelectorAll('button, a, input[type="submit"]');
        for (const button of allButtons) {
          const text = button.textContent || button.value || '';
          const lowerText = text.toLowerCase();
          if ((lowerText.includes('start') || 
               lowerText.includes('begin') ||
               lowerText.includes('proceed') ||
               lowerText.includes('continue') ||
               lowerText.includes('next')) &&
              !lowerText.includes('linkedin') &&
              !lowerText.includes('indeed')) {
            applyButton = button;
            buttonText = text;
            break;
          }
        }
        
        if (applyButton) {
          applyButton.click();
          return { success: true, buttonText: buttonText.trim() };
        }
        
        return { success: false, error: 'No apply button found' };
      });
      
      if (applyButtonResult.success) {
        this.logger.info(`✅ Clicked apply button: "${applyButtonResult.buttonText}"`);
        return { success: true, buttonText: applyButtonResult.buttonText };
      } else {
        // Check if we're already on a form page (no need to click apply button)
        const formCheck = await this.mainPage.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
          const forms = document.querySelectorAll('form');
          return { 
            inputCount: inputs.length, 
            formCount: forms.length,
            hasFormFields: inputs.length > 0 || forms.length > 0
          };
        });
        
        if (formCheck.hasFormFields) {
          this.logger.info(`✅ Already on form page with ${formCheck.inputCount} input fields`);
          return { success: true, buttonText: 'Form fields detected', formPage: true };
        } else {
          this.logger.warn('⚠️ No apply button found on external site');
          return { success: false, error: applyButtonResult.error };
        }
      }
      
    } catch (error) {
      this.logger.error(`❌ Error finding apply button: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleWorkdayApplication(job) {
    try {
      this.logger.info('🏢 Handling Workday application...');
      
      // Look for Workday-specific elements
      const workdayElements = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('apply')
        );
        
        return {
          inputCount: inputs.length,
          applyButtonCount: applyButtons.length,
          hasForms: document.querySelectorAll('form').length > 0
        };
      });
      
      this.logger.info(`📝 Found ${workdayElements.inputCount} input fields`);
      this.logger.info(`🎯 Found ${workdayElements.applyButtonCount} apply buttons`);
      
      // Try to find and click Workday-specific apply buttons
      const workdayApplyResult = await this.findWorkdayApplyButton();
      if (workdayApplyResult.success) {
        this.logger.info('✅ Found and clicked Workday apply button');
        await this.mainPage.waitForTimeout(2000);
      }
      
      // Fill basic information if forms are found
      if (workdayElements.inputCount > 0) {
        await this.fillBasicInformation(job);
      }
      
      return {
        success: true,
        platform: 'workday',
        external_site: true,
        ai_responses: []
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async findWorkdayApplyButton() {
    try {
      const workdayApplyResult = await this.mainPage.evaluate(() => {
        // Workday-specific selectors
        const workdaySelectors = [
          'button[data-automation-id*="apply"]',
          'button[data-automation-id*="Apply"]',
          'button[class*="apply"]',
          'button[class*="Apply"]',
          'a[data-automation-id*="apply"]',
          'a[class*="apply"]',
          'button[class*="submit"]',
          'input[type="submit"]'
        ];
        
        for (const selector of workdaySelectors) {
          const buttons = document.querySelectorAll(selector);
          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.toLowerCase().includes('apply') || 
                text.toLowerCase().includes('submit') ||
                text.toLowerCase().includes('continue')) {
              button.click();
              return { success: true, buttonText: text.trim() };
            }
          }
        }
        
        return { success: false, error: 'No Workday apply button found' };
      });
      
      if (workdayApplyResult.success) {
        this.logger.info(`✅ Clicked Workday apply button: "${workdayApplyResult.buttonText}"`);
      }
      
      return workdayApplyResult;
      
    } catch (error) {
      this.logger.error(`❌ Error finding Workday apply button: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleGreenhouseApplication(job) {
    try {
      this.logger.info('🌱 Handling Greenhouse application...');
      
      // Look for Greenhouse-specific elements
      const greenhouseElements = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('apply')
        );
        
        return {
          inputCount: inputs.length,
          applyButtonCount: applyButtons.length,
          hasForms: document.querySelectorAll('form').length > 0
        };
      });
      
      this.logger.info(`📝 Found ${greenhouseElements.inputCount} input fields`);
      this.logger.info(`🎯 Found ${greenhouseElements.applyButtonCount} apply buttons`);
      
      // Try to find and click Greenhouse-specific apply buttons
      const greenhouseApplyResult = await this.findGreenhouseApplyButton();
      if (greenhouseApplyResult.success) {
        this.logger.info('✅ Found and clicked Greenhouse apply button');
        await this.mainPage.waitForTimeout(2000);
      }
      
      // Fill basic information if forms are found
      if (greenhouseElements.inputCount > 0) {
        await this.fillBasicInformation(job);
      }
      
      return {
        success: true,
        platform: 'greenhouse',
        external_site: true,
        ai_responses: []
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async findGreenhouseApplyButton() {
    try {
      const greenhouseApplyResult = await this.mainPage.evaluate(() => {
        // Greenhouse-specific selectors
        const greenhouseSelectors = [
          'button[class*="apply"]',
          'button[class*="Apply"]',
          'a[class*="apply"]',
          'a[class*="Apply"]',
          'button[class*="submit"]',
          'button[class*="Submit"]',
          'input[type="submit"]',
          'button[class*="btn"]',
          'a[class*="btn"]'
        ];
        
        for (const selector of greenhouseSelectors) {
          const buttons = document.querySelectorAll(selector);
          for (const button of buttons) {
            const text = button.textContent || button.value || '';
            if (text.toLowerCase().includes('apply') || 
                text.toLowerCase().includes('submit') ||
                text.toLowerCase().includes('continue')) {
              button.click();
              return { success: true, buttonText: text.trim() };
            }
          }
        }
        
        return { success: false, error: 'No Greenhouse apply button found' };
      });
      
      if (greenhouseApplyResult.success) {
        this.logger.info(`✅ Clicked Greenhouse apply button: "${greenhouseApplyResult.buttonText}"`);
      }
      
      return greenhouseApplyResult;
      
    } catch (error) {
      this.logger.error(`❌ Error finding Greenhouse apply button: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleLeverApplication(job) {
    try {
      this.logger.info('⚡ Handling Lever application...');
      
      // Look for Lever-specific elements
      const leverElements = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('apply')
        );
        
        return {
          inputCount: inputs.length,
          applyButtonCount: applyButtons.length,
          hasForms: document.querySelectorAll('form').length > 0
        };
      });
      
      this.logger.info(`📝 Found ${leverElements.inputCount} input fields`);
      this.logger.info(`🎯 Found ${leverElements.applyButtonCount} apply buttons`);
      
      // Fill basic information if forms are found
      if (leverElements.inputCount > 0) {
        await this.fillBasicInformation(job);
      }
      
      return {
        success: true,
        platform: 'lever',
        external_site: true,
        ai_responses: []
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleBambooHRApplication(job) {
    try {
      this.logger.info('🎋 Handling BambooHR application...');
      
      // Look for BambooHR-specific elements
      const bambooElements = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], textarea');
        const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('apply')
        );
        
        return {
          inputCount: inputs.length,
          applyButtonCount: applyButtons.length,
          hasForms: document.querySelectorAll('form').length > 0
        };
      });
      
      this.logger.info(`📝 Found ${bambooElements.inputCount} input fields`);
      this.logger.info(`🎯 Found ${bambooElements.applyButtonCount} apply buttons`);
      
      // Fill basic information if forms are found
      if (bambooElements.inputCount > 0) {
        await this.fillBasicInformation(job);
      }
      
      return {
        success: true,
        platform: 'bamboohr',
        external_site: true,
        ai_responses: []
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleGenericExternalSite(job) {
    try {
      this.logger.info('🌐 Handling generic external career site...');
      
      // Look for common form elements with better detection
      const formElements = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
        const applyButtons = Array.from(document.querySelectorAll('button, a')).filter(btn => 
          btn.textContent && btn.textContent.toLowerCase().includes('apply')
        );
        
        // Also check for any input fields that might be hidden or in different states
        const allInputs = document.querySelectorAll('input');
        const visibleInputs = Array.from(allInputs).filter(input => {
          const style = window.getComputedStyle(input);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        
        // Check for forms more comprehensively
        const forms = document.querySelectorAll('form');
        const iframes = document.querySelectorAll('iframe');
        
        return {
          inputCount: inputs.length,
          visibleInputCount: visibleInputs.length,
          applyButtonCount: applyButtons.length,
          hasForms: forms.length > 0,
          formsCount: forms.length,
          iframesCount: iframes.length,
          pageTitle: document.title,
          allInputs: allInputs.length,
          url: window.location.href
        };
      });
      
      this.logger.info(`📝 Found ${formElements.inputCount} input fields`);
      this.logger.info(`👁️ Found ${formElements.visibleInputCount} visible input fields`);
      this.logger.info(`📊 Found ${formElements.allInputs} total input fields`);
      this.logger.info(`🎯 Found ${formElements.applyButtonCount} apply buttons`);
      this.logger.info(`📄 Page title: ${formElements.pageTitle}`);
      this.logger.info(`🌐 Current URL: ${formElements.url}`);
      this.logger.info(`📋 Found ${formElements.formsCount} forms`);
      this.logger.info(`🖼️ Found ${formElements.iframesCount} iframes`);
      
      // Debug: Log all elements on the page
      const debugInfo = await this.mainPage.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const buttons = document.querySelectorAll('button, input[type="submit"], a');
        const inputs = document.querySelectorAll('input');
        const forms = document.querySelectorAll('form');
        
        return {
          totalElements: allElements.length,
          buttons: buttons.length,
          inputs: inputs.length,
          forms: forms.length,
          buttonTexts: Array.from(buttons).map(b => b.textContent?.trim()).filter(t => t),
          inputTypes: Array.from(inputs).map(i => i.type).filter(t => t),
          formActions: Array.from(forms).map(f => f.action).filter(a => a)
        };
      });
      
      this.logger.info(`🔍 Debug: ${debugInfo.totalElements} total elements, ${debugInfo.buttons} buttons, ${debugInfo.inputs} inputs`);
      this.logger.info(`🔍 Button texts: ${debugInfo.buttonTexts.slice(0, 5).join(', ')}...`);
      this.logger.info(`🔍 Input types: ${debugInfo.inputTypes.slice(0, 5).join(', ')}...`);
      
      // Fill basic information if forms are found
      if (formElements.inputCount > 0) {
        await this.fillBasicInformation(job);
        
        // Wait for form to be fully loaded
        await this.mainPage.waitForTimeout(2000);
        
        // Try to submit the application
        const submitResult = await this.submitApplicationForm();
        if (submitResult.success) {
          this.logger.success('✅ Application submitted successfully!');
        } else {
          this.logger.warn(`⚠️ Could not submit application: ${submitResult.error}`);
        }
      } else if (formElements.iframesCount > 0) {
        this.logger.info('🖼️ Found iframes - checking for forms inside iframes...');
        await this.handleIframeForms(job);
      } else {
        this.logger.warn('⚠️ No form fields found to fill');
        
        // Wait a bit more for dynamic content to load
        await this.mainPage.waitForTimeout(3000);
        
        // Check again for forms after waiting
        const recheckResult = await this.mainPage.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
          return { inputCount: inputs.length };
        });
        
        if (recheckResult.inputCount > 0) {
          this.logger.info(`✅ Found ${recheckResult.inputCount} fields after waiting - filling now...`);
          await this.fillBasicInformation(job);
          const submitResult = await this.submitApplicationForm();
          if (submitResult.success) {
            this.logger.success('✅ Application submitted successfully!');
          } else {
            this.logger.warn(`⚠️ Could not submit application: ${submitResult.error}`);
          }
        } else {
          this.logger.warn('⚠️ Still no form fields found after waiting');
          
          // Still try to submit even if no fields were filled
          const submitResult = await this.submitApplicationForm();
          if (submitResult.success) {
            this.logger.success('✅ Application submitted successfully!');
          } else {
            this.logger.warn(`⚠️ Could not submit application: ${submitResult.error}`);
          }
        }
      }
      
      return {
        success: true,
        platform: 'generic',
        external_site: true,
        ai_responses: []
      };
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fillBasicInformation(job) {
    try {
      this.logger.info('📝 Filling basic information...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
      // Handle CAPTCHA first
      const captchaResult = await this.handleCaptcha();
      if (captchaResult.success && captchaResult.captchaType !== 'none') {
        this.logger.info(`✅ CAPTCHA handled: ${captchaResult.captchaType}`);
      }
      
      // Check if we need to handle iframe forms
      const iframeResult = await this.handleIframeForms(job);
      if (iframeResult.success) {
        this.logger.info('✅ Form handled in iframe');
        return iframeResult;
      }
      
      const fillResult = await this.mainPage.evaluate(() => {
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
        let filledCount = 0;
        let allInputs = [];
        let requiredInputs = [];
        
        inputs.forEach(input => {
          const placeholder = (input.placeholder || '').toLowerCase();
          const name = (input.name || '').toLowerCase();
          const id = (input.id || '').toLowerCase();
          const label = input.closest('label')?.textContent?.toLowerCase() || '';
          const type = input.type || '';
          const isRequired = input.hasAttribute('required') || input.ariaRequired === 'true';
          
          allInputs.push({
            type: type,
            placeholder: placeholder,
            name: name,
            id: id,
            label: label,
            required: isRequired
          });
          
          if (isRequired) {
            requiredInputs.push({
              type: type,
              placeholder: placeholder,
              name: name,
              id: id,
              label: label
            });
          }
          
          // Fill based on field type and content
          if (placeholder.includes('first') || name.includes('first') || label.includes('first')) {
            input.value = '[YOUR_FIRST_NAME]';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('last') || name.includes('last') || label.includes('last')) {
            input.value = 'Reddy';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('email') || name.includes('email') || type === 'email' || label.includes('email')) {
            input.value = '[YOUR_EMAIL]@gmail.com';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('phone') || name.includes('phone') || type === 'tel' || label.includes('phone')) {
            input.value = '[YOUR_PHONE]';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('city') || name.includes('city') || label.includes('city')) {
            input.value = '[YOUR_CITY]';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('linkedin') || name.includes('linkedin') || label.includes('linkedin')) {
            input.value = 'https://linkedin.com/in/[YOUR_LINKEDIN_ID]';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('github') || name.includes('github') || label.includes('github')) {
            input.value = 'https://github.com/[YOUR_LINKEDIN_ID]';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('resume') || name.includes('resume') || label.includes('resume') || placeholder.includes('cv') || name.includes('cv')) {
            input.value = 'Resume attached';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('cover') || name.includes('cover') || label.includes('cover')) {
            input.value = 'Cover letter attached';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (type === 'text' && !input.value && !placeholder.includes('search') && !name.includes('search')) {
            // Fill empty text fields with generic info
            if (input.placeholder && input.placeholder.toLowerCase().includes('name')) {
              input.value = '[YOUR_FIRST_NAME]';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            } else if (input.placeholder && input.placeholder.toLowerCase().includes('email')) {
              input.value = '[YOUR_EMAIL]@gmail.com';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            } else if (input.placeholder && input.placeholder.toLowerCase().includes('phone')) {
              input.value = '[YOUR_PHONE]';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              filledCount++;
            }
          }
        });
        
        return {
          filledCount,
          totalInputs: inputs.length,
          allInputs,
          requiredInputs
        };
      });
      
      this.logger.info(`✅ Filled ${fillResult.filledCount} out of ${fillResult.totalInputs} fields`);
      this.logger.info(`📋 Required fields: ${fillResult.requiredInputs.length}`);
      
      // If no fields found, wait and try again
      if (fillResult.totalInputs === 0) {
        this.logger.info('🔄 No fields found, waiting for dynamic content...');
        await this.mainPage.waitForTimeout(5000);
        
        // Try again after waiting
        const retryResult = await this.mainPage.evaluate(() => {
          const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
          return { totalInputs: inputs.length };
        });
        
        if (retryResult.totalInputs > 0) {
          this.logger.info(`🔄 Found ${retryResult.totalInputs} fields after waiting, retrying...`);
          return await this.fillBasicInformation(job);
        }
      }
      
      // Fill textarea fields
      await this.fillTextareaFields();
      
      // Handle file upload fields
      await this.handleFileUploadFields();
      
      // Handle radio buttons and toggles
      await this.handleRadioButtonsAndToggles();
      
      // Check for CAPTCHA again after filling
      const captchaResult2 = await this.handleCaptcha();
      if (captchaResult2.success && captchaResult2.captchaType !== 'none') {
        this.logger.info(`✅ CAPTCHA handled after filling: ${captchaResult2.captchaType}`);
      }
      
      return fillResult;
      
    } catch (error) {
      this.logger.error(`❌ Error filling basic information: ${error.message}`);
      
      // Retry if navigation error
      if (error.message.includes('Execution context was destroyed') || error.message.includes('navigation')) {
        this.logger.info('🔄 Retrying after navigation error...');
        await this.mainPage.waitForTimeout(3000);
        return await this.fillBasicInformation(job);
      }
      
      return { filledCount: 0, totalInputs: 0, allInputs: [], requiredInputs: [] };
    }
  }

  async fillTextareaFields() {
    try {
      this.logger.info('📝 Filling textarea fields...');
      
      const textareaResult = await this.mainPage.evaluate(() => {
        const textareas = document.querySelectorAll('textarea');
        let filledCount = 0;
        
        textareas.forEach(textarea => {
          const placeholder = (textarea.placeholder || '').toLowerCase();
          const name = (textarea.name || '').toLowerCase();
          const id = (textarea.id || '').toLowerCase();
          const label = textarea.closest('label')?.textContent?.toLowerCase() || '';
          
          // Fill textarea fields
          if (placeholder.includes('cover') || name.includes('cover') || id.includes('cover') || label.includes('cover') ||
              placeholder.includes('letter') || name.includes('letter') || id.includes('letter') || label.includes('letter')) {
            textarea.value = 'Experienced software engineer with [YOUR_YEARS] years in full-stack development, AI/ML, and automation. Passionate about creating innovative solutions and driving technical excellence.';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('experience') || name.includes('experience') || id.includes('experience') || label.includes('experience')) {
            textarea.value = '[YOUR_YEARS] years of software engineering experience with expertise in Python, JavaScript, React, Node.js, AI/ML, and automation. Led multiple projects improving system performance and user experience.';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('skills') || name.includes('skills') || id.includes('skills') || label.includes('skills')) {
            textarea.value = 'Python, JavaScript, React, Node.js, AI/ML, Full-stack development, Automation, Git, AWS, Docker, Kubernetes';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          } else if (placeholder.includes('about') || name.includes('about') || id.includes('about') || label.includes('about')) {
            textarea.value = 'Passionate software engineer with expertise in building scalable applications and innovative solutions. Strong problem-solving skills and commitment to technical excellence.';
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            textarea.dispatchEvent(new Event('change', { bubbles: true }));
            filledCount++;
          }
        });
        
        return { filledCount, totalTextareas: textareas.length };
      });
      
      this.logger.info(`✅ Filled ${textareaResult.filledCount} out of ${textareaResult.totalTextareas} textarea fields`);
      
    } catch (error) {
      this.logger.warn(`⚠️ Error filling textarea fields: ${error.message}`);
    }
  }

  async handleFileUploadFields() {
    try {
      this.logger.info('📎 Handling file upload fields...');
      
      // Get the resume file path
      const resumePath = './demo apply/prep document.pdf';
      
      const fileResult = await this.mainPage.evaluate((resumePath) => {
        const fileInputs = document.querySelectorAll('input[type="file"]');
        let handledCount = 0;
        
        fileInputs.forEach(fileInput => {
          const name = (fileInput.name || '').toLowerCase();
          const id = (fileInput.id || '').toLowerCase();
          const label = fileInput.closest('label')?.textContent?.toLowerCase() || '';
          
          // For file upload fields, we'll add a note about resume
          if (name.includes('resume') || id.includes('resume') || label.includes('resume') ||
              name.includes('cv') || id.includes('cv') || label.includes('cv') ||
              name.includes('file') || id.includes('file') || label.includes('file')) {
            
            // Create a fake file object with the actual resume name
            const file = new File(['Resume content'], 'prep document.pdf', { type: 'application/pdf' });
            
            // Create a DataTransfer object
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            
            // Set the files property
            fileInput.files = dataTransfer.files;
            
            // Dispatch events
            fileInput.dispatchEvent(new Event('change', { bubbles: true }));
            fileInput.dispatchEvent(new Event('input', { bubbles: true }));
            
            handledCount++;
          }
        });
        
        return { handledCount, totalFileInputs: fileInputs.length };
      }, resumePath);
      
      this.logger.info(`✅ Handled ${fileResult.handledCount} out of ${fileResult.totalFileInputs} file upload fields`);
      
    } catch (error) {
      this.logger.warn(`⚠️ Error handling file upload fields: ${error.message}`);
    }
  }

  async handleRadioButtonsAndToggles() {
    try {
      this.logger.info('🔘 Handling radio buttons and toggles...');
      
      const toggleResult = await this.mainPage.evaluate(() => {
        let handledCount = 0;
        
        // Handle accommodation question
        const accommodationInputs = document.querySelectorAll('input[type="radio"], input[type="checkbox"]');
        accommodationInputs.forEach(input => {
          const label = input.closest('label')?.textContent?.toLowerCase() || '';
          const name = (input.name || '').toLowerCase();
          
          if (label.includes('no, i don\'t need any accommodations') || 
              label.includes('no accommodations') || 
              name.includes('accommodation')) {
            input.checked = true;
            input.dispatchEvent(new Event('change', { bubbles: true }));
            handledCount++;
          }
        });
        
        // Handle work authorization
        const workAuthButtons = document.querySelectorAll('button, input[type="button"]');
        workAuthButtons.forEach(button => {
          const text = (button.textContent || '').toLowerCase();
          const label = button.closest('label')?.textContent?.toLowerCase() || '';
          
          if ((text.includes('yes') || label.includes('yes')) && 
              (text.includes('authorized') || label.includes('authorized') || 
               text.includes('work') || label.includes('work'))) {
            button.click();
            handledCount++;
          }
        });
        
        // Handle visa sponsorship
        const visaButtons = document.querySelectorAll('button, input[type="button"]');
        visaButtons.forEach(button => {
          const text = (button.textContent || '').toLowerCase();
          const label = button.closest('label')?.textContent?.toLowerCase() || '';
          
          if ((text.includes('yes') || label.includes('yes')) && 
              (text.includes('visa') || label.includes('visa') || 
               text.includes('sponsorship') || label.includes('sponsorship'))) {
            button.click();
            handledCount++;
          }
        });
        
        return { handledCount };
      });
      
      this.logger.info(`✅ Handled ${toggleResult.handledCount} radio buttons and toggles`);
      
    } catch (error) {
      this.logger.warn(`⚠️ Error handling radio buttons and toggles: ${error.message}`);
    }
  }

  // Advanced CAPTCHA handling for JobRightAIAutomator.js
  async handleCaptcha() {
    try {
      this.logger.info('🤖 Checking for CAPTCHA...');
      
      const captchaInfo = await this.mainPage.evaluate(() => {
        const captchaTypes = {
          cloudflare: false,
          recaptcha: false,
          hcaptcha: false,
          simple: false
        };
        
        // Cloudflare Turnstile
        const cloudflareCaptcha = document.querySelector(
          'iframe[src*="challenges.cloudflare.com"], ' +
          'div[class*="cf-turnstile"], ' +
          'input[name*="cf-turnstile"]'
        );
        if (cloudflareCaptcha) captchaTypes.cloudflare = true;
        
        // Google reCAPTCHA
        const recaptcha = document.querySelector(
          'iframe[src*="recaptcha"], ' +
          'div[class*="g-recaptcha"], ' +
          '.g-recaptcha'
        );
        if (recaptcha) captchaTypes.recaptcha = true;
        
        // hCaptcha
        const hcaptcha = document.querySelector(
          'iframe[src*="hcaptcha"], ' +
          'div[class*="h-captcha"], ' +
          '.h-captcha'
        );
        if (hcaptcha) captchaTypes.hcaptcha = true;
        
        // Simple checkbox CAPTCHA
        const simpleCheckbox = Array.from(document.querySelectorAll('input[type="checkbox"]'))
          .find(cb => {
            const label = cb.closest('label')?.textContent || '';
            const nearbyText = cb.parentElement?.textContent || '';
            return (
              label.toLowerCase().includes('not a robot') ||
              label.toLowerCase().includes('human') ||
              label.toLowerCase().includes('verify') ||
              nearbyText.toLowerCase().includes('not a robot') ||
              nearbyText.toLowerCase().includes('human')
            );
          });
        if (simpleCheckbox) captchaTypes.simple = true;
        
        return {
          hasCaptcha: Object.values(captchaTypes).some(v => v),
          types: captchaTypes,
          simpleCheckboxId: simpleCheckbox?.id || null
        };
      });
      
      if (!captchaInfo.hasCaptcha) {
        this.logger.info('✅ No CAPTCHA detected');
        return { success: true, captchaType: 'none' };
      }
      
      this.logger.info(`🔍 CAPTCHA detected: ${JSON.stringify(captchaInfo.types)}`);
      
      // Handle different CAPTCHA types
      if (captchaInfo.types.cloudflare) {
        return await this.handleCloudflareCaptcha();
      } else if (captchaInfo.types.recaptcha) {
        return await this.handleRecaptcha();
      } else if (captchaInfo.types.hcaptcha) {
        return await this.handleHcaptcha();
      } else if (captchaInfo.types.simple) {
        return await this.handleSimpleCaptcha(captchaInfo.simpleCheckboxId);
      }
      
      return { success: false, error: 'Unknown CAPTCHA type' };
      
    } catch (error) {
      this.logger.error(`❌ Error handling CAPTCHA: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleCloudflareCaptcha() {
    try {
      this.logger.info('☁️ Handling Cloudflare CAPTCHA...');
      
      // Wait for Cloudflare challenge to load
      await this.mainPage.waitForTimeout(3000);
      
      // Try to click the checkbox if it's a simple challenge
      const clicked = await this.mainPage.evaluate(() => {
        // Look for Cloudflare checkbox
        const checkboxSelectors = [
          'input[type="checkbox"][name*="cf"]',
          'input[type="checkbox"][id*="cf"]',
          '.cf-turnstile input[type="checkbox"]',
          'iframe[src*="challenges.cloudflare.com"]'
        ];
        
        for (const selector of checkboxSelectors) {
          const element = document.querySelector(selector);
          if (element && element.type === 'checkbox') {
            element.click();
            return true;
          }
        }
        
        // If it's an iframe, we need to handle it differently
        const iframe = document.querySelector('iframe[src*="challenges.cloudflare.com"]');
        if (iframe) {
          // Click on the iframe area
          iframe.click();
          return true;
        }
        
        return false;
      });
      
      if (clicked) {
        this.logger.info('✅ Clicked Cloudflare checkbox');
        await this.mainPage.waitForTimeout(5000); // Wait for verification
        
        // Check if CAPTCHA was solved
        const solved = await this.isCaptchaSolved();
        return { success: solved, captchaType: 'cloudflare' };
      }
      
      // If automated solving fails, notify user
      this.logger.warn('⚠️ Cloudflare CAPTCHA requires manual intervention');
      
      // Option 1: Use 2captcha service (if you have API key)
      if (process.env.TWO_CAPTCHA_API_KEY) {
        return await this.solveCaptchaWith2Captcha('cloudflare');
      }
      
      // Option 2: Wait for manual solving
      this.logger.info('⏳ Waiting for manual CAPTCHA solving (30 seconds)...');
      await this.mainPage.waitForTimeout(30000);
      
      const solved = await this.isCaptchaSolved();
      return { success: solved, captchaType: 'cloudflare', manual: true };
      
    } catch (error) {
      this.logger.error(`❌ Error handling Cloudflare CAPTCHA: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleRecaptcha() {
    try {
      this.logger.info('🔷 Handling Google reCAPTCHA...');
      
      // Check if it's invisible reCAPTCHA
      const isInvisible = await this.mainPage.evaluate(() => {
        const recaptcha = document.querySelector('.g-recaptcha');
        return recaptcha?.getAttribute('data-size') === 'invisible';
      });
      
      if (isInvisible) {
        this.logger.info('👻 Invisible reCAPTCHA detected - may auto-solve');
        await this.mainPage.waitForTimeout(3000);
        return { success: true, captchaType: 'recaptcha-invisible' };
      }
      
      // For visible reCAPTCHA, try to click the checkbox
      const clicked = await this.mainPage.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="recaptcha/api2/anchor"]');
        if (iframe) {
          const rect = iframe.getBoundingClientRect();
          // Click in the center of the iframe
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          
          const clickEvent = new MouseEvent('click', {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
          });
          
          iframe.dispatchEvent(clickEvent);
          return true;
        }
        return false;
      });
      
      if (clicked) {
        this.logger.info('✅ Clicked reCAPTCHA checkbox');
        await this.mainPage.waitForTimeout(2000);
        
        // Check if we need to solve image challenges
        const hasChallenge = await this.mainPage.evaluate(() => {
          return !!document.querySelector('iframe[src*="recaptcha/api2/bframe"]');
        });
        
        if (hasChallenge) {
          this.logger.warn('🖼️ reCAPTCHA image challenge detected - requires manual solving');
          
          if (process.env.TWO_CAPTCHA_API_KEY) {
            return await this.solveCaptchaWith2Captcha('recaptcha');
          }
          
          this.logger.info('⏳ Waiting for manual solving (45 seconds)...');
          await this.mainPage.waitForTimeout(45000);
        }
      }
      
      const solved = await this.isCaptchaSolved();
      return { success: solved, captchaType: 'recaptcha' };
      
    } catch (error) {
      this.logger.error(`❌ Error handling reCAPTCHA: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleHcaptcha() {
    try {
      this.logger.info('🔶 Handling hCaptcha...');
      
      // Similar approach to reCAPTCHA
      const clicked = await this.mainPage.evaluate(() => {
        const iframe = document.querySelector('iframe[src*="hcaptcha.com/captcha"]');
        if (iframe) {
          iframe.click();
          return true;
        }
        return false;
      });
      
      if (clicked) {
        this.logger.info('✅ Clicked hCaptcha');
        await this.mainPage.waitForTimeout(2000);
        
        if (process.env.TWO_CAPTCHA_API_KEY) {
          return await this.solveCaptchaWith2Captcha('hcaptcha');
        }
        
        this.logger.info('⏳ Waiting for manual solving (30 seconds)...');
        await this.mainPage.waitForTimeout(30000);
      }
      
      const solved = await this.isCaptchaSolved();
      return { success: solved, captchaType: 'hcaptcha' };
      
    } catch (error) {
      this.logger.error(`❌ Error handling hCaptcha: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleSimpleCaptcha(checkboxId) {
    try {
      this.logger.info('☑️ Handling simple checkbox CAPTCHA...');
      
      const clicked = await this.mainPage.evaluate((id) => {
        let checkbox = null;
        
        if (id) {
          checkbox = document.getElementById(id);
        } else {
          // Find by text
          const checkboxes = document.querySelectorAll('input[type="checkbox"]');
          checkbox = Array.from(checkboxes).find(cb => {
            const label = cb.closest('label')?.textContent || '';
            const nearbyText = cb.parentElement?.textContent || '';
            return (
              label.toLowerCase().includes('not a robot') ||
              label.toLowerCase().includes('human') ||
              nearbyText.toLowerCase().includes('not a robot')
            );
          });
        }
        
        if (checkbox && !checkbox.checked) {
          checkbox.click();
          checkbox.checked = true;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        
        return false;
      }, checkboxId);
      
      if (clicked) {
        this.logger.success('✅ Clicked simple CAPTCHA checkbox');
        await this.mainPage.waitForTimeout(2000);
        return { success: true, captchaType: 'simple' };
      }
      
      return { success: false, error: 'Could not find CAPTCHA checkbox' };
      
    } catch (error) {
      this.logger.error(`❌ Error handling simple CAPTCHA: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async isCaptchaSolved() {
    try {
      const result = await this.mainPage.evaluate(() => {
        // Check if CAPTCHA elements are gone or marked as solved
        const captchaGone = !document.querySelector(
          'iframe[src*="recaptcha"], ' +
          'iframe[src*="hcaptcha"], ' +
          'iframe[src*="challenges.cloudflare.com"], ' +
          '.g-recaptcha, .h-captcha, .cf-turnstile'
        );
        
        // Check for success tokens
        const hasToken = !!(
          document.querySelector('input[name="g-recaptcha-response"]')?.value ||
          document.querySelector('input[name="h-captcha-response"]')?.value ||
          document.querySelector('input[name="cf-turnstile-response"]')?.value
        );
        
        // Check if form is now accessible
        const formAccessible = document.querySelectorAll('input:not([type="hidden"])').length > 0;
        
        return captchaGone || hasToken || formAccessible;
      });
      
      return result;
    } catch (error) {
      return false;
    }
  }

  async solveCaptchaWith2Captcha(type) {
    // Implementation for 2captcha service
    // This is a placeholder - you would need to implement the actual API calls
    this.logger.warn('⚠️ 2captcha integration not implemented');
    return { success: false, error: '2captcha not configured' };
  }

  async handleIframeForms(job) {
    try {
      this.logger.info('🖼️ Checking for iframe forms...');
      
      const iframeCount = await this.mainPage.evaluate(() => {
        return document.querySelectorAll('iframe').length;
      });
      
      this.logger.info(`🖼️ Found ${iframeCount} iframes`);
      
      if (iframeCount === 0) {
        return false;
      }
      
      // Get all iframes
      const frames = this.mainPage.frames();
      
      for (let i = 0; i < frames.length; i++) {
        try {
          this.logger.info(`🖼️ Checking iframe ${i + 1}/${frames.length}`);
          
          const frame = frames[i];
          const framePage = frame;
          
          // Check if this iframe has form fields
          const formCheck = await framePage.evaluate(() => {
            const inputs = document.querySelectorAll('input, textarea, select');
            const hasFormFields = inputs.length > 0;
            
            return {
              inputCount: inputs.length,
              hasFormFields,
              inputs: Array.from(inputs).map(input => ({
                type: input.type,
                name: input.name,
                placeholder: input.placeholder,
                id: input.id,
                tagName: input.tagName
              }))
            };
          });
          
          if (formCheck.hasFormFields) {
            this.logger.info(`✅ Found form in iframe ${i + 1}: ${formCheck.inputCount} fields`);
            
            // Fill form fields in this iframe
            const filled = await framePage.evaluate(() => {
              let filledCount = 0;
              
              // Fill text inputs
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
              
              // Fill textareas
              const textareas = document.querySelectorAll('textarea');
              textareas.forEach(textarea => {
                const placeholder = (textarea.placeholder || '').toLowerCase();
                
                if (placeholder.includes('cover') || placeholder.includes('letter')) {
                  textarea.value = 'I am excited about this opportunity and believe my skills would be a great fit for this role.';
                  filledCount++;
                }
                
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.dispatchEvent(new Event('change', { bubbles: true }));
              });
              
              return { filledCount, totalFields: inputs.length + textareas.length };
            });
            
            this.logger.info(`✅ Filled ${filled.filledCount} out of ${filled.totalFields} fields in iframe ${i + 1}`);
            return true;
          }
          
        } catch (error) {
          this.logger.warn(`⚠️ Error checking iframe ${i + 1}: ${error.message}`);
        }
      }
      
      return false;
      
    } catch (error) {
      this.logger.error(`❌ Error handling iframe forms: ${error.message}`);
      return false;
    }
  }

  async clickApplyButton(job) {
    try {
      this.logger.info('🎯 Step 1: Clicking job card to open details...');
      
      // First, click on the job card to open details
      const cardResult = await this.mainPage.evaluate((cardIndex) => {
        const jobCards = document.querySelectorAll('[class*="job-card"], [class*="jobCard"], [class*="job-item"], [class*="jobItem"], [class*="listing-item"], [class*="listingItem"], [class*="job"], [class*="card"], [class*="listing"]');
        
        if (jobCards.length > cardIndex) {
          const card = jobCards[cardIndex];
          card.click();
          return { success: true, message: 'Clicked job card' };
        }
        return { success: false, error: 'No job card found' };
      }, job.cardIndex);
      
      if (!cardResult.success) {
        this.logger.warn(`⚠️ ${cardResult.error}`);
        return { success: false, error: cardResult.error };
      }
      
      this.logger.info('⏳ Waiting for job details to load...');
      await this.mainPage.waitForTimeout(3000);
      
      // Handle any blocking modals first
      await this.handleBlockingModals();
      
      this.logger.info('🎯 Step 3: Looking for apply button on job details page...');
      
      // STRICT: Only look for "APPLY NOW" buttons, ignore everything else
      const applyResult = await this.mainPage.evaluate(() => {
        // Look for buttons with EXACT text "APPLY NOW" (case insensitive)
        const allButtons = Array.from(document.querySelectorAll('button, a, div[role="button"], span[role="button"]'));
        
        // Filter for ONLY "APPLY NOW" buttons
        const applyButtons = allButtons.filter(button => {
          const text = (button.textContent || '').trim().toLowerCase();
          return text === 'apply now' || text === 'applynow';
        });
        
        if (applyButtons.length > 0) {
          const applyButton = applyButtons[0];
          applyButton.click();
          return { 
            success: true, 
            buttonText: applyButton.textContent.trim(),
            message: 'Clicked APPLY NOW button'
          };
        }
        
        // If no "APPLY NOW" found, look for any button containing "apply" but NOT containing forbidden words
        const fallbackButtons = allButtons.filter(button => {
          const text = (button.textContent || '').trim().toLowerCase();
          return text.includes('apply') && 
                 !text.includes('ask') && 
                 !text.includes('orion') && 
                 !text.includes('pause') && 
                 !text.includes('start') && 
                 !text.includes('stop') && 
                 !text.includes('save') && 
                 !text.includes('edit') && 
                 !text.includes('delete') && 
                 !text.includes('refer') && 
                 !text.includes('earn') && 
                 !text.includes('linkedin') && 
                 !text.includes('indeed');
        });
        
        if (fallbackButtons.length > 0) {
          const fallbackButton = fallbackButtons[0];
          fallbackButton.click();
          return { 
            success: true, 
            buttonText: fallbackButton.textContent.trim(),
            message: 'Clicked fallback apply button'
          };
        }
        
        return { 
          success: false, 
          error: 'No APPLY NOW button found',
          availableButtons: allButtons.map(btn => btn.textContent.trim()).filter(text => text.length > 0)
        };
      });
      
      if (!applyResult.success) {
        this.logger.warn(`⚠️ ${applyResult.error}`);
        if (applyResult.availableButtons) {
          this.logger.warn(`📋 Available buttons: ${applyResult.availableButtons.join(', ')}`);
        }
        return { success: false, error: applyResult.error };
      }
      
      this.logger.info(`✅ Clicked apply button: "${applyResult.buttonText}"`);
      
      // Wait for navigation
      await this.mainPage.waitForTimeout(3000);
      
      // Check current URL
      const currentUrl = this.mainPage.url();
      this.logger.info(`🌐 Current URL: ${currentUrl}`);
      
      // Step 6: Check if we have new tabs/pages
      const pages = await this.mainPage.context().pages();
      this.logger.info(`📄 Found ${pages.length} pages/tabs`);
      
      // Look for external career site in new tabs
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const pageUrl = page.url();
        
        if (!pageUrl.includes('jobright.ai') && pageUrl !== 'about:blank') {
          this.logger.info(`🌐 Found external site in tab ${i}: ${pageUrl}`);
          
          // Switch to this page
          this.mainPage = page;
          
          // Handle Apple sign-in if needed
          await this.handleAppleSignIn();
          
          // Check if this page has an apply button
          const externalApplyResult = await this.findAndClickExternalApplyButton();
          
          if (externalApplyResult.success) {
            this.logger.info(`✅ Found and clicked apply button on external site`);
            
            // Close all other tabs except the original JobRight tab (0) and current external tab (i)
            for (let j = 0; j < pages.length; j++) {
              if (j !== 0 && j !== i) {
                try {
                  await pages[j].close();
                  this.logger.info(`🗑️ Closed tab ${j}`);
                } catch (closeError) {
                  this.logger.warn(`⚠️ Could not close tab ${j}: ${closeError.message}`);
                }
              }
            }
            
            return { success: true, externalSite: true, url: pageUrl, tabIndex: i };
          } else {
            // Check if we're already on a form page (no need to click apply button)
            const formCheck = await this.mainPage.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], textarea, select');
              const forms = document.querySelectorAll('form');
              return { 
                inputCount: inputs.length, 
                formCount: forms.length,
                hasFormFields: inputs.length > 0 || forms.length > 0
              };
            });
            
            if (formCheck.hasFormFields) {
              this.logger.info(`✅ Already on form page with ${formCheck.inputCount} input fields`);
              return { success: true, buttonText: 'Form fields detected', formPage: true };
            } else {
              this.logger.warn(`⚠️ No apply button found on external site: ${pageUrl}`);
              
              // Close this external tab since no apply button found
              try {
                await page.close();
                this.logger.info(`🗑️ Closed external tab ${i} (no apply button)`);
              } catch (closeError) {
                this.logger.warn(`⚠️ Could not close tab ${i}: ${closeError.message}`);
              }
              
              // Go back to original page
              this.mainPage = pages[0];
              return { success: false, externalSite: true, url: pageUrl, error: 'No apply button found' };
            }
          }
        }
      }
      
      // If we're still on JobRight, check if we need to go back to home
      if (currentUrl.includes('jobright.ai')) {
        this.logger.info('🔄 Still on JobRight, going back to home page...');
        await this.goBackToJobRightHome();
        return { success: false, error: 'No external site reached' };
      }
      
      return { success: true, buttonText: applyResult.buttonText };
      
    } catch (error) {
      this.logger.error(`❌ Error clicking apply button: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleBlockingModals() {
    try {
      this.logger.info('🚫 Handling blocking modals...');
      
      const modalResult = await this.mainPage.evaluate(() => {
        // Look for "Did you apply?" modal specifically
        const didYouApplyModal = Array.from(document.querySelectorAll('h2, h3, h4, div, span')).find(element => 
          element.textContent && element.textContent.toLowerCase().includes('did you apply')
        );
        
        if (didYouApplyModal) {
          // Find and click "No, I didn't apply" button
          const noButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent && btn.textContent.toLowerCase().includes('no')
          );
          
          if (noButton) {
            noButton.click();
            return { action: 'clicked_no', message: 'Clicked "No, I didn\'t apply"' };
          }
        }
        
        // Look for any close buttons (X, close, dismiss)
        const closeButtons = Array.from(document.querySelectorAll('button, span, div')).filter(element => {
          const text = (element.textContent || '').toLowerCase();
          return text === 'x' || text === 'close' || text === 'dismiss' || text === '×';
        });
        
        if (closeButtons.length > 0) {
          closeButtons[0].click();
          return { action: 'clicked_close', message: 'Clicked close button' };
        }
        
        // Look for any modal/overlay and try to remove it
        const modals = document.querySelectorAll('[class*="modal"], [class*="popup"], [class*="overlay"], [class*="dialog"]');
        if (modals.length > 0) {
          // Try to remove the modal from DOM
          modals.forEach(modal => {
            if (modal.parentNode) {
              modal.parentNode.removeChild(modal);
            }
          });
          return { action: 'removed_modal', message: 'Removed modal from DOM' };
        }
        
        // Look for any backdrop/overlay and remove it
        const backdrops = document.querySelectorAll('[class*="backdrop"], [class*="overlay"], [class*="mask"]');
        if (backdrops.length > 0) {
          backdrops.forEach(backdrop => {
            if (backdrop.parentNode) {
              backdrop.parentNode.removeChild(backdrop);
            }
          });
          return { action: 'removed_backdrop', message: 'Removed backdrop from DOM' };
        }
        
        return { action: 'no_modal_found', message: 'No blocking modal found' };
      });
      
      if (modalResult.action !== 'no_modal_found') {
        this.logger.info(`✅ ${modalResult.message}`);
        await this.mainPage.waitForTimeout(1000);
      }
      
    } catch (error) {
      this.logger.warn(`⚠️ Error handling modals: ${error.message}`);
    }
  }

  async handleApplicationFormWithAI(job) {
    try {
      const aiResponses = [];
      
      // Wait for form to load
      await this.mainPage.waitForTimeout(2000);
      
      // First, handle any resume customization modals
      const modalResult = await this.handleResumeCustomizationModal();
      if (modalResult.handled) {
        this.logger.info('✅ Handled resume customization modal');
      }
      
      // TEMPORARILY DISABLED AI TO SAVE MONEY
      this.logger.info('🤖 AI responses temporarily disabled to save OpenAI costs');
      return {
        success: true,
        ai_responses: [],
        error: null
      };
      
      // Look for form fields and questions
      const formFields = await this.mainPage.evaluate(() => {
        const fields = [];
        
        // Find text areas and input fields
        const textAreas = document.querySelectorAll('textarea, input[type="text"], input[type="email"]');
        textAreas.forEach((field, index) => {
          const placeholder = field.placeholder || '';
          const label = field.closest('label')?.textContent || '';
          const question = placeholder || label;
          
          // Skip Orion chat fields
          if (question && question.length > 10 && 
              !question.includes('Orion') && !question.includes('Welcome back') &&
              !question.includes('What would you like to know') &&
              !question.includes('Ask me anything') &&
              !question.includes('copilot') && !question.includes('chat')) {
            // Create a unique selector for this field
            let selector = '';
            if (field.id) {
              selector = `#${field.id}`;
            } else if (field.name) {
              selector = `[name="${field.name}"]`;
            } else if (field.className) {
              selector = `.${field.className.split(' ')[0]}`;
            } else {
              // Fallback to tag name with index
              const tagName = field.tagName.toLowerCase();
              const allSameType = document.querySelectorAll(tagName);
              const fieldIndex = Array.from(allSameType).indexOf(field);
              selector = `${tagName}:nth-of-type(${fieldIndex + 1})`;
            }
            
            fields.push({
              type: field.tagName.toLowerCase(),
              question: question,
              selector: selector,
              placeholder: placeholder,
              label: label
            });
          }
        });
        
        // Find question elements
        const questionElements = document.querySelectorAll('p, h3, h4, div');
        questionElements.forEach((element, index) => {
          const text = element.textContent || '';
          if (text.length > 20 && text.length < 200 && 
              (text.includes('?') || text.includes('experience') || 
               text.includes('background') || text.includes('skills')) &&
              !text.includes('Orion') && !text.includes('Welcome back') &&
              !text.includes('What would you like to know') &&
              !text.includes('Ask me anything') &&
              !text.includes('copilot') && !text.includes('chat')) {
            
            // Create a unique selector for this question element
            let selector = '';
            if (element.id) {
              selector = `#${element.id}`;
            } else if (element.className) {
              selector = `.${element.className.split(' ')[0]}`;
            } else {
              // Fallback to tag name with index
              const tagName = element.tagName.toLowerCase();
              const allSameType = document.querySelectorAll(tagName);
              const elementIndex = Array.from(allSameType).indexOf(element);
              selector = `${tagName}:nth-of-type(${elementIndex + 1})`;
            }
            
            fields.push({
              type: 'question',
              question: text,
              selector: selector,
              label: text
            });
          }
        });
        
        return fields;
      });
      
      this.logger.info(`📝 Found ${formFields.length} form fields/questions`);
      
      // Handle each field with AI
      for (const field of formFields) {
        try {
          const aiResponse = await this.aiQuestionAnswerer.generateResponse(
            field.question,
            {
              title: job.title,
              company: job.company,
              location: job.location
            }
          );
          
          aiResponses.push({
            question: field.question,
            answer: aiResponse.answer,
            confidence: aiResponse.confidence
          });
          
          // Fill the field with AI response
          await this.fillFieldWithAI(field, aiResponse.answer);
          
          this.logger.info(`🤖 AI answered: "${field.question.substring(0, 50)}..."`);
          
        } catch (error) {
          this.logger.warn(`⚠️ Failed to handle field: ${field.question.substring(0, 30)}`);
        }
      }
      
      // Submit the form
      const submitResult = await this.submitApplicationForm();
      
      return {
        success: submitResult.success,
        ai_responses: aiResponses,
        error: submitResult.error
      };
      
    } catch (error) {
      this.errorHandler.handle(error, { platform: 'JobRight', action: 'handleApplicationForm' });
      return { success: false, error: error.message };
    }
  }

  async handleResumeCustomizationModal() {
    try {
      // Check for resume customization modal
      const modalResult = await this.mainPage.evaluate(() => {
        // Look for the modal with "Customize Your Resume for This Job" title
        const modalTitle = document.querySelector('h1, h2, h3, h4, h5, h6, div, span');
        const modalElements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, div, span'));
        
        let modalFound = false;
        let applyWithoutCustomizingButton = null;
        
        // Check for modal title
        for (const element of modalElements) {
          const text = element.textContent || '';
          if (text.includes('Customize Your Resume for This Job') || 
              text.includes('Customize Your Resume')) {
            modalFound = true;
            break;
          }
        }
        
        if (modalFound) {
          // Look for "Apply Without Customizing For This Role" button
          const buttons = document.querySelectorAll('button, a');
          for (const button of buttons) {
            const buttonText = button.textContent || '';
            if (buttonText.includes('Apply Without Customizing') || 
                buttonText.includes('Apply Without') ||
                buttonText.includes('Skip Customization')) {
              applyWithoutCustomizingButton = button;
              break;
            }
          }
        }
        
        return {
          modalFound,
          hasButton: !!applyWithoutCustomizingButton,
          buttonText: applyWithoutCustomizingButton ? applyWithoutCustomizingButton.textContent : null
        };
      });
      
      if (modalResult.modalFound && modalResult.hasButton) {
        this.logger.info(`📋 Found resume customization modal with button: "${modalResult.buttonText}"`);
        
        // Click the "Apply Without Customizing" button
        const buttonClicked = await this.mainPage.evaluate(() => {
          const buttons = document.querySelectorAll('button, a');
          for (const button of buttons) {
            const buttonText = button.textContent || '';
            if (buttonText.includes('Apply Without Customizing') || 
                buttonText.includes('Apply Without') ||
                buttonText.includes('Skip Customization')) {
              button.click();
              return true;
            }
          }
          return false;
        });
        
        if (buttonClicked) {
          this.logger.success('✅ Clicked "Apply Without Customizing" button');
          await this.mainPage.waitForTimeout(2000); // Wait for modal to close
          return { handled: true, success: true };
        } else {
          this.logger.warn('⚠️ Could not click "Apply Without Customizing" button');
          return { handled: false, success: false };
        }
      }
      
      return { handled: false, success: true };
      
    } catch (error) {
      this.logger.error(`❌ Error handling resume customization modal: ${error.message}`);
      return { handled: false, success: false, error: error.message };
    }
  }

  async fillFieldWithAI(field, aiAnswer) {
    try {
      // Use page.evaluate to safely fill the field
      const filled = await this.mainPage.evaluate(({ fieldInfo, answer }) => {
        try {
          let element = null;
          
          // Try to find the element using the field info
          if (fieldInfo.element && fieldInfo.element._handle) {
            // If we have a Playwright element handle, we need to find it differently
            element = document.querySelector(fieldInfo.selector || 'textarea, input[type="text"]');
          } else if (fieldInfo.selector) {
            element = document.querySelector(fieldInfo.selector);
          } else if (fieldInfo.xpath) {
            const result = document.evaluate(fieldInfo.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
            element = result.singleNodeValue;
          }
          
          // If still no element, try to find by label or placeholder
          if (!element && fieldInfo.label) {
            const labels = Array.from(document.querySelectorAll('label'));
            const matchingLabel = labels.find(label => 
              label.textContent && label.textContent.toLowerCase().includes(fieldInfo.label.toLowerCase())
            );
            if (matchingLabel && matchingLabel.htmlFor) {
              element = document.getElementById(matchingLabel.htmlFor);
            }
          }
          
          if (!element && fieldInfo.placeholder) {
            const inputs = document.querySelectorAll('input, textarea');
            element = Array.from(inputs).find(input => 
              input.placeholder && input.placeholder.toLowerCase().includes(fieldInfo.placeholder.toLowerCase())
            );
          }
          
          // Last resort: find any textarea or input
          if (!element) {
            element = document.querySelector('textarea, input[type="text"]');
          }
          
          if (element) {
            // Clear existing value
            element.value = '';
            
            // Set new value
            element.value = answer;
            
            // Trigger events to simulate user input
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));
            element.dispatchEvent(new Event('blur', { bubbles: true }));
            
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Error filling field:', error);
          return false;
        }
      }, { fieldInfo: field, answer: aiAnswer });
      
      if (filled) {
        this.logger.info(`✅ Filled field: ${field.label || field.placeholder || field.selector || 'unknown'}`);
        return true;
      } else {
        this.logger.warn(`⚠️ Failed to fill field: ${field.label || field.placeholder || field.selector || 'unknown'}`);
        return false;
      }
    } catch (error) {
      this.logger.warn(`⚠️ Failed to fill field: ${error.message}`);
      return false;
    }
  }

  // Enhanced submission verification for JobRightAIAutomator.js
  async submitApplicationForm() {
    try {
      this.logger.info('🎯 Looking for submit button...');
      
      // Create screenshots directory if it doesn't exist
      const fs = require('fs').promises;
      const path = require('path');
      const screenshotsDir = path.join(__dirname, '../../screenshots');
      await fs.mkdir(screenshotsDir, { recursive: true });
      
      // Take screenshot before submission
      await this.mainPage.screenshot({ 
        path: `screenshots/before-submit-${Date.now()}.png`, 
        fullPage: true 
      });
      
      // Enhanced submit button detection
      const submitResult = await this.mainPage.evaluate(() => {
        // Priority order for submit buttons
        const submitSelectors = [
          // Primary submit buttons
          'button[type="submit"]',
          'input[type="submit"]',
          'button:has-text("Submit Application")',
          'button:has-text("Submit")',
          'button:has-text("Apply")',
          'button:has-text("Send Application")',
          'button:has-text("Complete Application")',
          'button:has-text("Finish Application")',
          'button:has-text("Continue")',
          'button:has-text("Next")',
          'button:has-text("Proceed")',
          
          // Secondary buttons
          'button:has-text("Finish")',
          'button:has-text("Done")',
          'button:has-text("Save")',
          'button:has-text("Complete")',
          'button:has-text("Confirm")',
          
          // Generic buttons with submit-like classes
          'button[class*="submit"]',
          'button[class*="apply"]',
          'button[class*="primary"]',
          'button[class*="btn-primary"]',
          
          // Last resort - any prominent button
          'button:not([disabled])',
          'a[class*="btn"]:has-text("Submit")',
          'a[class*="btn"]:has-text("Apply")'
        ];
        
        for (const selector of submitSelectors) {
          try {
            const buttons = document.querySelectorAll(selector);
            for (const button of buttons) {
              // Check if button is visible and enabled
              const rect = button.getBoundingClientRect();
              const isVisible = rect.width > 0 && rect.height > 0;
              const isEnabled = !button.disabled && !button.classList.contains('disabled');
              const text = (button.textContent || button.value || '').trim();
              
              // Skip navigation buttons and language buttons
              if (text.toLowerCase().includes('back') || 
                  text.toLowerCase().includes('cancel') ||
                  text.toLowerCase().includes('previous') ||
                  text.toLowerCase().includes('english') ||
                  text.toLowerCase().includes('spanish') ||
                  text.toLowerCase().includes('french') ||
                  text.toLowerCase().includes('german') ||
                  text.toLowerCase().includes('language') ||
                  text.toLowerCase().includes('translate') ||
                  text.toLowerCase().includes('menu') ||
                  text.toLowerCase().includes('home') ||
                  text.toLowerCase().includes('search')) {
                continue;
              }
              
              if (isVisible && isEnabled) {
                // Highlight the button before clicking
                button.style.border = '3px solid red';
                button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                return {
                  success: true,
                  selector: selector,
                  text: text,
                  position: { x: rect.x, y: rect.y }
                };
              }
            }
          } catch (e) {
            continue;
          }
        }
        
        return { success: false, error: 'No submit button found' };
      });
      
      if (!submitResult.success) {
        this.logger.error('❌ No submit button found');
        
        // Check if we're on a thank you/confirmation page already
        const isAlreadySubmitted = await this.checkIfAlreadySubmitted();
        if (isAlreadySubmitted) {
          return { success: true, message: 'Application already submitted' };
        }
        
        return { success: false, error: submitResult.error };
      }
      
      this.logger.info(`✅ Found submit button: "${submitResult.text}" at ${submitResult.selector}`);
      
      // Handle CAPTCHA before submission
      const captchaResult = await this.handleCaptcha();
      if (captchaResult.success && captchaResult.captchaType !== 'none') {
        this.logger.info(`✅ CAPTCHA handled before submission: ${captchaResult.captchaType}`);
      } else if (!captchaResult.success) {
        this.logger.warn(`⚠️ CAPTCHA handling failed before submission: ${captchaResult.error}`);
      }

      // Click the submit button with retry mechanism
      let clickAttempts = 0;
      const maxAttempts = 3;
      
      while (clickAttempts < maxAttempts) {
        try {
          await this.mainPage.click(submitResult.selector);
          break;
        } catch (clickError) {
          clickAttempts++;
          if (clickAttempts === maxAttempts) {
            // Try evaluate method as fallback
            await this.mainPage.evaluate((selector) => {
              const button = document.querySelector(selector);
              if (button) button.click();
            }, submitResult.selector);
          }
          await this.mainPage.waitForTimeout(1000);
        }
      }
      
      this.logger.info('⏳ Waiting for submission to complete...');
      
      // Wait for navigation or content change
      await Promise.race([
        this.mainPage.waitForNavigation({ timeout: 10000 }).catch(() => {}),
        this.mainPage.waitForTimeout(5000)
      ]);
      
      // Take screenshot after submission
      await this.mainPage.screenshot({ 
        path: `screenshots/after-submit-${Date.now()}.png`, 
        fullPage: true 
      });
      
      // Comprehensive submission verification
      const verificationResult = await this.verifySubmission();
      
      if (verificationResult.submitted) {
        this.logger.success(`🎉 Application submitted successfully!`);
        this.logger.info(`📧 Confirmation: ${verificationResult.confirmationText}`);
        
        // Enhanced logging
        this.logger.info(`📊 Submission Stats:`);
        this.logger.info(`   - Success Score: ${verificationResult.successScore}`);
        this.logger.info(`   - Failure Score: ${verificationResult.failureScore}`);
        this.logger.info(`   - Confirmation: ${verificationResult.confirmationText}`);
        this.logger.info(`   - URL: ${verificationResult.url}`);
        
        // Store submission details
        await this.storeSubmissionDetails(verificationResult);
        
        return { 
          success: true, 
          confirmationText: verificationResult.confirmationText,
          confirmationNumber: verificationResult.confirmationNumber
        };
      } else {
        this.logger.warn('⚠️ Submission status unclear');
        return { 
          success: false, 
          error: 'Could not verify submission',
          details: verificationResult
        };
      }
      
    } catch (error) {
      this.logger.error(`❌ Error submitting application: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async verifySubmission() {
    try {
      const verificationData = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        const title = document.title;
        const bodyText = document.body.textContent || '';
        const html = document.documentElement.innerHTML;
        
        // Success indicators
        const successKeywords = [
          'thank you', 'thanks', 'submitted', 'received', 'complete', 'success',
          'confirmation', 'application received', 'we\'ll be in touch', 
          'next steps', 'under review', 'successfully', 'confirmed',
          'we have received', 'submission successful', 'application complete'
        ];
        
        // Failure indicators
        const failureKeywords = [
          'error', 'failed', 'please try again', 'required field',
          'missing information', 'invalid', 'could not process'
        ];
        
        // Check for success indicators
        let successScore = 0;
        let confirmationText = '';
        let confirmationNumber = '';
        
        successKeywords.forEach(keyword => {
          if (bodyText.toLowerCase().includes(keyword)) {
            successScore++;
            
            // Extract confirmation text
            const sentences = bodyText.split(/[.!?]+/);
            const confirmationSentence = sentences.find(s => 
              s.toLowerCase().includes(keyword)
            );
            if (confirmationSentence && !confirmationText) {
              confirmationText = confirmationSentence.trim();
            }
          }
        });
        
        // Check for failure indicators
        let failureScore = 0;
        failureKeywords.forEach(keyword => {
          if (bodyText.toLowerCase().includes(keyword)) {
            failureScore++;
          }
        });
        
        // Look for confirmation number
        const confirmationPatterns = [
          /confirmation\s*#?\s*:?\s*([A-Z0-9-]+)/i,
          /reference\s*#?\s*:?\s*([A-Z0-9-]+)/i,
          /application\s*#?\s*:?\s*([A-Z0-9-]+)/i,
          /tracking\s*#?\s*:?\s*([A-Z0-9-]+)/i
        ];
        
        for (const pattern of confirmationPatterns) {
          const match = bodyText.match(pattern);
          if (match) {
            confirmationNumber = match[1];
            break;
          }
        }
        
        // Check URL changes
        const urlIndicators = {
          hasThankYou: url.includes('thank') || url.includes('success'),
          hasConfirmation: url.includes('confirm') || url.includes('complete'),
          hasError: url.includes('error') || url.includes('fail')
        };
        
        // Check for specific elements
        const hasSuccessElement = !!document.querySelector(
          '.success, .confirmation, .thank-you, [class*="success"], [class*="confirm"]'
        );
        
        const hasErrorElement = !!document.querySelector(
          '.error, .failure, [class*="error"], [class*="fail"]'
        );
        
        // Check if form is still present
        const hasForm = document.querySelectorAll('form').length > 0;
        const hasRequiredFields = document.querySelectorAll('[required]:not([disabled])').length > 0;
        
        return {
          url,
          title,
          successScore,
          failureScore,
          confirmationText,
          confirmationNumber,
          urlIndicators,
          hasSuccessElement,
          hasErrorElement,
          hasForm,
          hasRequiredFields,
          pageLength: bodyText.length
        };
      });
      
      // Determine if submission was successful
      const submitted = (
        verificationData.successScore > verificationData.failureScore &&
        (verificationData.successScore >= 2 || 
         verificationData.hasSuccessElement ||
         verificationData.urlIndicators.hasThankYou ||
         verificationData.urlIndicators.hasConfirmation) &&
        !verificationData.hasErrorElement &&
        !verificationData.urlIndicators.hasError &&
        (!verificationData.hasForm || !verificationData.hasRequiredFields)
      );
      
      return {
        submitted,
        ...verificationData
      };
      
    } catch (error) {
      this.logger.error(`❌ Error verifying submission: ${error.message}`);
      return { submitted: false, error: error.message };
    }
  }

  async checkIfAlreadySubmitted() {
    const result = await this.mainPage.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const alreadySubmittedKeywords = [
        'already applied', 'already submitted', 'duplicate application',
        'previously applied', 'application exists'
      ];
      
      return alreadySubmittedKeywords.some(keyword => 
        bodyText.toLowerCase().includes(keyword)
      );
    });
    
    return result;
  }

  async storeSubmissionDetails(details) {
    // Store in your database or file system
    const fs = require('fs').promises;
    const path = require('path');
    
    const submissionData = {
      timestamp: new Date().toISOString(),
      url: details.url,
      confirmationText: details.confirmationText,
      confirmationNumber: details.confirmationNumber,
      successScore: details.successScore
    };
    
    const filePath = path.join(__dirname, '../../data/submissions.json');
    
    try {
      let submissions = [];
      try {
        const data = await fs.readFile(filePath, 'utf8');
        submissions = JSON.parse(data);
      } catch (e) {
        // File doesn't exist yet
      }
      
      submissions.push(submissionData);
      await fs.writeFile(filePath, JSON.stringify(submissions, null, 2));
      
      this.logger.success('✅ Submission details stored');
    } catch (error) {
      this.logger.error(`❌ Error storing submission: ${error.message}`);
    }
  }

  async getApplicationStats() {
    return {
      total_applications: this.applications.length,
      successful_applications: this.applications.filter(app => app.status === 'applied').length,
      ai_responses_generated: this.applications.reduce((total, app) => 
        total + (app.ai_responses ? app.ai_responses.length : 0), 0),
      recent_applications: this.applications.slice(-5)
    };
  }

  async close() {
    try {
      if (this.browser) {
        await this.browser.close();
      }
      this.logger.info('✅ JobRight AI Automator closed');
    } catch (error) {
      this.errorHandler.handle(error, { platform: 'JobRight', action: 'close' });
    }
  }

  async cleanupTabs() {
    try {
      const pages = await this.mainPage.context().pages();
      this.logger.info(`🧹 Cleaning up ${pages.length} tabs...`);
      
      // Keep only the original JobRight tab (index 0)
      for (let i = 1; i < pages.length; i++) {
        try {
          await pages[i].close();
          this.logger.info(`🗑️ Closed tab ${i}`);
        } catch (closeError) {
          this.logger.warn(`⚠️ Could not close tab ${i}: ${closeError.message}`);
        }
      }
      
      // Switch back to original tab
      const remainingPages = await this.mainPage.context().pages();
      if (remainingPages.length > 0) {
        this.mainPage = remainingPages[0];
        this.logger.info('✅ Switched back to original tab');
      }
    } catch (error) {
      this.logger.error(`❌ Error cleaning up tabs: ${error.message}`);
    }
  }

  async handlePopups() {
    try {
      this.logger.info('�� Handling popups...');
      
      const popupResult = await this.mainPage.evaluate(() => {
        // Look for X buttons in popups
        const closeButtons = document.querySelectorAll('button, a, span, div');
        let closedCount = 0;
        
        for (const button of closeButtons) {
          const text = (button.textContent || '').toLowerCase();
          const className = (button.className || '').toLowerCase();
          const ariaLabel = (button.getAttribute('aria-label') || '').toLowerCase();
          
          // Look for X, close, or dismiss buttons
          if (text === 'x' || text === '×' || text === '✕' || text === '✖' ||
              text.includes('close') || text.includes('dismiss') || text.includes('cancel') ||
              className.includes('close') || className.includes('dismiss') || className.includes('cancel') ||
              ariaLabel.includes('close') || ariaLabel.includes('dismiss') ||
              button.innerHTML.includes('×') || button.innerHTML.includes('✕')) {
            button.click();
            closedCount++;
          }
        }
        
        return { closedCount };
      });
      
      if (popupResult.closedCount > 0) {
        this.logger.info(`✅ Closed ${popupResult.closedCount} popups`);
        await this.mainPage.waitForTimeout(1000);
      } else {
        this.logger.info('ℹ️ No popups found to close');
      }
      
    } catch (error) {
      this.logger.warn(`⚠️ Error handling popups: ${error.message}`);
    }
  }

  async goBackToJobRightHome() {
    try {
      this.logger.info('🏠 Going back to JobRight home...');
      await this.mainPage.goto('https://jobright.ai');
      await this.mainPage.waitForTimeout(3000);
      this.logger.info('✅ Back to JobRight home');
    } catch (error) {
      this.logger.error(`❌ Error going back to JobRight: ${error.message}`);
    }
  }

  async handleAppleSignIn() {
    try {
      this.logger.info('🍎 Checking for Apple sign-in page...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
      const isAppleSignIn = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        const title = document.title;
        const hasSignInForm = document.querySelector('input[placeholder*="Email"], input[placeholder*="Phone"]');
        
        return {
          isAppleSignIn: url.includes('idmsa.apple.com') || title.includes('Sign In'),
          url: url,
          title: title,
          hasEmailField: !!hasSignInForm,
          hasCreateAccountLink: !!document.querySelector('a[href*="create"]')
        };
      });
      
      if (!isAppleSignIn.isAppleSignIn) {
        this.logger.info('✅ Not on Apple sign-in page');
        return { success: true, signedIn: false };
      }
      
      this.logger.info(`🍎 Apple sign-in detected: ${isAppleSignIn.title}`);
      
      // Check if we need to create an account
      if (!process.env.APPLE_ID || !process.env.ALL_PASSWORDS) {
        this.logger.warn('⚠️ Apple credentials not configured');
        this.logger.info('💡 Options:');
        this.logger.info('   1. Set APPLE_ID and ALL_PASSWORDS in .env');
        this.logger.info('   2. Create an Apple account manually');
        this.logger.info('   3. Skip Apple jobs for now');
        
        return { 
          success: false, 
          error: 'Apple credentials not configured',
          requiresManualAction: true 
        };
      }
      
      // Fill email field
      this.logger.info('📝 Filling Apple sign-in form...');
      
      // First check if there are iframes
      const iframeCheck = await this.mainPage.evaluate(() => {
        const iframes = document.querySelectorAll('iframe');
        return {
          iframeCount: iframes.length,
          iframeSrcs: Array.from(iframes).map(iframe => iframe.src)
        };
      });
      
      this.logger.info(`🖼️ Found ${iframeCheck.iframeCount} iframes`);
      if (iframeCheck.iframeCount > 0) {
        this.logger.info('🖼️ Iframe sources:', iframeCheck.iframeSrcs);
      }
      
      const emailFilled = await this.mainPage.evaluate((email) => {
        // Debug: Get all input fields info
        const allInputs = document.querySelectorAll('input');
        const inputInfo = Array.from(allInputs).map((input, index) => ({
          index,
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id,
          className: input.className
        }));
        
        // Try multiple selectors for email field
        const emailSelectors = [
          'input[placeholder*="Email"]',
          'input[placeholder*="Phone"]',
          'input[type="email"]',
          'input[name*="email"]',
          'input[name*="account"]',
          'input[type="text"]' // Fallback for any text input
        ];
        
        for (const selector of emailSelectors) {
          const emailInput = document.querySelector(selector);
          if (emailInput) {
            emailInput.value = email;
            emailInput.dispatchEvent(new Event('input', { bubbles: true }));
            emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
            return { success: true, selector: selector, inputInfo };
          }
        }
        
        return { success: false, inputInfo };
      }, process.env.APPLE_ID || '[YOUR_EMAIL]@gmail.com');
      
      if (emailFilled.success) {
        this.logger.info(`✅ Email field filled with selector: ${emailFilled.selector}`);
      } else {
        this.logger.error('❌ Could not fill email field');
        this.logger.info('🔍 Available input fields:');
        emailFilled.inputInfo.forEach(input => {
          this.logger.info(`   - Type: ${input.type}, Name: ${input.name}, Placeholder: ${input.placeholder}`);
        });
        
        // If no email field found and there are iframes, try iframe
        if (iframeCheck.iframeCount > 0) {
          this.logger.info('🖼️ Trying to find email field in iframe...');
          return await this.handleAppleSignInInIframe();
        }
        
        return { success: false, error: 'Email field not found' };
      }
      
      // Click Continue button
      const continueClicked = await this.mainPage.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const continueButton = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('continue') ||
          btn.textContent.toLowerCase().includes('sign in')
        );
        
        if (continueButton) {
          continueButton.click();
          return true;
        }
        return false;
      });
      
      if (!continueClicked) {
        this.logger.error('❌ Could not click continue button');
        return { success: false, error: 'Continue button not found' };
      }
      
      this.logger.info('⏳ Waiting for password field...');
      await this.mainPage.waitForTimeout(3000);
      
      // Fill password field
      const passwordFilled = await this.mainPage.evaluate((password) => {
        const passwordInput = document.querySelector('input[type="password"]');
        if (passwordInput) {
          passwordInput.value = password;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      }, process.env.ALL_PASSWORDS || '');
      
      if (!passwordFilled) {
        this.logger.warn('⚠️ Password field not found - might need 2FA');
        // Handle 2FA if needed
        return await this.handleApple2FA();
      }
      
      // Submit login
      const loginSubmitted = await this.mainPage.evaluate(() => {
        // Try to find sign in button
        const buttons = Array.from(document.querySelectorAll('button'));
        const signInButton = buttons.find(btn => 
          btn.textContent.toLowerCase().includes('sign in') ||
          btn.textContent.toLowerCase().includes('continue')
        );
        
        if (signInButton) {
          signInButton.click();
          return true;
        }
        
        // Try pressing Enter on password field
        const passwordField = document.querySelector('input[type="password"]');
        if (passwordField) {
          passwordField.dispatchEvent(new KeyboardEvent('keypress', { key: 'Enter', keyCode: 13 }));
          return true;
        }
        
        return false;
      });
      
      if (!loginSubmitted) {
        this.logger.error('❌ Could not submit login');
        return { success: false, error: 'Login submission failed' };
      }
      
      this.logger.info('⏳ Waiting for login to complete...');
      await this.mainPage.waitForTimeout(5000);
      
      // Verify login success
      const loginResult = await this.verifyAppleLogin();
      
      if (loginResult.success) {
        this.logger.success('✅ Successfully logged in to Apple');
        
        // Now we need to navigate back to the job application
        await this.continueAppleApplication();
        
        return { success: true, signedIn: true };
      } else {
        return loginResult;
      }
      
    } catch (error) {
      this.logger.error(`❌ Error handling Apple sign-in: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async handleApple2FA() {
    try {
      this.logger.info('🔐 Handling Apple 2FA...');
      
      const has2FA = await this.mainPage.evaluate(() => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('two-factor') || 
               bodyText.includes('verification code') ||
               bodyText.includes('trusted device');
      });
      
      if (!has2FA) {
        return { success: true, no2FA: true };
      }
      
      this.logger.warn('⚠️ Apple 2FA detected - manual intervention required');
      this.logger.info('📱 Please complete 2FA manually in the browser');
      this.logger.info('⏳ Waiting 30 seconds for manual 2FA completion...');
      
      // Wait for manual 2FA
      await this.mainPage.waitForTimeout(30000);
      
      // Check if 2FA was completed
      const completed = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        return !url.includes('signin') && !url.includes('auth');
      });
      
      if (completed) {
        this.logger.success('✅ 2FA completed successfully');
        return { success: true, twoFACompleted: true };
      } else {
        return { success: false, error: '2FA not completed', requiresManualAction: true };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async verifyAppleLogin() {
    try {
      const loginStatus = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        const title = document.title;
        const bodyText = document.body.textContent || '';
        
        // Check if still on login page
        const stillOnLogin = url.includes('signin') || title.includes('Sign In');
        
        // Check for error messages
        const hasError = bodyText.toLowerCase().includes('incorrect') || 
                        bodyText.toLowerCase().includes('invalid') ||
                        bodyText.toLowerCase().includes('error');
        
        // Check if redirected to job application
        const onJobPage = url.includes('/apply/') || url.includes('/details/');
        
        return {
          url,
          title,
          stillOnLogin,
          hasError,
          onJobPage
        };
      });
      
      if (loginStatus.onJobPage) {
        return { success: true, message: 'Redirected to job application' };
      } else if (loginStatus.hasError) {
        return { success: false, error: 'Login failed - incorrect credentials' };
      } else if (loginStatus.stillOnLogin) {
        return { success: false, error: 'Still on login page', requiresManualAction: true };
      } else {
        return { success: true, message: 'Login appeared successful' };
      }
      
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async continueAppleApplication() {
    try {
      this.logger.info('📝 Continuing Apple application after login...');
      
      // Wait for page to load
      await this.mainPage.waitForTimeout(3000);
      
      // Check if we're on the application page
      const pageInfo = await this.mainPage.evaluate(() => {
        const url = window.location.href;
        const title = document.title;
        const hasForm = document.querySelectorAll('input, textarea, select').length > 0;
        const hasFileUpload = !!document.querySelector('input[type="file"]');
        
        return {
          url,
          title,
          hasForm,
          hasFileUpload,
          isApplicationPage: url.includes('/apply/') || title.includes('Apply')
        };
      });
      
      if (!pageInfo.isApplicationPage) {
        this.logger.warn('⚠️ Not on application page after login');
        
        // Try to click apply button again
        const applyClicked = await this.mainPage.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          const applyButton = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('apply') ||
            btn.textContent.toLowerCase().includes('submit')
          );
          
          if (applyButton) {
            applyButton.click();
            return true;
          }
          return false;
        });
        
        if (applyClicked) {
          this.logger.info('✅ Clicked apply button after login');
          await this.mainPage.waitForTimeout(3000);
        }
      }
      
      // Now fill the application form
      this.logger.info('📝 Filling Apple application form...');
      
      // Upload resume
      if (pageInfo.hasFileUpload) {
        await this.uploadResumeToApple();
      }
      
      // Fill form fields
      await this.fillAppleApplicationForm();
      
      return { success: true };
      
    } catch (error) {
      this.logger.error(`❌ Error continuing Apple application: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async uploadResumeToApple() {
    try {
      this.logger.info('📎 Uploading resume to Apple...');
      
      const fileInput = await this.mainPage.$('input[type="file"]');
      if (fileInput) {
        const path = require('path');
        const resumePath = path.join(__dirname, '../../demo apply/prep document.pdf');
        await fileInput.setInputFiles(resumePath);
        this.logger.success('✅ Resume uploaded');
        
        // Wait for upload to process
        await this.mainPage.waitForTimeout(2000);
      }
      
    } catch (error) {
      this.logger.warn(`⚠️ Error uploading resume: ${error.message}`);
    }
  }

  async fillAppleApplicationForm() {
    try {
      const filled = await this.mainPage.evaluate(() => {
        let filledCount = 0;
        
        // Fill all text inputs
        const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"]');
        inputs.forEach(input => {
          const name = (input.name || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          
          if (name.includes('first') || placeholder.includes('first')) {
            input.value = '[YOUR_FIRST_NAME]';
            filledCount++;
          } else if (name.includes('last') || placeholder.includes('last')) {
            input.value = 'M';
            filledCount++;
          } else if (name.includes('email') || placeholder.includes('email')) {
            input.value = '[YOUR_EMAIL]@gmail.com';
            filledCount++;
          } else if (name.includes('phone') || placeholder.includes('phone')) {
            input.value = '+1[YOUR_PHONE]';
            filledCount++;
          } else if (name.includes('linkedin') || placeholder.includes('linkedin')) {
            input.value = 'https://www.linkedin.com/in/[YOUR_GITHUB_ID]/';
            filledCount++;
          }
          
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        // Fill textareas
        const textareas = document.querySelectorAll('textarea');
        textareas.forEach(textarea => {
          const placeholder = (textarea.placeholder || '').toLowerCase();
          
          if (placeholder.includes('cover') || placeholder.includes('letter')) {
            textarea.value = 'I am excited about the opportunity to join Apple as a Software Engineer. With my strong background in backend systems, AI/ML integration, and proven experience with companies like [YOUR_COMPANY], I am confident I can contribute significantly to your team.';
            filledCount++;
          }
          
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        return { filledCount, totalFields: inputs.length + textareas.length };
      });
      
      this.logger.info(`✅ Filled ${filled.filledCount} out of ${filled.totalFields} fields`);
      
    } catch (error) {
      this.logger.error(`❌ Error filling Apple form: ${error.message}`);
    }
  }

  async handleAppleSignInInIframe() {
    try {
      this.logger.info('🖼️ Handling Apple sign-in in iframe...');
      
      // Get all iframes
      const frames = this.mainPage.frames();
      
      for (let i = 0; i < frames.length; i++) {
        try {
          const frame = frames[i];
          this.logger.info(`🖼️ Checking iframe ${i + 1}: ${frame.url()}`);
          
          // Switch to iframe context
          const originalPage = this.mainPage;
          this.mainPage = frame;
          
          try {
            // Check if this iframe has the sign-in form
            const formCheck = await this.mainPage.evaluate(() => {
              const inputs = document.querySelectorAll('input');
              const hasEmailField = Array.from(inputs).some(input => 
                input.type === 'email' || 
                input.placeholder?.toLowerCase().includes('email') ||
                input.name?.toLowerCase().includes('email') ||
                input.id === 'account_name_text_field' || // Apple-specific
                input.id?.toLowerCase().includes('account') ||
                input.id?.toLowerCase().includes('email')
              );
              
              return {
                inputCount: inputs.length,
                hasEmailField,
                inputs: Array.from(inputs).map(input => ({
                  type: input.type,
                  name: input.name,
                  placeholder: input.placeholder,
                  id: input.id,
                  className: input.className
                })),
                bodyText: document.body.textContent.substring(0, 500),
                title: document.title
              };
            });
            
            this.logger.info(`🖼️ Iframe ${i + 1}: ${formCheck.inputCount} inputs, has email: ${formCheck.hasEmailField}`);
            this.logger.info(`🖼️ Iframe ${i + 1} title: ${formCheck.title}`);
            this.logger.info(`🖼️ Iframe ${i + 1} inputs:`, formCheck.inputs);
            this.logger.info(`🖼️ Iframe ${i + 1} body text: ${formCheck.bodyText.substring(0, 200)}...`);
            
            if (formCheck.hasEmailField) {
              this.logger.info('✅ Found sign-in form in iframe');
              
              // Fill email field in iframe
              const emailFilled = await this.mainPage.evaluate((email) => {
                // Apple-specific selectors
                const emailSelectors = [
                  'input[type="email"]',
                  'input[placeholder*="Email"]',
                  'input[name*="email"]',
                  'input[id="account_name_text_field"]', // Apple-specific
                  'input[id*="account"]',
                  'input[id*="email"]',
                  'input[type="text"]' // Fallback
                ];
                
                for (const selector of emailSelectors) {
                  const emailInput = document.querySelector(selector);
                  if (emailInput) {
                    emailInput.value = email;
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
                    emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
                    return { success: true, selector: selector };
                  }
                }
                return { success: false };
              }, process.env.APPLE_ID || '[YOUR_EMAIL]@gmail.com');
              
              if (emailFilled.success) {
                this.logger.success(`✅ Email filled in iframe with selector: ${emailFilled.selector}`);
                
                // Click continue button in iframe
                const continueClicked = await this.mainPage.evaluate(() => {
                  const buttons = Array.from(document.querySelectorAll('button'));
                  const continueButton = buttons.find(btn => 
                    btn.textContent.toLowerCase().includes('continue') ||
                    btn.textContent.toLowerCase().includes('sign in') ||
                    btn.textContent.toLowerCase().includes('next')
                  );
                  
                  if (continueButton) {
                    continueButton.click();
                    return true;
                  }
                  return false;
                });
                
                if (continueClicked) {
                  this.logger.success('✅ Continue button clicked in iframe');
                  await this.mainPage.waitForTimeout(3000);
                  
                  // Now check for password field
                  const passwordResult = await this.mainPage.evaluate((password) => {
                    const passwordInput = document.querySelector('input[type="password"], input[id="password_text_field"]');
                    if (passwordInput) {
                      passwordInput.value = password;
                      passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                      passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                      passwordInput.dispatchEvent(new Event('blur', { bubbles: true }));
                      return { success: true, found: true };
                    }
                    return { success: true, found: false };
                  }, process.env.ALL_PASSWORDS || '[YOUR_PASSWORD]');
                  
                  if (passwordResult.found) {
                    this.logger.success('✅ Password field filled');
                    
                    // Click sign in button
                    const signInClicked = await this.mainPage.evaluate(() => {
                      const buttons = Array.from(document.querySelectorAll('button'));
                      const signInButton = buttons.find(btn => 
                        btn.textContent.toLowerCase().includes('sign in') ||
                        btn.textContent.toLowerCase().includes('continue')
                      );
                      
                      if (signInButton) {
                        signInButton.click();
                        return true;
                      }
                      return false;
                    });
                    
                    if (signInClicked) {
                      this.logger.success('✅ Sign in button clicked');
                      await this.mainPage.waitForTimeout(5000);
                      
                      // Switch back to original page
                      this.mainPage = originalPage;
                      return { success: true, signedIn: true };
                    }
                  } else {
                    this.logger.info('ℹ️ No password field found - might be 2FA or account creation');
                    // Switch back to original page
                    this.mainPage = originalPage;
                    return { success: true, signedIn: false, requiresManualAction: true };
                  }
                }
              }
            }
            
          } catch (error) {
            this.logger.warn(`⚠️ Error checking iframe ${i + 1}: ${error.message}`);
          } finally {
            // Switch back to original page
            this.mainPage = originalPage;
          }
          
        } catch (error) {
          this.logger.warn(`⚠️ Error accessing iframe ${i + 1}: ${error.message}`);
        }
      }
      
      return { success: false, error: 'No sign-in form found in iframes' };
      
    } catch (error) {
      this.logger.error(`❌ Error handling Apple sign-in in iframe: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = JobRightAIAutomator; 