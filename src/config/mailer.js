const nodemailer = require("nodemailer");
const { env } = require("./env");

// Gmail SMTP transporter used for sending OTP emails.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.gmailUser,
    pass: env.gmailAppPassword,
  },
});

async function verifyMailer() {
  await transporter.verify();
}

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: env.mailFrom,
    to: toEmail,
    subject: "Your Password Reset OTP",
    text: "Your OTP is " + otp + ". It expires in 5 minutes.",
    html:
      "<div style=\"font-family:Arial,sans-serif;line-height:1.5\">" +
      "<h2>Password Reset Code</h2>" +
      "<p>Your OTP is:</p>" +
      "<p style=\"font-size:24px;font-weight:bold;letter-spacing:2px\">" + otp + "</p>" +
      "<p>This code expires in 5 minutes.</p>" +
      "</div>",
  });
}

module.exports = { verifyMailer, sendOtpEmail };
