# Area Mapping Analysis

## Summary
Analyzed 43,830 properties to check area mapping accuracy and sold numbers.

## Key Findings

### 1. Area Mapping Issues

**Problem**: 4,394 properties (10%) are falling into generic "Dublin" instead of specific areas.

**Root Cause**: The `extractArea` function was too simplistic:
- Only looked for "Dublin X" patterns
- Didn't recognize named areas like "Monkstown", "Blackrock", "Stillorgan", etc.
- Didn't use the DUBLIN_AREAS list for matching

**Examples of mis-mapped addresses**:
- "44mounttown Road, Monkstown, Dublin, Dublin" → Should be "Monkstown" or "Dublin 4"
- "112 Carysfort Park, Blackrock, Dublin, Dublin" → Should be "Blackrock" or "Dublin 4"
- "13 Kilhedge Court, Lusk, Dublin, Dublin" → Should be "Lusk"

### 2. "Co" Area Issue

**Problem**: 760 properties mapped to "Co" (likely from "Co. Dublin")

**Root Cause**: Address parsing incorrectly extracted "Co" as the area name.

### 3. Filtered Out Properties

**Problem**: 1,699 properties are in areas with < 5 properties, so they're filtered out from area statistics.

**Impact**: These properties don't show up in area stats, reducing visibility.

### 4. Sold Numbers Analysis

The sold numbers per area are actually reasonable:
- Dublin 15: 2,743 sales
- Dublin 12: 1,721 sales  
- Dublin 8: 1,676 sales
- Dublin 9: 1,638 sales
- etc.

However, the issue is that many properties aren't being mapped to their correct areas, which:
- Reduces accuracy of area statistics
- Makes it harder to find properties by area
- Skews the "Dublin" generic category

## Improvements Made

### Updated `extractArea` function

Changed `/dashboard/src/lib/data.ts` to use `extractPrimaryArea` from `areas.ts`, which:
- Properly matches Dublin districts (Dublin 1-24)
- Recognizes named areas from DUBLIN_AREAS list
- Handles edge cases better

## Recommendations

1. **Re-run area statistics** after the fix to see improved mapping
2. **Consider using eircodes/postcodes** for better area mapping (many properties have eircodes)
3. **Review "Co" area** - these 760 properties should be remapped
4. **Consider lowering the 5-property threshold** or creating a "Other Areas" category for filtered properties

## Next Steps

1. Test the improved `extractArea` function
2. Regenerate area statistics
3. Verify that generic "Dublin" count decreases
4. Check that "Co" area is resolved
