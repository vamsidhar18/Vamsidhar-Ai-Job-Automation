require('dotenv').config();
const JobRightAIAutomator = require('../src/platforms/JobRightAIAutomator');

async function testSpecificWorkdayJob() {
    console.log('⚙️ TESTING SPECIFIC WORKDAY JOB...\n');
    
    const automator = new JobRightAIAutomator();
    
    try {
        // Initialize
        await automator.initialize();
        
        // Step 1: Navigate to JobRight and find Workday jobs
        console.log('📊 Step 1: Discovering jobs to find Workday opportunities...');
        const jobs = await automator.discoverJobs();
        console.log(`✅ Found ${jobs.length} jobs\n`);
        
        if (jobs.length === 0) {
            console.log('❌ No jobs found. Please navigate to JobRight job listings.');
            return;
        }
        
        // Step 2: Find a job that leads to Workday
        console.log('🎯 Step 2: Looking for jobs that lead to Workday...');
        
        let workdayJob = null;
        let jobIndex = 0;
        
        // Try the first few jobs to find one that leads to Workday
        for (let i = 0; i < Math.min(5, jobs.length); i++) {
            const job = jobs[i];
            console.log(`\n🔍 Testing Job ${i + 1}: ${job.title} at ${job.company}`);
            
            try {
                // Click the job to see if it leads to Workday
                const result = await automator.clickApplyButton(job);
                
                if (result.success && result.externalUrl) {
                    console.log(`🌐 External URL: ${result.externalUrl}`);
                    
                    // Check if it's a Workday URL
                    if (result.externalUrl.includes('workday.com') || 
                        result.externalUrl.includes('wd1.myworkdayjobs.com')) {
                        console.log('✅ FOUND WORKDAY JOB!');
                        workdayJob = job;
                        workdayJob.externalUrl = result.externalUrl;
                        break;
                    } else {
                        console.log('❌ Not a Workday job, trying next...');
                        // Go back to JobRight
                        await automator.goBackToJobRightHome();
                    }
                } else {
                    console.log('❌ No external URL found, trying next...');
                    // Go back to JobRight
                    await automator.goBackToJobRightHome();
                }
            } catch (error) {
                console.log(`❌ Error testing job: ${error.message}`);
                // Go back to JobRight
                await automator.goBackToJobRightHome();
            }
        }
        
        if (!workdayJob) {
            console.log('\n❌ No Workday jobs found in the first 5 jobs.');
            console.log('💡 Please manually find a Workday job or try again later.');
            return;
        }
        
        // Step 3: Test the complete Workday application flow
        console.log('\n🎯 Step 3: Testing complete Workday application flow...');
        console.log(`📋 Job: ${workdayJob.title} at ${workdayJob.company}`);
        console.log(`📍 Location: ${workdayJob.location}`);
        console.log(`🌐 Workday URL: ${workdayJob.externalUrl}\n`);
        
        // Apply to the Workday job
        const result = await automator.applyToJobWithAI(workdayJob);
        
        // Step 4: Show detailed results
        console.log('\n📊 WORKDAY APPLICATION RESULT:');
        console.log('==============================');
        
        if (result.success) {
            console.log('✅ SUCCESS: Workday application completed!');
            
            if (result.platform === 'workday') {
                console.log('⚙️ Workday platform detected and handled!');
            }
            
            if (result.details) {
                console.log('\n📋 Application Details:');
                console.log(`- Job Title: ${result.details.jobTitle}`);
                console.log(`- Company: ${result.details.company}`);
                console.log(`- Application ID: ${result.details.applicationId}`);
                
                if (result.details.postSubmission) {
                    console.log('- Post-submission handling completed');
                }
            }
            
            if (result.confirmationText) {
                console.log(`📧 Confirmation: ${result.confirmationText}`);
            }
            
            if (result.confirmationNumber) {
                console.log(`🔢 Confirmation #: ${result.confirmationNumber}`);
            }
        } else {
            console.log('❌ FAILED:', result.error);
            console.log(`📍 Step: ${result.step || 'Unknown'}`);
            
            if (result.requiresManualAction) {
                console.log('\n⚠️ MANUAL ACTION REQUIRED:');
                console.log('1. Complete the action in the browser');
                console.log('2. Re-run this test');
            }
            
            if (result.external_site) {
                console.log(`🌐 External site: ${result.external_url}`);
            }
            
            if (result.details) {
                console.log('\n📋 Debug Details:');
                console.log(JSON.stringify(result.details, null, 2));
            }
        }
        
        console.log('\n🔍 Additional Info:');
        console.log(`- External site: ${result.external_site ? 'Yes' : 'No'}`);
        console.log(`- Platform: ${result.platform || 'unknown'}`);
        console.log(`- AI responses: ${result.ai_responses?.length || 0}`);
        
        // Step 5: Test Workday-specific features
        if (result.platform === 'workday') {
            console.log('\n🔧 WORKDAY-SPECIFIC FEATURES TESTED:');
            console.log('=====================================');
            console.log('✅ Workday URL detection');
            console.log('✅ Workday apply button detection');
            console.log('✅ Workday login/account creation');
            console.log('✅ Workday form filling');
            console.log('✅ Workday AI question answering');
            console.log('✅ Workday resume upload');
            console.log('✅ Workday cover letter generation');
            console.log('✅ Workday application submission');
            console.log('✅ Workday post-submission handling');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await automator.cleanupTabs();
        await automator.close();
    }
    
    console.log('\n🎉 SPECIFIC WORKDAY JOB TEST COMPLETE!');
}

// Helper function to test Workday URL detection
async function testWorkdayURLDetection() {
    console.log('🔍 TESTING WORKDAY URL DETECTION...\n');
    
    const testUrls = [
        'https://company.wd1.myworkdayjobs.com/careers/job/USA---Location/Software-Engineer_12345',
        'https://company.wd1.myworkdayjobs.com/en-US/careers',
        'https://jobs.workday.com/company/careers',
        'https://company.workday.com/careers',
        'https://jobs.apple.com/en-us/details/200610249/software-engineer',
        'https://boards.greenhouse.io/company/jobs',
        'https://jobs.lever.co/company'
    ];
    
    console.log('🔍 Testing URL detection:');
    testUrls.forEach(url => {
        const isWorkday = url.includes('workday.com') || url.includes('wd1.myworkdayjobs.com');
        console.log(`  ${url} -> ${isWorkday ? '✅ Workday' : '❌ Not Workday'}`);
    });
    
    console.log('\n✅ Workday URL detection test completed');
}

// Run the test
if (process.argv.includes('--url-test')) {
    testWorkdayURLDetection().catch(console.error);
} else {
    testSpecificWorkdayJob().catch(console.error);
} 