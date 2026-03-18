# Gaff Intel B2B API Documentation

## Overview
The Gaff Intel API provides property valuation and comparable sales analysis for authenticated users. All endpoints require Supabase authentication.

## Authentication
Include your Supabase session token in the Authorization header:
```bash
Authorization: Bearer YOUR_SUPABASE_SESSION_TOKEN
```

## Endpoints

### POST /api/search
Search for a property and get comparable sales analysis.

**Query Parameters:**
- `q` (required): Property address (minimum 2 characters)

**Response on Success (200):**
```json
{
  "found": true,
  "property": {
    "address": "123 Grafton Street, Dublin",
    "beds": 2,
    "baths": 1,
    "areaSqm": 85,
    "propertyType": "apartment",
    "soldPrice": 450000,
    "askingPrice": 425000,
    "deal": {
      "verdict": "fair_price",
      "assessment": "This property sold at fair market rate"
    }
  },
  "comparables": [
    {
      "address": "125 Grafton Street, Dublin",
      "soldPrice": 445000,
      "beds": 2,
      "distance": 0.05,
      "scrapedAt": "2026-02-20"
    }
  ],
  "stats": {
    "medianPrice": 450000,
    "averagePrice": 447500,
    "minPrice": 420000,
    "maxPrice": 480000,
    "medianPricePerSqm": 5290.12,
    "averagePricePerSqm": 5265.11,
    "count": 10
  }
}
```

**Multiple Matches (200):**
When multiple properties match the query, disambiguation UI is shown:
```json
{
  "found": false,
  "multiple": true,
  "matches": [
    { "address": "1 Main Street, Dublin", "beds": 2, "price": 450000 },
    { "address": "1 Main Street, Dublin 2", "beds": 3, "price": 550000 }
  ],
  "message": "Found 5 properties matching \"Main Street\". Please select one."
}
```

**Error Responses:**

- **400 Bad Request**: Query too short
```json
{ "error": "Search query must be at least 2 characters" }
```

- **401 Unauthorized**: Not authenticated
```json
{ "error": "Unauthorized" }
```

- **404 Not Found**: Property not found
```json
{
  "found": false,
  "error": "No properties found matching that address",
  "suggestions": "Try searching with a street address or part of the address"
}
```

- **429 Too Many Requests**: Search limit exceeded
```json
{
  "error": "You have reached your monthly search limit of 5. Upgrade your plan to continue.",
  "limitReached": true
}
```

- **500 Internal Server Error**: Server error
```json
{ "error": "Internal server error" }
```

## Deal Verdict Values

| Verdict | Condition | Interpretation |
|---------|-----------|-----------------|
| `great_deal` | Price < 85% of median | Exceptional value (15%+ below market) |
| `good_value` | Price 85-95% of median | Good value (5-15% below market) |
| `fair_price` | Price 95-105% of median | At market rate (±5%) |
| `above_market` | Price 105-115% of median | Premium (5-15% above market) |
| `premium` | Price > 115% of median | Premium price (15%+ above market) |

## Search Limits by Plan

| Plan | Monthly Searches | Price | Features |
|------|-----------------|-------|----------|
| Free | 5 | €0 | Basic search |
| Starter | 25 | €49 | PDF export |
| Professional | 250 | €99 | Saved searches, 3 team seats |
| Agency | 1000 | €249 | All features, 10 team seats |

## Data Caching

- Property data is cached in memory for 1 hour
- Cache is shared across all requests
- TTL resets when fresh data is fetched

## Comparable Property Algorithm

1. **Geographic Match**: Properties within 2km (haversine distance)
2. **Type Match**: Same property type
3. **Bedroom Match**: Within ±1 bedroom
4. **Sort Priority**: Recent first, then closest distance
5. **Limit**: Maximum 10 comparables returned

## Requirements

**Supabase Tables:**
- `user_subscriptions` - User billing information
  - `user_id` (UUID, primary key)
  - `tier` (text: free|starter|professional|agency)
  - `searches_used_this_month` (integer)
  - `current_period_end` (timestamp)

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_DATA_URL` - Property data JSON URL (optional, defaults to irishpropertydata.com)

**Property Data Format:**
```json
{
  "properties": [
    {
      "address": "string",
      "latitude": number,
      "longitude": number,
      "beds": number,
      "baths": number,
      "areaSqm": number,
      "propertyType": "house|apartment|terraced|detached",
      "soldPrice": number,
      "askingPrice": number,
      "scrapedAt": "ISO8601 date string"
    }
  ]
}
```

## Usage Example

```bash
# Search for a property
curl -X GET "http://localhost:3000/api/search?q=Grafton%20Street%20Dublin" \
  -H "Authorization: Bearer YOUR_SUPABASE_TOKEN" \
  -H "Content-Type: application/json"
```
