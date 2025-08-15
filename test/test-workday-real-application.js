require('dotenv').config();
const JobRightAIAutomator = require('../src/platforms/JobRightAIAutomator');

async function testWorkdayRealApplication() {
    console.log('⚙️ TESTING WORKDAY REAL APPLICATION...\n');
    
    const automator = new JobRightAIAutomator();
    
    try {
        // Initialize
        await automator.initialize();
        
        // Step 1: Discover jobs
        console.log('📊 Step 1: Discovering jobs...');
        const jobs = await automator.discoverJobs();
        console.log(`✅ Found ${jobs.length} jobs\n`);
        
        if (jobs.length === 0) {
            console.log('❌ No jobs found. Please navigate to JobRight job listings.');
            return;
        }
        
        // Step 2: Find a Workday job
        console.log('🎯 Step 2: Looking for Workday jobs...');
        
        // Filter for Workday jobs
        const workdayJobs = jobs.filter(job => {
            // We'll need to check the external URL when we click apply
            // For now, let's just pick the first job and see if it leads to Workday
            return true; // We'll check the platform when we click apply
        });
        
        if (workdayJobs.length === 0) {
            console.log('⚠️ No specific Workday jobs found, testing with first job...');
        }
        
        const targetJob = workdayJobs[0] || jobs[0];
        console.log(`🎯 Target Job: ${targetJob.title} at ${targetJob.company}`);
        console.log(`📍 Location: ${targetJob.location}`);
        console.log(`⭐ H1B Score: ${targetJob.score}\n`);
        
        // Step 3: Apply to job and check if it's Workday
        console.log('📝 Step 3: Starting application process...');
        const result = await automator.applyToJobWithAI(targetJob);
        
        // Step 4: Show results
        console.log('\n📊 APPLICATION RESULT:');
        console.log('========================');
        
        if (result.success) {
            console.log('✅ SUCCESS: Application submitted!');
            if (result.platform === 'workday') {
                console.log('⚙️ Workday platform detected and handled!');
            }
            if (result.confirmationText) {
                console.log(`📧 Confirmation: ${result.confirmationText}`);
            }
            if (result.confirmationNumber) {
                console.log(`🔢 Confirmation #: ${result.confirmationNumber}`);
            }
        } else {
            console.log('❌ FAILED:', result.error);
            
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
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await automator.cleanupTabs();
        await automator.close();
    }
    
    console.log('\n🎉 WORKDAY REAL APPLICATION TEST COMPLETE!');
}

// Helper function to test Workday-specific features
async function testWorkdayFeatures() {
    console.log('🔧 TESTING WORKDAY FEATURES...\n');
    
    const automator = new JobRightAIAutomator();
    
    try {
        await automator.initialize();
        
        // Test Workday URL detection
        const testUrls = [
            'https://company.wd1.myworkdayjobs.com/en-US/careers',
            'https://jobs.workday.com/company/careers',
            'https://company.workday.com/careers',
            'https://jobs.apple.com/en-us/details/200610249/software-engineer'
        ];
        
        console.log('🔍 Testing URL detection:');
        testUrls.forEach(url => {
            const isWorkday = url.includes('workday.com') || url.includes('wd1.myworkdayjobs.com');
            console.log(`  ${url} -> ${isWorkday ? '✅ Workday' : '❌ Not Workday'}`);
        });
        
        console.log('\n✅ Workday feature tests completed');
        
    } catch (error) {
        console.error('❌ Feature test failed:', error.message);
    } finally {
        await automator.close();
    }
}

// Run the test
if (process.argv.includes('--features')) {
    testWorkdayFeatures().catch(console.error);
} else {
    testWorkdayRealApplication().catch(console.error);
} 