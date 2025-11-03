# Customers API Documentation - Postman Testing Guide

Base URL: `http://localhost:3000` (ya apna server URL)

## 1. Create Customer (POST)
**Endpoint:** `POST /customers`

**Body (JSON):**
```json
{
  "fullname": "Ali Raza",
  "email": "ali.raza@email.com",
  "phone": "+92 300 1234567",
  "residenceCountry": "Pakistan"
}
```

**Alternative Examples:**
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

## 2. Get All Customers (GET)
**Endpoint:** `GET /customers`

**Query Parameters (Optional):**
- `search` - Search term (e.g., `?search=Ali`)

**Examples:**
- `GET /customers`
- `GET /customers?search=Ali`

**Response Format:**
```json
{
  "status": true,
  "message": "Customers retrieved successfully",
  "count": 5,
  "data": [
    {
      "id": 1,
      "name": "Ali Raza",
      "email": "ali.raza@email.com",
      "phone": "+92 300 1234567",
      "totalApplications": 5,
      "status": "Active"
    },
    {
      "id": 2,
      "name": "Sarah Khan",
      "email": "sarah.khan@email.com",
      "phone": "+92 301 2345678",
      "totalApplications": 3,
      "status": "Active"
    }
  ]
}
```

---

## 3. Get Single Customer Details (GET)
**Endpoint:** `GET /customers/:id`

**Examples:**
- `GET /customers/1`
- `GET /customers/5`

**Response Format:**
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
    "createdDate": "2024-01-15",
    "createdAt": "15 January 2024",
    "updatedAt": "15 January 2024"
  }
}
```

---

## 4. Get Customer Applications (GET)
**Endpoint:** `GET /customers/:id/applications`

**Query Parameters (Optional):**
- `search` - Search term (e.g., `?search=UAE`)

**Examples:**
- `GET /customers/1/applications`
- `GET /customers/1/applications?search=UAE`

**Response Format:**
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
      "status": "approved",
      "createdAt": "15 January 2024"
    },
    {
      "id": 2,
      "applicationNumber": "APP-01246",
      "destination": "Thailand",
      "visaProduct": "Tourist Visa",
      "price": 150,
      "status": "in_review",
      "createdAt": "16 January 2024"
    },
    {
      "id": 3,
      "applicationNumber": "APP-01247",
      "destination": "Germany",
      "visaProduct": "Schengen Visa",
      "price": 200,
      "status": "pending",
      "createdAt": "17 January 2024"
    }
  ]
}
```

**Status Values:**
- `pending` - Orange pill (Pending)
- `in_review` - White pill with border (In Review)
- `approved` - Black pill (Approved)
- `rejected` - Red pill (Rejected)

---

## 5. Get Customer Billing Info (GET)
**Endpoint:** `GET /customers/:id/billing`

**Examples:**
- `GET /customers/1/billing`

**Response Format:**
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

**Note:** Agar koi order nahi hai, to `lastPayment` `null` hoga.

---

## 6. Update Customer (PATCH)
**Endpoint:** `PATCH /customers/:id`

**Body (JSON):** - Sab fields optional hain, sirf jo update karna hai wo bhejein
```json
{
  "fullname": "Ali Raza Updated",
  "phone": "+92 300 9999999"
}
```

**Alternative Examples:**
```json
{
  "status": "Inactive"
}
```

```json
{
  "email": "newemail@example.com",
  "residenceCountry": "United States"
}
```

**Status Values:**
- `Active` - Black pill (Active)
- `Inactive` - White pill with border (Inactive)
- `Suspended` - Red pill (Suspended)

**Examples:**
- `PATCH /customers/1`

---

## 7. Delete Customer (DELETE)
**Endpoint:** `DELETE /customers/:id`

**Examples:**
- `DELETE /customers/1`
- `DELETE /customers/5`

**Response Format:**
```json
{
  "status": true,
  "message": "Customer deleted successfully"
}
```

---

## Complete Testing Flow (Postman Collection Order):

1. **Create Customers:**
   - POST `/customers` - Create Ali Raza
   - POST `/customers` - Create Sarah Khan
   - POST `/customers` - Create John Smith

2. **View All Customers:**
   - GET `/customers` - List all customers with total applications count

3. **View Customer Details:**
   - GET `/customers/1` - See customer details (Customer Details tab)

4. **View Customer Applications:**
   - GET `/customers/1/applications` - See all applications for customer (Applications tab)

5. **View Customer Billing:**
   - GET `/customers/1/billing` - See billing information (Billing Info tab)

6. **Update Customer:**
   - PATCH `/customers/1` - Update customer details

7. **Delete Customer:**
   - DELETE `/customers/1` - Delete customer

---

## Important Notes:

### For Applications:
Applications ko manually database mein add karna padega ya ek separate applications module banana padega. Abhi ke liye customer applications view kar sakte hain agar database mein data hai.

**Example Application Data (SQL ya seed file se):**
```sql
INSERT INTO applications (applicationNumber, customerId, destination, visaProduct, price, status)
VALUES 
('APP-01245', 1, 'UAE', '30-Day Visa', 100, 'approved'),
('APP-01246', 1, 'Thailand', 'Tourist Visa', 150, 'in_review'),
('APP-01247', 1, 'Germany', 'Schengen Visa', 200, 'pending');
```

### For Orders/Billing:
Orders ko bhi manually database mein add karna padega ya ek separate orders module banana padega.

**Example Order Data (SQL ya seed file se):**
```sql
INSERT INTO orders (customerId, amount, paymentDate)
VALUES 
(1, 100, '2024-12-20'),
(1, 150, '2024-12-15'),
(1, 200, '2024-12-10');
```

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

