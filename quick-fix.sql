-- Quick fix: Just update the consolidation function
DROP FUNCTION IF EXISTS consolidate_property_data();

CREATE FUNCTION consolidate_property_data() RETURNS VOID AS $$
BEGIN
  -- Clear existing consolidated data
  TRUNCATE consolidated_properties;

  -- Insert sold properties with yield calculations
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, price_per_sqm, nominatim_address, scraped_at,
    sold_date, sold_price, asking_price, over_under_percent, source_url, source_page,
    yield_estimate
  )
  SELECT
    sp.id, sp.address, sp.property_type, sp.beds, sp.baths, sp.area_sqm,
    sp.latitude, sp.longitude, sp.eircode, sp.dublin_postcode, sp.price_per_sqm,
    sp.nominatim_address, sp.scraped_at, sp.sold_date, sp.sold_price,
    sp.asking_price, sp.over_under_percent, sp.source_url, sp.source_page,
    calculate_yield_estimate(sp.sold_price, sp.beds, sp.dublin_postcode)
  FROM sold_properties sp;

  -- Insert property listings with yield calculations
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, price_per_sqm, nominatim_address, scraped_at,
    asking_price, source_url, is_listing,
    yield_estimate, price_history
  )
  SELECT
    pl.id, pl.address, pl.property_type, pl.beds, pl.baths, pl.area_sqm,
    pl.latitude, pl.longitude, pl.eircode, pl.dublin_postcode, pl.price_per_sqm,
    pl.nominatim_address, pl.scraped_at, pl.asking_price, pl.source_url,
    TRUE,
    calculate_yield_estimate(pl.asking_price, pl.beds, pl.dublin_postcode),
    pl.price_history
  FROM property_listings pl;

  -- Insert rental listings
  INSERT INTO consolidated_properties (
    id, address, property_type, beds, baths, area_sqm, latitude, longitude,
    eircode, dublin_postcode, nominatim_address, scraped_at,
    is_rental, monthly_rent, rent_per_sqm,
    price_history
  )
  SELECT
    rl.id, rl.address, rl.property_type, rl.beds, rl.baths, rl.area_sqm,
    rl.latitude, rl.longitude, rl.eircode, rl.dublin_postcode,
    rl.nominatim_address, rl.scraped_at, TRUE, rl.monthly_rent,
    rl.rent_per_sqm, rl.price_history
  FROM rental_listings rl;

  -- Update yield confidence based on data quality
  UPDATE consolidated_properties
  SET yield_confidence = CASE
    WHEN yield_estimate IS NULL THEN NULL
    WHEN yield_estimate > 0 AND yield_estimate < 20 THEN 'high'
    WHEN yield_estimate >= 20 THEN 'medium'
    ELSE 'low'
  END;

END;
$$ LANGUAGE plpgsql;




