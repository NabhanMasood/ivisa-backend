# Frontend Implementation Guide: Custom Fields with Stable IDs

## Critical Changes Required

The frontend **MUST** use the actual `field.id` values from the API instead of array indices or sequential numbers when storing field responses.

---

## 1. Admin Panel: Creating Custom Fields

### ✅ No Changes Needed
When admin creates a field, the API already returns the field with its stable `id`. Just ensure you store and use this `id`.

**API Response Example:**
```json
{
  "status": true,
  "message": "Custom field created successfully",
  "data": {
    "id": 5,  // ← Use this ID, NOT array index
    "fieldType": "text",
    "question": "Passport Number",
    "isRequired": true,
    "displayOrder": 0,
    "isActive": true
  }
}
```

**Frontend Storage:**
```javascript
// Store fields with their IDs
const fields = [
  { id: 5, question: "Passport Number", fieldType: "text" },
  { id: 12, question: "Age", fieldType: "number" },
  { id: 8, question: "Date of Birth", fieldType: "date" }
];
// Note: IDs are not sequential - that's OK!
```

---

## 2. Fetching Fields for a Form

### API Endpoint
```
GET /visa-product-fields/by-visa-product/:visaProductId
```

### ✅ Current Implementation (No Change)
```javascript
async function fetchFields(visaProductId) {
  const response = await fetch(
    `/visa-product-fields/by-visa-product/${visaProductId}`
  );
  const result = await response.json();
  return result.data; // Array of fields with stable IDs
}
```

**Response Structure:**
```json
{
  "status": true,
  "message": "Custom fields retrieved successfully",
  "count": 3,
  "data": [
    {
      "id": 5,           // ← Stable field ID
      "question": "Passport Number",
      "fieldType": "text",
      "isRequired": true,
      "displayOrder": 0
    },
    {
      "id": 12,          // ← Stable field ID (not sequential!)
      "question": "Age",
      "fieldType": "number",
      "isRequired": false,
      "displayOrder": 1
    },
    {
      "id": 8,           // ← Stable field ID
      "question": "Date of Birth",
      "fieldType": "date",
      "isRequired": true,
      "displayOrder": 2
    }
  ]
}
```

---

## 3. Displaying Fields in the Form

### ❌ WRONG: Using Array Index
```javascript
// ❌ DON'T DO THIS
fields.forEach((field, index) => {
  const input = document.createElement('input');
  input.id = `field_${index}`;  // ❌ Using index
  input.name = `field_${index}`; // ❌ Wrong!
  // ...
});
```

### ✅ CORRECT: Using Field ID
```javascript
// ✅ DO THIS INSTEAD
fields.forEach((field) => {
  const input = document.createElement('input');
  input.id = `field_${field.id}`;      // ✅ Using field.id
  input.name = `field_${field.id}`;    // ✅ Correct!
  input.dataset.fieldId = field.id;    // ✅ Store field ID in dataset
  // ...
});
```

### Vue.js Example
```vue
<template>
  <div v-for="field in fields" :key="field.id">
    <!-- ✅ Use field.id as key and identifier -->
    <label :for="`field_${field.id}`">{{ field.question }}</label>
    
    <!-- Text input -->
    <input
      v-if="field.fieldType === 'text'"
      :id="`field_${field.id}`"
      :name="`field_${field.id}`"
      v-model="formData[field.id]"
      :required="field.isRequired"
    />
    
    <!-- Number input -->
    <input
      v-else-if="field.fieldType === 'number'"
      type="number"
      :id="`field_${field.id}`"
      :name="`field_${field.id}`"
      v-model.number="formData[field.id]"
      :required="field.isRequired"
    />
    
    <!-- Date input -->
    <input
      v-else-if="field.fieldType === 'date'"
      type="date"
      :id="`field_${field.id}`"
      :name="`field_${field.id}`"
      v-model="formData[field.id]"
      :required="field.isRequired"
    />
    
    <!-- File upload -->
    <input
      v-else-if="field.fieldType === 'upload'"
      type="file"
      :id="`field_${field.id}`"
      :name="`field_${field.id}`"
      @change="handleFileUpload(field.id, $event)"
      :required="field.isRequired"
    />
  </div>
</template>

<script>
export default {
  data() {
    return {
      fields: [], // Fields from API
      formData: {}, // Object keyed by field.id, not index
      // Example: { 5: "ABC123", 12: "25", 8: "2025-01-01" }
    };
  },
  
  methods: {
    async fetchFields(visaProductId) {
      const response = await fetch(
        `/visa-product-fields/by-visa-product/${visaProductId}`
      );
      const result = await response.json();
      this.fields = result.data;
      
      // Initialize formData with field IDs as keys
      this.formData = {};
      this.fields.forEach(field => {
        this.formData[field.id] = null;
      });
    },
    
    async handleFileUpload(fieldId, event) {
      const file = event.target.files[0];
      // Upload file and store result in formData[fieldId]
      // ...
    }
  }
};
</script>
```

---

## 4. Building Field Responses for Submission

### ❌ WRONG: Using Sequential Indices
```javascript
// ❌ DON'T DO THIS
const responses = {};
fields.forEach((field, index) => {
  responses[index + 1] = {  // ❌ Using sequential index
    value: formData[index],
    submittedAt: new Date().toISOString()
  };
});
// Result: { "1": {...}, "2": {...}, "3": {...} }
// This will break if fields are reordered or deleted!
```

### ✅ CORRECT: Using Field IDs
```javascript
// ✅ DO THIS INSTEAD
const responses = {};
fields.forEach((field) => {
  const value = formData[field.id]; // Get value by field ID
  
  if (value !== null && value !== undefined) {
    responses[field.id] = {  // ✅ Use field.id as key
      value: String(value),  // Convert to string
      submittedAt: new Date().toISOString()
    };
  }
});
// Result: { "5": {...}, "12": {...}, "8": {...} }
// This is stable even if fields are deleted or reordered!
```

### Complete Submission Function
```javascript
async function submitFieldResponses(applicationId, travelerId = null) {
  // Build responses object using field.id as keys
  const responses = [];
  
  fields.forEach((field) => {
    const value = formData[field.id];
    
    if (value === null || value === undefined) {
      if (field.isRequired) {
        throw new Error(`Field ${field.question} is required`);
      }
      return; // Skip optional fields without values
    }
    
    // For file uploads
    if (field.fieldType === 'upload' && typeof value === 'object') {
      responses.push({
        fieldId: field.id,  // ✅ Use field.id
        filePath: value.filePath,
        fileName: value.fileName,
        fileSize: value.fileSize
      });
    } 
    // For text, number, date, dropdown
    else {
      responses.push({
        fieldId: field.id,  // ✅ Use field.id
        value: String(value)
      });
    }
  });
  
  // Submit to API
  const response = await fetch('/visa-product-fields/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      applicationId: applicationId,
      travelerId: travelerId, // null for application-level, number for traveler-specific
      responses: responses
    })
  });
  
  return response.json();
}
```

---

## 5. Displaying Existing Responses

### Fetching Responses
```javascript
async function getFieldResponses(applicationId, travelerId = null) {
  const url = travelerId 
    ? `/visa-product-fields/responses/${applicationId}?travelerId=${travelerId}`
    : `/visa-product-fields/responses/${applicationId}`;
  
  const response = await fetch(url);
  const result = await response.json();
  return result.data; // Array of responses with field info
}
```

### Matching Responses to Fields
```javascript
// ❌ WRONG: Using array index
fields.forEach((field, index) => {
  const response = responses[index]; // ❌ Wrong!
  // ...
});

// ✅ CORRECT: Matching by field ID
fields.forEach((field) => {
  // Find response by field.id
  const response = responses.find(r => r.fieldId === field.id);
  
  if (response) {
    // Display the response value
    formData[field.id] = response.value;
  }
});
```

### Complete Example: Loading Form with Existing Responses
```javascript
async function loadFormWithResponses(applicationId, visaProductId, travelerId = null) {
  // 1. Fetch field definitions
  const fieldsResponse = await fetch(
    `/visa-product-fields/by-visa-product/${visaProductId}`
  );
  const fieldsResult = await fieldsResponse.json();
  const fields = fieldsResult.data;
  
  // 2. Fetch existing responses
  const responsesResponse = await fetch(
    travelerId
      ? `/visa-product-fields/responses/${applicationId}?travelerId=${travelerId}`
      : `/visa-product-fields/responses/${applicationId}`
  );
  const responsesResult = await responsesResponse.json();
  const responses = responsesResult.data;
  
  // 3. Initialize formData object keyed by field.id
  const formData = {};
  
  fields.forEach((field) => {
    // Find response for this field by matching field.id
    const response = responses.find(r => r.fieldId === field.id);
    
    if (response) {
      // Pre-fill with existing response
      if (response.filePath) {
        formData[field.id] = {
          filePath: response.filePath,
          fileName: response.fileName,
          fileSize: response.fileSize
        };
      } else {
        formData[field.id] = response.value;
      }
    } else {
      // Initialize empty
      formData[field.id] = null;
    }
  });
  
  return { fields, formData };
}
```

---

## 6. File Upload Handling

### Upload File (Then Submit with Field ID)
```javascript
async function uploadFileForField(fieldId, file) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(
    `/visa-product-fields/upload?fieldId=${fieldId}`,
    {
      method: 'POST',
      body: formData
    }
  );
  
  const result = await response.json();
  
  // Store in formData using field.id as key
  formData[field.id] = {
    filePath: result.data.filePath,
    fileName: result.data.fileName,
    fileSize: result.data.fileSize
  };
  
  return result;
}
```

---

## 7. React Example (Complete Component)

```jsx
import React, { useState, useEffect } from 'react';

function CustomFieldsForm({ applicationId, visaProductId, travelerId = null }) {
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  
  useEffect(() => {
    loadFields();
    if (applicationId) {
      loadExistingResponses();
    }
  }, [applicationId, visaProductId]);
  
  async function loadFields() {
    const response = await fetch(
      `/visa-product-fields/by-visa-product/${visaProductId}`
    );
    const result = await response.json();
    setFields(result.data);
    
    // Initialize formData with field IDs as keys
    const initialData = {};
    result.data.forEach(field => {
      initialData[field.id] = null;
    });
    setFormData(initialData);
  }
  
  async function loadExistingResponses() {
    const url = travelerId
      ? `/visa-product-fields/responses/${applicationId}?travelerId=${travelerId}`
      : `/visa-product-fields/responses/${applicationId}`;
    
    const response = await fetch(url);
    const result = await response.json();
    
    // Match responses to fields by field.id
    const updatedData = { ...formData };
    result.data.forEach(response => {
      if (response.filePath) {
        updatedData[response.fieldId] = {
          filePath: response.filePath,
          fileName: response.fileName,
          fileSize: response.fileSize
        };
      } else {
        updatedData[response.fieldId] = response.value;
      }
    });
    setFormData(updatedData);
  }
  
  function handleInputChange(fieldId, value) {
    setFormData(prev => ({
      ...prev,
      [fieldId]: value  // ✅ Use field.id as key
    }));
  }
  
  async function handleSubmit(e) {
    e.preventDefault();
    
    // Build responses array using field.id
    const responses = [];
    fields.forEach(field => {
      const value = formData[field.id];
      
      if (value === null || value === undefined) {
        if (field.isRequired) {
          alert(`${field.question} is required`);
          return;
        }
        return;
      }
      
      if (field.fieldType === 'upload' && typeof value === 'object') {
        responses.push({
          fieldId: field.id,  // ✅ Use field.id
          filePath: value.filePath,
          fileName: value.fileName,
          fileSize: value.fileSize
        });
      } else {
        responses.push({
          fieldId: field.id,  // ✅ Use field.id
          value: String(value)
        });
      }
    });
    
    // Submit
    const response = await fetch('/visa-product-fields/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        applicationId,
        travelerId,
        responses
      })
    });
    
    const result = await response.json();
    alert(result.message);
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {fields.map(field => (
        <div key={field.id}>  {/* ✅ Use field.id as key */}
          <label htmlFor={`field_${field.id}`}>
            {field.question}
            {field.isRequired && <span>*</span>}
          </label>
          
          {field.fieldType === 'text' && (
            <input
              type="text"
              id={`field_${field.id}`}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.isRequired}
            />
          )}
          
          {field.fieldType === 'number' && (
            <input
              type="number"
              id={`field_${field.id}`}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.isRequired}
            />
          )}
          
          {field.fieldType === 'date' && (
            <input
              type="date"
              id={`field_${field.id}`}
              value={formData[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              required={field.isRequired}
            />
          )}
          
          {field.fieldType === 'upload' && (
            <input
              type="file"
              id={`field_${field.id}`}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  uploadFileForField(field.id, file);
                }
              }}
              required={field.isRequired}
            />
          )}
        </div>
      ))}
      
      <button type="submit">Submit</button>
    </form>
  );
}

export default CustomFieldsForm;
```

---

## 8. Summary Checklist

- [ ] **Store fields with their IDs**: Use `field.id` from API, not array indices
- [ ] **Form input names**: Use `field_${field.id}`, not `field_${index}`
- [ ] **Form data object**: Key by `field.id`, not array index
  ```javascript
  // ✅ Correct
  formData = { 5: "value1", 12: "value2", 8: "value3" }
  
  // ❌ Wrong
  formData = { 1: "value1", 2: "value2", 3: "value3" }
  ```
- [ ] **Response submission**: Use `fieldId: field.id` in responses array
- [ ] **Matching responses**: Use `response.fieldId === field.id`, not array index
- [ ] **React/Vue keys**: Use `field.id` as the `key` prop, not index

---

## 9. Testing

After implementing the changes:

1. **Create fields**: Verify fields are stored with their IDs
2. **Submit responses**: Check that responses use `field.id` as keys
3. **Delete a field**: Verify remaining responses still display correctly
4. **Reorder fields**: Verify responses match the correct fields
5. **Add new field**: Verify it gets a new ID (not reused)

---

## API Reference

### Get Fields
```
GET /visa-product-fields/by-visa-product/:visaProductId
```

### Submit Responses
```
POST /visa-product-fields/responses
Body: {
  applicationId: number,
  travelerId?: number,
  responses: [
    { fieldId: 5, value: "ABC123" },
    { fieldId: 12, value: "25" }
  ]
}
```

### Get Responses
```
GET /visa-product-fields/responses/:applicationId?travelerId=123
```

### Upload File
```
POST /visa-product-fields/upload?fieldId=5
Body: FormData with 'file'
```

