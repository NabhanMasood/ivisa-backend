/**
 * Helper script to add all email templates to database
 * 
 * Usage:
 * 1. Replace TEMPLATE_IDS object with your actual SendGrid template IDs
 * 2. Run: node scripts/add-email-templates.js
 * 
 * Or use the API endpoint: POST /email-templates
 */

const TEMPLATE_IDS = {
  customer_welcome: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  application_submitted: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  additional_info_required: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  resubmission_required: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  application_processing: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  application_completed: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  application_rejected: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  incomplete_application: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  document_request: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  document_submission: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  visa_expiry_reminder: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  post_service_followup: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  regulatory_update: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
  subadmin_welcome: 'd-REPLACE_WITH_YOUR_TEMPLATE_ID',
};

const TEMPLATE_DESCRIPTIONS = {
  customer_welcome: 'Welcome email sent to new customers after registration',
  application_submitted: 'Sent after visa application submission and payment',
  additional_info_required: 'Sent when admin requests additional information',
  resubmission_required: 'Sent when admin requests application resubmission',
  application_processing: 'Sent when application status changes to processing',
  application_completed: 'Sent when application is completed',
  application_rejected: 'Sent when application is rejected',
  incomplete_application: 'Reminder for incomplete/abandoned applications',
  document_request: 'Sent when admin requests specific documents',
  document_submission: 'Confirmation when customer submits documents',
  visa_expiry_reminder: 'Reminder when visa expiry date is nearing',
  post_service_followup: 'Follow-up email after service completion',
  regulatory_update: 'Regulatory updates and announcements',
  subadmin_welcome: 'Welcome email for newly created subadmin accounts',
};

// Example API calls (replace with your actual API URL)
const API_URL = process.env.API_URL || 'http://localhost:3000';

async function addTemplate(templateName, templateId) {
  const response = await fetch(`${API_URL}/email-templates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: templateName,
      sendgridTemplateId: templateId,
      description: TEMPLATE_DESCRIPTIONS[templateName] || '',
      isActive: true,
      category: templateName.includes('subadmin') ? 'admin' : 'customer',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to add ${templateName}: ${error}`);
  }

  return await response.json();
}

async function addAllTemplates() {
  console.log('Adding email templates to database...\n');

  for (const [name, templateId] of Object.entries(TEMPLATE_IDS)) {
    if (templateId.includes('REPLACE')) {
      console.log(`⚠️  Skipping ${name} - template ID not set`);
      continue;
    }

    try {
      const result = await addTemplate(name, templateId);
      console.log(`✅ Added: ${name} (${templateId})`);
    } catch (error) {
      console.error(`❌ Error adding ${name}:`, error.message);
    }
  }

  console.log('\n✅ Done!');
}

// Run if executed directly
if (require.main === module) {
  addAllTemplates().catch(console.error);
}

module.exports = { addAllTemplates, TEMPLATE_IDS };

