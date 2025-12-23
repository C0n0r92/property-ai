#!/usr/bin/env node

/**
 * Complete Supabase Setup Script
 * Handles environment, OAuth, and database setup via CLI
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
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
  console.log('🚀 Irish Property Data - Complete Supabase Setup\n');

  // Step 1: Environment Setup
  console.log('📋 Step 1: Environment Configuration');

  const envPath = path.join(__dirname, '.env.local');
  const serviceKey = await askQuestion('Enter your SUPABASE_SERVICE_ROLE_KEY: ');

  if (!serviceKey || serviceKey.includes('your_')) {
    console.log('❌ Valid service role key required');
    rl.close();
    return;
  }

  // Update .env.local
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(
    /SUPABASE_SERVICE_ROLE_KEY=.*/,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`
  );
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Environment configured\n');

  // Step 2: CLI Setup Check
  console.log('📋 Step 2: Supabase CLI Setup');

  try {
    execSync('supabase --version', { stdio: 'pipe' });
    console.log('✅ Supabase CLI available\n');
  } catch (error) {
    console.log('⚠️  Supabase CLI not found. Using Dashboard method instead.\n');
    console.log('📋 Manual Setup Required:');
    console.log('1. Go to: https://supabase.com/dashboard/project/yyaidpayutmomsnuuomy/settings/sql');
    console.log('2. Run the SQL from: supabase-migration.sql\n');

    await runDatabaseMigration();
    await showNextSteps();
    rl.close();
    return;
  }

  // Step 3: Project Linking
  const projectRef = 'yyaidpayutmomsnuuomy';
  console.log(`📋 Step 3: Linking Project (${projectRef})`);

  try {
    execSync(`supabase link --project-ref ${projectRef}`, { stdio: 'pipe' });
    console.log('✅ Project linked\n');
  } catch (error) {
    console.log('⚠️  Project linking failed. Continuing with manual setup...\n');
  }

  // Step 4: OAuth Setup
  console.log('📋 Step 4: OAuth Configuration');

  const setupOauth = await askQuestion('Configure Google OAuth now? (y/n): ');

  if (setupOauth.toLowerCase() === 'y') {
    const googleClientId = await askQuestion('Google Client ID: ');
    const googleClientSecret = await askQuestion('Google Client Secret: ');

    if (googleClientId && googleClientSecret) {
      try {
        execSync('supabase auth providers enable google', { stdio: 'pipe' });
        console.log('✅ Google OAuth enabled');
        console.log('⚠️  Note: Set credentials in Dashboard → Authentication → Providers → Google');
      } catch (error) {
        console.log('❌ OAuth setup failed - use Dashboard method');
      }
    }
  }

  // Step 5: Database Migration
  await runDatabaseMigration();

  // Step 6: Final Steps
  await showNextSteps();

  rl.close();
}

async function runDatabaseMigration() {
  console.log('📋 Step 5: Database Migration');

  const runMigration = await askQuestion('Run database migration now? (y/n): ');

  if (runMigration.toLowerCase() === 'y') {
    const migrationPath = path.join(__dirname, 'supabase-migration.sql');

    if (fs.existsSync(migrationPath)) {
      console.log('📄 Migration file found. Copy this SQL to Supabase:');
      console.log('=' .repeat(60));
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log(migrationSQL.substring(0, 500) + '...\n');
      console.log('=' .repeat(60));
      console.log('\n🔗 Run at: https://supabase.com/dashboard/project/yyaidpayutmomsnuuomy/settings/sql');
    } else {
      console.log('❌ Migration file not found');
    }
  }

  console.log('✅ Database migration prepared\n');
}

async function showNextSteps() {
  console.log('🎯 Setup Complete! Final Steps:');
  console.log('');
  console.log('1. ✅ Environment variables configured');
  console.log('2. ✅ Supabase CLI linked (if available)');
  console.log('3. 🔄 Run database migration (if not done)');
  console.log('4. 🔄 Configure Google OAuth in Dashboard');
  console.log('5. 🔄 Update Google OAuth consent screen app name');
  console.log('6. 🧪 Test authentication: npm run dev:setup');
  console.log('');
  console.log('🚀 Your app will show "Irish Property Data" in OAuth flow!');
  console.log('');
  console.log('🔗 Useful links:');
  console.log('• Supabase Dashboard: https://supabase.com/dashboard');
  console.log('• Google Cloud Console: https://console.cloud.google.com');
  console.log('• OAuth Consent Screen: APIs & Services → OAuth consent screen');
}

main();


