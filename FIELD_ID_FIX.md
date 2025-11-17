# Field ID Stability Fix

## Problem
Field responses were getting jumbled because the frontend was using sequential array indices (1, 2, 3, 4) as field IDs instead of the actual stable field IDs from the database. When fields were deleted or reordered, these indices would no longer match the correct fields, causing data to be displayed incorrectly.

## Solution Implemented

### Backend Changes

1. **Stable Field ID Generation**: 
   - Added `maxFieldId` counter to `VisaProduct` entity
   - Field IDs now use a counter that never decreases, ensuring IDs are never reused
   - Even if a field is deleted, its ID will never be assigned to a new field

2. **Improved Validation**:
   - Added validation to ensure submitted field IDs actually exist and are active
   - Better error messages that guide developers to use actual field IDs, not array indices

3. **String Key Support**:
   - Updated entities to support both string and number keys for field IDs
   - Responses are now stored with string keys for consistency (JSON keys are always strings)

4. **Backward Compatibility**:
   - Added migration helper to initialize `maxFieldId` for existing products
   - Code handles both string and number keys when reading responses

### Files Modified

- `src/visa-product/entities/visa-product.entity.ts` - Added `maxFieldId` field
- `src/visa-product/visa-product-fields.service.ts` - Updated ID generation and validation
- `src/travelers/entities/traveler.entity.ts` - Updated type to support string/number keys
- `src/visa-applications/entities/visa-application.entity.ts` - Updated type to support string/number keys

## Frontend Requirements

### Critical: Use Field IDs, Not Array Indices

The frontend **MUST** use the actual `field.id` value from the API response when submitting field responses. Do NOT use array indices or sequential numbers.

### Example: Correct Implementation

```javascript
// ✅ CORRECT: Use field.id from API response
const fields = await fetchFields(visaProductId);
// fields = [
//   { id: 5, question: "Passport Number", fieldType: "text" },
//   { id: 12, question: "Age", fieldType: "number" },
//   { id: 8, question: "Date of Birth", fieldType: "date" }
// ]

const responses = {
  "5": { value: "3232323", submittedAt: "2025-11-15T13:14:18.993Z" },
  "12": { value: "21", submittedAt: "2025-11-15T13:14:18.993Z" },
  "8": { value: "2025-01-01", submittedAt: "2025-11-15T13:14:18.993Z" }
};
```

### Example: Incorrect Implementation

```javascript
// ❌ WRONG: Using array indices
const fields = await fetchFields(visaProductId);
const responses = {
  "1": { value: "3232323" },  // ❌ This is wrong! Use field.id instead
  "2": { value: "21" },       // ❌ This is wrong!
  "3": { value: "2025-01-01" } // ❌ This is wrong!
};
```

### How to Fix Frontend Code

1. **When fetching fields**: Store the field objects with their IDs
   ```javascript
   const fields = await api.get(`/visa-products/${productId}/fields`);
   // Store: fields.data (array of field objects with id, question, fieldType, etc.)
   ```

2. **When building responses**: Use `field.id` as the key
   ```javascript
   const responses = {};
   fields.forEach(field => {
     const value = formData[field.id]; // Get value from form
     responses[field.id] = {
       value: value,
       submittedAt: new Date().toISOString()
     };
   });
   ```

3. **When displaying responses**: Match by field ID
   ```javascript
   const getResponseForField = (fieldId, responses) => {
     return responses[fieldId] || responses[String(fieldId)];
   };
   ```

## Migration for Existing Data

Existing field responses in the database should continue to work because:
- The code handles both string and number keys
- Field IDs remain the same (they're just never reused going forward)

However, if you have existing responses that were stored with incorrect indices, you may need to:
1. Retrieve the field definitions for each visa product
2. Map the old index-based responses to the correct field IDs
3. Update the responses in the database

## Testing

After implementing the frontend changes:
1. Create a new visa product with custom fields
2. Submit responses using the actual field IDs
3. Delete a field
4. Verify that remaining responses still display correctly
5. Add a new field and verify it gets a new ID (not a reused one)

## API Endpoints

- `GET /visa-products/:id/fields` - Returns fields with their stable IDs
- `POST /visa-product-fields/submit-responses` - Submit responses using field IDs
- `GET /visa-product-fields/responses/:applicationId` - Get responses (field IDs are preserved)

## Important Notes

- Field IDs are stable and unique per visa product
- Field IDs are never reused, even after deletion
- Always use `field.id` from the API, never array indices
- The backend now validates that submitted field IDs exist and are active

