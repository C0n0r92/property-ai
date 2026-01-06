// Test script to verify newsletter signup with blog_slug works
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testNewsletterSignup() {
  console.log('🧪 Testing newsletter signup with blog_slug...\n');

  // Test data
  const testEmail = `test-${Date.now()}@example.com`;
  const testData = {
    email: testEmail,
    source: 'ai-summary',
    blogSlug: 'test-blog-slug'
  };

  console.log('📤 Sending test data:', testData);

  try {
    // Make API call
    const response = await fetch('http://localhost:3000/api/newsletter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();
    console.log('📥 API Response:', result);

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    // Verify data was stored
    console.log('\n🔍 Verifying data was stored in database...');

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supabase
      .from('newsletter_subscribers')
      .select('*')
      .eq('email', testEmail)
      .single();

    if (error) {
      console.error('❌ Database query error:', error);
      return;
    }

    console.log('✅ Data found in database:');
    console.log(JSON.stringify(data, null, 2));

    // Verify fields
    const checks = {
      'Email matches': data.email === testEmail,
      'Source is ai-summary': data.source === 'ai-summary',
      'Blog slug is correct': data.blog_slug === 'test-blog-slug',
      'Subscribed timestamp exists': !!data.subscribed_at,
      'Created timestamp exists': !!data.created_at,
    };

    console.log('\n🔎 Field verification:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${check}`);
    });

    const allPassed = Object.values(checks).every(Boolean);
    console.log(`\n${allPassed ? '🎉 All tests passed!' : '❌ Some tests failed'}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testNewsletterSignup();
