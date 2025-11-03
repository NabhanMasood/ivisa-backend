# Applications API - Postman Quick Reference

Base URL: `http://localhost:3000`

---

## 📝 1. CREATE APPLICATION
**Method:** `POST`  
**URL:** `http://localhost:3000/customers/applications`  
**Headers:** `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "applicationNumber": "APP-01245",
  "customerId": 1,
  "destination": "UAE",
  "visaProduct": "30-Day Visa",
  "price": 100,
  "status": "Approved"
}
```

**More Examples:**
```json
{
  "applicationNumber": "APP-01246",
  "customerId": 1,
  "destination": "Thailand",
  "visaProduct": "Tourist Visa",
  "price": 150,
  "status": "In Review"
}
```

```json
{
  "applicationNumber": "APP-01247",
  "customerId": 1,
  "destination": "Germany",
  "visaProduct": "Schengen Visa",
  "price": 200,
  "status": "Pending"
}
```

**Note:** Status optional hai, agar nahi diya to default `Pending` hoga.

**Status Options:** `Pending`, `In Review`, `Approved`, `Rejected`

---

## 📋 2. GET ALL APPLICATIONS
**Method:** `GET`  
**URL:** `http://localhost:3000/customers/applications/all`  
**URL with Search:** `http://localhost:3000/customers/applications/all?search=UAE`

**No Body Required**

---

## 📄 3. GET SINGLE APPLICATION
**Method:** `GET`  
**URL:** `http://localhost:3000/customers/applications/1`

**No Body Required**

---

## 📄 4. GET CUSTOMER APPLICATIONS (Customer Specific)
**Method:** `GET`  
**URL:** `http://localhost:3000/customers/1/applications`  
**URL with Search:** `http://localhost:3000/customers/1/applications?search=UAE`

**No Body Required**

**Note:** Yeh endpoint customer ke applications tab ke liye hai.

---

## ✏️ 5. UPDATE APPLICATION
**Method:** `PATCH`  
**URL:** `http://localhost:3000/customers/applications/1`  
**Headers:** `Content-Type: application/json`

**Body (raw JSON) - All fields optional:**
```json
{
  "status": "Approved"
}
```

**Change Status:**
```json
{
  "status": "In Review"
}
```

**Change Price:**
```json
{
  "price": 250
}
```

**Multiple Fields:**
```json
{
  "destination": "France",
  "visaProduct": "Tourist Visa",
  "price": 180,
  "status": "Approved"
}
```

---

## 🗑️ 6. DELETE APPLICATION
**Method:** `DELETE`  
**URL:** `http://localhost:3000/customers/applications/1`

**No Body Required**

---

## 🧪 Testing Sequence (Example for Ali Raza - Customer ID: 1):

1. **POST** `/customers/applications` - Create APP-01245 (UAE, Approved)
2. **POST** `/customers/applications` - Create APP-01246 (Thailand, In Review)
3. **POST** `/customers/applications` - Create APP-01247 (Germany, Pending)
4. **POST** `/customers/applications` - Create APP-01248 (France, Approved)
5. **POST** `/customers/applications` - Create APP-01249 (Japan, In Review)

6. **GET** `/customers/1/applications` - View all applications for customer 1 (Applications tab)

7. **GET** `/customers/applications/all` - View all applications

8. **PATCH** `/customers/applications/1` - Update application status

9. **DELETE** `/customers/applications/1` - Delete application

---

## 📊 Expected Responses:

### Create Application Response:
```json
{
  "status": true,
  "message": "Application created successfully",
  "data": {
    "id": 1,
    "applicationNumber": "APP-01245",
    "customerId": 1,
    "destination": "UAE",
    "visaProduct": "30-Day Visa",
    "price": 100,
    "status": "Approved",
    "createdAt": "2025-01-27T...",
    "updatedAt": "2025-01-27T..."
  }
}
```

### Get Customer Applications Response:
```json
{
  "status": true,
  "message": "Applications retrieved successfully",
  "count": 5,
  "data": [
    {
      "id": 1,
      "applicationNumber": "APP-01245",
      "destination": "UAE",
      "visaProduct": "30-Day Visa",
      "price": 100,
      "status": "Approved",
      "createdAt": "27 January 2025"
    }
  ]
}
```

---

## ⚠️ Important Notes:

- **Status Values:** `Pending`, `In Review`, `Approved`, `Rejected` (exactly like this, with capital letters)
- **Application Number:** Unique hona chahiye
- **Customer ID:** Valid customer ID hona chahiye (pehle customer create karein)
- **Price:** Number hona chahiye (decimal allowed)

