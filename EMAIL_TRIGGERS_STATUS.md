# Email Triggers Implementation Status

## ✅ Fully Implemented (Backend Triggers Ready)

### 1. ✅ New User Registration
- **Trigger**: `POST /auth/customer/register`
- **Location**: `src/auth/auth.service.ts:104-119`
- **Template**: `customer_welcome`
- **Status**: ✅ Implemented

### 2. ✅ Application Submitted (After Checkout)
- **Trigger**: `POST /visa-applications/submit-complete`
- **Location**: `src/visa-applications/visa-applications.service.ts:1616`
- **Template**: `application_submitted`
- **Status**: ✅ Implemented

### 3. ✅ Additional Info Required
- **Trigger**: Status change to "Additional Info required"
- **Location**: `src/visa-applications/visa-applications.service.ts:789-798`
- **Template**: `additional_info_required`
- **Status**: ✅ Implemented

### 4. ✅ Resubmission Required
- **Trigger**: Status change to "resubmission"
- **Location**: `src/visa-applications/visa-applications.service.ts:799-808`
- **Template**: `resubmission_required`
- **Status**: ✅ Implemented

### 5. ✅ Application Processing
- **Trigger**: Status change to "processing" or "in_process"
- **Location**: `src/visa-applications/visa-applications.service.ts:809-817` (newly added)
- **Template**: `application_processing`
- **Status**: ✅ Implemented

### 6. ✅ Application Completed
- **Trigger**: Status change to "completed"
- **Location**: `src/visa-applications/visa-applications.service.ts:818-826`
- **Template**: `application_completed`
- **Status**: ✅ Implemented

### 7. ✅ Application Rejected
- **Trigger**: Status change to "rejected"
- **Location**: `src/visa-applications/visa-applications.service.ts:827-835` (newly added)
- **Template**: `application_rejected`
- **Status**: ✅ Implemented

## ⚠️ Partially Implemented (Methods Ready, Need Triggers)

### 8. ⚠️ Incomplete Application / Abandon Cart
- **Method**: `sendIncompleteApplicationEmail()` - ✅ Created
- **Template**: `incomplete_application`
- **Status**: ⚠️ Method ready, needs scheduled job or webhook
- **Note**: Requires cron job to check for draft applications older than X hours/days

### 9. ⚠️ Document Requests
- **Method**: `sendDocumentRequestEmail()` - ✅ Created
- **Template**: `document_request`
- **Status**: ⚠️ Method ready, needs integration point
- **Note**: Should be called when admin requests specific documents (may need new endpoint)

### 10. ⚠️ Document Submission
- **Method**: `sendDocumentSubmissionEmail()` - ✅ Created
- **Template**: `document_submission`
- **Status**: ⚠️ Method ready, needs integration point
- **Note**: Should be called when customer submits documents (may need new endpoint)

### 11. ⚠️ Visa Expiry Date Nearing
- **Method**: `sendVisaExpiryReminderEmail()` - ✅ Created
- **Template**: `visa_expiry_reminder`
- **Status**: ⚠️ Method ready, needs scheduled job
- **Note**: Requires cron job to check visa expiry dates (e.g., 30 days before expiry)

### 12. ⚠️ Post Service Follow-up
- **Method**: `sendPostServiceFollowupEmail()` - ✅ Created
- **Template**: `post_service_followup`
- **Status**: ⚠️ Method ready, needs scheduled job
- **Note**: Requires cron job to check completed applications (e.g., 7 days after completion)

### 13. ⚠️ Regulatory Updates
- **Method**: `sendRegulatoryUpdateEmail()` - ✅ Created
- **Template**: `regulatory_update`
- **Status**: ⚠️ Method ready, needs admin endpoint
- **Note**: Should be called from admin panel when sending regulatory updates to customers

## 📋 Next Steps

### Immediate (Backend Ready)
1. Create SendGrid Dynamic Templates for all templates listed above
2. Add template IDs to database using `POST /email-templates`
3. Test each trigger to ensure emails are sent correctly

### Scheduled Jobs Needed (Use @nestjs/schedule or similar)
1. **Incomplete Application Reminder**: Daily cron job to check draft applications
   ```typescript
   // Example: Check applications in 'draft' status older than 24 hours
   @Cron('0 10 * * *') // Run daily at 10 AM
   async sendIncompleteApplicationReminders() { ... }
   ```

2. **Visa Expiry Reminder**: Daily cron job to check visa expiry dates
   ```typescript
   // Example: Check visas expiring in 30 days
   @Cron('0 9 * * *') // Run daily at 9 AM
   async sendVisaExpiryReminders() { ... }
   ```

3. **Post-Service Follow-up**: Daily cron job for completed applications
   ```typescript
   // Example: Check applications completed 7 days ago
   @Cron('0 11 * * *') // Run daily at 11 AM
   async sendPostServiceFollowups() { ... }
   ```

### Integration Points Needed
1. **Document Request**: Add trigger when admin requests documents
   - Could be part of `requestResubmission()` method
   - Or new endpoint: `POST /visa-applications/:id/request-documents`

2. **Document Submission**: Add trigger when customer submits documents
   - Could be part of field response submission
   - Or new endpoint: `POST /visa-applications/:id/submit-documents`

3. **Regulatory Updates**: Admin endpoint to send bulk updates
   - New endpoint: `POST /admin/regulatory-updates/send`
   - Allows admin to send updates to all or filtered customers

## 📝 Template Names Reference

All templates should be created in SendGrid with these exact names:

1. `customer_welcome`
2. `application_submitted`
3. `additional_info_required`
4. `resubmission_required`
5. `application_processing`
6. `application_completed`
7. `application_rejected`
8. `incomplete_application`
9. `document_request`
10. `document_submission`
11. `visa_expiry_reminder`
12. `post_service_followup`
13. `regulatory_update`
14. `subadmin_welcome` (already exists)

## 🔧 Testing

To test each trigger:
1. Ensure SendGrid template exists and is active
2. Ensure template ID is in database
3. Trigger the action (register, submit application, change status, etc.)
4. Check SendGrid activity logs for sent emails

