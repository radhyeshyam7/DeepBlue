require('dotenv').config();
const twilio = require('twilio');

// Initialize Twilio client
let twilioClient = null;
const SMS_ENABLED = process.env.SMS_ENABLED === 'true';

if (SMS_ENABLED) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  
  if (!accountSid || !authToken) {
    console.error('⚠️ Twilio credentials missing in .env');
  } else {
    twilioClient = twilio(accountSid, authToken);
    console.log('✅ Twilio SMS service initialized');
  }
} else {
  console.log('ℹ️ SMS_ENABLED=false. SMS will be logged only.');
}

/**
 * Send SMS using Twilio
 */
async function sendSMS(to, message) {
  if (!SMS_ENABLED) {
    // Log to console instead of sending
    console.log(`📱 [SMS] To: ${to}`);
    console.log(`📱 [SMS] Message: ${message}`);
    return { success: true, mode: 'console' };
  }

  if (!twilioClient) {
    throw new Error('Twilio client not initialized');
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });

    console.log(`✅ SMS sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('❌ SMS send failed:', error.message);
    
    // Fallback to console log
    console.log(`📱 [SMS FALLBACK] To: ${to}`);
    console.log(`📱 [SMS FALLBACK] Message: ${message}`);
    
    throw error;
  }
}

/**
 * Send nominee alert for MEDIUM/HIGH-risk transaction
 */
async function sendNomineeAlert(nomineePhone, userName, amount = 0, payeeId = 'Unknown') {
  // Format amount - keep it short
  const amt = amount ? `₹${amount.toLocaleString('en-IN')}` : '₹0';
  
  // Crisp message under 160 characters (single SMS for trial account)
  const message = `🚨 ALERT: ${userName} making risky payment of ${amt} to ${payeeId}. Call them NOW!`;

  return await sendSMS(nomineePhone, message);
}

module.exports = {
  sendSMS,
  sendNomineeAlert
};
