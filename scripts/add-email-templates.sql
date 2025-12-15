-- SQL script to add all email templates to database
-- Replace the template IDs with your actual SendGrid template IDs

-- Example: Replace 'd-93a14859b7c4...' with your actual template IDs

INSERT INTO email_templates (name, sendgrid_template_id, description, is_active, category, created_at, updated_at)
VALUES 
  ('customer_welcome', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Welcome email sent to new customers after registration', true, 'customer', NOW(), NOW()),
  ('application_submitted', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent after visa application submission and payment', true, 'customer', NOW(), NOW()),
  ('additional_info_required', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent when admin requests additional information', true, 'customer', NOW(), NOW()),
  ('resubmission_required', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent when admin requests application resubmission', true, 'customer', NOW(), NOW()),
  ('application_processing', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent when application status changes to processing', true, 'customer', NOW(), NOW()),
  ('application_completed', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent when application is completed', true, 'customer', NOW(), NOW()),
  ('application_rejected', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent when application is rejected', true, 'customer', NOW(), NOW()),
  ('incomplete_application', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Reminder for incomplete/abandoned applications', true, 'customer', NOW(), NOW()),
  ('document_request', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Sent when admin requests specific documents', true, 'customer', NOW(), NOW()),
  ('document_submission', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Confirmation when customer submits documents', true, 'customer', NOW(), NOW()),
  ('visa_expiry_reminder', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Reminder when visa expiry date is nearing', true, 'customer', NOW(), NOW()),
  ('post_service_followup', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Follow-up email after service completion', true, 'customer', NOW(), NOW()),
  ('regulatory_update', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Regulatory updates and announcements', true, 'customer', NOW(), NOW()),
  ('subadmin_welcome', 'd-REPLACE_WITH_YOUR_TEMPLATE_ID', 'Welcome email for newly created subadmin accounts', true, 'admin', NOW(), NOW())
ON CONFLICT (name) DO UPDATE 
SET 
  sendgrid_template_id = EXCLUDED.sendgrid_template_id,
  description = EXCLUDED.description,
  is_active = EXCLUDED.is_active,
  category = EXCLUDED.category,
  updated_at = NOW();

