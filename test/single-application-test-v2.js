require('dotenv').config();
const JobRightAIAutomator = require('../src/platforms/JobRightAIAutomator');

async function testSingleApplication() {
    console.log('🎯 TESTING COMPLETE SINGLE APPLICATION FLOW V2...\n');
    
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
        
        // Step 2: Select a non-Apple job for easier testing
        console.log('🎯 Step 2: Selecting target job (avoiding Apple for now)...');
        
        // Filter out Apple jobs for this test
        const nonAppleJobs = jobs.filter(job => 
            !job.company.toLowerCase().includes('apple')
        );
        
        let targetJob;
        if (nonAppleJobs.length > 0) {
            targetJob = nonAppleJobs[0];
            console.log('✅ Selected non-Apple job for testing');
        } else {
            targetJob = jobs[0];
            console.log('⚠️ Only Apple jobs available - will need credentials');
        }
        
        console.log(`🎯 Target Job: ${targetJob.title} at ${targetJob.company}`);
        console.log(`📍 Location: ${targetJob.location}`);
        console.log(`⭐ H1B Score: ${targetJob.score}\n`);
        
        // Step 3: Apply to job
        console.log('📝 Step 3: Starting application process...');
        const result = await automator.applyToJobWithAI(targetJob);
        
        // Step 4: Show results
        console.log('\n📊 APPLICATION RESULT:');
        console.log('========================');
        
        if (result.success) {
            console.log('✅ SUCCESS: Application submitted!');
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
        console.log(`- AI responses: ${result.ai_responses?.length || 0}`);
        console.log(`- Platform: ${result.platform || 'jobright'}`);
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await automator.cleanupTabs();
        await automator.close();
    }
    
    console.log('\n🎉 SINGLE APPLICATION TEST COMPLETE!');
}

// Helper to check if we should skip certain companies
function shouldSkipCompany(company) {
    const skipList = [
        'apple', // Requires sign-in
        'google', // Complex application
        'meta',   // Requires account
    ];
    
    return skipList.some(skip => 
        company.toLowerCase().includes(skip)
    );
}

// Run the test
testSingleApplication().catch(console.error); 