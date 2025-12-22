#!/usr/bin/env node

/**
 * Test Script for Irish Property Data Supabase Setup
 * Verifies that authentication and premium features are working
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && key.startsWith('NEXT_PUBLIC_SUPABASE') && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value) {
        process.env[key.trim()] = value;
      }
    }
  });
}

console.log('🧪 Irish Property Data - Setup Verification\n');

// Check environment variables
console.log('📋 Checking environment variables...');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY'
];

const missingVars = [];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('❌ Missing environment variables:');
  missingVars.forEach(v => console.log(`   - ${v}`));
  console.log('\n💡 Run: node setup-supabase.js');
  process.exit(1);
} else {
  console.log('✅ Environment variables configured');
}

// Test Supabase connection
console.log('\n🔗 Testing Supabase connection...');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function testSupabaseEndpoint(endpoint, description) {
  return new Promise((resolve) => {
    const url = `${supabaseUrl}${endpoint}`;
    const options = {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    };

    const req = https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          if (res.statusCode === 200) {
            console.log(`✅ ${description}: OK`);
            resolve(true);
          } else {
            console.log(`❌ ${description}: ${res.statusCode} - ${jsonData.message || 'Unknown error'}`);
            resolve(false);
          }
        } catch (e) {
          console.log(`❌ ${description}: Invalid JSON response`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.log(`❌ ${description}: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(5000, () => {
      req.abort();
      console.log(`❌ ${description}: Timeout (5s)`);
      resolve(false);
    });
  });
}

async function runTests() {
  // Test basic connectivity
  const healthCheck = await testSupabaseEndpoint('/rest/v1/', 'Supabase REST API');

  // Test auth providers
  const authCheck = await testSupabaseEndpoint('/auth/v1/providers', 'Auth providers');

  if (healthCheck && authCheck) {
    console.log('\n🎉 Supabase connection successful!');
    console.log('\n🚀 Next Steps:');
    console.log('1. Start development server: npm run dev:setup');
    console.log('2. Visit http://localhost:3000');
    console.log('3. Click "Sign in with Google" to test authentication');
    console.log('4. Try saving a property to test premium features');
    console.log('5. Go to /insights to test the premium upgrade flow');
    console.log('\n📊 What to verify:');
    console.log('   • Google OAuth sign-in works');
    console.log('   • User appears in Supabase users table');
    console.log('   • Free users see upgrade prompts');
    console.log('   • Premium users can save properties');
    console.log('   • /saved page works for premium users');
  } else {
    console.log('\n❌ Setup issues detected. Check:');
    console.log('   • Supabase project is active');
    console.log('   • Environment variables are correct');
    console.log('   • Database migration has been run');
    console.log('   • Google OAuth is configured');
  }
}

runTests();
