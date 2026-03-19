const path = require("path");
const dotenv = require("dotenv");

// Load environment variables from .env in the project root.
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const env = {
  port: Number(process.env.PORT || 4000),
  gmailUser: process.env.GMAIL_USER || "",
  gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
  mailFrom: process.env.MAIL_FROM || process.env.GMAIL_USER || "",
  otpExpiryMs: Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000,
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
};

function validateEnv() {
  const missing = [];
  if (!env.gmailUser) missing.push("GMAIL_USER");
  if (!env.gmailAppPassword) missing.push("GMAIL_APP_PASSWORD");
  if (!env.mailFrom) missing.push("MAIL_FROM");

  if (missing.length > 0) {
    const message =
      "Missing required environment variables: " + missing.join(", ") +
      ". Create a .env file from .env.example.";
    throw new Error(message);
  }
}

module.exports = { env, validateEnv };
