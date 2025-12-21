# Planning Permission API - Research & Integration Analysis

## Date: December 21, 2025

## 1. API Endpoint Analysis

### Base URL
```
https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0
```

### Coordinate System
- **API Uses:** Web Mercator (EPSG:3857) - wkid: 102100, latestWkid: 3857
- **Our Data Uses:** WGS84 (EPSG:4326) - standard lat/lng
- **Conversion Required:** YES ✅

### Example from Web Search
**Test Coordinates (Web Mercator):** `-700772, 7057130`
**Actual Location:** Finglas area, Dublin

## 2. Our Data Structure

### Sample Property
```json
{
  "address": "293 Blackhorse Ave, Dublin 7, Dublin, Dublin 7, Dublin",
  "latitude": 53.3612766,
  "longitude": -6.309024800000006,
  "eircode": "D07 AYW1",
  "dublinPostcode": "D7"
}
```

### Available Fields for Matching
- ✅ `latitude` / `longitude` (WGS84)
- ✅ `address` (string with house number)
- ✅ `eircode` (Irish postal code - highly accurate)
- ✅ `dublinPostcode` (D7, D15, etc.)
- ✅ `nominatimAddress` (OSM formatted address)

## 3. API Response Structure (from Web Search)

### Key Fields We'll Use
```typescript
{
  OBJECTID: number;
  PlanningAuthority: string;           // "Dublin City Council", "Fingal County Council"
  ApplicationNumber: string;           // "4042/21", "FW21A/0243"
  DevelopmentDescription: string;      // What's being built
  DevelopmentAddress: string;          // Address from planning application
  DevelopmentPostcode: string | null;  // May be null
  ITMEasting: number | null;           // Irish Transverse Mercator coords
  ITMNorthing: number | null;
  ApplicationStatus: string;           // "Decision Notice Issued", "Decision made"
  ApplicationType: string;             // "Retention Permission", "Permission"
  Decision: string;                    // "GRANT PERMISSION", "REFUSED", "APPLICATION DECLARED INVA"
  AreaofSite: number;                  // Site area in m²
  FloorArea: number | null;            // Floor area in m²
  NumResidentialUnits: number | null;
  ReceivedDate: number;                // Unix timestamp (milliseconds)
  DecisionDate: number | null;
  DecisionDueDate: number | null;
  GrantDate: number | null;
  ExpiryDate: number | null;
  AppealRefNumber: string | null;
  AppealStatus: string | null;
  LinkAppDetails: string;              // URL to council planning portal
  ETL_DATE: number;                    // Last updated timestamp
}
```

## 4. Coordinate Conversion

### Web Mercator Formula (EPSG:4326 → EPSG:3857)
```javascript
const R = 6378137; // Earth's radius in meters

function latLngToWebMercator(lat, lng) {
  const x = lng * (R * Math.PI / 180);
  const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) * R;
  return [x, y];
}
```

### Test Cases
**Property:** 293 Blackhorse Ave, Dublin 7
- **WGS84:** `53.3612766, -6.309024800000006`
- **Web Mercator:** `-702,303, 7,048,985` (calculated)
- **Test:** Query with 30m radius should find planning applications

**Property:** 10 Wainsfort Crescent, Terenure
- **WGS84:** `53.3039037, -6.3091258`
- **Web Mercator:** `-702,319, 6,978,449` (calculated)

## 5. Matching Strategy - REVISED

### Issue with Initial Plan
❌ **Eircode NOT used by API** - The web search example shows `DevelopmentPostcode: null` frequently
❌ **ITM Coordinates often null** - Cannot rely on these for distance calculation
✅ **Must use API's spatial query** - Let ArcGIS do the distance filtering

### Updated Approach

1. **Spatial Query (Primary)**
   - Convert property coords to Web Mercator
   - Query with radius: 30m → 75m → 150m (progressive)
   - API returns all applications within radius
   - **Distance calculated by ArcGIS, not us**

2. **Address Matching (Secondary)**
   - Extract house number from our address: "293 Blackhorse Ave" → "293"
   - Match against `DevelopmentAddress` field
   - Handle variations: "293", "293-295", "Apt 1, 293"

3. **Postcode Matching (Tertiary)**
   - Compare `dublinPostcode` (ours) vs `DevelopmentPostcode` (API)
   - Note: API field is often null - low reliability

4. **Planning Authority (Sanity Check)**
   - Dublin properties should match: "Dublin City Council", "Fingal County Council", "South Dublin County Council", "Dún Laoghaire-Rathdown County Council"

## 6. Confidence Scoring - UPDATED

```javascript
function calculateConfidence(application, propertyAddress, dublinPostcode) {
  let score = 0;
  const reasons = [];
  
  // Assume 30m radius query (API already filtered by distance)
  score += 3;
  reasons.push("Within 30m radius");
  
  // Extract house number from our address
  const ourNumber = propertyAddress.match(/^\d+[a-zA-Z]?/)?.[0];
  const theirAddress = application.DevelopmentAddress || "";
  
  // Exact house number match
  if (ourNumber && theirAddress.toLowerCase().includes(ourNumber.toLowerCase())) {
    score += 3;
    reasons.push(`Address match: ${ourNumber}`);
  }
  
  // Street name fuzzy match
  const ourStreet = extractStreetName(propertyAddress); // "Blackhorse Ave"
  const theirStreet = extractStreetName(theirAddress);
  if (similarity(ourStreet, theirStreet) > 0.8) {
    score += 2;
    reasons.push("Street name match");
  }
  
  // Postcode match (if available)
  if (dublinPostcode && application.DevelopmentPostcode) {
    if (normalizePostcode(dublinPostcode) === normalizePostcode(application.DevelopmentPostcode)) {
      score += 1;
      reasons.push("Postcode match");
    }
  }
  
  // Confidence thresholds
  if (score >= 6) return { confidence: 'high', score, reasons };
  if (score >= 4) return { confidence: 'medium', score, reasons };
  return { confidence: 'low', score, reasons };
}
```

## 7. API Query Strategy

### Request Structure
```http
GET https://services.arcgis.com/NzlPQPKn5QF9v2US/arcgis/rest/services/IrishPlanningApplications/FeatureServer/0/query
  ?geometry=-702303,7048985          # Web Mercator x,y
  &geometryType=esriGeometryPoint
  &spatialRel=esriSpatialRelIntersects
  &distance=30                       # meters
  &units=esriSRUnit_Meter
  &outFields=*
  &returnGeometry=false              # We don't need the geometry
  &f=pjson                          # JSON response
```

### Progressive Radius Search
```javascript
async function fetchPlanningApplications(lat, lng, address) {
  const [x, y] = latLngToWebMercator(lat, lng);
  
  // Try 30m first
  let results = await queryArcGIS(x, y, 30);
  if (results.length > 0) return { results, radius: 30 };
  
  // Try 75m
  results = await queryArcGIS(x, y, 75);
  if (results.length > 0) return { results, radius: 75 };
  
  // Offer 150m as opt-in (user clicks "Search wider")
  return { results: [], radius: null, offerWiderSearch: true };
}
```

## 8. Data Validation Concerns

### From Web Search Example
**Observation:** Many applications have:
- ❌ `DevelopmentPostcode: null`
- ❌ `ITMEasting: null`, `ITMNorthing: null`
- ✅ `DevelopmentAddress` - Always present
- ✅ Spatial query works (that's how we got results)

**Implication:** We CANNOT calculate distance ourselves. Must rely on ArcGIS spatial query.

### Edge Cases Found
1. **Truncated Descriptions:** "The development conssist of an existin" (cut off at 70 chars)
2. **Truncated Decisions:** "GRANT PERMISSION FOR RETENTION" → "GRANT RETENTION PERMISSIO" (25 chars)
3. **Blank Applicant Names:** Often empty strings
4. **Adjacent Properties:** "Adjacent to Finglas Business Centre" - Not a specific address
5. **Multiple Councils:** Same site, multiple applications across council boundaries

## 9. Implementation Checklist

### Critical Path
- [x] Research API coordinate system
- [x] Analyze actual API response structure
- [x] Compare with our data structure
- [x] Identify available matching fields
- [ ] Implement Web Mercator conversion
- [ ] Test conversion with sample properties
- [ ] Implement progressive radius search
- [ ] Build confidence scoring algorithm
- [ ] Handle truncated text fields
- [ ] Add error handling for API failures

### Integration Points
1. **API Route:** Convert coords, query ArcGIS, score results
2. **Types:** Add proper TypeScript interfaces matching API exactly
3. **UI Component:** Display grouped by confidence, handle truncation
4. **Caching:** 24hr TTL to reduce API load

## 10. Recommended Plan Updates

### Changes from Original Plan
1. ✅ **Remove eircode from matching** - API doesn't provide it reliably
2. ✅ **Remove distance calculation** - Let ArcGIS handle it via spatial query
3. ✅ **Add text truncation handling** - API truncates long fields
4. ✅ **Simplify scoring** - Focus on: spatial proximity + house number + street name
5. ✅ **Add field length constants** - Document max lengths from API schema

### New Confidence Formula
```
High (6+ points):
  - Within radius (3 pts)
  - House number match (3 pts)
  - Street name match (2 pts bonus)

Medium (4-5 points):
  - Within radius (3 pts)
  - Street name match (2 pts)
  OR
  - Within radius (3 pts)
  - House number match (3 pts)
  - Different street (-2 pts penalty)

Low (1-3 points):
  - Within radius only
  - No address match
```

## 11. Test Plan

### Unit Tests
```javascript
describe('Coordinate Conversion', () => {
  it('converts Dublin coords to Web Mercator', () => {
    const [x, y] = latLngToWebMercator(53.3612766, -6.309024800000006);
    expect(x).toBeCloseTo(-702303, -2);
    expect(y).toBeCloseTo(7048985, -2);
  });
});

describe('Confidence Scoring', () => {
  it('gives high confidence for exact address match within 30m', () => {
    const result = calculateConfidence({
      DevelopmentAddress: "293 Blackhorse Avenue, Dublin 7",
      // ... other fields
    }, "293 Blackhorse Ave, Dublin 7, Dublin", "D7");
    
    expect(result.confidence).toBe('high');
    expect(result.score).toBeGreaterThanOrEqual(6);
  });
});
```

### Integration Tests
- Query real API with test coordinates
- Verify response structure matches schema
- Test progressive radius fallback
- Verify caching works

## 12. Performance Considerations

- **Caching:** 24hr server-side cache (Map + TTL)
- **Rate Limiting:** Unknown - add retry logic with exponential backoff
- **Response Time:** ~500ms typical, ~2s worst case
- **Payload Size:** ~5-50 KB per response (5-100 applications)


