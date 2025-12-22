#!/usr/bin/env node

/**
 * Supabase CLI OAuth Setup Script
 * Configures Google OAuth using Supabase CLI
 */

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('🔧 Irish Property Data - Supabase CLI OAuth Setup\n');

  try {
    // Check if Supabase CLI is installed
    console.log('📦 Checking Supabase CLI...');
    execSync('supabase --version', { stdio: 'pipe' });
    console.log('✅ Supabase CLI is installed\n');
  } catch (error) {
    console.log('❌ Supabase CLI not found. Install with: npm install -g @supabase/cli\n');
    console.log('Alternative: Use Supabase Dashboard at https://supabase.com/dashboard\n');
    rl.close();
    return;
  }

  // Get project details
  const projectRef = await askQuestion('Enter your Supabase project reference (yyaidpayutmomsnuuomy): ');
  if (!projectRef) {
    console.log('❌ Project reference required');
    rl.close();
    return;
  }

  // Link project
  console.log(`🔗 Linking project: ${projectRef}`);
  try {
    execSync(`supabase link --project-ref ${projectRef}`, { stdio: 'inherit' });
    console.log('✅ Project linked successfully\n');
  } catch (error) {
    console.log('❌ Failed to link project. Check your project reference.');
    rl.close();
    return;
  }

  // Get Google OAuth credentials
  console.log('🔑 Google OAuth Configuration:');
  const googleClientId = await askQuestion('Enter your Google Client ID: ');
  const googleClientSecret = await askQuestion('Enter your Google Client Secret: ');

  if (!googleClientId || !googleClientSecret) {
    console.log('❌ Google OAuth credentials required');
    rl.close();
    return;
  }

  // Configure Google OAuth via CLI
  console.log('\n⚙️ Configuring Google OAuth...');
  try {
    // Enable Google provider
    execSync('supabase auth providers enable google', { stdio: 'inherit' });

    // Note: CLI may not support setting credentials directly
    console.log('✅ Google provider enabled');
    console.log('⚠️  Note: You may need to set Google credentials in the Dashboard');
    console.log('   Dashboard: Authentication → Providers → Google\n');

  } catch (error) {
    console.log('❌ Failed to configure Google OAuth');
    console.log('   Try using the Supabase Dashboard instead\n');
  }

  // Show current auth configuration
  console.log('📋 Current Auth Configuration:');
  try {
    const authConfig = execSync('supabase auth providers list', { encoding: 'utf8' });
    console.log(authConfig);
  } catch (error) {
    console.log('Could not retrieve auth configuration');
  }

  // Update site URL
  console.log('\n🌐 Updating site URL for redirects...');
  try {
    execSync('supabase auth update-site-url --site-url http://localhost:3000', { stdio: 'inherit' });
    console.log('✅ Development site URL updated');
  } catch (error) {
    console.log('❌ Failed to update site URL');
  }

  console.log('\n📋 Next Steps:');
  console.log('1. ✅ CLI setup completed');
  console.log('2. 🔄 Set Google credentials in Supabase Dashboard if CLI didn\'t work');
  console.log('3. 🔄 Update OAuth consent screen app name in Google Cloud Console');
  console.log('4. 🧪 Test authentication: npm run dev:setup');

  console.log('\n🔗 Useful Supabase CLI Commands:');
  console.log('• supabase auth providers list');
  console.log('• supabase auth providers enable google');
  console.log('• supabase auth update-site-url --site-url YOUR_URL');

  rl.close();
}

main();
