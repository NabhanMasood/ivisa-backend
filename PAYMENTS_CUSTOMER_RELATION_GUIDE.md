# Payments-Customer Relation Guide

## Overview
A direct relation has been added between `Payment` and `Customer` entities. This allows you to:
- Get all payments for a specific customer
- Access customer information directly from payment records
- Filter payments by customer ID

## Database Changes
- Added `customerId` column to `payments` table
- Added `ManyToOne` relation from `Payment` to `Customer`
- Added `OneToMany` relation from `Customer` to `Payment`

**Note:** You'll need to run a database migration to add the `customerId` column. For existing payments, the `customerId` is automatically populated from the related `VisaApplication.customerId`.

## Backend API Endpoints

### 1. Get All Payments (with customer info)
```http
GET /payments
GET /payments?status=completed
```

**Response:**
```json
{
  "status": true,
  "message": "Payments retrieved successfully",
  "count": 10,
  "data": [
    {
      "id": 1,
      "applicationId": 123,
      "applicationNumber": "VAP-2025-001234",
      "customerId": 45,
      "customer": {
        "id": 45,
        "fullname": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890"
      },
      "amount": 150.00,
      "currency": "USD",
      "status": "completed",
      "paymentMethod": "card",
      "paymentGateway": "stripe",
      "transactionId": "txn_123456",
      "cardholderName": "John Doe",
      "cardLast4": "4242",
      "cardBrand": "visa",
      "paidAt": "2025-01-15T10:30:00Z",
      "createdAt": "2025-01-15T10:25:00Z",
      "updatedAt": "2025-01-15T10:30:00Z"
    }
  ]
}
```

### 2. Get Payments by Customer ID
```http
GET /payments/customer/:customerId
GET /payments/customer/:customerId?status=completed
```

**Example:**
```http
GET /payments/customer/45
GET /payments/customer/45?status=pending
```

**Response:**
```json
{
  "status": true,
  "message": "Customer payments retrieved successfully",
  "count": 3,
  "data": [
    {
      "id": 1,
      "applicationId": 123,
      "applicationNumber": "VAP-2025-001234",
      "customerId": 45,
      "customer": {
        "id": 45,
        "fullname": "John Doe",
        "email": "john@example.com",
        "phoneNumber": "+1234567890"
      },
      "amount": 150.00,
      "currency": "USD",
      "status": "completed",
      // ... other payment fields
    }
  ]
}
```

### 3. Get Payment by ID (includes customer)
```http
GET /payments/:id
```

**Response:**
```json
{
  "status": true,
  "message": "Payment retrieved successfully",
  "data": {
    "id": 1,
    "applicationId": 123,
    "customerId": 45,
    "customer": {
      "id": 45,
      "fullname": "John Doe",
      "email": "john@example.com",
      "phoneNumber": "+1234567890"
    },
    // ... other payment fields
  }
}
```

### 4. Get Payment by Application ID (includes customer)
```http
GET /payments/application/:applicationId
```

## Frontend Implementation Examples

### React/Vue/Angular - Fetch Customer Payments

#### Using Fetch API
```javascript
// Get all payments for a customer
async function getCustomerPayments(customerId, status = null) {
  const url = status 
    ? `/api/payments/customer/${customerId}?status=${status}`
    : `/api/payments/customer/${customerId}`;
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Add auth token if needed
        'Authorization': `Bearer ${yourAuthToken}`
      }
    });
    
    const result = await response.json();
    
    if (result.status) {
      console.log(`Found ${result.count} payments`);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    throw error;
  }
}

// Usage
const payments = await getCustomerPayments(45);
const completedPayments = await getCustomerPayments(45, 'completed');
```

#### Using Axios
```javascript
import axios from 'axios';

// Get all payments for a customer
async function getCustomerPayments(customerId, status = null) {
  try {
    const params = status ? { status } : {};
    const response = await axios.get(
      `/api/payments/customer/${customerId}`,
      { params }
    );
    
    if (response.data.status) {
      return response.data.data;
    }
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    throw error;
  }
}

// Usage
const payments = await getCustomerPayments(45);
```

### Vue 3 Composition API Example

```vue
<template>
  <div>
    <h2>My Payments</h2>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else>
      <div v-for="payment in payments" :key="payment.id" class="payment-card">
        <h3>Payment #{{ payment.id }}</h3>
        <p>Amount: {{ payment.currency }} {{ payment.amount }}</p>
        <p>Status: {{ payment.status }}</p>
        <p>Application: {{ payment.applicationNumber }}</p>
        <p>Date: {{ new Date(payment.createdAt).toLocaleDateString() }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const payments = ref([]);
const loading = ref(false);
const error = ref(null);
const customerId = ref(45); // Get from auth/user context

async function fetchPayments(status = null) {
  loading.value = true;
  error.value = null;
  
  try {
    const params = status ? { status } : {};
    const response = await axios.get(
      `/api/payments/customer/${customerId.value}`,
      { params }
    );
    
    if (response.data.status) {
      payments.value = response.data.data;
    } else {
      error.value = response.data.message;
    }
  } catch (err) {
    error.value = err.message || 'Failed to fetch payments';
  } finally {
    loading.value = false;
  }
}

// Filter by status
function filterByStatus(status) {
  fetchPayments(status);
}

onMounted(() => {
  fetchPayments();
});
</script>
```

### React Hook Example

```jsx
import { useState, useEffect } from 'react';
import axios from 'axios';

function useCustomerPayments(customerId) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPayments = async (status = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = status ? { status } : {};
      const response = await axios.get(
        `/api/payments/customer/${customerId}`,
        { params }
      );
      
      if (response.data.status) {
        setPayments(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchPayments();
    }
  }, [customerId]);

  return { payments, loading, error, refetch: fetchPayments };
}

// Usage in component
function CustomerPayments({ customerId }) {
  const { payments, loading, error, refetch } = useCustomerPayments(customerId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>My Payments</h2>
      <button onClick={() => refetch('completed')}>
        Show Completed Only
      </button>
      {payments.map(payment => (
        <div key={payment.id}>
          <h3>Payment #{payment.id}</h3>
          <p>Amount: {payment.currency} {payment.amount}</p>
          <p>Status: {payment.status}</p>
        </div>
      ))}
    </div>
  );
}
```

### Display Customer Info in Payment List

```javascript
// All payments endpoint now includes customer info
async function getAllPayments(status = null) {
  const url = status 
    ? `/api/payments?status=${status}`
    : `/api/payments`;
  
  const response = await fetch(url);
  const result = await response.json();
  
  if (result.status) {
    result.data.forEach(payment => {
      if (payment.customer) {
        console.log(`Payment ${payment.id} by ${payment.customer.fullname} (${payment.customer.email})`);
      }
    });
  }
  
  return result.data;
}
```

## Payment Status Values

You can filter payments by these statuses:
- `pending` - Payment initiated but not completed
- `processing` - Payment is being processed
- `completed` - Payment successfully completed
- `failed` - Payment failed
- `refunded` - Payment was refunded

## Important Notes

1. **Customer ID**: The `customerId` is automatically set when creating payments through the application flow. It's derived from `VisaApplication.customerId`.

2. **Backward Compatibility**: All existing payment endpoints now include customer information in the response.

3. **Database Migration**: You'll need to add the `customerId` column to your `payments` table. For existing records, you may need to populate it from the related applications.

4. **Customer Object**: The customer object in responses includes:
   - `id` - Customer ID
   - `fullname` - Customer's full name
   - `email` - Customer's email
   - `phoneNumber` - Customer's phone number

## Migration SQL (if needed)

```sql
-- Add customerId column to payments table
ALTER TABLE payments 
ADD COLUMN customerId INT NOT NULL;

-- Populate customerId from related applications
UPDATE payments p
INNER JOIN visa_applications va ON p.applicationId = va.id
SET p.customerId = va.customerId;

-- Add foreign key constraint
ALTER TABLE payments
ADD CONSTRAINT FK_payments_customer
FOREIGN KEY (customerId) REFERENCES customers(id)
ON DELETE CASCADE;
```

