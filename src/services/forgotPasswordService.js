const bcrypt = require("bcryptjs");
const AppError = require("../utils/AppError");
const { env } = require("../config/env");
const { generateOtp, hashOtp } = require("../utils/crypto");
const { sendOtpEmail } = require("../config/mailer");
const { findUserByEmail, updatePasswordHash } = require("../data/userStore");
const { setOtp, getOtp, removeOtp } = require("../data/otpStore");

async function requestOtp(email) {
  const user = findUserByEmail(email);

  // Always return generic success to avoid user enumeration.
  if (!user) {
    return { success: true, message: "If this email exists, an OTP has been sent." };
  }

  const otp = generateOtp();
  const otpHash = hashOtp(otp);
  const expiresAt = Date.now() + env.otpExpiryMs;

  setOtp(email, {
    otpHash,
    expiresAt,
    verified: false,
    failedAttempts: 0,
  });

  await sendOtpEmail(email, otp);

  return { success: true, message: "If this email exists, an OTP has been sent." };
}

function verifyOtp(email, otp) {
  const saved = getOtp(email);

  if (!saved) {
    throw new AppError("OTP not found. Request a new one.", 400);
  }

  if (Date.now() > saved.expiresAt) {
    removeOtp(email);
    throw new AppError("OTP expired. Request a new one.", 400);
  }

  if (saved.failedAttempts >= 5) {
    removeOtp(email);
    throw new AppError("Too many failed attempts. Request a new OTP.", 429);
  }

  if (hashOtp(otp) !== saved.otpHash) {
    saved.failedAttempts += 1;
    setOtp(email, saved);
    throw new AppError("Invalid OTP.", 400);
  }

  saved.verified = true;
  setOtp(email, saved);

  return { success: true, message: "OTP verified. You can now reset your password." };
}

async function resetPassword(email, newPassword) {
  if (String(newPassword || "").length < 6) {
    throw new AppError("Password must be at least 6 characters.", 400);
  }

  const user = findUserByEmail(email);
  if (!user) {
    throw new AppError("Invalid request.", 400);
  }

  const saved = getOtp(email);
  if (!saved || !saved.verified) {
    throw new AppError("OTP is not verified.", 400);
  }

  if (Date.now() > saved.expiresAt) {
    removeOtp(email);
    throw new AppError("OTP expired. Request a new OTP.", 400);
  }

  const hash = await bcrypt.hash(newPassword, env.bcryptSaltRounds);
  updatePasswordHash(email, hash);
  removeOtp(email);

  return { success: true, message: "Password reset successful." };
}

module.exports = { requestOtp, verifyOtp, resetPassword };
