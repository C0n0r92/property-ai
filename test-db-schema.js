// Quick test to verify the is_free_tier column exists
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSchema() {
  try {
    console.log('Testing database schema...');

    // Test if we can select from location_alerts table
    const { data, error } = await supabase
      .from('location_alerts')
      .select('id, is_free_tier')
      .limit(1);

    if (error) {
      console.error('Error accessing location_alerts table:', error.message);
      return false;
    }

    console.log('✅ Successfully accessed location_alerts table');
    console.log('✅ is_free_tier column exists');

    // Test if we can insert (this will fail due to RLS, but should not fail due to missing column)
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // fake UUID
      location_name: 'Test Location',
      location_coordinates: 'POINT(0 0)',
      search_radius_km: 2,
      monitor_sale: true,
      monitor_rental: false,
      monitor_sold: false,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      is_free_tier: true
    };

    const { error: insertError } = await supabase
      .from('location_alerts')
      .insert(testData);

    if (insertError) {
      if (insertError.message.includes('violates row-level security policy')) {
        console.log('✅ Column schema is correct (insert failed due to RLS, not schema)');
        return true;
      } else {
        console.error('❌ Schema error:', insertError.message);
        return false;
      }
    }

    console.log('✅ Schema test passed');
    return true;

  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

testSchema().then(success => {
  process.exit(success ? 0 : 1);
});
