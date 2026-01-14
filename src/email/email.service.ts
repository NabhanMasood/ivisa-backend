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
      subject: 'Welcome to Visa123',
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Visa123</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>Thank you for creating your account with Visa123.</p>
              <p style="text-align: center;">
                <a href="${loginUrl}" class="button" style="color: white !important; text-decoration: none;">Login to Your Account</a>
              </p>
              <p>If you have any questions, please contact our support team.</p>
              <div class="contact-info">
                <strong>Contact Us:</strong><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a><br>
                New Orders: <a href="mailto:sophie@visa123.co.uk">sophie@visa123.co.uk</a><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>
              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

Thank you for creating your account with Visa123.

Login to your account: ${loginUrl}

If you have any questions, please contact our support team.

Contact Us:
General Inquiry: opportunity@visa123.co.uk
New Orders: sophie@visa123.co.uk
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .invoice-box { background-color: white; padding: 20px; border: 1px solid #e0e0e0; margin: 20px 0; }
            .invoice-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .invoice-row.total { font-weight: bold; font-size: 16px; color: #4CAF50; border-top: 2px solid #4CAF50; border-bottom: none; margin-top: 10px; padding-top: 10px; }
            .invoice-row.discount { color: #FF5722; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
                <h3 style="color: #333; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin-top: 0;">Payment Invoice</h3>
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
              
              <p>Our team will review your application within 24-48 hours. You'll receive email notifications for any status updates.</p>
              
              <div class="contact-info">
                <strong>Need Help?</strong><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

Our team will review your application within 24-48 hours. You'll receive email notifications for any status updates.

Need Help?
General Inquiry: opportunity@visa123.co.uk
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
              
              <p>Please provide the requested information as soon as possible. Your application processing will resume once we receive the information.</p>
              
              <div class="contact-info">
                <strong>Need Help?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

${notes ? `Note from our team:\n${notes}\n\n` : ''}Please provide the requested information as soon as possible. Your application processing will resume once we receive the information.

Need Help?
Customer Support: support@visa123.co.uk
General Inquiry: opportunity@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
              
              <div class="contact-info">
                <strong>Need Help?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

${notes ? `Note from our team:\n${notes}\n\n` : ''}Please review your application and make the necessary corrections. Our team will review your resubmission promptly.

Need Help?
Customer Support: support@visa123.co.uk
General Inquiry: opportunity@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
              
              <div class="contact-info">
                <strong>Questions?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

We'll notify you via email once there are any updates to your application status.

Questions?
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
              
              <p>Thank you for choosing Visa123 for your visa application needs.</p>
              
              <div class="contact-info">
                <strong>Contact Us:</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

Thank you for choosing Visa123 for your visa application needs.

Contact Us:
Customer Support: support@visa123.co.uk
General Inquiry: opportunity@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
              
              <div class="contact-info">
                <strong>Need Help?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

If you have any questions about this decision, please contact our support team.

Need Help?
Customer Support: support@visa123.co.uk
General Inquiry: opportunity@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .credentials-box { background-color: #e8f5e9; padding: 20px; border-left: 4px solid #4CAF50; margin: 20px 0; font-family: monospace; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Visa123</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been added as a sub-admin to the Visa123 platform. Your account has been created and is ready to use.</p>
              
              <div class="credentials-box">
                <strong>Your Login Credentials:</strong><br><br>
                <strong>Email:</strong> ${email}<br>
                <strong>Temporary Password:</strong> ${temporaryPassword}
              </div>
              
              <p style="text-align: center;">
                <a href="${adminPanelUrl}" class="button" style="color: white !important; text-decoration: none;">Login to Admin Panel</a>
              </p>
              
              <p><strong>Important:</strong> Please change your password immediately after your first login.</p>
              
              <div class="contact-info">
                <strong>Need Assistance?</strong><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please keep your credentials secure.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to Visa123!

You have been added as a sub-admin to the Visa123 platform. Your account has been created and is ready to use.

Your Login Credentials:
Email: ${email}
Temporary Password: ${temporaryPassword}

Login to Admin Panel: ${adminPanelUrl}

Important: Please change your password immediately after your first login.

Need Assistance?
General Inquiry: opportunity@visa123.co.uk

Best regards,
Visa123 Team`,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
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
              
              <div class="contact-info">
                <strong>Questions?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
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

Our team will review the submitted information and continue processing your application. You'll receive email notifications for any status updates.

Questions?
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Document submission email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send document submission email to ${to}:`, error);
    }
  }

  /**
   * Send pending application reminder email
   * Sent when user hasn't submitted their application after a certain time
   */
  async sendPendingApplicationReminderEmail(
    to: string,
    customerName: string,
    applicationUrl: string,
    couponCode?: string,
    couponDiscount?: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const msg = {
      to,
      from: fromEmail,
      subject: 'Complete Your Visa Application - Special Offer Inside!',
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .coupon-box { background-color: #4CAF50; padding: 20px; border: 2px solid #4CAF50; margin: 20px 0; text-align: center; }
            .coupon-box h2, .coupon-box h3 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; }
            .coupon-code { font-size: 24px; font-weight: bold; color: white; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Don't Miss Out on Your Visa Application!</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>We noticed you started a visa application but haven't completed it yet. Your application is waiting for you!</p>
              
              ${couponCode ? `
              <div class="coupon-box" style="background-color: #4CAF50; padding: 20px; border: 2px solid #4CAF50; margin: 20px 0; text-align: center;">
                <h3 style="margin-top: 0; color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600;">Special Offer Just For You!</h3>
                <p style="color: white;">Use this coupon code to get ${couponDiscount || 'a discount'} on your application:</p>
                <div style="font-size: 24px; font-weight: bold; color: white; margin: 10px 0;">${couponCode}</div>
                <p style="font-size: 12px; color: white;">Enter this code at checkout to apply your discount</p>
              </div>
              ` : ''}
              
              <p style="text-align: center;">
                <a href="${applicationUrl}" class="button" style="color: white !important; text-decoration: none;">Complete Your Application Now</a>
              </p>
              
              <p>Complete your application in just a few minutes and get one step closer to your travel destination.</p>
              
              <p>If you have any questions, our support team is here to help.</p>
              
              <div class="contact-info">
                <strong>Need Help?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a><br>
                New Orders: <a href="mailto:sophie@visa123.co.uk">sophie@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

We noticed you started a visa application but haven't completed it yet. Your application is waiting for you!

${couponCode ? `Special Offer: Use coupon code ${couponCode} to get ${couponDiscount || 'a discount'} on your application!\n\n` : ''}Complete your application: ${applicationUrl}

Complete your application in just a few minutes and get one step closer to your travel destination.

If you have any questions, our support team is here to help.

Need Help?
Customer Support: support@visa123.co.uk
New Orders: sophie@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Pending application reminder email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send pending application reminder email to ${to}:`, error);
    }
  }

  /**
   * Send coupon email for abandoned applications
   * Sent when user still hasn't submitted after the pending reminder
   */
  async sendAbandonedApplicationCouponEmail(
    to: string,
    customerName: string,
    applicationUrl: string,
    couponCode: string,
    couponDiscount: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const msg = {
      to,
      from: fromEmail,
      subject: `Your Visa Application - Gift Code Inside`,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .coupon-box { background-color: #4CAF50; padding: 25px; margin: 20px 0; text-align: center; border-radius: 8px; }
            .coupon-code { font-size: 28px; font-weight: bold; color: white; margin: 10px 0; letter-spacing: 2px; }
            .discount-text { font-size: 16px; color: white; margin: 10px 0; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>A Gift From Visa123</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName || 'Valued Customer'},</p>
              <p>We noticed you started a visa application with us. To help you complete your application, we'd like to offer you a gift code.</p>

              <div class="coupon-box">
                <p style="margin: 0 0 10px 0; color: white; font-size: 14px;">Your Gift Code</p>
                <div class="coupon-code">${couponCode}</div>
                <div class="discount-text">${couponDiscount}</div>
                <p style="font-size: 13px; color: white; margin: 10px 0 0 0;">Use this code at checkout</p>
              </div>

              <p style="text-align: center;">
                <a href="${applicationUrl}" class="button" style="color: white !important; text-decoration: none;">Continue Your Application</a>
              </p>

              <p>If you have any questions about your application, our team is here to help.</p>

              <div class="contact-info">
                <strong>Need Help?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a><br>
                New Orders: <a href="mailto:sophie@visa123.co.uk">sophie@visa123.co.uk</a><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a>
              </div>

              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Visa123. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName || 'Valued Customer'},

We noticed you started a visa application with us. To help you complete your application, we'd like to offer you a gift code.

Your Gift Code: ${couponCode}
${couponDiscount}

Use this code at checkout.

Continue your application: ${applicationUrl}

If you have any questions about your application, our team is here to help.

Need Help?
Customer Support: support@visa123.co.uk
New Orders: sophie@visa123.co.uk
General Inquiry: opportunity@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Abandoned application coupon email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send abandoned application coupon email to ${to}:`, error);
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

  /**
   * Send notification email when user changes their password
   */
  async sendPasswordChangedEmail(
    to: string,
    customerName: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const changedAt = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    const msg = {
      to,
      from: fromEmail,
      subject: 'Your Password Has Been Changed - Visa123',
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .warning-box { background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff9800; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Changed</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName},</p>
              <p>This is to confirm that your Visa123 account password was successfully changed.</p>

              <div class="info-box">
                <strong>Changed on:</strong> ${changedAt}
              </div>

              <div class="warning-box">
                <strong>Didn't make this change?</strong><br>
                If you did not change your password, please contact our support team immediately to secure your account.
              </div>

              <div class="contact-info">
                <strong>Contact Support:</strong><br>
                Email: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>

              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated security notification. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName},

This is to confirm that your Visa123 account password was successfully changed.

Changed on: ${changedAt}

Didn't make this change?
If you did not change your password, please contact our support team immediately to secure your account.

Contact Support:
Email: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Password changed notification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password changed email to ${to}:`, error);
    }
  }

  /**
   * Send confirmation email to referrer when they send a referral invitation
   */
  async sendReferralConfirmationEmail(
    to: string,
    referrerName: string,
    referredEmail: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const msg = {
      to,
      from: fromEmail,
      subject: 'Referral Invitation Sent Successfully',
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .info-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Referral Invitation Sent!</h1>
            </div>
            <div class="content">
              <p>Dear ${referrerName},</p>
              <p>Thank you for referring a friend to Visa123!</p>
              
              <div class="info-box">
                <strong>Referral Details:</strong><br>
                Email: ${referredEmail}
              </div>
              
              <p>We've sent an invitation to <strong>${referredEmail}</strong>. Once they sign up and create an account, you'll receive a <strong>10% discount coupon</strong> as a thank you for your referral!</p>
              
              <p>You can track all your referrals in your account dashboard.</p>
              
              <div class="contact-info">
                <strong>Questions?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${referrerName},

Thank you for referring a friend to Visa123!

Referral Details:
Email: ${referredEmail}

We've sent an invitation to ${referredEmail}. Once they sign up and create an account, you'll receive a 10% discount coupon as a thank you for your referral!

You can track all your referrals in your account dashboard.

Questions?
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Referral confirmation email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send referral confirmation email to ${to}:`, error);
    }
  }

  /**
   * Send notification email to referrer when their referral signs up
   * Includes the 10% discount coupon code
   */
  async sendReferralRewardEmail(
    to: string,
    referrerName: string,
    referredEmail: string,
    couponCode: string,
    referralsUrl?: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const msg = {
      to,
      from: fromEmail,
      subject: '🎉 Your Referral Signed Up - Here\'s Your Reward!',
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .success-box { background-color: #e8f5e9; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0; }
            .coupon-box { background-color: #4CAF50; padding: 30px; border: 2px solid #4CAF50; margin: 20px 0; text-align: center; }
            .coupon-box h2 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin-top: 0; }
            .coupon-code { font-size: 32px; font-weight: bold; color: white; margin: 15px 0; letter-spacing: 2px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Congratulations!</h1>
            </div>
            <div class="content">
              <p>Dear ${referrerName},</p>
              <p>Great news! Your referral has signed up!</p>
              
              <div class="success-box">
                <strong>Referral Details:</strong><br>
                Email: ${referredEmail}<br>
                Status: Signed Up ✓
              </div>
              
              <div class="coupon-box">
                <h2 style="margin-top: 0; color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600;">Your 10% Discount Coupon</h2>
                <div class="coupon-code">${couponCode}</div>
                <p style="color: white; font-size: 16px; margin: 10px 0;">Use this code on your next visa application to save 10%!</p>
                <p style="font-size: 12px; color: white;">Valid for 90 days • Single use</p>
              </div>
              
              ${referralsUrl ? `
              <p style="text-align: center;">
                <a href="${referralsUrl}" class="button" style="color: white !important; text-decoration: none;">View All My Referrals</a>
              </p>
              ` : ''}
              
              <p>Thank you for helping us grow! You can use this coupon code on your next visa application to enjoy a 10% discount.</p>
              
              <p><strong>How to use your coupon:</strong></p>
              <ul>
                <li>Start a new visa application</li>
                <li>At checkout, enter the coupon code: <strong>${couponCode}</strong></li>
                <li>Enjoy your 10% discount!</li>
              </ul>
              
              <div class="contact-info">
                <strong>Questions?</strong><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>
              
              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${referrerName},

Great news! Your referral has signed up!

Referral Details:
Email: ${referredEmail}
Status: Signed Up ✓

Your 10% Discount Coupon: ${couponCode}

Use this code on your next visa application to save 10%!
Valid for 90 days • Single use

${referralsUrl ? `View all your referrals: ${referralsUrl}\n\n` : ''}Thank you for helping us grow! You can use this coupon code on your next visa application to enjoy a 10% discount.

How to use your coupon:
1. Start a new visa application
2. At checkout, enter the coupon code: ${couponCode}
3. Enjoy your 10% discount!

Questions?
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Referral reward email sent to ${to} with coupon ${couponCode}`);
    } catch (error) {
      this.logger.error(`Failed to send referral reward email to ${to}:`, error);
    }
  }

  // ========================================
  // SALES KANBAN EMAIL METHODS
  // ========================================

  /**
   * Send a custom email composed by admin from the Sales Kanban
   */
  async sendCustomSalesEmail(
    to: string,
    customerName: string,
    subject: string,
    body: string,
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
      subject,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
            .app-number { background-color: #e8f5e9; padding: 10px; border-radius: 5px; margin: 15px 0; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Visa123</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName || 'Valued Customer'},</p>

              <div class="app-number">
                <strong>Application Reference:</strong> ${applicationNumber}
              </div>

              <div style="white-space: pre-wrap;">${body}</div>

              ${trackingUrl ? `
              <p style="text-align: center; margin-top: 30px;">
                <a href="${trackingUrl}" class="button" style="color: white !important; text-decoration: none;">Continue Your Application</a>
              </p>
              ` : ''}

              <div class="contact-info">
                <strong>Need Help?</strong><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a><br>
                New Orders: <a href="mailto:sophie@visa123.co.uk">sophie@visa123.co.uk</a><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>

              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Visa123. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName || 'Valued Customer'},

Application Reference: ${applicationNumber}

${body}

${trackingUrl ? `Continue your application: ${trackingUrl}

` : ''}Need Help?
General Inquiry: opportunity@visa123.co.uk
New Orders: sophie@visa123.co.uk
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Custom sales email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send custom sales email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send a "Need Help?" offer email from Sales Kanban
   */
  async sendHelpOfferEmail(
    to: string,
    customerName: string,
    applicationNumber: string,
    destinationCountry: string,
    visaType: string,
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
      subject: `Need Help with Your ${destinationCountry} Visa Application?`,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button-secondary { display: inline-block; padding: 10px 25px; background-color: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
            .app-details { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .help-box { background-color: #fff3e0; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ff9800; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>We're Here to Help!</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName || 'Valued Customer'},</p>

              <p>We noticed you started a visa application but haven't completed it yet. We're here to help you every step of the way!</p>

              <div class="app-details">
                <strong>Your Application Details:</strong><br>
                Reference: ${applicationNumber}<br>
                Destination: ${destinationCountry}<br>
                Visa Type: ${visaType}
              </div>

              <div class="help-box">
                <h3 style="margin-top: 0; color: #e65100;">How Can We Help?</h3>
                <p>If you're facing any challenges or have questions about:</p>
                <ul style="margin-bottom: 0;">
                  <li>Required documents</li>
                  <li>Processing times</li>
                  <li>Application requirements</li>
                  <li>Payment options</li>
                </ul>
              </div>

              <p>Our team is ready to assist you. Simply reply to this email or contact us directly!</p>

              <p style="text-align: center;">
                <a href="${trackingUrl}" class="button" style="color: white !important; text-decoration: none;">Complete Your Application</a>
              </p>

              <p style="text-align: center;">
                <a href="mailto:support@visa123.co.uk" class="button-secondary">Email Support</a>
              </p>

              <div class="contact-info">
                <strong>Contact Us:</strong><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a><br>
                New Orders: <a href="mailto:sophie@visa123.co.uk">sophie@visa123.co.uk</a><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>

              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Visa123. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName || 'Valued Customer'},

We noticed you started a visa application but haven't completed it yet. We're here to help you every step of the way!

Your Application Details:
Reference: ${applicationNumber}
Destination: ${destinationCountry}
Visa Type: ${visaType}

How Can We Help?
If you're facing any challenges or have questions about:
- Required documents
- Processing times
- Application requirements
- Payment options

Our team is ready to assist you. Simply reply to this email or contact us directly!

Complete your application: ${trackingUrl}

Contact Us:
General Inquiry: opportunity@visa123.co.uk
New Orders: sophie@visa123.co.uk
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Help offer email sent to ${to} for application ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send help offer email to ${to}:`, error);
      throw error;
    }
  }

  /**
   * Send a response email for visa inquiries (no application to complete)
   * Used when admin responds to inquiry submissions from the Sales Kanban
   */
  async sendInquiryResponseEmail(
    to: string,
    customerName: string,
    applicationNumber: string,
    nationality: string,
    destinationCountry: string,
    travellingFrom: string,
    inquirySubject?: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SENDGRID_FROM_EMAIL');

    if (!fromEmail) {
      this.logger.error('SENDGRID_FROM_EMAIL not configured');
      return;
    }

    const msg = {
      to,
      from: fromEmail,
      subject: `Re: Your Visa Inquiry - ${destinationCountry} Visa`,
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
            .header h1 { color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 600; margin: 0; font-size: 24px; }
            .content { background-color: #f9f9f9; padding: 30px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .contact-info { margin-top: 20px; padding: 15px; background-color: #f0f0f0; border-radius: 5px; font-size: 12px; }
            .inquiry-details { background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .response-box { background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #4CAF50; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Inquiry!</h1>
            </div>
            <div class="content">
              <p>Dear ${customerName || 'Valued Customer'},</p>

              <p>Thank you for reaching out to us about your visa inquiry. We have received your request and our team is reviewing it.</p>

              <div class="inquiry-details">
                <strong>Your Inquiry Details:</strong><br>
                Reference: ${applicationNumber}<br>
                ${inquirySubject ? `Subject: ${inquirySubject}<br>` : ''}
                Nationality: ${nationality}<br>
                Travelling From: ${travellingFrom}<br>
                Destination: ${destinationCountry}
              </div>

              <div class="response-box">
                <h3 style="margin-top: 0; color: #2e7d32;">What Happens Next?</h3>
                <p>Our visa specialists will review your inquiry and get back to you shortly with:</p>
                <ul style="margin-bottom: 0;">
                  <li>Visa availability for your route</li>
                  <li>Required documents</li>
                  <li>Processing times and fees</li>
                  <li>Any additional information you may need</li>
                </ul>
              </div>

              <p>We typically respond within 24-48 business hours. If you have any urgent questions, please don't hesitate to contact us directly.</p>

              <div class="contact-info">
                <strong>Contact Us:</strong><br>
                General Inquiry: <a href="mailto:opportunity@visa123.co.uk">opportunity@visa123.co.uk</a><br>
                New Orders: <a href="mailto:sophie@visa123.co.uk">sophie@visa123.co.uk</a><br>
                Customer Support: <a href="mailto:support@visa123.co.uk">support@visa123.co.uk</a>
              </div>

              <p>Best regards,<br>Visa123 Team</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} Visa123. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Dear ${customerName || 'Valued Customer'},

Thank you for reaching out to us about your visa inquiry. We have received your request and our team is reviewing it.

Your Inquiry Details:
Reference: ${applicationNumber}
${inquirySubject ? `Subject: ${inquirySubject}\n` : ''}Nationality: ${nationality}
Travelling From: ${travellingFrom}
Destination: ${destinationCountry}

What Happens Next?
Our visa specialists will review your inquiry and get back to you shortly with:
- Visa availability for your route
- Required documents
- Processing times and fees
- Any additional information you may need

We typically respond within 24-48 business hours. If you have any urgent questions, please don't hesitate to contact us directly.

Contact Us:
General Inquiry: opportunity@visa123.co.uk
New Orders: sophie@visa123.co.uk
Customer Support: support@visa123.co.uk

Best regards,
Visa123 Team`,
    };

    try {
      await sgMail.send(msg);
      this.logger.log(`Inquiry response email sent to ${to} for inquiry ${applicationNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send inquiry response email to ${to}:`, error);
      throw error;
    }
  }
}