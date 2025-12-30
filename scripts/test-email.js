#!/usr/bin/env node

/**
 * Test Email Script
 *
 * Tests sending emails using the configured SMTP settings.
 *
 * Usage:
 *   node scripts/test-email.js [email-address]
 */

require('dotenv').config({ path: './dashboard/.env.local' });
const nodemailer = require('nodemailer');

// Configuration
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || SMTP_USER;

// Get recipient email from command line argument
const recipientEmail = process.argv[2];

async function testEmailSending() {
  console.log('📧 Testing email configuration...\n');

  // Check configuration
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    console.log('❌ Missing email configuration. Please add to dashboard/.env.local:');
    console.log('');
    console.log('# Email Configuration');
    console.log('SMTP_HOST=smtp.gmail.com');
    console.log('SMTP_PORT=587');
    console.log('SMTP_USER=your-email@gmail.com');
    console.log('SMTP_PASSWORD=your-app-password');
    console.log('EMAIL_FROM=your-email@gmail.com');
    console.log('');
    console.log('For Gmail: Get an "App Password" from https://myaccount.google.com/apppasswords');
    return;
  }

  if (!recipientEmail) {
    console.log('❌ Please provide a recipient email address:');
    console.log('node scripts/test-email.js your-email@example.com');
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASSWORD,
    },
  });

  // Test email content
  const mailOptions = {
    from: EMAIL_FROM,
    to: recipientEmail,
    subject: '🧪 Irish Property Data - Email Test',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">🧪 Email Test Successful!</h1>
        <p>Hello!</p>
        <p>This is a test email from your Irish Property Data alert system.</p>
        <p><strong>Configuration:</strong></p>
        <ul>
          <li>SMTP Host: ${SMTP_HOST}</li>
          <li>SMTP Port: ${SMTP_PORT}</li>
          <li>From: ${EMAIL_FROM}</li>
        </ul>
        <p>If you're receiving this, your email configuration is working correctly! 🎉</p>
        <p>Soon you'll receive property alert emails when new properties match your criteria.</p>
        <br>
        <p>Best regards,<br>Irish Property Data Team</p>
      </div>
    `,
  };

  try {
    console.log(`📤 Sending test email to: ${recipientEmail}`);
    console.log(`📧 From: ${EMAIL_FROM}`);
    console.log(`🌐 SMTP: ${SMTP_HOST}:${SMTP_PORT}`);

    const info = await transporter.sendMail(mailOptions);

    console.log('');
    console.log('✅ Email sent successfully!');
    console.log(`📨 Message ID: ${info.messageId}`);
    console.log(`📧 Response: ${info.response}`);

    console.log('');
    console.log('🎉 Check your inbox for the test email!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run: node scripts/process-alerts.js');
    console.log('2. Add new properties to trigger real alerts');

  } catch (error) {
    console.error('❌ Failed to send email:');
    console.error(error.message);

    if (error.code === 'EAUTH') {
      console.log('');
      console.log('🔐 Authentication failed. For Gmail:');
      console.log('1. Enable 2FA: https://myaccount.google.com/security');
      console.log('2. Create App Password: https://myaccount.google.com/apppasswords');
      console.log('3. Use the App Password (not your regular password) in SMTP_PASSWORD');
    }

    if (error.code === 'ECONNREFUSED') {
      console.log('');
      console.log('🌐 Connection failed. Check:');
      console.log('- SMTP_HOST is correct');
      console.log('- SMTP_PORT is correct');
      console.log('- Your firewall/antivirus is not blocking');
    }
  }
}

// Run the test
testEmailSending().then(() => {
  console.log('\n✨ Test completed!');
  process.exit(0);
}).catch(error => {
  console.error('💥 Test failed:', error);
  process.exit(1);
});
