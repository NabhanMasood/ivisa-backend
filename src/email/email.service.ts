import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgMail from '@sendgrid/mail';

@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
        if (!apiKey) {
            this.logger.warn('SENDGRID_API_KEY not configured. Email functionality will not work.');
        } else {
            sgMail.setApiKey(apiKey);
            this.logger.log('SendGrid initialized successfully');
        }
    }

    /**
     * Send application submission confirmation email to customer
     * @param to Customer email address
     * @param customerName Customer's full name
     * @param applicationNumber Application tracking number
     * @param trackingUrl Full URL for tracking the application
     * @param paymentDetails Payment/invoice details
     */
    async sendApplicationSubmittedEmail(
        to: string,
        customerName: string,
        applicationNumber: string,
        trackingUrl: string,
        paymentDetails?: {
            governmentFee: number;
            serviceFee: number;
            processingFee: number;
            totalAmount: number;
            discountAmount?: number;
            couponCode?: string;
            paymentMethod?: string;
            transactionId?: string;
            paidAt?: Date;
        },
    ): Promise<void> {
        const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

        if (!fromEmail) {
            this.logger.error('SENDGRID_FROM_EMAIL not configured');
            return;
        }

        const msg = {
            to,
            from: fromEmail,
            subject: `Application Submitted Successfully - ${applicationNumber}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .invoice-box { background-color: white; padding: 20px; border: 2px solid #e0e0e0; border-radius: 5px; margin: 20px 0; }
            .invoice-header { font-size: 18px; font-weight: bold; margin-bottom: 15px; color: #4CAF50; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
            .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .invoice-row.total { font-weight: bold; font-size: 16px; color: #4CAF50; border-top: 2px solid #4CAF50; border-bottom: none; margin-top: 10px; padding-top: 10px; }
            .invoice-row.discount { color: #FF5722; }
            .invoice-label { color: #666; }
            .invoice-value { font-weight: 500; color: #333; }
            .invoice-footer { margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Submitted Successfully! ✓</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>Thank you for submitting your visa application. Your application has been received and is now being processed.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
              ${paymentDetails ? `
              <div class="invoice-box">
                <div class="invoice-header">
                  📋 Payment Invoice
                </div>
                
                <div class="invoice-row">
                  <span class="invoice-label">Government Fee:</span>
                  <span class="invoice-value">$${paymentDetails.governmentFee.toFixed(2)}</span>
                </div>
                
                <div class="invoice-row">
                  <span class="invoice-label">Service Fee:</span>
                  <span class="invoice-value">$${paymentDetails.serviceFee.toFixed(2)}</span>
                </div>
                
                <div class="invoice-row">
                  <span class="invoice-label">Processing Fee:</span>
                  <span class="invoice-value">$${paymentDetails.processingFee.toFixed(2)}</span>
                </div>
                
                ${paymentDetails.discountAmount && paymentDetails.discountAmount > 0 ? `
                <div class="invoice-row discount">
                  <span class="invoice-label">Discount ${paymentDetails.couponCode ? `(${paymentDetails.couponCode})` : ''}:</span>
                  <span class="invoice-value">-$${paymentDetails.discountAmount.toFixed(2)}</span>
                </div>
                ` : ''}
                
                <div class="invoice-row total">
                  <span class="invoice-label">Total Paid:</span>
                  <span class="invoice-value">$${paymentDetails.totalAmount.toFixed(2)}</span>
                </div>
                
                <div class="invoice-footer">
                  ${paymentDetails.paymentMethod ? `<div>Payment Method: ${paymentDetails.paymentMethod}</div>` : ''}
                  ${paymentDetails.transactionId ? `<div>Transaction ID: ${paymentDetails.transactionId}</div>` : ''}
                  ${paymentDetails.paidAt ? `<div>Date: ${new Date(paymentDetails.paidAt).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</div>` : ''}
                </div>
              </div>
              ` : ''}
              
              <p>You can track the status of your application at any time by clicking the button below:</p>
              
              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button">Track Your Application</a>
              </p>
              
              <p><strong>What's Next?</strong></p>
              <ul>
                <li>Our team will review your application within 24-48 hours</li>
                <li>You'll receive email notifications for any status updates</li>
                <li>If additional information is needed, we'll contact you via email</li>
              </ul>
              
              <p>Please keep your application number handy for future reference.</p>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              <strong>iVisa123 Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Dear ${customerName},

Thank you for submitting your visa application. Your application has been received and is now being processed.

Application Number: ${applicationNumber}

${paymentDetails ? `
PAYMENT INVOICE
===============
Government Fee: $${paymentDetails.governmentFee.toFixed(2)}
Service Fee: $${paymentDetails.serviceFee.toFixed(2)}
Processing Fee: $${paymentDetails.processingFee.toFixed(2)}
${paymentDetails.discountAmount && paymentDetails.discountAmount > 0 ? `Discount ${paymentDetails.couponCode ? `(${paymentDetails.couponCode})` : ''}: -$${paymentDetails.discountAmount.toFixed(2)}\n` : ''}
---------------
TOTAL PAID: $${paymentDetails.totalAmount.toFixed(2)}

${paymentDetails.paymentMethod ? `Payment Method: ${paymentDetails.paymentMethod}\n` : ''}${paymentDetails.transactionId ? `Transaction ID: ${paymentDetails.transactionId}\n` : ''}${paymentDetails.paidAt ? `Date: ${new Date(paymentDetails.paidAt).toLocaleString()}\n` : ''}
` : ''}
You can track the status of your application at: ${trackingUrl}

What's Next?
- Our team will review your application within 24-48 hours
- You'll receive email notifications for any status updates
- If additional information is needed, we'll contact you via email

Please keep your application number handy for future reference.

If you have any questions, please don't hesitate to contact our support team.

Best regards,
iVisa123 Team`,
        };

        try {
            await sgMail.send(msg);
            this.logger.log(`Application submitted email sent to ${to} for application ${applicationNumber}`);
        } catch (error) {
            this.logger.error(`Failed to send application submitted email to ${to}:`, error);
            // Don't throw error to prevent blocking the main flow
        }
    }

    /**
     * Send email when application status changes to "Additional Info Required"
     * @param to Customer email address
     * @param customerName Customer's full name
     * @param applicationNumber Application tracking number
     * @param trackingUrl Full URL for tracking the application
     * @param notes Additional notes from admin (optional)
     */
    async sendAdditionalInfoRequiredEmail(
        to: string,
        customerName: string,
        applicationNumber: string,
        trackingUrl: string,
        notes?: string,
    ): Promise<void> {
        const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

        if (!fromEmail) {
            this.logger.error('SENDGRID_FROM_EMAIL not configured');
            return;
        }

        const msg = {
            to,
            from: fromEmail,
            subject: `Action Required: Additional Information Needed - ${applicationNumber}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background-color: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
            .notes-box { background-color: #fffde7; padding: 15px; border-left: 4px solid #FFC107; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Additional Information Required</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>We need some additional information to process your visa application.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
              ${notes ? `<div class="notes-box">
                <strong>Note from our team:</strong><br>
                ${notes}
              </div>` : ''}
              
              <p>Please log in to your account to view the specific information required and submit the necessary details.</p>
              
              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button">Submit Additional Information</a>
              </p>
              
              <p><strong>Important:</strong></p>
              <ul>
                <li>Please provide the requested information as soon as possible</li>
                <li>Your application processing will resume once we receive the information</li>
                <li>Check your account for specific details about what's needed</li>
              </ul>
              
              <p>If you have any questions, please contact our support team.</p>
              
              <p>Best regards,<br>
              <strong>iVisa123 Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Dear ${customerName},

We need some additional information to process your visa application.

Application Number: ${applicationNumber}

${notes ? `Note from our team:
${notes}

` : ''}Please log in to your account to view the specific information required and submit the necessary details: ${trackingUrl}

Important:
- Please provide the requested information as soon as possible
- Your application processing will resume once we receive the information
- Check your account for specific details about what's needed

If you have any questions, please contact our support team.

Best regards,
iVisa123 Team`,
        };

        try {
            await sgMail.send(msg);
            this.logger.log(`Additional info required email sent to ${to} for application ${applicationNumber}`);
        } catch (error) {
            this.logger.error(`Failed to send additional info required email to ${to}:`, error);
        }
    }

    /**
     * Send email when application status changes to "Resubmission"
     * @param to Customer email address
     * @param customerName Customer's full name
     * @param applicationNumber Application tracking number
     * @param trackingUrl Full URL for tracking the application
     * @param notes Additional notes from admin (optional)
     */
    async sendResubmissionRequiredEmail(
        to: string,
        customerName: string,
        applicationNumber: string,
        trackingUrl: string,
        notes?: string,
    ): Promise<void> {
        const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

        if (!fromEmail) {
            this.logger.error('SENDGRID_FROM_EMAIL not configured');
            return;
        }

        const msg = {
            to,
            from: fromEmail,
            subject: `Action Required: Resubmission Needed - ${applicationNumber}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F44336; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #F44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background-color: #ffebee; padding: 15px; border-left: 4px solid #F44336; margin: 20px 0; }
            .notes-box { background-color: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔄 Resubmission Required</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              
              <p>We've reviewed your visa application and found that some information needs to be corrected or resubmitted.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
              ${notes ? `<div class="notes-box">
                <strong>Note from our team:</strong><br>
                ${notes}
              </div>` : ''}
              
              <p>Please review your application and make the necessary corrections.</p>
              
              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button">Resubmit Your Application</a>
              </p>
              
              <p><strong>What to do:</strong></p>
              <ul>
                <li>Log in to your account to see the specific items that need correction</li>
                <li>Review the feedback from our team</li>
                <li>Make the necessary changes and resubmit</li>
                <li>Our team will review your resubmission promptly</li>
              </ul>
              
              <p>If you have any questions about the required changes, please contact our support team.</p>
              
              <p>Best regards,<br>
              <strong>iVisa123 Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Dear ${customerName},

We've reviewed your visa application and found that some information needs to be corrected or resubmitted.

Application Number: ${applicationNumber}

${notes ? `Note from our team:
${notes}

` : ''}Please review your application and make the necessary corrections: ${trackingUrl}

What to do:
- Log in to your account to see the specific items that need correction
- Review the feedback from our team
- Make the necessary changes and resubmit
- Our team will review your resubmission promptly

If you have any questions about the required changes, please contact our support team.

Best regards,
iVisa123 Team`,
        };

        try {
            await sgMail.send(msg);
            this.logger.log(`Resubmission required email sent to ${to} for application ${applicationNumber}`);
        } catch (error) {
            this.logger.error(`Failed to send resubmission required email to ${to}:`, error);
        }
    }

    /**
     * Send email when application is completed
     * @param to Customer email address
     * @param customerName Customer's full name
     * @param applicationNumber Application tracking number
     * @param trackingUrl Full URL for tracking the application
     */
    async sendApplicationCompletedEmail(
        to: string,
        customerName: string,
        applicationNumber: string,
        trackingUrl: string,
    ): Promise<void> {
        const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

        if (!fromEmail) {
            this.logger.error('SENDGRID_FROM_EMAIL not configured');
            return;
        }

        const msg = {
            to,
            from: fromEmail,
            subject: `Great News! Your Visa Application is Complete - ${applicationNumber}`,
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Application Completed!</h1>
            </div>
            <div class="content">
              <div class="success-icon">✅</div>
              
              <p>Dear ${customerName},</p>
              
              <p>Congratulations! Your visa application has been successfully completed and processed.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}<br>
                <strong>Status:</strong> Completed
              </div>
              
              <p>You can view your complete application details and download any necessary documents by clicking the button below:</p>
              
              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button">View Application Details</a>
              </p>
              
              <p><strong>Next Steps:</strong></p>
              <ul>
                <li>Review your application status and any provided documents</li>
                <li>Check your account for any additional information or instructions</li>
                <li>Keep your application number for future reference</li>
              </ul>
              
              <p>Thank you for choosing iVisa123 for your visa application needs. We wish you a wonderful trip!</p>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              <strong>iVisa123 Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Dear ${customerName},

Congratulations! Your visa application has been successfully completed and processed.

Application Number: ${applicationNumber}
Status: Completed

You can view your complete application details and download any necessary documents at: ${trackingUrl}

Next Steps:
- Review your application status and any provided documents
- Check your account for any additional information or instructions
- Keep your application number for future reference

Thank you for choosing iVisa123 for your visa application needs. We wish you a wonderful trip!

If you have any questions, please don't hesitate to contact our support team.

Best regards,
iVisa123 Team`,
        };

        try {
            await sgMail.send(msg);
            this.logger.log(`Application completed email sent to ${to} for application ${applicationNumber}`);
        } catch (error) {
            this.logger.error(`Failed to send application completed email to ${to}:`, error);
        }
    }

    /**
     * Send welcome email to newly created subadmin with login credentials
     * @param to Subadmin email address
     * @param email Subadmin email (same as to, for clarity)
     * @param temporaryPassword Temporary password for first login
     * @param adminPanelUrl URL to the admin panel login page
     */
    async sendSubadminWelcomeEmail(
        to: string,
        email: string,
        temporaryPassword: string,
        adminPanelUrl: string,
    ): Promise<void> {
        const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

        if (!fromEmail) {
            this.logger.error('SENDGRID_FROM_EMAIL not configured');
            return;
        }

        const msg = {
            to,
            from: fromEmail,
            subject: 'Welcome to Visa123 - Your Admin Account',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .credentials-box { background-color: #e3f2fd; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; font-family: monospace; }
            .warning-box { background-color: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Visa123! 👋</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              
              <p>You have been added as a sub-admin to the iVisa123 platform. Your account has been created and is ready to use.</p>
              
              <div class="credentials-box">
                <strong>Your Login Credentials:</strong><br><br>
                <strong>Email:</strong> ${email}<br>
                <strong>Temporary Password:</strong> ${temporaryPassword}
              </div>
              
              <div class="warning-box">
                <strong>⚠️ Important Security Notice:</strong><br>
                For security reasons, please change your password immediately after your first login.
              </div>
              
              <p style="text-align: center;">
                <a href="${adminPanelUrl}" class="button">Login to Admin Panel</a>
              </p>
              
              <p><strong>Getting Started:</strong></p>
              <ul>
                <li>Click the button above to access the admin panel</li>
                <li>Use the credentials provided to log in</li>
                <li>Change your password immediately after logging in</li>
                <li>Familiarize yourself with the dashboard and available features</li>
              </ul>
              
              <p><strong>Security Best Practices:</strong></p>
              <ul>
                <li>Never share your login credentials with anyone</li>
                <li>Use a strong, unique password</li>
                <li>Log out when you're done using the admin panel</li>
                <li>Contact the super admin if you notice any suspicious activity</li>
              </ul>
              
              <p>If you have any questions or need assistance, please contact the super administrator.</p>
              
              <p>Best regards,<br>
              <strong>iVisa123 Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please keep your credentials secure.</p>
            </div>
          </div>
        </body>
        </html>
      `,
            text: `Welcome to Visa123!

You have been added as a sub-admin to the iVisa123 platform. Your account has been created and is ready to use.

Your Login Credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

⚠️ Important Security Notice:
For security reasons, please change your password immediately after your first login.

Login to Admin Panel: ${adminPanelUrl}

Getting Started:
- Use the URL above to access the admin panel
- Use the credentials provided to log in
- Change your password immediately after logging in
- Familiarize yourself with the dashboard and available features

Security Best Practices:
- Never share your login credentials with anyone
- Use a strong, unique password
- Log out when you're done using the admin panel
- Contact the super admin if you notice any suspicious activity

If you have any questions or need assistance, please contact the super administrator.

Best regards,
iVisa123 Team`,
        };

        try {
            await sgMail.send(msg);
            this.logger.log(`Subadmin welcome email sent to ${to}`);
        } catch (error) {
            this.logger.error(`Failed to send subadmin welcome email to ${to}:`, error);
        }
    }
}

