# Partner Data Normalization Engine

The Partner Data Normalization Engine handles data from different partners who may send data in various formats, with different field names, date formats, and validation requirements.

## Components

### 1. **Partner Settings Schema**
- **Database Table**: `partner_settings`
- **Configuration**: Stored as JSON fields for flexibility
- **Fields**: Field mappings, date formats, validation rules, default values, processing settings

### 2. **Core Engine Classes**
- **FieldMapper**: Maps partner field names to our internal schema
- **DateConverter**: Converts dates from partner format to ISO format
- **DataValidator**: Validates data according to partner-specific rules
- **PartnerDataNormalizer**: Main engine that orchestrates the normalization
- **DataProcessingPipeline**: Batch processing with error handling

### 3. **API Endpoints**
- **`GET/POST /api/partners`**: Manage partner settings
- **`GET/PUT/DELETE /api/partners/[id]`**: Individual partner operations
- **`POST /api/data/process`**: Process raw data through the pipeline

## Example Configuration

### Sample Partner Settings:
```json
{
  "partnerId": 123,
  "partnerName": "Partner ABC",
  "isActive": true,
  "fieldMappings": {
    "conversions": {
      "partner_date": "date",
      "partner_clicks": "allClicks",
      "unique_visits": "uniqueClicks",
      "sign_ups": "registrationsCount",
      "first_deposits": "ftdCount"
    },
    "players": {
      "user_id": "playerId",
      "original_id": "originalPlayerId",
      "registration_date": "signUpDate",
      "first_deposit_date": "firstDepositDate"
    }
  },
  "dateFormats": {
    "inputFormat": "MM/dd/yyyy",
    "timezone": "UTC"
  },
  "validationRules": {
    "required": ["date", "foreignPartnerId", "country"],
    "patterns": {
      "country": "^[A-Z]{2}$",
      "email": "^[^@]+@[^@]+\\.[^@]+$"
    },
    "ranges": {
      "allClicks": { "min": 0, "max": 1000000 },
      "uniqueClicks": { "min": 0, "max": 1000000 }
    }
  },
  "defaultValues": {
    "country": "US",
    "osFamily": "unknown"
  },
  "processingSettings": {
    "skipValidation": false,
    "allowPartialData": true,
    "errorHandling": "permissive",
    "batchSize": 1000
  }
}
```

## Usage Examples

### 1. Create Partner Settings:
```bash
curl -X POST /api/partners \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": 123,
    "partnerName": "Partner ABC",
    "fieldMappings": {...},
    "dateFormats": {...},
    "validationRules": {...}
  }'
```

### 2. Process Data:
```bash
curl -X POST /api/data/process \
  -H "Content-Type: application/json" \
  -d '{
    "partnerId": 123,
    "dataType": "conversions",
    "data": [
      {
        "partner_date": "01/15/2024",
        "partner_clicks": 100,
        "unique_visits": 85,
        "country": "US"
      }
    ]
  }'
```

## Features

### **Data Transformation**
- **Field Mapping**: Convert partner field names to internal schema
- **Date Conversion**: Parse various date formats to ISO standard
- **Type Conversion**: Ensure proper data types (numbers, booleans, strings)
- **Default Values**: Apply defaults for missing fields

### **Validation**
- **Required Fields**: Ensure critical data is present
- **Pattern Matching**: Validate format using regex patterns
- **Range Validation**: Check numeric values are within acceptable ranges
- **Custom Rules**: Partner-specific validation logic

### **Error Handling**
- **Detailed Errors**: Specific error messages with field and value info
- **Batch Processing**: Process large datasets with individual error tracking
- **Error Recovery**: Continue processing despite individual record failures
- **Logging**: Comprehensive logging for debugging and monitoring

### **Processing Options**
- **Strict vs Permissive**: Choose error handling approach
- **Partial Data**: Allow records with some missing fields
- **Batch Size**: Configure processing chunk sizes
- **Skip Validation**: Bypass validation for trusted sources

This system enables Traffboard to seamlessly integrate data from multiple partners with different data formats and requirements, ensuring consistent and validated data in the analytics pipeline.
