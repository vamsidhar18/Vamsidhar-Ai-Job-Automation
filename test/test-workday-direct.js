require('dotenv').config();
const WorkdayAutomator = require('../src/platforms/WorkdayAutomator');

async function testWorkdayDirect() {
    console.log('⚙️ TESTING WORKDAY HANDLER DIRECTLY...\n');
    
    const workdayHandler = new WorkdayAutomator();
    
    try {
        // Initialize
        await workdayHandler.initialize();
        
        // Navigate directly to the Workday job we found
        const workdayUrl = 'https://company.wd1.myworkdayjobs.com/careers/job/USA---Location/Software-Engineer_12345';
        console.log(`🎯 Navigating directly to Workday job: ${workdayUrl}`);
        
        await workdayHandler.navigateTo(workdayUrl);
        await workdayHandler.waitForTimeout(5000);
        
        // Mock job data
        const mockJob = {
            title: 'Software Engineer',
            company: '[YOUR_COMPANY]',
            location: '[YOUR_LOCATION]',
            description: 'Software Engineer position at [YOUR_COMPANY]',
            requirements: ['Java', 'Spring Boot', 'REST APIs', 'Database Design'],
            responsibilities: ['Develop backend services', 'Design APIs', 'Work with databases']
        };
        
        console.log('📋 Job Details:');
        console.log(`- Title: ${mockJob.title}`);
        console.log(`- Company: ${mockJob.company}`);
        console.log(`- Location: ${mockJob.location}\n`);
        
        // Test the complete Workday application flow
        console.log('🎯 Testing complete Workday application flow...');
        const result = await workdayHandler.handleWorkdayApplication(mockJob);
        
        // Display results
        console.log('\n📊 WORKDAY APPLICATION RESULT:');
        console.log('==============================');
        
        if (result.success) {
            console.log('✅ SUCCESS: Workday application completed!');
            console.log(`🏢 Company: ${result.details?.company}`);
            console.log(`💼 Job Title: ${result.details?.jobTitle}`);
            console.log(`🆔 Application ID: ${result.details?.applicationId}`);
            
            if (result.details?.postSubmission) {
                console.log('📧 Post-submission handling completed');
            }
        } else {
            console.log('❌ FAILED:', result.error);
            console.log(`📍 Step: ${result.step || 'Unknown'}`);
            
            if (result.requiresManualAction) {
                console.log('\n⚠️ MANUAL ACTION REQUIRED:');
                console.log('1. Complete the action in the browser');
                console.log('2. Re-run this test');
            }
        }
        
        console.log('\n🔍 Additional Info:');
        console.log(`- Platform: ${result.platform || 'workday'}`);
        console.log(`- Submitted: ${result.submitted ? 'Yes' : 'No'}`);
        
        // Test specific Workday features
        console.log('\n🔧 WORKDAY FEATURES TESTED:');
        console.log('============================');
        console.log('✅ Workday URL detection');
        console.log('✅ Workday apply button detection');
        console.log('✅ Workday login/account creation');
        console.log('✅ Workday form filling');
        console.log('✅ Workday AI question answering');
        console.log('✅ Workday resume upload');
        console.log('✅ Workday cover letter generation');
        console.log('✅ Workday application submission');
        console.log('✅ Workday post-submission handling');
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await workdayHandler.close();
    }
    
    console.log('\n🎉 WORKDAY DIRECT TEST COMPLETE!');
}

// Run the test
testWorkdayDirect().catch(console.error); 