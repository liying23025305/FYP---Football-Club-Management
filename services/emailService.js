const nodemailer = require('nodemailer');

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
};

// Create transporter (fixed typo: createTransport not createTransporter)
const transporter = nodemailer.createTransport(emailConfig);

// Email templates
const emailTemplates = {
  // Refund-related emails
  refundRequested: (customerName, orderId, refundAmount) => ({
    subject: `Refund Request Received - Order #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Refund Request Received</h2>
        <p>Dear ${customerName},</p>
        <p>We have received your refund request for Order #${orderId}.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order:</strong> #${orderId}</p>
          <p><strong>Refund Amount:</strong> $${parseFloat(refundAmount).toFixed(2)}</p>
          <p><strong>Status:</strong> Under Review</p>
        </div>
        <p>Our team will review your request and get back to you within 1-2 business days.</p>
        <p>Thank you for your patience.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Customer Service</p>
      </div>
    `
  }),

  refundApproved: (customerName, orderId, refundAmount) => ({
    subject: `Refund Approved - Order #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Refund Approved</h2>
        <p>Dear ${customerName},</p>
        <p>Your refund request for Order #${orderId} has been approved.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Refund Amount:</strong> $${parseFloat(refundAmount).toFixed(2)}</p>
          <p><strong>Processing Time:</strong> 3-5 business days</p>
        </div>
        <p>The refund will be processed back to your original payment method within 3-5 business days.</p>
        <p>Thank you for your understanding.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Customer Service</p>
      </div>
    `
  }),

  refundRejected: (customerName, orderId, reason) => ({
    subject: `Refund Request Update - Order #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Refund Request Update</h2>
        <p>Dear ${customerName},</p>
        <p>We have reviewed your refund request for Order #${orderId}.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p>Unfortunately, we are unable to process your refund request at this time.</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>If you have any questions or would like to discuss this further, please contact our customer service team.</p>
        <p>Thank you for your understanding.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Customer Service</p>
      </div>
    `
  }),

  refundProcessed: (customerName, orderId, refundAmount) => ({
    subject: `Refund Processed - Order #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Refund Processed</h2>
        <p>Dear ${customerName},</p>
        <p>Your refund for Order #${orderId} has been successfully processed.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Refund Amount:</strong> $${parseFloat(refundAmount).toFixed(2)}</p>
          <p><strong>Status:</strong> Completed</p>
        </div>
        <p>The refund should appear in your account within 1-3 business days depending on your bank.</p>
        <p>Thank you for choosing Football Club!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Customer Service</p>
      </div>
    `
  }),

  // Membership-related emails
  membershipWelcome: (customerName, tierName, expiryDate) => ({
    subject: `Welcome to Football Club - ${tierName} Membership`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Welcome to Football Club!</h2>
        <p>Dear ${customerName},</p>
        <p>Congratulations! Your ${tierName} membership has been successfully activated.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Membership Tier:</strong> ${tierName}</p>
          <p><strong>Valid Until:</strong> ${new Date(expiryDate).toLocaleDateString()}</p>
          <p><strong>Status:</strong> Active</p>
        </div>
        <p>You can now enjoy all the benefits of your ${tierName} membership, including:</p>
        <ul>
          <li>Priority event booking</li>
          <li>Exclusive member discounts</li>
          <li>Access to member-only content</li>
          <li>And much more!</li>
        </ul>
        <p>Welcome to the Football Club family!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Membership Team</p>
      </div>
    `
  }),

  membershipExpiringSoon: (customerName, tierName, daysLeft) => ({
    subject: `Membership Expiring Soon - ${tierName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">Membership Expiring Soon</h2>
        <p>Dear ${customerName},</p>
        <p>This is a friendly reminder that your ${tierName} membership will expire in ${daysLeft} days.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Membership:</strong> ${tierName}</p>
          <p><strong>Days Remaining:</strong> ${daysLeft}</p>
        </div>
        <p>To continue enjoying your membership benefits, please renew your membership before it expires.</p>
        <p><a href="/membership" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Renew Membership</a></p>
        <p>Thank you for being a valued member!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Membership Team</p>
      </div>
    `
  }),

  // Order confirmation
  orderConfirmation: (customerName, orderId, totalAmount, items) => ({
    subject: `Order Confirmation - Order #${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Order Confirmed</h2>
        <p>Dear ${customerName},</p>
        <p>Thank you for your order! Your order #${orderId} has been confirmed.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Order Number:</strong> ${orderId}</p>
          <p><strong>Total Amount:</strong> $${parseFloat(totalAmount).toFixed(2)}</p>
          <p><strong>Items:</strong></p>
          <ul>
            ${items.map(item => `<li>${item.name} x${item.quantity} - $${item.price}</li>`).join('')}
          </ul>
        </div>
        <p>We'll send you another email when your order ships.</p>
        <p>Thank you for choosing Football Club!</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Football Club - Order Team</p>
      </div>
    `
  }),

  // Reservation confirmation email
  reservationConfirmation: (customerName, date, time, partySize, notes) => ({
    subject: `Cafe Reservation Confirmed - ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #007bff;">Reservation Confirmed</h2>
        <p>Dear ${customerName},</p>
        <p>Your reservation at <strong>Raffles Rangers Cafe</strong> has been confirmed!</p>
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #007bff; margin-top: 0;">Reservation Details</h3>
          <p><strong>📅 Date:</strong> ${new Date(date).toLocaleDateString()}</p>
          <p><strong>🕐 Time:</strong> ${time.slice(0, 5)}</p>
          <p><strong>👥 Party Size:</strong> ${partySize} people</p>
          ${notes ? `<p><strong>💬 Special Requests:</strong> ${notes}</p>` : ''}
          <p><strong>📍 Location:</strong> Raffles Rangers Cafe</p>
        </div>
        <div style="background: #e7f3ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Important Notes:</strong></p>
          <ul style="margin: 10px 0;">
            <li>Please arrive on time for your reservation</li>
            <li>Contact us if you need to cancel or modify your booking</li>
            <li>Tables are held for 15 minutes past reservation time</li>
          </ul>
        </div>
        <p>We look forward to welcoming you to Raffles Rangers Cafe!</p>
        <p>If you have any questions, please don't hesitate to contact us.</p>
        <hr>
        <p style="color: #666; font-size: 12px;">Raffles Rangers Cafe - Reservations Team</p>
      </div>
    `
  })
};

// Send email function
async function sendEmail(to, template, ...args) {
  try {
    const emailData = emailTemplates[template](...args);
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Football Club" <noreply@footballclub.com>',
      to: to,
      subject: emailData.subject,
      html: emailData.html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Test email configuration
async function testEmailConfig() {
  try {
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
}

module.exports = {
  sendEmail,
  testEmailConfig,
  emailTemplates
};
