const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendEmail = async (to, subject, html) => {
    try {
        const data = await resend.emails.send({
            from: 'ElectroCare <onboarding@resend.dev>', // Use default testing domain
            to: [to], // In free tier, can only send to the email you signed up with
            subject: subject,
            html: html,
        });

        console.log("Email sent successfully:", data);
        return data;
    } catch (error) {
        console.error("Error sending email:", error);
        throw error;
    }
};

module.exports = sendEmail;
