# Customers API - Postman Quick Reference

Base URL: `http://localhost:3000`

---

## 📝 1. CREATE CUSTOMER
**Method:** `POST`  
**URL:** `http://localhost:3000/customers`  
**Headers:** `Content-Type: application/json`

**Body (raw JSON):**
```json
{
  "fullname": "Ali Raza",
  "email": "ali.raza@email.com",
  "phone": "+92 300 1234567",
  "residenceCountry": "Pakistan"
}
```

**More Examples:**
```json
{
  "fullname": "Sarah Khan",
  "email": "sarah.khan@email.com",
  "phone": "+92 301 2345678",
  "residenceCountry": "Pakistan"
}
```

```json
{
  "fullname": "John Smith",
  "email": "john.smith@email.com",
  "phone": "+1 555 1234567",
  "residenceCountry": "United States"
}
```

---

## 📋 2. GET ALL CUSTOMERS (List View)
**Method:** `GET`  
**URL:** `http://localhost:3000/customers`  
**URL with Search:** `http://localhost:3000/customers?search=Ali`

**No Body Required**

---

## 👤 3. GET SINGLE CUSTOMER (Customer Details View)
**Method:** `GET`  
**URL:** `http://localhost:3000/customers/1`

**No Body Required**

---

## 📄 4. GET CUSTOMER APPLICATIONS (Applications Tab)
**Method:** `GET`  
**URL:** `http://localhost:3000/customers/1/applications`  
**URL with Search:** `http://localhost:3000/customers/1/applications?search=UAE`

**No Body Required**

---

## 💰 5. GET CUSTOMER BILLING INFO (Billing Info Tab)
**Method:** `GET`  
**URL:** `http://localhost:3000/customers/1/billing`

**No Body Required**

---

## ✏️ 6. UPDATE CUSTOMER
**Method:** `PATCH`  
**URL:** `http://localhost:3000/customers/1`  
**Headers:** `Content-Type: application/json`

**Body (raw JSON) - All fields optional:**
```json
{
  "fullname": "Ali Raza Updated",
  "phone": "+92 300 9999999"
}
```

**Change Status:**
```json
{
  "status": "Inactive"
}
```

**Change Email:**
```json
{
  "email": "newemail@example.com"
}
```

**Multiple Fields:**
```json
{
  "fullname": "Ali Raza",
  "email": "ali.raza.new@email.com",
  "phone": "+92 300 8888888",
  "residenceCountry": "United States",
  "status": "Active"
}
```

**Status Options:** `Active`, `Inactive`, `Suspended`

---

## 🗑️ 7. DELETE CUSTOMER
**Method:** `DELETE`  
**URL:** `http://localhost:3000/customers/1`

**No Body Required**

---

## 🧪 Testing Sequence:

1. **POST** `/customers` - Create customer (Ali Raza)
2. **GET** `/customers` - See all customers with total applications
3. **GET** `/customers/1` - View customer details
4. **GET** `/customers/1/applications` - View applications (requires applications data)
5. **GET** `/customers/1/billing` - View billing info (requires orders data)
6. **PATCH** `/customers/1` - Update customer
7. **DELETE** `/customers/1` - Delete customer

---

## 📊 Expected Responses:

### Create Customer Response:
```json
{
  "status": true,
  "message": "Customer created successfully",
  "data": {
    "id": 1,
    "fullname": "Ali Raza",
    "email": "ali.raza@email.com",
    "phone": "+92 300 1234567",
    "residenceCountry": "Pakistan",
    "status": "active",
    "createdAt": "2025-01-27T...",
    "updatedAt": "2025-01-27T..."
  }
}
```

### Get All Customers Response:
```json
{
  "status": true,
  "message": "Customers retrieved successfully",
  "count": 2,
  "data": [
    {
      "id": 1,
      "name": "Ali Raza",
      "email": "ali.raza@email.com",
      "phone": "+92 300 1234567",
      "totalApplications": 5,
      "status": "Active"
    }
  ]
}
```

### Get Customer Details Response:
```json
{
  "status": true,
  "message": "Customer retrieved successfully",
  "data": {
    "id": 1,
    "customerName": "Ali Raza",
    "email": "ali.raza@email.com",
    "phone": "+92 300 1234567",
    "residenceCountry": "Pakistan",
    "createdDate": "2024-01-15"
  }
}
```

### Get Applications Response:
```json
{
  "status": true,
  "message": "Applications retrieved successfully",
  "count": 3,
  "data": [
    {
      "id": 1,
      "applicationNumber": "APP-01245",
      "destination": "UAE",
      "visaProduct": "30-Day Visa",
      "price": 100,
      "status": "approved"
    }
  ]
}
```

### Get Billing Response:
```json
{
  "status": true,
  "message": "Billing information retrieved successfully",
  "data": {
    "totalOrders": 5,
    "totalSpent": "1200.00",
    "lastPayment": "2024-12-20"
  }
}
```

---

## ⚠️ Important Notes:

- **Applications** aur **Orders** data manually add karna padega ya separate endpoints bana ne padenge
- Agar applications/orders nahi hain, to empty array ya null return hoga
- Email unique hona chahiye (duplicate email error aayega)

