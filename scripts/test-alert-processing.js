#!/usr/bin/env node

/**
 * Test Alert Processing Script
 *
 * This script tests the alert matching logic without sending emails.
 * It creates a test property and checks if it matches existing alerts.
 *
 * Usage:
 *   node scripts/test-alert-processing.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from dashboard/.env.local
function loadEnv() {
  const envPath = path.join(__dirname, '..', 'dashboard', '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        if (value) {
          process.env[key.trim()] = value;
        }
      }
    });
  }
}

loadEnv();

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Create a test property that should match alerts
 */
async function createTestProperty() {
  console.log('🧪 Creating test property...');

  const testProperty = {
    id: `test_${Date.now()}`,
    address: '123 Test Street, Dublin 1',
    latitude: 53.3498,
    longitude: -6.2603,
    asking_price: 350000, // €350k - should match many alerts
    beds: 2,
    baths: 1,
    property_type: 'Apartment',
    is_listing: true,
    is_rental: false,
    scraped_at: new Date().toISOString(),
    source_url: 'https://example.com/test-property'
  };

  const { data, error } = await supabase
    .from('consolidated_properties')
    .insert(testProperty)
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating test property:', error);
    return null;
  }

  console.log('✅ Test property created:', data.id);
  return data;
}

/**
 * Get all active alerts
 */
async function getActiveAlerts() {
  console.log('📋 Fetching active alerts...');

  const { data: alerts, error } = await supabase
    .from('location_alerts')
    .select('*')
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString());

  if (error) {
    console.error('❌ Error fetching alerts:', error);
    return [];
  }

  console.log(`📊 Found ${alerts.length} active alerts`);
  return alerts;
}

/**
 * Check if a property matches an alert
 */
function propertyMatchesAlert(property, alert) {
  // Basic distance check (simplified - in production we'd use PostGIS)
  const distance = Math.sqrt(
    Math.pow(property.latitude - alert.location_coordinates.lat, 2) +
    Math.pow(property.longitude - alert.location_coordinates.lng, 2)
  ) * 111; // Rough km conversion

  if (distance > alert.search_radius_km) {
    return false;
  }

  // Check property type filters
  if (alert.monitor_sale && property.is_listing) {
    // Check bedrooms
    if (alert.sale_min_bedrooms && property.beds < alert.sale_min_bedrooms) return false;
    if (alert.sale_max_bedrooms && property.beds > alert.sale_max_bedrooms) return false;

    // Check price
    if (alert.sale_min_price && property.asking_price < alert.sale_min_price) return false;
    if (alert.sale_max_price && property.asking_price > alert.sale_max_price) return false;

    return true;
  }

  if (alert.monitor_rental && property.is_rental) {
    // Check bedrooms
    if (alert.rental_min_bedrooms && property.beds < alert.rental_min_bedrooms) return false;
    if (alert.rental_max_bedrooms && property.beds > alert.rental_max_bedrooms) return false;

    // Check price
    if (alert.rental_min_price && property.monthly_rent < alert.rental_min_price) return false;
    if (alert.rental_max_price && property.monthly_rent > alert.rental_max_price) return false;

    return true;
  }

  return false;
}

/**
 * Main test function
 */
async function testAlertProcessing() {
  try {
    console.log('🚀 Starting alert processing test...\n');

    // Get active alerts
    const alerts = await getActiveAlerts();
    if (alerts.length === 0) {
      console.log('⚠️  No active alerts found. Create an alert first using the "Test Create Alert" button.');
      return;
    }

    // Create test property
    const testProperty = await createTestProperty();
    if (!testProperty) return;

    console.log('\n🔍 Testing property matching...\n');

    // Test each alert
    let matchesFound = 0;
    for (const alert of alerts) {
      const matches = propertyMatchesAlert(testProperty, alert);

      console.log(`Alert ${alert.id} (${alert.location_name}): ${matches ? '✅ MATCH' : '❌ No match'}`);

      if (matches) {
        matchesFound++;
        console.log(`   📧 Would send email to user ${alert.user_id}`);
        console.log(`   📍 Location: ${alert.location_name} (${alert.search_radius_km}km radius)`);

        if (alert.monitor_sale) {
          console.log(`   🏠 Sale criteria: ${alert.sale_min_bedrooms || 0}+ beds, €${alert.sale_min_price || 0} - €${alert.sale_max_price || 'unlimited'}`);
        }
        if (alert.monitor_rental) {
          console.log(`   🏢 Rental criteria: ${alert.rental_min_bedrooms || 0}+ beds, €${alert.rental_min_price || 0} - €${alert.rental_max_price || 'unlimited'}/month`);
        }
        if (alert.monitor_sold) {
          console.log(`   💰 Sold criteria: ${alert.sold_min_bedrooms || 0}+ beds, ${alert.sold_price_threshold_percent || 5}% threshold`);
        }

        console.log(`   🏡 Property: ${testProperty.address}, ${testProperty.beds} beds, €${testProperty.asking_price.toLocaleString()}`);
        console.log('');
      }
    }

    console.log(`📈 Results: ${matchesFound} out of ${alerts.length} alerts matched the test property`);

    if (matchesFound > 0) {
      console.log('✅ Alert processing logic is working!');
    } else {
      console.log('⚠️  No alerts matched. Try adjusting alert criteria or test property details.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAlertProcessing().then(() => {
  console.log('\n✨ Test completed!');
  process.exit(0);
});
