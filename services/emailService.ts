import emailjs from '@emailjs/browser';

// CREDENTIALS PROVIDED BY USER
const SERVICE_ID = 'service_869fzvp';
const TEMPLATE_ID = 'template_fm9l04s';
const PUBLIC_KEY = 'wqv_xsycbgER5pT1K';

export const emailService = {
  /**
   * Initializes the EmailJS library
   */
  init() {
    try {
      emailjs.init(PUBLIC_KEY);
    } catch (error) {
      // Silent failure in production
    }
  },

  /**
   * Sends a verification code to the provided email.
   * Sends multiple variations of the email key to ensure compatibility with the template.
   */
  async sendVerificationCode(email: string, code: string, username: string): Promise<void> {
    if (!email || !code) {
      throw new Error('Missing email or code');
    }

    try {
      // We send multiple keys for the email address to catch whatever variable 
      // is configured in the EmailJS template "To Email" field.
      // We also send multiple keys for the CODE (passcode, message, otp) to ensure it appears in the body.
      const templateParams = {
        // Email address targets
        to_email: email,    // Standard
        email: email,       // Common fallback
        recipient: email,   // Common fallback
        reply_to: email,    // Often required by email services
        
        // Name targets
        to_name: username,
        username: username, // Redundant key
        
        // Code targets - covering all common variable names
        message: code,          // Default EmailJS variable
        code: code,             // Standard
        passcode: code,         // User requested specific variable
        otp: code,              // Common alias
        verification_code: code // Common alias
      };

      const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams);
      
      if (response.status !== 200) {
        throw new Error(`EmailJS Status: ${response.status}`);
      }
      
    } catch (error: any) {
      // Silent error logging for security, but allow UI to handle the throw
      throw new Error('EMAIL_SEND_FAILED');
    }
  }
};