const nodemailer = require("nodemailer");

function getTransporter() {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

    if (!user || !pass) {
        throw new Error("EMAIL_USER and EMAIL_PASS or EMAIL_APP_PASSWORD are not configured");
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: { user, pass }
    });
}

async function sendOTP(email, otp) {
    const transporter = getTransporter();

    await transporter.sendMail({
        from: `"MedZyra" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your MedZyra OTP",
        html: `
            <div style="font-family: Arial;">
                <h2>MedZyra Verification</h2>

                <p>Your OTP is:</p>

                <h1>${otp}</h1>

                <p>This OTP is valid for 5 minutes.</p>

                <p>Do not share this OTP with anyone.</p>
            </div>
        `
    });

    console.log(`OTP sent to ${email}`);
}

module.exports = sendOTP;