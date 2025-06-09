# Dimension-Based Partner Normalization

## **The Problem You Solved**

Instead of just mapping field names, you need **normalized dimensions** for dashboard filtering:

- **Makeberry** sends buyer as `webID`, funnel as `source`
- **Rockit** sends buyer as `sub2`, funnel as `source`
- **Dashboard** needs to filter by "Buyer" and "Funnel" regardless of partner

## **New Architecture: Star Schema**

### **Dimension Tables** (for filtering)
```sql
-- buyers (normalized buyer dimension)
id | name                    | partner_id | original_value | original_field
1  | Makeberry buyer: 12345  | 100       | 12345         | webID
2  | Rockit buyer: 67890     | 200       | 67890         | sub2

-- funnels (normalized funnel dimension)  
id | name                      | partner_id | original_value | original_field
1  | Makeberry funnel: facebook| 100       | facebook      | source
2  | Rockit funnel: google     | 200       | google        | source
```

### **Fact Tables** (with dimension references)
```sql
-- conversions (updated with dimension FKs)
id | date       | buyer_id | funnel_id | all_clicks | registrations | ...
1  | 2024-01-15 | 1        | 1         | 100       | 25           | ...
2  | 2024-01-15 | 2        | 2         | 150       | 30           | ...
```

## **Partner Configuration Examples**

### **Makeberry Configuration**
```json
{
  "partnerId": 100,
  "partnerName": "Makeberry",
  "dimensionMappings": {
    "buyer": "webID",
    "funnel": "source",
    "campaign": "campaign_id"
  },
  "fieldMappings": {
    "conversions": {
      "clicks": "allClicks",
      "signups": "registrationsCount"
    }
  }
}
```

### **Rockit Configuration**
```json
{
  "partnerId": 200,
  "partnerName": "Rockit", 
  "dimensionMappings": {
    "buyer": "sub2",
    "funnel": "source",
    "campaign": "campaign_id"
  },
  "fieldMappings": {
    "conversions": {
      "visits": "allClicks",
      "regs": "registrationsCount"
    }
  }
}
```

## **Data Flow Example**

### **1. Raw Data Input**
```json
// Makeberry sends:
{
  "webID": "buyer123",
  "source": "facebook",
  "clicks": 100,
  "signups": 25
}

// Rockit sends:
{
  "sub2": "buyer456", 
  "source": "google",
  "visits": 150,
  "regs": 30
}
```

### **2. Dimension Normalization**
```typescript
const dimensionNormalizer = new DimensionNormalizer(100, "Makeberry", {
  buyer: "webID",
  funnel: "source"
});

const dimensions = await dimensionNormalizer.normalizeAllDimensions(data);
// Result: { buyerId: 1, funnelId: 1, sourceId: null, campaignId: null }
```

### **3. Stored in Database**
```sql
-- New buyer dimension created:
INSERT INTO buyers (name, partner_id, original_value, original_field)
VALUES ('Makeberry buyer: buyer123', 100, 'buyer123', 'webID');

-- New funnel dimension created:
INSERT INTO funnels (name, partner_id, original_value, original_field) 
VALUES ('Makeberry funnel: facebook', 100, 'facebook', 'source');

-- Fact record with dimension references:
INSERT INTO conversions (buyer_id, funnel_id, all_clicks, registrations_count)
VALUES (1, 1, 100, 25);
```

## **Dashboard Benefits**

### **Unified Filtering**
```typescript
// Dashboard can now filter by normalized dimensions:
const conversionsByBuyer = await db
  .select()
  .from(conversions)
  .innerJoin(buyers, eq(conversions.buyerId, buyers.id))
  .where(eq(buyers.name, 'Makeberry buyer: buyer123'));

const conversionsByFunnel = await db
  .select() 
  .from(conversions)
  .innerJoin(funnels, eq(conversions.funnelId, funnels.id))
  .where(eq(funnels.category, 'social'));
```

### **Cross-Partner Analytics**
```sql
-- Compare all buyers across partners
SELECT b.name, SUM(c.registrations_count) as total_registrations
FROM conversions c
JOIN buyers b ON c.buyer_id = b.id  
GROUP BY b.name
ORDER BY total_registrations DESC;

-- Compare funnel performance across partners
SELECT f.name, f.category, SUM(c.all_clicks) as total_clicks
FROM conversions c
JOIN funnels f ON c.funnel_id = f.id
GROUP BY f.name, f.category;
```

## **API Usage**

### **Create Partner Settings**
```bash
curl -X POST /api/partners \
  -d '{
    "partnerId": 100,
    "partnerName": "Makeberry",
    "dimensionMappings": {
      "buyer": "webID",
      "funnel": "source"
    }
  }'
```

### **Process Data**
```bash
curl -X POST /api/data/process \
  -d '{
    "partnerId": 100,
    "dataType": "conversions", 
    "data": [
      {
        "webID": "buyer123",
        "source": "facebook",
        "clicks": 100,
        "signups": 25
      }
    ]
  }'
```

### **Get Normalized Dimensions for Dashboard**
```bash
curl /api/dimensions/buyers
curl /api/dimensions/funnels  
curl /api/dimensions/sources
```

This approach enables clean dashboard filtering while maintaining data lineage and supporting cross-partner analytics!
