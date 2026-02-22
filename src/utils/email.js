const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Sends an email using Brevo REST API (v4 SDK)
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML
 */
const sendEmail = async (to, subject, html) => {
    try {
        const client = new BrevoClient({
            apiKey: process.env.BREVO_API_KEY,
        });

        console.log(`[EMAIL] Attempting to send email to ${to} via Brevo REST API...`);

        const response = await client.transactionalEmails.sendTransacEmail({
            subject: subject,
            htmlContent: html,
            sender: {
                name: "ElectroCare",
                email: process.env.EMAIL_FROM || "kailashsinhrajput25@gmail.com"
            },
            to: [{ email: to }],
        });

        console.log('[EMAIL] Email sent successfully. Message ID:', response.messageId);
        return response;
    } catch (error) {
        console.error('[EMAIL] CRITICAL ERROR: Failed to send email via Brevo REST API:');

        if (error.response && error.response.body) {
            console.error('Brevo API Response Error:', JSON.stringify(error.response.body, null, 2));
        } else if (error.message) {
            console.error('Error Message:', error.message);
        } else {
            console.error('An unknown error occurred while sending email.');
        }

        throw error;
    }
};

module.exports = sendEmail;
