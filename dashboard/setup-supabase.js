#!/usr/bin/env node

/**
 * Supabase Setup Script for Irish Property Data
 * This script helps set up the Supabase authentication and database
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Irish Property Data - Supabase Setup\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
const envExample = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Existing configuration (keep these)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-43FMLL1ZG0
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51SeeJqDtDu9sReN1lIsDf4gSWhQsBcv5zrZROYXP00UGpqEhlVhBnMmbVWQBg1Qlk3et3CgnhR5mNgKGRFzjOQZU00Jv3iDsL2
`;

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env.local file...');
  fs.writeFileSync(envPath, envExample);
  console.log('✅ .env.local created with Supabase configuration template');
  console.log('⚠️  IMPORTANT: You need to add your SUPABASE_SERVICE_ROLE_KEY');
  console.log('   Get it from: Supabase Dashboard → Settings → API → service_role key\n');
} else {
  console.log('📝 .env.local already exists. Checking if Supabase config is present...');

  const envContent = fs.readFileSync(envPath, 'utf8');

  const hasSupabaseUrl = envContent.includes('NEXT_PUBLIC_SUPABASE_URL');
  const hasSupabaseKey = envContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (!hasSupabaseUrl || !hasSupabaseKey) {
    console.log('❌ Supabase configuration missing. Adding it...');

    // Add Supabase config at the top
    const supabaseConfig = `# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

`;

    const newContent = supabaseConfig + envContent;
    fs.writeFileSync(envPath, newContent);
    console.log('✅ Supabase configuration added to .env.local');
    console.log('⚠️  IMPORTANT: Update SUPABASE_SERVICE_ROLE_KEY with your actual key');
  } else {
    console.log('✅ Supabase configuration appears to be present');
  }
}

console.log('\n📋 Next Steps:');
console.log('1. Get your SUPABASE_SERVICE_ROLE_KEY from Supabase Dashboard → Settings → API');
console.log('2. Update SUPABASE_SERVICE_ROLE_KEY in .env.local');
console.log('3. Run the database migration in Supabase SQL Editor:');
console.log('   Copy contents of supabase-migration.sql and run it');
console.log('4. Test with: npm run dev:setup\n');

console.log('🎯 Ready to test authentication and premium features!');

process.exit(0);
