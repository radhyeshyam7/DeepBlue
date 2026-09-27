const { sendNomineeAlert: sendNomineeSMS } = require('../services/smsService');

/**
 * Wrapper function to send nominee alert
 * Handles parameter extraction and error handling
 */
async function sendNomineeAlert({ nomineePhone, nomineeName, userName, amount, payee_id }) {
  try {
    if (!nomineePhone) {
      console.warn('⚠️ Nominee phone not provided');
      return { success: false, error: 'No phone number' };
    }

    await sendNomineeSMS(nomineePhone, userName, amount, payee_id);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending nominee alert:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendNomineeAlert
};
