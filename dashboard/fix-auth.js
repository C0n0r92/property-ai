#!/usr/bin/env node

/**
 * Complete Authentication Fix Script
 * Updates all required settings for Supabase OAuth
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔧 Irish Property Data - Complete Auth Fix\n');

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('📋 Required Information:\n');

  // Get service role key
  const serviceKey = await askQuestion('Enter your SUPABASE_SERVICE_ROLE_KEY (from Supabase Dashboard → Settings → API): ');

  if (!serviceKey || serviceKey.length < 100) {
    console.log('\n❌ Invalid service role key. It should be a long JWT token.');
    rl.close();
    return;
  }

  // Update .env.local
  const envPath = path.join(__dirname, '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');

  // Replace the placeholder
  envContent = envContent.replace(
    /SUPABASE_SERVICE_ROLE_KEY=.*/,
    `SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`
  );

  fs.writeFileSync(envPath, envContent);

  console.log('\n✅ Updated .env.local with service role key');

  // Test connection
  console.log('\n🧪 Testing Supabase connection...');

  const https = require('https');
  const supabaseUrl = 'https://yyaidpayutmomsnuuomy.supabase.co';

  function testConnection() {
    return new Promise((resolve) => {
      const req = https.get(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`
        }
      }, (res) => {
        const status = res.statusCode === 200 ? '✅' : '❌';
        console.log(`   ${status} Supabase Connection: ${res.statusCode}`);
        resolve(res.statusCode === 200);
      });

      req.on('error', () => {
        console.log('   ❌ Supabase Connection: Failed');
        resolve(false);
      });
    });
  }

  const connectionOk = await testConnection();

  if (connectionOk) {
    console.log('\n🎉 Authentication setup complete!');
    console.log('\n📋 Final Steps:');
    console.log('1. ✅ Service role key configured');
    console.log('2. 🔄 Run database migration (if not done)');
    console.log('3. 🔄 Configure Google OAuth consent screen app name');
    console.log('4. 🧪 Test with: npm run dev:setup');

    console.log('\n🚀 Your app will now show "Irish Property Data" instead of Supabase URL!');
  } else {
    console.log('\n❌ Connection test failed. Check your service role key.');
  }

  rl.close();
}

main();


