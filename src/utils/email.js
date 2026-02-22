const Brevo = require('@getbrevo/brevo');

/**
 * Sends an email using Brevo REST API
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML
 */
const sendEmail = async (to, subject, html) => {
    try {
        const apiInstance = new Brevo.TransactionalEmailsApi();

        // Configure API key
        const apiKey = apiInstance.authentications['apiKey'];
        apiKey.apiKey = process.env.BREVO_API_KEY;

        const sendSmtpEmail = new Brevo.SendSmtpEmail();

        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = html;
        sendSmtpEmail.sender = {
            name: "ElectroCare",
            email: process.env.EMAIL_FROM || "kailashsinhrajput25@gmail.com"
        };
        sendSmtpEmail.to = [{ email: to }];

        console.log(`[EMAIL] Attempting to send email to ${to} via Brevo REST API...`);

        const data = await apiInstance.sendTransacEmail(sendSmtpEmail);

        console.log('[EMAIL] Email sent successfully. Message ID:', data.body.messageId);
        return data;
    } catch (error) {
        console.error('[EMAIL] CRITICAL ERROR: Failed to send email via Brevo REST API:');

        if (error.response && error.response.body) {
            console.error('Brevo API Response Error:', JSON.stringify(error.response.body, null, 2));
        } else {
            console.error('Error Message:', error.message);
        }

        throw error;
    }
};

module.exports = sendEmail;
