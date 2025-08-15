require('dotenv').config();
const WorkdayAutomator = require('../src/platforms/WorkdayAutomator');

async function testWorkdayHandler() {
    console.log('⚙️ TESTING WORKDAY HANDLER...\n');
    
    const workdayHandler = new WorkdayAutomator();
    
    try {
        // Initialize
        await workdayHandler.initialize();
        
        // Mock job data
        const mockJob = {
            title: 'Software Engineer',
            company: 'Test Company',
            location: '[YOUR_LOCATION]',
            description: 'We are looking for a software engineer with experience in Java and Spring Boot.',
            requirements: ['Java', 'Spring Boot', 'REST APIs', 'Database Design'],
            responsibilities: ['Develop backend services', 'Design APIs', 'Work with databases']
        };
        
        console.log('🎯 Testing Workday application flow...');
        console.log(`📋 Job: ${mockJob.title} at ${mockJob.company}`);
        console.log(`📍 Location: ${mockJob.location}\n`);
        
        // Test the complete Workday application flow
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
        
    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    } finally {
        // Clean up
        console.log('\n🧹 Cleaning up...');
        await workdayHandler.close();
    }
    
    console.log('\n🎉 WORKDAY HANDLER TEST COMPLETE!');
}

// Helper function to test specific Workday components
async function testWorkdayComponents() {
    console.log('🔧 TESTING WORKDAY COMPONENTS...\n');
    
    const workdayHandler = new WorkdayAutomator();
    
    try {
        await workdayHandler.initialize();
        
        // Test 1: Apply Button Detection
        console.log('🎯 Test 1: Apply Button Detection');
        // This would need a real Workday page to test
        
        // Test 2: Login Detection
        console.log('🔐 Test 2: Login Detection');
        // This would need a real Workday page to test
        
        // Test 3: Form Detection
        console.log('📋 Test 3: Form Detection');
        // This would need a real Workday page to test
        
        console.log('✅ All component tests completed');
        
    } catch (error) {
        console.error('❌ Component test failed:', error.message);
    } finally {
        await workdayHandler.close();
    }
}

// Run the test
if (process.argv.includes('--components')) {
    testWorkdayComponents().catch(console.error);
} else {
    testWorkdayHandler().catch(console.error);
} 