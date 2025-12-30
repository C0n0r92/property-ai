#!/usr/bin/env node

/**
 * Property Alert Processing Script
 *
 * This script checks for new properties that match user alert criteria
 * and sends notification emails to subscribed users.
 *
 * Usage:
 *   node scripts/process-alerts.js              # Process all alerts
 *   node scripts/process-alerts.js --dry-run    # Preview without sending emails
 *   node scripts/process-alerts.js --verbose    # Detailed logging
 */

require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM;

// CLI arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose');

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Initialize email transporter
const emailTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASSWORD,
  },
});

/**
 * Log messages with timestamp
 */
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  if (data && isVerbose) {
    console.log(JSON.stringify(data, null, 2));
  }
}

/**
 * Get bounding box coordinates for radius search
 */
function getBoundingBox(center, radiusKm) {
  const earthRadius = 6371; // Earth's radius in km
  const lat = center.lat;
  const lng = center.lng;

  // Convert radius to degrees
  const radiusDeg = (radiusKm / earthRadius) * (180 / Math.PI);

  return {
    minLat: lat - radiusDeg,
    maxLat: lat + radiusDeg,
    minLng: lng - radiusDeg / Math.cos((lat * Math.PI) / 180),
    maxLng: lng + radiusDeg / Math.cos((lat * Math.PI) / 180),
  };
}

/**
 * Parse PostGIS point string to coordinates
 */
function parsePostgisPoint(pointString) {
  // Handle both text format POINT(lng lat) and binary PostGIS format
  if (pointString.startsWith('POINT(')) {
    // Text format: POINT(lng lat)
    const match = pointString.match(/POINT\(([^ ]+) ([^)]+)\)/);
    if (!match) return null;

    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2]),
    };
  } else if (pointString.startsWith('0101')) {
    // Binary PostGIS EWKB format
    try {
      const buffer = Buffer.from(pointString, 'hex');
      if (buffer.length >= 25) {
        // EWKB format: skip 9-byte header, then read lng and lat as little-endian doubles
        const lng = buffer.readDoubleLE(9);  // X coordinate (longitude)
        const lat = buffer.readDoubleLE(17); // Y coordinate (latitude)
        return { lng, lat };
      }
    } catch (error) {
      console.error('Error parsing PostGIS binary format:', error);
    }
    return null;
  }

  return null;
}

/**
 * Match properties to alert criteria
 */
async function matchPropertiesToAlerts(alert) {
  const {
    location_coordinates,
    search_radius_km,
    monitor_sale,
    monitor_rental,
    monitor_sold,
    // Sale config
    sale_min_bedrooms,
    sale_max_bedrooms,
    sale_min_price,
    sale_max_price,
    sale_alert_on_new,
    sale_alert_on_price_drops,
    // Rental config
    rental_min_bedrooms,
    rental_max_bedrooms,
    rental_min_price,
    rental_max_price,
    rental_alert_on_new,
    // Sold config
    sold_min_bedrooms,
    sold_max_bedrooms,
    sold_price_threshold_percent,
    sold_alert_on_under_asking,
    sold_alert_on_over_asking,
    last_checked,
    expires_at,
  } = alert;

  // Skip expired alerts
  if (new Date(expires_at) < new Date()) {
    log(`Skipping expired alert ${alert.id}`);
    return [];
  }

  // Parse coordinates
  log(`Alert ${alert.id} coordinates: ${location_coordinates}`);
  const center = parsePostgisPoint(location_coordinates);
  if (!center) {
    log(`Invalid coordinates for alert ${alert.id}: ${location_coordinates}`);
    return [];
  }

  // Calculate bounding box
  const bounds = getBoundingBox(center, search_radius_km);

  const allMatchingProperties = [];

  // Process sale properties
  if (monitor_sale) {
    const saleQuery = supabase
      .from('consolidated_properties')
      .select('*')
      .gt('scraped_at', last_checked)
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLng)
      .lte('longitude', bounds.maxLng)
      .eq('is_listing', true);

    // Apply sale filters
    if (sale_min_bedrooms) saleQuery.gte('beds', sale_min_bedrooms);
    if (sale_max_bedrooms) saleQuery.lte('beds', sale_max_bedrooms);
    if (sale_min_price) saleQuery.gte('asking_price', sale_min_price);
    if (sale_max_price) saleQuery.lte('asking_price', sale_max_price);

    const { data: saleProperties, error: saleError } = await saleQuery;
    if (!saleError && saleProperties) {
      // Filter by alert triggers
      const matchingSaleProperties = saleProperties.filter(property => {
        if (sale_alert_on_new && property.scraped_at > last_checked) return true;
        if (sale_alert_on_price_drops) {
          // TODO: Implement price drop detection using price_history
          return true;
        }
        return false;
      });
      allMatchingProperties.push(...matchingSaleProperties);
    }
  }

  // Process rental properties
  if (monitor_rental) {
    const rentalQuery = supabase
      .from('consolidated_properties')
      .select('*')
      .gt('scraped_at', last_checked)
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLng)
      .lte('longitude', bounds.maxLng)
      .eq('is_rental', true);

    // Apply rental filters
    if (rental_min_bedrooms) rentalQuery.gte('beds', rental_min_bedrooms);
    if (rental_max_bedrooms) rentalQuery.lte('beds', rental_max_bedrooms);
    if (rental_min_price) rentalQuery.gte('monthly_rent', rental_min_price);
    if (rental_max_price) rentalQuery.lte('monthly_rent', rental_max_price);

    const { data: rentalProperties, error: rentalError } = await rentalQuery;
    if (!rentalError && rentalProperties) {
      const matchingRentalProperties = rentalProperties.filter(property => {
        if (rental_alert_on_new && property.scraped_at > last_checked) return true;
        return false;
      });
      allMatchingProperties.push(...matchingRentalProperties);
    }
  }

  // Process sold properties
  if (monitor_sold) {
    const soldQuery = supabase
      .from('consolidated_properties')
      .select('*')
      .gt('scraped_at', last_checked)
      .gte('latitude', bounds.minLat)
      .lte('latitude', bounds.maxLat)
      .gte('longitude', bounds.minLng)
      .lte('longitude', bounds.maxLng)
      .not('sold_date', 'is', null);

    // Apply sold filters
    if (sold_min_bedrooms) soldQuery.gte('beds', sold_min_bedrooms);
    if (sold_max_bedrooms) soldQuery.lte('beds', sold_max_bedrooms);

    const { data: soldProperties, error: soldError } = await soldQuery;
    if (!soldError && soldProperties) {
      const thresholdPercent = sold_price_threshold_percent || 5;
      const matchingSoldProperties = soldProperties.filter(property => {
        if (!property.asking_price || !property.sold_price) return false;

        const priceDiff = ((property.sold_price - property.asking_price) / property.asking_price) * 100;

        if (sold_alert_on_under_asking && priceDiff < -thresholdPercent) return true;
        if (sold_alert_on_over_asking && priceDiff > thresholdPercent) return true;

        return false;
      });
      allMatchingProperties.push(...matchingSoldProperties);
    }
  }

  // Remove duplicates (in case same property matches multiple criteria)
  const uniqueProperties = allMatchingProperties.filter((property, index, self) =>
    index === self.findIndex(p => p.id === property.id)
  );

  return uniqueProperties;
}

/**
 * Send alert email to user
 */
async function sendAlertEmail(alert, properties) {
  try {
    // Get user email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', alert.user_id)
      .single();

    if (userError || !user) {
      log(`Could not find user for alert ${alert.id}`);
      return false;
    }

    // Group properties by type
    const newListings = properties.filter(p => p.is_listing && !p.is_rental);
    const newRentals = properties.filter(p => p.is_rental);
    const newSales = properties.filter(p => p.sold_date);
    const priceDrops = properties.filter(p => p.price_history?.length > 1);

    // Create email content
    const subject = `${properties.length} new properties in ${alert.location_name}`;
    const html = generateEmailHtml(alert, {
      newListings,
      newRentals,
      newSales,
      priceDrops,
    });

    if (isDryRun) {
      log(`DRY RUN: Would send email to ${user.email} with ${properties.length} properties`);
      return true;
    }

    // Send email
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject,
      html,
    };

    const info = await emailTransporter.sendMail(mailOptions);
    log(`Email sent to ${user.email}: ${info.messageId}`);

    // Auto-save all properties to user's saved properties
    log(`Auto-saving ${properties.length} properties for user ${alert.user_id}`);
    let savedCount = 0;

    for (const property of properties) {
      try {
        // Determine property type
        let propertyType;
        if (property.is_rental) {
          propertyType = 'rental';
        } else if (property.sold_date) {
          propertyType = 'sold';
        } else {
          propertyType = 'listing';
        }

        // Prepare property data for saving
        const propertyData = {
          address: property.address,
          asking_price: property.asking_price,
          sold_price: property.sold_price,
          monthly_rent: property.monthly_rent,
          beds: property.beds,
          baths: property.baths,
          area_sqm: property.area_sqm,
          is_listing: property.is_listing,
          is_rental: property.is_rental,
          sold_date: property.sold_date,
          property_type: property.property_type,
          source_url: property.source_url,
          latitude: property.latitude,
          longitude: property.longitude,
        };

        // Save property (bypass tier check for alert auto-saves)
        const { data: savedProperty, error: saveError } = await supabase
          .from('saved_properties')
          .insert({
            user_id: alert.user_id,
            property_id: property.id,
            property_type: propertyType,
            property_data: propertyData,
            notes: `Auto-saved from alert: ${alert.location_name}`,
          })
          .select()
          .single();

        if (saveError) {
          // Ignore duplicate key errors (property already saved)
          if (saveError.code !== '23505') {
            log(`Warning: Failed to save property ${property.id}:`, saveError.message);
          }
        } else {
          savedCount++;
        }
      } catch (error) {
        log(`Error auto-saving property ${property.id}:`, error.message);
      }
    }

    log(`Auto-saved ${savedCount} out of ${properties.length} properties`);

    return true;
  } catch (error) {
    log(`Error sending email for alert ${alert.id}:`, error);
    return false;
  }
}

/**
 * Generate HTML email content
 */
function generateEmailHtml(alert, propertyGroups) {
  const { newListings, newRentals, newSales, priceDrops } = propertyGroups;
  const totalProperties = newListings.length + newRentals.length + newSales.length + priceDrops.length;

  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Property Alert - ${alert.location_name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background: white; }
    .header { background: #1e293b; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .property-card { border: 1px solid #e2e8f0; border-radius: 8px; margin: 10px 0; padding: 15px; }
    .property-title { font-weight: 600; color: #1e293b; margin-bottom: 5px; }
    .property-price { color: #059669; font-weight: 600; font-size: 18px; }
    .property-details { color: #64748b; font-size: 14px; }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 Property Alert</h1>
      <p>${totalProperties} new properties in ${alert.location_name}</p>
    </div>

    <div class="content">
      <p>Hello,</p>
      <p>We found ${totalProperties} new propert${totalProperties === 1 ? 'y' : 'ies'} matching your alert criteria in ${alert.location_name}:</p>
`;

  // Add property sections
  if (newListings.length > 0) {
    html += `<h3>🏡 New Listings (${newListings.length})</h3>`;
    newListings.forEach(property => {
      html += generatePropertyCard(property, 'listing');
    });
  }

  if (newRentals.length > 0) {
    html += `<h3>🏠 New Rentals (${newRentals.length})</h3>`;
    newRentals.forEach(property => {
      html += generatePropertyCard(property, 'rental');
    });
  }

  if (newSales.length > 0) {
    html += `<h3>💰 Recent Sales (${newSales.length})</h3>`;
    newSales.forEach(property => {
      html += generatePropertyCard(property, 'sale');
    });
  }

  if (priceDrops.length > 0) {
    html += `<h3>📉 Price Changes (${priceDrops.length})</h3>`;
    priceDrops.forEach(property => {
      html += generatePropertyCard(property, 'price_drop');
    });
  }

  html += `
      <p style="text-align: center; margin: 30px 0;">
        <a href="https://irishpropertydata.com/saved" class="button">View Saved Properties</a>
        <div style="margin: 15px 0; font-size: 14px; color: #64748b;">
          💾 All properties from this alert have been automatically saved to your account
        </div>
      </p>

      <p>
        <a href="https://irishpropertydata.com/alerts">Manage Your Alerts</a> |
        <a href="https://irishpropertydata.com/alerts">Unsubscribe</a>
      </p>
    </div>

    <div class="footer">
      <p>
        You're receiving this because you have an alert set up for ${alert.location_name}.<br>
        Irish Property Data | <a href="https://irishpropertydata.com">irishpropertydata.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;

  return html;
}

/**
 * Generate HTML for a single property card
 */
function generatePropertyCard(property, type) {
  const price = property.asking_price ? `€${property.asking_price.toLocaleString()}` :
               property.sold_price ? `€${property.sold_price.toLocaleString()}` :
               property.monthly_rent ? `€${property.monthly_rent}/month` : 'Price TBA';

  const beds = property.beds ? `${property.beds} bed` : '';
  const baths = property.baths ? `${property.baths} bath` : '';
  const area = property.area_sqm ? `${property.area_sqm}m²` : '';

  const details = [beds, baths, area].filter(Boolean).join(', ');

  return `
<div class="property-card">
  <div class="property-title">${property.address}</div>
  <div class="property-price">${price}</div>
  ${details ? `<div class="property-details">${details}</div>` : ''}
</div>`;
}

/**
 * Log alert event
 */
async function logAlertEvent(alertId, eventType, eventData) {
  try {
    await supabase.from('alert_events').insert({
      alert_id: alertId,
      event_type: eventType,
      event_data: eventData,
      sent_at: new Date().toISOString(),
    });
  } catch (error) {
    log(`Error logging event for alert ${alertId}:`, error);
  }
}

/**
 * Main processing function
 */
async function processAlerts() {
  log('Starting alert processing...');

  try {
    // Get all active alerts
    const { data: alerts, error } = await supabase
      .from('location_alerts')
      .select('*')
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString()); // Not expired

    if (error) {
      log('Error fetching alerts:', error);
      return;
    }

    if (!alerts || alerts.length === 0) {
      log('No active alerts found');
      return;
    }

    log(`Processing ${alerts.length} active alerts`);

    let processedCount = 0;
    let emailsSentCount = 0;

    // Process each alert
    for (const alert of alerts) {
      log(`Processing alert ${alert.id} for ${alert.location_name}`);

      try {
        // Find matching properties
        const matchingProperties = await matchPropertiesToAlerts(alert);

        if (matchingProperties.length > 0) {
          log(`Found ${matchingProperties.length} matching properties for alert ${alert.id}`);

          // Send email
          const emailSent = await sendAlertEmail(alert, matchingProperties);

          if (emailSent) {
            emailsSentCount++;

            // Log the event
            await logAlertEvent(alert.id, 'email_sent', {
              property_count: matchingProperties.length,
              properties: matchingProperties.map(p => ({ id: p.id, address: p.address })),
            });
          }
        } else {
          log(`No matching properties for alert ${alert.id}`);
        }

        // Update last_checked timestamp (even if no matches)
        if (!isDryRun) {
          await supabase
            .from('location_alerts')
            .update({ last_checked: new Date().toISOString() })
            .eq('id', alert.id);
        }

        processedCount++;
      } catch (error) {
        log(`Error processing alert ${alert.id}:`, error);
      }
    }

    log(`Processing complete: ${processedCount} alerts processed, ${emailsSentCount} emails sent`);

  } catch (error) {
    log('Fatal error during processing:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  processAlerts()
    .then(() => {
      log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      log('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { processAlerts, matchPropertiesToAlerts };
