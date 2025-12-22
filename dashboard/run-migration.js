#!/usr/bin/env node

/**
 * Database Migration Helper for Irish Property Data
 * Helps run the Supabase database migration
 */

const fs = require('fs');
const path = require('path');

console.log('🗄️  Irish Property Data - Database Migration\n');

const migrationPath = path.join(__dirname, 'supabase-migration.sql');

if (!fs.existsSync(migrationPath)) {
  console.log('❌ supabase-migration.sql not found!');
  process.exit(1);
}

const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Migration SQL loaded successfully');
console.log(`📏 Size: ${migrationSQL.length} characters`);
console.log('📊 Contains:');
console.log(`   - ${migrationSQL.split('CREATE TABLE').length - 1} table creations`);
console.log(`   - ${migrationSQL.split('CREATE POLICY').length - 1} RLS policies`);
console.log(`   - ${migrationSQL.split('CREATE TRIGGER').length - 1} triggers`);
console.log('');

console.log('🔗 To run this migration:');
console.log('');
console.log('1. Go to: https://supabase.com/dashboard/project/yyaidpayutmomsnuuomy/settings/sql');
console.log('2. Click "New Query"');
console.log('3. Copy and paste the entire SQL below:');
console.log('');
console.log('=' .repeat(80));
console.log(migrationSQL);
console.log('=' .repeat(80));
console.log('');
console.log('4. Click "Run" to execute the migration');
console.log('5. Verify tables are created in: Database → Tables');
console.log('');
console.log('✅ After migration, test with: npm run dev:setup');
console.log('');
console.log('🎯 Migration will create:');
console.log('   • users table (with RLS)');
console.log('   • saved_properties table (premium feature)');
console.log('   • user_events table (logging)');
console.log('   • Automatic user creation trigger');
console.log('   • Row Level Security policies');

process.exit(0);

