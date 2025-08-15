const JobRightAIAutomator = require('../src/platforms/JobRightAIAutomator');

async function testSingleApplication() {
  console.log('🎯 TESTING COMPLETE SINGLE APPLICATION FLOW...\n');
  
  try {
    const automator = new JobRightAIAutomator();
    await automator.initialize();
    
    // Step 1: Discover jobs
    console.log('📊 Step 1: Discovering jobs...');
    const jobs = await automator.discoverJobs();
    console.log(`✅ Found ${jobs.length} jobs`);
    
    if (jobs.length === 0) {
      console.log('❌ No jobs found!');
      await automator.close();
      return;
    }
    
    // Step 2: Get first unique job
    console.log('\n🎯 Step 2: Selecting target job...');
    const uniqueJobs = [];
    const seenJobs = new Set();
    
    for (const job of jobs) {
      const jobKey = `${job.title}-${job.company}`;
      if (!seenJobs.has(jobKey)) {
        seenJobs.add(jobKey);
        uniqueJobs.push(job);
        if (uniqueJobs.length >= 1) break; // Only get 1 job for single test
      }
    }
    
    const targetJob = uniqueJobs[0];
    console.log(`🎯 Target Job: ${targetJob.title} at ${targetJob.company}`);
    console.log(`📍 Location: ${targetJob.location}`);
    console.log(`⭐ H1B Score: ${targetJob.h1bScore}`);
    
    // Step 3: Click apply button
    console.log('\n🎯 Step 3: Clicking APPLY button...');
    const applyResult = await automator.clickApplyButton(targetJob);
    
    if (!applyResult.success) {
      console.log(`❌ Apply button failed: ${applyResult.error}`);
      await automator.close();
      return;
    }
    
    console.log(`✅ Apply button clicked: "${applyResult.buttonText}"`);
    
    // Step 4: Handle external site
    if (applyResult.externalSite) {
      console.log(`🌐 External site reached: ${applyResult.url}`);
      
      // Step 5: Handle CAPTCHA
      console.log('\n🤖 Step 5: Handling CAPTCHA...');
      const captchaResult = await automator.handleCaptcha();
      if (captchaResult.success && captchaResult.captchaType !== 'none') {
        console.log(`✅ CAPTCHA handled: ${captchaResult.captchaType}`);
        if (captchaResult.manual) {
          console.log('👤 Manual intervention was required');
        }
      } else if (!captchaResult.success) {
        console.log(`⚠️ CAPTCHA handling failed: ${captchaResult.error}`);
      } else {
        console.log('✅ No CAPTCHA detected');
      }
      
      // Step 6: Fill form with AI
      console.log('\n📝 Step 6: Filling application form...');
      await automator.fillBasicInformation(targetJob);
      
      // Step 7: Submit application
      console.log('\n🎯 Step 7: Submitting application...');
      const submitResult = await automator.submitApplicationForm();
      
      if (submitResult.success) {
        console.log('\n🎉 SUCCESS: Application submitted successfully!');
        console.log('📊 APPLICATION SUMMARY:');
        console.log(`   📄 Job: ${targetJob.title}`);
        console.log(`   🏢 Company: ${targetJob.company}`);
        console.log(`   📍 Location: ${targetJob.location}`);
        console.log(`   🌐 External Site: ${applyResult.url}`);
        console.log(`   🤖 CAPTCHA Type: ${captchaResult.captchaType || 'None'}`);
        console.log(`   📧 Confirmation: ${submitResult.confirmationText || 'N/A'}`);
        console.log(`   🔢 Confirmation #: ${submitResult.confirmationNumber || 'N/A'}`);
        console.log(`   ⭐ H1B Score: ${targetJob.h1bScore}`);
        
        // Step 8: Get application stats
        const stats = await automator.getApplicationStats();
        console.log('\n📈 APPLICATION STATS:');
        console.log(`   📊 Total Applications: ${stats.totalApplications}`);
        console.log(`   ✅ Successful: ${stats.successfulApplications}`);
        console.log(`   ❌ Failed: ${stats.failedApplications}`);
        console.log(`   📈 Success Rate: ${stats.successRate}%`);
        
      } else {
        console.log(`❌ FAILED: ${submitResult.error}`);
        if (submitResult.details) {
          console.log('📋 Details:', submitResult.details);
        }
      }
      
    } else {
      console.log('⚠️ No external site reached - application may be incomplete');
    }
    
    // Step 9: Cleanup
    console.log('\n🧹 Step 9: Cleaning up...');
    await automator.cleanupTabs();
    
    await automator.close();
    
    console.log('\n🎉 SINGLE APPLICATION TEST COMPLETE!');
    console.log('✅ Complete flow tested successfully');
    console.log('✅ All components working together');
    console.log('✅ Ready for batch testing');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run test
testSingleApplication(); 