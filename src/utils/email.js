const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // 587 is STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendEmail = async (to, subject, html) => {
    try {
        const fromEmail = process.env.EMAIL_FROM || 'kailashsinhrajput25@gmail.com';
        const info = await transporter.sendMail({
            from: `"ElectroCare" <${fromEmail}>`,
            to,
            subject,
            html,
        });

        console.log("Email sent successfully:");
        console.log("Message ID:", info.messageId);
        console.log("Response:", info.response);
        return info;
    } catch (error) {
        console.error("CRITICAL ERROR: Failed to send email via Brevo:");
        console.error("Error Code:", error.code);
        console.error("Error Message:", error.message);
        if (error.response) {
            console.error("SMTP Response:", error.response);
        }
        throw error;
    }
};

module.exports = sendEmail;
