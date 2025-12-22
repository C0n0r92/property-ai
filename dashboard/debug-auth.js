#!/usr/bin/env node

/**
 * Authentication Debug Script for Irish Property Data
 * Helps diagnose OAuth and Supabase setup issues
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');

  envLines.forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (value && !value.includes('your_')) {
        process.env[key.trim()] = value;
      }
    }
  });
}

console.log('🔍 Irish Property Data - Auth Debug\n');

// Check environment variables
console.log('📋 Environment Variables:');
const requiredVars = {
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...'
};

Object.entries(requiredVars).forEach(([key, value]) => {
  const status = value && !value.includes('your_') ? '✅' : '❌';
  console.log(`   ${status} ${key}: ${value || 'NOT SET'}`);
});

console.log('\n🔗 Testing Supabase Endpoints:');

function testEndpoint(url, headers, description) {
  return new Promise((resolve) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const status = res.statusCode === 200 ? '✅' : '❌';
        console.log(`   ${status} ${description}: ${res.statusCode}`);

        if (res.statusCode !== 200) {
          try {
            const jsonData = JSON.parse(data);
            console.log(`      Error: ${jsonData.msg || jsonData.message || 'Unknown'}`);
          } catch (e) {
            console.log(`      Response: ${data.substring(0, 100)}...`);
          }
        }
        resolve(res.statusCode === 200);
      });
    });

    req.on('error', (err) => {
      console.log(`   ❌ ${description}: ${err.message}`);
      resolve(false);
    });

    req.setTimeout(10000, () => {
      req.abort();
      console.log(`   ❌ ${description}: Timeout`);
      resolve(false);
    });
  });
}

async function runDiagnostics() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey || serviceKey.includes('your_')) {
    console.log('\n❌ Missing or placeholder environment variables!');
    console.log('   Fix .env.local with actual values from Supabase Dashboard');
    return;
  }

  // Test basic connectivity
  await testEndpoint(
    `${supabaseUrl}/rest/v1/`,
    { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` },
    'Supabase REST API'
  );

  // Test auth providers
  await testEndpoint(
    `${supabaseUrl}/auth/v1/providers`,
    { 'apikey': anonKey },
    'Auth Providers'
  );

  // Test service role access
  await testEndpoint(
    `${supabaseUrl}/rest/v1/users?select=id&limit=1`,
    { 'apikey': serviceKey, 'Authorization': `Bearer ${serviceKey}` },
    'Database Access (Service Role)'
  );

  console.log('\n🔧 Troubleshooting Steps:');
  console.log('1. ✅ Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
  console.log('2. ✅ Run database migration in Supabase SQL Editor');
  console.log('3. ✅ Configure Google OAuth in Supabase Dashboard');
  console.log('4. ✅ Update OAuth consent screen app name');
  console.log('5. ✅ Add redirect URLs in Supabase Auth settings');
  console.log('6. 🧪 Test with: npm run dev:setup');

  console.log('\n📝 OAuth Configuration Checklist:');
  console.log('• Supabase Dashboard → Authentication → Providers → Google → Enabled');
  console.log('• Google Client ID/Secret entered in Supabase');
  console.log('• Redirect URLs: http://localhost:3000/auth/callback');
  console.log('• Google OAuth consent screen: App name = "Irish Property Data"');
  console.log('• Google Cloud Console: Authorized redirect URI added');

  console.log('\n🚀 Ready to test? Run: npm run dev:setup');
}

runDiagnostics();

