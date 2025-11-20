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
   * Send welcome email to newly registered customer
   */
  async sendCustomerWelcomeEmail(
    to: string,
    customerName: string,
    loginUrl: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const msg = {
      to,
      from: fromEmail,
      subject: 'Welcome to iVisa123',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to iVisa123</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Thank you for creating your account with iVisa123.</p>
              <p style="text-align: center;">
                <a href="${loginUrl}" class="button">Login to Your Account</a>
              </p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>iVisa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

Thank you for creating your account with iVisa123.

Login to your account: ${loginUrl}

If you have any questions, please contact our support team.

Best regards,
iVisa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}:`, error);
    }
  }

  /**
   * Send application submission confirmation email to customer
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
      subject: `Application Submitted - ${applicationNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .invoice-box { background-color: white; padding: 20px; border: 1px solid #e0e0e0; margin: 20px 0; }
            .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .invoice-row.total { font-weight: bold; font-size: 16px; color: #4CAF50; border-top: 2px solid #4CAF50; border-bottom: none; margin-top: 10px; padding-top: 10px; }
            .invoice-row.discount { color: #FF5722; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Submitted Successfully</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Thank you for submitting your visa application. Your application has been received and is now being processed.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
              ${paymentDetails ? `
              <div class="invoice-box">
                <h3>Payment Invoice</h3>
                <div class="invoice-row">
                  <span>Government Fee:</span>
                  <span>$${paymentDetails.governmentFee.toFixed(2)}</span>
                </div>
                <div class="invoice-row">
                  <span>Service Fee:</span>
                  <span>$${paymentDetails.serviceFee.toFixed(2)}</span>
                </div>
                <div class="invoice-row">
                  <span>Processing Fee:</span>
                  <span>$${paymentDetails.processingFee.toFixed(2)}</span>
                </div>
                ${paymentDetails.discountAmount && paymentDetails.discountAmount > 0 ? `
                <div class="invoice-row discount">
                  <span>Discount ${paymentDetails.couponCode ? `(${paymentDetails.couponCode})` : ''}:</span>
                  <span>-$${paymentDetails.discountAmount.toFixed(2)}</span>
                </div>
                ` : ''}
                <div class="invoice-row total">
                  <span>Total Paid:</span>
                  <span>$${paymentDetails.totalAmount.toFixed(2)}</span>
                </div>
                ${paymentDetails.paymentMethod ? `<p style="font-size: 12px; color: #666; margin-top: 15px;">Payment Method: ${paymentDetails.paymentMethod}</p>` : ''}
                ${paymentDetails.transactionId ? `<p style="font-size: 12px; color: #666;">Transaction ID: ${paymentDetails.transactionId}</p>` : ''}
                ${paymentDetails.paidAt ? `<p style="font-size: 12px; color: #666;">Date: ${new Date(paymentDetails.paidAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>` : ''}
              </div>
              ` : ''}
              
              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button">Track Your Application</a>
              </p>
              
              <p>Our team will review your application within 24-48 hours. You'll receive email notifications for any status updates.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
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
Track your application: ${trackingUrl}

Our team will review your application within 24-48 hours. You'll receive email notifications for any status updates.

Best regards,
iVisa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Application submitted email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send application submitted email to ${to}:`, error);
    }
  }

  /**
   * Send email when application status changes to "Additional Info Required"
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
            .header { background-color: #FF9800; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #fff3e0; padding: 15px; border-left: 4px solid #FF9800; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #FF9800; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Additional Information Required</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We need some additional information to process your visa application.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
              ${notes ? `<p><strong>Note from our team:</strong><br>${notes}</p>` : ''}
              
              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button">Submit Additional Information</a>
              </p>
              
              <p>Please provide the requested information as soon as possible. Your application processing will resume once we receive the information.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
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

${notes ? `Note from our team:\n${notes}\n\n` : ''}Please log in to submit the necessary details: ${trackingUrl}

Please provide the requested information as soon as possible. Your application processing will resume once we receive the information.

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
            .header { background-color: #F44336; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #ffebee; padding: 15px; border-left: 4px solid #F44336; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #F44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Resubmission Required</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We've reviewed your visa application and found that some information needs to be corrected or resubmitted.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
              ${notes ? `<p><strong>Note from our team:</strong><br>${notes}</p>` : ''}
              
          
              
              <p>Please review your application and make the necessary corrections. Our team will review your resubmission promptly.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
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

${notes ? `Note from our team:\n${notes}\n\n` : ''}Please review your application and make the necessary corrections: ${trackingUrl}

Our team will review your resubmission promptly.

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
   * Send email when application status changes to "Processing"
   */
  async sendApplicationProcessingEmail(
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
      subject: `Application Processing - ${applicationNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e3f2fd; padding: 15px; border-left: 4px solid #2196F3; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Processing</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Your visa application is now being processed.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
             
              
              <p>We'll notify you via email once there are any updates to your application status.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

Your visa application is now being processed.

Application Number: ${applicationNumber}

Track your application: ${trackingUrl}

We'll notify you via email once there are any updates to your application status.

Best regards,
iVisa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Application processing email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send application processing email to ${to}:`, error);
    }
  }

  /**
   * Send email when application is completed
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
      subject: `Application Completed - ${applicationNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Completed</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Your visa application has been successfully completed and processed.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}<br>
                <strong>Status:</strong> Completed
              </div>
              
           
              
              <p>Thank you for choosing iVisa123 for your visa application needs.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

Your visa application has been successfully completed and processed.

Application Number: ${applicationNumber}
Status: Completed

View your application details: ${trackingUrl}

Thank you for choosing iVisa123 for your visa application needs.

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
   * Send email when application is rejected
   */
  async sendApplicationRejectedEmail(
    to: string,
    customerName: string,
    applicationNumber: string,
    rejectionReason: string,
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
      subject: `Application Rejected - ${applicationNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #F44336; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #ffebee; padding: 15px; border-left: 4px solid #F44336; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #F44336; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Rejected</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Unfortunately, your visa application has been rejected.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}<br>
                <strong>Reason:</strong> ${rejectionReason}
              </div>
           
              
              <p>If you have any questions about this decision, please contact our support team.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

Unfortunately, your visa application has been rejected.

Application Number: ${applicationNumber}
Reason: ${rejectionReason}

View your application details: ${trackingUrl}

If you have any questions about this decision, please contact our support team.

Best regards,
iVisa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Application rejected email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send application rejected email to ${to}:`, error);
    }
  }

  /**
   * Send welcome email to newly created subadmin with login credentials
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
      subject: 'Welcome to iVisa123 - Your Admin Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .credentials-box { background-color: #e3f2fd; padding: 20px; border-left: 4px solid #2196F3; margin: 20px 0; font-family: monospace; }
            .button { display: inline-block; padding: 12px 30px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to iVisa123</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been added as a sub-admin to the iVisa123 platform. Your account has been created and is ready to use.</p>
              
              <div class="credentials-box">
                <strong>Your Login Credentials:</strong><br><br>
                <strong>Email:</strong> ${email}<br>
                <strong>Temporary Password:</strong> ${temporaryPassword}
              </div>
              
              <p style="text-align: center;">
                <a href="${adminPanelUrl}" class="button">Login to Admin Panel</a>
              </p>
              
              <p><strong>Important:</strong> Please change your password immediately after your first login.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please keep your credentials secure.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to iVisa123!

You have been added as a sub-admin to the iVisa123 platform. Your account has been created and is ready to use.

Your Login Credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

Login to Admin Panel: ${adminPanelUrl}

Important: Please change your password immediately after your first login.

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

  /**
   * Send email confirmation when customer submits documents/additional info
   */
  async sendDocumentSubmissionEmail(
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
      subject: `Documents Received - ${applicationNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Documents Received</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We have received the additional information you submitted for your visa application.</p>
              
              <div class="info-box">
                <strong>Application Number:</strong> ${applicationNumber}
              </div>
              
           
              
              <p>Our team will review the submitted information and continue processing your application. You'll receive email notifications for any status updates.</p>
              
              <p>Best regards,<br>iVisa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

We have received the additional information you submitted for your visa application.

Application Number: ${applicationNumber}

Track your application: ${trackingUrl}

Our team will review the submitted information and continue processing your application. You'll receive email notifications for any status updates.

Best regards,
iVisa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Document submission email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send document submission email to ${to}:`, error);
    }
  }

  // Additional email methods (for future use)
  async sendIncompleteApplicationEmail(
    to: string,
    customerName: string,
    applicationNumber: string,
    applicationUrl: string,
  ): Promise<void> {
    // Implementation for incomplete application reminder
    // Similar structure to above methods
  }

  async sendDocumentRequestEmail(
    to: string,
    customerName: string,
    applicationNumber: string,
    documentTypes: string[],
    trackingUrl: string,
    notes?: string,
  ): Promise<void> {
    // Implementation for document request
    // Similar structure to above methods
  }

  async sendVisaExpiryReminderEmail(
    to: string,
    customerName: string,
    visaNumber: string,
    expiryDate: Date,
    daysUntilExpiry: number,
  ): Promise<void> {
    // Implementation for visa expiry reminder
    // Similar structure to above methods
  }

  async sendPostServiceFollowupEmail(
    to: string,
    customerName: string,
    applicationNumber: string,
    feedbackUrl: string,
  ): Promise<void> {
    // Implementation for post-service follow-up
    // Similar structure to above methods
  }

  async sendRegulatoryUpdateEmail(
    to: string,
    customerName: string,
    updateTitle: string,
    updateContent: string,
    updateUrl: string,
  ): Promise<void> {
    // Implementation for regulatory updates
    // Similar structure to above methods
  }
}
