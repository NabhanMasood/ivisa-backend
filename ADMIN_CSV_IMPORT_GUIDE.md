# CSV Import Guide for Admin Panel

## Overview

The CSV Import feature allows administrators to bulk import visa products and nationality mappings from a CSV file. This feature supports two formats:

1. **Standard Format**: One row per nationality-visa product pair (recommended for clarity)
2. **Compact Format**: Multiple visa products per row (useful for bulk imports)

## Accessing the Feature

1. Navigate to the **Nationalities** section in the admin panel
2. Click on the **"Import CSV"** button
3. Select your CSV file
4. Click **"Upload"** to start the import process

## API Endpoint

**POST** `/nationalities/import`

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: CSV files only
- Max file size: 10MB

**Response:**
```json
{
  "status": true,
  "message": "Successfully imported 10 rows. Created 5 visa products, reused 2, and created 8 nationality records.",
  "data": {
    "totalRows": 10,
    "processed": 10,
    "visaProductsCreated": 5,
    "visaProductsReused": 2,
    "nationalitiesCreated": 8,
    "errors": []
  }
}
```

## CSV Format Options

### Format 1: Standard Format (Recommended)

**Best for:** Easy editing, clear visibility, different fee structures per nationality

Each row represents one nationality-visa product pair.

#### Required Columns

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| `nationality` | Nationality/country name (must exist in Countries table) | "United States" | ✅ Yes |
| `destination` | Destination country for the visa | "Thailand" | ✅ Yes |
| `productName` | Name of the visa product | "Tourist Visa" | ✅ Yes |
| `duration` | Visa duration in days | 30 | ✅ Yes |
| `validity` | Visa validity period in days | 90 | ✅ Yes |
| `entryType` | Entry type: `single`, `multiple`, or `custom` | "single" | ✅ Yes |
| `customEntryName` | Required only if `entryType` is `custom` | "Double Entry" | ⚠️ Conditional |
| `govtFee` | Government fee amount | 50.00 | ✅ Yes |
| `serviceFee` | Service fee amount | 25.00 | ✅ Yes |
| `totalAmount` | Total amount | 75.00 | ✅ Yes |
| `isFreeVisa` | Whether visa is free (true/false) | false | ❌ No |
| `processingFees` | Processing fee options (see format below) | See below | ❌ No |

#### Example CSV (Standard Format)

```csv
nationality,destination,productName,duration,validity,entryType,customEntryName,govtFee,serviceFee,totalAmount,isFreeVisa,processingFees
United States,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,"Standard:5:days:0.00|Express:3:days:20.00|Rush:24:hours:50.00"
United States,Thailand,Business Visa,90,180,multiple,,100.00,50.00,150.00,false,"Standard:7:days:0.00|Express:5:days:30.00"
United Kingdom,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,"Standard:5:days:0.00|Express:3:days:20.00"
```

### Format 2: Compact Format

**Best for:** Bulk imports, many products for same nationality, reducing file size

One row can contain multiple visa products for the same nationality.

#### Required Columns

| Column | Description | Example | Required |
|--------|-------------|---------|----------|
| `nationality` | Nationality/country name | "United States" | ✅ Yes |
| `destination` | Destination country | "Thailand" | ✅ Yes |
| `products` | Multiple products in structured format (see below) | See below | ✅ Yes |

#### Products Format

Products are separated by semicolons (`;`). Each product follows this format:

```
productName:duration:validity:entryType:customEntryName:govtFee:serviceFee:totalAmount:isFreeVisa:processingFees
```

**Note:** If `entryType` is not `custom`, leave `customEntryName` empty. If no processing fees, leave that part empty.

#### Example CSV (Compact Format)

```csv
nationality,destination,products
United States,Thailand,"Tourist Visa:30:90:single::50.00:25.00:75.00:false:Standard:5:days:0.00|Express:3:days:20.00;Business Visa:90:180:multiple::100.00:50.00:150.00:false:Standard:7:days:0.00"
United Kingdom,Thailand,"Tourist Visa:30:90:single::50.00:25.00:75.00:false:Standard:5:days:0.00"
```

## Processing Fees Format

Processing fees are optional and use this format:

```
feeType:timeValue:timeUnit:amount|feeType:timeValue:timeUnit:amount|...
```

**Format breakdown:**
- `feeType`: Name of the processing option (e.g., "Standard", "Express", "Rush")
- `timeValue`: Number (e.g., 3, 5, 24)
- `timeUnit`: Either "hours" or "days"
- `amount`: Additional fee amount (decimal)
- Multiple fees are separated by pipe (`|`)

**Example:**
```
Standard:5:days:0.00|Express:3:days:20.00|Rush:24:hours:50.00
```

This creates three processing options:
- **Standard**: 5 days, $0.00 extra
- **Express**: 3 days, $20.00 extra
- **Rush**: 24 hours, $50.00 extra

## How It Works

### Scenario 1: New Visa Product + New Nationality
If you upload a row with a visa product that doesn't exist:
1. ✅ **Visa Product is created** with all provided details
2. ✅ **Nationality record is created** linking the nationality to the visa product

### Scenario 2: Existing Visa Product + New Nationality
If the visa product already exists (same `destination` + `productName`):
1. ✅ **Visa Product is reused** (not duplicated)
2. ✅ **Nationality record is created** linking the new nationality to the existing product

### Scenario 3: Multiple Products for Same Nationality
You can assign multiple visa products to the same nationality by:
- **Standard Format**: Adding multiple rows with the same nationality but different products
- **Compact Format**: Including multiple products in the `products` column

## Step-by-Step Import Process

1. **Prepare your CSV file**
   - Use one of the supported formats (Standard or Compact)
   - Ensure all required columns are present
   - Verify nationality names exist in the Countries table
   - Check that numeric values are valid

2. **Upload the file**
   - Click "Import CSV" in the Nationalities section
   - Select your CSV file
   - Click "Upload"

3. **Review the results**
   - Check the import summary:
     - Total rows processed
     - Visa products created/reused
     - Nationality records created
     - Any errors encountered

4. **Handle errors** (if any)
   - Review error messages for each failed row
   - Fix issues in your CSV file
   - Re-upload the corrected file

## Validation Rules

The system validates:

- ✅ All required fields are provided
- ✅ `duration` and `validity` are positive integers
- ✅ `govtFee`, `serviceFee`, and `totalAmount` are non-negative decimals
- ✅ `entryType` is one of: `single`, `multiple`, or `custom`
- ✅ If `entryType` is `custom`, `customEntryName` is provided
- ✅ `isFreeVisa` is `true` or `false` (case-insensitive)
- ✅ `nationality` exists in the countries table
- ✅ `timeUnit` in processing fees is `hours` or `days`

## Common Use Cases

### Use Case 1: Adding Multiple Nationalities to Existing Product

**Scenario:** You have a "Tourist Visa" for Thailand, and want to add it for 10 different nationalities.

**Solution:** Use Standard Format with 10 rows, all with the same `destination` and `productName` but different `nationality` values. The system will reuse the existing visa product.

```csv
nationality,destination,productName,duration,validity,entryType,customEntryName,govtFee,serviceFee,totalAmount,isFreeVisa,processingFees
United States,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,...
United Kingdom,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,...
Canada,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,...
...
```

### Use Case 2: Creating New Products with Multiple Nationalities

**Scenario:** You're adding a new destination with 3 visa products, and each product should be available for 5 nationalities.

**Solution:** Use Standard Format. Create 15 rows (3 products × 5 nationalities). The system will create the 3 visa products and 15 nationality records.

### Use Case 3: Bulk Import for Single Nationality

**Scenario:** You want to add 10 different visa products for "United States" to various destinations.

**Solution:** Use Compact Format to put all products in one row, or Standard Format with 10 rows.

## Error Handling

### Common Errors and Solutions

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Nationality does not exist" | The nationality name doesn't match any country in the Countries table | Verify the nationality name matches exactly (case-sensitive) |
| "Invalid entryType" | entryType is not `single`, `multiple`, or `custom` | Check spelling and use lowercase |
| "customEntryName is required" | entryType is `custom` but customEntryName is missing | Provide a value for customEntryName |
| "Invalid duration" | Duration is not a positive integer | Ensure duration is a number ≥ 1 |
| "Invalid govtFee" | govtFee is not a valid decimal | Check the value is a number ≥ 0 |
| "Missing required field" | A required column is empty | Fill in all required fields |
| "Invalid CSV format" | File doesn't match either format | Ensure you have either `productName` column (standard) or `products` column (compact) |

### Error Response Format

If errors occur, the response will include details:

```json
{
  "status": false,
  "message": "Imported 8 rows with 2 errors...",
  "data": {
    "totalRows": 10,
    "processed": 8,
    "visaProductsCreated": 5,
    "visaProductsReused": 1,
    "nationalitiesCreated": 7,
    "errors": [
      {
        "row": 3,
        "error": "Nationality 'InvalidCountry' does not exist in countries table"
      },
      {
        "row": 7,
        "error": "Invalid duration: abc"
      }
    ]
  }
}
```

## Best Practices

1. **Start Small**: Test with a small CSV file (5-10 rows) before importing large datasets
2. **Backup First**: Always backup your database before bulk imports
3. **Validate Data**: Double-check your CSV file for:
   - Correct nationality names (must match Countries table exactly)
   - Valid numeric values
   - Proper formatting
4. **Use Standard Format**: For easier editing and debugging, use Standard Format
5. **Check Results**: Always review the import summary to verify:
   - Expected number of products created/reused
   - Expected number of nationality records created
   - No unexpected errors
6. **Handle Errors**: Fix errors in your CSV and re-import rather than manually fixing in the database
7. **Processing Fees**: If processing fees are complex, test with a simple example first

## Tips

- **Excel/Google Sheets**: You can prepare your CSV in Excel or Google Sheets, then export as CSV
- **Template**: Start with the provided template and modify it for your needs
- **Incremental Imports**: You can import in batches - the system handles existing products gracefully
- **Case Sensitivity**: Nationality names are case-sensitive - ensure exact matches
- **Empty Fields**: Leave optional fields empty rather than filling with placeholder values

## Troubleshooting

### Import fails with "CSV file is empty or invalid"
- Check that your CSV file is properly formatted
- Ensure the file is saved as CSV (not Excel format)
- Verify the file has a header row

### Some rows imported but others failed
- Check the error messages in the response
- Fix the issues in your CSV file
- Re-import the corrected file (existing records won't be duplicated)

### Processing fees not appearing
- Verify the processing fees format is correct
- Check that pipe separators (`|`) are used correctly
- Ensure all parts of each fee are provided (feeType:timeValue:timeUnit:amount)

### Products created but nationalities not linked
- Verify the nationality name exists in the Countries table
- Check for typos in nationality names
- Ensure destination and productName match exactly

## Support

If you encounter issues not covered in this guide:

1. Check the error messages in the import response
2. Verify your CSV format matches one of the supported formats
3. Review the validation rules above
4. Test with a minimal CSV file to isolate the issue

## Example Files

### Minimal Example (Standard Format)
```csv
nationality,destination,productName,duration,validity,entryType,customEntryName,govtFee,serviceFee,totalAmount,isFreeVisa,processingFees
United States,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,
```

### With Processing Fees (Standard Format)
```csv
nationality,destination,productName,duration,validity,entryType,customEntryName,govtFee,serviceFee,totalAmount,isFreeVisa,processingFees
United States,Thailand,Tourist Visa,30,90,single,,50.00,25.00,75.00,false,"Standard:5:days:0.00|Express:3:days:20.00"
```

### Custom Entry Type (Standard Format)
```csv
nationality,destination,productName,duration,validity,entryType,customEntryName,govtFee,serviceFee,totalAmount,isFreeVisa,processingFees
United States,Thailand,Double Entry Visa,30,90,custom,Double Entry,75.00,30.00,105.00,false,"Standard:7:days:0.00"
```

### Compact Format Example
```csv
nationality,destination,products
United States,Thailand,"Tourist Visa:30:90:single::50.00:25.00:75.00:false:Standard:5:days:0.00|Express:3:days:20.00;Business Visa:90:180:multiple::100.00:50.00:150.00:false:Standard:7:days:0.00"
```

---

**Last Updated:** 2024
**Version:** 1.0

