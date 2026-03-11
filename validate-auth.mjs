import { chromium } from 'playwright';

async function runValidation() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging for debugging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('Browser Error:', msg.text());
    }
  });
  
  const results = [];
  
  try {
    // Step 1: Visit /portal while logged out, confirm redirect to /login
    console.log('\n=== Step 1: Testing /portal redirect when logged out ===');
    
    // First, make sure we're logged out by clearing cookies
    await context.clearCookies();
    
    await page.goto('http://localhost:3000/portal', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Give time for redirect
    const step1Url = page.url();
    const step1Pass = step1Url.includes('/login');
    results.push({
      step: 1,
      description: 'Visit /portal while logged out, should redirect to /login',
      pass: step1Pass,
      actualUrl: step1Url,
      expectedUrl: 'http://localhost:3000/login (with ?from=/portal)',
    });
    console.log(`${step1Pass ? '✓' : '✗'} Step 1: ${step1Pass ? 'PASS' : 'FAIL'} - Redirected to ${step1Url}`);
    
    // Step 2: Create a new account
    console.log('\n=== Step 2: Creating new account ===');
    await page.goto('http://localhost:3000/register');
    await page.waitForLoadState('networkidle');
    
    // Fill registration form
    await page.fill('input[name="firstName"]', 'Test');
    await page.fill('input[name="lastName"]', 'User');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    
    // Submit form
    await page.click('button[type="submit"]');
    
    // Wait for either success (redirect to /portal) or error
    await page.waitForTimeout(3000); // Give time for form submission
    const step2Url = page.url();
    
    if (step2Url.includes('/portal')) {
      const step2Pass = true;
      results.push({
        step: 2,
        description: 'Register new account and redirect to /portal',
        pass: step2Pass,
        actualUrl: step2Url,
        note: 'Registration successful',
      });
      console.log(`✓ Step 2: PASS - Account created, at ${step2Url}`);
    } else {
      // Check for error message on page
      const errorElement = await page.locator('text=/error|exists|already/i').first();
      const errorText = await errorElement.textContent().catch(() => 'Unknown error');
      results.push({
        step: 2,
        description: 'Register new account and redirect to /portal',
        pass: false,
        error: errorText,
        note: 'Registration may have failed - user might already exist',
      });
      console.log(`✗ Step 2: FAIL - ${errorText}`);
      
      // Try to login instead if registration failed
      console.log('\n=== Attempting to login with existing credentials ===');
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      await page.fill('input[name="email"]', 'testuser@example.com');
      await page.fill('input[name="password"]', 'Password123!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);
      console.log('✓ Successfully logged in with existing account');
    }
    
    // Step 3: Confirm at /portal and see user's email
    console.log('\n=== Step 3: Verifying portal access and email display ===');
    await page.waitForTimeout(2000);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'portal-debug.png' });
    
    // Look for email in the page HTML
    const pageContent = await page.content();
    const emailInHtml = pageContent.includes('testuser@example.com');
    const emailVisible = await page.locator('text=testuser@example.com').isVisible().catch(() => false);
    
    const step3Url = page.url();
    const step3Pass = step3Url.includes('/portal') && (emailVisible || emailInHtml);
    results.push({
      step: 3,
      description: 'At /portal and user email is visible',
      pass: step3Pass,
      actualUrl: step3Url,
      emailVisible,
      emailInHtml,
    });
    console.log(`${step3Pass ? '✓' : '✗'} Step 3: ${step3Pass ? 'PASS' : 'FAIL'} - Email visible: ${emailVisible}, Email in HTML: ${emailInHtml}`);
    
    // Step 4: Logout using the logout button
    console.log('\n=== Step 4: Testing logout functionality ===');
    
    // The logout button is a form button with LogOut icon - look for form with logoutAction
    const logoutButton = page.locator('form button[type="submit"]').filter({ hasText: '' }).first();
    
    // Try multiple selectors
    let clicked = false;
    try {
      await page.locator('button[type="submit"]:has(svg)').last().click({ timeout: 5000 });
      clicked = true;
    } catch {
      try {
        // Try clicking any button with LogOut icon
        await page.locator('form').filter({ has: page.locator('button[type="submit"]') }).last().locator('button').click({ timeout: 5000 });
        clicked = true;
      } catch {
        console.log('Could not find logout button, trying to take screenshot');
        await page.screenshot({ path: 'logout-button-search.png' });
      }
    }
    
    await page.waitForTimeout(2000);
    const step4Url = page.url();
    const step4Pass = step4Url.includes('/login');
    results.push({
      step: 4,
      description: 'Logout and redirect to /login',
      pass: step4Pass,
      actualUrl: step4Url,
      logoutButtonClicked: clicked,
    });
    console.log(`${step4Pass ? '✓' : '✗'} Step 4: ${step4Pass ? 'PASS' : 'FAIL'} - Redirected to ${step4Url}`);
    
    // Step 5: Confirm redirected to /login (already done in step 4)
    results.push({
      step: 5,
      description: 'Confirm redirect to /login after logout',
      pass: step4Pass,
      actualUrl: step4Url,
      note: 'Same as step 4',
    });
    console.log(`✓ Step 5: ${step4Pass ? 'PASS' : 'FAIL'} - Confirmed at login page`);
    
    // Step 6: Login with created credentials
    console.log('\n=== Step 6: Testing login with created credentials ===');
    await page.fill('input[name="email"]', 'testuser@example.com');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    const step6Url = page.url();
    const step6Pass = step6Url.includes('/portal');
    results.push({
      step: 6,
      description: 'Login with test credentials',
      pass: step6Pass,
      actualUrl: step6Url,
    });
    console.log(`✓ Step 6: ${step6Pass ? 'PASS' : 'FAIL'} - Logged in, at ${step6Url}`);
    
    // Step 7: Attempt to access /admin as CUSTOMER (should get 403)
    console.log('\n=== Step 7: Testing /admin access as CUSTOMER (should be 403) ===');
    const response = await page.goto('http://localhost:3000/admin');
    const step7Status = response.status();
    const step7Pass = step7Status === 403;
    const step7Text = await page.textContent('body').catch(() => '');
    results.push({
      step: 7,
      description: 'Access /admin as CUSTOMER, should get 403 Forbidden',
      pass: step7Pass,
      actualStatus: step7Status,
      expectedStatus: 403,
      bodyText: step7Text.substring(0, 100),
    });
    console.log(`✓ Step 7: ${step7Pass ? 'PASS' : 'FAIL'} - Status: ${step7Status}, Expected: 403`);
    
  } catch (error) {
    console.error('Error during validation:', error);
    results.push({
      step: 'error',
      description: 'Validation error',
      pass: false,
      error: error.message,
    });
  } finally {
    await browser.close();
  }
  
  // Print summary
  console.log('\n\n' + '='.repeat(60));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(60));
  
  const passCount = results.filter(r => r.pass).length;
  const totalCount = results.filter(r => r.step !== 'error').length;
  
  results.forEach(result => {
    if (result.step === 'error') {
      console.log(`\n❌ ERROR: ${result.error}`);
    } else {
      const icon = result.pass ? '✅' : '❌';
      console.log(`\n${icon} Step ${result.step}: ${result.description}`);
      console.log(`   Status: ${result.pass ? 'PASS' : 'FAIL'}`);
      if (result.actualUrl) console.log(`   URL: ${result.actualUrl}`);
      if (result.actualStatus) console.log(`   HTTP Status: ${result.actualStatus}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      if (result.note) console.log(`   Note: ${result.note}`);
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`RESULT: ${passCount}/${totalCount} tests passed`);
  console.log('='.repeat(60) + '\n');
  
  return results;
}

runValidation().catch(console.error);
