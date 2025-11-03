# Embassies API Documentation - Postman Testing Guide

Base URL: `http://localhost:3000` (ya apna server URL)

## 1. Create Embassy (POST)
**Endpoint:** `POST /embassies`

**Body (JSON):**
```json
{
  "destinationCountry": "United States",
  "originCountry": "Pakistan",
  "embassyName": "US Embassy Islamabad",
  "address": "Diplomatic Enclave, Islamabad, Pakistan"
}
```

**Alternative Examples:**
```json
{
  "destinationCountry": "United States",
  "originCountry": "India",
  "embassyName": "US Embassy New Delhi",
  "address": "Shantipath, Chanakyapuri, New Delhi 110021, India"
}
```

```json
{
  "destinationCountry": "United States",
  "originCountry": "Pakistan",
  "embassyName": "US Consulate Karachi",
  "address": "Plot 3-5, TPX Area, Mai Kolachi Road, Karachi, Pakistan"
}
```

---

## 2. Get All Embassies with Count (GET)
**Endpoint:** `GET /embassies`

**Query Parameters (Optional):**
- `search` - Search term (e.g., `?search=United States`)

**Examples:**
- `GET /embassies`
- `GET /embassies?search=United States`

**Response Format:**
```json
{
  "status": true,
  "message": "Embassies retrieved successfully",
  "count": 2,
  "data": [
    {
      "destinationCountry": "United States",
      "originCountriesCount": 3
    },
    {
      "destinationCountry": "United Kingdom",
      "originCountriesCount": 2
    }
  ]
}
```

---

## 3. Get Embassies by Destination Country (GET)
**Endpoint:** `GET /embassies/destination/:destinationCountry`

**Examples:**
- `GET /embassies/destination/United States`
- `GET /embassies/destination/United%20States` (URL encoded)
- `GET /embassies/destination/United States?search=Pakistan` (with search)

**Note:** Agar spaces hain URL mein, to URL encode karein ya space ko `%20` se replace karein.

**Response Format:**
```json
{
  "status": true,
  "message": "Embassies retrieved successfully",
  "count": 3,
  "data": [
    {
      "originCountry": "Pakistan",
      "embassiesCount": 3
    },
    {
      "originCountry": "India",
      "embassiesCount": 3
    },
    {
      "originCountry": "Bangladesh",
      "embassiesCount": 1
    }
  ]
}
```

---

## 4. Get Detailed Embassy List by Destination and Origin (GET)
**Endpoint:** `GET /embassies/destination/:destinationCountry/origin/:originCountry`

**Examples:**
- `GET /embassies/destination/United States/origin/Pakistan`
- `GET /embassies/destination/United%20States/origin/Pakistan`
- `GET /embassies/destination/United States/origin/Pakistan?search=Islamabad` (with search)

**Response Format:**
```json
{
  "status": true,
  "message": "Embassies retrieved successfully",
  "count": 3,
  "data": [
    {
      "id": 1,
      "embassyName": "US Embassy Islamabad",
      "location": "Diplomatic Enclave, Islamabad, Pakistan",
      "destinationCountry": "United States",
      "originCountry": "Pakistan",
      "createdAt": "01 January 2025",
      "updatedAt": "01 January 2025"
    },
    {
      "id": 2,
      "embassyName": "US Consulate Karachi",
      "location": "Plot 3-5, TPX Area, Mai Kolachi Road, Karachi, Pakistan",
      "destinationCountry": "United States",
      "originCountry": "Pakistan",
      "createdAt": "01 January 2025",
      "updatedAt": "01 January 2025"
    },
    {
      "id": 3,
      "embassyName": "US Consulate Lahore",
      "location": "Lahore, Pakistan",
      "destinationCountry": "United States",
      "originCountry": "Pakistan",
      "createdAt": "01 January 2025",
      "updatedAt": "01 January 2025"
    }
  ]
}
```

---

## 5. Get Single Embassy by ID (GET)
**Endpoint:** `GET /embassies/:id`

**Examples:**
- `GET /embassies/1`
- `GET /embassies/5`

**Response Format:**
```json
{
  "status": true,
  "message": "Embassy retrieved successfully",
  "data": {
    "id": 1,
    "destinationCountry": "United States",
    "originCountry": "Pakistan",
    "embassyName": "US Embassy Islamabad",
    "address": "Diplomatic Enclave, Islamabad, Pakistan",
    "createdAt": "01 January 2025",
    "updatedAt": "01 January 2025"
  }
}
```

---

## 6. Update Embassy (PATCH)
**Endpoint:** `PATCH /embassies/:id`

**Body (JSON):** - Sab fields optional hain, sirf jo update karna hai wo bhejein
```json
{
  "embassyName": "US Embassy Islamabad - Updated",
  "address": "New Address, Islamabad, Pakistan"
}
```

**Alternative Examples:**
```json
{
  "destinationCountry": "United Kingdom"
}
```

```json
{
  "originCountry": "India",
  "embassyName": "Updated Embassy Name"
}
```

**Examples:**
- `PATCH /embassies/1`

---

## 7. Delete Embassy (DELETE)
**Endpoint:** `DELETE /embassies/:id`

**Examples:**
- `DELETE /embassies/1`
- `DELETE /embassies/5`

**Response Format:**
```json
{
  "status": true,
  "message": "Embassy deleted successfully"
}
```

---

## Complete Testing Flow (Postman Collection Order):

1. **Create Multiple Embassies:**
   - POST `/embassies` - Create US Embassy in Pakistan (Islamabad)
   - POST `/embassies` - Create US Consulate in Pakistan (Karachi)
   - POST `/embassies` - Create US Consulate in Pakistan (Lahore)
   - POST `/embassies` - Create US Embassy in India (New Delhi)
   - POST `/embassies` - Create US Embassy in Bangladesh

2. **View All Embassies:**
   - GET `/embassies` - List all destination countries with counts

3. **View by Destination:**
   - GET `/embassies/destination/United States` - See origin countries with counts

4. **View Detailed List:**
   - GET `/embassies/destination/United States/origin/Pakistan` - See all US embassies in Pakistan

5. **Get Single Embassy:**
   - GET `/embassies/1` - Get details of embassy ID 1

6. **Update Embassy:**
   - PATCH `/embassies/1` - Update embassy details

7. **Delete Embassy:**
   - DELETE `/embassies/1` - Delete embassy

---

## Error Response Format:
```json
{
  "status": false,
  "message": "Error message here"
}
```

## Success Response Format:
```json
{
  "status": true,
  "message": "Success message",
  "data": { ... }
}
```

